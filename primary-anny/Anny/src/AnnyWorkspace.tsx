import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { safeStorage } from './lib/storage';
import { fetchWithAuth } from './lib/apiUtils';
import { generateRealProjectTitle } from './lib/projectTitleUtils';
import { systemBus } from './core/systemBus';
import {
  isSynthesisOrPlaceholderContent,
  isAppWebsiteOr3DRequest,
  detectWebsiteOrAppIntent,
  formatNaturalConversation,
} from './utils/chatHelpers';
import { WorkspaceManager } from "./core/workspaceManager";
import { executionStreamManager } from "./core/executionStreamManager";
import { universalExecutionController } from "./core/universalExecutionController";
import { DynamicVFSAppRunner } from "./components/StandalonePreviewRunner";
import { WorkspacePreviewContainer } from "./components/workspace/WorkspacePreviewContainer";
import { GeneratedImageGallery } from "./components/GeneratedImageGallery";
import type { LightboxImageItem } from "./components/ImageLightboxViewer";
import type { BuildStageItem } from "./components/AnnyBuildPreviewOverlay";
import { MobileLogoMenu } from './MobileLogoMenu';
import { ExecutionStreamView } from './components/chat/ExecutionStreamView';
import { AnnyPromptComposer, type ComposerAttachedFile } from './components/chat/AnnyPromptComposer';
import { VoiceNoteAttachmentCard, formatVoiceDuration } from './components/chat/VoiceNoteRecorder';
import { resolveDraftAfterFailedSend } from './components/chat/composerUtils';
import { ChatProjectBuildCard } from './components/chat/ChatProjectBuildCard';
import { projectPreviewController, type ProjectBuildMetadata } from './services/projectPreviewController';
import {
  Sparkles,
  Command,
  Camera,
  Globe,
  Volume2,
  VolumeX,
  Share2,
  ChevronDown,
  Bell,
  ShoppingBag,
  Code2,
  LayoutDashboard,
  Lock,
  Paperclip,
  AtSign,
  Mic,
  Send,
  Square,
  Zap,
  Brain,
  Menu,
  BarChart3,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Plus,
  RotateCcw,
  Copy,
  Check,
  ArrowLeft,
  Pencil,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Maximize2,
  Minimize2,
  X,
  Search,
  User,
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Headphones,
  RotateCw,
  Cpu,
  Layers,
  ExternalLink,
  LogOut,
  LogIn,
  Settings,
  History,
  Folder,
  Bot,
  ThumbsUp,
  ThumbsDown,
  MicOff,
  Download,
  FileText,
  ScanEye,
  Link2,
  AlertCircle,
  Sun,
  Moon,
  Music,
} from 'lucide-react';
import JSZip from 'jszip';

import logoImg from './assets/logo.png';

const hardwareLogo = '/logo.png';
import { WorkspaceCodeEditor } from './components/workspace/WorkspaceCodeEditor';
import { AnnyProfessionalEditor } from './components/AnnyProfessionalEditor';
import VisionSensor from './components/VisionSensor';
import { sceneUnderstanding, liveVisionController, type VisionTranscriptEntry } from './vision';
import { annyVoiceService } from './services/annyVoiceService';
import { memoryEngine } from './core/memoryEngine';
import { AnnyDebugIntelligencePanel } from './components/AnnyDebugIntelligencePanel';
import { AnnyIntelligenceWorkspacePanel } from './components/workspace/AnnyIntelligenceWorkspacePanel';
import { classifyCreativeIntent } from './creative/CreativeIntentRouter';
import { creativeArtifactStore } from './creative/CreativeArtifactStore';
import { normalizeAudioSource, normalizeImageSource } from './creative/mediaNormalization';
import type { AudioGenerationType, CreativeAudioResult, CreativeImageResult, VideoJobRecord } from './creative/types';
import { Activity } from 'lucide-react';
import { ShieldAlert, Fingerprint } from 'lucide-react';

const MODEL_LABEL_MAP: Record<string, string> = {
  auto: 'Auto (Best Route)',
  'auto-router': 'Auto (Best Route)',
  'gemini-4-hydrogen': 'Gemini 4 Hydrogen',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  'ollama-local': 'Ollama Local (GGUF)',
  ollama: 'Ollama Local (GGUF)',
  'deepseek-coder': 'DeepSeek Coder / R1',
};

const resolveStoredModelId = (propEngine?: any): string => {
  if (typeof propEngine === 'string' && propEngine.trim()) {
    return propEngine.trim();
  }
  try {
    const raw = safeStorage.getItem('anny_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.defaultModel === 'string' && parsed.defaultModel.trim()) {
        if (/gemini-(1\.5|2\.)/i.test(parsed.defaultModel)) return 'gemini-4-hydrogen';
        return parsed.defaultModel.trim();
      }
    }
  } catch {}
  return 'auto';
};

const triggerAuthenticatedMediaDownload = async (
  url: string,
  filename: string,
  onError?: (msg: string) => void
) => {
  try {
    let href = url;
    let revokeAfter = false;
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      href = URL.createObjectURL(blob);
      revokeAfter = true;
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revokeAfter) URL.revokeObjectURL(href);
  } catch (err: any) {
    onError?.(err?.message || 'Unable to download media file.');
  }
};

const VerifiedVideoCard: React.FC<{ job: VideoJobRecord }> = ({ job }) => {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [playErr, setPlayErr] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objUrl: string | null = null;
    setPlayErr(null);

    if (job.status === 'COMPLETED' && job.playableValidated && job.videoUrl) {
      if (job.videoUrl.startsWith('data:') || job.videoUrl.startsWith('blob:')) {
        setBlobSrc(job.videoUrl);
      } else {
        setBlobSrc(null);
        void (async () => {
          try {
            const res = await fetchWithAuth(job.videoUrl!);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            if (revoked) return;
            objUrl = URL.createObjectURL(blob);
            setBlobSrc(objUrl);
          } catch (err: any) {
            if (!revoked) setPlayErr(err?.message || 'Failed to fetch verified MP4 stream.');
          }
        })();
      }
    }
    return () => {
      revoked = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [job.jobId, job.status, job.videoUrl]);

  return (
    <div className="w-full mt-3 rounded-2xl border border-cyan-500/30 bg-[#06091e] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white">
          {job.productionPlan?.title || 'Video Production'}
        </span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-cyan-300">
          {job.status}
        </span>
      </div>

      {job.status === 'COMPLETED' && job.playableValidated && job.videoUrl && (
        <div className="space-y-2">
          {playErr ? (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-200">
              {playErr}
            </div>
          ) : blobSrc ? (
            <video
              controls
              playsInline
              src={blobSrc}
              onError={() => setPlayErr('Browser video decoder failed to load MP4 stream.')}
              className="w-full max-h-[380px] rounded-xl bg-black border border-white/10"
            />
          ) : (
            <div className="w-full h-36 rounded-xl bg-black border border-white/10 flex items-center justify-center text-xs text-slate-400">
              Loading verified MP4 stream...
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                void triggerAuthenticatedMediaDownload(
                  blobSrc || job.videoUrl!,
                  `${job.jobId || 'anny-video'}.mp4`,
                  (m) => setPlayErr(m)
                )
              }
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </button>
          </div>
        </div>
      )}

      {job.productionPlan?.shots && job.productionPlan.shots.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Directorial Shot List ({job.aspectRatio} · {job.durationSeconds}s)
          </div>
          {job.productionPlan.shots.map((shot) => (
            <div key={shot.shotNumber} className="rounded-lg bg-black/40 border border-white/10 p-2.5 text-[11px] text-slate-200">
              <span className="font-bold text-cyan-300">Shot {shot.shotNumber} ({shot.durationSeconds}s):</span> {shot.visualDescription}
              <div className="text-[10px] text-slate-400 mt-0.5">
                Camera: {shot.cameraMovement} · Audio: {shot.audioCue}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VerifiedAudioCard: React.FC<{ audio: CreativeAudioResult }> = ({ audio }) => {
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const src = audio.audioUrl || audio.url || '';
  const ext = audio.format || (audio.mimeType?.includes('wav') ? 'wav' : 'mp3');

  return (
    <div className="w-full mt-3 rounded-2xl border border-purple-500/30 bg-[#06091e] p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Music className="w-4 h-4 text-purple-400" />
          <span>{audio.type || 'AUDIO'} Output</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-purple-200">
          {audio.provider} · {ext.toUpperCase()}
          {audio.durationSeconds ? ` · ${audio.durationSeconds}s` : ''}
        </span>
      </div>

      {src && !audioErr ? (
        <audio
          controls
          src={src}
          onError={() => setAudioErr('Browser failed to decode generated audio stream.')}
          className="w-full"
        />
      ) : audioErr ? (
        <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-2 text-xs text-rose-200">
          {audioErr}
        </div>
      ) : null}

      {src && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              void triggerAuthenticatedMediaDownload(
                src,
                `anny-${(audio.type || 'audio').toLowerCase()}-${Date.now()}.${ext}`,
                (m) => setAudioErr(m)
              )
            }
            className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download {ext.toUpperCase()}
          </button>
        </div>
      )}

      {audio.lyrics && (
        <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans bg-black/30 rounded-lg p-2.5 border border-white/5">
          {audio.lyrics}
        </pre>
      )}
    </div>
  );
};

interface AnnyWorkspaceProps {
  user?: any;
  userRole?: string;
  isGuest?: boolean;
  userEmail?: string;
  userName?: string;
  initialPrompt?: string;
  onToggleMobileMenu?: () => void;
  handleLogout?: () => void;
  onOpenAuth?: () => void;
  setView?: (v: string) => void;
  onSelectSubTab?: (tabKey: string) => void;
  chatHistory?: Array<{ id: string; title: string; date?: string; messages: any[] }>;
  currentChatId?: string | null;
  setCurrentChatId?: (id: string | null) => void;
  startNewChat?: () => void;
  deleteChat?: (id: string) => void;
  messages?: any[];
  onUpdateMessages?: (msgs: any[] | ((prev: any[]) => any[])) => void;
  selectedNeuralEngine?: any;
  setSelectedNeuralEngine?: (engine: any) => void;
  isVisionActive?: boolean;
  setIsVisionActive?: (val: boolean) => void;
  isContinuousListening?: boolean;
  setIsContinuousListening?: (val: boolean) => void;
  isRobotMode?: boolean;
  setIsRobotMode?: (val: boolean) => void;
  isGuidanceActive?: boolean;
  setIsGuidanceActive?: (val: boolean) => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceURI?: string;
  setSelectedVoiceURI?: (val: string) => void;
  isAutoSpeak?: boolean;
  setIsAutoSpeak?: (val: boolean) => void;
  connectToAdminGlobal?: () => Promise<void>;
  onEditorStateChange?: (isProfessional: boolean) => void;
  pendingDroppedFiles?: File[];
  onConsumeDroppedFiles?: () => void;
  activeLoadedProject?: {
    projectId: string;
    name: string;
    version?: number;
    files?: Record<string, string>;
    previewUrl?: string;
  } | null;
}

export const AnnyWorkspace: React.FC<AnnyWorkspaceProps> = ({
  user,
  userEmail = 'amazonpromo234@gmail.com',
  userName = 'Akin Kehinde',
  initialPrompt,
  onToggleMobileMenu,
  handleLogout,
  onOpenAuth,
  setView,
  onSelectSubTab,
  chatHistory: parentChatHistory = [],
  currentChatId,
  setCurrentChatId,
  startNewChat,
  deleteChat,
  messages = [],
  onUpdateMessages,
  selectedNeuralEngine,
  setSelectedNeuralEngine,
  onEditorStateChange,
  isVisionActive,
  setIsVisionActive,
  pendingDroppedFiles = [],
  onConsumeDroppedFiles,
  activeLoadedProject = null,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [activeMode, setActiveMode] = useState('builder');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => resolveStoredModelId(selectedNeuralEngine));
  const [activeModel, setActiveModel] = useState<string>(() => {
    const initialId = resolveStoredModelId(selectedNeuralEngine);
    return MODEL_LABEL_MAP[initialId] || initialId;
  });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(() => safeStorage.getItem('anny_auto_speak') === 'true');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() =>
    safeStorage.getItem('anny_theme') === 'light' ? 'light' : 'dark'
  );
  const [currentTime, setCurrentTime] = useState('08:14 PM');

  useEffect(() => {
    if (typeof selectedNeuralEngine === 'string' && selectedNeuralEngine.trim()) {
      const id = selectedNeuralEngine.trim();
      setSelectedModelId(id);
      setActiveModel(MODEL_LABEL_MAP[id] || id);
    }
  }, [selectedNeuralEngine]);

  useEffect(() => {
    safeStorage.setItem('anny_theme', themeMode);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', themeMode === 'dark');
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  const activeAbortRef = useRef<AbortController | null>(null);

  // Pro Tools, Web Search & Notice States
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState<boolean>(false);
  const [includeCodeContext, setIncludeCodeContext] = useState<boolean>(false);
  const [isDeepThinkingEnabled, setIsDeepThinkingEnabled] = useState<boolean>(false);
  const [isSaharaEnabled, setIsSaharaEnabled] = useState<boolean>(false);
  const [activePopover, setActivePopover] = useState<'none' | 'protools' | 'model' | 'url'>('none');
  const [inspectUrlInput, setInspectUrlInput] = useState<string>('');
  const [isInspectingUrl, setIsInspectingUrl] = useState<boolean>(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = React.useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setWorkspaceNotice({ type, message });
    noticeTimerRef.current = setTimeout(() => {
      setWorkspaceNotice(null);
      noticeTimerRef.current = null;
    }, 5500);
  }, []);

  // Speech Recognition, MediaRecorder Fallback & Vision Sensor States
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState<boolean>(Boolean(isVisionActive));
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
  const [visionSnapshot, setVisionSnapshot] = useState<string | null>(null);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const basePromptRef = useRef<string>('');
  const cancelAudioRef = useRef<boolean>(false);

  // Voice Note Recording & Local STT Attachment States
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [isVoiceNotePaused, setIsVoiceNotePaused] = useState(false);
  const [isProcessingVoiceNote, setIsProcessingVoiceNote] = useState(false);
  const [voiceNoteElapsedSec, setVoiceNoteElapsedSec] = useState(0);
  const [voiceNoteAnalyser, setVoiceNoteAnalyser] = useState<AnalyserNode | null>(null);
  const [voiceNoteError, setVoiceNoteError] = useState<string | null>(null);
  const [retryingVoiceNoteId, setRetryingVoiceNoteId] = useState<string | null>(null);
  const voiceNoteRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceNoteStreamRef = useRef<MediaStream | null>(null);
  const voiceNoteChunksRef = useRef<Blob[]>([]);
  const voiceNoteAudioCtxRef = useRef<AudioContext | null>(null);
  const voiceNoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceNoteCancelRef = useRef<boolean>(false);
  const voiceNoteElapsedRef = useRef<number>(0);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTranscriptRef = useRef('');
  const isSpeechOutputRef = useRef(false);

  useEffect(() => {
    if (typeof isVisionActive === 'boolean') {
      setIsVisionOpen(isVisionActive);
    }
  }, [isVisionActive]);

  const toggleVisionMonitor = (nextVal?: boolean) => {
    const next = typeof nextVal === 'boolean' ? nextVal : !isVisionOpen;
    setIsVisionOpen(next);
    if (setIsVisionActive) setIsVisionActive(next);
  };

  const clearVoiceSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopAudioStreamTracks = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      audioStreamRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    clearVoiceSilenceTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try { recognition.onend = null; } catch {}
      try { recognition.stop(); } catch {}
      try { recognition.abort(); } catch {}
    }
    recognitionRef.current = null;
    setIsListening(false);
  };

  const stopMediaRecording = (cancel = false) => {
    cancelAudioRef.current = cancel;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch {}
    } else {
      stopAudioStreamTracks();
      setIsRecordingAudio(false);
    }
  };

  const startMediaRecorderFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showNotice('Microphone capture is not supported in this browser. Please type your message.', 'warning');
      return;
    }

    try {
      stopSpeechRecognition();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelAudioRef.current = false;

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenMime = preferredTypes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecordingAudio(false);
        stopAudioStreamTracks();
        mediaRecorderRef.current = null;

        if (cancelAudioRef.current || audioChunksRef.current.length === 0) {
          audioChunksRef.current = [];
          return;
        }

        const blobType = recorder.mimeType || chosenMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];
        if (audioBlob.size < 400) {
          showNotice('Recording was too short to transcribe. Try speaking a bit longer.', 'info');
          return;
        }

        setIsTranscribingAudio(true);
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const resStr = String(reader.result || '');
              resolve(resStr.includes(',') ? resStr.split(',').pop() || '' : resStr);
            };
            reader.onerror = () => reject(new Error('Failed to encode audio recording'));
            reader.readAsDataURL(audioBlob);
          });

          const sttRes = await fetchWithAuth('/api/sahara/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: base64Audio,
              mimeType: blobType.split(';')[0],
              language: isSaharaEnabled ? 'pidgin' : 'auto',
            }),
          });
          const sttData = await sttRes.json().catch(() => ({}));
          if (!sttRes.ok || !sttData?.text) {
            throw new Error(sttData?.error || `Transcription failed (HTTP ${sttRes.status})`);
          }
          const combined = [basePromptRef.current.trim(), String(sttData.text).trim()].filter(Boolean).join(' ').trim();
          setPrompt(combined);
          showNotice('Voice transcribed. Review or press Send.', 'success');
        } catch (sttErr: any) {
          showNotice(sttErr?.message || 'Unable to transcribe audio recording.', 'error');
        } finally {
          setIsTranscribingAudio(false);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
    } catch (micErr: any) {
      stopAudioStreamTracks();
      setIsRecordingAudio(false);
      showNotice(
        micErr?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access in browser settings.'
          : 'Microphone hardware is unavailable.',
        'error'
      );
    }
  };

  const armVoiceSilenceTimer = () => {
    clearVoiceSilenceTimer();
    if (!speechTranscriptRef.current.trim() || isGenerating || isSubmittingRef.current || isSpeechOutputRef.current) return;
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      const transcript = [basePromptRef.current.trim(), speechTranscriptRef.current.trim()].filter(Boolean).join(' ').trim();
      if (!transcript || isGenerating || isSubmittingRef.current || isSpeechOutputRef.current) return;
      stopSpeechRecognition();
      void handleSend(transcript);
    }, 3500);
  };

  const startListening = () => {
    if (isRecordingAudio) {
      stopMediaRecording(false);
      return;
    }
    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    // Stop active TTS cleanly, then start microphone capture shortly after.
    if (annyVoiceService.isSpeaking()) {
      annyVoiceService.stop();
      isSpeechOutputRef.current = false;
      setTimeout(() => {
        startListening();
      }, 150);
      return;
    }

    basePromptRef.current = prompt.trim();
    speechTranscriptRef.current = '';
    clearVoiceSilenceTimer();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      void startMediaRecorderFallback();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (isSpeechOutputRef.current || annyVoiceService.isSpeaking()) {
          try { recognition.abort(); } catch {}
          return;
        }
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (isSpeechOutputRef.current || annyVoiceService.isSpeaking()) {
          try { recognition.abort(); } catch {}
          return;
        }

        let finalAdded = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = String(event.results[i][0]?.transcript || '').trim();
          if (!transcript) continue;
          if (event.results[i].isFinal) finalAdded += `${transcript} `;
          else interim += `${transcript} `;
        }

        if (finalAdded) speechTranscriptRef.current = `${speechTranscriptRef.current} ${finalAdded}`.replace(/\s+/g, ' ').trim();
        const spokenPart = `${speechTranscriptRef.current} ${interim}`.replace(/\s+/g, ' ').trim();
        const displayText = [basePromptRef.current, spokenPart].filter(Boolean).join(' ').trim();
        if (displayText) setPrompt(displayText);
        if (speechTranscriptRef.current || interim.trim()) armVoiceSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') {
          armVoiceSilenceTimer();
          return;
        }
        stopSpeechRecognition();
        if (
          event.error === 'network' ||
          event.error === 'service-not-allowed' ||
          event.error === 'language-not-supported'
        ) {
          showNotice('Switching to ANNY cloud audio recorder...', 'info');
          void startMediaRecorderFallback();
        } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          showNotice('Microphone permission denied or hardware unavailable.', 'error');
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setIsListening(false);
          armVoiceSilenceTimer();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      stopSpeechRecognition();
      void startMediaRecorderFallback();
    }
  };

  useEffect(() => {
    const handleSpeechStart = () => {
      isSpeechOutputRef.current = true;
      const recognition = recognitionRef.current;
      if (recognition) {
        try { recognition.onend = null; } catch {}
        try { recognition.stop(); } catch {}
        try { recognition.abort(); } catch {}
      }
      recognitionRef.current = null;
      clearVoiceSilenceTimer();
      setIsListening(false);
    };
    const handleSpeechEnd = () => {
      isSpeechOutputRef.current = false;
    };
    const handleLiveVoiceClaim = () => {
      // Release SpeechRecognition and MediaRecorder so Live Vision Voice owns the mic cleanly
      stopSpeechRecognition();
      stopMediaRecording(true);
      stopVoiceNoteRecording(true);
    };
    window.addEventListener('anny:speech-start', handleSpeechStart as EventListener);
    window.addEventListener('anny:speech-end', handleSpeechEnd as EventListener);
    window.addEventListener('anny:live-voice-claim', handleLiveVoiceClaim as EventListener);
    return () => {
      window.removeEventListener('anny:speech-start', handleSpeechStart as EventListener);
      window.removeEventListener('anny:speech-end', handleSpeechEnd as EventListener);
      window.removeEventListener('anny:live-voice-claim', handleLiveVoiceClaim as EventListener);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      clearVoiceSilenceTimer();
      stopSpeechRecognition();
      stopMediaRecording(true);
      stopVoiceNoteRecording(true);
    };
  }, []);

  const cleanupVoiceNoteResources = () => {
    if (voiceNoteTimerRef.current) {
      clearInterval(voiceNoteTimerRef.current);
      voiceNoteTimerRef.current = null;
    }
    if (voiceNoteStreamRef.current) {
      voiceNoteStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      voiceNoteStreamRef.current = null;
    }
    if (voiceNoteAudioCtxRef.current) {
      try { void voiceNoteAudioCtxRef.current.close(); } catch {}
      voiceNoteAudioCtxRef.current = null;
    }
    setVoiceNoteAnalyser(null);
  };

  const stopVoiceNoteRecording = (cancel = false) => {
    voiceNoteCancelRef.current = cancel;
    const rec = voiceNoteRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch {}
    } else {
      cleanupVoiceNoteResources();
      setIsRecordingVoiceNote(false);
      setIsVoiceNotePaused(false);
      if (cancel) {
        setVoiceNoteElapsedSec(0);
        voiceNoteElapsedRef.current = 0;
      }
    }
  };

  const pauseResumeVoiceNoteRecording = () => {
    const rec = voiceNoteRecorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording' && typeof rec.pause === 'function') {
      rec.pause();
      setIsVoiceNotePaused(true);
    } else if (rec.state === 'paused' && typeof rec.resume === 'function') {
      rec.resume();
      setIsVoiceNotePaused(false);
    }
  };

  const startVoiceNoteRecording = async () => {
    if (isRecordingVoiceNote || isProcessingVoiceNote) return;
    setVoiceNoteError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const msg = 'Microphone audio recording is not supported in this browser.';
      setVoiceNoteError(msg);
      showNotice(msg, 'warning');
      return;
    }

    // Release active dictation / TTS cleanly before capturing a voice note
    stopSpeechRecognition();
    stopMediaRecording(true);
    if (annyVoiceService.isSpeaking()) {
      annyVoiceService.stop();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceNoteStreamRef.current = stream;
      voiceNoteChunksRef.current = [];
      voiceNoteCancelRef.current = false;
      voiceNoteElapsedRef.current = 0;
      setVoiceNoteElapsedSec(0);
      setIsVoiceNotePaused(false);

      // Attach Web Audio AnalyserNode for live amplitude visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);
          voiceNoteAudioCtxRef.current = ctx;
          setVoiceNoteAnalyser(analyser);
        }
      } catch {
        // Waveform visualizer is progressive enhancement only
      }

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenMime = preferredTypes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      voiceNoteRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          voiceNoteChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecordingVoiceNote(false);
        setIsVoiceNotePaused(false);
        const recordedSec = voiceNoteElapsedRef.current;
        cleanupVoiceNoteResources();
        voiceNoteRecorderRef.current = null;

        if (voiceNoteCancelRef.current || voiceNoteChunksRef.current.length === 0) {
          voiceNoteChunksRef.current = [];
          setVoiceNoteElapsedSec(0);
          voiceNoteElapsedRef.current = 0;
          return;
        }

        const blobType = recorder.mimeType || chosenMime || 'audio/webm';
        const audioBlob = new Blob(voiceNoteChunksRef.current, { type: blobType });
        voiceNoteChunksRef.current = [];

        if (audioBlob.size < 300) {
          setVoiceNoteError('Voice note was too short. Please record for at least 1 second.');
          return;
        }

        setIsProcessingVoiceNote(true);
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to encode recorded audio.'));
            reader.readAsDataURL(audioBlob);
          });

          const ext = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : blobType.includes('wav') ? 'wav' : 'webm';
          const noteFileName = `voice-note-${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.${ext}`;
          const activeSession = currentChatId || projectMetaState.projectId || 'workspace_session';

          const res = await fetchWithAuth('/api/anny/voice-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: dataUrl,
              mimeType: blobType.split(';')[0],
              sessionId: activeSession,
              language: isSaharaEnabled ? 'pidgin' : 'auto',
              name: noteFileName,
              promptHint: prompt.trim().slice(0, 200) || undefined,
            }),
          });

          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload?.voiceNote) {
            throw new Error(payload?.error || `Failed to save voice note (HTTP ${res.status})`);
          }

          const vn = payload.voiceNote;
          const stt = payload.localStt || {};
          const duration = typeof vn.durationSec === 'number' && vn.durationSec > 0 ? vn.durationSec : recordedSec || null;
          const transcript = String(stt.text || vn.transcript || '').trim();
          const transcribed = Boolean(stt.transcribed && transcript);
          const textContent = transcript
            ? `[Voice Note Transcript (${formatVoiceDuration(duration)}) via ${stt.engine || 'local-stt'}]: ${transcript}`
            : `[Voice Note Audio (${formatVoiceDuration(duration)}) attached to session]`;

          const attachmentId = vn.id || `vn-${Date.now()}`;
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: attachmentId,
              name: vn.name || noteFileName,
              size: vn.sizeBytes || audioBlob.size,
              type: vn.mimeType || blobType.split(';')[0],
              isVoiceNote: true,
              voiceNoteId: vn.id,
              audioUrl: vn.audioUrl || dataUrl,
              durationSec: duration,
              transcript,
              transcriptionEngine: stt.engine || vn.transcriptionEngine || 'unavailable',
              transcribed,
              localSttGuidance: !transcribed ? (stt.guidance || stt.error || null) : null,
              textContent,
            },
          ]);

          showNotice(
            transcribed
              ? 'Voice note transcribed locally and attached to this chat session.'
              : 'Voice note audio attached to this chat session (no local STT server active).',
            transcribed ? 'success' : 'info'
          );
        } catch (err: any) {
          const errText = err?.message || 'Unable to process recorded voice note.';
          setVoiceNoteError(errText);
          showNotice(errText, 'error');
        } finally {
          setIsProcessingVoiceNote(false);
          setVoiceNoteElapsedSec(0);
          voiceNoteElapsedRef.current = 0;
        }
      };

      voiceNoteTimerRef.current = setInterval(() => {
        if (voiceNoteRecorderRef.current?.state === 'recording') {
          voiceNoteElapsedRef.current += 1;
          setVoiceNoteElapsedSec(voiceNoteElapsedRef.current);
        }
      }, 1000);

      recorder.start(250);
      setIsRecordingVoiceNote(true);
    } catch (micErr: any) {
      cleanupVoiceNoteResources();
      setIsRecordingVoiceNote(false);
      const msg =
        micErr?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access in browser settings.'
          : 'Microphone hardware is unavailable.';
      setVoiceNoteError(msg);
      showNotice(msg, 'error');
    }
  };

  const handleRetryVoiceNoteStt = async (attachmentId: string, voiceNoteId: string) => {
    if (!voiceNoteId) return;
    setRetryingVoiceNoteId(attachmentId);
    try {
      const res = await fetchWithAuth(`/api/anny/voice-notes/${encodeURIComponent(voiceNoteId)}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: isSaharaEnabled ? 'pidgin' : 'auto' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Transcription retry failed (HTTP ${res.status})`);
      const stt = payload.localStt || {};
      const vn = payload.voiceNote || {};
      const transcript = String(stt.text || vn.transcript || '').trim();
      const transcribed = Boolean(stt.transcribed && transcript);

      setAttachedFiles((prev) =>
        prev.map((item) =>
          item.id === attachmentId
            ? {
                ...item,
                transcript,
                transcriptionEngine: stt.engine || vn.transcriptionEngine || item.transcriptionEngine,
                transcribed,
                localSttGuidance: !transcribed ? (stt.guidance || stt.error || null) : null,
                textContent: transcript
                  ? `[Voice Note Transcript (${formatVoiceDuration(item.durationSec)}) via ${stt.engine || 'local-stt'}]: ${transcript}`
                  : item.textContent,
              }
            : item
        )
      );
      showNotice(
        transcribed ? 'Voice note transcribed locally.' : (stt.guidance || 'Local STT service is still unavailable.'),
        transcribed ? 'success' : 'info'
      );
    } catch (err: any) {
      showNotice(err?.message || 'Unable to retry local speech-to-text.', 'error');
    } finally {
      setRetryingVoiceNoteId(null);
    }
  };

  const handleInsertVoiceNoteTranscript = (transcript: string) => {
    const clean = transcript.trim();
    if (!clean) return;
    setPrompt((prev) => (prev.trim() ? `${prev.trim()}\n${clean}` : clean));
    showNotice('Voice note transcript added to prompt.', 'success');
  };

  useEffect(() => {
    stopVoiceNoteRecording(true);
    setVoiceNoteError(null);
  }, [currentChatId]);

  const handleVisionCapture = (base64Image: string) => {
    if (base64Image) {
      setVisionSnapshot(base64Image);
    }
  };

  const toggleVoice = () => {
    const next = !isVoiceActive;
    setIsVoiceActive(next);
    safeStorage.setItem('anny_auto_speak', next.toString());
    if (next) {
      void annyVoiceService.speakConversation("ANNY voice synthesizer active.");
    } else {
      annyVoiceService.stop();
    }
  };

  const handleStop = () => {
    try {
      activeAbortRef.current?.abort();
    } catch {}
    activeAbortRef.current = null;
    isSubmittingRef.current = false;
    setIsGenerating(false);
    systemBus.publish('BuildCancelled', 'AnnyWorkspace', {});
    annyVoiceService.stop();
    showNotice('Generation stopped.', 'info');
  };
  
  // Mode toggle: true = split screen view (Prompt + Telemetry + Live Preview)
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  // Mobile tab toggle for split view on mobile/tablet (chat vs preview)
  const [mobileSplitView, setMobileSplitView] = useState<'chat' | 'preview'>('preview');
  // Visual Studio / Manual AI Editor mode (Page 3 of Anny)
  const [isVisualEditor, setIsVisualEditor] = useState(false);
  
  useEffect(() => {
    memoryEngine.loadFromCloud().catch(err => {
      console.warn('Initial cloud memory load failed (likely no data yet):', err);
    });
  }, []);

  useEffect(() => {
    if (onEditorStateChange) {
      onEditorStateChange(isVisualEditor);
    }
  }, [isVisualEditor, onEditorStateChange]);

  const [previewTab, setPreviewTab] = useState<'preview' | 'code' | 'logs' | 'intelligence'>('preview');
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<LightboxImageItem | null>(null);
  const [lastBuildPrompt, setLastBuildPrompt] = useState<string>('');
  const [buildFailureInfo, setBuildFailureInfo] = useState<{ error: string; diagnostics: string[] } | null>(null);
  const [buildStages, setBuildStages] = useState<BuildStageItem[]>([]);
  const [buildVerification, setBuildVerification] = useState<any>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const visionRef = useRef<any>(null);
  const sessionProjectMapRef = useRef<Map<string, string>>(new Map());
  const prevChatIdRef = useRef<string | null | undefined>(currentChatId);
  const codePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [projectMetaState, setProjectMetaState] = useState<{
    projectId: string;
    name: string;
    version: number;
    previewUrl: string | null;
    lastSavedAt: string | null;
    isSaving: boolean;
  }>(() => ({
    projectId: WorkspaceManager.getInstance().getActiveProjectId(),
    name: WorkspaceManager.getInstance().getActiveProjectName(),
    version: 1,
    previewUrl: null,
    lastSavedAt: null,
    isSaving: false,
  }));

  const speakText = (text: string, id: string) => {
    if (currentlySpeakingId === id) {
      annyVoiceService.stop();
      setCurrentlySpeakingId(null);
      return;
    }
    setCurrentlySpeakingId(id);
    annyVoiceService.speakSpeakerButton(text, () => setCurrentlySpeakingId(null));
  };
  const [cartCount, setCartCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const getVfsMap = (): Record<string, string> => {
    try {
      const files = WorkspaceManager.getInstance().getVFS().getAllFiles();
      const map: Record<string, string> = {};
      files.forEach((f) => {
        map[f.path] = f.content;
      });
      return map;
    } catch {
      return {};
    }
  };

  const [vfsFiles, setVfsFiles] = useState<Record<string, string>>(getVfsMap);
  
  // Code Editor states
  const [activeCodeFile, setActiveCodeFile] = useState<string>('package.json');
  const [openTabs, setOpenTabs] = useState<string[]>(['package.json']);
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [newFileName, setNewFileName] = useState<string>('');
  const [isAddingFile, setIsAddingFile] = useState<boolean>(false);
  const [isAddingFolder, setIsAddingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [fileSearch, setFileSearch] = useState<string>('');

  const [activeProj, setActiveProj] = useState<any>(undefined);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubQueue = executionStreamManager.subscribe((streamState) => {
      const progressPct = (() => {
        switch (streamState.currentStage) {
          case 'analyzing': return 15;
          case 'planning': return 30;
          case 'editing': return 50;
          case 'validation': return 70;
          case 'build': return 85;
          case 'runtime': return 92;
          case 'persistence': return 97;
          case 'finalization': return 100;
          default: return 50;
        }
      })();

      const executionProject = streamState.isRunning || streamState.currentStatus === 'failed' || streamState.currentStatus === 'completed' ? {
        id: WorkspaceManager.getInstance().getActiveProjectId(),
        name: streamState.currentMessage || 'Active Task',
        type: 'Engineering Pipeline',
        status: streamState.isRunning ? 'running' : streamState.currentStatus === 'failed' ? 'failed' : 'completed',
        currentStage: streamState.currentMessage || 'Processing',
        progressPct,
        logs: streamState.historyItems ? streamState.historyItems.map(item => `[${item.stage.toUpperCase()}] ${item.message}`) : [],
        errors: streamState.error ? [streamState.error] : [],
      } : undefined;

      setActiveProj(executionProject);
      setVfsFiles(getVfsMap());
    });
    const unsubController = universalExecutionController.subscribe(() => {
      forceUpdate(n => n + 1);
    });
    return () => {
      unsubQueue();
      unsubController();
    };
  }, [currentChatId]);

  // Sync isolated workspace while preserving active generated projects across session updates
  useEffect(() => {
    if (!currentChatId) {
      prevChatIdRef.current = currentChatId;
      return;
    }

    const mgr = WorkspaceManager.getInstance();
    const persistedMeta = projectPreviewController.getSessionProjectMeta(currentChatId);
    const mappedProjectId =
      sessionProjectMapRef.current.get(currentChatId) ||
      persistedMeta?.projectId;
    const activeProjId = mgr.getActiveProjectId();
    const currentFiles = mgr.getVFS().getAllFiles();

    if (mappedProjectId) {
      sessionProjectMapRef.current.set(currentChatId, mappedProjectId);
      const targetName =
        persistedMeta?.name ||
        (projectMetaState.projectId === mappedProjectId ? projectMetaState.name : '') ||
        parentChatHistory.find((c) => c.id === currentChatId)?.title ||
        mappedProjectId;
      projectPreviewController.ensureProjectOwnershipRegistered(mappedProjectId, user?.uid);
      if (activeProjId !== mappedProjectId) {
        mgr.switchWorkspace(mappedProjectId, targetName, user?.uid || 'global', 'fullstack');
      }
      let map = getVfsMap();
      if (Object.keys(map).length === 0 && mappedProjectId.startsWith('proj_')) {
        void projectPreviewController.restoreProjectForSession(currentChatId, messages).then((restored) => {
          if (restored) {
            setVfsFiles(getVfsMap());
            setProjectMetaState((prev) => ({
              ...prev,
              projectId: restored.projectId,
              name: restored.name || prev.name,
              version: restored.version || prev.version,
              previewUrl: restored.previewUrl || prev.previewUrl,
            }));
            setReloadKey((k) => k + 1);
          }
        });
      } else {
        setVfsFiles(map);
        setProjectMetaState((prev) => ({
          ...prev,
          projectId: mappedProjectId,
          name: targetName,
          version: persistedMeta?.version || prev.version || 1,
          previewUrl: persistedMeta?.previewUrl || prev.previewUrl,
        }));
        if (Object.keys(map).length > 0) {
          setIsSplitScreen(true);
        }
      }
      prevChatIdRef.current = currentChatId;
      return;
    }

    // Check if any message in the current thread has a saved projectBuild metadata
    const sessionObj = parentChatHistory.find((c) => c.id === currentChatId);
    const threadMessages = messages.length > 0 ? messages : sessionObj?.messages || [];
    const lastBuildMsg = [...threadMessages].reverse().find((m: any) => m?.projectBuild?.projectId && m.projectBuild.status !== 'failed');
    if (lastBuildMsg?.projectBuild?.projectId) {
      const msgBuild = lastBuildMsg.projectBuild as ProjectBuildMetadata;
      sessionProjectMapRef.current.set(currentChatId, msgBuild.projectId);
      projectPreviewController.setSessionProjectMeta(currentChatId, msgBuild);
      void projectPreviewController.restoreProjectForSession(currentChatId, threadMessages).then((restored) => {
        if (restored) {
          setVfsFiles(getVfsMap());
          setProjectMetaState({
            projectId: restored.projectId,
            name: restored.name || 'Generated Website',
            version: restored.version || 1,
            previewUrl: restored.previewUrl || null,
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSaving: false,
          });
          setReloadKey((k) => k + 1);
        }
      });
      prevChatIdRef.current = currentChatId;
      return;
    }

    // If currentChatId was assigned immediately after starting or finishing a build from an empty session,
    // bind the newly created proj_* workspace instead of resetting it!
    const currentEffectiveProjId =
      projectMetaState.projectId && projectMetaState.projectId.startsWith('proj_')
        ? projectMetaState.projectId
        : activeProjId && activeProjId.startsWith('proj_')
          ? activeProjId
          : '';
    if (
      (!prevChatIdRef.current || isSubmittingRef.current) &&
      currentEffectiveProjId
    ) {
      sessionProjectMapRef.current.set(currentChatId, currentEffectiveProjId);
      projectPreviewController.ensureProjectOwnershipRegistered(currentEffectiveProjId, user?.uid);
      if (mgr.getActiveProjectId() !== currentEffectiveProjId) {
        mgr.switchWorkspace(currentEffectiveProjId, projectMetaState.name || 'Generated Website', user?.uid || 'global', 'fullstack');
      }
      setVfsFiles(getVfsMap());
      prevChatIdRef.current = currentChatId;
      return;
    }

    // Check if pending project belongs to an explicitly loaded project
    if (activeLoadedProject?.projectId && activeProjId === activeLoadedProject.projectId && currentFiles.length > 0) {
      sessionProjectMapRef.current.set(currentChatId, activeLoadedProject.projectId);
      prevChatIdRef.current = currentChatId;
      return;
    }

    mgr.switchWorkspace(currentChatId, sessionObj?.title || `Session ${currentChatId}`);
    setIsSplitScreen(false);
    setIsVisualEditor(false);
    setVfsFiles(getVfsMap());
    setProjectMetaState({
      projectId: currentChatId,
      name: sessionObj?.title || 'Anny Workspace',
      version: 1,
      previewUrl: null,
      lastSavedAt: null,
      isSaving: false,
    });
    prevChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Hydrate workspace when an existing saved project is opened from Projects view
  useEffect(() => {
    if (!activeLoadedProject?.projectId) return;
    const { projectId, name, version, files, previewUrl } = activeLoadedProject;
    projectPreviewController.activateProject({
      projectId,
      name: name || projectId,
      version: version || 1,
      files,
      previewUrl,
      sessionId: currentChatId,
      ownerUserId: user?.uid,
    });
    safeStorage.setItem('anny_current_project_id', projectId);
    if (currentChatId) {
      sessionProjectMapRef.current.set(currentChatId, projectId);
    }
    const nextMap = getVfsMap();
    setVfsFiles(nextMap);
    const firstFile =
      nextMap['/src/App.tsx'] !== undefined
        ? '/src/App.tsx'
        : Object.keys(nextMap)[0] || '/package.json';
    setActiveCodeFile(firstFile);
    setOpenTabs([firstFile]);
    setProjectMetaState({
      projectId,
      name: name || projectId,
      version: version || 1,
      previewUrl: previewUrl || null,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSaving: false,
    });
    setBuildFailureInfo(null);
    setIsSplitScreen(true);
    setPreviewTab('preview');
    setMobileSplitView('preview');
    setReloadKey((k) => k + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anny_project_generated', { detail: { projectId } }));
      window.dispatchEvent(new CustomEvent('anny_vfs_changed', { detail: { projectId } }));
    }
  }, [activeLoadedProject]);

  // Watch the active VFS for any changes to keep the workspace state perfectly in sync
  useEffect(() => {
    const activeVFS = WorkspaceManager.getInstance().getVFS();
    const unsubVfs = activeVFS.watch(() => {
      setVfsFiles(getVfsMap());
    });
    return () => {
      unsubVfs();
    };
  }, [currentChatId]);

  // Close fullscreen & popovers on Escape key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenPreview(false);
        setActivePopover('none');
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);

  const [chatHistory, setChatHistory] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      codeSnippet?: string;
      steps?: string[];
      sources?: Array<{ title: string; url: string }>;
      attachedFiles?: Array<
        ComposerAttachedFile & {
          data?: string;
        }
      >;
      isGeneratingImage?: boolean;
      imagePrompt?: string;
      imageProgress?: number;
      imageStage?: string;
      generatedImages?: Array<
        LightboxImageItem & {
          seed?: number;
          timestamp?: string;
          logoBundle?: CreativeImageResult['logoBundle'];
        }
      >;
      generatedVideo?: VideoJobRecord;
      generatedAudio?: CreativeAudioResult;
      projectBuild?: ProjectBuildMetadata;
    }>
  >([]);
  const [generatingSessions, setGeneratingSessions] = useState<Set<string>>(new Set());
  const isGenerating = currentChatId ? generatingSessions.has(currentChatId) : false;

  const setIsGenerating = (val: boolean, overrideSessionId?: string) => {
    const targetId = overrideSessionId || currentChatId;
    setGeneratingSessions(prev => {
      const next = new Set(prev);
      if (val && targetId) next.add(targetId);
      else if (!val && targetId) next.delete(targetId);
      return next;
    });
  };
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatHistory, isGenerating, activeProj?.status, activeProj?.currentStage]);

  useEffect(() => {
    let interval: any = null;
    const isRunning = isGenerating || activeProj?.status === 'queued' || activeProj?.status === 'running' || activeProj?.status === 'repairing' || universalExecutionController.getIsExecuting(currentChatId || undefined);
    if (isRunning) {
      setElapsedSec(0);
      interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, activeProj?.status, universalExecutionController.getIsExecuting()]);

  // Auto-reset local state when switching to a new empty chat (unless holding a hydrated project)
  useEffect(() => {
    if (messages && messages.length === 0) {
      const activeId = WorkspaceManager.getInstance().getActiveProjectId();
      const mapped = currentChatId ? sessionProjectMapRef.current.get(currentChatId) : undefined;
      const isHydratedProject =
        (mapped && mapped === activeId) ||
        (activeLoadedProject?.projectId && activeLoadedProject.projectId === activeId);
      setChatHistory([]);
      if (!isHydratedProject) {
        setIsSplitScreen(false);
        setPreviewTab('preview');
        setIsVisualEditor(false);
        setVfsFiles({});
        setActiveProj(undefined);
      }
    } else if (messages && messages.length > 0) {
      // Sync local chatHistory with parent messages if available
      setChatHistory(messages);
      const lastBuildMsg = [...messages]
        .reverse()
        .find((m: any) => m?.projectBuild?.projectId && m.projectBuild.status !== 'failed');
      if (lastBuildMsg?.projectBuild?.projectId) {
        const msgBuild = lastBuildMsg.projectBuild as ProjectBuildMetadata;
        if (currentChatId) {
          sessionProjectMapRef.current.set(currentChatId, msgBuild.projectId);
          projectPreviewController.setSessionProjectMeta(currentChatId, msgBuild);
        }
        if (WorkspaceManager.getInstance().getActiveProjectId() !== msgBuild.projectId) {
          void projectPreviewController.restoreProjectForSession(currentChatId, messages).then((restored) => {
            if (restored) {
              setVfsFiles(getVfsMap());
              setProjectMetaState((prev) => ({
                ...prev,
                projectId: restored.projectId,
                name: restored.name || prev.name,
                version: restored.version || prev.version,
                previewUrl: restored.previewUrl || prev.previewUrl,
              }));
              setReloadKey((k) => k + 1);
            }
          });
        } else {
          setVfsFiles(getVfsMap());
        }
      } else {
        setVfsFiles(getVfsMap());
      }
    }
  }, [messages]);

  const isWorking = isGenerating || activeProj?.status === 'queued' || activeProj?.status === 'running' || activeProj?.status === 'repairing' || universalExecutionController.getIsExecuting(currentChatId || undefined);

  const hasBuiltApp = React.useMemo(() => {
    const appCode = vfsFiles['/src/App.tsx'] || '';
    const hasCustomFiles = Object.keys(vfsFiles).some(
      (path) =>
        path !== '/src/App.tsx' &&
        path !== '/src/main.tsx' &&
        path !== '/src/index.css' &&
        path !== '/package.json'
    );
    return hasCustomFiles || (appCode.trim() && !appCode.includes('return null;'));
  }, [vfsFiles]);

  const [attachedFiles, setAttachedFiles] = useState<
    Array<
      ComposerAttachedFile & {
        data?: string;
      }
    >
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTextLikeFile = (file: File) =>
    file.type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|tsv|json|ts|tsx|js|jsx|mjs|cjs|py|html|htm|css|scss|sql|ya?ml|toml|xml|log|sh|bash|env|ini|cfg|conf|java|go|rs|c|cpp|h|hpp|php|rb|swift|kt)$/i.test(
      file.name
    );

  const ingestWorkspaceFiles = React.useCallback((fileList: File[]) => {
    if (!fileList.length) return;
    fileList.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        showNotice(`"${file.name}" exceeds the 25MB attachment limit.`, 'warning');
        return;
      }

      if (isTextLikeFile(file)) {
        file
          .text()
          .then((text) => {
            setAttachedFiles((prev) => {
              const duplicate = prev.some((f) => f.name === file.name && f.size === file.size && f.type === file.type);
              if (duplicate) return prev;
              return [
                ...prev,
                {
                  id: 'file-' + Math.random().toString(36).substring(2, 10),
                  name: file.name,
                  size: file.size,
                  type: file.type || 'text/plain',
                  textContent: text.slice(0, 45000),
                },
              ];
            });
          })
          .catch(() => showNotice(`Could not read text file "${file.name}".`, 'error'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachedFiles((prev) => {
          const duplicate = prev.some((f) => f.name === file.name && f.size === file.size && f.type === file.type);
          if (duplicate) return prev;
          return [
            ...prev,
            {
              id: 'file-' + Math.random().toString(36).substring(2, 10),
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              data: result,
              previewUrl: file.type.startsWith('image/') ? result : undefined,
            },
          ];
        });
      };
      reader.onerror = () => showNotice(`Could not read attached file "${file.name}".`, 'error');
      reader.readAsDataURL(file);
    });
  }, [showNotice]);

  useEffect(() => {
    if (!pendingDroppedFiles.length) return;
    ingestWorkspaceFiles(pendingDroppedFiles);
    onConsumeDroppedFiles?.();
  }, [pendingDroppedFiles, ingestWorkspaceFiles, onConsumeDroppedFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    ingestWorkspaceFiles(Array.from(files));
    if (e.target) e.target.value = '';
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const persistVfsToServer = React.useCallback(
    async (explicitProjectId?: string) => {
      const targetProjectId = explicitProjectId || projectMetaState.projectId || WorkspaceManager.getInstance().getActiveProjectId();
      if (!targetProjectId || targetProjectId === 'ws_default_1') return;
      const currentFiles = getVfsMap();
      const cleanFiles: Record<string, string> = {};
      for (const [k, v] of Object.entries(currentFiles)) {
        if (!k.startsWith('/__anny_')) {
          cleanFiles[k] = v;
        }
      }
      if (Object.keys(cleanFiles).length === 0) return;

      setProjectMetaState((prev) => ({ ...prev, isSaving: true }));
      try {
        const res = await fetchWithAuth(`/api/anny/projects/${encodeURIComponent(targetProjectId)}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: cleanFiles, name: projectMetaState.name }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setProjectMetaState((prev) => ({
            ...prev,
            version: data.project?.version || prev.version,
            previewUrl: data.preview?.previewUrl || prev.previewUrl,
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSaving: false,
          }));
        } else {
          setProjectMetaState((prev) => ({ ...prev, isSaving: false }));
        }
      } catch {
        setProjectMetaState((prev) => ({ ...prev, isSaving: false }));
      }
    },
    [projectMetaState.projectId, projectMetaState.name]
  );

  // Code editor handlers
  const handleCodeChange = (content: string) => {
    setActiveFileContent(content);
    WorkspaceManager.getInstance().getVFS()._unsafe_writeFile(activeCodeFile, content);
    setVfsFiles(getVfsMap());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('anny_vfs_changed', {
          detail: { projectId: WorkspaceManager.getInstance().getActiveProjectId() },
        })
      );
    }
    if (codePersistTimerRef.current) clearTimeout(codePersistTimerRef.current);
    codePersistTimerRef.current = setTimeout(() => {
      void persistVfsToServer();
    }, 1200);
  };

  const handleDeleteFile = (path: string) => {
    WorkspaceManager.getInstance().getVFS()._unsafe_remove(path);
    setVfsFiles(getVfsMap());
    if (activeCodeFile === path) {
      const remaining = openTabs.filter((t) => t !== path);
      setOpenTabs(remaining);
      setActiveCodeFile(remaining.length > 0 ? remaining[0] : '');
    } else {
      setOpenTabs((prev) => prev.filter((t) => t !== path));
    }
  };

  const handleCreateNewFolder = () => {
    const raw = newFolderName.trim();
    if (!raw) { setIsAddingFolder(false); return; }
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    WorkspaceManager.getInstance().getVFS()._unsafe_mkdir(path);
    setVfsFiles(getVfsMap());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const handleRenameFile = (path: string) => {
    const currentName = path.split('/').pop() || '';
    const nextName = window.prompt('Rename file or folder', currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    try {
      WorkspaceManager.getInstance().getVFS().rename(path, nextName);
      setOpenTabs(prev => prev.map(tab => tab === path ? `${path.slice(0, path.lastIndexOf('/') + 1)}${nextName}` : tab));
      if (activeCodeFile === path) setActiveCodeFile(`${path.slice(0, path.lastIndexOf('/') + 1)}${nextName}`);
      setVfsFiles(getVfsMap());
    } catch (error) { console.error('ANNY rename failed', error); }
  };

  const handleMoveFile = (sourcePath: string, destinationFolder: string) => {
    const name = sourcePath.split('/').pop();
    if (!name) return;
    try {
      const destination = `${destinationFolder.replace(/\/$/, '')}/${name}`;
      WorkspaceManager.getInstance().getVFS().move(sourcePath, destination);
      const newPath = destination;
      setOpenTabs(prev => prev.map(tab => tab === sourcePath ? newPath : tab));
      if (activeCodeFile === sourcePath) setActiveCodeFile(newPath);
      setVfsFiles(getVfsMap());
    } catch (error) { console.error('ANNY move failed', error); }
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) {
      setIsAddingFile(false);
      return;
    }
    let p = newFileName.trim();
    if (!p.startsWith('/')) p = '/' + p;
    WorkspaceManager.getInstance().getVFS()._unsafe_writeFile(p, '');
    setVfsFiles(getVfsMap());
    setIsAddingFile(false);
    setNewFileName('');
    setOpenTabs((prev) => Array.from(new Set([...prev, p])));
    setActiveCodeFile(p);
  };

  useEffect(() => {
    if (activeCodeFile) {
      const vfs = WorkspaceManager.getInstance().getVFS();
      const content = vfs.readFile(activeCodeFile) || '';
      setActiveFileContent(content);
    } else {
      setActiveFileContent('');
    }
  }, [activeCodeFile, vfsFiles]);

  const fileListKeys = Object.keys(vfsFiles).filter((k) =>
    fileSearch ? k.toLowerCase().includes(fileSearch.toLowerCase()) : true
  );

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const cardPrompts = [
    {
      id: 'ecommerce',
      icon: ShoppingBag,
      title: 'Build E-commerce Website',
      subtitle: 'Full-stack store with React & Tailwind',
    },
    {
      id: 'rest-api',
      icon: Code2,
      title: 'Create a REST API',
      subtitle: 'Secure Express API with authentication',
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: 'Design Dashboard UI',
      subtitle: 'Modern dark dashboard with analytics',
    },
    {
      id: 'supabase',
      icon: Lock,
      title: 'Set up Supabase Auth',
      subtitle: 'User login & database security rules',
    },
  ];

  const handleAnalyzeVisionFrame = async (base64Frame: string) => {
    if (!base64Frame || isVisionAnalyzing) return;
    setIsVisionAnalyzing(true);
    const framePrompt = prompt.trim() || 'Analyze this live camera/screen frame carefully.';
    const snapshotPreviewUrl = `data:image/jpeg;base64,${base64Frame}`;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: framePrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFiles: [
        {
          id: `vision-${Date.now()}`,
          name: 'vision-frame.jpg',
          size: Math.round((base64Frame.length * 3) / 4),
          type: 'image/jpeg',
          previewUrl: snapshotPreviewUrl,
        },
      ],
    };

    const currentThread = [...(messages.length > 0 ? messages : chatHistory), userMsg];
    setChatHistory(currentThread);
    if (onUpdateMessages) onUpdateMessages(currentThread);
    if (prompt.trim()) setPrompt('');

    try {
      const res = await fetchWithAuth('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Frame,
          mimeType: 'image/jpeg',
          prompt: framePrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.analysis) {
        throw new Error(data?.error || `Vision analysis failed (HTTP ${res.status})`);
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: formatNaturalConversation(data.analysis),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, botMsg]);
      if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => [...prevMsgs, botMsg]);
      if (safeStorage.getItem('anny_auto_speak') !== 'false') {
        annyVoiceService.speakConversation(botMsg.content);
      }
    } catch (err: any) {
      const errMsgText = err?.message || 'Vision analysis could not be completed.';
      showNotice(errMsgText, 'error');
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: formatNaturalConversation(`Vision Monitor notice: ${errMsgText}`),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, errMsg]);
      if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => [...prevMsgs, errMsg]);
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  const handleInspectPublicUrl = async () => {
    const raw = inspectUrlInput.trim();
    if (!raw || isInspectingUrl) return;
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setIsInspectingUrl(true);

    try {
      const res = await fetchWithAuth('/api/anny/source/inspect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `URL inspection failed (HTTP ${res.status})`);
      }

      const report = data.report || {};
      const summaryLines = [
        `Inspected Public URL: ${normalizedUrl}`,
        report.title ? `Title: ${report.title}` : '',
        report.summary ? `\n${report.summary}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const inspectBotMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: formatNaturalConversation(summaryLines || `Inspected ${normalizedUrl}.`),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [{ title: report.title || normalizedUrl, url: normalizedUrl }],
      };
      setChatHistory((prev) => [...prev, inspectBotMsg]);
      if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => [...prevMsgs, inspectBotMsg]);
      setInspectUrlInput('');
      setActivePopover('none');
      showNotice('Public URL analyzed and added to conversation.', 'success');
    } catch (err: any) {
      showNotice(err?.message || 'Unable to inspect public URL.', 'error');
    } finally {
      setIsInspectingUrl(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    if (isSubmittingRef.current) return;
    const messageText = textToSend || prompt;
    const capturedVisionImmediate = visionSnapshot || visionRef.current?.capture?.() || null;
    if (!messageText.trim() && attachedFiles.length === 0 && !capturedVisionImmediate && !textToSend && !isGenerating) return;
    isSubmittingRef.current = true;
    setActivePopover('none');

    const firstVoiceNoteWithText = attachedFiles.find((f) => f.isVoiceNote && f.transcript?.trim());
    const anyVoiceNote = attachedFiles.find((f) => f.isVoiceNote);
    const query =
      messageText.trim() ||
      firstVoiceNoteWithText?.transcript?.trim() ||
      (anyVoiceNote
        ? `Listen and respond to the attached voice note (${formatVoiceDuration(anyVoiceNote.durationSec)})`
        : capturedVisionImmediate
          ? 'Analyze the attached camera/screen snapshot'
          : 'Analyze attached file(s)');

    const userAttachedForBubble = [
      ...attachedFiles.map(({ data: _omitRawData, ...rest }) => rest),
      ...(capturedVisionImmediate
        ? [
            {
              id: `vision-${Date.now()}`,
              name: 'vision-snapshot.jpg',
              size: Math.round((capturedVisionImmediate.length * 3) / 4),
              type: 'image/jpeg',
              previewUrl: `data:image/jpeg;base64,${capturedVisionImmediate}`,
            },
          ]
        : []),
    ];

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFiles: userAttachedForBubble,
    };

    const updatedHistory = [...(messages.length > 0 ? messages : chatHistory), userMsg];
    setChatHistory(updatedHistory);
    if (onUpdateMessages) {
      onUpdateMessages(updatedHistory);
    }

    const submittedDraft = textToSend ? '' : prompt;
    const currentAttached = [...attachedFiles];
    const capturedVision = capturedVisionImmediate;
    if (!textToSend) {
      setPrompt('');
    }
    setAttachedFiles([]);
    setVisionSnapshot(null);
    setIsGenerating(true);

    const lowerQuery = query.toLowerCase().trim();

    // Source understanding: a public URL becomes explicit evidence for the same
    // cognitive pipeline, rather than being treated as ordinary chat text.
    const urlMatch = query.match(/https?:\/\/[^\s<>()]+|(?:www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>()]*)?/i);
    let sourceUrl: string | undefined;
    if (urlMatch && /\b(build|rebuild|clone|copy|recreate|analy[sz]e|create|make|similar|replicate)\b/i.test(query)) {
      sourceUrl = urlMatch[0].replace(/[),.!?]+$/, '');
      if (!/^https?:\/\//i.test(sourceUrl)) sourceUrl = `https://${sourceUrl}`;
    }

    // Uploaded project archives are analyzed by the real source-analysis API.
    // Their contents are not masqueraded as vision input. The resulting analysis
    // is fed into the normal build pipeline as evidence for a clean-room rebuild.
    let uploadedProjectContext = '';
    const projectArchive = currentAttached.find((file: any) =>
      /\.(zip|tar|tgz)$/i.test(file.name || '') || /application\/(zip|x-7z-compressed)/i.test(file.type || '')
    );
    if (projectArchive?.data && /\.(zip|tar|tgz)$/i.test(projectArchive.name || '')) {
      try {
        const base64 = projectArchive.data.includes(',') ? projectArchive.data.split(',').pop() : projectArchive.data;
        const binary = atob(base64 || '');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const form = new FormData();
        form.append('file', new Blob([bytes], { type: projectArchive.type || 'application/zip' }), projectArchive.name);
        const analysisResponse = await fetchWithAuth('/api/anny/source/rebuild-upload', { method: 'POST', body: form });
        const analysisJson = await analysisResponse.json().catch(() => ({}));
        if (!analysisResponse.ok || analysisJson?.success === false) throw new Error(analysisJson?.error || 'Uploaded project analysis failed');
        uploadedProjectContext = `\nUPLOADED PROJECT ANALYSIS (clean-room evidence):\n${JSON.stringify(analysisJson.analysis || analysisJson).slice(0, 30000)}`;
      } catch (archiveError: any) {
        console.warn('[ANNY] Project archive analysis unavailable:', archiveError?.message || archiveError);
      }
    }
    
    const vfs = WorkspaceManager.getInstance().getVFS();
    const vfsHasCode = vfs.exists('/src/App.tsx') && vfs.readFile('/src/App.tsx').trim().length > 30;

    // Context-aware Creative Intent Router (preserves full original prompt — NEVER strips "logo" or category words)
    const activeArtifactCtx = {
      ...(creativeArtifactStore.getActiveContext() || {}),
      hasVfsProject: vfsHasCode,
      ...(selectedImageForEdit
        ? {
            domain: 'IMAGE' as const,
            selectedImageId: selectedImageForEdit.id,
            selectedImageUrl: selectedImageForEdit.url,
            selectedImageMimeType: selectedImageForEdit.mimeType,
            revisionNumber: selectedImageForEdit.revisionNumber || 1,
          }
        : {}),
    };
    const attachmentMeta = currentAttached.map((f: any) => ({
      name: f.name,
      type: f.type,
      mimeType: f.type,
      hasData: Boolean(f.data),
    }));
    const creativeIntent = classifyCreativeIntent(query, attachmentMeta, activeArtifactCtx);

    const isImageRequest = creativeIntent.domain === 'IMAGE';
    const isVideoRequest = creativeIntent.domain === 'VIDEO';
    const isAudioRequest = creativeIntent.domain === 'AUDIO';
    const isGreeting = /^(hello|hi|hey|how are you|what'?s up|yo|morning|evening|afternoon|test|ping)\b/i.test(lowerQuery) && lowerQuery.length < 50;

    const intentDecision = detectWebsiteOrAppIntent(query, {
      hasActiveProject: vfsHasCode,
      creativeDomain: creativeIntent.domain,
    });
    const projectModification = Boolean(vfsHasCode && intentDecision.isProjectEdit);
    const isNewBuild = Boolean(intentDecision.isBuildRequest && !projectModification);
    const isBuildRequest = Boolean(
      !isImageRequest &&
        !isVideoRequest &&
        !isAudioRequest &&
        !isGreeting &&
        intentDecision.isBuildRequest
    );

    // 1. REAL IMAGE & DEDICATED LOGO GENERATION WORKFLOW
    if (isImageRequest) {
      const botMsgId = (Date.now() + 1).toString();
      const isLogoIntent = creativeIntent.category === 'LOGO_DESIGN' || creativeIntent.category === 'BRAND_IDENTITY' || creativeIntent.category === 'ICON' || creativeIntent.category === 'APP_ICON';
      const requestedImageCount = creativeIntent.requestedImageCount || 1;
      const initialBotMsg = {
        id: botMsgId,
        role: 'assistant' as const,
        content: isLogoIntent
          ? `Designing your ${creativeIntent.extractedBrandName || 'brand'} logo identity kit...`
          : requestedImageCount > 1
            ? `Generating ${requestedImageCount} distinct image options...`
            : `Generating ${creativeIntent.category.toLowerCase().replace(/_/g, ' ')}...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGeneratingImage: true,
        imagePrompt: query,
        imageProgress: 20,
        imageStage: isLogoIntent
          ? 'Analyzing brand identity, monogram geometry, and vector lockups...'
          : 'Enhancing category prompt and validating provider output...'
      };
      const historyWithBot = [...updatedHistory, initialBotMsg];
      setChatHistory(historyWithBot);
      if (onUpdateMessages) onUpdateMessages(historyWithBot);

      try {
        const abortController = new AbortController();
        activeAbortRef.current = abortController;

        const referenceImages = currentAttached
          .filter((f: any) => (f.type || '').startsWith('image/') && f.data)
          .slice(0, 6)
          .map((f: any) => ({ name: f.name, mimeType: f.type || 'image/png', data: f.data }));

        if (
          referenceImages.length === 0 &&
          selectedImageForEdit?.url?.startsWith('data:image/') &&
          selectedImageForEdit.mimeType !== 'image/svg+xml'
        ) {
          referenceImages.push({
            name: selectedImageForEdit.label || 'selected-image',
            mimeType: selectedImageForEdit.mimeType || 'image/png',
            data: selectedImageForEdit.url,
          });
        }

        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, imageProgress: 60, imageStage: 'Generating & running output quality validation...' } : msg));
        const imageResponse = await fetchWithAuth('/api/creative/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            prompt: query, // NEVER strip "logo" or category intent!
            aspectRatio: creativeIntent.aspectRatio,
            count: requestedImageCount,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            activeContext: creativeIntent.isRevision || selectedImageForEdit ? activeArtifactCtx : undefined,
            previousLogoPlan: creativeIntent.isRevision ? activeArtifactCtx.logoPlan : undefined,
            parentArtifactId: creativeIntent.isRevision ? activeArtifactCtx.artifactId : undefined,
          })
        });

        const generated: CreativeImageResult = await imageResponse.json().catch(() => ({} as any));
        const normalizedPrimary = normalizeImageSource(generated);
        if (!imageResponse.ok || !generated.success || !normalizedPrimary.valid || generated.quality?.valid === false) {
          const reason = generated?.error || normalizedPrimary.error || `Image generation failed (${imageResponse.status})`;
          const guidance = generated?.recoveryGuidance ? ` ${generated.recoveryGuidance}` : '';
          throw new Error(`${reason}${guidance}`);
        }
        generated.primaryImageUrl = normalizedPrimary.src;

        const project = creativeArtifactStore.ensureProject(generated.logoBundle?.plan.brandName || 'King Ken Studios');
        creativeArtifactStore.saveArtifact({
          id: generated.artifactId,
          projectId: project.id,
          studio: 'graphics',
          domain: 'IMAGE',
          category: generated.classification.category,
          title: generated.logoBundle ? `${generated.logoBundle.plan.brandName} Logo Kit (Rev ${generated.revisionNumber})` : query.slice(0, 60),
          prompt: query,
          enhancedPrompt: generated.enhancedPrompt.enhancedPrompt,
          provider: generated.provider,
          model: generated.model,
          format: generated.primaryFormat,
          mimeType: generated.primaryMimeType,
          url: generated.primaryImageUrl,
          thumbnailUrl: generated.primaryImageUrl,
          revisionNumber: generated.revisionNumber,
          parentArtifactId: generated.parentArtifactId,
          createdAt: generated.generatedAt,
          metadata: {
            brandName: generated.logoBundle?.plan.brandName,
            logoPlan: generated.logoBundle?.plan,
            dimensions: `${generated.quality.width}x${generated.quality.height}`,
            optionCount: generated.images?.length || 1,
          },
        });

        const galleryItems: Array<LightboxImageItem & { timestamp?: string; logoBundle?: CreativeImageResult['logoBundle'] }> =
          generated.images && generated.images.length > 0
            ? generated.images.map((opt, i) => ({
                id: opt.id,
                label: opt.label,
                url: opt.url,
                downloadUrl: opt.downloadUrl,
                mimeType: opt.mimeType,
                format: opt.format,
                width: opt.width,
                height: opt.height,
                provider: opt.provider,
                model: opt.model,
                prompt: opt.prompt || query,
                category: opt.category,
                createdAt: opt.createdAt,
                revisionNumber: opt.revisionNumber,
                originalImageUrl: opt.originalImageUrl || generated.originalImageUrl,
                timestamp: new Date().toLocaleTimeString(),
                ...(i === 0 && generated.logoBundle ? { logoBundle: generated.logoBundle } : {}),
              }))
            : [{
                id: generated.artifactId,
                label: generated.logoBundle?.plan.brandName || 'Generated Image',
                url: generated.primaryImageUrl,
                prompt: query,
                timestamp: new Date().toLocaleTimeString(),
                format: generated.primaryFormat,
                mimeType: generated.primaryMimeType,
                width: generated.quality.width,
                height: generated.quality.height,
                provider: generated.provider,
                model: generated.model,
                category: generated.classification.category,
                revisionNumber: generated.revisionNumber,
                originalImageUrl: generated.originalImageUrl,
                logoBundle: generated.logoBundle,
              }];

        const summaryText = generated.logoBundle
          ? `Your verified ${generated.logoBundle.plan.brandName} brand logo kit is ready (Rev ${generated.revisionNumber}, ${galleryItems.length} scalable variants). Click any option to inspect full-size, zoom, compare, or download.`
          : galleryItems.length > 1
            ? `Generated ${galleryItems.length} verified image options (${generated.primaryFormat.toUpperCase()}, ${generated.quality.width}×${generated.quality.height}) via ${generated.provider}. Click any image to open the full viewer, navigate with arrows, or download.`
            : `Your verified ${generated.classification.category.toLowerCase().replace(/_/g, ' ')} (${generated.primaryFormat.toUpperCase()}, ${generated.quality.width}×${generated.quality.height}${generated.revisionNumber > 1 ? `, Rev ${generated.revisionNumber}` : ''}) is ready via ${generated.provider}.`;

        if (selectedImageForEdit) {
          setSelectedImageForEdit(null);
        }

        const finalMsg = {
          id: botMsgId,
          role: 'assistant' as const,
          content: formatNaturalConversation(summaryText, { preserveStructured: false }),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isGeneratingImage: false,
          generatedImages: galleryItems,
        };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? finalMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? finalMsg : m));
        if (safeStorage.getItem('anny_auto_speak') !== 'false') annyVoiceService.speakConversation(finalMsg.content);
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isGeneratingImage: false, content: 'Image generation stopped.' } : msg));
          return;
        }
        if (submittedDraft) {
          setPrompt((curr) => resolveDraftAfterFailedSend(curr, submittedDraft));
        }
        const errorText = `I could not generate a verified image for this request. ${error?.message || 'No image provider succeeded.'}`;
        const failedMsg = { id: botMsgId, role: 'assistant' as const, content: formatNaturalConversation(errorText), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isGeneratingImage: false };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? failedMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? failedMsg : m));
      } finally {
        activeAbortRef.current = null;
        setIsGenerating(false);
        isSubmittingRef.current = false;
      }
      return;
    }

    // 2. REAL VIDEO GENERATION & STORYBOARD WORKFLOW
    if (isVideoRequest) {
      const botMsgId = (Date.now() + 1).toString();
      const initialBotMsg = {
        id: botMsgId,
        role: 'assistant' as const,
        content: `Preparing your ${creativeIntent.category.toLowerCase().replace(/_/g, ' ')} production...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGeneratingImage: true,
        imagePrompt: query,
        imageProgress: 20,
        imageStage: 'Submitting video production job...'
      };
      const historyWithBot = [...updatedHistory, initialBotMsg];
      setChatHistory(historyWithBot);
      if (onUpdateMessages) onUpdateMessages(historyWithBot);

      try {
        const abortController = new AbortController();
        activeAbortRef.current = abortController;

        const referenceImages = currentAttached
          .filter((f: any) => (f.type || '').startsWith('image/') && f.data)
          .slice(0, 6)
          .map((f: any) => ({ name: f.name, mimeType: f.type || 'image/png', data: f.data }));

        const videoRes = await fetchWithAuth('/api/creative/video/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            prompt: query,
            category: creativeIntent.category,
            aspectRatio: creativeIntent.aspectRatio === '9:16' ? '9:16' : '16:9',
            durationSeconds: 8,
            resolution: '720p',
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            parentJobId: creativeIntent.isRevision ? activeArtifactCtx.videoJobId : undefined,
            previousInteractionId: creativeIntent.isRevision ? activeArtifactCtx.videoInteractionId : undefined,
          })
        });

        let job: VideoJobRecord = await videoRes.json();
        if (!job?.jobId) {
          throw new Error((job as any)?.error || 'Video production job failed to start.');
        }

        // Poll real backend job status until terminal (max ~4 min)
        let attempts = 0;
        while (['QUEUED', 'PLANNING', 'GENERATING', 'VALIDATING'].includes(job.status) && attempts < 90) {
          if (abortController.signal.aborted) {
            void fetchWithAuth(`/api/creative/video/jobs/${encodeURIComponent(job.jobId)}/cancel`, { method: 'POST' }).catch(() => {});
            const abortErr = new Error('Video generation cancelled by user.');
            abortErr.name = 'AbortError';
            throw abortErr;
          }
          setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, imageProgress: Math.max(25, job.progressPct || 40), imageStage: job.stageMessage } : msg));
          await new Promise(resolve => setTimeout(resolve, 2500));
          if (abortController.signal.aborted) {
            void fetchWithAuth(`/api/creative/video/jobs/${encodeURIComponent(job.jobId)}/cancel`, { method: 'POST' }).catch(() => {});
            const abortErr = new Error('Video generation cancelled by user.');
            abortErr.name = 'AbortError';
            throw abortErr;
          }
          attempts++;
          const pollRes = await fetchWithAuth(`/api/creative/video/jobs/${encodeURIComponent(job.jobId)}`, {
            signal: abortController.signal,
          });
          if (pollRes.ok) {
            job = await pollRes.json();
          }
        }

        let summaryText = '';
        if (job.status === 'COMPLETED' && job.playableValidated && job.videoUrl) {
          summaryText = `Your video is rendered, verified playable (${job.aspectRatio}, ${job.durationSeconds}s, ${job.resolution}), and ready to preview or download.`;
          const project = creativeArtifactStore.ensureProject(creativeIntent.extractedBrandName || 'King Ken Studios');
          creativeArtifactStore.saveArtifact({
            id: job.jobId,
            projectId: project.id,
            studio: 'video',
            domain: 'VIDEO',
            category: job.category,
            title: job.productionPlan?.title || query.slice(0, 60),
            prompt: query,
            enhancedPrompt: job.enhancedPrompt,
            provider: job.provider,
            model: job.model,
            format: 'mp4',
            mimeType: job.mimeType || 'video/mp4',
            url: job.videoUrl,
            revisionNumber: job.parentJobId ? 2 : 1,
            parentArtifactId: job.parentJobId,
            createdAt: job.completedAt || new Date().toISOString(),
            metadata: { jobId: job.jobId, interactionId: job.interactionId },
          });
        } else if (job.status === 'STORYBOARD_PLAN_ONLY') {
          summaryText = `Directorial storyboard and shot plan ready (${job.productionPlan?.shots.length || 0} shots). No MP4 video file was rendered because this request was handled in storyboard planning mode.`;
        } else if (job.status === 'PROVIDER_UNCONFIGURED') {
          summaryText = `No video rendering provider is configured on the server right now, so I prepared a complete directorial storyboard and shot plan instead. ${job.recoveryGuidance || ''}`;
        } else {
          summaryText = `Video rendering did not complete (${job.status}): ${job.error || job.stageMessage}`;
        }

        const finalMsg = {
          id: botMsgId,
          role: 'assistant' as const,
          content: formatNaturalConversation(summaryText, { preserveStructured: false }),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isGeneratingImage: false,
          generatedVideo: job,
        };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? finalMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? finalMsg : m));
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isGeneratingImage: false, content: 'Video generation stopped.' } : msg));
          return;
        }
        if (submittedDraft) {
          setPrompt((curr) => resolveDraftAfterFailedSend(curr, submittedDraft));
        }
        const errorText = `I could not complete the video request. ${error?.message || 'Video service unavailable.'}`;
        const failedMsg = { id: botMsgId, role: 'assistant' as const, content: formatNaturalConversation(errorText), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isGeneratingImage: false };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? failedMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? failedMsg : m));
      } finally {
        activeAbortRef.current = null;
        setIsGenerating(false);
        isSubmittingRef.current = false;
      }
      return;
    }

    // 3. REAL AUDIO, MUSIC, BEAT, SFX & VOICE TTS WORKFLOW
    if (isAudioRequest) {
      const botMsgId = (Date.now() + 1).toString();
      const audioType: AudioGenerationType =
        creativeIntent.category === 'AUDIO_BEAT'
          ? 'BEAT'
          : creativeIntent.category === 'AUDIO_SFX'
            ? 'SFX'
            : creativeIntent.category === 'AUDIO_VOICE_TTS'
              ? 'VOICE'
              : /\binstrumental\b/i.test(query)
                ? 'INSTRUMENTAL'
                : 'MUSIC';

      const initialBotMsg = {
        id: botMsgId,
        role: 'assistant' as const,
        content: `Synthesizing verified ${audioType.toLowerCase()} audio...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGeneratingImage: true,
        imagePrompt: query,
        imageProgress: 35,
        imageStage: audioType === 'VOICE' ? 'Requesting Voice TTS renderer...' : 'Synthesizing 16-bit PCM WAV / audio stream...',
      };
      const historyWithBot = [...updatedHistory, initialBotMsg];
      setChatHistory(historyWithBot);
      if (onUpdateMessages) onUpdateMessages(historyWithBot);

      try {
        const abortController = new AbortController();
        activeAbortRef.current = abortController;

        const audioRes = await fetchWithAuth('/api/creative/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({ prompt: query, type: audioType }),
        });

        const generatedAudio: CreativeAudioResult = await audioRes.json().catch(() => ({} as any));
        const normalizedAudio = normalizeAudioSource(generatedAudio);
        if (!audioRes.ok || !generatedAudio.success || !normalizedAudio.valid) {
          const reason = generatedAudio?.error || normalizedAudio.error || `Audio generation failed (HTTP ${audioRes.status})`;
          const guidance = generatedAudio?.recoveryGuidance ? ` ${generatedAudio.recoveryGuidance}` : '';
          throw new Error(`${reason}${guidance}`);
        }
        generatedAudio.audioUrl = normalizedAudio.src;
        generatedAudio.url = normalizedAudio.src;

        const project = creativeArtifactStore.ensureProject('King Ken Studios');
        creativeArtifactStore.saveArtifact({
          id: generatedAudio.artifactId || `art_aud_${Date.now().toString(36)}`,
          projectId: project.id,
          studio: 'music',
          domain: 'AUDIO',
          category: creativeIntent.category,
          title: `[${audioType}] ${query.slice(0, 56)}`,
          prompt: query,
          provider: generatedAudio.provider,
          model: generatedAudio.model,
          format: generatedAudio.format || 'wav',
          mimeType: generatedAudio.mimeType || 'audio/wav',
          url: normalizedAudio.src,
          revisionNumber: 1,
          createdAt: new Date().toISOString(),
          metadata: {
            audioType,
            durationSeconds: generatedAudio.durationSeconds,
            byteLength: generatedAudio.byteLength,
          },
        });

        const summaryText = `Your verified ${audioType.toLowerCase()} audio track (${(generatedAudio.format || 'wav').toUpperCase()}${generatedAudio.durationSeconds ? `, ${generatedAudio.durationSeconds}s` : ''}) is ready via ${generatedAudio.provider}.`;
        const finalMsg = {
          id: botMsgId,
          role: 'assistant' as const,
          content: formatNaturalConversation(summaryText, { preserveStructured: false }),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isGeneratingImage: false,
          generatedAudio,
        };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? finalMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? finalMsg : m));
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isGeneratingImage: false, content: 'Audio generation stopped.' } : msg));
          return;
        }
        if (submittedDraft) {
          setPrompt((curr) => resolveDraftAfterFailedSend(curr, submittedDraft));
        }
        const errorText = `I could not generate audio for this request. ${error?.message || 'Audio renderer unavailable.'}`;
        const failedMsg = { id: botMsgId, role: 'assistant' as const, content: formatNaturalConversation(errorText), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isGeneratingImage: false };
        setChatHistory(prev => prev.map(msg => msg.id === botMsgId ? failedMsg : msg));
        if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => prevMsgs.map(m => m.id === botMsgId ? failedMsg : m));
      } finally {
        activeAbortRef.current = null;
        setIsGenerating(false);
        isSubmittingRef.current = false;
      }
      return;
    }

    if (isBuildRequest) {
      if (!isSplitScreen) {
        setIsSplitScreen(true);
      }
      setPreviewTab('preview');
      setMobileSplitView('preview');
    }

    // Do NOT show temporary placeholder messages with action icons during generation.
    // Keep chat history clean with only user message until ANNY completes the response.
    const cleanHistory = updatedHistory.filter((m: any) => !isSynthesisOrPlaceholderContent(m.content));
    setChatHistory(cleanHistory);
    if (onUpdateMessages) {
      onUpdateMessages(cleanHistory);
    }

    try {
      const execId = 'ANNY_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const isExplicitUpdate = projectModification && vfsHasCode;
      let projectId =
        (currentChatId ? sessionProjectMapRef.current.get(currentChatId) : undefined) ||
        safeStorage.getItem('anny_current_project_id') ||
        WorkspaceManager.getInstance().getActiveProjectId();
      if (isBuildRequest && (!isExplicitUpdate || !projectId || !projectId.startsWith('proj_'))) {
        const createdTitle = generateRealProjectTitle(query);
        projectId = WorkspaceManager.getInstance().createProjectWorkspace(createdTitle, user?.uid || 'global', 'fullstack');
        safeStorage.setItem('anny_current_project_id', projectId);
        if (currentChatId) {
          sessionProjectMapRef.current.set(currentChatId, projectId);
        }
        setProjectMetaState({
          projectId,
          name: createdTitle,
          version: 1,
          previewUrl: null,
          lastSavedAt: null,
          isSaving: false,
        });
      } else if (isBuildRequest && projectId) {
        if (currentChatId) {
          sessionProjectMapRef.current.set(currentChatId, projectId);
        }
        setProjectMetaState((prev) => ({ ...prev, projectId }));
      }
      if (isBuildRequest) {
        setLastBuildPrompt(query);
        setBuildFailureInfo(null);
        setBuildStages([
          { stage: 'understanding', label: '1. Understanding request', status: 'completed' },
          { stage: 'planning', label: '2. Planning', status: 'in_progress' },
          { stage: 'generating', label: '3. Generating files', status: 'pending' },
          { stage: 'validating', label: '4. Validating', status: 'pending' },
          { stage: 'installing', label: '5. Installing dependencies', status: 'pending' },
          { stage: 'starting_preview', label: '6. Starting preview', status: 'pending' },
          { stage: 'testing', label: '7. Testing', status: 'pending' },
          { stage: 'completed', label: '8. Completed', status: 'pending' },
        ]);
        executionStreamManager.startExecution('Executing application generation pipeline...', execId);
        executionStreamManager.setStage('analyzing', 'Planning project architecture and file manifest...');
      }

      const textAttachments = currentAttached
        .filter((f: any) => typeof f.textContent === 'string' && f.textContent.trim().length > 0)
        .map((f: any) => ({ name: f.name, type: f.type, size: f.size, textContent: f.textContent }));

      const visualAttachments = [
        ...currentAttached
          .filter((file: any) => {
            if (!file.data || typeof file.textContent === 'string') return false;
            if (/\.(zip|tar|tgz)$/i.test(file.name || '')) return false;
            return (
              file.type?.startsWith('image/') ||
              file.type === 'application/pdf' ||
              /\.(png|jpe?g|webp|gif|bmp|pdf)$/i.test(file.name || '')
            );
          })
          .map((file: any) => ({
            mimeType: file.type || 'image/jpeg',
            data: typeof file.data === 'string' && file.data.includes(',') ? file.data.split(',').pop() : file.data,
          })),
        ...(capturedVision ? [{ mimeType: 'image/jpeg', data: capturedVision }] : []),
      ].filter((image: any) => Boolean(image.data));

      const liveState = sceneUnderstanding.getState();
      const liveVisionActive = liveState.status.videoStreamActive && !liveState.status.paused;
      const isVisualQuery = /\b(see|looking at|look at|camera|screen|moved|moving|behind|front|holding|read this|what is this|what'?s this|describe|room|desk|person|object|track)\b/i.test(query);
      let autoLiveFrame: string | null = null;
      if (!capturedVision && liveVisionActive && isVisualQuery && !liveState.capabilities.offlineMode) {
        const snap = liveVisionController.captureSnapshotJpeg();
        if (snap?.base64) autoLiveFrame = snap.base64;
      }
      const effectiveVisualAttachments = autoLiveFrame
        ? [...visualAttachments, { mimeType: 'image/jpeg', data: autoLiveFrame }]
        : visualAttachments;
      const liveVisionContext = liveVisionActive ? sceneUnderstanding.buildPromptContext() : undefined;

      const abortController = new AbortController();
      activeAbortRef.current = abortController;

      const res = await fetchWithAuth("/api/anny/pipeline", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        signal: abortController.signal,
        body: JSON.stringify({ 
          sessionId: currentChatId || projectId || "workspace_session", 
          projectId,
          prompt: query, 
          history: updatedHistory, 
          existingVfs: (isBuildRequest && isExplicitUpdate) || includeCodeContext ? getVfsMap() : {},
          images: effectiveVisualAttachments,
          files: textAttachments,
          webSearch: isWebSearchEnabled,
          proTools: {
            deepThinking: isDeepThinkingEnabled,
            includeCodeContext,
            activeFile: activeCodeFile,
            saharaMode: isSaharaEnabled,
            preferredModel: selectedModelId,
          },
          generationId: isBuildRequest ? execId : undefined,
          contextOverride: { updateExisting: isExplicitUpdate, userId: user?.uid || 'anonymous' },
          requestType: isBuildRequest ? "build" : "chat",
          ...(sourceUrl ? { url: sourceUrl } : {}),
          ...(liveVisionContext ? { visionContext: liveVisionContext } : {}),
          execId,
          sourceContext: uploadedProjectContext || undefined
        }) 
      });

      const orchRes = await res.json().catch(() => ({}));
      if (!res.ok || orchRes?.success === false) {
        const diagList: string[] = Array.isArray(orchRes?.diagnostics) ? orchRes.diagnostics : [];
        if (isBuildRequest) {
          setBuildFailureInfo({
            error: orchRes?.error || `ANNY pipeline failed with HTTP ${res.status}`,
            diagnostics: diagList,
          });
          if (Array.isArray(orchRes?.stages) && orchRes.stages.length > 0) {
            setBuildStages(orchRes.stages);
          }
        }
        throw new Error(orchRes?.error || `ANNY pipeline failed with HTTP ${res.status}`);
      }

      const responseFileCount =
        orchRes.files && typeof orchRes.files === 'object' ? Object.keys(orchRes.files).length : 0;

      let messageProjectBuild: ProjectBuildMetadata | undefined = undefined;

      if (isBuildRequest || responseFileCount > 0) {
        const isSuccess = orchRes.success !== false && responseFileCount > 0 && orchRes.verificationStatus !== 'FAILED';
        if (orchRes.verification) {
          setBuildVerification(orchRes.verification);
        }

        if (isSuccess) {
          executionStreamManager.setStage('editing', 'Writing synthesized codebase files to workspace...');
          const resolvedProjectId =
            (typeof orchRes.project?.projectId === 'string' && orchRes.project.projectId) || projectId;
          const resolvedProjectName =
            (typeof orchRes.project?.name === 'string' && orchRes.project.name) ||
            generateRealProjectTitle(query);
          const resolvedVersion =
            Number(orchRes.project?.version) || (isExplicitUpdate ? projectMetaState.version + 1 : 1);
          const resolvedProjectType =
            (typeof orchRes.project?.projectType === 'string' && orchRes.project.projectType) || 'website';
          const resolvedPreviewUrl =
            typeof orchRes.preview?.previewUrl === 'string' ? orchRes.preview.previewUrl : undefined;
          const resolvedPreviewId =
            typeof orchRes.preview?.previewId === 'string' ? orchRes.preview.previewId : undefined;

          projectPreviewController.activateProject({
            projectId: resolvedProjectId,
            name: resolvedProjectName,
            version: resolvedVersion,
            projectType: resolvedProjectType,
            files: orchRes.files,
            previewUrl: resolvedPreviewUrl,
            previewId: resolvedPreviewId,
            sessionId: currentChatId,
            ownerUserId: user?.uid,
            verificationScore: orchRes.verification?.score,
            buildStatus: 'READY',
          });

          const mgr = WorkspaceManager.getInstance();
          if (resolvedProjectId && mgr.getActiveProjectId() !== resolvedProjectId) {
            mgr.switchWorkspace(resolvedProjectId, resolvedProjectName, user?.uid || 'global', 'fullstack');
          }
          const vfs = mgr.getVFS();
          for (const [rawPath, content] of Object.entries(orchRes.files)) {
            const normPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
            vfs._unsafe_writeFile(normPath, content as string);
          }
          vfs.saveToStorage();
          safeStorage.setItem('anny_current_project_id', resolvedProjectId);
          if (currentChatId) {
            sessionProjectMapRef.current.set(currentChatId, resolvedProjectId);
          }

          const updatedMap = getVfsMap();
          setVfsFiles(updatedMap);
          const preferredCodeFile =
            updatedMap['/src/App.tsx'] !== undefined
              ? '/src/App.tsx'
              : Object.keys(updatedMap)[0] || activeCodeFile;
          if (preferredCodeFile) {
            setActiveCodeFile(preferredCodeFile);
            setOpenTabs((prev) => Array.from(new Set([preferredCodeFile, ...prev.filter((p) => updatedMap[p] !== undefined)])));
          }

          setProjectMetaState({
            projectId: resolvedProjectId,
            name: resolvedProjectName,
            version: resolvedVersion,
            previewUrl: resolvedPreviewUrl || null,
            lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSaving: false,
          });

          messageProjectBuild = {
            projectId: resolvedProjectId,
            name: resolvedProjectName,
            version: resolvedVersion,
            projectType: resolvedProjectType,
            fileCount: Object.keys(updatedMap).length,
            status: 'ready',
            previewUrl: resolvedPreviewUrl,
            previewId: resolvedPreviewId,
            verificationScore: orchRes.verification?.score,
            isIncrementalEdit: isExplicitUpdate,
            updatedAt: new Date().toISOString(),
          };

          setIsSplitScreen(true);
          setPreviewTab('preview');
          setMobileSplitView('preview');

          // Ensure preview re-renders
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('anny_project_generated', {
                detail: { projectId: resolvedProjectId },
              })
            );
            window.dispatchEvent(
              new CustomEvent('anny_vfs_changed', {
                detail: { projectId: resolvedProjectId },
              })
            );
          }

          setBuildFailureInfo(null);
          setBuildStages([
            { stage: 'understanding', label: '1. Understanding request', status: 'completed' },
            { stage: 'planning', label: '2. Planning', status: 'completed' },
            { stage: 'generating', label: '3. Generating files', status: 'completed' },
            { stage: 'validating', label: '4. Validating', status: 'completed' },
            { stage: 'installing', label: '5. Installing dependencies', status: 'completed' },
            { stage: 'starting_preview', label: '6. Starting preview', status: 'completed' },
            { stage: 'testing', label: '7. Testing', status: 'completed' },
            { stage: 'completed', label: '8. Completed', status: 'completed' },
          ]);
          setReloadKey((k) => k + 1);
          executionStreamManager.setStage('runtime', 'Opening verified application in preview...');
          executionStreamManager.completeExecution('Application generation completed successfully. Application is ready and running in preview.');
        } else if (isBuildRequest) {
          const failureDetail = orchRes.error || orchRes.summary || 'Build failed: Pipeline returned no valid files.';
          setBuildFailureInfo({
            error: failureDetail,
            diagnostics: Array.isArray(orchRes.diagnostics) ? orchRes.diagnostics : [],
          });
          messageProjectBuild = {
            projectId: projectId || 'failed_build',
            name: generateRealProjectTitle(query),
            version: projectMetaState.version || 1,
            projectType: 'website',
            fileCount: 0,
            status: 'failed',
            error: failureDetail,
            updatedAt: new Date().toISOString(),
          };
          executionStreamManager.failExecution(`BUILD_FAILED: ${failureDetail}`);
        }
      }

      let fullText = formatNaturalConversation(orchRes.response || orchRes.summary || 'Request completed.');
      const finalBotMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: fullText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...(Array.isArray(orchRes.sources) && orchRes.sources.length > 0 ? { sources: orchRes.sources } : {}),
        ...(messageProjectBuild ? { projectBuild: messageProjectBuild } : {}),
      };

      setChatHistory((prev) => {
        const cleanPrev = prev.filter((m: any) => !isSynthesisOrPlaceholderContent(m.content));
        return [...cleanPrev, finalBotMsg];
      });
      if (onUpdateMessages) {
        onUpdateMessages((prevMsgs: any[]) => {
          const cleanPrev = prevMsgs.filter((m: any) => !isSynthesisOrPlaceholderContent(m.content));
          return [...cleanPrev, finalBotMsg];
        });
      }

      const autoSpeak = safeStorage.getItem('anny_auto_speak') !== 'false';
      if (autoSpeak && fullText) {
        annyVoiceService.speakConversation(fullText);
      }
      setIsGenerating(false);
    } catch (err: any) {
      const wasAborted = err?.name === 'AbortError';
      if (submittedDraft) {
        setPrompt((curr) => resolveDraftAfterFailedSend(curr, submittedDraft));
      }
      if (!wasAborted) {
        console.error('ANNY Stream Error:', err);
        if (isBuildRequest) {
          setBuildFailureInfo((prev) =>
            prev || { error: err?.message || 'Project generation failed.', diagnostics: [] }
          );
        }
        executionStreamManager.failExecution(err.message || 'Pipeline failed');
        showNotice('Message could not be sent — your prompt draft was preserved.', 'error');
        const failedProjectBuild: ProjectBuildMetadata | undefined = isBuildRequest
          ? {
              projectId: projectMetaState.projectId || 'failed_build',
              name: projectMetaState.name || generateRealProjectTitle(query),
              version: projectMetaState.version || 1,
              projectType: 'website',
              fileCount: 0,
              status: 'failed',
              error: err?.message || 'Project generation failed before completion.',
              updatedAt: new Date().toISOString(),
            }
          : undefined;
        const errBotMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: formatNaturalConversation(`I could not complete that request. ${err?.message || 'The requested operation failed before completion.'}`),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...(failedProjectBuild ? { projectBuild: failedProjectBuild } : {}),
        };
        setChatHistory((prev) => {
          const cleanPrev = prev.filter((m: any) => !isSynthesisOrPlaceholderContent(m.content));
          return [...cleanPrev, errBotMsg];
        });
        if (onUpdateMessages) {
          onUpdateMessages((prevMsgs: any[]) => {
            const cleanPrev = prevMsgs.filter((m: any) => !isSynthesisOrPlaceholderContent(m.content));
            return [...cleanPrev, errBotMsg];
          });
        }
      }
    } finally {
      activeAbortRef.current = null;
      setIsGenerating(false);
      isSubmittingRef.current = false;
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categories for the live preview
  const categoriesList = [
    {
      id: 'electronics',
      name: 'Electronics',
      count: '120+ Products',
      img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
    },
    {
      id: 'fashion',
      name: 'Fashion',
      count: '80+ Products',
      img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
    },
    {
      id: 'home',
      name: 'Home & Living',
      count: '65+ Products',
      img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    },
    {
      id: 'beauty',
      name: 'Beauty',
      count: '45+ Products',
      img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
    },
    {
      id: 'sports',
      name: 'Sports',
      count: '60+ Products',
      img: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=400&q=80',
    },
  ];

  const activateBuildFromCard = async (build: ProjectBuildMetadata) => {
    if (!build?.projectId || build.status === 'failed') return;
    const mgr = WorkspaceManager.getInstance();
    projectPreviewController.ensureProjectOwnershipRegistered(build.projectId, user?.uid);
    if (mgr.getActiveProjectId() !== build.projectId) {
      mgr.switchWorkspace(build.projectId, build.name || build.projectId, user?.uid || 'global', 'fullstack');
    }
    let currentMap = getVfsMap();
    if (Object.keys(currentMap).length === 0 && build.projectId.startsWith('proj_')) {
      const restored = await projectPreviewController.restoreProjectForSession(currentChatId, messages);
      if (restored) {
        currentMap = getVfsMap();
      }
    }
    setVfsFiles(currentMap);
    const preferredFile =
      currentMap['/src/App.tsx'] !== undefined
        ? '/src/App.tsx'
        : Object.keys(currentMap)[0] || activeCodeFile;
    if (preferredFile) {
      setActiveCodeFile(preferredFile);
      setOpenTabs((prev) => Array.from(new Set([preferredFile, ...prev.filter((p) => currentMap[p] !== undefined)])));
    }
    setProjectMetaState((prev) => ({
      ...prev,
      projectId: build.projectId,
      name: build.name || prev.name,
      version: build.version || prev.version || 1,
      previewUrl: build.previewUrl || prev.previewUrl,
    }));
  };

  const handleShareBuildCard = async (build: ProjectBuildMetadata): Promise<string | undefined> => {
    await activateBuildFromCard(build);
    const cleanFiles: Record<string, string> = {};
    const allFiles = getVfsMap();
    for (const [k, v] of Object.entries(allFiles)) {
      if (!k.startsWith('/__anny_')) {
        cleanFiles[k] = v;
      }
    }
    try {
      const res = await fetchWithAuth('/api/preview/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: build.projectId,
          name: build.name,
          files: cleanFiles,
        }),
      });
      const data = await res.json().catch(() => null);
      const urlCandidate =
        data?.session?.previewUrl ||
        data?.preview?.previewUrl ||
        build.previewUrl ||
        projectMetaState.previewUrl;
      if (typeof urlCandidate === 'string' && urlCandidate.startsWith('/api/preview/sessions/')) {
        const fullUrl =
          typeof window !== 'undefined' ? `${window.location.origin}${urlCandidate}` : urlCandidate;
        try {
          await navigator.clipboard?.writeText(fullUrl);
        } catch {
          // ignore clipboard restriction
        }
        const link = document.createElement('a');
        link.href = urlCandidate;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotice(`Opened standalone Share preview for ${build.name} (v${build.version}).`, 'success');
        return fullUrl;
      }
      throw new Error(data?.error || 'Could not start standalone preview session.');
    } catch (err: any) {
      showNotice(err?.message || 'Unable to share project preview.', 'error');
      return undefined;
    }
  };

  const resolveMessageProjectBuild = (msg: any, isLatestAssistantMsg: boolean): ProjectBuildMetadata | null => {
    if (msg?.projectBuild?.projectId) {
      // Keep the card's version and file count synced if it refers to the currently active project
      if (
        msg.projectBuild.projectId === projectMetaState.projectId &&
        msg.projectBuild.status !== 'failed'
      ) {
        return {
          ...msg.projectBuild,
          name: projectMetaState.name || msg.projectBuild.name,
          version: Math.max(Number(msg.projectBuild.version) || 1, Number(projectMetaState.version) || 1),
          fileCount: Object.keys(vfsFiles).filter((k) => !k.startsWith('/__anny_')).length || msg.projectBuild.fileCount,
          previewUrl: projectMetaState.previewUrl || msg.projectBuild.previewUrl,
        };
      }
      return msg.projectBuild as ProjectBuildMetadata;
    }
    // Fallback for legacy/restored sessions that have an active built app on the latest assistant message
    if (isLatestAssistantMsg && hasBuiltApp && projectMetaState.projectId) {
      return {
        projectId: projectMetaState.projectId,
        name: projectMetaState.name || 'Generated Website',
        version: projectMetaState.version || 1,
        projectType: 'website',
        fileCount: Object.keys(vfsFiles).filter((k) => !k.startsWith('/__anny_')).length,
        status: 'ready',
        previewUrl: projectMetaState.previewUrl || undefined,
        verificationScore: buildVerification?.score,
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  };

  if (isVisualEditor) {
    const activeEditorSessionId =
      projectMetaState.projectId && projectMetaState.projectId.startsWith('proj_')
        ? projectMetaState.projectId
        : WorkspaceManager.getInstance().getActiveProjectId() || currentChatId || undefined;
    return (
      <AnnyProfessionalEditor
        userEmail={userEmail}
        userName={userName}
        sessionId={activeEditorSessionId}
        onBackToWorkspace={() => {
          setIsVisualEditor(false);
          setIsSplitScreen(false);
        }}
        onBackToSplitView={() => {
          setIsVisualEditor(false);
          setIsSplitScreen(true);
          setPreviewTab('preview');
        }}
      />
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 h-full w-full relative overflow-hidden ${
        themeMode === 'light'
          ? 'bg-slate-50 text-slate-900'
          : 'bg-[#040614] text-slate-100'
      }`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. SPLIT SCREEN BUILD VIEW (Matches User Reference Image) */}
      {/* ========================================================= */}
      {isSplitScreen ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#040614]">
          {/* Top Header Bar for Split View */}
          <header className="px-3 sm:px-4 py-2 bg-[#060818] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 sm:gap-4 z-20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />

              <button
                type="button"
                onClick={() => setIsSplitScreen(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Back to Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>

              <div className="h-4 w-px bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white tracking-wide truncate max-w-[160px] sm:max-w-[260px]">
                  {projectMetaState.name || 'ANNY Website Builder'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                  v{projectMetaState.version}
                </span>
              </div>
            </div>

            {/* Mobile View Toggle Switcher (Chat vs Preview vs Code) */}
            <div className="flex lg:hidden items-center p-0.5 rounded-xl bg-slate-900/90 border border-white/10">
              <button
                type="button"
                onClick={() => setMobileSplitView('chat')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  mobileSplitView === 'chat'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AI Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileSplitView('preview');
                  setPreviewTab('preview');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  mobileSplitView === 'preview' && previewTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileSplitView('preview');
                  setPreviewTab('code');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  mobileSplitView === 'preview' && previewTab === 'code'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Code
              </button>
            </div>

            {/* Right Project Time & Actions */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              {startNewChat && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitScreen(false);
                    startNewChat();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Start New Conversation"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              )}
              <span className="hidden md:inline font-mono text-[11px] text-slate-400 tabular-nums">
                {currentTime}
              </span>
            </div>
          </header>

          {/* Main 2-Column Split Workspace */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* ---------------------------------------------------- */}
            {/* MIDDLE COLUMN: Chat Assistant & Build Telemetry (Left) */}
            {/* ---------------------------------------------------- */}
            <div className={`w-full lg:w-[420px] xl:w-[460px] bg-[#06081a] border-r border-white/10 flex flex-col h-full overflow-hidden shrink-0 ${
              mobileSplitView === 'chat' ? 'flex' : 'hidden lg:flex'
            }`}>
              {/* Chat Sub-Header */}
              <div className="px-4 py-2.5 bg-[#080b22] border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>AI Assistant</span>
                  <span className="text-[10px] text-emerald-400 font-normal">• Online</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={isVoiceActive ? 'Mute voice output' : 'Enable voice output'}
                    className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${isVoiceActive ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    {isVoiceActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const list = messages.length > 0 ? messages : chatHistory;
                      const latestBot = [...list].reverse().find((m: any) => m.role === 'assistant' && m.content);
                      if (latestBot?.content) {
                        void navigator.clipboard.writeText(latestBot.content);
                        showNotice('Latest assistant response copied to clipboard.', 'success');
                      } else {
                        showNotice('No assistant response to copy yet.', 'info');
                      }
                    }}
                    title="Copy latest assistant response"
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
                {/* Real Conversation Messages */}
                {(() => {
                  const splitMessages = (
                    (messages.length > 0 ? messages : chatHistory).length > 0
                      ? messages.length > 0
                        ? messages
                        : chatHistory
                      : [
                          {
                            id: 'init-user',
                            role: 'user',
                            content: 'Generate a modern e-commerce platform with product listing, cart, checkout and user dashboard.',
                            timestamp: '10:42 AM',
                          },
                          {
                            id: 'init-bot',
                            role: 'assistant',
                            content: "I'll create a modern e-commerce platform with all the essential features you requested.",
                            timestamp: '10:42 AM',
                          },
                        ]
                  ).filter((msg: any) => !isSynthesisOrPlaceholderContent(msg.content));
                  const lastAssistantId = [...splitMessages].reverse().find((m: any) => m.role === 'assistant')?.id;

                  return splitMessages.map((msg: any) => {
                    const resolvedBuild =
                      msg.role === 'assistant'
                        ? resolveMessageProjectBuild(msg, msg.id === lastAssistantId)
                        : null;
                    return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      {msg.role === 'user' ? (
                        <>
                          <span>You</span>
                          <span className="text-slate-500">{msg.timestamp || 'Just now'}</span>
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full ml-1" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center ml-1">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <img src="/logo.png" className="w-5 h-5 object-contain mr-1" alt="Anny" />
                          <span className="font-semibold animate-aios-shift text-white">Anny</span>
                          <span className="text-slate-500">{msg.timestamp || 'Just now'}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed text-xs font-sans ${
                        msg.role === 'user'
                          ? 'bg-indigo-950/80 border border-indigo-500/30 text-indigo-100 rounded-tr-sm shadow-md'
                          : 'bg-[#0b0e29] border border-white/10 text-slate-200 rounded-tl-sm w-full'
                      }`}
                    >
                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/10">
                          {msg.attachedFiles.map((f: any, idx: number) =>
                            f.isVoiceNote ? (
                              <VoiceNoteAttachmentCard
                                key={f.id || idx}
                                name={f.name}
                                audioUrl={f.audioUrl}
                                durationSec={f.durationSec}
                                transcript={f.transcript}
                                transcriptionEngine={f.transcriptionEngine}
                                transcribed={f.transcribed}
                                theme={themeMode}
                              />
                            ) : (
                              <div
                                key={idx}
                                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono"
                              >
                                {f.previewUrl ? (
                                  <img src={f.previewUrl} alt={f.name} className="w-5 h-5 object-cover rounded shrink-0" />
                                ) : (
                                  <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[120px]">{f.name}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content || ''}</p>
                      {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                          {msg.sources.map((src: any, sIdx: number) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 text-[10px] text-blue-300 transition-colors max-w-[200px]"
                              title={src.url}
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{src.title || src.url}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {msg.generatedImages && msg.generatedImages.length > 0 && (
                        <div className="w-full mt-2.5">
                          <GeneratedImageGallery
                            images={msg.generatedImages.map((img: any, idx: number) => ({
                              id: img.id || `${msg.id}_split_img_${idx}`,
                              label: img.label || (msg.generatedImages!.length > 1 ? `Option ${idx + 1}` : undefined),
                              url: img.url,
                              downloadUrl: img.downloadUrl,
                              mimeType: img.mimeType,
                              format: img.format,
                              width: img.width,
                              height: img.height,
                              provider: img.provider,
                              model: img.model,
                              prompt: img.prompt || msg.content,
                              category: img.category,
                              createdAt: img.createdAt,
                              revisionNumber: img.revisionNumber,
                              originalImageUrl: img.originalImageUrl,
                            }))}
                            selectedImageId={selectedImageForEdit?.id}
                            onSelectForEdit={(img) => setSelectedImageForEdit(img)}
                            onRegenerate={(p) => handleSend(p)}
                            compact
                          />
                        </div>
                      )}

                      {msg.generatedVideo && <VerifiedVideoCard job={msg.generatedVideo} />}
                      {msg.generatedAudio && <VerifiedAudioCard audio={msg.generatedAudio} />}

                      {resolvedBuild && (
                        <ChatProjectBuildCard
                          build={resolvedBuild}
                          isActiveProject={projectMetaState.projectId === resolvedBuild.projectId}
                          onOpenPreview={(b) => {
                            void activateBuildFromCard(b).then(() => {
                              setIsSplitScreen(true);
                              setPreviewTab('preview');
                              setMobileSplitView('preview');
                              setIsFullscreenPreview(false);
                              setReloadKey((k) => k + 1);
                            });
                          }}
                          onOpenEditor={(b) => {
                            void activateBuildFromCard(b).then(() => {
                              setIsVisualEditor(true);
                            });
                          }}
                          onViewCode={(b) => {
                            void activateBuildFromCard(b).then(() => {
                              setIsSplitScreen(true);
                              setPreviewTab('code');
                              setMobileSplitView('preview');
                              setIsFullscreenPreview(false);
                            });
                          }}
                          onOpenFullscreen={(b) => {
                            void activateBuildFromCard(b).then(() => {
                              setIsSplitScreen(true);
                              setPreviewTab('preview');
                              setMobileSplitView('preview');
                              setIsFullscreenPreview(true);
                            });
                          }}
                          onShareProject={(b) => handleShareBuildCard(b)}
                          onRetryBuild={lastBuildPrompt ? () => handleSend(lastBuildPrompt) : undefined}
                        />
                      )}

                      {/* Action Icons for Split View */}
                      <div className={`flex items-center gap-3 mt-3 pt-2 border-t border-white/5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                          <button className="text-slate-500 hover:text-white transition-colors cursor-pointer" title="Copy Message" onClick={() => navigator.clipboard.writeText(msg.content)}>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" title="Good response" onClick={(e) => e.currentTarget?.classList.add('text-emerald-400')}>
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" title="Bad response" onClick={(e) => e.currentTarget?.classList.add('text-rose-400')}>
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                            <button className="text-slate-500 hover:text-white transition-colors cursor-pointer" title="Copy Message" onClick={(e) => { 
                              navigator.clipboard.writeText(msg.content); 
                              const btn = e.currentTarget;
                              btn?.classList.add('text-cyan-400'); 
                              setTimeout(() => { if (btn) btn.classList.remove('text-cyan-400'); }, 2000); 
                            }}>
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              className={`transition-colors cursor-pointer ${window.speechSynthesis?.speaking ? 'text-cyan-400 drop-shadow-[0_0_5px_#22d3ee]' : 'text-slate-500 hover:text-white'}`} 
                              title="Read Aloud"
                              onClick={() => {
                                if (annyVoiceService.isSpeaking()) {
                                  annyVoiceService.stop();
                                  setCurrentlySpeakingId(null);
                                } else {
                                  setCurrentlySpeakingId(msg.id);
                                  annyVoiceService.speakSpeakerButton(msg.content, () => setCurrentlySpeakingId(null));
                                }
                              }}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                  });
                })()}

                {/* Real-time Execution Stream View directly above Chat Input */}
                <ExecutionStreamView className="my-2" />
                <div ref={chatEndRef} />
              </div>

              {/* Chat Bottom Input Section */}
              <div className="p-3 bg-[#080b22] border-t border-white/10 space-y-2 shrink-0 relative">
                {/* Inline Notice Banner */}
                {workspaceNotice && (
                  <div
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-[11px] border ${
                      workspaceNotice.type === 'error'
                        ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                        : workspaceNotice.type === 'warning'
                        ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                        : workspaceNotice.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                        : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{workspaceNotice.message}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setWorkspaceNotice(null)}
                      className="p-0.5 hover:bg-white/10 rounded cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Pro Tools & Model Popovers (Split View) */}
                {activePopover === 'protools' && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#0b102d]/98 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl z-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>ANNY Pro Tools</span>
                      </span>
                      <button type="button" onClick={() => setActivePopover('none')} className="text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsDeepThinkingEnabled(!isDeepThinkingEnabled)}
                        className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isDeepThinkingEnabled ? 'bg-purple-500/20 border-purple-400/60 text-purple-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-400" /> Deep Think</span>
                        <span className="text-[10px] font-mono">{isDeepThinkingEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludeCodeContext(!includeCodeContext)}
                        className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          includeCodeContext ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-emerald-400" /> Code Ctx</span>
                        <span className="text-[10px] font-mono">{includeCodeContext ? 'ON' : 'OFF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                        className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isWebSearchEnabled ? 'bg-blue-500/20 border-blue-400/60 text-blue-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-400" /> Web Live</span>
                        <span className="text-[10px] font-mono">{isWebSearchEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSaharaEnabled(!isSaharaEnabled)}
                        className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSaharaEnabled ? 'bg-amber-500/20 border-amber-400/60 text-amber-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 text-amber-400" /> Sahara STT</span>
                        <span className="text-[10px] font-mono">{isSaharaEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="url"
                        value={inspectUrlInput}
                        onChange={(e) => setInspectUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleInspectPublicUrl();
                          }
                        }}
                        placeholder="https://example.com — Inspect URL"
                        className="flex-1 bg-[#050817] border border-white/15 rounded-xl px-2.5 py-1.5 text-[16px] sm:text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => void handleInspectPublicUrl()}
                        disabled={isInspectingUrl || !inspectUrlInput.trim()}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                      >
                        {isInspectingUrl ? '...' : 'Inspect'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          toggleVisionMonitor(true);
                          setActivePopover('none');
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ScanEye className="w-3.5 h-3.5 text-cyan-400" /> Open Vision Monitor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt((p) => p.trim() || 'Generate an image of ');
                          setActivePopover('none');
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Image Studio
                      </button>
                    </div>
                  </div>
                )}

                {activePopover === 'model' && (
                  <div className="absolute bottom-full left-3 w-64 mb-2 bg-[#0b102d]/98 backdrop-blur-xl border border-purple-500/40 rounded-2xl p-2 shadow-2xl z-50 space-y-1 text-xs">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-purple-400" /> Select Neural Route
                      </span>
                      <button type="button" onClick={() => setActivePopover('none')} className="text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {[
                      { id: 'auto', label: 'Auto (Best Route)', desc: 'Smart local & cloud routing' },
                      { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen', desc: 'Deep architecture & vision' },
                      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', desc: 'Low-latency coding & chat' },
                      { id: 'ollama-local', label: 'Local Sovereign (Ollama)', desc: 'Offline-capable local model' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModelId(m.id);
                          setActiveModel(m.label);
                          setSelectedNeuralEngine?.(m.id);
                          try {
                            const raw = safeStorage.getItem('anny_settings_v1');
                            const parsed = raw ? JSON.parse(raw) : {};
                            safeStorage.setItem('anny_settings_v1', JSON.stringify({ ...parsed, defaultModel: m.id }));
                          } catch {}
                          setActivePopover('none');
                          showNotice(`Active model switched to ${m.label}`, 'info');
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                          selectedModelId === m.id ? 'bg-purple-500/20 border border-purple-400/50 text-white' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[11px]">{m.label}</div>
                          <div className="text-[10px] text-slate-400">{m.desc}</div>
                        </div>
                        {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-purple-300" />}
                      </button>
                    ))}
                  </div>
                )}

                <AnnyPromptComposer
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onSend={handleSend}
                  onStop={handleStop}
                  isWorking={isWorking}
                  placeholder="Ask anything or describe what you want to build..."
                  variant="split"
                  theme={themeMode}
                  attachedFiles={attachedFiles}
                  onRemoveAttachedFile={removeAttachedFile}
                  visionSnapshot={visionSnapshot}
                  onClearVisionSnapshot={() => setVisionSnapshot(null)}
                  selectedImageForEdit={selectedImageForEdit}
                  onClearSelectedImageForEdit={() => setSelectedImageForEdit(null)}
                  isListening={isListening}
                  isRecordingAudio={isRecordingAudio}
                  isTranscribingAudio={isTranscribingAudio}
                  onToggleVoiceInput={startListening}
                  onStopSpeechRecognition={stopSpeechRecognition}
                  onStopMediaRecording={stopMediaRecording}
                  isRecordingVoiceNote={isRecordingVoiceNote}
                  isVoiceNotePaused={isVoiceNotePaused}
                  isProcessingVoiceNote={isProcessingVoiceNote}
                  voiceNoteElapsedSec={voiceNoteElapsedSec}
                  voiceNoteAnalyser={voiceNoteAnalyser}
                  voiceNoteError={voiceNoteError}
                  retryingVoiceNoteId={retryingVoiceNoteId}
                  onStartVoiceNote={startVoiceNoteRecording}
                  onPauseResumeVoiceNote={pauseResumeVoiceNoteRecording}
                  onStopVoiceNote={() => stopVoiceNoteRecording(false)}
                  onCancelVoiceNote={() => stopVoiceNoteRecording(true)}
                  onDismissVoiceNoteError={() => setVoiceNoteError(null)}
                  onRetryVoiceNoteStt={handleRetryVoiceNoteStt}
                  onInsertVoiceNoteTranscript={handleInsertVoiceNoteTranscript}
                  onAttachFilesClick={() => fileInputRef.current?.click()}
                  isWebSearchEnabled={isWebSearchEnabled}
                  onToggleWebSearch={() => {
                    const next = !isWebSearchEnabled;
                    setIsWebSearchEnabled(next);
                    showNotice(next ? 'Live Web Search grounding enabled.' : 'Live Web Search disabled.', 'info');
                  }}
                  isProToolsActive={activePopover === 'protools' || isDeepThinkingEnabled || isSaharaEnabled || includeCodeContext}
                  onToggleProTools={() => setActivePopover(activePopover === 'protools' ? 'none' : 'protools')}
                  activeModelLabel={activeModel}
                  isModelPopoverActive={activePopover === 'model'}
                  selectedModelId={selectedModelId}
                  onToggleModelPopover={() => setActivePopover(activePopover === 'model' ? 'none' : 'model')}
                  includeCodeContext={includeCodeContext}
                  onToggleCodeContext={() => {
                    const next = !includeCodeContext;
                    setIncludeCodeContext(next);
                    showNotice(
                      next
                        ? `Workspace Code Context attached (${Object.keys(vfsFiles).length} files).`
                        : 'Workspace Code Context detached.',
                      'info'
                    );
                  }}
                  vfsFileCount={Object.keys(vfsFiles).length}
                />

                {/* Model & Tokens Footer bar */}
                <div className={`flex items-center justify-between text-[10px] pt-1 border-t font-mono ${
                  themeMode === 'light'
                    ? 'text-slate-600 border-slate-200'
                    : 'text-slate-400 border-white/5'
                }`}>
                  <span>Model: <strong className={themeMode === 'light' ? 'text-slate-900' : 'text-slate-200'}>{activeModel}</strong></span>
                  <span>Web: <strong className={isWebSearchEnabled ? (themeMode === 'light' ? 'text-blue-700' : 'text-blue-400') : (themeMode === 'light' ? 'text-slate-500' : 'text-slate-400')}>{isWebSearchEnabled ? 'Live' : 'Standard'}</strong></span>
                  <span>Context: <strong className={includeCodeContext ? (themeMode === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (themeMode === 'light' ? 'text-slate-800' : 'text-slate-300')}>{Object.keys(vfsFiles).length} files</strong></span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT COLUMN: Live Interactive App Preview / IDE      */}
            {/* ---------------------------------------------------- */}
            <div className={`flex-1 bg-[#030511] flex-col h-full overflow-hidden min-w-0 ${
              mobileSplitView === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}>
              {/* Preview Controls Top Bar */}
              <div className="px-4 py-2 bg-[#060818] border-b border-white/10 flex items-center justify-between gap-4 z-10 shrink-0">
                {/* Left Tabs */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTab('preview')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'preview'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => setPreviewTab('code')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'code'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Code &amp; Files</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('logs')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'logs'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Logs &amp; Tests</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('intelligence')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'intelligence'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Intelligence</span>
                  </button>

                  <button
                    onClick={() => setIsVisualEditor(true)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:brightness-110"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Visual Edit</span>
                  </button>
                </div>

                {/* Center Device Responsive Toggles */}
                <div className="flex items-center gap-1 bg-[#0a0d28] p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setDeviceViewport('desktop')}
                    className={`p-1 rounded ${deviceViewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceViewport('tablet')}
                    className={`p-1 rounded ${deviceViewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceViewport('mobile')}
                    className={`p-1 rounded ${deviceViewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReloadKey((k) => k + 1);
                          showNotice('Live preview refreshed.', 'info');
                        }}
                        title="Refresh live preview"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const files = Object.entries(vfsFiles);
                          if (files.length === 0) {
                            showNotice('Generate a project first before downloading a ZIP bundle.', 'warning');
                            return;
                          }
                          try {
                            const zip = new JSZip();
                            for (const [filePath, fileContent] of files) {
                              if (filePath.startsWith('/__anny_')) continue;
                              const cleanPath = filePath.replace(/^\/+/, '');
                              if (cleanPath) zip.file(cleanPath, String(fileContent ?? ''));
                            }
                            const blob = await zip.generateAsync({ type: 'blob' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            const slug = (projectMetaState.name || projectMetaState.projectId || 'anny-project')
                              .toLowerCase()
                              .replace(/[^a-z0-9._-]+/g, '-')
                              .replace(/^-|-$/g, '');
                            a.href = url;
                            a.download = `${slug || 'anny-project'}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            showNotice(`Downloaded ${files.length} workspace files as ${slug || 'anny-project'}.zip`, 'success');
                          } catch (err: any) {
                            showNotice(err?.message || 'Unable to package workspace ZIP bundle.', 'error');
                          }
                        }}
                        title="Download generated project files (.zip)"
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-xs shadow-md hover:brightness-110 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ZIP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFullscreenPreview(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 border border-white/10 cursor-pointer hover:border-indigo-500/50 hover:text-white transition-all shadow-sm whitespace-nowrap"
                      >
                        <Maximize2 className="w-3 h-3 text-indigo-400" />
                        <span className="hidden sm:inline">Fullscreen</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Content Stage */}
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#02030d]">
                    {previewTab === 'preview' ? (
                      <WorkspacePreviewContainer
                        isPreviewFullScreen={isFullscreenPreview}
                        setIsPreviewFullScreen={setIsFullscreenPreview}
                        setReloadKey={setReloadKey}
                        buildState={
                          isGenerating
                            ? 'in_progress'
                            : buildFailureInfo || activeProj?.status === 'failed'
                              ? 'failed'
                              : 'completed'
                        }
                        hasExistingProject={hasBuiltApp}
                        deviceMode={deviceViewport}
                        setDeviceMode={setDeviceViewport}
                        currentBuildPrompt={lastBuildPrompt || prompt || 'Synthesizing application...'}
                        liveBuildAction={
                          activeProj?.currentStage ||
                          (isGenerating ? 'Generating project files...' : buildFailureInfo ? 'Build failed' : 'Build Ready')
                        }
                        buildProgressPct={
                          typeof activeProj?.progressPct === 'number'
                            ? activeProj.progressPct
                            : isGenerating
                              ? 45
                              : buildFailureInfo
                                ? 0
                                : 100
                        }
                        buildStages={buildStages}
                        buildError={buildFailureInfo?.error || activeProj?.errors?.[0]}
                        buildDiagnostics={buildFailureInfo?.diagnostics}
                        onRetryBuild={lastBuildPrompt ? () => handleSend(lastBuildPrompt) : undefined}
                        setRightTab={setPreviewTab}
                        activeProjectId={
                          projectMetaState.projectId && projectMetaState.projectId.startsWith('proj_')
                            ? projectMetaState.projectId
                            : WorkspaceManager.getInstance().getActiveProjectId() || activeProj?.id || 'anny-project'
                        }
                        reloadKey={reloadKey}
                        previewRuntimeReady={hasBuiltApp && !isGenerating && !buildFailureInfo}
                        onOpenVisualEdit={() => setIsVisualEditor(true)}
                        projectName={projectMetaState.name}
                        projectVersion={projectMetaState.version}
                        previewSessionUrl={projectMetaState.previewUrl}
                        onRebuild={() => setReloadKey((k) => k + 1)}
                        onOpenNewTabError={(msg) => showNotice(msg, 'error')}
                        onFixRuntimeError={(errorMsg) => {
                          void handleSend(
                            `Fix this runtime error in the generated application while preserving existing features: ${errorMsg}`
                          );
                        }}
                      />
                ) : previewTab === 'logs' ? (
                  <div className="p-4 flex-1 overflow-y-auto space-y-4 font-mono text-xs text-slate-200">
                    <div className="rounded-2xl border border-white/10 bg-[#080c20] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                          Build Verification &amp; Test Checks
                        </h3>
                        {buildVerification && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${buildVerification.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                            {buildVerification.passed ? `PASSED (${buildVerification.score}/100)` : 'FAILED'}
                          </span>
                        )}
                      </div>
                      {buildVerification?.checks && buildVerification.checks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {buildVerification.checks.map((chk: any, idx: number) => (
                            <div key={idx} className={`p-2.5 rounded-xl border ${chk.passed ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                              <div className="font-bold">{chk.passed ? '✓' : '✗'} {chk.name}</div>
                              <div className="text-[11px] opacity-80 mt-0.5">{chk.detail}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400">Run a website or application build to inspect validation checks and tests.</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#080c20] p-4 space-y-2">
                      <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                        Pipeline Execution Logs ({activeProj?.logs?.length || 0})
                      </h3>
                      {activeProj?.logs && activeProj.logs.length > 0 ? (
                        <div className="space-y-1 max-h-64 overflow-y-auto text-[11px] text-slate-300">
                          {activeProj.logs.map((line: string, i: number) => (
                            <div key={i} className="py-0.5 border-b border-white/5">{line}</div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500">No execution logs yet.</p>
                      )}
                    </div>
                  </div>
                ) : previewTab === 'intelligence' ? (
                  <div className="p-4 flex-1 overflow-y-auto">
                    <AnnyIntelligenceWorkspacePanel />
                  </div>
                ) : (
                  /* IDE Code Tab View with File & Folder Explorer */
                    <WorkspaceCodeEditor 
                      vfsFiles={vfsFiles}
                      fileListKeys={fileListKeys}
                      activeCodeFile={activeCodeFile}
                      setActiveCodeFile={setActiveCodeFile}
                      openTabs={openTabs}
                      setOpenTabs={setOpenTabs}
                      activeFileContent={activeFileContent}
                      handleCodeChange={handleCodeChange}
                      handleDeleteFile={handleDeleteFile}
                      isAddingFile={isAddingFile}
                      setIsAddingFile={setIsAddingFile}
                      newFileName={newFileName}
                      setNewFileName={setNewFileName}
                      handleCreateNewFile={handleCreateNewFile}
                      isAddingFolder={isAddingFolder}
                      setIsAddingFolder={setIsAddingFolder}
                      newFolderName={newFolderName}
                      setNewFolderName={setNewFolderName}
                      handleCreateNewFolder={handleCreateNewFolder}
                      handleRenameFile={handleRenameFile}
                      handleMoveFile={handleMoveFile}
                      fileSearch={fileSearch}
                      setFileSearch={setFileSearch}
                      setRightTab={(tab) => setPreviewTab(tab)}
                      setVfsFiles={setVfsFiles}
                      projectName={projectMetaState.name || activeProj?.id || WorkspaceManager.getInstance().getActiveProjectId() || 'anny-project'}
                      onSaveToProject={() => void persistVfsToServer()}
                      isSaving={projectMetaState.isSaving}
                    />
                  )}
              </div>

              {/* Bottom Preview Status Bar */}
              <div className="px-4 py-1.5 bg-[#060818] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 shrink-0 font-mono tabular-nums">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300">
                    {Object.keys(vfsFiles).length} files
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">
                    {isGenerating ? 'Building' : buildFailureInfo ? 'Build failed' : hasBuiltApp ? 'Workspace active' : 'No project loaded'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span>
                    {projectMetaState.isSaving
                      ? 'Saving changes...'
                      : projectMetaState.lastSavedAt
                        ? `Saved ${projectMetaState.lastSavedAt}`
                        : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. STANDARD FULL Anny WORKSPACE PAGE                    */
        /* ========================================================= */
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* TOP UNIFIED HEADER BAR (Clean Transparent Background) */}
          <header className="px-4 sm:px-6 py-3 bg-transparent flex items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
            {/* Left side: Mobile Animated Logo Menu */}
            <div className="flex items-center gap-3">
              <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            </div>

            {/* Right side: Vision Monitor, and User Icon */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {hasBuiltApp && (
                <button
                  onClick={() => {
                    setIsSplitScreen(true);
                    setPreviewTab('preview');
                    setMobileSplitView('preview');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-all cursor-pointer text-xs font-semibold shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:scale-105 active:scale-95 backdrop-blur-sm"
                  title="Open Live App Preview for this Session"
                >
                  <Globe className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                  <span>Launch Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleVisionMonitor()}
                className={`px-3 py-1.5 rounded-xl border text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer text-xs backdrop-blur-sm ${
                  isVisionOpen
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
                title="Toggle AI Camera & Vision Monitor"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vision Monitor</span>
              </button>

              {/* Theme Mode Toggle (Light / Dark) */}
              <button
                type="button"
                onClick={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}
                aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className={`p-2 rounded-xl transition-all cursor-pointer backdrop-blur-sm border ${
                  themeMode === 'light'
                    ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {themeMode === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-700" />}
              </button>

              {/* Speaker Voice Control (Icon only, color changes when ON, no text write up) */}
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={isVoiceActive ? 'Mute ANNY voice output' : 'Enable ANNY voice output'}
                className={`p-2 rounded-xl transition-all cursor-pointer backdrop-blur-sm border ${
                  isVoiceActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.4)] animate-pulse'
                    : themeMode === 'light'
                    ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                }`}
                title={isVoiceActive ? "ANNY Voice Synthesizer: ENABLED (Click to Mute)" : "ANNY Voice Synthesizer: DISABLED (Click to Enable)"}
              >
                {isVoiceActive ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {/* User Profile Avatar & Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 ml-1 hover:scale-105 hover:ring-2 hover:ring-cyan-400/50 transition-all cursor-pointer overflow-hidden bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600"
                  title="User Profile & Settings"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName ? userName.charAt(0).toUpperCase() : 'A'
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 w-64 bg-[#080d22]/98 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.85)] z-[100] text-xs">
                    {/* Header User Card */}
                    <div className="p-2 border-b border-white/10 mb-2 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shrink-0 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#030617] flex items-center justify-center text-cyan-300 font-black text-sm">
                          {userName ? userName.charAt(0).toUpperCase() : 'A'}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate">{userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate">{userEmail}</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-cyan-400 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          {user ? 'AUTHENTICATED OPERATOR' : 'GUEST OPERATOR'}
                        </span>
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="space-y-1 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onSelectSubTab) onSelectSubTab('settings');
                          else if (setView) setView('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-cyan-500/10 rounded-xl transition-all text-left font-medium cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Profile & Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onSelectSubTab) onSelectSubTab('session-history');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-cyan-500/10 rounded-xl transition-all text-left font-medium cursor-pointer"
                      >
                        <History className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Session History</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onSelectSubTab) onSelectSubTab('projects');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-cyan-500/10 rounded-xl transition-all text-left font-medium cursor-pointer"
                      >
                        <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>My Projects</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onSelectSubTab) onSelectSubTab('ai-agents');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-cyan-500/10 rounded-xl transition-all text-left font-medium cursor-pointer"
                      >
                        <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>AI Agents</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onSelectSubTab) onSelectSubTab('models');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-cyan-500/10 rounded-xl transition-all text-left font-medium cursor-pointer"
                      >
                        <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Neural Engine Models</span>
                      </button>
                    </div>

                    <div className="border-t border-white/10 pt-2">
                      {user || handleLogout ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (handleLogout) handleLogout();
                            else if (setView) setView('auth');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 font-bold rounded-xl transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out / Disconnect</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenAuth) onOpenAuth();
                            else if (setView) setView('auth');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Sign In / Create Account</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN SCROLLABLE WRAPPER (Scrollbar positioned at far right edge) */}
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col justify-between min-h-0">
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 flex flex-col z-10 min-h-0">
              {((messages.length > 0 ? messages : chatHistory).length === 0) ? (
                /* INITIAL HERO DISPLAY */
                <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-2 sm:py-4 space-y-3 sm:space-y-5">
                  {/* Hardware Logo Display */}
                  <div className="relative group cursor-pointer flex items-center justify-center" onClick={() => handleSend('Build E-commerce Website')}>
                    <img
                      src="/logo.png"
                      alt="Anny Logo"
                      loading="eager"
                      fetchPriority="high"
                      decoding="sync"
                      referrerPolicy="no-referrer"
                      className="h-16 sm:h-20 lg:h-24 w-auto object-contain filter drop-shadow-[0_0_20px_rgba(0,229,255,0.6)] group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== logoImg && logoImg) {
                          target.src = logoImg;
                        }
                      }}
                    />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-1.5 max-w-2xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-heading pb-2 leading-relaxed inline-block overflow-visible animate-aios-shift drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]">
                      Anny
                    </h1>
                    <p className={`text-xs sm:text-sm lg:text-base font-medium tracking-wide ${themeMode === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                      One AI. One Brain. Unlimited Applications.
                    </p>
                  </div>

                  {/* Quick Action Prompt Cards (Hidden on Mobile & Tablet Mode) */}
                  <div className="hidden lg:grid lg:grid-cols-4 gap-3 sm:gap-4 w-full pt-2 sm:pt-3 max-w-4xl">
                    {cardPrompts.map((card) => {
                      const IconComp = card.icon;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleSend(card.title)}
                          className="bg-[#0b0f2d]/90 hover:bg-[#121742] border border-white/10 hover:border-indigo-500/50 rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-3">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {card.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                              {card.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* CHAT CONVERSATION THREAD */
                <div className="flex-1 space-y-5 py-2 w-full">
                  {(() => {
                    const visibleStandardMessages = (messages.length > 0 ? messages : chatHistory).filter(
                      (msg: any) => !isSynthesisOrPlaceholderContent(msg.content)
                    );
                    const lastStandardAssistantMsg = [...visibleStandardMessages]
                      .reverse()
                      .find((m: any) => m.role === 'assistant');
                    const lastStandardAssistantId = lastStandardAssistantMsg?.id;

                    return visibleStandardMessages.map((msg: any) => {
                      const resolvedBuild =
                        msg.role === 'assistant'
                          ? resolveMessageProjectBuild(msg, msg.id === lastStandardAssistantId)
                          : null;
                      return (
                    <div
                      key={msg.id}
                      className={`flex flex-col space-y-1.5 w-full ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono px-1">
                        {msg.role === 'user' ? (
                          <>
                            <span>You • {msg.timestamp}</span>
                            {user?.photoURL ? (
                              <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full ml-1" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center ml-1">
                                <User className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <img src="/logo.png" className="w-5 h-5 object-contain mr-1" alt="Anny" />
                            <span className="text-white font-semibold animate-aios-shift">Anny</span>
                            <span>• {msg.timestamp}</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`relative rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-950/90 border border-indigo-500/50 text-indigo-100 rounded-tr-xs shadow-lg ml-auto max-w-[90%] sm:max-w-[80%]'
                            : 'bg-[#0b0e2b] border border-white/10 text-slate-200 rounded-tl-xs shadow-xl space-y-3 mr-auto max-w-[95%] sm:max-w-[88%]'
                        }`}
                      >
                        {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2.5 pb-2.5 border-b border-white/10">
                            {msg.attachedFiles.map((f: any, idx: number) =>
                              f.isVoiceNote ? (
                                <VoiceNoteAttachmentCard
                                  key={f.id || idx}
                                  name={f.name}
                                  audioUrl={f.audioUrl}
                                  durationSec={f.durationSec}
                                  transcript={f.transcript}
                                  transcriptionEngine={f.transcriptionEngine}
                                  transcribed={f.transcribed}
                                  theme={themeMode}
                                />
                              ) : (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[11px] text-cyan-200 font-mono"
                                >
                                  {f.previewUrl ? (
                                    <img
                                      src={f.previewUrl}
                                      alt={f.name}
                                      className="w-8 h-8 object-cover rounded-lg border border-white/15 shrink-0"
                                    />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  )}
                                  <span className="truncate max-w-[160px]">{f.name}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">
                          <p>{msg.content || ''}</p>
                        </div>
                        {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2">
                            {msg.sources.map((src: any, sIdx: number) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 text-[11px] text-blue-300 transition-colors max-w-[240px]"
                                title={src.url}
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{src.title || src.url}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Permanent Website / Application Build Action Panel */}
                        {resolvedBuild && (
                          <ChatProjectBuildCard
                            build={resolvedBuild}
                            isActiveProject={projectMetaState.projectId === resolvedBuild.projectId}
                            onOpenPreview={(b) => {
                              void activateBuildFromCard(b).then(() => {
                                setIsSplitScreen(true);
                                setPreviewTab('preview');
                                setMobileSplitView('preview');
                                setIsFullscreenPreview(false);
                                setReloadKey((k) => k + 1);
                              });
                            }}
                            onOpenEditor={(b) => {
                              void activateBuildFromCard(b).then(() => {
                                setIsVisualEditor(true);
                              });
                            }}
                            onViewCode={(b) => {
                              void activateBuildFromCard(b).then(() => {
                                setIsSplitScreen(true);
                                setPreviewTab('code');
                                setMobileSplitView('preview');
                                setIsFullscreenPreview(false);
                              });
                            }}
                            onOpenFullscreen={(b) => {
                              void activateBuildFromCard(b).then(() => {
                                setIsSplitScreen(true);
                                setPreviewTab('preview');
                                setMobileSplitView('preview');
                                setIsFullscreenPreview(true);
                              });
                            }}
                            onShareProject={(b) => handleShareBuildCard(b)}
                            onRetryBuild={
                              lastBuildPrompt
                                ? () => void handleSend(lastBuildPrompt)
                                : undefined
                            }
                          />
                        )}

                        {/* Image Generation Loading Animation */}
                        {msg.isGeneratingImage && (
                          <div className="w-full mt-3 p-4 sm:p-5 rounded-2xl bg-[#080d2d]/95 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,210,255,0.25)] relative overflow-hidden space-y-3.5">
                            <div className="flex items-center justify-between z-10 relative">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                                  <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white tracking-wide flex items-center gap-2">
                                    <span>Anny Diffusion Neural Engine</span>
                                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono border border-cyan-500/40 animate-pulse">
                                      1024x1024 4K
                                    </span>
                                  </h4>
                                  <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5 animate-pulse">
                                    {msg.imageStage || 'Synthesizing visual tensors...'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-mono font-bold text-cyan-400">{msg.imageProgress || 20}%</span>
                            </div>

                            {/* Neural Aperture Visualizer Frame */}
                            <div className="relative w-full h-44 sm:h-52 rounded-xl bg-[#030617] border border-white/10 flex items-center justify-center overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(#00d2ff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#080d2d] via-transparent to-transparent" />

                              <div className="flex flex-col items-center justify-center gap-2.5 z-10 text-center px-4">
                                <div className="relative w-14 h-14 rounded-full border-2 border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,210,255,0.5)]">
                                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500 animate-spin" style={{ animationDuration: '6s' }} />
                                  <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                                </div>
                                <span className="text-xs font-bold text-slate-200 tracking-wider">Generating High-Resolution AI Image</span>
                                <span className="text-[10px] font-mono text-slate-400 max-w-sm truncate italic">"{msg.imagePrompt}"</span>
                              </div>

                              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00d2ff] animate-bounce" style={{ animationDuration: '2s' }} />
                            </div>

                            <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-white/10">
                              <div
                                className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,210,255,0.8)]"
                                style={{ width: `${msg.imageProgress || 20}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Verified Generated Image Gallery & Logo Brand Kit Rendering */}
                        {msg.generatedImages && msg.generatedImages.length > 0 && (
                          <div className="w-full mt-3 space-y-3">
                            <GeneratedImageGallery
                              images={msg.generatedImages.map((img: any, idx: number) => ({
                                id: img.id || `${msg.id}_img_${idx}`,
                                label: img.label || (msg.generatedImages!.length > 1 ? `Option ${idx + 1}` : undefined),
                                url: img.url,
                                downloadUrl: img.downloadUrl,
                                mimeType: img.mimeType,
                                format: img.format,
                                width: img.width,
                                height: img.height,
                                provider: img.provider,
                                model: img.model,
                                prompt: img.prompt || msg.content,
                                category: img.category,
                                createdAt: img.createdAt,
                                revisionNumber: img.revisionNumber,
                                originalImageUrl: img.originalImageUrl,
                              }))}
                              selectedImageId={selectedImageForEdit?.id}
                              onSelectForEdit={(img) => {
                                setSelectedImageForEdit(img);
                              }}
                              onRegenerate={(p) => handleSend(p)}
                            />

                            {/* Brand Color Palette Strip when a Logo Kit was generated */}
                            {msg.generatedImages[0]?.logoBundle?.plan?.palette && (
                              <div className="rounded-2xl border border-amber-400/25 bg-[#06091b] p-3 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-amber-300 uppercase tracking-wider">
                                    {msg.generatedImages[0].logoBundle.plan.brandName} — Brand Palette ({msg.generatedImages[0].logoBundle.plan.monogram})
                                  </span>
                                  <span className="text-slate-400 font-mono">
                                    {msg.generatedImages[0].logoBundle.plan.logoType}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.generatedImages[0].logoBundle.plan.palette.slice(0, 5).map((sw: any) => (
                                    <span key={sw.name} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[10px] text-slate-300">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sw.hex }} />
                                      {sw.name} ({sw.hex})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Verified Video Player / Directorial Storyboard Rendering */}
                        {msg.generatedVideo && <VerifiedVideoCard job={msg.generatedVideo} />}

                        {/* Verified Music / Beat / SFX / Voice Audio Rendering */}
                        {msg.generatedAudio && <VerifiedAudioCard audio={msg.generatedAudio} />}

                        {/* Action Icons */}
                        <div className={`flex items-center gap-3 mt-3 pt-2 border-t border-white/5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'user' ? (
                            <button className="text-slate-500 hover:text-white transition-colors cursor-pointer" title="Copy Message" onClick={() => navigator.clipboard.writeText(msg.content)}>
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                            <button className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" title="Good response" onClick={(e) => e.currentTarget?.classList.add('text-emerald-400')}>
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" title="Bad response" onClick={(e) => e.currentTarget?.classList.add('text-rose-400')}>
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                              <button className="text-slate-500 hover:text-white transition-colors cursor-pointer" title="Copy Message" onClick={(e) => { 
                                navigator.clipboard.writeText(msg.content); 
                                const btn = e.currentTarget;
                                btn?.classList.add('text-cyan-400'); 
                                setTimeout(() => { if (btn) btn.classList.remove('text-cyan-400'); }, 2000); 
                              }}>
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                className={`transition-colors cursor-pointer ${window.speechSynthesis?.speaking ? 'text-cyan-400 drop-shadow-[0_0_5px_#22d3ee]' : 'text-slate-500 hover:text-white'}`} 
                                title="Read Aloud"
                                onClick={() => {
                                  if (annyVoiceService.isSpeaking()) {
                                    annyVoiceService.stop();
                                    setCurrentlySpeakingId(null);
                                  } else {
                                    setCurrentlySpeakingId(msg.id);
                                    annyVoiceService.speakSpeakerButton(msg.content, () => setCurrentlySpeakingId(null));
                                  }
                                }}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              {hasBuiltApp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSplitScreen(true);
                                    setPreviewTab('preview');
                                    setMobileSplitView('preview');
                                  }}
                                  className="ml-auto px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/35 hover:bg-cyan-500/25 text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:scale-105 active:scale-95"
                                  title="Launch Live Preview"
                                >
                                  <Globe className="w-3 h-3 text-cyan-400 animate-pulse" />
                                  <span>Launch Preview</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    });
                  })()}

                  {/* Google AI Studio Style Loading Details Indicator at BOTTOM of Chat Thread */}
                  <AnimatePresence>
                    {isWorking && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="self-start text-left font-sans select-none pt-2 pb-2 border-t border-white/5 w-full mt-2 mb-1"
                      >
                        {/* Line 1: Anny • Running for Xs */}
                        <div className="text-sm font-normal text-slate-300 flex items-center gap-1.5">
                          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold tracking-tight animate-pulse">
                            Anny
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">Running for {elapsedSec}s</span>
                        </div>

                        {/* Line 2: [logo.png] Launching */}
                        <div className="flex items-center gap-2 mt-1">
                          <img
                            src="/logo.png"
                            alt="Anny"
                            className="w-4 h-4 object-contain animate-spin-slow drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                          />
                          <span className="text-sm text-slate-400 font-sans tracking-wide">
                            {activeProj?.currentStage || (isGenerating ? 'Synthesizing response' : 'Launching')}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>
              )}
            </main>
          </div>

          {/* ANCHORED CHAT BOX (Stands completely still at bottom, mobile safe-area aware) */}
          <div className="shrink-0 w-full max-w-3xl mx-auto px-3 sm:px-4 pt-2 anny-safe-bottom z-20 relative">
            {/* Inline Notice Banner */}
            {workspaceNotice && (
              <div
                className={`mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border backdrop-blur-md ${
                  workspaceNotice.type === 'error'
                    ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                    : workspaceNotice.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                    : workspaceNotice.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                    : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{workspaceNotice.message}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setWorkspaceNotice(null)}
                  className="p-0.5 hover:bg-white/10 rounded cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Pro Tools & Model Popovers (Main View) */}
            {activePopover === 'protools' && (
              <div className="mb-2 bg-[#0b102d]/98 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl z-40 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>ANNY Pro Tools</span>
                  </span>
                  <button type="button" onClick={() => setActivePopover('none')} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeepThinkingEnabled(!isDeepThinkingEnabled)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isDeepThinkingEnabled ? 'bg-purple-500/20 border-purple-400/60 text-purple-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-400" /> Deep Think</span>
                    <span className="text-[10px] font-mono">{isDeepThinkingEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeCodeContext(!includeCodeContext)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      includeCodeContext ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-emerald-400" /> Code Ctx</span>
                    <span className="text-[10px] font-mono">{includeCodeContext ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isWebSearchEnabled ? 'bg-blue-500/20 border-blue-400/60 text-blue-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-400" /> Web Live</span>
                    <span className="text-[10px] font-mono">{isWebSearchEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSaharaEnabled(!isSaharaEnabled)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSaharaEnabled ? 'bg-amber-500/20 border-amber-400/60 text-amber-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 text-amber-400" /> Sahara STT</span>
                    <span className="text-[10px] font-mono">{isSaharaEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="flex-1 flex items-center gap-2 bg-[#050817] border border-white/15 rounded-xl px-2.5 py-1.5 focus-within:border-cyan-400">
                    <Link2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <input
                      type="url"
                      value={inspectUrlInput}
                      onChange={(e) => setInspectUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleInspectPublicUrl();
                        }
                      }}
                      placeholder="Paste public URL (https://...) to inspect or summarize"
                      className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleInspectPublicUrl()}
                    disabled={isInspectingUrl || !inspectUrlInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/40 text-cyan-300 font-semibold cursor-pointer"
                  >
                    {isInspectingUrl ? 'Inspecting...' : 'Inspect URL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleVisionMonitor(true);
                      setActivePopover('none');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ScanEye className="w-3.5 h-3.5 text-cyan-400" /> Vision
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((p) => p.trim() || 'Generate an image of ');
                      setActivePopover('none');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Image
                  </button>
                </div>
              </div>
            )}

            {activePopover === 'model' && (
              <div className="mb-2 bg-[#0b102d]/98 backdrop-blur-xl border border-purple-500/40 rounded-2xl p-2.5 shadow-2xl z-40 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'auto', label: 'Auto (Best Route)', desc: 'Smart local & cloud routing' },
                  { id: 'gemini-4-hydrogen', label: 'ANNY Core (Pro)', desc: 'Deep architecture & vision' },
                  { id: 'gemini-3.1-flash-lite', label: 'ANNY Fast (Lite)', desc: 'Low-latency coding & chat' },
                  { id: 'ollama', label: 'Local Sovereign (Ollama)', desc: 'Offline-capable local model' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedModelId(m.id);
                      setActiveModel(m.label);
                      setActivePopover('none');
                      showNotice(`Active model switched to ${m.label}`, 'info');
                    }}
                    className={`px-3 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedModelId === m.id ? 'bg-purple-500/20 border border-purple-400/50 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{m.label}</div>
                      <div className="text-[10px] text-slate-400">{m.desc}</div>
                    </div>
                    {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-purple-300" />}
                  </button>
                ))}
              </div>
            )}

            <AnnyPromptComposer
              prompt={prompt}
              setPrompt={setPrompt}
              onSend={handleSend}
              onStop={handleStop}
              isWorking={isWorking}
              placeholder="Ask Anny to build an app, architecture plan, broadcast workflow, or search..."
              variant="main"
              theme={themeMode}
              attachedFiles={attachedFiles}
              onRemoveAttachedFile={removeAttachedFile}
              visionSnapshot={visionSnapshot}
              onClearVisionSnapshot={() => setVisionSnapshot(null)}
              selectedImageForEdit={selectedImageForEdit}
              onClearSelectedImageForEdit={() => setSelectedImageForEdit(null)}
              isListening={isListening}
              isRecordingAudio={isRecordingAudio}
              isTranscribingAudio={isTranscribingAudio}
              onToggleVoiceInput={startListening}
              onStopSpeechRecognition={stopSpeechRecognition}
              onStopMediaRecording={stopMediaRecording}
              isRecordingVoiceNote={isRecordingVoiceNote}
              isVoiceNotePaused={isVoiceNotePaused}
              isProcessingVoiceNote={isProcessingVoiceNote}
              voiceNoteElapsedSec={voiceNoteElapsedSec}
              voiceNoteAnalyser={voiceNoteAnalyser}
              voiceNoteError={voiceNoteError}
              retryingVoiceNoteId={retryingVoiceNoteId}
              onStartVoiceNote={startVoiceNoteRecording}
              onPauseResumeVoiceNote={pauseResumeVoiceNoteRecording}
              onStopVoiceNote={() => stopVoiceNoteRecording(false)}
              onCancelVoiceNote={() => stopVoiceNoteRecording(true)}
              onDismissVoiceNoteError={() => setVoiceNoteError(null)}
              onRetryVoiceNoteStt={handleRetryVoiceNoteStt}
              onInsertVoiceNoteTranscript={handleInsertVoiceNoteTranscript}
              onAttachFilesClick={() => fileInputRef.current?.click()}
              isWebSearchEnabled={isWebSearchEnabled}
              onToggleWebSearch={() => {
                const next = !isWebSearchEnabled;
                setIsWebSearchEnabled(next);
                showNotice(next ? 'Live Web Search grounding enabled.' : 'Live Web Search disabled.', 'info');
              }}
              isProToolsActive={activePopover === 'protools' || isDeepThinkingEnabled || isSaharaEnabled || includeCodeContext}
              onToggleProTools={() => setActivePopover(activePopover === 'protools' ? 'none' : 'protools')}
              activeModelLabel={activeModel}
              isModelPopoverActive={activePopover === 'model'}
              selectedModelId={selectedModelId}
              onToggleModelPopover={() => setActivePopover(activePopover === 'model' ? 'none' : 'model')}
              includeCodeContext={includeCodeContext}
              onToggleCodeContext={() => {
                const next = !includeCodeContext;
                setIncludeCodeContext(next);
                showNotice(
                  next
                    ? `Workspace Code Context attached (${Object.keys(vfsFiles).length} files).`
                    : 'Workspace Code Context detached.',
                  'info'
                );
              }}
              vfsFileCount={Object.keys(vfsFiles).length}
            />
          </div>
        </div>
      )}

      {/* FULLSCREEN LIVE PREVIEW MODAL */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-[9999] bg-[#02030e] flex flex-col w-screen h-screen overflow-hidden">
          {/* Persistent Floating Backup Exit Button */}
          <button
            onClick={() => setIsFullscreenPreview(false)}
            className="fixed top-3 right-4 z-[999999] px-3.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold border border-red-400/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
            title="Exit Fullscreen Preview"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>

          {/* Top Header Bar */}
          <div className="px-4 sm:px-6 py-3 bg-[#060818] border-b border-white/10 flex items-center justify-between gap-4 shrink-0 z-[10000] relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-sm font-extrabold text-white tracking-wide truncate font-heading">
                  {activeProj?.id ? `Project: ${activeProj.id}` : 'ANNY Generated Application'} — Live Fullscreen
                </span>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                Fullscreen Mode
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0 pr-36">
              {/* Responsive Device Viewport Switcher */}
              <div className="flex items-center gap-1 bg-[#0a0d28] p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setDeviceViewport('desktop')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    deviceViewport === 'desktop' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Desktop</span>
                </button>
                <button
                  onClick={() => setDeviceViewport('tablet')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    deviceViewport === 'tablet' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Tablet</span>
                </button>
                <button
                  onClick={() => setDeviceViewport('mobile')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    deviceViewport === 'mobile' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Mobile</span>
                </button>
              </div>

              {/* View Tab Switcher */}
              <div className="flex items-center gap-1 bg-[#0a0d28] p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setPreviewTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    previewTab === 'preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setPreviewTab('code')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    previewTab === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setPreviewTab('intelligence')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    previewTab === 'intelligence' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Intelligence
                </button>
              </div>

              {/* Close Fullscreen Button */}
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-100 text-xs font-bold border border-red-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body Stage */}
          <div className="flex-1 p-2 sm:p-4 bg-[#01020a] flex items-start justify-center overflow-y-auto min-h-0 custom-scrollbar">
            <div
              className={`transition-all duration-300 min-h-full w-full bg-[#080b22] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-y-auto custom-scrollbar ${
                deviceViewport === 'mobile'
                  ? 'max-w-sm h-[88vh]'
                  : deviceViewport === 'tablet'
                  ? 'max-w-3xl h-[90vh]'
                  : 'w-full h-full max-w-7xl mx-auto'
              }`}
            >
              {previewTab === 'preview' ? (
                <div className="flex-1 flex flex-col h-full bg-white relative overflow-y-auto custom-scrollbar isolate [transform:translateZ(0)]">
                  <DynamicVFSAppRunner projectId={WorkspaceManager.getInstance().getActiveProjectId() || activeProj?.id} />
                </div>
              ) : previewTab === 'intelligence' ? (
                <AnnyIntelligenceWorkspacePanel />
              ) : (
                /* IDE Code View Fullscreen with File & Folder Explorer */
                <WorkspaceCodeEditor 
                  vfsFiles={vfsFiles}
                  fileListKeys={fileListKeys}
                  activeCodeFile={activeCodeFile}
                  setActiveCodeFile={setActiveCodeFile}
                  openTabs={openTabs}
                  setOpenTabs={setOpenTabs}
                  activeFileContent={activeFileContent}
                  handleCodeChange={handleCodeChange}
                  handleDeleteFile={handleDeleteFile}
                  isAddingFile={isAddingFile}
                  setIsAddingFile={setIsAddingFile}
                  newFileName={newFileName}
                  setNewFileName={setNewFileName}
                  handleCreateNewFile={handleCreateNewFile}
                  isAddingFolder={isAddingFolder}
                  setIsAddingFolder={setIsAddingFolder}
                  newFolderName={newFolderName}
                  setNewFolderName={setNewFolderName}
                  handleCreateNewFolder={handleCreateNewFolder}
                  handleRenameFile={handleRenameFile}
                  handleMoveFile={handleMoveFile}
                  fileSearch={fileSearch}
                  setFileSearch={setFileSearch}
                  setRightTab={(tab) => setPreviewTab(tab)}
                  setVfsFiles={setVfsFiles}
                  projectName={activeProj?.id || WorkspaceManager.getInstance().getActiveProjectId() || 'anny-project'}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image Lightbox is managed directly by GeneratedImageGallery with full zoom/nav/verified download */}

      {/* Shared Hidden File Input (Accessible in both Main & Split Views) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.txt,.md,.markdown,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.scss,.sql,.yaml,.yml,.xml,.zip,.tar,.tgz,.log"
        multiple
        className="hidden"
      />

      {/* Vision Monitor Camera / Screen Overlay */}
      {isVisionOpen && (
        <VisionSensor
          ref={visionRef}
          onCapture={handleVisionCapture}
          onAnalyze={handleAnalyzeVisionFrame}
          onLiveTranscript={(entry: VisionTranscriptEntry) => {
            if (entry.role === 'user' || entry.role === 'assistant') {
              const liveMsg = {
                id: `live-${entry.id}`,
                role: entry.role,
                content: formatNaturalConversation(entry.text),
                timestamp: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setChatHistory((prev) => [...prev, liveMsg]);
              if (onUpdateMessages) onUpdateMessages((prevMsgs: any[]) => [...prevMsgs, liveMsg]);
            }
          }}
          onClose={() => toggleVisionMonitor(false)}
          isGuidanceActive={true}
          isAnalyzing={isVisionAnalyzing}
        />
      )}
      {/* Intelligence Telemetry Debug Panel */}
      <AnnyDebugIntelligencePanel
        isOpen={isDebugPanelOpen}
        onClose={() => setIsDebugPanelOpen(false)}
      />
    </div>
  );
};
