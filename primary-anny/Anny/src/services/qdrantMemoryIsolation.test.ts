import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiProviderPlatform } from './aiProviderPlatform';
import { QdrantPlatform, qdrantPlatform } from './qdrantPlatform';

test('conversation memory is session-scoped and never fabricates embeddings', async () => {
  const originalEmbeddings = aiProviderPlatform.embeddings.bind(aiProviderPlatform);
  const sessionA = `session-a-${Date.now()}`;
  const sessionB = `session-b-${Date.now()}`;

  try {
    aiProviderPlatform.embeddings = async () => ({ embedding: [1, 0], provider: 'gemini' });

    await qdrantPlatform.upsertDocument(
      'conversation_memory',
      'Private memory belonging to session A',
      { sessionId: sessionA, category: 'isolation-test', metadata: { ownerUserId: 'owner-a' } },
      [1, 0]
    );
    await qdrantPlatform.upsertDocument(
      'conversation_memory',
      'Private memory belonging to session B',
      { sessionId: sessionB, category: 'isolation-test', metadata: { ownerUserId: 'owner-b' } },
      [1, 0]
    );

    await assert.rejects(
      () => qdrantPlatform.search('conversation_memory', 'unscoped query'),
      /SESSION_SCOPE_REQUIRED/
    );

    await assert.rejects(
      () => qdrantPlatform.search('conversation_memory', 'session-scoped but tenant-unscoped', 3, undefined, sessionA),
      /MEMORY_OWNER_SCOPE_REQUIRED/
    );
    const sessionAContext = await qdrantPlatform.retrieveMemoryContext(sessionA, 'recall memory', 'owner-a');
    assert.match(sessionAContext, /Private memory belonging to session A/);
    assert.doesNotMatch(sessionAContext, /Private memory belonging to session B/);

    aiProviderPlatform.embeddings = async () => {
      throw new Error('No genuine embedding provider available');
    };

    await assert.rejects(
      () => qdrantPlatform.upsertDocument(
        'embedding-failure-test',
        'This must not be converted into a fake vector',
        { category: 'test' }
      ),
      /EMBEDDING_PROVIDER_UNAVAILABLE/
    );

    await assert.rejects(
      () => qdrantPlatform.search('conversation_memory', 'query', 3, undefined, sessionA, 'owner-a'),
      /EMBEDDING_PROVIDER_UNAVAILABLE/
    );
  } finally {
    aiProviderPlatform.embeddings = originalEmbeddings;
  }
});


test('conversation memory retrieval requires an authenticated owner and isolates by both session and owner', async () => {
  const platform = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: '', qdrantApiKey: undefined }),
    embed: async () => [1, 0]
  });
  await platform.upsertDocument('conversation_memory', 'Tenant A session memory', {
    sessionId: 'shared-session', metadata: { ownerUserId: 'tenant-a' }
  }, [1, 0]);
  await platform.upsertDocument('conversation_memory', 'Tenant B session memory', {
    sessionId: 'shared-session', metadata: { ownerUserId: 'tenant-b' }
  }, [1, 0]);

  await assert.rejects(
    () => platform.retrieveMemoryContext('shared-session', 'recall', ''),
    /MEMORY_OWNER_SCOPE_REQUIRED/
  );
  const result = await platform.retrieveMemoryContext('shared-session', 'recall', 'tenant-a');
  assert.match(result, /Tenant A session memory/);
  assert.doesNotMatch(result, /Tenant B session memory/);
});
