/**
 * Phase 38: Automated Experience Optimization & Response System
 *
 * Automatically responds to user experience degradation detected in Phase 37:
 * - Monitors satisfaction scores and bottlenecks
 * - Calculates impact (affected users, business impact)
 * - Executes optimizations (caching, compression, scaling, feature flags)
 * - Tracks effectiveness and auto-rolls back harmful changes
 *
 * Complements:
 * - Phase 33: Auto-responds to incidents (error spikes)
 * - Phase 37: Detects experience issues (bottlenecks, low satisfaction)
 * - Phase 38: Auto-responds to experience issues (optimization)
 */

/**
 * Component 1: Experience Responder
 * Purpose: Monitor experience metrics and trigger automatic responses
 *
 * Features:
 * - Monitor satisfaction score trends
 * - Detect sudden satisfaction drops
 * - Identify degraded endpoints
 * - Trigger optimization workflows
 */
export interface ExperienceDegradation {
  degradationId: string;
  tenantId: string;
  endpoint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  previousScore: number;
  currentScore: number;
  scoreDrop: number;
  detectedAt: number;
  affectedSessions?: number;
  rootCause?: 'high_latency' | 'high_error_rate' | 'device_specific' | 'geo_specific';
  responseStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface SatisfactionTrend {
  endpointTrendId: string;
  endpoint: string;
  tenantId: string;
  previousScore: number;
  currentScore: number;
  trend: 'improving' | 'stable' | 'degrading';
  scoreVelocity: number; // Change per hour
  confidence: number; // 0-1, based on sample size
  timestamp: number;
}

export class ExperienceResponder {
  private degradations: Map<string, ExperienceDegradation> = new Map();
  private trends: Map<string, SatisfactionTrend> = new Map();
  private thresholds = {
    satisfactionDropThreshold: 10, // Alert if drops >10 points
    criticalSatisfaction: 40, // Critical if <40
    highSatisfaction: 75, // Good if >75
    lowSatisfaction: 50, // Poor if <50
  };

  /**
   * Detect satisfaction degradation
   */
  detectDegradation(tenantId: string, endpoint: string, previousScore: number, currentScore: number, affectedSessions: number = 0, rootCause?: string): string {
    const scoreDrop = previousScore - currentScore;

    // Check if significant degradation
    if (scoreDrop < this.thresholds.satisfactionDropThreshold && currentScore > this.thresholds.lowSatisfaction) {
      return ''; // No degradation
    }

    const severity = this.calculateSeverity(currentScore, scoreDrop, affectedSessions);

    const degradationId = `deg_${endpoint}_${Date.now()}`;
    const degradation: ExperienceDegradation = {
      degradationId,
      tenantId,
      endpoint,
      severity,
      previousScore,
      currentScore,
      scoreDrop,
      detectedAt: Date.now(),
      affectedSessions,
      rootCause: rootCause as any,
      responseStatus: 'pending'
    };

    this.degradations.set(degradationId, degradation);
    return degradationId;
  }

  /**
   * Calculate severity based on score and impact
   */
  private calculateSeverity(currentScore: number, drop: number, affectedSessions: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: <40 score OR sudden >20 point drop with many affected users
    if (currentScore < this.thresholds.criticalSatisfaction || (drop > 20 && affectedSessions > 1000)) {
      return 'critical';
    }

    // High: <50 score OR >15 point drop with hundreds affected
    if (currentScore < this.thresholds.lowSatisfaction || (drop > 15 && affectedSessions > 500)) {
      return 'high';
    }

    // Medium: <65 score OR >10 point drop with many affected
    if (currentScore < 65 || (drop > 10 && affectedSessions > 100)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Track satisfaction trend
   */
  trackTrend(tenantId: string, endpoint: string, previousScore: number, currentScore: number, sampleSize: number = 100): void {
    const trendKey = `${tenantId}_${endpoint}`;
    const scoreVelocity = currentScore - previousScore; // Per measurement (roughly per hour)

    let trend: 'improving' | 'stable' | 'degrading';
    if (scoreVelocity > 2) trend = 'improving';
    else if (scoreVelocity < -2) trend = 'degrading';
    else trend = 'stable';

    const confidence = Math.min(1, sampleSize / 1000); // Higher confidence with more samples

    const satTrend: SatisfactionTrend = {
      endpointTrendId: `trend_${trendKey}_${Date.now()}`,
      endpoint,
      tenantId,
      previousScore,
      currentScore,
      trend,
      scoreVelocity,
      confidence,
      timestamp: Date.now()
    };

    this.trends.set(trendKey, satTrend);
  }

  /**
   * Get degradations requiring response
   */
  getDegradationsRequiringResponse(tenantId: string): ExperienceDegradation[] {
    return Array.from(this.degradations.values())
      .filter(d => d.tenantId === tenantId && d.responseStatus === 'pending')
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder as any)[a.severity] - (severityOrder as any)[b.severity];
      });
  }

  /**
   * Get critical degradations
   */
  getCriticalDegradations(tenantId: string): ExperienceDegradation[] {
    return Array.from(this.degradations.values()).filter(
      d => d.tenantId === tenantId && d.severity === 'critical'
    );
  }

  /**
   * Update degradation response status
   */
  updateDegradationStatus(degradationId: string, status: 'pending' | 'in_progress' | 'completed' | 'failed'): void {
    const degradation = this.degradations.get(degradationId);
    if (degradation) {
      degradation.responseStatus = status;
    }
  }

  /**
   * Get endpoints with declining satisfaction
   */
  getDecliningEndpoints(tenantId: string, topN: number = 10): SatisfactionTrend[] {
    return Array.from(this.trends.values())
      .filter(t => t.tenantId === tenantId && t.trend === 'degrading')
      .sort((a, b) => a.scoreVelocity - b.scoreVelocity) // Most negative first
      .slice(0, topN);
  }

  /**
   * Predict critical endpoint
   */
  predictCriticalEndpoints(tenantId: string): Array<{ endpoint: string; estimatedScoreIn1Hour: number; willBeCritical: boolean }> {
    const predictions: Array<{ endpoint: string; estimatedScoreIn1Hour: number; willBeCritical: boolean }> = [];

    Array.from(this.trends.values())
      .filter(t => t.tenantId === tenantId)
      .forEach(trend => {
        const estimatedScore = trend.currentScore + (trend.scoreVelocity * 1); // Linear extrapolation 1 hour
        const willBeCritical = estimatedScore < this.thresholds.criticalSatisfaction;

        predictions.push({
          endpoint: trend.endpoint,
          estimatedScoreIn1Hour: Math.max(0, estimatedScore),
          willBeCritical
        });
      });

    return predictions.filter(p => p.willBeCritical);
  }
}

/**
 * Component 2: Impact Assessor
 * Purpose: Calculate user impact and business impact of experience issues
 *
 * Features:
 * - Calculate number of affected users
 * - Estimate impact on revenue/SLA
 * - Prioritize fixes based on impact
 */
export interface ImpactAssessment {
  assessmentId: string;
  tenantId: string;
  endpoint: string;
  affectedUserCount: number;
  affectedSessionCount: number;
  estimatedRevenueImpact: number; // Estimated lost revenue
  slaImpactRisk: boolean; // Will this cause SLA breach?
  businessPriority: 'low' | 'medium' | 'high' | 'critical';
  urgency: number; // 0-100, higher = more urgent
  timestamp: number;
}

export interface UserAffectionPattern {
  patternId: string;
  endpoint: string;
  affectedGeographies: string[]; // Regions affected
  affectedDevices: Array<'mobile' | 'tablet' | 'desktop'>;
  affectedFeatures: string[];
  concentrationLevel: 'scattered' | 'concentrated' | 'critical_mass'; // How concentrated is impact?
}

export class ImpactAssessor {
  private assessments: Map<string, ImpactAssessment> = new Map();
  private patterns: Map<string, UserAffectionPattern> = new Map();

  private constants = {
    avgRevenuePerUser: 0.02, // $ per user per day
    sessionsPerAffectedUser: 2,
    criticalMassThreshold: 0.1 // 10% of users = critical
  };

  /**
   * Assess impact of experience degradation
   */
  assessImpact(tenantId: string, endpoint: string, affectedSessions: number, totalSessions: number, currentScore: number, slaTarget: number = 99.5): string {
    const affectedUserCount = Math.ceil(affectedSessions / this.constants.sessionsPerAffectedUser);
    const affectionPercentage = affectedSessions / Math.max(1, totalSessions);

    // Estimate revenue impact
    const estimatedRevenueImpact = affectedUserCount * this.constants.avgRevenuePerUser;

    // Assess SLA risk
    const slaImpactRisk = currentScore < 95; // SLA target is 99.5% uptime equivalent

    // Calculate business priority
    const businessPriority = this.calculateBusinessPriority(affectedUserCount, affectionPercentage, estimatedRevenueImpact, slaImpactRisk);

    // Calculate urgency (0-100)
    const urgency = Math.min(100, affectedUserCount / 10 + (slaImpactRisk ? 30 : 0) + estimatedRevenueImpact * 100);

    const assessmentId = `impact_${endpoint}_${Date.now()}`;
    const assessment: ImpactAssessment = {
      assessmentId,
      tenantId,
      endpoint,
      affectedUserCount,
      affectedSessionCount: affectedSessions,
      estimatedRevenueImpact,
      slaImpactRisk,
      businessPriority,
      urgency,
      timestamp: Date.now()
    };

    this.assessments.set(assessmentId, assessment);
    return assessmentId;
  }

  /**
   * Calculate business priority
   */
  private calculateBusinessPriority(users: number, percentage: number, revenue: number, slaRisk: boolean): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: >10% of users affected OR SLA at risk OR >$100 revenue impact
    if (percentage > this.constants.criticalMassThreshold || slaRisk || revenue > 100) {
      return 'critical';
    }

    // High: >5% of users OR >$50 revenue impact
    if (percentage > 0.05 || revenue > 50) {
      return 'high';
    }

    // Medium: >1% of users OR >$10 revenue impact
    if (percentage > 0.01 || revenue > 10) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Analyze user affection pattern
   */
  analyzeAffectionPattern(endpoint: string, geos: string[], devices: Array<'mobile' | 'tablet' | 'desktop'>, features: string[]): string {
    const patternId = `pattern_${endpoint}_${Date.now()}`;

    // Determine concentration level
    let concentrationLevel: 'scattered' | 'concentrated' | 'critical_mass';
    if (geos.length >= 3 && devices.length === 3) {
      concentrationLevel = 'scattered'; // Affects multiple regions and devices = broad
    } else if (geos.length >= 2 && devices.length >= 2) {
      concentrationLevel = 'concentrated'; // Affects some regions and devices
    } else {
      concentrationLevel = 'critical_mass'; // Single region/device = concentrated impact
    }

    const pattern: UserAffectionPattern = {
      patternId,
      endpoint,
      affectedGeographies: geos,
      affectedDevices: devices,
      affectedFeatures: features,
      concentrationLevel
    };

    this.patterns.set(patternId, pattern);
    return patternId;
  }

  /**
   * Get critical impact assessments
   */
  getCriticalImpacts(tenantId: string): ImpactAssessment[] {
    return Array.from(this.assessments.values()).filter(
      a => a.tenantId === tenantId && (a.businessPriority === 'critical' || a.urgency > 80)
    );
  }

  /**
   * Rank impacts by urgency
   */
  rankByUrgency(tenantId: string): ImpactAssessment[] {
    return Array.from(this.assessments.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * Get high revenue impact issues
   */
  getHighRevenueImpactIssues(tenantId: string, minimumImpact: number = 50): ImpactAssessment[] {
    return Array.from(this.assessments.values()).filter(
      a => a.tenantId === tenantId && a.estimatedRevenueImpact >= minimumImpact
    );
  }
}

/**
 * Component 3: Optimization Engine
 * Purpose: Execute automated optimizations to improve user experience
 *
 * Features:
 * - Execute caching optimizations
 * - Apply compression and resource reduction
 * - Scale resources dynamically
 * - Toggle features with feature flags
 * - Execute predefined playbooks
 */
export interface OptimizationAction {
  actionId: string;
  tenantId: string;
  endpoint: string;
  actionType: 'caching' | 'compression' | 'scaling' | 'feature_flag' | 'cdn' | 'database_optimize';
  actionDetails: Record<string, any>; // Type-specific parameters
  expectedImpact: number; // Expected score improvement (0-100)
  difficulty: 'simple' | 'moderate' | 'complex'; // Complexity of rollback
  estimatedExecutionTime: number; // ms
  autoRollbackEnabled: boolean;
  createdAt: number;
  executedAt?: number;
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'rolled_back';
}

export interface OptimizationPlaybook {
  playbookId: string;
  name: string;
  description: string;
  condition: 'high_latency' | 'high_error_rate' | 'device_specific' | 'geo_specific';
  actions: OptimizationAction[];
  automationLevel: 'manual' | 'semi_auto' | 'full_auto';
  successRate: number; // 0-1, from historical data
}

export class OptimizationEngine {
  private actions: Map<string, OptimizationAction> = new Map();
  private playbooks: Map<string, OptimizationPlaybook> = new Map();
  private executionHistory: Map<string, { success: boolean; scoreImprovement: number; executionTime: number }[]> = new Map();

  /**
   * Execute caching optimization
   */
  executeCachingOptimization(tenantId: string, endpoint: string, ttl: number = 300): string {
    const actionId = `opt_cache_${endpoint}_${Date.now()}`;
    const action: OptimizationAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'caching',
      actionDetails: { ttl, strategy: 'aggressive' },
      expectedImpact: 25, // Expect 25 point improvement
      difficulty: 'simple',
      estimatedExecutionTime: 100,
      autoRollbackEnabled: true,
      createdAt: Date.now(),
      status: 'planned'
    };

    this.actions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute compression optimization
   */
  executeCompressionOptimization(tenantId: string, endpoint: string, level: number = 9): string {
    const actionId = `opt_compress_${endpoint}_${Date.now()}`;
    const action: OptimizationAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'compression',
      actionDetails: { level, algorithm: 'brotli' },
      expectedImpact: 15, // Expect 15 point improvement
      difficulty: 'simple',
      estimatedExecutionTime: 150,
      autoRollbackEnabled: true,
      createdAt: Date.now(),
      status: 'planned'
    };

    this.actions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute scaling optimization
   */
  executeScalingOptimization(tenantId: string, endpoint: string, scale: 'up' | 'down' = 'up'): string {
    const actionId = `opt_scale_${endpoint}_${Date.now()}`;
    const action: OptimizationAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'scaling',
      actionDetails: { direction: scale, factor: scale === 'up' ? 1.5 : 0.75 },
      expectedImpact: 20, // Expect 20 point improvement
      difficulty: scale === 'up' ? 'moderate' : 'complex',
      estimatedExecutionTime: 500,
      autoRollbackEnabled: true,
      createdAt: Date.now(),
      status: 'planned'
    };

    this.actions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute feature flag optimization (disable slow feature temporarily)
   */
  executeFeatureFlagOptimization(tenantId: string, endpoint: string, featureName: string, disable: boolean = true): string {
    const actionId = `opt_flag_${endpoint}_${Date.now()}`;
    const action: OptimizationAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'feature_flag',
      actionDetails: { feature: featureName, enabled: !disable },
      expectedImpact: 10, // Expect 10 point improvement
      difficulty: 'simple',
      estimatedExecutionTime: 50,
      autoRollbackEnabled: true,
      createdAt: Date.now(),
      status: 'planned'
    };

    this.actions.set(actionId, action);
    return actionId;
  }

  /**
   * Execute CDN optimization
   */
  executeCdnOptimization(tenantId: string, endpoint: string): string {
    const actionId = `opt_cdn_${endpoint}_${Date.now()}`;
    const action: OptimizationAction = {
      actionId,
      tenantId,
      endpoint,
      actionType: 'cdn',
      actionDetails: { enableEdgeCache: true, purgeCache: true },
      expectedImpact: 30, // Expect 30 point improvement
      difficulty: 'moderate',
      estimatedExecutionTime: 200,
      autoRollbackEnabled: true,
      createdAt: Date.now(),
      status: 'planned'
    };

    this.actions.set(actionId, action);
    return actionId;
  }

  /**
   * Register optimization playbook
   */
  registerPlaybook(name: string, description: string, condition: string, actions: OptimizationAction[], automationLevel: 'manual' | 'semi_auto' | 'full_auto' = 'semi_auto'): string {
    const playbookId = `pb_${name}_${Date.now()}`;
    const playbook: OptimizationPlaybook = {
      playbookId,
      name,
      description,
      condition: condition as any,
      actions,
      automationLevel,
      successRate: 0.8 // Start with 80% confidence
    };

    this.playbooks.set(playbookId, playbook);
    return playbookId;
  }

  /**
   * Get applicable playbooks for degradation
   */
  getApplicablePlaybooks(endpoint: string, condition: string): OptimizationPlaybook[] {
    return Array.from(this.playbooks.values()).filter(
      p => p.condition === condition && p.automationLevel !== 'manual'
    );
  }

  /**
   * Execute optimization action
   */
  executeAction(actionId: string): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    action.status = 'executing';
    action.executedAt = Date.now();

    // Simulate execution
    setTimeout(() => {
      action.status = 'completed';
    }, action.estimatedExecutionTime);
  }

  /**
   * Get executed optimizations
   */
  getExecutedOptimizations(tenantId: string, hoursBack: number = 24): OptimizationAction[] {
    const cutoff = Date.now() - hoursBack * 3600000;
    return Array.from(this.actions.values()).filter(
      a => a.tenantId === tenantId && a.executedAt && a.executedAt > cutoff
    );
  }

  /**
   * Record optimization effectiveness
   */
  recordOptimizationResult(actionId: string, success: boolean, scoreImprovement: number, executionTime: number): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    const key = `${action.actionType}_${action.endpoint}`;
    if (!this.executionHistory.has(key)) {
      this.executionHistory.set(key, []);
    }

    this.executionHistory.get(key)!.push({ success, scoreImprovement, executionTime });
  }

  /**
   * Get optimization effectiveness
   */
  getOptimizationEffectiveness(actionType: string, endpoint: string): { successRate: number; avgImprovement: number; avgTime: number } {
    const key = `${actionType}_${endpoint}`;
    const history = this.executionHistory.get(key) || [];

    if (history.length === 0) return { successRate: 0, avgImprovement: 0, avgTime: 0 };

    const successCount = history.filter(h => h.success).length;
    const avgImprovement = history.reduce((sum, h) => sum + h.scoreImprovement, 0) / history.length;
    const avgTime = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;

    return {
      successRate: successCount / history.length,
      avgImprovement,
      avgTime
    };
  }
}

/**
 * Component 4: Effectiveness Monitor
 * Purpose: Track optimization effectiveness and auto-rollback harmful changes
 *
 * Features:
 * - Monitor satisfaction score before/after optimization
 * - Detect harmful optimizations
 * - Auto-rollback if satisfaction worsens
 * - Track optimization success rate by type
 */
export interface OptimizationResult {
  resultId: string;
  actionId: string;
  tenantId: string;
  endpoint: string;
  beforeScore: number;
  afterScore: number;
  scoreImprovement: number; // afterScore - beforeScore
  isSuccessful: boolean; // Improvement >0
  executionTime: number; // ms
  rollbackRequired: boolean;
  rollbackReason?: string;
  monitoredForMinutes: number;
  timestamp: number;
}

export interface OptimizationTrend {
  trendId: string;
  actionType: string;
  endpoint: string;
  tenantId: string;
  successRate: number; // % of optimizations that improved score
  avgImprovement: number; // Average score improvement
  recentlyHarmful: boolean; // Has it caused regressions recently?
  confidence: number; // 0-1, based on sample size
  lastUpdated: number;
}

export class EffectivenessMonitor {
  private results: Map<string, OptimizationResult> = new Map();
  private trends: Map<string, OptimizationTrend> = new Map();
  private rollbacks: Map<string, { actionId: string; reason: string; timestamp: number }> = new Map();

  /**
   * Record optimization result
   */
  recordResult(actionId: string, tenantId: string, endpoint: string, beforeScore: number, afterScore: number, executionTime: number, monitoredForMinutes: number = 60): string {
    const scoreImprovement = afterScore - beforeScore;
    const isSuccessful = scoreImprovement > 0;
    const rollbackRequired = scoreImprovement < -5; // Auto-rollback if score drops >5 points

    const resultId = `result_${actionId}_${Date.now()}`;
    const result: OptimizationResult = {
      resultId,
      actionId,
      tenantId,
      endpoint,
      beforeScore,
      afterScore,
      scoreImprovement,
      isSuccessful,
      executionTime,
      rollbackRequired,
      monitoredForMinutes,
      timestamp: Date.now()
    };

    this.results.set(resultId, result);

    // Update trends
    this.updateTrend(tenantId, endpoint, actionId, isSuccessful, scoreImprovement);

    return resultId;
  }

  /**
   * Update optimization trend
   */
  private updateTrend(tenantId: string, endpoint: string, actionId: string, isSuccessful: boolean, improvement: number): void {
    // Extract action type from actionId (e.g., "opt_cache_..." -> "cache")
    const actionType = actionId.split('_')[1];
    const trendKey = `${actionType}_${endpoint}`;

    let trend = this.trends.get(trendKey);

    if (!trend) {
      trend = {
        trendId: `trend_${trendKey}_${Date.now()}`,
        actionType,
        endpoint,
        tenantId,
        successRate: 0,
        avgImprovement: 0,
        recentlyHarmful: false,
        confidence: 0,
        lastUpdated: Date.now()
      };
      this.trends.set(trendKey, trend);
    }

    // Update stats with exponential moving average
    const newWeight = 0.3; // Weight for newest result
    trend.successRate = trend.successRate * (1 - newWeight) + (isSuccessful ? 1 : 0) * newWeight;
    trend.avgImprovement = trend.avgImprovement * (1 - newWeight) + improvement * newWeight;
    trend.confidence = Math.min(1, trend.confidence + 0.1); // Grow confidence gradually
    trend.recentlyHarmful = improvement < -5; // Recently harmful if last result was bad
    trend.lastUpdated = Date.now();
  }

  /**
   * Trigger rollback
   */
  rollback(actionId: string, reason: string): void {
    const rollbackId = `rollback_${actionId}_${Date.now()}`;
    this.rollbacks.set(rollbackId, {
      actionId,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Get harmful optimizations
   */
  getHarmfulOptimizations(tenantId: string): OptimizationResult[] {
    return Array.from(this.results.values())
      .filter(r => r.tenantId === tenantId && r.rollbackRequired)
      .sort((a, b) => b.scoreImprovement - a.scoreImprovement); // Most negative first
  }

  /**
   * Get optimization trends
   */
  getOptimizationTrends(tenantId: string): OptimizationTrend[] {
    return Array.from(this.trends.values()).filter(t => t.tenantId === tenantId);
  }

  /**
   * Get most effective optimization type
   */
  getMostEffectiveOptimizations(tenantId: string): OptimizationTrend[] {
    return Array.from(this.trends.values())
      .filter(t => t.tenantId === tenantId && !t.recentlyHarmful && t.successRate > 0.7)
      .sort((a, b) => b.avgImprovement - a.avgImprovement);
  }

  /**
   * Get least effective optimization type
   */
  getLeastEffectiveOptimizations(tenantId: string): OptimizationTrend[] {
    return Array.from(this.trends.values())
      .filter(t => t.tenantId === tenantId && t.successRate < 0.5)
      .sort((a, b) => a.successRate - b.successRate);
  }

  /**
   * Calculate rollback rate
   */
  getRollbackRate(tenantId: string, hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 3600000;
    const results = Array.from(this.results.values()).filter(r => r.tenantId === tenantId && r.timestamp > cutoff);
    const rollbacks = Array.from(this.rollbacks.values()).filter(r => r.timestamp > cutoff);

    if (results.length === 0) return 0;
    return (rollbacks.length / results.length) * 100;
  }

  /**
   * Get optimization impact summary
   */
  getOptimizationImpactSummary(tenantId: string, hoursBack: number = 24): { totalOptimizations: number; successfulOptimizations: number; totalImprovement: number; avgImprovement: number } {
    const cutoff = Date.now() - hoursBack * 3600000;
    const results = Array.from(this.results.values()).filter(r => r.tenantId === tenantId && r.timestamp > cutoff);

    if (results.length === 0) return { totalOptimizations: 0, successfulOptimizations: 0, totalImprovement: 0, avgImprovement: 0 };

    const successfulCount = results.filter(r => r.isSuccessful).length;
    const totalImprovement = results.reduce((sum, r) => sum + r.scoreImprovement, 0);
    const avgImprovement = totalImprovement / results.length;

    return {
      totalOptimizations: results.length,
      successfulOptimizations: successfulCount,
      totalImprovement,
      avgImprovement
    };
  }
}
