import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ToolPermissionSystem, type ToolDefinition } from './toolPermissionSystem';

function makeTool(id = 'test_tool'): ToolDefinition {
  return {
    toolId: id,
    name: 'Test Tool',
    description: 'Test-only permission tool.',
    category: 'network_api',
    requiredPermissions: ['test:execute'],
    riskLevel: 'MEDIUM',
    executionPolicy: 'auto_execute',
    inputSchema: {
      value: { type: 'string', description: 'Input value', required: true },
      count: { type: 'number', description: 'Optional count' },
      secret: { type: 'string', description: 'Sensitive secret' }
    },
    outputSchema: { success: { type: 'boolean', description: 'Result' } }
  };
}

test('tool execution denies missing permissions and only grants explicit permissions', () => {
  const system = new ToolPermissionSystem();
  system.registerTool(makeTool());
  const denied = system.verifyExecution('test_tool', 'user-1', 'OPERATOR', { value: 'ok' });
  assert.equal(denied.allowed, false);
  assert.match(denied.policyReason, /Missing required permission/);
  const allowed = system.verifyExecution('test_tool', 'user-1', 'OPERATOR', { value: 'ok' }, {
    grantedPermissions: ['test:execute']
  });
  assert.equal(allowed.allowed, true);
});

test('input schema validation rejects missing, wrong type, non-finite and unknown fields', () => {
  const system = new ToolPermissionSystem();
  system.registerTool(makeTool());
  const perms = { grantedPermissions: ['test:execute'] };
  assert.equal(system.verifyExecution('test_tool', 'u', 'OPERATOR', {}, perms).allowed, false);
  assert.equal(system.verifyExecution('test_tool', 'u', 'OPERATOR', { value: 3 }, perms).allowed, false);
  assert.equal(system.verifyExecution('test_tool', 'u', 'OPERATOR', { value: 'x', count: NaN }, perms).allowed, false);
  assert.equal(system.verifyExecution('test_tool', 'u', 'OPERATOR', { value: 'x', unexpected: true }, perms).allowed, false);
  assert.equal(system.verifyExecution('test_tool', 'u', 'OPERATOR', { value: 'x', count: 2 }, perms).allowed, true);
});

test('high-risk tools require permission and explicit confirmation', () => {
  const system = new ToolPermissionSystem();
  system.registerTool({
    ...makeTool('high_tool'),
    riskLevel: 'HIGH',
    executionPolicy: 'require_user_confirm'
  });
  const permissions = ['test:execute'];
  assert.equal(system.verifyExecution('high_tool', 'u', 'OPERATOR', { value: 'ok' }, {
    grantedPermissions: permissions
  }).status, 'REQUIRES_CONFIRMATION');
  assert.equal(system.verifyExecution('high_tool', 'u', 'OPERATOR', { value: 'ok' }, {
    grantedPermissions: permissions,
    userConfirmed: true
  }).allowed, true);
});

test('physical actuator controls fail closed without trusted LOTO plus override permission', () => {
  const system = new ToolPermissionSystem();
  system.registerTool({
    ...makeTool('actuator'),
    category: 'actuator_robotics',
    riskLevel: 'CRITICAL',
    executionPolicy: 'loto_authorized_only',
    requiredPermissions: ['robotics:motion', 'scada:loto_override'],
    inputSchema: { jointAngles: { type: 'array', description: 'Angles', required: true } }
  });
  const params = { jointAngles: [0, 0] };
  const permissions = ['robotics:motion', 'scada:loto_override'];
  assert.equal(system.verifyExecution('actuator', 'u', 'OPERATOR', params, {
    grantedPermissions: permissions
  }).allowed, false);
  assert.equal(system.verifyExecution('actuator', 'u', 'OPERATOR', params, {
    grantedPermissions: permissions,
    isLotoAuthorized: true
  }).allowed, true);
  assert.equal(system.verifyExecution('actuator', 'u', 'OPERATOR', params, {
    grantedPermissions: ['robotics:motion'],
    isLotoAuthorized: true
  }).allowed, false);
});

test('audit logs redact secret input values and remain bounded', () => {
  const system = new ToolPermissionSystem();
  system.registerTool(makeTool());
  const denied = system.verifyExecution('test_tool', 'u', 'OPERATOR', {
    value: 'do not log this value',
    secret: 'top-secret',
    apiKey: 'api-secret'
  });
  assert.doesNotMatch(denied.auditLog.inputSummary, /top-secret|api-secret|do not log this value/);
  assert.match(denied.auditLog.inputSummary, /secret:\[REDACTED\]/);
  assert.match(denied.auditLog.inputSummary, /apiKey:\[REDACTED\]/);
  for (let i = 0; i < 1005; i++) {
    system.verifyExecution('missing-tool', 'u', 'OPERATOR', {});
  }
  assert.equal(system.getAuditLogs(2000).length, 1000);
});

test('tool registry refuses unsafe definitions and duplicate replacement', () => {
  const system = new ToolPermissionSystem();
  system.registerTool(makeTool());
  assert.throws(() => system.registerTool(makeTool()), /TOOL_ALREADY_REGISTERED/);
  assert.throws(() => system.registerTool({ ...makeTool('bad'), inputSchema: { value: { type: 'unknown', description: 'bad' } } }), /TOOL_SCHEMA_INVALID/);
  assert.throws(() => system.registerTool({ ...makeTool('bad-id'), toolId: '../unsafe' }), /TOOL_DEFINITION_INVALID/);
});


test('critical financial operation always requires explicit confirmation', () => {
  const system = new ToolPermissionSystem();
  system.registerTool({
    ...makeTool('critical_financial'),
    category: 'financial_control',
    riskLevel: 'CRITICAL',
    executionPolicy: 'auto_execute',
    requiredPermissions: ['finance:transfer'],
    inputSchema: {
      amount: { type: 'number', description: 'Amount', required: true },
      recipient: { type: 'string', description: 'Recipient', required: true }
    }
  });
  const permissions = ['finance:transfer'];
  const input = { amount: 10, recipient: 'wallet-id' };
  assert.equal(system.verifyExecution('critical_financial', 'u', 'OPERATOR', input, {
    grantedPermissions: permissions
  }).status, 'REQUIRES_CONFIRMATION');
  assert.equal(system.verifyExecution('critical_financial', 'u', 'OPERATOR', input, {
    grantedPermissions: permissions,
    userConfirmed: true
  }).allowed, true);
});
