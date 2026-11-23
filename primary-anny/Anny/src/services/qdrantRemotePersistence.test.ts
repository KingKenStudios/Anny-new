import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QdrantPlatform } from './qdrantPlatform';

type StoredPoint = { id: string; vector: number[]; payload: Record<string, any> };

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('configured Qdrant persists vectors remotely and applies tenant filters server-side', async () => {
  const collections = new Map<string, StoredPoint[]>();
  const requestLog: Array<{ url: string; method: string; body?: any; apiKey?: string }> = [];

  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const headers = new Headers(init.headers || {});
    requestLog.push({ url, method, body, apiKey: headers.get('api-key') || undefined });

    const collectionMatch = url.match(/\/collections\/([^/?]+)/);
    if (url.endsWith('/collections') && method === 'GET') {
      return response({ result: { collections: [...collections.keys()].map(name => ({ name })) } });
    }
    if (collectionMatch) {
      const name = decodeURIComponent(collectionMatch[1]);
      if (method === 'GET' && !url.includes('/points')) {
        if (!collections.has(name)) return response({ status: 'error', statusText: 'not found' }, 404);
        return response({ result: { points_count: collections.get(name)!.length } });
      }
      if (method === 'PUT' && !url.includes('/points')) {
        collections.set(name, []);
        return response({ result: { status: 'ok' } });
      }
      if (method === 'PUT' && url.includes('/points')) {
        const points = collections.get(name);
        if (!points) return response({}, 404);
        points.push(...body.points);
        return response({ result: { status: 'ok' } });
      }
      if (method === 'POST' && url.includes('/points/search')) {
        const points = collections.get(name) || [];
        const ownerCondition = body.filter?.must?.find((item: any) => item.key === 'metadata.ownerUserId');
        const owner = ownerCondition?.match?.value;
        return response({
          result: points
            .filter(point => !owner || point.payload.metadata?.ownerUserId === owner)
            .map(point => ({ id: point.id, score: 0.91, payload: point.payload }))
        });
      }
    }
    return response({ error: 'Unexpected test request' }, 500);
  };

  const platform = new QdrantPlatform({
    fetcher,
    getConfig: () => ({ qdrantUrl: 'http://qdrant.test', qdrantApiKey: 'test-only-key' }),
    embed: async () => [0.25, 0.75]
  });

  await platform.upsertDocument('knowledge_base', 'Tenant A private notes', {
    title: 'Tenant A',
    metadata: { ownerUserId: 'tenant-a' }
  });
  await platform.upsertDocument('knowledge_base', 'Tenant B private notes', {
    title: 'Tenant B',
    metadata: { ownerUserId: 'tenant-b' }
  });

  const results = await platform.search(
    'knowledge_base',
    'private notes',
    5,
    undefined,
    undefined,
    'tenant-a'
  );

  assert.equal(collections.get('knowledge_base')?.length, 2);
  assert.equal(results.length, 1);
  assert.equal(results[0].content, 'Tenant A private notes');
  assert.equal(results[0].payload.metadata?.ownerUserId, 'tenant-a');
  assert.ok(requestLog.some(item => item.method === 'PUT' && item.url.includes('/points?wait=true')));
  assert.ok(requestLog.some(item =>
    item.method === 'POST' &&
    item.body?.filter?.must?.some((filter: any) =>
      filter.key === 'metadata.ownerUserId' && filter.match.value === 'tenant-a'
    )
  ));
  assert.ok(requestLog.every(item => item.apiKey === 'test-only-key'));
  assert.ok(requestLog.every(item => !item.url.includes('test-only-key')));
});

test('Qdrant health distinguishes volatile offline storage from a live remote service', async () => {
  const offline = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: '', qdrantApiKey: undefined }),
    embed: async () => [1, 0]
  });
  const offlineHealth = await offline.checkHealth();
  assert.equal(offlineHealth.status, 'VOLATILE_OFFLINE');
  assert.match(offlineHealth.detail, /volatile process memory/);

  const failed = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: 'http://qdrant.test', qdrantApiKey: undefined }),
    fetcher: async () => response({ message: 'unavailable' }, 503),
    embed: async () => [1, 0]
  });
  const failedHealth = await failed.checkHealth();
  assert.equal(failedHealth.status, 'CONNECTION_FAILED');
  assert.match(failedHealth.detail, /HTTP 503/);
});

test('Qdrant rejects unsafe collection names and invalid endpoint schemes', async () => {
  const invalidUrl = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: 'file:///tmp/qdrant', qdrantApiKey: undefined }),
    embed: async () => [1, 0]
  });
  await assert.rejects(
    () => invalidUrl.upsertDocument('knowledge_base', 'document', {}, [1, 0]),
    /QDRANT_CONFIGURATION_INVALID/
  );

  const invalidCollection = new QdrantPlatform({
    getConfig: () => ({ qdrantUrl: '', qdrantApiKey: undefined }),
    embed: async () => [1, 0]
  });
  await assert.rejects(
    () => invalidCollection.upsertDocument('../other-tenant', 'document', {}, [1, 0]),
    /QDRANT_COLLECTION_INVALID/
  );
});
