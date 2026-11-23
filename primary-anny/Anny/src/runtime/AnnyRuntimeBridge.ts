/**
 * ANNY — AUTHENTICATED RUNTIME & AIOS CLIENT BRIDGE
 * Connects frontend studios and governance views to live authenticated server endpoints.
 */

import { fetchWithAuth } from '../lib/apiUtils';

async function requestJson(url: string, options?: RequestInit): Promise<any> {
  const res = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const annyRuntimeBridge = {
  getRuntimeStatus: () => requestJson('/api/runtime/status'),
  getHardware: () => requestJson('/api/runtime/hardware'),
  getCapabilities: () => requestJson('/api/runtime/capabilities'),
  getProviders: () => requestJson('/api/runtime/providers'),
  getLanguageMatrix: () => requestJson('/api/runtime/languages/matrix'),

  selectLanguageModel: (params: { language: string; task: string; dialect?: string }) =>
    requestJson('/api/runtime/languages/select-model', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getLanguagePack: (language: string, tier: string = 'SPEECH') =>
    requestJson('/api/runtime/languages/pack', {
      method: 'POST',
      body: JSON.stringify({ language, tier }),
    }),

  activateLanguage: (language: string, tier: string = 'SPEECH') =>
    requestJson('/api/runtime/languages/activate', {
      method: 'POST',
      body: JSON.stringify({ language, tier }),
    }),

  translate: (text: string, sourceLanguage: string, targetLanguage: string) =>
    requestJson('/api/runtime/languages/translate', {
      method: 'POST',
      body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
    }),

  detectLanguage: (text: string) =>
    requestJson('/api/runtime/languages/lid', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  activatePhase38: () =>
    requestJson('/api/runtime/certify-phase38', { method: 'POST' }),

  // AIOS Control Plane & Organizations & Portable Host & Master Reality Suite
  getAiosCapabilities: () => requestJson('/api/anny/aios/capabilities'),
  executeAiosCapability: (payload: {
    domain: string;
    action: string;
    parameters?: Record<string, any>;
    userConfirmed?: boolean;
  }) =>
    requestJson('/api/anny/aios/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAiosApps: () => requestJson('/api/anny/aios/apps'),

  listOrganizations: () => requestJson('/api/anny/orgs'),
  registerOrganization: (payload: {
    orgId: string;
    canonicalName: string;
    identityRole: string;
    primaryIndustry: string;
    domains: string[];
    aliases?: string[];
  }) =>
    requestJson('/api/anny/orgs/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resolveOrganizationContext: (prompt: string, userAuthorized: boolean = false) =>
    requestJson('/api/anny/orgs/resolve-context', {
      method: 'POST',
      body: JSON.stringify({ prompt, userAuthorized }),
    }),

  getIdentity: () => requestJson('/api/anny/identity'),
  getPortableStatus: () => requestJson('/api/anny/portable/status'),
  getMasterRealitySuite: () => requestJson('/api/anny/master-reality-suite'),

  getLearningKnowledge: () => requestJson('/api/anny/learning/knowledge'),
  getLearningEvents: () => requestJson('/api/anny/learning/events'),
  syncLearning: () => requestJson('/api/anny/learning/sync', { method: 'POST' }),
};
