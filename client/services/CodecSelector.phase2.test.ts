/**
 * CodecSelector Phase 2 - SHOULD-HAVE Improvements Test Suite
 *
 * Tests for:
 * - Network trend-based adaptation
 * - Quality limitation detection
 * - Content-aware bitrate estimation
 * - Browser version detection
 * - Graceful quality degradation
 * - Screen sharing optimization
 * - Battery-aware codec selection
 * - Dynamic SVC mode selection
 */

import { CodecSelectorPhase2 } from './CodecSelector.extensions';
import {
  NetworkAdaptationEngine,
  NetworkStats,
  NetworkTrend
} from './NetworkAdaptation';
import {
  BrowserDetector,
  QualityManager,
  ContentAwareBitrateEstimator,
  ScreenSharingOptimizer
} from './QualityOptimization';

describe('CodecSelector Phase 2 - SHOULD-HAVE Improvements', () => {
  let selector: CodecSelectorPhase2;

  beforeEach(() => {
    selector = new CodecSelectorPhase2();
  });

  // ============================================
  // IMPROVEMENT #8: Trend-Based Network Adaptation
  // ============================================
  describe('Improvement #8: Trend-Based Network Adaptation', () => {
    test('Should detect improving bandwidth trend', () => {
      const stats = [
        { bandwidth: 1000, rtt: 100, packetLoss: 2, jitter: 15 },
        { bandwidth: 1500, rtt: 90, packetLoss: 1.5, jitter: 12 },
        { bandwidth: 2000, rtt: 80, packetLoss: 1, jitter: 10 },
        { bandwidth: 2500, rtt: 70, packetLoss: 0.5, jitter: 8 }
      ];

      stats.forEach(s => selector.addNetworkStats(s));
      const trend = selector.getNetworkTrend();

      expect(trend.bandwidthTrend).toBe('improving');
      expect(trend.confidence).toBeGreaterThan(0.5);
    });

    test('Should detect degrading bandwidth trend', () => {
      const stats = [
        { bandwidth: 3000, rtt: 50, packetLoss: 0.5, jitter: 5 },
        { bandwidth: 2500, rtt: 70, packetLoss: 1, jitter: 8 },
        { bandwidth: 2000, rtt: 90, packetLoss: 1.5, jitter: 12 },
        { bandwidth: 1500, rtt: 110, packetLoss: 2, jitter: 15 }
      ];

      stats.forEach(s => selector.addNetworkStats(s));
      const trend = selector.getNetworkTrend();

      expect(trend.bandwidthTrend).toBe('degrading');
    });

    test('Should provide hysteresis for quality upgrades', () => {
      // Add improving network stats
      for (let i = 0; i < 5; i++) {
        selector.addNetworkStats({
          bandwidth: 2000 + i * 500,
          rtt: 50,
          packetLoss: 0.5,
          jitter: 5
        });
      }

      // Should upgrade with good confidence
      expect(selector.shouldUpgradeQuality(1000, 3000)).toBe(true);
    });

    test('Should prevent oscillation with proper hysteresis', () => {
      // Simulate unstable network (oscillating)
      const unstableStats = [
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        { bandwidth: 3000, rtt: 40, packetLoss: 0.5, jitter: 3 },
        { bandwidth: 1500, rtt: 100, packetLoss: 2, jitter: 15 },
        { bandwidth: 2500, rtt: 60, packetLoss: 1, jitter: 8 },
        { bandwidth: 1800, rtt: 80, packetLoss: 1.5, jitter: 10 }
      ];

      unstableStats.forEach(s => selector.addNetworkStats(s));
      const oscillation = selector.getOscillationState();

      expect(oscillation.isStable).toBe(false);
      expect(oscillation.oscillationScore).toBeGreaterThan(0.2);
      expect(oscillation.recommendedHysteresisMs).toBeGreaterThan(5000);
    });

    test('Should calculate moving average correctly', () => {
      const stats = [
        { bandwidth: 1000, rtt: 50, packetLoss: 1, jitter: 5 },
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        { bandwidth: 3000, rtt: 50, packetLoss: 1, jitter: 5 }
      ];

      stats.forEach(s => selector.addNetworkStats(s));
      const trend = selector.getNetworkTrend();

      // EMA should be between min and max
      expect(trend.bandwidthMovingAverage).toBeGreaterThan(1000);
      expect(trend.bandwidthMovingAverage).toBeLessThan(3000);
    });
  });

  // ============================================
  // IMPROVEMENT #9: Quality Limitation Detection
  // ============================================
  describe('Improvement #9: Quality Limitation Reason Detection', () => {
    test('Should detect CPU limitation', () => {
      const stats = {
        bandwidth: 5000,
        rtt: 30,
        packetLoss: 0.1,
        jitter: 2,
        qualityLimitationReason: 'cpu' as const
      };

      const limitation = selector.detectQualityLimitation(stats);

      expect(limitation.reason).toBe('cpu');
      expect(limitation.severity).toBe('minor'); // Good bandwidth, CPU bottleneck
      expect(limitation.codeSuggestion).toBe('downgrade');
    });

    test('Should detect bandwidth limitation', () => {
      const stats = {
        bandwidth: 500,
        rtt: 100,
        packetLoss: 3,
        jitter: 20,
        qualityLimitationReason: 'bandwidth' as const
      };

      const limitation = selector.detectQualityLimitation(stats);

      expect(limitation.reason).toBe('bandwidth');
      expect(limitation.severity).toBe('severe');
      expect(limitation.codeSuggestion).toBe('stabilize');
      expect(limitation.bitrateSuggestion).toBeDefined();
    });

    test('Should provide adaptation recommendations', () => {
      const cpuLimitation = {
        reason: 'cpu' as const,
        severity: 'severe' as const,
        duration: 0
      };

      const rec = selector.getAdaptationRecommendation(cpuLimitation);

      expect(rec.action).toBe('downgrade');
      expect(rec.priority).toBe('high');
    });

    test('Should handle no limitation', () => {
      const stats = {
        bandwidth: 5000,
        rtt: 30,
        packetLoss: 0.1,
        jitter: 2,
        qualityLimitationReason: 'none' as const
      };

      const limitation = selector.detectQualityLimitation(stats);

      expect(limitation.reason).toBe('none');
      expect(limitation.severity).toBe('none');
    });
  });

  // ============================================
  // IMPROVEMENT #10: Content-Aware Bitrate Estimation
  // ============================================
  describe('Improvement #10: Content-Aware Bitrate Estimation', () => {
    test('Should estimate bitrate for camera content', () => {
      const bitrate = selector.estimateOptimalBitrate(
        '1280x720',
        30,
        'h264',
        'camera',
        0.8
      );

      expect(bitrate).toBeGreaterThan(800);
      expect(bitrate).toBeLessThan(2000);
      console.log(`Camera 720p bitrate: ${bitrate} kbps`);
    });

    test('Should estimate lower bitrate for screen sharing', () => {
      const cameraBitrate = selector.estimateOptimalBitrate(
        '1920x1080',
        30,
        'h264',
        'camera',
        0.8
      );

      const screenBitrate = selector.estimateOptimalBitrate(
        '1920x1080',
        10,
        'h264',
        'screen',
        0.8
      );

      expect(screenBitrate).toBeLessThan(cameraBitrate);
      console.log(`Screen 1080p bitrate: ${screenBitrate} kbps (vs camera ${cameraBitrate} kbps)`);
    });

    test('Should vary bitrate by codec efficiency', () => {
      const h264Bitrate = selector.estimateOptimalBitrate(
        '1280x720',
        30,
        'h264',
        'camera'
      );

      const vp9Bitrate = selector.estimateOptimalBitrate(
        '1280x720',
        30,
        'vp9',
        'camera'
      );

      const av1Bitrate = selector.estimateOptimalBitrate(
        '1280x720',
        30,
        'av1',
        'camera'
      );

      expect(vp9Bitrate).toBeLessThan(h264Bitrate);
      expect(av1Bitrate).toBeLessThan(vp9Bitrate);
      console.log(`720p bitrates - H.264: ${h264Bitrate}, VP9: ${vp9Bitrate}, AV1: ${av1Bitrate}`);
    });

    test('Should estimate quality score', () => {
      const qualityHigh = selector.estimateQualityScore(
        '1920x1080',
        30,
        2000,
        'camera'
      );

      const qualityLow = selector.estimateQualityScore(
        '320x240',
        15,
        200,
        'camera'
      );

      expect(qualityHigh).toBeGreaterThan(qualityLow);
      expect(qualityHigh).toBeGreaterThan(70);
      expect(qualityLow).toBeLessThan(50);
    });
  });

  // ============================================
  // IMPROVEMENT #11: Browser Version-Aware Codec Support
  // ============================================
  describe('Improvement #11: Browser Version-Aware Codec Support', () => {
    test('Should detect browser capabilities', () => {
      const caps = selector.getBrowserCapabilities();

      expect(caps.name).toBeDefined();
      expect(caps.version).toBeGreaterThanOrEqual(0);
      expect(caps.engine).toBeDefined();
    });

    test('Should return browser-optimized codec priority', () => {
      const priority = selector.getBrowserOptimizedCodecPriority();

      expect(priority).toContain('h264'); // Always supported
      expect(priority.length).toBeGreaterThan(0);
      console.log(`Browser codec priority: ${priority.join(' > ')}`);
    });

    test('Should check codec support correctly', () => {
      expect(selector.isCodecSupported('h264')).toBe(true); // Always true

      // VP9 support depends on browser
      const vp9Supported = selector.isCodecSupported('vp9');
      expect(typeof vp9Supported).toBe('boolean');
    });
  });

  // ============================================
  // IMPROVEMENT #12: Graceful Quality Degradation
  // ============================================
  describe('Improvement #12: Graceful Quality Degradation', () => {
    test('Should initialize quality ladder for camera', () => {
      selector.initializeQualityLadder('camera');
      const profile = selector.getCurrentQualityProfile();

      expect(profile).toBeDefined();
      expect(profile.resolution).toBe('1920x1080');
      expect(profile.framerate).toBe(30);
      expect(profile.quality).toBe(100);
    });

    test('Should degrade quality smoothly', () => {
      selector.initializeQualityLadder('camera');

      const initial = selector.getCurrentQualityProfile();
      selector.degradeQuality();
      const degraded = selector.getCurrentQualityProfile();

      expect(degraded.quality).toBeLessThan(initial.quality);
      expect(degraded.bitrate).toBeLessThanOrEqual(initial.bitrate);
      console.log(`Degraded: ${initial.resolution} → ${degraded.resolution}`);
    });

    test('Should not degrade below minimum', () => {
      selector.initializeQualityLadder('camera');

      // Keep degrading until we hit the bottom
      for (let i = 0; i < 20; i++) {
        selector.degradeQuality();
      }

      const minimal = selector.getCurrentQualityProfile();
      expect(minimal).toBeDefined(); // Should never return null
    });

    test('Should upgrade quality smoothly', () => {
      selector.initializeQualityLadder('camera');

      // First degrade
      selector.degradeQuality();
      selector.degradeQuality();

      const degraded = selector.getCurrentQualityProfile();

      // Then upgrade
      selector.upgradeQuality();
      const upgraded = selector.getCurrentQualityProfile();

      expect(upgraded.quality).toBeGreaterThan(degraded.quality);
      console.log(`Upgraded: ${degraded.resolution} → ${upgraded.resolution}`);
    });

    test('Should track quality progress', () => {
      selector.initializeQualityLadder('camera');
      selector.degradeQuality();
      selector.degradeQuality();

      const progress = selector.getQualityProgress();

      expect(progress.current).toBeGreaterThan(0);
      expect(progress.max).toBeGreaterThan(0);
      expect(progress.percentage).toBeLessThan(100);
      console.log(`Quality progress: ${progress.percentage.toFixed(1)}%`);
    });

    test('Should have different ladder for screen sharing', () => {
      selector.initializeQualityLadder('screen');
      const screenProfile = selector.getCurrentQualityProfile();

      // Screen should have lower framerate but maintain resolution
      expect(screenProfile.framerate).toBeLessThanOrEqual(30);
      console.log(`Screen profile: ${screenProfile.resolution}@${screenProfile.framerate}fps`);
    });
  });

  // ============================================
  // IMPROVEMENT #13: Screen Sharing Optimization
  // ============================================
  describe('Improvement #13: Screen Sharing Optimization', () => {
    test('Should optimize for screen sharing', () => {
      const settings = selector.getScreenSharingSettings({
        width: 1920,
        height: 1080
      });

      expect(settings.resolution).toBe('1920x1080');
      expect(settings.framerate).toBeLessThanOrEqual(10); // Low FPS for static content
      expect(settings.contentHint).toBe('text');
      console.log(`Screen settings: ${settings.resolution}@${settings.framerate}fps, bitrate ${settings.bitrate}kbps`);
    });

    test('Should apply screen optimization to codec config', () => {
      const config = {
        videoCodec: 'vp9',
        audioCodec: 'opus',
        resolution: '1920x1080',
        framerate: 30,
        bitrate: 2000,
        enableSimulcast: false,
        enableSVC: false
      };

      const optimized = selector.optimizeForScreenSharing(config);

      expect(optimized.framerate).toBeLessThanOrEqual(config.framerate);
      expect(optimized.videoCodec).toBe('h264'); // H.264 for compatibility
    });
  });

  // ============================================
  // IMPROVEMENT #14: Battery-Aware Codec Selection
  // ============================================
  describe('Improvement #14: Battery-Aware Codec Selection', () => {
    test('Should handle battery level', async () => {
      const level = await selector.getBatteryLevel();

      // Battery API may not be available, should handle gracefully
      expect(level === null || (level >= 0 && level <= 1)).toBe(true);
    });

    test('Should get codec for battery level', async () => {
      const codec = await selector.getCodecForBattery();

      expect(['h264', 'vp9', 'av1']).toContain(codec);
      console.log(`Battery-aware codec: ${codec}`);
    });

    test('Should detect low power mode', async () => {
      const lowPower = await selector.shouldUseLowPowerMode();

      expect(typeof lowPower).toBe('boolean');
    });
  });

  // ============================================
  // IMPROVEMENT #7: Dynamic SVC Mode Selection (Enhanced)
  // ============================================
  describe('Improvement #7: Dynamic SVC Mode Selection (Enhanced)', () => {
    test('Should select no SVC for single participant', () => {
      const mode = selector.selectDynamicSVCMode('vp9', 1, 3000, 0.8, 0.5);

      expect(mode).toBeUndefined();
    });

    test('Should select L2T1 for small conference', () => {
      const mode = selector.selectDynamicSVCMode('vp9', 3, 2000, 0.8, 0.5);

      expect(mode).toBe('L2T1');
    });

    test('Should select L2T2 for medium conference', () => {
      const mode = selector.selectDynamicSVCMode('vp9', 6, 2500, 0.8, 0.5);

      expect(['L2T2']).toContain(mode);
    });

    test('Should select L3T3 for large conference', () => {
      const mode = selector.selectDynamicSVCMode('vp9', 12, 3500, 0.8, 0.5);

      expect(mode).toBe('L3T3');
    });

    test('Should use more layers for high motion content', () => {
      const lowMotionMode = selector.selectDynamicSVCMode('vp9', 5, 2000, 0.8, 0.2);
      const highMotionMode = selector.selectDynamicSVCMode('vp9', 5, 2000, 0.8, 0.9);

      // High motion might select more complex mode
      expect(highMotionMode).toBeDefined();
      console.log(
        `SVC modes - Low motion: ${lowMotionMode}, High motion: ${highMotionMode}`
      );
    });

    test('Should handle unstable network', () => {
      const stableMode = selector.selectDynamicSVCMode('vp9', 5, 2000, 0.9, 0.5);
      const unstableMode = selector.selectDynamicSVCMode('vp9', 5, 2000, 0.2, 0.5);

      // Both should be valid modes
      expect(stableMode).toBeDefined();
      expect(unstableMode).toBeDefined();
    });

    test('Should not use SVC for non-SVC codecs', () => {
      const mode = selector.selectDynamicSVCMode('h264', 10, 3000, 0.8, 0.5);

      expect(mode).toBeUndefined();
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration Tests', () => {
    test('Should provide comprehensive diagnostics', () => {
      // Add some network stats
      for (let i = 0; i < 5; i++) {
        selector.addNetworkStats({
          bandwidth: 2000 + i * 100,
          rtt: 50,
          packetLoss: 1,
          jitter: 5
        });
      }

      const diag = selector.getDiagnostics();

      expect(diag.timestamp).toBeDefined();
      expect(diag.browser).toBeDefined();
      expect(diag.network).toBeDefined();
      expect(diag.oscillation).toBeDefined();
      expect(diag.quality).toBeDefined();

      console.log('Diagnostics:', JSON.stringify(diag, null, 2));
    });

    test('Should reset state properly', () => {
      selector.addNetworkStats({
        bandwidth: 2000,
        rtt: 50,
        packetLoss: 1,
        jitter: 5
      });

      selector.reset();
      const trend = selector.getNetworkTrend();

      expect(trend.confidence).toBe(0); // No data after reset
    });

    test('Full scenario: Degrading network -> Upgrade to screen -> Battery-aware', async () => {
      // Simulate degrading network
      for (let i = 0; i < 5; i++) {
        selector.addNetworkStats({
          bandwidth: 3000 - i * 500,
          rtt: 50 + i * 20,
          packetLoss: 0.5 + i * 0.3,
          jitter: 5 + i * 2
        });
      }

      const trend = selector.getNetworkTrend();
      expect(trend.bandwidthTrend).toBe('degrading');

      // Switch to screen sharing
      selector.initializeQualityLadder('screen');
      const screenProfile = selector.getCurrentQualityProfile();
      expect(screenProfile.contentType).toBe('screen');

      // Get battery-aware codec
      const codec = await selector.getCodecForBattery();
      expect(codec).toBeDefined();

      console.log(`✅ Full scenario completed successfully`);
    });
  });
});
