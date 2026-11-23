import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiProviderPlatform } from '../services/aiProviderPlatform';
import { qdrantPlatform } from '../services/qdrantPlatform';

test('knowledge-base vector search applies owner isolation before result limiting', async () => {
  const originalEmbeddings = aiProviderPlatform.embeddings.bind(aiProviderPlatform);
  const collection = `tenant-isolation-${Date.now()}`;

  try {
    aiProviderPlatform.embeddings = async () => ({ embedding: [1, 0], provider: 'test' });

    await qdrantPlatform.upsertDocument(collection, 'Tenant A private document', {
      metadata: { ownerUserId: 'tenant-a' }
    }, [1, 0]);
    await qdrantPlatform.upsertDocument(collection, 'Tenant B private document', {
      metadata: { ownerUserId: 'tenant-b' }
    }, [1, 0]);
    await qdrantPlatform.upsertDocument(collection, 'Unowned legacy document', {}, [1, 0]);

    const results = await qdrantPlatform.search(
      collection,
      'private document',
      1,
      undefined,
      undefined,
      'tenant-a'
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].content, 'Tenant A private document');
    assert.equal(results[0].payload.metadata?.ownerUserId, 'tenant-a');
  } finally {
    aiProviderPlatform.embeddings = originalEmbeddings;
  }
});
