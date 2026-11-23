import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOwnedByTenant, requireTenantOwner } from './memoryTenantScope';

test('private memory ingestion and retrieval reject missing or blank tenant owners', () => {
  assert.throws(() => requireTenantOwner(undefined, 'Knowledge retrieval'), /MEMORY_OWNER_SCOPE_REQUIRED/);
  assert.throws(() => requireTenantOwner('', 'Knowledge ingestion'), /MEMORY_OWNER_SCOPE_REQUIRED/);
  assert.throws(() => requireTenantOwner('   ', 'Vector ingestion'), /MEMORY_OWNER_SCOPE_REQUIRED/);
});

test('tenant owner identifiers are bounded and reject control characters', () => {
  assert.equal(requireTenantOwner(' tenant-a ', 'test'), 'tenant-a');
  assert.throws(() => requireTenantOwner('a'.repeat(129), 'test'), /MEMORY_OWNER_SCOPE_INVALID/);
  assert.throws(() => requireTenantOwner('tenant\nforged', 'test'), /MEMORY_OWNER_SCOPE_INVALID/);
});

test('keyword retrieval includes only records explicitly owned by the requesting tenant', () => {
  const tenantA = { ownerUserId: 'tenant-a' };
  const tenantB = { ownerUserId: 'tenant-b' };
  const legacyUnowned = {};
  assert.equal(isOwnedByTenant(tenantA, 'tenant-a'), true);
  assert.equal(isOwnedByTenant(tenantB, 'tenant-a'), false);
  assert.equal(isOwnedByTenant(legacyUnowned, 'tenant-a'), false);
  assert.equal(isOwnedByTenant(undefined, 'tenant-a'), false);
});
