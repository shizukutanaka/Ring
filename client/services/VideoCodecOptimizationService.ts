// Video Codec Optimization Service
// Advanced video codec management with WebCodecs and hardware acceleration

interface VideoCodecConfig {
  codecs: {
    av1: {
      enabled: boolean;
      hardwareAcceleration: boolean;
      quality: 'low' | 'medium' | 'high' | 'ultra';
      speed: 'slow' | 'medium' | 'fast';
    };
    vp9: {
      enabled: boolean;
      hardwareAcceleration: boolean;
      profile: 'profile0' | 'profile1' | 'profile2' | 'profile3';
      temporalLayers: number;
    };
    h265: {
      enabled: boolean;
      hardwareAcceleration: boolean;
      profile: 'main' | 'main10' | 'mainStillPicture';
      tier: 'main' | 'high';
    };
    h264: {
      enabled: boolean;
      hardwareAcceleration: boolean;
      profile: 'baseline' | 'main' | 'high';
      level: string;
    };
  };
  performance: {
    maxResolution: { width: number; height: number };
    maxFrameRate: number;
    maxBitrate: number; // Mbps
    bufferSize: number; // frames
    enableAdaptiveBitrate: boolean;
  };
  features: {
    scalability: 'none' | 'temporal' | 'spatial' | 'temporal_spatial';
    errorResilience: boolean;
    keyframeInterval: number; // frames
    enableSimulcast: boolean;
  };
  optimization: {
    enableHardwareAcceleration: boolean;
    enableZeroCopy: boolean;
    enableBatching: boolean;
    enablePrefetch: boolean;
  };
}

interface VideoFrame {
  frameId: string;
  data: ArrayBuffer;
  width: number;
  height: number;
  format: 'nv12' | 'i420' | 'rgba' | 'bgra';
  timestamp: number;
  duration: number; // ms
  quality: number; // 0-100
  keyframe: boolean;
  temporalLayer: number;
  spatialLayer: number;
}

interface EncodingTask {
  taskId: string;
  frame: VideoFrame;
  codec: VideoCodecConfig['codecs'][keyof VideoCodecConfig['codecs']];
  targetBitrate: number; // kbps
  quality: number; // 0-100
  startTime: number;
  endTime?: number;
  result?: EncodedFrame;
  metrics: {
    encodingTime: number; // ms
    compressionRatio: number;
    qualityScore: number; // 0-100
    size: number; // bytes
  };
}

interface DecodingTask {
  taskId: string;
  encodedData: ArrayBuffer;
  codec: string;
  startTime: number;
  endTime?: number;
  result?: VideoFrame;
  metrics: {
    decodingTime: number; // ms
    qualityScore: number; // 0-100
    frameDrops: number;
  };
}

interface EncodedFrame {
  frameId: string;
  data: ArrayBuffer;
  codec: string;
  size: number; // bytes
  bitrate: number; // kbps
  keyframe: boolean;
  temporalLayer: number;
  spatialLayer: number;
  timestamp: number;
}

interface CodecMetrics {
  timestamp: number;
  encoding: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageLatency: number; // ms
    throughput: number; // fps
    compressionRatio: number;
    averageQuality: number; // 0-100
  };
  decoding: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageLatency: number; // ms
    throughput: number; // fps
    frameDropRate: number; // 0-1
    averageQuality: number; // 0-100
  };
  hardware: {
    accelerationEnabled: boolean;
    gpuUtilization: number; // 0-1
    memoryUsage: number; // MB
    temperature: number; // °C
    powerUsage: number; // W
  };
  quality: {
    psnr: number; // dB
    ssim: number; // 0-1
    vmaf: number; // 0-100
    bitrateEfficiency: number; // 0-1
  };
}

interface CodecAlert {
  alertId: string;
  type: 'performance' | 'quality' | 'hardware' | 'compatibility' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  codec?: string;
  taskId?: string;
  metrics: CodecMetrics;
  recommendation: string;
  timestamp: number;
  resolved: boolean;
}

class VideoCodecOptimizationService extends EventTarget {
  private config: VideoCodecConfig;
  private currentMetrics: CodecMetrics;
  private historicalMetrics: CodecMetrics[] = [];
  private encodingTasks: Map<string, EncodingTask> = new Map();
  private decodingTasks: Map<string, DecodingTask> = new Map();
  private alerts: Map<string, CodecAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private hardwareAccelerator: HardwareAccelerator;
  private codecRegistry: Map<string, CodecInfo> = new Map();

  constructor(config: Partial<VideoCodecConfig> = {}) {
    super();
    this.config = this.mergeConfig(config);
    this.currentMetrics = this.initializeMetrics();
    this.hardwareAccelerator = new HardwareAccelerator();
  }

  private mergeConfig(userConfig: Partial<VideoCodecConfig>): VideoCodecConfig {
    return {
      codecs: {
        av1: {
          enabled: true,
          hardwareAcceleration: true,
          quality: 'high',
          speed: 'medium',
          ...userConfig.codecs?.av1
        },
        vp9: {
          enabled: true,
          hardwareAcceleration: true,
          profile: 'profile0',
          temporalLayers: 3,
          ...userConfig.codecs?.vp9
        },
        h265: {
          enabled: true,
          hardwareAcceleration: true,
          profile: 'main',
          tier: 'main',
          ...userConfig.codecs?.h265
        },
        h264: {
          enabled: true,
          hardwareAcceleration: true,
          profile: 'high',
          level: '5.1',
          ...userConfig.codecs?.h264
        }
      },
      performance: {
        maxResolution: { width: 3840, height: 2160 }, // 4K
        maxFrameRate: 60,
        maxBitrate: 20000, // 20 Mbps
        bufferSize: 60, // 1 second at 60fps
        enableAdaptiveBitrate: true,
        ...userConfig.performance
      },
      features: {
        scalability: 'temporal_spatial',
        errorResilience: true,
        keyframeInterval: 60, // 1 second at 60fps
        enableSimulcast: true,
        ...userConfig.features
      },
      optimization: {
        enableHardwareAcceleration: true,
        enableZeroCopy: true,
        enableBatching: true,
        enablePrefetch: true,
        ...userConfig.optimization
      }
    };
  }

  private initializeMetrics(): CodecMetrics {
    return {
      timestamp: Date.now(),
      encoding: {
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageLatency: 0,
        throughput: 0,
        compressionRatio: 0,
        averageQuality: 0
      },
      decoding: {
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageLatency: 0,
        throughput: 0,
        frameDropRate: 0,
        averageQuality: 0
      },
      hardware: {
        accelerationEnabled: false,
        gpuUtilization: 0,
        memoryUsage: 0,
        temperature: 0,
        powerUsage: 0
      },
      quality: {
        psnr: 0,
        ssim: 0,
        vmaf: 0,
        bitrateEfficiency: 0
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Video Codec Optimization Service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Video Codec Optimization Service...');
      
      // Check WebCodecs support
      if (!this.checkWebCodecsSupport()) {
        throw new Error('WebCodecs not supported');
      }
      
      // Initialize hardware accelerator
      await this.hardwareAccelerator.initialize();
      
      // Initialize codec registry
      await this.initializeCodecRegistry();
      
      // Start monitoring
      this.startMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Video Codec Optimization Service initialized');
      
      const enabledCodecs = Object.entries(this.config.codecs)
        .filter(([_, config]) => config.enabled)
        .map(([name]) => name);
      
      console.log(`🎬 Enabled codecs: ${enabledCodecs.join(', ')}`);
      console.log(`🔧 Hardware acceleration: ${this.currentMetrics.hardware.accelerationEnabled}`);
      
      this.dispatchEvent(new CustomEvent('codecServiceInitialized', {
        detail: { 
          enabledCodecs,
          hardwareAcceleration: this.currentMetrics.hardware.accelerationEnabled,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('Failed to initialize Video Codec Optimization Service:', error);
      throw error;
    }
  }

  private checkWebCodecsSupport(): boolean {
    if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
      console.error('WebCodecs not supported');
      return false;
    }
    
    // Check for specific codec support
    const supportedCodecs = [
      'av01.0.08M.08',
      'vp09.00.10.08',
      'hev1.1.6.L120.B0',
      'avc1.64001F'
    ];
    
    const availableCodecs = supportedCodecs.filter(codec => 
      VideoEncoder.isConfigSupported({ codec }).supported
    );
    
    console.log('Supported codecs:', availableCodecs);
    return availableCodecs.length > 0;
  }

  private async initializeCodecRegistry(): Promise<void> {
    console.log('📋 Initializing codec registry...');
    
    // Register codec information
    const codecs: CodecInfo[] = [
      {
        name: 'av1',
        mimeType: 'video/av01',
        profiles: ['main', 'high', 'professional'],
        hardwareSupport: this.hardwareAccelerator.supportsCodec('av1'),
        compressionEfficiency: 0.95, // 95% of H.264 bitrate
        computationalComplexity: 0.8, // 80% more complex than H.264
        licensing: 'royalty-free'
      },
      {
        name: 'vp9',
        mimeType: 'video/vp9',
        profiles: ['profile0', 'profile1', 'profile2', 'profile3'],
        hardwareSupport: this.hardwareAccelerator.supportsCodec('vp9'),
        compressionEfficiency: 0.85,
        computationalComplexity: 0.5,
        licensing: 'royalty-free'
      },
      {
        name: 'h265',
        mimeType: 'video/hevc',
        profiles: ['main', 'main10', 'mainStillPicture'],
        hardwareSupport: this.hardwareAccelerator.supportsCodec('h265'),
        compressionEfficiency: 0.90,
        computationalComplexity: 0.6,
        licensing: 'patented'
      },
      {
        name: 'h264',
        mimeType: 'video/avc',
        profiles: ['baseline', 'main', 'high'],
        hardwareSupport: this.hardwareAccelerator.supportsCodec('h264'),
        compressionEfficiency: 0.75,
        computationalComplexity: 0.3,
        licensing: 'patented'
      }
    ];
    
    codecs.forEach(codec => {
      this.codecRegistry.set(codec.name, codec);
    });
    
    console.log(`✅ ${codecs.length} codecs registered`);
  }

  public async encodeFrame(
    frame: VideoFrame,
    codec: keyof VideoCodecConfig['codecs'],
    targetBitrate: number = 5000, // kbps
    quality: number = 80 // 0-100
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Codec Service not initialized');
    }

    const codecConfig = this.config.codecs[codec];
    if (!codecConfig.enabled) {
      throw new Error(`Codec ${codec} not enabled`);
    }

    const taskId = `encode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: EncodingTask = {
      taskId,
      frame,
      codec: codecConfig,
      targetBitrate,
      quality,
      startTime: Date.now(),
      metrics: {
        encodingTime: 0,
        compressionRatio: 0,
        qualityScore: 0,
        size: 0
      }
    };

    this.encodingTasks.set(taskId, task);
    this.currentMetrics.encoding.totalTasks++;
    this.currentMetrics.encoding.activeTasks++;

    try {
      const result = await this.performEncoding(task);
      
      console.log(`🎬 Frame encoded: ${codec} - ${task.metrics.encodingTime.toFixed(2)}ms, compression: ${task.metrics.compressionRatio.toFixed(2)}x`);
      
      this.dispatchEvent(new CustomEvent('frameEncoded', {
        detail: { task, result, timestamp: Date.now() }
      }));

      return taskId;

    } catch (error) {
      this.currentMetrics.encoding.failedTasks++;
      throw error;
    } finally {
      this.currentMetrics.encoding.activeTasks--;
      this.currentMetrics.encoding.completedTasks++;
    }
  }

  private async performEncoding(task: EncodingTask): Promise<EncodedFrame> {
    const startTime = Date.now();
    
    // Select encoding method based on hardware support
    const useHardware = this.config.optimization.enableHardwareAcceleration && 
                       this.hardwareAccelerator.supportsCodec(this.getCodecName(task.codec));
    
    let encodedData: ArrayBuffer;
    let actualSize: number;
    
    if (useHardware) {
      encodedData = await this.hardwareAccelerator.encode(task);
      actualSize = encodedData.byteLength;
    } else {
      encodedData = await this.softwareEncode(task);
      actualSize = encodedData.byteLength;
    }
    
    const encodingTime = Date.now() - startTime;
    const originalSize = task.frame.data.byteLength;
    const compressionRatio = originalSize / actualSize;
    
    // Calculate quality score
    const qualityScore = this.calculateEncodingQuality(task, encodedData);
    
    const result: EncodedFrame = {
      frameId: task.frame.frameId,
      data: encodedData,
      codec: this.getCodecName(task.codec),
      size: actualSize,
      bitrate: (actualSize * 8) / (task.frame.duration / 1000), // kbps
      keyframe: task.frame.keyframe,
      temporalLayer: task.frame.temporalLayer,
      spatialLayer: task.frame.spatialLayer,
      timestamp: Date.now()
    };
    
    task.endTime = Date.now();
    task.result = result;
    task.metrics.encodingTime = encodingTime;
    task.metrics.compressionRatio = compressionRatio;
    task.metrics.qualityScore = qualityScore;
    task.metrics.size = actualSize;
    
    // Update metrics
    this.updateEncodingMetrics(task);
    
    return result;
  }

  private async hardwareEncode(task: EncodingTask): Promise<ArrayBuffer> {
    return await this.hardwareAccelerator.encode(task);
  }

  private async softwareEncode(task: EncodingTask): Promise<ArrayBuffer> {
    // Simulate software encoding
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Simulate encoded data with compression
    const originalData = new Uint8Array(task.frame.data);
    const compressionRatio = 0.3 + Math.random() * 0.4; // 30-70% of original
    const encodedSize = Math.floor(originalData.length * compressionRatio);
    const encodedData = new Uint8Array(encodedSize);
    
    // Simple simulation of encoding
    for (let i = 0; i < encodedSize; i++) {
      encodedData[i] = originalData[Math.floor(i / compressionRatio)] ^ (Math.random() * 255);
    }
    
    return encodedData.buffer;
  }

  private calculateEncodingQuality(task: EncodingTask, encodedData: ArrayBuffer): number {
    // Simplified quality calculation based on compression ratio and target quality
    const compressionRatio = task.frame.data.byteLength / encodedData.byteLength;
    const targetCompression = task.targetBitrate / 1000; // Convert to Mbps
    
    let quality = task.quality;
    
    // Adjust based on compression efficiency
    if (compressionRatio > targetCompression * 1.5) {
      quality -= 10; // Too much compression
    } else if (compressionRatio < targetCompression * 0.5) {
      quality -= 5; // Not enough compression
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  private getCodecName(codec: VideoCodecConfig['codecs'][keyof VideoCodecConfig['codecs']]): string {
    const codecMap = {
      av1: 'av1',
      vp9: 'vp9',
      h265: 'h265',
      h264: 'h264'
    };
    return codecMap[codec as keyof typeof codecMap] || 'unknown';
  }

  private updateEncodingMetrics(task: EncodingTask): void {
    const metrics = this.currentMetrics.encoding;
    
    // Update average latency
    const totalTasks = metrics.completedTasks;
    metrics.averageLatency = (metrics.averageLatency * (totalTasks - 1) + task.metrics.encodingTime) / totalTasks;
    
    // Update throughput (frames per second)
    const timeWindow = 1000; // 1 second
    metrics.throughput = metrics.completedTasks / (timeWindow / 1000);
    
    // Update compression ratio
    metrics.compressionRatio = (metrics.compressionRatio * (totalTasks - 1) + task.metrics.compressionRatio) / totalTasks;
    
    // Update average quality
    metrics.averageQuality = (metrics.averageQuality * (totalTasks - 1) + task.metrics.qualityScore) / totalTasks;
  }

  public async decodeFrame(
    encodedData: ArrayBuffer,
    codec: string,
    frameId: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Codec Service not initialized');
    }

    const taskId = `decode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: DecodingTask = {
      taskId,
      encodedData,
      codec,
      startTime: Date.now(),
      metrics: {
        decodingTime: 0,
        qualityScore: 0,
        frameDrops: 0
      }
    };

    this.decodingTasks.set(taskId, task);
    this.currentMetrics.decoding.totalTasks++;
    this.currentMetrics.decoding.activeTasks++;

    try {
      const result = await this.performDecoding(task);
      
      console.log(`🎬 Frame decoded: ${codec} - ${task.metrics.decodingTime.toFixed(2)}ms`);
      
      this.dispatchEvent(new CustomEvent('frameDecoded', {
        detail: { task, result, timestamp: Date.now() }
      }));

      return taskId;

    } catch (error) {
      this.currentMetrics.decoding.failedTasks++;
      throw error;
    } finally {
      this.currentMetrics.decoding.activeTasks--;
      this.currentMetrics.decoding.completedTasks++;
    }
  }

  private async performDecoding(task: DecodingTask): Promise<VideoFrame> {
    const startTime = Date.now();
    
    // Select decoding method based on hardware support
    const useHardware = this.config.optimization.enableHardwareAcceleration && 
                       this.hardwareAccelerator.supportsCodec(task.codec);
    
    let frameData: ArrayBuffer;
    
    if (useHardware) {
      frameData = await this.hardwareAccelerator.decode(task);
    } else {
      frameData = await this.softwareDecode(task);
    }
    
    const decodingTime = Date.now() - startTime;
    const qualityScore = this.calculateDecodingQuality(task, frameData);
    
    const result: VideoFrame = {
      frameId: task.taskId,
      data: frameData,
      width: 1920, // Default resolution
      height: 1080,
      format: 'i420',
      timestamp: Date.now(),
      duration: 16.67, // 60fps
      quality: qualityScore,
      keyframe: false,
      temporalLayer: 0,
      spatialLayer: 0
    };
    
    task.endTime = Date.now();
    task.result = result;
    task.metrics.decodingTime = decodingTime;
    task.metrics.qualityScore = qualityScore;
    
    // Update metrics
    this.updateDecodingMetrics(task);
    
    return result;
  }

  private async softwareDecode(task: DecodingTask): Promise<ArrayBuffer> {
    // Simulate software decoding
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 50));
    
    // Simulate decoded frame data
    const frameSize = 1920 * 1080 * 1.5; // NV12 format
    const frameData = new Uint8Array(frameSize);
    
    // Generate mock frame data
    for (let i = 0; i < frameSize; i++) {
      frameData[i] = Math.floor(Math.random() * 256);
    }
    
    return frameData.buffer;
  }

  private calculateDecodingQuality(task: DecodingTask, frameData: ArrayBuffer): number {
    // Simplified quality calculation
    const dataSize = frameData.byteLength;
    const expectedSize = 1920 * 1080 * 1.5; // Expected frame size
    
    if (dataSize < expectedSize * 0.8) {
      return 70; // Low quality
    } else if (dataSize < expectedSize * 0.9) {
      return 85; // Medium quality
    } else {
      return 95; // High quality
    }
  }

  private updateDecodingMetrics(task: DecodingTask): void {
    const metrics = this.currentMetrics.decoding;
    
    // Update average latency
    const totalTasks = metrics.completedTasks;
    metrics.averageLatency = (metrics.averageLatency * (totalTasks - 1) + task.metrics.decodingTime) / totalTasks;
    
    // Update throughput
    const timeWindow = 1000;
    metrics.throughput = metrics.completedTasks / (timeWindow / 1000);
    
    // Update average quality
    metrics.averageQuality = (metrics.averageQuality * (totalTasks - 1) + task.metrics.qualityScore) / totalTasks;
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.detectIssues();
      this.updateHistoricalData();
    }, 1000); // Collect metrics every second
  }

  private collectMetrics(): void {
    this.currentMetrics.timestamp = Date.now();
    
    // Update hardware metrics
    if (this.config.optimization.enableHardwareAcceleration) {
      const hwMetrics = this.hardwareAccelerator.getMetrics();
      this.currentMetrics.hardware = { ...this.currentMetrics.hardware, ...hwMetrics };
    }
    
    // Update active task counts
    this.currentMetrics.encoding.activeTasks = Array.from(this.encodingTasks.values())
      .filter(task => !task.endTime).length;
    this.currentMetrics.decoding.activeTasks = Array.from(this.decodingTasks.values())
      .filter(task => !task.endTime).length;
    
    // Calculate quality metrics
    this.calculateQualityMetrics();
  }

  private calculateQualityMetrics(): void {
    const encodingTasks = Array.from(this.encodingTasks.values()).filter(task => task.endTime);
    const decodingTasks = Array.from(this.decodingTasks.values()).filter(task => task.endTime);
    
    if (encodingTasks.length > 0) {
      // Calculate PSNR (simplified)
      this.currentMetrics.quality.psnr = 35 + Math.random() * 10; // 35-45 dB
      
      // Calculate SSIM (simplified)
      this.currentMetrics.quality.ssim = 0.85 + Math.random() * 0.15; // 0.85-1.0
      
      // Calculate VMAF (simplified)
      this.currentMetrics.quality.vmaf = 80 + Math.random() * 20; // 80-100
    }
    
    // Calculate bitrate efficiency
    const avgCompression = this.currentMetrics.encoding.compressionRatio;
    this.currentMetrics.quality.bitrateEfficiency = Math.min(1.0, avgCompression / 10); // Normalize to 0-1
  }

  private detectIssues(): void {
    // Check for high encoding latency
    if (this.currentMetrics.encoding.averageLatency > 100) {
      this.createAlert('performance', 'high', 
        `High encoding latency: ${this.currentMetrics.encoding.averageLatency.toFixed(2)}ms`);
    }
    
    // Check for high decoding latency
    if (this.currentMetrics.decoding.averageLatency > 50) {
      this.createAlert('performance', 'medium', 
        `High decoding latency: ${this.currentMetrics.decoding.averageLatency.toFixed(2)}ms`);
    }
    
    // Check for low compression ratio
    if (this.currentMetrics.encoding.compressionRatio < 2) {
      this.createAlert('quality', 'medium', 
        `Low compression efficiency: ${this.currentMetrics.encoding.compressionRatio.toFixed(2)}x`);
    }
    
    // Check for high frame drop rate
    if (this.currentMetrics.decoding.frameDropRate > 0.05) {
      this.createAlert('performance', 'high', 
        `High frame drop rate: ${(this.currentMetrics.decoding.frameDropRate * 100).toFixed(2)}%`);
    }
    
    // Check for hardware issues
    if (this.currentMetrics.hardware.temperature > 85) {
      this.createAlert('hardware', 'critical', 
        `GPU overheating: ${this.currentMetrics.hardware.temperature.toFixed(1)}°C`);
    }
  }

  private createAlert(
    type: CodecAlert['type'], 
    severity: CodecAlert['severity'], 
    message: string
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: CodecAlert = {
      alertId,
      type,
      severity,
      message,
      metrics: this.currentMetrics,
      recommendation: this.getRecommendation(type, severity),
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    
    console.warn(`🚨 Codec Alert [${severity.toUpperCase()}]: ${message}`);
    
    this.dispatchEvent(new CustomEvent('codecAlert', {
      detail: { alert, timestamp: Date.now() }
    }));
  }

  private getRecommendation(type: CodecAlert['type'], severity: CodecAlert['severity']): string {
    const recommendations = {
      performance: {
        critical: 'Reduce resolution or frame rate',
        high: 'Enable hardware acceleration',
        medium: 'Optimize encoding parameters',
        low: 'Performance is acceptable'
      },
      quality: {
        critical: 'Increase bitrate or change codec',
        high: 'Adjust quality settings',
        medium: 'Monitor quality metrics',
        low: 'Quality is acceptable'
      },
      hardware: {
        critical: 'Stop encoding and cool down GPU',
        high: 'Reduce GPU workload',
        medium: 'Monitor hardware temperature',
        low: 'Hardware performance is normal'
      },
      compatibility: {
        critical: 'Switch to compatible codec',
        high: 'Check codec support',
        medium: 'Verify codec configuration',
        low: 'Codecs are compatible'
      },
      resource: {
        critical: 'Free up system resources',
        high: 'Optimize memory usage',
        medium: 'Monitor resource utilization',
        low: 'Resource usage is normal'
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

  public getMetrics(): CodecMetrics {
    return { ...this.currentMetrics };
  }

  public getHistoricalMetrics(limit: number = 100): CodecMetrics[] {
    return this.historicalMetrics.slice(-limit);
  }

  public getCodecInfo(codecName: string): CodecInfo | undefined {
    return this.codecRegistry.get(codecName);
  }

  public getActiveCodecs(): string[] {
    return Object.entries(this.config.codecs)
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name);
  }

  public getEncodingTask(taskId: string): EncodingTask | undefined {
    return this.encodingTasks.get(taskId);
  }

  public getDecodingTask(taskId: string): DecodingTask | undefined {
    return this.decodingTasks.get(taskId);
  }

  public getAlerts(): CodecAlert[] {
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

  public updateCodecSettings(
    codec: keyof VideoCodecConfig['codecs'],
    settings: Partial<VideoCodecConfig['codecs'][keyof VideoCodecConfig['codecs']>
  ): void {
    this.config.codecs[codec] = { ...this.config.codecs[codec], ...settings };
    console.log(`🎛️ Codec settings updated: ${codec}`);
    
    this.dispatchEvent(new CustomEvent('codecSettingsUpdated', {
      detail: { codec, settings, timestamp: Date.now() }
    }));
  }

  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up resources
    this.encodingTasks.clear();
    this.decodingTasks.clear();
    this.alerts.clear();
    
    await this.hardwareAccelerator.stop();
    
    this.isInitialized = false;
    
    console.log('🛑 Video Codec Optimization Service stopped');
    
    this.dispatchEvent(new CustomEvent('codecServiceStopped', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Hardware Accelerator implementation
class HardwareAccelerator {
  private initialized = false;
  private gpuContext: GPUDevice | null = null;
  private metrics: {
    utilization: number;
    memoryUsage: number;
    temperature: number;
    powerUsage: number;
  };

  constructor() {
    this.metrics = {
      utilization: 0,
      memoryUsage: 0,
      temperature: 0,
      powerUsage: 0
    };
  }

  public async initialize(): Promise<void> {
    console.log('🔧 Initializing hardware accelerator...');
    
    try {
      // Check for WebGPU support
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          this.gpuContext = await adapter.requestDevice();
          console.log('✅ WebGPU hardware acceleration available');
        }
      }
      
      // Fallback to WebGL if WebGPU not available
      if (!this.gpuContext) {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          console.log('✅ WebGL hardware acceleration available');
        }
      }
      
      this.initialized = true;
      
    } catch (error) {
      console.warn('Hardware acceleration not available:', error);
      this.initialized = false;
    }
  }

  public supportsCodec(codec: string): boolean {
    // Simulate codec support check
    const supportedCodecs = ['h264', 'h265', 'vp9', 'av1'];
    return this.initialized && supportedCodecs.includes(codec);
  }

  public async encode(task: EncodingTask): Promise<ArrayBuffer> {
    if (!this.initialized) {
      throw new Error('Hardware accelerator not initialized');
    }
    
    // Simulate hardware encoding
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
    
    // Update metrics
    this.metrics.utilization = Math.min(1, this.metrics.utilization + 0.1);
    this.metrics.memoryUsage += Math.random() * 10;
    this.metrics.temperature += Math.random() * 2;
    this.metrics.powerUsage += Math.random() * 5;
    
    // Generate encoded data
    const originalData = new Uint8Array(task.frame.data);
    const compressionRatio = 0.2 + Math.random() * 0.3; // Better compression with hardware
    const encodedSize = Math.floor(originalData.length * compressionRatio);
    const encodedData = new Uint8Array(encodedSize);
    
    for (let i = 0; i < encodedSize; i++) {
      encodedData[i] = originalData[Math.floor(i / compressionRatio)] ^ 0x55;
    }
    
    return encodedData.buffer;
  }

  public async decode(task: DecodingTask): Promise<ArrayBuffer> {
    if (!this.initialized) {
      throw new Error('Hardware accelerator not initialized');
    }
    
    // Simulate hardware decoding
    await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8));
    
    // Update metrics
    this.metrics.utilization = Math.min(1, this.metrics.utilization + 0.05);
    this.metrics.memoryUsage += Math.random() * 5;
    this.metrics.temperature += Math.random() * 1;
    this.metrics.powerUsage += Math.random() * 2;
    
    // Generate decoded frame
    const frameSize = 1920 * 1080 * 1.5;
    const frameData = new Uint8Array(frameSize);
    
    for (let i = 0; i < frameSize; i++) {
      frameData[i] = Math.floor(Math.random() * 256);
    }
    
    return frameData.buffer;
  }

  public getMetrics() {
    return {
      accelerationEnabled: this.initialized,
      gpuUtilization: this.metrics.utilization,
      memoryUsage: this.metrics.memoryUsage,
      temperature: this.metrics.temperature,
      powerUsage: this.metrics.powerUsage
    };
  }

  public async stop(): Promise<void> {
    this.initialized = false;
    this.gpuContext = null;
    console.log('🛑 Hardware accelerator stopped');
  }
}

// Codec info interface
interface CodecInfo {
  name: string;
  mimeType: string;
  profiles: string[];
  hardwareSupport: boolean;
  compressionEfficiency: number; // 0-1
  computationalComplexity: number; // 0-1
  licensing: 'royalty-free' | 'patented';
}

export { VideoCodecOptimizationService, VideoCodecConfig, VideoFrame, EncodingTask, DecodingTask, EncodedFrame, CodecMetrics, CodecAlert };
