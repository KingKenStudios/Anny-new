import assert from 'node:assert/strict';
import { test } from 'node:test';

test('creative provider registry does not equate credentials or URLs with working generation', async () => {
  const keys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'SD_WEBUI_URL'] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.GEMINI_API_KEY = 'test-provider-key-123456';
    process.env.OPENAI_API_KEY = 'test-openai-key-123456';
    process.env.SD_WEBUI_URL = 'http://127.0.0.1:7860';

    const { creativeGenerationService } = await import('./creativeGenerationService');
    const providers = creativeGenerationService.getCreativeProviders();
    const byId = new Map(providers.map((provider) => [provider.id, provider]));

    for (const id of [
      'gemini-image',
      'openai-image',
      'local-sd-webui',
      'gemini-omni-video',
      'gemini-lyria-music',
      'gemini-voice-tts',
      'gemini-vision-qa',
    ]) {
      const provider = byId.get(id);
      assert.ok(provider, `expected provider ${id} to be registered`);
      assert.equal(provider.configured, true, `${id} should reflect configuration`);
      assert.equal(provider.status, 'DEGRADED', `${id} must not be called available from configuration alone`);
    }

    assert.equal(byId.get('local-vector-svg')?.status, 'AVAILABLE');
    assert.equal(byId.get('local-pcm-audio-synth')?.status, 'AVAILABLE');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key]!;
    }
  }
});
