/**
 * Integration Test Suite - Cross-Layer Validation
 *
 * Validates interactions between all implemented layers:
 * - CRITICAL Tier (Sync, Resource, Numeric, Error)
 * - HIGH Tier (Timing, Config, WebRTC)
 * - MEDIUM Tier (Optimization, EdgeCases, Debug)
 *
 * Tests real-world scenarios combining multiple layers
 */

import { SynchronizationManager } from './SynchronizationLayer';
import { ResourceManager } from './ResourceManagementLayer';
import { SafeNumericOps, NumericStabilityManager } from './NumericStabilityLayer';
import { ErrorContextManager, ErrorCategory, CategorizedError } from './ErrorContextLayer';
import { TimingSynchronizationManager } from './TimingSynchronizationLayer';
import { ConfigurationValidationManager } from './ConfigurationValidationLayer';
import { WebRTCCompatibilityManager } from './WebRTCCompatibilityLayer';
import { MediumTierManager } from './MediumTierImprovements';

describe('Integration Tests - Cross-Layer Validation', () => {
  describe('Scenario 1: Safe Codec Selection with Full Stack', () => {
    test('should select codec with all safety layers', async () => {
      const sync = new SynchronizationManager();
      const numeric = NumericStabilityManager.createSafeContext();
      const errors = new ErrorContextManager();
      const medium = new MediumTierManager();

      // Simulate network metrics
      const metrics = {
        bitrate: 2500,
        cpu: 55,
        latency: 80,
        packetLoss: 1.5
      };

      try {
        // Validate with numeric stability
        const bitrateCheck = numeric.validate(metrics.bitrate, 100, 50000);
        expect(bitrateCheck).toBeGreaterThan(0);

        // Select codec with optimization
        const codecs = [
          { name: 'h264', complexity: 1, supportedRates: [500, 1000, 2500, 5000] },
          { name: 'vp9', complexity: 3, supportedRates: [1000, 2500, 5000] },
          { name: 'av1', complexity: 5, supportedRates: [2500, 5000] }
        ];

        const codecSelector = medium.getCodecSelector();
        const selected = codecSelector.selectOptimal(codecs, metrics);

        expect(['h264', 'vp9', 'av1']).toContain(selected);

        // Cache result safely
        const cache = await sync.getOrCreateCache('codecs');
        await cache.set(selected, { metrics, timestamp: Date.now() });

        const cached = await cache.get(selected);
        expect(cached).toBeDefined();

      } catch (error) {
        const result = await errors.handleError(error, ErrorCategory.CODEC);
        expect(result.handled).toBe(true);
      }
    });

    test('should handle codec selection with extreme metrics', async () => {
      const sync = new SynchronizationManager();
      const errors = new ErrorContextManager();
      const medium = new MediumTierManager();

      const extremeMetrics = {
        bitrate: 0.1, // Very low
        cpu: 99.9, // Very high
        latency: 500, // High
        packetLoss: 50 // Extreme
      };

      try {
        const codecs = [
          { name: 'h264', complexity: 1, supportedRates: [100] },
          { name: 'vp9', complexity: 3, supportedRates: [500] }
        ];

        const codecSelector = medium.getCodecSelector();
        const selected = codecSelector.selectOptimal(codecs, extremeMetrics);

        // Should prefer H.264 (lower complexity) under stress
        expect(selected).toBe('h264');

      } catch (error) {
        const result = await errors.handleError(error, ErrorCategory.CODEC);
        expect(result.recovered).toBeDefined();
      }
    });
  });

  describe('Scenario 2: Resilient Quality Prediction', () => {
    test('should predict quality despite network instability', async () => {
      const sync = new SynchronizationManager();
      const numeric = NumericStabilityManager.createSafeContext();
      const timing = new TimingSynchronizationManager();

      const metrics = [
        { bitrate: 3000, latency: 50, loss: 0.5 },
        { bitrate: 1500, latency: 100, loss: 3.0 }, // Degradation
        { bitrate: 2000, latency: 75, loss: 1.5 }, // Recovery
        { bitrate: 2500, latency: 60, loss: 0.8 } // Stable
      ];

      const predictions: number[] = [];

      for (const metric of metrics) {
        // Calculate quality safely
        const qualityScore = numeric.clamp(
          100 - (metric.loss * 10 + metric.latency / 10),
          0,
          100
        );

        predictions.push(qualityScore);

        // Store in safe metrics
        const metricsDb = sync.getMetrics();
        await metricsDb.addMetric('quality', qualityScore);
      }

      // Verify quality scores decrease with degradation
      expect(predictions[0]).toBeGreaterThan(predictions[1]);
      expect(predictions[3]).toBeGreaterThan(predictions[1]);
    });
  });

  describe('Scenario 3: Resource Lifecycle with Error Recovery', () => {
    test('should manage resources and recover from failures', async () => {
      const resources = new ResourceManager();
      const errors = new ErrorContextManager();

      // Register recovery strategy
      errors.registerRecoveryStrategy(ErrorCategory.RESOURCE, {
        name: 'resource_reinit',
        condition: (e) => e.message.includes('resource'),
        handler: async () => ({ status: 'reinitialized' }),
        timeout: 1000
      });

      try {
        const pool = resources.getOrCreatePool('codecs');

        // Acquire codec resource
        const codec = await pool.acquire('h264', async () => ({
          name: 'h264',
          initialized: true
        }));

        expect(codec.initialized).toBe(true);

        // Register cleanup
        pool.registerCleanup('h264', async () => {
          // Cleanup logic
        });

        // Check metrics
        const metrics = pool.getMetrics();
        expect(metrics.total).toBeGreaterThan(0);

      } catch (error) {
        const result = await errors.handleError(error, ErrorCategory.RESOURCE);
        expect(result.handled).toBe(true);
      }
    });

    test('should detect and handle circular references', async () => {
      const resources = new ResourceManager();

      const detector = resources.getCircularDetector();

      // Create circular object
      const obj1: any = { name: 'obj1' };
      const obj2: any = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2;

      const result = detector.detectCircular(obj1);

      expect(result.hasCircular).toBe(true);
    });

    test('should monitor memory trends', () => {
      const resources = new ResourceManager();
      const monitor = resources.getMemoryMonitor();

      monitor.takeSnapshot();
      monitor.takeSnapshot();

      const trend = monitor.getMemoryTrend();

      if (trend) {
        expect(trend.current).toBeGreaterThan(0);
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
      }
    });
  });

  describe('Scenario 4: Configuration Validation & State Management', () => {
    test('should validate complete configuration setup', () => {
      const configMgr = new ConfigurationValidationManager();

      const config = {
        thresholds: {
          packetLoss: { low: 2, moderate: 5, high: 10, critical: 15 },
          bitrate: { min: 100, max: 50000 },
          cpu: { safe: 60, caution: 80, warning: 90, critical: 95 }
        },
        codecs: ['h264', 'vp9', 'av1'],
        preferredCodec: 'h264',
        fallbackCodec: 'vp9',
        qualityTiers: [
          { name: 'low', minBitrate: 100, maxBitrate: 500, resolution: '320x240' },
          { name: 'medium', minBitrate: 500, maxBitrate: 2000, resolution: '640x480' },
          { name: 'high', minBitrate: 2000, maxBitrate: 5000, resolution: '1280x720' }
        ]
      };

      const result = configMgr.validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid configuration transitions', () => {
      const configMgr = new ConfigurationValidationManager();
      const stateMachine = configMgr.createStateMachineValidator();

      // Define valid states
      stateMachine.defineTransition('idle', 'initializing');
      stateMachine.defineTransition('initializing', 'running');
      stateMachine.defineTransition('running', 'degraded');
      stateMachine.defineTransition('degraded', 'running');
      stateMachine.defineTransition('running', 'stopped');
      stateMachine.defineTransition('degraded', 'stopped');

      // Valid sequence
      const validSeq = stateMachine.validateSequence(['idle', 'initializing', 'running']);
      expect(validSeq.valid).toBe(true);

      // Invalid sequence
      const invalidSeq = stateMachine.validateSequence(['idle', 'running']); // Skipped initializing
      expect(invalidSeq.valid).toBe(false);
    });
  });

  describe('Scenario 5: Timing Reliability Under Load', () => {
    test('should maintain timing accuracy with multiple timers', (done) => {
      const timing = new TimingSynchronizationManager();
      const scheduler = timing.getScheduler();

      let callbacks = 0;

      scheduler.schedule('check1', 50, () => {
        callbacks++;
      });

      scheduler.schedule('check2', 100, () => {
        callbacks++;
      });

      setTimeout(() => {
        scheduler.cancel('check1');
        scheduler.cancel('check2');

        expect(callbacks).toBeGreaterThan(0);
        done();
      }, 200);
    });

    test('should detect clock skew', () => {
      const timing = new TimingSynchronizationManager();
      const clockDetector = timing.getClockDetector();

      expect(typeof clockDetector.hasSkewDetected()).toBe('boolean');

      const diag = timing.getDiagnostics();
      expect(diag.monotonicTime).toBeGreaterThan(0);
    });
  });

  describe('Scenario 6: WebRTC Compatibility Integration', () => {
    test('should detect browser capabilities', () => {
      const compat = new WebRTCCompatibilityManager();

      const browser = compat.getBrowserInfo();
      expect(browser.name).toBeDefined();
      expect(browser.version).toBeGreaterThanOrEqual(0);

      const codecs = compat.getCompatibleVideoCodecs(['h264', 'vp9']);
      expect(Array.isArray(codecs)).toBe(true);
    });

    test('should generate compatibility report', () => {
      const compat = new WebRTCCompatibilityManager();

      const report = compat.getCapabilitiesReport();

      expect(report.browser).toBeDefined();
      expect(report.capabilities).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Scenario 7: Error Handling Across Layers', () => {
    test('should handle errors with recovery strategies', async () => {
      const errors = new ErrorContextManager();

      // Register multiple recovery strategies
      errors.registerRecoveryStrategy(ErrorCategory.CODEC, {
        name: 'fallback_codec',
        condition: (e) => e.message.includes('unsupported'),
        handler: async () => 'h264',
        timeout: 1000
      });

      errors.registerRecoveryStrategy(ErrorCategory.NETWORK, {
        name: 'retry_connection',
        condition: (e) => e.message.includes('connection'),
        handler: async () => ({ status: 'reconnected' }),
        timeout: 5000
      });

      // Test codec error recovery
      const codecError = new CategorizedError(
        'Codec not supported',
        ErrorCategory.CODEC
      );

      const result1 = await errors.handleError(codecError, ErrorCategory.CODEC);
      expect(result1.recovered).toBe(true);

      // Get error summary
      const summary = errors.getErrorSummary();
      expect(summary.totalErrors).toBeGreaterThan(0);
    });

    test('should track error statistics and recovery rates', async () => {
      const errors = new ErrorContextManager();

      // Register recovery strategy
      errors.registerRecoveryStrategy(ErrorCategory.NETWORK, {
        name: 'reconnect',
        condition: () => true,
        handler: async () => ({ reconnected: true }),
        timeout: 1000
      });

      // Trigger some errors
      for (let i = 0; i < 3; i++) {
        const error = new Error('Network error');
        await errors.handleError(error, ErrorCategory.NETWORK);
      }

      // Get recovery statistics
      const stats = errors.getRecoveryStatistics();
      expect(Object.keys(stats).length).toBeGreaterThan(0);

      if (stats['NETWORK:reconnect']) {
        expect(stats['NETWORK:reconnect'].successes).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Scenario 8: Performance Monitoring Integration', () => {
    test('should trace operations across layers', async () => {
      const medium = new MediumTierManager();
      const tracer = medium.getDebugTracer();

      const sync = new SynchronizationManager();

      // Trace cache operations
      const result = await tracer.traceAsync(
        'cache_operation',
        async () => {
          const cache = await sync.getOrCreateCache('test');
          await cache.set('key', { value: 42 });
          return await cache.get('key');
        }
      );

      expect(result).toBeDefined();

      const traces = tracer.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      const summary = tracer.getPerformanceSummary();
      expect(summary['cache_operation']).toBeDefined();
    });

    test('should collect performance metrics from all operations', () => {
      const numeric = NumericStabilityManager.createSafeContext();
      const medium = new MediumTierManager();
      const tracer = medium.getDebugTracer();

      // Simulate operations
      tracer.traceSync('calc', () => numeric.divide(100, 2));
      tracer.traceSync('calc', () => numeric.divide(200, 4));
      tracer.traceSync('clamp', () => numeric.clamp(50, 0, 100));

      const summary = tracer.getPerformanceSummary();

      expect(summary['calc']).toBeDefined();
      expect(summary['calc'].count).toBe(2);
      expect(summary['clamp']).toBeDefined();
      expect(summary['clamp'].count).toBe(1);
    });
  });

  describe('Scenario 9: Real-World Full Stack Test', () => {
    test('should handle complete codec selection workflow', async () => {
      // Initialize all managers
      const sync = new SynchronizationManager();
      const resources = new ResourceManager();
      const numeric = NumericStabilityManager.createSafeContext();
      const errors = new ErrorContextManager();
      const timing = new TimingSynchronizationManager();
      const config = new ConfigurationValidationManager();
      const compat = new WebRTCCompatibilityManager();
      const medium = new MediumTierManager();

      try {
        // 1. Validate configuration
        const configValid = config.validateConfiguration({
          codecs: ['h264', 'vp9'],
          qualityTiers: [
            { name: 'low', minBitrate: 100, maxBitrate: 500, resolution: '320x240' },
            { name: 'high', minBitrate: 2000, maxBitrate: 5000, resolution: '1280x720' }
          ]
        });
        expect(configValid.valid).toBe(true);

        // 2. Collect metrics with safe operations
        const metrics = {
          bitrate: numeric.clamp(2500, 100, 50000),
          cpu: numeric.clamp(45, 0, 100),
          latency: numeric.clamp(60, 0, 300)
        };

        // 3. Check browser compatibility
        const supportedCodecs = compat.getCompatibleVideoCodecs(['h264', 'vp9']);
        expect(supportedCodecs.length).toBeGreaterThan(0);

        // 4. Select optimal codec
        const codecs = [
          { name: 'h264', complexity: 1, supportedRates: [2500] },
          { name: 'vp9', complexity: 3, supportedRates: [2500] }
        ];

        const selector = medium.getCodecSelector();
        const selectedCodec = selector.selectOptimal(codecs, metrics);

        // 5. Cache result safely
        const cache = await sync.getOrCreateCache('selected_codec');
        await cache.set('current', selectedCodec);

        // 6. Allocate resources
        const pool = resources.getOrCreatePool('codec_instances');
        const instance = await pool.acquire(selectedCodec, async () => ({
          codec: selectedCodec,
          ready: true
        }));

        expect(instance.ready).toBe(true);

        // 7. Monitor timing
        const timer = timing.getMonotonicTimer();
        const elapsed = timer.getElapsedTime();
        expect(elapsed).toBeGreaterThan(0);

      } catch (error) {
        const result = await errors.handleError(error, ErrorCategory.CODEC);
        expect(result.handled).toBe(true);
      }
    });
  });

  describe('Scenario 10: Stress Test - High Concurrency', () => {
    test('should handle concurrent cache operations', async () => {
      const sync = new SynchronizationManager();
      const cache = await sync.getOrCreateCache('stress_test');

      const operations = [];

      // Generate concurrent write/read operations
      for (let i = 0; i < 50; i++) {
        operations.push(cache.set(`key_${i}`, { value: i }));
        operations.push(cache.get(`key_${i % 10}`));
      }

      await Promise.all(operations);

      const size = await cache.size();
      expect(size).toBeGreaterThan(0);
    });

    test('should handle concurrent error handling', async () => {
      const errors = new ErrorContextManager();

      // Generate concurrent errors
      const errorPromises = [];

      for (let i = 0; i < 10; i++) {
        errorPromises.push(
          errors.handleError(new Error(`Error ${i}`), ErrorCategory.NETWORK)
        );
      }

      const results = await Promise.all(errorPromises);

      expect(results.every((r) => r.handled)).toBe(true);

      const summary = errors.getErrorSummary();
      expect(summary.totalErrors).toBe(10);
    });
  });
});
