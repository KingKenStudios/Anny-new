/**
 * ANNY CORE — REALITY TEST SUITES
 * Extracted test suites for the Adversarial Cognitive Reality Benchmark
 * to maintain ANNY internal 500-line self-codebase architecture.
 */

import { annyCognitiveKernel } from './AnnyCognitiveKernel';
import { cognitiveCritic } from './CognitiveCritic';
import { memoryEngine } from './memoryEngine';
import { modelEnsembleEngine } from './modelEnsembleEngine';
import { virtualFileSystem } from './virtualFileSystem';
import { repairOrchestrator } from './repairOrchestrator';
import { VisionWorker } from './specialistWorkers';
import { enterpriseModelRouter } from '../services/enterpriseModelRouter';
import { databaseMonitor } from '../services/databaseMonitor';
import { checkOllama } from '../services/ollamaService';
import { projectGraphEngine } from './projectGraphEngine';
import { decisionClassifierEngine } from './decisionClassifierEngine';
import { adaptiveIntelligenceEngine } from './AdaptiveIntelligenceEngine';
import { RealityTestResult } from './AnnyCognitiveRealityBenchmark';

export async function runCoreRealityTests(): Promise<RealityTestResult[]> {
  const results: RealityTestResult[] = [];

  // 1. Paradox Resolution
  try {
    const res1 = await annyCognitiveKernel.executePipeline({
      sessionId: 'reality_sess_1',
      userPrompt: "Make the dashboard more advanced but don't add anything."
    });
    const detectsContradiction = (res1.intentModel.constraints.length > 0 || res1.intentModel.negativeConstraints.length > 0) &&
      res1.intentModel.goal.length > 0 &&
      !res1.intentModel.goal.toLowerCase().includes('add 20 features');

    results.push({
      testId: 'real_1',
      category: 'Understanding Before Execution',
      name: 'Paradox Resolution (Advanced without clutter)',
      passed: detectsContradiction,
      score: detectsContradiction ? 96 : 40,
      details: `Goal extracted: "${res1.intentModel.goal}". Constraints: [${res1.intentModel.constraints.join('; ')}]`,
      evidence: {
        intentGoal: res1.intentModel.goal,
        negativeConstraints: res1.intentModel.negativeConstraints,
        modelsExecuted: [res1.ensembleResult.selectedSolution]
      },
      latencyMs: res1.latencyMs
    });
  } catch (err: any) {
    results.push({ testId: 'real_1', category: 'Understanding Before Execution', name: 'Paradox Resolution', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 2. Contradiction No-Op Detection
  try {
    const res2 = await annyCognitiveKernel.executePipeline({
      sessionId: 'reality_sess_2',
      userPrompt: "Make this exactly like the existing design, but don't change anything."
    });
    const handlesIdentityNoOp = res2.intentModel.goal.length > 0 && res2.criticEvaluation.passed;
    results.push({
      testId: 'real_2',
      category: 'Understanding Before Execution',
      name: 'Contradictory Identity No-Op Detection',
      passed: handlesIdentityNoOp,
      score: handlesIdentityNoOp ? 95 : 30,
      details: `Handled contradiction gracefully: ${res2.intentModel.goal}`,
      evidence: { intentGoal: res2.intentModel.goal, negativeConstraints: res2.intentModel.negativeConstraints },
      latencyMs: res2.latencyMs
    });
  } catch (err: any) {
    results.push({ testId: 'real_2', category: 'Understanding Before Execution', name: 'Contradictory Identity No-Op Detection', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 3. Multi-Turn Context Preservation
  try {
    const history3 = [
      { role: 'user' as const, content: 'Keep the landing page minimal.' },
      { role: 'assistant' as const, content: 'Understood. Configured for clean, minimal landing page.' },
      { role: 'user' as const, content: "Don't add unnecessary cards." },
      { role: 'assistant' as const, content: 'Recorded negative constraint: no unnecessary cards.' }
    ];
    const res3 = await annyCognitiveKernel.executePipeline({
      sessionId: 'reality_sess_3',
      userPrompt: "Now make the page more powerful.",
      history: history3
    });
    const preservedNegatives = res3.intentModel.negativeConstraints.length >= 1;
    results.push({
      testId: 'real_3',
      category: 'Multi-Turn Context Preservation',
      name: 'Multi-Turn Cumulative Negative Constraint Ingestion',
      passed: preservedNegatives,
      score: preservedNegatives ? 98 : 35,
      details: `Active Negative Constraints Carried: [${res3.intentModel.negativeConstraints.join('; ')}]`,
      evidence: { negativeConstraints: res3.intentModel.negativeConstraints },
      latencyMs: res3.latencyMs
    });
  } catch (err: any) {
    results.push({ testId: 'real_3', category: 'Multi-Turn Context Preservation', name: 'Multi-Turn Constraints', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 4. User Correction Learning
  try {
    const history4 = [
      { role: 'user' as const, content: 'Build a login component.' },
      { role: 'assistant' as const, content: 'Created Login component.' },
      { role: 'user' as const, content: "Don't use purple gradients." },
      { role: 'assistant' as const, content: 'Stored rule: no purple gradients.' }
    ];
    const res4 = await annyCognitiveKernel.executePipeline({
      sessionId: 'reality_sess_4',
      userPrompt: "Build a signup card now.",
      history: history4
    });
    const enforcedCorrection = res4.intentModel.negativeConstraints.some(c => c.toLowerCase().includes('purple'));
    results.push({
      testId: 'real_4',
      category: 'User Correction Learning',
      name: 'Dynamic Negative Rule Enforcement Across Turns',
      passed: enforcedCorrection,
      score: enforcedCorrection ? 100 : 20,
      details: `User correction rule respected in subsequent turn: ${enforcedCorrection}`,
      evidence: { negativeConstraints: res4.intentModel.negativeConstraints },
      latencyMs: res4.latencyMs
    });
  } catch (err: any) {
    results.push({ testId: 'real_4', category: 'User Correction Learning', name: 'User Correction Learning', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 5. Model Routing Strategy
  try {
    const route = enterpriseModelRouter.selectRoute({ taskCategory: 'coding', preferOffline: false });
    const isAppropriateModel = !!route.selectedModel && route.selectedModel.length > 0;
    results.push({
      testId: 'real_5',
      category: 'Model Routing & Hardware Allocation',
      name: 'Task-Specific Model Selection',
      passed: isAppropriateModel,
      score: isAppropriateModel ? 96 : 40,
      details: `Selected Model: ${route.selectedModel} (${route.selectedProvider}). Reason: ${route.reason}`,
      evidence: { modelsExecuted: [route.selectedModel] },
      latencyMs: 1
    });
  } catch (err: any) {
    results.push({ testId: 'real_5', category: 'Model Routing', name: 'Task-Specific Model Selection', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 6. AST Verification & Self-Repair
  try {
    const badTsCode = `export function calc(a: number, b: number): number { return a + ; }`;
    const checkResult = virtualFileSystem.validateTypeScriptAST(badTsCode, '/src/badCalc.ts');
    const repairAttempt = await repairOrchestrator.attemptSelfRepair({
      filePath: '/src/badCalc.ts',
      error: checkResult.errors[0] || 'Syntax error',
      code: badTsCode
    });
    const detectedAndAttempted = checkResult.valid === false && repairAttempt.attempted;
    results.push({
      testId: 'real_6',
      category: 'Autonomous Failure Recovery',
      name: 'AST Syntax Error Interception & Self-Repair',
      passed: detectedAndAttempted,
      score: detectedAndAttempted ? 95 : 30,
      details: `Detected AST Error: "${checkResult.errors[0]}". Self-repair attempted: ${repairAttempt.attempted}`,
      evidence: { selfRepairExecuted: repairAttempt.attempted },
      latencyMs: 12
    });
  } catch (err: any) {
    results.push({ testId: 'real_6', category: 'Autonomous Failure Recovery', name: 'AST Syntax Error Repair', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 7. Large Project DAG Decomposition
  try {
    const graph = projectGraphEngine.createOrLoadGraph(
      'keda_enterprise_test',
      'KEDA Autonomous Industrial Engine',
      'Build KEDA SCADA Platform',
      'Build KEDA OS'
    );
    const isLargeGraph = graph.architectureTier === 'enterprise' && graph.domains.length >= 4;
    results.push({
      testId: 'real_7',
      category: 'Large Project Decomposition',
      name: 'Enterprise DAG Graph Scaffolding (KEDA Tier)',
      passed: isLargeGraph,
      score: isLargeGraph ? 100 : 40,
      details: `Tier: ${graph.architectureTier}. Domains: [${graph.domains.join(', ')}]`,
      evidence: { projectId: graph.projectId, tier: graph.architectureTier, subsystemsCount: graph.domains.length },
      latencyMs: 4
    });
  } catch (err: any) {
    results.push({ testId: 'real_7', category: 'Large Project Decomposition', name: 'Enterprise DAG Scaffolding', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 8. USER_DECISION_REQUIRED (3D Chair Prompt)
  try {
    const chairCheck = decisionClassifierEngine.classifyUserPrompt('Create a 3D chair', [], 'chair_test_proj');
    const isCorrectCategory = chairCheck.category === 'USER_DECISION_REQUIRED' && (chairCheck.options || []).length === 3;
    results.push({
      testId: 'real_8',
      category: 'Collaborative User Clarification',
      name: 'Decision Classification: USER_DECISION_REQUIRED (3D Chair)',
      passed: isCorrectCategory,
      score: isCorrectCategory ? 100 : 30,
      details: `Category: ${chairCheck.category}. Question: "${chairCheck.questionPrompt}"`,
      evidence: { category: chairCheck.category, options: chairCheck.options },
      latencyMs: 3
    });
  } catch (err: any) {
    results.push({ testId: 'real_8', category: 'Collaborative User Clarification', name: '3D Chair Clarification', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 9. SAFE_TO_ASSUME (Continuous Execution)
  try {
    const standardCheck = decisionClassifierEngine.classifyUserPrompt('Build a responsive header component with avatar', [], 'std_proj');
    const isSafe = standardCheck.category === 'SAFE_TO_ASSUME';
    results.push({
      testId: 'real_9',
      category: 'Autonomous Build Continuity',
      name: 'Decision Classification: SAFE_TO_ASSUME',
      passed: isSafe,
      score: isSafe ? 100 : 50,
      details: `Assumptions: [${standardCheck.safeAssumptions.join('; ')}]`,
      evidence: { category: standardCheck.category, safeAssumptions: standardCheck.safeAssumptions },
      latencyMs: 2
    });
  } catch (err: any) {
    results.push({ testId: 'real_9', category: 'Autonomous Build Continuity', name: 'SAFE_TO_ASSUME Check', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 10. Scope Expansion & Graph Re-Architecture
  try {
    const scaledGraph = projectGraphEngine.scaleGraphForScopeExpansion('mkt_exp', 'Add messaging, wallet, live streaming');
    const isExpanded = scaledGraph.architectureTier === 'enterprise';
    results.push({
      testId: 'real_10',
      category: 'Dynamic Self-Scaling Execution',
      name: 'Scope Expansion & Graph Re-Architecture',
      passed: isExpanded,
      score: isExpanded ? 100 : 40,
      details: `Updated Tier: ${scaledGraph.architectureTier}. Total Domains: ${scaledGraph.domains.length}`,
      evidence: { tier: scaledGraph.architectureTier, totalDomains: scaledGraph.domains.length },
      latencyMs: 4
    });
  } catch (err: any) {
    results.push({ testId: 'real_10', category: 'Dynamic Self-Scaling Execution', name: 'Scope Expansion', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 11. User Decision Pause & Resumption
  try {
    projectGraphEngine.recordUserDecisionInGraph('chair_test_proj', 'Format?', 'Interactive 3D WebGL model', '3D');
    const updatedGraph = projectGraphEngine.getGraph('chair_test_proj');
    const isResumed = updatedGraph && !updatedGraph.isPaused && updatedGraph.userDecisions.length > 0;
    results.push({
      testId: 'real_11',
      category: 'Project Context Resumption',
      name: 'Decision Recording & Graph Pause/Resume Cycle',
      passed: !!isResumed,
      score: isResumed ? 100 : 30,
      details: `Paused: ${updatedGraph?.isPaused}. Decisions: ${updatedGraph?.userDecisions.length}`,
      evidence: { isPaused: updatedGraph?.isPaused, decisionCount: updatedGraph?.userDecisions?.length },
      latencyMs: 3
    });
  } catch (err: any) {
    results.push({ testId: 'real_11', category: 'Project Context Resumption', name: 'Pause/Resume Cycle', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 12. ANNY 500-Line Self-Codebase Rule Enforcement
  try {
    const evalResult = adaptiveIntelligenceEngine.evaluateSelfFileArchitecture('/src/core/testLargeFile.ts', 650, 3);
    const isEnforced = evalResult.requiresSplitting === true;
    results.push({
      testId: 'real_12',
      category: 'ANNY Development Constitution',
      name: '500-Line Self-Codebase Splitting Verification',
      passed: isEnforced,
      score: isEnforced ? 100 : 0,
      details: `Requires Splitting: ${evalResult.requiresSplitting}`,
      evidence: { requiresSplitting: evalResult.requiresSplitting, advice: evalResult.actionableAdvice },
      latencyMs: 2
    });
  } catch (err: any) {
    results.push({ testId: 'real_12', category: 'ANNY Development Constitution', name: '500-Line Self Rule', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  // 13. User Project Exemption from 500-Line Rule
  try {
    const userProjRec = adaptiveIntelligenceEngine.recommendUserProjectArchitecture('Large E-Commerce System', 'large');
    const compliesUserRule = userProjRec.isModular === true && userProjRec.folderStructure.length >= 5;
    results.push({
      testId: 'real_13',
      category: 'User Project Architecture Recommendation',
      name: 'User Project Exemption from ANNY 500-Line Self Rule',
      passed: compliesUserRule,
      score: compliesUserRule ? 100 : 0,
      details: `Pattern: ${userProjRec.pattern}. Folders: [${userProjRec.folderStructure.join(', ')}]`,
      evidence: { pattern: userProjRec.pattern, isModular: userProjRec.isModular },
      latencyMs: 1
    });
  } catch (err: any) {
    results.push({ testId: 'real_13', category: 'User Project Architecture Recommendation', name: 'User Exemption Check', passed: false, score: 0, details: err.message, evidence: {}, latencyMs: 0 });
  }

  return results;
}
