import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { authSecurityPlatform } from './authSecurityPlatform.ts';
import { isStrongSecuritySecret } from './envConfigService.ts';

process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

describe('session token verification, revocation, and rotation', () => {
  test('accepts tokens signed with the domain-separated access key', () => {
    const session = authSecurityPlatform.createToken('user-1', 'user@example.test', 'GUEST');
    const verified = authSecurityPlatform.verifyToken(session.token);
    assert.equal(verified?.userId, 'user-1');
    assert.equal(verified?.role, 'GUEST');
    assert.equal(authSecurityPlatform.verifyRefreshToken(session.refreshToken)?.userId, 'user-1');
    authSecurityPlatform.revokeSession(session.token);
  });

  test('rejects legacy tokens signed directly with JWT_SECRET', () => {
    const payload = JSON.stringify({
      userId: 'legacy-user',
      username: 'legacy@example.test',
      role: 'GUEST',
      expiresAt: Date.now() + 60_000,
    });
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('hex');
    const legacyToken = Buffer.from(`${payload}.${signature}`).toString('base64');
    assert.equal(authSecurityPlatform.verifyToken(legacyToken), null);
  });

  test('rejects modified tokens and revokes both access and refresh tokens on logout', () => {
    const session = authSecurityPlatform.createToken('user-2', 'user2@example.test', 'GUEST');
    const tampered = session.token.slice(0, -4) + 'AAAA';
    assert.equal(authSecurityPlatform.verifyToken(tampered), null);
    assert.equal(authSecurityPlatform.verifyRefreshToken(session.refreshToken)?.userId, 'user-2');

    assert.equal(authSecurityPlatform.revokeSession(session.token), true);
    assert.equal(authSecurityPlatform.verifyToken(session.token), null);
    assert.equal(authSecurityPlatform.verifyRefreshToken(session.refreshToken), null);
  });

  test('rotates refresh tokens and revokes previous credentials on refreshSession', () => {
    const initial = authSecurityPlatform.createToken('user-rotate', 'rotate@example.test', 'OPERATOR');
    const rotated = authSecurityPlatform.refreshSession(initial.refreshToken);

    assert.ok(rotated);
    assert.equal(rotated.userId, 'user-rotate');
    assert.equal(rotated.role, 'OPERATOR');
    assert.notEqual(rotated.token, initial.token);
    assert.notEqual(rotated.refreshToken, initial.refreshToken);

    // Old access and refresh tokens must both be invalidated
    assert.equal(authSecurityPlatform.verifyToken(initial.token), null);
    assert.equal(authSecurityPlatform.verifyRefreshToken(initial.refreshToken), null);

    // New credentials must be valid
    assert.equal(authSecurityPlatform.verifyToken(rotated.token)?.userId, 'user-rotate');
    assert.equal(authSecurityPlatform.verifyRefreshToken(rotated.refreshToken)?.userId, 'user-rotate');

    // Revoking via refresh token invalidates the paired access token too
    assert.equal(authSecurityPlatform.revokeRefreshToken(rotated.refreshToken), true);
    assert.equal(authSecurityPlatform.verifyToken(rotated.token), null);
    assert.equal(authSecurityPlatform.verifyRefreshToken(rotated.refreshToken), null);
  });

  test('revokes all sessions belonging to a user without affecting other users', () => {
    const s1 = authSecurityPlatform.createToken('user-multi', 'multi@example.test', 'OPERATOR');
    const s2 = authSecurityPlatform.createToken('user-multi', 'multi@example.test', 'OPERATOR');
    const other = authSecurityPlatform.createToken('user-other', 'other@example.test', 'OPERATOR');

    const count = authSecurityPlatform.revokeUserSessions('user-multi');
    assert.equal(count, 2);
    assert.equal(authSecurityPlatform.verifyToken(s1.token), null);
    assert.equal(authSecurityPlatform.verifyToken(s2.token), null);
    assert.equal(authSecurityPlatform.verifyToken(other.token)?.userId, 'user-other');

    authSecurityPlatform.revokeSession(other.token);
  });

  test('enforces RBAC role permissions', () => {
    assert.equal(authSecurityPlatform.hasPermission('SOVEREIGN_ADMIN', 'ADMIN_ACCESS'), true);
    assert.equal(authSecurityPlatform.hasPermission('ENTERPRISE_ARCHITECT', 'ADMIN_ACCESS'), false);
    assert.equal(authSecurityPlatform.hasPermission('ENTERPRISE_ARCHITECT', 'CODE_GEN'), true);
    assert.equal(authSecurityPlatform.hasPermission('OPERATOR', 'CODE_GEN'), false);
    assert.equal(authSecurityPlatform.hasPermission('OPERATOR', 'READ_ONLY'), true);
    assert.equal(authSecurityPlatform.hasPermission('GUEST', 'ADMIN_ACCESS'), false);
  });

  test('hashes and verifies passwords with PBKDF2 v2 and encrypts secrets with AES-256-GCM', () => {
    const hash = authSecurityPlatform.hashPassword('CorrectHorseBatteryStaple!99');
    assert.ok(hash.startsWith('v2$120000$'));
    assert.equal(authSecurityPlatform.verifyPassword('CorrectHorseBatteryStaple!99', hash), true);
    assert.equal(authSecurityPlatform.verifyPassword('WrongPassword', hash), false);

    const enc = authSecurityPlatform.encryptSecret('top-secret-api-value');
    assert.ok(enc.ciphertext.startsWith('v2:'));
    assert.equal(authSecurityPlatform.decryptSecret(enc.ciphertext, enc.iv), 'top-secret-api-value');
  });

  test('rejects weak or placeholder security secrets', () => {
    assert.equal(isStrongSecuritySecret('change-me-please-now-12345678901234'), false);
    assert.equal(isStrongSecuritySecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), false);
    assert.equal(isStrongSecuritySecret('short'), false);
    assert.equal(isStrongSecuritySecret(crypto.randomBytes(32).toString('hex')), true);
  });
});
