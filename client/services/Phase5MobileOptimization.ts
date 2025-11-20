/**
 * Phase 5: Mobile Optimization
 *
 * Research-backed implementation based on:
 * - Device capability detection (screen size, CPU, RAM)
 * - Network type detection (4G, 5G, LTE, WiFi)
 * - Adaptive resolution and framerate for mobile
 * - Battery drain monitoring and throttling
 * - Mobile-specific audio enhancement
 * - Low-light video enhancement
 */

/**
 * Device Capability Profile
 */
export interface DeviceProfile {
  platform: 'iOS' | 'Android' | 'Desktop';
  screenWidth: number;
  screenHeight: number;
  dpi: number;
  cpuCores: number;
  totalMemory: number;
  availableMemory: number;
  batteryLevel: number;
  isCharging: boolean;
  hasHardwareVideoCodec: boolean;
  supportedCodecs: string[];
  maxResolution: { width: number; height: number };
}

/**
 * Network Profile
 */
export interface NetworkProfile {
  type: '4g' | '5g' | 'lte' | 'wifi' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  saveData: boolean;
  isCellular: boolean;
}

/**
 * Mobile Optimization Service
 * Handles mobile-specific optimizations for call quality and battery
 */
export class MobileOptimizationService {
  private deviceProfile: DeviceProfile | null = null;
  private networkProfile: NetworkProfile | null = null;
  private batteryHistory: Array<{ timestamp: number; level: number }> = [];
  private networkMetrics: Array<{
    timestamp: number;
    downlink: number;
    rtt: number;
  }> = [];

  private batteryDrainRate = 0; // percentage per minute
  private isLowBatteryMode = false;
  private isLowLightMode = false;

  /**
   * Detect device capabilities
   */
  detectDeviceCapabilities(): DeviceProfile {
    // Screen detection
    const screenWidth = window.innerWidth || 360;
    const screenHeight = window.innerHeight || 640;
    const dpi = window.devicePixelRatio || 1;

    // Platform detection
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: 'iOS' | 'Android' | 'Desktop' = 'Desktop';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      platform = 'iOS';
    } else if (userAgent.includes('android')) {
      platform = 'Android';
    }

    // Memory estimation (Navigator.deviceMemory if available)
    const totalMemory =
      (navigator as any).deviceMemory || (platform === 'Desktop' ? 8 : 4); // GB
    const availableMemory = totalMemory * 0.6; // Estimate 60% available

    // CPU estimation
    const cpuCores = navigator.hardwareConcurrency || (platform === 'Desktop' ? 4 : 2);

    // Battery info (Battery Status API)
    let batteryLevel = 100;
    let isCharging = false;

    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryLevel = Math.round(battery.level * 100);
        isCharging = battery.charging;
      });
    }

    // Codec support detection
    const supportedCodecs: string[] = [];
    const codecTests = {
      vp9: "video/webm; codecs='vp9'",
      h264: "video/mp4; codecs='avc1.42E01E'",
      av1: "video/mp4; codecs='av01.0.08M.08'",
      opus: "audio/opus",
      vorbis: "audio/ogg; codecs='vorbis'"
    };

    for (const [codec, mimeType] of Object.entries(codecTests)) {
      if (this.isCodecSupported(mimeType)) {
        supportedCodecs.push(codec);
      }
    }

    // Determine max resolution based on device
    const maxResolution = this.getMaxResolutionForDevice(screenWidth, screenHeight, platform);

    // Check hardware video codec support
    const hasHardwareVideoCodec = this.detectHardwareAcceleration();

    this.deviceProfile = {
      platform,
      screenWidth,
      screenHeight,
      dpi,
      cpuCores,
      totalMemory,
      availableMemory,
      batteryLevel,
      isCharging,
      hasHardwareVideoCodec,
      supportedCodecs,
      maxResolution
    };

    return this.deviceProfile;
  }

  /**
   * Detect network type and quality
   */
  detectNetworkType(): NetworkProfile {
    let type: '4g' | '5g' | 'lte' | 'wifi' | 'unknown' = 'unknown';
    let effectiveType: 'slow-2g' | '2g' | '3g' | '4g' = '4g';

    // Network Information API
    const connection = (navigator as any).connection || (navigator as any).mozConnection;

    if (connection) {
      const connType = connection.type || connection.effectiveType;
      effectiveType = connection.effectiveType;

      if (connType === 'ethernet' || connType === 'wifi') {
        type = 'wifi';
      } else if (connType === '5g') {
        type = '5g';
      } else if (connType === '4g' || connType === 'lte') {
        type = '4g';
      }

      // RTT (Round Trip Time)
      const rtt = connection.rtt || 50; // Default 50ms
      const downlink = connection.downlink || 5; // Mbps
      const saveData = connection.saveData || false;

      this.networkProfile = {
        type,
        downlink,
        rtt,
        effectiveType,
        saveData,
        isCellular: type !== 'wifi' && type !== 'unknown'
      };

      // Record metric
      this.networkMetrics.push({
        timestamp: Date.now(),
        downlink,
        rtt
      });
    } else {
      // Fallback to default WiFi profile
      this.networkProfile = {
        type: 'wifi',
        downlink: 10,
        rtt: 30,
        effectiveType: '4g',
        saveData: false,
        isCellular: false
      };
    }

    return this.networkProfile;
  }

  /**
   * Get optimized video settings for device
   */
  getOptimizedVideoSettings(): {
    resolution: { width: number; height: number };
    frameRate: number;
    bitrate: number;
    codec: string;
  } {
    if (!this.deviceProfile || !this.networkProfile) {
      return this.getDefaultVideoSettings();
    }

    // Base resolution on device screen
    let resolution = { ...this.deviceProfile.maxResolution };

    // Adapt based on network
    if (this.networkProfile.downlink < 2) {
      // Slow connection: 360p, 15fps
      resolution = { width: 480, height: 360 };
    } else if (this.networkProfile.downlink < 5) {
      // Medium connection: 540p, 24fps
      resolution = { width: 960, height: 540 };
    } else if (this.networkProfile.downlink < 10) {
      // Good connection: 720p, 30fps
      resolution = { width: 1280, height: 720 };
    } else {
      // Excellent: full resolution
      resolution = this.deviceProfile.maxResolution;
    }

    // Adapt framerate based on CPU
    const frameRate =
      this.deviceProfile.cpuCores >= 4 ? 30 : this.deviceProfile.cpuCores >= 2 ? 24 : 15;

    // Adapt bitrate based on battery status
    let bitrate = 1500; // Default 1500 kbps
    if (this.isLowBatteryMode) {
      bitrate = 800; // Reduce for battery saving
    } else if (this.deviceProfile.isCharging) {
      bitrate = 2500; // Increase when charging
    }

    // Select codec (prefer H.264 on mobile for efficiency)
    const codec =
      this.deviceProfile.platform === 'Desktop'
        ? 'vp9' // VP9 for desktop
        : 'h264'; // H.264 for mobile (better battery efficiency)

    return { resolution, frameRate, bitrate, codec };
  }

  /**
   * Get optimized audio settings
   */
  getOptimizedAudioSettings(): {
    bitrate: number;
    codec: string;
    maxAverageBitrate: number;
  } {
    // Opus codec with adaptive bitrate
    // Mobile: 24-64 kbps, Desktop: 64-128 kbps
    const isLowestBitrate = this.networkProfile?.downlink ?? 10 < 1;
    const baseBitrate = this.deviceProfile?.platform === 'Mobile' ? 32 : 64;

    let bitrate = baseBitrate;
    if (isLowestBitrate) {
      bitrate = 24; // Ultra low bandwidth
    } else if (this.isLowBatteryMode) {
      bitrate = 32; // Battery saving
    } else if (this.deviceProfile?.platform === 'Desktop') {
      bitrate = 128; // Desktop max
    }

    return {
      bitrate,
      codec: 'opus', // Opus is optimal for mobile
      maxAverageBitrate: bitrate
    };
  }

  /**
   * Monitor battery drain rate
   */
  monitorBatteryDrain(): {
    drainRate: number; // percentage per minute
    estimatedTalkTime: number; // minutes
  } {
    const currentBattery = this.deviceProfile?.batteryLevel ?? 100;

    // Record battery level
    this.batteryHistory.push({
      timestamp: Date.now(),
      level: currentBattery
    });

    // Keep only last 10 minutes of history
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    this.batteryHistory = this.batteryHistory.filter(
      (entry) => entry.timestamp > tenMinutesAgo
    );

    // Calculate drain rate
    if (this.batteryHistory.length > 1) {
      const first = this.batteryHistory[0];
      const last = this.batteryHistory[this.batteryHistory.length - 1];
      const timeDiffMinutes = (last.timestamp - first.timestamp) / (1000 * 60);
      const levelDiff = first.level - last.level;

      this.batteryDrainRate = levelDiff / timeDiffMinutes;
    }

    // Estimate talk time
    let estimatedTalkTime = Infinity;
    if (this.batteryDrainRate > 0) {
      estimatedTalkTime = currentBattery / this.batteryDrainRate;
    }

    // Update low battery mode if below 20%
    this.isLowBatteryMode = currentBattery < 20;

    return {
      drainRate: this.batteryDrainRate,
      estimatedTalkTime: Math.max(0, estimatedTalkTime)
    };
  }

  /**
   * Detect low-light conditions and apply enhancement
   */
  detectLowLightConditions(
    videoFrame: { brightness: number; contrast: number }
  ): boolean {
    // Simple brightness detection (0-255)
    const brightness = videoFrame.brightness;

    this.isLowLightMode = brightness < 80; // Threshold for low light

    return this.isLowLightMode;
  }

  /**
   * Get low-light enhancement settings
   */
  getLowLightEnhancement(): {
    enabled: boolean;
    exposureCompensation: number;
    noiseReduction: string;
    colorGain: number;
  } {
    if (!this.isLowLightMode) {
      return {
        enabled: false,
        exposureCompensation: 0,
        noiseReduction: 'off',
        colorGain: 1.0
      };
    }

    return {
      enabled: true,
      exposureCompensation: 1.5, // Increase exposure
      noiseReduction: 'medium', // Apply noise reduction
      colorGain: 1.2 // Enhance color
    };
  }

  /**
   * Handle connection migration (WiFi -> Cellular)
   */
  onConnectionMigration(oldNetwork: NetworkProfile, newNetwork: NetworkProfile): void {
    // If migrating from WiFi to cellular, reduce quality
    if (oldNetwork.type === 'wifi' && newNetwork.isCellular) {
      // Trigger quality reduction
    }

    // If migrating from cellular to WiFi, can increase quality
    if (oldNetwork.isCellular && newNetwork.type === 'wifi') {
      // Can increase quality
    }

    this.networkProfile = newNetwork;
  }

  /**
   * Check if codec is supported
   */
  private isCodecSupported(mimeType: string): boolean {
    const audio = new Audio();
    return audio.canPlayType(mimeType) !== '';
  }

  /**
   * Detect hardware video codec acceleration
   */
  private detectHardwareAcceleration(): boolean {
    // Check if hardware video codec is available
    // On mobile, check for platform-specific hardware acceleration
    if (this.deviceProfile?.platform === 'iOS') {
      return true; // iOS typically has hardware H.264
    } else if (this.deviceProfile?.platform === 'Android') {
      // Android varies; assume true for recent devices
      return true;
    }
    return false; // Desktop may vary
  }

  /**
   * Get max resolution based on device
   */
  private getMaxResolutionForDevice(
    screenWidth: number,
    screenHeight: number,
    platform: string
  ): { width: number; height: number } {
    // Mobile: limit to screen resolution (or lower)
    // Desktop: can go higher
    if (platform === 'Desktop') {
      return { width: 1920, height: 1080 }; // 1080p
    } else {
      // Mobile: 720p max or screen resolution
      const maxWidth = Math.min(screenWidth * 2, 1280); // Physical pixels
      const maxHeight = Math.min(screenHeight * 2, 720);
      return { width: maxWidth, height: maxHeight };
    }
  }

  /**
   * Get default video settings
   */
  private getDefaultVideoSettings(): {
    resolution: { width: number; height: number };
    frameRate: number;
    bitrate: number;
    codec: string;
  } {
    return {
      resolution: { width: 640, height: 480 },
      frameRate: 24,
      bitrate: 1000,
      codec: 'h264'
    };
  }

  /**
   * Get service diagnostics
   */
  getDiagnostics(): any {
    return {
      deviceProfile: this.deviceProfile,
      networkProfile: this.networkProfile,
      batteryDrainRate: this.batteryDrainRate,
      isLowBatteryMode: this.isLowBatteryMode,
      isLowLightMode: this.isLowLightMode,
      batteryHistoryPoints: this.batteryHistory.length,
      networkMetricsPoints: this.networkMetrics.length,
      videoSettings: this.getOptimizedVideoSettings(),
      audioSettings: this.getOptimizedAudioSettings()
    };
  }
}

export { MobileOptimizationService };
