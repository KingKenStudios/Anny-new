import { safeStorage } from '../lib/storage';
import { auth } from '../lib/firebase';

export type ProjectOwnershipMode = 'cloud' | 'local-only';

export interface ProjectOwnershipRecord {
  projectId: string;
  ownershipMode: ProjectOwnershipMode;
  ownerUserId?: string;
  localProfileId?: string;
  boundAuthUid?: string;
  migratedFromLegacy?: boolean;
  migratedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LocalInstallationProfile {
  localProfileId: string;
  label: string;
  createdAt: number;
}

export interface AuthenticatedCloudIdentity {
  uid: string;
  token?: string;
  expiresAt?: number;
  isAdmin?: boolean;
  email?: string;
}

export interface ServerProjectAuthorizationResponse {
  authorized: boolean;
  projectId?: string;
  ownershipMode?: 'cloud';
  ownerUserId?: string;
  verifiedUid?: string;
  reason?: string;
}

export interface VerifiedPreviewAuthorizationContext {
  readonly projectId: string;
  readonly ownershipMode: ProjectOwnershipMode;
  readonly ownerIdentity: string;
  readonly previewSessionId: string;
  readonly expectedIframeWindow: unknown;
  readonly handshakeId: string;
  readonly authorizedAt: number;
  readonly authSource: 'server-verified' | 'local-profile';
}

export interface ProjectAuthorizationResult {
  authorized: boolean;
  reason?: string;
  legacyMigrationEligible?: boolean;
  context?: VerifiedPreviewAuthorizationContext;
}

export interface AuthorizePreviewOptions {
  projectId: string;
  previewSessionId: string;
  expectedIframeWindow: unknown;
  handshakeId: string;
  isRefreshOnActiveHandshake?: boolean;
  resolveCloudIdentity?: () => Promise<AuthenticatedCloudIdentity | null>;
  verifyCloudOwnership?: (
    projectId: string,
    identity: AuthenticatedCloudIdentity
  ) => Promise<ServerProjectAuthorizationResponse>;
}

const VALID_PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_HANDSHAKE_ID_REGEX = /^[a-f0-9]{32,128}$/i;
const VALID_LOCAL_PROFILE_REGEX = /^local_[a-f0-9]{16,64}$/i;
const VALID_PREVIEW_SESSION_REGEX = /^[a-f0-9_-]{16,128}$/i;

const LOCAL_PROFILE_STORAGE_KEY = 'anny_local_installation_profile_v1';
const OWNERSHIP_REGISTRY_STORAGE_KEY = 'anny_project_ownership_registry_v1';

const RESERVED_PLACEHOLDER_OWNERS = new Set([
  '',
  'global',
  'default',
  'anonymous',
  'anon',
  'shared',
  'public',
  'unknown',
  'guest',
  'null',
  'undefined'
]);

const VERIFIED_CONTEXT_BRAND = new WeakSet<VerifiedPreviewAuthorizationContext>();

interface ActiveSessionAuthBinding {
  projectId: string;
  handshakeId: string;
  ownerIdentity: string;
  ownershipMode: ProjectOwnershipMode;
  expectedIframeWindow: unknown;
  authorizedAt: number;
}

const activeSessionAuths = new Map<string, ActiveSessionAuthBinding>();
const consumedContextHandshakes = new Map<
  string,
  { projectId: string; previewSessionId: string }
>();

function generateSecureHex(bytes = 12): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
  throw new Error('CSPRNG_UNAVAILABLE: Secure identity generation requires Web Crypto getRandomValues.');
}

function isPlaceholderOwner(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  return RESERVED_PLACEHOLDER_OWNERS.has(normalized);
}

function readRegistryMap(): Record<string, unknown> {
  try {
    const raw = safeStorage.getItem(OWNERSHIP_REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeRegistryMap(registry: Record<string, unknown>): void {
  safeStorage.setItem(OWNERSHIP_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
}

export function getRawProjectOwnershipRecord(projectId: string): unknown {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    return null;
  }
  const registry = readRegistryMap();
  return Object.prototype.hasOwnProperty.call(registry, projectId)
    ? registry[projectId]
    : null;
}

export function validateOwnershipRecordIntegrity(
  raw: unknown,
  expectedProjectId?: string
): { valid: boolean; reason?: string; record?: ProjectOwnershipRecord } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, reason: 'CORRUPTED_OWNERSHIP_METADATA' };
  }
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.projectId !== 'string' ||
    !VALID_PROJECT_ID_REGEX.test(candidate.projectId) ||
    (expectedProjectId && candidate.projectId !== expectedProjectId)
  ) {
    return { valid: false, reason: 'CORRUPTED_OWNERSHIP_PROJECT_ID' };
  }

  if (candidate.ownershipMode !== 'cloud' && candidate.ownershipMode !== 'local-only') {
    return { valid: false, reason: 'INVALID_OWNERSHIP_MODE' };
  }

  if (candidate.ownershipMode === 'cloud') {
    if (
      typeof candidate.ownerUserId !== 'string' ||
      candidate.ownerUserId.trim().length === 0 ||
      candidate.ownerUserId.length > 160 ||
      isPlaceholderOwner(candidate.ownerUserId)
    ) {
      return { valid: false, reason: 'MISSING_OR_INVALID_CLOUD_OWNER' };
    }
    return {
      valid: true,
      record: {
        projectId: candidate.projectId,
        ownershipMode: 'cloud',
        ownerUserId: candidate.ownerUserId.trim(),
        createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now()
      }
    };
  }

  // local-only
  if (
    typeof candidate.localProfileId !== 'string' ||
    !VALID_LOCAL_PROFILE_REGEX.test(candidate.localProfileId) ||
    isPlaceholderOwner(candidate.localProfileId)
  ) {
    return { valid: false, reason: 'MISSING_OR_INVALID_LOCAL_OWNER' };
  }

  const boundAuthUid =
    typeof candidate.boundAuthUid === 'string' && !isPlaceholderOwner(candidate.boundAuthUid)
      ? candidate.boundAuthUid.trim()
      : undefined;

  return {
    valid: true,
    record: {
      projectId: candidate.projectId,
      ownershipMode: 'local-only',
      localProfileId: candidate.localProfileId,
      ...(boundAuthUid ? { boundAuthUid } : {}),
      ...(candidate.migratedFromLegacy === true ? { migratedFromLegacy: true } : {}),
      ...(typeof candidate.migratedAt === 'number' ? { migratedAt: candidate.migratedAt } : {}),
      createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
      updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now()
    }
  };
}

export function getProjectOwnershipRecord(projectId: string): ProjectOwnershipRecord | null {
  const raw = getRawProjectOwnershipRecord(projectId);
  if (!raw) return null;
  const checked = validateOwnershipRecordIntegrity(raw, projectId);
  return checked.valid && checked.record ? checked.record : null;
}

export function getCurrentLocalProfileId(): string | null {
  try {
    const raw = safeStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalInstallationProfile>;
    if (
      typeof parsed?.localProfileId === 'string' &&
      VALID_LOCAL_PROFILE_REGEX.test(parsed.localProfileId)
    ) {
      return parsed.localProfileId;
    }
    return null;
  } catch {
    return null;
  }
}

export function getOrCreateLocalInstallationProfileId(label = 'Local Offline Profile'): string {
  const existing = getCurrentLocalProfileId();
  if (existing) return existing;

  const localProfileId = `local_${generateSecureHex(12)}`;
  const profile: LocalInstallationProfile = {
    localProfileId,
    label: label.slice(0, 80) || 'Local Offline Profile',
    createdAt: Date.now()
  };
  safeStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return localProfileId;
}

export function switchLocalInstallationProfile(
  profileId?: string,
  label = 'Local Offline Profile'
): string {
  let nextProfileId = profileId;
  if (nextProfileId !== undefined) {
    if (
      typeof nextProfileId !== 'string' ||
      !VALID_LOCAL_PROFILE_REGEX.test(nextProfileId) ||
      isPlaceholderOwner(nextProfileId)
    ) {
      throw new Error('INVALID_LOCAL_PROFILE_ID');
    }
  } else {
    nextProfileId = `local_${generateSecureHex(12)}`;
  }

  const profile: LocalInstallationProfile = {
    localProfileId: nextProfileId,
    label: label.slice(0, 80) || 'Local Offline Profile',
    createdAt: Date.now()
  };
  safeStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return nextProfileId;
}

export function registerLocalProjectOwnership(
  projectId: string,
  options?: { localProfileId?: string; boundAuthUid?: string }
): ProjectOwnershipRecord {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    throw new Error('INVALID_PROJECT_ID');
  }

  const profileId = options?.localProfileId || getOrCreateLocalInstallationProfileId();
  if (!VALID_LOCAL_PROFILE_REGEX.test(profileId) || isPlaceholderOwner(profileId)) {
    throw new Error('INVALID_LOCAL_PROFILE_ID');
  }

  const rawExisting = getRawProjectOwnershipRecord(projectId);
  if (rawExisting !== null) {
    const existingCheck = validateOwnershipRecordIntegrity(rawExisting, projectId);
    if (!existingCheck.valid || !existingCheck.record) {
      throw new Error(existingCheck.reason || 'CORRUPTED_OWNERSHIP_METADATA');
    }
    const existing = existingCheck.record;
    if (existing.ownershipMode === 'cloud') {
      throw new Error('CANNOT_DOWNGRADE_CLOUD_OWNERSHIP');
    }
    if (existing.localProfileId !== profileId) {
      throw new Error('CANNOT_REASSIGN_LOCAL_OWNERSHIP');
    }
    const updated: ProjectOwnershipRecord = {
      ...existing,
      updatedAt: Date.now()
    };
    const registry = readRegistryMap();
    registry[projectId] = updated;
    writeRegistryMap(registry);
    return updated;
  }

  const now = Date.now();
  const cleanBoundUid =
    typeof options?.boundAuthUid === 'string' && !isPlaceholderOwner(options.boundAuthUid)
      ? options.boundAuthUid.trim()
      : undefined;

  const record: ProjectOwnershipRecord = {
    projectId,
    ownershipMode: 'local-only',
    localProfileId: profileId,
    ...(cleanBoundUid ? { boundAuthUid: cleanBoundUid } : {}),
    createdAt: now,
    updatedAt: now
  };
  const registry = readRegistryMap();
  registry[projectId] = record;
  writeRegistryMap(registry);
  return record;
}

export function registerCloudProjectOwnership(
  projectId: string,
  ownerUserId: string
): ProjectOwnershipRecord {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    throw new Error('INVALID_PROJECT_ID');
  }
  if (
    typeof ownerUserId !== 'string' ||
    ownerUserId.trim().length === 0 ||
    ownerUserId.length > 160 ||
    isPlaceholderOwner(ownerUserId)
  ) {
    throw new Error('INVALID_CLOUD_OWNER_USER_ID');
  }

  const cleanOwner = ownerUserId.trim();
  const existing = getProjectOwnershipRecord(projectId);
  const now = Date.now();
  const record: ProjectOwnershipRecord = {
    projectId,
    ownershipMode: 'cloud',
    ownerUserId: cleanOwner,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const registry = readRegistryMap();
  registry[projectId] = record;
  writeRegistryMap(registry);
  return record;
}

function parseVfsEntryCount(storageKey: string): { hasData: boolean; hasCloudClaim: boolean } {
  try {
    const raw = safeStorage.getItem(storageKey);
    if (!raw) return { hasData: false, hasCloudClaim: false };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { hasData: parsed.length > 0, hasCloudClaim: false };
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.type === 'directory' &&
      parsed.children &&
      typeof parsed.children === 'object'
    ) {
      return { hasData: Object.keys(parsed.children).length > 0, hasCloudClaim: false };
    }
    return { hasData: false, hasCloudClaim: false };
  } catch {
    return { hasData: false, hasCloudClaim: false };
  }
}

export function hasLegacyUnownedLocalVfsData(projectId: string): boolean {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    return false;
  }
  if (getRawProjectOwnershipRecord(projectId) !== null) {
    return false;
  }
  const primary = parseVfsEntryCount(`anny_anny_vfs_${projectId}`);
  if (primary.hasData) return true;
  const legacyPrefix = parseVfsEntryCount(`anny_vfs_${projectId}`);
  return legacyPrefix.hasData;
}

/**
 * Explicit, non-destructive migration for pre-P0.6 local VFS projects that have no ownership metadata yet.
 * Never deletes or alters user project files, never migrates corrupted/cloud records, and never claims
 * fabricated/empty project IDs with no VFS data on disk.
 */
export function migrateLegacyLocalProjectOwnership(
  projectId: string,
  targetLocalProfileId?: string
): { migrated: boolean; reason?: string; record?: ProjectOwnershipRecord } {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    return { migrated: false, reason: 'INVALID_PROJECT_ID' };
  }

  const rawExisting = getRawProjectOwnershipRecord(projectId);
  if (rawExisting !== null) {
    const integrity = validateOwnershipRecordIntegrity(rawExisting, projectId);
    if (!integrity.valid) {
      return { migrated: false, reason: integrity.reason || 'CORRUPTED_OWNERSHIP_METADATA' };
    }
    return { migrated: false, reason: 'ALREADY_HAS_OWNERSHIP_METADATA', record: integrity.record };
  }

  if (!hasLegacyUnownedLocalVfsData(projectId)) {
    return { migrated: false, reason: 'NO_LEGACY_PROJECT_DATA_FOUND' };
  }

  const profileId = targetLocalProfileId || getOrCreateLocalInstallationProfileId();
  if (!VALID_LOCAL_PROFILE_REGEX.test(profileId) || isPlaceholderOwner(profileId)) {
    return { migrated: false, reason: 'INVALID_LOCAL_PROFILE_ID' };
  }

  const now = Date.now();
  const record: ProjectOwnershipRecord = {
    projectId,
    ownershipMode: 'local-only',
    localProfileId: profileId,
    migratedFromLegacy: true,
    migratedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const registry = readRegistryMap();
  registry[projectId] = record;
  writeRegistryMap(registry);
  return { migrated: true, record };
}

function getCurrentSignedInFirebaseUid(): string | null {
  try {
    const uid = auth?.currentUser?.uid;
    return typeof uid === 'string' && !isPlaceholderOwner(uid) ? uid : null;
  } catch {
    return null;
  }
}

export async function defaultResolveAuthenticatedCloudIdentity(): Promise<AuthenticatedCloudIdentity | null> {
  try {
    const fbUser = auth?.currentUser;
    if (fbUser && typeof fbUser.uid === 'string' && !isPlaceholderOwner(fbUser.uid)) {
      const tokenResult = typeof fbUser.getIdTokenResult === 'function'
        ? await fbUser.getIdTokenResult(false)
        : null;
      const expiresAt = tokenResult?.expirationTime
        ? Date.parse(tokenResult.expirationTime)
        : undefined;
      if (expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
        return null;
      }
      const token = typeof fbUser.getIdToken === 'function' ? await fbUser.getIdToken(false) : undefined;
      if (!token) return null;
      return {
        uid: fbUser.uid,
        token,
        expiresAt,
        email: fbUser.email || undefined
      };
    }

    // Check if an ANNY HttpOnly server session cookie or active verified session exists (e.g. sovereign admin)
    if (typeof fetch === 'function') {
      const sessionRes = await fetch('/api/admin/session', {
        method: 'GET',
        credentials: 'same-origin'
      });
      if (sessionRes.ok) {
        const data = await sessionRes.json().catch(() => null);
        if (data?.authenticated === true && typeof data.uid === 'string' && !isPlaceholderOwner(data.uid)) {
          return {
            uid: data.uid,
            isAdmin: Boolean(data.isAdmin),
            email: typeof data.email === 'string' ? data.email : undefined
          };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function defaultVerifyServerCloudOwnership(
  projectId: string,
  identity: AuthenticatedCloudIdentity
): Promise<ServerProjectAuthorizationResponse> {
  if (typeof fetch !== 'function') {
    return { authorized: false, reason: 'NETWORK_FETCH_UNAVAILABLE' };
  }
  try {
    const headers: Record<string, string> = {};
    if (identity.token) {
      headers['Authorization'] = `Bearer ${identity.token}`;
    }
    const res = await fetch(`/api/anny/projects/${encodeURIComponent(projectId)}/authorize`, {
      method: 'GET',
      credentials: 'same-origin',
      headers
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.authorized !== true) {
      return {
        authorized: false,
        reason: (body && typeof body.error === 'string' ? body.error : undefined) || `HTTP_${res.status}`
      };
    }
    return {
      authorized: true,
      projectId: body.projectId,
      ownershipMode: 'cloud',
      ownerUserId: body.ownerUserId,
      verifiedUid: body.verifiedUid
    };
  } catch {
    return { authorized: false, reason: 'SERVER_AUTHORIZATION_REQUEST_FAILED' };
  }
}

export function invalidatePreviewSessionAuthorizations(previewSessionId?: string | null): void {
  if (!previewSessionId) return;
  activeSessionAuths.delete(previewSessionId);
  for (const [handshakeId, binding] of consumedContextHandshakes.entries()) {
    if (binding.previewSessionId === previewSessionId) {
      // Mark as revoked from active session while retaining handshakeId anti-replay record
      consumedContextHandshakes.set(handshakeId, {
        projectId: `__REVOKED__${binding.projectId}`,
        previewSessionId: `__REVOKED__${binding.previewSessionId}`
      });
    }
  }
}

export async function authorizeProjectForPreviewSnapshot(
  options: AuthorizePreviewOptions
): Promise<ProjectAuthorizationResult> {
  const {
    projectId,
    previewSessionId,
    expectedIframeWindow,
    handshakeId,
    isRefreshOnActiveHandshake = false,
    resolveCloudIdentity = defaultResolveAuthenticatedCloudIdentity,
    verifyCloudOwnership = defaultVerifyServerCloudOwnership
  } = options;

  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    return { authorized: false, reason: 'INVALID_PROJECT_ID' };
  }
  if (typeof previewSessionId !== 'string' || !VALID_PREVIEW_SESSION_REGEX.test(previewSessionId)) {
    return { authorized: false, reason: 'INVALID_PREVIEW_SESSION_ID' };
  }
  if (typeof handshakeId !== 'string' || !VALID_HANDSHAKE_ID_REGEX.test(handshakeId)) {
    return { authorized: false, reason: 'INVALID_HANDSHAKE_ID' };
  }
  if (!expectedIframeWindow || typeof expectedIframeWindow !== 'object') {
    return { authorized: false, reason: 'INVALID_EXPECTED_IFRAME_WINDOW' };
  }

  // Prevent handshake nonce replay across projects or invalidated sessions
  const priorHandshakeBinding = consumedContextHandshakes.get(handshakeId);
  if (priorHandshakeBinding) {
    const matchesActive =
      isRefreshOnActiveHandshake &&
      priorHandshakeBinding.projectId === projectId &&
      priorHandshakeBinding.previewSessionId === previewSessionId;
    if (!matchesActive) {
      return { authorized: false, reason: 'HANDSHAKE_REPLAY_OR_PROJECT_MISMATCH' };
    }
  }

  // Ownership record must exist and pass structural integrity before reading any files
  const rawRecord = getRawProjectOwnershipRecord(projectId);
  if (rawRecord === null) {
    const legacyEligible = hasLegacyUnownedLocalVfsData(projectId);
    return {
      authorized: false,
      reason: legacyEligible ? 'LEGACY_LOCAL_PROJECT_REQUIRES_MIGRATION' : 'MISSING_OWNERSHIP_METADATA',
      legacyMigrationEligible: legacyEligible
    };
  }

  const recordCheck = validateOwnershipRecordIntegrity(rawRecord, projectId);
  if (!recordCheck.valid || !recordCheck.record) {
    return {
      authorized: false,
      reason: recordCheck.reason || 'CORRUPTED_OWNERSHIP_METADATA'
    };
  }

  const record = recordCheck.record;

  // Local-only offline ownership branch (no Firebase, Firestore, or network required)
  if (record.ownershipMode === 'local-only') {
    const activeLocalProfileId = getCurrentLocalProfileId();
    if (!activeLocalProfileId || record.localProfileId !== activeLocalProfileId) {
      return { authorized: false, reason: 'LOCAL_PROFILE_MISMATCH' };
    }

    // If created while signed into a specific non-global Firebase UID, block different signed-in Firebase users
    if (record.boundAuthUid) {
      const signedInUid = getCurrentSignedInFirebaseUid();
      if (signedInUid && signedInUid !== record.boundAuthUid) {
        return { authorized: false, reason: 'LOCAL_AUTH_USER_MISMATCH' };
      }
    }

    const context: VerifiedPreviewAuthorizationContext = Object.freeze({
      projectId,
      ownershipMode: 'local-only',
      ownerIdentity: activeLocalProfileId,
      previewSessionId,
      expectedIframeWindow,
      handshakeId,
      authorizedAt: Date.now(),
      authSource: 'local-profile'
    });

    VERIFIED_CONTEXT_BRAND.add(context);
    consumedContextHandshakes.set(handshakeId, { projectId, previewSessionId });
    activeSessionAuths.set(previewSessionId, {
      projectId,
      handshakeId,
      ownerIdentity: activeLocalProfileId,
      ownershipMode: 'local-only',
      expectedIframeWindow,
      authorizedAt: context.authorizedAt
    });

    return { authorized: true, context };
  }

  // Cloud ownership branch: must verify authenticated identity + server ownership (fail closed)
  const expectedOwnerUid = record.ownerUserId;
  if (!expectedOwnerUid || isPlaceholderOwner(expectedOwnerUid)) {
    return { authorized: false, reason: 'MISSING_CLOUD_OWNER' };
  }

  const identity = await resolveCloudIdentity();
  if (!identity || typeof identity.uid !== 'string' || isPlaceholderOwner(identity.uid)) {
    return { authorized: false, reason: 'UNAUTHENTICATED_CLOUD_PROJECT' };
  }
  if (identity.expiresAt !== undefined && (!Number.isFinite(identity.expiresAt) || identity.expiresAt <= Date.now())) {
    return { authorized: false, reason: 'EXPIRED_AUTH_TOKEN' };
  }
  if (!identity.isAdmin && identity.uid !== expectedOwnerUid) {
    return { authorized: false, reason: 'CLOUD_OWNER_MISMATCH' };
  }

  const serverCheck = await verifyCloudOwnership(projectId, identity);
  if (!serverCheck || serverCheck.authorized !== true) {
    return {
      authorized: false,
      reason: serverCheck?.reason || 'CLOUD_SERVER_AUTHORIZATION_FAILED'
    };
  }
  if (serverCheck.projectId && serverCheck.projectId !== projectId) {
    return { authorized: false, reason: 'SERVER_PROJECT_ID_MISMATCH' };
  }
  if (serverCheck.verifiedUid && serverCheck.verifiedUid !== identity.uid) {
    return { authorized: false, reason: 'SERVER_VERIFIED_UID_MISMATCH' };
  }
  if (
    !identity.isAdmin &&
    serverCheck.ownerUserId &&
    serverCheck.ownerUserId !== identity.uid
  ) {
    return { authorized: false, reason: 'SERVER_CLOUD_OWNER_MISMATCH' };
  }

  // Re-verify active session hasn't already moved to another project while awaiting server
  const priorForSession = activeSessionAuths.get(previewSessionId);
  if (priorForSession && priorForSession.projectId !== projectId) {
    return { authorized: false, reason: 'SESSION_PROJECT_CHANGED_DURING_AUTH' };
  }

  const context: VerifiedPreviewAuthorizationContext = Object.freeze({
    projectId,
    ownershipMode: 'cloud',
    ownerIdentity: identity.uid,
    previewSessionId,
    expectedIframeWindow,
    handshakeId,
    authorizedAt: Date.now(),
    authSource: 'server-verified'
  });

  VERIFIED_CONTEXT_BRAND.add(context);
  consumedContextHandshakes.set(handshakeId, { projectId, previewSessionId });
  activeSessionAuths.set(previewSessionId, {
    projectId,
    handshakeId,
    ownerIdentity: identity.uid,
    ownershipMode: 'cloud',
    expectedIframeWindow,
    authorizedAt: context.authorizedAt
  });

  return { authorized: true, context };
}

/**
 * Synchronous verifier exclusively for local-only in-app contexts (never grants cloud access).
 */
export function authorizeLocalOnlyProjectSync(
  projectId: string
): { authorized: boolean; reason?: string; localProfileId?: string } {
  if (typeof projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(projectId)) {
    return { authorized: false, reason: 'INVALID_PROJECT_ID' };
  }
  const rawRecord = getRawProjectOwnershipRecord(projectId);
  if (rawRecord === null) {
    return { authorized: false, reason: 'MISSING_OWNERSHIP_METADATA' };
  }
  const checked = validateOwnershipRecordIntegrity(rawRecord, projectId);
  if (!checked.valid || !checked.record) {
    return { authorized: false, reason: checked.reason || 'CORRUPTED_OWNERSHIP_METADATA' };
  }
  if (checked.record.ownershipMode !== 'local-only') {
    return { authorized: false, reason: 'CLOUD_PROJECT_REQUIRES_ASYNC_VERIFICATION' };
  }
  const activeProfile = getCurrentLocalProfileId();
  if (!activeProfile || checked.record.localProfileId !== activeProfile) {
    return { authorized: false, reason: 'LOCAL_PROFILE_MISMATCH' };
  }
  if (checked.record.boundAuthUid) {
    const signedInUid = getCurrentSignedInFirebaseUid();
    if (signedInUid && signedInUid !== checked.record.boundAuthUid) {
      return { authorized: false, reason: 'LOCAL_AUTH_USER_MISMATCH' };
    }
  }
  return { authorized: true, localProfileId: activeProfile };
}

/**
 * Validates that a VerifiedPreviewAuthorizationContext is genuine, still bound to the active
 * preview session, unrevoked, and consistent with current ownership metadata at read time.
 */
export function isVerifiedAuthorizationContextValidForRead(
  authContext: unknown
): authContext is VerifiedPreviewAuthorizationContext {
  if (!authContext || typeof authContext !== 'object') {
    return false;
  }
  const ctx = authContext as VerifiedPreviewAuthorizationContext;
  if (!VERIFIED_CONTEXT_BRAND.has(ctx)) {
    return false;
  }
  if (
    typeof ctx.projectId !== 'string' ||
    !VALID_PROJECT_ID_REGEX.test(ctx.projectId) ||
    typeof ctx.previewSessionId !== 'string' ||
    !VALID_PREVIEW_SESSION_REGEX.test(ctx.previewSessionId) ||
    typeof ctx.handshakeId !== 'string' ||
    !VALID_HANDSHAKE_ID_REGEX.test(ctx.handshakeId) ||
    !ctx.expectedIframeWindow
  ) {
    return false;
  }

  const activeSession = activeSessionAuths.get(ctx.previewSessionId);
  if (
    !activeSession ||
    activeSession.projectId !== ctx.projectId ||
    activeSession.handshakeId !== ctx.handshakeId ||
    activeSession.ownershipMode !== ctx.ownershipMode ||
    activeSession.ownerIdentity !== ctx.ownerIdentity ||
    activeSession.expectedIframeWindow !== ctx.expectedIframeWindow
  ) {
    return false;
  }

  const currentRecord = getProjectOwnershipRecord(ctx.projectId);
  if (!currentRecord || currentRecord.ownershipMode !== ctx.ownershipMode) {
    return false;
  }

  if (ctx.ownershipMode === 'local-only') {
    const activeProfile = getCurrentLocalProfileId();
    if (!activeProfile || currentRecord.localProfileId !== activeProfile || activeProfile !== ctx.ownerIdentity) {
      return false;
    }
    if (currentRecord.boundAuthUid) {
      const signedInUid = getCurrentSignedInFirebaseUid();
      if (signedInUid && signedInUid !== currentRecord.boundAuthUid) {
        return false;
      }
    }
    return true;
  }

  // cloud mode live consistency check
  if (currentRecord.ownerUserId !== ctx.ownerIdentity) {
    // Allow only if verified at auth time via admin override, otherwise reject
    const signedInUid = getCurrentSignedInFirebaseUid();
    if (signedInUid && signedInUid !== ctx.ownerIdentity) {
      return false;
    }
  }
  return true;
}

export function resetProjectOwnershipRuntimeStateForTesting(): void {
  activeSessionAuths.clear();
  consumedContextHandshakes.clear();
}
