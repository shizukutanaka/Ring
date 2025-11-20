/**
 * Network Adaptation Module - Phase 2 Improvements
 *
 * Implements advanced network quality monitoring and trend-based adaptation
 * Research-backed by: GCC (Google Congestion Control), RMCAT specs, IEEE papers
 *
 * IMPROVEMENTS IMPLEMENTED:
 * - Trend-based network adaptation (30s EMA window)
 * - Quality limitation reason detection (CPU vs bandwidth)
 * - Exponential moving average for smooth quality changes
 * - Hysteresis to prevent oscillation (up/down thresholds)
 */

export interface NetworkStats {
  timestamp: number;
  bandwidth: number; // kbps
  rtt: number; // ms
  packetLoss: number; // percentage (0-100)
  jitter: number; // ms
  qualityLimitationReason?: 'none' | 'cpu' | 'bandwidth' | 'other';
}

export interface NetworkTrend {
  bandwidthTrend: 'stable' | 'improving' | 'degrading';
  bandwidthMovingAverage: number;
  bandwidthTrendStrength: number; // 0-1
  packetLossTrend: 'stable' | 'improving' | 'degrading';
  jitterTrend: 'stable' | 'improving' | 'degrading';
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number; // 0-1
}

export interface QualityLimitation {
  reason: 'none' | 'cpu' | 'bandwidth' | 'other' | 'unknown';
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  duration: number; // ms
  bitrateSuggestion?: number; // kbps
  codeSuggestion?: string; // 'downgrade', 'stabilize', 'upgrade'
}

/**
 * Network Adaptation Engine
 * Provides trend analysis, oscillation prevention, and quality limiting detection
 */
export class NetworkAdaptationEngine {
  private stats: NetworkStats[] = [];
  private readonly WINDOW_SIZE = 30000; // 30 seconds
  private readonly EMA_ALPHA = 0.3; // Exponential moving average factor
  private readonly UP_THRESHOLD = 1.2; // 20% improvement needed to upgrade
  private readonly DOWN_THRESHOLD = 0.85; // 15% degradation triggers downgrade

  // Hysteresis tracking
  private lastUpgradeTime = 0;
  private lastDowngradeTime = 0;
  private upgradeHysteresisMs = 10000; // 10 seconds
  private downgradeHysteresisMs = 5000; // 5 seconds

  /**
   * Add network statistics sample
   */
  addStats(stats: NetworkStats): void {
    this.stats.push(stats);

    // Keep only last 30 seconds of stats
    const cutoffTime = Date.now() - this.WINDOW_SIZE;
    this.stats = this.stats.filter(s => s.timestamp >= cutoffTime);
  }

  /**
   * Get network trend analysis (30-second window)
   */
  analyzeNetworkTrend(): NetworkTrend {
    if (this.stats.length < 2) {
      return {
        bandwidthTrend: 'stable',
        bandwidthMovingAverage: 0,
        bandwidthTrendStrength: 0,
        packetLossTrend: 'stable',
        jitterTrend: 'stable',
        overallQuality: 'poor',
        confidence: 0
      };
    }

    // Calculate exponential moving average (EMA)
    const bandwidthEMA = this.calculateEMA(
      this.stats.map(s => s.bandwidth),
      this.EMA_ALPHA
    );

    // Detect trend direction
    const bandwidthTrend = this.detectTrend(this.stats.map(s => s.bandwidth));
    const packetLossTrend = this.detectTrend(this.stats.map(s => s.packetLoss), true); // inverse
    const jitterTrend = this.detectTrend(this.stats.map(s => s.jitter), true);

    // Calculate trend strength (0-1)
    const trendStrength = this.calculateTrendStrength(this.stats.map(s => s.bandwidth));

    // Determine overall network quality
    const overallQuality = this.assessNetworkQuality(this.stats[this.stats.length - 1]);

    // Calculate confidence level based on sample count
    const confidence = Math.min(this.stats.length / 30, 1.0);

    return {
      bandwidthTrend,
      bandwidthMovingAverage: bandwidthEMA,
      bandwidthTrendStrength: trendStrength,
      packetLossTrend,
      jitterTrend,
      overallQuality,
      confidence
    };
  }

  /**
   * Detect quality limitation reason from WebRTC stats
   * Uses: qualityLimitationReason + supplementary metrics
   */
  detectQualityLimitation(stats: NetworkStats): QualityLimitation {
    if (!stats.qualityLimitationReason) {
      return {
        reason: 'unknown',
        severity: 'none'
      };
    }

    const reason = stats.qualityLimitationReason;

    // If CPU limited, suggest bitrate reduction
    if (reason === 'cpu') {
      return {
        reason: 'cpu',
        severity: this.assessLimitationSeverity(stats, 'cpu'),
        duration: 0,
        codeSuggestion: 'downgrade', // Reduce quality to save CPU
        bitrateSuggestion: undefined // Bitrate might be fine, it's CPU
      };
    }

    // If bandwidth limited, suggest resolution/framerate reduction
    if (reason === 'bandwidth') {
      return {
        reason: 'bandwidth',
        severity: this.assessLimitationSeverity(stats, 'bandwidth'),
        duration: 0,
        codeSuggestion: 'stabilize', // Reduce bitrate to match bandwidth
        bitrateSuggestion: Math.max(500, stats.bandwidth * 0.7) // Suggest 70% of available
      };
    }

    return {
      reason: reason === 'none' ? 'none' : 'other',
      severity: 'none'
    };
  }

  /**
   * Should we upgrade codec/quality? (with hysteresis)
   */
  shouldUpgrade(
    currentBandwidth: number,
    targetBandwidth: number,
    minConfidence: number = 0.7
  ): boolean {
    const trend = this.analyzeNetworkTrend();

    // Check hysteresis: prevent rapid upgrades
    if (Date.now() - this.lastUpgradeTime < this.upgradeHysteresisMs) {
      return false;
    }

    // Require significant improvement
    if (currentBandwidth * this.UP_THRESHOLD > targetBandwidth) {
      return false;
    }

    // Require confident uptrend
    if (
      trend.bandwidthTrend !== 'improving' ||
      trend.confidence < minConfidence ||
      trend.bandwidthTrendStrength < 0.5
    ) {
      return false;
    }

    this.lastUpgradeTime = Date.now();
    return true;
  }

  /**
   * Should we downgrade codec/quality? (with hysteresis)
   */
  shouldDowngrade(
    currentBandwidth: number,
    targetBandwidth: number,
    minConfidence: number = 0.5
  ): boolean {
    const trend = this.analyzeNetworkTrend();

    // Check hysteresis: faster downgrade response
    if (Date.now() - this.lastDowngradeTime < this.downgradeHysteresisMs) {
      return false;
    }

    // Require significant degradation
    if (currentBandwidth * this.DOWN_THRESHOLD < targetBandwidth) {
      return false;
    }

    // Require confident downtrend
    if (
      trend.bandwidthTrend !== 'degrading' ||
      trend.confidence < minConfidence
    ) {
      return false;
    }

    this.lastDowngradeTime = Date.now();
    return true;
  }

  /**
   * Get oscillation prevention state
   */
  getOscillationPrevention(): {
    isStable: boolean;
    oscillationScore: number; // 0-1, where 1 is high oscillation
    recommendedHysteresisMs: number;
  } {
    if (this.stats.length < 10) {
      return {
        isStable: true,
        oscillationScore: 0,
        recommendedHysteresisMs: 5000
      };
    }

    // Detect oscillation by looking at direction changes
    const recent = this.stats.slice(-10);
    let directionChanges = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1].bandwidth;
      const curr = recent[i].bandwidth;
      const direction = curr > prev ? 'up' : 'down';

      if (i > 1) {
        const prevDirection = recent[i - 1].bandwidth > recent[i - 2].bandwidth ? 'up' : 'down';
        if (direction !== prevDirection) {
          directionChanges++;
        }
      }
    }

    const oscillationScore = directionChanges / (recent.length - 2);
    const isStable = oscillationScore < 0.3;
    const recommendedHysteresisMs = Math.round(5000 * (1 + oscillationScore * 3));

    return {
      isStable,
      oscillationScore,
      recommendedHysteresisMs
    };
  }

  /**
   * Clear stats history (e.g., after codec change)
   */
  clearHistory(): void {
    this.stats = [];
    this.lastUpgradeTime = 0;
    this.lastDowngradeTime = 0;
  }

  // ============ Private Helpers ============

  /**
   * Calculate exponential moving average
   */
  private calculateEMA(values: number[], alpha: number): number {
    if (values.length === 0) return 0;

    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  /**
   * Detect trend: improving, degrading, or stable
   * Inverse: true means lower is better (packet loss, jitter)
   */
  private detectTrend(values: number[], inverse: boolean = false): 'improving' | 'degrading' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-5);
    const older = values.slice(Math.max(0, values.length - 10), values.length - 5);

    const recentAvg = older.length > 0 ? recent.reduce((a, b) => a + b) / recent.length : recent[0];
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b) / older.length : recent[0];

    const change = recentAvg - olderAvg;

    if (inverse) {
      // For metrics where lower is better (loss, jitter)
      if (change < -5) return 'improving';
      if (change > 5) return 'degrading';
    } else {
      // For metrics where higher is better (bandwidth)
      if (change > 200) return 'improving';
      if (change < -200) return 'degrading';
    }

    return 'stable';
  }

  /**
   * Calculate trend strength (0-1)
   */
  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;

    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i - 1]));
    }

    const avgChange = changes.reduce((a, b) => a + b) / changes.length;
    const avgValue = values.reduce((a, b) => a + b) / values.length;

    return Math.min(avgChange / avgValue, 1.0);
  }

  /**
   * Assess overall network quality
   */
  private assessNetworkQuality(stats: NetworkStats): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 0;

    // Bandwidth score (max 40 points)
    if (stats.bandwidth > 5000) score += 40;
    else if (stats.bandwidth > 2000) score += 30;
    else if (stats.bandwidth > 1000) score += 20;
    else if (stats.bandwidth > 500) score += 10;

    // Packet loss score (max 30 points)
    if (stats.packetLoss < 0.5) score += 30;
    else if (stats.packetLoss < 2) score += 20;
    else if (stats.packetLoss < 5) score += 10;

    // Jitter score (max 20 points)
    if (stats.jitter < 10) score += 20;
    else if (stats.jitter < 30) score += 10;

    // RTT score (max 10 points)
    if (stats.rtt < 50) score += 10;
    else if (stats.rtt < 150) score += 5;

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Assess severity of quality limitation
   */
  private assessLimitationSeverity(
    stats: NetworkStats,
    reason: 'cpu' | 'bandwidth'
  ): 'none' | 'minor' | 'moderate' | 'severe' {
    if (reason === 'cpu') {
      // CPU limitation severity based on other metrics being good
      if (stats.bandwidth > 3000 && stats.packetLoss < 1) {
        return 'minor'; // Good network, CPU is bottleneck
      }
      if (stats.bandwidth > 1000) {
        return 'moderate';
      }
      return 'severe';
    } else {
      // Bandwidth limitation severity
      if (stats.bandwidth < 500) return 'severe';
      if (stats.bandwidth < 1000) return 'moderate';
      if (stats.bandwidth < 2000) return 'minor';
      return 'none';
    }
  }
}
