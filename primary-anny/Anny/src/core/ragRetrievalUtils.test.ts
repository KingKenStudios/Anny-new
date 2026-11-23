import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canDegradeToKeywordSearch, resolveRagChunkId } from './ragRetrievalUtils';

test('hybrid RAG degrades to BM25 for known provider and Qdrant availability failures', () => {
  assert.equal(canDegradeToKeywordSearch(new Error('EMBEDDING_PROVIDER_UNAVAILABLE: no local embedding model')), true);
  assert.equal(canDegradeToKeywordSearch(new Error('QDRANT_TIMEOUT: endpoint timed out')), true);
  assert.equal(canDegradeToKeywordSearch(new Error('QDRANT_HTTP_ERROR: HTTP 503')), true);
  assert.equal(canDegradeToKeywordSearch(new Error('INDEXEDDB_READ_FAILED: local store failed')), false);
  assert.equal(canDegradeToKeywordSearch(new Error('TypeError: cannot read property')), false);
});

test('dense and keyword retrieval resolve to the same stable document chunk identifier', () => {
  const result: any = {
    id: 'qdrant-generated-point-id',
    score: 0.9,
    content: 'same chunk',
    payload: {
      content: 'same chunk',
      createdAt: new Date().toISOString(),
      metadata: { chunkId: 'doc_tenant-a_manual_chunk_0' }
    }
  };
  assert.equal(resolveRagChunkId(result), 'doc_tenant-a_manual_chunk_0');
  assert.equal(resolveRagChunkId({ ...result, payload: { content: 'other', createdAt: '' } }), result.id);
});
