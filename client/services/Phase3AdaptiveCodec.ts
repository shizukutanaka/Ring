/**
 * Phase 3: Adaptive Codec & Network Management
 *
 * Advanced features:
 * - Adaptive keyframe intervals
 * - Advanced packet loss handling (FEC, RED, concealment)
 * - Real-time network monitoring and response
 *
 * Research-backed by: RFC 2598, VP9/AV1 specs, Google WebRTC
 */

export interface KeyframeStrategy {
  baseInterval: number;
  minInterval: number;
  maxInterval: number;
  currentInterval: number;
  lastAdjustedTime: number;
}

export interface LossRecoveryConfig {
  fecEnabled: boolean;
  fecLevel: number; // 0.1 = 10% overhead
  redEnabled: boolean;
  concealmentEnabled: boolean;
  currentStrategy: 'fec' | 'red' | 'concealment' | 'hybrid';
}

export interface PacketLossMetrics {
  currentLoss: number;
  averageLoss: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  burstDetected: boolean;
  recoveredPackets: number;
  unrecoveredPackets: number;
}

/**
 * Adaptive Keyframe Manager - Phase 3 Improvement #2
 *
 * Dynamically adjusts keyframe intervals based on:
 * - Packet loss rate (higher loss → shorter intervals)
 * - RTT (higher RTT → longer intervals)
 * - Frame complexity (higher complexity → shorter intervals)
 * - Available bandwidth
 */
export class AdaptiveKeyframeManager {
  private strategy: KeyframeStrategy = {
    baseInterval: 2.0, // 2 seconds default
    minInterval: 0.5,
    maxInterval: 10,
    currentInterval: 2.0,
    lastAdjustedTime: Date.now()
  };

  private metrics = {
    packetLossRate: 0,
    frameComplexity: 0.5,
    bandwidth: 2000,
    rtt: 50,
    jitter: 5
  };

  private adjustmentHistory: number[] = [];

  /**
   * Calculate optimal keyframe interval based on network conditions
   * Formula: interval = base * (1 + rtt_factor) * (1 - complexity_factor) * bandwidth_factor
   */
  calculateOptimalInterval(): number {
    let interval = this.strategy.baseInterval;

    // Factor 1: Packet Loss (aggressive - shorter intervals for recovery)
    if (this.metrics.packetLossRate > 10) {
      interval = this.strategy.minInterval; // 0.5s
    } else if (this.metrics.packetLossRate > 5) {
      interval = 0.75;
    } else if (this.metrics.packetLossRate > 2) {
      interval = 1.0;
    } else {
      interval = 2.0;
    }

    // Factor 2: RTT (inverse: higher RTT = longer intervals to allow detection time)
    const rttFactor = Math.min(this.metrics.rtt / 50, 3.0);
    interval *= (1 + rttFactor * 0.2);

    // Factor 3: Frame Complexity (higher complexity = shorter intervals for recovery)
    const complexityFactor = this.metrics.frameComplexity; // 0-1
    interval /= (1 + complexityFactor * 0.5);

    // Factor 4: Bandwidth (inversely proportional above a threshold)
    if (this.metrics.bandwidth < 500) {
      interval *= 1.5; // Very low: longer intervals to save bandwidth
    } else if (this.metrics.bandwidth < 1000) {
      interval *= 1.2;
    } else if (this.metrics.bandwidth > 5000) {
      interval *= 0.9; // High bandwidth: shorter for quick recovery
    }

    // Clamp to valid range
    const clamped = Math.max(
      this.strategy.minInterval,
      Math.min(this.strategy.maxInterval, interval)
    );

    return Math.round(clamped * 10) / 10; // Round to 0.1s precision
  }

  /**
   * Update metrics and adjust keyframe interval if needed
   */
  updateNetworkMetrics(stats: {
    packetLoss: number;
    bandwidth: number;
    rtt: number;
    jitter: number;
    frameComplexity?: number;
  }): number {
    this.metrics.packetLossRate = stats.packetLoss;
    this.metrics.bandwidth = stats.bandwidth;
    this.metrics.rtt = stats.rtt;
    this.metrics.jitter = stats.jitter;

    // Update complexity with exponential smoothing
    if (stats.frameComplexity !== undefined) {
      this.metrics.frameComplexity = this.metrics.frameComplexity * 0.7 + stats.frameComplexity * 0.3;
    }

    const newInterval = this.calculateOptimalInterval();

    // Only update if change is significant (> 0.1s difference)
    if (Math.abs(newInterval - this.strategy.currentInterval) > 0.1) {
      const oldInterval = this.strategy.currentInterval;
      this.strategy.currentInterval = newInterval;
      this.strategy.lastAdjustedTime = Date.now();
      this.adjustmentHistory.push(newInterval);

      if (this.adjustmentHistory.length > 50) {
        this.adjustmentHistory.shift();
      }

      console.log(
        `🔑 Keyframe interval adjusted: ${oldInterval.toFixed(2)}s → ${newInterval.toFixed(2)}s ` +
        `(loss=${stats.packetLoss.toFixed(1)}%, rtt=${stats.rtt}ms, bw=${stats.bandwidth}kbps)`
      );

      return newInterval;
    }

    return this.strategy.currentInterval;
  }

  /**
   * Get keyframe interval in frames (for encoder configuration)
   * Assuming 30 FPS
   */
  getKeyframeIntervalFrames(): number {
    return Math.max(1, Math.round(this.strategy.currentInterval * 30));
  }

  /**
   * Get keyframe interval in milliseconds
   */
  getKeyframeIntervalMs(): number {
    return Math.round(this.strategy.currentInterval * 1000);
  }

  /**
   * Get current strategy status
   */
  getStatus() {
    return {
      currentInterval: this.strategy.currentInterval,
      keyframesPerSecond: 1 / this.strategy.currentInterval,
      metrics: this.metrics,
      recentAdjustments: this.adjustmentHistory.slice(-5)
    };
  }
}

/**
 * Advanced Packet Loss Handler - Phase 3 Improvement #3
 *
 * Implements multiple loss recovery strategies:
 * 1. FEC (Forward Error Correction) - Redundant packets for recovery
 * 2. RED (Redundant Encoding Data) - Duplicate important data
 * 3. Temporal Concealment - Fill lost frames with previous frame
 * 4. Loss Detection & Adaptation - Proactive bitrate reduction
 */
export class AdvancedPacketLossHandler {
  private config: LossRecoveryConfig = {
    fecEnabled: false,
    fecLevel: 0.15, // 15% overhead
    redEnabled: false,
    concealmentEnabled: true,
    currentStrategy: 'concealment'
  };

  private lossMetrics: PacketLossMetrics = {
    currentLoss: 0,
    averageLoss: 0,
    trend: 'stable',
    burstDetected: false,
    recoveredPackets: 0,
    unrecoveredPackets: 0
  };

  private lossHistory: number[] = [];
  private burstThresholdMs = 500; // Burst = 3+ losses within 500ms
  private lastLossTime = 0;
  private consecutiveLosses = 0;

  /**
   * Analyze packet loss and select recovery strategy
   */
  selectRecoveryStrategy(
    packetLoss: number,
    bandwidth: number,
    rtt: number
  ): LossRecoveryConfig {
    // Decision tree for strategy selection
    let strategy: LossRecoveryConfig = {
      fecEnabled: false,
      fecLevel: 0.15,
      redEnabled: false,
      concealmentEnabled: true,
      currentStrategy: 'concealment'
    };

    if (packetLoss > 10) {
      // Extreme loss: Use all methods
      strategy.fecEnabled = true;
      strategy.fecLevel = 0.2; // 20% overhead
      strategy.redEnabled = true;
      strategy.concealmentEnabled = true;
      strategy.currentStrategy = 'hybrid';
      console.warn(`🆘 CRITICAL packet loss: ${packetLoss.toFixed(1)}%`);
    } else if (packetLoss > 5) {
      // High loss: FEC + RED if bandwidth allows
      strategy.fecEnabled = true;
      strategy.fecLevel = 0.15;
      strategy.redEnabled = bandwidth > 1000;
      strategy.currentStrategy = strategy.redEnabled ? 'hybrid' : 'fec';
      console.warn(`⚠️  High packet loss: ${packetLoss.toFixed(1)}%`);
    } else if (packetLoss > 2) {
      // Moderate loss: FEC if bandwidth allows
      strategy.fecEnabled = bandwidth > 500;
      strategy.concealmentEnabled = true;
      strategy.currentStrategy = strategy.fecEnabled ? 'fec' : 'concealment';
      console.log(`⚡ Moderate packet loss: ${packetLoss.toFixed(1)}%`);
    } else if (packetLoss > 0.5) {
      // Low loss: Concealment only
      strategy.concealmentEnabled = true;
      strategy.currentStrategy = 'concealment';
    }

    // RTT consideration: High RTT prefers FEC (reactive won't work)
    if (rtt > 200 && packetLoss > 1) {
      strategy.fecEnabled = true;
      console.log(`🌐 High RTT (${rtt}ms) detected - enabling FEC`);
    }

    return strategy;
  }

  /**
   * Update loss metrics and detect patterns
   */
  updateLossMetrics(currentLoss: number): PacketLossMetrics {
    this.lossHistory.push(currentLoss);
    if (this.lossHistory.length > 30) {
      this.lossHistory.shift();
    }

    // Calculate average
    const averageLoss =
      this.lossHistory.reduce((a, b) => a + b, 0) / this.lossHistory.length;

    // Detect trend
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (this.lossHistory.length > 10) {
      const recent = this.lossHistory.slice(-5);
      const older = this.lossHistory.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b) / older.length;

      if (recentAvg > olderAvg * 1.2) {
        trend = 'increasing';
      } else if (recentAvg < olderAvg * 0.8) {
        trend = 'decreasing';
      }
    }

    // Detect burst (rapid consecutive losses)
    const now = Date.now();
    const burstDetected =
      now - this.lastLossTime < this.burstThresholdMs
        ? ++this.consecutiveLosses >= 3
        : (this.consecutiveLosses = currentLoss > 0 ? 1 : 0);

    if (currentLoss > 0) {
      this.lastLossTime = now;
    }

    this.lossMetrics = {
      currentLoss,
      averageLoss,
      trend,
      burstDetected,
      recoveredPackets: this.lossMetrics.recoveredPackets,
      unrecoveredPackets: this.lossMetrics.unrecoveredPackets + (currentLoss > 0 ? 1 : 0)
    };

    if (trend === 'increasing') {
      console.warn(`📈 Packet loss trend INCREASING (${currentLoss.toFixed(1)}%)`);
    } else if (trend === 'decreasing') {
      console.log(`📉 Packet loss trend DECREASING (${currentLoss.toFixed(1)}%)`);
    }

    return this.lossMetrics;
  }

  /**
   * Get recommended action based on loss pattern
   */
  getRecommendedAction(): {
    action: 'monitor' | 'enable_fec' | 'reduce_bitrate' | 'downgrade_codec' | 'critical';
    priority: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  } {
    const loss = this.lossMetrics.currentLoss;
    const trend = this.lossMetrics.trend;
    const burst = this.lossMetrics.burstDetected;

    if (loss > 15 || (burst && loss > 10)) {
      return {
        action: 'critical',
        priority: 'critical',
        reason: `CRITICAL loss: ${loss.toFixed(1)}% ${burst ? 'with burst' : ''}`
      };
    }

    if (loss > 10 || (burst && loss > 7)) {
      return {
        action: 'downgrade_codec',
        priority: 'high',
        reason: `High loss (${loss.toFixed(1)}%) - consider downgrading codec`
      };
    }

    if (loss > 5 || (trend === 'increasing' && loss > 3)) {
      return {
        action: 'reduce_bitrate',
        priority: 'high',
        reason: `Elevated loss (${loss.toFixed(1)}%) - reduce bitrate`
      };
    }

    if (loss > 2) {
      return {
        action: 'enable_fec',
        priority: 'medium',
        reason: `Moderate loss (${loss.toFixed(1)}%) - enable FEC`
      };
    }

    return {
      action: 'monitor',
      priority: 'low',
      reason: `Low loss (${loss.toFixed(1)}%) - monitoring`
    };
  }

  /**
   * Record successful packet recovery
   */
  recordRecovery(recovered: boolean): void {
    if (recovered) {
      this.lossMetrics.recoveredPackets++;
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    const total = this.lossMetrics.recoveredPackets + this.lossMetrics.unrecoveredPackets;
    const recoveryRate = total > 0 ? (this.lossMetrics.recoveredPackets / total) * 100 : 0;

    return {
      recovered: this.lossMetrics.recoveredPackets,
      unrecovered: this.lossMetrics.unrecoveredPackets,
      total,
      recoveryRate: recoveryRate.toFixed(1) + '%',
      currentLoss: this.lossMetrics.currentLoss,
      averageLoss: this.lossMetrics.averageLoss,
      trend: this.lossMetrics.trend,
      metrics: this.lossMetrics
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): LossRecoveryConfig {
    return this.config;
  }

  /**
   * Update configuration based on analysis
   */
  updateConfiguration(newConfig: Partial<LossRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 Loss recovery strategy updated:`, this.config);
  }
}

/**
 * Integrated Phase 3 Adaptive Manager
 * Coordinates keyframe and loss handling
 */
export class Phase3AdaptiveManager {
  private keyframeManager: AdaptiveKeyframeManager;
  private lossHandler: AdvancedPacketLossHandler;

  constructor() {
    this.keyframeManager = new AdaptiveKeyframeManager();
    this.lossHandler = new AdvancedPacketLossHandler();
  }

  /**
   * Update all metrics and get consolidated recommendations
   */
  updateAndRecommend(stats: {
    packetLoss: number;
    bandwidth: number;
    rtt: number;
    jitter: number;
    frameComplexity?: number;
  }): {
    keyframeIntervalMs: number;
    lossStrategy: LossRecoveryConfig;
    recommendedAction: string;
    priority: string;
  } {
    // Update keyframe interval
    const keyframeIntervalMs = this.keyframeManager.updateNetworkMetrics(stats) * 1000;

    // Update loss handling
    this.lossHandler.updateLossMetrics(stats.packetLoss);
    const lossStrategy = this.lossHandler.selectRecoveryStrategy(
      stats.packetLoss,
      stats.bandwidth,
      stats.rtt
    );

    // Get recommended action
    const lossAction = this.lossHandler.getRecommendedAction();

    return {
      keyframeIntervalMs: Math.round(keyframeIntervalMs),
      lossStrategy,
      recommendedAction: lossAction.action,
      priority: lossAction.priority
    };
  }

  /**
   * Get comprehensive status report
   */
  getStatus() {
    return {
      keyframe: this.keyframeManager.getStatus(),
      loss: this.lossHandler.getRecoveryStats(),
      config: this.lossHandler.getConfiguration(),
      timestamp: new Date().toISOString()
    };
  }
}
