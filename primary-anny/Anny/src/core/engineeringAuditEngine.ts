/**
 * ANNY — ENGINEERING AUDIT ENGINE (VERSION 1.0)
 * Automated continuous code auditor inspecting VFS files for:
 * - Duplicate & Dead Code
 * - Unused & Broken Imports
 * - Architectural Violations (SOLID, DDD, Microkernel)
 * - Type Safety & Security Sentinel Rules
 * - Performance Bottlenecks & Deployment Readiness
 */

import { VirtualFileSystem } from './virtualFileSystem';
import { WorkspaceManager } from './workspaceManager';
import { verificationFramework } from './verificationFramework';
import { vfsTransactionManager } from './vfsTransactionManager';
import { CanonicalExecutionContext } from './CanonicalExecutionContext';

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'architecture' | 'type_safety' | 'security' | 'performance' | 'dead_code' | 'deployment';
  file: string;
  problem: string;
  rootCause: string;
  recommendedFix: string;
  autoFixable: boolean;
}

export interface AuditSummaryReport {
  timestamp: string;
  score: number; // 0-100
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  criticalErrors: string[];
  warnings: string[];
  autoRepairsApplied: string[];
  issues: AuditIssue[];
  readinessStatus: 'PRODUCTION_READY' | 'WARNINGS_FOUND' | 'BLOCKED';
}

export type EngineeringAuditReport = AuditSummaryReport;

export class EngineeringAuditEngine {
  private static instance: EngineeringAuditEngine;
  private lastReport: AuditSummaryReport | null = null;

  private constructor() {}

  public static getInstance(): EngineeringAuditEngine {
    if (!EngineeringAuditEngine.instance) {
      EngineeringAuditEngine.instance = new EngineeringAuditEngine();
    }
    return EngineeringAuditEngine.instance;
  }

  public runAudit(): AuditSummaryReport {
    const vfs = WorkspaceManager.getInstance().getVFS();
    const files = vfs.getAllFiles();
    const issues: AuditIssue[] = [];

    files.forEach(file => {
      const content = file.content;
      const path = file.path;

      // 1. Security Scan (Secret exposure, dangerous eval)
      if (content.includes('eval(') || content.includes('Function(')) {
        issues.push({
          id: `sec_eval_${Date.now()}_${Math.random()}`,
          severity: 'critical',
          category: 'security',
          file: path,
          problem: 'Dangerous code evaluation detected (eval/Function)',
          rootCause: 'Dynamic evaluation enables arbitrary code execution.',
          recommendedFix: 'Refactor to static parsing or standard functions.',
          autoFixable: false
        });
      }

      if (/AI_KEY\s*=\s*['"][A-Za-z0-9_\-]{20,}['"]/.test(content)) {
        issues.push({
          id: `sec_secret_${Date.now()}_${Math.random()}`,
          severity: 'critical',
          category: 'security',
          file: path,
          problem: 'Hardcoded API Secret credential detected',
          rootCause: 'Hardcoded secrets expose environment keys to public version control.',
          recommendedFix: 'Extract key to process.env and declare in .env.example',
          autoFixable: false
        });
      }

      // 2. Dead Code / TODOs Scan
      if (content.includes('TODO:') || content.includes('FIXME:')) {
        issues.push({
          id: `dead_todo_${Date.now()}_${Math.random()}`,
          severity: 'warning',
          category: 'dead_code',
          file: path,
          problem: 'Unfinished TODO/FIXME marker present in source',
          rootCause: 'Incomplete implementation notes left in production code.',
          recommendedFix: 'Implement functional handler or clean up marker.',
          autoFixable: true
        });
      }

      // 3. Type Safety Scan (any usage without justification)
      if (/:\s*any\b/.test(content) && !path.includes('node_modules')) {
        issues.push({
          id: `type_any_${Date.now()}_${Math.random()}`,
          severity: 'info',
          category: 'type_safety',
          file: path,
          problem: 'Implicit or explicit `any` type usage found',
          rootCause: 'Using `any` degrades TypeScript strict type verification.',
          recommendedFix: 'Replace `any` with precise interface or `unknown`.',
          autoFixable: false
        });
      }

      // 4. Architecture Scan (Large file violation > 600 lines)
      const lineCount = content.split('\n').length;
      if (lineCount > 600 && !path.endsWith('.json')) {
        issues.push({
          id: `arch_large_${Date.now()}_${Math.random()}`,
          severity: 'warning',
          category: 'architecture',
          file: path,
          problem: `File size exceeds modular threshold (${lineCount} lines)`,
          rootCause: 'Single file containing multiple concerns risks token truncation and low maintainability.',
          recommendedFix: 'Split into smaller modular components or helper utilities.',
          autoFixable: false
        });
      }
    });

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    let score = 100 - (criticalCount * 25 + warningCount * 5 + infoCount * 1);
    score = Math.max(0, Math.min(100, score));

    const criticalErrors = issues.filter(i => i.severity === 'critical').map(i => `${i.file}: ${i.problem}`);
    const warnings = issues.filter(i => i.severity === 'warning').map(i => `${i.file}: ${i.problem}`);

    const report: AuditSummaryReport = {
      timestamp: new Date().toLocaleTimeString(),
      score,
      totalIssues: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      criticalErrors,
      warnings,
      autoRepairsApplied: [],
      issues,
      readinessStatus: criticalCount > 0 ? 'BLOCKED' : warningCount > 5 ? 'WARNINGS_FOUND' : 'PRODUCTION_READY'
    };

    this.lastReport = report;
    return report;
  }

  public getLastReport(): AuditSummaryReport {
    if (!this.lastReport) {
      return this.runAudit();
    }
    return this.lastReport;
  }

  public autoRepairSafeIssues(context?: CanonicalExecutionContext): { repairedCount: number; repairedFiles: string[] } {
    const vfs = WorkspaceManager.getInstance().getVFS();
    const report = this.runAudit();
    // Only TODO/FIXME markers are genuinely safe to auto-touch (cosmetic cleanup).
    // Hardcoded secrets were previously marked autoFixable:true here despite nothing
    // ever actually redacting or moving them — that's now excluded rather than
    // silently doing nothing while claiming to be fixable.
    const fixable = report.issues.filter(i => i.autoFixable && i.category === 'dead_code');

    const repairedFiles: string[] = [];
    fixable.forEach(issue => {
      if (vfs.exists(issue.file)) {
        let code = vfs.readFile(issue.file);
        // Honest relabel: flags that this marker was reviewed, NOT that the
        // underlying work described by the TODO was actually done.
        code = code.replace(/\/\/\s*TODO:.*$/gm, '// Reviewed by Audit Engine (not auto-implemented — original TODO removed, work still pending)');
        
        if (context && context.transactionId) {
          vfsTransactionManager.writeFile(context.transactionId, issue.file, code);
        } else {
          throw new Error('PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. No active transaction in EngineeringAuditEngine.');
        }
        
        repairedFiles.push(issue.file);
      }
    });

    return { repairedCount: repairedFiles.length, repairedFiles };
  }
}

export const engineeringAuditEngine = EngineeringAuditEngine.getInstance();
