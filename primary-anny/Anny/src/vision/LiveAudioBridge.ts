/**
 * ANNY — LIVE VOICE & AUDIO BRIDGE FOR MULTIMODAL VISION
 * Captures 16kHz 16-bit signed LE PCM microphone audio for Gemini Live API
 * and plays back 24kHz 16-bit signed LE PCM audio seamlessly with interruption flush.
 * Coordinates microphone ownership with AnnyWorkspace to avoid competing mic streams.
 */

function float32ToResampledInt16(input: Float32Array, inputSampleRate: number, targetRate = 16000): Int16Array {
  if (inputSampleRate === targetRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  const ratio = inputSampleRate / targetRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = srcIdx - i0;
    const sample = input[i0] + (input[i1] - input[i0]) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToFloat32Pcm(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = Math.floor(byteLen / 2);
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export class LiveAudioBridge {
  private micStream: MediaStream | null = null;
  private inputCtx: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;

  private outputCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private micActive = false;
  private muted = false;

  async startMicrophone(onAudioChunk: (base64Pcm16k: string) => void): Promise<void> {
    if (this.micActive) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser.');
    }

    // Notify AnnyWorkspace to release SpeechRecognition / MediaRecorder so mics never compete
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anny:live-voice-claim'));
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('Web Audio API is unavailable in this browser.');
    }

    const ctx: AudioContext = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const zeroGain = ctx.createGain();
    zeroGain.gain.value = 0;

    processor.onaudioprocess = (ev) => {
      if (!this.micActive || this.muted) return;
      const input = ev.inputBuffer.getChannelData(0);
      if (!input || input.length === 0) return;
      const pcm16 = float32ToResampledInt16(input, ctx.sampleRate, 16000);
      onAudioChunk(int16ToBase64(pcm16));
    };

    source.connect(processor);
    processor.connect(zeroGain);
    zeroGain.connect(ctx.destination);

    this.micStream = stream;
    this.inputCtx = ctx;
    this.inputSource = source;
    this.processorNode = processor;
    this.silentGain = zeroGain;
    this.micActive = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMicActive(): boolean {
    return this.micActive;
  }

  /**
   * Queues 24kHz PCM audio chunk from Gemini Live API for gapless playback.
   */
  enqueueOutputPcm24k(base64Pcm24k: string): void {
    if (typeof window === 'undefined' || !base64Pcm24k) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.outputCtx) {
      this.outputCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextPlayTime = this.outputCtx.currentTime;
    }
    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume().catch(() => {});
    }

    const float32 = base64ToFloat32Pcm(base64Pcm24k);
    if (float32.length === 0) return;

    const buffer = this.outputCtx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const src = this.outputCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.outputCtx.destination);

    const now = this.outputCtx.currentTime;
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now + 0.02;
    }
    src.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;

    this.activeSources.add(src);
    src.onended = () => {
      this.activeSources.delete(src);
    };
  }

  /**
   * Immediately flushes queued AI speech when user interrupts mid-response.
   */
  interruptPlayback(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    if (this.outputCtx) {
      this.nextPlayTime = this.outputCtx.currentTime;
    }
  }

  stopMicrophone(): void {
    this.micActive = false;
    if (this.processorNode) {
      try {
        this.processorNode.onaudioprocess = null;
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }
    if (this.inputSource) {
      try {
        this.inputSource.disconnect();
      } catch {}
      this.inputSource = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {}
      this.silentGain = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.micStream = null;
    }
    if (this.inputCtx) {
      try {
        void this.inputCtx.close();
      } catch {}
      this.inputCtx = null;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anny:live-voice-release'));
    }
  }

  stopAll(): void {
    this.stopMicrophone();
    this.interruptPlayback();
    if (this.outputCtx) {
      try {
        void this.outputCtx.close();
      } catch {}
      this.outputCtx = null;
    }
  }
}
