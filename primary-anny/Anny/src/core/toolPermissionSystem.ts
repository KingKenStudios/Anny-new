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
  private readonly maxAuditLogs = 1000;

  constructor() {
    this.bootstrapDefaultTools();
  }

  public static getInstance(): ToolPermissionSystem {
    if (!ToolPermissionSystem.instance) {
      ToolPermissionSystem.instance = new ToolPermissionSystem();
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
    if (!tool || typeof tool !== 'object' || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(tool.toolId || '')) {
      throw new Error('TOOL_DEFINITION_INVALID: Tool IDs must be 1-128 safe identifier characters.');
    }
    if (this.registry.has(tool.toolId)) {
      throw new Error('TOOL_ALREADY_REGISTERED: Existing tools cannot be silently replaced.');
    }
    if (!tool.name?.trim() || !tool.description?.trim() ||
        !['file_system', 'code_execution', 'database', 'network_api', 'actuator_robotics', 'financial_control', 'system_admin'].includes(tool.category) ||
        !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(tool.riskLevel) ||
        !['auto_execute', 'require_user_confirm', 'loto_authorized_only'].includes(tool.executionPolicy) ||
        !Array.isArray(tool.requiredPermissions) || tool.requiredPermissions.some(permission => typeof permission !== 'string' || !permission.trim() || permission.length > 128) ||
        !tool.inputSchema || typeof tool.inputSchema !== 'object' || Array.isArray(tool.inputSchema) ||
        !tool.outputSchema || typeof tool.outputSchema !== 'object' || Array.isArray(tool.outputSchema)) {
      throw new Error('TOOL_DEFINITION_INVALID: Tool definition failed required metadata validation.');
    }
    for (const [fieldName, field] of Object.entries(tool.inputSchema)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,127}$/.test(fieldName) ||
          !field || !['string', 'number', 'boolean', 'array', 'object'].includes(field.type) ||
          typeof field.description !== 'string' || typeof field.required !== 'undefined' && typeof field.required !== 'boolean) {
        throw new Error('TOOL_SCHEMA_INVALID: Input fields must use supported types and descriptions.');
      }
    }
    this.registry.set(tool.toolId, structuredClone(tool));
  }

  private summarizeInput(input: unknown): string {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return '[invalid input]';
    return Object.entries(input as Record<string, unknown>).slice(0, 20).map(([key, value]) => {
      const sensitive = /password|secret|token|api.?key|credential|authorization|private|account|recipient/i.test(key);
      const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
      const description = sensitive ? '[REDACTED]' : type === 'string' ? 'string(length omitted)' : type;
      return key + ':' + description;
    }).join(', ').slice(0, 300);
  }

  private addAudit(log: ToolExecutionAuditLog): void {
    this.auditLogs.push(log);
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs.splice(0, this.auditLogs.length - this.maxAuditLogs);
    }
  }

  private validateInput(tool: ToolDefinition, input: unknown): string | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Tool input must be an object.';
    const params = input as Record<string, unknown>;
    for (const [name, field] of Object.entries(tool.inputSchema)) {
      const value = params[name];
      if (field.required && (value === undefined || value === null)) return 'Required input "' + name + '" is missing.';
      if (value === undefined || value === null) continue;
      const valid = field.type === 'array' ? Array.isArray(value)
        : field.type === 'object' ? typeof value === 'object' && !Array.isArray(value)
        : field.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
        : typeof value === field.type;
      if (!valid) return 'Input "' + name + '" must be type ' + field.type + '.';
    }
    const unknown = Object.keys(params).filter(key => !Object.prototype.hasOwnProperty.call(tool.inputSchema, key));
    if (unknown.length) return 'Unknown input field(s): ' + unknown.join(', ') + '.';
    return null;
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
    options: { isLotoAuthorized?: boolean; userConfirmed?: boolean; grantedPermissions?: string[] } = {}
  ): VerificationResult {
    const tool = this.registry.get(toolId);
    const auditId = globalThis.crypto?.randomUUID ? `audit_${globalThis.crypto.randomUUID()}` : `audit_${Date.now()}_${this.auditLogs.length}`;
    const inputSummary = this.summarizeInput(inputParams);

    const deny = (riskLevel: RiskLevel, reason: string, status: 'DENIED' | 'REQUIRES_CONFIRMATION' = 'DENIED'): VerificationResult => {
      const auditLog: ToolExecutionAuditLog = {
        id: auditId, timestamp: new Date().toISOString(), toolId, requesterId, requesterRole, riskLevel,
        authorized: false, lotoAuthorized: Boolean(options.isLotoAuthorized), policyReason: reason, inputSummary, status
      };
      this.addAudit(auditLog);
      return { allowed: false, status, riskLevel, policyReason: reason, auditLog };
    };

    if (!tool) return deny('HIGH', `Tool ID '${toolId}' is not registered.`);
    const granted = new Set(Array.isArray(options.grantedPermissions) ? options.grantedPermissions : []);
    const missing = tool.requiredPermissions.filter(permission => !granted.has(permission));
    if (missing.length) return deny(tool.riskLevel, `Missing required permission(s): ${missing.join(', ')}.`);
    const inputError = this.validateInput(tool, inputParams);
    if (inputError) return deny(tool.riskLevel, `Invalid input: ${inputError}`);

    if (tool.riskLevel === 'CRITICAL' && tool.category === 'actuator_robotics' &&
        (!options.isLotoAuthorized || !granted.has('scada:loto_override'))) {
      return deny('CRITICAL', 'CRITICAL physical actuator control requires trusted LOTO authorization and scada:loto_override permission.');
    }
    if (tool.executionPolicy === 'loto_authorized_only' && !options.isLotoAuthorized) {
      return deny(tool.riskLevel, 'This tool requires trusted LOTO authorization.');
    }
    if ((tool.riskLevel === 'CRITICAL' || tool.executionPolicy === 'require_user_confirm') && !options.userConfirmed) {
      return deny(tool.riskLevel, `Tool '${tool.name}' requires explicit user confirmation before execution.`, 'REQUIRES_CONFIRMATION');
    }

    const auditLog: ToolExecutionAuditLog = {
      id: auditId, timestamp: new Date().toISOString(), toolId, requesterId, requesterRole, riskLevel: tool.riskLevel,
      authorized: true, lotoAuthorized: Boolean(options.isLotoAuthorized),
      policyReason: `Tool execution authorized under ${tool.riskLevel} risk policy with all required permissions and input validation.`,
      inputSummary, status: 'GRANTED'
    };
    this.addAudit(auditLog);
    return { allowed: true, status: 'GRANTED', riskLevel: tool.riskLevel, policyReason: auditLog.policyReason, auditLog };
  }
  public getAuditLogs(limit: number = 50): ToolExecutionAuditLog[] {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.min(this.maxAuditLogs, Math.floor(limit))) : 50;
    return safeLimit === 0 ? [] : this.auditLogs.slice(-safeLimit);
  }
}

export const toolPermissionSystem = ToolPermissionSystem.getInstance();
