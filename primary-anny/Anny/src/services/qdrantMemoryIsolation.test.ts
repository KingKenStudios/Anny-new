import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiProviderPlatform } from './aiProviderPlatform';
import { qdrantPlatform } from './qdrantPlatform';

test('conversation memory is session-scoped and never fabricates embeddings', async () => {
  const originalEmbeddings = aiProviderPlatform.embeddings.bind(aiProviderPlatform);
  const sessionA = `session-a-${Date.now()}`;
  const sessionB = `session-b-${Date.now()}`;

  try {
    aiProviderPlatform.embeddings = async () => ({ embedding: [1, 0], provider: 'gemini' });

    await qdrantPlatform.upsertDocument(
      'conversation_memory',
      'Private memory belonging to session A',
      { sessionId: sessionA, category: 'isolation-test' },
      [1, 0]
    );
    await qdrantPlatform.upsertDocument(
      'conversation_memory',
      'Private memory belonging to session B',
      { sessionId: sessionB, category: 'isolation-test' },
      [1, 0]
    );

    const sessionAContext = await qdrantPlatform.retrieveMemoryContext(sessionA, 'recall memory');
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
      () => qdrantPlatform.search('conversation_memory', 'query', 3, undefined, sessionA),
      /EMBEDDING_PROVIDER_UNAVAILABLE/
    );
  } finally {
    aiProviderPlatform.embeddings = originalEmbeddings;
  }
});
