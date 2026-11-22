/**
 * ANNY — ORGANIZATION CAPABILITY & MULTIMODAL FABRIC
 * Model-independent capability definitions, multimodal creative routing (music, video, photography,
 * image/video editing), and operational/security intelligence capabilities.
 */

import { OrganizationScope } from './CanonicalExecutionContext';

export type CapabilityDomain = 'SOFTWARE' | 'AIOS' | 'CREATIVE' | 'ORGANIZATIONAL';

export type CapabilityCategory =
  | 'REASONING'
  | 'CODING'
  | 'WEB'
  | 'WEBSITE_GENERATION'
  | 'WEBAPP_GENERATION'
  | 'DESKTOP_GENERATION'
  | 'MOBILE_GENERATION'
  | 'BACKEND_GENERATION'
  | 'API_GENERATION'
  | 'DATABASE_DESIGN'
  | 'DATABASE_MIGRATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'REALTIME_SYSTEMS'
  | 'DISTRIBUTED_SYSTEMS'
  | 'DEVOPS'
  | 'TESTING'
  | 'DEBUGGING'
  | 'SECURITY_AUDITING'
  | 'MONITORING'
  | 'AUTOMATION'
  | 'AI_INTEGRATION'
  | 'AGENT_SYSTEMS'
  | 'AIOS_NATIVE_APP_GEN'
  | 'AIOS_SYSTEM_SERVICES'
  | 'AIOS_WIDGETS'
  | 'AIOS_SETTINGS_APP'
  | 'AIOS_PRODUCTIVITY_APP'
  | 'AIOS_CREATIVE_APP'
  | 'AIOS_DEVELOPER_APP'
  | 'AIOS_ENTERPRISE_APP'
  | 'AIOS_SECURITY_APP'
  | 'AIOS_MONITORING_APP'
  | 'AIOS_COMMUNICATION_APP'
  | 'AIOS_FINANCIAL_APP'
  | 'AIOS_HARDWARE_APP'
  | 'MUSIC_GENERATION'
  | 'SONG_PRODUCTION'
  | 'VOCAL_AUDIO_WORKFLOW'
  | 'SOUND_DESIGN'
  | 'IMAGE_GENERATION'
  | 'IMAGE_EDITING'
  | 'PHOTOGRAPHY'
  | 'VIDEO_GENERATION'
  | 'VIDEO_EDITING'
  | 'ANIMATION'
  | 'MOTION_GRAPHICS'
  | 'VISUAL_EFFECTS'
  | 'THREE_D_GENERATION'
  | 'THREE_D_EDITING'
  | 'MEDIA_ENHANCEMENT'
  | 'CREATIVE_POST_PRODUCTION'
  | 'BUSINESS_SYSTEMS'
  | 'UNIVERSITY_SYSTEMS'
  | 'FINANCIAL_SYSTEMS'
  | 'ENTERPRISE_SYSTEMS'
  | 'RESEARCH_SYSTEMS'
  | 'OPERATIONAL_AUTOMATION'
  | 'VISION'
  | 'AUDIO_ANALYSIS'
  | 'VIDEO_ANALYSIS'
  | 'DOCUMENT_PROCESSING'
  | 'OBSERVABILITY'
  | 'DATABASE'
  | 'INFRASTRUCTURE'
  | 'FINANCE'
  | 'EDUCATION'
  | 'SECURITY';

export type CapabilityAvailabilityStatus =
  | 'CAPABILITY_AVAILABLE'
  | 'CAPABILITY_CONFIGURED'
  | 'CAPABILITY_EXECUTABLE'
  | 'CAPABILITY_UNAVAILABLE'
  | 'CAPABILITY_REQUIRES_MODEL'
  | 'CAPABILITY_REQUIRES_GPU'
  | 'CAPABILITY_REQUIRES_EXTERNAL_PROVIDER';

export interface AnnyCapability {
  id: string;
  domain: CapabilityDomain;
  category: CapabilityCategory;
  name: string;
  description: string;
  status: CapabilityAvailabilityStatus;
  localAvailable: boolean;
  cloudAvailable: boolean;
  gpuRequired: boolean;
  minRamMb?: number;
  requiredModels: string[];
  supportedOrganizations: OrganizationScope[];
  hardwareTierRequired?: 'low' | 'mid' | 'high';
  requiresAuthentication?: boolean;
  financialControlLevel?: 'NONE' | 'STANDARD' | 'STRICT_AUDIT';
}

export interface VideoGenerationPrompt {
  promptId: string;
  organizationId: OrganizationScope;
  promptText: string;
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p' | '4K';
  seed?: number;
}

export interface VideoGenerationArtifact {
  artifactId: string;
  promptId: string;
  status: 'PENDING' | 'GENERATED' | 'FAILED' | 'UNSUPPORTED_PROVIDER';
  fileUri?: string;
  durationSeconds?: number;
  mimeType?: string;
  errorMessage?: string;
  timestamp: string;
}

export class OrganizationCapabilityRegistry {
  private static instance: OrganizationCapabilityRegistry;
  private capabilities: Map<string, AnnyCapability> = new Map();

  private constructor() {
    this.registerDefaultCapabilities();
  }

  public static getInstance(): OrganizationCapabilityRegistry {
    if (!OrganizationCapabilityRegistry.instance) {
      OrganizationCapabilityRegistry.instance = new OrganizationCapabilityRegistry();
    }
    return OrganizationCapabilityRegistry.instance;
  }

  private registerDefaultCapabilities(): void {
    const caps: AnnyCapability[] = [
      // ==========================================
      // SOFTWARE CAPABILITIES
      // ==========================================
      {
        id: 'cap_website_gen',
        domain: 'SOFTWARE',
        category: 'WEBSITE_GENERATION',
        name: 'Website Generation & Responsive Synthesis',
        description: 'Synthesizes clean-room responsive websites, landing pages, and editorial layouts.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_webapp_gen',
        domain: 'SOFTWARE',
        category: 'WEBAPP_GENERATION',
        name: 'Web Application Generation',
        description: 'Constructs interactive React + Vite SPAs and full-stack application systems.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_desktop_gen',
        domain: 'SOFTWARE',
        category: 'DESKTOP_GENERATION',
        name: 'Desktop Application Generation',
        description: 'Builds cross-platform desktop UI adapters and native execution wrappers.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'keda']
      },
      {
        id: 'cap_mobile_gen',
        domain: 'SOFTWARE',
        category: 'MOBILE_GENERATION',
        name: 'Mobile Application Generation',
        description: 'Generates mobile compatibility wrappers for Android and cross-platform runtimes upon explicit request.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'keda']
      },
      {
        id: 'cap_backend_gen',
        domain: 'SOFTWARE',
        category: 'BACKEND_GENERATION',
        name: 'Backend & Server Generation',
        description: 'Synthesizes robust Express, Node.js, and server-side runtime services.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_api_gen',
        domain: 'SOFTWARE',
        category: 'API_GENERATION',
        name: 'REST & GraphQL API Generation',
        description: 'Designs typed API routes, serialization contracts, and OpenAPI specifications.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_db_design',
        domain: 'SOFTWARE',
        category: 'DATABASE_DESIGN',
        name: 'Database Schema Design & Modeling',
        description: 'Generates normalized SQL/NoSQL schemas, relational indexes, and entities.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_db_migration',
        domain: 'SOFTWARE',
        category: 'DATABASE_MIGRATION',
        name: 'Database Migration & DDL Management',
        description: 'Orchestrates non-destructive database migrations and schema rollbacks.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_auth_sys',
        domain: 'SOFTWARE',
        category: 'AUTHENTICATION',
        name: 'Authentication & Session Engine',
        description: 'Integrates secure session management, JWT tokens, OAuth, and biometrics.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_rbac_sys',
        domain: 'SOFTWARE',
        category: 'AUTHORIZATION',
        name: 'Role-Based Access Control (RBAC)',
        description: 'Enforces permission gates, scopes, and namespace authorization policies.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_realtime_sys',
        domain: 'SOFTWARE',
        category: 'REALTIME_SYSTEMS',
        name: 'Real-Time Event Streams & WebSockets',
        description: 'Implements event streams, WebSocket pub/sub, and live synchronization.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_distributed_sys',
        domain: 'SOFTWARE',
        category: 'DISTRIBUTED_SYSTEMS',
        name: 'Distributed Systems & Queue Orchestration',
        description: 'Orchestrates message queues (RabbitMQ), distributed cache (Redis), and workers.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_devops',
        domain: 'SOFTWARE',
        category: 'DEVOPS',
        name: 'DevOps & Container Orchestration',
        description: 'Produces Dockerfiles, Cloud Run manifests, CI/CD scripts, and deployment specs.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_testing',
        domain: 'SOFTWARE',
        category: 'TESTING',
        name: 'Autonomous Verification & Test Generation',
        description: 'Generates unit tests, integration tests, end-to-end flows, and reality suites.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_debugging',
        domain: 'SOFTWARE',
        category: 'DEBUGGING',
        name: 'Self-Healing AST & Diagnostic Engine',
        description: 'Analyzes build failures, stack traces, AST errors, and performs autonomous repairs.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_security_sentinel',
        domain: 'SOFTWARE',
        category: 'SECURITY',
        name: 'Organizational Security & Compliance Auditing',
        description: 'Secure policy enforcement, secret detection, vulnerability scanning, and threat detection.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'king_ken_studios', 'university', 'global']
      },
      {
        id: 'cap_keda_monitoring',
        domain: 'SOFTWARE',
        category: 'MONITORING',
        name: 'Keda Infrastructure & Service Monitoring',
        description: 'Real-time telemetry, service health analysis, and anomaly detection.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'global']
      },
      {
        id: 'cap_automation',
        domain: 'SOFTWARE',
        category: 'AUTOMATION',
        name: 'System & Workflow Automation',
        description: 'Automates routine engineering tasks, file synchronization, and scheduled jobs.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company']
      },
      {
        id: 'cap_ai_integration',
        domain: 'SOFTWARE',
        category: 'AI_INTEGRATION',
        name: 'AI Model & Embedding Integration',
        description: 'Integrates LLMs, embeddings, RAG pipelines, and vector databases into apps.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.3', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_agent_systems',
        domain: 'SOFTWARE',
        category: 'AGENT_SYSTEMS',
        name: 'Autonomous Multi-Agent Systems',
        description: 'Coordinates multi-agent collaboration, delegation, and consensus verification.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['claude-3-haiku', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company', 'university']
      },

      // ==========================================
      // AIOS-NATIVE CAPABILITIES
      // ==========================================
      {
        id: 'cap_aios_native_app_gen',
        domain: 'AIOS',
        category: 'AIOS_NATIVE_APP_GEN',
        name: 'AIOS-Native Application Generation',
        description: 'Synthesizes native AIOS applications with windowing primitives, lifecycle, and aios-app.manifest.json.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company', 'university']
      },
      {
        id: 'cap_aios_system_services',
        domain: 'AIOS',
        category: 'AIOS_SYSTEM_SERVICES',
        name: 'AIOS System Services & Daemons',
        description: 'Builds background services, daemons, and IPC listeners for the AIOS kernel.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'keda']
      },
      {
        id: 'cap_aios_widgets',
        domain: 'AIOS',
        category: 'AIOS_WIDGETS',
        name: 'AIOS Desktop & Dock Widgets',
        description: 'Designs glanceable, live-updating desktop widgets and status cards.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'technology_company']
      },
      {
        id: 'cap_aios_settings_app',
        domain: 'AIOS',
        category: 'AIOS_SETTINGS_APP',
        name: 'AIOS Settings & Configuration Control',
        description: 'Constructs system preferences, hardware calibration, and environment dashboards.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'keda']
      },
      {
        id: 'cap_aios_productivity_app',
        domain: 'AIOS',
        category: 'AIOS_PRODUCTIVITY_APP',
        name: 'AIOS Productivity & Office Applications',
        description: 'Creates document editors, kanban boards, spreadsheets, and task managers in AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'king_ken_studios', 'keda', 'university']
      },
      {
        id: 'cap_aios_creative_app',
        domain: 'AIOS',
        category: 'AIOS_CREATIVE_APP',
        name: 'AIOS Creative & Media Workstations',
        description: 'Constructs digital audio workstations, video timelines, and graphic studios on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_aios_developer_app',
        domain: 'AIOS',
        category: 'AIOS_DEVELOPER_APP',
        name: 'AIOS Developer & IDE Tooling',
        description: 'Builds code editors, terminals, git visualizers, and AST debuggers for AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'university', 'keda']
      },
      {
        id: 'cap_aios_enterprise_app',
        domain: 'AIOS',
        category: 'AIOS_ENTERPRISE_APP',
        name: 'AIOS Enterprise & ERP Applications',
        description: 'Constructs enterprise dashboards, resource planning, and inventory control on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['technology_company', 'keda', 'global']
      },
      {
        id: 'cap_aios_security_app',
        domain: 'AIOS',
        category: 'AIOS_SECURITY_APP',
        name: 'AIOS Security & Threat Intelligence Console',
        description: 'Builds security consoles, firewall monitors, and audit log inspectors on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'global']
      },
      {
        id: 'cap_aios_monitoring_app',
        domain: 'AIOS',
        category: 'AIOS_MONITORING_APP',
        name: 'AIOS Telemetry & Observability Studio',
        description: 'Constructs real-time CPU/GPU, VFS I/O, and network telemetry dashboards on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'global']
      },
      {
        id: 'cap_aios_comm_app',
        domain: 'AIOS',
        category: 'AIOS_COMMUNICATION_APP',
        name: 'AIOS Communication & Collaboration App',
        description: 'Builds instant messaging, sovereign mail, and video conferencing clients on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'king_ken_studios', 'university', 'global']
      },
      {
        id: 'cap_aios_financial_app',
        domain: 'AIOS',
        category: 'AIOS_FINANCIAL_APP',
        name: 'AIOS Sovereign Financial & Wallet Application',
        description: 'Constructs ledger management, payment processing, and wallet applications on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'global'],
        financialControlLevel: 'STRICT_AUDIT'
      },
      {
        id: 'cap_aios_hardware_app',
        domain: 'AIOS',
        category: 'AIOS_HARDWARE_APP',
        name: 'AIOS Hardware & Robotics Control Application',
        description: 'Builds SCADA telemetry, sensor visualizers, and robotics actuation panels on AIOS.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['technology_company', 'university', 'global']
      },

      // ==========================================
      // CREATIVE CAPABILITIES (KING KEN STUDIOS)
      // ==========================================
      {
        id: 'cap_music_gen',
        domain: 'CREATIVE',
        category: 'MUSIC_GENERATION',
        name: 'Music & Melody Generation',
        description: 'Generate professional musical arrangements, beats, and compositions.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['audio-diffusion', 'musicgen'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_song_production',
        domain: 'CREATIVE',
        category: 'SONG_PRODUCTION',
        name: 'Songwriting & Arrangement Pipeline',
        description: 'Produces song lyrics, chord progressions, harmonic structures, and track structures.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['claude-3-haiku', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_vocal_audio_workflow',
        domain: 'CREATIVE',
        category: 'VOCAL_AUDIO_WORKFLOW',
        name: 'Vocal Production & Audio DSP Workflows',
        description: 'Orchestrates pitch correction, vocal layering, EQ curves, and spatial acoustic mastering.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['audio-diffusion', 'speech-dsp'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_sound_design',
        domain: 'CREATIVE',
        category: 'SOUND_DESIGN',
        name: 'Sound Design & Foley Synthesis',
        description: 'Synthesizes cinematic sound effects, foley textures, and ambient soundscapes.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['audio-diffusion', 'musicgen'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_image_gen',
        domain: 'CREATIVE',
        category: 'IMAGE_GENERATION',
        name: 'Visual Art & Image Generation',
        description: 'Generates high-resolution concept art, digital branding, avatars, and scenery.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['flux-schnell', 'stable-diffusion-xl', 'imagen-3'],
        supportedOrganizations: ['king_ken_studios', 'global', 'technology_company', 'keda']
      },
      {
        id: 'cap_image_editing',
        domain: 'CREATIVE',
        category: 'IMAGE_EDITING',
        name: 'Image Inpainting & Transformation',
        description: 'Performs semantic inpainting, style transfer, background removal, and color grading.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['sd-inpainting', 'imagen-3'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_photography_workflow',
        domain: 'CREATIVE',
        category: 'PHOTOGRAPHY',
        name: 'Photography & Lighting Simulation',
        description: 'Simulates camera lenses, aperture depth-of-field, studio lighting, and HDR tones.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['flux-schnell', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_video_gen',
        domain: 'CREATIVE',
        category: 'VIDEO_GENERATION',
        name: 'Professional Video Scene Generation',
        description: 'Generate cinematic video shots and storyboards.',
        status: 'CAPABILITY_REQUIRES_GPU',
        localAvailable: false,
        cloudAvailable: true,
        gpuRequired: true,
        requiredModels: ['stable-video-diffusion', 'sora-api'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_video_editing',
        domain: 'CREATIVE',
        category: 'VIDEO_EDITING',
        name: 'Non-Linear Video Editing & Cut Lists',
        description: 'Generates EDL/XML cut sequences, speed ramps, and scene transition manifests.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_animation',
        domain: 'CREATIVE',
        category: 'ANIMATION',
        name: 'Keyframe Animation & Timing Engine',
        description: 'Generates SVG, CSS, Lottie, and skeletal animation keyframes.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_motion_graphics',
        domain: 'CREATIVE',
        category: 'MOTION_GRAPHICS',
        name: 'Motion Graphics & Title Design',
        description: 'Synthesizes animated lower-thirds, broadcast intros, and kinetic typography.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_vfx',
        domain: 'CREATIVE',
        category: 'VISUAL_EFFECTS',
        name: 'Visual Effects (VFX) & Particle Systems',
        description: 'Produces shader-based visual effects, particle simulations, and atmospheric effects.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_3d_gen',
        domain: 'CREATIVE',
        category: 'THREE_D_GENERATION',
        name: '3D Mesh & Geometry Generation',
        description: 'Generates Three.js/glTF geometries, procedural meshes, and materials.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'technology_company', 'global']
      },
      {
        id: 'cap_3d_editing',
        domain: 'CREATIVE',
        category: 'THREE_D_EDITING',
        name: '3D Scene Composition & Shading',
        description: 'Configures Three.js cameras, PBR materials, shadows, and interactive orbit controls.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['qwen2.5-coder:7b', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'technology_company', 'global']
      },
      {
        id: 'cap_media_enhancement',
        domain: 'CREATIVE',
        category: 'MEDIA_ENHANCEMENT',
        name: 'Media Upscaling & Audio/Video Denoising',
        description: 'Upscales image resolution, removes background audio hiss, and balances dynamic range.',
        status: 'CAPABILITY_CONFIGURED',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['real-esrgan', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },
      {
        id: 'cap_creative_post_production',
        domain: 'CREATIVE',
        category: 'CREATIVE_POST_PRODUCTION',
        name: 'Multimodal End-to-End Creative Post-Production',
        description: 'Orchestrates full Idea -> Script -> Storyboard -> Media Gen -> Audio -> Post -> QC pipeline.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['claude-3-haiku', 'deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['king_ken_studios', 'global']
      },

      // ==========================================
      // ORGANIZATIONAL CAPABILITIES
      // ==========================================
      {
        id: 'cap_business_systems',
        domain: 'ORGANIZATIONAL',
        category: 'BUSINESS_SYSTEMS',
        name: 'Business Operations & Management Systems',
        description: 'Constructs CRM systems, invoice generators, supply-chain trackers, and sales funnels.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'technology_company', 'keda']
      },
      {
        id: 'cap_university_systems',
        domain: 'ORGANIZATIONAL',
        category: 'UNIVERSITY_SYSTEMS',
        name: 'Academic, Research & University Systems',
        description: 'Generates courseware platforms, student gradebooks, thesis archives, and lab simulators.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['university', 'global']
      },
      {
        id: 'cap_financial_systems',
        domain: 'ORGANIZATIONAL',
        category: 'FINANCIAL_SYSTEMS',
        name: 'Financial Technology & Compliance Systems',
        description: 'Implements double-entry ledgering, fraud anomaly detection, and audit trail enforcement.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['global', 'keda', 'technology_company'],
        financialControlLevel: 'STRICT_AUDIT'
      },
      {
        id: 'cap_enterprise_systems',
        domain: 'ORGANIZATIONAL',
        category: 'ENTERPRISE_SYSTEMS',
        name: 'Enterprise Architecture & Governance',
        description: 'Orchestrates enterprise multi-tenant routing, compliance controls, and service registries.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['deepseek-coder', 'gemini-3.6-flash'],
        supportedOrganizations: ['technology_company', 'keda', 'global']
      },
      {
        id: 'cap_research_systems',
        domain: 'ORGANIZATIONAL',
        category: 'RESEARCH_SYSTEMS',
        name: 'Scientific Research & Experimentation Engine',
        description: 'Manages experiment parameters, hypothesis tracking, dataset synthesis, and citation indexing.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.3', 'gemini-3.6-flash'],
        supportedOrganizations: ['university', 'global']
      },
      {
        id: 'cap_operational_automation',
        domain: 'ORGANIZATIONAL',
        category: 'OPERATIONAL_AUTOMATION',
        name: 'Operational Automation & Incident Response',
        description: 'Automates incident triage, status page updates, alert routing, and runbook execution.',
        status: 'CAPABILITY_EXECUTABLE',
        localAvailable: true,
        cloudAvailable: true,
        gpuRequired: false,
        requiredModels: ['llama3.2:3b', 'gemini-3.6-flash'],
        supportedOrganizations: ['keda', 'technology_company', 'global']
      }
    ];

    for (const c of caps) {
      this.capabilities.set(c.id, c);
    }
  }

  public getCapability(id: string): AnnyCapability | undefined {
    return this.capabilities.get(id);
  }

  public listCapabilities(orgScope?: OrganizationScope): AnnyCapability[] {
    const list = Array.from(this.capabilities.values());
    if (!orgScope) return list;
    return list.filter(c => c.supportedOrganizations.includes('global') || c.supportedOrganizations.includes(orgScope));
  }

  public listCapabilitiesByDomain(domain: CapabilityDomain, orgScope?: OrganizationScope): AnnyCapability[] {
    return this.listCapabilities(orgScope).filter(c => c.domain === domain);
  }

  public discoverCapabilitiesForPrompt(prompt: string, orgScope?: OrganizationScope): AnnyCapability[] {
    const p = prompt.toLowerCase();
    const all = this.listCapabilities(orgScope);
    const matched: AnnyCapability[] = [];

    // Keyword heuristics
    if (/music|song|beat|audio|sound|track|melody|vocal/i.test(p)) {
      matched.push(...all.filter(c => ['cap_music_gen', 'cap_song_production', 'cap_vocal_audio_workflow', 'cap_sound_design'].includes(c.id)));
    }
    if (/video|film|movie|cinematic|shot|storyboard/i.test(p)) {
      matched.push(...all.filter(c => ['cap_video_gen', 'cap_video_editing', 'cap_creative_post_production'].includes(c.id)));
    }
    if (/image|photo|art|picture|avatar|graphic|poster/i.test(p)) {
      matched.push(...all.filter(c => ['cap_image_gen', 'cap_image_editing', 'cap_photography_workflow'].includes(c.id)));
    }
    if (/3d|mesh|geometry|gltf|three\.js|shader/i.test(p)) {
      matched.push(...all.filter(c => ['cap_3d_gen', 'cap_3d_editing', 'cap_vfx'].includes(c.id)));
    }
    if (/aios|native window|manifest|desktop widget|system service/i.test(p)) {
      matched.push(...all.filter(c => c.domain === 'AIOS'));
    }
    if (/bank|wallet|payment|transaction|ledger|fintech/i.test(p)) {
      matched.push(...all.filter(c => ['cap_aios_financial_app', 'cap_financial_systems', 'cap_auth_sys', 'cap_security_sentinel'].includes(c.id)));
    }
    if (/university|course|syllabus|academic|gradebook|thesis/i.test(p)) {
      matched.push(...all.filter(c => ['cap_university_systems', 'cap_research_systems'].includes(c.id)));
    }
    if (/monitor|telemetry|metric|health|observability|keda/i.test(p)) {
      matched.push(...all.filter(c => ['cap_keda_monitoring', 'cap_aios_monitoring_app', 'cap_operational_automation'].includes(c.id)));
    }
    if (/security|vulnerability|audit|firewall|auth|rbac/i.test(p)) {
      matched.push(...all.filter(c => ['cap_security_sentinel', 'cap_auth_sys', 'cap_rbac_sys', 'cap_aios_security_app'].includes(c.id)));
    }
    if (/website|landing page|portfolio/i.test(p)) {
      matched.push(...all.filter(c => ['cap_website_gen', 'cap_testing', 'cap_devops'].includes(c.id)));
    }
    if (/app|application|dashboard|portal|platform/i.test(p)) {
      matched.push(...all.filter(c => ['cap_aios_native_app_gen', 'cap_webapp_gen', 'cap_api_gen', 'cap_db_design', 'cap_testing', 'cap_debugging'].includes(c.id)));
    }

    // Deduplicate
    const uniqueMap = new Map<string, AnnyCapability>();
    for (const c of matched) {
      uniqueMap.set(c.id, c);
    }

    // Default fallback if no specific keywords matched
    if (uniqueMap.size === 0) {
      const defaultCap = this.getCapability('cap_aios_native_app_gen') || this.getCapability('cap_webapp_gen');
      if (defaultCap) uniqueMap.set(defaultCap.id, defaultCap);
    }

    return Array.from(uniqueMap.values());
  }

  public async generateVideoArtifact(prompt: VideoGenerationPrompt): Promise<VideoGenerationArtifact> {
    const cap = this.getCapability('cap_video_gen');
    const now = new Date().toISOString();

    if (!cap || cap.status === 'CAPABILITY_UNAVAILABLE') {
      return {
        artifactId: `art_${Date.now()}`,
        promptId: prompt.promptId,
        status: 'UNSUPPORTED_PROVIDER',
        errorMessage: 'Video generation engine is not currently configured or GPU runner is offline.',
        timestamp: now
      };
    }

    // In offline/sandbox preview without physical GPU runner, report unexecuted capability cleanly
    return {
      artifactId: `art_${Date.now()}`,
      promptId: prompt.promptId,
      status: 'FAILED',
      errorMessage: 'Local GPU runner unavailable. Video generation requires configured external provider or local GPU node.',
      timestamp: now
    };
  }
}

export const organizationCapabilityRegistry = OrganizationCapabilityRegistry.getInstance();
export const annyOrganizationCapabilityRegistry = OrganizationCapabilityRegistry.getInstance();

