/**
 * ANNY — SERVER-SIDE AUTHENTICATION & AUTHORIZATION SERVICE
 * Provides cryptographic verification of:
 * 1. ANNY Server-Signed Session Tokens (via authSecurityPlatform HMAC / cookie / Bearer)
 * 2. Firebase ID Tokens (RS256 verified against Google's official SecureToken X.509 certs)
 * 3. Enterprise Universal API Keys (keyId:rawSecret via annyEcosystemService)
 *
 * Strictly rejects untrusted headers such as x-user-id or client-forged roles.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { authSecurityPlatform, UserRole } from './authSecurityPlatform';
import { annyEcosystemService } from './annyEcosystemService';

export interface VerifiedIdentity {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  role: UserRole | 'STANDARD';
  isAdmin: boolean;
  authMethod: 'anny-session' | 'firebase-id-token' | 'api-key';
  companyId?: string;
  scopes?: string[];
  tokenExpiresAt?: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: VerifiedIdentity;
  user?: { id: string; userId: string; role: string; isAdmin: boolean; email?: string };
}

export const ADMIN_COOKIE_NAME = 'anny_admin_session';
export const USER_COOKIE_NAME = 'anny_user_session';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function resolveFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID.trim();
  const candidates = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'primary-anny', 'Anny', 'firebase-applet-config.json'),
    path.join(process.cwd(), 'Anny', 'firebase-applet-config.json')
  ];
  for (const cfgPath of candidates) {
    try {
      if (fs.existsSync(cfgPath)) {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (parsed?.projectId) return String(parsed.projectId);
      }
    } catch {
      // ignore config lookup error
    }
  }
  return null;
}

function getConfiguredAdminEmails(): Set<string> {
  const raw = String(process.env.ADMIN_EMAILS || '').trim();
  const emails = new Set<string>();
  if (raw) {
    for (const part of raw.split(',')) {
      const clean = part.trim().toLowerCase();
      if (clean) emails.add(clean);
    }
  }
  return emails;
}

export function isServerConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getConfiguredAdminEmails().has(email.trim().toLowerCase());
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (!header || typeof header !== 'string') return cookies;

  for (const segment of header.split(';')) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

function decodeBase64Url(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }

  const response = await axios.get<Record<string, string>>(GOOGLE_CERTS_URL, {
    timeout: 5000
  });
  const cacheControl = String(response.headers?.['cache-control'] || '');
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Math.min(86400, Math.max(60, parseInt(maxAgeMatch[1], 10))) : 3600;

  cachedGoogleCerts = {
    certs: response.data || {},
    expiresAt: now + maxAgeSeconds * 1000
  };
  return cachedGoogleCerts.certs;
}

/**
 * Cryptographically verifies a Firebase ID Token (RS256) against Google's public X.509 certificates.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedIdentity | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
    const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));

    if (header?.alg !== 'RS256' || typeof header?.kid !== 'string' || !header.kid) {
      return null;
    }

    const projectId = resolveFirebaseProjectId();
    // Never accept Firebase tokens against a guessed/default project identifier.
    if (!projectId) return null;
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    const nowSec = Math.floor(Date.now() / 1000);

    if (payload?.aud !== projectId) return null;
    if (payload?.iss !== expectedIssuer) return null;
    if (typeof payload?.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) return null;
    if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) return null;
    if (typeof payload?.iat !== 'number' || payload.iat > nowSec + 300) return null;
    if (typeof payload?.auth_time === 'number' && payload.auth_time > nowSec + 300) return null;

    let certs = await fetchGooglePublicCerts();
    let certPem = certs[header.kid];
    if (!certPem) {
      // Force refresh once in case Google rotated signing keys
      cachedGoogleCerts = null;
      certs = await fetchGooglePublicCerts();
      certPem = certs[header.kid];
    }
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const signatureBuf = decodeBase64Url(sigB64);
    const validSig = verifier.verify(certPem, signatureBuf);
    if (!validSig) return null;

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
    const emailVerified = Boolean(payload.email_verified);
    const adminClaim = payload.admin === true || payload.role === 'admin' || payload.role === 'SOVEREIGN_ADMIN';
    const isAdmin = Boolean(adminClaim || (emailVerified && isServerConfiguredAdminEmail(email)));

    return {
      uid: payload.sub,
      email,
      emailVerified,
      role: isAdmin ? 'SOVEREIGN_ADMIN' : 'STANDARD',
      isAdmin,
      authMethod: 'firebase-id-token',
      tokenExpiresAt: payload.exp * 1000
    };
  } catch {
    return null;
  }
}

export async function resolveVerifiedIdentity(
  req: Request,
  options: { allowApiKey?: boolean } = {}
): Promise<VerifiedIdentity | null> {
  const cookies = parseCookies(req);
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // 1. Admin HttpOnly Cookie takes precedence if valid (grants verified SOVEREIGN_ADMIN session)
  const adminCookieToken = cookies[ADMIN_COOKIE_NAME];
  if (adminCookieToken) {
    const adminSession = await authSecurityPlatform.verifyTokenPersistent(adminCookieToken);
    if (adminSession && adminSession.role === 'SOVEREIGN_ADMIN') {
      return {
        uid: adminSession.userId,
        email: adminSession.username.includes('@') ? adminSession.username : undefined,
        emailVerified: true,
        role: adminSession.role,
        isAdmin: true,
        authMethod: 'anny-session',
        tokenExpiresAt: adminSession.expiresAt
      };
    }
  }

  // 2. Explicit Bearer token: check ANNY HMAC session token first
  if (bearerToken) {
    const bearerSession = await authSecurityPlatform.verifyTokenPersistent(bearerToken);
    if (bearerSession) {
      return {
        uid: bearerSession.userId,
        email: bearerSession.username?.includes('@') ? bearerSession.username : undefined,
        emailVerified: true,
        role: bearerSession.role,
        isAdmin: bearerSession.role === 'SOVEREIGN_ADMIN',
        authMethod: 'anny-session',
        tokenExpiresAt: bearerSession.expiresAt
      };
    }

    // 3. Explicit Bearer token: verify RS256 Firebase ID token (JWT with 3 dot-separated parts)
    // Must be checked BEFORE falling back to a guest USER_COOKIE_NAME cookie so a stale
    // guest session cookie never overrides an authenticated Firebase user's Bearer token.
    if (bearerToken.split('.').length === 3) {
      const fbIdentity = await verifyFirebaseIdToken(bearerToken);
      if (fbIdentity) {
        return fbIdentity;
      }
    }
  }

  // 4. Fallback to user session cookie when no valid Bearer token was resolved
  const cookieToken = cookies[USER_COOKIE_NAME];
  if (cookieToken) {
    const cookieSession = await authSecurityPlatform.verifyTokenPersistent(cookieToken);
    if (cookieSession) {
      return {
        uid: cookieSession.userId,
        email: cookieSession.username?.includes('@') ? cookieSession.username : undefined,
        emailVerified: true,
        role: cookieSession.role,
        isAdmin: cookieSession.role === 'SOVEREIGN_ADMIN',
        authMethod: 'anny-session',
        tokenExpiresAt: cookieSession.expiresAt
      };
    }
  }

  // 4. Enterprise API Key (only on endpoints opted into API key authentication)
  if (options.allowApiKey && bearerToken && bearerToken.includes(':')) {
    const keyObj = annyEcosystemService.validateApiKey(`Bearer ${bearerToken}`);
    if (keyObj) {
      return {
        uid: `apikey:${keyObj.companyId}:${keyObj.keyId}`,
        role: 'ENTERPRISE_ARCHITECT',
        isAdmin: false,
        authMethod: 'api-key',
        companyId: keyObj.companyId,
        scopes: keyObj.scopes
      };
    }
  }

  return null;
}

/**
 * Passive middleware that resolves verified identity for downstream rate limiters
 * without blocking public routes. Never reads x-user-id or forged headers.
 */
export async function attachVerifiedIdentity(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const allowApiKey = req.originalUrl.startsWith('/api/v1/anny') || req.originalUrl.startsWith('/api/anny/enterprises');
    const identity = await resolveVerifiedIdentity(req, { allowApiKey });
    if (identity) {
      req.authUser = identity;
      req.user = {
        id: identity.uid,
        userId: identity.uid,
        role: identity.role,
        isAdmin: identity.isAdmin,
        email: identity.email
      };
    }
  } catch {
    // Do not authenticate on resolution error
  }
  next();
}

export function requireAuth(options: { allowApiKey?: boolean; requiredScope?: string } = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    let identity = req.authUser;
    try {
      if (!identity || (options.allowApiKey && !identity)) {
        identity = (await resolveVerifiedIdentity(req, { allowApiKey: options.allowApiKey })) || undefined;
      }
    } catch {
      res.status(503).json({
        success: false,
        error: 'AUTH_SESSION_STORE_UNAVAILABLE',
        message: 'The authentication session registry is temporarily unavailable.'
      });
      return;
    }

    if (!identity) {
      res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A verified Bearer token or active authenticated session is required.'
      });
      return;
    }

    if (identity.authMethod === 'api-key' && !options.allowApiKey) {
      res.status(403).json({
        success: false,
        error: 'API_KEY_NOT_PERMITTED',
        message: 'This endpoint requires a verified user or administrator session.'
      });
      return;
    }

    if (options.requiredScope && identity.authMethod === 'api-key') {
      const scopes = identity.scopes || [];
      if (!scopes.includes(options.requiredScope) && !scopes.includes('*')) {
        res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_SCOPE',
          message: `API key lacks required scope: ${options.requiredScope}`
        });
        return;
      }
    }

    req.authUser = identity;
    req.user = {
      id: identity.uid,
      userId: identity.uid,
      role: identity.role,
      isAdmin: identity.isAdmin,
      email: identity.email
    };
    next();
  };
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let identity: VerifiedIdentity | undefined = req.authUser;
  try {
    identity = identity || (await resolveVerifiedIdentity(req, { allowApiKey: false })) || undefined;
  } catch {
    res.status(503).json({
      success: false,
      error: 'AUTH_SESSION_STORE_UNAVAILABLE',
      message: 'The authentication session registry is temporarily unavailable.'
    });
    return;
  }
  if (!identity) {
    res.status(401).json({
      success: false,
      error: 'ADMIN_AUTHENTICATION_REQUIRED',
      message: 'Verified administrator authentication is required.'
    });
    return;
  }

  if (!identity.isAdmin || identity.role !== 'SOVEREIGN_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'ADMIN_AUTHORIZATION_REQUIRED',
      message: 'Sovereign administrator privileges are required for this operation.'
    });
    return;
  }

  req.authUser = identity;
  req.user = {
    id: identity.uid,
    userId: identity.uid,
    role: identity.role,
    isAdmin: true,
    email: identity.email
  };
  next();
}

export function verifyServerAdminCredentials(usernameInput: string, passwordInput: string): boolean {
  const configuredUser = String(process.env.ADMIN_USERNAME || '').trim();
  const configuredPassHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
  const configuredPass = String(process.env.ADMIN_PASSWORD || '').trim();

  if (!configuredUser || (!configuredPassHash && !configuredPass)) {
    return false;
  }

  const normalizedInputUser = String(usernameInput || '').trim();
  if (!timingSafeStringEqual(normalizedInputUser.toLowerCase(), configuredUser.toLowerCase())) {
    return false;
  }

  const candidatePass = String(passwordInput || '');
  if (!candidatePass) return false;

  if (configuredPassHash && (configuredPassHash.startsWith('v2$') || configuredPassHash.includes(':'))) {
    return authSecurityPlatform.verifyPassword(candidatePass, configuredPassHash);
  }

  if (configuredPass) {
    return timingSafeStringEqual(candidatePass, configuredPass);
  }

  return false;
}
