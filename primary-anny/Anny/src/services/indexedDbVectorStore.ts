import type { VectorDocument } from './qdrantPlatform';

export interface LocalVectorStore {
  isAvailable(): boolean;
  getCollection(collectionName: string): Promise<VectorDocument[]>;
  put(collectionName: string, document: VectorDocument): Promise<void>;
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
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('vectors')) {
          const store = database.createObjectStore('vectors', { keyPath: 'key' });
          store.createIndex('collectionName', 'collectionName', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
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
