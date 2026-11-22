/**
 * ANNY TELEMETRY & MODEL OBSERVABILITY ENGINE
 * Logs and tracks every AI request across conversation and builder pipelines.
 */

export interface AnnyTelemetryRecord {
  requestId: string; // Acts as executionId
  timestamp: string;
  sessionId: string;
  organizationId: string;
  projectId?: string;
  requestType: 'chat' | 'build' | 'repair' | 'vision' | 'robotics' | 'scada' | 'security';
  userIntent: string;
  intentCategory?: string;
  inputModalities?: string[];
  selectedCapability?: string;
  selectedProvider: string;
  selectedModel: string;
  reasonForSelection: string;
  hardwareProfile?: any;
  workerId?: string;
  transactionId?: string;
  executionStages: string[];
  providerRequest?: any;
  providerResponseMetadata?: any;
  artifactIds?: string[];
  verificationResult?: string;
  memoryUpdated: boolean;
  finalStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'BLOCKED' | 'UNAVAILABLE';
  failureReason?: string;
  latencyMs: number;
}

export class AnnyTelemetryEngine {
  private static instance: AnnyTelemetryEngine;
  private records: AnnyTelemetryRecord[] = [];
  private maxRecords = 100;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): AnnyTelemetryEngine {
    if (!AnnyTelemetryEngine.instance) {
      AnnyTelemetryEngine.instance = new AnnyTelemetryEngine();
    }
    return AnnyTelemetryEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch(e) {}
    });
  }

  public logRequest(record: Omit<AnnyTelemetryRecord, 'requestId' | 'timestamp'>): AnnyTelemetryRecord {
    const fullRecord: AnnyTelemetryRecord = {
      ...record,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    this.records.unshift(fullRecord);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(0, this.maxRecords);
    }

    this.notify();
    return fullRecord;
  }

  public getRecords(): AnnyTelemetryRecord[] {
    return [...this.records];
  }

  public clear() {
    this.records = [];
    this.notify();
  }
}

export const annyTelemetry = AnnyTelemetryEngine.getInstance();
