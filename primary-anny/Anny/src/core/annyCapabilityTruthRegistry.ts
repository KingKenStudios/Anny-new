/**
 * ANNY — CAPABILITY TRUTH REGISTRY (PHASE 25)
 * Machine-readable source of truth for all ANNY capabilities.
 * Distinguishes between REAL, PARTIAL, BLOCKED, UNAVAILABLE, and UNKNOWN.
 * Truth over appearance.
 */

export type CapabilityStatus = 'REAL' | 'PARTIAL' | 'BLOCKED' | 'UNAVAILABLE' | 'SIMULATED' | 'FAILED' | 'UNKNOWN';

export interface CapabilityEvidenceStage {
  stage: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface CapabilityEvidence {
  executionId: string;
  timestamp: string;
  provider: string;
  model: string;
  artifactId?: string;
  verificationMethod: string;
  transactionId?: string;
  workerId?: string;
  hardware?: string;
  verifiedAt?: string;
  confidence?: number;
  stalenessDurationMs?: number;
  evidenceChain?: CapabilityEvidenceStage[];
}

export interface RemediationHistoryRecord {
  remediationId: string;
  timestamp: string;
  diagnosis: string;
  optionSelected: string;
  result: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'ROLLBACK';
  evidence?: Record<string, any>;
  error?: string;
}

export interface CapabilityDefinition {
  capabilityId: string;
  name: string;
  category: string;
  status: CapabilityStatus;
  lastVerifiedAt?: string;
  lastFailedAt?: string;
  lastFailureReason?: string;
  evidence?: CapabilityEvidence;
  evidenceHistory?: CapabilityEvidence[];
  remediationHistory?: RemediationHistoryRecord[];
  reason?: string;
  requiredInputs: string[];
  runtimeEntryPoint: string;
  error?: string;
  confidence?: number; // 0.0 - 1.0
  expiresAt?: string;
  verificationRequirements?: string[];
  dependencyState?: 'SATISFIED' | 'MISSING_CREDENTIALS' | 'MISSING_HARDWARE' | 'MISSING_RUNTIME' | 'MISSING_WORKER' | 'UNKNOWN';
}

export class AnnyCapabilityTruthRegistry {
  private static instance: AnnyCapabilityTruthRegistry;
  private registry: Map<string, CapabilityDefinition> = new Map();

  private constructor() {
    this.initializeRegistry();
  }

  public static getInstance(): AnnyCapabilityTruthRegistry {
    if (!AnnyCapabilityTruthRegistry.instance) {
      AnnyCapabilityTruthRegistry.instance = new AnnyCapabilityTruthRegistry();
    }
    return AnnyCapabilityTruthRegistry.instance;
  }

  private initializeRegistry() {
    // Initial State: Capabilities start as UNKNOWN / UNAVAILABLE until proven by execution
    const definitions: Array<{ id: string; name: string; category: string; inputs: string[]; entry: string; reqs?: string[] }> = [
      { id: 'TEXT_EXECUTION', name: 'Real Text Execution', category: 'LLM', inputs: ['prompt'], entry: 'AnnyCognitiveKernel.executePipeline', reqs: ['MODEL_ROUTER_ACTIVE', 'LLM_PROVIDER_RESPONSE'] },
      { id: 'TEXT_TO_AIOS', name: 'Real Text to AIOS Application', category: 'GENERATION', inputs: ['text'], entry: 'AnnyCognitiveKernel.executePipeline', reqs: ['AIOS_MANIFEST_GEN', 'VFS_WRITE_TX'] },
      { id: 'IMAGE_INPUT', name: 'Multimodal Image Ingestion', category: 'VISION', inputs: ['image_bytes'], entry: 'AnnyMultimodalSession.ingest', reqs: ['BINARY_BUFFER_VALID', 'MIME_PARSE'] },
      { id: 'VISION_EXECUTION', name: 'Real Vision Execution', category: 'VISION', inputs: ['image', 'prompt'], entry: 'aiProviderPlatform.chat', reqs: ['VISION_MODEL_CALL'] },
      { id: 'VOICE_INPUT', name: 'Real Voice Ingestion', category: 'VOICE', inputs: ['audio_stream'], entry: 'AnnyVoiceIntelligenceFabric', reqs: ['AUDIO_STREAM_INGEST'] },
      { id: 'VOICE_STT', name: 'Real Speech-To-Text', category: 'VOICE', inputs: ['audio'], entry: 'AnnyVoiceIntelligenceFabric.transcribe', reqs: ['WHISPER_GROQ_API_KEY_OR_LOCAL_RUNTIME'] },
      { id: 'URL_RETRIEVAL', name: 'Real URL Retrieval', category: 'NETWORK', inputs: ['url'], entry: 'AnnyLinkUnderstandingEngine.inspectUrl', reqs: ['NETWORK_FETCH_OR_HEURISTIC'] },
      { id: 'URL_ANALYSIS', name: 'Real URL Analysis', category: 'NETWORK', inputs: ['url'], entry: 'AnnyLinkUnderstandingEngine.generateWebsiteReplicationPlan', reqs: ['CLEAN_ROOM_BLUEPRINT'] },
      { id: 'URL_TO_AIOS', name: 'Real URL to AIOS Application', category: 'NETWORK', inputs: ['url'], entry: 'AnnyLinkUnderstandingEngine.generateApplicationReplicationPlan', reqs: ['AIOS_APP_SCHEMA'] },
      { id: 'IMAGE_GENERATION', name: 'Real Image Generation', category: 'CREATIVE', inputs: ['prompt'], entry: 'aiProviderPlatform.imageGeneration', reqs: ['FLUX_POLLINATIONS_ENDPOINT'] },
      { id: 'MUSIC_GENERATION', name: 'Real Music Generation', category: 'CREATIVE', inputs: ['prompt'], entry: 'aiProviderPlatform.audioGeneration', reqs: ['MUSIC_SYNTH_API'] },
      { id: 'VIDEO_PLANNING', name: 'Real Video Planning & Storyboard', category: 'CREATIVE', inputs: ['prompt'], entry: 'AnnyVideoGenerationFabric.orchestrateCinematicPipeline', reqs: ['CINEMATIC_SCRIPT_PIPELINE'] },
      { id: 'VIDEO_GENERATION', name: 'Real Video Rendering', category: 'CREATIVE', inputs: ['prompt'], entry: 'AnnyVideoGenerationFabric.orchestrateCinematicPipeline', reqs: ['GPU_VRAM_16GB_OR_REMOTE_RENDER_NODE'] },
      { id: 'VIDEO_VERIFICATION', name: 'Real Video Artifact Verification', category: 'CREATIVE', inputs: ['artifact'], entry: 'AnnyRemoteResultVerifier.verifyArtifact', reqs: ['MEDIA_CONTAINER_VALIDATION'] },
      { id: 'REMOTE_WORKER_CONNECTION', name: 'Remote Worker Node Connection', category: 'COMPUTE', inputs: ['heartbeat'], entry: 'AnnyWorkerRegistry.listWorkers', reqs: ['TCP_WS_HEARTBEAT'] },
      { id: 'REMOTE_WORKER_AUTH', name: 'Remote Worker Authentication', category: 'COMPUTE', inputs: ['auth_token'], entry: 'AnnyWorkerRegistry.authenticate', reqs: ['CRYPTO_HANDSHAKE'] },
      { id: 'REMOTE_WORKER_EXECUTION', name: 'Remote Worker Job Execution', category: 'COMPUTE', inputs: ['job'], entry: 'AnnyRemoteComputeFabric.executeMediaPipeline', reqs: ['AUTHORIZED_REMOTE_NODE'] },
      { id: 'REMOTE_ARTIFACT_VERIFICATION', name: 'Remote Artifact Verification', category: 'COMPUTE', inputs: ['artifacts'], entry: 'AnnyRemoteResultVerifier.verifyAndCommit', reqs: ['SHA256_PAYLOAD_MATCH'] },
      { id: 'MEMORY_PERSISTENCE', name: 'Durable Memory Persistence', category: 'STORAGE', inputs: ['key', 'value'], entry: 'memoryEngine.setFact', reqs: ['FIRESTORE_OR_VFS_STORE'] },
      { id: 'ORG_ISOLATION', name: 'Multi-Tenant Organization Isolation', category: 'SECURITY', inputs: ['sourceOrg', 'targetOrg'], entry: 'securitySentinel.verifyAccess', reqs: ['TENANT_BOUNDARY_ASSERTION'] },
      { id: 'KEDA_SECURITY_ROUTING', name: 'Keda Security & SCADA Domain Routing', category: 'ORGANIZATION', inputs: ['orgId'], entry: 'deepOrganizationIntelligence.getProfile', reqs: ['KEDA_SECURITY_POLICY'] },
      { id: 'KING_KEN_CREATIVE_ROUTING', name: 'King Ken Studios Creative Media Routing', category: 'ORGANIZATION', inputs: ['orgId'], entry: 'deepOrganizationIntelligence.getProfile', reqs: ['KKS_CREATIVE_POLICY'] },
      { id: 'UNIVERSITY_ISOLATION', name: 'University Academic Isolation', category: 'ORGANIZATION', inputs: ['orgId'], entry: 'deepOrganizationIntelligence.getProfile', reqs: ['ACADEMIC_DATA_PRIVACY'] },
      { id: 'TECHCO_ISOLATION', name: 'Technology Company Domain Isolation', category: 'ORGANIZATION', inputs: ['orgId'], entry: 'deepOrganizationIntelligence.getProfile', reqs: ['TECHCO_POLICY'] },
      { id: 'DYNAMIC_ORG_CREATION', name: 'Dynamic Organization Creation', category: 'ORGANIZATION', inputs: ['spec'], entry: 'deepOrganizationIntelligence.createFutureOrganization', reqs: ['ORG_NAMESPACE_ALLOC'] },
      { id: 'HARDWARE_TRUTH', name: 'Hardware Telemetry Truth', category: 'HARDWARE', inputs: [], entry: 'hardwareIntelligenceEngine.getHardwareInfo', reqs: ['OS_CPU_RAM_GPU_PROBE'] },
      { id: 'MODEL_ROUTING', name: 'Dynamic Model Routing', category: 'ROUTING', inputs: ['task'], entry: 'modelRouter.selectModel', reqs: ['MODEL_FALLBACK_MATRIX'] },
      { id: 'PROVIDER_FAILOVER', name: 'Provider Failover Engine', category: 'ROUTING', inputs: ['provider'], entry: 'aiProviderPlatform.chat', reqs: ['FAILOVER_STATUS_CHECK'] },
      { id: 'OFFLINE_CORE', name: 'Sovereign Offline Core Execution', category: 'CORE', inputs: ['task'], entry: 'AnnyCognitiveKernel', reqs: ['ZERO_NETWORK_VFS_OPS'] },
      { id: 'SECURITY_ADVERSARIAL', name: 'Adversarial Injection & Path Defense', category: 'SECURITY', inputs: ['payload'], entry: 'securitySentinel.auditPath', reqs: ['PATH_TRAVERSAL_BLOCK'] },
      { id: 'TRANSACTION_INTEGRITY', name: 'VFS Transaction Atomicity', category: 'VFS', inputs: ['txId'], entry: 'vfsTransactionManager.begin', reqs: ['COMMIT_ROLLBACK_GUARANTEE'] },
      { id: 'TRANSACTION_REPLAY_PROTECTION', name: 'Transaction Replay Protection', category: 'VFS', inputs: ['txId'], entry: 'vfsTransactionManager.writeFile', reqs: ['REPLAY_ATTACK_BLOCK'] },
      { id: 'AIOS_APP_ISOLATION', name: 'AIOS Application Sandbox Isolation', category: 'AIOS', inputs: ['appId'], entry: 'WorkspaceManager.getWorkspaceVFS', reqs: ['SANDBOX_VFS_ISOLATION'] },
      { id: 'AIOS_LIFECYCLE', name: 'AIOS Native Lifecycle Management', category: 'AIOS', inputs: ['manifest'], entry: 'AnnyAiosPortabilityEngine', reqs: ['LIFECYCLE_STATE_MACHINE'] },
      { id: 'MULTIMODAL_SESSION', name: 'Multimodal Session Cohesion', category: 'CORE', inputs: ['session'], entry: 'AnnyMultimodalSession', reqs: ['SESSION_GRAPH_SYNC'] },
      { id: 'COMPLETE_USER_JOURNEY', name: 'End-to-End Sovereign User Journey', category: 'CORE', inputs: ['prompt'], entry: 'AnnyCognitiveKernel.executePipeline', reqs: ['FULL_STACK_FLOW'] },
      { id: 'REALITY_SCORE_INTEGRITY', name: 'Reality Score Mathematical Proof', category: 'AUDIT', inputs: [], entry: 'AnnyCapabilityTruthRegistry.getRealityScore', reqs: ['MATHEMATICAL_VERIFICATION'] },
      { id: 'ZERO_PRODUCTION_SIMULATION', name: 'Zero Production Simulation Compliance', category: 'AUDIT', inputs: [], entry: 'AnnyPhase24RealitySuite', reqs: ['ANTI_SIMULATION_CHECK'] },
      { id: 'AUTONOMOUS_REPAIR', name: 'Autonomous Code Repair Engine', category: 'REPAIR', inputs: ['error'], entry: 'repairOrchestrator', reqs: ['HEALING_LOOP_INVOCATION'] },
      { id: 'FINAL_SOVEREIGN_EXECUTION_PROOF', name: 'Final Sovereign Reality Certification', category: 'AUDIT', inputs: ['proofs'], entry: 'AnnyPhase24RealitySuite', reqs: ['FORENSIC_SUITE_CERTIFICATION'] },
      { id: 'ARCHITECTURE_PLANNING', name: 'Conceptual Architecture & DXF R12 Planning', category: 'ARCHITECTURE', inputs: ['typology', 'plotWidthM', 'plotDepthM'], entry: 'architectureDesignEngine.generateArchitecturePlan', reqs: ['NON_OVERLAPPING_LAYOUT', 'VALID_DXF_R12', 'PROFESSIONAL_SIGNOFF_DISCLAIMER'] },
      { id: 'BROADCAST_STUDIO_PLANNING', name: 'TV & Radio Broadcast EPG & Config Engine', category: 'BROADCAST', inputs: ['stationName', 'medium'], entry: 'broadcastMediaEngine.generateBroadcastPlan', reqs: ['EPG_24H_GRID', 'ICECAST_LIQUIDSOAP_FFMPEG_CONFIGS'] },
      { id: 'MUSIC_DISTRIBUTION_PREP', name: 'Music Distribution Validation & DDEX Prep', category: 'DISTRIBUTION', inputs: ['releaseTitle', 'tracks', 'royaltySplits'], entry: 'broadcastMediaEngine.validateAndPrepareMusicRelease', reqs: ['ISRC_FORMAT_CHECK', 'MOD10_BARCODE_CHECK', 'PARTNER_API_HONESTY'] },
      { id: 'VIDEO_STREAMING_PIPELINE', name: 'ABR HLS/DASH & WebVTT Video Pipeline', category: 'STREAMING', inputs: ['videoTitle'], entry: 'broadcastMediaEngine.generateVideoStreamingPipeline', reqs: ['FFMPEG_ABR_LADDER', 'WEBVTT_CAPTIONS'] }
    ];

    definitions.forEach(d => {
      this.register({
        capabilityId: d.id,
        name: d.name,
        category: d.category,
        status: 'UNKNOWN',
        requiredInputs: d.inputs,
        runtimeEntryPoint: d.entry,
        verificationRequirements: d.reqs || [],
        confidence: 0,
        evidenceHistory: [],
        remediationHistory: []
      });
    });
  }

  public register(cap: CapabilityDefinition) {
    this.registry.set(cap.capabilityId, cap);
  }

  public updateStatus(id: string, status: CapabilityStatus, evidence?: CapabilityEvidence, reason?: string) {
    const cap = this.registry.get(id);
    if (cap) {
      cap.status = status;
      if (evidence) {
        cap.evidence = evidence;
        cap.lastVerifiedAt = evidence.timestamp || new Date().toISOString();
        cap.confidence = evidence.confidence !== undefined ? evidence.confidence : (status === 'REAL' ? 1.0 : 0.5);
        if (!cap.evidenceHistory) cap.evidenceHistory = [];
        cap.evidenceHistory.push(evidence);
      }
      if (reason) cap.reason = reason;
      this.registry.set(id, cap);
    }
  }

  public recordExecutionFailure(id: string, error: string, reason?: string) {
    const cap = this.registry.get(id);
    if (cap) {
      cap.lastFailedAt = new Date().toISOString();
      cap.lastFailureReason = error;
      if (reason) cap.reason = reason;
      this.registry.set(id, cap);
    }
  }

  public recordRemediation(id: string, record: RemediationHistoryRecord) {
    const cap = this.registry.get(id);
    if (cap) {
      if (!cap.remediationHistory) cap.remediationHistory = [];
      cap.remediationHistory.push(record);
      this.registry.set(id, cap);
    }
  }

  public isCapabilityStale(id: string, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    const cap = this.registry.get(id);
    if (!cap || !cap.lastVerifiedAt) return true;
    const verifiedTime = new Date(cap.lastVerifiedAt).getTime();
    return Date.now() - verifiedTime > maxAgeMs;
  }

  public verifyEvidenceChain(id: string): boolean {
    const cap = this.registry.get(id);
    if (!cap || !cap.evidence) return false;
    if (cap.status === 'REAL') {
      return Boolean(cap.evidence.executionId && cap.evidence.provider && cap.evidence.timestamp);
    }
    return true;
  }

  public auditDuplicateAuthority(): { hasDuplicateAuthorities: boolean; conflictingEntries: string[] } {
    const registeredEntries = new Set<string>();
    const conflictingEntries: string[] = [];

    this.registry.forEach((def, key) => {
      if (registeredEntries.has(key)) {
        conflictingEntries.push(key);
      } else {
        registeredEntries.add(key);
      }
    });

    return {
      hasDuplicateAuthorities: conflictingEntries.length > 0,
      conflictingEntries
    };
  }

  public getCapability(id: string): CapabilityDefinition | undefined {
    return this.registry.get(id);
  }

  public getAll(): CapabilityDefinition[] {
    return Array.from(this.registry.values());
  }

  public getRealityScore(): number {
    const all = this.getAll();
    const realCount = all.filter(c => c.status === 'REAL').length;
    const totalCount = all.length;
    return totalCount === 0 ? 0 : Math.round((realCount / totalCount) * 100);
  }

  public getStats() {
    const all = this.getAll();
    return {
      realCount: all.filter(c => c.status === 'REAL').length,
      partialCount: all.filter(c => c.status === 'PARTIAL').length,
      blockedCount: all.filter(c => c.status === 'BLOCKED').length,
      unavailableCount: all.filter(c => c.status === 'UNAVAILABLE').length,
      overallPercentage: this.getRealityScore()
    };
  }
}

export const annyCapabilityTruthRegistry = AnnyCapabilityTruthRegistry.getInstance();

