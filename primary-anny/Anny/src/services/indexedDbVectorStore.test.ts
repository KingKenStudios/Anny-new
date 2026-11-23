import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QdrantPlatform, type VectorDocument } from './qdrantPlatform';
import type { LocalVectorStore, StoredKeywordChunk } from './indexedDbVectorStore';

class SharedTestStore implements LocalVectorStore {
  private records = new Map<string, VectorDocument>();
  private keywordRecords = new Map<string, StoredKeywordChunk>();
  isAvailable(): boolean { return true; }
  async getCollection(collectionName: string): Promise<VectorDocument[]> {
    return [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${collectionName}:`))
      .map(([, document]) => document);
  }
  async put(collectionName: string, document: VectorDocument): Promise<void> {
    this.records.set(`${collectionName}:${document.id}`, document);
  }
  async putKeywordChunk(chunk: StoredKeywordChunk): Promise<void> {
    this.keywordRecords.set(`${chunk.ownerUserId}:${chunk.chunkId}`, chunk);
  }
  async getKeywordChunks(ownerUserId: string): Promise<StoredKeywordChunk[]> {
    return [...this.keywordRecords.values()].filter(chunk => chunk.ownerUserId === ownerUserId);
  }
  async count(): Promise<number> { return this.records.size; }
}

test('offline browser storage persists vectors across platform instances', async () => {
  const store = new SharedTestStore();
  const config = () => ({ qdrantUrl: '', qdrantApiKey: undefined });
  const embed = async () => [1, 0];
  const firstInstance = new QdrantPlatform({ getConfig: config, embed, localStore: store });

  await firstInstance.upsertDocument('knowledge_base', 'Offline persistent knowledge', {
    title: 'Offline note',
    metadata: { ownerUserId: 'user-a', chunkId: 'stable-chunk-1' }
  });
  await firstInstance.upsertDocument('knowledge_base', 'Updated offline persistent knowledge', {
    title: 'Offline note',
    metadata: { ownerUserId: 'user-a', chunkId: 'stable-chunk-1' }
  });

  // A fresh platform instance has no in-process vector cache. It must retrieve
  // the document from the shared persistent-store adapter.
  const secondInstance = new QdrantPlatform({ getConfig: config, embed, localStore: store });
  const results = await secondInstance.search(
    'knowledge_base',
    'offline knowledge',
    5,
    undefined,
    undefined,
    'user-a'
  );
  const health = await secondInstance.checkHealth();

  assert.equal(results.length, 1);
  assert.equal(results[0].content, 'Updated offline persistent knowledge');
  assert.equal(health.status, 'LOCAL_PERSISTENT');
  assert.equal(health.totalVectors, 1);
});

test('offline local persistence failures are not silently downgraded to volatile memory', async () => {
  const failingStore: LocalVectorStore = {
    isAvailable: () => true,
    getCollection: async () => { throw new Error('storage quota unavailable'); },
    put: async () => { throw new Error('storage quota unavailable'); },
    putKeywordChunk: async () => { throw new Error('storage quota unavailable'); },
    getKeywordChunks: async () => { throw new Error('storage quota unavailable'); },
    count: async () => { throw new Error('storage quota unavailable'); }
  };
  const platform = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: '', qdrantApiKey: undefined }),
    embed: async () => [1, 0],
    localStore: failingStore
  });

  await assert.rejects(
    () => platform.upsertDocument('knowledge_base', 'Must be persisted', {}, [1, 0]),
    /storage quota unavailable/
  );
  const health = await platform.checkHealth();
  assert.equal(health.status, 'LOCAL_PERSISTENCE_FAILED');
});


test('keyword chunks persist across platform instances and remain tenant-isolated', async () => {
  const store = new SharedTestStore();
  const config = () => ({ qdrantUrl: '', qdrantApiKey: undefined });
  const first = new QdrantPlatform({ getConfig: config, embed: async () => [1, 0], localStore: store });
  await first.putKeywordChunk({
    chunkId: 'chunk-a',
    documentTitle: 'Tenant A notes',
    text: 'Private manufacturing plans for tenant A',
    chunkIndex: 0,
    tokens: 8,
    ownerUserId: 'tenant-a'
  });
  await first.putKeywordChunk({
    chunkId: 'chunk-b',
    documentTitle: 'Tenant B notes',
    text: 'Private manufacturing plans for tenant B',
    chunkIndex: 0,
    tokens: 8,
    ownerUserId: 'tenant-b'
  });

  const restarted = new QdrantPlatform({ getConfig: config, embed: async () => [1, 0], localStore: store });
  const tenantA = await restarted.getKeywordChunks('tenant-a');
  const tenantB = await restarted.getKeywordChunks('tenant-b');

  assert.equal(tenantA.length, 1);
  assert.equal(tenantA[0].chunkId, 'chunk-a');
  assert.equal(tenantB.length, 1);
  assert.equal(tenantB[0].chunkId, 'chunk-b');
  await assert.rejects(() => restarted.getKeywordChunks(''), /MEMORY_OWNER_SCOPE_REQUIRED/);
});
