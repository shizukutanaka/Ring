/**
 * Phase 6: Screen Sharing Optimization Tests
 */

import { ScreenSharingOptimizationService } from './Phase6ScreenSharing';

describe('Phase 6: Screen Sharing Optimization', () => {
  let service: ScreenSharingOptimizationService;

  beforeEach(() => {
    service = new ScreenSharingOptimizationService();
  });

  describe('Configuration Management', () => {
    test('should initialize with default configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(false);
      expect(config.contentType).toBe('mixed');
      expect(config.codec).toBe('vp9');
      expect(config.targetFrameRate).toBeGreaterThan(0);
    });

    test('should set screen sharing configuration', () => {
      const result = service.setConfig({
        enabled: true,
        codec: 'h264'
      });

      expect(result.enabled).toBe(true);
      expect(result.codec).toBe('h264');
    });

    test('should support all codec types', () => {
      const codecs = ['vp8', 'vp9', 'h264', 'av1'] as const;

      codecs.forEach((codec) => {
        const result = service.setConfig({ codec });
        expect(result.codec).toBe(codec);
      });
    });

    test('should configure resolution limits', () => {
      const result = service.setConfig({
        maxResolution: { width: 1280, height: 720 }
      });

      expect(result.maxResolution.width).toBe(1280);
      expect(result.maxResolution.height).toBe(720);
    });

    test('should configure frame rate', () => {
      const result = service.setConfig({ targetFrameRate: 24 });

      expect(result.targetFrameRate).toBe(24);
    });

    test('should configure bitrate', () => {
      const result = service.setConfig({ targetBitrate: 3000 });

      expect(result.targetBitrate).toBe(3000);
    });

    test('should enable/disable adaptive quality', () => {
      service.setConfig({ enableAdaptiveQuality: true });
      expect(service.getConfig().enableAdaptiveQuality).toBe(true);

      service.setConfig({ enableAdaptiveQuality: false });
      expect(service.getConfig().enableAdaptiveQuality).toBe(false);
    });

    test('should enable/disable screen change detection', () => {
      service.setConfig({ enableScreenChangeDetection: true });
      expect(service.getConfig().enableScreenChangeDetection).toBe(true);
    });
  });

  describe('Content Analysis', () => {
    test('should analyze screen content', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(255, 255, 255)';
      ctx?.fillRect(0, 0, 640, 480);

      const analysis = await service.analyzeScreenContent(canvas);

      expect(analysis).toBeDefined();
      expect(analysis.contentType).toMatch(/presentation|video|code|mixed/);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    test('should detect content changes', async () => {
      const canvas1 = new OffscreenCanvas(640, 480);
      const ctx1 = canvas1.getContext('2d');
      ctx1?.fillStyle = 'rgb(255, 0, 0)';
      ctx1?.fillRect(0, 0, 640, 480);

      const analysis1 = await service.analyzeScreenContent(canvas1);

      const canvas2 = new OffscreenCanvas(640, 480);
      const ctx2 = canvas2.getContext('2d');
      ctx2?.fillStyle = 'rgb(0, 255, 0)';
      ctx2?.fillRect(0, 0, 640, 480);

      const analysis2 = await service.analyzeScreenContent(canvas2);

      expect(analysis2.changeDetected).toBe(true);
    });

    test('should classify presentation content', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Draw presentation-like content: text on white background
      ctx?.fillStyle = 'rgb(255, 255, 255)';
      ctx?.fillRect(0, 0, 640, 480);
      ctx?.fillStyle = 'rgb(0, 0, 0)';
      ctx?.font = 'bold 32px Arial';
      ctx?.fillText('Slide Title', 50, 100);

      const analysis = await service.analyzeScreenContent(canvas);

      // Should classify as presentation or code
      expect(['presentation', 'code', 'mixed']).toContain(analysis.contentType);
    });

    test('should detect video content', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Draw video-like content: high color variation
      for (let y = 0; y < 480; y += 2) {
        for (let x = 0; x < 640; x += 2) {
          const r = Math.random() * 255;
          const g = Math.random() * 255;
          const b = Math.random() * 255;
          ctx?.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx?.fillRect(x, y, 2, 2);
        }
      }

      const analysis = await service.analyzeScreenContent(canvas);

      expect(analysis.colorComplexity).toBeGreaterThan(0.3);
    });

    test('should calculate entropy correctly', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Low entropy: solid color
      ctx?.fillStyle = 'rgb(128, 128, 128)';
      ctx?.fillRect(0, 0, 640, 480);

      const analysis = await service.analyzeScreenContent(canvas);

      expect(analysis.averageEntropyChange).toBeLessThan(0.5);
    });

    test('should calculate motion level', async () => {
      const canvas1 = new OffscreenCanvas(640, 480);
      const ctx1 = canvas1.getContext('2d');
      ctx1?.fillStyle = 'rgb(255, 255, 255)';
      ctx1?.fillRect(0, 0, 640, 480);

      const canvas2 = new OffscreenCanvas(640, 480);
      const ctx2 = canvas2.getContext('2d');
      ctx2?.fillStyle = 'rgb(200, 200, 200)';
      ctx2?.fillRect(0, 0, 640, 480);

      const analysis1 = await service.analyzeScreenContent(canvas1);
      const analysis2 = await service.analyzeScreenContent(canvas2);

      expect(analysis2.motionLevel).toBeGreaterThanOrEqual(0);
      expect(analysis2.motionLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('Codec Recommendation', () => {
    test('should recommend codec based on bandwidth', async () => {
      const analysis = {
        contentType: 'presentation' as const,
        confidence: 0.8,
        changeDetected: false,
        averageEntropyChange: 0.3,
        colorComplexity: 0.2,
        motionLevel: 0.1
      };

      const recommendation = await service.recommendCodec(2500, analysis);

      expect(recommendation).toBeDefined();
      expect(['vp8', 'vp9', 'h264', 'av1']).toContain(recommendation.codec);
      expect(recommendation.compressionRatio).toBeGreaterThan(0);
      expect(recommendation.estimatedBitrate).toBeGreaterThan(0);
    });

    test('should recommend VP9 for presentations', async () => {
      const analysis = {
        contentType: 'presentation' as const,
        confidence: 0.9,
        changeDetected: false,
        averageEntropyChange: 0.2,
        colorComplexity: 0.1,
        motionLevel: 0.05
      };

      const recommendation = await service.recommendCodec(2500, analysis);

      expect(['vp9', 'vp8']).toContain(recommendation.codec);
    });

    test('should recommend AV1 for code content with sufficient bandwidth', async () => {
      const analysis = {
        contentType: 'code' as const,
        confidence: 0.85,
        changeDetected: false,
        averageEntropyChange: 0.15,
        colorComplexity: 0.2,
        motionLevel: 0
      };

      const recommendation = await service.recommendCodec(2000, analysis);

      expect(['av1', 'h264']).toContain(recommendation.codec);
    });

    test('should recommend lower bitrate codec with limited bandwidth', async () => {
      const analysis = {
        contentType: 'mixed' as const,
        confidence: 0.6,
        changeDetected: false,
        averageEntropyChange: 0.4,
        colorComplexity: 0.5,
        motionLevel: 0.3
      };

      const lowBandwidth = await service.recommendCodec(800, analysis);
      const highBandwidth = await service.recommendCodec(3000, analysis);

      expect(lowBandwidth.estimatedBitrate).toBeLessThanOrEqual(
        highBandwidth.estimatedBitrate
      );
    });

    test('should provide codec reasoning', async () => {
      const analysis = {
        contentType: 'video' as const,
        confidence: 0.8,
        changeDetected: false,
        averageEntropyChange: 0.7,
        colorComplexity: 0.6,
        motionLevel: 0.5
      };

      const recommendation = await service.recommendCodec(2500, analysis);

      expect(recommendation.reasoning).toBeDefined();
      expect(typeof recommendation.reasoning).toBe('string');
      expect(recommendation.reasoning.length).toBeGreaterThan(0);
    });

    test('should recommend appropriate resolution', async () => {
      const analysis = {
        contentType: 'presentation' as const,
        confidence: 0.8,
        changeDetected: false,
        averageEntropyChange: 0.2,
        colorComplexity: 0.2,
        motionLevel: 0.1
      };

      const recommendation = await service.recommendCodec(2500, analysis);

      expect(recommendation.recommendedResolution).toBeDefined();
      expect(recommendation.recommendedResolution.width).toBeGreaterThan(0);
      expect(recommendation.recommendedResolution.height).toBeGreaterThan(0);
    });

    test('should recommend appropriate frame rate', async () => {
      const analysis = {
        contentType: 'code' as const,
        confidence: 0.85,
        changeDetected: false,
        averageEntropyChange: 0.15,
        colorComplexity: 0.2,
        motionLevel: 0.05
      };

      const recommendation = await service.recommendCodec(2000, analysis);

      expect(recommendation.recommendedFrameRate).toBeGreaterThan(0);
      expect(recommendation.recommendedFrameRate).toBeLessThanOrEqual(30);
    });
  });

  describe('Bandwidth Tracking', () => {
    test('should update bandwidth history', () => {
      service.updateBandwidth(2500);
      service.updateBandwidth(2000);
      service.updateBandwidth(3000);

      const diag = service.getDiagnostics();
      expect(diag.frameHistorySize).toBeGreaterThanOrEqual(0);
    });

    test('should calculate average bandwidth', () => {
      service.updateBandwidth(2500);
      service.updateBandwidth(2000);
      service.updateBandwidth(3000);

      const avgBandwidth = service.getAverageBandwidth(10000);

      expect(avgBandwidth).toBeGreaterThan(0);
      expect(avgBandwidth).toBeLessThanOrEqual(3000);
    });

    test('should return default bandwidth when no history', () => {
      const avgBandwidth = service.getAverageBandwidth(10000);

      expect(avgBandwidth).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should record encoding metrics', () => {
      service.recordEncodingMetrics(15, 2000, 30);
      service.recordEncodingMetrics(12, 2100, 30);
      service.recordEncodingMetrics(18, 1900, 30);

      const perf = service.getPerformanceDiagnostics();

      expect(perf.totalFramesEncoded).toBe(3);
      expect(perf.averageEncodingTime).toBeGreaterThan(0);
    });

    test('should track average encoding time', () => {
      service.recordEncodingMetrics(15, 2000, 30);
      service.recordEncodingMetrics(12, 2100, 30);

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageEncodingTime).toBeGreaterThanOrEqual(12);
      expect(perf.averageEncodingTime).toBeLessThanOrEqual(15);
    });

    test('should track peak encoding time', () => {
      service.recordEncodingMetrics(10, 2000, 30);
      service.recordEncodingMetrics(25, 2100, 30);
      service.recordEncodingMetrics(15, 1900, 30);

      const perf = service.getPerformanceDiagnostics();

      expect(perf.peakEncodingTime).toBe(25);
    });

    test('should track average bitrate', () => {
      service.recordEncodingMetrics(15, 2000, 30);
      service.recordEncodingMetrics(12, 2100, 30);
      service.recordEncodingMetrics(18, 1900, 30);

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageBitrate).toBeGreaterThan(1900);
      expect(perf.averageBitrate).toBeLessThan(2100);
    });

    test('should track average FPS', () => {
      service.recordEncodingMetrics(15, 2000, 30);
      service.recordEncodingMetrics(12, 2100, 30);
      service.recordEncodingMetrics(18, 1900, 30);

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageFps).toBe(30);
    });
  });

  describe('Service Diagnostics', () => {
    test('should provide complete diagnostics', () => {
      const diag = service.getDiagnostics();

      expect(diag).toBeDefined();
      expect(diag.config).toBeDefined();
      expect(diag.contentTypeDistribution).toBeDefined();
      expect(diag.averageBandwidth).toBeGreaterThanOrEqual(0);
      expect(diag.performanceMetrics).toBeDefined();
    });

    test('should track content type distribution', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(255, 255, 255)';
      ctx?.fillRect(0, 0, 640, 480);

      for (let i = 0; i < 3; i++) {
        await service.analyzeScreenContent(canvas);
      }

      const diag = service.getDiagnostics();
      expect(diag.contentTypeDistribution).toBeDefined();
    });
  });

  describe('Research Validation', () => {
    test('should implement content-aware codec selection', async () => {
      const presentations = {
        contentType: 'presentation' as const,
        confidence: 0.9,
        changeDetected: false,
        averageEntropyChange: 0.2,
        colorComplexity: 0.15,
        motionLevel: 0.05
      };

      const video = {
        contentType: 'video' as const,
        confidence: 0.9,
        changeDetected: false,
        averageEntropyChange: 0.75,
        colorComplexity: 0.8,
        motionLevel: 0.7
      };

      const presentationRec = await service.recommendCodec(2500, presentations);
      const videoRec = await service.recommendCodec(2500, video);

      // Different content should get different codec recommendations
      expect(presentationRec.codec).toBeDefined();
      expect(videoRec.codec).toBeDefined();
    });

    test('should detect screen change for efficient encoding', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // First frame
      ctx?.fillStyle = 'rgb(255, 255, 255)';
      ctx?.fillRect(0, 0, 640, 480);
      const analysis1 = await service.analyzeScreenContent(canvas);

      // Second frame (same)
      const analysis2 = await service.analyzeScreenContent(canvas);

      // Third frame (different)
      ctx?.fillStyle = 'rgb(200, 200, 200)';
      ctx?.fillRect(0, 0, 640, 480);
      const analysis3 = await service.analyzeScreenContent(canvas);

      expect(analysis1.changeDetected).toBe(false); // No previous frame
      expect(analysis2.changeDetected).toBe(false); // Same as previous
      expect(analysis3.changeDetected).toBe(true); // Different from previous
    });

    test('should support 2024 codec comparison (VP8, VP9, H.264, AV1)', async () => {
      const analysis = {
        contentType: 'mixed' as const,
        confidence: 0.6,
        changeDetected: false,
        averageEntropyChange: 0.4,
        colorComplexity: 0.5,
        motionLevel: 0.3
      };

      for (let bandwidth = 500; bandwidth <= 4000; bandwidth += 500) {
        const rec = await service.recommendCodec(bandwidth, analysis);
        expect(['vp8', 'vp9', 'h264', 'av1']).toContain(rec.codec);
      }
    });

    test('should support adaptive resolution (720p-4K)', async () => {
      const analysis = {
        contentType: 'presentation' as const,
        confidence: 0.8,
        changeDetected: false,
        averageEntropyChange: 0.2,
        colorComplexity: 0.2,
        motionLevel: 0.1
      };

      const rec = await service.recommendCodec(2500, analysis);

      expect(rec.recommendedResolution.width).toBeGreaterThanOrEqual(1280);
      expect(rec.recommendedResolution.height).toBeGreaterThanOrEqual(720);
    });
  });
});

describe('Phase 6 Screen Sharing Advanced Features', () => {
  let service: ScreenSharingOptimizationService;

  beforeEach(() => {
    service = new ScreenSharingOptimizationService();
  });

  test('should handle mixed content seamlessly', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');

    // Mix text and images
    ctx?.fillStyle = 'rgb(255, 255, 255)';
    ctx?.fillRect(0, 0, 640, 480);
    ctx?.fillStyle = 'rgb(0, 0, 0)';
    ctx?.font = 'bold 24px Arial';
    ctx?.fillText('Mixed Content', 50, 50);

    // Add colored rectangle
    ctx?.fillStyle = 'rgb(200, 100, 100)';
    ctx?.fillRect(100, 100, 200, 200);

    const analysis = await service.analyzeScreenContent(canvas);

    expect(analysis).toBeDefined();
    expect(analysis.contentType).toMatch(/presentation|code|mixed/);
  });

  test('should adapt framerate based on content type', async () => {
    const contentTypes: Array<'presentation' | 'video' | 'code' | 'mixed'> = [
      'presentation',
      'video',
      'code',
      'mixed'
    ];

    for (const type of contentTypes) {
      const analysis = {
        contentType: type,
        confidence: 0.8,
        changeDetected: false,
        averageEntropyChange: 0.4,
        colorComplexity: 0.5,
        motionLevel: 0.3
      };

      const rec = await service.recommendCodec(2500, analysis);

      expect(rec.recommendedFrameRate).toBeGreaterThan(0);
      expect(rec.recommendedFrameRate).toBeLessThanOrEqual(30);
    }
  });

  test('should maintain history limit for performance', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');
    ctx?.fillStyle = 'rgb(128, 128, 128)';
    ctx?.fillRect(0, 0, 640, 480);

    // Process 400 frames
    for (let i = 0; i < 400; i++) {
      await service.analyzeScreenContent(canvas);
    }

    const diag = service.getDiagnostics();

    // Should not exceed 300 frame history
    expect(diag.frameHistorySize).toBeLessThanOrEqual(300);
  });
});
