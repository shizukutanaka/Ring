// Real-Time Performance Monitoring Service
// Provides comprehensive performance monitoring with predictive analytics

interface PerformanceMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  network: NetworkMetrics;
  webrtc: WebRTCMetrics;
  battery: BatteryMetrics;
  experience: ExperienceMetrics;
  gpu: GPUMetrics;
  ai: AIMetrics;
}

interface NetworkMetrics {
  bandwidth: number;
  latency: number;
  jitter: number;
  packetLoss: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  rtt: number; // Round-trip time
  availableBandwidth: number; // Predicted available bandwidth
}

interface WebRTCMetrics {
  resolution: { width: number; height: number };
  framerate: number;
  bitrate: number;
  codec: string;
  iceState: string;
  connectionState: string;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  audioLevel: number;
  videoFramesReceived: number;
  videoFramesDecoded: number;
  keyFramesDecoded: number;
}

interface BatteryMetrics {
  level: number;
  charging: boolean;
  dischargeTime?: number;
  temperature: number; // Battery temperature in Celsius
  powerConsumption: number; // Current power consumption in watts
}

interface ExperienceMetrics {
  mos: number; // Mean Opinion Score
  freezeCount: number;
  audioQuality: number;
  videoQuality: number;
  overallSatisfaction: number;
  interactionLatency: number; // User interaction response time
  screenShareQuality: number; // Screen sharing quality score
}

interface GPUMetrics {
  utilization: number; // GPU utilization percentage
  memoryUsed: number; // GPU memory used in MB
  memoryTotal: number; // Total GPU memory in MB
  temperature: number; // GPU temperature in Celsius
  powerUsage: number; // GPU power consumption in watts
  accelerationEnabled: boolean; // Hardware acceleration status
}

interface AIMetrics {
  sttLatency: number; // Speech-to-text latency in ms
  ttsLatency: number; // Text-to-speech latency in ms
  llmResponseTime: number; // LLM response time in ms
  transcriptionAccuracy: number; // Transcription accuracy percentage
  sentimentAnalysisScore: number; // Sentiment analysis confidence
  aiProcessingLoad: number; // AI processing load percentage
}

interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'network' | 'battery' | 'experience' | 'gpu' | 'ai' | 'thermal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  timestamp: number;
  autoResolved: boolean;
}
}

interface PredictiveInsight {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeHorizon: number; // minutes
  confidence: number; // 0-1
  action: string;
}

class RealTimePerformanceMonitor extends EventTarget {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private insights: PredictiveInsight[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private predictionInterval: NodeJS.Timeout | null = null;
  private observers: PerformanceObserver[] = [];
  
  private readonly thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 75, critical: 90 },
    latency: { warning: 150, critical: 300 },
    packetLoss: { warning: 2, critical: 5 },
    battery: { warning: 20, critical: 10 },
    mos: { warning: 3.5, critical: 3.0 }
  };

  private readonly historySize = 300; // 5 minutes at 1-second intervals
  private readonly predictionWindow = 300; // 5 minutes prediction horizon

  constructor() {
    super();
    this.initializeMonitoring();
  }

  // Initialize all monitoring systems
  private initializeMonitoring(): void {
    this.setupPerformanceObserver();
    this.startRealTimeMonitoring();
    this.startPredictiveAnalysis();
    this.setupWebRTCStatsMonitoring();
  }

  // Setup Performance Observer API for browser metrics
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.handleLongTask(entry);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleResourceTiming(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  // Start real-time metrics collection
  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzeMetrics();
      this.updatePredictions();
    }, 1000); // Collect every second
  }

  // Start predictive analysis
  private startPredictiveAnalysis(): void {
    this.predictionInterval = setInterval(() => {
      this.generatePredictiveInsights();
    }, 5000); // Analyze predictions every 5 seconds
  }

  // Collect comprehensive performance metrics
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    const metrics: PerformanceMetrics = {
      timestamp,
      cpu: await this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      network: await this.getNetworkMetrics(),
      webrtc: this.getWebRTCMetrics(),
      battery: this.getBatteryMetrics(),
      experience: this.calculateExperienceMetrics()
    };

    // Add to history (maintain size limit)
    this.metrics.push(metrics);
    if (this.metrics.length > this.historySize) {
      this.metrics.shift();
    }

    // Dispatch metrics event
    this.dispatchEvent(new CustomEvent('metrics', { 
      detail: { current: metrics, history: [...this.metrics] } 
    }));
  }

  // Get CPU metrics using Performance API
  private async getCPUMetrics(): Promise<number> {
    if ('measureUserAgentSpecificMemory' in performance) {
      try {
        const memory = await performance.measureUserAgentSpecificMemory();
        return (memory.used / memory.total) * 100;
      } catch (error) {
        // Fallback to basic CPU estimation
        return this.estimateCPUUsage();
      }
    }
    return this.estimateCPUUsage();
  }

  // Estimate CPU usage based on performance timing
  private estimateCPUUsage(): number {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navTiming) return 0;

    const loadTime = navTiming.loadEventEnd - navTiming.loadEventStart;
    const domTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    
    // Simple heuristic based on load times
    return Math.min(100, (loadTime + domTime) / 10);
  }

  // Get memory metrics
  private getMemoryMetrics(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  // Get network metrics
  private async getNetworkMetrics(): Promise<NetworkMetrics> {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    let bandwidth = 0;
    let quality: NetworkMetrics['quality'] = 'excellent';

    if (connection) {
      bandwidth = connection.downlink || 0;
      quality = this.assessNetworkQuality(bandwidth, connection.rtt || 0);
    }

    // Get WebRTC network stats if available
    const rtcStats = await this.getWebRTCNetworkStats();

    return {
      bandwidth: bandwidth || rtcStats.bandwidth,
      latency: connection?.rtt || rtcStats.latency,
      jitter: rtcStats.jitter,
      packetLoss: rtcStats.packetLoss,
      quality
    };
  }

  // Assess network quality based on metrics
  private assessNetworkQuality(bandwidth: number, latency: number): NetworkMetrics['quality'] {
    if (bandwidth >= 10 && latency < 50) return 'excellent';
    if (bandwidth >= 5 && latency < 100) return 'good';
    if (bandwidth >= 2 && latency < 200) return 'fair';
    return 'poor';
  }

  // Get WebRTC network statistics
  private async getWebRTCNetworkStats(): Promise<{ bandwidth: number; latency: number; jitter: number; packetLoss: number }> {
    // This would integrate with actual WebRTC peer connection
    // For now, return estimated values
    return {
      bandwidth: 0,
      latency: 0,
      jitter: 0,
      packetLoss: 0
    };
  }

  // Get WebRTC performance metrics
  private getWebRTCMetrics(): WebRTCMetrics {
    // This would integrate with actual WebRTC peer connection
    return {
      resolution: { width: 1280, height: 720 },
      framerate: 30,
      bitrate: 1000,
      codec: 'VP8',
      iceState: 'connected',
      connectionState: 'connected'
    };
  }

  // Get battery metrics
  private getBatteryMetrics(): BatteryMetrics {
    if ('getBattery' in navigator) {
      return (navigator as any).getBattery().then((battery: any) => ({
        level: battery.level * 100,
        charging: battery.charging,
        dischargeTime: battery.dischargingTime
      }));
    }
    return { level: 100, charging: false };
  }

  // Calculate experience metrics based on all other metrics
  private calculateExperienceMetrics(): ExperienceMetrics {
    const recentMetrics = this.metrics.slice(-10); // Last 10 seconds
    
    if (recentMetrics.length === 0) {
      return {
        mos: 5.0,
        freezeCount: 0,
        audioQuality: 100,
        videoQuality: 100,
        overallSatisfaction: 100
      };
    }

    // Calculate MOS based on network and WebRTC quality
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.network.latency, 0) / recentMetrics.length;
    const avgPacketLoss = recentMetrics.reduce((sum, m) => sum + m.network.packetLoss, 0) / recentMetrics.length;
    
    let mos = 5.0;
    if (avgLatency > 200) mos -= 1.5;
    else if (avgLatency > 100) mos -= 0.8;
    else if (avgLatency > 50) mos -= 0.3;

    if (avgPacketLoss > 3) mos -= 1.2;
    else if (avgPacketLoss > 1) mos -= 0.5;

    mos = Math.max(1.0, Math.min(5.0, mos));

    return {
      mos,
      freezeCount: this.countFreezes(recentMetrics),
      audioQuality: Math.max(0, 100 - avgPacketLoss * 10 - avgLatency / 5),
      videoQuality: Math.max(0, 100 - avgLatency / 3),
      overallSatisfaction: mos * 20
    };
  }

  // Count video freezes in recent metrics
  private countFreezes(metrics: PerformanceMetrics[]): number {
    let freezeCount = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].webrtc.framerate < 10 && metrics[i-1].webrtc.framerate >= 10) {
        freezeCount++;
      }
    }
    return freezeCount;
  }

  // Analyze collected metrics and generate alerts
  private analyzeMetrics(): void {
    if (this.metrics.length === 0) return;

    const current = this.metrics[this.metrics.length - 1];
    const newAlerts: PerformanceAlert[] = [];

    // CPU analysis
    if (current.cpu > this.thresholds.cpu.critical) {
      newAlerts.push(this.createAlert('cpu', 'critical', 
        `CPU usage critically high: ${current.cpu.toFixed(1)}%`,
        'Close unnecessary applications and reduce video quality'));
    } else if (current.cpu > this.thresholds.cpu.warning) {
      newAlerts.push(this.createAlert('cpu', 'medium',
        `CPU usage elevated: ${current.cpu.toFixed(1)}%`,
        'Consider reducing video resolution or closing background apps'));
    }

    // Memory analysis
    if (current.memory > this.thresholds.memory.critical) {
      newAlerts.push(this.createAlert('memory', 'critical',
        `Memory usage critically high: ${current.memory.toFixed(1)}%`,
        'Restart application and close browser tabs'));
    } else if (current.memory > this.thresholds.memory.warning) {
      newAlerts.push(this.createAlert('memory', 'medium',
        `Memory usage elevated: ${current.memory.toFixed(1)}%`,
        'Close unused browser tabs and applications'));
    }

    // Network analysis
    if (current.network.latency > this.thresholds.latency.critical) {
      newAlerts.push(this.createAlert('network', 'critical',
        `Network latency critically high: ${current.network.latency}ms`,
        'Check network connection and consider switching to wired connection'));
    } else if (current.network.latency > this.thresholds.latency.warning) {
      newAlerts.push(this.createAlert('network', 'medium',
        `Network latency elevated: ${current.network.latency}ms`,
        'Optimize network quality and reduce bandwidth usage'));
    }

    // Battery analysis
    if (current.battery.level < this.thresholds.battery.critical && !current.battery.charging) {
      newAlerts.push(this.createAlert('battery', 'critical',
        `Battery critically low: ${current.battery.level.toFixed(1)}%`,
        'Connect charger and enable power saving mode'));
    } else if (current.battery.level < this.thresholds.battery.warning && !current.battery.charging) {
      newAlerts.push(this.createAlert('battery', 'medium',
        `Battery low: ${current.battery.level.toFixed(1)}%`,
        'Enable power saving mode and reduce video quality'));
    }

    // Experience analysis
    if (current.experience.mos < this.thresholds.mos.critical) {
      newAlerts.push(this.createAlert('experience', 'critical',
        `Call quality critically poor: MOS ${current.experience.mos.toFixed(1)}`,
        'Switch to audio-only mode or improve network conditions'));
    } else if (current.experience.mos < this.thresholds.mos.warning) {
      newAlerts.push(this.createAlert('experience', 'medium',
        `Call quality degraded: MOS ${current.experience.mos.toFixed(1)}`,
        'Reduce video quality or check network connection'));
    }

    // Update alerts and dispatch events
    this.alerts = [...this.alerts, ...newAlerts].slice(-50); // Keep last 50 alerts
    
    newAlerts.forEach(alert => {
      this.dispatchEvent(new CustomEvent('alert', { detail: alert }));
    });
  }

  // Create performance alert
  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], 
                     message: string, recommendation: string): PerformanceAlert {
    return {
      type,
      severity,
      message,
      recommendation,
      timestamp: Date.now(),
      autoResolved: false
    };
  }

  // Generate predictive insights using trend analysis
  private generatePredictiveInsights(): void {
    if (this.metrics.length < 30) return; // Need at least 30 seconds of data

    const newInsights: PredictiveInsight[] = [];

    // Predict CPU usage trend
    const cpuPrediction = this.predictTrend('cpu', this.metrics.map(m => m.cpu));
    if (cpuPrediction) {
      newInsights.push(this.createInsight('cpu', cpuPrediction.current, cpuPrediction.predicted,
        this.predictionWindow / 60, cpuPrediction.confidence,
        this.getCPUPredictionAction(cpuPrediction.predicted)));
    }

    // Predict memory usage trend
    const memoryPrediction = this.predictTrend('memory', this.metrics.map(m => m.memory));
    if (memoryPrediction) {
      newInsights.push(this.createInsight('memory', memoryPrediction.current, memoryPrediction.predicted,
        this.predictionWindow / 60, memoryPrediction.confidence,
        this.getMemoryPredictionAction(memoryPrediction.predicted)));
    }

    // Predict battery drain
    const batteryPrediction = this.predictBatteryDrain();
    if (batteryPrediction) {
      newInsights.push(this.createInsight('battery', batteryPrediction.current, batteryPrediction.predicted,
        this.predictionWindow / 60, batteryPrediction.confidence,
        this.getBatteryPredictionAction(batteryPrediction.predicted)));
    }

    // Update insights and dispatch events
    this.insights = [...this.insights, ...newInsights].slice(-20); // Keep last 20 insights
    
    newInsights.forEach(insight => {
      this.dispatchEvent(new CustomEvent('insight', { detail: insight }));
    });
  }

  // Predict trend using linear regression
  private predictTrend(metric: string, values: number[]): { current: number; predicted: number; confidence: number } | null {
    if (values.length < 10) return null;

    const n = values.length;
    const recent = values.slice(-10);
    const current = recent[recent.length - 1];
    
    // Simple linear regression on recent values
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < recent.length; i++) {
      sumX += i;
      sumY += recent[i];
      sumXY += i * recent[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict future value
    const predicted = intercept + slope * (recent.length + this.predictionWindow);
    
    // Calculate confidence based on variance
    const variance = this.calculateVariance(recent);
    const confidence = Math.max(0.1, 1 - (variance / 100));

    return { current, predicted, confidence };
  }

  // Calculate variance of values
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Predict battery drain rate
  private predictBatteryDrain(): { current: number; predicted: number; confidence: number } | null {
    const batteryMetrics = this.metrics.filter(m => m.battery.level > 0).slice(-30);
    if (batteryMetrics.length < 10) return null;

    const levels = batteryMetrics.map(m => m.battery.level);
    const current = levels[levels.length - 1];
    
    // Calculate drain rate
    const timeSpan = (batteryMetrics[batteryMetrics.length - 1].timestamp - batteryMetrics[0].timestamp) / 60000; // minutes
    const drainRate = (levels[0] - current) / timeSpan;
    
    // Predict future level
    const predicted = Math.max(0, current - (drainRate * this.predictionWindow / 60));
    
    const confidence = drainRate > 0 ? 0.8 : 0.3;

    return { current, predicted, confidence };
  }

  // Create predictive insight
  private createInsight(metric: string, current: number, predicted: number, 
                       timeHorizon: number, confidence: number, action: string): PredictiveInsight {
    return {
      metric,
      currentValue: current,
      predictedValue: predicted,
      timeHorizon,
      confidence,
      action
    };
  }

  // Get action recommendation for CPU prediction
  private getCPUPredictionAction(predicted: number): string {
    if (predicted > 85) return 'Prepare to reduce video quality and close background applications';
    if (predicted > 75) return 'Monitor CPU usage and be ready to optimize';
    return 'CPU usage looks stable';
  }

  // Get action recommendation for memory prediction
  private getMemoryPredictionAction(predicted: number): string {
    if (predicted > 85) return 'Prepare to restart application and free up memory';
    if (predicted > 75) return 'Monitor memory usage and close unused tabs';
    return 'Memory usage looks stable';
  }

  // Get action recommendation for battery prediction
  private getBatteryPredictionAction(predicted: number): string {
    if (predicted < 15) return 'Connect charger immediately and enable power saving';
    if (predicted < 30) return 'Consider connecting charger soon';
    return 'Battery level looks adequate';
  }

  // Handle long task detection
  private handleLongTask(entry: PerformanceEntry): void {
    this.dispatchEvent(new CustomEvent('longtask', {
      detail: {
        duration: entry.duration,
        startTime: entry.startTime,
        recommendation: 'Consider breaking up heavy computations or using Web Workers'
      }
    }));
  }

  // Handle resource timing
  private handleResourceTiming(entry: PerformanceEntry): void {
    if (entry.duration > 1000) { // Resources taking longer than 1 second
      this.dispatchEvent(new CustomEvent('slowresource', {
        detail: {
          name: entry.name,
          duration: entry.duration,
          recommendation: 'Optimize resource size or implement better caching'
        }
      }));
    }
  }

  // Setup WebRTC stats monitoring
  private setupWebRTCStatsMonitoring(): void {
    // This would integrate with actual WebRTC peer connection
    // For now, we'll simulate stats collection
  }

  // Get current performance summary
  public getPerformanceSummary(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    keyMetrics: Partial<PerformanceMetrics>;
    activeAlerts: PerformanceAlert[];
    topInsights: PredictiveInsight[];
  } {
    if (this.metrics.length === 0) {
      return {
        overall: 'excellent',
        score: 100,
        keyMetrics: {},
        activeAlerts: [],
        topInsights: []
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical');
    const highAlerts = this.alerts.filter(a => a.severity === 'high');
    
    let score = 100;
    score -= criticalAlerts.length * 25;
    score -= highAlerts.length * 10;
    score -= (100 - current.experience.mos * 20) / 2;
    
    const overall = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';

    return {
      overall,
      score: Math.max(0, score),
      keyMetrics: {
        cpu: current.cpu,
        memory: current.memory,
        network: current.network,
        experience: current.experience
      },
      activeAlerts: this.alerts.filter(a => Date.now() - a.timestamp < 60000), // Last minute
      topInsights: this.insights.slice(-5)
    };
  }

  // Get historical data for analysis
  public getHistoricalData(minutes: number = 5): PerformanceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Get performance recommendations
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getPerformanceSummary();
    
    if (summary.overall === 'poor') {
      recommendations.push('Overall performance is poor - consider switching to audio-only mode');
    }
    
    if (summary.keyMetrics.cpu && summary.keyMetrics.cpu > 80) {
      recommendations.push('Reduce video resolution to lower CPU usage');
    }
    
    if (summary.keyMetrics.memory && summary.keyMetrics.memory > 80) {
      recommendations.push('Close unused browser tabs to free up memory');
    }
    
    if (summary.keyMetrics.network?.quality === 'poor') {
      recommendations.push('Improve network connection or reduce bandwidth usage');
    }
    
    if (summary.keyMetrics.battery && summary.keyMetrics.battery.level < 30) {
      recommendations.push('Enable power saving mode and connect charger');
    }

    // Add insights-based recommendations
    summary.topInsights.forEach(insight => {
      if (insight.confidence > 0.7) {
        recommendations.push(insight.action);
      }
    });

    return recommendations;
  }

  // Cleanup and stop monitoring
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Export performance data for analysis
  public exportData(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    insights: PredictiveInsight[];
    summary: any;
  } {
    return {
      metrics: [...this.metrics],
      alerts: [...this.alerts],
      insights: [...this.insights],
      summary: this.getPerformanceSummary()
    };
  }
}

export { RealTimePerformanceMonitor, PerformanceMetrics, PerformanceAlert, PredictiveInsight };
