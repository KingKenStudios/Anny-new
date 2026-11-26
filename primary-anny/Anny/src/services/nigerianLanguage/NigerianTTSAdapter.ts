import { NigerianSpeechRequest } from './types';
import { normalizeNigerianSpeechText } from './NigerianTextNormalizer';
import { fetchWithAuth } from '../../lib/apiUtils';

export async function speakWithNigerianTTS(request: NigerianSpeechRequest): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const language = request.language;
  if (!language) return false;
  try {
    const response = await fetchWithAuth('/api/sahara/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: normalizeNigerianSpeechText(request.text, language),
        language,
        voiceRole: request.voiceRole,
        ...(request.dialectHint ? { dialectHint: request.dialectHint } : {}),
      }),
    });
    if (!response.ok) return false;
    const blob = await response.blob();
    if (!blob.size) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
