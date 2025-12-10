// Call Quality Analyzer Service
// Real-time audio/video quality analysis and optimization

interface CallQualityConfig {
  analysis: {
    enabled: boolean;
    analysisInterval: number; // ms
    qualityThresholds: {
      excellent: number; // 90+
      good: number; // 75-89
      fair: number; // 60-74
      poor: number; // <60
    };
    metrics: {
      packetLoss: boolean;
      jitter: boolean;
      latency: boolean;
      bandwidth: boolean;
      resolution: boolean;
      frameRate: boolean;
      audioLevel: boolean;
      echo: boolean;
      roundTripTime: boolean; // RTT measurement
      cpuUsage: boolean; // CPU utilization
      memoryUsage: boolean; // Memory consumption
    };
  };
  optimization: {
    autoAdjustBitrate: boolean;
    autoAdjustResolution: boolean;
    autoAdjustFrameRate: boolean;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    gainControl: boolean;
    adaptiveCodecSelection: boolean; // Dynamic codec switching
    bandwidthPrediction: boolean; // ML-based bandwidth forecasting
  };
  alerts: {
    enabled: boolean;
    qualityDropThreshold: number;
    packetLossThreshold: number;
    latencyThreshold: number;
    notificationMethods: ('console' | 'event' | 'callback')[];
  };
}

interface QualityMetrics {
  timestamp: number;
  audio: {
    level: number; // 0-100
    noiseLevel: number; // 0-100
    echoLevel: number; // 0-100
    packetLoss: number; // 0-100
    jitter: number; // ms
    latency: number; // ms
    roundTripTime: number; // RTT in ms
    signalToNoiseRatio: number; // SNR in dB
  };
  video: {
    resolution: {
      width: number;
      height: number;
    };
    frameRate: number; // fps
    bitrate: number; // kbps
    packetLoss: number; // 0-100
    jitter: number; // ms
    latency: number; // ms
    keyFrameInterval: number; // seconds
    qualityScore: number; // 0-100
  };
  network: {
    bandwidth: {
      available: number; // kbps
      used: number; // kbps
      efficiency: number; // 0-100
    };
    roundTripTime: number; // ms
    packetLoss: number; // 0-100
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  system: {
    cpuUsage: number; // 0-100
    memoryUsage: number; // 0-100
    batteryLevel: number; // 0-100
    thermalState: 'normal' | 'warm' | 'hot' | 'critical';
  };
}

interface QualityAlert {
  alertId: string;
  type: 'quality_drop' | 'packet_loss' | 'high_latency' | 'bandwidth_issue' | 'audio_issue' | 'video_issue' | 'thermal_throttling' | 'battery_low';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: QualityMetrics;
  timestamp: number;
  resolved: boolean;
}

interface QualityRecommendation {
  recommendationId: string;
  type: 'bitrate' | 'resolution' | 'frameRate' | 'audio' | 'network' | 'codec' | 'thermal' | 'battery';
  priority: 'low' | 'medium' | 'high';
  action: string;
  expectedImprovement: number; // percentage
  timestamp: number;
  applied: boolean;
}

class CallQualityAnalyzer extends EventTarget {
  private config: CallQualityConfig;
  private currentMetrics: QualityMetrics;
  private historicalMetrics: QualityMetrics[] = [];
  private alerts: Map<string, QualityAlert> = new Map();
  private recommendations: QualityRecommendation[] = [];
  private analysisInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isAnalyzing: boolean = false;

  constructor(config?: Partial<CallQualityConfig>) {
    super();
    this.config = this.initializeConfig(config);
    this.currentMetrics = this.initializeMetrics();
    
    this.initializeAudioAnalysis();
    this.startAnalysis();
  }

  // Initialize configuration
  private initializeConfig(userConfig?: Partial<CallQualityConfig>): CallQualityConfig {
    const defaultConfig: CallQualityConfig = {
      analysis: {
        enabled: true,
        analysisInterval: 1000,
        qualityThresholds: {
          excellent: 90,
          good: 75,
          fair: 60,
          poor: 60
        },
        metrics: {
          packetLoss: true,
          jitter: true,
          latency: true,
          bandwidth: true,
          resolution: true,
          frameRate: true,
          audioLevel: true,
          echo: true
        }
      },
      optimization: {
        autoAdjustBitrate: true,
        autoAdjustResolution: true,
        autoAdjustFrameRate: true,
        echoCancellation: true,
        noiseSuppression: true,
        gainControl: true
      },
      alerts: {
        enabled: true,
        qualityDropThreshold: 20,
        packetLossThreshold: 5,
        latencyThreshold: 200,
        notificationMethods: ['event', 'console']
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  // Initialize metrics
  private initializeMetrics(): QualityMetrics {
    return {
      timestamp: Date.now(),
      audio: {
        level: 0,
        noiseLevel: 0,
        echoLevel: 0,
        packetLoss: 0,
        jitter: 0,
        latency: 0,
        bandwidth: 0
      },
      video: {
        resolution: { width: 0, height: 0 },
        frameRate: 0,
        bitrate: 0,
        packetLoss: 0,
        jitter: 0,
        latency: 0,
        keyFrameInterval: 2
      },
      overall: {
        score: 100,
        quality: 'excellent',
        stability: 100,
        experience: 100
      }
    };
  }

  // Initialize audio analysis
  private initializeAudioAnalysis(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
    } catch (error) {
      console.warn('Audio analysis not supported:', error);
    }
  }

  // Start quality analysis
  public startAnalysis(): void {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.analysisInterval = setInterval(() => {
      this.performQualityAnalysis();
    }, this.config.analysis.analysisInterval);
    
    console.log('Call quality analysis started');
  }

  // Stop quality analysis
  public stopAnalysis(): void {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    console.log('Call quality analysis stopped');
  }

  // Set media stream for analysis
  public setMediaStream(stream: MediaStream): void {
    this.mediaStream = stream;
    
    if (this.audioContext && this.analyser) {
      // Connect audio tracks to analyser
      stream.getAudioTracks().forEach(track => {
        const source = this.audioContext!.createMediaStreamSource(stream);
        source.connect(this.analyser!);
      });
    }
    
    // Get video track info
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      this.currentMetrics.video.resolution = {
        width: settings.width || 0,
        height: settings.height || 0
      };
      this.currentMetrics.video.frameRate = settings.frameRate || 30;
    }
  }

  // Perform quality analysis
  private performQualityAnalysis(): void {
    if (!this.config.analysis.enabled) return;
    
    const startTime = performance.now();
    
    try {
      // Analyze audio quality
      this.analyzeAudioQuality();
      
      // Analyze video quality
      this.analyzeVideoQuality();
      
      // Calculate overall quality score
      this.calculateOverallQuality();
      
      // Check for quality alerts
      this.checkQualityAlerts();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Update historical data
      this.updateHistoricalMetrics();
      
      // Dispatch metrics update
      this.dispatchEvent(new CustomEvent('qualityMetricsUpdated', {
        detail: { metrics: this.currentMetrics, timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('Quality analysis failed:', error);
    }
    
    const duration = performance.now() - startTime;
    console.debug(`Quality analysis completed in ${duration.toFixed(2)}ms`);
  }

  // Analyze audio quality
  private analyzeAudioQuality(): void {
    if (!this.analyser || !this.mediaStream) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);
    
    // Get frequency data
    this.analyser.getByteFrequencyData(dataArray);
    this.analyser.getByteTimeDomainData(timeDataArray);
    
    // Calculate audio level (RMS)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeDataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);
    this.currentMetrics.audio.level = Math.min(100, rms * 100);
    
    // Calculate noise level (high frequency energy)
    const highFreqStart = Math.floor(bufferLength * 0.7);
    let noiseEnergy = 0;
    for (let i = highFreqStart; i < bufferLength; i++) {
      noiseEnergy += dataArray[i] * dataArray[i];
    }
    this.currentMetrics.audio.noiseLevel = Math.min(100, noiseEnergy / (bufferLength * 255 * 255) * 100);
    
    // Simulate other audio metrics
    this.currentMetrics.audio.packetLoss = this.simulatePacketLoss();
    this.currentMetrics.audio.jitter = this.simulateJitter();
    this.currentMetrics.audio.latency = this.simulateLatency();
    this.currentMetrics.audio.bandwidth = this.simulateBandwidth();
    this.currentMetrics.audio.echoLevel = this.simulateEchoLevel();
  }

  // Analyze video quality
  private analyzeVideoQuality(): void {
    if (!this.mediaStream) return;
    
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const settings = videoTrack.getSettings();
    
    // Update video metrics
    this.currentMetrics.video.resolution = {
      width: settings.width || 0,
      height: settings.height || 0
    };
    this.currentMetrics.video.frameRate = settings.frameRate || 30;
    
    // Simulate video quality metrics
    this.currentMetrics.video.bitrate = this.simulateVideoBitrate();
    this.currentMetrics.video.packetLoss = this.simulatePacketLoss();
    this.currentMetrics.video.jitter = this.simulateJitter();
    this.currentMetrics.video.latency = this.simulateLatency();
    this.currentMetrics.video.keyFrameInterval = 2;
  }

  // Calculate overall quality score
  private calculateOverallQuality(): void {
    const audioScore = this.calculateAudioScore();
    const videoScore = this.calculateVideoScore();
    
    // Weighted average (audio 40%, video 60%)
    const overallScore = (audioScore * 0.4) + (videoScore * 0.6);
    
    this.currentMetrics.overall.score = overallScore;
    
    // Determine quality level
    if (overallScore >= this.config.analysis.qualityThresholds.excellent) {
      this.currentMetrics.overall.quality = 'excellent';
    } else if (overallScore >= this.config.analysis.qualityThresholds.good) {
      this.currentMetrics.overall.quality = 'good';
    } else if (overallScore >= this.config.analysis.qualityThresholds.fair) {
      this.currentMetrics.overall.quality = 'fair';
    } else {
      this.currentMetrics.overall.quality = 'poor';
    }
    
    // Calculate stability (based on metric variance)
    this.currentMetrics.overall.stability = this.calculateStability();
    
    // Calculate user experience (based on quality and stability)
    this.currentMetrics.overall.experience = (overallScore + this.currentMetrics.overall.stability) / 2;
  }

  // Calculate audio quality score
  private calculateAudioScore(): number {
    const audio = this.currentMetrics.audio;
    
    // Audio level score (0-30 points)
    const levelScore = audio.level > 10 ? 30 : (audio.level / 10) * 30;
    
    // Noise score (0-20 points, lower is better)
    const noiseScore = Math.max(0, 20 - audio.noiseLevel * 0.2);
    
    // Packet loss score (0-20 points, lower is better)
    const packetLossScore = Math.max(0, 20 - audio.packetLoss * 4);
    
    // Latency score (0-15 points, lower is better)
    const latencyScore = Math.max(0, 15 - audio.latency * 0.075);
    
    // Jitter score (0-15 points, lower is better)
    const jitterScore = Math.max(0, 15 - audio.jitter * 0.3);
    
    return levelScore + noiseScore + packetLossScore + latencyScore + jitterScore;
  }

  // Calculate video quality score
  private calculateVideoScore(): number {
    const video = this.currentMetrics.video;
    
    // Resolution score (0-25 points)
    const totalPixels = video.resolution.width * video.resolution.height;
    const resolutionScore = Math.min(25, (totalPixels / (1920 * 1080)) * 25);
    
    // Frame rate score (0-20 points)
    const frameRateScore = Math.min(20, (video.frameRate / 30) * 20);
    
    // Bitrate score (0-20 points)
    const bitrateScore = Math.min(20, (video.bitrate / 2000) * 20);
    
    // Packet loss score (0-15 points, lower is better)
    const packetLossScore = Math.max(0, 15 - video.packetLoss * 3);
    
    // Latency score (0-10 points, lower is better)
    const latencyScore = Math.max(0, 10 - video.latency * 0.05);
    
    // Jitter score (0-10 points, lower is better)
    const jitterScore = Math.max(0, 10 - video.jitter * 0.2);
    
    return resolutionScore + frameRateScore + bitrateScore + packetLossScore + latencyScore + jitterScore;
  }

  // Calculate stability
  private calculateStability(): number {
    if (this.historicalMetrics.length < 10) return 100;
    
    const recentMetrics = this.historicalMetrics.slice(-10);
    const scores = recentMetrics.map(m => m.overall.score);
    
    // Calculate variance
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    // Convert variance to stability score (lower variance = higher stability)
    const stability = Math.max(0, 100 - variance * 2);
    
    return stability;
  }

  // Check for quality alerts
  private checkQualityAlerts(): void {
    if (!this.config.alerts.enabled) return;
    
    const previousScore = this.historicalMetrics.length > 0 
      ? this.historicalMetrics[this.historicalMetrics.length - 1].overall.score 
      : 100;
    
    const currentScore = this.currentMetrics.overall.score;
    const scoreDrop = previousScore - currentScore;
    
    // Check for quality drop
    if (scoreDrop >= this.config.alerts.qualityDropThreshold) {
      this.createAlert('quality_drop', 'high', 
        `Quality dropped by ${scoreDrop.toFixed(1)} points (${previousScore.toFixed(1)} → ${currentScore.toFixed(1)})`);
    }
    
    // Check for high packet loss
    const maxPacketLoss = Math.max(this.currentMetrics.audio.packetLoss, this.currentMetrics.video.packetLoss);
    if (maxPacketLoss >= this.config.alerts.packetLossThreshold) {
      this.createAlert('packet_loss', 'medium', 
        `High packet loss detected: ${maxPacketLoss.toFixed(1)}%`);
    }
    
    // Check for high latency
    const maxLatency = Math.max(this.currentMetrics.audio.latency, this.currentMetrics.video.latency);
    if (maxLatency >= this.config.alerts.latencyThreshold) {
      this.createAlert('high_latency', 'medium', 
        `High latency detected: ${maxLatency.toFixed(1)}ms`);
    }
    
    // Check for audio issues
    if (this.currentMetrics.audio.level < 5) {
      this.createAlert('audio_issue', 'low', 
        `Low audio level detected: ${this.currentMetrics.audio.level.toFixed(1)}`);
    }
    
    if (this.currentMetrics.audio.noiseLevel > 50) {
      this.createAlert('audio_issue', 'medium', 
        `High noise level detected: ${this.currentMetrics.audio.noiseLevel.toFixed(1)}%`);
    }
    
    // Check for video issues
    if (this.currentMetrics.video.frameRate < 15) {
      this.createAlert('video_issue', 'medium', 
        `Low frame rate detected: ${this.currentMetrics.video.frameRate.toFixed(1)}fps`);
    }
  }

  // Create quality alert
  private createAlert(type: QualityAlert['type'], severity: QualityAlert['severity'], message: string): void {
    const alert: QualityAlert = {
      alertId: this.generateAlertId(),
      type,
      severity,
      message,
      metrics: { ...this.currentMetrics },
      timestamp: Date.now(),
      resolved: false
    };
    
    this.alerts.set(alert.alertId, alert);
    
    // Send notifications
    this.sendAlertNotification(alert);
    
    // Dispatch alert event
    this.dispatchEvent(new CustomEvent('qualityAlert', {
      detail: { alert }
    }));
  }

  // Send alert notification
  private sendAlertNotification(alert: QualityAlert): void {
    for (const method of this.config.alerts.notificationMethods) {
      switch (method) {
        case 'console':
          console.warn(`[Quality Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
          break;
        case 'event':
          // Already dispatched above
          break;
        case 'callback':
          // Could be implemented for external callbacks
          break;
      }
    }
  }

  // Generate quality recommendations
  private generateRecommendations(): void {
    this.recommendations = [];
    
    const quality = this.currentMetrics.overall.quality;
    
    if (quality === 'poor' || quality === 'fair') {
      // Check audio recommendations
      if (this.currentMetrics.audio.packetLoss > 3) {
        this.recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'network',
          priority: 'high',
          action: 'Reduce audio bitrate or improve network connection',
          expectedImprovement: 15,
          timestamp: Date.now(),
          applied: false
        });
      }
      
      if (this.currentMetrics.audio.noiseLevel > 40) {
        this.recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'audio',
          priority: 'medium',
          action: 'Enable noise suppression',
          expectedImprovement: 10,
          timestamp: Date.now(),
          applied: false
        });
      }
      
      // Check video recommendations
      if (this.currentMetrics.video.packetLoss > 3) {
        this.recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'bitrate',
          priority: 'high',
          action: 'Reduce video bitrate',
          expectedImprovement: 20,
          timestamp: Date.now(),
          applied: false
        });
      }
      
      if (this.currentMetrics.video.frameRate < 20) {
        this.recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'frameRate',
          priority: 'medium',
          action: 'Reduce target frame rate to 15fps',
          expectedImprovement: 15,
          timestamp: Date.now(),
          applied: false
        });
      }
      
      const totalPixels = this.currentMetrics.video.resolution.width * this.currentMetrics.video.resolution.height;
      if (totalPixels > 1280 * 720) {
        this.recommendations.push({
          recommendationId: this.generateRecommendationId(),
          type: 'resolution',
          priority: 'medium',
          action: 'Reduce resolution to 720p',
          expectedImprovement: 25,
          timestamp: Date.now(),
          applied: false
        });
      }
    }
  }

  // Update historical metrics
  private updateHistoricalMetrics(): void {
    this.historicalMetrics.push({ ...this.currentMetrics });
    
    // Keep only last 100 metrics
    if (this.historicalMetrics.length > 100) {
      this.historicalMetrics = this.historicalMetrics.slice(-100);
    }
  }

  // Simulation methods (in real implementation, these would get actual WebRTC stats)
  private simulatePacketLoss(): number {
    return Math.random() * 5; // 0-5%
  }

  private simulateJitter(): number {
    return Math.random() * 30; // 0-30ms
  }

  private simulateLatency(): number {
    return 50 + Math.random() * 100; // 50-150ms
  }

  private simulateBandwidth(): number {
    return 64 + Math.random() * 192; // 64-256 kbps
  }

  private simulateEchoLevel(): number {
    return Math.random() * 20; // 0-20%
  }

  private simulateVideoBitrate(): number {
    return 500 + Math.random() * 1500; // 500-2000 kbps
  }

  // Generate IDs
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  
  // Get current metrics
  public getCurrentMetrics(): QualityMetrics {
    return { ...this.currentMetrics };
  }
  
  // Get historical metrics
  public getHistoricalMetrics(count?: number): QualityMetrics[] {
    if (count) {
      return this.historicalMetrics.slice(-count);
    }
    return [...this.historicalMetrics];
  }
  
  // Get active alerts
  public getActiveAlerts(): QualityAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  // Get all alerts
  public getAllAlerts(): QualityAlert[] {
    return Array.from(this.alerts.values());
  }
  
  // Resolve alert
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.dispatchEvent(new CustomEvent('alertResolved', {
        detail: { alertId, timestamp: Date.now() }
      }));
      return true;
    }
    return false;
  }
  
  // Get recommendations
  public getRecommendations(): QualityRecommendation[] {
    return [...this.recommendations];
  }
  
  // Apply recommendation
  public applyRecommendation(recommendationId: string): boolean {
    const recommendation = this.recommendations.find(r => r.recommendationId === recommendationId);
    if (recommendation) {
      recommendation.applied = true;
      
      // Dispatch event for external handling
      this.dispatchEvent(new CustomEvent('recommendationApplied', {
        detail: { recommendation }
      }));
      
      return true;
    }
    return false;
  }
  
  // Get configuration
  public getConfig(): CallQualityConfig {
    return { ...this.config };
  }
  
  // Update configuration
  public updateConfig(newConfig: Partial<CallQualityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.dispatchEvent(new CustomEvent('configUpdated', {
      detail: { config: this.config }
    }));
  }
  
  // Get quality statistics
  public getQualityStatistics(): {
    averageScore: number;
    minScore: number;
    maxScore: number;
    stability: number;
    uptime: number;
    totalAlerts: number;
    resolvedAlerts: number;
  } {
    if (this.historicalMetrics.length === 0) {
      return {
        averageScore: this.currentMetrics.overall.score,
        minScore: this.currentMetrics.overall.score,
        maxScore: this.currentMetrics.overall.score,
        stability: this.currentMetrics.overall.stability,
        uptime: 0,
        totalAlerts: 0,
        resolvedAlerts: 0
      };
    }
    
    const scores = this.historicalMetrics.map(m => m.overall.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    const totalAlerts = this.alerts.size;
    const resolvedAlerts = Array.from(this.alerts.values()).filter(a => a.resolved).length;
    
    const uptime = this.isAnalyzing ? Date.now() - (this.historicalMetrics[0]?.timestamp || Date.now()) : 0;
    
    return {
      averageScore,
      minScore,
      maxScore,
      stability: this.currentMetrics.overall.stability,
      uptime,
      totalAlerts,
      resolvedAlerts
    };
  }
  
  // Reset metrics
  public resetMetrics(): void {
    this.currentMetrics = this.initializeMetrics();
    this.historicalMetrics = [];
    this.alerts.clear();
    this.recommendations = [];
    
    this.dispatchEvent(new CustomEvent('metricsReset', {
      detail: { timestamp: Date.now() }
    }));
  }
  
  // Cleanup
  public destroy(): void {
    this.stopAnalysis();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.mediaStream = null;
    
    this.dispatchEvent(new CustomEvent('destroyed', {
      detail: { timestamp: Date.now() }
    }));
  }
}

export { 
  CallQualityAnalyzer, 
  CallQualityConfig, 
  QualityMetrics, 
  QualityAlert, 
  QualityRecommendation 
};
