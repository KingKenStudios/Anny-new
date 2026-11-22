import { auth } from './firebase';

interface GuestSessionRecord {
  token: string;
  uid: string;
  expiresAt: number;
}

let inMemoryGuestSession: GuestSessionRecord | null = null;
let pendingGuestSessionPromise: Promise<string | null> | null = null;

function readCachedGuestSession(): GuestSessionRecord | null {
  const now = Date.now();
  if (inMemoryGuestSession && inMemoryGuestSession.expiresAt > now + 60_000) {
    return inMemoryGuestSession;
  }
  return null;
}

function writeCachedGuestSession(record: GuestSessionRecord): void {
  inMemoryGuestSession = record;
}

export function clearGuestSession(): void {
  inMemoryGuestSession = null;
  pendingGuestSessionPromise = null;
}

/**
 * Obtains a cryptographically server-signed OPERATOR session token for Guest Mode.
 * Never forges identity client-side; all guest UIDs & signatures come from /api/auth/guest.
 */
export async function ensureGuestSessionToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const cached = readCachedGuestSession();
    if (cached) return cached.token;
  } else {
    clearGuestSession();
  }

  if (pendingGuestSessionPromise && !forceRefresh) {
    return pendingGuestSessionPromise;
  }

  pendingGuestSessionPromise = (async () => {
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data?.token && typeof data.token === 'string') {
        const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 23 * 3600 * 1000;
        writeCachedGuestSession({
          token: data.token,
          uid: String(data.uid || 'guest'),
          expiresAt
        });
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      pendingGuestSessionPromise = null;
    }
  })();

  return pendingGuestSessionPromise;
}

/**
 * Returns verified Authorization headers using the currently signed-in Firebase user's
 * cryptographically signed ID token, or a server-signed guest OPERATOR session token
 * when operating in Guest Mode.
 */
export async function getAuthHeaders(extraHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extraHeaders || {});
  try {
    if (!headers.has('Authorization')) {
      const user = auth?.currentUser;
      if (user) {
        clearGuestSession();
        const token = await user.getIdToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } else {
        const guestToken = await ensureGuestSessionToken(false);
        if (guestToken) {
          headers.set('Authorization', `Bearer ${guestToken}`);
        }
      }
    }
  } catch {
    // Allow fallback when token acquisition is temporarily unavailable
  }
  return headers;
}

/**
 * Drop-in wrapper over fetch() that attaches the verified Firebase ID token
 * or server-signed guest OPERATOR token and same-origin HttpOnly cookies.
 * Automatically refreshes a stale token once on HTTP 401.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const explicitAuth = new Headers(init.headers || {}).has('Authorization');
  const headers = await getAuthHeaders(init.headers);
  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || 'same-origin'
  });

  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isGuestBootstrap = urlStr.includes('/api/auth/guest');

  if (response.status === 401 && !explicitAuth && !isGuestBootstrap) {
    try {
      const refreshedHeaders = new Headers(init.headers || {});
      const user = auth?.currentUser;
      if (user) {
        const freshToken = await user.getIdToken(true);
        if (freshToken) refreshedHeaders.set('Authorization', `Bearer ${freshToken}`);
      } else {
        const freshGuestToken = await ensureGuestSessionToken(true);
        if (freshGuestToken) refreshedHeaders.set('Authorization', `Bearer ${freshGuestToken}`);
      }
      return fetch(input, {
        ...init,
        headers: refreshedHeaders,
        credentials: init.credentials || 'same-origin'
      });
    } catch {
      return response;
    }
  }

  return response;
}

/**
 * Safely fetches an API endpoint and parses JSON, with robust error handling
 * for non-200 responses, rate limits, and non-JSON payloads.
 * Automatically attaches verified auth credentials when available.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    const response = await fetchWithAuth(input, init);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      if (isJson) {
        try {
          const jsonErr = await response.json();
          errorMessage = jsonErr.message || jsonErr.error || errorMessage;
        } catch (_) {}
      } else {
        try {
          const textErr = await response.text();
          if (textErr) errorMessage = textErr.slice(0, 200);
        } catch (_) {}
      }
      return { success: false, error: errorMessage, status: response.status };
    }

    if (isJson) {
      const data = await response.json();
      return { success: true, data, status: response.status };
    } else {
      const textData = await response.text();
      try {
        const parsed = JSON.parse(textData);
        return { success: true, data: parsed, status: response.status };
      } catch (_) {
        return { success: false, error: textData || 'Invalid JSON response', status: response.status };
      }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network fetch error' };
  }
}
