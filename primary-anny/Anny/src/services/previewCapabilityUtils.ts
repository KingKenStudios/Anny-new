import crypto from 'node:crypto';
import { isStrongSecuritySecret } from './envConfigService';

export interface PreviewCapabilityIdentity {
  previewId: string;
  projectId: string;
  ownerUserId: string;
  updatedAt: string;
}

/**
 * Deterministic, server-secret-bound capability credential. Only the stable
 * session identity and update timestamp are inputs; no raw token is persisted.
 */
export function derivePreviewCapabilityToken(
  secret: string,
  identity: PreviewCapabilityIdentity
): string {
  if (!isStrongSecuritySecret(secret)) {
    throw new Error('PREVIEW_CAPABILITY_SECRET_UNAVAILABLE');
  }
  const material = [
    identity.previewId,
    identity.projectId,
    identity.ownerUserId,
    identity.updatedAt
  ].join('\u0000');
  return crypto.createHmac('sha256', secret).update(material).digest('hex');
}
