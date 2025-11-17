/**
 * Intelligent Codec Selection Algorithm
 *
 * Selects optimal codecs based on:
 * - Browser capabilities
 * - Network quality
 * - Device capabilities
 * - Call type (p2p vs conference)
 * - User preferences
 */

import { ClientCapabilities } from './CodecDetection';

export interface NetworkQuality {
  bandwidth: number; // kbps
  rtt: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
}

export interface CodecConfiguration {
  videoCodec: string;
  audioCodec: string;
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

export class CodecSelector {
  private static readonly CODEC_PRIORITY = ['av1', 'vp9', 'h264'];
  private static readonly AUDIO_CODEC_PRIORITY = ['opus', 'g722', 'pcmu'];

  /**
   * Select optimal codec configuration
   */
  static selectOptimalCodecs(
    clientCapabilities: ClientCapabilities,
    networkQuality: NetworkQuality,
    callType: 'p2p' | 'conference' = 'p2p',
    userPreference?: { videoCodec?: string; resolution?: string }
  ): CodecConfiguration {
    const videoCodec = this.selectVideoCodec(
      clientCapabilities,
      networkQuality,
      callType,
      userPreference?.videoCodec
    );

    const audioCodec = this.selectAudioCodec(clientCapabilities);

    const { resolution, framerate, bitrate } = this.selectQualitySettings(
      videoCodec,
      networkQuality,
      callType,
      userPreference?.resolution
    );

    const enableSimulcast = this.shouldEnableSimulcast(
      clientCapabilities,
      videoCodec,
      callType
    );

    const enableSVC = this.shouldEnableSVC(
      clientCapabilities,
      videoCodec,
      networkQuality,
      callType
    );

    const scalabilityMode = this.getScalabilityMode(videoCodec, enableSVC);

    const targetBitrates = this.calculateTargetBitrates(videoCodec, bitrate);

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
   * Select video codec based on capabilities and network
   */
  private static selectVideoCodec(
    caps: ClientCapabilities,
    network: NetworkQuality,
    callType: string,
    userPreference?: string
  ): string {
    // If user explicitly prefers a codec, try to use it
    if (userPreference && this.isCodecAvailable(caps, userPreference)) {
      console.log(`📺 Using user-preferred codec: ${userPreference}`);
      return userPreference;
    }

    // For conference calls on poor network: use H.264 (highest compatibility)
    if (callType === 'conference' && network.bandwidth < 2000) {
      if (this.isCodecAvailable(caps, 'h264')) {
        console.log('📺 Selected H.264 (conference + poor network)');
        return 'h264';
      }
    }

    // For peer-to-peer with good network: try AV1
    if (callType === 'p2p' && network.bandwidth > 5000) {
      if (this.isCodecAvailable(caps, 'av1')) {
        console.log('📺 Selected AV1 (p2p + high bandwidth)');
        return 'av1';
      }
    }

    // Default priority: AV1 > VP9 > H.264
    for (const codec of this.CODEC_PRIORITY) {
      if (this.isCodecAvailable(caps, codec)) {
        console.log(`📺 Selected ${codec.toUpperCase()} (priority-based)`);
        return codec;
      }
    }

    // This shouldn't happen in practice
    console.warn('⚠️  No supported video codec found!');
    return 'h264';
  }

  /**
   * Select audio codec
   */
  private static selectAudioCodec(caps: ClientCapabilities): string {
    for (const codec of this.AUDIO_CODEC_PRIORITY) {
      const found = caps.audio.codecs.find(c =>
        c.mimeType.toLowerCase().includes(codec)
      );
      if (found) {
        console.log(`🔊 Selected audio codec: ${codec}`);
        return codec;
      }
    }

    // Fallback to first available
    if (caps.audio.codecs.length > 0) {
      const codec = caps.audio.codecs[0].mimeType.split('/')[1].toLowerCase();
      console.log(`🔊 Selected audio codec (fallback): ${codec}`);
      return codec;
    }

    return 'opus';
  }

  /**
   * Select resolution and framerate based on codec and network
   */
  private static selectQualitySettings(
    videoCodec: string,
    network: NetworkQuality,
    callType: string,
    userResolution?: string
  ): { resolution: string; framerate: number; bitrate: number } {
    // User preference overrides algorithm
    if (userResolution) {
      return {
        resolution: userResolution,
        framerate: 30,
        bitrate: this.estimatedBitrate(videoCodec, userResolution, 30, network.bandwidth)
      };
    }

    // For conference calls, lower quality
    if (callType === 'conference') {
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

    // For p2p with good network: high quality
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
   * Calculate estimated bitrate in kbps
   */
  private static estimatedBitrate(
    codec: string,
    resolution: string,
    framerate: number,
    availableBandwidth: number
  ): number {
    // Base bitrates for codecs (1080p@30fps)
    const baseMap: Record<string, number> = {
      av1: 1500, // 1.5 Mbps
      vp9: 2000, // 2.0 Mbps
      h264: 3000 // 3.0 Mbps
    };

    const baseRate = baseMap[codec] || 3000;

    // Resolution multipliers
    const resolutionMap: Record<string, number> = {
      '1920x1080': 1.0,
      '1280x720': 0.5,
      '640x480': 0.25,
      '320x240': 0.1
    };

    const resMult = resolutionMap[resolution] || 0.5;

    // Framerate multiplier
    const fpsRatio = framerate / 30;

    // Calculate target bitrate
    let targetBitrate = baseRate * resMult * fpsRatio;

    // Constrain to available bandwidth (leave 20% margin)
    const maxBitrate = availableBandwidth * 0.8;
    targetBitrate = Math.min(targetBitrate, maxBitrate);

    return Math.round(targetBitrate);
  }

  /**
   * Determine if simulcast should be enabled
   */
  private static shouldEnableSimulcast(
    caps: ClientCapabilities,
    videoCodec: string,
    callType: string
  ): boolean {
    // Only enable for conference calls with supported codec
    if (callType !== 'conference') {
      return false;
    }

    // H.264 doesn't simulcast well, prefer SVC
    if (videoCodec === 'h264') {
      return false;
    }

    // Only if client supports simulcast
    return caps.video.simulcastSupport;
  }

  /**
   * Determine if SVC (Scalable Video Coding) should be enabled
   */
  private static shouldEnableSVC(
    caps: ClientCapabilities,
    videoCodec: string,
    network: NetworkQuality,
    callType: string
  ): boolean {
    // Only if client supports SVC
    if (!caps.video.svcSupport) {
      return false;
    }

    // Only for AV1 and VP9
    if (!['av1', 'vp9'].includes(videoCodec)) {
      return false;
    }

    // Enable for conference calls on limited bandwidth
    if (callType === 'conference' && network.bandwidth < 3000) {
      return true;
    }

    // Enable for p2p on poor network
    if (callType === 'p2p' && network.bandwidth < 2000) {
      return true;
    }

    return false;
  }

  /**
   * Get scalability mode for SVC
   */
  private static getScalabilityMode(videoCodec: string, enableSVC: boolean): string | undefined {
    if (!enableSVC) {
      return undefined;
    }

    // AV1 scalability modes
    if (videoCodec === 'av1') {
      return 'L2T2'; // 2 spatial layers, 2 temporal layers
    }

    // VP9 scalability modes
    if (videoCodec === 'vp9') {
      return 'L2T1'; // 2 spatial layers, 1 temporal layer
    }

    return undefined;
  }

  /**
   * Calculate target bitrates for simulcast layers
   */
  private static calculateTargetBitrates(videoCodec: string, baseBitrate: number): Record<string, number> {
    // Three quality tiers: low, medium, high
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
  static adaptCodecConfig(
    currentConfig: CodecConfiguration,
    networkStats: {
      bandwidth: number;
      packetLoss: number;
      rtt: number;
    },
    capabilities: ClientCapabilities
  ): CodecConfiguration {
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

      return this.selectOptimalCodecs(capabilities, quality, 'p2p', { videoCodec: downgradedCodec });
    }

    // If bandwidth increased, upgrade codec
    if (networkStats.bandwidth > 5000 && currentConfig.videoCodec !== 'av1') {
      console.log('✅ Network improved, upgrading to AV1...');
      return this.selectOptimalCodecs(capabilities, quality, 'p2p', { videoCodec: 'av1' });
    }

    return currentConfig;
  }
}
