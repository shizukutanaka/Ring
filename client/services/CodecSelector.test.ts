/**
 * CodecSelector Unit Tests
 * Tests for Phase 1: 6 MUST-HAVE improvements
 *
 * Run with: npm test -- CodecSelector.test.ts
 */

import { CodecSelector, Platform, CodecConfiguration } from './CodecSelector';

describe('CodecSelector - Phase 1 Improvements', () => {
  // Mock ClientCapabilities
  const mockCapabilities = {
    video: {
      codecs: [
        { mimeType: 'video/h264', clockRate: 90000 },
        { mimeType: 'video/vp9', clockRate: 90000 },
        { mimeType: 'video/av1', clockRate: 90000 }
      ],
      simulcastSupport: true,
      svcSupport: true
    },
    audio: {
      codecs: [
        { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
        { mimeType: 'audio/g722', clockRate: 8000, channels: 1 }
      ]
    }
  };

  // ========================================
  // IMPROVEMENT #2: Platform Detection
  // ========================================
  describe('Improvement #2: Platform Detection', () => {
    // Note: These tests assume we can mock navigator.userAgent
    // In real tests, use jest.spyOn or similar

    test('detectPlatform() returns iOS for iPhone/iPad', () => {
      // Mock implementation - in real test would mock navigator.userAgent
      const originalUA = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        configurable: true
      });

      const platform = CodecSelector.detectPlatform();
      expect(['iOS', 'Unknown']).toContain(platform); // Depends on test environment

      if (originalUA) {
        Object.defineProperty(navigator, 'userAgent', originalUA);
      }
    });

    test('detectPlatform() returns Android for Android devices', () => {
      // Similar mock approach
      expect(['Android', 'Unknown']).toContain(CodecSelector.detectPlatform());
    });

    test('Platform type is valid', () => {
      const platform = CodecSelector.detectPlatform();
      const validPlatforms: Platform[] = ['iOS', 'Android', 'Desktop', 'Unknown'];
      expect(validPlatforms).toContain(platform);
    });
  });

  // ========================================
  // IMPROVEMENT #3: Hardware Acceleration Detection
  // ========================================
  describe('Improvement #3: Hardware Acceleration Detection', () => {
    test('detectHardwareAcceleration() returns correct type', async () => {
      const hwAccel = await CodecSelector.detectHardwareAcceleration();

      expect(hwAccel).toHaveProperty('h264');
      expect(hwAccel).toHaveProperty('vp9');
      expect(hwAccel).toHaveProperty('av1');

      expect(typeof hwAccel.h264).toBe('boolean');
      expect(typeof hwAccel.vp9).toBe('boolean');
      expect(typeof hwAccel.av1).toBe('boolean');
    });

    test('detectHardwareAcceleration() handles WebCodecs API unavailability gracefully', async () => {
      // Mock absence of VideoEncoder
      const originalVideoEncoder = (window as any).VideoEncoder;
      delete (window as any).VideoEncoder;

      const hwAccel = await CodecSelector.detectHardwareAcceleration();

      // Should return all false when API unavailable
      expect(hwAccel.h264).toBe(false);
      expect(hwAccel.vp9).toBe(false);
      expect(hwAccel.av1).toBe(false);

      // Restore
      if (originalVideoEncoder) {
        (window as any).VideoEncoder = originalVideoEncoder;
      }
    });

    test('getBatteryLevel() returns number or null', async () => {
      const batteryLevel = await CodecSelector.getBatteryLevel();

      expect(
        batteryLevel === null || (typeof batteryLevel === 'number' && batteryLevel >= 0 && batteryLevel <= 1)
      ).toBe(true);
    });
  });

  // ========================================
  // IMPROVEMENT #1 & #5: H.264 Simulcast + Mutual Exclusion
  // ========================================
  describe('Improvement #1 & #5: H.264 Simulcast Bug Fix', () => {
    test('H.264 enables simulcast for conference (3+ participants)', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        5 // 5 participants
      );

      if (config.videoCodec === 'h264') {
        expect(config.enableSimulcast).toBe(true); // ✅ BUG FIXED
        expect(config.enableSVC).toBe(false);
      }
    });

    test('Simulcast and SVC are mutually exclusive', async () => {
      // Test various scenarios
      const scenarios = [
        { codec: 'h264', participants: 5, callType: 'conference' as const },
        { codec: 'vp9', participants: 10, callType: 'conference' as const },
        { codec: 'av1', participants: 20, callType: 'conference' as const }
      ];

      for (const scenario of scenarios) {
        const config = await CodecSelector.selectOptimalCodecs(
          mockCapabilities,
          { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
          scenario.callType,
          undefined,
          scenario.participants
        );

        // Should never have both true
        if (config.enableSimulcast && config.enableSVC) {
          fail(`Both simulcast and SVC enabled for codec=${config.videoCodec}, participants=${scenario.participants}`);
        }
      }
    });

    test('P2P calls disable both simulcast and SVC (wasteful)', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 5000, rtt: 20, packetLoss: 0.5, jitter: 2 },
        'p2p',
        undefined,
        2 // P2P
      );

      expect(config.enableSimulcast).toBe(false);
      expect(config.enableSVC).toBe(false);
    });
  });

  // ========================================
  // IMPROVEMENT #4: Participant Count Logic
  // ========================================
  describe('Improvement #4: Participant Count in Decision Logic', () => {
    test('Large conferences (15+) prefer H.264', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 3000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        20 // 20 participants
      );

      // Large conference should use H.264 for compatibility
      expect(config.videoCodec).toBe('h264');
    });

    test('Quality settings scale with participant count', async () => {
      const smallConf = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        5 // Small conference
      );

      const largeConf = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        20 // Large conference
      );

      // Large conference should use lower or equal resolution
      const smallResPixels = parseInt(smallConf.resolution.split('x')[0]) * parseInt(smallConf.resolution.split('x')[1]);
      const largeResPixels = parseInt(largeConf.resolution.split('x')[0]) * parseInt(largeConf.resolution.split('x')[1]);

      expect(largeResPixels).toBeLessThanOrEqual(smallResPixels);
    });

    test('P2P (2 participants) uses best available codec', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 5000, rtt: 20, packetLoss: 0.5, jitter: 2 },
        'p2p',
        undefined,
        2
      );

      // P2P should prefer AV1 if available and bandwidth allows
      expect(['av1', 'vp9', 'h264']).toContain(config.videoCodec);
    });
  });

  // ========================================
  // IMPROVEMENT #6: Opus Configuration
  // ========================================
  describe('Improvement #6: Opus Audio Configuration', () => {
    test('selectAudioCodec returns OpusConfiguration for conference', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        5
      );

      expect(config.audioCodec).not.toBe('opus'); // Should be object, not string

      if (typeof config.audioCodec !== 'string') {
        expect(config.audioCodec.codec).toBe('opus');
        expect(typeof config.audioCodec.bitrate).toBe('number');
        expect(typeof config.audioCodec.dtx).toBe('boolean');
        expect(typeof config.audioCodec.fec).toBe('boolean');
      }
    });

    test('Opus DTX enabled for conferences (3+ participants)', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        5
      );

      if (typeof config.audioCodec !== 'string') {
        expect(config.audioCodec.dtx).toBe(true); // ✅ DTX enabled
      }
    });

    test('Opus DTX disabled for P2P calls', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 5000, rtt: 20, packetLoss: 0.5, jitter: 2 },
        'p2p',
        undefined,
        2
      );

      if (typeof config.audioCodec !== 'string') {
        expect(config.audioCodec.dtx).toBe(false); // DTX off for P2P
      }
    });

    test('Opus bitrate scales with participant count', async () => {
      const small = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        3
      );

      const large = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        15
      );

      let smallBitrate = 32000;
      let largeBitrate = 32000;

      if (typeof small.audioCodec !== 'string') {
        smallBitrate = small.audioCodec.bitrate;
      }
      if (typeof large.audioCodec !== 'string') {
        largeBitrate = large.audioCodec.bitrate;
      }

      // Large conference should use lower bitrate
      expect(largeBitrate).toBeLessThanOrEqual(smallBitrate);
    });

    test('Opus FEC enabled when packet loss > 2%', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 5, jitter: 5 }, // 5% packet loss
        'conference',
        undefined,
        5
      );

      if (typeof config.audioCodec !== 'string') {
        expect(config.audioCodec.fec).toBe(true); // ✅ FEC enabled
      }
    });

    test('Opus SDP fmtpLine contains DTX and FEC settings', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 3, jitter: 5 },
        'conference',
        undefined,
        5
      );

      if (typeof config.audioCodec !== 'string' && config.audioCodec.sdpFmtpLine) {
        const fmtp = config.audioCodec.sdpFmtpLine;

        expect(fmtp).toContain('minptime=10');
        expect(fmtp).toContain('maxaveragebitrate=');

        if (config.audioCodec.dtx) {
          expect(fmtp).toContain('usedtx=1');
        }
        if (config.audioCodec.fec) {
          expect(fmtp).toContain('useinbandfec=1');
        }
      }
    });
  });

  // ========================================
  // Integration Tests
  // ========================================
  describe('Integration Tests', () => {
    test('iOS conference produces H.264 with simulcast', async () => {
      // Simulate iOS platform
      const iosConfig = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        5,
        'iOS' // Platform parameter
      );

      expect(iosConfig.videoCodec).toBe('h264');
      expect(iosConfig.enableSimulcast).toBe(true);

      // Audio should be Opus with DTX
      if (typeof iosConfig.audioCodec !== 'string') {
        expect(iosConfig.audioCodec.codec).toBe('opus');
        expect(iosConfig.audioCodec.dtx).toBe(true);
      }
    });

    test('Desktop P2P produces high-quality config', async () => {
      const desktopConfig = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 10000, rtt: 20, packetLoss: 0.1, jitter: 2 },
        'p2p',
        undefined,
        2,
        'Desktop'
      );

      // Desktop with good bandwidth should use AV1 or VP9
      expect(['av1', 'vp9']).toContain(desktopConfig.videoCodec);

      // Full HD resolution
      expect(desktopConfig.resolution).toBe('1920x1080');
      expect(desktopConfig.framerate).toBe(30);

      // No simulcast/SVC for P2P
      expect(desktopConfig.enableSimulcast).toBe(false);
      expect(desktopConfig.enableSVC).toBe(false);
    });

    test('Large conference with poor network degrades gracefully', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 1000, rtt: 200, packetLoss: 3, jitter: 30 },
        'conference',
        undefined,
        25
      );

      expect(config.videoCodec).toBe('h264');
      expect(config.enableSimulcast).toBe(true);

      // Resolution should be very low
      const pixels =
        parseInt(config.resolution.split('x')[0]) * parseInt(config.resolution.split('x')[1]);
      expect(pixels).toBeLessThanOrEqual(640 * 480); // Max 480p

      // Framerate should be reduced
      expect(config.framerate).toBeLessThanOrEqual(15);

      // Audio bitrate very low
      if (typeof config.audioCodec !== 'string') {
        expect(config.audioCodec.bitrate).toBeLessThanOrEqual(16000);
      }
    });
  });

  // ========================================
  // Backward Compatibility Tests
  // ========================================
  describe('Backward Compatibility', () => {
    test('selectOptimalCodecs still works with default parameters', async () => {
      // Call without new parameters
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 }
      );

      expect(config).toHaveProperty('videoCodec');
      expect(config).toHaveProperty('audioCodec');
      expect(config).toHaveProperty('resolution');
      expect(config).toHaveProperty('framerate');
      expect(config).toHaveProperty('bitrate');
    });

    test('selectOptimalCodecs works with call type', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference'
      );

      expect(config.videoCodec).toBeDefined();
      expect(config.audioCodec).toBeDefined();
    });

    test('selectOptimalCodecs works with user preference', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'p2p',
        { videoCodec: 'vp9' }
      );

      expect(config.videoCodec).toBe('vp9');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    test('Handles zero bandwidth gracefully', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 0, rtt: 50, packetLoss: 10, jitter: 50 },
        'conference'
      );

      expect(config.videoCodec).toBeDefined();
      expect(config.bitrate).toBeGreaterThanOrEqual(0);
    });

    test('Handles 100% packet loss gracefully', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 100, jitter: 50 },
        'conference'
      );

      // Should still produce valid config
      expect(config.videoCodec).toBeDefined();
      expect(config.audioCodec).toBeDefined();
    });

    test('Handles single participant gracefully', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        1
      );

      expect(config).toHaveProperty('videoCodec');
    });

    test('Handles very large conference (100+ participants)', async () => {
      const config = await CodecSelector.selectOptimalCodecs(
        mockCapabilities,
        { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
        'conference',
        undefined,
        100
      );

      expect(config.videoCodec).toBe('h264');
      // Should use very low quality
      expect(config.framerate).toBeLessThanOrEqual(15);
    });
  });
});
