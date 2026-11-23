import type { SearchResult } from '../services/qdrantPlatform';

/**
 * Dense retrieval is an optional leg of hybrid RAG. Provider/network failures
 * may degrade to tenant-scoped BM25, but storage and programming errors must
 * remain visible rather than being silently hidden.
 */
export function canDegradeToKeywordSearch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /^(EMBEDDING_PROVIDER_UNAVAILABLE|QDRANT_NOT_CONFIGURED|QDRANT_HTTP_ERROR|QDRANT_TIMEOUT|QDRANT_OPERATION_FAILED|QDRANT_CONFIGURATION_INVALID)\b/.test(message);
}

/** Use the original document chunk key when present so dense and BM25 ranks fuse. */
export function resolveRagChunkId(result: SearchResult): string {
  const metadataChunkId = result.payload?.metadata?.chunkId;
  return typeof metadataChunkId === 'string' && metadataChunkId.trim()
    ? metadataChunkId
    : result.id;
}
