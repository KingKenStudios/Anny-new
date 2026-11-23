import type { VectorDocument } from './qdrantPlatform';

export interface StoredKeywordChunk {
  chunkId: string;
  documentTitle: string;
  text: string;
  chunkIndex: number;
  tokens: number;
  ownerUserId: string;
}

export interface LocalVectorStore {
  isAvailable(): boolean;
  getCollection(collectionName: string): Promise<VectorDocument[]>;
  put(collectionName: string, document: VectorDocument): Promise<void>;
  putKeywordChunk(chunk: StoredKeywordChunk): Promise<void>;
  getKeywordChunks(ownerUserId: string): Promise<StoredKeywordChunk[]>;
  count(): Promise<number>;
}

/**
 * Browser-local persistent vector storage.
 *
 * IndexedDB is used rather than localStorage so vectors are stored asynchronously
 * without the small synchronous storage quota. This adapter is intentionally
 * browser-only; server runtimes without IndexedDB continue to report volatile
 * in-process storage unless a real Qdrant endpoint is configured.
 */
export class IndexedDbVectorStore implements LocalVectorStore {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly databaseName: string;

  constructor(databaseName = 'anny-vector-memory') {
    this.databaseName = databaseName;
  }

  public isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE: This runtime does not provide IndexedDB.'));
    }
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('vectors')) {
          const store = database.createObjectStore('vectors', { keyPath: 'key' });
          store.createIndex('collectionName', 'collectionName', { unique: false });
        }
        if (!database.objectStoreNames.contains('keyword_chunks')) {
          const keywordStore = database.createObjectStore('keyword_chunks', { keyPath: 'key' });
          keywordStore.createIndex('ownerUserId', 'ownerUserId', { unique: false });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => reject(new Error('INDEXEDDB_OPEN_FAILED: Could not open ANNY local vector storage.'));
      request.onblocked = () => reject(new Error('INDEXEDDB_OPEN_BLOCKED: Close older ANNY tabs to upgrade local vector storage.'));
    }).catch(error => {
      this.databasePromise = null;
      throw error;
    });

    return this.databasePromise;
  }

  public async getCollection(collectionName: string): Promise<VectorDocument[]> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('vectors', 'readonly');
      const request = transaction.objectStore('vectors')
        .index('collectionName')
        .getAll(collectionName);
      request.onsuccess = () => {
        resolve((request.result || []).map((record: any) => record.document as VectorDocument));
      };
      request.onerror = () => reject(new Error('INDEXEDDB_READ_FAILED: Could not read local vector documents.'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_READ_ABORTED: Local vector read was aborted.'));
    });
  }

  public async put(collectionName: string, document: VectorDocument): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('vectors', 'readwrite');
      transaction.objectStore('vectors').put({
        key: `${collectionName}:${document.id}`,
        collectionName,
        document
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('INDEXEDDB_WRITE_FAILED: Could not persist local vector document.'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_WRITE_ABORTED: Local vector write was aborted.'));
    });
  }

  public async putKeywordChunk(chunk: StoredKeywordChunk): Promise<void> {
    const ownerUserId = String(chunk?.ownerUserId || '').trim();
    const chunkId = String(chunk?.chunkId || '').trim();
    if (!ownerUserId || !chunkId || typeof chunk.text !== 'string') {
      throw new Error('INDEXEDDB_KEYWORD_CHUNK_INVALID: A tenant owner, chunk ID, and text are required.');
    }
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('keyword_chunks', 'readwrite');
      transaction.objectStore('keyword_chunks').put({
        key: `${encodeURIComponent(ownerUserId)}:${chunkId}`,
        ownerUserId,
        chunk: { ...chunk, ownerUserId }
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('INDEXEDDB_KEYWORD_WRITE_FAILED: Could not persist local keyword chunk.'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_KEYWORD_WRITE_ABORTED: Local keyword write was aborted.'));
    });
  }

  public async getKeywordChunks(ownerUserId: string): Promise<StoredKeywordChunk[]> {
    const owner = String(ownerUserId || '').trim();
    if (!owner) throw new Error('MEMORY_OWNER_SCOPE_REQUIRED: Keyword retrieval requires an authenticated owner user ID.');
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('keyword_chunks', 'readonly');
      const request = transaction.objectStore('keyword_chunks').index('ownerUserId').getAll(owner);
      request.onsuccess = () => {
        resolve((request.result || []).map((record: any) => record.chunk as StoredKeywordChunk));
      };
      request.onerror = () => reject(new Error('INDEXEDDB_KEYWORD_READ_FAILED: Could not read local keyword chunks.'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_KEYWORD_READ_ABORTED: Local keyword read was aborted.'));
    });
  }

  public async count(): Promise<number> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('vectors', 'readonly');
      const request = transaction.objectStore('vectors').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('INDEXEDDB_COUNT_FAILED: Could not count local vector documents.'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_COUNT_ABORTED: Local vector count was aborted.'));
    });
  }
}
