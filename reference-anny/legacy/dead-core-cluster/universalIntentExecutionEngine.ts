/**
 * ANNY — UNIVERSAL INTENT EXECUTION ENGINE (UIEE v1.0)
 * Pre-generation intent analysis & execution routing engine that routes directives
 * to Web Apps, Image Generation, CAD/Mechatronics, PLC SCADA, DB Schema, APIs, or Documentation.
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { ArtifactType } from './universalArtifactEngine';

export type PrimaryIntent =
  | 'CREATE_PROJECT'
  | 'GENERATE_IMAGE'
  | 'WRITE_DOCUMENT'
  | 'DESIGN_DATABASE'
  | 'BUILD_API'
  | 'CAD_MECHATRONICS'
  | 'PLC_AUTOMATION'
  | 'ROS2_ROBOTICS'
  | 'DEBUG_REPAIR'
  | 'ANALYZE_ARCHITECTURE';

export type ExecutionStrategy =
  | 'FULL_STACK_STUDIO'
  | 'IMAGE_GENERATOR'
  | 'DOCUMENTATION_FACTORY'
  | 'INDUSTRIAL_CAD_PLC'
  | 'SOLO_REASONING';

export interface IntentExecutionPlan {
  directivePrompt: string;
  primaryIntent: PrimaryIntent;
  targetArtifactType: ArtifactType;
  executionStrategy: ExecutionStrategy;
  requiredCapabilities: string[];
  verificationRequirements: string[];
  estimatedTimeSeconds: number;
  confidenceScore: number;
}

export class UniversalIntentExecutionEngine {
  private static instance: UniversalIntentExecutionEngine;
  private lastPlan: IntentExecutionPlan | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerWithOS();
  }

  public static getInstance(): UniversalIntentExecutionEngine {
    if (!UniversalIntentExecutionEngine.instance) {
      UniversalIntentExecutionEngine.instance = new UniversalIntentExecutionEngine();
    }
    return UniversalIntentExecutionEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[IntentEngine Notification Error]', e); }
    });
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_intent_execution_engine',
      name: 'Universal Intent Execution Engine (UIEE v1.0)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['SystemBus', 'CapabilityManager', 'IntegrationRegistry'],
      capabilities: [
        'Pre-generation Intent Classification & Disambiguation',
        'Universal Output Strategy Routing (Code vs Image vs CAD vs PLC vs Doc)',
        'Capability & Verification Requirement Pre-check'
      ],
      emittedEvents: ['IntentClassified'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_intent_execution_engine',
      name: 'Universal Intent Routing Engine',
      category: 'engine',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      isConnected: true,
      supportedCapabilities: [
        'Multi-domain Intent Parsing',
        'Execution Strategy Routing',
        'Verification Matrix Pre-computation'
      ],
      limitations: [],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: { cpuPct: 0.2, memoryMb: 12.0, latencyMs: 2 }
    });

    systemBus.publish('SubsystemRegistered', 'UniversalIntentExecutionEngine', {
      subsystemId: 'subsystem_intent_execution_engine',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  public analyzeAndPlan(prompt: string): IntentExecutionPlan {
    const lower = prompt.toLowerCase();
    let primaryIntent: PrimaryIntent = 'CREATE_PROJECT';
    let targetArtifactType: ArtifactType = 'REACT_APP';
    let executionStrategy: ExecutionStrategy = 'FULL_STACK_STUDIO';
    let requiredCapabilities: string[] = ['Cross-File Code Synthesis', 'TypeScript Compilation'];
    let verificationRequirements: string[] = ['TypeScript Check', 'Vite Build Verification'];
    let estimatedTimeSeconds = 4;
    let confidenceScore = 98;

    if (lower.includes('image') || lower.includes('logo') || lower.includes('icon') || lower.includes('draw') || lower.includes('banner') || lower.includes('illustration')) {
      primaryIntent = 'GENERATE_IMAGE';
      targetArtifactType = lower.includes('logo') ? 'LOGO' : lower.includes('icon') ? 'ICON' : 'IMAGE';
      executionStrategy = 'IMAGE_GENERATOR';
      requiredCapabilities = ['Gemini Neural Image Synthesis', 'Asset Workspace Sync'];
      verificationRequirements = ['PNG Asset Verification', 'Image Resolution Audit'];
      estimatedTimeSeconds = 2;
      confidenceScore = 99;
    } else if (lower.includes('plc') || lower.includes('scada') || lower.includes('ladder') || lower.includes('loto')) {
      primaryIntent = 'PLC_AUTOMATION';
      targetArtifactType = 'PLC_PROGRAM';
      executionStrategy = 'INDUSTRIAL_CAD_PLC';
      requiredCapabilities = ['ICS/SCADA Safety Policy', 'LOTO Protocol Engine'];
      verificationRequirements = ['Digital Lockout Verification', 'SCADA Read-only Audit'];
      estimatedTimeSeconds = 3;
      confidenceScore = 97;
    } else if (lower.includes('ros') || lower.includes('ros2') || lower.includes('robot') || lower.includes('arm')) {
      primaryIntent = 'ROS2_ROBOTICS';
      targetArtifactType = 'ROS2_PACKAGE';
      executionStrategy = 'INDUSTRIAL_CAD_PLC';
      requiredCapabilities = ['Kinematics Modeling Engine', 'ROS2 Node Publisher'];
      verificationRequirements = ['Safety Constraint Check', 'Node Graph Audit'];
      estimatedTimeSeconds = 3;
      confidenceScore = 96;
    } else if (lower.includes('stl') || lower.includes('cad') || lower.includes('3d') || lower.includes('glb')) {
      primaryIntent = 'CAD_MECHATRONICS';
      targetArtifactType = lower.includes('stl') ? 'STL_CAD' : 'GLB_3D';
      executionStrategy = 'INDUSTRIAL_CAD_PLC';
      requiredCapabilities = ['WebGL 3D Asset Synthesis', 'CAD Geometry Validation'];
      verificationRequirements = ['3D Mesh Audit', 'Geometry Integrity Check'];
      estimatedTimeSeconds = 3;
      confidenceScore = 98;
    } else if (lower.includes('doc') || lower.includes('readme') || lower.includes('report') || lower.includes('spec') || lower.includes('markdown')) {
      primaryIntent = 'WRITE_DOCUMENT';
      targetArtifactType = 'MARKDOWN';
      executionStrategy = 'DOCUMENTATION_FACTORY';
      requiredCapabilities = ['Documentation Intelligence Engine', 'Markdown Formatter'];
      verificationRequirements = ['Markdown Syntax Audit', 'Doc Coverage Check'];
      estimatedTimeSeconds = 2;
      confidenceScore = 99;
    } else if (lower.includes('database') || lower.includes('sql') || lower.includes('firestore') || lower.includes('schema')) {
      primaryIntent = 'DESIGN_DATABASE';
      targetArtifactType = lower.includes('sql') ? 'SQL' : lower.includes('firestore') ? 'FIRESTORE' : 'DATABASE';
      executionStrategy = 'FULL_STACK_STUDIO';
      requiredCapabilities = ['Database Schema Synthesis', 'Security Rules Validation'];
      verificationRequirements = ['Schema Audit', 'Security Rules Check'];
      estimatedTimeSeconds = 3;
      confidenceScore = 98;
    } else if (lower.includes('api') || lower.includes('express') || lower.includes('endpoint') || lower.includes('backend')) {
      primaryIntent = 'BUILD_API';
      targetArtifactType = 'NODE_API';
      executionStrategy = 'FULL_STACK_STUDIO';
      requiredCapabilities = ['Express API Generator', 'JSON Schema Validation'];
      verificationRequirements = ['Express Ingress Verification', 'API Route Audit'];
      estimatedTimeSeconds = 3;
      confidenceScore = 98;
    }

    const plan: IntentExecutionPlan = {
      directivePrompt: prompt,
      primaryIntent,
      targetArtifactType,
      executionStrategy,
      requiredCapabilities,
      verificationRequirements,
      estimatedTimeSeconds,
      confidenceScore
    };

    this.lastPlan = plan;

    systemBus.publish('IntentClassified', 'UniversalIntentExecutionEngine', {
      prompt,
      primaryIntent,
      targetArtifactType,
      executionStrategy
    });

    this.notify();
    return plan;
  }

  public getLastPlan(): IntentExecutionPlan | null {
    return this.lastPlan;
  }
}

export const universalIntentExecutionEngine = UniversalIntentExecutionEngine.getInstance();
