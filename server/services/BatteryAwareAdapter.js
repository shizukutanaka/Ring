/**
 * Battery-Aware Quality Adapter
 *
 * Dynamically adjusts video quality based on device battery level
 * Aims to extend call duration while maintaining acceptable quality
 *
 * Reference: Meta's mobile RTC optimization (2024)
 */

const { EventEmitter } = require('events');

class BatteryAwareAdapter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.callId = options.callId;
    this.platform = options.platform || 'unknown'; // 'ios', 'android', 'web'

    // Battery level tiers (research-based)
    this.tiers = {
      critical: {
        threshold: { min: 0, max: 15 },
        label: 'Critical',
        codec: 'h264',
        resolution: '360p',
        framerate: 12,
        bitrate: 400,
        estimatedDuration: '4+ hours', // Based on H.264 efficiency
        warning: true,
        actions: ['reduce_quality', 'warn_user', 'offer_call_end']
      },
      low: {
        threshold: { min: 15, max: 30 },
        label: 'Low',
        codec: 'vp9',
        resolution: '480p',
        framerate: 15,
        bitrate: 600,
        estimatedDuration: '3 hours',
        warning: true,
        actions: ['reduce_quality', 'warn_user']
      },
      medium: {
        threshold: { min: 30, max: 50 },
        label: 'Medium',
        codec: 'vp9',
        resolution: '720p',
        framerate: 24,
        bitrate: 1200,
        estimatedDuration: '2 hours',
        warning: false,
        actions: ['balance_quality']
      },
      good: {
        threshold: { min: 50, max: 80 },
        label: 'Good',
        codec: 'vp9',
        resolution: '1080p',
        framerate: 30,
        bitrate: 2000,
        estimatedDuration: '90 minutes',
        warning: false,
        actions: ['maintain_quality']
      },
      excellent: {
        threshold: { min: 80, max: 100 },
        label: 'Excellent',
        codec: 'av1',
        resolution: '1080p',
        framerate: 30,
        bitrate: 1500,
        estimatedDuration: '120+ minutes',
        warning: false,
        actions: ['optimize_efficiency']
      }
    };

    // Current state
    this.state = {
      batteryLevel: 100,
      currentTier: 'excellent',
      callStartTime: Date.now(),
      callStartBattery: 100,
      estimatedEndTime: null,
      recentQualityAdjustments: [],
      userPreferences: options.userPreferences || {}
    };

    // Configuration
    this.config = {
      enableAggressiveMode: options.aggressiveMode || false,  // Prioritize battery
      enableBalancedMode: options.balancedMode || true,       // Default
      enablePerformanceMode: options.performanceMode || false, // Prioritize quality
      autoAdjustThreshold: options.autoAdjustThreshold !== false,
      thresholdMargin: options.thresholdMargin || 5 // % margin for hysteresis
    };

    // Monitoring
    this.monitoringInterval = null;
  }

  /**
   * Start battery monitoring
   */
  startMonitoring(interval = 5000) {
    console.log(`🔋 Starting battery-aware adapter for call ${this.callId}`);

    this.monitoringInterval = setInterval(() => {
      this.evaluateBatteryLevel();
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
   * Update battery level
   */
  updateBatteryLevel(batteryLevel) {
    const previousLevel = this.state.batteryLevel;
    this.state.batteryLevel = Math.max(0, Math.min(100, batteryLevel));

    // Calculate drain rate (% per minute)
    const callDurationMinutes = (Date.now() - this.state.callStartTime) / 60000;
    const drainRate = (this.state.callStartBattery - this.state.batteryLevel) / callDurationMinutes;

    this.state.drainRate = drainRate;

    // Estimate remaining call duration
    this.estimateRemainingDuration();

    // Check if tier change needed
    this.evaluateQualityAdjustment();

    this.emit('battery:updated', {
      level: this.state.batteryLevel,
      drainRate: drainRate.toFixed(2),
      previousLevel,
      estimatedEndTime: this.state.estimatedEndTime,
      tier: this.state.currentTier
    });
  }

  /**
   * Estimate remaining call duration
   */
  estimateRemainingDuration() {
    if (!this.state.drainRate || this.state.drainRate <= 0) {
      return;
    }

    const batteryRemaining = this.state.batteryLevel;
    const minutesRemaining = Math.floor(batteryRemaining / this.state.drainRate);

    this.state.estimatedEndTime = new Date(Date.now() + minutesRemaining * 60000);
    this.state.minutesRemaining = minutesRemaining;

    // Warn if critically low
    if (batteryRemaining < 10 && minutesRemaining < 30) {
      this.emit('battery:critical', {
        level: batteryRemaining,
        estimatedMinutesRemaining: minutesRemaining,
        suggestion: 'Consider ending call soon or charging device'
      });
    }
  }

  /**
   * Evaluate if quality adjustment needed
   */
  evaluateBatteryLevel() {
    const batteryLevel = this.state.batteryLevel;

    // Determine which tier we're in
    const newTier = this.determineTier(batteryLevel);

    if (newTier !== this.state.currentTier) {
      this.transitionTier(this.state.currentTier, newTier);
    }
  }

  /**
   * Determine battery tier
   */
  determineTier(batteryLevel) {
    // Use hysteresis to avoid oscillating between tiers
    const margin = this.config.thresholdMargin;

    for (const [tierName, tierConfig] of Object.entries(this.tiers)) {
      const { min, max } = tierConfig.threshold;

      // Allow margin for hysteresis
      const minWithMargin = this.state.currentTier === tierName ? min - margin : min;
      const maxWithMargin = this.state.currentTier === tierName ? max + margin : max;

      if (batteryLevel >= minWithMargin && batteryLevel < maxWithMargin) {
        return tierName;
      }
    }

    // Default to excellent
    return 'excellent';
  }

  /**
   * Transition between battery tiers
   */
  transitionTier(fromTier, toTier) {
    const fromConfig = this.tiers[fromTier];
    const toConfig = this.tiers[toTier];

    console.log(`🔋 Battery tier transition: ${fromTier} → ${toTier}`);
    console.log(`   Resolution: ${fromConfig.resolution} → ${toConfig.resolution}`);
    console.log(`   FPS: ${fromConfig.framerate} → ${toConfig.framerate}`);
    console.log(`   Bitrate: ${fromConfig.bitrate} → ${toConfig.bitrate}kbps`);
    console.log(`   Codec: ${fromConfig.codec} → ${toConfig.codec}`);

    // Update state
    this.state.currentTier = toTier;
    this.state.recentQualityAdjustments.push({
      from: fromTier,
      to: toTier,
      timestamp: new Date().toISOString(),
      batteryLevel: this.state.batteryLevel,
      reason: this.getTransitionReason(fromTier, toTier)
    });

    // Keep last 20 adjustments
    if (this.state.recentQualityAdjustments.length > 20) {
      this.state.recentQualityAdjustments.shift();
    }

    // Execute quality adjustment
    this.applyQualitySettings(toConfig);

    // Emit event
    this.emit('tier:changed', {
      from: fromTier,
      to: toTier,
      config: toConfig,
      actions: toConfig.actions,
      batteryLevel: this.state.batteryLevel
    });

    // Handle warnings and actions
    if (toConfig.warning) {
      this.emit('tier:warning', {
        tier: toTier,
        message: `Low battery (${this.state.batteryLevel}%). Call quality reduced to extend battery life.`,
        estimatedDuration: toConfig.estimatedDuration
      });
    }
  }

  /**
   * Get transition reason
   */
  getTransitionReason(fromTier, toTier) {
    const tierOrder = ['critical', 'low', 'medium', 'good', 'excellent'];
    const fromIndex = tierOrder.indexOf(fromTier);
    const toIndex = tierOrder.indexOf(toTier);

    if (toIndex > fromIndex) {
      return 'Battery improved - quality increased';
    } else if (toIndex < fromIndex) {
      return 'Battery drained - quality reduced to extend duration';
    }
    return 'Battery stable';
  }

  /**
   * Apply quality settings for tier
   */
  applyQualitySettings(tierConfig) {
    const settings = {
      codec: tierConfig.codec,
      resolution: tierConfig.resolution,
      framerate: tierConfig.framerate,
      targetBitrate: tierConfig.bitrate,
      maxBitrate: tierConfig.bitrate * 1.2
    };

    this.emit('quality:adjusted', settings);

    return settings;
  }

  /**
   * Get current quality settings
   */
  getQualitySettings() {
    const tierConfig = this.tiers[this.state.currentTier];
    return this.applyQualitySettings(tierConfig);
  }

  /**
   * Get tier information
   */
  getTierInfo(tierName) {
    return this.tiers[tierName] || null;
  }

  /**
   * Get current status
   */
  getStatus() {
    const tierConfig = this.tiers[this.state.currentTier];

    return {
      callId: this.callId,
      batteryLevel: this.state.batteryLevel,
      currentTier: this.state.currentTier,
      tierLabel: tierConfig.label,
      drainRate: this.state.drainRate?.toFixed(2) || 'unknown',
      minutesRemaining: this.state.minutesRemaining,
      estimatedEndTime: this.state.estimatedEndTime,
      qualitySettings: this.getQualitySettings(),
      estimatedCallDuration: tierConfig.estimatedDuration,
      callStartTime: new Date(this.state.callStartTime),
      callDurationSoFar: this.getCallDuration(),
      recentAdjustments: this.state.recentQualityAdjustments.slice(-5)
    };
  }

  /**
   * Get call duration in human-readable format
   */
  getCallDuration() {
    const ms = Date.now() - this.state.callStartTime;
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get battery drain estimation
   */
  getDrainEstimate() {
    const callStartBattery = this.state.callStartBattery;
    const currentBattery = this.state.batteryLevel;
    const drainRate = this.state.drainRate;
    const callDurationMinutes = (Date.now() - this.state.callStartTime) / 60000;

    return {
      startBattery: callStartBattery,
      currentBattery,
      batteryUsed: callStartBattery - currentBattery,
      callDurationMinutes: callDurationMinutes.toFixed(1),
      drainRatePerMinute: drainRate?.toFixed(2) || 'unknown',
      estimatedTotalDuration: (callStartBattery / (drainRate || 1)).toFixed(0),
      efficiency: this.calculateEfficiency()
    };
  }

  /**
   * Calculate call efficiency (battery % per minute per megabit)
   */
  calculateEfficiency() {
    if (!this.state.drainRate) return null;

    // Estimate network usage (placeholder)
    const estimatedBitrate = this.getQualitySettings().targetBitrate;
    const dataUsedMB = (this.state.drainRate / 100) * 3000; // Rough estimate

    return {
      batteryPerMinute: this.state.drainRate.toFixed(2),
      estimatedDataPerMinute: (estimatedBitrate / 8 / 60).toFixed(1)
    };
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const { batteryLevel, drainRate, minutesRemaining } = this.state;
    const recommendations = [];

    if (batteryLevel < 15) {
      recommendations.push({
        severity: 'critical',
        message: 'Battery critical',
        action: 'Consider ending call and charging device'
      });
    } else if (batteryLevel < 30) {
      recommendations.push({
        severity: 'warning',
        message: `Battery low (${batteryLevel}%). Estimated ${minutesRemaining} minutes remaining.`,
        action: 'Be prepared to end call soon if needed'
      });
    }

    if (drainRate > 1.5) {
      recommendations.push({
        severity: 'info',
        message: 'High battery drain rate',
        action: 'Consider reducing video quality or using WiFi instead of mobile data'
      });
    }

    if (batteryLevel > 80) {
      recommendations.push({
        severity: 'info',
        message: 'Battery good',
        action: 'Call quality optimized for efficiency'
      });
    }

    return recommendations;
  }

  /**
   * Get platform-specific optimizations
   */
  getPlatformOptimizations() {
    // Different platforms have different characteristics
    const optimizations = {
      ios: {
        hardwareDecoders: ['avc', 'hevc'],  // H.264, H.265
        hardwareEncoders: ['avc'],          // H.264 only
        batteryOptimizations: ['reduce_display_brightness', 'disable_background_apps'],
        screenOnDrain: 30,  // mA
        screenOffDrain: 5   // mA
      },
      android: {
        hardwareDecoders: ['vp9', 'av1', 'h264'],
        hardwareEncoders: ['vp9', 'h264'],
        batteryOptimizations: ['reduce_screen_timeout', 'disable_gps', 'disable_bluetooth'],
        screenOnDrain: 40,  // mA
        screenOffDrain: 8   // mA
      },
      web: {
        hardwareDecoders: ['vp9', 'av1', 'h264'],
        hardwareEncoders: ['vp9', 'h264'],
        batteryOptimizations: ['close_other_tabs', 'disable_video_backgrounds'],
        screenOnDrain: 100, // mA (laptop)
        screenOffDrain: 20  // mA
      }
    };

    return optimizations[this.platform] || optimizations['web'];
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    return {
      callId: this.callId,
      platform: this.platform,
      batteryLevel: this.state.batteryLevel,
      currentTier: this.state.currentTier,
      drainEstimate: this.getDrainEstimate(),
      qualitySettings: this.getQualitySettings(),
      platformOptimizations: this.getPlatformOptimizations(),
      recentAdjustments: this.state.recentQualityAdjustments,
      recommendations: this.getRecommendations(),
      config: this.config
    };
  }
}

module.exports = BatteryAwareAdapter;
