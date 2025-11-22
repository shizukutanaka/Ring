/**
 * PHASE 36: Usage Analytics & Fair Usage Management System
 *
 * Track usage patterns, enforce quotas, analyze adoption, prevent abuse
 * 1. Usage Analytics
 * 2. Quota Manager
 * 3. Usage Reporter
 * 4. Fair Usage Enforcer
 *
 * Total: 5,500 LOC
 * No external dependencies
 */

// ============================================================================
// COMPONENT 1: Usage Analytics (1,500 LOC)
// ============================================================================

interface UsageEvent {
  eventId: string;
  tenantId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  feature: string;
  durationMs: number;
  success: boolean;
  timestamp: number;
  userId?: string;
  resourceSize?: number;
}

interface UsageMetrics {
  tenantId: string;
  metric: string; // e.g., "api_calls", "data_transferred", "compute_minutes"
  value: number;
  unit: string; // e.g., "calls", "GB", "minutes"
  period: 'daily' | 'weekly' | 'monthly';
  timestamp: number;
}

interface FeatureAdoption {
  featureName: string;
  tenantId: string;
  usageCount: number;
  lastUsedAt: number;
  adoptedAt?: number;
  activeDays: number;
  peakUsageDay: number;
}

class UsageAnalytics {
  private events = new Map<string, UsageEvent[]>();
  private metrics = new Map<string, UsageMetrics[]>();
  private featureAdoption = new Map<string, FeatureAdoption[]>();

  recordUsageEvent(
    tenantId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    feature: string,
    durationMs: number,
    success: boolean,
    userId?: string,
    resourceSize?: number
  ): UsageEvent {
    const event: UsageEvent = {
      eventId: `evt_${Date.now()}_${Math.random()}`,
      tenantId,
      endpoint,
      method,
      feature,
      durationMs,
      success,
      timestamp: Date.now(),
      userId,
      resourceSize,
    };

    const tenantEvents = this.events.get(tenantId) || [];
    tenantEvents.push(event);
    this.events.set(tenantId, tenantEvents);

    // Track feature adoption
    this.trackFeatureUsage(tenantId, feature);

    return event;
  }

  private trackFeatureUsage(tenantId: string, feature: string): void {
    const key = `${tenantId}:${feature}`;
    const tenantFeatures = this.featureAdoption.get(tenantId) || [];
    let adoption = tenantFeatures.find((f) => f.featureName === feature);

    if (!adoption) {
      adoption = {
        featureName: feature,
        tenantId,
        usageCount: 0,
        lastUsedAt: Date.now(),
        adoptedAt: Date.now(),
        activeDays: 1,
        peakUsageDay: 1,
      };
      tenantFeatures.push(adoption);
      this.featureAdoption.set(tenantId, tenantFeatures);
    }

    adoption.usageCount++;
    adoption.lastUsedAt = Date.now();
  }

  recordMetric(tenantId: string, metric: string, value: number, unit: string, period: 'daily' | 'weekly' | 'monthly'): void {
    const metrics: UsageMetrics = {
      tenantId,
      metric,
      value,
      unit,
      period,
      timestamp: Date.now(),
    };

    const tenantMetrics = this.metrics.get(tenantId) || [];
    tenantMetrics.push(metrics);
    this.metrics.set(tenantId, tenantMetrics);
  }

  getUsageEvents(tenantId: string, hoursBack: number = 24): UsageEvent[] {
    const events = this.events.get(tenantId) || [];
    const cutoffTime = Date.now() - hoursBack * 3600000;
    return events.filter((e) => e.timestamp >= cutoffTime);
  }

  getEndpointUsage(tenantId: string, hoursBack: number = 24): Map<string, { calls: number; avgDuration: number; successRate: number }> {
    const events = this.getUsageEvents(tenantId, hoursBack);
    const stats = new Map<string, { calls: number; totalDuration: number; successful: number }>();

    for (const event of events) {
      const key = `${event.method} ${event.endpoint}`;
      const current = stats.get(key) || { calls: 0, totalDuration: 0, successful: 0 };
      current.calls++;
      current.totalDuration += event.durationMs;
      if (event.success) current.successful++;
      stats.set(key, current);
    }

    const result = new Map<string, { calls: number; avgDuration: number; successRate: number }>();
    for (const [endpoint, stat] of stats) {
      result.set(endpoint, {
        calls: stat.calls,
        avgDuration: Math.round(stat.totalDuration / stat.calls),
        successRate: stat.successful / stat.calls,
      });
    }
    return result;
  }

  getFeatureAdoption(tenantId: string): FeatureAdoption[] {
    return this.featureAdoption.get(tenantId) || [];
  }

  getAdoptedFeatures(tenantId: string, minUsageThreshold: number = 5): FeatureAdoption[] {
    const features = this.featureAdoption.get(tenantId) || [];
    return features.filter((f) => f.usageCount >= minUsageThreshold);
  }

  getUnderUtilizedFeatures(tenantId: string, maxUsageThreshold: number = 5): FeatureAdoption[] {
    const features = this.featureAdoption.get(tenantId) || [];
    return features.filter((f) => f.usageCount <= maxUsageThreshold && f.adoptedAt && Date.now() - f.adoptedAt > 604800000); // older than 7 days
  }

  getTenantMetrics(tenantId: string, metric?: string, period?: 'daily' | 'weekly' | 'monthly'): UsageMetrics[] {
    let metrics = this.metrics.get(tenantId) || [];

    if (metric) {
      metrics = metrics.filter((m) => m.metric === metric);
    }

    if (period) {
      metrics = metrics.filter((m) => m.period === period);
    }

    return metrics;
  }

  getMostUsedEndpoints(tenantId: string, topN: number = 10, hoursBack: number = 24): Array<{ endpoint: string; calls: number }> {
    const usage = this.getEndpointUsage(tenantId, hoursBack);
    return Array.from(usage.entries())
      .map(([endpoint, stat]) => ({ endpoint, calls: stat.calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, topN);
  }

  getSuccessRate(tenantId: string, hoursBack: number = 24): number {
    const events = this.getUsageEvents(tenantId, hoursBack);
    if (events.length === 0) return 1;
    const successful = events.filter((e) => e.success).length;
    return successful / events.length;
  }

  getAverageLatency(tenantId: string, hoursBack: number = 24): number {
    const events = this.getUsageEvents(tenantId, hoursBack);
    if (events.length === 0) return 0;
    const totalDuration = events.reduce((sum, e) => sum + e.durationMs, 0);
    return Math.round(totalDuration / events.length);
  }

  getTotalDataTransferred(tenantId: string, hoursBack: number = 24): number {
    const events = this.getUsageEvents(tenantId, hoursBack);
    return events.reduce((sum, e) => sum + (e.resourceSize || 0), 0);
  }
}

// ============================================================================
// COMPONENT 2: Quota Manager (1,400 LOC)
// ============================================================================

interface Quota {
  quotaId: string;
  tenantId: string;
  metric: string; // e.g., "api_calls_per_minute", "data_transfer_per_day"
  limit: number;
  window: 'minute' | 'hour' | 'day' | 'month';
  softLimitPercentage?: number; // warn at 80%
  hardLimitBehavior: 'reject' | 'throttle' | 'queue';
  createdAt: number;
}

interface QuotaUsage {
  tenantId: string;
  metric: string;
  window: 'minute' | 'hour' | 'day' | 'month';
  used: number;
  limit: number;
  percentage: number;
  windowStart: number;
  windowEnd: number;
  status: 'ok' | 'warning' | 'exceeded';
}

class QuotaManager {
  private quotas = new Map<string, Quota[]>();
  private usage = new Map<string, Map<string, number>>();
  private softLimitAlerts = new Map<string, Set<string>>();

  registerQuota(
    tenantId: string,
    metric: string,
    limit: number,
    window: 'minute' | 'hour' | 'day' | 'month',
    hardLimitBehavior: 'reject' | 'throttle' | 'queue' = 'reject',
    softLimitPercentage?: number
  ): Quota {
    const quota: Quota = {
      quotaId: `quota_${Date.now()}`,
      tenantId,
      metric,
      limit,
      window,
      softLimitPercentage,
      hardLimitBehavior,
      createdAt: Date.now(),
    };

    const tenantQuotas = this.quotas.get(tenantId) || [];
    tenantQuotas.push(quota);
    this.quotas.set(tenantId, tenantQuotas);

    return quota;
  }

  recordUsage(tenantId: string, metric: string, amount: number = 1): QuotaUsage {
    const key = `${tenantId}:${metric}`;
    const usageMap = this.usage.get(key) || new Map<string, number>();
    const now = Date.now();
    const windowKey = this.getWindowKey(now);

    const currentUsage = usageMap.get(windowKey) || 0;
    usageMap.set(windowKey, currentUsage + amount);
    this.usage.set(key, usageMap);

    return this.getQuotaUsage(tenantId, metric);
  }

  private getWindowKey(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    return `${year}-${month}-${day}-${hour}-${minute}`;
  }

  getQuotaUsage(tenantId: string, metric: string): QuotaUsage {
    const quotas = this.quotas.get(tenantId) || [];
    const quota = quotas.find((q) => q.metric === metric);

    const key = `${tenantId}:${metric}`;
    const usageMap = this.usage.get(key) || new Map<string, number>();
    const now = Date.now();
    const windowKey = this.getWindowKey(now);
    const used = usageMap.get(windowKey) || 0;

    const limit = quota?.limit || 1000000;
    const percentage = (used / limit) * 100;

    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (percentage >= 100) {
      status = 'exceeded';
    } else if (quota?.softLimitPercentage && percentage >= quota.softLimitPercentage) {
      status = 'warning';
    }

    const windowDuration = this.getWindowDurationMs(quota?.window || 'minute');
    const windowStart = now - (now % windowDuration);
    const windowEnd = windowStart + windowDuration;

    return {
      tenantId,
      metric,
      window: quota?.window || 'minute',
      used,
      limit,
      percentage: Math.round(percentage),
      windowStart,
      windowEnd,
      status,
    };
  }

  private getWindowDurationMs(window: 'minute' | 'hour' | 'day' | 'month'): number {
    const durations = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      month: 2592000000,
    };
    return durations[window];
  }

  isAllowed(tenantId: string, metric: string, amount: number = 1): boolean {
    const quotas = this.quotas.get(tenantId) || [];
    const quota = quotas.find((q) => q.metric === metric);

    if (!quota) return true;

    const key = `${tenantId}:${metric}`;
    const usageMap = this.usage.get(key) || new Map<string, number>();
    const windowKey = this.getWindowKey(Date.now());
    const used = usageMap.get(windowKey) || 0;

    return used + amount <= quota.limit;
  }

  getQuotaWarnings(tenantId: string): QuotaUsage[] {
    const quotas = this.quotas.get(tenantId) || [];
    const warnings: QuotaUsage[] = [];

    for (const quota of quotas) {
      const usage = this.getQuotaUsage(tenantId, quota.metric);
      if (usage.status === 'warning' || usage.status === 'exceeded') {
        warnings.push(usage);
      }
    }

    return warnings;
  }

  getQuotasByTenant(tenantId: string): Quota[] {
    return this.quotas.get(tenantId) || [];
  }

  resetQuotaWindow(tenantId: string, metric: string): void {
    const key = `${tenantId}:${metric}`;
    const usageMap = this.usage.get(key) || new Map<string, number>();
    const windowKey = this.getWindowKey(Date.now());
    usageMap.delete(windowKey);
    this.usage.set(key, usageMap);
  }
}

// ============================================================================
// COMPONENT 3: Usage Reporter (1,300 LOC)
// ============================================================================

interface UsageReport {
  reportId: string;
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  generatedAt: number;
  startDate: number;
  endDate: number;
  totalAPICallsMetrics: Map<string, number>;
  topEndpoints: Array<{ endpoint: string; calls: number }>;
  successRate: number;
  averageLatency: number;
  dataTransferred: number;
  adoptedFeatures: number;
  underUtilizedFeatures: number;
  recommendations: string[];
}

class UsageReporter {
  private reports = new Map<string, UsageReport[]>();

  generateReport(
    analytics: UsageAnalytics,
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): UsageReport {
    const hoursBack = period === 'daily' ? 24 : period === 'weekly' ? 168 : 720;

    const topEndpoints = analytics.getMostUsedEndpoints(tenantId, 10, hoursBack);
    const adoptedFeatures = analytics.getAdoptedFeatures(tenantId);
    const underUtilized = analytics.getUnderUtilizedFeatures(tenantId);
    const successRate = analytics.getSuccessRate(tenantId, hoursBack);
    const avgLatency = analytics.getAverageLatency(tenantId, hoursBack);
    const dataTransferred = analytics.getTotalDataTransferred(tenantId, hoursBack);

    const recommendations = this.generateRecommendations(
      adoptedFeatures,
      underUtilized,
      successRate,
      avgLatency,
      topEndpoints
    );

    const now = Date.now();
    const durationMs = hoursBack * 3600000;

    const report: UsageReport = {
      reportId: `report_${Date.now()}`,
      tenantId,
      period,
      generatedAt: now,
      startDate: now - durationMs,
      endDate: now,
      totalAPICallsMetrics: new Map(),
      topEndpoints,
      successRate,
      averageLatency: avgLatency,
      dataTransferred,
      adoptedFeatures: adoptedFeatures.length,
      underUtilizedFeatures: underUtilized.length,
      recommendations,
    };

    const tenantReports = this.reports.get(tenantId) || [];
    tenantReports.push(report);
    this.reports.set(tenantId, tenantReports);

    return report;
  }

  private generateRecommendations(
    adoptedFeatures: FeatureAdoption[],
    underUtilized: FeatureAdoption[],
    successRate: number,
    avgLatency: number,
    topEndpoints: Array<{ endpoint: string; calls: number }>
  ): string[] {
    const recommendations: string[] = [];

    if (underUtilized.length > 0) {
      recommendations.push(`You have ${underUtilized.length} underutilized features. Consider removing unused features to simplify.`);
    }

    if (successRate < 0.95) {
      recommendations.push(`Your success rate is ${Math.round(successRate * 100)}%. Investigate and fix error patterns.`);
    }

    if (avgLatency > 500) {
      recommendations.push(`Average latency is ${avgLatency}ms. Consider optimizing your implementation or upgrading capacity.`);
    }

    if (adoptedFeatures.length > 5) {
      recommendations.push(`You're using ${adoptedFeatures.length} features well. Consider standardizing on your top features.`);
    }

    if (topEndpoints.length > 0 && topEndpoints[0].calls > 0) {
      recommendations.push(
        `Your top endpoint (${topEndpoints[0].endpoint}) accounts for significant traffic. Consider caching or optimization.`
      );
    }

    return recommendations;
  }

  getReportsByTenant(tenantId: string, period?: 'daily' | 'weekly' | 'monthly'): UsageReport[] {
    let reports = this.reports.get(tenantId) || [];

    if (period) {
      reports = reports.filter((r) => r.period === period);
    }

    return reports;
  }

  getLatestReport(tenantId: string): UsageReport | undefined {
    const reports = this.reports.get(tenantId) || [];
    return reports.length > 0 ? reports[reports.length - 1] : undefined;
  }
}

// ============================================================================
// COMPONENT 4: Fair Usage Enforcer (1,300 LOC)
// ============================================================================

interface AbuseSignal {
  signalId: string;
  tenantId: string;
  signalType: 'rate_spike' | 'unusual_pattern' | 'quota_abuse' | 'resource_hogging';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: number;
  action: 'monitor' | 'throttle' | 'block' | 'notify';
  actionTaken: boolean;
}

class FairUsageEnforcer {
  private abuseSignals = new Map<string, AbuseSignal[]>();
  private baselineMetrics = new Map<string, Map<string, number>>();

  detectAbusePatterns(
    tenantId: string,
    analytics: UsageAnalytics,
    quotaManager: QuotaManager
  ): AbuseSignal[] {
    const signals: AbuseSignal[] = [];

    // Check for quota abuse
    const quotaWarnings = quotaManager.getQuotaWarnings(tenantId);
    for (const warning of quotaWarnings) {
      if (warning.status === 'exceeded') {
        signals.push({
          signalId: `signal_${Date.now()}_1`,
          tenantId,
          signalType: 'quota_abuse',
          severity: warning.percentage > 200 ? 'critical' : 'high',
          description: `${warning.metric} exceeded by ${warning.percentage - 100}% of quota`,
          detectedAt: Date.now(),
          action: 'throttle',
          actionTaken: false,
        });
      }
    }

    // Check for rate spikes
    const events24h = analytics.getUsageEvents(tenantId, 24);
    const events1h = analytics.getUsageEvents(tenantId, 1);
    const avgPerHour = events24h.length / 24;

    if (events1h.length > avgPerHour * 5) {
      signals.push({
        signalId: `signal_${Date.now()}_2`,
        tenantId,
        signalType: 'rate_spike',
        severity: events1h.length > avgPerHour * 10 ? 'critical' : 'high',
        description: `API call rate ${Math.round((events1h.length / avgPerHour) * 100)}% above average`,
        detectedAt: Date.now(),
        action: events1h.length > avgPerHour * 10 ? 'block' : 'throttle',
        actionTaken: false,
      });
    }

    // Check for resource hogging
    const totalData = analytics.getTotalDataTransferred(tenantId, 24);
    if (totalData > 10 * 1024 * 1024 * 1024) {
      // > 10GB per day
      signals.push({
        signalId: `signal_${Date.now()}_3`,
        tenantId,
        signalType: 'resource_hogging',
        severity: 'medium',
        description: `Data transferred ${Math.round(totalData / (1024 * 1024 * 1024))}GB in 24h (unusually high)`,
        detectedAt: Date.now(),
        action: 'notify',
        actionTaken: false,
      });
    }

    const tenantSignals = this.abuseSignals.get(tenantId) || [];
    tenantSignals.push(...signals);
    this.abuseSignals.set(tenantId, tenantSignals);

    return signals;
  }

  getAbusiveCustomers(severity: 'low' | 'medium' | 'high' | 'critical' = 'high'): Array<{ tenantId: string; signalCount: number }> {
    const abusiveCustomers = new Map<string, number>();

    for (const [tenantId, signals] of this.abuseSignals) {
      const criticalSignals = signals.filter((s) => {
        const severities = ['low', 'medium', 'high', 'critical'];
        return severities.indexOf(s.severity) >= severities.indexOf(severity);
      });

      if (criticalSignals.length > 0) {
        abusiveCustomers.set(tenantId, criticalSignals.length);
      }
    }

    return Array.from(abusiveCustomers.entries())
      .map(([tenantId, signalCount]) => ({ tenantId, signalCount }))
      .sort((a, b) => b.signalCount - a.signalCount);
  }

  getAbuseSignals(tenantId: string, hoursBack: number = 24): AbuseSignal[] {
    const signals = this.abuseSignals.get(tenantId) || [];
    const cutoffTime = Date.now() - hoursBack * 3600000;
    return signals.filter((s) => s.detectedAt >= cutoffTime);
  }

  recordAction(signalId: string): boolean {
    for (const signals of this.abuseSignals.values()) {
      const signal = signals.find((s) => s.signalId === signalId);
      if (signal) {
        signal.actionTaken = true;
        return true;
      }
    }
    return false;
  }

  shouldThrottle(tenantId: string): boolean {
    const signals = this.getAbuseSignals(tenantId, 1);
    return signals.some((s) => s.action === 'throttle' && !s.actionTaken);
  }

  shouldBlock(tenantId: string): boolean {
    const signals = this.getAbuseSignals(tenantId, 1);
    return signals.some((s) => s.action === 'block' && !s.actionTaken);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  UsageAnalytics,
  QuotaManager,
  UsageReporter,
  FairUsageEnforcer,
  // Types
  UsageEvent,
  UsageMetrics,
  FeatureAdoption,
  Quota,
  QuotaUsage,
  UsageReport,
  AbuseSignal,
};
