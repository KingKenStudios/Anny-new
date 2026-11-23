/**
 * ANNY — Local Deterministic PCM Audio & Music Synthesizer
 *
 * Generates real, playable, standards-compliant 16-bit PCM RIFF/WAV files (`audio/wav`)
 * locally with zero external dependencies or paid API requirements.
 *
 * Supports:
 *  - MUSIC / INSTRUMENTAL: chord progressions + arpeggiated melody + warm bass + soft percussion
 *  - BEAT: drum kit rhythm (pitch-swept kick, band-shaped snare, hi-hat groove, sub-bass)
 *  - SFX: procedural rain/wind/thunder/laser/chime/swoosh/impact waveforms
 */

export type LocalSynthAudioType = 'MUSIC' | 'INSTRUMENTAL' | 'BEAT' | 'SFX';

export interface LocalAudioSynthResult {
  audioBytes: Uint8Array;
  mimeType: 'audio/wav';
  durationSeconds: number;
  sampleRate: number;
  channels: 1;
  bitsPerSample: 16;
  provider: 'local-pcm-audio-synth';
  model: 'anny-wav-synth-v1';
  metadata: {
    audioType: LocalSynthAudioType;
    bpm: number;
    musicalKey: string;
    style: string;
  };
}

function hashPrompt(prompt: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < prompt.length; i++) {
    h = Math.imul(h ^ prompt.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h || 0x12345678;
}

function makePrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function parseBpmFromPrompt(lower: string, defaultBpm: number): number {
  const match = lower.match(/\b(\d{2,3})\s*bpm\b/);
  if (match?.[1]) {
    const val = Number(match[1]);
    if (val >= 60 && val <= 185) return val;
  }
  if (/\b(ambient|chill|lofi|lo-fi|slow|ballad|calm|sleep|meditation)\b/.test(lower)) return 82;
  if (/\b(afrobeat|amapiano|reggae|groove|r&b)\b/.test(lower)) return 106;
  if (/\b(trap|hip[- ]?hop|drill)\b/.test(lower)) return 132;
  if (/\b(house|techno|edm|dance|club|synthwave|electronic)\b/.test(lower)) return 124;
  if (/\b(orchestral|cinematic|epic|trailer|piano)\b/.test(lower)) return 96;
  return defaultBpm;
}

function encodeWavPcm16Mono(samples: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = samples.length;
  const dataByteLength = numSamples * 2;
  const totalBytes = 44 + dataByteLength;
  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  // RIFF Header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeStr(8, 'WAVE');

  // fmt chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data chunk
  writeStr(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Peak normalize slightly below clipping (-1 dBFS ~ 0.89)
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  const scale = peak > 0.0001 ? Math.min(0.89 / peak, 2.5) : 1.0;

  let offset = 44;
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.08), Math.floor(numSamples / 6));
  for (let i = 0; i < numSamples; i++) {
    let env = 1.0;
    if (i < fadeSamples) env = i / fadeSamples;
    else if (i > numSamples - fadeSamples) env = (numSamples - i) / fadeSamples;
    const clamped = Math.max(-1, Math.min(1, samples[i] * scale * env));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

function synthesizeSfx(prompt: string, sampleRate: number, rng: () => number): {
  samples: Float32Array;
  durationSeconds: number;
  style: string;
} {
  const lower = prompt.toLowerCase();
  const durationSeconds = 4.0;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(totalSamples);

  if (/\b(rain|thunder|wind|ocean|waves|storm|water|ambient noise)\b/.test(lower)) {
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const white = rng() * 2 - 1;
      lp = lp * 0.92 + white * 0.08;
      lp2 = lp2 * 0.992 + white * 0.008;
      const swell = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.35 * t);
      const thunderHit = /\bthunder|storm\b/.test(lower) && t > 0.6 && t < 2.8
        ? Math.exp(-(t - 0.6) * 1.4) * Math.sin(2 * Math.PI * (42 + 12 * Math.sin(t * 9)) * t) * 0.55
        : 0;
      samples[i] = (lp * 0.55 + lp2 * 0.85) * swell + thunderHit;
    }
    return { samples, durationSeconds, style: 'atmospheric_foley_sfx' };
  }

  if (/\b(laser|sci-fi|scifi|phaser|zap|futuristic|warp)\b/.test(lower)) {
    let phase = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const localT = t % 1.0;
      const freq = 1400 * Math.exp(-localT * 4.5) + 110;
      phase += (2 * Math.PI * freq) / sampleRate;
      const env = Math.exp(-localT * 3.8);
      samples[i] = (Math.sin(phase) + 0.35 * Math.sin(phase * 2.01)) * env * 0.7;
    }
    return { samples, durationSeconds, style: 'scifi_synth_sfx' };
  }

  if (/\b(explosion|impact|boom|slam|hit|punch)\b/.test(lower)) {
    let lp = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const burst = t % 2.0;
      const white = rng() * 2 - 1;
      lp = lp * 0.96 + white * 0.04;
      const subFreq = 110 * Math.exp(-burst * 4.5) + 32;
      const sub = Math.sin(2 * Math.PI * subFreq * burst) * Math.exp(-burst * 2.4);
      const crack = lp * Math.exp(-burst * 3.2);
      samples[i] = sub * 0.75 + crack * 0.65;
    }
    return { samples, durationSeconds, style: 'cinematic_impact_sfx' };
  }

  // Default bright chime / UI notification / transition SFX
  const notes = [64, 68, 71, 76]; // E major chord chime
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (let n = 0; n < notes.length; n++) {
      const start = n * 0.14;
      if (t >= start) {
        const dt = t - start;
        const f = midiToFreq(notes[n]);
        const env = Math.exp(-dt * 2.4);
        sum += (Math.sin(2 * Math.PI * f * dt) + 0.25 * Math.sin(2 * Math.PI * f * 2 * dt)) * env;
      }
    }
    samples[i] = sum * 0.3;
  }
  return { samples, durationSeconds, style: 'chime_notification_sfx' };
}

function synthesizeMusicalTrack(
  prompt: string,
  audioType: Exclude<LocalSynthAudioType, 'SFX'>,
  sampleRate: number,
  seed: number,
  rng: () => number
): {
  samples: Float32Array;
  durationSeconds: number;
  bpm: number;
  musicalKey: string;
  style: string;
} {
  const lower = prompt.toLowerCase();
  const bpm = parseBpmFromPrompt(lower, audioType === 'BEAT' ? 116 : 108);
  const stepSec = 60 / bpm / 4; // 16th-note grid
  const totalSteps = 64; // 4 full bars of 4/4
  const durationSeconds = Math.max(6, Math.min(14, Number((totalSteps * stepSec).toFixed(2))));
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(totalSamples);

  const keyNames = ['C minor', 'D minor', 'E minor', 'F minor', 'G minor', 'A minor', 'C major', 'F major'];
  const keyRoots = [48, 50, 52, 53, 55, 57, 48, 53];
  const keyIdx = seed % keyNames.length;
  const musicalKey = keyNames[keyIdx];
  const rootMidi = keyRoots[keyIdx];
  const isMinor = musicalKey.includes('minor');

  // Scale intervals
  const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const progressions = [
    [0, 5, 3, 4], // i - VI - IV - V (or I - vi - IV - V)
    [0, 3, 4, 0],
    [0, 2, 5, 4],
  ];
  const progression = progressions[(seed >>> 3) % progressions.length];

  const isBeatOnly = audioType === 'BEAT';
  const styleLabel = isBeatOnly
    ? 'procedural_drum_groove'
    : audioType === 'INSTRUMENTAL'
      ? 'procedural_instrumental'
      : 'procedural_synth_music';

  // Generate rhythmic drum hits on 16th-note steps
  const addKick = (startSample: number, gain: number) => {
    const len = Math.floor(sampleRate * 0.24);
    let phase = 0;
    for (let j = 0; j < len && startSample + j < totalSamples; j++) {
      const t = j / sampleRate;
      const freq = 44 + 115 * Math.exp(-t * 28);
      phase += (2 * Math.PI * freq) / sampleRate;
      const env = Math.exp(-t * 11);
      samples[startSample + j] += Math.sin(phase) * env * gain;
    }
  };

  const addSnare = (startSample: number, gain: number) => {
    const len = Math.floor(sampleRate * 0.17);
    let hpPrev = 0;
    for (let j = 0; j < len && startSample + j < totalSamples; j++) {
      const t = j / sampleRate;
      const noise = rng() * 2 - 1;
      const hp = noise - hpPrev * 0.7;
      hpPrev = noise;
      const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 24);
      const env = Math.exp(-t * 18);
      samples[startSample + j] += (hp * 0.55 + body * 0.45) * env * gain;
    }
  };

  const addHiHat = (startSample: number, gain: number) => {
    const len = Math.floor(sampleRate * 0.055);
    let prev = 0;
    for (let j = 0; j < len && startSample + j < totalSamples; j++) {
      const t = j / sampleRate;
      const noise = rng() * 2 - 1;
      const crisp = noise - prev * 0.88;
      prev = noise;
      samples[startSample + j] += crisp * Math.exp(-t * 58) * gain;
    }
  };

  const addNote = (startSample: number, durSamples: number, freq: number, gain: number, waveform: 'sine' | 'warm' | 'pluck') => {
    const attack = Math.max(8, Math.floor(sampleRate * 0.012));
    for (let j = 0; j < durSamples && startSample + j < totalSamples; j++) {
      const t = j / sampleRate;
      const att = j < attack ? j / attack : 1.0;
      const decayRate = waveform === 'pluck' ? 6.5 : waveform === 'warm' ? 2.1 : 3.2;
      const env = att * Math.exp(-t * decayRate);
      let osc = Math.sin(2 * Math.PI * freq * t);
      if (waveform === 'warm') {
        osc += 0.3 * Math.sin(2 * Math.PI * freq * 2 * t) + 0.12 * Math.sin(2 * Math.PI * freq * 3 * t);
      } else if (waveform === 'pluck') {
        osc += 0.4 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 11);
      }
      samples[startSample + j] += osc * env * gain;
    }
  };

  const afrobeatStyle = /\b(afrobeat|amapiano|dancehall|tropical|reggaeton)\b/.test(lower);

  for (let step = 0; step < totalSteps; step++) {
    const startSample = Math.floor(step * stepSec * sampleRate);
    if (startSample >= totalSamples) break;
    const barStep = step % 16;
    const barIndex = Math.floor(step / 16) % progression.length;
    const degree = progression[barIndex];
    const chordRoot = rootMidi + scale[degree % scale.length];

    // Drums
    const kickHit = afrobeatStyle
      ? (barStep === 0 || barStep === 3 || barStep === 6 || barStep === 10 || barStep === 12)
      : (barStep === 0 || barStep === 6 || barStep === 8 || (barStep === 14 && rng() > 0.45));
    if (kickHit) addKick(startSample, isBeatOnly ? 0.85 : 0.55);

    const snareHit = barStep === 4 || barStep === 12;
    if (snareHit) addSnare(startSample, isBeatOnly ? 0.58 : 0.36);

    if (barStep % 2 === 0 || (afrobeatStyle && barStep % 4 === 3)) {
      addHiHat(startSample, isBeatOnly ? 0.24 : 0.14);
    }

    // Sub-bass on chord roots
    if (barStep === 0 || barStep === 6 || barStep === 10) {
      const bassFreq = midiToFreq(chordRoot - 12);
      addNote(startSample, Math.floor(stepSec * 3.5 * sampleRate), bassFreq, isBeatOnly ? 0.42 : 0.34, 'sine');
    }

    if (!isBeatOnly) {
      // Warm pad chord on beat 1 of each bar
      if (barStep === 0) {
        const third = rootMidi + scale[(degree + 2) % scale.length] + (degree + 2 >= scale.length ? 12 : 0);
        const fifth = rootMidi + scale[(degree + 4) % scale.length] + (degree + 4 >= scale.length ? 12 : 0);
        const padSamples = Math.floor(stepSec * 15 * sampleRate);
        addNote(startSample, padSamples, midiToFreq(chordRoot), 0.18, 'warm');
        addNote(startSample, padSamples, midiToFreq(third), 0.15, 'warm');
        addNote(startSample, padSamples, midiToFreq(fifth), 0.15, 'warm');
      }

      // Deterministic melodic lead pattern
      if (barStep % 2 === 0 && rng() > 0.25) {
        const noteIdx = (degree + Math.floor(rng() * 5)) % scale.length;
        const leadMidi = rootMidi + 12 + scale[noteIdx];
        addNote(startSample, Math.floor(stepSec * 2.5 * sampleRate), midiToFreq(leadMidi), 0.24, 'pluck');
      }
    }
  }

  return { samples, durationSeconds, bpm, musicalKey, style: styleLabel };
}

export function synthesizeLocalWavAudio(params: {
  prompt: string;
  audioType?: LocalSynthAudioType;
}): LocalAudioSynthResult {
  const cleanPrompt = (params.prompt || 'ambient studio groove').trim();
  const audioType: LocalSynthAudioType = params.audioType || 'MUSIC';
  const sampleRate = 22050;
  const seed = hashPrompt(`${audioType}:${cleanPrompt}`);
  const rng = makePrng(seed);

  if (audioType === 'SFX') {
    const sfx = synthesizeSfx(cleanPrompt, sampleRate, rng);
    const wavBytes = encodeWavPcm16Mono(sfx.samples, sampleRate);
    return {
      audioBytes: wavBytes,
      mimeType: 'audio/wav',
      durationSeconds: sfx.durationSeconds,
      sampleRate,
      channels: 1,
      bitsPerSample: 16,
      provider: 'local-pcm-audio-synth',
      model: 'anny-wav-synth-v1',
      metadata: {
        audioType: 'SFX',
        bpm: 0,
        musicalKey: 'N/A',
        style: sfx.style,
      },
    };
  }

  const track = synthesizeMusicalTrack(cleanPrompt, audioType, sampleRate, seed, rng);
  const wavBytes = encodeWavPcm16Mono(track.samples, sampleRate);
  return {
    audioBytes: wavBytes,
    mimeType: 'audio/wav',
    durationSeconds: track.durationSeconds,
    sampleRate,
    channels: 1,
    bitsPerSample: 16,
    provider: 'local-pcm-audio-synth',
    model: 'anny-wav-synth-v1',
    metadata: {
      audioType,
      bpm: track.bpm,
      musicalKey: track.musicalKey,
      style: track.style,
    },
  };
}
