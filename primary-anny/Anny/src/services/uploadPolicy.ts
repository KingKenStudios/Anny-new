/**
 * Upload policy shared by the server and tests.
 * Only small, valid UTF-8 text files are eligible for document-to-RAG ingestion.
 */
export const MAX_DOCUMENT_FILES = 5;
export const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENT_BATCH_BYTES = 25 * 1024 * 1024;
export const MAX_RAG_TEXT_BYTES = 2 * 1024 * 1024;
export const MAX_RAG_QUERY_CHARS = 10_000;
export const MAX_RAG_SEARCH_RESULTS = 20;

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.toml', '.sql', '.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css',
  '.sh', '.bat', '.ps1', '.ini', '.cfg', '.log'
]);

export function sanitizeDownloadFilename(input: unknown): string {
  const safe = String(input || 'file').replaceAll('/', '_').replaceAll(String.fromCharCode(92), '_').replaceAll('"', '_').replaceAll(String.fromCharCode(13), '_').replaceAll(String.fromCharCode(10), '_').slice(0, 180);
  return safe || 'file';
}

export function validateDocumentBatch(files: Array<{ size: number }>): { valid: boolean; error?: string } {
  if (files.length > MAX_DOCUMENT_FILES) {
    return { valid: false, error: `Too many files. Maximum allowed: ${MAX_DOCUMENT_FILES}.` };
  }
  let total = 0;
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      return { valid: false, error: 'Invalid file size.' };
    }
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      return { valid: false, error: 'A file exceeds the 15 MiB limit.' };
    }
    total += file.size;
    if (total > MAX_DOCUMENT_BATCH_BYTES) {
      return { valid: false, error: 'Combined upload exceeds the 25 MiB limit.' };
    }
  }
  return { valid: true };
}

export function validateRagSearchQuery(query: unknown): { valid: boolean; error?: string } {
  if (typeof query !== 'string' || query.trim().length === 0) return { valid: false, error: 'Search query is required.' };
  if (query.length > MAX_RAG_QUERY_CHARS) return { valid: false, error: 'Search query exceeds the 10,000-character limit.' };
  return { valid: true };
}

export function normalizeRagSearchLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(MAX_RAG_SEARCH_RESULTS, Math.max(1, Math.floor(parsed)));
}

export function extractSafeTextForRag(fileName: string, buffer: Buffer): string | null {
  const baseName = fileName.toLowerCase().split('/').pop() || '';
  if (baseName.includes('.env') || ['credentials', 'secrets', 'id_rsa', 'id_ed25519'].some(name => baseName.startsWith(name))) return null;
  const ext = baseName.slice(baseName.lastIndexOf('.'));
  if (!TEXT_EXTENSIONS.has(ext) || buffer.byteLength > MAX_RAG_TEXT_BYTES) return null;
  if (buffer.includes(0)) return null;
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    const lower = decoded.toLowerCase();
    if (['begin private key', 'api_key', 'api-key', 'secret=', 'secret:', 'password=', 'password:', 'passwd=', 'passwd:', 'token=', 'token:', 'access_token', 'refresh_token', 'bearer '].some(marker => lower.includes(marker)) || decoded.includes('ghp_') || decoded.includes('AKIA')) return null;
    return decoded;
  } catch {
    return null;
  }
}
