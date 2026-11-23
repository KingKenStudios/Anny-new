import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PostgresPlatform } from './postgresPlatform';

type SessionRow = {
  token_hash: string;
  refresh_token_hash: string;
  user_id: string;
  username: string;
  role: string;
  access_expires_at: number;
  refresh_expires_at: number;
  revoked_at: string | null;
};

class FakePgPool {
  rows = new Map<string, SessionRow>();

  private async execute(sql: string, params: any[] = [], target = this.rows): Promise<any> {
    if (/CREATE TABLE IF NOT EXISTS auth_sessions/.test(sql)) return { rows: [], rowCount: 0 };
    if (/INSERT INTO auth_sessions/.test(sql)) {
      const [tokenHash, refreshHash, userId, username, role, accessExpiry, refreshExpiry] = params;
      if (target.has(tokenHash) || [...target.values()].some(row => row.refresh_token_hash === refreshHash)) {
        throw new Error('duplicate session credential');
      }
      target.set(tokenHash, {
        token_hash: tokenHash,
        refresh_token_hash: refreshHash,
        user_id: userId,
        username,
        role,
        access_expires_at: accessExpiry,
        refresh_expires_at: refreshExpiry,
        revoked_at: null
      });
      return { rows: [], rowCount: 1 };
    }
    if (/SELECT token_hash/.test(sql)) {
      const row = [...target.values()].find(candidate =>
        (sql.includes('token_hash = $1') ? candidate.token_hash : candidate.refresh_token_hash) === params[0] &&
        candidate.revoked_at === null &&
        (sql.includes('access_expires_at >') ? candidate.access_expires_at : candidate.refresh_expires_at) > params[1]
      );
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }
    if (/UPDATE auth_sessions/.test(sql)) {
      const [key, now] = params;
      const matching = [...target.values()].filter(row => {
        if (sql.includes('token_hash = $1')) return row.token_hash === key && row.revoked_at === null;
        if (sql.includes('refresh_token_hash = $1')) {
          return row.refresh_token_hash === key && row.revoked_at === null &&
            (!sql.includes('refresh_expires_at >') || row.refresh_expires_at > now);
        }
        return row.user_id === key && row.revoked_at === null;
      });
      matching.forEach(row => { row.revoked_at = new Date().toISOString(); });
      return { rows: [], rowCount: matching.length };
    }
    throw new Error('Unexpected SQL in fake PostgreSQL pool');
  }

  query(sql: string, params: any[] = []) {
    return this.execute(sql, params);
  }

  async connect() {
    let transactionRows: Map<string, SessionRow> | null = null;
    return {
      query: async (sql: string, params: any[] = []) => {
        if (sql === 'BEGIN') {
          transactionRows = new Map([...this.rows.entries()].map(([key, value]) => [key, { ...value }]));
          return { rows: [], rowCount: 0 };
        }
        if (sql === 'ROLLBACK') {
          transactionRows = null;
          return { rows: [], rowCount: 0 };
        }
        if (sql === 'COMMIT') {
          if (transactionRows) this.rows = transactionRows;
          transactionRows = null;
          return { rows: [], rowCount: 0 };
        }
        return this.execute(sql, params, transactionRows || this.rows);
      },
      release: () => {}
    };
  }
}

function createPlatform(pool: FakePgPool): PostgresPlatform {
  const platform = Object.create(PostgresPlatform.prototype) as any;
  platform.pool = pool;
  platform.authSessionSchemaPromise = null;
  return platform as PostgresPlatform;
}

const baseSession = {
  tokenHash: 'a'.repeat(64),
  refreshTokenHash: 'b'.repeat(64),
  userId: 'user-1',
  username: 'user@example.test',
  role: 'OPERATOR',
  accessExpiresAt: Date.now() + 60_000,
  refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
};

test('PostgreSQL session registry stores only credential hashes and reads active sessions', async () => {
  const pool = new FakePgPool();
  const platform = createPlatform(pool);
  assert.equal(await platform.storeAuthSession(baseSession), true);
  const byAccess = await platform.findAuthSessionByTokenHash(baseSession.tokenHash);
  const byRefresh = await platform.findAuthSessionByRefreshHash(baseSession.refreshTokenHash);
  assert.equal(byAccess?.user_id, 'user-1');
  assert.equal(byRefresh?.username, 'user@example.test');
  assert.equal(pool.rows.size, 1);
  assert.equal([...pool.rows.values()][0].token_hash, baseSession.tokenHash);
});

test('refresh rotation atomically consumes the old refresh hash and prevents replay', async () => {
  const pool = new FakePgPool();
  const platform = createPlatform(pool);
  await platform.storeAuthSession(baseSession);
  const replacement = {
    ...baseSession,
    tokenHash: 'c'.repeat(64),
    refreshTokenHash: 'd'.repeat(64)
  };

  assert.equal(await platform.rotateAuthSession(baseSession.refreshTokenHash, replacement), true);
  assert.equal(await platform.findAuthSessionByRefreshHash(baseSession.refreshTokenHash), null);
  assert.equal((await platform.findAuthSessionByTokenHash(replacement.tokenHash))?.user_id, 'user-1');
  assert.equal(await platform.rotateAuthSession(baseSession.refreshTokenHash, {
    ...replacement,
    tokenHash: 'e'.repeat(64),
    refreshTokenHash: 'f'.repeat(64)
  }), false);
  assert.equal(pool.rows.size, 2);
});

test('durable logout revokes by access token, refresh token, and user', async () => {
  const pool = new FakePgPool();
  const platform = createPlatform(pool);
  await platform.storeAuthSession(baseSession);
  assert.equal(await platform.revokeAuthSessionByTokenHash(baseSession.tokenHash), true);
  assert.equal(await platform.findAuthSessionByTokenHash(baseSession.tokenHash), null);

  await platform.storeAuthSession({
    ...baseSession,
    tokenHash: 'c'.repeat(64),
    refreshTokenHash: 'd'.repeat(64)
  });
  assert.equal(await platform.revokeAuthSessionByRefreshHash('d'.repeat(64)), true);

  await platform.storeAuthSession({
    ...baseSession,
    tokenHash: 'e'.repeat(64),
    refreshTokenHash: 'f'.repeat(64)
  });
  assert.equal(await platform.revokeAuthSessionsForUser('user-1'), 1);
});
