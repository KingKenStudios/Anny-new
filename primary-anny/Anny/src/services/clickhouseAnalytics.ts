/**
 * ANNY — CLICKHOUSE ANALYTICS PLATFORM (PHASE 9)
 * High-speed columnar telemetry and analytics database for AI token tracking,
 * execution latency, developer metrics, feature usage, and system performance dashboards.
 */

import { envConfigService } from './envConfigService';

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  category: 'AI_INFERENCE' | 'DEVELOPER_ACTION' | 'SYSTEM_LATENCY' | 'SCADA_LOG' | 'SECURITY';
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  userId?: string;
  sessionId?: string;
  details?: Record<string, any>;
}

export interface SystemMetricsSummary {
  totalInferences: number;
  totalTokensConsumed: number;
  totalEstimatedCostUsd: number;
  avgLatencyMs: number;
  providerBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

export class ClickHouseAnalytics {
  private static instance: ClickHouseAnalytics;
  private events: TelemetryEvent[] = [];

  private constructor() {}

  public static getInstance(): ClickHouseAnalytics {
    if (!ClickHouseAnalytics.instance) {
      ClickHouseAnalytics.instance = new ClickHouseAnalytics();
    }
    return ClickHouseAnalytics.instance;
  }

  public async checkHealth(): Promise<{ status: 'SIMULATED' | 'NOT_CONFIGURED'; totalEventsRecorded: number }> {
    const config = envConfigService.getConfig();
    return {
      status: config.clickhouseUrl ? 'SIMULATED' : 'NOT_CONFIGURED',
      totalEventsRecorded: this.events.length
    };
  }

  // Record Telemetry
  public async recordEvent(event: Omit<TelemetryEvent, 'eventId' | 'timestamp'>): Promise<TelemetryEvent> {
    const fullEvent: TelemetryEvent = {
      eventId: `click_${Math.random().toString(36).substring(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...event
    };

    this.events.push(fullEvent);
    if (this.events.length > 5000) this.events.shift(); // Retain last 5000 telemetry events
    return fullEvent;
  }

  // Dashboard Aggregations
  public getMetricsSummary(): SystemMetricsSummary {
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    const providerBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};

    for (const ev of this.events) {
      if (ev.totalTokens) totalTokens += ev.totalTokens;
      if (ev.costUsd) totalCost += ev.costUsd;
      if (ev.latencyMs) {
        totalLatency += ev.latencyMs;
        latencyCount += 1;
      }

      if (ev.provider) {
        providerBreakdown[ev.provider] = (providerBreakdown[ev.provider] || 0) + 1;
      }

      categoryBreakdown[ev.category] = (categoryBreakdown[ev.category] || 0) + 1;
    }

    return {
      totalInferences: this.events.filter(e => e.category === 'AI_INFERENCE').length,
      totalTokensConsumed: totalTokens,
      totalEstimatedCostUsd: Number(totalCost.toFixed(4)),
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      providerBreakdown,
      categoryBreakdown
    };
  }

  // Query Recent Events
  public queryEvents(category?: TelemetryEvent['category'], limit: number = 50): TelemetryEvent[] {
    const filtered = category ? this.events.filter(e => e.category === category) : this.events;
    return [...filtered].reverse().slice(0, limit);
  }
}

export const clickHouseAnalytics = ClickHouseAnalytics.getInstance();
