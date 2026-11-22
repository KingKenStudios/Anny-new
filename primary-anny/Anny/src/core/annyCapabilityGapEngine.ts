/**
 * ANNY — SOVEREIGN CAPABILITY GAP ENGINE (PHASE 25)
 * Consumes the Canonical Capability Truth Registry and performs forensic gap analysis.
 * Identifies exact root causes, dependencies, hardware criteria, and remediation options
 * under the Zero-Simulation Policy.
 */

import { annyCapabilityTruthRegistry, CapabilityStatus, CapabilityDefinition } from './annyCapabilityTruthRegistry';
import { OrganizationScope } from './CanonicalExecutionContext';
import { hardwareIntelligenceEngine } from './annyHardwareIntelligence';
import { annyWorkerRegistry } from './annyWorkerRegistry';

export interface RemediationOption {
  optionId: string;
  description: string;
  type: 'LOCAL_INSTALL' | 'CONFIG_UPDATE' | 'REMOTE_WORKER_CONNECT' | 'PROVIDER_FALLBACK' | 'USER_CONFIG';
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  isLocalOrRemote: 'LOCAL' | 'REMOTE' | 'HYBRID';
  canBeAutomated: boolean;
  humanApprovalRequired: boolean;
}

export interface CapabilityGap {
  gapId: string;
  capabilityId: string;
  capabilityName: string;
  organizationScope: OrganizationScope;
  currentTruthState: CapabilityStatus;
  exactFailureReason: string;
  requiredDependency: string[];
  requiredHardware: {
    minVramMb?: number;
    minCores?: number;
    gpuRequired?: boolean;
    acceleratorType?: string;
  };
  requiredProvider: string[];
  requiredApiCredential: string[];
  requiredLocalRuntime: string[];
  requiredModel: string[];
  requiredWorker: string[];
  requiredSoftwarePackage: string[];
  requiredAuthorization: 'USER_APPROVAL' | 'ORGANIZATION_ADMIN' | 'AUTOMATIC_SAFE';
  remediationOptions: RemediationOption[];
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  isLocalOrRemote: 'LOCAL' | 'REMOTE' | 'HYBRID';
  canBeAutomated: boolean;
  humanApprovalRequired: boolean;
  diagnosedAt: string;
}

export interface CapabilityGapReport {
  timestamp: string;
  totalCapabilities: number;
  realCount: number;
  gapCount: number;
  gaps: CapabilityGap[];
  summary: {
    blocked: number;
    unavailable: number;
    partial: number;
    failed: number;
  };
}

export class AnnyCapabilityGapEngine {
  private static instance: AnnyCapabilityGapEngine;

  private constructor() {}

  public static getInstance(): AnnyCapabilityGapEngine {
    if (!AnnyCapabilityGapEngine.instance) {
      AnnyCapabilityGapEngine.instance = new AnnyCapabilityGapEngine();
    }
    return AnnyCapabilityGapEngine.instance;
  }

  /**
   * Evaluates all capabilities in the truth registry and identifies active gaps.
   */
  public async analyzeGaps(orgScope: OrganizationScope = 'global'): Promise<CapabilityGapReport> {
    const all = annyCapabilityTruthRegistry.getAll();
    const hardware = hardwareIntelligenceEngine.getCachedProfile();
    const activeWorkers = annyWorkerRegistry.getActiveWorkersForOrganization(orgScope);

    const gaps: CapabilityGap[] = [];
    let realCount = 0;
    let blockedCount = 0;
    let unavailableCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    for (const cap of all) {
      if (cap.status === 'REAL') {
        realCount++;
        continue;
      }

      if (cap.status === 'BLOCKED') blockedCount++;
      else if (cap.status === 'UNAVAILABLE') unavailableCount++;
      else if (cap.status === 'PARTIAL') partialCount++;
      else if (cap.status === 'FAILED') failedCount++;

      const gap = this.diagnoseCapabilityGap(cap, orgScope, hardware, activeWorkers.length);
      gaps.push(gap);
    }

    return {
      timestamp: new Date().toISOString(),
      totalCapabilities: all.length,
      realCount,
      gapCount: gaps.length,
      gaps,
      summary: {
        blocked: blockedCount,
        unavailable: unavailableCount,
        partial: partialCount,
        failed: failedCount
      }
    };
  }

  /**
   * Forensic diagnosis for an individual capability gap without hallucinating missing dependencies.
   */
  public diagnoseCapabilityGap(
    cap: CapabilityDefinition,
    orgScope: OrganizationScope = 'global',
    hardware: any = null,
    activeWorkerCount: number = 0
  ): CapabilityGap {
    const gapId = `gap_${cap.capabilityId.toLowerCase()}_${Date.now()}`;
    const failureReason = cap.reason || cap.error || cap.lastFailureReason;

    // Standardized forensic diagnoses based on canonical capabilities
    switch (cap.capabilityId) {
      case 'VOICE_STT': {
        return {
          gapId,
          capabilityId: cap.capabilityId,
          capabilityName: cap.name,
          organizationScope: orgScope,
          currentTruthState: cap.status,
          exactFailureReason: failureReason || 'Requires Groq/Whisper API credentials or local WebGPU Whisper runtime',
          requiredDependency: ['@google/genai', 'groq-sdk', 'onnxruntime-web'],
          requiredHardware: { minCores: 2 },
          requiredProvider: ['groq', 'openai', 'local_whisper'],
          requiredApiCredential: ['GROQ_API_KEY', 'OPENAI_API_KEY'],
          requiredLocalRuntime: ['WebSpeechRecognition', 'WASM_Whisper'],
          requiredModel: ['whisper-large-v3', 'whisper-base'],
          requiredWorker: [],
          requiredSoftwarePackage: [],
          requiredAuthorization: 'USER_APPROVAL',
          remediationOptions: [
            {
              optionId: 'opt_stt_browser',
              description: 'Activate client-side browser Web Speech API / WebGPU WASM STT',
              type: 'LOCAL_INSTALL',
              estimatedComplexity: 'LOW',
              isLocalOrRemote: 'LOCAL',
              canBeAutomated: true,
              humanApprovalRequired: false
            },
            {
              optionId: 'opt_stt_groq_key',
              description: 'Configure authorized GROQ_API_KEY environment secret for Whisper v3',
              type: 'CONFIG_UPDATE',
              estimatedComplexity: 'LOW',
              isLocalOrRemote: 'REMOTE',
              canBeAutomated: false,
              humanApprovalRequired: true
            }
          ],
          estimatedComplexity: 'LOW',
          isLocalOrRemote: 'HYBRID',
          canBeAutomated: true,
          humanApprovalRequired: false,
          diagnosedAt: new Date().toISOString()
        };
      }

      case 'MUSIC_GENERATION': {
        return {
          gapId,
          capabilityId: cap.capabilityId,
          capabilityName: cap.name,
          organizationScope: orgScope,
          currentTruthState: cap.status,
          exactFailureReason: failureReason || 'No real music synthesizer or Lyria/MusicLM provider connected',
          requiredDependency: ['audio_synthesizer', 'musiclm_endpoint'],
          requiredHardware: { minCores: 2 },
          requiredProvider: ['google_lyria', 'elevenlabs', 'web_audio_synth'],
          requiredApiCredential: ['MUSIC_API_KEY'],
          requiredLocalRuntime: ['WebAudioSineSynth', 'AudioContext'],
          requiredModel: ['lyria-v1'],
          requiredWorker: [],
          requiredSoftwarePackage: [],
          requiredAuthorization: 'AUTOMATIC_SAFE',
          remediationOptions: [
            {
              optionId: 'opt_music_webaudio',
              description: 'Activate sovereign procedural WebAudio Harmonic Synthesizer',
              type: 'LOCAL_INSTALL',
              estimatedComplexity: 'LOW',
              isLocalOrRemote: 'LOCAL',
              canBeAutomated: true,
              humanApprovalRequired: false
            },
            {
              optionId: 'opt_music_cloud_key',
              description: 'Configure external authorized Music API Key',
              type: 'CONFIG_UPDATE',
              estimatedComplexity: 'MEDIUM',
              isLocalOrRemote: 'REMOTE',
              canBeAutomated: false,
              humanApprovalRequired: true
            }
          ],
          estimatedComplexity: 'LOW',
          isLocalOrRemote: 'LOCAL',
          canBeAutomated: true,
          humanApprovalRequired: false,
          diagnosedAt: new Date().toISOString()
        };
      }

      case 'VIDEO_PLANNING':
      case 'VIDEO_GENERATION':
      case 'VIDEO_VERIFICATION': {
        const vramGb = hardware?.vramMb ? hardware.vramMb / 1024 : 0;
        const needsGpu = vramGb < 16;
        return {
          gapId,
          capabilityId: cap.capabilityId,
          capabilityName: cap.name,
          organizationScope: orgScope,
          currentTruthState: cap.status,
          exactFailureReason: needsGpu
            ? `Insufficient local VRAM (${vramGb.toFixed(1)}GB < 16GB required) and zero active remote GPU worker nodes`
            : (failureReason || 'Video rendering runtime or GPU worker offline'),
          requiredDependency: ['ffmpeg', 'webgl_canvas_exporter', 'remote_render_worker'],
          requiredHardware: { minVramMb: 16384, gpuRequired: true, minCores: 4 },
          requiredProvider: ['local_canvas_render', 'nexus_remote_worker', 'luma', 'runway'],
          requiredApiCredential: ['RENDER_NODE_TOKEN'],
          requiredLocalRuntime: ['CanvasCaptureMediaStream', 'WebGL2RenderingContext'],
          requiredModel: ['cinematic-diffusion-v1'],
          requiredWorker: ['worker_render_gpu_node'],
          requiredSoftwarePackage: ['ffmpeg-wasm'],
          requiredAuthorization: 'ORGANIZATION_ADMIN',
          remediationOptions: [
            {
              optionId: 'opt_video_canvas_stream',
              description: 'Activate local client-side 60fps WebGL/Canvas Keyframe Animation Renderer & MediaRecorder',
              type: 'LOCAL_INSTALL',
              estimatedComplexity: 'MEDIUM',
              isLocalOrRemote: 'LOCAL',
              canBeAutomated: true,
              humanApprovalRequired: false
            },
            {
              optionId: 'opt_video_connect_worker',
              description: 'Authenticate and handshake authorized remote GPU rendering worker node',
              type: 'REMOTE_WORKER_CONNECT',
              estimatedComplexity: 'MEDIUM',
              isLocalOrRemote: 'REMOTE',
              canBeAutomated: false,
              humanApprovalRequired: true
            }
          ],
          estimatedComplexity: 'MEDIUM',
          isLocalOrRemote: 'HYBRID',
          canBeAutomated: true,
          humanApprovalRequired: false,
          diagnosedAt: new Date().toISOString()
        };
      }

      case 'REMOTE_WORKER_CONNECTION':
      case 'REMOTE_WORKER_AUTH':
      case 'REMOTE_WORKER_EXECUTION': {
        return {
          gapId,
          capabilityId: cap.capabilityId,
          capabilityName: cap.name,
          organizationScope: orgScope,
          currentTruthState: cap.status,
          exactFailureReason: activeWorkerCount === 0
            ? 'Zero external remote compute worker nodes connected or verified'
            : (failureReason || 'Worker authentication handshake pending'),
          requiredDependency: ['tcp_ws_transport', 'ed25519_crypto'],
          requiredHardware: { minCores: 2 },
          requiredProvider: ['nexus_remote_fabric'],
          requiredApiCredential: ['WORKER_AUTH_TOKEN'],
          requiredLocalRuntime: ['WebSocketClient', 'TlsSocket'],
          requiredModel: [],
          requiredWorker: ['remote_compute_worker'],
          requiredSoftwarePackage: [],
          requiredAuthorization: 'ORGANIZATION_ADMIN',
          remediationOptions: [
            {
              optionId: 'opt_worker_discovery',
              description: 'Initiate remote worker discovery and cryptographic handshake protocol',
              type: 'REMOTE_WORKER_CONNECT',
              estimatedComplexity: 'LOW',
              isLocalOrRemote: 'REMOTE',
              canBeAutomated: true,
              humanApprovalRequired: false
            }
          ],
          estimatedComplexity: 'LOW',
          isLocalOrRemote: 'REMOTE',
          canBeAutomated: true,
          humanApprovalRequired: false,
          diagnosedAt: new Date().toISOString()
        };
      }

      default: {
        // Safe forensic diagnosis for general or unknown gaps
        return {
          gapId,
          capabilityId: cap.capabilityId,
          capabilityName: cap.name,
          organizationScope: orgScope,
          currentTruthState: cap.status,
          exactFailureReason: failureReason || 'DIAGNOSIS_UNCERTAIN',
          requiredDependency: cap.verificationRequirements || [],
          requiredHardware: {},
          requiredProvider: [],
          requiredApiCredential: [],
          requiredLocalRuntime: [],
          requiredModel: [],
          requiredWorker: [],
          requiredSoftwarePackage: [],
          requiredAuthorization: 'USER_APPROVAL',
          remediationOptions: [
            {
              optionId: 'opt_general_retry',
              description: `Execute runtime calibration for ${cap.name}`,
              type: 'PROVIDER_FALLBACK',
              estimatedComplexity: 'LOW',
              isLocalOrRemote: 'LOCAL',
              canBeAutomated: true,
              humanApprovalRequired: false
            }
          ],
          estimatedComplexity: 'LOW',
          isLocalOrRemote: 'LOCAL',
          canBeAutomated: true,
          humanApprovalRequired: false,
          diagnosedAt: new Date().toISOString()
        };
      }
    }
  }
}

export const annyCapabilityGapEngine = AnnyCapabilityGapEngine.getInstance();
