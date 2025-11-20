/**
 * Phase 3 Codec Testing Framework Tests
 *
 * Comprehensive test suite for multi-codec performance testing
 */

import {
  MultiCodecPerformanceTester,
  CodecTestingManager,
  CodecBenchmarkResult,
  CodecComparisonResult
} from './Phase3CodecTesting';

describe('MultiCodecPerformanceTester', () => {
  let tester: MultiCodecPerformanceTester;

  beforeEach(() => {
    tester = new MultiCodecPerformanceTester();
  });

  describe('Codec Support Detection', () => {
    test('should detect codec support', async () => {
      const support = await tester.initializeCodecSupport();

      expect(support['h264']).toBe(true); // H.264 always supported
      expect(typeof support['vp9']).toBe('boolean');
      expect(typeof support['av1']).toBe('boolean');
    });

    test('should have H.264 always supported', async () => {
      const support = await tester.initializeCodecSupport();
      expect(support['h264']).toBe(true);
    });
  });

  describe('Quality Metrics Calculation', () => {
    test('should calculate PSNR correctly', () => {
      // PSNR should be between 15-50
      // Higher bitrate = higher PSNR

      const psnrLow = tester['calculatePSNR'](500, '640x480');
      const psnrHigh = tester['calculatePSNR'](5000, '1280x720');

      expect(psnrLow).toBeGreaterThanOrEqual(15);
      expect(psnrLow).toBeLessThanOrEqual(50);
      expect(psnrHigh).toBeGreaterThanOrEqual(15);
      expect(psnrHigh).toBeLessThanOrEqual(50);
      expect(psnrHigh).toBeGreaterThan(psnrLow);
    });

    test('should calculate SSIM correctly', () => {
      // SSIM should be between 0 and 1

      const ssimLow = tester['calculateSSIM'](500, 50);
      const ssimHigh = tester['calculateSSIM'](5000, 95);

      expect(ssimLow).toBeGreaterThanOrEqual(0);
      expect(ssimLow).toBeLessThanOrEqual(1);
      expect(ssimHigh).toBeGreaterThanOrEqual(0);
      expect(ssimHigh).toBeLessThanOrEqual(1);
      expect(ssimHigh).toBeGreaterThan(ssimLow);
    });

    test('should calculate quality score correctly', () => {
      // Quality score should be 0-100

      const lowScore = tester.calculateQualityScore(25, 0.5, 500, 40);
      const highScore = tester.calculateQualityScore(45, 0.95, 3000, 15);

      expect(lowScore).toBeGreaterThanOrEqual(0);
      expect(lowScore).toBeLessThanOrEqual(100);
      expect(highScore).toBeGreaterThanOrEqual(0);
      expect(highScore).toBeLessThanOrEqual(100);
      expect(highScore).toBeGreaterThan(lowScore);
    });

    test('should give higher quality for better metrics', () => {
      const excellentScore = tester.calculateQualityScore(48, 0.98, 4000, 10);
      const poorScore = tester.calculateQualityScore(20, 0.4, 300, 60);

      expect(excellentScore).toBeGreaterThan(poorScore);
    });
  });

  describe('Single Codec Testing', () => {
    test('should benchmark H.264 codec', async () => {
      const result = await tester.testCodec(
        'h264',
        '1280x720',
        30,
        2000,
        5
      );

      expect(result.codec).toBe('h264');
      expect(result.resolution).toBe('1280x720');
      expect(result.framerate).toBe(30);
      expect(result.averageEncodingTime).toBeGreaterThan(0);
      expect(result.averageDecodingTime).toBeGreaterThan(0);
      expect(result.averageQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.averageQualityScore).toBeLessThanOrEqual(100);
      expect(['excellent', 'good', 'acceptable', 'poor']).toContain(
        result.verdict
      );
    });

    test('should benchmark VP9 codec', async () => {
      const result = await tester.testCodec(
        'vp9',
        '1920x1080',
        30,
        3000,
        5
      );

      expect(result.codec).toBe('vp9');
      expect(result.isHardwareAccelerated).toBeDefined();
      expect(result.averagePsnr).toBeGreaterThan(0);
      expect(result.averageSsim).toBeGreaterThan(0);
    });

    test('should handle all supported resolutions', async () => {
      const resolutions = ['320x240', '640x480', '1280x720', '1920x1080'];

      for (const resolution of resolutions) {
        const result = await tester.testCodec(
          'h264',
          resolution,
          30,
          2000,
          2
        );

        expect(result.resolution).toBe(resolution);
        expect(result.averageQualityScore).toBeDefined();
      }
    });

    test('should cache codec test results', async () => {
      const params = {
        codec: 'h264',
        resolution: '1280x720',
        framerate: 30,
        bitrate: 2000,
        testDuration: 2
      };

      const result1 = await tester.testCodec(
        params.codec,
        params.resolution,
        params.framerate,
        params.bitrate,
        params.testDuration
      );

      const result2 = await tester.testCodec(
        params.codec,
        params.resolution,
        params.framerate,
        params.bitrate,
        params.testDuration
      );

      expect(result1.codec).toBe(result2.codec);
      expect(result1.averageQualityScore).toBe(result2.averageQualityScore);
    });

    test('should track frame drops and errors', async () => {
      const result = await tester.testCodec(
        'h264',
        '1280x720',
        30,
        2000,
        5,
        false // Without hardware acceleration - more drops expected
      );

      expect(result.totalFrameDrops).toBeGreaterThanOrEqual(0);
      expect(result.totalErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Codec Testing', () => {
    test('should test multiple codecs in parallel', async () => {
      const codecs = ['h264', 'vp9', 'av1'];

      const result = await tester.testMultipleCodecs(
        codecs,
        '1280x720',
        30,
        2000,
        5
      );

      expect(result.codecs.length).toBe(3);
      expect(result.timestamp).toBeDefined();
      expect(result.testDuration).toBeGreaterThan(0);
      expect(result.totalFramesTested).toBeGreaterThan(0);
    });

    test('should identify codec winners', async () => {
      const result = await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      expect(result.winner.overall).toBeDefined();
      expect(result.winner.fastestEncoding).toBeDefined();
      expect(result.winner.bestQuality).toBeDefined();
      expect(result.winner.lowestCpu).toBeDefined();
    });

    test('should generate recommendations for each codec', async () => {
      const result = await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      expect(result.recommendations['h264']).toBeDefined();
      expect(result.recommendations['vp9']).toBeDefined();

      for (const [codec, rec] of Object.entries(result.recommendations)) {
        expect(rec.bestFor).toEqual(expect.any(Array));
        expect(rec.limitations).toEqual(expect.any(Array));
        expect(rec.optimizedSettings).toBeDefined();
        expect(rec.optimizedSettings.resolution).toMatch(/^\d+x\d+$/);
        expect(rec.optimizedSettings.framerate).toBeGreaterThan(0);
        expect(rec.optimizedSettings.bitrate).toBeGreaterThan(0);
      }
    });

    test('should handle codec not supported', async () => {
      // Should not throw, just return results for supported codecs
      const result = await tester.testMultipleCodecs(
        ['h264', 'h265', 'av1'],
        '1280x720',
        30,
        2000,
        2
      );

      expect(result.codecs.length).toBeGreaterThan(0);
      expect(result.codecs[0].codec).toBeDefined();
    });
  });

  describe('Codec Recommendations', () => {
    test('should recommend codec for low-power use case', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      const recommendation = tester.getRecommendation('low-power');

      expect(['h264', 'vp9']).toContain(recommendation);
    });

    test('should recommend codec for high-quality use case', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9', 'av1'],
        '1280x720',
        30,
        2000,
        3
      );

      const recommendation = tester.getRecommendation('high-quality');

      expect(recommendation).toBeDefined();
    });

    test('should recommend codec for balanced use case', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      const recommendation = tester.getRecommendation('balanced');

      expect(recommendation).toBeDefined();
    });

    test('should recommend codec for low-latency use case', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      const recommendation = tester.getRecommendation('low-latency');

      expect(recommendation).toBeDefined();
    });

    test('should fallback to h264 with no benchmarks', () => {
      const recommendation = tester.getRecommendation('balanced');

      expect(recommendation).toBe('h264');
    });
  });

  describe('History and Reporting', () => {
    test('should track metrics history', async () => {
      await tester.testCodec('h264', '1280x720', 30, 2000, 3);

      const history = tester.getMetricsHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].codec).toBe('h264');
      expect(history[0].encodingTimeMs).toBeGreaterThan(0);
    });

    test('should track frame quality history', async () => {
      await tester.testCodec('h264', '1280x720', 30, 2000, 3);

      const frameHistory = tester.getFrameQualityHistory();

      expect(frameHistory.length).toBeGreaterThan(0);
      expect(frameHistory[0].frameNumber).toBe(0);
      expect(frameHistory[0].psnr).toBeGreaterThan(0);
      expect(frameHistory[0].ssim).toBeGreaterThan(0);
    });

    test('should provide benchmark summary', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      const summary = tester.getBenchmarkSummary();

      expect(summary.testedCodecs).toBeGreaterThan(0);
      expect(summary.averageQuality).toBeGreaterThanOrEqual(0);
      expect(summary.averageQuality).toBeLessThanOrEqual(100);
      expect(summary.bestCodec).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.details).toEqual(expect.any(Array));
    });

    test('should limit metrics history', async () => {
      // Test with multiple codecs to accumulate history
      for (let i = 0; i < 100; i++) {
        await tester.testCodec('h264', '1280x720', 30, 2000, 1);
      }

      const history = tester.getMetricsHistory();

      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear all data on reset', async () => {
      await tester.testMultipleCodecs(
        ['h264', 'vp9'],
        '1280x720',
        30,
        2000,
        3
      );

      tester.reset();

      expect(tester.getMetricsHistory().length).toBe(0);
      expect(tester.getFrameQualityHistory().length).toBe(0);

      const summary = tester.getBenchmarkSummary();
      expect(summary.testedCodecs).toBe(0);
    });
  });
});

describe('CodecTestingManager', () => {
  let manager: CodecTestingManager;

  beforeEach(() => {
    manager = new CodecTestingManager();
  });

  describe('Test Execution and Caching', () => {
    test('should run tests with caching', async () => {
      const result1 = await manager.runTests(
        ['h264', 'vp9'],
        '1280x720',
        3
      );

      const result2 = await manager.runTests(
        ['h264', 'vp9'],
        '1280x720',
        3
      );

      expect(result1.timestamp).toBe(result2.timestamp); // Same cached result
    });

    test('should differentiate cache keys by codec and resolution', async () => {
      const result1 = await manager.runTests(
        ['h264'],
        '1280x720',
        3
      );

      const result2 = await manager.runTests(
        ['h264'],
        '1920x1080',
        3
      );

      expect(result1.codecs[0].resolution).toBe('1280x720');
      expect(result2.codecs[0].resolution).toBe('1920x1080');
    });
  });

  describe('Recommendations', () => {
    test('should recommend codec based on use case', async () => {
      await manager.runTests(['h264', 'vp9'], '1280x720', 3);

      const lowPower = manager.recommendCodec('low-power');
      const highQuality = manager.recommendCodec('high-quality');

      expect(lowPower).toBeDefined();
      expect(highQuality).toBeDefined();
    });
  });

  describe('Test Report', () => {
    test('should generate test report', async () => {
      await manager.runTests(['h264'], '1280x720', 2);

      const report = manager.getTestReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metricsCount).toBeGreaterThanOrEqual(0);
      expect(report.frameQualityCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', async () => {
      await manager.runTests(['h264'], '1280x720', 2);

      manager.clearCache();

      const report = manager.getTestReport();
      expect(report.cacheSize).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle 1080p testing', async () => {
      const result = await manager.runTests(
        ['h264', 'vp9'],
        '1920x1080',
        3
      );

      expect(result.codecs.length).toBeGreaterThan(0);
      expect(result.codecs[0].resolution).toBe('1920x1080');
    });

    test('should handle 720p testing', async () => {
      const result = await manager.runTests(
        ['h264', 'vp9', 'av1'],
        '1280x720',
        3
      );

      expect(result.codecs.length).toBeGreaterThan(0);
      expect(result.winner.overall).toBeDefined();
    });

    test('should handle low-resolution testing', async () => {
      const result = await manager.runTests(
        ['h264'],
        '640x480',
        2
      );

      expect(result.codecs[0].resolution).toBe('640x480');
      expect(result.codecs[0].averageQualityScore).toBeGreaterThanOrEqual(0);
    });
  });
});
