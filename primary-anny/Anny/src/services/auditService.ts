import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export type CriticalAuditEvent = 
  | 'login'
  | 'logout'
  | 'admin_elevation'
  | 'system_wipe'
  | 'security_alert'
  | 'rate_limit_exceeded'
  | 'database_latency_spike'
  | 'config_change';

export interface AuditLogMetadata {
  action: CriticalAuditEvent | string;
  details?: Record<string, any> | string;
  severity?: 'info' | 'warning' | 'critical';
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
}

export class AuditService {
  private static instance: AuditService;
  private localAuditBuffer: Array<Record<string, any>> = [];
  private readonly maxLocalBufferSize = 200;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public getRecentLocalLogs(limit: number = 50): Array<Record<string, any>> {
    return this.localAuditBuffer.slice(-Math.max(1, limit));
  }

  private recordLocalAudit(payload: Record<string, any>): string {
    const localId = `local_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.localAuditBuffer.push({ id: localId, ...payload });
    if (this.localAuditBuffer.length > this.maxLocalBufferSize) {
      this.localAuditBuffer.shift();
    }
    return localId;
  }

  /**
   * Captures and writes critical application audit logs to Firestore's 'audit_logs' collection
   * when an authenticated Firebase user session is active, or records them cleanly in the
   * local audit buffer on server/unauthenticated runtimes so Firestore rules are never violated.
   */
  public async logEvent(metadata: AuditLogMetadata): Promise<string | null> {
    try {
      const isBrowser = typeof window !== 'undefined';
      const currentUser = isBrowser ? auth?.currentUser : null;
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-Environment';

      const basePayload = {
        action: metadata.action,
        details: typeof metadata.details === 'object' ? JSON.stringify(metadata.details) : (metadata.details || 'N/A'),
        rawDetails: metadata.details || {},
        severity: metadata.severity || this.determineSeverity(metadata.action),
        userId: currentUser?.uid || metadata.userId || 'system',
        userEmail: metadata.userEmail || currentUser?.email || 'system@anny.internal',
        userAgent: metadata.userAgent || userAgent,
        ipAddress: metadata.ipAddress || '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      // Firestore rules require request.auth != null and payload.userId == request.auth.uid.
      // Never issue unauthenticated client-SDK Firestore writes from Node.js or signed-out browsers.
      if (isBrowser && db && currentUser?.uid) {
        const firestorePayload = {
          ...basePayload,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        };
        try {
          const docRef = await addDoc(collection(db, 'audit_logs'), firestorePayload);
          return docRef.id;
        } catch (writeErr) {
          const code = (writeErr as any)?.code;
          if (code !== 'permission-denied' && code !== 'unauthenticated') {
            console.warn(`[AuditService] Firestore write fallback for '${metadata.action}':`, writeErr);
          }
          return this.recordLocalAudit(basePayload);
        }
      }

      return this.recordLocalAudit(basePayload);
    } catch (err) {
      console.error(`[AuditService] Failed to record audit event '${metadata.action}':`, err);
      return null;
    }
  }

  /**
   * Helper interceptor for user authentication events (Login/Logout).
   */
  public async logAuthEvent(type: 'login' | 'logout', user?: { uid: string; email?: string | null }, details?: any): Promise<void> {
    await this.logEvent({
      action: type,
      userId: user?.uid,
      userEmail: user?.email || undefined,
      severity: 'info',
      details: details || `User ${type} action completed.`
    });
  }

  /**
   * Helper interceptor for privilege escalation (Admin Elevation).
   */
  public async logAdminElevation(targetUserId: string, promotedByEmail?: string, role: string = 'admin'): Promise<void> {
    await this.logEvent({
      action: 'admin_elevation',
      severity: 'critical',
      details: {
        targetUserId,
        promotedBy: promotedByEmail || 'system',
        newRole: role,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Helper interceptor for system wipe or bulk reset operations.
   */
  public async logSystemWipe(scope: string, wipedByEmail?: string): Promise<void> {
    await this.logEvent({
      action: 'system_wipe',
      severity: 'critical',
      details: {
        wipeScope: scope,
        initiatedBy: wipedByEmail || 'system',
        timestamp: new Date().toISOString()
      }
    });
  }

  private determineSeverity(action: string): 'info' | 'warning' | 'critical' {
    if (action === 'system_wipe' || action === 'admin_elevation') return 'critical';
    if (action === 'security_alert' || action === 'rate_limit_exceeded' || action === 'database_latency_spike') return 'warning';
    return 'info';
  }
}

export const auditService = AuditService.getInstance();
