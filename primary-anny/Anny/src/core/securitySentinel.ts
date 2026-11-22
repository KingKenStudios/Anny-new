/**
 * ANNY ENTERPRISE ARCHITECTURE - SECURITY SENTINEL & LOTO GUARDIAN
 * Enforces Prompt Injection Protection, Secret Sanitization, Rate Limiting, and Digital Lockout/Tagout (LOTO) for ICS/SCADA.
 */

export interface SecurityAuditResult {
  passed: boolean;
  warnings: string[];
  sanitizedInput: string;
  lotoAuthorized: boolean;
}

export class SecuritySentinel {
  private static instance: SecuritySentinel;

  public static getInstance(): SecuritySentinel {
    if (!SecuritySentinel.instance) {
      SecuritySentinel.instance = new SecuritySentinel();
    }
    return SecuritySentinel.instance;
  }

  public auditPrompt(input: string): SecurityAuditResult {
    const warnings: string[] = [];
    let sanitized = input;

    // 1. Check for prompt injection keywords
    const maliciousPatterns = [
      /ignore previous instructions/i,
      /crack password/i,
      /bypass icloud/i,
      /generate malware/i,
      /disable safety/i,
      /rm -rf \//i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(input)) {
        warnings.push(`Intercepted unsafe pattern matching security policy violation.`);
        sanitized = sanitized.replace(pattern, '[REDACTED_BY_SECURITY_SENTINEL]');
      }
    }

    // 2. Secret Redaction (API Keys, Private Passwords)
    const secretPattern = /(AIzaSy[A-Za-z0-9_-]{33}|sk-[A-Za-z0-9]{32,})/g;
    if (secretPattern.test(sanitized)) {
      warnings.push('Detected potential hardcoded API key or credential in prompt. Redacted automatically.');
      sanitized = sanitized.replace(secretPattern, '[REDACTED_SECRET]');
    }

    // 3. Digital Lockout/Tagout (LOTO) for physical motor/actuator commands
    const isActuatorCommand = /motor|actuator|voltage|scada|plc/i.test(sanitized);
    const hasExplicitAuth = /loto_authorized=true/i.test(sanitized);

    return {
      passed: warnings.length === 0,
      warnings,
      sanitizedInput: sanitized,
      lotoAuthorized: !isActuatorCommand || hasExplicitAuth
    };
  }

  public logAudit(action: string, category: string, details: string): void {
    console.log(`[SECURITY AUDIT LOG] [${category.toUpperCase()}] ${action}: ${details}`);
  }

  public verifyAccess(params: {
    sourceOrg: string;
    targetOrg: string;
    requestedResource: string;
  }): boolean {
    if (params.sourceOrg !== params.targetOrg && params.targetOrg !== 'global' && params.sourceOrg !== 'global') {
      throw new Error(`SECURITY_VIOLATION: FORBIDDEN_CROSS_ORGANIZATION_ACCESS from ${params.sourceOrg} to ${params.targetOrg} on ${params.requestedResource}`);
    }
    return true;
  }

  public auditPath(path: string): boolean {
    if (path.includes('../') || path.includes('..\\') || path.startsWith('/etc/') || path.startsWith('/root') || path.includes('\0')) {
      throw new Error(`SECURITY_VIOLATION: PATH_TRAVERSAL_DETECTED on ${path}`);
    }
    return true;
  }
}

export const securitySentinel = SecuritySentinel.getInstance();
