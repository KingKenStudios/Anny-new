
import { fetchWithAuth } from '../lib/apiUtils';

export interface ModlyTask {
  id: string;
  status: 'pending' | 'processing' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress?: number;
  step?: string;
  model_url?: string;
  error?: string;
  engine?: 'local' | 'meshy-cloud';
  pipeline?: 'local-text-image-to-3d';
  imageProvider?: string;
  imageModel?: string;
  referenceImageUrl?: string;
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
  if (!image || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) throw new Error('Select a PNG, JPEG, or WebP image for 3D reconstruction.');
  if (image.size > 25 * 1024 * 1024) throw new Error('Image must be 25 MB or smaller.');
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
  const data = await response.json();
  const id = String(data?.job_id || data?.id || '').trim();
  if (!id) throw new Error('Local Modly returned no job identifier.');
  return { id, status: 'pending', progress: 0, engine: 'local' };
}

/** Generate a mesh from text using only locally hosted image and 3D models. */
export async function generate3DModelFromTextLocal(prompt: string): Promise<ModlyTask> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt || cleanPrompt.length > 4000) {
    throw new Error('Enter a text-to-3D prompt between 1 and 4000 characters.');
  }
  const response = await fetchWithAuth('/api/modly/generate-from-text-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cleanPrompt }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.hint || error.detail || error.error || 'Local text-to-3D pipeline failed to start.');
  }
  return response.json();
}

/** Generate a 3D model from a text prompt via a configured cloud provider (requires MESHY_API_KEY server-side). */
export async function generate3DModelFromText(prompt: string): Promise<ModlyTask> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt || cleanPrompt.length > 4000) {
    throw new Error('Enter a text-to-3D prompt between 1 and 4000 characters.');
  }
  const response = await fetchWithAuth('/api/modly/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cleanPrompt }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.hint || error.error || 'Modly 3D generation failed to start');
  }
  return response.json();
}

/** Cancel an active local Modly inference job. */
export async function cancelLocalModlyTask(taskId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/api/modly/cancel/${encodeURIComponent(taskId)}`, { method: 'POST' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.hint || error.error || 'Local 3D job cancellation failed.');
  }
  const result = await response.json();
  return Boolean(result.cancelled);
}

export async function pollModlyTask(taskId: string, engine: 'local' | 'meshy-cloud' = 'local'): Promise<ModlyTask> {
  const response = await fetchWithAuth(`/api/modly/status/${taskId}?engine=${engine}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.hint || error.error || 'Uplink to Modly severed');
  }
  return response.json();
}
