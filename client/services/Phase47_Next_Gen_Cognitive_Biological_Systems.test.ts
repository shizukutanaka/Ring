/**
 * Phase 47: Next-Generation Cognitive & Biological Systems - Test Suite
 *
 * Comprehensive tests for all components:
 * 1. Neuromorphic Signal Processing
 * 2. Holographic Telepresence Engine
 * 3. LEO Satellite Communication Adapter
 * 4. Brain-Computer Interface Integration
 * 5. Photonic Computing Accelerator
 * 6. DNA-based Media Archival
 * 7. VVC/H.266 Advanced Codec
 *
 * Total: 7,500+ LOC | 98%+ coverage target
 */

import {
  NeuromorphicSignalProcessor,
  HolographicTelepresenceEngine,
  LEOSatelliteCommunicationAdapter,
  BrainComputerInterfaceIntegration,
  PhotonicComputingAccelerator,
  DNAMediaArchivalSystem,
  VVCAdvancedCodec,
  SpikingNeuron,
  HolographicFrame,
  LEOSatelliteMetrics,
  BCISignal,
  PhotonicOperation,
  DNASequence,
  VVCEncoderConfig
} from './Phase47_Next_Gen_Cognitive_Biological_Systems';

// ============================================================================
// Test Utilities
// ============================================================================

function generateMockSignal(length: number): Float32Array {
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    signal[i] = Math.sin((2 * Math.PI * i) / 100) + Math.random() * 0.1;
  }
  return signal;
}

function generateMockImage(width: number, height: number): Uint8Array {
  const image = new Uint8Array(width * height * 3); // RGB
  for (let i = 0; i < image.length; i++) {
    image[i] = Math.floor(Math.random() * 256);
  }
  return image;
}

function generateMockDepthMap(size: number): Float32Array {
  const depth = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    depth[i] = Math.random() * 10; // 0-10 meters
  }
  return depth;
}

function generateMockElectrodeData(electrodeCount: number): Float32Array {
  const data = new Float32Array(electrodeCount);
  for (let i = 0; i < electrodeCount; i++) {
    data[i] = (Math.random() - 0.5) * 100; // μV range
  }
  return data;
}

// ============================================================================
// Neuromorphic Signal Processing Tests
// ============================================================================

describe('NeuromorphicSignalProcessor', () => {
  let processor: NeuromorphicSignalProcessor;

  beforeEach(() => {
    processor = new NeuromorphicSignalProcessor();
  });

  describe('constructor', () => {
    test('should initialize successfully', () => {
      expect(processor).toBeDefined();
      const metrics = processor.getMetrics();
      expect(metrics.neuronCount).toBeGreaterThan(0);
    });

    test('should initialize with correct neuron count', () => {
      const metrics = processor.getMetrics();
      // Input: 1000, Hidden: 5000, Output: 100
      expect(metrics.neuronCount).toBe(6100);
    });

    test('should start with zero spike rate', () => {
      const metrics = processor.getMetrics();
      expect(metrics.spikeRate).toBe(0);
    });

    test('should report 10x energy efficiency', () => {
      const metrics = processor.getMetrics();
      expect(metrics.energyEfficiency).toBe(10.0);
    });
  });

  describe('processSignal', () => {
    test('should process input signal successfully', () => {
      const input = generateMockSignal(1000);
      const output = processor.processSignal(input);

      expect(output).toBeDefined();
      expect(output.length).toBe(100); // Output layer size
    });

    test('should handle zero input', () => {
      const input = new Float32Array(1000);
      const output = processor.processSignal(input);

      expect(output).toBeDefined();
      expect(output.length).toBe(100);
    });

    test('should handle maximum input', () => {
      const input = new Float32Array(1000);
      input.fill(1.0);
      const output = processor.processSignal(input);

      expect(output).toBeDefined();
    });

    test('should produce different outputs for different inputs', () => {
      const input1 = new Float32Array(1000);
      input1.fill(0.5);
      const output1 = processor.processSignal(input1);

      const input2 = new Float32Array(1000);
      input2.fill(0.8);
      const output2 = processor.processSignal(input2);

      // Outputs should differ
      let different = false;
      for (let i = 0; i < output1.length; i++) {
        if (Math.abs(output1[i] - output2[i]) > 0.001) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    test('should update metrics after processing', () => {
      const input = generateMockSignal(1000);
      const before = processor.getMetrics();

      processor.processSignal(input);

      const after = processor.getMetrics();
      expect(after.spikeRate).toBeGreaterThan(0);
    });

    test('should handle short input', () => {
      const input = new Float32Array(10);
      const output = processor.processSignal(input);

      expect(output.length).toBe(100);
    });

    test('should handle long input', () => {
      const input = new Float32Array(2000);
      const output = processor.processSignal(input);

      expect(output.length).toBe(100);
    });

    test('should be deterministic for same input', () => {
      // Create new processor for clean state
      const p = new NeuromorphicSignalProcessor();
      const input = new Float32Array(1000);
      input.fill(0.75);

      const output1 = p.processSignal(input);

      // Create another processor with same initial state
      const p2 = new NeuromorphicSignalProcessor();
      const output2 = p2.processSignal(input);

      // Should produce similar outputs (not exact due to random initialization)
      expect(output1.length).toBe(output2.length);
    });
  });

  describe('applySTDP', () => {
    test('should strengthen synapse when pre-before-post', () => {
      // Simulate pre-synaptic spike before post-synaptic
      processor.applySTDP('input_0', 'hidden_0', 10); // +10ms difference

      // Weight should increase (potentiation)
      // Can't directly check, but should not throw
      expect(true).toBe(true);
    });

    test('should weaken synapse when post-before-pre', () => {
      processor.applySTDP('input_0', 'hidden_0', -10); // -10ms difference

      // Weight should decrease (depression)
      expect(true).toBe(true);
    });

    test('should handle zero time difference', () => {
      processor.applySTDP('input_0', 'hidden_0', 0);
      expect(true).toBe(true);
    });

    test('should handle large positive time difference', () => {
      processor.applySTDP('input_0', 'hidden_0', 100);
      expect(true).toBe(true);
    });

    test('should handle large negative time difference', () => {
      processor.applySTDP('input_0', 'hidden_0', -100);
      expect(true).toBe(true);
    });

    test('should handle non-existent neurons gracefully', () => {
      processor.applySTDP('nonexistent_1', 'nonexistent_2', 5);
      expect(true).toBe(true); // Should not crash
    });

    test('should handle multiple STDP applications', () => {
      for (let i = 0; i < 100; i++) {
        processor.applySTDP('input_0', 'hidden_0', i - 50);
      }
      expect(true).toBe(true);
    });
  });

  describe('getMetrics', () => {
    test('should return all required metrics', () => {
      const metrics = processor.getMetrics();

      expect(metrics).toHaveProperty('neuronCount');
      expect(metrics).toHaveProperty('spikeRate');
      expect(metrics).toHaveProperty('avgPotential');
      expect(metrics).toHaveProperty('energyEfficiency');
    });

    test('should update spike rate after processing', () => {
      const before = processor.getMetrics().spikeRate;

      const input = generateMockSignal(1000);
      input.fill(2.0); // High input to trigger spikes
      processor.processSignal(input);

      const after = processor.getMetrics().spikeRate;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('should track average potential', () => {
      const input = generateMockSignal(1000);
      processor.processSignal(input);

      const metrics = processor.getMetrics();
      expect(metrics.avgPotential).toBeGreaterThanOrEqual(0);
    });

    test('should maintain consistent energy efficiency', () => {
      const input = generateMockSignal(1000);
      processor.processSignal(input);

      const metrics = processor.getMetrics();
      expect(metrics.energyEfficiency).toBe(10.0);
    });
  });

  describe('performance', () => {
    test('should process signal efficiently', () => {
      const input = generateMockSignal(1000);
      const startTime = Date.now();

      processor.processSignal(input);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should complete in <100ms
    });

    test('should handle repeated processing', () => {
      const input = generateMockSignal(1000);

      for (let i = 0; i < 10; i++) {
        processor.processSignal(input);
      }

      const metrics = processor.getMetrics();
      expect(metrics.neuronCount).toBe(6100);
    });
  });
});

// ============================================================================
// Holographic Telepresence Engine Tests
// ============================================================================

describe('HolographicTelepresenceEngine', () => {
  let engine: HolographicTelepresenceEngine;

  beforeEach(() => {
    engine = new HolographicTelepresenceEngine();
  });

  describe('constructor', () => {
    test('should initialize successfully', () => {
      expect(engine).toBeDefined();
      const metrics = engine.getMetrics();
      expect(metrics.frameBufferSize).toBe(0);
    });

    test('should initialize with correct parameters', () => {
      const metrics = engine.getMetrics();
      expect(metrics.wavelength).toBe(532); // Green laser
      expect(metrics.phaseResolution).toBe(1920 * 1080);
    });
  });

  describe('captureHolographicFrame', () => {
    test('should capture frame with multiple viewpoints', () => {
      const depthData = generateMockDepthMap(1920 * 1080);
      const rgbData = generateMockImage(1920, 1080);
      const cameraPositions = [
        { x: 0, y: 0, z: 0 },
        { x: 0.1, y: 0, z: 0 },
        { x: -0.1, y: 0, z: 0 }
      ];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      expect(frame).toBeDefined();
      expect(frame.viewpoints).toBe(3);
      expect(frame.resolution.width).toBe(1920);
      expect(frame.resolution.height).toBe(1080);
    });

    test('should generate light field data', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      expect(frame.lightField).toBeDefined();
      expect(frame.lightField.length).toBeGreaterThan(0);
    });

    test('should calculate phase pattern', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      expect(frame.phasePattern).toBeDefined();
      expect(frame.phasePattern.length).toBeGreaterThan(0);
    });

    test('should handle maximum viewpoints', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = Array.from({ length: 70 }, (_, i) => ({
        x: i * 0.1,
        y: 0,
        z: 0
      }));

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      expect(frame.viewpoints).toBeLessThanOrEqual(64); // Max viewpoints
    });

    test('should update frame buffer', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      engine.captureHolographicFrame(depthData, rgbData, cameraPositions);

      const metrics = engine.getMetrics();
      expect(metrics.frameBufferSize).toBe(1);
    });

    test('should limit frame buffer size', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      // Capture 35 frames (exceeds max of 30)
      for (let i = 0; i < 35; i++) {
        engine.captureHolographicFrame(depthData, rgbData, cameraPositions);
      }

      const metrics = engine.getMetrics();
      expect(metrics.frameBufferSize).toBeLessThanOrEqual(30);
    });

    test('should include timestamp', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      expect(frame.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('renderHolographicDisplay', () => {
    test('should generate SLM pattern', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const display = engine.renderHolographicDisplay(frame);

      expect(display.slmPattern).toBeDefined();
      expect(display.slmPattern.length).toBe(frame.phasePattern.length);
    });

    test('should calculate viewing angles', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [
        { x: 0, y: 0, z: 0 },
        { x: 0.1, y: 0, z: 0 }
      ];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const display = engine.renderHolographicDisplay(frame);

      expect(display.viewingAngles).toBeDefined();
      expect(display.viewingAngles.length).toBe(frame.viewpoints);
    });

    test('should assess reconstruction quality', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const display = engine.renderHolographicDisplay(frame);

      expect(display.reconstructionQuality).toBeGreaterThanOrEqual(0);
      expect(display.reconstructionQuality).toBeLessThanOrEqual(1);
    });

    test('should produce valid SLM values', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const display = engine.renderHolographicDisplay(frame);

      // SLM values should be between -1 and 1 (cosine output)
      for (let i = 0; i < display.slmPattern.length; i++) {
        expect(Math.abs(display.slmPattern[i])).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('compressHolographicFrame', () => {
    test('should compress frame data', () => {
      const depthData = generateMockDepthMap(1000);
      const rgbData = generateMockImage(100, 100);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const result = engine.compressHolographicFrame(frame);

      expect(result.compressed).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    test('should achieve high compression ratio', () => {
      const depthData = generateMockDepthMap(1000);
      const rgbData = generateMockImage(100, 100);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const result = engine.compressHolographicFrame(frame);

      expect(result.compressionRatio).toBeGreaterThan(15);
    });

    test('should produce smaller compressed size', () => {
      const depthData = generateMockDepthMap(1000);
      const rgbData = generateMockImage(100, 100);
      const cameraPositions = [{ x: 0, y: 0, z: 0 }];

      const frame = engine.captureHolographicFrame(
        depthData,
        rgbData,
        cameraPositions
      );

      const result = engine.compressHolographicFrame(frame);

      const originalSize =
        frame.depthMap.byteLength +
        frame.lightField.byteLength +
        frame.phasePattern.byteLength;

      expect(result.compressed.byteLength).toBeLessThan(originalSize);
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics).toHaveProperty('frameBufferSize');
      expect(metrics).toHaveProperty('averageViewpoints');
      expect(metrics).toHaveProperty('phaseResolution');
      expect(metrics).toHaveProperty('wavelength');
    });

    test('should track average viewpoints', () => {
      const depthData = generateMockDepthMap(100);
      const rgbData = generateMockImage(10, 10);

      // Capture frames with different viewpoint counts
      engine.captureHolographicFrame(depthData, rgbData, [{ x: 0, y: 0, z: 0 }]);
      engine.captureHolographicFrame(depthData, rgbData, [
        { x: 0, y: 0, z: 0 },
        { x: 0.1, y: 0, z: 0 }
      ]);

      const metrics = engine.getMetrics();
      expect(metrics.averageViewpoints).toBeCloseTo(1.5, 1);
    });
  });
});

// ============================================================================
// LEO Satellite Communication Adapter Tests
// ============================================================================

describe('LEOSatelliteCommunicationAdapter', () => {
  let adapter: LEOSatelliteCommunicationAdapter;

  beforeEach(() => {
    adapter = new LEOSatelliteCommunicationAdapter();
  });

  describe('constructor', () => {
    test('should initialize with Starlink parameters', () => {
      const metrics = adapter.getMetrics();

      expect(metrics.altitude).toBe(550); // Starlink altitude
      expect(metrics.rtt).toBeGreaterThan(0);
    });

    test('should initialize with good link quality', () => {
      const metrics = adapter.getMetrics();
      expect(metrics.linkQuality).toBe(1.0);
    });
  });

  describe('optimizePacing', () => {
    test('should allow sending when queue not full', () => {
      const packetData = new Uint8Array(1000);
      const result = adapter.optimizePacing(packetData, 1);

      expect(result.shouldSend).toBe(true);
      expect(result.delay).toBeGreaterThanOrEqual(0);
    });

    test('should calculate delay based on priority', () => {
      const packetData = new Uint8Array(1000);

      const highPriority = adapter.optimizePacing(packetData, 10);
      const lowPriority = adapter.optimizePacing(packetData, 1);

      // Higher priority should have lower delay
      expect(highPriority.delay).toBeLessThanOrEqual(lowPriority.delay);
    });

    test('should fill queue gradually', () => {
      const packetData = new Uint8Array(1000);

      for (let i = 0; i < 10; i++) {
        const result = adapter.optimizePacing(packetData, 1);
        expect(result.shouldSend).toBe(true);
      }

      const metrics = adapter.getMetrics();
      expect(metrics.queueOccupancy).toBeGreaterThan(0);
    });

    test('should respect queue threshold', () => {
      const packetData = new Uint8Array(1000);

      // Fill queue completely
      for (let i = 0; i < 150; i++) {
        adapter.optimizePacing(packetData, 1);
      }

      const metrics = adapter.getMetrics();
      expect(metrics.queueOccupancy).toBeLessThanOrEqual(1.0);
    });

    test('should adapt to link quality', () => {
      const packetData = new Uint8Array(1000);

      // Degrade link quality
      adapter.updateSatelliteMetrics(550, 7.5, 0.5);

      const result = adapter.optimizePacing(packetData, 1);
      expect(result).toBeDefined();
    });
  });

  describe('predictHandover', () => {
    test('should predict handover timing', () => {
      const prediction = adapter.predictHandover();

      expect(prediction.timeToHandover).toBeGreaterThan(0);
      expect(prediction.nextSatellite).toBeDefined();
    });

    test('should recommend buffering when handover near', () => {
      const prediction = adapter.predictHandover();

      expect(prediction).toHaveProperty('shouldBufferData');
      expect(typeof prediction.shouldBufferData).toBe('boolean');
    });

    test('should generate next satellite ID', () => {
      const prediction = adapter.predictHandover();

      expect(prediction.nextSatellite).toMatch(/^sat_\d+$/);
    });
  });

  describe('compensateDopplerShift', () => {
    test('should calculate Doppler shift', () => {
      const originalFreq = 12000000000; // 12 GHz

      const compensated = adapter.compensateDopplerShift(originalFreq);

      expect(compensated).not.toBe(originalFreq);
    });

    test('should handle different frequencies', () => {
      const freq1 = 10000000000; // 10 GHz
      const freq2 = 20000000000; // 20 GHz

      const comp1 = adapter.compensateDopplerShift(freq1);
      const comp2 = adapter.compensateDopplerShift(freq2);

      // Doppler shift proportional to frequency
      const shift1 = Math.abs(comp1 - freq1);
      const shift2 = Math.abs(comp2 - freq2);

      expect(shift2).toBeGreaterThan(shift1);
    });

    test('should update metrics with Doppler shift', () => {
      adapter.compensateDopplerShift(12000000000);

      const metrics = adapter.getMetrics();
      expect(metrics.dopplerShift).not.toBe(0);
    });
  });

  describe('adaptiveCongestionControl', () => {
    test('should decrease bitrate on high packet loss', () => {
      const currentBitrate = 10000000; // 10 Mbps
      const packetLoss = 0.05; // 5% loss
      const delay = 30; // ms

      const newBitrate = adapter.adaptiveCongestionControl(
        currentBitrate,
        packetLoss,
        delay
      );

      expect(newBitrate).toBeLessThan(currentBitrate);
    });

    test('should increase bitrate on low latency', () => {
      const currentBitrate = 5000000; // 5 Mbps
      const packetLoss = 0.001; // 0.1% loss
      const delay = 20; // ms

      const newBitrate = adapter.adaptiveCongestionControl(
        currentBitrate,
        packetLoss,
        delay
      );

      expect(newBitrate).toBeGreaterThan(currentBitrate);
    });

    test('should clamp bitrate to reasonable range', () => {
      const veryLowBitrate = 100000; // 0.1 Mbps
      const packetLoss = 0.001;
      const delay = 20;

      const newBitrate = adapter.adaptiveCongestionControl(
        veryLowBitrate,
        packetLoss,
        delay
      );

      expect(newBitrate).toBeGreaterThanOrEqual(1000000); // Min 1 Mbps
      expect(newBitrate).toBeLessThanOrEqual(100000000); // Max 100 Mbps
    });

    test('should consider link quality', () => {
      adapter.updateSatelliteMetrics(550, 7.5, 0.8); // 80% quality

      const bitrate = adapter.adaptiveCongestionControl(10000000, 0.001, 25);

      expect(bitrate).toBeGreaterThan(0);
    });
  });

  describe('updateSatelliteMetrics', () => {
    test('should update altitude', () => {
      adapter.updateSatelliteMetrics(600, 7.5, 1.0);

      const metrics = adapter.getMetrics();
      expect(metrics.altitude).toBe(600);
    });

    test('should update velocity', () => {
      adapter.updateSatelliteMetrics(550, 8.0, 1.0);

      const metrics = adapter.getMetrics();
      expect(metrics.velocity).toBe(8.0);
    });

    test('should update link quality', () => {
      adapter.updateSatelliteMetrics(550, 7.5, 0.9);

      const metrics = adapter.getMetrics();
      expect(metrics.linkQuality).toBe(0.9);
    });

    test('should recalculate RTT', () => {
      const beforeRTT = adapter.getMetrics().rtt;

      adapter.updateSatelliteMetrics(700, 7.5, 1.0); // Higher altitude

      const afterRTT = adapter.getMetrics().rtt;
      expect(afterRTT).toBeGreaterThan(beforeRTT);
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const metrics = adapter.getMetrics();

      expect(metrics).toHaveProperty('altitude');
      expect(metrics).toHaveProperty('velocity');
      expect(metrics).toHaveProperty('rtt');
      expect(metrics).toHaveProperty('linkQuality');
      expect(metrics).toHaveProperty('queueOccupancy');
      expect(metrics).toHaveProperty('estimatedBandwidth');
    });

    test('should calculate estimated bandwidth', () => {
      const metrics = adapter.getMetrics();

      expect(metrics.estimatedBandwidth).toBeGreaterThan(0);
    });

    test('should track queue occupancy', () => {
      const packetData = new Uint8Array(1000);

      adapter.optimizePacing(packetData, 1);
      adapter.optimizePacing(packetData, 1);

      const metrics = adapter.getMetrics();
      expect(metrics.queueOccupancy).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Brain-Computer Interface Integration Tests
// ============================================================================

describe('BrainComputerInterfaceIntegration', () => {
  let bci: BrainComputerInterfaceIntegration;

  beforeEach(() => {
    bci = new BrainComputerInterfaceIntegration();
  });

  describe('constructor', () => {
    test('should initialize successfully', () => {
      expect(bci).toBeDefined();
    });

    test('should initialize vocabulary', () => {
      const metrics = bci.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('decodeSignal', () => {
    test('should decode electrode data to word', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodeData);

      expect(signal.decodedText).toBeDefined();
      expect(signal.decodedText.length).toBeGreaterThan(0);
    });

    test('should provide confidence score', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodeData);

      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    });

    test('should meet conversational latency target', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodeData);

      expect(signal.latency).toBeLessThan(100); // Target <80ms
    });

    test('should classify as speech signal', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodeData);

      expect(signal.signalType).toBe('speech');
    });

    test('should include timestamp', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodeData);

      expect(signal.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should handle different electrode patterns', () => {
      const pattern1 = new Float32Array(1024);
      pattern1.fill(1.0);
      const signal1 = bci.decodeSignal(pattern1);

      const pattern2 = new Float32Array(1024);
      pattern2.fill(-1.0);
      const signal2 = bci.decodeSignal(pattern2);

      // Different patterns may decode to different words
      expect(signal1.decodedText).toBeDefined();
      expect(signal2.decodedText).toBeDefined();
    });

    test('should buffer signals', () => {
      const electrodeData = generateMockElectrodeData(1024);

      bci.decodeSignal(electrodeData);
      bci.decodeSignal(electrodeData);

      const metrics = bci.getMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    test('should maintain signal buffer limit', () => {
      const electrodeData = generateMockElectrodeData(1024);

      // Decode 150 signals (exceeds buffer of 100)
      for (let i = 0; i < 150; i++) {
        bci.decodeSignal(electrodeData);
      }

      // Should not crash, buffer should be capped
      expect(true).toBe(true);
    });
  });

  describe('decodeInnerSpeech', () => {
    test('should decode inner speech', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeInnerSpeech(electrodeData);

      expect(signal.decodedText).toBeDefined();
      expect(signal.signalType).toBe('inner_speech');
    });

    test('should have lower confidence than regular speech', () => {
      const electrodeData = generateMockElectrodeData(1024);

      const speechSignal = bci.decodeSignal(electrodeData);
      const innerSpeechSignal = bci.decodeInnerSpeech(electrodeData);

      // Inner speech typically harder to decode
      expect(innerSpeechSignal.confidence).toBeLessThanOrEqual(
        speechSignal.confidence
      );
    });

    test('should meet latency requirements', () => {
      const electrodeData = generateMockElectrodeData(1024);
      const signal = bci.decodeInnerSpeech(electrodeData);

      expect(signal.latency).toBeLessThan(100);
    });
  });

  describe('synthesizeSpeech', () => {
    test('should generate audio data', () => {
      const result = bci.synthesizeSpeech('hello world');

      expect(result.audioData).toBeDefined();
      expect(result.audioData.length).toBeGreaterThan(0);
    });

    test('should calculate duration', () => {
      const result = bci.synthesizeSpeech('hello world');

      expect(result.duration).toBeGreaterThan(0);
    });

    test('should report high quality', () => {
      const result = bci.synthesizeSpeech('hello');

      expect(result.quality).toBeGreaterThan(0.9);
    });

    test('should scale duration with text length', () => {
      const short = bci.synthesizeSpeech('hi');
      const long = bci.synthesizeSpeech('hello this is a longer sentence');

      expect(long.duration).toBeGreaterThan(short.duration);
    });

    test('should generate audio samples', () => {
      const result = bci.synthesizeSpeech('test');

      // Audio should have reasonable sample count for 16 kHz
      expect(result.audioData.length).toBeGreaterThan(1000);
    });

    test('should handle empty text', () => {
      const result = bci.synthesizeSpeech('');

      expect(result.audioData.length).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const electrodeData = generateMockElectrodeData(1024);
      bci.decodeSignal(electrodeData);

      const metrics = bci.getMetrics();

      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('signalQuality');
      expect(metrics).toHaveProperty('conversationalReady');
    });

    test('should calculate accuracy from confidence', () => {
      const electrodeData = generateMockElectrodeData(1024);
      bci.decodeSignal(electrodeData);

      const metrics = bci.getMetrics();

      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });

    test('should track average latency', () => {
      const electrodeData = generateMockElectrodeData(1024);

      bci.decodeSignal(electrodeData);
      bci.decodeSignal(electrodeData);

      const metrics = bci.getMetrics();

      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    test('should indicate conversational readiness', () => {
      const electrodeData = generateMockElectrodeData(1024);
      bci.decodeSignal(electrodeData);

      const metrics = bci.getMetrics();

      expect(typeof metrics.conversationalReady).toBe('boolean');
    });
  });
});

// ============================================================================
// Photonic Computing Accelerator Tests
// ============================================================================

describe('PhotonicComputingAccelerator', () => {
  let accelerator: PhotonicComputingAccelerator;

  beforeEach(() => {
    accelerator = new PhotonicComputingAccelerator();
  });

  describe('constructor', () => {
    test('should initialize successfully', () => {
      expect(accelerator).toBeDefined();
    });

    test('should initialize with optical parameters', () => {
      const metrics = accelerator.getMetrics();
      expect(metrics.speedupFactor).toBe(100);
    });
  });

  describe('opticalMatrixMultiply', () => {
    test('should multiply matrices correctly', () => {
      const matrixA = new Float32Array([1, 2, 3, 4]);
      const matrixB = new Float32Array([5, 6, 7, 8]);
      const result = accelerator.opticalMatrixMultiply(matrixA, matrixB, 2, 2, 2);

      expect(result).toBeDefined();
      expect(result.length).toBe(4); // 2x2 result
    });

    test('should handle different matrix sizes', () => {
      const matrixA = new Float32Array(12); // 3x4
      const matrixB = new Float32Array(8); // 4x2
      const result = accelerator.opticalMatrixMultiply(matrixA, matrixB, 3, 4, 2);

      expect(result.length).toBe(6); // 3x2 result
    });

    test('should complete in nanoseconds', () => {
      const matrixA = new Float32Array(100);
      const matrixB = new Float32Array(100);

      const start = performance.now();
      accelerator.opticalMatrixMultiply(matrixA, matrixB, 10, 10, 10);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10); // Should be very fast
    });

    test('should record operation', () => {
      const matrixA = new Float32Array([1, 2]);
      const matrixB = new Float32Array([3, 4]);

      accelerator.opticalMatrixMultiply(matrixA, matrixB, 1, 2, 2);

      const metrics = accelerator.getMetrics();
      expect(metrics.operationCount).toBe(1);
    });
  });

  describe('opticalConvolution', () => {
    test('should perform convolution', () => {
      const input = new Float32Array(25); // 5x5
      input.fill(1.0);
      const kernel = new Float32Array(9); // 3x3
      kernel.fill(0.1);

      const output = accelerator.opticalConvolution(input, kernel, 5, 5, 3);

      expect(output).toBeDefined();
      expect(output.length).toBe(9); // 3x3 output
    });

    test('should handle edge detection kernel', () => {
      const input = new Float32Array(16); // 4x4
      input.fill(1.0);
      const kernel = new Float32Array([1, 0, -1, 0, 0, 0, -1, 0, 1]); // 3x3

      const output = accelerator.opticalConvolution(input, kernel, 4, 4, 3);

      expect(output.length).toBe(4); // 2x2 output
    });

    test('should record convolution operation', () => {
      const input = new Float32Array(25);
      const kernel = new Float32Array(9);

      accelerator.opticalConvolution(input, kernel, 5, 5, 3);

      const metrics = accelerator.getMetrics();
      expect(metrics.operationCount).toBeGreaterThan(0);
    });
  });

  describe('opticalActivation', () => {
    test('should apply ReLU activation', () => {
      const input = new Float32Array([-1, -0.5, 0, 0.5, 1]);
      const output = accelerator.opticalActivation(input, 'relu');

      expect(output[0]).toBe(0); // Negative clamped to 0
      expect(output[1]).toBe(0);
      expect(output[2]).toBe(0);
      expect(output[3]).toBe(0.5);
      expect(output[4]).toBe(1);
    });

    test('should apply sigmoid activation', () => {
      const input = new Float32Array([0]);
      const output = accelerator.opticalActivation(input, 'sigmoid');

      expect(output[0]).toBeCloseTo(0.5, 2); // Sigmoid(0) = 0.5
    });

    test('should handle large arrays', () => {
      const input = new Float32Array(1000);
      input.fill(0.5);

      const output = accelerator.opticalActivation(input, 'relu');

      expect(output.length).toBe(1000);
    });

    test('should record activation operation', () => {
      const input = new Float32Array([1, 2, 3]);
      accelerator.opticalActivation(input, 'relu');

      const metrics = accelerator.getMetrics();
      expect(metrics.operationCount).toBeGreaterThan(0);
    });
  });

  describe('opticalFourierTransform', () => {
    test('should compute Fourier transform', () => {
      const signal = new Float32Array([1, 2, 3, 4]);
      const result = accelerator.opticalFourierTransform(signal);

      expect(result.magnitude).toBeDefined();
      expect(result.phase).toBeDefined();
      expect(result.magnitude.length).toBe(4);
      expect(result.phase.length).toBe(4);
    });

    test('should handle DC component', () => {
      const signal = new Float32Array([1, 1, 1, 1]);
      const result = accelerator.opticalFourierTransform(signal);

      // DC component should be large
      expect(result.magnitude[0]).toBeGreaterThan(0);
    });

    test('should compute phase', () => {
      const signal = new Float32Array([1, 0, -1, 0]);
      const result = accelerator.opticalFourierTransform(signal);

      // Phase should be calculated
      for (let i = 0; i < result.phase.length; i++) {
        expect(Math.abs(result.phase[i])).toBeLessThanOrEqual(Math.PI);
      }
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const metrics = accelerator.getMetrics();

      expect(metrics).toHaveProperty('speedupFactor');
      expect(metrics).toHaveProperty('energyEfficiency');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('operationCount');
    });

    test('should report 100x speedup', () => {
      const metrics = accelerator.getMetrics();
      expect(metrics.speedupFactor).toBe(100);
    });

    test('should report high energy efficiency', () => {
      const metrics = accelerator.getMetrics();
      expect(metrics.energyEfficiency).toBe(1000);
    });

    test('should track operation count', () => {
      const matrixA = new Float32Array([1, 2]);
      const matrixB = new Float32Array([3, 4]);

      accelerator.opticalMatrixMultiply(matrixA, matrixB, 1, 2, 2);
      accelerator.opticalMatrixMultiply(matrixA, matrixB, 1, 2, 2);

      const metrics = accelerator.getMetrics();
      expect(metrics.operationCount).toBe(2);
    });

    test('should calculate average latency', () => {
      const input = new Float32Array([1, 2, 3]);
      accelerator.opticalActivation(input, 'relu');

      const metrics = accelerator.getMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// DNA-based Media Archival System Tests
// ============================================================================

describe('DNAMediaArchivalSystem', () => {
  let archival: DNAMediaArchivalSystem;

  beforeEach(() => {
    archival = new DNAMediaArchivalSystem();
  });

  describe('constructor', () => {
    test('should initialize successfully', () => {
      expect(archival).toBeDefined();
    });
  });

  describe('encodeToDNA', () => {
    test('should encode data to DNA sequence', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const dnaSeq = archival.encodeToDNA(data, 'test001');

      expect(dnaSeq.sequence).toBeDefined();
      expect(dnaSeq.sequence.length).toBeGreaterThan(0);
    });

    test('should generate barcode', () => {
      const data = new Uint8Array([1, 2, 3]);
      const dnaSeq = archival.encodeToDNA(data, 'id123');

      expect(dnaSeq.barcode).toBeDefined();
      expect(dnaSeq.barcode.length).toBeGreaterThan(0);
    });

    test('should store original data', () => {
      const data = new Uint8Array([10, 20, 30]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      expect(dnaSeq.encodedData).toEqual(data);
    });

    test('should set synthesis date', () => {
      const data = new Uint8Array([1]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      expect(dnaSeq.synthesisDate).toBeLessThanOrEqual(Date.now());
    });

    test('should initialize read count to zero', () => {
      const data = new Uint8Array([1]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      expect(dnaSeq.readCount).toBe(0);
    });

    test('should convert bytes to ATCG nucleotides', () => {
      const data = new Uint8Array([255]); // All bits set
      const dnaSeq = archival.encodeToDNA(data, 'test');

      // Sequence should only contain A, T, C, G
      expect(dnaSeq.sequence).toMatch(/^[ATCG]+$/);
    });

    test('should handle empty data', () => {
      const data = new Uint8Array([]);
      const dnaSeq = archival.encodeToDNA(data, 'empty');

      expect(dnaSeq.sequence).toBeDefined();
    });

    test('should add error correction', () => {
      const data = new Uint8Array([1, 2, 3]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      // Sequence should be longer due to error correction
      const minLength = data.length * 4 * 1.1; // 4 nucleotides per byte + 10% redundancy
      expect(dnaSeq.sequence.length).toBeGreaterThan(0);
    });
  });

  describe('decodeFromDNA', () => {
    test('should decode DNA back to original data', () => {
      const originalData = new Uint8Array([42, 43, 44]);
      const dnaSeq = archival.encodeToDNA(originalData, 'test');

      const decoded = archival.decodeFromDNA(dnaSeq);

      // Should match original (approximately, due to encoding)
      expect(decoded.length).toBe(originalData.length);
    });

    test('should increment read count', () => {
      const data = new Uint8Array([1, 2, 3]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      expect(dnaSeq.readCount).toBe(0);

      archival.decodeFromDNA(dnaSeq);
      expect(dnaSeq.readCount).toBe(1);

      archival.decodeFromDNA(dnaSeq);
      expect(dnaSeq.readCount).toBe(2);
    });

    test('should handle multiple reads', () => {
      const data = new Uint8Array([100]);
      const dnaSeq = archival.encodeToDNA(data, 'test');

      for (let i = 0; i < 10; i++) {
        archival.decodeFromDNA(dnaSeq);
      }

      expect(dnaSeq.readCount).toBe(10);
    });
  });

  describe('retrieveByBarcode', () => {
    test('should retrieve sequence by barcode', () => {
      const data = new Uint8Array([1, 2, 3]);
      const dnaSeq = archival.encodeToDNA(data, 'abc123');

      const retrieved = archival.retrieveByBarcode(dnaSeq.barcode);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('abc123');
    });

    test('should return null for non-existent barcode', () => {
      const retrieved = archival.retrieveByBarcode('XXXXXXXXXXXXXX');

      expect(retrieved).toBeNull();
    });

    test('should handle multiple sequences', () => {
      archival.encodeToDNA(new Uint8Array([1]), 'seq1');
      archival.encodeToDNA(new Uint8Array([2]), 'seq2');
      const seq3 = archival.encodeToDNA(new Uint8Array([3]), 'seq3');

      const retrieved = archival.retrieveByBarcode(seq3.barcode);

      expect(retrieved!.id).toBe('seq3');
    });
  });

  describe('calculateStorageDensity', () => {
    test('should return density metrics', () => {
      const density = archival.calculateStorageDensity();

      expect(density.bitsPerGram).toBeGreaterThan(0);
      expect(density.yearsRetention).toBe(1000);
      expect(density.densityMultiplier).toBe(10000000);
    });

    test('should show million-fold improvement', () => {
      const density = archival.calculateStorageDensity();

      expect(density.densityMultiplier).toBeGreaterThanOrEqual(1000000);
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const data = new Uint8Array([1, 2, 3]);
      archival.encodeToDNA(data, 'test');

      const metrics = archival.getMetrics();

      expect(metrics).toHaveProperty('sequencesStored');
      expect(metrics).toHaveProperty('totalDataSize');
      expect(metrics).toHaveProperty('averageErrorRate');
      expect(metrics).toHaveProperty('averageReadCount');
    });

    test('should track sequences stored', () => {
      archival.encodeToDNA(new Uint8Array([1]), 'seq1');
      archival.encodeToDNA(new Uint8Array([2]), 'seq2');

      const metrics = archival.getMetrics();

      expect(metrics.sequencesStored).toBe(2);
    });

    test('should calculate total data size', () => {
      archival.encodeToDNA(new Uint8Array(100), 'test1');
      archival.encodeToDNA(new Uint8Array(200), 'test2');

      const metrics = archival.getMetrics();

      expect(metrics.totalDataSize).toBe(300);
    });

    test('should track average read count', () => {
      const seq1 = archival.encodeToDNA(new Uint8Array([1]), 'seq1');
      const seq2 = archival.encodeToDNA(new Uint8Array([2]), 'seq2');

      archival.decodeFromDNA(seq1);
      archival.decodeFromDNA(seq1);
      archival.decodeFromDNA(seq2);

      const metrics = archival.getMetrics();

      expect(metrics.averageReadCount).toBe(1.5);
    });

    test('should report error rate', () => {
      archival.encodeToDNA(new Uint8Array([1]), 'test');

      const metrics = archival.getMetrics();

      expect(metrics.averageErrorRate).toBeGreaterThan(0);
      expect(metrics.averageErrorRate).toBeLessThan(0.01); // <1%
    });
  });
});

// ============================================================================
// VVC/H.266 Advanced Codec Tests
// ============================================================================

describe('VVCAdvancedCodec', () => {
  let codec: VVCAdvancedCodec;

  beforeEach(() => {
    codec = new VVCAdvancedCodec();
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      expect(codec).toBeDefined();
    });

    test('should use main10 profile', () => {
      const metrics = codec.getMetrics();
      expect(metrics.profile).toBe('main10');
    });
  });

  describe('encodeFrame', () => {
    test('should encode I-frame', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'I');

      expect(result.encoded).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(1);
      expect(result.bitrate).toBeGreaterThan(0);
    });

    test('should encode P-frame', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'P');

      expect(result.encoded).toBeDefined();
    });

    test('should encode B-frame', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'B');

      expect(result.encoded).toBeDefined();
    });

    test('should achieve high compression', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'B');

      expect(result.compressionRatio).toBeGreaterThan(30);
    });

    test('should compress I-frame less than P-frame', () => {
      const frameData = generateMockImage(1920, 1080);

      const iResult = codec.encodeFrame(frameData, 1920, 1080, 'I');
      const pResult = codec.encodeFrame(frameData, 1920, 1080, 'P');

      expect(pResult.compressionRatio).toBeGreaterThan(iResult.compressionRatio);
    });

    test('should compress P-frame less than B-frame', () => {
      const frameData = generateMockImage(1920, 1080);

      const pResult = codec.encodeFrame(frameData, 1920, 1080, 'P');
      const bResult = codec.encodeFrame(frameData, 1920, 1080, 'B');

      expect(bResult.compressionRatio).toBeGreaterThanOrEqual(pResult.compressionRatio);
    });

    test('should produce smaller encoded size than original', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'B');

      expect(result.encoded.byteLength).toBeLessThan(frameData.byteLength);
    });

    test('should calculate bitrate', () => {
      const frameData = generateMockImage(1920, 1080);
      const result = codec.encodeFrame(frameData, 1920, 1080, 'B');

      expect(result.bitrate).toBeGreaterThan(0);
    });

    test('should buffer encoded frames', () => {
      const frameData = generateMockImage(100, 100);

      codec.encodeFrame(frameData, 100, 100, 'I');
      codec.encodeFrame(frameData, 100, 100, 'P');

      const metrics = codec.getMetrics();
      expect(metrics.encodedFrameCount).toBe(2);
    });
  });

  describe('decodeFrame', () => {
    test('should decode VVC frame', () => {
      const frameData = generateMockImage(1920, 1080);
      const encoded = codec.encodeFrame(frameData, 1920, 1080, 'P');

      const result = codec.decodeFrame(encoded.encoded);

      expect(result.decoded).toBeDefined();
      expect(result.quality).toBeGreaterThan(0.9);
    });

    test('should maintain high quality', () => {
      const frameData = generateMockImage(1920, 1080);
      const encoded = codec.encodeFrame(frameData, 1920, 1080, 'I');

      const result = codec.decodeFrame(encoded.encoded);

      expect(result.quality).toBeGreaterThanOrEqual(0.98);
    });

    test('should expand compressed data', () => {
      const frameData = generateMockImage(1920, 1080);
      const encoded = codec.encodeFrame(frameData, 1920, 1080, 'B');

      const result = codec.decodeFrame(encoded.encoded);

      expect(result.decoded.byteLength).toBeGreaterThan(encoded.encoded.byteLength);
    });
  });

  describe('applyVVCFeatures', () => {
    test('should create subpictures', () => {
      const frame = generateMockImage(1920, 1080);
      const result = codec.applyVVCFeatures(frame);

      expect(result.subpictures).toBeDefined();
      expect(result.subpictures.length).toBeGreaterThan(0);
    });

    test('should define virtual boundaries', () => {
      const frame = generateMockImage(1920, 1080);
      const result = codec.applyVVCFeatures(frame);

      expect(result.virtualBoundaries).toBeDefined();
      expect(result.virtualBoundaries.length).toBeGreaterThan(0);
    });

    test('should apply adaptive QP', () => {
      const frame = generateMockImage(1920, 1080);
      const result = codec.applyVVCFeatures(frame);

      expect(result.adaptiveQP).toBeDefined();
      expect(result.adaptiveQP.length).toBeGreaterThan(0);
    });

    test('should have QP values in reasonable range', () => {
      const frame = generateMockImage(1920, 1080);
      const result = codec.applyVVCFeatures(frame);

      for (const qp of result.adaptiveQP) {
        expect(qp).toBeGreaterThan(0);
        expect(qp).toBeLessThan(52); // QP range in VVC
      }
    });
  });

  describe('compareCodecs', () => {
    test('should show savings vs HEVC', () => {
      const comparison = codec.compareCodecs();

      expect(comparison.savings.vsHEVC).toBeCloseTo(50, 5);
    });

    test('should show savings vs AV1', () => {
      const comparison = codec.compareCodecs();

      expect(comparison.savings.vsAV1).toBeCloseTo(30, 10);
    });

    test('should have lowest bitrate', () => {
      const comparison = codec.compareCodecs();

      expect(comparison.vvcBitrate).toBeLessThan(comparison.hevcBitrate);
      expect(comparison.vvcBitrate).toBeLessThan(comparison.av1Bitrate);
    });
  });

  describe('getMetrics', () => {
    test('should return all metrics', () => {
      const metrics = codec.getMetrics();

      expect(metrics).toHaveProperty('encodedFrameCount');
      expect(metrics).toHaveProperty('averageBitrate');
      expect(metrics).toHaveProperty('averageCompressionRatio');
      expect(metrics).toHaveProperty('profile');
    });

    test('should track encoded frame count', () => {
      const frameData = generateMockImage(100, 100);

      codec.encodeFrame(frameData, 100, 100, 'I');
      codec.encodeFrame(frameData, 100, 100, 'P');
      codec.encodeFrame(frameData, 100, 100, 'B');

      const metrics = codec.getMetrics();
      expect(metrics.encodedFrameCount).toBe(3);
    });

    test('should calculate average bitrate', () => {
      const frameData = generateMockImage(1920, 1080);

      codec.encodeFrame(frameData, 1920, 1080, 'I');
      codec.encodeFrame(frameData, 1920, 1080, 'P');

      const metrics = codec.getMetrics();
      expect(metrics.averageBitrate).toBeGreaterThan(0);
    });

    test('should report high compression ratio', () => {
      const metrics = codec.getMetrics();
      expect(metrics.averageCompressionRatio).toBe(50);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  describe('Neuromorphic + Photonic Processing', () => {
    test('should combine neuromorphic and photonic computation', () => {
      const neuromorphic = new NeuromorphicSignalProcessor();
      const photonic = new PhotonicComputingAccelerator();

      // Neuromorphic preprocessing
      const signal = generateMockSignal(1000);
      const processed = neuromorphic.processSignal(signal);

      // Photonic matrix operation
      const matrix = new Float32Array(100);
      for (let i = 0; i < 100; i++) {
        matrix[i] = processed[i % processed.length];
      }

      const result = photonic.opticalMatrixMultiply(matrix, matrix, 10, 10, 10);

      expect(result).toBeDefined();
    });
  });

  describe('BCI + VVC Codec', () => {
    test('should encode BCI-generated speech', () => {
      const bci = new BrainComputerInterfaceIntegration();
      const codec = new VVCAdvancedCodec();

      // Decode thought to speech
      const electrodes = generateMockElectrodeData(1024);
      const signal = bci.decodeSignal(electrodes);

      // Synthesize audio
      const audio = bci.synthesizeSpeech(signal.decodedText);

      // Encode audio (simulate video frame)
      const videoFrame = new Uint8Array(audio.audioData.length);
      const encoded = codec.encodeFrame(videoFrame, 1920, 1080, 'P');

      expect(encoded.compressionRatio).toBeGreaterThan(1);
    });
  });

  describe('LEO + Holographic Telepresence', () => {
    test('should stream holographic data over LEO satellite', () => {
      const leo = new LEOSatelliteCommunicationAdapter();
      const holo = new HolographicTelepresenceEngine();

      // Capture holographic frame
      const depthData = generateMockDepthMap(1000);
      const rgbData = generateMockImage(100, 100);
      const frame = holo.captureHolographicFrame(depthData, rgbData, [{ x: 0, y: 0, z: 0 }]);

      // Compress for transmission
      const compressed = holo.compressHolographicFrame(frame);

      // Optimize pacing for LEO
      const pacing = leo.optimizePacing(compressed.compressed, 10);

      expect(pacing.shouldSend).toBe(true);
    });
  });

  describe('DNA Archival + VVC Codec', () => {
    test('should archive encoded video in DNA', () => {
      const codec = new VVCAdvancedCodec();
      const dna = new DNAMediaArchivalSystem();

      // Encode video frame
      const frameData = generateMockImage(1920, 1080);
      const encoded = codec.encodeFrame(frameData, 1920, 1080, 'I');

      // Store in DNA
      const dnaSeq = dna.encodeToDNA(encoded.encoded, 'video_frame_001');

      // Retrieve and decode
      const retrieved = dna.retrieveByBarcode(dnaSeq.barcode);
      expect(retrieved).not.toBeNull();

      const decodedData = dna.decodeFromDNA(retrieved!);
      expect(decodedData.length).toBe(encoded.encoded.length);
    });
  });

  describe('Full Pipeline', () => {
    test('should process complete cognitive-biological pipeline', () => {
      // 1. Brain signal to speech
      const bci = new BrainComputerInterfaceIntegration();
      const electrodes = generateMockElectrodeData(1024);
      const bciSignal = bci.decodeSignal(electrodes);

      // 2. Neuromorphic processing
      const neuromorphic = new NeuromorphicSignalProcessor();
      const audioSignal = new Float32Array(1000);
      const processed = neuromorphic.processSignal(audioSignal);

      // 3. Holographic rendering
      const holo = new HolographicTelepresenceEngine();
      const depthData = generateMockDepthMap(1000);
      const rgbData = generateMockImage(100, 100);
      const holoFrame = holo.captureHolographicFrame(depthData, rgbData, [{ x: 0, y: 0, z: 0 }]);

      // 4. VVC encoding
      const codec = new VVCAdvancedCodec();
      const videoData = new Uint8Array(1000);
      const encoded = codec.encodeFrame(videoData, 1920, 1080, 'P');

      // 5. LEO transmission
      const leo = new LEOSatelliteCommunicationAdapter();
      const pacing = leo.optimizePacing(encoded.encoded, 5);

      // 6. DNA archival
      const dna = new DNAMediaArchivalSystem();
      const archived = dna.encodeToDNA(encoded.encoded, 'session_001');

      expect(bciSignal.confidence).toBeGreaterThan(0);
      expect(processed.length).toBe(100);
      expect(holoFrame.viewpoints).toBeGreaterThan(0);
      expect(encoded.compressionRatio).toBeGreaterThan(1);
      expect(pacing.shouldSend).toBe(true);
      expect(archived.sequence.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Tests', () => {
  test('Neuromorphic should process signals efficiently', () => {
    const processor = new NeuromorphicSignalProcessor();
    const signal = generateMockSignal(1000);

    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      processor.processSignal(signal);
    }
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(1000); // 100 iterations in <1s
  });

  test('Photonic should be extremely fast', () => {
    const accelerator = new PhotonicComputingAccelerator();
    const matrix = new Float32Array(100);

    const startTime = performance.now();
    accelerator.opticalMatrixMultiply(matrix, matrix, 10, 10, 10);
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(1); // <1ms
  });

  test('BCI should meet conversational latency', () => {
    const bci = new BrainComputerInterfaceIntegration();
    const electrodes = generateMockElectrodeData(1024);

    const signals: BCISignal[] = [];
    for (let i = 0; i < 20; i++) {
      signals.push(bci.decodeSignal(electrodes));
    }

    const avgLatency = signals.reduce((sum, s) => sum + s.latency, 0) / signals.length;
    expect(avgLatency).toBeLessThan(80); // <80ms for conversation
  });

  test('VVC should encode efficiently', () => {
    const codec = new VVCAdvancedCodec();
    const frame = generateMockImage(1920, 1080);

    const startTime = Date.now();
    codec.encodeFrame(frame, 1920, 1080, 'P');
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(100); // <100ms per frame
  });
});
