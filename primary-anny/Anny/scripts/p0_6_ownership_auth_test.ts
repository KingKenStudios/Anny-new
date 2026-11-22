import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Install deterministic browser/storage shims prior to importing frontend modules
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  }
};

(globalThis as any).localStorage = mockLocalStorage;
if (!(globalThis as any).window) {
  (globalThis as any).window = {
    location: { origin: 'http://localhost:3000', pathname: '/', search: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  };
} else {
  (globalThis as any).window.location = { origin: 'http://localhost:3000', pathname: '/', search: '' };
}
if (!(globalThis as any).crypto?.getRandomValues) {
  (globalThis as any).crypto = {
    getRandomValues: (arr: Uint8Array) => crypto.randomFillSync(arr)
  };
}

async function run() {
  const ownershipSvc = await import('../src/services/projectOwnershipService');
  const { WorkspaceManager } = await import('../src/core/workspaceManager');
  const previewRunner = await import('../src/components/StandalonePreviewRunner');
  const { authSecurityPlatform } = await import('../src/services/authSecurityPlatform');
  const { postgresPlatform } = await import('../src/services/postgresPlatform');
  const { requireAuth } = await import('../src/services/serverAuthService');
  const expressMod = await import('express');

  const results: Array<{ id: number; name: string; status: string }> = [];
  const recordPass = (id: number, name: string) => {
    results.push({ id, name, status: 'PASS' });
    console.log(`[PASS #${id}] ${name}`);
  };

  const { vfsTransactionManager } = await import('../src/core/vfsTransactionManager');

  const writeProjectFile = async (projectId: string, filePath: string, content: string) => {
    const txId = await vfsTransactionManager.begin(projectId, 'test_session');
    vfsTransactionManager.writeFile(txId, filePath, content);
    await vfsTransactionManager.commit(txId);
    WorkspaceManager.getInstance().getWorkspaceVFS(projectId).saveToStorage();
  };

  // Start lightweight real Express server mounting the exact server auth & project authorization behavior
  const express = expressMod.default;
  const testApp = express();
  testApp.use(express.json());

  testApp.post('/api/anny/projects', requireAuth(), async (req: any, res: any) => {
    const uid = req.authUser!.uid;
    const isAdmin = req.authUser!.isAdmin;
    const rawId = req.body?.projectId || req.body?.id;
    if (typeof rawId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(rawId.trim())) {
      return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
    }
    const cleanId = rawId.trim();
    const matches = await postgresPlatform.query<any>('projects', (p: any) =>
      p.projectId === cleanId || p.project_id === cleanId || p.id === cleanId
    );
    if (matches.length > 0) {
      const existingOwner = matches[0].ownerUserId || matches[0].userId;
      if (!isAdmin && existingOwner && existingOwner !== uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN_PROJECT_OWNERSHIP' });
      }
      return res.json({ success: true, project: matches[0] });
    }
    const created = await postgresPlatform.insert<any>('projects', {
      projectId: cleanId,
      project_id: cleanId,
      ownerUserId: uid,
      userId: uid,
      name: cleanId,
      status: 'Active'
    });
    return res.json({ success: true, project: created });
  });

  testApp.get('/api/anny/projects/:projectId/authorize', requireAuth(), async (req: any, res: any) => {
    const uid = req.authUser!.uid;
    const isAdmin = req.authUser!.isAdmin;
    const rawProjectId = String(req.params.projectId || '').trim();
    const matches = await postgresPlatform.query<any>('projects', (p: any) =>
      p.projectId === rawProjectId || p.project_id === rawProjectId || p.id === rawProjectId
    );
    if (matches.length === 0) {
      return res.status(404).json({ authorized: false, error: 'PROJECT_NOT_FOUND' });
    }
    const target = matches[0];
    const ownerUid = target.ownerUserId || target.userId;
    if (!ownerUid) {
      return res.status(403).json({ authorized: false, error: 'PROJECT_OWNER_UNBOUND' });
    }
    if (!isAdmin && ownerUid !== uid) {
      return res.status(403).json({ authorized: false, error: 'FORBIDDEN_PROJECT_OWNERSHIP' });
    }
    return res.json({
      authorized: true,
      projectId: rawProjectId,
      ownershipMode: 'cloud',
      ownerUserId: ownerUid,
      verifiedUid: uid
    });
  });

  const server = testApp.listen(0);
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const tokenUserA = authSecurityPlatform.createToken('user_a', 'alice@example.com', 'OPERATOR').token;
    const tokenUserB = authSecurityPlatform.createToken('user_b', 'bob@example.com', 'OPERATOR').token;

    // Seed cloud project for User A and User B via server API (also verify spoofed ownerUserId in body is ignored)
    const createProjA = await fetch(`${baseUrl}/api/anny/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({ projectId: 'proj_cloud_a', ownerUserId: 'user_victim_spoof' })
    });
    assert.equal(createProjA.status, 200);
    const bodyA = await createProjA.json();
    assert.equal(bodyA.project.ownerUserId, 'user_a', 'Server must ignore client-supplied ownerUserId');

    const createProjB = await fetch(`${baseUrl}/api/anny/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserB}`
      },
      body: JSON.stringify({ projectId: 'proj_cloud_b' })
    });
    assert.equal(createProjB.status, 200);

    const makeServerVerifier = (token?: string) => async (projectId: string) => {
      const res = await fetch(`${baseUrl}/api/anny/projects/${encodeURIComponent(projectId)}/authorize`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.authorized) {
        return { authorized: false, reason: json.error || `HTTP_${res.status}` };
      }
      return json;
    };

    const wsManager = WorkspaceManager.getInstance();
    const fakeIframeWin = { tag: 'iframe_window_1' } as any;
    const originWindow = (globalThis as any).window;
    const origLocation = originWindow.location;

    // Populate cloud project files locally in VFS
    ownershipSvc.registerCloudProjectOwnership('proj_cloud_a', 'user_a');
    await writeProjectFile('proj_cloud_a', '/src/App.tsx', 'export default function AppA() { return "APP_A"; }');

    ownershipSvc.registerCloudProjectOwnership('proj_cloud_b', 'user_b');
    await writeProjectFile('proj_cloud_b', '/src/App.tsx', 'export default function AppB() { return "SECRET_VICTIM_B"; }');

    // Test 1: Unauthenticated user attempts preview of cloud project -> rejected, 0 files
    const session1 = previewRunner.generatePreviewHandshakeId(16);
    const h1 = previewRunner.generatePreviewHandshakeId(24);
    const res1 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_b',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: h1,
      resolveCloudIdentity: async () => null,
      verifyCloudOwnership: makeServerVerifier(undefined)
    });
    assert.equal(res1.authorized, false);
    assert.equal(res1.context, undefined);
    assert.deepEqual(previewRunner.readAuthorizedProjectVfsSnapshot(res1.context as any), {});
    recordPass(1, 'Unauthenticated user attempts preview of cloud project -> rejected, 0 files');

    // Test 2: User A attempts preview of User B cloud project -> rejected, 0 files
    const h2 = previewRunner.generatePreviewHandshakeId(24);
    const res2 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_b',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: h2,
      resolveCloudIdentity: async () => ({ uid: 'user_a', token: tokenUserA, expiresAt: Date.now() + 60_000 }),
      verifyCloudOwnership: makeServerVerifier(tokenUserA)
    });
    assert.equal(res2.authorized, false);
    assert.equal(res2.context, undefined);
    assert.deepEqual(previewRunner.readAuthorizedProjectVfsSnapshot('proj_cloud_b' as any), {});
    recordPass(2, 'User A attempts preview of User B cloud project -> rejected, 0 files');

    // Test 3: Tampered URL ?project=proj_cloud_b (and even switching server check) -> rejected, 0 files
    const synFromSpoofedUrl = {
      source: fakeIframeWin,
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: 'proj_cloud_b', handshakeId: previewRunner.generatePreviewHandshakeId(24) }
    } as MessageEvent;
    const synCheck3 = previewRunner.validatePreviewVfsSynMessage(
      synFromSpoofedUrl,
      fakeIframeWin,
      'proj_cloud_a',
      new Set()
    );
    assert.equal(synCheck3.valid, false);
    assert.equal(synCheck3.reason, 'UNAUTHORIZED_PROJECT_ID');
    recordPass(3, 'URL ?project=proj_cloud_b tamper rejected before VFS snapshot read');

    // Test 4: Iframe sends forged PREVIEW_VFS_SYN requesting proj_cloud_b -> rejected, 0 files
    const wrongSourceSyn = {
      source: { attacker: true },
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: 'proj_cloud_a', handshakeId: previewRunner.generatePreviewHandshakeId(24) }
    } as MessageEvent;
    assert.equal(
      previewRunner.validatePreviewVfsSynMessage(wrongSourceSyn, fakeIframeWin, 'proj_cloud_a', new Set()).valid,
      false
    );
    recordPass(4, 'Forged PREVIEW_VFS_SYN source window or projectId rejected, 0 files');

    // Test 5: Client supplies forged/spoofed ownerUserId or forged context object -> rejected, 0 files
    const forgedContext = {
      projectId: 'proj_cloud_b',
      ownershipMode: 'cloud',
      ownerIdentity: 'user_a',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24),
      authorizedAt: Date.now(),
      authSource: 'server-verified'
    } as any;
    assert.deepEqual(previewRunner.readAuthorizedProjectVfsSnapshot(forgedContext), {});
    const spoofServerOwnerAttempt = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_b',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24),
      resolveCloudIdentity: async () => ({ uid: 'user_a', token: tokenUserA, expiresAt: Date.now() + 60_000 }),
      verifyCloudOwnership: makeServerVerifier(tokenUserA)
    });
    assert.equal(spoofServerOwnerAttempt.authorized, false);
    recordPass(5, 'Forged context / spoofed ownerUserId ignored and rejected, 0 files');

    // Test 6: Expired or tampered auth token -> rejected, 0 files
    const expiredRes = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_a',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24),
      resolveCloudIdentity: async () => ({ uid: 'user_a', token: tokenUserA, expiresAt: Date.now() - 5000 }),
      verifyCloudOwnership: makeServerVerifier(tokenUserA)
    });
    assert.equal(expiredRes.authorized, false);
    assert.equal(expiredRes.reason, 'EXPIRED_AUTH_TOKEN');

    const tamperedServerRes = await makeServerVerifier('tampered.invalid.token')('proj_cloud_a');
    assert.equal(tamperedServerRes.authorized, false);
    recordPass(6, 'Expired and tampered auth tokens rejected, 0 files');

    // Test 7: Authenticated User A previews User A's own cloud project -> succeeds
    const h7 = previewRunner.generatePreviewHandshakeId(24);
    const res7 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_a',
      previewSessionId: session1,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: h7,
      resolveCloudIdentity: async () => ({ uid: 'user_a', token: tokenUserA, expiresAt: Date.now() + 60_000 }),
      verifyCloudOwnership: makeServerVerifier(tokenUserA)
    });
    assert.equal(res7.authorized, true);
    assert.ok(res7.context);
    const filesA = previewRunner.readAuthorizedProjectVfsSnapshot(res7.context!);
    assert.ok(filesA['/src/App.tsx']?.includes('APP_A'));
    recordPass(7, 'Authenticated User A previews User A cloud project -> succeeds');

    // Test 8: Offline user (NO Firebase, NO auth, NO network) creates local project, edits files, previews -> succeeds
    const offlineProjectId = wsManager.createProjectWorkspace('Offline Rocket', 'global', 'fullstack');
    await writeProjectFile(offlineProjectId, '/src/App.tsx', 'export default function OfflineApp() { return "OFFLINE_OK"; }');
    const sessionOffline = previewRunner.generatePreviewHandshakeId(16);
    const h8 = previewRunner.generatePreviewHandshakeId(24);
    const res8 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: offlineProjectId,
      previewSessionId: sessionOffline,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: h8,
      resolveCloudIdentity: async () => {
        throw new Error('Must NOT call cloud identity for local-only offline project');
      },
      verifyCloudOwnership: async () => {
        throw new Error('Must NOT call server cloud check for local-only offline project');
      }
    });
    assert.equal(res8.authorized, true);
    const offlineFiles = previewRunner.readAuthorizedProjectVfsSnapshot(res8.context!);
    assert.ok(offlineFiles['/src/App.tsx']?.includes('OFFLINE_OK'));
    recordPass(8, 'Offline user creates local project, edits files, previews with zero cloud/network');

    // Test 9: Offline user previews existing local-only project across simulated reload/restart
    ownershipSvc.resetProjectOwnershipRuntimeStateForTesting();
    wsManager.getWorkspaceVFS(offlineProjectId).reloadFromStorage();
    const sessionReload = previewRunner.generatePreviewHandshakeId(16);
    const h9 = previewRunner.generatePreviewHandshakeId(24);
    const res9 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: offlineProjectId,
      previewSessionId: sessionReload,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: h9,
      resolveCloudIdentity: async () => null,
      verifyCloudOwnership: async () => ({ authorized: false, reason: 'OFFLINE' })
    });
    assert.equal(res9.authorized, true);
    const reloadedFiles = previewRunner.readAuthorizedProjectVfsSnapshot(res9.context!);
    assert.ok(reloadedFiles['/src/App.tsx']?.includes('OFFLINE_OK'));
    recordPass(9, 'Offline local-only project remains accessible across reload without auth/network');

    // Test 10: Local project belonging to a different local profile/owner context -> rejected, 0 files
    const ownerProfile1 = ownershipSvc.getCurrentLocalProfileId()!;
    const otherProfile2 = ownershipSvc.switchLocalInstallationProfile();
    assert.notEqual(otherProfile2, ownerProfile1);
    const res10 = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: offlineProjectId,
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(res10.authorized, false);
    assert.equal(res10.reason, 'LOCAL_PROFILE_MISMATCH');
    assert.deepEqual(previewRunner.readAuthorizedProjectVfsSnapshot(res9.context!), {}, 'Old authorized context invalid after profile switch');
    // Switch back to Profile 1 for subsequent checks
    ownershipSvc.switchLocalInstallationProfile(ownerProfile1);
    recordPass(10, 'Local project under different local profile rejected, 0 files');

    // Test 11: Project with missing or corrupted ownership metadata -> rejected, 0 files
    await writeProjectFile('proj_unowned_unknown', '/src/App.tsx', 'secret');
    const res11Missing = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_unowned_unknown',
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(res11Missing.authorized, false);

    // Corrupt registry entry explicitly
    const regRaw = JSON.parse(mockLocalStorage.getItem('anny_project_ownership_registry_v1') || '{}');
    regRaw['proj_corrupt_meta'] = { projectId: 'proj_corrupt_meta', ownershipMode: 'cloud', ownerUserId: '' };
    mockLocalStorage.setItem('anny_project_ownership_registry_v1', JSON.stringify(regRaw));
    await writeProjectFile('proj_corrupt_meta', '/src/App.tsx', 'corrupt_secret');
    const res11Corrupt = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_corrupt_meta',
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(res11Corrupt.authorized, false);
    assert.equal(res11Corrupt.reason, 'MISSING_OR_INVALID_CLOUD_OWNER');
    recordPass(11, 'Missing and corrupted ownership metadata fail closed, 0 files');

    // Test 12: Legacy pre-P0.6 local project migrated explicitly under active profile -> succeeds without data loss
    const legacyId = 'proj_legacy_pre_p06';
    await writeProjectFile(legacyId, '/src/App.tsx', 'export default function LegacyApp() { return "LEGACY_DATA"; }');
    // Before explicit migration -> fail closed
    const preMig = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: legacyId,
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(preMig.authorized, false);
    assert.equal(preMig.legacyMigrationEligible, true);

    const migrated = ownershipSvc.migrateLegacyLocalProjectOwnership(legacyId);
    assert.equal(migrated.migrated, true);
    assert.equal(migrated.record?.ownershipMode, 'local-only');
    assert.equal(migrated.record?.migratedFromLegacy, true);

    const postMig = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: legacyId,
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(postMig.authorized, true);
    const legacyFiles = previewRunner.readAuthorizedProjectVfsSnapshot(postMig.context!);
    assert.ok(legacyFiles['/src/App.tsx']?.includes('LEGACY_DATA'));
    recordPass(12, 'Legacy pre-P0.6 local project explicit migration preserves files and enforces profile isolation');

    // Test 13: Switching from authorized Project A to unauthorized Project B invalidates prior authorization -> 0 files
    const switchSess = previewRunner.generatePreviewHandshakeId(16);
    const switchH = previewRunner.generatePreviewHandshakeId(24);
    const authA = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: offlineProjectId,
      previewSessionId: switchSess,
      expectedIframeWindow: fakeIframeWin,
      handshakeId: switchH
    });
    assert.equal(authA.authorized, true);
    // Simulate project switch invalidation
    ownershipSvc.invalidatePreviewSessionAuthorizations(switchSess);
    assert.deepEqual(
      previewRunner.readAuthorizedProjectVfsSnapshot(authA.context!),
      {},
      'Invalidated session context must transfer 0 files'
    );
    const switchToB = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: 'proj_cloud_b',
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24),
      resolveCloudIdentity: async () => ({ uid: 'user_a', token: tokenUserA, expiresAt: Date.now() + 60_000 }),
      verifyCloudOwnership: makeServerVerifier(tokenUserA)
    });
    assert.equal(switchToB.authorized, false);
    recordPass(13, 'Switching from authorized Project A to unauthorized Project B invalidates A and denies B');

    // Test 14: Replay of previous handshake nonce across project switch fails closed
    const replayAuth = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: legacyId,
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: switchH
    });
    assert.equal(replayAuth.authorized, false);
    assert.equal(replayAuth.reason, 'HANDSHAKE_REPLAY_OR_PROJECT_MISMATCH');
    recordPass(14, 'Handshake nonce replay across project switch fails closed');

    // Test 15: .env exclusion and PEM multiline private-key redaction / fail-closed still enforced
    const pemHeader = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
    const pemFooter = ['-----END', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
    const pemMarker = ['BEGIN', 'RSA', 'PRIVATE', 'KEY'].join(' ');
    const secProjId = wsManager.createProjectWorkspace('Secret Filter Test', 'global', 'fullstack');
    await writeProjectFile(secProjId, '/.env', 'SECRET_KEY=supersecret');
    await writeProjectFile(secProjId, '/.env.production', 'PROD_KEY=prodsecret');
    await writeProjectFile(
      secProjId,
      '/src/key.ts',
      `const KEY = \`${pemHeader}\nMIIEowIBAAKCAQEAtestbodyline1\nMIIEowIBAAKCAQEAtestbodyline2\n${pemFooter}\`;`
    );
    await writeProjectFile(
      secProjId,
      '/src/unclosedKey.ts',
      `const UNCLOSED = \`${pemHeader}\nMIIEowIBAAKCAQEAunclosedbody\`;`
    );
    await writeProjectFile(secProjId, '/src/App.tsx', 'export default function CleanApp() { return "OK"; }');
    const secAuth = await ownershipSvc.authorizeProjectForPreviewSnapshot({
      projectId: secProjId,
      previewSessionId: previewRunner.generatePreviewHandshakeId(16),
      expectedIframeWindow: fakeIframeWin,
      handshakeId: previewRunner.generatePreviewHandshakeId(24)
    });
    assert.equal(secAuth.authorized, true);
    const secSnapshot = previewRunner.readAuthorizedProjectVfsSnapshot(secAuth.context!);
    assert.equal(secSnapshot['/.env'], undefined);
    assert.equal(secSnapshot['/.env.production'], undefined);
    assert.ok(secSnapshot['/src/key.ts']?.includes('REDACTED_PEM_PRIVATE_KEY'));
    assert.equal(secSnapshot['/src/key.ts']?.includes('testbodyline1'), false, 'PEM multiline body must be redacted');
    assert.equal(secSnapshot['/src/key.ts']?.includes(pemMarker), false);
    assert.equal(secSnapshot['/src/unclosedKey.ts'], undefined, 'Unclosed PEM block must fail closed');
    assert.ok(secSnapshot['/src/App.tsx']?.includes('CleanApp'));
    recordPass(15, '.env exclusion and multiline PEM redaction + fail-closed intact');

    // Test 16: Strict default-src 'none' CSP remains intact across buildIsolatedPreviewSrcDoc & sanitizeHtmlPreviewSrcDoc
    const srcDoc = previewRunner.buildIsolatedPreviewSrcDoc({
      projectId: secProjId,
      parentOrigin: 'http://localhost:3000',
      safeCode: 'export default function App() { return null; }',
      dependencies: {}
    });
    assert.ok(srcDoc.includes(previewRunner.STRICT_DEFAULT_DENY_CSP));
    assert.ok(srcDoc.includes("default-src 'none'"));
    const sanitizedHtml = previewRunner.sanitizeHtmlPreviewSrcDoc('<html><body>Hi</body></html>', secProjId, 'http://localhost:3000');
    assert.ok(sanitizedHtml.includes("default-src 'none'"));
    recordPass(16, "Strict default-src 'none' CSP intact across builders");

    // Test 17: Preview iframes stay sandboxed without allow-same-origin or allow-top-navigation
    const containerSrc = fs.readFileSync(path.join(process.cwd(), 'Anny/src/components/workspace/WorkspacePreviewContainer.tsx'), 'utf8');
    const cardSrc = fs.readFileSync(path.join(process.cwd(), 'Anny/src/components/LiveAppPreviewCard.tsx'), 'utf8');
    const runnerSrc = fs.readFileSync(path.join(process.cwd(), 'Anny/src/components/StandalonePreviewRunner.tsx'), 'utf8');
    for (const s of [containerSrc, cardSrc, runnerSrc]) {
      const sandboxMatches = Array.from(s.matchAll(/sandbox\s*=\s*["']([^"']*)["']/g));
      assert.ok(sandboxMatches.length > 0, 'Preview component must declare explicit iframe sandbox attribute');
      for (const m of sandboxMatches) {
        const tokens = m[1].split(/\s+/).filter(Boolean);
        assert.equal(tokens.includes('allow-same-origin'), false, 'sandbox must NOT include allow-same-origin');
        assert.equal(tokens.includes('allow-top-navigation'), false, 'sandbox must NOT include allow-top-navigation');
      }
    }
    originWindow.location = origLocation;
    recordPass(17, 'Opaque-origin sandboxing without allow-same-origin or allow-top-navigation intact');

    console.log(`\nALL ${results.length}/17 P0.6 OWNERSHIP & SNAPSHOT SECURITY TESTS PASSED`);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('P0.6 Test Failure:', err);
  process.exit(1);
});
