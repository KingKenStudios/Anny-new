import { NigerianSpeechRequest } from './types';
import { normalizeNigerianSpeechText } from './NigerianTextNormalizer';
import { fetchWithAuth } from '../../lib/apiUtils';

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let playbackGeneration = 0;

function disposeActiveAudio(): void {
  playbackGeneration += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio.load();
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

/** Stop any dialect speech currently playing and release its blob URL. */
export function stopNigerianTTS(): void {
  disposeActiveAudio();
}

export async function speakWithNigerianTTS(request: NigerianSpeechRequest): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const language = request.language;
  if (!language) return false;
  // Only one local dialect utterance should play at a time.
  disposeActiveAudio();
  const generation = playbackGeneration;
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
    if (generation !== playbackGeneration || !blob.size) return false;
    if (generation !== playbackGeneration) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeObjectUrl = url;
    activeAudio = audio;
    const release = () => {
      if (activeAudio === audio) disposeActiveAudio();
      else URL.revokeObjectURL(url);
    };
    audio.onended = release;
    audio.onerror = release;
    await audio.play();
    return true;
  } catch {
    disposeActiveAudio();
    return false;
  }
}
