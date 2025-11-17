/**
 * Codec Switching Engine (Meta-Style Hybrid Approach)
 *
 * Dynamically switches between codecs based on:
 * - CPU usage
 * - Battery level
 * - Network conditions
 * - Encoding time
 *
 * Implements Meta's 2024 algorithm for seamless codec switching
 * without signaling overhead
 */

const { EventEmitter } = require('events');

class CodecSwitchingEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.callId = options.callId;
    this.currentCodec = options.initialCodec || 'h264';
    this.supportedCodecs = options.supportedCodecs || ['h264', 'vp9', 'av1'];

    // Hardware capabilities
    this.hardware = {
      hasAV1Encoder: options.hasAV1Encoder || false,
      hasAV1Decoder: options.hasAV1Decoder || true, // Most modern devices
      hasVP9Encoder: options.hasVP9Encoder || true,
      hasVP9Decoder: options.hasVP9Decoder || true,
      hasH264Encoder: true, // Universal fallback
      hasH264Decoder: true
    };

    // Thresholds for codec switching
    this.thresholds = {
      cpuHigh: options.cpuHighThreshold || 70,        // CPU >70%: downgrade
      cpuCritical: options.cpuCriticalThreshold || 85, // CPU >85%: fallback to H.264
      cpuLow: options.cpuLowThreshold || 30,          // CPU <30%: upgrade
      batteryLow: options.batteryLowThreshold || 20,   // Battery <20%: fallback
      batteryMedium: options.batteryMediumThreshold || 40, // 20-40%: reduced quality
      encodingTimeHigh: options.encodingTimeHigh || 150, // Encoding >150ms: switch codec
      bandwidthLow: options.bandwidthLow || 1500,     // <1.5 Mbps: downgrade
      bandwidthHigh: options.bandwidthHigh || 5000    // >5 Mbps: upgrade
    };

    // State tracking
    this.state = {
      cpuUsage: 0,
      batteryLevel: 100,
      encodingTime: 0,
      bandwidth: 0,
      networkQuality: 'good',

      // Switching state
      lastSwitchTime: Date.now(),
      switchCooldown: 10000, // 10 seconds between switches
      switchReason: null,
      switchHistory: []
    };

    // Asymmetric codec selection (encode != decode)
    this.asymmetricMode = options.asymmetricMode !== false;
    this.asymmetricCodec = {
      encode: null,
      decode: null
    };

    // Monitoring interval
    this.monitoringInterval = null;
  }

  /**
   * Start codec switching monitoring
   */
  startMonitoring(interval = 2000) {
    console.log(`🔄 Starting codec switching engine for call ${this.callId}`);

    this.monitoringInterval = setInterval(() => {
      this.evaluateCodecSwitch();
    }, interval);

    return this;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update device metrics
   */
  updateMetrics(metrics) {
    this.state.cpuUsage = metrics.cpuUsage || 0;
    this.state.batteryLevel = metrics.batteryLevel || 100;
    this.state.encodingTime = metrics.encodingTime || 0;
    this.state.bandwidth = metrics.bandwidth || 0;
    this.state.networkQuality = this.determineNetworkQuality(metrics);

    this.emit('metrics:updated', this.state);
  }

  /**
   * Determine network quality from metrics
   */
  determineNetworkQuality(metrics) {
    if (metrics.packetLoss > 5 || metrics.jitter > 50) {
      return 'poor';
    } else if (metrics.bandwidth < 2000) {
      return 'fair';
    } else if (metrics.bandwidth > 5000) {
      return 'excellent';
    }
    return 'good';
  }

  /**
   * Evaluate if codec switch needed
   */
  evaluateCodecSwitch() {
    const reason = this.determineSwitchReason();

    if (!reason) {
      return; // No switch needed
    }

    // Check cooldown
    if (!this.canSwitch()) {
      return;
    }

    // Determine target codec
    const targetCodec = this.selectTargetCodec(reason);

    if (targetCodec && targetCodec !== this.currentCodec) {
      this.switchCodec(targetCodec, reason);
    }
  }

  /**
   * Determine if codec switch is needed and why
   */
  determineSwitchReason() {
    const { cpuUsage, batteryLevel, encodingTime, bandwidth } = this.state;

    // Critical: CPU overload
    if (cpuUsage > this.thresholds.cpuCritical) {
      return {
        action: 'downgrade',
        severity: 'critical',
        reason: `CPU critical: ${cpuUsage.toFixed(1)}%`,
        metric: 'cpu'
      };
    }

    // Critical: Battery critical
    if (batteryLevel < 15) {
      return {
        action: 'downgrade',
        severity: 'critical',
        reason: `Battery critical: ${batteryLevel}%`,
        metric: 'battery'
      };
    }

    // High: CPU high
    if (cpuUsage > this.thresholds.cpuHigh) {
      return {
        action: 'downgrade',
        severity: 'high',
        reason: `CPU high: ${cpuUsage.toFixed(1)}%`,
        metric: 'cpu'
      };
    }

    // High: Battery low
    if (batteryLevel < this.thresholds.batteryLow) {
      return {
        action: 'downgrade',
        severity: 'high',
        reason: `Battery low: ${batteryLevel}%`,
        metric: 'battery'
      };
    }

    // Medium: Encoding time high
    if (encodingTime > this.thresholds.encodingTimeHigh) {
      return {
        action: 'downgrade',
        severity: 'medium',
        reason: `Encoding time high: ${encodingTime.toFixed(0)}ms`,
        metric: 'encoding'
      };
    }

    // Medium: Battery medium (degraded quality)
    if (batteryLevel < this.thresholds.batteryMedium) {
      return {
        action: 'reduce_quality',
        severity: 'medium',
        reason: `Battery medium: ${batteryLevel}%`,
        metric: 'battery'
      };
    }

    // Low: Can upgrade?
    if (cpuUsage < this.thresholds.cpuLow && batteryLevel > 50 && bandwidth > this.thresholds.bandwidthHigh) {
      return {
        action: 'upgrade',
        severity: 'low',
        reason: `Optimal conditions: CPU ${cpuUsage.toFixed(1)}%, Battery ${batteryLevel}%, BW ${bandwidth}kbps`,
        metric: 'all'
      };
    }

    // Low: Bandwidth low (within good conditions)
    if (bandwidth < this.thresholds.bandwidthLow && this.state.networkQuality === 'fair') {
      return {
        action: 'reduce_quality',
        severity: 'low',
        reason: `Bandwidth fair: ${bandwidth}kbps`,
        metric: 'bandwidth'
      };
    }

    return null;
  }

  /**
   * Select target codec based on reason
   */
  selectTargetCodec(reason) {
    const { action, severity, metric } = reason;

    // Get available codecs for this action
    let availableCodecs = this.getAvailableCodecs(action);

    if (!availableCodecs || availableCodecs.length === 0) {
      return null;
    }

    // Downgrade: Move to less demanding codec
    if (action === 'downgrade') {
      // Priority: efficiency over compatibility
      const efficiency = {
        'av1': { cpu: 100, battery: 20 }, // Highest CPU, best efficiency
        'vp9': { cpu: 60, battery: 40 },  // Medium CPU, good efficiency
        'h264': { cpu: 30, battery: 60 }  // Low CPU, baseline
      };

      const targetPriority = {
        cpu: ['h264', 'vp9', 'av1'],     // CPU critical: move away from AV1
        battery: ['h264', 'vp9', 'av1'],  // Battery: same priority
        encoding: ['vp9', 'h264', 'av1']  // Encoding time: downgrade codec
      };

      // Get the codec priority for this metric
      let priority = targetPriority[metric] || targetPriority['cpu'];

      // Find next codec in priority that we haven't tried
      for (const codec of priority) {
        if (availableCodecs.includes(codec) && codec !== this.currentCodec) {
          return codec;
        }
      }
    }

    // Upgrade: Move to more efficient codec
    if (action === 'upgrade') {
      // Priority: efficiency > compatibility
      const upgradePriority = {
        av1: true,  // Most efficient
        vp9: true,  // Good efficiency
        h264: true  // Fallback
      };

      // Try to upgrade: AV1 > VP9 > Current
      if (availableCodecs.includes('av1') && this.currentCodec !== 'av1') {
        return 'av1';
      }
      if (availableCodecs.includes('vp9') && this.currentCodec !== 'vp9') {
        return 'vp9';
      }
    }

    // Reduce quality: Keep codec but adjust parameters
    if (action === 'reduce_quality') {
      return null; // Handled by quality adjustment, not codec switch
    }

    return null;
  }

  /**
   * Get available codecs for given action
   */
  getAvailableCodecs(action) {
    if (action === 'downgrade') {
      // For downgrade, prioritize compatibility and low CPU
      return ['h264', 'vp9', 'av1'].filter(c => this.isSupportedCodec(c));
    }

    if (action === 'upgrade') {
      // For upgrade, prioritize efficiency
      return ['av1', 'vp9', 'h264'].filter(c => this.isSupportedCodec(c));
    }

    return this.supportedCodecs;
  }

  /**
   * Check if codec is supported by hardware
   */
  isSupportedCodec(codec) {
    if (codec === 'av1' && this.hardware.hasAV1Encoder) return true;
    if (codec === 'vp9' && this.hardware.hasVP9Encoder) return true;
    if (codec === 'h264' && this.hardware.hasH264Encoder) return true;
    return false;
  }

  /**
   * Check if enough time has passed since last switch
   */
  canSwitch() {
    const timeSinceSwitch = Date.now() - this.state.lastSwitchTime;
    return timeSinceSwitch >= this.state.switchCooldown;
  }

  /**
   * Execute codec switch
   */
  switchCodec(targetCodec, reason) {
    const previousCodec = this.currentCodec;
    const switchTime = Date.now();

    // Perform actual codec switch (handled by parent)
    this.currentCodec = targetCodec;
    this.state.lastSwitchTime = switchTime;
    this.state.switchReason = reason;

    // Record switch in history
    this.state.switchHistory.push({
      from: previousCodec,
      to: targetCodec,
      reason: reason.reason,
      severity: reason.severity,
      metrics: { ...this.state },
      timestamp: new Date().toISOString()
    });

    // Keep last 100 switches
    if (this.state.switchHistory.length > 100) {
      this.state.switchHistory.shift();
    }

    console.log(`🔄 Codec switched: ${previousCodec} → ${targetCodec} (${reason.reason})`);

    this.emit('codec:switched', {
      from: previousCodec,
      to: targetCodec,
      reason: reason.reason,
      severity: reason.severity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set asymmetric codec mode (encode ≠ decode)
   */
  setAsymmetricMode(encodeCodec, decodeCodec) {
    this.asymmetricCodec.encode = encodeCodec;
    this.asymmetricCodec.decode = decodeCodec;

    console.log(`🔀 Asymmetric mode: encode=${encodeCodec}, decode=${decodeCodec}`);

    this.emit('asymmetric:set', {
      encode: encodeCodec,
      decode: decodeCodec
    });
  }

  /**
   * Get current codec status
   */
  getStatus() {
    return {
      callId: this.callId,
      currentCodec: this.currentCodec,
      asymmetricMode: this.asymmetricMode ? this.asymmetricCodec : null,
      metrics: this.state,
      lastSwitch: this.state.switchHistory[this.state.switchHistory.length - 1] || null,
      canSwitch: this.canSwitch(),
      switchCooldownRemaining: Math.max(
        0,
        this.state.switchCooldown - (Date.now() - this.state.lastSwitchTime)
      )
    };
  }

  /**
   * Get switch history
   */
  getSwitchHistory(limit = 20) {
    return this.state.switchHistory.slice(-limit);
  }

  /**
   * Get codec recommendations based on current state
   */
  getCodecRecommendations() {
    const { cpuUsage, batteryLevel, bandwidth, encodingTime } = this.state;

    const recommendations = {
      current: this.currentCodec,
      ideal: this.selectIdealCodec(),
      alternatives: this.getAlternativeCodecs(),
      reasons: []
    };

    // Add reasoning
    if (cpuUsage > this.thresholds.cpuHigh) {
      recommendations.reasons.push(`High CPU (${cpuUsage.toFixed(1)}%): Consider H.264`);
    }
    if (batteryLevel < this.thresholds.batteryLow) {
      recommendations.reasons.push(`Low battery (${batteryLevel}%): Consider H.264`);
    }
    if (encodingTime > this.thresholds.encodingTimeHigh) {
      recommendations.reasons.push(`High encoding time (${encodingTime.toFixed(0)}ms): Consider VP9`);
    }
    if (cpuUsage < this.thresholds.cpuLow && batteryLevel > 50) {
      recommendations.reasons.push(`Optimal conditions: Consider AV1 or VP9`);
    }

    return recommendations;
  }

  /**
   * Select ideal codec based on current metrics
   */
  selectIdealCodec() {
    const { cpuUsage, batteryLevel, bandwidth } = this.state;

    // Battery is critical factor
    if (batteryLevel < this.thresholds.batteryLow) {
      return 'h264'; // Most battery-efficient encoding
    }

    // CPU is critical factor
    if (cpuUsage > this.thresholds.cpuHigh) {
      return 'h264'; // Most CPU-efficient
    }

    // Good conditions: prefer efficient codec
    if (cpuUsage < this.thresholds.cpuLow && batteryLevel > 50) {
      if (bandwidth > this.thresholds.bandwidthHigh && this.hardware.hasAV1Encoder) {
        return 'av1'; // Most efficient
      }
      if (bandwidth > 2500 && this.hardware.hasVP9Encoder) {
        return 'vp9'; // Good efficiency
      }
    }

    // Default: balanced
    if (this.hardware.hasVP9Encoder) {
      return 'vp9';
    }

    return 'h264'; // Ultimate fallback
  }

  /**
   * Get alternative codec options
   */
  getAlternativeCodecs() {
    const alternatives = [];

    for (const codec of ['av1', 'vp9', 'h264']) {
      if (codec !== this.currentCodec && this.isSupportedCodec(codec)) {
        alternatives.push({
          codec,
          supported: true,
          reason: this.getCodecReason(codec)
        });
      }
    }

    return alternatives;
  }

  /**
   * Get reason to use specific codec
   */
  getCodecReason(codec) {
    switch (codec) {
      case 'av1':
        return 'Most bandwidth efficient (50% less than H.264)';
      case 'vp9':
        return 'Good balance of quality and efficiency (30% less than H.264)';
      case 'h264':
        return 'Maximum compatibility and CPU efficiency';
      default:
        return 'Unknown';
    }
  }

  /**
   * Set hardware acceleration support
   */
  setHardwareAcceleration(capabilities) {
    this.hardware = { ...this.hardware, ...capabilities };

    console.log('Hardware acceleration capabilities updated:', this.hardware);

    this.emit('hardware:updated', this.hardware);
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      callId: this.callId,
      currentCodec: this.currentCodec,
      currentMetrics: this.state,
      hardwareCapabilities: this.hardware,
      thresholds: this.thresholds,
      switchHistory: this.state.switchHistory.slice(-10),
      recommendations: this.getCodecRecommendations(),
      asymmetricMode: this.asymmetricCodec,
      nextSwitchEligible: this.canSwitch(),
      timeSinceLastSwitch: Date.now() - this.state.lastSwitchTime
    };
  }
}

module.exports = CodecSwitchingEngine;
