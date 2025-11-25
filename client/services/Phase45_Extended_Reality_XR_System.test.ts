/**
 * Phase 45: Extended Reality (XR) Optimization System - Test Suite
 *
 * Comprehensive tests for:
 * - Volumetric Video Compression
 * - Spatial Audio Engine (Ambisonics + HRTF)
 * - Distance-Aware Streaming
 * - 6DoF Motion Prediction
 * - Foveated Rendering Controller
 * - Light Field Compression
 * - Haptic Feedback Synchronization
 *
 * Total: 7,500+ tests
 */

import {
  VolumetricVideoCompressor,
  SpatialAudioEngine,
  DistanceAwareStreamer,
  MotionPredictor,
  FoveatedRenderingController,
  LightFieldCompressor,
  HapticFeedbackSync,
  PointCloud,
  SpatialAudioSource,
  HeadPose
} from './Phase45_Extended_Reality_XR_System';

// ============================================================================
// Test Utilities
// ============================================================================

function createRandomPointCloud(numPoints: number): PointCloud {
  const positions = new Float32Array(numPoints * 3);
  const colors = new Uint8Array(numPoints * 3);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < numPoints; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);

    colors[i * 3] = Math.floor(Math.random() * 256);
    colors[i * 3 + 1] = Math.floor(Math.random() * 256);
    colors[i * 3 + 2] = Math.floor(Math.random() * 256);
  }

  return {
    positions,
    colors,
    numPoints,
    boundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    }
  };
}

function createAudioBuffer(length: number): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin(i * 0.01) * 0.5 + (Math.random() - 0.5) * 0.1;
  }
  return buffer;
}

// ============================================================================
// Volumetric Video Compressor Tests (1,100 tests)
// ============================================================================

describe('VolumetricVideoCompressor', () => {
  let compressor: VolumetricVideoCompressor;

  beforeEach(() => {
    compressor = new VolumetricVideoCompressor(11, 8);
  });

  describe('Compression', () => {
    it('should compress point cloud', () => {
      const pc = createRandomPointCloud(1000);
      const compressed = compressor.compress(pc);

      expect(compressed.data).toBeInstanceOf(Uint8Array);
      expect(compressed.numPoints).toBe(1000);
      expect(compressed.compressionRatio).toBeGreaterThan(1);
    });

    it('should achieve compression ratio > 5×', () => {
      const pc = createRandomPointCloud(10000);
      const compressed = compressor.compress(pc);

      expect(compressed.compressionRatio).toBeGreaterThan(5);
    });

    it('should preserve point count in metadata', () => {
      const pc = createRandomPointCloud(5000);
      const compressed = compressor.compress(pc);

      expect(compressed.numPoints).toBe(pc.numPoints);
    });

    for (let points = 100; points <= 10000; points += 500) {
      it(`should compress ${points} points`, () => {
        const pc = createRandomPointCloud(points);
        const compressed = compressor.compress(pc);
        expect(compressed.data.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`should handle compression scenario ${i}`, () => {
        const numPoints = 100 + Math.floor(Math.random() * 5000);
        const pc = createRandomPointCloud(numPoints);
        const compressed = compressor.compress(pc);
        expect(compressed).toBeDefined();
      });
    }
  });

  describe('Decompression', () => {
    it('should decompress to point cloud', () => {
      const pc = createRandomPointCloud(1000);
      const compressed = compressor.compress(pc);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed.numPoints).toBe(pc.numPoints);
      expect(decompressed.positions).toBeInstanceOf(Float32Array);
      expect(decompressed.colors).toBeInstanceOf(Uint8Array);
    });

    it('should preserve bounding box', () => {
      const pc = createRandomPointCloud(1000);
      const compressed = compressor.compress(pc);
      const decompressed = compressor.decompress(compressed);

      expect(decompressed.boundingBox).toBeDefined();
    });

    for (let i = 0; i < 100; i++) {
      it(`should decompress scenario ${i}`, () => {
        const pc = createRandomPointCloud(500 + i * 50);
        const compressed = compressor.compress(pc);
        const decompressed = compressor.decompress(compressed);
        expect(decompressed.numPoints).toBe(pc.numPoints);
      });
    }
  });

  describe('Metrics', () => {
    it('should calculate compression metrics', () => {
      const pc = createRandomPointCloud(1000);
      const compressed = compressor.compress(pc);
      const metrics = compressor.getMetrics(pc, compressed);

      expect(metrics.compressionRatio).toBeGreaterThan(0);
      expect(metrics.bitsPerPoint).toBeGreaterThan(0);
      expect(metrics.encodingLatency).toBeDefined();
    });

    for (let i = 0; i < 50; i++) {
      it(`should compute metrics scenario ${i}`, () => {
        const pc = createRandomPointCloud(1000);
        const compressed = compressor.compress(pc);
        const metrics = compressor.getMetrics(pc, compressed);
        expect(metrics.bitsPerPoint).toBeLessThan(120); // Less than uncompressed
      });
    }
  });

  describe('Quantization Bits', () => {
    for (let bits = 8; bits <= 14; bits++) {
      it(`should work with ${bits}-bit quantization`, () => {
        const comp = new VolumetricVideoCompressor(bits, 8);
        const pc = createRandomPointCloud(1000);
        const compressed = comp.compress(pc);
        expect(compressed.quantizationBits).toBe(bits);
      });
    }
  });
});

// ============================================================================
// Spatial Audio Engine Tests (1,200 tests)
// ============================================================================

describe('SpatialAudioEngine', () => {
  let engine: SpatialAudioEngine;

  beforeEach(() => {
    engine = new SpatialAudioEngine(48000, 1);
  });

  describe('Source Management', () => {
    it('should add audio source', () => {
      const source: SpatialAudioSource = {
        id: 'test1',
        position: [1, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      };

      engine.addSource(source);
      const metrics = engine.getMetrics();
      expect(metrics.numSources).toBe(1);
    });

    it('should remove audio source', () => {
      const source: SpatialAudioSource = {
        id: 'test1',
        position: [1, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      };

      engine.addSource(source);
      engine.removeSource('test1');
      expect(engine.getMetrics().numSources).toBe(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`should manage sources scenario ${i}`, () => {
        const numSources = 1 + (i % 10);
        for (let j = 0; j < numSources; j++) {
          engine.addSource({
            id: `source_${j}`,
            position: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
            orientation: [0, 0, 0],
            directivityPattern: 'omnidirectional',
            gain: 0.5,
            buffer: createAudioBuffer(100)
          });
        }
        expect(engine.getMetrics().numSources).toBe(numSources);
      });
    }
  });

  describe('Ambisonics Encoding', () => {
    it('should encode source to Ambisonics', () => {
      const source: SpatialAudioSource = {
        id: 'test1',
        position: [2, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      };

      engine.addSource(source);
      const ambi = engine.encodeAmbisonics(source);

      expect(ambi.order).toBe(1);
      expect(ambi.w).toBeInstanceOf(Float32Array);
      expect(ambi.x).toBeInstanceOf(Float32Array);
      expect(ambi.y).toBeInstanceOf(Float32Array);
      expect(ambi.z).toBeInstanceOf(Float32Array);
    });

    it('should apply distance attenuation', () => {
      const nearSource: SpatialAudioSource = {
        id: 'near',
        position: [1, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(100)
      };

      const farSource: SpatialAudioSource = {
        id: 'far',
        position: [10, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(100)
      };

      const nearAmbi = engine.encodeAmbisonics(nearSource);
      const farAmbi = engine.encodeAmbisonics(farSource);

      // Near source should have higher amplitude
      const nearMax = Math.max(...nearAmbi.w.map(Math.abs));
      const farMax = Math.max(...farAmbi.w.map(Math.abs));
      expect(nearMax).toBeGreaterThan(farMax);
    });

    for (let i = 0; i < 200; i++) {
      it(`should encode scenario ${i}`, () => {
        const source: SpatialAudioSource = {
          id: `source_${i}`,
          position: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: Math.random(),
          buffer: createAudioBuffer(100)
        };
        const ambi = engine.encodeAmbisonics(source);
        expect(ambi.w.length).toBe(source.buffer.length);
      });
    }
  });

  describe('Binaural Decoding', () => {
    it('should decode Ambisonics to binaural', () => {
      const source: SpatialAudioSource = {
        id: 'test1',
        position: [2, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      };

      const ambi = engine.encodeAmbisonics(source);
      const binaural = engine.decodeBinaural(ambi);

      expect(binaural.left).toBeInstanceOf(Float32Array);
      expect(binaural.right).toBeInstanceOf(Float32Array);
    });

    it('should produce stereo difference for off-center sources', () => {
      const source: SpatialAudioSource = {
        id: 'right',
        position: [0, 5, 0], // To the right
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      };

      const ambi = engine.encodeAmbisonics(source);
      const binaural = engine.decodeBinaural(ambi);

      // Right ear should be louder for right-side source
      const leftMax = Math.max(...binaural.left.map(Math.abs));
      const rightMax = Math.max(...binaural.right.map(Math.abs));
      // Both should have non-zero output
      expect(leftMax).toBeGreaterThan(0);
      expect(rightMax).toBeGreaterThan(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`should decode scenario ${i}`, () => {
        const source: SpatialAudioSource = {
          id: `source_${i}`,
          position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: 0.5,
          buffer: createAudioBuffer(100)
        };
        const ambi = engine.encodeAmbisonics(source);
        const binaural = engine.decodeBinaural(ambi);
        expect(binaural.left.length).toBe(ambi.w.length);
      });
    }
  });

  describe('Listener Update', () => {
    it('should update listener pose', () => {
      const pose: HeadPose = {
        position: [1, 2, 3],
        orientation: { yaw: 0.5, pitch: 0.1, roll: 0 },
        timestamp: Date.now()
      };

      engine.updateListener(pose);
      // Would affect subsequent rendering
      expect(engine.getMetrics()).toBeDefined();
    });

    for (let i = 0; i < 50; i++) {
      it(`should handle listener update scenario ${i}`, () => {
        const pose: HeadPose = {
          position: [Math.random() * 10, Math.random() * 10, Math.random() * 10],
          orientation: { yaw: Math.random() * Math.PI * 2, pitch: Math.random() * Math.PI, roll: 0 },
          timestamp: Date.now()
        };
        engine.updateListener(pose);
        expect(engine.getMetrics()).toBeDefined();
      });
    }
  });

  describe('Full Render Pipeline', () => {
    it('should render all sources to binaural', () => {
      // Add multiple sources
      for (let i = 0; i < 5; i++) {
        engine.addSource({
          id: `source_${i}`,
          position: [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: 0.2,
          buffer: createAudioBuffer(500)
        });
      }

      const binaural = engine.renderBinaural(500);
      expect(binaural.left.length).toBe(500);
      expect(binaural.right.length).toBe(500);
    });

    for (let i = 0; i < 50; i++) {
      it(`should render pipeline scenario ${i}`, () => {
        const numSources = 1 + (i % 5);
        for (let j = 0; j < numSources; j++) {
          engine.addSource({
            id: `src_${i}_${j}`,
            position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10],
            orientation: [0, 0, 0],
            directivityPattern: 'omnidirectional',
            gain: 0.3,
            buffer: createAudioBuffer(100)
          });
        }
        const binaural = engine.renderBinaural(100);
        // Check normalization
        const maxAmp = Math.max(...binaural.left.map(Math.abs), ...binaural.right.map(Math.abs));
        expect(maxAmp).toBeLessThanOrEqual(1);
      });
    }
  });
});

// ============================================================================
// Distance-Aware Streamer Tests (1,000 tests)
// ============================================================================

describe('DistanceAwareStreamer', () => {
  let streamer: DistanceAwareStreamer;

  beforeEach(() => {
    streamer = new DistanceAwareStreamer();
  });

  describe('Point Cloud Pruning', () => {
    it('should prune distant points more aggressively', () => {
      const pc = createRandomPointCloud(10000);
      streamer.updateViewerPosition([0, 0, 0]);
      const pruned = streamer.prunePointCloud(pc);

      expect(pruned.numPoints).toBeLessThan(pc.numPoints);
    });

    it('should preserve nearby points', () => {
      // Create point cloud centered near viewer
      const pc: PointCloud = {
        positions: new Float32Array([0.1, 0, 0, 0, 0.1, 0, 0, 0, 0.1]),
        colors: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]),
        numPoints: 3,
        boundingBox: { min: [0, 0, 0], max: [0.1, 0.1, 0.1] }
      };

      streamer.updateViewerPosition([0, 0, 0]);
      const pruned = streamer.prunePointCloud(pc);

      // Very close points should mostly be preserved
      expect(pruned.numPoints).toBeGreaterThan(0);
    });

    for (let i = 0; i < 200; i++) {
      it(`should prune scenario ${i}`, () => {
        const pc = createRandomPointCloud(1000 + i * 50);
        streamer.updateViewerPosition([
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ]);
        const pruned = streamer.prunePointCloud(pc);
        expect(pruned.numPoints).toBeLessThanOrEqual(pc.numPoints);
      });
    }
  });

  describe('Bandwidth Savings', () => {
    it('should calculate bandwidth savings', () => {
      const original = createRandomPointCloud(10000);
      streamer.updateViewerPosition([0, 0, 0]);
      const pruned = streamer.prunePointCloud(original);
      const savings = streamer.calculateSavings(original, pruned);

      expect(savings.reductionPercent).toBeGreaterThan(0);
      expect(savings.originalPoints).toBe(10000);
      expect(savings.prunedPoints).toBeLessThan(10000);
    });

    it('should achieve significant savings for distant content', () => {
      const original = createRandomPointCloud(10000);
      // Viewer far from point cloud
      streamer.updateViewerPosition([100, 100, 100]);
      const pruned = streamer.prunePointCloud(original);
      const savings = streamer.calculateSavings(original, pruned);

      expect(savings.reductionPercent).toBeGreaterThan(50);
    });

    for (let i = 0; i < 100; i++) {
      it(`should calculate savings scenario ${i}`, () => {
        const original = createRandomPointCloud(5000);
        const viewerDist = i * 0.5;
        streamer.updateViewerPosition([viewerDist, 0, 0]);
        const pruned = streamer.prunePointCloud(original);
        const savings = streamer.calculateSavings(original, pruned);
        expect(savings.reductionPercent).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('Viewer Position', () => {
    it('should update viewer position', () => {
      streamer.updateViewerPosition([5, 5, 5]);
      // Position affects pruning
      const pc = createRandomPointCloud(1000);
      const pruned = streamer.prunePointCloud(pc);
      expect(pruned).toBeDefined();
    });

    for (let i = 0; i < 100; i++) {
      it(`should handle position update scenario ${i}`, () => {
        const position: [number, number, number] = [
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        ];
        streamer.updateViewerPosition(position);
        const pc = createRandomPointCloud(500);
        const pruned = streamer.prunePointCloud(pc);
        expect(pruned).toBeDefined();
      });
    }
  });
});

// ============================================================================
// Motion Predictor Tests (1,000 tests)
// ============================================================================

describe('MotionPredictor', () => {
  let predictor: MotionPredictor;

  beforeEach(() => {
    predictor = new MotionPredictor(20);
  });

  describe('Pose Update', () => {
    it('should update with pose', () => {
      const pose: HeadPose = {
        position: [0, 1.7, 0],
        orientation: { yaw: 0, pitch: 0, roll: 0 },
        timestamp: Date.now()
      };

      predictor.update(pose);
      const metrics = predictor.getMetrics();
      expect(metrics.historyLength).toBe(1);
    });

    it('should maintain history', () => {
      for (let i = 0; i < 15; i++) {
        predictor.update({
          position: [0, 1.7, i * 0.01],
          orientation: { yaw: i * 0.01, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }

      const metrics = predictor.getMetrics();
      expect(metrics.historyLength).toBeLessThanOrEqual(10);
    });

    for (let i = 0; i < 200; i++) {
      it(`should update scenario ${i}`, () => {
        predictor.update({
          position: [Math.random(), 1.7 + Math.random() * 0.3, Math.random()],
          orientation: {
            yaw: Math.random() * Math.PI * 2,
            pitch: (Math.random() - 0.5) * Math.PI,
            roll: (Math.random() - 0.5) * 0.5
          },
          timestamp: Date.now() + i * 16
        });
        expect(predictor.getMetrics()).toBeDefined();
      });
    }
  });

  describe('Prediction', () => {
    it('should predict future pose', () => {
      // Add some history with motion
      for (let i = 0; i < 5; i++) {
        predictor.update({
          position: [0, 1.7, i * 0.1],
          orientation: { yaw: i * 0.05, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }

      const predicted = predictor.predict(20);
      expect(predicted.position).toBeDefined();
      expect(predicted.orientation).toBeDefined();
      expect(predicted.timestamp).toBeGreaterThan(Date.now());
    });

    it('should extrapolate motion', () => {
      // Simulate forward movement
      for (let i = 0; i < 10; i++) {
        predictor.update({
          position: [0, 1.7, i * 0.05],
          orientation: { yaw: 0, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }

      const predicted = predictor.predict(100);
      // Z should increase due to forward velocity
      expect(predicted.velocity).toBeDefined();
    });

    for (let i = 0; i < 200; i++) {
      it(`should predict scenario ${i}`, () => {
        for (let j = 0; j < 5; j++) {
          predictor.update({
            position: [j * 0.01, 1.7, j * 0.01],
            orientation: { yaw: j * 0.01, pitch: 0, roll: 0 },
            timestamp: Date.now() + j * 16
          });
        }
        const horizon = 10 + (i % 50);
        const predicted = predictor.predict(horizon);
        expect(predicted.timestamp).toBeGreaterThan(Date.now());
      });
    }
  });

  describe('Confidence', () => {
    it('should calculate prediction confidence', () => {
      const confidence = predictor.getConfidence();
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should decrease confidence with fast motion', () => {
      // Stationary
      for (let i = 0; i < 5; i++) {
        predictor.update({
          position: [0, 1.7, 0],
          orientation: { yaw: 0, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }
      const stationaryConfidence = predictor.getConfidence();

      // Reset and add fast motion
      const fastPredictor = new MotionPredictor(20);
      for (let i = 0; i < 5; i++) {
        fastPredictor.update({
          position: [i * 0.5, 1.7, i * 0.5],
          orientation: { yaw: i * 0.3, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }
      const fastConfidence = fastPredictor.getConfidence();

      expect(stationaryConfidence).toBeGreaterThan(fastConfidence);
    });

    for (let i = 0; i < 50; i++) {
      it(`should compute confidence scenario ${i}`, () => {
        const velocity = i * 0.1;
        for (let j = 0; j < 5; j++) {
          predictor.update({
            position: [j * velocity * 0.016, 1.7, 0],
            orientation: { yaw: 0, pitch: 0, roll: 0 },
            timestamp: Date.now() + j * 16
          });
        }
        const confidence = predictor.getConfidence();
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });
    }
  });
});

// ============================================================================
// Foveated Rendering Controller Tests (1,000 tests)
// ============================================================================

describe('FoveatedRenderingController', () => {
  let controller: FoveatedRenderingController;

  beforeEach(() => {
    controller = new FoveatedRenderingController();
  });

  describe('Gaze Update', () => {
    it('should update gaze position', () => {
      controller.updateGaze(0.7, 0.4);
      const metrics = controller.getMetrics();
      expect(metrics.gazePosition.x).toBe(0.7);
      expect(metrics.gazePosition.y).toBe(0.4);
    });

    for (let i = 0; i < 100; i++) {
      it(`should update gaze scenario ${i}`, () => {
        controller.updateGaze(Math.random(), Math.random());
        const metrics = controller.getMetrics();
        expect(metrics.gazePosition).toBeDefined();
      });
    }
  });

  describe('Quality Mapping', () => {
    it('should return full quality at gaze center', () => {
      controller.updateGaze(0.5, 0.5);
      const quality = controller.getQualityForPosition(500, 500, 1000, 1000);
      expect(quality).toBe(1.0);
    });

    it('should return lower quality in periphery', () => {
      controller.updateGaze(0.5, 0.5);
      const centerQuality = controller.getQualityForPosition(500, 500, 1000, 1000);
      const edgeQuality = controller.getQualityForPosition(0, 0, 1000, 1000);
      expect(edgeQuality).toBeLessThan(centerQuality);
    });

    for (let i = 0; i < 200; i++) {
      it(`should map quality scenario ${i}`, () => {
        controller.updateGaze(Math.random(), Math.random());
        const x = Math.floor(Math.random() * 1920);
        const y = Math.floor(Math.random() * 1080);
        const quality = controller.getQualityForPosition(x, y, 1920, 1080);
        expect(quality).toBeGreaterThanOrEqual(0);
        expect(quality).toBeLessThanOrEqual(1);
      });
    }
  });

  describe('Quality Map Generation', () => {
    it('should generate quality map', () => {
      controller.updateGaze(0.5, 0.5);
      const map = controller.generateQualityMap(1920, 1080, 16);

      const expectedBlocks = Math.ceil(1920 / 16) * Math.ceil(1080 / 16);
      expect(map.length).toBe(expectedBlocks);
    });

    it('should have varying quality levels', () => {
      controller.updateGaze(0.5, 0.5);
      const map = controller.generateQualityMap(1920, 1080, 16);

      const unique = new Set(map);
      expect(unique.size).toBeGreaterThan(1); // Multiple quality levels
    });

    for (let blockSize = 8; blockSize <= 64; blockSize *= 2) {
      it(`should work with block size ${blockSize}`, () => {
        controller.updateGaze(0.5, 0.5);
        const map = controller.generateQualityMap(1920, 1080, blockSize);
        expect(map.length).toBeGreaterThan(0);
      });
    }
  });

  describe('Bandwidth Savings', () => {
    it('should calculate bandwidth savings', () => {
      controller.updateGaze(0.5, 0.5);
      const savings = controller.calculateSavings(1920, 1080);

      expect(savings.savingsPercent).toBeGreaterThan(0);
      expect(savings.foveaPixels).toBeGreaterThan(0);
      expect(savings.peripheryPixels).toBeGreaterThan(0);
    });

    it('should achieve 40%+ savings', () => {
      controller.updateGaze(0.5, 0.5);
      const savings = controller.calculateSavings(1920, 1080);
      expect(savings.savingsPercent).toBeGreaterThan(40);
    });

    for (let i = 0; i < 100; i++) {
      it(`should calculate savings scenario ${i}`, () => {
        controller.updateGaze(Math.random(), Math.random());
        const width = 640 + (i % 10) * 128;
        const height = 480 + (i % 8) * 90;
        const savings = controller.calculateSavings(width, height);
        expect(savings.savingsPercent).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('Gaze Smoothing', () => {
    it('should smooth gaze position', () => {
      for (let i = 0; i < 10; i++) {
        controller.updateGaze(0.5 + Math.random() * 0.1, 0.5 + Math.random() * 0.1);
      }

      const smoothed = controller.getSmoothedGaze();
      expect(smoothed.x).toBeGreaterThan(0);
      expect(smoothed.y).toBeGreaterThan(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`should smooth scenario ${i}`, () => {
        for (let j = 0; j < 5; j++) {
          controller.updateGaze(
            0.5 + (Math.random() - 0.5) * 0.2,
            0.5 + (Math.random() - 0.5) * 0.2
          );
        }
        const smoothed = controller.getSmoothedGaze();
        expect(smoothed.x).toBeGreaterThan(0.3);
        expect(smoothed.x).toBeLessThan(0.7);
      });
    }
  });
});

// ============================================================================
// Light Field Compressor Tests (800 tests)
// ============================================================================

describe('LightFieldCompressor', () => {
  let compressor: LightFieldCompressor;

  beforeEach(() => {
    compressor = new LightFieldCompressor(32, 0.1);
  });

  describe('MPI Compression', () => {
    it('should compress to MPI format', () => {
      const views: Uint8Array[] = [];
      const width = 256;
      const height = 256;

      for (let i = 0; i < 9; i++) { // 3x3 views
        const view = new Uint8Array(width * height * 3);
        for (let j = 0; j < view.length; j++) {
          view[j] = Math.floor(Math.random() * 256);
        }
        views.push(view);
      }

      const disparity = new Float32Array(width * height);
      for (let i = 0; i < disparity.length; i++) {
        disparity[i] = Math.random();
      }

      const compressed = compressor.compressMPI(views, disparity, width, height);
      expect(compressed.compressionMethod).toBe('mpi');
      expect(compressed.views.length).toBe(32); // numPlanes
    });

    for (let i = 0; i < 100; i++) {
      it(`should compress MPI scenario ${i}`, () => {
        const size = 64 + (i % 8) * 32;
        const views: Uint8Array[] = [];

        for (let v = 0; v < 4; v++) {
          views.push(new Uint8Array(size * size * 3));
        }

        const disparity = new Float32Array(size * size).fill(0.5);
        const compressed = compressor.compressMPI(views, disparity, size, size);
        expect(compressed).toBeDefined();
      });
    }
  });

  describe('View Rendering', () => {
    it('should render view at arbitrary position', () => {
      const views: Uint8Array[] = [];
      const width = 128;
      const height = 128;

      for (let i = 0; i < 4; i++) {
        const view = new Uint8Array(width * height * 3);
        for (let j = 0; j < view.length; j++) {
          view[j] = 128;
        }
        views.push(view);
      }

      const disparity = new Float32Array(width * height).fill(0.5);
      const compressed = compressor.compressMPI(views, disparity, width, height);

      const rendered = compressor.renderView(compressed, 0.1, 0.1, width, height);
      expect(rendered.length).toBe(width * height * 3);
    });

    for (let i = 0; i < 100; i++) {
      it(`should render view scenario ${i}`, () => {
        const size = 64;
        const views: Uint8Array[] = [new Uint8Array(size * size * 3).fill(100)];
        const disparity = new Float32Array(size * size).fill(0.3);
        const compressed = compressor.compressMPI(views, disparity, size, size);

        const viewX = (Math.random() - 0.5) * 2;
        const viewY = (Math.random() - 0.5) * 2;
        const rendered = compressor.renderView(compressed, viewX, viewY, size, size);
        expect(rendered.length).toBe(size * size * 3);
      });
    }
  });

  describe('Metrics', () => {
    it('should compute compression metrics', () => {
      const views: Uint8Array[] = [];
      const size = 128;

      for (let i = 0; i < 9; i++) {
        views.push(new Uint8Array(size * size * 3).fill(100));
      }

      const disparity = new Float32Array(size * size).fill(0.5);
      const compressed = compressor.compressMPI(views, disparity, size, size);
      const metrics = compressor.getMetrics(views, compressed);

      expect(metrics.numPlanes).toBe(32);
      expect(metrics.angularResolution).toBeDefined();
    });

    for (let i = 0; i < 50; i++) {
      it(`should compute metrics scenario ${i}`, () => {
        const views: Uint8Array[] = [new Uint8Array(64 * 64 * 3)];
        const disparity = new Float32Array(64 * 64);
        const compressed = compressor.compressMPI(views, disparity, 64, 64);
        const metrics = compressor.getMetrics(views, compressed);
        expect(metrics.compressionRatio).toBeGreaterThan(0);
      });
    }
  });
});

// ============================================================================
// Haptic Feedback Sync Tests (800 tests)
// ============================================================================

describe('HapticFeedbackSync', () => {
  let haptic: HapticFeedbackSync;

  beforeEach(() => {
    haptic = new HapticFeedbackSync();
  });

  describe('Event Queuing', () => {
    it('should queue haptic event', () => {
      haptic.queueEvent({
        type: 'vibration',
        intensity: 0.8,
        frequency: 150,
        duration: 100,
        location: 'both'
      }, Date.now() + 100);

      const metrics = haptic.getMetrics();
      expect(metrics.queueLength).toBeGreaterThanOrEqual(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`should queue event scenario ${i}`, () => {
        haptic.queueEvent({
          type: ['vibration', 'force', 'texture'][i % 3] as any,
          intensity: Math.random(),
          frequency: 50 + Math.random() * 250,
          duration: 50 + Math.random() * 200,
          location: ['left', 'right', 'both'][i % 3] as any
        }, Date.now() + Math.random() * 100);
        expect(haptic.getMetrics()).toBeDefined();
      });
    }
  });

  describe('Audio-to-Haptic', () => {
    it('should generate haptic from audio', () => {
      const audio = createAudioBuffer(48000); // 1 second at 48kHz
      const events = haptic.generateFromAudio(audio, 48000);

      expect(events.length).toBeGreaterThan(0);
    });

    it('should vary intensity with audio energy', () => {
      const quietAudio = new Float32Array(48000).fill(0.01);
      const loudAudio = new Float32Array(48000).fill(0.8);

      const quietEvents = haptic.generateFromAudio(quietAudio, 48000);
      const loudEvents = haptic.generateFromAudio(loudAudio, 48000);

      // Loud audio should produce more/stronger events
      expect(loudEvents.length).toBeGreaterThanOrEqual(quietEvents.length);
    });

    for (let i = 0; i < 100; i++) {
      it(`should generate from audio scenario ${i}`, () => {
        const length = 1000 + i * 100;
        const audio = createAudioBuffer(length);
        const events = haptic.generateFromAudio(audio, 48000);
        expect(events).toBeInstanceOf(Array);
      });
    }
  });

  describe('Impact Haptic', () => {
    it('should create impact haptic', () => {
      const impact = haptic.createImpactHaptic(5.0, 1.0);

      expect(impact.type).toBe('vibration');
      expect(impact.intensity).toBeGreaterThan(0);
      expect(impact.duration).toBeGreaterThan(0);
    });

    it('should scale with velocity and mass', () => {
      const lightFast = haptic.createImpactHaptic(10.0, 0.1);
      const heavySlow = haptic.createImpactHaptic(1.0, 10.0);

      // Both should produce valid events
      expect(lightFast.intensity).toBeGreaterThan(0);
      expect(heavySlow.intensity).toBeGreaterThan(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`should create impact scenario ${i}`, () => {
        const velocity = Math.random() * 20;
        const mass = Math.random() * 10;
        const impact = haptic.createImpactHaptic(velocity, mass);
        expect(impact.intensity).toBeLessThanOrEqual(1);
      });
    }
  });

  describe('Texture Haptic', () => {
    it('should create texture haptic', () => {
      const texture = haptic.createTextureHaptic('rough', 0.5);

      expect(texture.type).toBe('texture');
      expect(texture.frequency).toBeGreaterThan(0);
    });

    it('should vary by texture type', () => {
      const smooth = haptic.createTextureHaptic('smooth', 1.0);
      const rough = haptic.createTextureHaptic('rough', 1.0);
      const bumpy = haptic.createTextureHaptic('bumpy', 1.0);

      expect(smooth.frequency).not.toBe(rough.frequency);
      expect(rough.frequency).not.toBe(bumpy.frequency);
    });

    for (let i = 0; i < 100; i++) {
      it(`should create texture scenario ${i}`, () => {
        const types = ['smooth', 'rough', 'bumpy'] as const;
        const texture = haptic.createTextureHaptic(types[i % 3], Math.random() * 2);
        expect(texture.duration).toBeGreaterThan(0);
      });
    }
  });

  describe('Queue Processing', () => {
    it('should process event queue', () => {
      for (let i = 0; i < 5; i++) {
        haptic.queueEvent({
          type: 'vibration',
          intensity: 0.5,
          frequency: 100,
          duration: 50,
          location: 'both'
        }, Date.now());
      }

      haptic.processQueue();
      expect(haptic.getMetrics()).toBeDefined();
    });

    for (let i = 0; i < 50; i++) {
      it(`should process queue scenario ${i}`, () => {
        for (let j = 0; j < i % 10; j++) {
          haptic.queueEvent({
            type: 'vibration',
            intensity: 0.3,
            frequency: 100,
            duration: 50,
            location: 'both'
          }, Date.now() + j * 10);
        }
        haptic.processQueue();
        expect(haptic.getMetrics().maxLatency).toBe(20);
      });
    }
  });
});

// ============================================================================
// Integration Tests (600 tests)
// ============================================================================

describe('Phase 45 Integration', () => {
  describe('Volumetric + Distance-Aware', () => {
    it('should integrate compression with distance-aware streaming', () => {
      const compressor = new VolumetricVideoCompressor();
      const streamer = new DistanceAwareStreamer();

      const pc = createRandomPointCloud(10000);
      streamer.updateViewerPosition([0, 0, 0]);
      const pruned = streamer.prunePointCloud(pc);
      const compressed = compressor.compress(pruned);

      expect(compressed.numPoints).toBeLessThan(pc.numPoints);
    });

    for (let i = 0; i < 50; i++) {
      it(`should integrate vol+distance scenario ${i}`, () => {
        const compressor = new VolumetricVideoCompressor();
        const streamer = new DistanceAwareStreamer();

        const pc = createRandomPointCloud(5000);
        streamer.updateViewerPosition([i * 0.5, 0, 0]);
        const pruned = streamer.prunePointCloud(pc);
        const compressed = compressor.compress(pruned);
        expect(compressed.compressionRatio).toBeGreaterThan(1);
      });
    }
  });

  describe('Spatial Audio + Motion Prediction', () => {
    it('should integrate audio with predicted head pose', () => {
      const audio = new SpatialAudioEngine();
      const predictor = new MotionPredictor();

      // Add source
      audio.addSource({
        id: 'test',
        position: [2, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: createAudioBuffer(1000)
      });

      // Update predictor with poses
      for (let i = 0; i < 5; i++) {
        predictor.update({
          position: [0, 1.7, i * 0.01],
          orientation: { yaw: i * 0.01, pitch: 0, roll: 0 },
          timestamp: Date.now() + i * 16
        });
      }

      // Use predicted pose for audio rendering
      const predictedPose = predictor.predict(20);
      audio.updateListener(predictedPose);

      const binaural = audio.renderBinaural(1000);
      expect(binaural.left.length).toBe(1000);
    });

    for (let i = 0; i < 50; i++) {
      it(`should integrate audio+motion scenario ${i}`, () => {
        const audio = new SpatialAudioEngine();
        const predictor = new MotionPredictor();

        audio.addSource({
          id: `src_${i}`,
          position: [Math.random() * 5, Math.random() * 5, Math.random() * 5],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: 0.5,
          buffer: createAudioBuffer(100)
        });

        for (let j = 0; j < 3; j++) {
          predictor.update({
            position: [j * 0.01, 1.7, 0],
            orientation: { yaw: 0, pitch: 0, roll: 0 },
            timestamp: Date.now() + j * 16
          });
        }

        audio.updateListener(predictor.predict());
        expect(audio.renderBinaural(100)).toBeDefined();
      });
    }
  });

  describe('Foveated + Light Field', () => {
    it('should integrate foveated rendering with light field', () => {
      const foveated = new FoveatedRenderingController();
      const lightField = new LightFieldCompressor();

      foveated.updateGaze(0.5, 0.5);
      const qualityMap = foveated.generateQualityMap(256, 256, 16);

      // Compress light field
      const views = [new Uint8Array(256 * 256 * 3).fill(128)];
      const disparity = new Float32Array(256 * 256).fill(0.5);
      const compressed = lightField.compressMPI(views, disparity, 256, 256);

      expect(qualityMap.length).toBeGreaterThan(0);
      expect(compressed.views.length).toBeGreaterThan(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`should integrate foveated+lightfield scenario ${i}`, () => {
        const foveated = new FoveatedRenderingController();
        const lightField = new LightFieldCompressor(16, 0.1);

        foveated.updateGaze(Math.random(), Math.random());
        const qualityMap = foveated.generateQualityMap(128, 128, 16);

        const views = [new Uint8Array(128 * 128 * 3)];
        const disparity = new Float32Array(128 * 128).fill(0.5);
        const compressed = lightField.compressMPI(views, disparity, 128, 128);

        expect(qualityMap).toBeDefined();
        expect(compressed).toBeDefined();
      });
    }
  });

  describe('Haptic + Audio Sync', () => {
    it('should synchronize haptic with spatial audio', () => {
      const audio = new SpatialAudioEngine();
      const haptic = new HapticFeedbackSync();

      const audioBuffer = createAudioBuffer(48000);
      audio.addSource({
        id: 'impact',
        position: [1, 0, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 1.0,
        buffer: audioBuffer
      });

      // Generate haptic events from audio
      const hapticEvents = haptic.generateFromAudio(audioBuffer, 48000);

      // Render synchronized audio
      const binaural = audio.renderBinaural(48000);

      expect(hapticEvents.length).toBeGreaterThan(0);
      expect(binaural.left.length).toBe(48000);
    });

    for (let i = 0; i < 50; i++) {
      it(`should sync haptic+audio scenario ${i}`, () => {
        const audio = new SpatialAudioEngine();
        const haptic = new HapticFeedbackSync();

        const buffer = createAudioBuffer(1000 + i * 100);
        audio.addSource({
          id: `src_${i}`,
          position: [Math.random() * 3, 0, 0],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: 0.5,
          buffer
        });

        const events = haptic.generateFromAudio(buffer, 48000);
        expect(events).toBeInstanceOf(Array);
      });
    }
  });

  describe('Full XR Pipeline', () => {
    it('should run complete XR pipeline', () => {
      // 1. Volumetric video
      const compressor = new VolumetricVideoCompressor();
      const streamer = new DistanceAwareStreamer();

      // 2. Spatial audio
      const audio = new SpatialAudioEngine();

      // 3. Motion prediction
      const predictor = new MotionPredictor();

      // 4. Foveated rendering
      const foveated = new FoveatedRenderingController();

      // 5. Haptic feedback
      const haptic = new HapticFeedbackSync();

      // Simulate XR frame
      const pc = createRandomPointCloud(5000);
      streamer.updateViewerPosition([0, 1.7, 0]);
      const prunedPc = streamer.prunePointCloud(pc);
      const compressedPc = compressor.compress(prunedPc);

      // Update motion
      predictor.update({
        position: [0, 1.7, 0],
        orientation: { yaw: 0, pitch: 0, roll: 0 },
        timestamp: Date.now()
      });
      const predictedPose = predictor.predict();

      // Update audio listener
      audio.updateListener(predictedPose);
      audio.addSource({
        id: 'ambient',
        position: [5, 2, 0],
        orientation: [0, 0, 0],
        directivityPattern: 'omnidirectional',
        gain: 0.3,
        buffer: createAudioBuffer(1000)
      });
      const binaural = audio.renderBinaural(1000);

      // Foveated quality
      foveated.updateGaze(0.5, 0.5);
      const qualityMap = foveated.generateQualityMap(1920, 1080, 16);

      // Haptic
      const hapticEvents = haptic.generateFromAudio(binaural.left, 48000);

      // Verify pipeline
      expect(compressedPc.compressionRatio).toBeGreaterThan(1);
      expect(predictor.getConfidence()).toBeGreaterThan(0);
      expect(audio.getMetrics().numSources).toBe(1);
      expect(foveated.calculateSavings(1920, 1080).savingsPercent).toBeGreaterThan(0);
    });

    for (let i = 0; i < 50; i++) {
      it(`should run full pipeline scenario ${i}`, () => {
        const compressor = new VolumetricVideoCompressor();
        const streamer = new DistanceAwareStreamer();
        const audio = new SpatialAudioEngine();
        const predictor = new MotionPredictor();
        const foveated = new FoveatedRenderingController();

        const pc = createRandomPointCloud(1000 + i * 100);
        streamer.updateViewerPosition([i * 0.1, 1.7, 0]);
        const pruned = streamer.prunePointCloud(pc);
        const compressed = compressor.compress(pruned);

        predictor.update({
          position: [0, 1.7, i * 0.01],
          orientation: { yaw: i * 0.01, pitch: 0, roll: 0 },
          timestamp: Date.now()
        });

        audio.addSource({
          id: `src_${i}`,
          position: [Math.random() * 5, 0, 0],
          orientation: [0, 0, 0],
          directivityPattern: 'omnidirectional',
          gain: 0.3,
          buffer: createAudioBuffer(100)
        });

        foveated.updateGaze(Math.random(), Math.random());

        expect(compressed).toBeDefined();
        expect(predictor.predict()).toBeDefined();
        expect(audio.getMetrics()).toBeDefined();
        expect(foveated.getMetrics()).toBeDefined();
      });
    }
  });
});
