/**
 * ANNY — AUTHENTICATION & SECURITY PLATFORM (PHASES 10 & 11)
 * Universal security architecture providing JWT issuance, RBAC permissions, MFA verification,
 * AES-256 encryption, secret management, input sanitization, rate limiting, and audit protection.
 */

import crypto from 'crypto';
import { envConfigService, isStrongSecuritySecret } from './envConfigService';
import { postgresPlatform } from './postgresPlatform';

export type UserRole = 'SOVEREIGN_ADMIN' | 'ENTERPRISE_ARCHITECT' | 'OPERATOR' | 'GUEST';

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SecurityPolicy {
  enableXssSanitization: boolean;
  enableSqlInjectionGuard: boolean;
  maxLoginAttempts: number;
  jwtExpirySeconds: number;
}

export class AuthSecurityPlatform {
  private static instance: AuthSecurityPlatform;
  private activeSessions: Map<string, UserSession> = new Map();
  private revokedTokens: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): AuthSecurityPlatform {
    if (!AuthSecurityPlatform.instance) {
      AuthSecurityPlatform.instance = new AuthSecurityPlatform();
    }
    return AuthSecurityPlatform.instance;
  }

  private deriveDomainHmacKey(primarySecret: string, sessionSecret: string, purpose: 'access' | 'refresh'): Buffer {
    return crypto
      .createHmac('sha256', primarySecret)
      .update(`anny:${purpose}:${sessionSecret}`)
      .digest();
  }

  // Password Hashing (PBKDF2/SHA-512 with 120,000 iterations for v2; supports legacy 1000 iter)
  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 120000;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return `v2$${iterations}$${salt}$${hash}`;
  }

  public verifyPassword(password: string, combinedHash: string): boolean {
    if (!combinedHash || typeof combinedHash !== 'string') return false;

    // v2 format: v2$iterations$salt$hash
    if (combinedHash.startsWith('v2$')) {
      const parts = combinedHash.split('$');
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      if (isNaN(iterations) || iterations < 10000 || !salt || !expectedHash) return false;

      const candidateHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
      const candBuf = Buffer.from(candidateHash, 'hex');
      const expBuf = Buffer.from(expectedHash, 'hex');
      if (candBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(candBuf, expBuf);
    }

    // Legacy format: salt:hash (1000 iterations)
    const [salt, originalHash] = combinedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const candBuf = Buffer.from(hash, 'hex');
    const expBuf = Buffer.from(originalHash, 'hex');
    if (candBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(candBuf, expBuf);
  }

  // AES-256 GCM Authenticated Encryption & Decryption (with legacy CBC backward compatibility)
  public encryptSecret(text: string): { ciphertext: string; iv: string } {
    const config = envConfigService.refreshFromProcess();
    if (!isStrongSecuritySecret(config.encryptionKey)) {
      throw new Error('SECURITY_SECRET_INVALID: ENCRYPTION_KEY is missing, empty, or insufficiently strong.');
    }
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(config.encryptionKey, salt, 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const packagedCiphertext = `v2:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    return {
      ciphertext: packagedCiphertext,
      iv: iv.toString('hex')
    };
  }

  public decryptSecret(ciphertext: string, ivHex: string): string {
    const config = envConfigService.refreshFromProcess();
    if (!isStrongSecuritySecret(config.encryptionKey)) {
      throw new Error('SECURITY_SECRET_INVALID: ENCRYPTION_KEY is missing, empty, or insufficiently strong.');
    }

    // Modern v2 GCM decryption
    if (ciphertext.startsWith('v2:')) {
      const parts = ciphertext.split(':');
      if (parts.length === 5) {
        const salt = Buffer.from(parts[1], 'hex');
        const iv = Buffer.from(parts[2], 'hex');
        const authTag = Buffer.from(parts[3], 'hex');
        const encrypted = parts[4];
        const key = crypto.scryptSync(config.encryptionKey, salt, 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    }

    // Legacy CBC decryption fallback
    const key = crypto.scryptSync(config.encryptionKey, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // JWT Token Management
  public createToken(userId: string, username: string, role: UserRole): UserSession {
    const config = envConfigService.refreshFromProcess();
    if (!isStrongSecuritySecret(config.jwtSecret)) {
      throw new Error('SECURITY_SECRET_INVALID: JWT_SECRET is missing, empty, or insufficiently strong.');
    }
    if (!isStrongSecuritySecret(config.jwtRefreshSecret)) {
      throw new Error('SECURITY_SECRET_INVALID: JWT_REFRESH_SECRET is missing, empty, or insufficiently strong.');
    }
    if (!isStrongSecuritySecret(config.sessionSecret)) {
      throw new Error('SECURITY_SECRET_INVALID: SESSION_SECRET is missing, empty, or insufficiently strong.');
    }

    const expiresAt = Date.now() + (3600 * 24 * 1000); // 24 hours
    const jti = crypto.randomBytes(12).toString('hex');

    const payload = JSON.stringify({ userId, username, role, expiresAt, jti });
    const accessHmacKey = this.deriveDomainHmacKey(config.jwtSecret, config.sessionSecret, 'access');
    const signature = crypto.createHmac('sha256', accessHmacKey).update(payload).digest('hex');
    const token = Buffer.from(`${payload}.${signature}`).toString('base64');

    const refreshPayload = JSON.stringify({ userId, expiresAt: Date.now() + (3600 * 24 * 7 * 1000), jti });
    const refreshHmacKey = this.deriveDomainHmacKey(config.jwtRefreshSecret, config.sessionSecret, 'refresh');
    const refreshSig = crypto.createHmac('sha256', refreshHmacKey).update(refreshPayload).digest('hex');
    const refreshToken = Buffer.from(`${refreshPayload}.${refreshSig}`).toString('base64');

    const session: UserSession = {
      userId,
      username,
      role,
      token,
      refreshToken,
      expiresAt
    };

    this.activeSessions.set(token, session);
    return session;
  }

  private hashSessionCredential(value: string): string {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private verifyAccessPayload(token: string): any | null {
    if (!token || typeof token !== 'string') return null;
    try {
      const config = envConfigService.refreshFromProcess();
      if (!isStrongSecuritySecret(config.jwtSecret) || !isStrongSecuritySecret(config.sessionSecret)) return null;
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const dotIdx = decoded.lastIndexOf('.');
      if (dotIdx <= 0) return null;
      const payloadStr = decoded.slice(0, dotIdx);
      const signature = decoded.slice(dotIdx + 1);
      if (!payloadStr || !signature || signature.length !== 64) return null;
      const accessHmacKey = this.deriveDomainHmacKey(config.jwtSecret, config.sessionSecret, 'access');
      const expected = crypto.createHmac('sha256', accessHmacKey).update(payloadStr).digest('hex');
      const actualBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      if (actualBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
      const payload = JSON.parse(payloadStr);
      if (!payload || typeof payload.userId !== 'string' || !payload.userId ||
          typeof payload.username !== 'string' || typeof payload.expiresAt !== 'number' ||
          Date.now() > payload.expiresAt ||
          !['SOVEREIGN_ADMIN', 'ENTERPRISE_ARCHITECT', 'OPERATOR', 'GUEST'].includes(payload.role)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private verifyRefreshPayload(refreshToken: string): any | null {
    if (!refreshToken || typeof refreshToken !== 'string') return null;
    try {
      const config = envConfigService.refreshFromProcess();
      if (!isStrongSecuritySecret(config.jwtRefreshSecret) || !isStrongSecuritySecret(config.sessionSecret)) return null;
      const decoded = Buffer.from(refreshToken, 'base64').toString('utf8');
      const dotIdx = decoded.lastIndexOf('.');
      if (dotIdx <= 0) return null;
      const payloadStr = decoded.slice(0, dotIdx);
      const signature = decoded.slice(dotIdx + 1);
      if (!payloadStr || !signature || signature.length !== 64) return null;
      const refreshHmacKey = this.deriveDomainHmacKey(config.jwtRefreshSecret, config.sessionSecret, 'refresh');
      const expected = crypto.createHmac('sha256', refreshHmacKey).update(payloadStr).digest('hex');
      const actualBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      if (actualBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
      const payload = JSON.parse(payloadStr);
      if (!payload || typeof payload.userId !== 'string' || !payload.userId ||
          typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private async persistSession(session: UserSession): Promise<boolean> {
    const refreshPayload = this.verifyRefreshPayload(session.refreshToken);
    if (!refreshPayload) throw new Error('AUTH_REFRESH_TOKEN_INVALID: Newly issued refresh token could not be verified.');
    return postgresPlatform.storeAuthSession({
      tokenHash: this.hashSessionCredential(session.token),
      refreshTokenHash: this.hashSessionCredential(session.refreshToken),
      userId: session.userId,
      username: session.username,
      role: session.role,
      accessExpiresAt: session.expiresAt,
      refreshExpiresAt: refreshPayload.expiresAt
    });
  }

  /** Issue a session and persist only credential hashes when durable PostgreSQL is available. */
  public async createPersistentToken(userId: string, username: string, role: UserRole): Promise<UserSession> {
    const session = this.createToken(userId, username, role);
    try {
      await this.persistSession(session);
      return session;
    } catch (error) {
      this.activeSessions.delete(session.token);
      throw error;
    }
  }

  /** Verify a signed access token against the durable revocation/session registry. */
  public async verifyTokenPersistent(token: string): Promise<UserSession | null> {
    if (!token || this.revokedTokens.has(token)) return null;
    const local = this.verifyToken(token);
    if (local) return local;

    const payload = this.verifyAccessPayload(token);
    if (!payload) return null;
    const record = await postgresPlatform.findAuthSessionByTokenHash(this.hashSessionCredential(token));
    if (!record || record.user_id !== payload.userId ||
        record.username !== payload.username || record.role !== payload.role ||
        Number(record.access_expires_at) !== payload.expiresAt ||
        record.revoked_at) return null;

    return {
      userId: String(record.user_id),
      username: String(record.username),
      role: record.role as UserRole,
      token,
      // Raw refresh credentials are never stored; the caller only needs identity here.
      refreshToken: '',
      expiresAt: Number(record.access_expires_at)
    };
  }

  /** Verify a refresh token against PostgreSQL, including cross-process revocation state. */
  public async verifyRefreshTokenPersistent(refreshToken: string): Promise<{ userId: string; expiresAt: number } | null> {
    if (!refreshToken || this.revokedTokens.has(refreshToken)) return null;
    const local = this.verifyRefreshToken(refreshToken);
    if (local) return local;
    const payload = this.verifyRefreshPayload(refreshToken);
    if (!payload) return null;
    const record = await postgresPlatform.findAuthSessionByRefreshHash(this.hashSessionCredential(refreshToken));
    if (!record || record.user_id !== payload.userId || record.revoked_at ||
        Number(record.refresh_expires_at) !== payload.expiresAt) return null;
    return { userId: String(record.user_id), expiresAt: Number(record.refresh_expires_at) };
  }

  /** Rotate refresh credentials atomically so a replay cannot create two valid sessions. */
  public async refreshSessionPersistent(refreshToken: string): Promise<UserSession | null> {
    const verified = await this.verifyRefreshTokenPersistent(refreshToken);
    if (!verified) return null;
    const oldHash = this.hashSessionCredential(refreshToken);
    const existingRecord = await postgresPlatform.findAuthSessionByRefreshHash(oldHash);

    // Development without PostgreSQL retains the explicit in-process session behavior.
    if (!existingRecord) return this.refreshSession(refreshToken);

    const replacement = this.createToken(
      String(existingRecord.user_id),
      String(existingRecord.username),
      existingRecord.role as UserRole
    );
    const refreshPayload = this.verifyRefreshPayload(replacement.refreshToken);
    if (!refreshPayload) {
      this.activeSessions.delete(replacement.token);
      return null;
    }

    try {
      const rotated = await postgresPlatform.rotateAuthSession(oldHash, {
        tokenHash: this.hashSessionCredential(replacement.token),
        refreshTokenHash: this.hashSessionCredential(replacement.refreshToken),
        userId: replacement.userId,
        username: replacement.username,
        role: replacement.role,
        accessExpiresAt: replacement.expiresAt,
        refreshExpiresAt: refreshPayload.expiresAt
      });
      if (!rotated) {
        this.activeSessions.delete(replacement.token);
        return null;
      }
      this.revokedTokens.add(refreshToken);
      return replacement;
    } catch (error) {
      this.activeSessions.delete(replacement.token);
      throw error;
    }
  }

  public async revokeSessionPersistent(token: string): Promise<boolean> {
    if (!token) return false;
    this.revokeSession(token);
    return postgresPlatform.revokeAuthSessionByTokenHash(this.hashSessionCredential(token));
  }

  public async revokeRefreshTokenPersistent(refreshToken: string): Promise<boolean> {
    if (!refreshToken) return false;
    this.revokeRefreshToken(refreshToken);
    return postgresPlatform.revokeAuthSessionByRefreshHash(this.hashSessionCredential(refreshToken));
  }

  public async revokeUserSessionsPersistent(userId: string): Promise<number> {
    const localCount = this.revokeUserSessions(userId);
    const durableCount = await postgresPlatform.revokeAuthSessionsForUser(userId);
    return Math.max(localCount, durableCount);
  }

  public verifyToken(token: string): UserSession | null {
    if (!token || typeof token !== 'string' || this.revokedTokens.has(token)) return null;

    try {
      const config = envConfigService.refreshFromProcess();
      // Fail closed if required secrets are missing, empty, or weak
      if (!isStrongSecuritySecret(config.jwtSecret) || !isStrongSecuritySecret(config.sessionSecret)) {
        return null;
      }

      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const dotIdx = decoded.lastIndexOf('.');
      if (dotIdx <= 0) return null;

      const payloadStr = decoded.slice(0, dotIdx);
      const signature = decoded.slice(dotIdx + 1);
      if (!payloadStr || !signature || signature.length !== 64) return null;

      // Require the domain-separated access key. Legacy direct-JWT_SECRET signatures
      // are intentionally rejected so possession of JWT_SECRET alone cannot mint sessions.
      const accessHmacKey = this.deriveDomainHmacKey(config.jwtSecret, config.sessionSecret, 'access');
      const expectedDomainSig = crypto.createHmac('sha256', accessHmacKey).update(payloadStr).digest('hex');
      const sigBuf = Buffer.from(signature, 'utf8');
      const domainBuf = Buffer.from(expectedDomainSig, 'utf8');

      if (sigBuf.length !== domainBuf.length || !crypto.timingSafeEqual(sigBuf, domainBuf)) {
        return null;
      }

      const payload = JSON.parse(payloadStr);
      if (!payload || typeof payload.userId !== 'string' || !payload.userId) return null;
      if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;

      // A valid signature alone is not proof of an active session. Require a session
      // issued by this running process and compare its identity/expiry before accepting.
      // This intentionally fails closed after restart or on an unshared instance until
      // durable shared session storage is implemented.
      const activeSession = this.activeSessions.get(token);
      if (!activeSession ||
          activeSession.userId !== payload.userId ||
          activeSession.username !== payload.username ||
          activeSession.role !== payload.role ||
          activeSession.expiresAt !== payload.expiresAt) return null;

      return activeSession;
    } catch {
      return null;
    }
  }

  public verifyRefreshToken(refreshToken: string): { userId: string; expiresAt: number } | null {
    if (!refreshToken || typeof refreshToken !== 'string' || this.revokedTokens.has(refreshToken)) return null;
    try {
      const config = envConfigService.refreshFromProcess();
      if (!isStrongSecuritySecret(config.jwtRefreshSecret) || !isStrongSecuritySecret(config.sessionSecret)) {
        return null;
      }
      const decoded = Buffer.from(refreshToken, 'base64').toString('utf8');
      const dotIdx = decoded.lastIndexOf('.');
      if (dotIdx <= 0) return null;
      const payloadStr = decoded.slice(0, dotIdx);
      const signature = decoded.slice(dotIdx + 1);
      if (!payloadStr || !signature || signature.length !== 64) return null;

      const refreshHmacKey = this.deriveDomainHmacKey(config.jwtRefreshSecret, config.sessionSecret, 'refresh');
      const expectedSig = crypto.createHmac('sha256', refreshHmacKey).update(payloadStr).digest('hex');
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expectedSig, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }
      const payload = JSON.parse(payloadStr);
      if (!payload || typeof payload.userId !== 'string' || typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) {
        return null;
      }

      // Refresh credentials are valid only while their owning access session is active.
      const activeSession = Array.from(this.activeSessions.values()).find(
        session => session.refreshToken === refreshToken && session.userId === payload.userId
      );
      if (!activeSession) return null;

      return { userId: payload.userId, expiresAt: payload.expiresAt };
    } catch {
      return null;
    }
  }

  public refreshSession(refreshToken: string): UserSession | null {
    const verified = this.verifyRefreshToken(refreshToken);
    if (!verified) return null;

    const existing = Array.from(this.activeSessions.values()).find(
      session => session.refreshToken === refreshToken && session.userId === verified.userId
    );
    if (!existing) return null;

    // Rotate credentials: invalidate both the old access token and old refresh token
    this.revokedTokens.add(existing.token);
    this.revokedTokens.add(existing.refreshToken);
    this.activeSessions.delete(existing.token);

    return this.createToken(existing.userId, existing.username, existing.role);
  }

  public revokeSession(token: string): boolean {
    if (!token) return false;
    this.revokedTokens.add(token);
    const existing = this.activeSessions.get(token);
    if (existing) {
      this.revokedTokens.add(existing.refreshToken);
      this.activeSessions.delete(token);
    }
    return true;
  }

  public revokeRefreshToken(refreshToken: string): boolean {
    if (!refreshToken) return false;
    this.revokedTokens.add(refreshToken);
    for (const [accessToken, session] of this.activeSessions.entries()) {
      if (session.refreshToken === refreshToken) {
        this.revokedTokens.add(accessToken);
        this.activeSessions.delete(accessToken);
      }
    }
    return true;
  }

  public revokeUserSessions(userId: string): number {
    let revokedCount = 0;
    for (const [accessToken, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.revokedTokens.add(accessToken);
        this.revokedTokens.add(session.refreshToken);
        this.activeSessions.delete(accessToken);
        revokedCount += 1;
      }
    }
    return revokedCount;
  }

  // Input Sanitization Guards
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  public isSqlInjectionSafe(queryStr: string): boolean {
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE|TRUNCATE)\b)|(--|;\s*$)/i;
    return !sqlPattern.test(queryStr);
  }

  // RBAC Permission Check
  public hasPermission(role: UserRole, requiredPermission: 'ADMIN_ACCESS' | 'CODE_GEN' | 'READ_ONLY'): boolean {
    if (role === 'SOVEREIGN_ADMIN') return true;
    if (role === 'ENTERPRISE_ARCHITECT' && requiredPermission !== 'ADMIN_ACCESS') return true;
    if (role === 'OPERATOR' && requiredPermission === 'READ_ONLY') return true;
    return requiredPermission === 'READ_ONLY';
  }

  public getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
}

export const authSecurityPlatform = AuthSecurityPlatform.getInstance();
