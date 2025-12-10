// Network Adaptive Optimizer Service
// Intelligent network adaptation and bandwidth management

interface NetworkConfig {
  adaptation: {
    enabled: boolean;
    adaptationInterval: number; // ms
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    predictionWindow: number; // seconds
    mlPredictionEnabled: boolean; // Machine learning prediction
  };
  bandwidth: {
    minBitrate: number; // kbps
    maxBitrate: number; // kbps
    targetBitrate: number; // kbps
    stepUpFactor: number; // multiplier
    stepDownFactor: number; // multiplier
    adaptiveBitrateWindow: number; // seconds for averaging
  };
  quality: {
    minFrameRate: number; // fps
    maxFrameRate: number; // fps
    minResolution: { width: number; height: number };
    maxResolution: { width: number; height: number };
    qualityLevels: ('low' | 'medium' | 'high' | 'ultra')[];
    spatialScalability: boolean; // SVC support
    temporalScalability: boolean; // Temporal layers
  };
  monitoring: {
    rttThreshold: number; // ms
    packetLossThreshold: number; // percentage
    bufferHealthThreshold: number; // percentage
    congestionDetection: boolean;
    networkPredictionEnabled: boolean; // Predict network changes
  };
  codecs: {
    preferred: string[]; // Preferred codec order
    fallback: string[]; // Fallback codec options
    adaptiveCodecSwitching: boolean;
  };
}

interface NetworkMetrics {
  timestamp: number;
  availableBandwidth: number; // kbps
  currentBitrate: number; // kbps
  rtt: number; // ms
  packetLoss: number; // percentage
  bufferHealth: number; // percentage
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  congestionLevel: number; // 0-100
  predictedBandwidth: number; // ML-predicted bandwidth
  networkStability: number; // 0-100 stability score
  bandwidthVariance: number; // Bandwidth fluctuation
}

interface AdaptationDecision {
  decisionId: string;
  timestamp: number;
  type: 'bitrate' | 'resolution' | 'frameRate' | 'codec';
  action: 'increase' | 'decrease' | 'maintain';
  previousValue: number | string;
  newValue: number | string;
  reason: string;
  confidence: number; // 0-100
  expectedImpact: 'positive' | 'negative' | 'neutral';
}

interface BandwidthPrediction {
  predictionId: string;
  timestamp: number;
  timeHorizon: number; // seconds
  predictedBandwidth: number; // kbps
  confidence: number; // 0-100
  trend: 'increasing' | 'stable' | 'decreasing' | 'volatile';
  recommendations: AdaptationDecision[];
}

class NetworkAdaptiveOptimizer extends EventTarget {
  private config: NetworkConfig;
  private currentMetrics: NetworkMetrics;
  private historicalMetrics: NetworkMetrics[] = [];
  private adaptationHistory: AdaptationDecision[] = [];
  private currentBitrate: number;
  private currentResolution: { width: number; height: number };
  private currentFrameRate: number;
  private currentQuality: string;
  private adaptationInterval: NodeJS.Timeout | null = null;
  private networkMonitor: NetworkMonitor | null = null;
  private isAdapting: boolean = false;
  private lastAdaptationTime: number = 0;

  constructor(config?: Partial<NetworkConfig>) {
    super();
    this.config = this.initializeConfig(config);
    this.currentMetrics = this.initializeMetrics();
    this.currentBitrate = this.config.bandwidth.targetBitrate;
    this.currentResolution = { width: 1280, height: 720 };
    this.currentFrameRate = 30;
    this.currentQuality = 'medium';
    
    this.initializeNetworkMonitoring();
    this.startAdaptation();
  }

  // Initialize configuration
  private initializeConfig(userConfig?: Partial<NetworkConfig>): NetworkConfig {
    const defaultConfig: NetworkConfig = {
      adaptation: {
        enabled: true,
        adaptationInterval: 2000,
        aggressiveness: 'moderate',
        predictionWindow: 10
      },
      bandwidth: {
        minBitrate: 100,
        maxBitrate: 5000,
        targetBitrate: 1500,
        stepUpFactor: 1.25,
        stepDownFactor: 0.75
      },
      quality: {
        minFrameRate: 15,
        maxFrameRate: 60,
        minResolution: { width: 320, height: 240 },
        maxResolution: { width: 1920, height: 1080 },
        qualityLevels: ['low', 'medium', 'high', 'ultra']
      },
      monitoring: {
        rttThreshold: 300,
        packetLossThreshold: 5,
        bufferHealthThreshold: 20,
        congestionDetection: true
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  // Initialize metrics
  private initializeMetrics(): NetworkMetrics {
    return {
      timestamp: Date.now(),
      availableBandwidth: 2000,
      currentBitrate: 1500,
      rtt: 100,
      packetLoss: 1,
      bufferHealth: 80,
      connectionType: 'unknown',
      networkQuality: 'good',
      congestionLevel: 20
    };
  }

  // Initialize network monitoring
  private initializeNetworkMonitoring(): void {
    this.networkMonitor = new NetworkMonitor();
    this.networkMonitor.addEventListener('metricsUpdate', (event: any) => {
      this.updateNetworkMetrics(event.detail);
    });
    
    this.networkMonitor.start();
  }

  // Start adaptive optimization
  private startAdaptation(): void {
    if (!this.config.adaptation.enabled) return;
    
    this.isAdapting = true;
    this.adaptationInterval = setInterval(() => {
      this.performAdaptiveOptimization();
    }, this.config.adaptation.adaptationInterval);
    
    console.log('Network adaptive optimization started');
  }

  // Stop adaptive optimization
  public stopAdaptation(): void {
    if (!this.isAdapting) return;
    
    this.isAdapting = false;
    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
      this.adaptationInterval = null;
    }
    
    if (this.networkMonitor) {
      this.networkMonitor.stop();
    }
    
    console.log('Network adaptive optimization stopped');
  }

  // Update network metrics
  private updateNetworkMetrics(metrics: Partial<NetworkMetrics>): void {
    this.currentMetrics = { ...this.currentMetrics, ...metrics, timestamp: Date.now() };
    
    // Calculate network quality
    this.calculateNetworkQuality();
    
    // Update historical data
    this.historicalMetrics.push({ ...this.currentMetrics });
    
    // Keep only last 50 metrics
    if (this.historicalMetrics.length > 50) {
      this.historicalMetrics = this.historicalMetrics.slice(-50);
    }
    
    // Dispatch metrics update
    this.dispatchEvent(new CustomEvent('networkMetricsUpdated', {
      detail: { metrics: this.currentMetrics }
    }));
  }

  // Calculate network quality
  private calculateNetworkQuality(): void {
    const { rtt, packetLoss, availableBandwidth } = this.currentMetrics;
    
    let score = 100;
    
    // RTT scoring (0-40 points)
    if (rtt < 50) score -= 0;
    else if (rtt < 100) score -= 10;
    else if (rtt < 200) score -= 20;
    else if (rtt < 300) score -= 30;
    else score -= 40;
    
    // Packet loss scoring (0-30 points)
    if (packetLoss < 1) score -= 0;
    else if (packetLoss < 3) score -= 10;
    else if (packetLoss < 5) score -= 20;
    else score -= 30;
    
    // Bandwidth scoring (0-30 points)
    if (availableBandwidth > 3000) score -= 0;
    else if (availableBandwidth > 1500) score -= 10;
    else if (availableBandwidth > 500) score -= 20;
    else score -= 30;
    
    // Determine quality level
    if (score >= 85) {
      this.currentMetrics.networkQuality = 'excellent';
    } else if (score >= 70) {
      this.currentMetrics.networkQuality = 'good';
    } else if (score >= 50) {
      this.currentMetrics.networkQuality = 'fair';
    } else {
      this.currentMetrics.networkQuality = 'poor';
    }
    
    // Calculate congestion level
    this.currentMetrics.congestionLevel = this.calculateCongestionLevel();
  }

  // Calculate congestion level
  private calculateCongestionLevel(): number {
    const { rtt, packetLoss, bufferHealth } = this.currentMetrics;
    
    let congestion = 0;
    
    // RTT contribution
    if (rtt > this.config.monitoring.rttThreshold) {
      congestion += Math.min(40, (rtt - this.config.monitoring.rttThreshold) / 10);
    }
    
    // Packet loss contribution
    if (packetLoss > this.config.monitoring.packetLossThreshold) {
      congestion += Math.min(40, (packetLoss - this.config.monitoring.packetLossThreshold) * 10);
    }
    
    // Buffer health contribution
    if (bufferHealth < this.config.monitoring.bufferHealthThreshold) {
      congestion += Math.min(20, (this.config.monitoring.bufferHealthThreshold - bufferHealth) / 2);
    }
    
    return Math.min(100, congestion);
  }

  // Perform adaptive optimization
  private performAdaptiveOptimization(): void {
    if (!this.isAdapting) return;
    
    const now = Date.now();
    
    // Rate limit adaptations (minimum 1 second between adaptations)
    if (now - this.lastAdaptationTime < 1000) return;
    
    try {
      // Analyze current network conditions
      const analysis = this.analyzeNetworkConditions();
      
      // Make adaptation decisions
      const decisions = this.makeAdaptationDecisions(analysis);
      
      // Apply adaptations
      for (const decision of decisions) {
        this.applyAdaptationDecision(decision);
      }
      
      // Predict future bandwidth
      if (this.config.adaptation.predictionWindow > 0) {
        const prediction = this.predictBandwidth();
        if (prediction) {
          this.dispatchEvent(new CustomEvent('bandwidthPredicted', {
            detail: { prediction }
          }));
        }
      }
      
    } catch (error) {
      console.error('Adaptive optimization failed:', error);
    }
  }

  // Analyze network conditions
  private analyzeNetworkConditions(): {
    trend: 'improving' | 'stable' | 'degrading';
    congestion: boolean;
    bandwidthUtilization: number;
    recommendation: string;
  } {
    if (this.historicalMetrics.length < 5) {
      return {
        trend: 'stable',
        congestion: false,
        bandwidthUtilization: this.currentMetrics.currentBitrate / this.currentMetrics.availableBandwidth,
        recommendation: 'collecting_data'
      };
    }
    
    const recentMetrics = this.historicalMetrics.slice(-5);
    const bandwidths = recentMetrics.map(m => m.availableBandwidth);
    
    // Calculate trend
    const firstBandwidth = bandwidths[0];
    const lastBandwidth = bandwidths[bandwidths.length - 1];
    const change = (lastBandwidth - firstBandwidth) / firstBandwidth;
    
    let trend: 'improving' | 'stable' | 'degrading';
    if (change > 0.1) {
      trend = 'improving';
    } else if (change < -0.1) {
      trend = 'degrading';
    } else {
      trend = 'stable';
    }
    
    // Check congestion
    const congestion = this.currentMetrics.congestionLevel > 50;
    
    // Calculate bandwidth utilization
    const bandwidthUtilization = this.currentMetrics.currentBitrate / this.currentMetrics.availableBandwidth;
    
    // Generate recommendation
    let recommendation: string;
    if (congestion) {
      recommendation = 'reduce_quality';
    } else if (trend === 'improving' && bandwidthUtilization < 0.8) {
      recommendation = 'increase_quality';
    } else if (trend === 'degrading' || bandwidthUtilization > 0.9) {
      recommendation = 'reduce_quality';
    } else {
      recommendation = 'maintain';
    }
    
    return {
      trend,
      congestion,
      bandwidthUtilization,
      recommendation
    };
  }

  // Make adaptation decisions
  private makeAdaptationDecisions(analysis: any): AdaptationDecision[] {
    const decisions: AdaptationDecision[] = [];
    
    switch (analysis.recommendation) {
      case 'increase_quality':
        decisions.push(...this.createIncreaseDecisions());
        break;
      case 'reduce_quality':
        decisions.push(...this.createReduceDecisions());
        break;
      case 'maintain':
        // No changes needed
        break;
    }
    
    return decisions;
  }

  // Create increase quality decisions
  private createIncreaseDecisions(): AdaptationDecision[] {
    const decisions: AdaptationDecision[] = [];
    
    // Check if we can increase bitrate
    if (this.currentBitrate < this.config.bandwidth.maxBitrate) {
      const newBitrate = Math.min(
        this.config.bandwidth.maxBitrate,
        this.currentBitrate * this.config.bandwidth.stepUpFactor
      );
      
      decisions.push({
        decisionId: this.generateDecisionId(),
        timestamp: Date.now(),
        type: 'bitrate',
        action: 'increase',
        previousValue: this.currentBitrate,
        newValue: newBitrate,
        reason: 'Network conditions improving, increasing bitrate',
        confidence: 80,
        expectedImpact: 'positive'
      });
    }
    
    // Check if we can increase resolution
    const currentPixels = this.currentResolution.width * this.currentResolution.height;
    const maxPixels = this.config.quality.maxResolution.width * this.config.quality.maxResolution.height;
    
    if (currentPixels < maxPixels) {
      const newResolution = this.getNextHigherResolution();
      if (newResolution) {
        decisions.push({
          decisionId: this.generateDecisionId(),
          timestamp: Date.now(),
          type: 'resolution',
          action: 'increase',
          previousValue: `${this.currentResolution.width}x${this.currentResolution.height}`,
          newValue: `${newResolution.width}x${newResolution.height}`,
          reason: 'Sufficient bandwidth for higher resolution',
          confidence: 70,
          expectedImpact: 'positive'
        });
      }
    }
    
    // Check if we can increase frame rate
    if (this.currentFrameRate < this.config.quality.maxFrameRate) {
      const newFrameRate = Math.min(
        this.config.quality.maxFrameRate,
        this.currentFrameRate + 10
      );
      
      decisions.push({
        decisionId: this.generateDecisionId(),
        timestamp: Date.now(),
        type: 'frameRate',
        action: 'increase',
        previousValue: this.currentFrameRate,
        newValue: newFrameRate,
        reason: 'Network conditions support higher frame rate',
        confidence: 60,
        expectedImpact: 'positive'
      });
    }
    
    return decisions;
  }

  // Create reduce quality decisions
  private createReduceDecisions(): AdaptationDecision[] {
    const decisions: AdaptationDecision[] = [];
    
    // Prioritize bitrate reduction first
    if (this.currentBitrate > this.config.bandwidth.minBitrate) {
      const newBitrate = Math.max(
        this.config.bandwidth.minBitrate,
        this.currentBitrate * this.config.bandwidth.stepDownFactor
      );
      
      decisions.push({
        decisionId: this.generateDecisionId(),
        timestamp: Date.now(),
        type: 'bitrate',
        action: 'decrease',
        previousValue: this.currentBitrate,
        newValue: newBitrate,
        reason: 'Network congestion detected, reducing bitrate',
        confidence: 90,
        expectedImpact: 'positive'
      });
    }
    
    // If still congested, reduce resolution
    if (this.currentMetrics.congestionLevel > 70) {
      const currentPixels = this.currentResolution.width * this.currentResolution.height;
      const minPixels = this.config.quality.minResolution.width * this.config.quality.minResolution.height;
      
      if (currentPixels > minPixels) {
        const newResolution = this.getNextLowerResolution();
        if (newResolution) {
          decisions.push({
            decisionId: this.generateDecisionId(),
            timestamp: Date.now(),
            type: 'resolution',
            action: 'decrease',
            previousValue: `${this.currentResolution.width}x${this.currentResolution.height}`,
            newValue: `${newResolution.width}x${newResolution.height}`,
            reason: 'Severe congestion, reducing resolution',
            confidence: 85,
            expectedImpact: 'positive'
          });
        }
      }
    }
    
    // If still congested, reduce frame rate
    if (this.currentMetrics.congestionLevel > 80 && this.currentFrameRate > this.config.quality.minFrameRate) {
      const newFrameRate = Math.max(
        this.config.quality.minFrameRate,
        this.currentFrameRate - 10
      );
      
      decisions.push({
        decisionId: this.generateDecisionId(),
        timestamp: Date.now(),
        type: 'frameRate',
        action: 'decrease',
        previousValue: this.currentFrameRate,
        newValue: newFrameRate,
        reason: 'Extreme congestion, reducing frame rate',
        confidence: 80,
        expectedImpact: 'positive'
      });
    }
    
    return decisions;
  }

  // Get next higher resolution
  private getNextHigherResolution(): { width: number; height: number } | null {
    const resolutions = [
      { width: 320, height: 240 },
      { width: 640, height: 480 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];
    
    const currentIndex = resolutions.findIndex(
      r => r.width === this.currentResolution.width && r.height === this.currentResolution.height
    );
    
    if (currentIndex >= 0 && currentIndex < resolutions.length - 1) {
      return resolutions[currentIndex + 1];
    }
    
    return null;
  }

  // Get next lower resolution
  private getNextLowerResolution(): { width: number; height: number } | null {
    const resolutions = [
      { width: 320, height: 240 },
      { width: 640, height: 480 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];
    
    const currentIndex = resolutions.findIndex(
      r => r.width === this.currentResolution.width && r.height === this.currentResolution.height
    );
    
    if (currentIndex > 0) {
      return resolutions[currentIndex - 1];
    }
    
    return null;
  }

  // Apply adaptation decision
  private applyAdaptationDecision(decision: AdaptationDecision): void {
    this.lastAdaptationTime = Date.now();
    
    switch (decision.type) {
      case 'bitrate':
        this.currentBitrate = decision.newValue as number;
        this.currentMetrics.currentBitrate = this.currentBitrate;
        break;
        
      case 'resolution':
        const [width, height] = (decision.newValue as string).split('x').map(Number);
        this.currentResolution = { width, height };
        break;
        
      case 'frameRate':
        this.currentFrameRate = decision.newValue as number;
        break;
    }
    
    // Update quality level
    this.updateQualityLevel();
    
    // Add to history
    this.adaptationHistory.push(decision);
    
    // Keep only last 50 adaptations
    if (this.adaptationHistory.length > 50) {
      this.adaptationHistory = this.adaptationHistory.slice(-50);
    }
    
    // Dispatch adaptation event
    this.dispatchEvent(new CustomEvent('adaptationApplied', {
      detail: { decision, currentState: this.getCurrentState() }
    }));
    
    console.log(`Applied adaptation: ${decision.type} ${decision.action} to ${decision.newValue}`);
  }

  // Update quality level
  private updateQualityLevel(): void {
    const { width, height } = this.currentResolution;
    const pixels = width * height;
    
    if (pixels >= 1920 * 1080 && this.currentFrameRate >= 30) {
      this.currentQuality = 'ultra';
    } else if (pixels >= 1280 * 720 && this.currentFrameRate >= 25) {
      this.currentQuality = 'high';
    } else if (pixels >= 640 * 480 && this.currentFrameRate >= 20) {
      this.currentQuality = 'medium';
    } else {
      this.currentQuality = 'low';
    }
  }

  // Predict bandwidth
  private predictBandwidth(): BandwidthPrediction | null {
    if (this.historicalMetrics.length < 10) return null;
    
    const recentMetrics = this.historicalMetrics.slice(-10);
    const bandwidths = recentMetrics.map(m => m.availableBandwidth);
    
    // Simple linear regression for prediction
    const n = bandwidths.length;
    const sumX = bandwidths.reduce((sum, _, i) => sum + i, 0);
    const sumY = bandwidths.reduce((sum, bw) => sum + bw, 0);
    const sumXY = bandwidths.reduce((sum, bw, i) => sum + bw * i, 0);
    const sumX2 = bandwidths.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict future bandwidth
    const futureIndex = n + Math.floor(this.config.adaptation.predictionWindow / 2); // Assuming 2s intervals
    const predictedBandwidth = Math.max(0, slope * futureIndex + intercept);
    
    // Calculate confidence based on variance
    const variance = bandwidths.reduce((sum, bw) => {
      const mean = sumY / n;
      return sum + Math.pow(bw - mean, 2);
    }, 0) / n;
    
    const confidence = Math.max(0, Math.min(100, 100 - variance / 100));
    
    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing' | 'volatile';
    if (Math.abs(slope) < 10) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    if (variance > 10000) {
      trend = 'volatile';
    }
    
    // Generate recommendations based on prediction
    const recommendations: AdaptationDecision[] = [];
    if (trend === 'increasing' && confidence > 70) {
      recommendations.push(...this.createIncreaseDecisions());
    } else if (trend === 'decreasing' && confidence > 70) {
      recommendations.push(...this.createReduceDecisions());
    }
    
    return {
      predictionId: this.generatePredictionId(),
      timestamp: Date.now(),
      timeHorizon: this.config.adaptation.predictionWindow,
      predictedBandwidth,
      confidence,
      trend,
      recommendations
    };
  }

  // Generate IDs
  private generateDecisionId(): string {
    return `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePredictionId(): string {
    return `prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  
  // Get current metrics
  public getCurrentMetrics(): NetworkMetrics {
    return { ...this.currentMetrics };
  }
  
  // Get historical metrics
  public getHistoricalMetrics(count?: number): NetworkMetrics[] {
    if (count) {
      return this.historicalMetrics.slice(-count);
    }
    return [...this.historicalMetrics];
  }
  
  // Get current state
  public getCurrentState(): {
    bitrate: number;
    resolution: { width: number; height: number };
    frameRate: number;
    quality: string;
  } {
    return {
      bitrate: this.currentBitrate,
      resolution: { ...this.currentResolution },
      frameRate: this.currentFrameRate,
      quality: this.currentQuality
    };
  }
  
  // Get adaptation history
  public getAdaptationHistory(count?: number): AdaptationDecision[] {
    if (count) {
      return this.adaptationHistory.slice(-count);
    }
    return [...this.adaptationHistory];
  }
  
  // Force adaptation check
  public forceAdaptationCheck(): void {
    this.performAdaptiveOptimization();
  }
  
  // Set target bitrate
  public setTargetBitrate(bitrate: number): void {
    const clampedBitrate = Math.max(
      this.config.bandwidth.minBitrate,
      Math.min(this.config.bandwidth.maxBitrate, bitrate)
    );
    
    const decision: AdaptationDecision = {
      decisionId: this.generateDecisionId(),
      timestamp: Date.now(),
      type: 'bitrate',
      action: 'maintain',
      previousValue: this.currentBitrate,
      newValue: clampedBitrate,
      reason: 'Manual bitrate adjustment',
      confidence: 100,
      expectedImpact: 'neutral'
    };
    
    this.applyAdaptationDecision(decision);
  }
  
  // Set target resolution
  public setTargetResolution(width: number, height: number): void {
    const decision: AdaptationDecision = {
      decisionId: this.generateDecisionId(),
      timestamp: Date.now(),
      type: 'resolution',
      action: 'maintain',
      previousValue: `${this.currentResolution.width}x${this.currentResolution.height}`,
      newValue: `${width}x${height}`,
      reason: 'Manual resolution adjustment',
      confidence: 100,
      expectedImpact: 'neutral'
    };
    
    this.applyAdaptationDecision(decision);
  }
  
  // Set target frame rate
  public setTargetFrameRate(frameRate: number): void {
    const clampedFrameRate = Math.max(
      this.config.quality.minFrameRate,
      Math.min(this.config.quality.maxFrameRate, frameRate)
    );
    
    const decision: AdaptationDecision = {
      decisionId: this.generateDecisionId(),
      timestamp: Date.now(),
      type: 'frameRate',
      action: 'maintain',
      previousValue: this.currentFrameRate,
      newValue: clampedFrameRate,
      reason: 'Manual frame rate adjustment',
      confidence: 100,
      expectedImpact: 'neutral'
    };
    
    this.applyAdaptationDecision(decision);
  }
  
  // Get configuration
  public getConfig(): NetworkConfig {
    return { ...this.config };
  }
  
  // Update configuration
  public updateConfig(newConfig: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.dispatchEvent(new CustomEvent('configUpdated', {
      detail: { config: this.config }
    }));
  }
  
  // Reset to defaults
  public resetToDefaults(): void {
    this.currentBitrate = this.config.bandwidth.targetBitrate;
    this.currentResolution = { width: 1280, height: 720 };
    this.currentFrameRate = 30;
    this.currentQuality = 'medium';
    
    this.dispatchEvent(new CustomEvent('resetToDefaults', {
      detail: { timestamp: Date.now() }
    }));
  }
  
  // Get statistics
  public getStatistics(): {
    totalAdaptations: number;
    averageBitrate: number;
    averageQuality: string;
    networkStability: number;
    adaptationFrequency: number;
  } {
    if (this.adaptationHistory.length === 0) {
      return {
        totalAdaptations: 0,
        averageBitrate: this.currentBitrate,
        averageQuality: this.currentQuality,
        networkStability: 100,
        adaptationFrequency: 0
      };
    }
    
    const totalAdaptations = this.adaptationHistory.length;
    const bitrateHistory = this.historicalMetrics.map(m => m.currentBitrate);
    const averageBitrate = bitrateHistory.reduce((a, b) => a + b, 0) / bitrateHistory.length;
    
    const qualityCounts = this.historicalMetrics.reduce((counts, m) => {
      const quality = this.getQualityForBitrate(m.currentBitrate);
      counts[quality] = (counts[quality] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const averageQuality = Object.entries(qualityCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';
    
    // Calculate network stability (based on bandwidth variance)
    const bandwidths = this.historicalMetrics.map(m => m.availableBandwidth);
    const mean = bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length;
    const variance = bandwidths.reduce((sum, bw) => sum + Math.pow(bw - mean, 2), 0) / bandwidths.length;
    const networkStability = Math.max(0, 100 - variance / 100);
    
    // Calculate adaptation frequency (adaptations per minute)
    const timeSpan = (this.historicalMetrics[this.historicalMetrics.length - 1].timestamp - 
                     this.historicalMetrics[0].timestamp) / 1000 / 60; // minutes
    const adaptationFrequency = timeSpan > 0 ? totalAdaptations / timeSpan : 0;
    
    return {
      totalAdaptations,
      averageBitrate,
      averageQuality,
      networkStability,
      adaptationFrequency
    };
  }
  
  // Get quality for bitrate
  private getQualityForBitrate(bitrate: number): string {
    if (bitrate >= 3000) return 'ultra';
    if (bitrate >= 1500) return 'high';
    if (bitrate >= 800) return 'medium';
    return 'low';
  }
  
  // Cleanup
  public destroy(): void {
    this.stopAdaptation();
    
    if (this.networkMonitor) {
      this.networkMonitor.destroy();
      this.networkMonitor = null;
    }
    
    this.dispatchEvent(new CustomEvent('destroyed', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Network Monitor helper class
class NetworkMonitor extends EventTarget {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    super();
  }

  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectNetworkMetrics();
    }, 1000);
  }

  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private collectNetworkMetrics(): void {
    // Simulate network metrics collection
    const metrics = {
      availableBandwidth: 1000 + Math.random() * 3000,
      rtt: 50 + Math.random() * 200,
      packetLoss: Math.random() * 5,
      bufferHealth: 60 + Math.random() * 40,
      connectionType: this.detectConnectionType()
    };

    this.dispatchEvent(new CustomEvent('metricsUpdate', {
      detail: metrics
    }));
  }

  private detectConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    // Simple detection logic
    const types: ('wifi' | 'cellular' | 'ethernet' | 'unknown')[] = ['wifi', 'cellular', 'ethernet', 'unknown'];
    return types[Math.floor(Math.random() * types.length)];
  }

  public destroy(): void {
    this.stop();
  }
}

export { 
  NetworkAdaptiveOptimizer, 
  NetworkConfig, 
  NetworkMetrics, 
  AdaptationDecision, 
  BandwidthPrediction 
};
