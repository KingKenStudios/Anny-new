/**
 * ANNY CORE — ADAPTIVE INTELLIGENCE EVALUATOR
 * Extracted evaluation, self-architecture, and proposal methods
 * to maintain ANNY internal 500-line self-codebase architecture.
 */

import { memoryEngine } from './memoryEngine';
import { ImprovementProposal, IntelligenceDashboardTelemetry } from './adaptiveIntelligenceTypes';

export function evaluateSelfFileArchitecture(
  filePath: string,
  lineCount: number,
  responsibilityCount: number = 1
): {
  requiresSplitting: boolean;
  reason: string;
  actionableAdvice: string;
} {
  if (lineCount > 500 || responsibilityCount > 2) {
    return {
      requiresSplitting: true,
      reason: `File ${filePath} (${lineCount} lines, ${responsibilityCount} responsibilities) exceeds ANNY internal modular limit (500 lines max).`,
      actionableAdvice: `Extract secondary responsibilities into dedicated submodules in the appropriate directory and update imports.`
    };
  }

  return {
    requiresSplitting: false,
    reason: `File ${filePath} (${lineCount} lines) complies with ANNY internal modular standards.`,
    actionableAdvice: `Maintain single-responsibility structure.`
  };
}

export function recommendUserProjectArchitecture(
  projectGoal: string,
  scope: 'tiny' | 'medium' | 'large' | 'enterprise'
): {
  pattern: string;
  folderStructure: string[];
  isModular: boolean;
  rationale: string;
} {
  if (scope === 'tiny') {
    return {
      pattern: 'Single-View Modular Client Component (React + Tailwind)',
      folderStructure: ['/src/App.tsx', '/src/components/', '/src/types.ts'],
      isModular: false,
      rationale: 'Simple utility or single-screen concept remains lightweight and highly focused.'
    };
  }

  if (scope === 'medium') {
    return {
      pattern: 'Modular Multi-Component Client Architecture',
      folderStructure: ['/src/App.tsx', '/src/components/', '/src/hooks/', '/src/services/', '/src/types.ts'],
      isModular: true,
      rationale: 'Balanced modular separation for features, state management, and service calls.'
    };
  }

  return {
    pattern: 'Enterprise Domain-Driven Hexagonal Architecture (DDD + Microservices)',
    folderStructure: [
      '/src/core/',
      '/src/domains/auth/',
      '/src/domains/billing/',
      '/src/domains/analytics/',
      '/src/services/',
      '/src/workers/',
      '/src/components/ui/',
      '/src/components/views/',
      '/src/db/schema.ts',
      '/server.ts',
      '/docker-compose.yml'
    ],
    isModular: true,
    rationale: 'Enterprise-grade domain separation, dedicated services, background workers, and persistent state management.'
  };
}

export function deconstructLargeProject(
  projectName: string,
  goal: string,
  complexity: 'High' | 'Enterprise'
): {
  stages: Array<{ stageName: string; steps: string[]; status: string }>;
  persistentStateKey: string;
  totalSubsystems: number;
} {
  const key = `large_proj_state_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const stages = [
    { stageName: 'Understand & Intent Clarification', steps: ['Analyze user requirements', 'Identify key domain entities', 'Validate technical constraints'], status: 'completed' },
    { stageName: 'Decompose & Subsystem Mapping', steps: ['Map core services', 'Identify database entities', 'Draft API contract'], status: 'completed' },
    { stageName: 'Architect & Tech Selection', steps: ['Select DDD Hexagonal pattern', 'Define VFS tree layout', 'Configure database schemas'], status: 'completed' },
    { stageName: 'Plan & Execution Graph', steps: ['Construct dependency DAG', 'Sequence file generation', 'Set verification gates'], status: 'completed' },
    { stageName: 'Build & AST Synthesis', steps: ['Synthesize core backend', 'Generate UI components', 'Integrate service bridges'], status: 'in_progress' },
    { stageName: 'Test & Verification', steps: ['TypeScript AST verification', 'Runtime mount checks', 'Security audit'], status: 'pending' },
    { stageName: 'Repair & Self-Correction', steps: ['Autonomous error interception', 'Apply targeted AST repair'], status: 'pending' },
    { stageName: 'Continuous Execution', steps: ['Mount live preview', 'Persist workspace state', 'Track completed subsystems'], status: 'pending' }
  ];

  memoryEngine.setFact(key, JSON.stringify({ projectName, goal, stages, timestamp: Date.now() }), 'large_project');

  return {
    stages,
    persistentStateKey: key,
    totalSubsystems: 8
  };
}
