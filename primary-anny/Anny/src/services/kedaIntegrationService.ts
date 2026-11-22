export interface KedaCommandRequest {
  action: string;
  payload?: unknown;
  requestId?: string;
}

export interface KedaIntegrationResult {
  ok: boolean;
  status: number;
  data: unknown;
}

/** Secure server-side bridge from ANNY to Keda.
 * Keda credentials never enter the browser. Configure KEDA_API_URL and
 * KEDA_API_TOKEN in the deployment environment.
 */
export async function callKeda(request: KedaCommandRequest): Promise<KedaIntegrationResult> {
  const baseUrl = process.env.KEDA_API_URL?.replace(/\/$/, '');
  const token = process.env.KEDA_API_TOKEN;
  if (!baseUrl || !token) {
    return { ok: false, status: 503, data: { error: 'KEDA_INTEGRATION_NOT_CONFIGURED' } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl}/api/v1/anny/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-ANNY-Request-ID': request.requestId || `anny_${Date.now()}`,
      },
      body: JSON.stringify({ action: request.action, payload: request.payload }),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch {}
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 502, data: { error: error instanceof Error ? error.message : 'KEDA_REQUEST_FAILED' } };
  } finally {
    clearTimeout(timeout);
  }
}
