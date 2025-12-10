// Adaptive Network Quality Optimizer
// Real-time network quality assessment and adaptive optimization for WebRTC

class AdaptiveNetworkQualityOptimizer extends EventTarget {
  constructor() {
    super();
    this.isInitialized = false;
    this.currentNetworkProfile = null;
    this.optimizationStrategies = new Map();
    this.qualityHistory = [];
    this.adaptiveSettings = {
      video: {
        resolution: { width: 1280, height: 720 },
        framerate: 30,
        bitrate: 2000
      },
      audio: {
        bitrate: 128,
        echoCancellation: true,
        noiseSuppression: true
      }
    };
    
    // Network quality thresholds
    this.thresholds = {
      excellent: { bandwidth: 10, latency: 50, jitter: 5, packetLoss: 0.5 },
      good: { bandwidth: 5, latency: 100, jitter: 10, packetLoss: 1 },
      fair: { bandwidth: 2, latency: 200, jitter: 20, packetLoss: 2 },
      poor: { bandwidth: 1, latency: 300, jitter: 30, packetLoss: 3 }
    };
    
    this.initializeOptimization();
  }

  // Initialize optimization system
  async initializeOptimization() {
    try {
      console.log('Initializing Adaptive Network Quality Optimizer...');
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Initialize optimization strategies
      this.initializeStrategies();
      
      // Start adaptive optimization loop
      this.startAdaptiveOptimization();
      
      this.isInitialized = true;
      console.log('Adaptive Network Quality Optimizer initialized successfully');
      
      this.dispatchEvent(new CustomEvent('initialized', {
        detail: { strategies: Array.from(this.optimizationStrategies.keys()) }
      }));
      
    } catch (error) {
      console.error('Failed to initialize Network Quality Optimizer:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  // Setup network monitoring
  setupNetworkMonitoring() {
    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.handleNetworkChange(connection);
      });
      
      // Initial network assessment
      this.assessNetworkQuality(connection);
    }
    
    // Monitor WebRTC stats if available
    this.startWebRTCStatsMonitoring();
  }

  // Handle network changes
  handleNetworkChange(connection) {
    console.log('Network connection changed:', {
      type: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    });
    
    // Reassess quality and optimize
    this.assessNetworkQuality(connection);
    this.optimizeForCurrentConditions();
  }

  // Assess network quality
  async assessNetworkQuality(connection) {
    const networkMetrics = await this.collectNetworkMetrics(connection);
    
    const quality = this.calculateNetworkQuality(networkMetrics);
    
    this.currentNetworkProfile = {
      ...networkMetrics,
      quality,
      timestamp: Date.now()
    };
    
    // Add to history
    this.qualityHistory.push(this.currentNetworkProfile);
    if (this.qualityHistory.length > 100) {
      this.qualityHistory.shift();
    }
    
    // Dispatch quality assessment event
    this.dispatchEvent(new CustomEvent('qualityAssessed', {
      detail: this.currentNetworkProfile
    }));
    
    return this.currentNetworkProfile;
  }

  // Collect network metrics
  async collectNetworkMetrics(connection) {
    const metrics = {
      bandwidth: connection?.downlink || 0,
      effectiveType: connection?.effectiveType || 'unknown',
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };
    
    // Get WebRTC-specific metrics if available
    const webrtcMetrics = await this.getWebRTCMetrics();
    
    return {
      ...metrics,
      ...webrtcMetrics
    };
  }

  // Get WebRTC metrics
  async getWebRTCMetrics() {
    // This would integrate with actual WebRTC peer connection
    // For now, return estimated metrics
    return {
      jitter: 0,
      packetLoss: 0,
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      packetsReceived: 0
    };
  }

  // Calculate network quality score
  calculateNetworkQuality(metrics) {
    let score = 100;
    
    // Bandwidth scoring
    if (metrics.bandwidth >= 10) score -= 0;
    else if (metrics.bandwidth >= 5) score -= 10;
    else if (metrics.bandwidth >= 2) score -= 25;
    else if (metrics.bandwidth >= 1) score -= 40;
    else score -= 60;
    
    // Latency scoring
    if (metrics.rtt <= 50) score -= 0;
    else if (metrics.rtt <= 100) score -= 10;
    else if (metrics.rtt <= 200) score -= 20;
    else if (metrics.rtt <= 300) score -= 35;
    else score -= 50;
    
    // Jitter scoring
    if (metrics.jitter <= 5) score -= 0;
    else if (metrics.jitter <= 10) score -= 10;
    else if (metrics.jitter <= 20) score -= 20;
    else if (metrics.jitter <= 30) score -= 30;
    else score -= 40;
    
    // Packet loss scoring
    if (metrics.packetLoss <= 0.5) score -= 0;
    else if (metrics.packetLoss <= 1) score -= 15;
    else if (metrics.packetLoss <= 2) score -= 30;
    else if (metrics.packetLoss <= 3) score -= 45;
    else score -= 60;
    
    score = Math.max(0, Math.min(100, score));
    
    // Determine quality category
    let quality;
    if (score >= 90) quality = 'excellent';
    else if (score >= 75) quality = 'good';
    else if (score >= 60) quality = 'fair';
    else quality = 'poor';
    
    return {
      score,
      category: quality,
      factors: {
        bandwidth: this.getBandwidthScore(metrics.bandwidth),
        latency: this.getLatencyScore(metrics.rtt),
        jitter: this.getJitterScore(metrics.jitter),
        packetLoss: this.getPacketLossScore(metrics.packetLoss)
      }
    };
  }

  getBandwidthScore(bandwidth) {
    if (bandwidth >= 10) return 100;
    if (bandwidth >= 5) return 80;
    if (bandwidth >= 2) return 60;
    if (bandwidth >= 1) return 40;
    return 20;
  }

  getLatencyScore(latency) {
    if (latency <= 50) return 100;
    if (latency <= 100) return 80;
    if (latency <= 200) return 60;
    if (latency <= 300) return 40;
    return 20;
  }

  getJitterScore(jitter) {
    if (jitter <= 5) return 100;
    if (jitter <= 10) return 80;
    if (jitter <= 20) return 60;
    if (jitter <= 30) return 40;
    return 20;
  }

  getPacketLossScore(packetLoss) {
    if (packetLoss <= 0.5) return 100;
    if (packetLoss <= 1) return 70;
    if (packetLoss <= 2) return 40;
    if (packetLoss <= 3) return 20;
    return 10;
  }

  // Initialize optimization strategies
  initializeStrategies() {
    this.optimizationStrategies.set('videoQuality', new VideoQualityStrategy());
    this.optimizationStrategies.set('audioQuality', new AudioQualityStrategy());
    this.optimizationStrategies.set('bandwidthManagement', new BandwidthManagementStrategy());
    this.optimizationStrategies.set('latencyOptimization', new LatencyOptimizationStrategy());
    this.optimizationStrategies.set('packetLossHandling', new PacketLossHandlingStrategy());
  }

  // Start adaptive optimization loop
  startAdaptiveOptimization() {
    setInterval(() => {
      this.optimizeForCurrentConditions();
    }, 5000); // Optimize every 5 seconds
  }

  // Optimize for current network conditions
  async optimizeForCurrentConditions() {
    if (!this.currentNetworkProfile) return;
    
    const optimizations = [];
    
    // Apply each strategy
    for (const [name, strategy] of this.optimizationStrategies) {
      try {
        const optimization = await strategy.optimize(
          this.currentNetworkProfile,
          this.adaptiveSettings,
          this.qualityHistory
        );
        
        if (optimization) {
          optimizations.push({
            strategy: name,
            ...optimization
          });
          
          // Apply optimization to settings
          this.applyOptimization(optimization);
        }
      } catch (error) {
        console.error(`Error in strategy ${name}:`, error);
      }
    }
    
    // Dispatch optimization event
    if (optimizations.length > 0) {
      this.dispatchEvent(new CustomEvent('optimizationApplied', {
        detail: {
          optimizations,
          currentSettings: { ...this.adaptiveSettings },
          networkProfile: this.currentNetworkProfile
        }
      }));
    }
    
    return optimizations;
  }

  // Apply optimization to settings
  applyOptimization(optimization) {
    if (optimization.video) {
      this.adaptiveSettings.video = {
        ...this.adaptiveSettings.video,
        ...optimization.video
      };
    }
    
    if (optimization.audio) {
      this.adaptiveSettings.audio = {
        ...this.adaptiveSettings.audio,
        ...optimization.audio
      };
    }
    
    if (optimization.bandwidth) {
      this.adaptiveSettings.bandwidth = {
        ...this.adaptiveSettings.bandwidth,
        ...optimization.bandwidth
      };
    }
  }

  // Get current adaptive settings
  getAdaptiveSettings() {
    return {
      video: { ...this.adaptiveSettings.video },
      audio: { ...this.adaptiveSettings.audio },
      networkProfile: this.currentNetworkProfile,
      lastOptimized: Date.now()
    };
  }

  // Manually trigger optimization
  async triggerOptimization() {
    await this.assessNetworkQuality((navigator as any).connection);
    return await this.optimizeForCurrentConditions();
  }

  // Get optimization statistics
  getOptimizationStats() {
    return {
      isInitialized: this.isInitialized,
      currentNetworkProfile: this.currentNetworkProfile,
      adaptiveSettings: this.adaptiveSettings,
      qualityHistoryLength: this.qualityHistory.length,
      activeStrategies: Array.from(this.optimizationStrategies.keys())
    };
  }

  // Start WebRTC stats monitoring
  startWebRTCStatsMonitoring() {
    // This would integrate with actual WebRTC peer connection
    // For now, we'll simulate stats collection
  }
}

// Video Quality Optimization Strategy
class VideoQualityStrategy {
  async optimize(networkProfile, currentSettings, qualityHistory) {
    const { quality } = networkProfile;
    const currentVideo = currentSettings.video;
    
    let newSettings = { ...currentVideo };
    let reason = '';
    
    switch (quality.category) {
      case 'excellent':
        // Max quality for excellent conditions
        newSettings = {
          resolution: { width: 1920, height: 1080 },
          framerate: 30,
          bitrate: 3000
        };
        reason = 'Network conditions excellent, maximizing video quality';
        break;
        
      case 'good':
        // High quality for good conditions
        newSettings = {
          resolution: { width: 1280, height: 720 },
          framerate: 30,
          bitrate: 2000
        };
        reason = 'Network conditions good, maintaining high video quality';
        break;
        
      case 'fair':
        // Medium quality for fair conditions
        newSettings = {
          resolution: { width: 854, height: 480 },
          framerate: 25,
          bitrate: 1200
        };
        reason = 'Network conditions fair, reducing video quality to maintain stability';
        break;
        
      case 'poor':
        // Low quality for poor conditions
        newSettings = {
          resolution: { width: 640, height: 360 },
          framerate: 20,
          bitrate: 800
        };
        reason = 'Network conditions poor, minimizing video quality to maintain connection';
        break;
    }
    
    // Check if settings actually changed
    const changed = JSON.stringify(currentVideo) !== JSON.stringify(newSettings);
    
    return changed ? {
      video: newSettings,
      reason,
      priority: 'high',
      impact: this.calculateImpact(currentVideo, newSettings)
    } : null;
  }
  
  calculateImpact(oldSettings, newSettings) {
    const pixelChange = (newSettings.resolution.width * newSettings.resolution.height) - 
                       (oldSettings.resolution.width * oldSettings.resolution.height);
    const bitrateChange = newSettings.bitrate - oldSettings.bitrate;
    
    return {
      resolutionChange: pixelChange,
      bitrateChange: bitrateChange,
      qualityImprovement: pixelChange > 0 || bitrateChange > 0
    };
  }
}

// Audio Quality Optimization Strategy
class AudioQualityStrategy {
  async optimize(networkProfile, currentSettings, qualityHistory) {
    const { quality } = networkProfile;
    const currentAudio = currentSettings.audio;
    
    let newSettings = { ...currentAudio };
    let reason = '';
    
    switch (quality.category) {
      case 'excellent':
      case 'good':
        // High quality audio for good conditions
        newSettings = {
          bitrate: 128,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
        reason = 'Network conditions good, maintaining high audio quality';
        break;
        
      case 'fair':
        // Medium quality audio for fair conditions
        newSettings = {
          bitrate: 96,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        };
        reason = 'Network conditions fair, slightly reducing audio bitrate';
        break;
        
      case 'poor':
        // Low quality audio for poor conditions
        newSettings = {
          bitrate: 64,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        };
        reason = 'Network conditions poor, minimizing audio bitrate to maintain connection';
        break;
    }
    
    // Check if settings actually changed
    const changed = JSON.stringify(currentAudio) !== JSON.stringify(newSettings);
    
    return changed ? {
      audio: newSettings,
      reason,
      priority: 'medium',
      impact: {
        bitrateChange: newSettings.bitrate - currentAudio.bitrate,
        qualityImprovement: newSettings.bitrate > currentAudio.bitrate
      }
    } : null;
  }
}

// Bandwidth Management Strategy
class BandwidthManagementStrategy {
  async optimize(networkProfile, currentSettings, qualityHistory) {
    const { bandwidth, quality } = networkProfile;
    
    let optimizations = {};
    let reason = '';
    
    // Adaptive bitrate based on available bandwidth
    if (bandwidth > 0) {
      const totalBitrate = currentSettings.video.bitrate + currentSettings.audio.bitrate;
      const maxBitrate = Math.floor(bandwidth * 0.8 * 1000); // Use 80% of available bandwidth
      
      if (totalBitrate > maxBitrate) {
        // Need to reduce bitrate
        const videoBitrate = Math.floor(maxBitrate * 0.8); // 80% for video
        const audioBitrate = Math.floor(maxBitrate * 0.2); // 20% for audio
        
        optimizations = {
          video: { bitrate: videoBitrate },
          audio: { bitrate: audioBitrate },
          bandwidth: {
            allocated: maxBitrate,
            utilization: (totalBitrate / maxBitrate) * 100
          }
        };
        
        reason = `Reducing bitrate to match available bandwidth (${bandwidth} Mbps)`;
      }
    }
    
    return Object.keys(optimizations).length > 0 ? {
      ...optimizations,
      reason,
      priority: 'high',
      impact: 'bandwidth_optimization'
    } : null;
  }
}

// Latency Optimization Strategy
class LatencyOptimizationStrategy {
  async optimize(networkProfile, currentSettings, qualityHistory) {
    const { rtt, quality } = networkProfile;
    
    let optimizations = {};
    let reason = '';
    
    // Optimize for high latency
    if (rtt > 150) {
      optimizations = {
        video: {
          bufferSize: Math.min(3000, rtt * 10), // Increase buffer size
          keyFrameInterval: Math.max(2000, rtt * 5) // Reduce key frame frequency
        },
        latency: {
          targetReduction: Math.min(50, rtt - 100),
          strategy: 'buffer_optimization'
        }
      };
      
      reason = `High latency detected (${rtt}ms), optimizing buffer and key frame settings`;
    }
    
    return Object.keys(optimizations).length > 0 ? {
      ...optimizations,
      reason,
      priority: 'medium',
      impact: 'latency_optimization'
    } : null;
  }
}

// Packet Loss Handling Strategy
class PacketLossHandlingStrategy {
  async optimize(networkProfile, currentSettings, qualityHistory) {
    const { packetLoss, quality } = networkProfile;
    
    let optimizations = {};
    let reason = '';
    
    // Handle packet loss
    if (packetLoss > 1) {
      const redundancyFactor = Math.min(3, Math.ceil(packetLoss));
      
      optimizations = {
        video: {
          redundancy: redundancyFactor,
          errorConcealment: true,
          bitrate: Math.max(500, currentSettings.video.bitrate * (1 - packetLoss * 0.1))
        },
        audio: {
          redundancy: Math.min(2, redundancyFactor),
          forwardErrorCorrection: packetLoss > 2
        },
        packetLoss: {
          current: packetLoss,
          redundancyApplied: redundancyFactor,
          strategy: 'redundancy_and_bitrate_reduction'
        }
      };
      
      reason = `Packet loss detected (${packetLoss.toFixed(2)}%), applying redundancy and bitrate reduction`;
    }
    
    return Object.keys(optimizations).length > 0 ? {
      ...optimizations,
      reason,
      priority: 'high',
      impact: 'packet_loss_mitigation'
    } : null;
  }
}

export { AdaptiveNetworkQualityOptimizer };
