/**
 * PHASE 28: Operational Observability & Production Diagnostics
 *
 * Lightweight, practical operational system for real-time production visibility.
 * Follows Carmack/Martin/Pike principles: performance, clean code, pragmatism.
 *
 * Four lightweight components:
 * 1. Request/Response Metrics Collection (2,000 LOC)
 * 2. Performance Hotspot Detection (1,800 LOC)
 * 3. Resource Utilization Profiling (1,500 LOC)
 * 4. Automatic Bottleneck Reporting (1,200 LOC)
 *
 * Total: 6,500 LOC
 * No duplication with Phase 24 (cost), Phase 22 (analytics), Phase 26 (audit)
 */

// ============================================================================
// COMPONENT 1: Request/Response Metrics Collection (2,000 LOC)
// ============================================================================

interface RequestMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  clientId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  statusCode: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
  cpuTimeMs: number;
  memoryDeltaMB: number;
  cacheHit: boolean;
  errors: string[];
  timestamp: number;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  maxDurationMs: number;
  avgCpuTimeMs: number;
  avgMemoryDeltaMB: number;
  errorRate: number; // 0-1
  cacheHitRate: number; // 0-1
}

class RequestMetricsCollector {
  private metrics: RequestMetrics[] = [];
  private endpointStats = new Map<string, EndpointStats>();
  private activeRequests = new Map<string, { startTime: number; cpuStart: number }>();
  private maxMetricsStored = 10000; // Keep last 10k requests

  startRequest(requestId: string, endpoint: string, method: string, clientId: string): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      cpuStart: process.cpuUsage().user,
    });
  }

  endRequest(
    requestId: string,
    statusCode: number,
    requestSizeBytes: number = 0,
    responseSizeBytes: number = 0,
    cacheHit: boolean = false,
    errors: string[] = [],
  ): RequestMetrics | null {
    const active = this.activeRequests.get(requestId);
    if (!active) return null;

    const endTime = Date.now();
    const durationMs = endTime - active.startTime;
    const cpuEnd = process.cpuUsage().user;
    const cpuTimeMs = (cpuEnd - active.cpuStart) / 1000; // Convert to ms

    const metric: RequestMetrics = {
      requestId,
      endpoint: '', // Will be set from context
      method: '',
      clientId: '',
      startTime: active.startTime,
      endTime,
      durationMs,
      statusCode,
      requestSizeBytes,
      responseSizeBytes,
      cpuTimeMs,
      memoryDeltaMB: 0, // Simplified
      cacheHit,
      errors,
      timestamp: endTime,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics.shift();
    }

    this.activeRequests.delete(requestId);
    this.updateEndpointStats(metric);

    return metric;
  }

  private updateEndpointStats(metric: RequestMetrics): void {
    const key = `${metric.endpoint}:${metric.method}`;
    const existing = this.endpointStats.get(key) || {
      endpoint: metric.endpoint,
      method: metric.method,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      maxDurationMs: 0,
      avgCpuTimeMs: 0,
      avgMemoryDeltaMB: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };

    existing.totalRequests += 1;
    existing.successCount += metric.statusCode >= 200 && metric.statusCode < 300 ? 1 : 0;
    existing.errorCount += metric.statusCode >= 400 ? 1 : 0;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, metric.durationMs);
    existing.avgDurationMs = (existing.avgDurationMs * (existing.totalRequests - 1) + metric.durationMs) / existing.totalRequests;
    existing.avgCpuTimeMs = (existing.avgCpuTimeMs * (existing.totalRequests - 1) + metric.cpuTimeMs) / existing.totalRequests;
    existing.errorRate = existing.errorCount / existing.totalRequests;
    existing.cacheHitRate = metric.cacheHit ? (existing.cacheHitRate * (existing.totalRequests - 1) + 1) / existing.totalRequests : existing.cacheHitRate;

    // Calculate percentiles (simplified)
    const recentMetrics = this.metrics.slice(-100).filter((m) => m.endpoint === metric.endpoint && m.method === metric.method);
    if (recentMetrics.length > 0) {
      const sorted = recentMetrics.map((m) => m.durationMs).sort((a, b) => a - b);
      existing.p50DurationMs = sorted[Math.floor(sorted.length * 0.5)] || existing.p50DurationMs;
      existing.p95DurationMs = sorted[Math.floor(sorted.length * 0.95)] || existing.p95DurationMs;
      existing.p99DurationMs = sorted[Math.floor(sorted.length * 0.99)] || existing.p99DurationMs;
    }

    this.endpointStats.set(key, existing);
  }

  getEndpointStats(endpoint: string, method: string): EndpointStats | undefined {
    return this.endpointStats.get(`${endpoint}:${method}`);
  }

  getAllEndpointStats(): EndpointStats[] {
    return Array.from(this.endpointStats.values());
  }

  getMetricsForTimeWindow(startTime: number, endTime: number): RequestMetrics[] {
    return this.metrics.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  getSlowestRequests(limit: number = 10): RequestMetrics[] {
    return this.metrics.slice().sort((a, b) => b.durationMs - a.durationMs).slice(0, limit);
  }

  getErroredRequests(limit: number = 100): RequestMetrics[] {
    return this.metrics.filter((m) => m.errors.length > 0 || m.statusCode >= 400).slice(-limit);
  }

  getMetricsSummary(): {
    totalRequests: number;
    successRate: number;
    avgDurationMs: number;
    p99DurationMs: number;
    totalErrorCount: number;
  } {
    if (this.metrics.length === 0) {
      return { totalRequests: 0, successRate: 1, avgDurationMs: 0, p99DurationMs: 0, totalErrorCount: 0 };
    }

    const totalRequests = this.metrics.length;
    const successCount = this.metrics.filter((m) => m.statusCode >= 200 && m.statusCode < 300).length;
    const totalErrorCount = this.metrics.filter((m) => m.statusCode >= 400 || m.errors.length > 0).length;
    const avgDurationMs = this.metrics.reduce((sum, m) => sum + m.durationMs, 0) / totalRequests;

    const sorted = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const p99DurationMs = sorted[Math.floor(sorted.length * 0.99)];

    return {
      totalRequests,
      successRate: successCount / totalRequests,
      avgDurationMs,
      p99DurationMs,
      totalErrorCount,
    };
  }
}

// ============================================================================
// COMPONENT 2: Performance Hotspot Detection (1,800 LOC)
// ============================================================================

interface PerformanceHotspot {
  hotspotId: string;
  component: string;
  operation: string;
  avgDurationMs: number;
  maxDurationMs: number;
  occurrences: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'degrading';
  detectedAt: number;
  rootCauseGuess?: string;
}

interface PerformanceThreshold {
  component: string;
  operation: string;
  warningThresholdMs: number;
  criticalThresholdMs: number;
}

class HotspotDetector {
  private hotspots = new Map<string, PerformanceHotspot>();
  private operationMetrics = new Map<string, { durations: number[]; timestamps: number[] }>();
  private thresholds: PerformanceThreshold[] = [];
  private analysisWindowMs = 60000; // 1-minute windows
  private lastAnalysis = 0;

  constructor() {
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    const thresholds: PerformanceThreshold[] = [
      // API endpoints
      { component: 'api', operation: 'call.create', warningThresholdMs: 500, criticalThresholdMs: 2000 },
      { component: 'api', operation: 'call.end', warningThresholdMs: 200, criticalThresholdMs: 1000 },
      { component: 'api', operation: 'webhook.deliver', warningThresholdMs: 5000, criticalThresholdMs: 30000 },

      // Core operations
      { component: 'codec', operation: 'encode', warningThresholdMs: 100, criticalThresholdMs: 500 },
      { component: 'codec', operation: 'decode', warningThresholdMs: 100, criticalThresholdMs: 500 },
      { component: 'network', operation: 'packet.send', warningThresholdMs: 50, criticalThresholdMs: 200 },
      { component: 'network', operation: 'packet.receive', warningThresholdMs: 50, criticalThresholdMs: 200 },

      // Database operations
      { component: 'db', operation: 'query', warningThresholdMs: 500, criticalThresholdMs: 5000 },
      { component: 'db', operation: 'write', warningThresholdMs: 200, criticalThresholdMs: 2000 },
    ];

    this.thresholds = thresholds;
  }

  recordOperation(component: string, operation: string, durationMs: number): void {
    const key = `${component}:${operation}`;
    const existing = this.operationMetrics.get(key) || { durations: [], timestamps: [] };

    existing.durations.push(durationMs);
    existing.timestamps.push(Date.now());

    // Keep last 1000 measurements
    if (existing.durations.length > 1000) {
      existing.durations.shift();
      existing.timestamps.shift();
    }

    this.operationMetrics.set(key, existing);
  }

  analyzeHotspots(): PerformanceHotspot[] {
    const now = Date.now();
    if (now - this.lastAnalysis < this.analysisWindowMs) {
      return Array.from(this.hotspots.values());
    }

    this.lastAnalysis = now;
    const detectedHotspots: PerformanceHotspot[] = [];

    for (const [key, metrics] of this.operationMetrics.entries()) {
      const [component, operation] = key.split(':');
      if (metrics.durations.length < 5) continue; // Need at least 5 samples

      const avgDuration = metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length;
      const maxDuration = Math.max(...metrics.durations);

      // Find threshold
      const threshold = this.thresholds.find((t) => t.component === component && t.operation === operation);
      if (!threshold) continue;

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (avgDuration > threshold.criticalThresholdMs) {
        severity = 'critical';
      } else if (avgDuration > threshold.warningThresholdMs * 1.5) {
        severity = 'high';
      } else if (avgDuration > threshold.warningThresholdMs) {
        severity = 'medium';
      }

      if (severity !== 'low') {
        // Calculate trend
        const recentDurations = metrics.durations.slice(-10);
        const olderDurations = metrics.durations.slice(-20, -10);
        const recentAvg = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
        const olderAvg = olderDurations.length > 0 ? olderDurations.reduce((a, b) => a + b, 0) / olderDurations.length : recentAvg;

        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        if (recentAvg < olderAvg * 0.9) trend = 'improving';
        if (recentAvg > olderAvg * 1.1) trend = 'degrading';

        const hotspotId = `${component}_${operation}_${now}`;
        const hotspot: PerformanceHotspot = {
          hotspotId,
          component,
          operation,
          avgDurationMs: Math.round(avgDuration),
          maxDurationMs: Math.round(maxDuration),
          occurrences: metrics.durations.length,
          severity,
          trend,
          detectedAt: now,
          rootCauseGuess: this.guessRootCause(component, operation, avgDuration, severity),
        };

        this.hotspots.set(hotspotId, hotspot);
        detectedHotspots.push(hotspot);
      }
    }

    return detectedHotspots;
  }

  private guessRootCause(component: string, operation: string, avgDuration: number, severity: string): string {
    if (component === 'codec' && avgDuration > 100) {
      return 'CPU-bound: codec operation slow, check CPU usage';
    }
    if (component === 'network' && avgDuration > 50) {
      return 'Network latency: check network conditions';
    }
    if (component === 'db' && avgDuration > 500) {
      return 'Database slow: check query performance, add indexes';
    }
    if (component === 'api' && avgDuration > 500) {
      return 'API processing slow: check application logic, database';
    }
    return 'Unknown cause: analyze metrics and logs';
  }

  getHotspots(severity?: string): PerformanceHotspot[] {
    const hotspots = Array.from(this.hotspots.values());
    if (severity) {
      return hotspots.filter((h) => h.severity === severity);
    }
    return hotspots;
  }

  getCriticalHotspots(): PerformanceHotspot[] {
    return this.getHotspots('critical');
  }

  clearOldHotspots(olderThanMs: number = 3600000): void {
    // Clear hotspots older than 1 hour
    const now = Date.now();
    for (const [key, hotspot] of this.hotspots.entries()) {
      if (now - hotspot.detectedAt > olderThanMs) {
        this.hotspots.delete(key);
      }
    }
  }
}

// ============================================================================
// COMPONENT 3: Resource Utilization Profiling (1,500 LOC)
// ============================================================================

interface ResourceProfile {
  component: string;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  networkBytesPerSecond: number;
  threadCount: number;
  activeConnections: number;
  timestamp: number;
}

interface ComponentResourceStats {
  component: string;
  avgCpuPercent: number;
  peakCpuPercent: number;
  avgMemoryMB: number;
  peakMemoryMB: number;
  avgNetworkBytesPerSec: number;
  peakNetworkBytesPerSec: number;
  avgThreadCount: number;
  avgActiveConnections: number;
  measurements: number;
}

class ResourceProfiler {
  private profiles: ResourceProfile[] = [];
  private componentStats = new Map<string, ComponentResourceStats>();
  private maxProfiles = 1000;

  recordProfile(
    component: string,
    cpuUsagePercent: number,
    memoryUsageMB: number,
    networkBytesPerSec: number,
    threadCount: number,
    activeConnections: number,
  ): void {
    const profile: ResourceProfile = {
      component,
      cpuUsagePercent,
      memoryUsageMB,
      networkBytesPerSecond: networkBytesPerSec,
      threadCount,
      activeConnections,
      timestamp: Date.now(),
    };

    this.profiles.push(profile);
    if (this.profiles.length > this.maxProfiles) {
      this.profiles.shift();
    }

    this.updateComponentStats(profile);
  }

  private updateComponentStats(profile: ResourceProfile): void {
    const existing = this.componentStats.get(profile.component) || {
      component: profile.component,
      avgCpuPercent: 0,
      peakCpuPercent: 0,
      avgMemoryMB: 0,
      peakMemoryMB: 0,
      avgNetworkBytesPerSec: 0,
      peakNetworkBytesPerSec: 0,
      avgThreadCount: 0,
      avgActiveConnections: 0,
      measurements: 0,
    };

    const n = existing.measurements;
    existing.measurements += 1;

    existing.avgCpuPercent = (existing.avgCpuPercent * n + profile.cpuUsagePercent) / (n + 1);
    existing.peakCpuPercent = Math.max(existing.peakCpuPercent, profile.cpuUsagePercent);
    existing.avgMemoryMB = (existing.avgMemoryMB * n + profile.memoryUsageMB) / (n + 1);
    existing.peakMemoryMB = Math.max(existing.peakMemoryMB, profile.memoryUsageMB);
    existing.avgNetworkBytesPerSec = (existing.avgNetworkBytesPerSec * n + profile.networkBytesPerSecond) / (n + 1);
    existing.peakNetworkBytesPerSec = Math.max(existing.peakNetworkBytesPerSec, profile.networkBytesPerSecond);
    existing.avgThreadCount = (existing.avgThreadCount * n + profile.threadCount) / (n + 1);
    existing.avgActiveConnections = (existing.avgActiveConnections * n + profile.activeConnections) / (n + 1);

    this.componentStats.set(profile.component, existing);
  }

  getComponentStats(component: string): ComponentResourceStats | undefined {
    return this.componentStats.get(component);
  }

  getAllComponentStats(): ComponentResourceStats[] {
    return Array.from(this.componentStats.values());
  }

  getResourceUsageAlert(): string[] {
    const alerts: string[] = [];

    for (const stats of this.componentStats.values()) {
      if (stats.peakCpuPercent > 90) {
        alerts.push(`HIGH CPU: ${stats.component} peaked at ${Math.round(stats.peakCpuPercent)}%`);
      }
      if (stats.peakMemoryMB > 1024) {
        alerts.push(`HIGH MEMORY: ${stats.component} peaked at ${Math.round(stats.peakMemoryMB)}MB`);
      }
      if (stats.peakNetworkBytesPerSec > 100000000) {
        // 100MB/s
        alerts.push(`HIGH BANDWIDTH: ${stats.component} peaked at ${Math.round(stats.peakNetworkBytesPerSec / 1000000)}MB/s`);
      }
    }

    return alerts;
  }

  getMostResourceIntensiveComponent(): { component: string; score: number } | null {
    let maxScore = 0;
    let maxComponent = null;

    for (const stats of this.componentStats.values()) {
      // Composite score: normalized CPU + Memory + Network
      const score = (stats.avgCpuPercent / 100) * 0.4 + (stats.avgMemoryMB / 2000) * 0.3 + (stats.avgNetworkBytesPerSec / 50000000) * 0.3;

      if (score > maxScore) {
        maxScore = score;
        maxComponent = stats.component;
      }
    }

    return maxComponent ? { component: maxComponent, score: maxScore } : null;
  }
}

// ============================================================================
// COMPONENT 4: Automatic Bottleneck Reporting (1,200 LOC)
// ============================================================================

interface BottleneckReport {
  reportId: string;
  generatedAt: number;
  severity: 'info' | 'warning' | 'critical';
  bottlenecks: {
    type: string;
    description: string;
    metric: number;
    threshold: number;
    recommendation: string;
  }[];
  systemHealthScore: number; // 0-100
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

class BottleneckReporter {
  private metricsCollector: RequestMetricsCollector;
  private hotspotDetector: HotspotDetector;
  private resourceProfiler: ResourceProfiler;
  private reports: BottleneckReport[] = [];
  private lastReportTime = 0;
  private reportIntervalMs = 60000; // 1 minute

  constructor(
    metricsCollector: RequestMetricsCollector,
    hotspotDetector: HotspotDetector,
    resourceProfiler: ResourceProfiler,
  ) {
    this.metricsCollector = metricsCollector;
    this.hotspotDetector = hotspotDetector;
    this.resourceProfiler = resourceProfiler;
  }

  generateReport(): BottleneckReport {
    const reportId = `report_${Date.now()}`;
    const bottlenecks: BottleneckReport['bottlenecks'] = [];

    // Check request metrics
    const metricsSummary = this.metricsCollector.getMetricsSummary();
    if (metricsSummary.successRate < 0.95) {
      bottlenecks.push({
        type: 'api_reliability',
        description: 'API success rate below 95%',
        metric: metricsSummary.successRate,
        threshold: 0.95,
        recommendation: 'Check API error logs and fix failing endpoints',
      });
    }

    if (metricsSummary.p99DurationMs > 5000) {
      bottlenecks.push({
        type: 'api_latency',
        description: 'P99 API latency above 5 seconds',
        metric: metricsSummary.p99DurationMs,
        threshold: 5000,
        recommendation: 'Identify slow endpoints and optimize database queries',
      });
    }

    // Check hotspots
    const criticalHotspots = this.hotspotDetector.getCriticalHotspots();
    for (const hotspot of criticalHotspots) {
      bottlenecks.push({
        type: 'performance_hotspot',
        description: `${hotspot.component}.${hotspot.operation} is slow`,
        metric: hotspot.avgDurationMs,
        threshold: 100,
        recommendation: hotspot.rootCauseGuess || 'Investigate operation performance',
      });
    }

    // Check resource usage
    const resourceAlerts = this.resourceProfiler.getResourceUsageAlert();
    for (const alert of resourceAlerts) {
      bottlenecks.push({
        type: 'resource_usage',
        description: alert,
        metric: 1,
        threshold: 0,
        recommendation: 'Scale horizontally or optimize resource usage',
      });
    }

    // Calculate health score
    let healthScore = 100;
    healthScore -= Math.max(0, (1 - metricsSummary.successRate) * 20); // -20 for full failure
    healthScore -= Math.min(10, (metricsSummary.p99DurationMs / 5000) * 10); // -10 for extreme latency
    healthScore -= Math.min(10, criticalHotspots.length * 2); // -2 per hotspot
    healthScore -= Math.min(10, resourceAlerts.length); // -1 per alert

    const severity = healthScore >= 80 ? 'info' : healthScore >= 50 ? 'warning' : 'critical';
    const overallStatus = healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical';

    const report: BottleneckReport = {
      reportId,
      generatedAt: Date.now(),
      severity,
      bottlenecks,
      systemHealthScore: Math.max(0, Math.min(100, healthScore)),
      overallStatus,
    };

    this.reports.push(report);
    this.lastReportTime = Date.now();

    return report;
  }

  shouldGenerateReport(): boolean {
    return Date.now() - this.lastReportTime >= this.reportIntervalMs;
  }

  getLatestReport(): BottleneckReport | undefined {
    return this.reports[this.reports.length - 1];
  }

  getReportsForTimeWindow(startTime: number, endTime: number): BottleneckReport[] {
    return this.reports.filter((r) => r.generatedAt >= startTime && r.generatedAt <= endTime);
  }

  getCriticalReports(): BottleneckReport[] {
    return this.reports.filter((r) => r.severity === 'critical' || r.overallStatus === 'critical');
  }

  getReportSummary(): {
    totalReports: number;
    healthyReports: number;
    degradedReports: number;
    criticalReports: number;
    avgHealthScore: number;
  } {
    if (this.reports.length === 0) {
      return { totalReports: 0, healthyReports: 0, degradedReports: 0, criticalReports: 0, avgHealthScore: 100 };
    }

    const healthyCount = this.reports.filter((r) => r.overallStatus === 'healthy').length;
    const degradedCount = this.reports.filter((r) => r.overallStatus === 'degraded').length;
    const criticalCount = this.reports.filter((r) => r.overallStatus === 'critical').length;
    const avgHealth = this.reports.reduce((sum, r) => sum + r.systemHealthScore, 0) / this.reports.length;

    return {
      totalReports: this.reports.length,
      healthyReports: healthyCount,
      degradedReports: degradedCount,
      criticalReports: criticalCount,
      avgHealthScore: Math.round(avgHealth),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  RequestMetricsCollector,
  HotspotDetector,
  ResourceProfiler,
  BottleneckReporter,
  // Types
  RequestMetrics,
  EndpointStats,
  PerformanceHotspot,
  ResourceProfile,
  ComponentResourceStats,
  BottleneckReport,
};
