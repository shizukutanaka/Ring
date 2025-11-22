/**
 * Phase 39: Predictive Experience Optimization & Prevention System
 *
 * Proactively prevents user experience degradation before it happens:
 * - Predict satisfaction degradation based on historical patterns
 * - Detect anomalies that precede degradation
 * - Assess risk for each endpoint and feature
 * - Execute preventive optimizations before issues occur
 * - Learn from preventive actions to improve predictions
 *
 * Complements:
 * - Phase 38: Reactive optimization (respond to current issues)
 * - Phase 39: Proactive optimization (prevent future issues)
 */

/**
 * Component 1: Degradation Predictor
 * Purpose: Predict when satisfaction will degrade using time-series analysis
 *
 * Features:
 * - Analyze historical satisfaction trends
 * - Detect declining patterns early
 * - Predict satisfaction at future times (1h, 4h, 24h)
 * - Confidence scoring based on trend consistency
 */
export interface SatisfactionForecast {
  forecastId: string;
  tenantId: string;
  endpoint: string;
  currentScore: number;
  forecastedScore1h: number; // Predicted score in 1 hour
  forecastedScore4h: number; // Predicted score in 4 hours
  forecastedScore24h: number; // Predicted score in 24 hours
  trendDirection: 'improving' | 'stable' | 'declining';
  confidence: number; // 0-1, based on historical consistency
  riskOfDegradation: boolean; // Will score drop below critical threshold?
  estimatedDegradationTime: number; // When will degradation occur? (timestamp)
  forecastedAt: number;
}

export interface HistoricalTrend {
  trendId: string;
  endpoint: string;
  tenantId: string;
  scoreHistory: Array<{ score: number; timestamp: number }>;
  averageScore: number;
  volatility: number; // Standard deviation
  degradationPatterns: Array<{ trigger: string; precedingLatency?: number; precedingErrors?: number }>;
  seasonality: Map<number, number>; // Hour of day -> avg score
  lastUpdated: number;
}

export class DegradationPredictor {
  private forecasts: Map<string, SatisfactionForecast> = new Map();
  private trends: Map<string, HistoricalTrend> = new Map();
  private criticalThreshold = 40; // Below this = critical
  private warningThreshold = 50; // Below this = warning

  /**
   * Predict satisfaction score at future times
   */
  predictSatisfaction(tenantId: string, endpoint: string, currentScore: number, historicalScores: Array<{ score: number; timestamp: number }>, volatility: number = 5): string {
    // Linear regression to predict trend
    if (historicalScores.length < 2) {
      const forecastId = `forecast_${endpoint}_${Date.now()}`;
      const forecast: SatisfactionForecast = {
        forecastId,
        tenantId,
        endpoint,
        currentScore,
        forecastedScore1h: currentScore,
        forecastedScore4h: currentScore,
        forecastedScore24h: currentScore,
        trendDirection: 'stable',
        confidence: 0.3, // Low confidence with few data points
        riskOfDegradation: currentScore < this.warningThreshold,
        estimatedDegradationTime: 0,
        forecastedAt: Date.now()
      };
      this.forecasts.set(forecastId, forecast);
      return forecastId;
    }

    // Calculate trend (simple linear regression)
    const n = Math.min(historicalScores.length, 20); // Use last 20 points
    const recentScores = historicalScores.slice(-n);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const startTime = recentScores[0].timestamp;

    recentScores.forEach((item, i) => {
      const x = i; // Time index
      const y = item.score;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict future scores (assuming 1 data point per hour)
    const forecasted1h = currentScore + slope * 1;
    const forecasted4h = currentScore + slope * 4;
    const forecasted24h = currentScore + slope * 24;

    // Determine trend
    let trendDirection: 'improving' | 'stable' | 'declining';
    if (slope > 2) trendDirection = 'improving';
    else if (slope < -2) trendDirection = 'declining';
    else trendDirection = 'stable';

    // Confidence based on consistency (low volatility = high confidence)
    const confidence = Math.max(0.1, 1 - (volatility / 100));

    // Check for degradation risk
    const riskOfDegradation = forecasted1h < this.warningThreshold || forecasted4h < this.criticalThreshold;

    // Estimate when degradation will occur
    let estimatedDegradationTime = 0;
    if (riskOfDegradation && slope < 0) {
      // Calculate when score will hit critical threshold
      const hoursUntilCritical = (this.criticalThreshold - currentScore) / slope;
      estimatedDegradationTime = hoursUntilCritical > 0 ? Date.now() + (hoursUntilCritical * 3600000) : 0;
    }

    const forecastId = `forecast_${endpoint}_${Date.now()}`;
    const forecast: SatisfactionForecast = {
      forecastId,
      tenantId,
      endpoint,
      currentScore,
      forecastedScore1h: Math.max(0, Math.min(100, forecasted1h)),
      forecastedScore4h: Math.max(0, Math.min(100, forecasted4h)),
      forecastedScore24h: Math.max(0, Math.min(100, forecasted24h)),
      trendDirection,
      confidence,
      riskOfDegradation,
      estimatedDegradationTime,
      forecastedAt: Date.now()
    };

    this.forecasts.set(forecastId, forecast);
    return forecastId;
  }

  /**
   * Record historical trend data
   */
  recordHistoricalTrend(tenantId: string, endpoint: string, scores: Array<{ score: number; timestamp: number }>, volatility: number, patterns: Array<any> = []): void {
    const trendKey = `${tenantId}_${endpoint}`;

    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;

    // Analyze seasonality (score by hour of day)
    const seasonality = new Map<number, number>();
    const hourScores: { [key: number]: number[] } = {};

    scores.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      if (!hourScores[hour]) hourScores[hour] = [];
      hourScores[hour].push(item.score);
    });

    Object.entries(hourScores).forEach(([hour, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      seasonality.set(parseInt(hour), avg);
    });

    const trend: HistoricalTrend = {
      trendId: `trend_${trendKey}_${Date.now()}`,
      endpoint,
      tenantId,
      scoreHistory: scores,
      averageScore: avgScore,
      volatility,
      degradationPatterns: patterns,
      seasonality,
      lastUpdated: Date.now()
    };

    this.trends.set(trendKey, trend);
  }

  /**
   * Get endpoints at risk of degradation
   */
  getAtRiskEndpoints(tenantId: string): SatisfactionForecast[] {
    return Array.from(this.forecasts.values())
      .filter(f => f.tenantId === tenantId && f.riskOfDegradation)
      .sort((a, b) => a.estimatedDegradationTime - b.estimatedDegradationTime);
  }

  /**
   * Get forecast for endpoint
   */
  getForecast(forecastId: string): SatisfactionForecast | undefined {
    return this.forecasts.get(forecastId);
  }

  /**
   * Get critical forecast (high risk soon)
   */
  getCriticalForecasts(tenantId: string): SatisfactionForecast[] {
    const now = Date.now();
    return Array.from(this.forecasts.values())
      .filter(f => f.tenantId === tenantId && f.riskOfDegradation && f.forecastedScore4h < this.criticalThreshold)
      .sort((a, b) => (a.estimatedDegradationTime || 0) - (b.estimatedDegradationTime || 0));
  }

  /**
   * Predict peak and valley hours
   */
  getPeakAndValleyHours(tenantId: string, endpoint: string): { peakHours: number[]; valleyHours: number[] } {
    const trend = this.trends.get(`${tenantId}_${endpoint}`);
    if (!trend) return { peakHours: [], valleyHours: [] };

    const sorted = Array.from(trend.seasonality.entries()).sort((a, b) => b[1] - a[1]);

    const peakHours = sorted.slice(0, 3).map(e => e[0]); // Top 3 hours
    const valleyHours = sorted.slice(-3).map(e => e[0]); // Bottom 3 hours

    return { peakHours, valleyHours };
  }
}

/**
 * Component 2: Anomaly Detector
 * Purpose: Detect unusual patterns that often precede degradation
 *
 * Features:
 * - Detect sudden latency spikes
 * - Detect error rate increases
 * - Detect traffic pattern changes
 * - Detect resource exhaustion
 * - Score anomaly severity
 */
export interface DetectedAnomaly {
  anomalyId: string;
  tenantId: string;
  endpoint: string;
  anomalyType: 'latency_spike' | 'error_rate_spike' | 'traffic_spike' | 'resource_exhaustion' | 'pattern_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  baselineValue: number;
  currentValue: number;
  deviation: number; // How many standard deviations from baseline
  detectedAt: number;
  precedesDegradation: boolean; // Does this pattern typically precede degradation?
  estimatedDegradationRisk: number; // 0-100
}

export interface AnomalyPattern {
  patternId: string;
  anomalyType: string;
  endpoint: string;
  occurrenceCount: number;
  followedByDegradation: number; // Count of times followed by degradation
  averageTimeUntilDegradation: number; // minutes
  correlationWithDegradation: number; // 0-1
}

export class AnomalyDetector {
  private anomalies: Map<string, DetectedAnomaly> = new Map();
  private patterns: Map<string, AnomalyPattern> = new Map();

  /**
   * Detect latency spike anomaly
   */
  detectLatencySpike(tenantId: string, endpoint: string, baselineLatency: number, currentLatency: number, stdDev: number): string {
    const deviation = (currentLatency - baselineLatency) / stdDev;
    const isSpiking = deviation > 3; // 3 standard deviations

    if (!isSpiking) return '';

    const severity = deviation > 5 ? 'critical' : deviation > 4 ? 'high' : 'medium';

    const anomalyId = `anomaly_latency_${endpoint}_${Date.now()}`;
    const anomaly: DetectedAnomaly = {
      anomalyId,
      tenantId,
      endpoint,
      anomalyType: 'latency_spike',
      severity: severity as any,
      baselineValue: baselineLatency,
      currentValue: currentLatency,
      deviation,
      detectedAt: Date.now(),
      precedesDegradation: deviation > 4, // High deviation usually precedes degradation
      estimatedDegradationRisk: Math.min(100, deviation * 15)
    };

    this.anomalies.set(anomalyId, anomaly);
    return anomalyId;
  }

  /**
   * Detect error rate spike anomaly
   */
  detectErrorRateSpike(tenantId: string, endpoint: string, baselineErrorRate: number, currentErrorRate: number, stdDev: number): string {
    const deviation = (currentErrorRate - baselineErrorRate) / stdDev;
    const isSpiking = deviation > 2; // 2 standard deviations for errors

    if (!isSpiking) return '';

    const severity = currentErrorRate > 20 ? 'critical' : currentErrorRate > 10 ? 'high' : 'medium';

    const anomalyId = `anomaly_errors_${endpoint}_${Date.now()}`;
    const anomaly: DetectedAnomaly = {
      anomalyId,
      tenantId,
      endpoint,
      anomalyType: 'error_rate_spike',
      severity: severity as any,
      baselineValue: baselineErrorRate,
      currentValue: currentErrorRate,
      deviation,
      detectedAt: Date.now(),
      precedesDegradation: true, // Errors almost always precede degradation
      estimatedDegradationRisk: Math.min(100, currentErrorRate * 3)
    };

    this.anomalies.set(anomalyId, anomaly);
    return anomalyId;
  }

  /**
   * Detect traffic spike anomaly
   */
  detectTrafficSpike(tenantId: string, endpoint: string, baselineRequests: number, currentRequests: number, stdDev: number): string {
    const deviation = (currentRequests - baselineRequests) / stdDev;
    const isSpiking = deviation > 2.5; // 2.5 standard deviations

    if (!isSpiking) return '';

    const severity = deviation > 4 ? 'critical' : deviation > 3 ? 'high' : 'medium';

    const anomalyId = `anomaly_traffic_${endpoint}_${Date.now()}`;
    const anomaly: DetectedAnomaly = {
      anomalyId,
      tenantId,
      endpoint,
      anomalyType: 'traffic_spike',
      severity: severity as any,
      baselineValue: baselineRequests,
      currentValue: currentRequests,
      deviation,
      detectedAt: Date.now(),
      precedesDegradation: deviation > 3.5, // Extreme traffic spikes precede degradation
      estimatedDegradationRisk: Math.min(100, deviation * 10)
    };

    this.anomalies.set(anomalyId, anomaly);
    return anomalyId;
  }

  /**
   * Detect resource exhaustion
   */
  detectResourceExhaustion(tenantId: string, endpoint: string, cpuPercent: number, memoryPercent: number, diskPercent: number): string {
    const isExhausting = cpuPercent > 85 || memoryPercent > 90 || diskPercent > 90;

    if (!isExhausting) return '';

    const severity = (cpuPercent > 95 || memoryPercent > 95) ? 'critical' : 'high';
    const riskScore = (cpuPercent + memoryPercent + diskPercent) / 3;

    const anomalyId = `anomaly_resources_${endpoint}_${Date.now()}`;
    const anomaly: DetectedAnomaly = {
      anomalyId,
      tenantId,
      endpoint,
      anomalyType: 'resource_exhaustion',
      severity: severity as any,
      baselineValue: 50, // 50% is baseline
      currentValue: riskScore,
      deviation: (riskScore - 50) / 10,
      detectedAt: Date.now(),
      precedesDegradation: true, // Resource exhaustion precedes degradation
      estimatedDegradationRisk: riskScore
    };

    this.anomalies.set(anomalyId, anomaly);
    return anomalyId;
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies(tenantId: string): DetectedAnomaly[] {
    return Array.from(this.anomalies.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.estimatedDegradationRisk - a.estimatedDegradationRisk);
  }

  /**
   * Get high-risk anomalies
   */
  getHighRiskAnomalies(tenantId: string): DetectedAnomaly[] {
    return Array.from(this.anomalies.values())
      .filter(a => a.tenantId === tenantId && (a.severity === 'critical' || a.estimatedDegradationRisk > 70))
      .sort((a, b) => b.estimatedDegradationRisk - a.estimatedDegradationRisk);
  }

  /**
   * Record anomaly pattern for learning
   */
  recordAnomalyPattern(anomalyType: string, endpoint: string, followedByDegradation: boolean, minutesUntilDegradation: number = 0): void {
    const patternKey = `${anomalyType}_${endpoint}`;
    let pattern = this.patterns.get(patternKey);

    if (!pattern) {
      pattern = {
        patternId: `pattern_${patternKey}_${Date.now()}`,
        anomalyType,
        endpoint,
        occurrenceCount: 0,
        followedByDegradation: 0,
        averageTimeUntilDegradation: 0,
        correlationWithDegradation: 0
      };
      this.patterns.set(patternKey, pattern);
    }

    pattern.occurrenceCount++;
    if (followedByDegradation) pattern.followedByDegradation++;

    // Update average time
    if (minutesUntilDegradation > 0) {
      pattern.averageTimeUntilDegradation =
        (pattern.averageTimeUntilDegradation * (pattern.followedByDegradation - 1) + minutesUntilDegradation) / pattern.followedByDegradation;
    }

    // Update correlation
    pattern.correlationWithDegradation = pattern.occurrenceCount > 0 ? pattern.followedByDegradation / pattern.occurrenceCount : 0;
  }

  /**
   * Get most predictive anomalies
   */
  getMostPredictiveAnomalies(tenantId: string): AnomalyPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.correlationWithDegradation > 0.5)
      .sort((a, b) => b.correlationWithDegradation - a.correlationWithDegradation);
  }
}

/**
 * Component 3: Risk Assessor
 * Purpose: Calculate overall risk score for each endpoint
 *
 * Features:
 * - Combine multiple risk factors (forecast, anomalies, trends)
 * - Score risk from 0-100
 * - Identify high-risk endpoints needing preventive action
 */
export interface EndpointRiskScore {
  riskScoreId: string;
  tenantId: string;
  endpoint: string;
  overallRiskScore: number; // 0-100
  forecastRisk: number; // 0-100
  anomalyRisk: number; // 0-100
  trendRisk: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresPreventiveAction: boolean;
  recommendedActions: string[];
  timeUntilDegradation: number; // minutes estimate
  timestamp: number;
}

export class RiskAssessor {
  private riskScores: Map<string, EndpointRiskScore> = new Map();

  /**
   * Calculate overall risk score
   */
  assessRisk(tenantId: string, endpoint: string, forecast: any, anomalies: any[], trend: any): string {
    const forecastRisk = forecast?.estimatedDegradationRisk || 0;
    const anomalyRisk = anomalies.length > 0 ? Math.max(...anomalies.map((a: any) => a.estimatedDegradationRisk)) : 0;

    // Trend risk: if declining and not high enough to trigger forecast risk yet
    const trendRisk = trend?.scoreVelocity < -2 ? 30 : trend?.scoreVelocity < -5 ? 60 : 0;

    // Weighted combination
    const overallRiskScore = (forecastRisk * 0.5 + anomalyRisk * 0.35 + trendRisk * 0.15);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallRiskScore >= 75) riskLevel = 'critical';
    else if (overallRiskScore >= 50) riskLevel = 'high';
    else if (overallRiskScore >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    // Recommend preventive actions
    const recommendedActions = this.recommendPreventiveActions(endpoint, forecast, anomalies, trend);

    // Estimate time until degradation
    const timeUntilDegradation = forecast?.estimatedDegradationTime
      ? Math.max(0, (forecast.estimatedDegradationTime - Date.now()) / 60000)
      : 120; // Default 2 hours

    const riskScoreId = `risk_${endpoint}_${Date.now()}`;
    const riskScore: EndpointRiskScore = {
      riskScoreId,
      tenantId,
      endpoint,
      overallRiskScore: Math.min(100, Math.max(0, overallRiskScore)),
      forecastRisk: Math.min(100, forecastRisk),
      anomalyRisk: Math.min(100, anomalyRisk),
      trendRisk: Math.min(100, trendRisk),
      riskLevel,
      requiresPreventiveAction: overallRiskScore > 30,
      recommendedActions,
      timeUntilDegradation,
      timestamp: Date.now()
    };

    this.riskScores.set(riskScoreId, riskScore);
    return riskScoreId;
  }

  /**
   * Recommend preventive actions based on risk factors
   */
  private recommendPreventiveActions(endpoint: string, forecast: any, anomalies: any[], trend: any): string[] {
    const actions: string[] = [];

    if (forecast?.estimatedDegradationRisk > 50) {
      actions.push('Enable aggressive caching');
      actions.push('Pre-warm CDN cache');
    }

    const hasLatencyAnomaly = anomalies.some((a: any) => a.anomalyType === 'latency_spike');
    if (hasLatencyAnomaly) {
      actions.push('Scale up resources');
      actions.push('Optimize database queries');
    }

    const hasErrorAnomaly = anomalies.some((a: any) => a.anomalyType === 'error_rate_spike');
    if (hasErrorAnomaly) {
      actions.push('Enable circuit breaker');
      actions.push('Increase timeouts');
    }

    const hasTrafficAnomaly = anomalies.some((a: any) => a.anomalyType === 'traffic_spike');
    if (hasTrafficAnomaly) {
      actions.push('Load balance across regions');
      actions.push('Enable throttling');
    }

    const hasResourceAnomaly = anomalies.some((a: any) => a.anomalyType === 'resource_exhaustion');
    if (hasResourceAnomaly) {
      actions.push('Immediately scale up');
      actions.push('Enable auto-scaling');
    }

    if (trend?.scoreVelocity < -3) {
      actions.push('Investigate root cause');
      actions.push('Prepare rollback plan');
    }

    return actions.slice(0, 3); // Top 3 actions
  }

  /**
   * Get critical risk endpoints
   */
  getCriticalRiskEndpoints(tenantId: string): EndpointRiskScore[] {
    return Array.from(this.riskScores.values())
      .filter(r => r.tenantId === tenantId && r.riskLevel === 'critical')
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  /**
   * Get high risk endpoints
   */
  getHighRiskEndpoints(tenantId: string): EndpointRiskScore[] {
    return Array.from(this.riskScores.values())
      .filter(r => r.tenantId === tenantId && (r.riskLevel === 'critical' || r.riskLevel === 'high'))
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  /**
   * Get endpoints by time urgency
   */
  getEndpointsByUrgency(tenantId: string): EndpointRiskScore[] {
    return Array.from(this.riskScores.values())
      .filter(r => r.tenantId === tenantId && r.requiresPreventiveAction)
      .sort((a, b) => a.timeUntilDegradation - b.timeUntilDegradation); // Soonest first
  }
}

/**
 * Component 4: Preventive Optimizer
 * Purpose: Execute preventive optimizations before degradation occurs
 *
 * Features:
 * - Execute preventive actions (preemptive scaling, cache warming, etc.)
 * - Track preventive action effectiveness
 * - Learn which preventive actions best prevent degradation
 */
export interface PreventiveAction {
  actionId: string;
  tenantId: string;
  endpoint: string;
  actionType: 'preemptive_scaling' | 'cache_warming' | 'load_balancing' | 'connection_pooling' | 'traffic_shaping';
  rationale: string; // Why this action?
  executedAt?: number;
  preventedDegradation?: boolean;
  scorePreventionValue: number; // How many points of degradation prevented?
  estimatedPreventionEffectiveness: number; // 0-100
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: number;
}

export interface PreventionOutcome {
  outcomeId: string;
  actionId: string;
  tenantId: string;
  endpoint: string;
  forecastedRisk: number;
  actualDegradation: boolean;
  preventionSuccessful: boolean; // Did we prevent degradation?
  actualScore: number; // Actual score after action
  forecastedScore: number; // What score would have been without action
  scoreImprovement: number; // forecastedScore - actualScore
  timestamp: number;
}

export class PreventiveOptimizer {
  private preventiveActions: Map<string, PreventiveAction> = new Map();
  private outcomes: Map<string, PreventionOutcome> = new Map();
  private effectiveness: Map<string, { successCount: number; totalCount: number; avgPreventionValue: number }> = new Map();

  /**
   * Execute preemptive scaling
   */
  executePreemptiveScaling(tenantId: string, endpoint: string, forecastedRisk: number): string {
    const actionId = `prevent_scale_${endpoint}_${Date.now()}`;
    const action: PreventiveAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'preemptive_scaling',
      rationale: `Risk ${forecastedRisk.toFixed(0)}% - Scale before degradation occurs`,
      preventedDegradation: undefined,
      scorePreventionValue: 15,
      estimatedPreventionEffectiveness: 70,
      status: 'pending',
      createdAt: Date.now()
    };

    this.preventiveActions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute cache warming
   */
  executeCacheWarming(tenantId: string, endpoint: string, forecastedRisk: number): string {
    const actionId = `prevent_cache_${endpoint}_${Date.now()}`;
    const action: PreventiveAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'cache_warming',
      rationale: `Risk ${forecastedRisk.toFixed(0)}% - Pre-populate cache to prevent misses`,
      preventedDegradation: undefined,
      scorePreventionValue: 20,
      estimatedPreventionEffectiveness: 65,
      status: 'pending',
      createdAt: Date.now()
    };

    this.preventiveActions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute load balancing
   */
  executeLoadBalancing(tenantId: string, endpoint: string, forecastedRisk: number): string {
    const actionId = `prevent_lb_${endpoint}_${Date.now()}`;
    const action: PreventiveAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'load_balancing',
      rationale: `Risk ${forecastedRisk.toFixed(0)}% - Distribute load before peak hours`,
      preventedDegradation: undefined,
      scorePreventionValue: 12,
      estimatedPreventionEffectiveness: 60,
      status: 'pending',
      createdAt: Date.now()
    };

    this.preventiveActions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute connection pooling optimization
   */
  executeConnectionPooling(tenantId: string, endpoint: string, forecastedRisk: number): string {
    const actionId = `prevent_pool_${endpoint}_${Date.now()}`;
    const action: PreventiveAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'connection_pooling',
      rationale: `Risk ${forecastedRisk.toFixed(0)}% - Optimize connection reuse`,
      preventedDegradation: undefined,
      scorePreventionValue: 10,
      estimatedPreventionEffectiveness: 55,
      status: 'pending',
      createdAt: Date.now()
    };

    this.preventiveActions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute traffic shaping
   */
  executeTrafficShaping(tenantId: string, endpoint: string, forecastedRisk: number): string {
    const actionId = `prevent_shape_${endpoint}_${Date.now()}`;
    const action: PreventiveAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'traffic_shaping',
      rationale: `Risk ${forecastedRisk.toFixed(0)}% - Shape traffic to prevent spikes`,
      preventedDegradation: undefined,
      scorePreventionValue: 18,
      estimatedPreventionEffectiveness: 62,
      status: 'pending',
      createdAt: Date.now()
    };

    this.preventiveActions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute preventive action
   */
  executeAction(actionId: string): void {
    const action = this.preventiveActions.get(actionId);
    if (!action) return;

    action.status = 'executing';
    action.executedAt = Date.now();

    // Simulate execution
    setTimeout(() => {
      action.status = 'completed';
    }, 100);
  }

  /**
   * Record prevention outcome
   */
  recordPrevention(actionId: string, tenantId: string, endpoint: string, forecastedRisk: number, forecastedScore: number, actualScore: number, degradationOccurred: boolean): string {
    const outcomeId = `outcome_${actionId}_${Date.now()}`;

    const preventionSuccessful = !degradationOccurred;
    const scoreImprovement = forecastedScore - actualScore;

    const outcome: PreventionOutcome = {
      outcomeId,
      actionId,
      tenantId,
      endpoint,
      forecastedRisk,
      actualDegradation: degradationOccurred,
      preventionSuccessful,
      actualScore,
      forecastedScore,
      scoreImprovement,
      timestamp: Date.now()
    };

    this.outcomes.set(outcomeId, outcome);

    // Update effectiveness tracking
    const action = this.preventiveActions.get(actionId);
    if (action) {
      action.preventedDegradation = preventionSuccessful;

      const effectivenessKey = action.actionType;
      let eff = this.effectiveness.get(effectivenessKey);
      if (!eff) {
        eff = { successCount: 0, totalCount: 0, avgPreventionValue: 0 };
        this.effectiveness.set(effectivenessKey, eff);
      }

      eff.totalCount++;
      if (preventionSuccessful) eff.successCount++;
      eff.avgPreventionValue = (eff.avgPreventionValue * (eff.totalCount - 1) + scoreImprovement) / eff.totalCount;
    }

    return outcomeId;
  }

  /**
   * Get preventive action effectiveness
   */
  getPreventiveEffectiveness(actionType: string): { successRate: number; avgPreventionValue: number } {
    const eff = this.effectiveness.get(actionType);
    if (!eff) return { successRate: 0, avgPreventionValue: 0 };

    return {
      successRate: eff.totalCount > 0 ? eff.successCount / eff.totalCount : 0,
      avgPreventionValue: eff.avgPreventionValue
    };
  }

  /**
   * Get most effective preventive actions
   */
  getMostEffectiveActions(tenantId: string): Array<{ actionType: string; successRate: number; avgValue: number }> {
    const results: Array<{ actionType: string; successRate: number; avgValue: number }> = [];

    this.effectiveness.forEach((eff, actionType) => {
      results.push({
        actionType,
        successRate: eff.totalCount > 0 ? eff.successCount / eff.totalCount : 0,
        avgValue: eff.avgPreventionValue
      });
    });

    return results.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get prevention rate (percent of at-risk endpoints that didn't degrade)
   */
  getPreventionRate(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const outcomes = Array.from(this.outcomes.values()).filter(o => o.tenantId === tenantId && o.timestamp > cutoff);

    if (outcomes.length === 0) return 0;
    const prevented = outcomes.filter(o => o.preventionSuccessful).length;
    return (prevented / outcomes.length) * 100;
  }

  /**
   * Get total prevention value
   */
  getTotalPreventionValue(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    return Array.from(this.outcomes.values())
      .filter(o => o.tenantId === tenantId && o.timestamp > cutoff && o.preventionSuccessful)
      .reduce((sum, o) => sum + o.scoreImprovement, 0);
  }
}
