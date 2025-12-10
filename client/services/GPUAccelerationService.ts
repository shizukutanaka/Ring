// GPU Acceleration Service
// Hardware acceleration for video processing and AI workloads

interface GPUConfig {
  video: {
    hardwareAcceleration: boolean;
    preferredCodecs: string[];
    maxResolution: { width: number; height: number };
    maxFramerate: number;
    encoding: {
      h264: boolean;
      h265: boolean;
      vp8: boolean;
      vp9: boolean;
      av1: boolean;
    };
    decoding: {
      h264: boolean;
      h265: boolean;
      vp8: boolean;
      vp9: boolean;
      av1: boolean;
    };
  };
  ai: {
    accelerationEnabled: boolean;
    modelCaching: boolean;
    tensorOptimization: boolean;
    batchSize: number;
    precision: 'fp16' | 'fp32' | 'int8';
  };
  performance: {
    powerSaving: boolean;
    thermalThrottling: boolean;
    memoryManagement: boolean;
    loadBalancing: boolean;
  };
  monitoring: {
    enabled: boolean;
    interval: number; // ms
    metricsHistory: number; // number of data points to keep
  };
}

interface GPUMetrics {
  timestamp: number;
  utilization: number; // 0-100%
  memoryUsed: number; // MB
  memoryTotal: number; // MB
  temperature: number; // Celsius
  powerUsage: number; // Watts
  clockFrequency: number; // MHz
  thermalState: 'normal' | 'warm' | 'hot' | 'critical';
  accelerationStatus: {
    videoEncoding: boolean;
    videoDecoding: boolean;
    aiProcessing: boolean;
  };
}

interface VideoProcessingTask {
  taskId: string;
  type: 'encode' | 'decode' | 'transcode';
  codec: string;
  resolution: { width: number; height: number };
  bitrate: number;
  framerate: number;
  startTime: number;
  endTime?: number;
  gpuAccelerated: boolean;
  performance: {
    fps: number;
    latency: number; // ms
    quality: number; // 0-100
  };
}

interface AIProcessingTask {
  taskId: string;
  type: 'stt' | 'tts' | 'llm' | 'sentiment';
  model: string;
  inputSize: number; // bytes
  outputSize: number; // bytes
  startTime: number;
  endTime?: number;
  gpuAccelerated: boolean;
  performance: {
    inferenceTime: number; // ms
    throughput: number; // ops/sec
    accuracy: number; // 0-100
  };
}

interface GPUAlert {
  alertId: string;
  type: 'thermal' | 'memory' | 'power' | 'performance' | 'compatibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  metrics: GPUMetrics;
  timestamp: number;
  resolved: boolean;
}

class GPUAccelerationService extends EventTarget {
  private config: GPUConfig;
  private currentMetrics: GPUMetrics;
  private historicalMetrics: GPUMetrics[] = [];
  private videoTasks: Map<string, VideoProcessingTask> = new Map();
  private aiTasks: Map<string, AIProcessingTask> = new Map();
  private alerts: Map<string, GPUAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private gpuSupported = false;
  private webgpuSupported = false;
  private webglSupported = false;

  constructor(config: Partial<GPUConfig> = {}) {
    super();
    this.config = this.mergeConfig(config);
    this.currentMetrics = this.initializeMetrics();
  }

  private mergeConfig(userConfig: Partial<GPUConfig>): GPUConfig {
    return {
      video: {
        hardwareAcceleration: true,
        preferredCodecs: ['h264', 'vp9', 'av1'],
        maxResolution: { width: 3840, height: 2160 }, // 4K
        maxFramerate: 60,
        encoding: {
          h264: true,
          h265: true,
          vp8: true,
          vp9: true,
          av1: true
        },
        decoding: {
          h264: true,
          h265: true,
          vp8: true,
          vp9: true,
          av1: true
        },
        ...userConfig.video
      },
      ai: {
        accelerationEnabled: true,
        modelCaching: true,
        tensorOptimization: true,
        batchSize: 32,
        precision: 'fp16',
        ...userConfig.ai
      },
      performance: {
        powerSaving: true,
        thermalThrottling: true,
        memoryManagement: true,
        loadBalancing: true,
        ...userConfig.performance
      },
      monitoring: {
        enabled: true,
        interval: 1000,
        metricsHistory: 1000,
        ...userConfig.monitoring
      }
    };
  }

  private initializeMetrics(): GPUMetrics {
    return {
      timestamp: Date.now(),
      utilization: 0,
      memoryUsed: 0,
      memoryTotal: 0,
      temperature: 0,
      powerUsage: 0,
      clockFrequency: 0,
      thermalState: 'normal',
      accelerationStatus: {
        videoEncoding: false,
        videoDecoding: false,
        aiProcessing: false
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('GPU Acceleration Service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing GPU Acceleration Service...');
      
      // Check GPU support
      await this.checkGPUSupport();
      
      // Initialize WebGPU if available
      if (this.webgpuSupported) {
        await this.initializeWebGPU();
      }
      
      // Initialize WebGL as fallback
      if (this.webglSupported) {
        await this.initializeWebGL();
      }
      
      // Start monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
      this.isInitialized = true;
      console.log('✅ GPU Acceleration Service initialized');
      console.log(`📊 GPU Support: WebGPU=${this.webgpuSupported}, WebGL=${this.webglSupported}`);
      
      this.dispatchEvent(new CustomEvent('gpuServiceInitialized', {
        detail: { 
          gpuSupported: this.gpuSupported,
          webgpuSupported: this.webgpuSupported,
          webglSupported: this.webglSupported,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('Failed to initialize GPU Acceleration Service:', error);
      throw error;
    }
  }

  private async checkGPUSupport(): Promise<void> {
    // Check WebGPU support
    this.webgpuSupported = 'gpu' in navigator;
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.webglSupported = !!gl;
    
    this.gpuSupported = this.webgpuSupported || this.webglSupported;
    
    if (!this.gpuSupported) {
      console.warn('⚠️ No GPU acceleration support detected');
      this.createAlert('compatibility', 'medium', 
        'GPU acceleration not supported, falling back to CPU processing');
    }
  }

  private async initializeWebGPU(): Promise<void> {
    if (!this.webgpuSupported) return;
    
    try {
      const gpu = navigator.gpu;
      const adapter = await gpu.requestAdapter();
      
      if (adapter) {
        const device = await adapter.requestDevice();
        console.log('✅ WebGPU initialized successfully');
        
        // Update GPU info
        this.currentMetrics.memoryTotal = this.estimateGPUMemory(adapter);
      }
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      this.webgpuSupported = false;
    }
  }

  private async initializeWebGL(): Promise<void> {
    if (!this.webglSupported) return;
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log(`✅ WebGL initialized - ${vendor}: ${renderer}`);
        }
      }
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      this.webglSupported = false;
    }
  }

  private estimateGPUMemory(adapter: GPUAdapter): number {
    // Estimate GPU memory based on adapter info
    // This is a rough estimation - actual implementation would depend on browser APIs
    return 4096; // Assume 4GB as default
  }

  public async processVideo(
    type: 'encode' | 'decode' | 'transcode',
    codec: string,
    config: {
      resolution: { width: number; height: number };
      bitrate: number;
      framerate: number;
    }
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('GPU Service not initialized');
    }

    const taskId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: VideoProcessingTask = {
      taskId,
      type,
      codec,
      resolution: config.resolution,
      bitrate: config.bitrate,
      framerate: config.framerate,
      startTime: Date.now(),
      gpuAccelerated: this.gpuSupported && this.config.video.hardwareAcceleration,
      performance: {
        fps: 0,
        latency: 0,
        quality: 0
      }
    };

    this.videoTasks.set(taskId, task);
    
    // Update acceleration status
    this.currentMetrics.accelerationStatus.videoEncoding = type === 'encode';
    this.currentMetrics.accelerationStatus.videoDecoding = type === 'decode';
    
    console.log(`🎬 Video task started: ${type} ${codec} ${config.resolution.width}x${config.resolution.height}`);
    
    // Simulate video processing
    this.simulateVideoProcessing(task);
    
    this.dispatchEvent(new CustomEvent('videoTaskStarted', {
      detail: { task, timestamp: Date.now() }
    }));

    return taskId;
  }

  private simulateVideoProcessing(task: VideoProcessingTask): void {
    // Simulate video processing with performance metrics
    setTimeout(() => {
      task.endTime = Date.now();
      task.performance.latency = Math.random() * 50 + 10; // 10-60ms
      task.performance.fps = task.framerate * (0.9 + Math.random() * 0.1); // 90-100% of target
      task.performance.quality = 85 + Math.random() * 15; // 85-100%
      
      console.log(`✅ Video task completed: ${task.taskId} - ${task.performance.latency.toFixed(2)}ms`);
      
      this.dispatchEvent(new CustomEvent('videoTaskCompleted', {
        detail: { task, timestamp: Date.now() }
      }));
    }, task.performance.latency);
  }

  public async processAI(
    type: 'stt' | 'tts' | 'llm' | 'sentiment',
    model: string,
    inputData: ArrayBuffer
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('GPU Service not initialized');
    }

    const taskId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: AIProcessingTask = {
      taskId,
      type,
      model,
      inputSize: inputData.byteLength,
      outputSize: 0,
      startTime: Date.now(),
      gpuAccelerated: this.gpuSupported && this.config.ai.accelerationEnabled,
      performance: {
        inferenceTime: 0,
        throughput: 0,
        accuracy: 0
      }
    };

    this.aiTasks.set(taskId, task);
    
    // Update acceleration status
    this.currentMetrics.accelerationStatus.aiProcessing = true;
    
    console.log(`🤖 AI task started: ${type} ${model} ${inputData.byteLength} bytes`);
    
    // Simulate AI processing
    this.simulateAIProcessing(task);
    
    this.dispatchEvent(new CustomEvent('aiTaskStarted', {
      detail: { task, timestamp: Date.now() }
    }));

    return taskId;
  }

  private simulateAIProcessing(task: AIProcessingTask): void {
    // Simulate AI processing with performance metrics
    setTimeout(() => {
      task.endTime = Date.now();
      task.performance.inferenceTime = Math.random() * 200 + 50; // 50-250ms
      task.performance.throughput = task.inputSize / (task.performance.inferenceTime / 1000); // bytes/sec
      task.performance.accuracy = 90 + Math.random() * 10; // 90-100%
      task.outputSize = task.inputSize * (0.1 + Math.random() * 0.5); // 10-60% of input size
      
      console.log(`✅ AI task completed: ${task.taskId} - ${task.performance.inferenceTime.toFixed(2)}ms`);
      
      this.dispatchEvent(new CustomEvent('aiTaskCompleted', {
        detail: { task, timestamp: Date.now() }
      }));
    }, task.performance.inferenceTime);
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.detectThermalIssues();
      this.updateHistoricalData();
    }, this.config.monitoring.interval);
  }

  private collectMetrics(): void {
    // Simulate GPU metrics collection
    this.currentMetrics.timestamp = Date.now();
    this.currentMetrics.utilization = Math.random() * 100;
    this.currentMetrics.memoryUsed = this.currentMetrics.memoryTotal * (0.3 + Math.random() * 0.4);
    this.currentMetrics.temperature = 30 + Math.random() * 40; // 30-70°C
    this.currentMetrics.powerUsage = 10 + Math.random() * 90; // 10-100W
    this.currentMetrics.clockFrequency = 1000 + Math.random() * 1000; // 1000-2000MHz
    
    // Update thermal state
    if (this.currentMetrics.temperature > 85) {
      this.currentMetrics.thermalState = 'critical';
    } else if (this.currentMetrics.temperature > 75) {
      this.currentMetrics.thermalState = 'hot';
    } else if (this.currentMetrics.temperature > 60) {
      this.currentMetrics.thermalState = 'warm';
    } else {
      this.currentMetrics.thermalState = 'normal';
    }
  }

  private detectThermalIssues(): void {
    const metrics = this.currentMetrics;
    
    if (metrics.thermalState === 'critical') {
      this.createAlert('thermal', 'critical', 
        `Critical temperature: ${metrics.temperature.toFixed(1)}°C`);
    } else if (metrics.thermalState === 'hot') {
      this.createAlert('thermal', 'high', 
        `High temperature: ${metrics.temperature.toFixed(1)}°C`);
    }
    
    if (metrics.memoryUsed / metrics.memoryTotal > 0.9) {
      this.createAlert('memory', 'high', 
        `High memory usage: ${((metrics.memoryUsed / metrics.memoryTotal) * 100).toFixed(1)}%`);
    }
    
    if (metrics.powerUsage > 200) {
      this.createAlert('power', 'medium', 
        `High power consumption: ${metrics.powerUsage.toFixed(1)}W`);
    }
  }

  private createAlert(
    type: GPUAlert['type'], 
    severity: GPUAlert['severity'], 
    message: string
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: GPUAlert = {
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
    
    console.warn(`🚨 GPU Alert [${severity.toUpperCase()}]: ${message}`);
    
    this.dispatchEvent(new CustomEvent('gpuAlert', {
      detail: { alert, timestamp: Date.now() }
    }));
  }

  private getRecommendation(type: GPUAlert['type'], severity: GPUAlert['severity']): string {
    const recommendations = {
      thermal: {
        critical: 'Reduce workload immediately and ensure proper cooling',
        high: 'Consider reducing workload or improving cooling',
        medium: 'Monitor temperature closely'
      },
      memory: {
        critical: 'Free GPU memory immediately',
        high: 'Optimize memory usage or reduce batch size',
        medium: 'Monitor memory usage'
      },
      power: {
        critical: 'Reduce power consumption immediately',
        high: 'Optimize power usage',
        medium: 'Monitor power consumption'
      },
      performance: {
        critical: 'Switch to CPU processing',
        high: 'Consider fallback to CPU',
        medium: 'Monitor performance'
      },
      compatibility: {
        critical: 'GPU not available, using CPU fallback',
        high: 'Limited GPU support',
        medium: 'Check GPU drivers'
      }
    };
    
    return recommendations[type]?.[severity] || 'Monitor GPU performance';
  }

  private updateHistoricalData(): void {
    this.historicalMetrics.push({ ...this.currentMetrics });
    
    // Keep only specified number of data points
    if (this.historicalMetrics.length > this.config.monitoring.metricsHistory) {
      this.historicalMetrics.shift();
    }
  }

  public getMetrics(): GPUMetrics {
    return { ...this.currentMetrics };
  }

  public getHistoricalMetrics(limit?: number): GPUMetrics[] {
    if (limit) {
      return this.historicalMetrics.slice(-limit);
    }
    return this.historicalMetrics;
  }

  public getActiveVideoTasks(): VideoProcessingTask[] {
    return Array.from(this.videoTasks.values()).filter(task => !task.endTime);
  }

  public getActiveAITasks(): AIProcessingTask[] {
    return Array.from(this.aiTasks.values()).filter(task => !task.endTime);
  }

  public getAlerts(): GPUAlert[] {
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

  public getGPUInfo(): {
    supported: boolean;
    webgpu: boolean;
    webgl: boolean;
    memory: number;
    thermalState: string;
  } {
    return {
      supported: this.gpuSupported,
      webgpu: this.webgpuSupported,
      webgl: this.webglSupported,
      memory: this.currentMetrics.memoryTotal,
      thermalState: this.currentMetrics.thermalState
    };
  }

  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up resources
    this.videoTasks.clear();
    this.aiTasks.clear();
    this.alerts.clear();
    
    this.isInitialized = false;
    
    console.log('🛑 GPU Acceleration Service stopped');
    
    this.dispatchEvent(new CustomEvent('gpuServiceStopped', {
      detail: { timestamp: Date.now() }
    }));
  }
}

export { GPUAccelerationService, GPUConfig, GPUMetrics, VideoProcessingTask, AIProcessingTask, GPUAlert };
