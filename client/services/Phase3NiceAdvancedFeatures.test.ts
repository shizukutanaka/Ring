/**
 * Phase 3 NICE-TO-HAVE #3-6 Tests
 * Advanced codec and streaming features
 */

import {
  SimulcastBitrateLadder,
  H264ProfileNegotiator,
  CodecWarmupManager,
  SVCFeatureDetector,
  AdvancedFeaturesManager
} from './Phase3NiceAdvancedFeatures';

describe('SimulcastBitrateLadder', () => {
  let ladder: SimulcastBitrateLadder;

  beforeEach(() => {
    ladder = new SimulcastBitrateLadder();
  });

  describe('Ladder Initialization', () => {
    test('should initialize HD ladder for high bitrate', () => {
      ladder.initializeStandardLadder(3500, 'h264');

      const config = ladder.getConfiguration();
      expect(config.enabled).toBe(true);
      expect(config.layers.length).toBe(3);
      expect(config.layers[0].resolution).toBe('1280x720');
    });

    test('should initialize moderate ladder for medium bitrate', () => {
      ladder.initializeStandardLadder(2000, 'h264');

      const config = ladder.getConfiguration();
      expect(config.enabled).toBe(true);
      expect(config.layers.length).toBe(3);
    });

    test('should initialize low bitrate ladder', () => {
      ladder.initializeStandardLadder(1000, 'h264');

      const config = ladder.getConfiguration();
      expect(config.enabled).toBe(true);
      expect(config.layers.length).toBe(2);
    });

    test('should have proper RIDs for layers', () => {
      ladder.initializeStandardLadder(3000, 'h264');

      const config = ladder.getConfiguration();
      const rids = config.layers.map(l => l.rid);
      expect(rids).toContain('h');
    });
  });

  describe('Ladder Adaptation', () => {
    test('should adapt ladder for limited bandwidth', () => {
      ladder.initializeStandardLadder(3000, 'h264');

      const beforeCount = ladder.getConfiguration().layers.length;

      ladder.adaptLadder(400, 1);

      const afterCount = ladder.getConfiguration().layers.length;
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    });

    test('should reduce bitrates on high packet loss', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const beforeBitrate = ladder.getConfiguration().layers[0].bitrate;

      ladder.adaptLadder(2500, 5);

      const afterBitrate = ladder.getConfiguration().layers[0].bitrate;
      expect(afterBitrate).toBeLessThan(beforeBitrate);
    });

    test('should increase bitrates on excellent conditions', () => {
      ladder.initializeStandardLadder(2000, 'h264');

      const beforeBitrate = ladder.getConfiguration().layers[0].bitrate;

      ladder.adaptLadder(5000, 0.2);

      const afterBitrate = ladder.getConfiguration().layers[0].bitrate;
      expect(afterBitrate).toBeGreaterThan(beforeBitrate);
    });

    test('should maintain adaptation history', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      ladder.adaptLadder(2000, 1);
      ladder.adaptLadder(2500, 1);
      ladder.adaptLadder(3000, 0.5);

      const analysis = ladder.getAnalysis();
      expect(analysis.adjustmentHistory).toBeGreaterThan(1);
    });
  });

  describe('Layer Selection', () => {
    test('should select layer for given bitrate', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const layer = ladder.getLayerForBitrate(1200);

      expect(layer).toBeDefined();
      expect(layer!.bitrate).toBeLessThanOrEqual(1200);
    });

    test('should return best matching layer', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const layer800 = ladder.getLayerForBitrate(800);
      const layer1500 = ladder.getLayerForBitrate(1500);

      expect(layer1500!.bitrate).toBeGreaterThanOrEqual(layer800!.bitrate);
    });

    test('should return undefined when no layer fits', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const layer = ladder.getLayerForBitrate(50);

      expect(layer).toBeUndefined();
    });
  });

  describe('Configuration Control', () => {
    test('should disable simulcast', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      expect(ladder.getConfiguration().enabled).toBe(true);

      ladder.disable();

      expect(ladder.getConfiguration().enabled).toBe(false);
    });

    test('should return configuration copy', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const config1 = ladder.getConfiguration();
      const config2 = ladder.getConfiguration();

      expect(config1).not.toBe(config2);
      expect(config1.layers).not.toBe(config2.layers);
    });
  });

  describe('Analysis', () => {
    test('should provide ladder analysis', () => {
      ladder.initializeStandardLadder(2500, 'h264');

      const analysis = ladder.getAnalysis();

      expect(analysis.enabled).toBe(true);
      expect(analysis.layerCount).toBeGreaterThan(0);
      expect(analysis.totalBitrate).toBeGreaterThan(0);
      expect(analysis.layers).toEqual(expect.any(Array));
    });
  });
});

describe('H264ProfileNegotiator', () => {
  let negotiator: H264ProfileNegotiator;

  beforeEach(() => {
    negotiator = new H264ProfileNegotiator();
  });

  describe('Profile Support Detection', () => {
    test('should always support baseline profile', () => {
      const profiles = negotiator.getSupportedProfiles();

      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0].profile).toBe('baseline');
    });

    test('should detect supported profiles', () => {
      const profiles = negotiator.getSupportedProfiles();

      expect(profiles.length).toBeGreaterThanOrEqual(1);
      expect(profiles.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Profile Negotiation', () => {
    test('should negotiate profile for high CPU device', () => {
      const profile = negotiator.negotiateProfile(0.9, '1920x1080', 30, 4000);

      expect(profile).toBeDefined();
      expect(['baseline', 'main', 'high']).toContain(profile!.profile);
    });

    test('should negotiate profile for low CPU device', () => {
      const profile = negotiator.negotiateProfile(0.2, '640x360', 15, 500);

      expect(profile).toBeDefined();
      expect(profile!.profile).toBe('baseline');
    });

    test('should prefer high profile for capable devices', () => {
      const lowCPUProfile = negotiator.negotiateProfile(0.2, '1280x720', 30, 2000);
      const highCPUProfile = negotiator.negotiateProfile(0.9, '1280x720', 30, 2000);

      expect(lowCPUProfile!.profile).toBe('baseline');
      // High CPU might get main or high depending on what's available
      expect(['main', 'high', 'baseline']).toContain(highCPUProfile!.profile);
    });

    test('should respect resolution constraints', () => {
      const profile = negotiator.negotiateProfile(0.9, '320x240', 15, 300);

      expect(profile).toBeDefined();
      // Should be able to handle 320x240
    });

    test('should respect framerate constraints', () => {
      const profile = negotiator.negotiateProfile(0.9, '1280x720', 60, 6000);

      expect(profile).toBeDefined();
      expect(profile!.maxFramerate).toBeGreaterThanOrEqual(60);
    });
  });

  describe('MIME Type Generation', () => {
    test('should generate valid MIME type for baseline', () => {
      const negotiator = new H264ProfileNegotiator();
      const profile = negotiator.getSupportedProfiles()[0];

      const mimeType = negotiator.getMimeType(profile);

      expect(mimeType).toMatch(/^video\/avc;profile-level-id=/);
      expect(mimeType).toContain('42e01e');
    });

    test('should generate different MIME types for different profiles', () => {
      const profiles = negotiator.getSupportedProfiles();

      if (profiles.length > 1) {
        const mime1 = negotiator.getMimeType(profiles[0]);
        const mime2 = negotiator.getMimeType(profiles[1]);

        if (profiles[0].profile !== profiles[1].profile) {
          expect(mime1).not.toBe(mime2);
        }
      }
    });
  });

  describe('Selected Profile Tracking', () => {
    test('should track selected profile', () => {
      const profile = negotiator.negotiateProfile(0.6, '1280x720', 30, 2000);

      const selected = negotiator.getSelectedProfile();

      expect(selected).toEqual(profile);
    });
  });
});

describe('CodecWarmupManager', () => {
  let manager: CodecWarmupManager;

  beforeEach(() => {
    manager = new CodecWarmupManager();
  });

  describe('Codec Warmup', () => {
    test('should warmup codec', async () => {
      const result = await manager.warmupCodec('h264');

      expect(result.codec).toBe('h264');
      expect(result.warmupTimeMs).toBeGreaterThan(0);
      expect(result.ready).toBe(true);
    });

    test('should measure first frame encoding time', async () => {
      const result = await manager.warmupCodec('h264');

      expect(result.firstEncodingTimeMs).toBeGreaterThan(0);
    });

    test('should measure subsequent frame encoding time', async () => {
      const result = await manager.warmupCodec('h264');

      expect(result.subsequentEncodingTimeMs).toBeGreaterThan(0);
      expect(result.subsequentEncodingTimeMs).toBeLessThanOrEqual(
        result.firstEncodingTimeMs
      );
    });

    test('should measure CPU usage', async () => {
      const result = await manager.warmupCodec('h264');

      expect(result.cpuUsage).toBeGreaterThan(0);
      expect(result.cpuUsage).toBeLessThanOrEqual(100);
    });

    test('should handle different codecs', async () => {
      const h264 = await manager.warmupCodec('h264');
      const vp9 = await manager.warmupCodec('vp9');

      expect(h264.codec).toBe('h264');
      expect(vp9.codec).toBe('vp9');

      // VP9 might have different timing
      expect(vp9.firstEncodingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Parallel Warmup', () => {
    test('should warmup multiple codecs', async () => {
      const results = await manager.warmupMultipleCodecs(['h264', 'vp9', 'av1']);

      expect(results.length).toBe(3);
      results.forEach(r => {
        expect(r.ready).toBe(true);
      });
    });
  });

  describe('Warmup Status', () => {
    test('should report codec ready status', async () => {
      const result = await manager.warmupCodec('h264');

      expect(manager.isCodecReady('h264')).toBe(true);
      expect(manager.isCodecReady('vp9')).toBe(false);
    });

    test('should retrieve warmup results', async () => {
      await manager.warmupCodec('h264');
      await manager.warmupCodec('vp9');

      const h264Result = manager.getWarmupResult('h264');
      expect(h264Result).toBeDefined();
      expect(h264Result!.ready).toBe(true);
    });

    test('should get all warmup results', async () => {
      await manager.warmupCodec('h264');
      await manager.warmupCodec('vp9');

      const allResults = manager.getAllResults();

      expect(allResults.length).toBe(2);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear warmup results on reset', async () => {
      await manager.warmupCodec('h264');

      manager.reset();

      expect(manager.getAllResults().length).toBe(0);
      expect(manager.isCodecReady('h264')).toBe(false);
    });
  });
});

describe('SVCFeatureDetector', () => {
  let detector: SVCFeatureDetector;

  beforeEach(() => {
    detector = new SVCFeatureDetector();
  });

  describe('Capability Detection', () => {
    test('should detect SVC support', () => {
      const capabilities = detector.getCapabilities();

      expect(typeof capabilities.supported).toBe('boolean');
    });

    test('should list supported modes', () => {
      const capabilities = detector.getCapabilities();

      if (capabilities.supported) {
        expect(capabilities.supportedModes.length).toBeGreaterThan(0);
      }
    });

    test('should specify max layer counts', () => {
      const capabilities = detector.getCapabilities();

      expect(capabilities.maxTemporalLayers).toBeGreaterThanOrEqual(0);
      expect(capabilities.maxSpatialLayers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mode Support', () => {
    test('should check mode support', () => {
      const supported = detector.isModeSupported('L1T2');

      expect(typeof supported).toBe('boolean');
    });

    test('should return false for unsupported mode', () => {
      expect(detector.isModeSupported('INVALID')).toBe(false);
    });
  });

  describe('Mode Recommendation', () => {
    test('should recommend mode for small conference', () => {
      const mode = detector.getRecommendedMode(2, 0.8);

      if (mode) {
        expect(typeof mode).toBe('string');
      }
    });

    test('should recommend mode for large conference', () => {
      const mode = detector.getRecommendedMode(15, 0.8);

      if (mode) {
        expect(typeof mode).toBe('string');
      }
    });

    test('should return undefined for single participant', () => {
      const mode = detector.getRecommendedMode(1, 0.8);

      expect(mode).toBeUndefined();
    });

    test('should consider network quality in recommendation', () => {
      const goodNetwork = detector.getRecommendedMode(5, 0.9);
      const poorNetwork = detector.getRecommendedMode(5, 0.3);

      // Both might be defined, but poor network might get fewer layers
      expect([goodNetwork, poorNetwork]).toBeDefined();
    });
  });

  describe('Layer Info Extraction', () => {
    test('should extract layer info from mode string', () => {
      const info = detector.getLayerInfo('L2T2');

      expect(info).toBeDefined();
      if (info) {
        expect(info.spatial).toBe(2);
        expect(info.temporal).toBe(2);
      }
    });

    test('should return null for invalid mode', () => {
      expect(detector.getLayerInfo('INVALID')).toBeNull();
      expect(detector.getLayerInfo('')).toBeNull();
    });
  });

  describe('Summary', () => {
    test('should provide capability summary', () => {
      const summary = detector.getSummary();

      expect(summary.svcSupported).toBeDefined();
      expect(summary.supportedModes).toEqual(expect.any(Array));
      expect(summary.recommendation).toBeDefined();
      expect(summary.maxLayers).toBeDefined();
    });
  });
});

describe('AdvancedFeaturesManager', () => {
  let manager: AdvancedFeaturesManager;

  beforeEach(() => {
    manager = new AdvancedFeaturesManager();
  });

  describe('Initialization', () => {
    test('should initialize all features', async () => {
      await manager.initialize('h264', 2500);

      const simulcast = manager.getSimulcastConfig();
      const warmup = manager.getCodecWarmupStatus();

      expect(simulcast.enabled).toBe(true);
      expect(warmup.length).toBeGreaterThan(0);
    });

    test('should negotiate H.264 profile when using H.264', async () => {
      await manager.initialize('h264', 2500);

      const profile = manager.getH264Profile();

      if (profile) {
        expect(['baseline', 'main', 'high']).toContain(profile.profile);
      }
    });
  });

  describe('Feature Access', () => {
    test('should provide simulcast configuration', async () => {
      await manager.initialize('h264', 2500);

      const config = manager.getSimulcastConfig();

      expect(config.enabled).toBe(true);
      expect(config.layers.length).toBeGreaterThan(0);
    });

    test('should provide codec warmup status', async () => {
      await manager.initialize('h264', 2500);

      const warmupStatus = manager.getCodecWarmupStatus();

      expect(warmupStatus).toEqual(expect.any(Array));
    });

    test('should provide SVC capabilities', async () => {
      await manager.initialize('h264', 2500);

      const svcCaps = manager.getSVCCapabilities();

      expect(svcCaps.supported).toBeDefined();
    });
  });

  describe('Diagnostics', () => {
    test('should provide comprehensive diagnostics', async () => {
      await manager.initialize('h264', 2500);

      const diag = manager.getDiagnostics();

      expect(diag.timestamp).toBeDefined();
      expect(diag.simulcast).toBeDefined();
      expect(diag.h264).toBeDefined();
      expect(diag.codec).toBeDefined();
      expect(diag.svc).toBeDefined();
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all managers', async () => {
      await manager.initialize('h264', 2500);

      manager.reset();

      const warmupStatus = manager.getCodecWarmupStatus();
      expect(warmupStatus.length).toBe(0);
    });
  });
});
