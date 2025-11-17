/**
 * Codec Quality Monitor
 *
 * Real-time monitoring and adaptation of codec parameters based on:
 * - Network conditions (bandwidth, packet loss, jitter)
 * - Encoder metrics (bitrate, frame rate, resolution)
 * - Decoder feedback (quality, frame drops)
 */

const { EventEmitter } = require('events');

class CodecQualityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.callId = options.callId;
    this.initialCodec = options.codec || 'h264';
    this.updateIntervalMs = options.updateIntervalMs || 5000; // 5 seconds

    // Quality metrics history
    this.metrics = {
      networkQuality: {},
      encoderMetrics: {},
      decoderMetrics: {},
      qualityScore: 0,
      timestamp: Date.now()
    };

    // Threshold configuration
    this.thresholds = {
      // Network thresholds
      packetLossHigh: 5,         // %
      packetLossCritical: 10,    // %
      jitterHigh: 30,             // ms
      rttHigh: 150,               // ms
      rttCritical: 300,           // ms
      bandwidthLow: 1500,        // kbps
      bandwidthCritical: 800,    // kbps

      // Encoder thresholds
      frameDropRate: 5,          // % of frames
      bitrateMismatch: 20,       // %

      // Decoder thresholds
      qualityScoreLow: 4,        // 0-10 scale
      qualityScoreCritical: 2
    };

    // History for trend detection
    this.history = {
      networkQuality: [],
      qualityScore: [],
      maxHistorySize: 12 // Keep last 12 measurements (60 seconds at 5s intervals)
    };

    // Adaptation state
    this.adaptationState = {
      currentCodec: this.initialCodec,
      currentBitrate: 2500,
      currentResolution: '1280x720',
      currentFramerate: 30,
      targetQualityLevel: 3, // 1-5 scale
      lastAdaptationTime: Date.now(),
      adaptationCooldown: 10000 // 10 seconds between adaptations
    };

    // Monitor loop
    this.monitoringInterval = null;
  }

  /**
   * Start quality monitoring
   */
  startMonitoring() {
    console.log(`🎯 Starting codec quality monitor for call ${this.callId}`);

    this.monitoringInterval = setInterval(() => {
      this.evaluateQuality();
    }, this.updateIntervalMs);

    return this;
  }

  /**
   * Stop quality monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update network quality metrics
   */
  updateNetworkMetrics(metrics) {
    this.metrics.networkQuality = {
      ...metrics,
      timestamp: Date.now()
    };

    // Keep history
    this.history.networkQuality.push({
      ...metrics,
      timestamp: Date.now()
    });

    if (this.history.networkQuality.length > this.history.maxHistorySize) {
      this.history.networkQuality.shift();
    }

    this.emit('metrics:network', this.metrics.networkQuality);
  }

  /**
   * Update encoder metrics
   */
  updateEncoderMetrics(metrics) {
    this.metrics.encoderMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.emit('metrics:encoder', this.metrics.encoderMetrics);
  }

  /**
   * Update decoder metrics
   */
  updateDecoderMetrics(metrics) {
    this.metrics.decoderMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.emit('metrics:decoder', this.metrics.decoderMetrics);
  }

  /**
   * Main quality evaluation loop
   */
  evaluateQuality() {
    if (!Object.keys(this.metrics.networkQuality).length) {
      return; // No metrics yet
    }

    const qualityScore = this.calculateQualityScore();
    const trend = this.detectTrend();
    const recommendation = this.getAdaptationRecommendation(qualityScore, trend);

    this.metrics.qualityScore = qualityScore;

    // Keep history
    this.history.qualityScore.push({
      score: qualityScore,
      timestamp: Date.now(),
      trend
    });

    if (this.history.qualityScore.length > this.history.maxHistorySize) {
      this.history.qualityScore.shift();
    }

    // Emit status
    this.emit('quality:evaluated', {
      qualityScore,
      trend,
      recommendation,
      metrics: this.metrics
    });

    // Apply adaptation if needed
    if (recommendation && this.shouldAdapt()) {
      this.applyAdaptation(recommendation);
    }
  }

  /**
   * Calculate overall quality score (0-10)
   */
  calculateQualityScore() {
    let score = 10;
    const { networkQuality, encoderMetrics, decoderMetrics } = this.metrics;

    // Network quality factors
    if (networkQuality.packetLoss) {
      if (networkQuality.packetLoss > this.thresholds.packetLossCritical) {
        score -= 4;
      } else if (networkQuality.packetLoss > this.thresholds.packetLossHigh) {
        score -= 2;
      } else if (networkQuality.packetLoss > 0) {
        score -= 0.5;
      }
    }

    if (networkQuality.jitter) {
      if (networkQuality.jitter > this.thresholds.jitterHigh) {
        score -= 1;
      }
    }

    if (networkQuality.rtt) {
      if (networkQuality.rtt > this.thresholds.rttCritical) {
        score -= 2;
      } else if (networkQuality.rtt > this.thresholds.rttHigh) {
        score -= 1;
      }
    }

    // Bandwidth constraints
    if (networkQuality.bandwidth) {
      if (networkQuality.bandwidth < this.thresholds.bandwidthCritical) {
        score -= 3;
      } else if (networkQuality.bandwidth < this.thresholds.bandwidthLow) {
        score -= 1.5;
      }
    }

    // Encoder issues
    if (encoderMetrics.frameDropRate && encoderMetrics.frameDropRate > this.thresholds.frameDropRate) {
      score -= 1.5;
    }

    // Decoder feedback
    if (decoderMetrics.qualityScore !== undefined) {
      // Weight decoder feedback at 30% of overall score
      const decoderWeight = 0.3;
      const decoderContribution = decoderMetrics.qualityScore * decoderWeight;
      score = (score * 0.7) + decoderContribution;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Detect quality trend
   */
  detectTrend() {
    if (this.history.qualityScore.length < 3) {
      return 'stable';
    }

    const recent = this.history.qualityScore.slice(-3);
    const [first, second, third] = recent.map(h => h.score);

    const diff1 = second - first;
    const diff2 = third - second;

    if (diff1 > 1 && diff2 > 0.5) {
      return 'improving';
    } else if (diff1 < -1 && diff2 < -0.5) {
      return 'degrading';
    } else if (Math.abs(diff1) < 0.5 && Math.abs(diff2) < 0.5) {
      return 'stable';
    } else {
      return 'fluctuating';
    }
  }

  /**
   * Get adaptation recommendation based on quality
   */
  getAdaptationRecommendation(qualityScore, trend) {
    const { networkQuality, encoderMetrics } = this.metrics;

    // Critical situations - downgrade
    if (qualityScore <= this.thresholds.qualityScoreCritical) {
      return {
        action: 'downgrade',
        severity: 'critical',
        reasons: this.getDowngradeReasons(),
        suggestedCodec: this.suggestDowngradeCodec(),
        suggestedBitrate: Math.max(500, (encoderMetrics.currentBitrate || 2500) * 0.5),
        suggestedResolution: this.suggestDowngradeResolution()
      };
    }

    // Poor quality - consider downgrade
    if (qualityScore <= this.thresholds.qualityScoreLow && trend === 'degrading') {
      return {
        action: 'reduce_quality',
        severity: 'high',
        reasons: this.getDowngradeReasons(),
        suggestedBitrate: Math.max(800, (encoderMetrics.currentBitrate || 2500) * 0.75),
        suggestedResolution: this.suggestDowngradeResolution()
      };
    }

    // Excellent quality - consider upgrade
    if (qualityScore > 8 && trend === 'improving') {
      return {
        action: 'upgrade',
        severity: 'low',
        reasons: ['Network conditions improving', 'Quality metrics excellent'],
        suggestedBitrate: (encoderMetrics.currentBitrate || 2500) * 1.2,
        suggestedResolution: this.suggestUpgradeResolution()
      };
    }

    return null;
  }

  /**
   * Get reasons for downgrade recommendation
   */
  getDowngradeReasons() {
    const reasons = [];
    const { networkQuality, encoderMetrics } = this.metrics;

    if (networkQuality.packetLoss > this.thresholds.packetLossHigh) {
      reasons.push(`High packet loss: ${networkQuality.packetLoss.toFixed(1)}%`);
    }

    if (networkQuality.bandwidth < this.thresholds.bandwidthLow) {
      reasons.push(`Low bandwidth: ${networkQuality.bandwidth} kbps`);
    }

    if (networkQuality.rtt > this.thresholds.rttHigh) {
      reasons.push(`High RTT: ${networkQuality.rtt} ms`);
    }

    if (encoderMetrics.frameDropRate > this.thresholds.frameDropRate) {
      reasons.push(`Frame drops: ${encoderMetrics.frameDropRate.toFixed(1)}%`);
    }

    return reasons.length > 0 ? reasons : ['Quality degradation detected'];
  }

  /**
   * Suggest codec for downgrade
   */
  suggestDowngradeCodec() {
    const current = this.adaptationState.currentCodec;

    if (current === 'av1') return 'vp9';
    if (current === 'vp9') return 'h264';
    return 'h264'; // Fallback
  }

  /**
   * Suggest resolution downgrade
   */
  suggestDowngradeResolution() {
    const current = this.adaptationState.currentResolution;

    const resolutions = [
      '1920x1080',
      '1280x720',
      '960x540',
      '640x480',
      '320x240'
    ];

    const currentIdx = resolutions.indexOf(current);
    if (currentIdx > 0) {
      return resolutions[currentIdx + 1];
    }

    return '320x240'; // Lowest
  }

  /**
   * Suggest resolution upgrade
   */
  suggestUpgradeResolution() {
    const current = this.adaptationState.currentResolution;

    const resolutions = [
      '1920x1080',
      '1280x720',
      '960x540',
      '640x480',
      '320x240'
    ];

    const currentIdx = resolutions.indexOf(current);
    if (currentIdx > 0) {
      return resolutions[currentIdx - 1];
    }

    return '1920x1080'; // Highest
  }

  /**
   * Check if enough time has passed for adaptation
   */
  shouldAdapt() {
    const timeSinceLastAdapt = Date.now() - this.adaptationState.lastAdaptationTime;
    return timeSinceLastAdapt >= this.adaptationState.adaptationCooldown;
  }

  /**
   * Apply adaptation recommendation
   */
  applyAdaptation(recommendation) {
    this.adaptationState.lastAdaptationTime = Date.now();

    const adaptation = {
      action: recommendation.action,
      severity: recommendation.severity,
      timestamp: Date.now(),
      previousState: { ...this.adaptationState },
      changes: {}
    };

    switch (recommendation.action) {
      case 'downgrade':
      case 'reduce_quality':
        if (recommendation.suggestedBitrate) {
          adaptation.changes.bitrate = this.adaptationState.currentBitrate;
          this.adaptationState.currentBitrate = Math.round(recommendation.suggestedBitrate);
        }
        if (recommendation.suggestedResolution) {
          adaptation.changes.resolution = this.adaptationState.currentResolution;
          this.adaptationState.currentResolution = recommendation.suggestedResolution;
        }
        if (recommendation.suggestedCodec) {
          adaptation.changes.codec = this.adaptationState.currentCodec;
          this.adaptationState.currentCodec = recommendation.suggestedCodec;
        }
        break;

      case 'upgrade':
        if (recommendation.suggestedBitrate) {
          adaptation.changes.bitrate = this.adaptationState.currentBitrate;
          this.adaptationState.currentBitrate = Math.round(recommendation.suggestedBitrate);
        }
        if (recommendation.suggestedResolution) {
          adaptation.changes.resolution = this.adaptationState.currentResolution;
          this.adaptationState.currentResolution = recommendation.suggestedResolution;
        }
        break;
    }

    console.log(`📊 Codec adaptation: ${recommendation.action}`, {
      codec: this.adaptationState.currentCodec,
      bitrate: this.adaptationState.currentBitrate,
      resolution: this.adaptationState.currentResolution
    });

    this.emit('adaptation:applied', {
      ...adaptation,
      currentState: { ...this.adaptationState }
    });

    return adaptation;
  }

  /**
   * Get current quality status
   */
  getStatus() {
    return {
      callId: this.callId,
      qualityScore: this.metrics.qualityScore,
      trend: this.detectTrend(),
      currentCodec: this.adaptationState.currentCodec,
      currentBitrate: this.adaptationState.currentBitrate,
      currentResolution: this.adaptationState.currentResolution,
      networkMetrics: this.metrics.networkQuality,
      encoderMetrics: this.metrics.encoderMetrics,
      decoderMetrics: this.metrics.decoderMetrics
    };
  }

  /**
   * Get quality history
   */
  getHistory(type = 'qualityScore', limit = 12) {
    const history = this.history[type] || [];
    return history.slice(-limit);
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    const status = this.getStatus();
    const qualityHistory = this.getHistory('qualityScore');
    const networkHistory = this.getHistory('networkQuality');

    const avgQuality = qualityHistory.length > 0
      ? qualityHistory.reduce((sum, h) => sum + h.score, 0) / qualityHistory.length
      : 0;

    const avgPacketLoss = networkHistory.length > 0
      ? networkHistory.reduce((sum, h) => sum + (h.packetLoss || 0), 0) / networkHistory.length
      : 0;

    return {
      ...status,
      averageQuality: parseFloat(avgQuality.toFixed(2)),
      averagePacketLoss: parseFloat(avgPacketLoss.toFixed(2)),
      adaptationCount: this.adaptationState.lastAdaptationTime !== Date.now() ? 1 : 0,
      historySize: qualityHistory.length,
      recommendations: this.getAdaptationRecommendation(status.qualityScore, status.trend)
    };
  }
}

module.exports = CodecQualityMonitor;
