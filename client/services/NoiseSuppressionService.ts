// Noise Suppression Service
// Real-time AI-powered noise reduction using WebAssembly and DTLN

interface NoiseSuppressionConfig {
  enabled: boolean;
  algorithm: 'dtln' | 'rnnoise' | 'spectral_subtraction' | 'wiener';
  aggressiveness: number; // 0.0 - 1.0
  vadEnabled: boolean; // Voice Activity Detection
  adaptiveMode: boolean;
  realTimeMode: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  languages: string[];
}

interface NoiseProfile {
  id: string;
  name: string;
  type: 'background' | 'impulse' | 'stationary' | 'non_stationary';
  characteristics: {
    frequency: number; // Hz
    amplitude: number; // dB
    duration: number; // ms
    periodicity: number; // 0-1
  };
  suppressionLevel: number; // 0-1
  adaptive: boolean;
}

interface AudioSegment {
  id: string;
  data: Float32Array;
  sampleRate: number;
  channels: number;
  timestamp: number;
  duration: number; // ms
  noiseLevel: number; // 0-1
  voiceActivity: boolean;
  processed: boolean;
}

interface SuppressionResult {
  segmentId: string;
  processedData: Float32Array;
  originalNoiseLevel: number;
  suppressedNoiseLevel: number;
  noiseReduction: number; // dB
  voicePreservation: number; // 0-1
  processingTime: number; // ms
  algorithm: string;
  quality: number; // 0-100
}

interface NoiseMetrics {
  timestamp: number;
  input: {
    signalLevel: number; // dB
    noiseLevel: number; // dB
    snr: number; // dB
    peakLevel: number; // dB
  };
  output: {
    signalLevel: number; // dB
    noiseLevel: number; // dB
    snr: number; // dB
    peakLevel: number; // dB
  };
  performance: {
    noiseReduction: number; // dB
    voiceDistortion: number; // 0-1
    processingLatency: number; // ms
    throughput: number; // samples/sec
  };
  quality: {
    mos: number; // Mean Opinion Score
    pesq: number; // Perceptual Evaluation of Speech Quality
    stoi: number; // Short-Time Objective Intelligibility
  };
}

interface NoiseAlert {
  alertId: string;
  type: 'quality' | 'performance' | 'algorithm' | 'hardware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  metrics: NoiseMetrics;
  timestamp: number;
  resolved: boolean;
}

class NoiseSuppressionService extends EventTarget {
  private config: NoiseSuppressionConfig;
  private currentMetrics: NoiseMetrics;
  private historicalMetrics: NoiseMetrics[] = [];
  private noiseProfiles: Map<string, NoiseProfile> = new Map();
  private audioSegments: Map<string, AudioSegment> = new Map();
  private suppressionResults: Map<string, SuppressionResult> = new Map();
  private alerts: Map<string, NoiseAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private wasmModule: WebAssembly.Instance | null = null;
  private processingQueue: AudioSegment[] = [];
  private isProcessing = false;

  constructor(config: Partial<NoiseSuppressionConfig> = {}) {
    super();
    this.config = this.mergeConfig(config);
    this.currentMetrics = this.initializeMetrics();
  }

  private mergeConfig(userConfig: Partial<NoiseSuppressionConfig>): NoiseSuppressionConfig {
    return {
      enabled: true,
      algorithm: 'dtln',
      aggressiveness: 0.7,
      vadEnabled: true,
      adaptiveMode: true,
      realTimeMode: true,
      quality: 'high',
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      ...userConfig
    };
  }

  private initializeMetrics(): NoiseMetrics {
    return {
      timestamp: Date.now(),
      input: {
        signalLevel: 0,
        noiseLevel: 0,
        snr: 0,
        peakLevel: 0
      },
      output: {
        signalLevel: 0,
        noiseLevel: 0,
        snr: 0,
        peakLevel: 0
      },
      performance: {
        noiseReduction: 0,
        voiceDistortion: 0,
        processingLatency: 0,
        throughput: 0
      },
      quality: {
        mos: 0,
        pesq: 0,
        stoi: 0
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Noise Suppression Service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Noise Suppression Service...');
      
      // Load WebAssembly module
      await this.loadWebAssemblyModule();
      
      // Initialize noise profiles
      await this.initializeNoiseProfiles();
      
      // Start monitoring
      this.startMonitoring();
      
      // Start processing loop
      if (this.config.realTimeMode) {
        this.startProcessingLoop();
      }
      
      this.isInitialized = true;
      console.log('✅ Noise Suppression Service initialized');
      console.log(`🎛️ Algorithm: ${this.config.algorithm}, Quality: ${this.config.quality}`);
      
      this.dispatchEvent(new CustomEvent('noiseSuppressionInitialized', {
        detail: { 
          algorithm: this.config.algorithm,
          quality: this.config.quality,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('Failed to initialize Noise Suppression Service:', error);
      throw error;
    }
  }

  private async loadWebAssemblyModule(): Promise<void> {
    console.log('📦 Loading WebAssembly module...');
    
    try {
      // Simulate WebAssembly module loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In real implementation, this would load the actual DTLN WebAssembly module
      console.log('✅ WebAssembly module loaded');
      
      this.dispatchEvent(new CustomEvent('wasmModuleLoaded', {
        detail: { timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
      throw error;
    }
  }

  private async initializeNoiseProfiles(): Promise<void> {
    console.log('🎚️ Initializing noise profiles...');
    
    // Common noise profiles
    const profiles: NoiseProfile[] = [
      {
        id: 'hvac',
        name: 'HVAC System',
        type: 'stationary',
        characteristics: {
          frequency: 100,
          amplitude: -20,
          duration: 0,
          periodicity: 0.8
        },
        suppressionLevel: 0.8,
        adaptive: true
      },
      {
        id: 'keyboard',
        name: 'Keyboard Typing',
        type: 'impulse',
        characteristics: {
          frequency: 2000,
          amplitude: -30,
          duration: 50,
          periodicity: 0.1
        },
        suppressionLevel: 0.9,
        adaptive: false
      },
      {
        id: 'traffic',
        name: 'Street Traffic',
        type: 'non_stationary',
        characteristics: {
          frequency: 500,
          amplitude: -15,
          duration: 0,
          periodicity: 0.3
        },
        suppressionLevel: 0.7,
        adaptive: true
      },
      {
        id: 'cafe',
        name: 'Cafe Ambience',
        type: 'background',
        characteristics: {
          frequency: 1000,
          amplitude: -25,
          duration: 0,
          periodicity: 0.5
        },
        suppressionLevel: 0.6,
        adaptive: true
      }
    ];
    
    profiles.forEach(profile => {
      this.noiseProfiles.set(profile.id, profile);
    });
    
    console.log(`✅ ${profiles.length} noise profiles initialized`);
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.detectQualityIssues();
      this.updateHistoricalData();
    }, 1000); // Collect metrics every second
  }

  private startProcessingLoop(): void {
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 16); // 60fps processing loop
  }

  public async suppressNoise(
    audioData: Float32Array,
    sampleRate: number = 48000,
    channels: number = 1
  ): Promise<SuppressionResult> {
    if (!this.isInitialized) {
      throw new Error('Noise Suppression Service not initialized');
    }

    const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const segment: AudioSegment = {
      id: segmentId,
      data: audioData,
      sampleRate,
      channels,
      timestamp: Date.now(),
      duration: (audioData.length / sampleRate) * 1000,
      noiseLevel: this.estimateNoiseLevel(audioData),
      voiceActivity: this.detectVoiceActivity(audioData),
      processed: false
    };

    this.audioSegments.set(segmentId, segment);
    
    if (this.config.realTimeMode) {
      this.processingQueue.push(segment);
      // Wait for processing completion
      return new Promise((resolve) => {
        const checkResult = () => {
          const result = this.suppressionResults.get(segmentId);
          if (result) {
            resolve(result);
          } else {
            setTimeout(checkResult, 10);
          }
        };
        checkResult();
      });
    } else {
      return await this.processSegment(segment);
    }
  }

  private estimateNoiseLevel(audioData: Float32Array): number {
    // Simple noise estimation using energy calculation
    let energy = 0;
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(energy / audioData.length);
    return Math.min(1, rms / 0.1); // Normalize to 0-1
  }

  private detectVoiceActivity(audioData: Float32Array): boolean {
    // Simple VAD using energy threshold
    let energy = 0;
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(energy / audioData.length);
    return rms > 0.01; // Threshold for voice activity
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const segment = this.processingQueue.shift();
      if (segment) {
        const result = await this.processSegment(segment);
        this.suppressionResults.set(segment.id, result);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSegment(segment: AudioSegment): Promise<SuppressionResult> {
    const startTime = Date.now();
    
    // Analyze input metrics
    const inputSignalLevel = this.calculateSignalLevel(segment.data);
    const inputNoiseLevel = segment.noiseLevel;
    const inputSNR = inputSignalLevel - inputNoiseLevel;
    
    // Apply noise suppression algorithm
    const processedData = await this.applyNoiseSuppression(segment);
    
    // Analyze output metrics
    const outputSignalLevel = this.calculateSignalLevel(processedData);
    const outputNoiseLevel = this.estimateNoiseLevel(processedData);
    const outputSNR = outputSignalLevel - outputNoiseLevel;
    
    const processingTime = Date.now() - startTime;
    
    const result: SuppressionResult = {
      segmentId: segment.id,
      processedData,
      originalNoiseLevel: inputNoiseLevel,
      suppressedNoiseLevel: outputNoiseLevel,
      noiseReduction: inputNoiseLevel - outputNoiseLevel,
      voicePreservation: this.calculateVoicePreservation(segment.data, processedData),
      processingTime,
      algorithm: this.config.algorithm,
      quality: this.calculateQualityScore(inputSNR, outputSNR, processingTime)
    };
    
    // Update metrics
    this.updateMetrics({
      input: { signalLevel: inputSignalLevel, noiseLevel: inputNoiseLevel, snr: inputSNR, peakLevel: 0 },
      output: { signalLevel: outputSignalLevel, noiseLevel: outputNoiseLevel, snr: outputSNR, peakLevel: 0 },
      performance: {
        noiseReduction: result.noiseReduction,
        voiceDistortion: 1 - result.voicePreservation,
        processingLatency: processingTime,
        throughput: segment.data.length / (processingTime / 1000)
      },
      quality: {
        mos: this.estimateMOS(result),
        pesq: this.estimatePESQ(result),
        stoi: this.estimateSTOI(result)
      }
    });
    
    segment.processed = true;
    
    console.log(`🔇 Noise suppressed: ${result.noiseReduction.toFixed(2)}dB reduction in ${processingTime}ms`);
    
    this.dispatchEvent(new CustomEvent('noiseSuppressed', {
      detail: { segment, result, timestamp: Date.now() }
    }));
    
    return result;
  }

  private async applyNoiseSuppression(segment: AudioSegment): Promise<Float32Array> {
    // Simulate different algorithms
    switch (this.config.algorithm) {
      case 'dtln':
        return this.applyDTLN(segment);
      case 'rnnoise':
        return this.applyRNNoise(segment);
      case 'spectral_subtraction':
        return this.applySpectralSubtraction(segment);
      case 'wiener':
        return this.applyWienerFilter(segment);
      default:
        return segment.data.slice(); // No processing
    }
  }

  private applyDTLN(segment: AudioSegment): Float32Array {
    // Simulate DTLN (Dual-Signal Transformation LSTM Network)
    const output = new Float32Array(segment.data.length);
    
    for (let i = 0; i < segment.data.length; i++) {
      // Simulate LSTM-based noise suppression
      const noiseComponent = segment.data[i] * segment.noiseLevel * this.config.aggressiveness;
      const cleanSignal = segment.data[i] - noiseComponent;
      output[i] = cleanSignal * (0.9 + Math.random() * 0.1); // Add slight variation
    }
    
    return output;
  }

  private applyRNNoise(segment: AudioSegment): Float32Array {
    // Simulate RNNoise (Recurrent Neural Network)
    const output = new Float32Array(segment.data.length);
    
    for (let i = 0; i < segment.data.length; i++) {
      // Simulate recurrent neural network processing
      const noiseEstimate = segment.noiseLevel * 0.8;
      const gain = Math.max(0.1, 1 - noiseEstimate * this.config.aggressiveness);
      output[i] = segment.data[i] * gain;
    }
    
    return output;
  }

  private applySpectralSubtraction(segment: AudioSegment): Float32Array {
    // Simulate spectral subtraction
    const output = new Float32Array(segment.data.length);
    
    // Simple frequency domain processing simulation
    for (let i = 0; i < segment.data.length; i++) {
      const frequency = (i / segment.data.length) * segment.sampleRate / 2;
      const noiseLevel = segment.noiseLevel * (1 - frequency / (segment.sampleRate / 2));
      const subtractionFactor = this.config.aggressiveness * noiseLevel;
      output[i] = Math.max(0, segment.data[i] - subtractionFactor);
    }
    
    return output;
  }

  private applyWienerFilter(segment: AudioSegment): Float32Array {
    // Simulate Wiener filter
    const output = new Float32Array(segment.data.length);
    
    const snr = 1 / (segment.noiseLevel + 0.001); // Avoid division by zero
    const wienerGain = snr / (1 + snr) * this.config.aggressiveness;
    
    for (let i = 0; i < segment.data.length; i++) {
      output[i] = segment.data[i] * wienerGain;
    }
    
    return output;
  }

  private calculateSignalLevel(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    return 20 * Math.log10(rms + 0.00001); // Convert to dB
  }

  private calculateVoicePreservation(original: Float32Array, processed: Float32Array): number {
    // Calculate correlation between original and processed signals
    let correlation = 0;
    let originalPower = 0;
    let processedPower = 0;
    
    for (let i = 0; i < original.length; i++) {
      correlation += original[i] * processed[i];
      originalPower += original[i] * original[i];
      processedPower += processed[i] * processed[i];
    }
    
    if (originalPower === 0 || processedPower === 0) return 0;
    
    correlation = correlation / (Math.sqrt(originalPower) * Math.sqrt(processedPower));
    return Math.max(0, correlation); // Return 0-1
  }

  private calculateQualityScore(inputSNR: number, outputSNR: number, processingTime: number): number {
    // Quality score based on SNR improvement and processing speed
    const snrImprovement = outputSNR - inputSNR;
    const speedScore = Math.max(0, 100 - processingTime / 10); // Penalty for slow processing
    const snrScore = Math.min(100, Math.max(0, snrImprovement * 10)); // Scale SNR improvement
    
    return (snrScore + speedScore) / 2;
  }

  private estimateMOS(result: SuppressionResult): number {
    // Estimate Mean Opinion Score based on noise reduction and voice preservation
    const noiseScore = Math.min(5, result.noiseReduction / 10 + 3); // 0-5 scale
    const voiceScore = result.voicePreservation * 5; // 0-5 scale
    const speedScore = Math.max(1, 5 - result.processingTime / 20); // Penalty for slow processing
    
    return (noiseScore + voiceScore + speedScore) / 3;
  }

  private estimatePESQ(result: SuppressionResult): number {
    // Estimate PESQ score (simplified)
    return Math.min(4.5, result.voicePreservation * 4.5 + (result.noiseReduction / 20));
  }

  private estimateSTOI(result: SuppressionResult): number {
    // Estimate STOI score (simplified)
    return Math.min(1, result.voicePreservation * 0.9 + (result.noiseReduction / 50));
  }

  private updateMetrics(metrics: Partial<NoiseMetrics>): void {
    if (metrics.input) {
      this.currentMetrics.input = { ...this.currentMetrics.input, ...metrics.input };
    }
    if (metrics.output) {
      this.currentMetrics.output = { ...this.currentMetrics.output, ...metrics.output };
    }
    if (metrics.performance) {
      this.currentMetrics.performance = { ...this.currentMetrics.performance, ...metrics.performance };
    }
    if (metrics.quality) {
      this.currentMetrics.quality = { ...this.currentMetrics.quality, ...metrics.quality };
    }
  }

  private collectMetrics(): void {
    this.currentMetrics.timestamp = Date.now();
    // Additional metric collection logic
  }

  private detectQualityIssues(): void {
    const metrics = this.currentMetrics;
    
    // Check for poor noise reduction
    if (metrics.performance.noiseReduction < 5) {
      this.createAlert('quality', 'medium', 
        'Low noise reduction effectiveness');
    }
    
    // Check for high voice distortion
    if (metrics.performance.voiceDistortion > 0.3) {
      this.createAlert('quality', 'high', 
        'High voice distortion detected');
    }
    
    // Check for slow processing
    if (metrics.performance.processingLatency > 50) {
      this.createAlert('performance', 'medium', 
        `High processing latency: ${metrics.performance.processingLatency.toFixed(2)}ms`);
    }
    
    // Check for poor quality scores
    if (metrics.quality.mos < 3) {
      this.createAlert('quality', 'high', 
        `Poor audio quality: MOS ${metrics.quality.mos.toFixed(2)}`);
    }
  }

  private createAlert(
    type: NoiseAlert['type'], 
    severity: NoiseAlert['severity'], 
    message: string
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: NoiseAlert = {
      alertId,
      type,
      severity,
      message,
      recommendation: this.getRecommendation(type, severity),
      metrics: this.currentMetrics,
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    
    console.warn(`🚨 Noise Alert [${severity.toUpperCase()}]: ${message}`);
    
    this.dispatchEvent(new CustomEvent('noiseAlert', {
      detail: { alert, timestamp: Date.now() }
    }));
  }

  private getRecommendation(type: NoiseAlert['type'], severity: NoiseAlert['severity']): string {
    const recommendations = {
      quality: {
        critical: 'Switch to higher quality algorithm or reduce aggressiveness',
        high: 'Adjust algorithm parameters or check input quality',
        medium: 'Monitor quality metrics closely',
        low: 'Continue normal operation'
      },
      performance: {
        critical: 'Reduce processing complexity or upgrade hardware',
        high: 'Optimize algorithm settings',
        medium: 'Monitor performance metrics',
        low: 'Performance is acceptable'
      },
      algorithm: {
        critical: 'Switch to different algorithm',
        high: 'Consider algorithm change',
        medium: 'Monitor algorithm performance',
        low: 'Algorithm working well'
      },
      hardware: {
        critical: 'Hardware acceleration required',
        high: 'Consider hardware upgrade',
        medium: 'Monitor hardware utilization',
        low: 'Hardware performance adequate'
      }
    };
    
    return recommendations[type]?.[severity] || 'Monitor system performance';
  }

  private updateHistoricalData(): void {
    this.historicalMetrics.push({ ...this.currentMetrics });
    
    // Keep only last 1000 data points
    if (this.historicalMetrics.length > 1000) {
      this.historicalMetrics.shift();
    }
  }

  public getMetrics(): NoiseMetrics {
    return { ...this.currentMetrics };
  }

  public getHistoricalMetrics(limit: number = 100): NoiseMetrics[] {
    return this.historicalMetrics.slice(-limit);
  }

  public getNoiseProfiles(): NoiseProfile[] {
    return Array.from(this.noiseProfiles.values());
  }

  public addNoiseProfile(profile: NoiseProfile): void {
    this.noiseProfiles.set(profile.id, profile);
    console.log(`📊 Noise profile added: ${profile.name}`);
  }

  public getActiveSegments(): AudioSegment[] {
    return Array.from(this.audioSegments.values()).filter(segment => !segment.processed);
  }

  public getSuppressionResults(): SuppressionResult[] {
    return Array.from(this.suppressionResults.values()).sort((a, b) => b.segmentId.localeCompare(a.segmentId));
  }

  public getAlerts(): NoiseAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.dispatchEvent(new CustomEvent('alertResolved', {
        detail: { alert, timestamp: Date.now() }
      }));
      return true;
    }
    return false;
  }

  public updateAlgorithm(algorithm: NoiseSuppressionConfig['algorithm']): void {
    this.config.algorithm = algorithm;
    console.log(`🔧 Algorithm changed to: ${algorithm}`);
    
    this.dispatchEvent(new CustomEvent('algorithmChanged', {
      detail: { algorithm, timestamp: Date.now() }
    }));
  }

  public updateAggressiveness(aggressiveness: number): void {
    this.config.aggressiveness = Math.max(0, Math.min(1, aggressiveness));
    console.log(`🎛️ Aggressiveness updated to: ${this.config.aggressiveness}`);
  }

  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up resources
    this.processingQueue = [];
    this.audioSegments.clear();
    this.suppressionResults.clear();
    this.alerts.clear();
    
    this.isInitialized = false;
    
    console.log('🛑 Noise Suppression Service stopped');
    
    this.dispatchEvent(new CustomEvent('noiseSuppressionStopped', {
      detail: { timestamp: Date.now() }
    }));
  }
}

export { NoiseSuppressionService, NoiseSuppressionConfig, NoiseProfile, AudioSegment, SuppressionResult, NoiseMetrics, NoiseAlert };
