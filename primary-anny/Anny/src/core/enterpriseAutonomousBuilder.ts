/**
 * ANNY — ENTERPRISE AUTONOMOUS BUILDER PLATFORM (EABP v1.0)
 * Core OS Pipeline orchestrating Requirements, Architecture, Tech Selection,
 * Task Graph Execution, File Generation, Compilation & Verification,
 * Testing, Autonomous Debugging, Deployment, and Health Metrics.
 */

import { VirtualFileSystem, VFSFileNode } from './virtualFileSystem';
import { WorkspaceManager, CompilationResult } from './workspaceManager';
import { ExecutionLogEntry } from './runtimeExecutionPlatform';
import { runtimeBridge } from './runtimeBridge';
import { CanonicalExecutionContext } from './CanonicalExecutionContext';
import { vfsTransactionManager } from './vfsTransactionManager';
import { synthesizeAppFiles } from './realAppCodeSynthesizer';
import { systemBus } from './systemBus';


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RequirementSpec {
  userGoal: string;
  businessRequirements: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  estimatedComplexity: 'Low' | 'Medium' | 'High' | 'Enterprise';
  identifiedRisks: string[];
}

export type ArchitecturePattern =
  | 'Clean Architecture'
  | 'Domain-Driven Design (DDD)'
  | 'Hexagonal Architecture'
  | 'Microservices'
  | 'Monolith'
  | 'Serverless'
  | 'MVC'
  | 'CQRS & Event-Driven'
  | 'Offline-First';

export interface TechStackConfig {
  frontend: 'React' | 'Next.js' | 'Vue' | 'Angular' | 'Svelte' | 'Solid' | 'Flutter' | 'Tauri';
  backend: 'Node Express' | 'NestJS' | 'FastAPI' | 'Django' | 'Go Gin' | 'Rust Actix' | 'Spring Boot';
  database: 'PostgreSQL' | 'MySQL' | 'SQLite' | 'MongoDB' | 'Redis' | 'Firestore' | 'ClickHouse';
  containerization: 'Docker' | 'Docker Compose' | 'Kubernetes' | 'Cloud Run';
}

export interface ExecutionGraphNode {
  id: string;
  stage: 'Intent' | 'Requirements' | 'Architecture' | 'Tasks' | 'Files' | 'Compilation' | 'Repair' | 'Testing' | 'Preview' | 'Deployment';
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details: string;
  timestamp: string;
  logs: string[];
}

export interface SystemHealthReport {
  subsystemName: string;
  version: string;
  health: 'healthy' | 'degraded' | 'critical';
  status: 'online' | 'offline' | 'recovering';
  cpuUsagePct: number | null;
  memoryMb: number | null;
  capabilities: string[];
  limitations: string[];
  lastTestTime: string;
  repairCount: number;
}

export function classifyEABPVerification(
  structureCheckPassed: boolean,
  runtimeSucceeded: boolean,
  previewVerified: boolean
): Pick<EABPBuildResult, 'testPassRatePct' | 'healthScore' | 'verificationLevel' | 'runtimeStatus' | 'deploymentStatus'> {
  return {
    testPassRatePct: null,
    healthScore: null,
    verificationLevel: structureCheckPassed ? 'STRUCTURE_CHECK_ONLY' : 'FAILED',
    runtimeStatus: runtimeSucceeded && previewVerified ? 'VERIFIED' : runtimeSucceeded ? 'SIMULATED' : 'UNAVAILABLE',
    deploymentStatus: 'PLAN_ONLY'
  };
}

export interface EABPBuildResult {
  projectId: string;
  projectName: string;
  requirements: RequirementSpec;
  architecturePattern: ArchitecturePattern;
  techStack: TechStackConfig;
  graph: ExecutionGraphNode[];
  generatedFilesCount: number;
  compilationResult: CompilationResult;
  /** null until a real test suite is executed. */
  testPassRatePct: number | null;
  /** null until a real build/test/runtime health measurement is available. */
  healthScore: number | null;
  verificationLevel: 'STRUCTURE_CHECK_ONLY' | 'FAILED';
  runtimeStatus: 'UNAVAILABLE' | 'SIMULATED' | 'VERIFIED';
  deploymentStatus: 'PLAN_ONLY' | 'DEPLOYED';
  deploymentTarget: string;
  liveUrl: string;
}

// ============================================================================
// ENTERPRISE AUTONOMOUS BUILDER ENGINE
// ============================================================================

export class EnterpriseAutonomousBuilderPlatform {
  private static instance: EnterpriseAutonomousBuilderPlatform;
  private currentGraph: ExecutionGraphNode[] = [];
  private subsystemReports: Map<string, SystemHealthReport> = new Map();
  private eventListeners: Set<() => void> = new Set();

  private constructor() {
    this.registerSubsystemCapabilities();
  }

  public static getInstance(): EnterpriseAutonomousBuilderPlatform {
    if (!EnterpriseAutonomousBuilderPlatform.instance) {
      EnterpriseAutonomousBuilderPlatform.instance = new EnterpriseAutonomousBuilderPlatform();
    }
    return EnterpriseAutonomousBuilderPlatform.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notify(): void {
    this.eventListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[EABP Listener Error]', e); }
    });
  }

  public getSubsystemHealthReports(): SystemHealthReport[] {
    return Array.from(this.subsystemReports.values());
  }

  public getCurrentGraph(): ExecutionGraphNode[] {
    return this.currentGraph;
  }

  // --- Subsystem Capability Registry ---
  private registerSubsystemCapabilities(): void {
    const now = new Date().toLocaleTimeString();

    this.subsystemReports.set('VFS', {
      subsystemName: 'Virtual FileSystem (VFS)',
      version: '1.0.0',
      health: 'degraded',
      status: 'online',
      cpuUsagePct: null,
      memoryMb: null,
      capabilities: ['Hierarchical Tree', 'In-memory CRUD', 'Path Normalization', 'Event Watching'],
      limitations: ['Storage persistence depends on configured browser/server adapter; no live telemetry probe is attached.'],
      lastTestTime: now,
      repairCount: 0
    });

    this.subsystemReports.set('Workspace', {
      subsystemName: 'Workspace Manager',
      version: '1.0.0',
      health: 'degraded',
      status: 'online',
      cpuUsagePct: null,
      memoryMb: null,
      capabilities: ['State Isolation', 'Multi-workspace Orchestration', 'Lightweight bracket-structure validation'],
      limitations: ['Structure check is not a full AST parse, TypeScript compile, test run, or production build; no live telemetry probe is attached.'],
      lastTestTime: now,
      repairCount: 0
    });

    this.subsystemReports.set('Runtime', {
      subsystemName: 'Runtime Execution Platform',
      version: '1.0.0',
      health: 'degraded',
      status: 'offline',
      cpuUsagePct: null,
      memoryMb: null,
      capabilities: ['Framework detection', 'Simulated lifecycle state', 'Transaction-backed structural repair heuristic'],
      limitations: ['No real process is launched; CPU, memory, uptime, and port telemetry are unavailable.'],
      lastTestTime: now,
      repairCount: 0
    });

    this.subsystemReports.set('IntentRouter', {
      subsystemName: 'Pre-LLM Intent Router',
      version: '1.0.0',
      health: 'degraded',
      status: 'online',
      cpuUsagePct: null,
      memoryMb: null,
      capabilities: ['Rule-based intent classification', 'Execution mode routing metadata'],
      limitations: ['No independent intent-routing accuracy benchmark is currently attached; live telemetry unavailable.'],
      lastTestTime: now,
      repairCount: 0
    });

    this.subsystemReports.set('EABP', {
      subsystemName: 'Enterprise Autonomous Builder Platform',
      version: '1.0.0',
      health: 'degraded',
      status: 'online',
      cpuUsagePct: null,
      memoryMb: null,
      capabilities: ['Requirement heuristics', 'Architecture selection', 'AI source synthesis', 'Lightweight structure check', 'Heuristic repair planning'],
      limitations: ['Tests are not executed; no real compiler/build, process launch, deployment, or verified health score is produced. Runtime and hardware metrics unavailable.'],
      lastTestTime: now,
      repairCount: 0
    });
  }

  // --- Requirements Analyzer Engine ---
  public analyzeRequirements(prompt: string): RequirementSpec {
    const isEnterprise = /enterprise|bank|scada|keda|ecosystem|scale/i.test(prompt);

    return {
      userGoal: prompt,
      businessRequirements: [
        'Deliver robust business functionality aligned with user intent',
        'Provide offline-first fault tolerance and operational state tracking',
        'Ensure real-time user feedback with responsive interface controls'
      ],
      userStories: [
        'As a user, I can interact with the system dashboard seamlessly',
        'As an administrator, I can inspect system health and runtime metrics',
        'As a operator, I can execute automation commands with feedback'
      ],
      acceptanceCriteria: [
        'Zero syntax compilation errors',
        'Render interactive UI inside Vite dev server iframe',
        'Maintain clean responsive layout across desktop and mobile'
      ],
      functionalRequirements: [
        'Core domain state management',
        'Real-time data visualization or status tracking',
        'Interactive control forms and action triggers'
      ],
      nonFunctionalRequirements: [
        'WCAG AA Accessibility contrast standards',
        'Sub-100ms UI interaction latency',
        'Zero breaking dependency conflicts'
      ],
      estimatedComplexity: isEnterprise ? 'Enterprise' : 'High',
      identifiedRisks: [
        'State divergence during rapid hot-reloads',
        'Unresolved async promise rejections in client runtime'
      ]
    };
  }

  // --- Architecture & Tech Stack Selection Engine ---
  public selectArchitecture(prompt: string): { pattern: ArchitecturePattern; techStack: TechStackConfig } {
    let pattern: ArchitecturePattern = 'Clean Architecture';
    let techStack: TechStackConfig = {
      frontend: 'React',
      backend: 'Node Express',
      database: 'PostgreSQL',
      containerization: 'Docker Compose'
    };

    if (/scada|plc|industrial|mechatronics/i.test(prompt)) {
      pattern = 'CQRS & Event-Driven';
      techStack.backend = 'FastAPI';
      techStack.database = 'ClickHouse';
    } else if (/bank|fintech|keda/i.test(prompt)) {
      pattern = 'Domain-Driven Design (DDD)';
      techStack.backend = 'Node Express';
      techStack.database = 'PostgreSQL';
    } else if (/offline|robot/i.test(prompt)) {
      pattern = 'Offline-First';
      techStack.database = 'SQLite';
    }

    return { pattern, techStack };
  }

  // --- Full Pipeline Execution Engine ---
  public async executePipeline(
    prompt: string,
    onProgress: (stage: string, log: string) => void,
    context?: CanonicalExecutionContext
  ): Promise<EABPBuildResult> {
    const startTime = performance.now();
    this.currentGraph = [];

    const addGraphNode = (
      stage: ExecutionGraphNode['stage'],
      title: string,
      details: string,
      status: ExecutionGraphNode['status'] = 'in_progress',
      logs: string[] = []
    ): ExecutionGraphNode => {
      const node: ExecutionGraphNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        stage,
        title,
        status,
        details,
        timestamp: new Date().toLocaleTimeString(),
        logs
      };
      this.currentGraph.push(node);
      this.notify();
      return node;
    };

    systemBus.publish('BuildStarted', 'EnterpriseAutonomousBuilder', { prompt, stage: 'Intent' });
    let activeTransactionId: string | undefined;

    const emitStage = (stage: string, msg: string) => {
      onProgress(stage, msg);
      systemBus.publish('BuildStageChanged', 'EnterpriseAutonomousBuilder', { stage });
    };

    try {
      // Stage 1: Intent & Analysis
      emitStage('Intent', 'Analyzing prompt and classifying intent...');
      const nodeIntent = addGraphNode('Intent', 'Pre-LLM Intent Classification', 'Routed to Enterprise Autonomous Builder Platform');
      nodeIntent.status = 'completed';

      // Stage 2: Requirements Analysis
      emitStage('Requirements', 'Extracting business requirements & acceptance criteria...');
      const reqs = this.analyzeRequirements(prompt);
      const nodeReq = addGraphNode('Requirements', 'Requirement Analysis', `Extracted ${reqs.userStories.length} user stories and acceptance criteria.`);
      nodeReq.status = 'completed';

      // Stage 3: Architecture & Tech Selection
      emitStage('Architecture', 'Design pattern selection & stack planning...');
      const { pattern, techStack } = this.selectArchitecture(prompt);
      const nodeArch = addGraphNode('Architecture', `Architecture: ${pattern}`, `Frontend: ${techStack.frontend} | Backend: ${techStack.backend} | DB: ${techStack.database}`);
      nodeArch.status = 'completed';

      // Stage 4: File Generation & VFS Registration
      emitStage('Files', 'Synthesizing source files, manifests, Docker & CI/CD configs...');
      const wsManager = WorkspaceManager.getInstance();
      const projectId = `eabp_${Date.now()}`;
      const projectName = prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt;
      const organizationId = context?.organizationId || 'global';
      const sessionId = context?.sessionId || `eabp_session_${projectId}`;
      const vfs = wsManager.switchWorkspace(projectId, projectName, organizationId, 'fullstack');
      activeTransactionId = await vfsTransactionManager.begin(projectId, sessionId, organizationId);

      // Delegate source generation to the same canonical real-project synthesizer
      // used by Normal ANNY. This prevents the enterprise builder from creating a
      // second canned-template universe.
      const synthesis = await synthesizeAppFiles(prompt, {}, {
        generationId: projectId,
        projectId,
        updateExisting: false
      });
      for (const [filePath, content] of Object.entries(synthesis.files)) {
        vfsTransactionManager.writeFile(activeTransactionId, filePath, content);
      }
      const allFiles = vfs.getAllFiles();

      const nodeFiles = addGraphNode('Files', 'Enterprise File Generation', `Generated ${allFiles.length} real project files from the current request.`);
      nodeFiles.status = 'completed';

      // Stage 5: Compilation AST & Syntax Validation
      emitStage('Structure Check', 'Running lightweight bracket-structure validation (not a compiler or test suite)...');
      let compilation = wsManager.compileWorkspace();
      const nodeComp = addGraphNode('Compilation', 'Lightweight Structure Check', compilation.success ? `Structure check passed in ${compilation.buildTimeMs}ms; no compiler/tests executed.` : `Found ${compilation.errors.length} structure issue(s).`);

      // Stage 6: Autonomous Repair Loop
      if (!compilation.success) {
        nodeComp.status = 'failed';
        this.notify();

        emitStage('Repair', 'Attempting a limited bracket-structure repair heuristic...');
        const nodeRepair = addGraphNode('Repair', 'Structure Repair Heuristic', 'Only simple bracket issues are considered; this is not a general self-healing engine.');

        // Auto-repair files
        compilation.errors.forEach(err => {
          if (vfs.exists(err.file)) {
            let content = vfs.readFile(err.file);
            if (err.message.includes('Unclosed') || err.message.includes('Unmatched')) {
              content += '\n// Auto-repair patch applied by EABP\n';
              vfsTransactionManager.writeFile(activeTransactionId, err.file, content);
            }
          }
        });

        compilation = wsManager.compileWorkspace();
        nodeRepair.status = compilation.success ? 'completed' : 'failed';
        nodeRepair.details = compilation.success ? 'Lightweight bracket-structure check passed after the limited repair heuristic; no compiler/tests executed.' : 'Structure issues remain; no general repair was performed.';
        this.notify();
      } else {
        nodeComp.status = 'completed';
        this.notify();
      }

      // Stage 7: Runtime availability & preview route
      emitStage('Runtime', 'Checking for an actual runtime provider and selecting a preview route...');
      const bridgeExec = await runtimeBridge.executeProject({
        projectId,
        port: 3000
      });
      const previewConfig = runtimeBridge.selectPreviewProvider(techStack.frontend.toLowerCase(), projectId, 3000);
      const runtimeVerified = bridgeExec.success && previewConfig.isLive;

      const nodeRuntime = addGraphNode(
        'Preview',
        `Runtime Provider: ${bridgeExec.providerName}`,
        runtimeVerified
          ? `Runtime verified via ${previewConfig.providerName} at ${previewConfig.activeUrl}`
          : bridgeExec.success
            ? `Provider returned success but preview is not independently verified. Route: ${previewConfig.providerName}; ${previewConfig.activeUrl || 'no live URL'}`
            : `Runtime unavailable: ${bridgeExec.errorMessage || 'No verified runtime provider'}; preview route ${previewConfig.providerName} is unverified.``
      );
      nodeRuntime.status = runtimeVerified ? 'completed' : 'failed';
      this.notify();

      // Stage 8: Deployment Spec Generation
      emitStage('Deployment Planning', 'Selecting a deployment target; no deployment manifests or cloud resources will be created...');
      const nodeDeploy = addGraphNode('Deployment', 'Deployment Plan Only', `Target selected: ${techStack.containerization}. Manifests were not generated and nothing was deployed.`);
      nodeDeploy.status = 'completed';
      this.notify();

      const verification = classifyEABPVerification(compilation.success, bridgeExec.success, runtimeVerified);
      const buildResult: EABPBuildResult = {
        projectId,
        projectName,
        requirements: reqs,
        architecturePattern: pattern,
        techStack,
        graph: this.currentGraph,
        generatedFilesCount: allFiles.length,
        compilationResult: compilation,
        ...verification,
        deploymentTarget: techStack.containerization,
        liveUrl: runtimeVerified ? (previewConfig.activeUrl || '') : ''
      };

      await vfsTransactionManager.commit(activeTransactionId);
      activeTransactionId = undefined;
      onProgress('Completed', 'Project source synthesis and lightweight structure validation completed. Tests, real runtime, and deployment remain unverified.');
      systemBus.publish('BuildCompleted', 'EnterpriseAutonomousBuilder', {
        projectId,
        fileCount: allFiles.length,
        verificationLevel: buildResult.verificationLevel,
        runtimeStatus: buildResult.runtimeStatus,
        testsExecuted: false,
        deploymentStatus: buildResult.deploymentStatus
      });
      return buildResult;
    } catch (err: any) {
      if (activeTransactionId) {
        try { await vfsTransactionManager.rollback(activeTransactionId); } catch (rollbackError) {
          console.error('[EABP] Transaction rollback failed:', rollbackError);
        }
      }
      this.currentGraph.forEach(node => {
        if (node.status === 'in_progress') node.status = 'failed';
      });
      this.notify();
      systemBus.publish('BuildFailed', 'EnterpriseAutonomousBuilder', { error: err?.message || 'EABP build failed' });
      throw err;
    }
  }


}

export const enterpriseAutonomousBuilder = EnterpriseAutonomousBuilderPlatform.getInstance();
