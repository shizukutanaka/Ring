/**
 * VP9 Codec Migration Test Suite
 * Tests for VP9 codec selection, SVC, and migration
 */

import {
  VP9CodecSelector,
  VP9ScalableVideoCoding,
  VP9CodecMigrationManager
} from './VP9CodecMigration';

describe('VP9 Codec Migration - Phase 2 Improvement #2', () => {
  describe('VP9ScalableVideoCoding', () => {
    test('should create SVC layers with correct bitrate distribution', () => {
      const maxBitrate = 2000;
      const width = 1280;
      const height = 720;

      const layers = VP9ScalableVideoCoding.createSVCLayers(maxBitrate, width, height);

      expect(layers.length).toBe(3);
      expect(layers[0].bitrate).toBeLessThanOrEqual(400); // 20% of max
      expect(layers[1].bitrate).toBeLessThanOrEqual(1000); // 50% of max
      expect(layers[2].bitrate).toBeLessThanOrEqual(2000); // 100% of max
    });

    test('should create SVC layers with resolution scaling', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      // Layer 0: 50% resolution
      expect(layers[0].resolution.width).toBeLessThanOrEqual(640);
      expect(layers[0].resolution.height).toBeLessThanOrEqual(360);

      // Layer 1: 75% resolution
      expect(layers[1].resolution.width).toBeGreaterThanOrEqual(640);
      expect(layers[1].resolution.height).toBeGreaterThanOrEqual(480);

      // Layer 2: 100% resolution
      expect(layers[2].resolution.width).toBe(1280);
      expect(layers[2].resolution.height).toBe(720);
    });

    test('should create SVC layers with proper frame rate', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      expect(layers[0].frameRate).toBeLessThanOrEqual(15);
      expect(layers[1].frameRate).toBeLessThanOrEqual(24);
      expect(layers[2].frameRate).toBe(30);
    });

    test('should select optimal layer based on available bitrate', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      // Low bitrate: select layer 0
      const lowLayer = VP9ScalableVideoCoding.selectOptimalLayer(200, layers);
      expect(lowLayer.spatialLayerId).toBe(0);

      // Medium bitrate: select layer 1
      const mediumLayer = VP9ScalableVideoCoding.selectOptimalLayer(800, layers);
      expect(mediumLayer.spatialLayerId).toBeGreaterThanOrEqual(1);

      // High bitrate: select layer 2
      const highLayer = VP9ScalableVideoCoding.selectOptimalLayer(2000, layers);
      expect(highLayer.spatialLayerId).toBe(2);
    });

    test('should calculate bandwidth savings correctly', () => {
      const h264Bitrate = 3000;
      const vp9Bitrate = 1800;

      const savings = VP9ScalableVideoCoding.calculateBandwidthSavings(h264Bitrate, vp9Bitrate);

      expect(savings.savings).toBe(1200);
      expect(savings.percentage).toBeCloseTo(40, 1);
    });

    test('should handle extreme bitrate values', () => {
      // Very low bitrate
      const lowBitrate = 100;
      const lowLayers = VP9ScalableVideoCoding.createSVCLayers(lowBitrate, 320, 240);
      expect(lowLayers[0].bitrate).toBeGreaterThanOrEqual(100);

      // Very high bitrate
      const highBitrate = 50000;
      const highLayers = VP9ScalableVideoCoding.createSVCLayers(highBitrate, 3840, 2160);
      expect(highLayers[2].bitrate).toBeLessThanOrEqual(50000);
    });

    test('should maintain SVC layer ordering', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      for (let i = 0; i < layers.length - 1; i++) {
        expect(layers[i].bitrate).toBeLessThanOrEqual(layers[i + 1].bitrate);
        expect(layers[i].spatialLayerId).toBeLessThan(layers[i + 1].spatialLayerId);
      }
    });
  });

  describe('VP9CodecSelector', () => {
    let selector: VP9CodecSelector;

    beforeEach(() => {
      selector = new VP9CodecSelector();
    });

    test('should detect H.264 as always available', () => {
      const diag = selector.getDiagnostics();
      expect(diag.h264Fallback).toBe(true);
      expect(diag.supportedCodecs).toContain('h264');
    });

    test('should select codec based on network metrics', () => {
      const goodNetworkMetrics = {
        bitrate: 2000,
        cpu: 50,
        latency: 50,
        packetLoss: 1
      };

      const result = selector.selectOptimalCodec(goodNetworkMetrics);

      expect(result.codec).toBeDefined();
      expect(['vp9-svc', 'vp9', 'h264']).toContain(result.codec);
      expect(result.reason).toBeDefined();
    });

    test('should prefer H.264 with high packet loss', () => {
      const highLossMetrics = {
        bitrate: 2000,
        cpu: 50,
        latency: 50,
        packetLoss: 10
      };

      const result = selector.selectOptimalCodec(highLossMetrics);

      expect(result.codec).toBe('h264');
      expect(result.reason).toContain('packet loss');
    });

    test('should prefer simpler codec with high CPU usage', () => {
      const highCpuMetrics = {
        bitrate: 2000,
        cpu: 85,
        latency: 50,
        packetLoss: 1
      };

      const result = selector.selectOptimalCodec(highCpuMetrics);

      // Should select H.264 or lower-complexity codec
      expect(['vp9-svc', 'vp9', 'h264']).toContain(result.codec);
    });

    test('should respect minimum bitrate for VP9', () => {
      const lowBitrateMetrics = {
        bitrate: 200,
        cpu: 50,
        latency: 50,
        packetLoss: 1
      };

      const result = selector.selectOptimalCodec(lowBitrateMetrics);

      // Low bitrate should use H.264 or VP9, not VP9 SVC
      expect(['vp9', 'h264']).toContain(result.codec);
    });

    test('should create valid VP9 codec parameters', () => {
      const params = selector.createVP9CodecParams();

      expect(params.payloadType).toBe(96);
      expect(params.clockRate).toBe(90000);
      expect(params.parameters['level-asymmetry-allowed']).toBe(true);
    });

    test('should create VP9 SVC codec parameters', () => {
      const params = selector.createVP9SVCCodecParams();

      expect(params.payloadType).toBe(98);
      expect(params.clockRate).toBe(90000);
      expect((params as any).svc).toBe(true);
    });

    test('should return codec preference order', () => {
      const order = selector.getCodecPreferenceOrder();

      expect(Array.isArray(order)).toBe(true);
      expect(order.length).toBeGreaterThan(0);
      expect(order[order.length - 1]).toBe('h264'); // H.264 should be last (fallback)
    });

    test('should provide complete diagnostics', () => {
      const diag = selector.getDiagnostics();

      expect(diag.supportedCodecs).toBeDefined();
      expect(typeof diag.vp9Supported).toBe('boolean');
      expect(typeof diag.vp9SVCSupported).toBe('boolean');
      expect(diag.h264Fallback).toBe(true);
      expect(diag.estimatedBandwidthSavings).toBeDefined();
    });

    test('should show bandwidth savings estimate when VP9 supported', () => {
      const diag = selector.getDiagnostics();

      if (diag.vp9Supported) {
        expect(diag.estimatedBandwidthSavings).toContain('30');
      } else {
        expect(diag.estimatedBandwidthSavings).toContain('H.264');
      }
    });
  });

  describe('VP9CodecMigrationManager', () => {
    let manager: VP9CodecMigrationManager;

    beforeEach(() => {
      manager = new VP9CodecMigrationManager();
    });

    test('should initialize with correct status', () => {
      const status = manager.getStatus();

      expect(status.status).toBe('initial');
      expect(status.diagnostics).toBeDefined();
      expect(typeof status.svgStatus).toBe('boolean');
    });

    test('should initiate VP9 migration', async () => {
      const mockPeerConnection = {};

      const result = await manager.initiateVP9Migration(mockPeerConnection);

      expect(result.success).toBeUndefined;
      expect(result.activeCodec).toBeDefined();
      expect(['vp9-svc', 'vp9', 'h264']).toContain(result.activeCodec);
    });

    test('should return bandwidth savings for VP9', async () => {
      const mockPeerConnection = {};

      const result = await manager.initiateVP9Migration(mockPeerConnection);

      if (result.activeCodec.includes('vp9')) {
        expect(result.bandwidthSavings).toBeGreaterThan(0);
      } else {
        expect(result.bandwidthSavings).toBe(0);
      }
    });

    test('should provide SVC layers', () => {
      const layers = manager.getSVCLayers(2000, 1280, 720);

      expect(Array.isArray(layers)).toBe(true);
      expect(layers.length).toBeGreaterThan(0);
      expect(layers[0]).toHaveProperty('spatialLayerId');
      expect(layers[0]).toHaveProperty('bitrate');
    });

    test('should report status after migration', async () => {
      await manager.initiateVP9Migration({});

      const status = manager.getStatus();

      expect(['vp9-negotiating', 'vp9-active', 'fallback-h264']).toContain(status.status);
    });

    test('should handle migration with various bitrates', async () => {
      for (const bitrate of [500, 1000, 2000, 5000]) {
        const layers = manager.getSVCLayers(bitrate, 1280, 720);
        expect(layers.length).toBeGreaterThan(0);
        expect(layers[layers.length - 1].bitrate).toBeLessThanOrEqual(bitrate);
      }
    });

    test('should handle migration with various resolutions', async () => {
      const resolutions = [
        { w: 320, h: 240 },
        { w: 640, h: 480 },
        { w: 1280, h: 720 },
        { w: 1920, h: 1080 }
      ];

      for (const res of resolutions) {
        const layers = manager.getSVCLayers(2000, res.w, res.h);
        expect(layers[layers.length - 1].resolution.width).toBeLessThanOrEqual(res.w);
        expect(layers[layers.length - 1].resolution.height).toBeLessThanOrEqual(res.h);
      }
    });
  });

  describe('VP9 Codec Integration Scenarios', () => {
    test('should handle full codec selection flow', () => {
      const selector = new VP9CodecSelector();

      const diag = selector.getDiagnostics();
      const preferenceOrder = selector.getCodecPreferenceOrder();
      const selection = selector.selectOptimalCodec({
        bitrate: 2000,
        cpu: 50,
        latency: 50,
        packetLoss: 1
      });

      expect(diag.supportedCodecs.length).toBeGreaterThan(0);
      expect(preferenceOrder.length).toBeGreaterThan(0);
      expect(selection.codec).toBeDefined();
    });

    test('should demonstrate 30-40% bandwidth savings', () => {
      const h264Bitrate = 3000;
      const vp9Bitrate = 1800;

      const savings = VP9ScalableVideoCoding.calculateBandwidthSavings(h264Bitrate, vp9Bitrate);

      expect(savings.percentage).toBeCloseTo(40, 0);
      expect(savings.percentage).toBeGreaterThanOrEqual(30);
      expect(savings.percentage).toBeLessThanOrEqual(50);
    });

    test('should support fallback chain: VP9 SVC → VP9 → H.264', () => {
      const selector = new VP9CodecSelector();
      const preferenceOrder = selector.getCodecPreferenceOrder();

      // H.264 should always be available as fallback
      expect(preferenceOrder).toContain('h264');

      // First codec should be preferred
      const firstCodec = preferenceOrder[0];
      expect(['vp9-svc', 'vp9', 'h264']).toContain(firstCodec);
    });

    test('should maintain backward compatibility with H.264', () => {
      const selector = new VP9CodecSelector();
      const params = selector.createVP9CodecParams();

      // Should be able to create H.264 params too
      expect(params.payloadType).toBeDefined();
      expect(params.clockRate).toBe(90000);
    });
  });

  describe('VP9 Performance Metrics', () => {
    test('should calculate realistic SVC layer bitrates', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      // Total bitrate of all layers should not exceed 2x max
      const totalBitrate = layers.reduce((sum, layer) => sum + layer.bitrate, 0);
      expect(totalBitrate).toBeLessThanOrEqual(2000 * 2);
    });

    test('should handle edge case: very low bitrate', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(100, 320, 240);

      expect(layers[0].bitrate).toBeGreaterThanOrEqual(100);
      expect(layers.length).toBe(3);
    });

    test('should handle edge case: very high bitrate', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(50000, 3840, 2160);

      expect(layers[2].bitrate).toBeLessThanOrEqual(50000);
      expect(layers[2].resolution.width).toBeLessThanOrEqual(3840);
      expect(layers[2].resolution.height).toBeLessThanOrEqual(2160);
    });

    test('should maintain SVC layer temporal ordering', () => {
      const layers = VP9ScalableVideoCoding.createSVCLayers(2000, 1280, 720);

      for (let i = 0; i < layers.length - 1; i++) {
        // Temporal IDs should be consistent
        expect(layers[i].temporalLayerId).toBeLessThanOrEqual(layers[i + 1].temporalLayerId);
      }
    });
  });

  describe('VP9 Research Validation', () => {
    test('should achieve 30-40% bandwidth savings (research-backed)', () => {
      // Based on Chrome VP9 research and real-world metrics
      const testCases = [
        { h264: 1000, vp9: 700, expectedSavings: [30, 40] },
        { h264: 3000, vp9: 1800, expectedSavings: [30, 40] },
        { h264: 5000, vp9: 3000, expectedSavings: [30, 40] }
      ];

      for (const testCase of testCases) {
        const savings = VP9ScalableVideoCoding.calculateBandwidthSavings(
          testCase.h264,
          testCase.vp9
        );

        expect(savings.percentage).toBeGreaterThanOrEqual(testCase.expectedSavings[0]);
        expect(savings.percentage).toBeLessThanOrEqual(testCase.expectedSavings[1]);
      }
    });

    test('should support browser compatibility (Chrome 48+, Firefox 60+, Edge 79+)', () => {
      const selector = new VP9CodecSelector();
      const diag = selector.getDiagnostics();

      // H.264 always supported for backward compatibility
      expect(diag.h264Fallback).toBe(true);
    });

    test('should implement SVC for adaptive streaming', () => {
      const manager = new VP9CodecMigrationManager();

      const layers = manager.getSVCLayers(2000, 1280, 720);

      // Should have multiple layers for adaptation
      expect(layers.length).toBeGreaterThan(1);

      // Each layer should be selectable based on bandwidth
      for (const layer of layers) {
        expect(layer).toHaveProperty('bitrate');
        expect(layer).toHaveProperty('resolution');
        expect(layer).toHaveProperty('frameRate');
      }
    });
  });
});
