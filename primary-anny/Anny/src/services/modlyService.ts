
import { fetchWithAuth } from '../lib/apiUtils';

export interface ModlyTask {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress?: number;
  step?: string;
  model_url?: string;
  error?: string;
  engine?: 'local' | 'meshy-cloud';
}

export interface ModlyHealth {
  available: boolean;
  engine: string;
  url: string;
  hint?: string;
}

/** Check whether the local Modly 3D-generation engine is reachable before letting the user submit a job. */
export async function checkModlyHealth(): Promise<ModlyHealth> {
  const response = await fetch('/api/modly/health');
  return response.json();
}

/**
 * Generate a 3D model from an uploaded image (real local generation via modly-main/api).
 * Requires the local Modly engine to be running — see README "3D Model Generation".
 */
export async function generate3DModelFromImage(
  image: File,
  options?: { modelId?: string; remesh?: 'quad' | 'triangle' | 'none'; enableTexture?: boolean }
): Promise<ModlyTask> {
  const form = new FormData();
  form.append('image', image);
  if (options?.modelId) form.append('model_id', options.modelId);
  if (options?.remesh) form.append('remesh', options.remesh);
  if (options?.enableTexture !== undefined) form.append('enable_texture', String(options.enableTexture));

  const response = await fetchWithAuth('/api/modly/generate', { method: 'POST', body: form });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.hint || error.error || 'Modly 3D generation failed to start');
  }
  return response.json();
}

/** Generate a 3D model from a text prompt via a configured cloud provider (requires MESHY_API_KEY server-side). */
export async function generate3DModelFromText(prompt: string): Promise<ModlyTask> {
  const response = await fetchWithAuth('/api/modly/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.hint || error.error || 'Modly 3D generation failed to start');
  }
  return response.json();
}

export async function pollModlyTask(taskId: string, engine: 'local' | 'meshy-cloud' = 'local'): Promise<ModlyTask> {
  const response = await fetchWithAuth(`/api/modly/status/${taskId}?engine=${engine}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.hint || error.error || 'Uplink to Modly severed');
  }
  return response.json();
}
