/**
 * Tenant-scope guards shared by memory ingestion and retrieval.
 * Private knowledge must never be indexed or retrieved without a verified owner.
 */
export function requireTenantOwner(ownerUserId: string | undefined, operation: string): string {
  const owner = typeof ownerUserId === 'string' ? ownerUserId.trim() : '';
  if (!owner) {
    throw new Error(`MEMORY_OWNER_SCOPE_REQUIRED: ${operation} requires an authenticated owner user ID.`);
  }
  if (owner.length > 128 || /[\u0000-\u001f\u007f]/.test(owner)) {
    throw new Error('MEMORY_OWNER_SCOPE_INVALID: Owner user ID must be a valid value of at most 128 characters.');
  }
  return owner;
}

export function isOwnedByTenant(
  record: { ownerUserId?: string } | null | undefined,
  ownerUserId: string
): boolean {
  return Boolean(record && record.ownerUserId === ownerUserId);
}
