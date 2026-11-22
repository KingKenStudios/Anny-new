/**
 * ANNY CORE — PROJECT GRAPH ENGINE (PHASE 32)
 * Manages persistent execution graphs for large projects (e.g. KEDA, AIOS, Enterprise Systems).
 * Tracks domains, subsystems, file DAGs, database requirements, user decisions,
 * and smart next-step suggestions across multi-stage collaborative execution.
 */

import { memoryEngine } from './memoryEngine';
import { systemBus } from './systemBus';

export type ArchitectureTier = 'simple' | 'medium' | 'large' | 'enterprise';
export type SubsystemStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'verified' | 'failed';

export interface UserDecisionRecord {
  decisionId: string;
  question: string;
  options?: string[];
  userChoice: string;
  category: string;
  timestamp: string;
}

export interface SubsystemNode {
  name: string;
  domain: string;
  status: SubsystemStatus;
  dependencies: string[];
  filesCreated: string[];
  description: string;
}

export interface ProjectFileRecord {
  filePath: string;
  domain: string;
  lineCount: number;
  status: 'draft' | 'compiled' | 'verified';
  updatedAt: string;
}

export interface ProjectGraph {
  projectId: string;
  projectName: string;
  objective: string;
  requirements: string[];
  constraints: string[];
  negativeConstraints: string[];
  architectureTier: ArchitectureTier;
  domains: string[];
  subsystems: Map<string, SubsystemNode> | Record<string, SubsystemNode>;
  dependenciesDAG: Array<{ from: string; to: string }>;
  files: Map<string, ProjectFileRecord> | Record<string, ProjectFileRecord>;
  databaseRequirements: {
    type: string;
    schemas: string[];
    tables: string[];
  };
  apiEndpoints: Array<{ path: string; method: string; description: string }>;
  assets: Array<{ name: string; type: string; path: string }>;
  modelsUsed: string[];
  tests: Array<{ testName: string; status: 'passed' | 'failed' | 'pending'; score: number }>;
  verificationState: {
    astVerified: boolean;
    runtimeMounted: boolean;
    overallScore: number;
    status: 'VERIFIED' | 'IN_PROGRESS' | 'FAILED';
  };
  workSummary: {
    completedWork: string[];
    pendingWork: string[];
    blockedWork: string[];
  };
  userDecisions: UserDecisionRecord[];
  nextRecommendedAction: string;
  isPaused: boolean;
  pauseReason?: string;
  pauseOptions?: string[];
  updatedAt: string;
}

export class ProjectGraphEngine {
  private static instance: ProjectGraphEngine;
  private activeGraphs: Map<string, ProjectGraph> = new Map();

  public static getInstance(): ProjectGraphEngine {
    if (!ProjectGraphEngine.instance) {
      ProjectGraphEngine.instance = new ProjectGraphEngine();
    }
    return ProjectGraphEngine.instance;
  }

  public getGraph(projectId: string): ProjectGraph | undefined {
    let graph = this.activeGraphs.get(projectId);
    if (!graph) {
      const stored = memoryEngine.getFact(`graph_${projectId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          graph = this.normalizeGraphData(parsed);
          this.activeGraphs.set(projectId, graph);
        } catch (e) {
          console.warn(`[ProjectGraphEngine] Failed to parse stored graph for ${projectId}`);
        }
      }
    }
    return graph;
  }

  public saveGraph(graph: ProjectGraph): void {
    graph.updatedAt = new Date().toISOString();
    this.activeGraphs.set(graph.projectId, graph);

    // Serialize Maps to plain objects for JSON storage
    const serializable = {
      ...graph,
      subsystems: graph.subsystems instanceof Map ? Object.fromEntries(graph.subsystems) : graph.subsystems,
      files: graph.files instanceof Map ? Object.fromEntries(graph.files) : graph.files
    };

    memoryEngine.setFact(`graph_${graph.projectId}`, JSON.stringify(serializable), 'project_graph');
    systemBus.publish('WorkspaceUpdated', 'ProjectGraphEngine', { projectId: graph.projectId, tier: graph.architectureTier });
  }

  public createOrLoadGraph(
    projectId: string,
    projectName: string,
    objective: string,
    prompt: string,
    history: any[] = []
  ): ProjectGraph {
    let graph = this.getGraph(projectId);
    if (graph) {
      return graph;
    }

    const lower = prompt.toLowerCase();
    let tier: ArchitectureTier = 'simple';
    if (lower.includes('keda') || lower.includes('aios') || lower.includes('enterprise') || lower.includes('operating system') || lower.includes('social network')) {
      tier = 'enterprise';
    } else if (lower.includes('marketplace') || lower.includes('3d') || lower.includes('scada') || lower.includes('dashboard') || lower.includes('platform')) {
      tier = 'large';
    } else if (lower.includes('auth') || lower.includes('database') || lower.includes('crud') || lower.includes('api')) {
      tier = 'medium';
    }

    const domains = this.determineDomains(tier, lower);
    const subsystemsMap = new Map<string, SubsystemNode>();

    domains.forEach((dom, idx) => {
      subsystemsMap.set(dom, {
        name: dom,
        domain: dom,
        status: idx === 0 ? 'in_progress' : 'pending',
        dependencies: idx > 0 ? [domains[idx - 1]] : [],
        filesCreated: [],
        description: `Subsystem module for ${dom}`
      });
    });

    graph = {
      projectId,
      projectName,
      objective,
      requirements: [prompt],
      constraints: ['TypeScript AST Safe', 'Offline Capable'],
      negativeConstraints: [],
      architectureTier: tier,
      domains,
      subsystems: subsystemsMap,
      dependenciesDAG: domains.slice(1).map((d, i) => ({ from: domains[i], to: d })),
      files: new Map<string, ProjectFileRecord>(),
      databaseRequirements: {
        type: tier === 'enterprise' || tier === 'large' ? 'PostgreSQL' : 'IndexedDB / Local',
        schemas: ['users', 'projects', 'logs'],
        tables: ['users_table', 'system_logs']
      },
      apiEndpoints: [
        { path: '/api/health', method: 'GET', description: 'System health probe' }
      ],
      assets: [],
      modelsUsed: ['gemini-3.6-flash'],
      tests: [],
      verificationState: {
        astVerified: true,
        runtimeMounted: true,
        overallScore: 100,
        status: 'IN_PROGRESS'
      },
      workSummary: {
        completedWork: [],
        pendingWork: domains,
        blockedWork: []
      },
      userDecisions: [],
      nextRecommendedAction: `Initialize core architectural scaffolding for ${domains[0]}`,
      isPaused: false,
      updatedAt: new Date().toISOString()
    };

    this.saveGraph(graph);
    return graph;
  }

  public updateSubsystemStatus(projectId: string, subsystemName: string, status: SubsystemStatus, files: string[] = []): void {
    const graph = this.getGraph(projectId);
    if (!graph) return;

    const subMap = this.getSubsystemsMap(graph);
    const sub = subMap.get(subsystemName);
    if (sub) {
      sub.status = status;
      sub.filesCreated = Array.from(new Set([...sub.filesCreated, ...files]));
      subMap.set(subsystemName, sub);
    }

    // Update work summary
    const completed: string[] = [];
    const pending: string[] = [];
    const blocked: string[] = [];

    subMap.forEach((node, key) => {
      if (node.status === 'completed' || node.status === 'verified') completed.push(key);
      else if (node.status === 'blocked' || node.status === 'failed') blocked.push(key);
      else pending.push(key);
    });

    graph.workSummary.completedWork = completed;
    graph.workSummary.pendingWork = pending;
    graph.workSummary.blockedWork = blocked;

    graph.nextRecommendedAction = this.calculateNextAction(graph);
    this.saveGraph(graph);
  }

  public recordUserDecisionInGraph(projectId: string, question: string, choice: string, category: string = 'general'): void {
    const graph = this.getGraph(projectId);
    if (!graph) return;

    const decisionRecord: UserDecisionRecord = {
      decisionId: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question,
      userChoice: choice,
      category,
      timestamp: new Date().toISOString()
    };

    graph.userDecisions.push(decisionRecord);
    graph.isPaused = false;
    graph.pauseReason = undefined;
    graph.pauseOptions = undefined;

    this.saveGraph(graph);
  }

  public pauseForUserDecision(projectId: string, question: string, options: string[]): void {
    const graph = this.getGraph(projectId);
    if (!graph) return;

    graph.isPaused = true;
    graph.pauseReason = question;
    graph.pauseOptions = options;
    this.saveGraph(graph);
  }

  public scaleGraphForScopeExpansion(projectId: string, newRequirementPrompt: string): ProjectGraph {
    let graph = this.getGraph(projectId);
    if (!graph) {
      return this.createOrLoadGraph(projectId, 'Scaled Project', newRequirementPrompt, newRequirementPrompt);
    }

    graph.requirements.push(newRequirementPrompt);
    graph.architectureTier = 'enterprise';

    const newDomains = ['Social Matrix', 'Realtime Messaging', 'Digital Wallet', 'AI Analytics'];
    newDomains.forEach(nd => {
      if (!graph!.domains.includes(nd)) {
        graph!.domains.push(nd);
      }
    });

    const subMap = this.getSubsystemsMap(graph);
    newDomains.forEach(nd => {
      if (!subMap.has(nd)) {
        subMap.set(nd, {
          name: nd,
          domain: nd,
          status: 'pending',
          dependencies: [graph!.domains[0]],
          filesCreated: [],
          description: `Expanded domain subsystem: ${nd}`
        });
      }
    });

    graph.nextRecommendedAction = `Incorporate expanded domain [${newDomains[0]}] into current architecture DAG while preserving existing working modules.`;
    this.saveGraph(graph);
    return graph;
  }

  private determineDomains(tier: ArchitectureTier, lowerPrompt: string): string[] {
    if (tier === 'enterprise') {
      return ['Neural Core Pipeline', 'Authentication & LOTO Security', 'PostgreSQL Data Layer', 'Realtime Event Bus', 'SCADA / Robotics Control', 'React Dashboard UI'];
    }
    if (tier === 'large') {
      return ['Domain Architecture', 'Database & Models', 'API Gateway', 'Interactive UI / 3D Canvas'];
    }
    if (tier === 'medium') {
      return ['Core Business Logic', 'Data Store', 'User Interface'];
    }
    return ['Single View App'];
  }

  private calculateNextAction(graph: ProjectGraph): string {
    const pending = graph.workSummary.pendingWork;
    if (pending.length === 0) {
      return 'All subsystems completed and verified under Cognitive Kernel. Ready for continuous optimization.';
    }
    return `Proceed with next pending subsystem module: [${pending[0]}]`;
  }

  private getSubsystemsMap(graph: ProjectGraph): Map<string, SubsystemNode> {
    if (graph.subsystems instanceof Map) {
      return graph.subsystems;
    }
    const map = new Map<string, SubsystemNode>();
    if (graph.subsystems && typeof graph.subsystems === 'object') {
      Object.entries(graph.subsystems).forEach(([k, v]) => map.set(k, v));
    }
    graph.subsystems = map;
    return map;
  }

  private normalizeGraphData(parsed: any): ProjectGraph {
    const subMap = new Map<string, SubsystemNode>();
    if (parsed.subsystems) {
      Object.entries(parsed.subsystems).forEach(([k, v]) => subMap.set(k, v as SubsystemNode));
    }

    const fileMap = new Map<string, ProjectFileRecord>();
    if (parsed.files) {
      Object.entries(parsed.files).forEach(([k, v]) => fileMap.set(k, v as ProjectFileRecord));
    }

    return {
      ...parsed,
      subsystems: subMap,
      files: fileMap
    };
  }
}

export const projectGraphEngine = ProjectGraphEngine.getInstance();
