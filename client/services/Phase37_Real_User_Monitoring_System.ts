/**
 * Phase 37: Real User Monitoring & User Experience Analytics System
 *
 * Tracks actual user experience metrics from client perspective:
 * - Performance (latency, errors, network conditions)
 * - User behavior (sessions, journeys, engagement)
 * - Experience analysis (UX bottlenecks, regional comparison)
 * - Performance profiling (component-level optimization)
 *
 * Complements:
 * - Phase 32: SLA compliance (system perspective)
 * - Phase 36: Usage analytics (consumption perspective)
 * - Phase 37: User experience metrics (user perspective)
 */

/**
 * Component 1: Real User Monitoring (RUM)
 * Purpose: Collect and track user-side performance metrics from browsers/clients
 *
 * Features:
 * - Record page/app load times, API response latency from user perspective
 * - Track network conditions (RTT, bandwidth, packet loss)
 * - Record errors and exceptions from user perspective
 * - Capture device/browser/geo information
 * - Calculate Core Web Vitals (LCP, FID, CLS)
 */
export interface PerformanceMetric {
  metricId: string;
  tenantId: string;
  userId?: string;
  sessionId: string;
  endpoint: string;
  metricType: 'latency' | 'error' | 'network' | 'resource' | 'core_vital';
  value: number;
  timestamp: number;
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  geoLocation?: { country: string; region: string; city: string };
  networkType?: '4g' | '5g' | 'wifi' | 'broadband' | 'unknown';
  isError: boolean;
  errorMessage?: string;
}

export interface CoreWebVital {
  vitalType: 'lcp' | 'fid' | 'cls' | 'ttfb'; // Largest Contentful Paint, First Input Delay, Cumulative Layout Shift, Time to First Byte
  value: number;
  rating: 'good' | 'needs_improvement' | 'poor';
  timestamp: number;
}

export interface NetworkCondition {
  conditionId: string;
  sessionId: string;
  rtt: number; // Round-trip time in ms
  bandwidth: number; // Estimated in Mbps
  packetLoss: number; // Percentage
  jitter: number; // Milliseconds
  timestamp: number;
}

export class RealUserMonitoring {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private coreVitals: Map<string, CoreWebVital> = new Map();
  private networkConditions: Map<string, NetworkCondition> = new Map();

  /**
   * Record a performance metric from user client
   */
  recordMetric(metric: Omit<PerformanceMetric, 'metricId'>): string {
    const metricId = `metric_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fullMetric: PerformanceMetric = { ...metric, metricId };
    this.metrics.set(metricId, fullMetric);
    return metricId;
  }

  /**
   * Record Core Web Vital measurement
   */
  recordCoreWebVital(sessionId: string, vitalType: 'lcp' | 'fid' | 'cls' | 'ttfb', value: number): string {
    const vitalId = `vital_${sessionId}_${vitalType}_${Date.now()}`;
    const rating = this.rateWebVital(vitalType, value);
    const vital: CoreWebVital = { vitalType, value, rating, timestamp: Date.now() };
    this.coreVitals.set(vitalId, vital);
    return vitalId;
  }

  /**
   * Record network condition snapshot
   */
  recordNetworkCondition(sessionId: string, rtt: number, bandwidth: number, packetLoss: number, jitter: number): string {
    const conditionId = `network_${sessionId}_${Date.now()}`;
    const condition: NetworkCondition = { conditionId, sessionId, rtt, bandwidth, packetLoss, jitter, timestamp: Date.now() };
    this.networkConditions.set(conditionId, condition);
    return conditionId;
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(tenantId: string, endpoint: string, hoursBack: number = 24): PerformanceMetric[] {
    const cutoff = Date.now() - hoursBack * 3600000;
    return Array.from(this.metrics.values()).filter(
      m => m.tenantId === tenantId && m.endpoint === endpoint && m.timestamp > cutoff
    );
  }

  /**
   * Calculate average latency for endpoint
   */
  getAverageLatency(tenantId: string, endpoint: string, hoursBack: number = 24): number {
    const metrics = this.getEndpointMetrics(tenantId, endpoint, hoursBack).filter(
      m => m.metricType === 'latency' && !m.isError
    );
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  /**
   * Calculate error rate for endpoint from user perspective
   */
  getErrorRate(tenantId: string, endpoint: string, hoursBack: number = 24): number {
    const metrics = this.getEndpointMetrics(tenantId, endpoint, hoursBack);
    if (metrics.length === 0) return 0;
    const errorCount = metrics.filter(m => m.isError).length;
    return (errorCount / metrics.length) * 100;
  }

  /**
   * Get percentile latency (P50, P95, P99)
   */
  getLatencyPercentile(tenantId: string, endpoint: string, percentile: 50 | 95 | 99, hoursBack: number = 24): number {
    const metrics = this.getEndpointMetrics(tenantId, endpoint, hoursBack)
      .filter(m => m.metricType === 'latency' && !m.isError)
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (metrics.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * metrics.length) - 1;
    return metrics[Math.max(0, index)];
  }

  /**
   * Get device breakdown of metrics
   */
  getMetricsByDevice(tenantId: string, endpoint: string, hoursBack: number = 24): Map<string, { avgLatency: number; errorRate: number; count: number }> {
    const metrics = this.getEndpointMetrics(tenantId, endpoint, hoursBack);
    const byDevice = new Map<string, PerformanceMetric[]>();

    metrics.forEach(m => {
      if (!byDevice.has(m.device)) byDevice.set(m.device, []);
      byDevice.get(m.device)!.push(m);
    });

    const result = new Map<string, { avgLatency: number; errorRate: number; count: number }>();
    byDevice.forEach((mList, device) => {
      const latencyMetrics = mList.filter(m => m.metricType === 'latency' && !m.isError);
      const avgLatency = latencyMetrics.length > 0 ? latencyMetrics.reduce((s, m) => s + m.value, 0) / latencyMetrics.length : 0;
      const errorRate = mList.filter(m => m.isError).length / mList.length * 100;
      result.set(device, { avgLatency, errorRate, count: mList.length });
    });

    return result;
  }

  /**
   * Get geo-based performance analysis
   */
  getGeoPerformance(tenantId: string, endpoint: string, hoursBack: number = 24): Map<string, { avgLatency: number; errorRate: number; rtt: number }> {
    const metrics = this.getEndpointMetrics(tenantId, endpoint, hoursBack);
    const byGeo = new Map<string, { metrics: PerformanceMetric[]; networks: NetworkCondition[] }>();

    metrics.forEach(m => {
      const geoKey = m.geoLocation ? `${m.geoLocation.country}_${m.geoLocation.region}` : 'unknown';
      if (!byGeo.has(geoKey)) byGeo.set(geoKey, { metrics: [], networks: [] });
      byGeo.get(geoKey)!.metrics.push(m);
    });

    // Attach network conditions to geo regions
    this.networkConditions.forEach(nc => {
      // Find matching session/user for network condition
      const sessionMetrics = Array.from(this.metrics.values()).filter(m => m.sessionId === nc.sessionId);
      if (sessionMetrics.length > 0) {
        const geo = sessionMetrics[0].geoLocation;
        const geoKey = geo ? `${geo.country}_${geo.region}` : 'unknown';
        if (byGeo.has(geoKey)) byGeo.get(geoKey)!.networks.push(nc);
      }
    });

    const result = new Map<string, { avgLatency: number; errorRate: number; rtt: number }>();
    byGeo.forEach((data, geo) => {
      const latencyMetrics = data.metrics.filter(m => m.metricType === 'latency' && !m.isError);
      const avgLatency = latencyMetrics.length > 0 ? latencyMetrics.reduce((s, m) => s + m.value, 0) / latencyMetrics.length : 0;
      const errorRate = data.metrics.filter(m => m.isError).length / data.metrics.length * 100;
      const avgRtt = data.networks.length > 0 ? data.networks.reduce((s, n) => s + n.rtt, 0) / data.networks.length : 0;
      result.set(geo, { avgLatency, errorRate, rtt: avgRtt });
    });

    return result;
  }

  /**
   * Get Core Web Vitals for session
   */
  getCoreWebVitals(sessionId: string): CoreWebVital[] {
    return Array.from(this.coreVitals.values()).filter(v => {
      const metric = Array.from(this.metrics.values()).find(m => m.sessionId === sessionId);
      return !!metric;
    });
  }

  /**
   * Calculate overall user experience score (0-100)
   */
  calculateUserExperienceScore(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const metrics = Array.from(this.metrics.values()).filter(m => m.tenantId === tenantId && m.timestamp > cutoff);

    if (metrics.length === 0) return 100;

    // Score based on: latency (40%), error rate (40%), network (20%)
    const latencies = metrics.filter(m => m.metricType === 'latency' && !m.isError).map(m => m.value);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const latencyScore = Math.max(0, 100 - (avgLatency / 10)); // Good if <100ms

    const errorRate = (metrics.filter(m => m.isError).length / metrics.length) * 100;
    const errorScore = 100 - errorRate;

    const networkMetrics = Array.from(this.networkConditions.values());
    const avgRtt = networkMetrics.length > 0 ? networkMetrics.reduce((s, n) => s + n.rtt, 0) / networkMetrics.length : 0;
    const networkScore = Math.max(0, 100 - (avgRtt / 2)); // Good if <50ms RTT

    return (latencyScore * 0.4 + errorScore * 0.4 + networkScore * 0.2);
  }

  private rateWebVital(vitalType: string, value: number): 'good' | 'needs_improvement' | 'poor' {
    // Google Web Vitals thresholds
    const thresholds = {
      lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
      fid: { good: 100, needsImprovement: 300 },   // First Input Delay
      cls: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
      ttfb: { good: 600, needsImprovement: 1800 }  // Time to First Byte
    };

    const threshold = (thresholds as any)[vitalType];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs_improvement';
    return 'poor';
  }
}

/**
 * Component 2: Session Manager
 * Purpose: Track user sessions and behavior patterns
 *
 * Features:
 * - Create and track sessions with metadata
 * - Build user journeys (sequence of actions)
 * - Track session duration, engagement metrics
 * - Calculate retention and churn
 */
export interface UserSession {
  sessionId: string;
  tenantId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds
  actions: Array<{ action: string; timestamp: number; feature: string }>;
  features: string[];
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  geoLocation?: { country: string; region: string };
  isEngaged: boolean; // More than 1 minute and multiple actions
}

export interface UserJourney {
  journeyId: string;
  tenantId: string;
  userId: string;
  startFeature: string;
  endFeature: string;
  pathTaken: string[]; // Sequence of features
  conversionStatus: 'success' | 'abandoned' | 'in_progress';
  duration: number; // ms
  timestamp: number;
}

export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private journeys: Map<string, UserJourney> = new Map();

  /**
   * Create a new user session
   */
  createSession(tenantId: string, userId: string, device: 'mobile' | 'tablet' | 'desktop', browser: string): string {
    const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const session: UserSession = {
      sessionId,
      tenantId,
      userId,
      startTime: Date.now(),
      actions: [],
      features: [],
      device,
      browser,
      isEngaged: false
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Record user action within session
   */
  recordAction(sessionId: string, action: string, feature: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.actions.push({ action, timestamp: Date.now(), feature });
    if (!session.features.includes(feature)) {
      session.features.push(feature);
    }
  }

  /**
   * End user session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.isEngaged = session.duration > 60000 && session.actions.length > 1; // >1min, >1 action
  }

  /**
   * Create user journey from actions
   */
  createJourney(tenantId: string, userId: string, startFeature: string, endFeature: string, actions: Array<{ feature: string; timestamp: number }>): string {
    const journeyId = `journey_${userId}_${Date.now()}`;
    const pathTaken = actions.map(a => a.feature);
    const duration = actions.length > 0 ? actions[actions.length - 1].timestamp - actions[0].timestamp : 0;

    const journey: UserJourney = {
      journeyId,
      tenantId,
      userId,
      startFeature,
      endFeature,
      pathTaken,
      conversionStatus: 'success',
      duration,
      timestamp: Date.now()
    };

    this.journeys.set(journeyId, journey);
    return journeyId;
  }

  /**
   * Get user sessions
   */
  getUserSessions(tenantId: string, userId: string): UserSession[] {
    return Array.from(this.sessions.values()).filter(s => s.tenantId === tenantId && s.userId === userId);
  }

  /**
   * Get session details
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Calculate average session duration
   */
  getAverageSessionDuration(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const sessions = Array.from(this.sessions.values()).filter(s => s.tenantId === tenantId && s.startTime > cutoff && s.duration);

    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
  }

  /**
   * Calculate engagement rate
   */
  getEngagementRate(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const sessions = Array.from(this.sessions.values()).filter(s => s.tenantId === tenantId && s.startTime > cutoff);

    if (sessions.length === 0) return 0;
    const engaged = sessions.filter(s => s.isEngaged).length;
    return (engaged / sessions.length) * 100;
  }

  /**
   * Get feature adoption from sessions
   */
  getFeatureAdoptionFromSessions(tenantId: string, hoursBack: number = 24): Map<string, number> {
    const cutoff = Date.now() - hoursBack * 3600000;
    const sessions = Array.from(this.sessions.values()).filter(s => s.tenantId === tenantId && s.startTime > cutoff);

    const adoption = new Map<string, number>();
    sessions.forEach(s => {
      s.features.forEach(f => {
        adoption.set(f, (adoption.get(f) || 0) + 1);
      });
    });

    return adoption;
  }

  /**
   * Get user journey success rate
   */
  getJourneySuccessRate(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const journeys = Array.from(this.journeys.values()).filter(j => j.tenantId === tenantId && j.timestamp > cutoff);

    if (journeys.length === 0) return 0;
    const successful = journeys.filter(j => j.conversionStatus === 'success').length;
    return (successful / journeys.length) * 100;
  }

  /**
   * Get user retention (returning users)
   */
  getUserRetention(tenantId: string, daysBack: number = 7): Map<number, number> {
    const cutoff = Date.now() - daysBack * 86400000;
    const sessionsByUser = new Map<string, UserSession[]>();

    Array.from(this.sessions.values())
      .filter(s => s.tenantId === tenantId && s.startTime > cutoff)
      .forEach(s => {
        if (!sessionsByUser.has(s.userId)) sessionsByUser.set(s.userId, []);
        sessionsByUser.get(s.userId)!.push(s);
      });

    const retention = new Map<number, number>();
    let totalUsers = 0;
    let returningUsers = 0;

    sessionsByUser.forEach(sessions => {
      if (sessions.length > 0) totalUsers++;
      if (sessions.length > 1) returningUsers++;
    });

    return new Map([[totalUsers, returningUsers]]);
  }
}

/**
 * Component 3: User Experience Analyzer
 * Purpose: Analyze UX metrics and identify bottlenecks
 *
 * Features:
 * - Calculate user satisfaction scores
 * - Identify UX bottlenecks
 * - Compare experience across regions/devices
 * - Generate UX recommendations
 */
export interface UXBottleneck {
  bottleneckId: string;
  endpoint: string;
  issue: 'high_latency' | 'high_error_rate' | 'poor_web_vital' | 'device_specific' | 'geo_specific';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  percentageAffected: number;
  recommendation: string;
  timestamp: number;
}

export interface UserSatisfactionScore {
  scoreId: string;
  tenantId: string;
  endpoint: string;
  score: number; // 0-100
  components: { latency: number; errorRate: number; webVitals: number };
  basedOnMetrics: number; // Count of metrics included
  timestamp: number;
}

export class UserExperienceAnalyzer {
  private bottlenecks: Map<string, UXBottleneck> = new Map();
  private satisfactionScores: Map<string, UserSatisfactionScore> = new Map();

  /**
   * Analyze endpoint for UX bottlenecks
   */
  analyzeEndpoint(rum: RealUserMonitoring, sessionMgr: SessionManager, tenantId: string, endpoint: string, hoursBack: number = 24): UXBottleneck[] {
    const bottlenecks: UXBottleneck[] = [];
    const metrics = rum.getEndpointMetrics(tenantId, endpoint, hoursBack);

    if (metrics.length === 0) return bottlenecks;

    const avgLatency = rum.getAverageLatency(tenantId, endpoint, hoursBack);
    const errorRate = rum.getErrorRate(tenantId, endpoint, hoursBack);
    const p95Latency = rum.getLatencyPercentile(tenantId, endpoint, 95, hoursBack);

    // Check for high latency
    if (avgLatency > 2000) { // >2 seconds
      const bottleneckId = `uxb_${endpoint}_latency_${Date.now()}`;
      bottlenecks.push({
        bottleneckId,
        endpoint,
        issue: 'high_latency',
        severity: avgLatency > 5000 ? 'critical' : 'high',
        affectedUsers: metrics.length,
        percentageAffected: 100,
        recommendation: `Optimize ${endpoint}: average latency ${avgLatency.toFixed(0)}ms. Consider caching, CDN, or code optimization.`,
        timestamp: Date.now()
      });
    }

    // Check for high error rate
    if (errorRate > 5) { // >5% error rate
      const bottleneckId = `uxb_${endpoint}_errors_${Date.now()}`;
      bottlenecks.push({
        bottleneckId,
        endpoint,
        issue: 'high_error_rate',
        severity: errorRate > 15 ? 'critical' : 'high',
        affectedUsers: Math.ceil(metrics.length * (errorRate / 100)),
        percentageAffected: errorRate,
        recommendation: `High error rate on ${endpoint}: ${errorRate.toFixed(1)}%. Investigate error patterns and root causes.`,
        timestamp: Date.now()
      });
    }

    // Check device-specific issues
    const byDevice = rum.getMetricsByDevice(tenantId, endpoint, hoursBack);
    byDevice.forEach((stats, device) => {
      if (stats.avgLatency > 3000) { // Device-specific slowness
        const bottleneckId = `uxb_${endpoint}_${device}_${Date.now()}`;
        bottlenecks.push({
          bottleneckId,
          endpoint,
          issue: 'device_specific',
          severity: 'medium',
          affectedUsers: stats.count,
          percentageAffected: 100,
          recommendation: `${device.toUpperCase()} users experience ${stats.avgLatency.toFixed(0)}ms latency on ${endpoint}. Consider device-specific optimization.`,
          timestamp: Date.now()
        });
      }
    });

    // Check geo-specific issues
    const byGeo = rum.getGeoPerformance(tenantId, endpoint, hoursBack);
    byGeo.forEach((stats, geo) => {
      if (stats.avgLatency > 3000 || stats.rtt > 100) {
        const bottleneckId = `uxb_${endpoint}_${geo}_${Date.now()}`;
        bottlenecks.push({
          bottleneckId,
          endpoint,
          issue: 'geo_specific',
          severity: 'medium',
          affectedUsers: 0,
          percentageAffected: 0,
          recommendation: `Users in ${geo} experience ${stats.avgLatency.toFixed(0)}ms latency. Consider regional CDN or edge deployment.`,
          timestamp: Date.now()
        });
      }
    });

    bottlenecks.forEach(b => this.bottlenecks.set(b.bottleneckId, b));
    return bottlenecks;
  }

  /**
   * Calculate user satisfaction score for endpoint
   */
  calculateSatisfactionScore(rum: RealUserMonitoring, tenantId: string, endpoint: string, hoursBack: number = 24): number {
    const metrics = rum.getEndpointMetrics(tenantId, endpoint, hoursBack);
    if (metrics.length === 0) return 0;

    const avgLatency = rum.getAverageLatency(tenantId, endpoint, hoursBack);
    const errorRate = rum.getErrorRate(tenantId, endpoint, hoursBack);

    // Latency score: 100 if <500ms, scales down to 0 at >5000ms
    const latencyScore = Math.max(0, 100 - ((avgLatency - 500) / 45));

    // Error rate score: 100 if 0%, scales down to 0 at >20%
    const errorScore = Math.max(0, 100 - (errorRate * 5));

    // Web Vitals score (estimated from latency as proxy)
    const webVitalsScore = latencyScore * 0.8 + 20; // Latency dominates web vitals

    // Overall: 40% latency, 40% errors, 20% web vitals
    const score = (latencyScore * 0.4 + errorScore * 0.4 + webVitalsScore * 0.2);

    const scoreId = `uxs_${endpoint}_${Date.now()}`;
    const satisfactionScore: UserSatisfactionScore = {
      scoreId,
      tenantId,
      endpoint,
      score: Math.max(0, Math.min(100, score)),
      components: {
        latency: latencyScore,
        errorRate: errorScore,
        webVitals: webVitalsScore
      },
      basedOnMetrics: metrics.length,
      timestamp: Date.now()
    };

    this.satisfactionScores.set(scoreId, satisfactionScore);
    return satisfactionScore.score;
  }

  /**
   * Get critical UX bottlenecks
   */
  getCriticalBottlenecks(tenantId: string): UXBottleneck[] {
    return Array.from(this.bottlenecks.values()).filter(b => b.severity === 'critical');
  }

  /**
   * Get average satisfaction score
   */
  getAverageSatisfactionScore(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const scores = Array.from(this.satisfactionScores.values()).filter(
      s => s.tenantId === tenantId && s.timestamp > cutoff
    );

    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  }

  /**
   * Rank endpoints by satisfaction score
   */
  rankEndpointsBySatisfaction(tenantId: string, hoursBack: number = 24): Array<{ endpoint: string; score: number }> {
    const cutoff = Date.now() - hoursBack * 3600000;
    const endpointScores = new Map<string, { sum: number; count: number }>();

    Array.from(this.satisfactionScores.values())
      .filter(s => s.tenantId === tenantId && s.timestamp > cutoff)
      .forEach(s => {
        if (!endpointScores.has(s.endpoint)) {
          endpointScores.set(s.endpoint, { sum: 0, count: 0 });
        }
        const data = endpointScores.get(s.endpoint)!;
        data.sum += s.score;
        data.count++;
      });

    const ranked = Array.from(endpointScores.entries())
      .map(([endpoint, data]) => ({ endpoint, score: data.sum / data.count }))
      .sort((a, b) => a.score - b.score); // Lowest satisfaction first (highest priority)

    return ranked;
  }

  /**
   * Generate UX recommendations
   */
  generateRecommendations(tenantId: string): string[] {
    const recommendations: string[] = [];
    const criticalBottlenecks = this.getCriticalBottlenecks(tenantId);

    if (criticalBottlenecks.length > 0) {
      recommendations.push(`⚠️ CRITICAL: ${criticalBottlenecks.length} critical UX bottlenecks detected`);
    }

    const avgScore = this.getAverageSatisfactionScore(tenantId);
    if (avgScore < 50) {
      recommendations.push('🔴 Overall user satisfaction is poor (<50). Prioritize latency and error rate reduction.');
    } else if (avgScore < 75) {
      recommendations.push('🟡 User satisfaction is moderate. Focus on high-latency endpoints.');
    } else {
      recommendations.push('🟢 User experience is good. Continue monitoring for regressions.');
    }

    return recommendations;
  }
}

/**
 * Component 4: Performance Profiler
 * Purpose: Profile component performance and identify slow operations
 *
 * Features:
 * - Track function execution times
 * - Identify slow operations
 * - Monitor memory/CPU usage
 * - Generate performance recommendations
 */
export interface FunctionProfile {
  profileId: string;
  tenantId: string;
  functionName: string;
  callCount: number;
  totalTime: number; // ms
  averageTime: number; // ms
  minTime: number;
  maxTime: number;
  p95Time: number;
  isSlowFunction: boolean; // >100ms average
  timestamp: number;
}

export interface MemoryProfile {
  profileId: string;
  tenantId: string;
  componentName: string;
  memoryUsage: number; // MB
  heapSize: number; // MB
  gcCount: number;
  timestamp: number;
}

export interface PerformanceRecommendation {
  recommendationId: string;
  category: 'function' | 'memory' | 'caching' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImpact: string;
  timestamp: number;
}

export class PerformanceProfiler {
  private functionProfiles: Map<string, FunctionProfile> = new Map();
  private memoryProfiles: Map<string, MemoryProfile> = new Map();
  private recommendations: Map<string, PerformanceRecommendation> = new Map();

  /**
   * Record function execution time
   */
  recordFunctionCall(tenantId: string, functionName: string, executionTime: number): void {
    const profileKey = `${tenantId}_${functionName}`;
    let profile = this.functionProfiles.get(profileKey);

    if (!profile) {
      const profileId = `func_${functionName}_${Date.now()}`;
      profile = {
        profileId,
        tenantId,
        functionName,
        callCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: executionTime,
        maxTime: executionTime,
        p95Time: executionTime,
        isSlowFunction: false,
        timestamp: Date.now()
      };
      this.functionProfiles.set(profileKey, profile);
    }

    profile.callCount++;
    profile.totalTime += executionTime;
    profile.averageTime = profile.totalTime / profile.callCount;
    profile.minTime = Math.min(profile.minTime, executionTime);
    profile.maxTime = Math.max(profile.maxTime, executionTime);
    profile.isSlowFunction = profile.averageTime > 100;
    profile.timestamp = Date.now();
  }

  /**
   * Record memory usage
   */
  recordMemoryProfile(tenantId: string, componentName: string, memoryUsage: number, heapSize: number, gcCount: number): string {
    const profileId = `mem_${componentName}_${Date.now()}`;
    const profile: MemoryProfile = {
      profileId,
      tenantId,
      componentName,
      memoryUsage,
      heapSize,
      gcCount,
      timestamp: Date.now()
    };

    this.memoryProfiles.set(profileId, profile);

    // Check for high memory usage
    if (memoryUsage > 512) { // >512 MB
      const recId = `rec_${componentName}_mem_${Date.now()}`;
      this.recommendations.set(recId, {
        recommendationId: recId,
        category: 'memory',
        priority: memoryUsage > 1024 ? 'critical' : 'high',
        description: `${componentName} using ${memoryUsage}MB. Consider memory optimization.`,
        estimatedImpact: 'Reduce memory pressure and improve overall performance',
        timestamp: Date.now()
      });
    }

    return profileId;
  }

  /**
   * Get slow functions
   */
  getSlowFunctions(tenantId: string): FunctionProfile[] {
    return Array.from(this.functionProfiles.values()).filter(
      f => f.tenantId === tenantId && f.isSlowFunction
    ).sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Get function profile
   */
  getFunctionProfile(tenantId: string, functionName: string): FunctionProfile | undefined {
    return this.functionProfiles.get(`${tenantId}_${functionName}`);
  }

  /**
   * Rank functions by average execution time
   */
  rankFunctionsByTime(tenantId: string): FunctionProfile[] {
    return Array.from(this.functionProfiles.values())
      .filter(f => f.tenantId === tenantId)
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(tenantId: string): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const slowFunctions = this.getSlowFunctions(tenantId);

    // Recommend caching for frequently called slow functions
    slowFunctions.slice(0, 5).forEach(func => {
      if (func.callCount > 1000) {
        const recId = `rec_cache_${func.functionName}_${Date.now()}`;
        recommendations.push({
          recommendationId: recId,
          category: 'caching',
          priority: 'high',
          description: `Add caching to ${func.functionName} (${func.averageTime.toFixed(0)}ms avg, ${func.callCount} calls)`,
          estimatedImpact: `Potential 50-80% latency reduction if cached`,
          timestamp: Date.now()
        });
      }
    });

    // Add stored recommendations
    recommendations.push(...Array.from(this.recommendations.values()).filter(r => r.tenantId === tenantId));

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(tenantId: string): number {
    const functions = Array.from(this.functionProfiles.values()).filter(f => f.tenantId === tenantId);
    if (functions.length === 0) return 100;

    let score = 100;
    functions.forEach(f => {
      if (f.averageTime > 500) score -= 10; // Very slow
      else if (f.averageTime > 100) score -= 5; // Slow
    });

    return Math.max(0, score);
  }
}
