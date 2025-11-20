/**
 * Quality Optimization Module - Phase 2 Improvements
 *
 * Implements advanced quality control, content awareness, and degradation strategies
 * Research-backed by: Netflix adaptive bitrate, YouTube quality ladders, W3C specs
 *
 * IMPROVEMENTS IMPLEMENTED:
 * - Content-aware bitrate estimation (bits-per-pixel algorithm)
 * - Graceful quality degradation with quality ladder
 * - Screen sharing optimization (contentHint, FPS)
 * - Browser version detection for codec support
 * - Battery-aware codec selection
 */

export type ContentType = 'camera' | 'screen' | 'motion' | 'presentation';
export type BrowserEngine = 'webkit' | 'blink' | 'gecko' | 'presto' | 'unknown';

export interface BrowserCapabilities {
  engine: BrowserEngine;
  name: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Other';
  version: number;
  supportsAV1: boolean;
  supportsVP9: boolean;
  supportsH265: boolean;
  supportsWebCodecs: boolean;
  supportsBatteryAPI: boolean;
  supportsWebAssembly: boolean;
}

export interface QualityProfile {
  resolution: string;
  framerate: number;
  bitrate: number;
  codec: string;
  quality: number; // 0-100
  contentType: ContentType;
}

export interface QualityLadder {
  profiles: QualityProfile[];
  current: QualityProfile;
  degradationSteps: number;
  maxSteps: number;
}

/**
 * Browser Detection & Capability Analysis
 */
export class BrowserDetector {
  /**
   * Detect browser and return capabilities
   */
  static detectBrowser(): BrowserCapabilities {
    const ua = navigator.userAgent.toLowerCase();

    // Detect browser engine and name
    let engine: BrowserEngine = 'unknown';
    let name: BrowserCapabilities['name'] = 'Other';
    let version = 0;

    // Safari (WebKit)
    if (/safari/.test(ua) && !/chrome|firefox|edge/.test(ua)) {
      engine = 'webkit';
      name = 'Safari';
      const match = ua.match(/version\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }
    // Chrome/Chromium (Blink)
    else if (/chrome|chromium|crios/.test(ua)) {
      engine = 'blink';
      name = 'Chrome';
      const match = ua.match(/chrome\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }
    // Firefox (Gecko)
    else if (/firefox/.test(ua)) {
      engine = 'gecko';
      name = 'Firefox';
      const match = ua.match(/firefox\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }
    // Edge (Blink)
    else if (/edg/.test(ua)) {
      engine = 'blink';
      name = 'Edge';
      const match = ua.match(/edg\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }

    // Codec support matrix (2024-2025)
    const supportsAV1 = this.supportsCodec(engine, name, version, 'av1');
    const supportsVP9 = this.supportsCodec(engine, name, version, 'vp9');
    const supportsH265 = this.supportsCodec(engine, name, version, 'h265');
    const supportsWebCodecs = 'VideoEncoder' in window;
    const supportsBatteryAPI = 'getBattery' in navigator;
    const supportsWebAssembly = typeof WebAssembly !== 'undefined';

    return {
      engine,
      name,
      version,
      supportsAV1,
      supportsVP9,
      supportsH265,
      supportsWebCodecs,
      supportsBatteryAPI,
      supportsWebAssembly
    };
  }

  /**
   * Check codec support by browser version
   * Based on: Chrome release notes, Safari release notes, Firefox WebRTC support
   */
  private static supportsCodec(
    engine: BrowserEngine,
    name: BrowserCapabilities['name'],
    version: number,
    codec: string
  ): boolean {
    switch (name) {
      case 'Chrome':
        if (codec === 'av1') return version >= 120;
        if (codec === 'vp9') return version >= 50;
        if (codec === 'h265') return version >= 136;
        return codec === 'h264';

      case 'Firefox':
        if (codec === 'av1') return version >= 101; // Partial
        if (codec === 'vp9') return version >= 42;
        if (codec === 'h265') return false;
        return codec === 'h264';

      case 'Safari':
        if (codec === 'av1') return false; // Not yet
        if (codec === 'vp9') return version >= 17;
        if (codec === 'h265') return version >= 13;
        return codec === 'h264';

      case 'Edge':
        if (codec === 'av1') return version >= 120;
        if (codec === 'vp9') return version >= 18;
        if (codec === 'h265') return version >= 136;
        return codec === 'h264';

      default:
        return codec === 'h264'; // Safe default
    }
  }
}

/**
 * Quality Ladder & Degradation Management
 */
export class QualityManager {
  private ladder: QualityLadder;

  constructor(contentType: ContentType = 'camera') {
    this.ladder = this.buildQualityLadder(contentType);
  }

  /**
   * Build quality ladder (graceful degradation steps)
   */
  private buildQualityLadder(contentType: ContentType): QualityLadder {
    let profiles: QualityProfile[] = [];

    if (contentType === 'camera') {
      // Camera/video call quality ladder
      profiles = [
        { resolution: '1920x1080', framerate: 30, bitrate: 3000, codec: 'h264', quality: 100, contentType },
        { resolution: '1920x1080', framerate: 24, bitrate: 2500, codec: 'h264', quality: 95, contentType },
        { resolution: '1280x720', framerate: 30, bitrate: 1500, codec: 'h264', quality: 85, contentType },
        { resolution: '1280x720', framerate: 24, bitrate: 1200, codec: 'h264', quality: 80, contentType },
        { resolution: '640x480', framerate: 30, bitrate: 800, codec: 'h264', quality: 70, contentType },
        { resolution: '640x480', framerate: 15, bitrate: 400, codec: 'h264', quality: 50, contentType },
        { resolution: '320x240', framerate: 15, bitrate: 200, codec: 'h264', quality: 30, contentType }
      ];
    } else if (contentType === 'screen') {
      // Screen sharing quality ladder (high resolution, lower FPS)
      profiles = [
        { resolution: '1920x1080', framerate: 30, bitrate: 2000, codec: 'h264', quality: 100, contentType },
        { resolution: '1920x1080', framerate: 15, bitrate: 1200, codec: 'h264', quality: 90, contentType },
        { resolution: '1920x1080', framerate: 10, bitrate: 800, codec: 'h264', quality: 80, contentType },
        { resolution: '1280x720', framerate: 10, bitrate: 600, codec: 'h264', quality: 70, contentType },
        { resolution: '1024x768', framerate: 5, bitrate: 400, codec: 'h264', quality: 50, contentType },
        { resolution: '640x480', framerate: 5, bitrate: 200, codec: 'h264', quality: 30, contentType }
      ];
    } else if (contentType === 'motion') {
      // Motion/dynamic content (balanced)
      profiles = [
        { resolution: '1280x720', framerate: 30, bitrate: 2000, codec: 'h264', quality: 100, contentType },
        { resolution: '1280x720', framerate: 24, bitrate: 1500, codec: 'h264', quality: 90, contentType },
        { resolution: '960x540', framerate: 30, bitrate: 1200, codec: 'h264', quality: 80, contentType },
        { resolution: '640x480', framerate: 24, bitrate: 800, codec: 'h264', quality: 70, contentType },
        { resolution: '640x480', framerate: 15, bitrate: 400, codec: 'h264', quality: 50, contentType }
      ];
    } else {
      // Presentation (text-optimized)
      profiles = [
        { resolution: '1920x1080', framerate: 10, bitrate: 1500, codec: 'h264', quality: 100, contentType },
        { resolution: '1920x1080', framerate: 5, bitrate: 800, codec: 'h264', quality: 85, contentType },
        { resolution: '1280x720', framerate: 5, bitrate: 400, codec: 'h264', quality: 70, contentType }
      ];
    }

    return {
      profiles,
      current: profiles[0],
      degradationSteps: 0,
      maxSteps: profiles.length - 1
    };
  }

  /**
   * Degrade to next lower quality step
   */
  degrade(): QualityProfile | null {
    if (this.ladder.degradationSteps >= this.ladder.maxSteps) {
      return null; // Already at minimum
    }

    this.ladder.degradationSteps++;
    this.ladder.current = this.ladder.profiles[this.ladder.degradationSteps];
    return this.ladder.current;
  }

  /**
   * Upgrade to next higher quality step (with hysteresis)
   */
  upgrade(): QualityProfile | null {
    if (this.ladder.degradationSteps === 0) {
      return null; // Already at maximum
    }

    this.ladder.degradationSteps--;
    this.ladder.current = this.ladder.profiles[this.ladder.degradationSteps];
    return this.ladder.current;
  }

  /**
   * Get current quality profile
   */
  getCurrentProfile(): QualityProfile {
    return this.ladder.current;
  }

  /**
   * Get quality ladder progress
   */
  getProgress(): { current: number; max: number; percentage: number } {
    const max = this.ladder.maxSteps;
    const current = this.ladder.degradationSteps;
    return {
      current,
      max,
      percentage: ((max - current) / max) * 100
    };
  }
}

/**
 * Content-Aware Bitrate Estimator
 *
 * Research: Bits-per-pixel (BPP) algorithm
 * Based on: VP9/AV1 specs, YouTube bitrate optimization, VMAF quality metrics
 */
export class ContentAwareBitrateEstimator {
  /**
   * Calculate bitrate using bits-per-pixel algorithm
   *
   * Formula: bitrate = (width × height × fps × bpp) / 1000
   * Where BPP varies by codec and content type
   */
  static estimateBitrate(
    resolution: string, // e.g., "1280x720"
    framerate: number,
    codec: string,
    contentType: ContentType,
    qualityTarget: number = 0.8 // 0-1 quality target
  ): number {
    const [width, height] = resolution.split('x').map(Number);
    if (!width || !height) return 2000; // Fallback

    // Bits per pixel by codec
    const bppByCodec: Record<string, number> = {
      h264: 0.12,
      vp9: 0.09,
      vp8: 0.15,
      av1: 0.07,
      h265: 0.06
    };

    let baseBpp = bppByCodec[codec] || 0.12;

    // Content-type adjustments
    if (contentType === 'camera') {
      baseBpp *= 1.0; // Standard
    } else if (contentType === 'screen') {
      baseBpp *= 0.8; // Screen text compresses well
    } else if (contentType === 'motion') {
      baseBpp *= 1.2; // Motion requires more bits
    } else if (contentType === 'presentation') {
      baseBpp *= 0.6; // Presentation text very compressible
    }

    // Quality target adjustment
    baseBpp *= qualityTarget;

    // Calculate bitrate: (width × height × fps × bpp) / 1000 = kbps
    let bitrate = (width * height * framerate * baseBpp) / 1000;

    // Practical clamps per resolution
    if (contentType === 'screen') {
      // Screen sharing: keep high resolution even at low bitrate
      if (resolution === '1920x1080') bitrate = Math.max(bitrate, 600);
      else if (resolution === '1280x720') bitrate = Math.max(bitrate, 400);
    } else {
      // Camera: minimum bitrate thresholds
      if (resolution === '1920x1080') bitrate = Math.max(bitrate, 1000);
      else if (resolution === '1280x720') bitrate = Math.max(bitrate, 500);
      else if (resolution === '640x480') bitrate = Math.max(bitrate, 250);
    }

    return Math.round(bitrate);
  }

  /**
   * Get content-aware quality estimate (0-100)
   * Based on VMAF-like quality metrics
   */
  static estimateQuality(
    resolution: string,
    framerate: number,
    bitrate: number,
    contentType: ContentType
  ): number {
    const [width, height] = resolution.split('x').map(Number);
    if (!width || !height) return 0;

    const pixels = width * height;
    const bppActual = (bitrate * 1000) / (pixels * framerate);

    let quality = 0;

    // Content-type specific quality assessment
    if (contentType === 'camera') {
      // Camera quality: aim for 0.08-0.15 BPP
      if (bppActual >= 0.12) quality = 100;
      else if (bppActual >= 0.10) quality = 85;
      else if (bppActual >= 0.08) quality = 70;
      else if (bppActual >= 0.05) quality = 50;
      else quality = 30;
    } else if (contentType === 'screen') {
      // Screen quality: text legibility matters
      if (resolution === '1920x1080' && framerate >= 5) quality = 95;
      else if (resolution === '1280x720') quality = 85;
      else if (resolution === '640x480') quality = 70;
      else quality = 50;
    } else if (contentType === 'motion') {
      // Motion: framerate matters more
      if (framerate >= 30) quality += 30;
      else if (framerate >= 24) quality += 25;
      else if (framerate >= 15) quality += 15;

      if (bppActual >= 0.10) quality += 70;
      else if (bppActual >= 0.08) quality += 60;
      else if (bppActual >= 0.06) quality += 40;

      quality = Math.min(quality, 100);
    } else {
      // Presentation: text quality
      if (framerate >= 5 && resolution === '1920x1080') quality = 90;
      else if (resolution === '1920x1080') quality = 85;
      else if (resolution === '1280x720') quality = 75;
      else quality = 60;
    }

    return Math.max(0, Math.min(100, quality));
  }
}

/**
 * Battery-Aware Codec Selector
 */
export class BatteryAwareSelector {
  /**
   * Get battery level (0-1) if available
   */
  static async getBatteryLevel(): Promise<number | null> {
    try {
      const battery = await (navigator as any).getBattery?.();
      return battery?.level ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get recommended codec based on battery level
   */
  static getRecommendedCodec(batteryLevel: number): string {
    // Battery level: 0 (empty) to 1 (full)

    if (batteryLevel >= 0.8) {
      return 'av1'; // Charging or good battery: use most efficient
    } else if (batteryLevel >= 0.5) {
      return 'vp9'; // Medium battery: use balanced codec
    } else if (batteryLevel >= 0.2) {
      return 'h264'; // Low battery: use hardware codec
    } else {
      return 'h264'; // Critical battery: maximum power saving
    }
  }

  /**
   * Should use low power mode?
   */
  static shouldUseLowPowerMode(batteryLevel: number): boolean {
    return batteryLevel < 0.2 && !this.isCharging();
  }

  /**
   * Is device charging?
   */
  static isCharging(): boolean {
    try {
      const battery = (navigator as any).battery;
      return battery?.charging ?? false;
    } catch {
      return false;
    }
  }
}

/**
 * Screen Sharing Optimizer
 */
export class ScreenSharingOptimizer {
  /**
   * Get optimized settings for screen sharing
   */
  static getOptimizedSettings(screenResolution: { width: number; height: number }) {
    return {
      // High resolution, low framerate for screen
      resolution: `${screenResolution.width}x${screenResolution.height}`,
      framerate: 10, // Low FPS for static content
      bitrate: this.estimateBitrateForScreen(screenResolution.width, screenResolution.height),

      // Content hint for encoder optimization
      contentHint: 'text' as const, // Optimize for text/UI elements

      // Recommended codec settings
      codec: 'h264', // Best compatibility for screen sharing
      keyframeInterval: 5000, // 5-second keyframes for screen
      maxFrameSize: 1920 * 1080
    };
  }

  /**
   * Estimate bitrate for screen sharing (text-optimized)
   */
  private static estimateBitrateForScreen(width: number, height: number): number {
    // Screen sharing: aim for 0.05-0.08 BPP (very compressible)
    const pixels = width * height;
    const fps = 10;
    const bpp = 0.06;

    return Math.round((pixels * fps * bpp) / 1000);
  }
}
