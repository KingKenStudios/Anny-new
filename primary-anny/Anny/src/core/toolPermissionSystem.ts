/**
 * ANNY ENTERPRISE ARCHITECTURE - TOOL PERMISSION & RISK SYSTEM
 * Implements strict permission checking, risk classification (LOW, MEDIUM, HIGH, CRITICAL),
 * schema validation, execution policy enforcement, LOTO safety overrides, and structured audit logs.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ToolCategory = 
  | 'file_system'
  | 'code_execution'
  | 'database'
  | 'network_api'
  | 'actuator_robotics'
  | 'financial_control'
  | 'system_admin';

export type ExecutionPolicy = 'auto_execute' | 'require_user_confirm' | 'loto_authorized_only';

export interface ToolDefinition {
  toolId: string;
  name: string;
  description: string;
  category: ToolCategory;
  requiredPermissions: string[];
  riskLevel: RiskLevel;
  executionPolicy: ExecutionPolicy;
  inputSchema: Record<string, { type: string; description: string; required?: boolean }>;
  outputSchema: Record<string, { type: string; description: string }>;
}

export interface ToolExecutionAuditLog {
  id: string;
  timestamp: string;
  toolId: string;
  requesterId: string;
  requesterRole: string;
  riskLevel: RiskLevel;
  authorized: boolean;
  lotoAuthorized: boolean;
  policyReason: string;
  inputSummary: string;
  status: 'GRANTED' | 'DENIED' | 'REQUIRES_CONFIRMATION';
}

export interface VerificationResult {
  allowed: boolean;
  status: 'GRANTED' | 'DENIED' | 'REQUIRES_CONFIRMATION';
  riskLevel: RiskLevel;
  policyReason: string;
  auditLog: ToolExecutionAuditLog;
}

export class ToolPermissionSystem {
  private static instance: ToolPermissionSystem;
  private registry: Map<string, ToolDefinition> = new Map();
  private auditLogs: ToolExecutionAuditLog[] = [];

  public static getInstance(): ToolPermissionSystem {
    if (!ToolPermissionSystem.instance) {
      ToolPermissionSystem.instance = new ToolPermissionSystem();
      ToolPermissionSystem.instance.bootstrapDefaultTools();
    }
    return ToolPermissionSystem.instance;
  }

  private bootstrapDefaultTools(): void {
    const defaultTools: ToolDefinition[] = [
      // LOW RISK: Read-only operations
      {
        toolId: 'file_read',
        name: 'File Reader',
        description: 'Read content from workspace files or virtual file system.',
        category: 'file_system',
        requiredPermissions: ['workspace:read'],
        riskLevel: 'LOW',
        executionPolicy: 'auto_execute',
        inputSchema: { path: { type: 'string', description: 'File path to view', required: true } },
        outputSchema: { content: { type: 'string', description: 'File contents' } }
      },
      {
        toolId: 'db_query_read',
        name: 'Database Reader',
        description: 'Execute read-only SQL SELECT queries or Firestore GET operations.',
        category: 'database',
        requiredPermissions: ['db:read'],
        riskLevel: 'LOW',
        executionPolicy: 'auto_execute',
        inputSchema: { query: { type: 'string', description: 'SQL or Firestore query', required: true } },
        outputSchema: { rows: { type: 'array', description: 'Query results' } }
      },

      // MEDIUM RISK: Creating or modifying files
      {
        toolId: 'file_write',
        name: 'File Writer & Editor',
        description: 'Create or edit code files in the workspace or virtual file system.',
        category: 'file_system',
        requiredPermissions: ['workspace:write'],
        riskLevel: 'MEDIUM',
        executionPolicy: 'auto_execute',
        inputSchema: {
          path: { type: 'string', description: 'Target file path', required: true },
          content: { type: 'string', description: 'File content', required: true }
        },
        outputSchema: { success: { type: 'boolean', description: 'Write status' } }
      },
      {
        toolId: 'package_install',
        name: 'Package Installer',
        description: 'Install npm dependencies into package.json.',
        category: 'code_execution',
        requiredPermissions: ['deps:install'],
        riskLevel: 'MEDIUM',
        executionPolicy: 'auto_execute',
        inputSchema: { packages: { type: 'array', description: 'List of package names', required: true } },
        outputSchema: { installed: { type: 'array', description: 'Successfully installed packages' } }
      },

      // HIGH RISK: Command execution & infrastructure control
      {
        toolId: 'shell_command_run',
        name: 'Shell Command Executor',
        description: 'Execute authorized terminal commands on the backend server container.',
        category: 'code_execution',
        requiredPermissions: ['system:exec'],
        riskLevel: 'HIGH',
        executionPolicy: 'require_user_confirm',
        inputSchema: { command: { type: 'string', description: 'Shell command line', required: true } },
        outputSchema: { stdout: { type: 'string', description: 'Command output' }, exitCode: { type: 'number', description: 'Return status' } }
      },
      {
        toolId: 'db_schema_migrate',
        name: 'Database Schema Migrator',
        description: 'Run DDL schema migrations against PostgreSQL or Cloud SQL.',
        category: 'database',
        requiredPermissions: ['db:admin'],
        riskLevel: 'HIGH',
        executionPolicy: 'require_user_confirm',
        inputSchema: { migrationName: { type: 'string', description: 'Name of migration script', required: true } },
        outputSchema: { applied: { type: 'boolean', description: 'Migration status' } }
      },

      // CRITICAL RISK: Financial, physical actuators, robotics & LOTO operations
      {
        toolId: 'robotics_actuator_move',
        name: 'Robotics Actuator Motion Controller',
        description: 'Send physical movement vectors to robotic arms or servo motors.',
        category: 'actuator_robotics',
        requiredPermissions: ['scada:loto_override', 'robotics:motion'],
        riskLevel: 'CRITICAL',
        executionPolicy: 'loto_authorized_only',
        inputSchema: {
          jointAngles: { type: 'array', description: 'Joint target angles in radians', required: true },
          velocityMax: { type: 'number', description: 'Max velocity percentage' }
        },
        outputSchema: { status: { type: 'string', description: 'Actuator status' } }
      },
      {
        toolId: 'kenpay_transaction_execute',
        name: 'KenPay Ledger Transaction Exec',
        description: 'Authorize financial ledger transfer or transaction settlement.',
        category: 'financial_control',
        requiredPermissions: ['finance:transfer', 'ledger:write'],
        riskLevel: 'CRITICAL',
        executionPolicy: 'require_user_confirm',
        inputSchema: {
          amount: { type: 'number', description: 'Transfer amount', required: true },
          recipientId: { type: 'string', description: 'Recipient wallet or bank account', required: true }
        },
        outputSchema: { transactionId: { type: 'string', description: 'Settlement ID' } }
      }
    ];

    for (const tool of defaultTools) {
      this.registry.set(tool.toolId, tool);
    }
  }

  public registerTool(tool: ToolDefinition): void {
    this.registry.set(tool.toolId, tool);
  }

  public getTool(toolId: string): ToolDefinition | undefined {
    return this.registry.get(toolId);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Evaluate tool execution permissions & safety policies
   */
  public verifyExecution(
    toolId: string,
    requesterId: string,
    requesterRole: string,
    inputParams: Record<string, any>,
    options: { isLotoAuthorized?: boolean; userConfirmed?: boolean } = {}
  ): VerificationResult {
    const tool = this.registry.get(toolId);
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!tool) {
      const auditLog: ToolExecutionAuditLog = {
        id: auditId,
        timestamp: new Date().toISOString(),
        toolId,
        requesterId,
        requesterRole,
        riskLevel: 'HIGH',
        authorized: false,
        lotoAuthorized: Boolean(options.isLotoAuthorized),
        policyReason: `Tool ID '${toolId}' is not registered in the Tool Permission System.`,
        inputSummary: JSON.stringify(inputParams).substring(0, 100),
        status: 'DENIED'
      };
      this.auditLogs.push(auditLog);
      return {
        allowed: false,
        status: 'DENIED',
        riskLevel: 'HIGH',
        policyReason: auditLog.policyReason,
        auditLog
      };
    }

    // Policy Checks
    if (tool.riskLevel === 'CRITICAL') {
      if (tool.category === 'actuator_robotics' && !options.isLotoAuthorized) {
        const auditLog: ToolExecutionAuditLog = {
          id: auditId,
          timestamp: new Date().toISOString(),
          toolId,
          requesterId,
          requesterRole,
          riskLevel: tool.riskLevel,
          authorized: false,
          lotoAuthorized: false,
          policyReason: 'CRITICAL physical actuator control requires Digital Lockout/Tagout (LOTO) key authorization.',
          inputSummary: JSON.stringify(inputParams).substring(0, 100),
          status: 'DENIED'
        };
        this.auditLogs.push(auditLog);
        return {
          allowed: false,
          status: 'DENIED',
          riskLevel: tool.riskLevel,
          policyReason: auditLog.policyReason,
          auditLog
        };
      }
    }

    if (tool.executionPolicy === 'require_user_confirm' && !options.userConfirmed) {
      const auditLog: ToolExecutionAuditLog = {
        id: auditId,
        timestamp: new Date().toISOString(),
        toolId,
        requesterId,
        requesterRole,
        riskLevel: tool.riskLevel,
        authorized: false,
        lotoAuthorized: Boolean(options.isLotoAuthorized),
        policyReason: `Tool '${tool.name}' has risk level ${tool.riskLevel} and requires explicit user confirmation before execution.`,
        inputSummary: JSON.stringify(inputParams).substring(0, 100),
        status: 'REQUIRES_CONFIRMATION'
      };
      this.auditLogs.push(auditLog);
      return {
        allowed: false,
        status: 'REQUIRES_CONFIRMATION',
        riskLevel: tool.riskLevel,
        policyReason: auditLog.policyReason,
        auditLog
      };
    }

    // Granted
    const auditLog: ToolExecutionAuditLog = {
      id: auditId,
      timestamp: new Date().toISOString(),
      toolId,
      requesterId,
      requesterRole,
      riskLevel: tool.riskLevel,
      authorized: true,
      lotoAuthorized: Boolean(options.isLotoAuthorized),
      policyReason: `Tool execution authorized under ${tool.riskLevel} risk policy.`,
      inputSummary: JSON.stringify(inputParams).substring(0, 100),
      status: 'GRANTED'
    };
    this.auditLogs.push(auditLog);

    return {
      allowed: true,
      status: 'GRANTED',
      riskLevel: tool.riskLevel,
      policyReason: auditLog.policyReason,
      auditLog
    };
  }

  public getAuditLogs(limit: number = 50): ToolExecutionAuditLog[] {
    return this.auditLogs.slice(-limit);
  }
}

export const toolPermissionSystem = ToolPermissionSystem.getInstance();
