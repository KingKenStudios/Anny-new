/**
 * ANNY ENTERPRISE ARCHITECTURE - MULTI-AGENT INTELLIGENCE SYSTEM & REGISTRY
 * Defines full agent workforce hierarchy across Executive, Management, Architecture, Engineering, QA, Security, Creative, Business, and Support layers.
 * Implements strict orchestrator communication protocols, agent marketplace, and self-improvement tracking.
 */

export type AgentLayer = 
  | 'executive'
  | 'management'
  | 'architecture'
  | 'engineering'
  | 'quality'
  | 'creative'
  | 'business'
  | 'support';

export interface AgentDescriptor {
  id: string;
  name: string;
  role: string;
  layer: AgentLayer;
  description: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'busy' | 'offline';
  isThirdPartyPlugin?: boolean;
}

export class AgentRegistrySystem {
  private static instance: AgentRegistrySystem;
  private agents: Map<string, AgentDescriptor> = new Map();

  public static getInstance(): AgentRegistrySystem {
    if (!AgentRegistrySystem.instance) {
      AgentRegistrySystem.instance = new AgentRegistrySystem();
      AgentRegistrySystem.instance.bootstrapDefaultWorkforce();
    }
    return AgentRegistrySystem.instance;
  }

  private bootstrapDefaultWorkforce(): void {
    const workforce: AgentDescriptor[] = [
      // Executive Layer
      { id: 'ceo', name: 'CEO Agent', role: 'Chief Executive Officer', layer: 'executive', description: 'Understands business goals, approves strategy, delegates work, and signs off on project completion.', capabilities: ['goal_alignment', 'delegation', 'final_approval'], status: 'active' },

      // Management Layer
      { id: 'pm', name: 'Project Manager Agent', role: 'Milestone & Dependency Lead', layer: 'management', description: 'Decomposes projects into milestones, manages dependencies, estimates duration, and generates status reports.', capabilities: ['milestone_planning', 'dependency_tracking', 'progress_reports'], status: 'active' },

      // Architecture Layer
      { id: 'software_architect', name: 'Software Architect', role: 'System & Microservices Design', layer: 'architecture', description: 'Defines folder structures, technology stacks, scalability plans, and API contracts.', capabilities: ['microservice_design', 'api_contracts', 'system_topology'], status: 'active' },
      { id: 'db_architect', name: 'Database Architect', role: 'Schema & Indexing Lead', layer: 'architecture', description: 'Designs relational PostgreSQL/Drizzle and Firestore NoSQL schemas, indexes, and migrations.', capabilities: ['schema_design', 'query_optimization', 'migrations'], status: 'active' },
      { id: 'security_architect', name: 'Security Architect', role: 'LOTO & Injection Shield', layer: 'architecture', description: 'Enforces RBAC, prompt injection defense, secret sanitization, and SCADA LOTO safety protocols.', capabilities: ['loto_safety', 'prompt_injection_shield', 'secret_redaction'], status: 'active' },

      // Engineering Layer
      { id: 'frontend_eng', name: 'Frontend Engineer', role: 'React / Next / Vue Lead', layer: 'engineering', description: 'Creates modern, responsive, accessible single-view & dashboard UIs using Tailwind CSS.', capabilities: ['react_components', 'tailwind_styling', 'ui_responsiveness'], status: 'active' },
      { id: 'backend_eng', name: 'Backend Engineer', role: 'Node.js / Express / Fastify Lead', layer: 'engineering', description: 'Builds robust REST APIs, WebSockets, background job queues, and middleware.', capabilities: ['express_routes', 'websocket_sync', 'middleware'], status: 'active' },
      { id: 'mobile_eng', name: 'Mobile Engineer', role: 'Flutter / React Native Lead', layer: 'engineering', description: 'Builds cross-platform Android & iOS mobile viewports and native device bridges.', capabilities: ['flutter_ui', 'react_native', 'mobile_viewports'], status: 'active' },
      { id: 'devops_eng', name: 'DevOps & Infrastructure Engineer', role: 'Docker / Cloud Run Lead', layer: 'engineering', description: 'Configures container builds, dockerfiles, Coolify/Cloud Run deployments, and CI/CD pipelines.', capabilities: ['docker_containers', 'cloud_deployment', 'cicd'], status: 'active' },

      // Quality Layer
      { id: 'qa_eng', name: 'QA Engineer', role: 'Automated Test Suite Lead', layer: 'quality', description: 'Generates unit tests, integration tests, E2E regression tests, and static lint checks.', capabilities: ['unit_tests', 'e2e_testing', 'lint_validation'], status: 'active' },
      { id: 'security_auditor', name: 'Security Auditor', role: 'Vulnerability Scanner', layer: 'quality', description: 'Audits generated code for XSS, SQLi, CSRF, prompt injections, and hardcoded secrets.', capabilities: ['vulnerability_scan', 'secret_audit', 'sanitization'], status: 'active' },

      // Creative Layer
      { id: 'ui_designer', name: 'UI / Motion Designer', role: 'Visual & Aesthetic Lead', layer: 'creative', description: 'Crafts high-contrast light/dark themes, mathematical spacing, and Framer Motion layout transitions.', capabilities: ['visual_hierarchy', 'theme_design', 'micro_interactions'], status: 'active' },

      // Business & Support Layer
      { id: 'tech_writer', name: 'Technical Documentation Writer', role: 'Docs & API Manual Lead', layer: 'business', description: 'Produces OpenAPI docs, developer READMEs, architecture guides, and user manuals.', capabilities: ['readme_generation', 'openapi_docs', 'architecture_diagrams'], status: 'active' },
      { id: 'research_agent', name: 'Research & RAG Agent', role: 'Deep Knowledge Search', layer: 'support', description: 'Retrieves external API docs, vector memory embeddings, and best practice frameworks.', capabilities: ['vector_search', 'rag_retrieval', 'api_research'], status: 'active' },

      // Specialized Domain Intelligence Layer (Architecture, Broadcast & Media Platforms)
      { id: 'architectural_designer', name: 'Architectural Design Intelligence', role: 'Residential & Commercial Spatial Planner', layer: 'architecture', description: 'Generates non-overlapping spatial layouts, passive cooling orientations, SVG blueprints, AutoCAD DXF R12 exports, room/door/window schedules, and preliminary BOQ guidance.', capabilities: ['floor_plan_svg', 'autocad_dxf_r12', 'passive_climate_planning', 'preliminary_boq'], status: 'active' },
      { id: 'broadcast_director', name: 'TV & Radio Broadcast Brain', role: 'EPG, Rundown & Stream Config Lead', layer: 'creative', description: 'Builds 24h EPG grids, control-room rundowns, presenter scripts, Icecast2 XML, Liquidsoap .liq, and FFmpeg RTMP/HLS ingest configs.', capabilities: ['epg_scheduling', 'rundown_scripting', 'icecast_liquidsoap_ffmpeg'], status: 'active' },
      { id: 'music_distribution_lead', name: 'Music Distribution & Metadata Lead', role: 'ISRC/UPC, Royalty & DDEX Prep', layer: 'business', description: 'Validates ISRC, mathematical mod-10 UPC/EAN check digits, 100% royalty splits, >=3000px artwork specs, and prepares DDEX ERN JSON packages.', capabilities: ['isrc_upc_validation', 'royalty_split_verification', 'ddex_package_prep'], status: 'active' },
      { id: 'video_streaming_architect', name: 'Video Streaming & ABR Architect', role: 'HLS/DASH Transcoding & Platform Lead', layer: 'engineering', description: 'Designs multi-bitrate FFmpeg ABR ladders (1080p–360p), WebVTT caption tracks, MinIO/S3 ingest pipelines, and QoE telemetry schemas.', capabilities: ['ffmpeg_abr_ladder', 'webvtt_captions', 'vod_platform_architecture'], status: 'active' }
    ];

    for (const agent of workforce) {
      this.agents.set(agent.id, agent);
    }
  }

  public getAgent(id: string): AgentDescriptor | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): AgentDescriptor[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByLayer(layer: AgentLayer): AgentDescriptor[] {
    return this.getAllAgents().filter(a => a.layer === layer);
  }

  public registerPluginAgent(agent: AgentDescriptor): void {
    agent.isThirdPartyPlugin = true;
    this.agents.set(agent.id, agent);
    console.log(`[AGENT MARKETPLACE] Registered third-party agent plugin: ${agent.name} (${agent.id})`);
  }
}

export const agentRegistry = AgentRegistrySystem.getInstance();
