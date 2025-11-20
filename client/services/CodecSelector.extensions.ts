/**
 * CodecSelector Extensions - Phase 2 SHOULD-HAVE Improvements
 *
 * Extends the base CodecSelector with advanced features:
 * - Network trend analysis and adaptation
 * - Quality limitation detection
 * - Content-aware bitrate estimation
 * - Browser-aware codec selection
 * - Screen sharing optimization
 * - Battery-aware codec selection
 *
 * These extensions work alongside the Phase 1 implementation
 */

import { CodecConfiguration } from './CodecSelector';
import {
  NetworkAdaptationEngine,
  NetworkStats,
  NetworkTrend,
  QualityLimitation
} from './NetworkAdaptation';
import {
  BrowserDetector,
  BrowserCapabilities,
  QualityManager,
  ContentAwareBitrateEstimator,
  BatteryAwareSelector,
  ScreenSharingOptimizer,
  ContentType
} from './QualityOptimization';

/**
 * Extended CodecSelector with Phase 2 features
 */
export class CodecSelectorPhase2 {
  private networkEngine: NetworkAdaptationEngine;
  private qualityManager: QualityManager;
  private browserCapabilities: BrowserCapabilities;

  constructor() {
    this.networkEngine = new NetworkAdaptationEngine();
    this.qualityManager = new QualityManager('camera');
    this.browserCapabilities = BrowserDetector.detectBrowser();
  }

  // ============================================
  // IMPROVEMENT #8: Trend-Based Network Adaptation
  // ============================================

  /**
   * Add network statistics for trend analysis
   */
  addNetworkStats(stats: Omit<NetworkStats, 'timestamp'>): void {
    this.networkEngine.addStats({
      ...stats,
      timestamp: Date.now()
    });
  }

  /**
   * Get network trend analysis with hysteresis
   */
  getNetworkTrend(): NetworkTrend {
    return this.networkEngine.analyzeNetworkTrend();
  }

  /**
   * Determine if quality should be upgraded (with hysteresis)
   */
  shouldUpgradeQuality(currentBitrate: number, targetBitrate: number): boolean {
    return this.networkEngine.shouldUpgrade(currentBitrate, targetBitrate, 0.7);
  }

  /**
   * Determine if quality should be downgraded (with hysteresis)
   */
  shouldDowngradeQuality(currentBitrate: number, targetBitrate: number): boolean {
    return this.networkEngine.shouldDowngrade(currentBitrate, targetBitrate, 0.5);
  }

  /**
   * Get oscillation prevention state
   */
  getOscillationState() {
    return this.networkEngine.getOscillationPrevention();
  }

  // ============================================
  // IMPROVEMENT #9: Quality Limitation Reason Detection
  // ============================================

  /**
   * Detect what's limiting quality (CPU vs bandwidth)
   * Uses WebRTC Stats qualityLimitationReason
   */
  detectQualityLimitation(stats: Omit<NetworkStats, 'timestamp'>): QualityLimitation {
    return this.networkEngine.detectQualityLimitation({
      ...stats,
      timestamp: Date.now()
    });
  }

  /**
   * Get recommended action based on quality limitation
   */
  getAdaptationRecommendation(limitation: QualityLimitation): {
    action: 'upgrade' | 'downgrade' | 'stabilize' | 'none';
    priority: 'high' | 'medium' | 'low';
    suggestedBitrate?: number;
  } {
    if (limitation.reason === 'none') {
      return { action: 'none', priority: 'low' };
    }

    if (limitation.reason === 'cpu') {
      if (limitation.severity === 'severe') {
        return { action: 'downgrade', priority: 'high' };
      }
      if (limitation.severity === 'moderate') {
        return { action: 'downgrade', priority: 'medium' };
      }
      return { action: 'stabilize', priority: 'low' };
    }

    if (limitation.reason === 'bandwidth') {
      if (limitation.severity === 'severe') {
        return {
          action: 'downgrade',
          priority: 'high',
          suggestedBitrate: limitation.bitrateSuggestion
        };
      }
      return {
        action: 'stabilize',
        priority: 'medium',
        suggestedBitrate: limitation.bitrateSuggestion
      };
    }

    return { action: 'stabilize', priority: 'medium' };
  }

  // ============================================
  // IMPROVEMENT #10: Content-Aware Bitrate Estimation
  // ============================================

  /**
   * Estimate optimal bitrate using bits-per-pixel algorithm
   * Accounts for codec, content type, and quality target
   */
  estimateOptimalBitrate(
    resolution: string,
    framerate: number,
    codec: string,
    contentType: ContentType = 'camera',
    qualityTarget: number = 0.8
  ): number {
    return ContentAwareBitrateEstimator.estimateBitrate(
      resolution,
      framerate,
      codec,
      contentType,
      qualityTarget
    );
  }

  /**
   * Estimate quality score (0-100) for given settings
   */
  estimateQualityScore(
    resolution: string,
    framerate: number,
    bitrate: number,
    contentType: ContentType = 'camera'
  ): number {
    return ContentAwareBitrateEstimator.estimateQuality(
      resolution,
      framerate,
      bitrate,
      contentType
    );
  }

  // ============================================
  // IMPROVEMENT #11: Browser Version-Aware Codec Support
  // ============================================

  /**
   * Get browser capabilities detected at initialization
   */
  getBrowserCapabilities(): BrowserCapabilities {
    return this.browserCapabilities;
  }

  /**
   * Get codec priority list based on browser version
   */
  getBrowserOptimizedCodecPriority(): string[] {
    const { name, version, supportsAV1, supportsVP9, supportsH265 } =
      this.browserCapabilities;

    // Newest codec first that's supported
    const priority: string[] = [];

    if (supportsH265) priority.push('h265');
    if (supportsAV1) priority.push('av1');
    if (supportsVP9) priority.push('vp9');

    priority.push('h264'); // Fallback, always supported

    return priority;
  }

  /**
   * Check if specific codec is supported by browser
   */
  isCodecSupported(codec: string): boolean {
    switch (codec.toLowerCase()) {
      case 'av1':
        return this.browserCapabilities.supportsAV1;
      case 'vp9':
        return this.browserCapabilities.supportsVP9;
      case 'h265':
      case 'hevc':
        return this.browserCapabilities.supportsH265;
      default:
        return true; // H.264 always supported
    }
  }

  // ============================================
  // IMPROVEMENT #12: Graceful Quality Degradation
  // ============================================

  /**
   * Initialize quality manager for specific content type
   */
  initializeQualityLadder(contentType: ContentType = 'camera'): void {
    this.qualityManager = new QualityManager(contentType);
  }

  /**
   * Degrade to next lower quality step
   */
  degradeQuality() {
    const result = this.qualityManager.degrade();
    if (result) {
      console.log(`📉 Degraded quality: ${result.resolution}@${result.framerate}fps, ${result.bitrate}kbps`);
    }
    return result;
  }

  /**
   * Upgrade to next higher quality step
   */
  upgradeQuality() {
    const result = this.qualityManager.upgrade();
    if (result) {
      console.log(`📈 Upgraded quality: ${result.resolution}@${result.framerate}fps, ${result.bitrate}kbps`);
    }
    return result;
  }

  /**
   * Get current quality profile
   */
  getCurrentQualityProfile() {
    return this.qualityManager.getCurrentProfile();
  }

  /**
   * Get quality ladder progress (for UI indicators)
   */
  getQualityProgress() {
    return this.qualityManager.getProgress();
  }

  // ============================================
  // IMPROVEMENT #13: Screen Sharing Optimization
  // ============================================

  /**
   * Get optimized settings for screen sharing
   */
  getScreenSharingSettings(screenResolution: { width: number; height: number }) {
    return ScreenSharingOptimizer.getOptimizedSettings(screenResolution);
  }

  /**
   * Apply screen sharing optimization to codec config
   */
  optimizeForScreenSharing(config: CodecConfiguration): CodecConfiguration {
    const settings = ScreenSharingOptimizer.getOptimizedSettings({
      width: parseInt(config.resolution.split('x')[0]),
      height: parseInt(config.resolution.split('x')[1])
    });

    return {
      ...config,
      resolution: settings.resolution,
      framerate: settings.framerate,
      bitrate: settings.bitrate,
      videoCodec: settings.codec
    };
  }

  // ============================================
  // IMPROVEMENT #14: Battery-Aware Codec Selection
  // ============================================

  /**
   * Get battery level if available (0-1)
   */
  async getBatteryLevel(): Promise<number | null> {
    return BatteryAwareSelector.getBatteryLevel();
  }

  /**
   * Get codec recommendation based on battery level
   */
  async getCodecForBattery(): Promise<string> {
    const battery = await BatteryAwareSelector.getBatteryLevel();

    if (battery === null) {
      console.warn('⚠️  Battery Status API not available');
      return 'h264'; // Safe default
    }

    console.log(`🔋 Battery level: ${Math.round(battery * 100)}%`);

    return BatteryAwareSelector.getRecommendedCodec(battery);
  }

  /**
   * Check if low power mode should be used
   */
  async shouldUseLowPowerMode(): Promise<boolean> {
    const battery = await BatteryAwareSelector.getBatteryLevel();
    if (battery === null) return false;
    return BatteryAwareSelector.shouldUseLowPowerMode(battery);
  }

  // ============================================
  // IMPROVEMENT #7: Dynamic SVC Mode Selection (Enhanced)
  // ============================================

  /**
   * Select optimal SVC scalability mode with motion-aware heuristics
   * Enhanced over Phase 1's simple participant-count based selection
   */
  selectDynamicSVCMode(
    codec: string,
    participantCount: number,
    bandwidth: number, // kbps
    networkStability: number, // 0-1 (lower = more jittery)
    motionLevel: number = 0.5 // 0-1 (0 = static, 1 = high motion)
  ): string | undefined {
    // Only VP9 and AV1 support SVC
    if (!['vp9', 'av1'].includes(codec)) {
      return undefined;
    }

    // Single participant: no SVC
    if (participantCount <= 1) {
      return undefined;
    }

    // Motion-based adjustment
    // High motion → need more layers for smooth degradation
    let adjustedParticipants = participantCount;
    if (motionLevel > 0.7) {
      adjustedParticipants = Math.ceil(adjustedParticipants * 1.2); // Treat as larger conference
    } else if (motionLevel < 0.3) {
      adjustedParticipants = Math.max(2, Math.ceil(adjustedParticipants * 0.8)); // Can use fewer
    }

    // Network stability influence
    if (networkStability < 0.5) {
      // Unstable network: use more granular layers
      adjustedParticipants = Math.ceil(adjustedParticipants * 1.3);
    }

    // Bandwidth-based selection
    if (bandwidth < 1000) {
      // Very low bandwidth: use only temporal layers
      return 'L1T2';
    }

    // Participant-count based with motion adjustment
    if (adjustedParticipants <= 3) {
      return 'L2T1'; // 2 spatial, 1 temporal (resolution scaling)
    } else if (adjustedParticipants <= 5) {
      return 'L2T2'; // 2 spatial, 2 temporal (resolution + framerate)
    } else if (adjustedParticipants <= 10) {
      return 'L2T2'; // Same for medium
    } else {
      return 'L3T3'; // Maximum flexibility for large conferences
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Reset all state (useful after codec change)
   */
  reset(): void {
    this.networkEngine.clearHistory();
    this.qualityManager = new QualityManager('camera');
    console.log('🔄 CodecSelector state reset');
  }

  /**
   * Get comprehensive diagnostics report
   */
  getDiagnostics() {
    const trend = this.getNetworkTrend();
    const oscillation = this.getOscillationState();
    const quality = this.getCurrentQualityProfile();
    const browser = this.getBrowserCapabilities();
    const qualityProgress = this.getQualityProgress();

    return {
      timestamp: new Date().toISOString(),
      browser: {
        name: browser.name,
        version: browser.version,
        engine: browser.engine,
        supportedCodecs: this.getBrowserOptimizedCodecPriority()
      },
      network: {
        trend: trend.bandwidthTrend,
        movingAverage: trend.bandwidthMovingAverage,
        trendStrength: trend.bandwidthTrendStrength,
        confidence: trend.confidence,
        overallQuality: trend.overallQuality
      },
      oscillation: {
        isStable: oscillation.isStable,
        score: oscillation.oscillationScore,
        recommendedHysteresisMs: oscillation.recommendedHysteresisMs
      },
      quality: {
        resolution: quality.resolution,
        framerate: quality.framerate,
        bitrate: quality.bitrate,
        qualityScore: quality.quality,
        progress: qualityProgress
      }
    };
  }

  /**
   * Log diagnostic information
   */
  logDiagnostics(): void {
    const diag = this.getDiagnostics();
    console.log('📊 CodecSelector Diagnostics:');
    console.log(JSON.stringify(diag, null, 2));
  }
}
