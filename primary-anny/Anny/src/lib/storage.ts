/**
 * Safe wrapper for localStorage access with in-memory fallback.
 * Prevents "Access is denied" errors in cross-origin iframes, strict browser privacy modes, or non-browser environments.
 */
const memoryStore = new Map<string, string>();

const isStorageAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
};

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (isStorageAvailable()) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch {
        // Fallback to memoryStore below
      }
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, value);
    if (isStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Silently handled via memoryStore fallback
      }
    }
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
    if (isStorageAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Silently handled via memoryStore fallback
      }
    }
  },
  clear: (): void => {
    memoryStore.clear();
    if (isStorageAvailable()) {
      try {
        localStorage.clear();
      } catch {
        // Silently handled via memoryStore fallback
      }
    }
  }
};
