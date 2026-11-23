/**
 * ANNY — QDRANT VECTOR DATABASE PLATFORM (PHASE 6)
 * High-performance vector database integration for semantic search, document embeddings,
 * long-term conversation memory, hybrid retrieval, and knowledge indexing.
 */

import { aiProviderPlatform } from './aiProviderPlatform';
import { envConfigService } from './envConfigService';

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

export class QdrantPlatform {
  private static instance: QdrantPlatform;
  private collections: Map<string, VectorDocument[]> = new Map();

  private constructor() {
    this.createCollection('knowledge_base');
    this.createCollection('conversation_memory');
    this.createCollection('codebase_embeddings');
  }

  public static getInstance(): QdrantPlatform {
    if (!QdrantPlatform.instance) {
      QdrantPlatform.instance = new QdrantPlatform();
    }
    return QdrantPlatform.instance;
  }

  public createCollection(collectionName: string): boolean {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, []);
    }
    return true;
  }

  public async checkHealth(): Promise<{ status: 'SIMULATED' | 'NOT_CONFIGURED'; latencyMs: number; totalVectors: number }> {
    const startTime = Date.now();
    const config = envConfigService.getConfig();
    let total = 0;
    this.collections.forEach(vecs => { total += vecs.length; });

    return {
      status: config.qdrantUrl ? 'SIMULATED' : 'NOT_CONFIGURED',
      latencyMs: Date.now() - startTime,
      totalVectors: total
    };
  }

  // Cosine Similarity Computation
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

  // Index Document with Automatic Vector Generation
  public async upsertDocument(
    collectionName: string,
    content: string,
    payload: Omit<VectorDocument['payload'], 'content' | 'createdAt'>,
    customVector?: number[]
  ): Promise<VectorDocument> {
    this.createCollection(collectionName);

    let vector = customVector;
    if (!vector) {
      try {
        const embRes = await aiProviderPlatform.embeddings(content);
        vector = embRes.embedding;
      } catch (e) {
        throw new Error(
          `EMBEDDING_PROVIDER_UNAVAILABLE: Cannot index document without a genuine embedding. ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    if (!Array.isArray(vector) || vector.length === 0 || !vector.every(Number.isFinite)) {
      throw new Error('INVALID_EMBEDDING_VECTOR: Expected a non-empty vector containing only finite numbers.');
    }

    const doc: VectorDocument = {
      id: `vec_${Math.random().toString(36).substring(2, 10)}`,
      vector,
      payload: {
        content,
        createdAt: new Date().toISOString(),
        ...payload
      }
    };

    this.collections.get(collectionName)!.push(doc);
    return doc;
  }

  // Semantic Search
  public async search(
    collectionName: string,
    queryText: string,
    limit: number = 5,
    filterCategory?: string,
    filterSessionId?: string
  ): Promise<SearchResult[]> {
    if (collectionName === 'conversation_memory' && !filterSessionId) {
      throw new Error('SESSION_SCOPE_REQUIRED: Conversation memory search must specify the owning session ID.');
    }

    const docs = this.collections.get(collectionName) || [];
    if (docs.length === 0) return [];

    let queryVector: number[];
    try {
      const queryEmbedding = await aiProviderPlatform.embeddings(queryText);
      queryVector = queryEmbedding.embedding;
    } catch (e) {
      throw new Error(
        `EMBEDDING_PROVIDER_UNAVAILABLE: Cannot perform semantic search without a genuine query embedding. ${e instanceof Error ? e.message : String(e)}`
      );
    }

    if (!Array.isArray(queryVector) || queryVector.length === 0 || !queryVector.every(Number.isFinite)) {
      throw new Error('INVALID_EMBEDDING_VECTOR: Query embedding must be a non-empty vector containing only finite numbers.');
    }

    const results: SearchResult[] = docs
      .filter(doc => !filterCategory || doc.payload.category === filterCategory)
      .filter(doc => !filterSessionId || doc.payload.sessionId === filterSessionId)
      .map(doc => {
        const score = this.cosineSimilarity(queryVector, doc.vector);
        return {
          id: doc.id,
          score: Number(score.toFixed(4)),
          content: doc.payload.content,
          payload: doc.payload
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  // Retrieve Long Term Memory
  public async retrieveMemoryContext(sessionId: string, currentQuery: string): Promise<string> {
    const memoryResults = await this.search('conversation_memory', currentQuery, 3, undefined, sessionId);
    if (memoryResults.length === 0) return '';

    return memoryResults
      .map(r => `[Rel. Memory Score ${r.score}]: ${r.content}`)
      .join('\n');
  }
}

export const qdrantPlatform = QdrantPlatform.getInstance();
