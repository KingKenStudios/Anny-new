/**
 * ANNY — QDRANT VECTOR DATABASE PLATFORM
 *
 * Uses a real Qdrant REST API whenever QDRANT_URL is configured. The in-process
 * adapter is retained only as an explicitly volatile offline/development mode.
 * A configured but unreachable Qdrant instance is an error; writes never silently
 * fall back to memory and pretend to be durable.
 */

import { aiProviderPlatform } from './aiProviderPlatform';
import { envConfigService } from './envConfigService';
import { IndexedDbVectorStore } from './indexedDbVectorStore';
import type { LocalVectorStore, StoredKeywordChunk } from './indexedDbVectorStore';

export interface VectorDocument {
  id: string;
  vector: number[];
  payload: {
    content: string;
    title?: string;
    category?: string;
    sessionId?: string;
    createdAt: string;
    metadata?: Record<string, any>;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  payload: VectorDocument['payload'];
}

type QdrantConfig = { qdrantUrl: string; qdrantApiKey?: string };
type QdrantPlatformOptions = {
  fetcher?: typeof fetch;
  getConfig?: () => QdrantConfig;
  embed?: (text: string) => Promise<number[]>;
  localStore?: LocalVectorStore;
};

type QdrantHealth = {
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'CONNECTION_FAILED' | 'VOLATILE_OFFLINE' | 'LOCAL_PERSISTENT' | 'LOCAL_PERSISTENCE_FAILED';
  latencyMs: number;
  totalVectors: number;
  detail: string;
};

export class QdrantPlatform {
  private static instance: QdrantPlatform;
  private collections: Map<string, VectorDocument[]> = new Map();
  private readonly fetcher: typeof fetch;
  private readonly getConfig: () => QdrantConfig;
  private readonly embed: (text: string) => Promise<number[]>;
  private readonly localStore: LocalVectorStore;

  constructor(options: QdrantPlatformOptions = {}) {
    this.fetcher = options.fetcher || fetch.bind(globalThis);
    this.getConfig = options.getConfig || (() => envConfigService.getConfig());
    this.embed = options.embed || (async text => {
      const result = await aiProviderPlatform.embeddings(text);
      return result.embedding;
    });
    this.localStore = options.localStore || new IndexedDbVectorStore();
    this.createCollection('knowledge_base');
    this.createCollection('conversation_memory');
    this.createCollection('codebase_embeddings');
  }

  public static getInstance(): QdrantPlatform {
    if (!QdrantPlatform.instance) QdrantPlatform.instance = new QdrantPlatform();
    return QdrantPlatform.instance;
  }

  private configuredUrl(): string | null {
    const raw = this.getConfig().qdrantUrl?.trim();
    if (!raw) return null;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('QDRANT_CONFIGURATION_INVALID: QDRANT_URL must be an absolute HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
      throw new Error('QDRANT_CONFIGURATION_INVALID: QDRANT_URL must use HTTP(S) and must not contain credentials or a fragment.');
    }
    return parsed.toString().replace(/\/$/, '');
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const baseUrl = this.configuredUrl();
    if (!baseUrl) throw new Error('QDRANT_NOT_CONFIGURED: Set QDRANT_URL to enable persistent vector storage.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const headers = new Headers(init.headers || {});
      headers.set('content-type', 'application/json');
      const apiKey = this.getConfig().qdrantApiKey;
      if (apiKey) headers.set('api-key', apiKey);
      const response = await this.fetcher(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal
      });
      const text = await response.text();
      let body: any = {};
      if (text) {
        try { body = JSON.parse(text); } catch { body = {}; }
      }
      if (!response.ok) {
        const message = response.status === 404 ? 'Qdrant collection or resource was not found.' : `Qdrant returned HTTP ${response.status}.`;
        const error: any = new Error(`QDRANT_HTTP_ERROR: ${message}`);
        error.status = response.status;
        throw error;
      }
      if (body?.status === 'error') {
        throw new Error('QDRANT_OPERATION_FAILED: Qdrant rejected the request.');
      }
      return body;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('QDRANT_TIMEOUT: Qdrant did not respond within 5 seconds.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateCollectionName(name: string): string {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(name)) {
      throw new Error('QDRANT_COLLECTION_INVALID: Collection names may contain only letters, numbers, underscores and hyphens.');
    }
    return encodeURIComponent(name);
  }

  private validateVector(vector: number[], label: string): void {
    if (!Array.isArray(vector) || vector.length === 0 || !vector.every(Number.isFinite)) {
      throw new Error(`INVALID_EMBEDDING_VECTOR: ${label} must be a non-empty vector containing only finite numbers.`);
    }
  }

  private async ensureRemoteCollection(collectionName: string, dimension: number): Promise<void> {
    const name = this.validateCollectionName(collectionName);
    try {
      await this.request(`/collections/${name}`);
      return;
    } catch (error: any) {
      if (error?.status !== 404) throw error;
    }

    try {
      await this.request(`/collections/${name}`, {
        method: 'PUT',
        body: JSON.stringify({ vectors: { size: dimension, distance: 'Cosine' } })
      });
    } catch (error: any) {
      // Another application instance may have created the collection concurrently.
      if (error?.status !== 409) throw error;
    }
  }

  public createCollection(collectionName: string): boolean {
    this.validateCollectionName(collectionName);
    if (!this.collections.has(collectionName)) this.collections.set(collectionName, []);
    return true;
  }

  public async checkHealth(): Promise<QdrantHealth> {
    const started = Date.now();
    let total = 0;
    if (!this.getConfig().qdrantUrl?.trim()) {
      if (this.localStore.isAvailable()) {
        try {
          total = await this.localStore.count();
          return {
            status: 'LOCAL_PERSISTENT',
            latencyMs: Date.now() - started,
            totalVectors: total,
            detail: 'Remote Qdrant is not configured; vectors are stored persistently in this browser using IndexedDB.'
          };
        } catch (error) {
          return {
            status: 'LOCAL_PERSISTENCE_FAILED',
            latencyMs: Date.now() - started,
            totalVectors: 0,
            detail: error instanceof Error ? error.message : 'Local IndexedDB storage is unavailable.'
          };
        }
      }
      this.collections.forEach(items => { total += items.length; });
      return {
        status: 'VOLATILE_OFFLINE',
        latencyMs: Date.now() - started,
        totalVectors: total,
        detail: 'Neither remote Qdrant nor browser IndexedDB is available; vectors exist only in volatile process memory and will be lost on restart.'
      };
    }

    try {
      const response = await this.request('/collections');
      const collections = Array.isArray(response?.result?.collections) ? response.result.collections : [];
      for (const collection of collections) {
        try {
          const info = await this.request(`/collections/${this.validateCollectionName(collection.name)}`);
          total += Number(info?.result?.points_count || 0);
        } catch {
          // The collection list already proved the service is reachable; omit an
          // unavailable per-collection count rather than inventing a value.
        }
      }
      return {
        status: 'CONNECTED',
        latencyMs: Date.now() - started,
        totalVectors: total,
        detail: `Connected to Qdrant; ${collections.length} collection(s) discovered.`
      };
    } catch (error) {
      return {
        status: 'CONNECTION_FAILED',
        latencyMs: Date.now() - started,
        totalVectors: 0,
        detail: error instanceof Error ? error.message : 'Qdrant health request failed.'
      };
    }
  }

  private async createPointId(
    collectionName: string,
    payload: Omit<VectorDocument['payload'], 'content' | 'createdAt'>
  ): Promise<string> {
    const chunkId = payload.metadata?.chunkId;
    if (typeof chunkId === 'string' && chunkId.trim() && globalThis.crypto?.subtle) {
      const owner = typeof payload.metadata?.ownerUserId === 'string'
        ? payload.metadata.ownerUserId
        : 'shared';
      const stableKey = `${collectionName}:${owner}:${chunkId}`;
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(stableKey)
      );
      const bytes = Array.from(new Uint8Array(digest).slice(0, 16));
      // UUID version 8 is reserved for application-defined deterministic IDs.
      bytes[6] = (bytes[6] & 0x0f) | 0x80;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bytes.map(value => value.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    return globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
          const random = Math.floor(Math.random() * 16);
          return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
        });
  }

  public async upsertDocument(
    collectionName: string,
    content: string,
    payload: Omit<VectorDocument['payload'], 'content' | 'createdAt'>,
    customVector?: number[]
  ): Promise<VectorDocument> {
    this.validateCollectionName(collectionName);
    let vector = customVector;
    if (!vector) {
      try {
        vector = await this.embed(content);
      } catch (error) {
        throw new Error(`EMBEDDING_PROVIDER_UNAVAILABLE: Cannot index document without a genuine embedding. ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.validateVector(vector, 'Document embedding');

    const doc: VectorDocument = {
      id: await this.createPointId(collectionName, payload),
      vector,
      payload: { content, createdAt: new Date().toISOString(), ...payload }
    };

    if (this.getConfig().qdrantUrl?.trim()) {
      await this.ensureRemoteCollection(collectionName, vector.length);
      await this.request(`/collections/${this.validateCollectionName(collectionName)}/points?wait=true`, {
        method: 'PUT',
        body: JSON.stringify({
          points: [{
            id: doc.id,
            vector: doc.vector,
            payload: doc.payload
          }]
        })
      });
    } else if (this.localStore.isAvailable()) {
      await this.localStore.put(collectionName, doc);
    } else {
      this.createCollection(collectionName);
      const localDocuments = this.collections.get(collectionName)!;
      const existingIndex = localDocuments.findIndex(existing => existing.id === doc.id);
      if (existingIndex >= 0) localDocuments[existingIndex] = doc;
      else localDocuments.push(doc);
    }
    return doc;
  }

  public async putKeywordChunk(chunk: StoredKeywordChunk): Promise<boolean> {
    const ownerUserId = String(chunk?.ownerUserId || '').trim();
    if (!ownerUserId) throw new Error('MEMORY_OWNER_SCOPE_REQUIRED: Keyword ingestion requires an authenticated owner user ID.');
    if (ownerUserId.length > 128 || /[\u0000-\u001f\u007f]/.test(ownerUserId)) {
      throw new Error('MEMORY_OWNER_SCOPE_INVALID: Owner user ID must be a valid value of at most 128 characters.');
    }
    if (!this.localStore.isAvailable()) return false;
    await this.localStore.putKeywordChunk({ ...chunk, ownerUserId });
    return true;
  }

  public async getKeywordChunks(ownerUserId: string): Promise<StoredKeywordChunk[]> {
    const owner = String(ownerUserId || '').trim();
    if (!owner) throw new Error('MEMORY_OWNER_SCOPE_REQUIRED: Keyword retrieval requires an authenticated owner user ID.');
    if (owner.length > 128 || /[\u0000-\u001f\u007f]/.test(owner)) {
      throw new Error('MEMORY_OWNER_SCOPE_INVALID: Owner user ID must be a valid value of at most 128 characters.');
    }
    if (!this.localStore.isAvailable()) return [];
    return this.localStore.getKeywordChunks(owner);
  }

  public async search(
    collectionName: string,
    queryText: string,
    limit: number = 5,
    filterCategory?: string,
    filterSessionId?: string,
    filterOwnerUserId?: string
  ): Promise<SearchResult[]> {
    if (collectionName === 'conversation_memory') {
      const sessionOwner = typeof filterSessionId === 'string' ? filterSessionId.trim() : '';
      if (!sessionOwner) {
        throw new Error('SESSION_SCOPE_REQUIRED: Conversation memory search must specify the owning session ID.');
      }
      if (sessionOwner.length > 256 || /[\\u0000-\\u001f\\u007f]/.test(sessionOwner)) {
        throw new Error('SESSION_SCOPE_INVALID: Session ID must be a valid value of at most 256 characters.');
      }
      filterSessionId = sessionOwner;
    }
    if (['conversation_memory', 'knowledge_base'].includes(collectionName)) {
      const owner = typeof filterOwnerUserId === 'string' ? filterOwnerUserId.trim() : '';
      if (!owner) {
        throw new Error('MEMORY_OWNER_SCOPE_REQUIRED: Tenant-owned memory search must specify the authenticated owner user ID.');
      }
      if (owner.length > 128 || /[\\u0000-\\u001f\\u007f]/.test(owner)) {
        throw new Error('MEMORY_OWNER_SCOPE_INVALID: Owner user ID must be a valid value of at most 128 characters.');
      }
      filterOwnerUserId = owner;
    }
    this.validateCollectionName(collectionName);
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit) || 5));
    let queryVector: number[];
    try {
      queryVector = await this.embed(queryText);
    } catch (error) {
      throw new Error(`EMBEDDING_PROVIDER_UNAVAILABLE: Cannot perform semantic search without a genuine query embedding. ${error instanceof Error ? error.message : String(error)}`);
    }
    this.validateVector(queryVector, 'Query embedding');

    if (this.getConfig().qdrantUrl?.trim()) {
      const must: any[] = [];
      if (filterCategory) must.push({ key: 'category', match: { value: filterCategory } });
      if (filterSessionId) must.push({ key: 'sessionId', match: { value: filterSessionId } });
      if (filterOwnerUserId) must.push({ key: 'metadata.ownerUserId', match: { value: filterOwnerUserId } });
      let response: any;
      try {
        response = await this.request(`/collections/${this.validateCollectionName(collectionName)}/points/search`, {
          method: 'POST',
          body: JSON.stringify({
            vector: queryVector,
            limit: safeLimit,
            with_payload: true,
            with_vector: false,
            ...(must.length ? { filter: { must } } : {})
          })
        });
      } catch (error: any) {
        if (error?.status === 404) return [];
        throw error;
      }
      const points = Array.isArray(response?.result) ? response.result : [];
      return points.map((point: any) => ({
        id: String(point.id),
        score: Number(Number(point.score || 0).toFixed(4)),
        content: String(point.payload?.content || ''),
        payload: {
          content: String(point.payload?.content || ''),
          title: point.payload?.title,
          category: point.payload?.category,
          sessionId: point.payload?.sessionId,
          createdAt: String(point.payload?.createdAt || ''),
          metadata: point.payload?.metadata
        }
      }));
    }

    const docs = this.localStore.isAvailable()
      ? await this.localStore.getCollection(collectionName)
      : (this.collections.get(collectionName) || []);
    return docs
      .filter(doc => !filterCategory || doc.payload.category === filterCategory)
      .filter(doc => !filterSessionId || doc.payload.sessionId === filterSessionId)
      .filter(doc => !filterOwnerUserId || doc.payload.metadata?.ownerUserId === filterOwnerUserId)
      .map(doc => ({
        id: doc.id,
        score: Number(this.cosineSimilarity(queryVector, doc.vector).toFixed(4)),
        content: doc.payload.content,
        payload: doc.payload
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async retrieveMemoryContext(sessionId: string, currentQuery: string, ownerUserId: string): Promise<string> {
    if (!ownerUserId?.trim()) {
      throw new Error('MEMORY_OWNER_SCOPE_REQUIRED: Conversation memory retrieval requires the authenticated owner user ID.');
    }
    const memoryResults = await this.search('conversation_memory', currentQuery, 3, undefined, sessionId, ownerUserId);
    if (memoryResults.length === 0) return '';
    return memoryResults.map(result => `[Rel. Memory Score ${result.score}]: ${result.content}`).join('\n');
  }
}

export const qdrantPlatform = QdrantPlatform.getInstance();
