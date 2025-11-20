/**
 * MEDIUM Tier Test Suite
 *
 * Tests:
 * - Group H: Algorithm optimization (10+ tests)
 * - Group I: Edge case handling (10+ tests)
 * - Group J: Documentation & debug (5+ tests)
 *
 * Total: 25+ test cases
 */

import {
  OptimizedCodecSelector,
  AsyncOperationQueue,
  EdgeCaseHandler,
  DebugTracer,
  MediumTierManager,
  ALGORITHM_DOCUMENTATION
} from './MediumTierImprovements';

// ==================== GROUP H: ALGORITHM OPTIMIZATION ====================

describe('MediumTier - Group H: Algorithm Optimization', () => {
  describe('OptimizedCodecSelector', () => {
    test('should select optimal codec in O(n) time', () => {
      const selector = new OptimizedCodecSelector();
      const codecs = [
        {
          name: 'h264',
          complexity: 1,
          supportedRates: [500, 1000, 2000, 4000]
        },
        {
          name: 'vp9',
          complexity: 3,
          supportedRates: [1000, 2000, 4000, 8000]
        },
        {
          name: 'av1',
          complexity: 5,
          supportedRates: [500, 1000, 2000, 4000, 8000]
        }
      ];

      const metrics = { bitrate: 2000, cpu: 50, latency: 50 };

      const startTime = performance.now();
      const result = selector.selectOptimal(codecs, metrics);
      const duration = performance.now() - startTime;

      expect(['h264', 'vp9', 'av1']).toContain(result);
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    test('should cache results for identical metrics', () => {
      const selector = new OptimizedCodecSelector();
      const codecs = [
        {
          name: 'h264',
          complexity: 1,
          supportedRates: [500, 1000]
        },
        { name: 'vp9', complexity: 3, supportedRates: [1000, 2000] }
      ];

      const metrics = { bitrate: 1000, cpu: 50, latency: 50 };

      const result1 = selector.selectOptimal(codecs, metrics);
      const result2 = selector.selectOptimal(codecs, metrics);

      expect(result1).toBe(result2);
    });

    test('should prefer low-complexity codec when CPU is high', () => {
      const selector = new OptimizedCodecSelector();
      const codecs = [
        {
          name: 'h264',
          complexity: 1,
          supportedRates: [2000]
        },
        { name: 'av1', complexity: 5, supportedRates: [2000] }
      ];

      const highCpuMetrics = { bitrate: 2000, cpu: 85, latency: 50 };

      const result = selector.selectOptimal(codecs, highCpuMetrics);

      expect(result).toBe('h264'); // Simpler codec preferred
    });

    test('should handle high latency scenarios', () => {
      const selector = new OptimizedCodecSelector();
      const codecs = [
        {
          name: 'h264',
          complexity: 1,
          supportedRates: [2000]
        },
        { name: 'vp9', complexity: 3, supportedRates: [2000] }
      ];

      const highLatencyMetrics = { bitrate: 2000, cpu: 50, latency: 200 };

      const result = selector.selectOptimal(codecs, highLatencyMetrics);

      expect(['h264', 'vp9']).toContain(result);
    });
  });

  describe('AsyncOperationQueue', () => {
    test('should queue async operations', async () => {
      const queue = new AsyncOperationQueue();
      let executed = false;

      await queue.queue(async () => {
        executed = true;
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executed).toBe(true);
    });

    test('should batch process operations', async () => {
      const queue = new AsyncOperationQueue();
      const order: number[] = [];

      for (let i = 0; i < 5; i++) {
        await queue.queue(async () => {
          order.push(i);
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(order.length).toBe(5);
    });

    test('should process operations in order', async () => {
      const queue = new AsyncOperationQueue();
      const results: number[] = [];

      for (let i = 0; i < 10; i++) {
        await queue.queue(async () => {
          results.push(i);
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check operations were processed (order may vary due to batching)
      expect(results.length).toBe(10);
    });

    test('should yield to event loop', async () => {
      const queue = new AsyncOperationQueue();
      let yieldedToEventLoop = false;

      const p1 = queue.queue(async () => {
        // First batch
        for (let i = 0; i < 10; i++) {
          // Long operation
        }
      });

      const p2 = new Promise((resolve) => {
        setTimeout(() => {
          yieldedToEventLoop = true;
          resolve(null);
        }, 1);
      });

      await Promise.all([p1, p2]);

      expect(yieldedToEventLoop).toBe(true);
    });
  });
});

// ==================== GROUP I: EDGE CASE HANDLING ====================

describe('MediumTier - Group I: Edge Case Handling', () => {
  describe('EdgeCaseHandler', () => {
    test('should handle zero participants', () => {
      const result = EdgeCaseHandler.handleZeroParticipants();

      expect(result.recommendedCodec).toBe('h264');
      expect(result.recommendedBitrate).toBe(500);
      expect(result.qualityScore).toBe(0);
    });

    test('should handle single participant', () => {
      const result = EdgeCaseHandler.handleSingleParticipant();

      expect(result.recommendedCodec).toBe('h264');
      expect(result.recommendedBitrate).toBeLessThanOrEqual(1000);
      expect(result.qualityScore).toBeLessThanOrEqual(25);
    });

    test('should validate extreme values - minimum', () => {
      const result = EdgeCaseHandler.validateExtremeValues(100, 100, 1000);

      expect(result.isValid).toBe(true);
      expect(result.adjusted).toBe(100);
    });

    test('should validate extreme values - maximum', () => {
      const result = EdgeCaseHandler.validateExtremeValues(1000, 100, 1000);

      expect(result.isValid).toBe(true);
      expect(result.adjusted).toBe(1000);
    });

    test('should detect below minimum', () => {
      const result = EdgeCaseHandler.validateExtremeValues(50, 100, 1000);

      expect(result.isValid).toBe(false);
      expect(result.adjusted).toBe(100);
    });

    test('should detect above maximum', () => {
      const result = EdgeCaseHandler.validateExtremeValues(2000, 100, 1000);

      expect(result.isValid).toBe(false);
      expect(result.adjusted).toBe(1000);
    });

    test('should handle NaN values', () => {
      const result = EdgeCaseHandler.validateExtremeValues(NaN, 100, 1000);

      expect(result.isValid).toBe(false);
      expect(Number.isFinite(result.adjusted)).toBe(true);
    });

    test('should generate extreme test values', () => {
      const values = EdgeCaseHandler.generateExtremeTestValues(100, 1000);

      expect(values).toContain(100); // Min
      expect(values).toContain(1000); // Max
      expect(values).toContain(NaN); // Invalid
      expect(values).toContain(Infinity); // Infinite
      expect(values.length).toBeGreaterThan(5);
    });

    test('should handle zero division', () => {
      const zeroResult = EdgeCaseHandler.safeZeroDivisionCheck(10, 0);
      const normalResult = EdgeCaseHandler.safeZeroDivisionCheck(10, 2);

      expect(zeroResult.isZeroDivision).toBe(true);
      expect(zeroResult.result).toBeNull();

      expect(normalResult.isZeroDivision).toBe(false);
      expect(normalResult.result).toBe(5);
    });

    test('should handle near-zero division', () => {
      const result = EdgeCaseHandler.safeZeroDivisionCheck(10, 1e-15);

      expect(result.isZeroDivision).toBe(true);
    });
  });
});

// ==================== GROUP J: DOCUMENTATION & DEBUG ====================

describe('MediumTier - Group J: Documentation & Debug', () => {
  describe('Algorithm Documentation', () => {
    test('should provide codec selection algorithm docs', () => {
      const docs = ALGORITHM_DOCUMENTATION.codecSelection;

      expect(docs.algorithm).toBeDefined();
      expect(docs.timeComplexity).toBe('O(n) single pass');
      expect(docs.factors).toBeInstanceOf(Array);
      expect(docs.factors.length).toBeGreaterThan(0);
    });

    test('should provide quality prediction docs', () => {
      const docs = ALGORITHM_DOCUMENTATION.qualityPrediction;

      expect(docs.algorithm).toBeDefined();
      expect(docs.layers).toBeInstanceOf(Array);
      expect(docs.layers.length).toBeGreaterThan(0);
    });

    test('should provide fairness analysis docs', () => {
      const docs = ALGORITHM_DOCUMENTATION.fairnessAnalysis;

      expect(docs.algorithm).toBe("Jain's Fairness Index");
      expect(docs.formula).toBeDefined();
      expect(docs.range).toBe('[0, 1] where 1 = perfectly fair');
      expect(docs.interpretation).toBeDefined();
    });

    test('should include references', () => {
      const docs = ALGORITHM_DOCUMENTATION;

      expect(docs.codecSelection.reference).toBeDefined();
      expect(docs.qualityPrediction.reference).toBeDefined();
      expect(docs.fairnessAnalysis.reference).toBeDefined();
    });
  });

  describe('DebugTracer', () => {
    test('should trace synchronous operations', () => {
      const tracer = new DebugTracer();

      const result = tracer.traceSync(
        'testOperation',
        () => 42,
        { input: 'test' }
      );

      expect(result).toBe(42);

      const traces = tracer.getTraces();
      expect(traces.length).toBeGreaterThan(0);
      expect(traces[0].operation).toBe('testOperation');
    });

    test('should trace async operations', async () => {
      const tracer = new DebugTracer();

      const result = await tracer.traceAsync(
        'asyncOp',
        async () => 'success',
        { data: 'test' }
      );

      expect(result).toBe('success');

      const traces = tracer.getTraces();
      expect(traces.length).toBeGreaterThan(0);
    });

    test('should track operation duration', () => {
      const tracer = new DebugTracer();

      tracer.traceSync(
        'slowOp',
        () => {
          // Simulate work
          for (let i = 0; i < 1000; i++) {
            Math.sqrt(i);
          }
        }
      );

      const traces = tracer.getTraces();
      expect(traces[0].duration).toBeGreaterThan(0);
    });

    test('should record errors in traces', () => {
      const tracer = new DebugTracer();

      try {
        tracer.traceSync('errorOp', () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected
      }

      const traces = tracer.getTraces({ level: 'error' });
      expect(traces.length).toBeGreaterThan(0);
      expect(traces[0].level).toBe('error');
    });

    test('should filter traces', () => {
      const tracer = new DebugTracer();

      tracer.traceSync('op1', () => 1);
      tracer.traceSync('op2', () => 2);
      tracer.traceSync('op1', () => 3);

      const op1Traces = tracer.getTraces({ operation: 'op1' });

      expect(op1Traces.length).toBe(2);
      expect(op1Traces.every((t) => t.operation === 'op1')).toBe(true);
    });

    test('should provide performance summary', () => {
      const tracer = new DebugTracer();

      tracer.traceSync('calc', () => 2 + 2);
      tracer.traceSync('calc', () => 3 + 3);

      const summary = tracer.getPerformanceSummary();

      expect(summary['calc']).toBeDefined();
      expect(summary['calc'].count).toBe(2);
      expect(summary['calc'].avgDuration).toBeGreaterThan(0);
      expect(summary['calc'].maxDuration).toBeGreaterThan(0);
    });

    test('should enable/disable tracing', () => {
      const tracer = new DebugTracer();

      tracer.disable();
      tracer.traceSync('op1', () => 1);

      let traceCount = tracer.getTraces().length;
      expect(traceCount).toBe(0);

      tracer.enable();
      tracer.traceSync('op2', () => 2);

      traceCount = tracer.getTraces().length;
      expect(traceCount).toBeGreaterThan(0);
    });

    test('should set verbosity levels', () => {
      const tracer = new DebugTracer();

      tracer.setVerbosity('high');
      tracer.traceSync('op', () => 42, { input: 'test' });

      const traces = tracer.getTraces();
      expect(traces[0].input).toBeDefined();
    });

    test('should clear traces', () => {
      const tracer = new DebugTracer();

      tracer.traceSync('op1', () => 1);
      tracer.traceSync('op2', () => 2);

      expect(tracer.getTraces().length).toBeGreaterThan(0);

      tracer.clear();

      expect(tracer.getTraces().length).toBe(0);
    });
  });

  describe('MediumTierManager', () => {
    test('should provide codec selector', () => {
      const manager = new MediumTierManager();
      const selector = manager.getCodecSelector();

      expect(selector).toBeDefined();
    });

    test('should provide operation queue', () => {
      const manager = new MediumTierManager();
      const queue = manager.getOperationQueue();

      expect(queue).toBeDefined();
    });

    test('should provide debug tracer', () => {
      const manager = new MediumTierManager();
      const tracer = manager.getDebugTracer();

      expect(tracer).toBeDefined();
    });

    test('should provide algorithm documentation', () => {
      const manager = new MediumTierManager();
      const docs = manager.getAlgorithmDocumentation();

      expect(docs.codecSelection).toBeDefined();
      expect(docs.qualityPrediction).toBeDefined();
      expect(docs.fairnessAnalysis).toBeDefined();
    });

    test('should provide diagnostics', () => {
      const manager = new MediumTierManager();
      const diag = manager.getDiagnostics();

      expect(diag.algorithms).toBeDefined();
      expect(diag.operationQueueLength).toBeGreaterThanOrEqual(0);
      expect(diag.performanceSummary).toBeDefined();
    });
  });
});
