/**
 * Robustness & Production Readiness Tests
 */

import {
  ParameterValidator,
  StructuredLogger,
  RobustErrorHandler,
  ConfigurationManager,
  PerformanceMonitor,
  WebRTCAdapter,
  DEFAULT_CONFIG
} from './RobustnesImprovements';

describe('ParameterValidator', () => {
  describe('Bitrate Validation', () => {
    test('should accept valid bitrates', () => {
      const result = ParameterValidator.validateBitrate(2000);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative bitrates', () => {
      const result = ParameterValidator.validateBitrate(-100);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject non-finite bitrates', () => {
      const result = ParameterValidator.validateBitrate(NaN);
      expect(result.valid).toBe(false);
    });

    test('should warn on very low bitrate', () => {
      const result = ParameterValidator.validateBitrate(50);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should warn on very high bitrate', () => {
      const result = ParameterValidator.validateBitrate(60000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Packet Loss Validation', () => {
    test('should accept valid packet loss', () => {
      const result = ParameterValidator.validatePacketLoss(2.5);
      expect(result.valid).toBe(true);
    });

    test('should reject negative loss', () => {
      const result = ParameterValidator.validatePacketLoss(-1);
      expect(result.valid).toBe(false);
    });

    test('should reject loss > 100%', () => {
      const result = ParameterValidator.validatePacketLoss(150);
      expect(result.valid).toBe(false);
    });

    test('should warn on extreme loss', () => {
      const result = ParameterValidator.validatePacketLoss(80);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Resolution Validation', () => {
    test('should accept valid resolutions', () => {
      const result = ParameterValidator.validateResolution('1280x720');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid format', () => {
      const result = ParameterValidator.validateResolution('1280-720');
      expect(result.valid).toBe(false);
    });

    test('should reject too small resolution', () => {
      const result = ParameterValidator.validateResolution('100x100');
      expect(result.valid).toBe(false);
    });

    test('should warn on very large resolution', () => {
      const result = ParameterValidator.validateResolution('8000x4500');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should reject non-string resolution', () => {
      const result = ParameterValidator.validateResolution(null as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('Framerate Validation', () => {
    test('should accept valid framerates', () => {
      const result = ParameterValidator.validateFramerate(30);
      expect(result.valid).toBe(true);
    });

    test('should reject non-integer framerate', () => {
      const result = ParameterValidator.validateFramerate(29.5);
      expect(result.valid).toBe(false);
    });

    test('should reject framerate < 1', () => {
      const result = ParameterValidator.validateFramerate(0);
      expect(result.valid).toBe(false);
    });

    test('should warn on low framerate', () => {
      const result = ParameterValidator.validateFramerate(10);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('RTT Validation', () => {
    test('should accept valid RTT', () => {
      const result = ParameterValidator.validateRTT(100);
      expect(result.valid).toBe(true);
    });

    test('should reject negative RTT', () => {
      const result = ParameterValidator.validateRTT(-50);
      expect(result.valid).toBe(false);
    });

    test('should warn on extreme RTT', () => {
      const result = ParameterValidator.validateRTT(10000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('CPU Usage Validation', () => {
    test('should accept valid CPU usage', () => {
      const result = ParameterValidator.validateCPUUsage(50);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid CPU usage', () => {
      const result = ParameterValidator.validateCPUUsage(150);
      expect(result.valid).toBe(false);
    });
  });
});

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger('debug');
  });

  describe('Logging Levels', () => {
    test('should log debug messages', () => {
      expect(() => logger.debug('test', 'debug message')).not.toThrow();
    });

    test('should log info messages', () => {
      expect(() => logger.info('test', 'info message')).not.toThrow();
    });

    test('should log warnings', () => {
      expect(() => logger.warn('test', 'warning')).not.toThrow();
    });

    test('should log errors', () => {
      expect(() => logger.error('test', 'error', new Error('test'))).not.toThrow();
    });
  });

  describe('Decision Logging', () => {
    test('should log decision with full context', () => {
      logger.logDecision(
        'codec-selector',
        'select_codec',
        { candidates: ['h264', 'vp9'] },
        { selected: 'h264' },
        'Selected based on platform compatibility',
        2.5
      );

      const history = logger.getDecisionHistory();
      expect(history.length).toBe(1);
      expect(history[0].decisionType).toBe('select_codec');
      expect(history[0].executionTime).toBe(2.5);
    });

    test('should maintain decision history', () => {
      for (let i = 0; i < 5; i++) {
        logger.logDecision(
          'test',
          `decision_${i}`,
          {},
          {},
          'test reason',
          1
        );
      }

      const history = logger.getDecisionHistory();
      expect(history.length).toBe(5);
    });
  });

  describe('Log Export', () => {
    test('should export logs as JSON', () => {
      logger.logDecision('test', 'test_decision', {}, {}, 'reason', 1);

      const exported = logger.exportLogs();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});

describe('RobustErrorHandler', () => {
  let handler: RobustErrorHandler;

  beforeEach(() => {
    handler = new RobustErrorHandler();
  });

  describe('Fallback Strategy', () => {
    test('should execute primary function on success', async () => {
      const result = await handler.executeWithFallback(
        'test',
        async () => 'success',
        () => 'fallback'
      );

      expect(result).toBe('success');
    });

    test('should switch to fallback on error', async () => {
      const result = await handler.executeWithFallback(
        'test',
        async () => {
          throw new Error('Primary failed');
        },
        () => 'fallback'
      );

      expect(result).toBe('fallback');
    });

    test('should track error counts', async () => {
      // First error attempt
      try {
        await handler.executeWithFallback(
          'test',
          async () => {
            throw new Error('Error');
          },
          () => 'fallback'
        );
      } catch {
        // Expected
      }

      // Should eventually use fallback
      const result = await handler.executeWithFallback(
        'test',
        async () => {
          throw new Error('Still failing');
        },
        () => 'recovery'
      );

      expect(result).toBe('recovery');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', () => {
      const result = handler.handleNetworkError(
        new Error('Connection lost'),
        'streaming'
      );

      expect(result.recommendedBitrate).toBe(1000);
      expect(result.quality).toBe(50);
      expect(result.error).toBeDefined();
    });

    test('should fallback codec on error', () => {
      const codec = handler.handleCodecError('av1', new Error('Not supported'));

      expect(codec).toBe('h264');
    });

    test('should return safe default for calculation errors', () => {
      const result = handler.handleCalculationError('quality', new Error('NaN'));

      expect(result).toBe(50);
    });
  });
});

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;

  beforeEach(() => {
    manager = new ConfigurationManager();
  });

  describe('Configuration Management', () => {
    test('should load default configuration', () => {
      const config = manager.getConfig();

      expect(config.packetLossThresholds).toBeDefined();
      expect(config.rttThresholds).toBeDefined();
      expect(config.cpuThresholds).toBeDefined();
    });

    test('should accept configuration overrides', () => {
      manager = new ConfigurationManager({
        performance: {
          maxDecisionLatency: 10,
          targetFrameRate: 60,
          enableProfiling: true
        }
      });

      const config = manager.getConfig();
      expect(config.performance.maxDecisionLatency).toBe(10);
      expect(config.performance.targetFrameRate).toBe(60);
    });

    test('should not modify original default config', () => {
      manager = new ConfigurationManager({ memory: { maxHistoryPerParticipant: 100 } });
      const config = manager.getConfig();

      expect(config.memory.maxHistoryPerParticipant).toBe(100);
      expect(DEFAULT_CONFIG.memory.maxHistoryPerParticipant).toBe(300);
    });
  });

  describe('Threshold Updates', () => {
    test('should update packet loss threshold', () => {
      manager.updateThreshold('packetLoss', 'high', 8);

      const config = manager.getConfig();
      expect(config.packetLossThresholds.high).toBe(8);
    });

    test('should reject invalid threshold', () => {
      expect(() => {
        manager.updateThreshold('packetLoss', 'high', -5);
      }).toThrow();
    });

    test('should validate threshold before update', () => {
      expect(() => {
        manager.updateThreshold('cpu', 'critical', 150);
      }).toThrow();
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('Measurement', () => {
    test('should measure execution time', () => {
      const measure = monitor.startMeasurement('test_operation');

      // Simulate work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }

      const duration = measure();
      expect(duration).toBeGreaterThan(0);
    });

    test('should track multiple measurements', () => {
      const measure = monitor.startMeasurement('operation');

      for (let i = 0; i < 3; i++) {
        const end = measure();
        expect(end).toBeGreaterThan(0);
      }

      const stats = monitor.getStats('operation');
      expect(stats!.count).toBe(3);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      const measure = monitor.startMeasurement('test');

      // Record some measurements
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {}, 0); // Simulate work
        measure();
      }

      const stats = monitor.getStats('test');
      expect(stats).toBeDefined();
      expect(stats!.avg).toBeGreaterThan(0);
      expect(stats!.max).toBeGreaterThanOrEqual(stats!.min);
      expect(stats!.p95).toBeDefined();
    });

    test('should return null for unmeasured operation', () => {
      const stats = monitor.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    test('should get all statistics', () => {
      monitor.startMeasurement('op1')();
      monitor.startMeasurement('op2')();

      const allStats = monitor.getAllStats();
      expect(Object.keys(allStats).length).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    test('should clear measurements on reset', () => {
      monitor.startMeasurement('test')();

      monitor.reset();

      const stats = monitor.getStats('test');
      expect(stats).toBeNull();
    });
  });
});

describe('WebRTCAdapter', () => {
  let adapter: WebRTCAdapter;

  beforeEach(() => {
    adapter = new WebRTCAdapter();
  });

  describe('Integration Registration', () => {
    test('should register integration callbacks', () => {
      const integration = {
        onNetworkStats: jest.fn(),
        onCodecSelected: jest.fn(),
        onQualityRecommendation: jest.fn(),
        onError: jest.fn()
      };

      adapter.registerIntegration(integration);
      adapter.notifyNetworkStats({
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5
      });

      expect(integration.onNetworkStats).toHaveBeenCalled();
    });

    test('should handle missing integration gracefully', () => {
      expect(() => {
        adapter.notifyNetworkStats({
          bandwidth: 2000,
          packetLoss: 1,
          rtt: 50,
          jitter: 5
        });
      }).not.toThrow();
    });
  });

  describe('Notifications', () => {
    test('should notify codec selection', () => {
      const integration = {
        onNetworkStats: jest.fn(),
        onCodecSelected: jest.fn(),
        onQualityRecommendation: jest.fn(),
        onError: jest.fn()
      };

      adapter.registerIntegration(integration);
      adapter.notifyCodecSelected('h264', { profile: 'main' });

      expect(integration.onCodecSelected).toHaveBeenCalledWith('h264', { profile: 'main' });
    });

    test('should notify quality recommendation', () => {
      const integration = {
        onNetworkStats: jest.fn(),
        onCodecSelected: jest.fn(),
        onQualityRecommendation: jest.fn(),
        onError: jest.fn()
      };

      adapter.registerIntegration(integration);
      adapter.notifyQualityRecommendation(85, 'Network stable');

      expect(integration.onQualityRecommendation).toHaveBeenCalledWith(85, 'Network stable');
    });

    test('should notify errors', () => {
      const integration = {
        onNetworkStats: jest.fn(),
        onCodecSelected: jest.fn(),
        onQualityRecommendation: jest.fn(),
        onError: jest.fn()
      };

      adapter.registerIntegration(integration);
      adapter.notifyError('Codec not supported', 'Fallback to H.264');

      expect(integration.onError).toHaveBeenCalledWith('Codec not supported', 'Fallback to H.264');
    });
  });
});
