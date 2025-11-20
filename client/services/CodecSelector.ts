/**
 * Intelligent Codec Selection Algorithm (Enhanced v2)
 *
 * Selects optimal codecs based on:
 * - Browser capabilities
 * - Network quality
 * - Device capabilities
 * - Platform (iOS, Android, Desktop)
 * - Hardware acceleration availability
 * - Call type (p2p vs conference)
 * - Participant count
 * - User preferences
 *
 * Research-backed implementation following RFC 7742, RFC 7874,
 * WebRTC for the Curious, and modern codec best practices.
 *
 * IMPROVEMENTS IMPLEMENTED (MUST-HAVE):
 * 1. Fixed H.264 simulcast bug (line ~340)
 * 2. Platform detection (iOS, Android, Desktop)
 * 3. Hardware acceleration detection via WebCodecs API
 * 4. Participant count in decision logic
 * 5. Mutual exclusion of simulcast and SVC
 * 6. Opus configuration with DTX, FEC, bitrate
 */

import { ClientCapabilities } from './CodecDetection';

export interface NetworkQuality {
  bandwidth: number; // kbps
  rtt: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
}

export interface OpusConfiguration {
  codec: 'opus';
  bitrate: number;
  dtx: boolean; // Discontinuous Transmission (50-70% savings in conference)
  fec: boolean; // Forward Error Correction (enable when packet loss > 2%)
  maxPlaybackRate: number;
  maxAverageBitrate?: number;
  useinbandfec?: boolean;
  usedtx?: boolean;
  sdpFmtpLine?: string;
}

export interface CodecConfiguration {
  videoCodec: string;
  audioCodec: string | OpusConfiguration;
  resolution: string;
  framerate: number;
  bitrate: number;
  enableSimulcast: boolean;
  enableSVC: boolean;
  scalabilityMode?: string;
  targetBitrates?: {
    low: number;
    medium: number;
    high: number;
  };
}

export type Platform = 'iOS' | 'Android' | 'Desktop' | 'Unknown';

export interface HardwareAccelerationInfo {
  h264: boolean;
  vp9: boolean;
  av1: boolean;
}

export class CodecSelector {
  private static readonly CODEC_PRIORITY = ['av1', 'vp9', 'h264'];

  // Platform-specific codec priorities
  private static readonly PLATFORM_CODEC_PRIORITY: Record<Platform, string[]> = {
    iOS: ['h264'], // All iOS browsers use WebKit, only H.264 hardware-accelerated
    Android: ['h264', 'vp9', 'av1'], // Hardware acceleration critical for battery
    Desktop: ['av1', 'vp9', 'h264'], // Desktop can use more advanced codecs
    Unknown: ['h264', 'vp9', 'av1'] // Fallback
  };

  /**
   * Detect platform (iOS, Android, Desktop)
   * Critical for codec selection: iOS MUST use H.264
   */
  static detectPlatform(): Platform {
    const ua = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      return 'iOS';
    }
    if (/android/.test(ua)) {
      return 'Android';
    }
    if (/windows|macos|linux/.test(ua) || /x11|macintosh|windows nt/.test(ua)) {
      return 'Desktop';
    }

    return 'Unknown';
  }

  /**
   * Detect hardware acceleration support for each codec
   * Uses WebCodecs API (Chrome 94+, Edge 94+)
   */
  static async detectHardwareAcceleration(): Promise<HardwareAccelerationInfo> {
    const result: HardwareAccelerationInfo = {
      h264: false,
      vp9: false,
      av1: false
    };

    // Check if WebCodecs API available
    if (!('VideoEncoder' in window)) {
      console.warn('⚠️  WebCodecs API not available, assuming software codec');
      return result;
    }

    try {
      // Test H.264
      const h264Config = {
        codec: 'avc1.42E01F', // H.264 Baseline
        width: 1280,
        height: 720,
        bitrate: 2000000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware' as const
      };
      let support = await (VideoEncoder as any).isConfigSupported(h264Config);
      result.h264 = support.supported;

      // Test VP9
      const vp9Config = {
        codec: 'vp09.00.10.08', // VP9 Profile 0
        width: 1280,
        height: 720,
        bitrate: 2000000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware' as const
      };
      support = await (VideoEncoder as any).isConfigSupported(vp9Config);
      result.vp9 = support.supported;

      // Test AV1
      const av1Config = {
        codec: 'av01.0.05M.08', // AV1 Main Profile
        width: 1280,
        height: 720,
        bitrate: 2000000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware' as const
      };
      support = await (VideoEncoder as any).isConfigSupported(av1Config);
      result.av1 = support.supported;
    } catch (error) {
      console.warn('⚠️  Hardware acceleration detection failed:', error);
    }

    console.log('🔧 Hardware acceleration:', result);
    return result;
  }

  /**
   * Get battery status if available (Battery Status API)
   */
  static async getBatteryLevel(): Promise<number | null> {
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        return battery.level;
      }
    } catch (error) {
      // Battery API not available
    }
    return null;
  }

  /**
   * Select optimal codec configuration
   *
   * NEW PARAMETERS:
   * - participantCount: Number of participants in conference
   * - platform: Detected platform (iOS, Android, Desktop)
   * - hardwareAcceleration: Hardware acceleration info
   */
  static async selectOptimalCodecs(
    clientCapabilities: ClientCapabilities,
    networkQuality: NetworkQuality,
    callType: 'p2p' | 'conference' = 'p2p',
    userPreference?: { videoCodec?: string; resolution?: string },
    participantCount: number = 2,
    platform?: Platform,
    hardwareAcceleration?: HardwareAccelerationInfo
  ): Promise<CodecConfiguration> {
    // Auto-detect platform if not provided
    if (!platform) {
      platform = this.detectPlatform();
    }

    // Auto-detect hardware acceleration if not provided
    if (!hardwareAcceleration) {
      hardwareAcceleration = await this.detectHardwareAcceleration();
    }

    const videoCodec = this.selectVideoCodec(
      clientCapabilities,
      networkQuality,
      callType,
      userPreference?.videoCodec,
      platform,
      hardwareAcceleration,
      participantCount
    );

    const audioCodec = this.selectAudioCodec(
      clientCapabilities,
      callType,
      networkQuality,
      participantCount
    );

    const { resolution, framerate, bitrate } = this.selectQualitySettings(
      videoCodec,
      networkQuality,
      callType,
      userPreference?.resolution,
      participantCount
    );

    // IMPROVEMENT #5: Mutual exclusion of simulcast and SVC
    const shouldUseSimulcast = this.shouldEnableSimulcast(
      clientCapabilities,
      videoCodec,
      callType,
      participantCount
    );

    const shouldUseSVC = this.shouldEnableSVC(
      clientCapabilities,
      videoCodec,
      networkQuality,
      callType,
      participantCount
    );

    // Mutual exclusion: SVC preferred for VP9/AV1, simulcast for H.264
    let enableSimulcast = false;
    let enableSVC = false;

    if (videoCodec === 'h264') {
      // H.264 MUST use simulcast (no SVC support)
      enableSimulcast = shouldUseSimulcast;
      enableSVC = false;
    } else if (['av1', 'vp9'].includes(videoCodec)) {
      // VP9/AV1: Choose based on conditions
      // Prefer SVC for small conferences, simulcast for large
      if (participantCount < 15) {
        enableSVC = shouldUseSVC;
        enableSimulcast = false;
      } else {
        enableSimulcast = shouldUseSimulcast;
        enableSVC = false;
      }
    }

    const scalabilityMode = this.getScalabilityMode(videoCodec, enableSVC, participantCount);

    const targetBitrates = enableSimulcast ? this.calculateTargetBitrates(bitrate) : undefined;

    return {
      videoCodec,
      audioCodec,
      resolution,
      framerate,
      bitrate,
      enableSimulcast,
      enableSVC,
      scalabilityMode,
      targetBitrates
    };
  }

  /**
   * Select video codec based on:
   * - Platform (iOS must use H.264)
   * - Hardware acceleration availability
   * - Bandwidth and network quality
   * - Call type and participant count
   */
  private static selectVideoCodec(
    caps: ClientCapabilities,
    network: NetworkQuality,
    callType: string,
    userPreference: string | undefined,
    platform: Platform,
    hardwareAccel: HardwareAccelerationInfo,
    participantCount: number
  ): string {
    // IMPROVEMENT #2: Platform-specific codec selection
    // iOS MUST use H.264 - all browsers use WebKit
    if (platform === 'iOS') {
      if (this.isCodecAvailable(caps, 'h264')) {
        console.log('📺 Selected H.264 (iOS - mandatory)');
        return 'h264';
      }
    }

    // User preference (if available on platform)
    if (userPreference && this.isCodecAvailable(caps, userPreference)) {
      console.log(`📺 Using user-preferred codec: ${userPreference}`);
      return userPreference;
    }

    // IMPROVEMENT #3: Hardware acceleration awareness
    // On mobile, prefer hardware-accelerated H.264 for battery life
    if (platform === 'Android' && hardwareAccel.h264) {
      if (this.isCodecAvailable(caps, 'h264')) {
        console.log('📺 Selected H.264 (Android - hardware accelerated)');
        return 'h264';
      }
    }

    // IMPROVEMENT #4: Participant count logic
    // Large conferences: prefer H.264 for compatibility
    if (callType === 'conference' && participantCount >= 15) {
      if (this.isCodecAvailable(caps, 'h264')) {
        console.log(`📺 Selected H.264 (large conference ${participantCount} participants)`);
        return 'h264';
      }
    }

    // For conference on poor network: use H.264
    if (callType === 'conference' && network.bandwidth < 2000) {
      if (this.isCodecAvailable(caps, 'h264')) {
        console.log('📺 Selected H.264 (conference + poor network)');
        return 'h264';
      }
    }

    // For p2p with good network and hardware support: try AV1
    if (callType === 'p2p' && network.bandwidth > 5000) {
      if (hardwareAccel.av1 && this.isCodecAvailable(caps, 'av1')) {
        console.log('📺 Selected AV1 (p2p + high bandwidth + hardware support)');
        return 'av1';
      }
      if (this.isCodecAvailable(caps, 'av1')) {
        console.log('📺 Selected AV1 (p2p + high bandwidth)');
        return 'av1';
      }
    }

    // Platform-specific priority
    const priorityList = this.PLATFORM_CODEC_PRIORITY[platform];
    for (const codec of priorityList) {
      if (this.isCodecAvailable(caps, codec)) {
        console.log(`📺 Selected ${codec.toUpperCase()} (platform priority)`);
        return codec;
      }
    }

    // Fallback to default priority
    for (const codec of this.CODEC_PRIORITY) {
      if (this.isCodecAvailable(caps, codec)) {
        console.log(`📺 Selected ${codec.toUpperCase()} (default priority)`);
        return codec;
      }
    }

    console.warn('⚠️  No supported video codec found!');
    return 'h264';
  }

  /**
   * IMPROVEMENT #6: Opus configuration with DTX and FEC
   * Audio codec selection with full Opus configuration
   */
  private static selectAudioCodec(
    caps: ClientCapabilities,
    callType: string,
    network: NetworkQuality,
    participantCount: number
  ): string | OpusConfiguration {
    // Find Opus codec
    const opusCodec = caps.audio.codecs.find(c =>
      c.mimeType.toLowerCase().includes('opus')
    );

    if (!opusCodec) {
      // Fallback to first available
      if (caps.audio.codecs.length > 0) {
        const codec = caps.audio.codecs[0].mimeType.split('/')[1].toLowerCase();
        console.log(`🔊 Selected audio codec (fallback): ${codec}`);
        return codec;
      }
      return 'opus';
    }

    // Configure Opus based on call type and network
    let bitrate: number;
    let dtx: boolean;
    let fec: boolean;

    if (callType === 'p2p') {
      // P2P: High quality
      bitrate = 48000; // 48 kbps
      dtx = false; // DTX off for p2p
      fec = network.packetLoss > 2; // Enable FEC if packet loss > 2%
    } else {
      // Conference: Balance quality and bandwidth
      if (participantCount >= 10) {
        bitrate = 16000; // 16 kbps (many participants)
      } else if (participantCount >= 3) {
        bitrate = 32000; // 32 kbps (few participants)
      } else {
        bitrate = 32000; // 32 kbps (default)
      }

      dtx = true; // DTX on for conference (50-70% savings)
      fec = network.packetLoss > 2; // FEC if packet loss > 2%
    }

    // Generate SDP fmtpLine for Opus configuration
    const sdpParts: string[] = [
      'minptime=10',
      `maxaveragebitrate=${bitrate}`
    ];

    if (fec) {
      sdpParts.push('useinbandfec=1');
    }

    if (dtx) {
      sdpParts.push('usedtx=1');
    }

    console.log(`🔊 Selected Opus configuration (bitrate: ${bitrate}, DTX: ${dtx}, FEC: ${fec})`);

    return {
      codec: 'opus',
      bitrate,
      dtx,
      fec,
      maxPlaybackRate: 48000,
      maxAverageBitrate: bitrate,
      useinbandfec: fec,
      usedtx: dtx,
      sdpFmtpLine: sdpParts.join(';')
    };
  }

  /**
   * Select resolution and framerate based on codec, network, and participant count
   */
  private static selectQualitySettings(
    videoCodec: string,
    network: NetworkQuality,
    callType: string,
    userResolution: string | undefined,
    participantCount: number
  ): { resolution: string; framerate: number; bitrate: number } {
    // User preference overrides algorithm
    if (userResolution) {
      return {
        resolution: userResolution,
        framerate: 30,
        bitrate: this.estimatedBitrate(videoCodec, userResolution, 30, network.bandwidth)
      };
    }

    // IMPROVEMENT #4: Participant count affects quality
    if (callType === 'conference') {
      // Very limited bandwidth for large conferences
      if (participantCount >= 15) {
        if (network.bandwidth < 1500) {
          return {
            resolution: '320x240',
            framerate: 15,
            bitrate: this.estimatedBitrate(videoCodec, '320x240', 15, network.bandwidth)
          };
        }
        if (network.bandwidth < 2500) {
          return {
            resolution: '640x480',
            framerate: 15,
            bitrate: this.estimatedBitrate(videoCodec, '640x480', 15, network.bandwidth)
          };
        }
      }

      // Normal conference bandwidth
      if (network.bandwidth < 1500) {
        return {
          resolution: '640x480',
          framerate: 15,
          bitrate: this.estimatedBitrate(videoCodec, '640x480', 15, network.bandwidth)
        };
      }
      if (network.bandwidth < 3000) {
        return {
          resolution: '1280x720',
          framerate: 24,
          bitrate: this.estimatedBitrate(videoCodec, '1280x720', 24, network.bandwidth)
        };
      }
    }

    // P2P with good network: high quality
    if (network.bandwidth > 5000) {
      return {
        resolution: '1920x1080',
        framerate: 30,
        bitrate: this.estimatedBitrate(videoCodec, '1920x1080', 30, network.bandwidth)
      };
    }

    // Default: 720p
    if (network.bandwidth > 2500) {
      return {
        resolution: '1280x720',
        framerate: 30,
        bitrate: this.estimatedBitrate(videoCodec, '1280x720', 30, network.bandwidth)
      };
    }

    // Low bandwidth: 480p
    return {
      resolution: '640x480',
      framerate: 24,
      bitrate: this.estimatedBitrate(videoCodec, '640x480', 24, network.bandwidth)
    };
  }

  /**
   * Calculate estimated bitrate in kbps using bits-per-pixel approach
   */
  private static estimatedBitrate(
    codec: string,
    resolution: string,
    framerate: number,
    availableBandwidth: number
  ): number {
    // Bits per pixel (BPP) by codec
    const bppMap: Record<string, number> = {
      av1: 0.07, // AV1: 0.07 BPP
      vp9: 0.09, // VP9: 0.09 BPP
      h264: 0.12 // H.264: 0.12 BPP
    };

    const bpp = bppMap[codec] || 0.12;

    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);
    if (!width || !height) {
      // Fallback to old method
      const baseMap: Record<string, number> = {
        av1: 1500,
        vp9: 2000,
        h264: 3000
      };
      return baseMap[codec] || 3000;
    }

    // Calculate bitrate using bits-per-pixel: BPP * width * height * fps / 1000
    let targetBitrate = (width * height * framerate * bpp) / 1000;

    // Constrain to available bandwidth (leave 20% margin)
    const maxBitrate = availableBandwidth * 0.8;
    targetBitrate = Math.min(targetBitrate, maxBitrate);

    return Math.round(targetBitrate);
  }

  /**
   * IMPROVEMENT #5: Determine if simulcast should be enabled
   * H.264 MUST use simulcast (no SVC support)
   */
  private static shouldEnableSimulcast(
    caps: ClientCapabilities,
    videoCodec: string,
    callType: string,
    participantCount: number
  ): boolean {
    // Only enable for conference calls
    if (callType !== 'conference') {
      return false;
    }

    // H.264 MUST use simulcast (FIXED BUG: was returning false)
    if (videoCodec === 'h264') {
      return caps.video.simulcastSupport && participantCount >= 3;
    }

    // VP9/AV1: Consider simulcast for large conferences
    if (participantCount >= 15 && caps.video.simulcastSupport) {
      return true;
    }

    return false;
  }

  /**
   * Determine if SVC (Scalable Video Coding) should be enabled
   * IMPROVEMENT #5: Mutual exclusion with simulcast
   */
  private static shouldEnableSVC(
    caps: ClientCapabilities,
    videoCodec: string,
    network: NetworkQuality,
    callType: string,
    participantCount: number
  ): boolean {
    // Only if client supports SVC
    if (!caps.video.svcSupport) {
      return false;
    }

    // Only for AV1 and VP9
    if (!['av1', 'vp9'].includes(videoCodec)) {
      return false;
    }

    // For small-medium conferences: SVC preferred
    if (callType === 'conference' && participantCount < 15) {
      return network.bandwidth < 5000; // SVC good for limited bandwidth
    }

    // For p2p on poor network
    if (callType === 'p2p' && network.bandwidth < 2000) {
      return true;
    }

    return false;
  }

  /**
   * Get scalability mode for SVC
   * IMPROVEMENT: Dynamic selection based on participant count
   */
  private static getScalabilityMode(
    videoCodec: string,
    enableSVC: boolean,
    participantCount: number
  ): string | undefined {
    if (!enableSVC) {
      return undefined;
    }

    // Dynamic scalability mode selection based on participant count
    let spatialLayers: number;
    let temporalLayers: number;

    if (participantCount <= 2) {
      // P2P: No SVC needed
      return undefined;
    } else if (participantCount <= 5) {
      spatialLayers = 2;
      temporalLayers = 1;
    } else if (participantCount <= 10) {
      spatialLayers = 2;
      temporalLayers = 2;
    } else {
      spatialLayers = 3;
      temporalLayers = 3;
    }

    // Format: L[spatial]T[temporal]
    if (videoCodec === 'av1') {
      return `L${spatialLayers}T${temporalLayers}`;
    }

    if (videoCodec === 'vp9') {
      return `L${spatialLayers}T${temporalLayers}`;
    }

    return undefined;
  }

  /**
   * Calculate target bitrates for simulcast layers (low, medium, high)
   */
  private static calculateTargetBitrates(baseBitrate: number): {
    low: number;
    medium: number;
    high: number;
  } {
    return {
      low: Math.round(baseBitrate * 0.33),
      medium: Math.round(baseBitrate * 0.67),
      high: baseBitrate
    };
  }

  /**
   * Check if codec is available in capabilities
   */
  private static isCodecAvailable(caps: ClientCapabilities, codec: string): boolean {
    return caps.video.codecs.some(c =>
      c.mimeType.toLowerCase().includes(codec.toLowerCase())
    );
  }

  /**
   * Adapt codec configuration based on real-time stats
   */
  static async adaptCodecConfig(
    currentConfig: CodecConfiguration,
    networkStats: {
      bandwidth: number;
      packetLoss: number;
      rtt: number;
    },
    capabilities: ClientCapabilities,
    participantCount: number = 2
  ): Promise<CodecConfiguration> {
    const quality: NetworkQuality = {
      bandwidth: networkStats.bandwidth,
      rtt: networkStats.rtt,
      packetLoss: networkStats.packetLoss,
      jitter: 0
    };

    // If packet loss is high, downgrade codec
    if (networkStats.packetLoss > 5) {
      console.log('⚠️  High packet loss detected, downgrading codec...');

      let downgradedCodec = currentConfig.videoCodec;
      if (currentConfig.videoCodec === 'av1') {
        downgradedCodec = 'vp9';
      } else if (currentConfig.videoCodec === 'vp9') {
        downgradedCodec = 'h264';
      }

      return this.selectOptimalCodecs(
        capabilities,
        quality,
        'p2p',
        { videoCodec: downgradedCodec },
        participantCount
      );
    }

    // If bandwidth increased, upgrade codec
    if (networkStats.bandwidth > 5000 && currentConfig.videoCodec !== 'av1') {
      console.log('✅ Network improved, upgrading to AV1...');
      return this.selectOptimalCodecs(
        capabilities,
        quality,
        'p2p',
        { videoCodec: 'av1' },
        participantCount
      );
    }

    return currentConfig;
  }
}
