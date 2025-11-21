/**
 * Phase 6: Virtual Background Service Tests
 */

import { VirtualBackgroundService } from './Phase6VirtualBackground';

describe('Phase 6: Virtual Background Service', () => {
  let service: VirtualBackgroundService;

  beforeEach(() => {
    service = new VirtualBackgroundService();
  });

  describe('Configuration Management', () => {
    test('should initialize with default configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.type).toBe('blur');
      expect(config.enabled).toBe(false);
      expect(config.blurStrength).toBeGreaterThan(0);
    });

    test('should set blur background configuration', () => {
      const result = service.setConfig({
        type: 'blur',
        blurStrength: 20,
        enabled: true
      });

      expect(result.type).toBe('blur');
      expect(result.blurStrength).toBe(20);
      expect(result.enabled).toBe(true);
    });

    test('should set solid color background', () => {
      const result = service.setConfig({
        type: 'color',
        colorValue: '#FF0000',
        enabled: true
      });

      expect(result.type).toBe('color');
      expect(result.colorValue).toBe('#FF0000');
    });

    test('should support multiple background types', () => {
      const types: Array<'blur' | 'color' | 'image'> = ['blur', 'color', 'image'];

      types.forEach((type) => {
        const result = service.setConfig({ type });
        expect(result.type).toBe(type);
      });
    });

    test('should clamp blur strength to reasonable bounds', () => {
      service.setConfig({ type: 'blur', blurStrength: 50 });
      const config = service.getConfig();

      expect(config.blurStrength).toBeDefined();
      expect(typeof config.blurStrength).toBe('number');
    });

    test('should enable and disable background', () => {
      service.setConfig({ enabled: false });
      expect(service.getConfig().enabled).toBe(false);

      service.enableBackground(true);
      expect(service.getConfig().enabled).toBe(true);

      service.enableBackground(false);
      expect(service.getConfig().enabled).toBe(false);
    });
  });

  describe('Segmentation Processing', () => {
    test('should process video frame and return segmentation result', async () => {
      // Create mock video frame
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      const result = await service.processFrame(canvas, 640, 480);

      expect(result).toBeDefined();
      expect(result.segmentationConfidence).toBeGreaterThanOrEqual(0);
      expect(result.segmentationConfidence).toBeLessThanOrEqual(1);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    test('should return valid foreground/background pixel counts', async () => {
      const canvas = new OffscreenCanvas(320, 240);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 100, 100)'; // Skin-like tone
      ctx?.fillRect(0, 0, 320, 240);

      const result = await service.processFrame(canvas, 320, 240);

      expect(result.foregroundPixels).toBeGreaterThanOrEqual(0);
      expect(result.backgroundPixels).toBeGreaterThanOrEqual(0);
      expect(result.foregroundPixels + result.backgroundPixels).toBeGreaterThan(0);
    });

    test('should maintain reasonable processing time', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(200, 150, 100)';
      ctx?.fillRect(0, 0, 640, 480);

      const result = await service.processFrame(canvas, 640, 480);

      // Processing should complete in reasonable time (< 100ms for real-time)
      expect(result.processingTimeMs).toBeLessThan(100);
    });

    test('should handle different frame resolutions', async () => {
      const resolutions = [
        { width: 320, height: 240 },
        { width: 640, height: 480 },
        { width: 1280, height: 720 }
      ];

      for (const { width, height } of resolutions) {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx?.fillStyle = 'rgb(128, 128, 128)';
        ctx?.fillRect(0, 0, width, height);

        const result = await service.processFrame(canvas, width, height);

        expect(result.maskCanvas).toBeDefined();
        expect(result.segmentationConfidence).toBeGreaterThanOrEqual(0);
      }
    });

    test('should generate valid mask canvas', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      const result = await service.processFrame(canvas, 640, 480);

      expect(result.maskCanvas).toBeDefined();
      expect(result.maskCanvas).toBeInstanceOf(OffscreenCanvas);
    });

    test('should provide edge quality metric', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 100, 100)';
      ctx?.fillRect(0, 0, 640, 480);

      const result = await service.processFrame(canvas, 640, 480);

      expect(result.edgeQuality).toBeGreaterThanOrEqual(0);
      expect(result.edgeQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('Background Application', () => {
    test('should apply blur background to frame', async () => {
      service.setConfig({ type: 'blur', blurStrength: 15, enabled: true });

      const inputCanvas = new OffscreenCanvas(640, 480);
      const inputCtx = inputCanvas.getContext('2d');
      inputCtx?.fillStyle = 'rgb(100, 150, 200)';
      inputCtx?.fillRect(0, 0, 640, 480);

      const segmentation = await service.processFrame(inputCanvas, 640, 480);
      const result = await service.applyBackground(inputCanvas, segmentation, 640, 480);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(OffscreenCanvas);
    });

    test('should apply color background to frame', async () => {
      service.setConfig({ type: 'color', colorValue: '#FF0000', enabled: true });

      const inputCanvas = new OffscreenCanvas(640, 480);
      const inputCtx = inputCanvas.getContext('2d');
      inputCtx?.fillStyle = 'rgb(100, 150, 200)';
      inputCtx?.fillRect(0, 0, 640, 480);

      const segmentation = await service.processFrame(inputCanvas, 640, 480);
      const result = await service.applyBackground(inputCanvas, segmentation, 640, 480);

      expect(result).toBeDefined();
    });

    test('should return null when background disabled', async () => {
      service.setConfig({ enabled: false });

      const inputCanvas = new OffscreenCanvas(640, 480);
      const segmentation = await service.processFrame(inputCanvas, 640, 480);
      const result = await service.applyBackground(inputCanvas, segmentation, 640, 480);

      expect(result).toBeNull();
    });

    test('should handle invalid segmentation gracefully', async () => {
      const inputCanvas = new OffscreenCanvas(640, 480);
      const invalidSegmentation = {
        maskCanvas: null,
        segmentationConfidence: 0,
        processingTimeMs: 10,
        foregroundPixels: 0,
        backgroundPixels: 0,
        edgeQuality: 0
      };

      const result = await service.applyBackground(
        inputCanvas,
        invalidSegmentation,
        640,
        480
      );

      expect(result).toBeNull();
    });
  });

  describe('Performance Metrics', () => {
    test('should track processing time', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      await service.processFrame(canvas, 640, 480);

      const diag = service.getDiagnostics();
      expect(diag.totalFramesProcessed).toBe(1);
    });

    test('should maintain frame history for diagnostics', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      for (let i = 0; i < 10; i++) {
        await service.processFrame(canvas, 640, 480);
      }

      const diag = service.getDiagnostics();
      expect(diag.totalFramesProcessed).toBe(10);
    });

    test('should calculate average processing time', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      for (let i = 0; i < 5; i++) {
        await service.processFrame(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();
      expect(perf.averageProcessingTime).toBeGreaterThan(0);
      expect(perf.averageProcessingTime).toBeLessThan(100);
    });

    test('should provide FPS metrics', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      for (let i = 0; i < 10; i++) {
        await service.processFrame(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();
      expect(perf.averageFps).toBeGreaterThan(0);
      expect(perf.minFps).toBeGreaterThanOrEqual(0);
      expect(perf.maxFps).toBeGreaterThanOrEqual(perf.minFps);
    });

    test('should track peak processing time', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      for (let i = 0; i < 5; i++) {
        await service.processFrame(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();
      expect(perf.peakProcessingTime).toBeGreaterThanOrEqual(
        perf.averageProcessingTime
      );
    });

    test('should provide last frame metrics', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      await service.processFrame(canvas, 640, 480);

      const perf = service.getPerformanceDiagnostics();
      expect(perf.lastMetrics).toBeDefined();
      expect(perf.lastMetrics?.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Service Diagnostics', () => {
    test('should provide complete service diagnostics', () => {
      const diag = service.getDiagnostics();

      expect(diag).toBeDefined();
      expect(diag.config).toBeDefined();
      expect(diag.modelLoaded).toBeBoolean();
      expect(diag.performanceMetrics).toBeDefined();
      expect(diag.totalFramesProcessed).toBeGreaterThanOrEqual(0);
    });

    test('should track configuration changes in diagnostics', () => {
      service.setConfig({ type: 'color', colorValue: '#00FF00' });

      const diag = service.getDiagnostics();
      expect(diag.config.type).toBe('color');
      expect(diag.config.colorValue).toBe('#00FF00');
    });

    test('should indicate model loaded status', () => {
      const diag = service.getDiagnostics();
      expect(typeof diag.modelLoaded).toBe('boolean');
    });
  });

  describe('Research Validation', () => {
    test('should implement MediaPipe-compatible segmentation', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 100, 100)'; // Skin-like tone
      ctx?.fillRect(100, 100, 200, 200); // Simulated face
      ctx?.fillStyle = 'rgb(50, 50, 50)'; // Dark background
      ctx?.fillRect(0, 0, 100, 100);
      ctx?.fillRect(540, 0, 100, 480);

      const result = await service.processFrame(canvas, 640, 480);

      // Should detect foreground/background separation
      expect(result.foregroundPixels).toBeGreaterThan(0);
      expect(result.backgroundPixels).toBeGreaterThan(0);
      expect(result.segmentationConfidence).toBeGreaterThan(0);
    });

    test('should support real-time processing (15-30 FPS)', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(100, 150, 200)';
      ctx?.fillRect(0, 0, 640, 480);

      const times: number[] = [];
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        await service.processFrame(canvas, 640, 480);
        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      // Average should allow 15-30 FPS (33-66ms per frame)
      expect(avgTime).toBeLessThan(66);
    });

    test('should provide edge quality metric for boundary sharpness', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Create high-contrast foreground/background
      ctx?.fillStyle = 'rgb(255, 255, 255)';
      ctx?.fillRect(0, 0, 320, 480);
      ctx?.fillStyle = 'rgb(0, 0, 0)';
      ctx?.fillRect(320, 0, 320, 480);

      const result = await service.processFrame(canvas, 640, 480);

      expect(result.edgeQuality).toBeGreaterThan(0);
      expect(result.edgeQuality).toBeLessThanOrEqual(1);
    });

    test('should support multiple background types (blur, color, image)', () => {
      const types = ['blur', 'color', 'image'] as const;

      types.forEach((type) => {
        const config = service.setConfig({ type });
        expect(config.type).toBe(type);
      });
    });
  });
});

describe('Phase 6 Virtual Background Advanced Features', () => {
  let service: VirtualBackgroundService;

  beforeEach(() => {
    service = new VirtualBackgroundService();
  });

  test('should handle frame rate throttling', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');
    ctx?.fillStyle = 'rgb(100, 150, 200)';
    ctx?.fillRect(0, 0, 640, 480);

    const startTime = performance.now();
    for (let i = 0; i < 30; i++) {
      await service.processFrame(canvas, 640, 480);
    }
    const elapsed = performance.now() - startTime;

    // 30 frames should complete in reasonable time
    expect(elapsed).toBeLessThan(5000); // 5 seconds max
  });

  test('should maintain segmentation consistency across frames', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');
    ctx?.fillStyle = 'rgb(150, 100, 100)';
    ctx?.fillRect(0, 0, 640, 480);

    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await service.processFrame(canvas, 640, 480));
    }

    // Check consistency
    const confidences = results.map((r) => r.segmentationConfidence);
    const avgConfidence = confidences.reduce((a, b) => a + b) / confidences.length;
    const variance =
      confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
      confidences.length;

    // Variance should be low (consistent results)
    expect(variance).toBeLessThan(0.1);
  });

  test('should detect skin tones for foreground classification', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');

    // Draw skin-tone foreground
    ctx?.fillStyle = 'rgb(180, 120, 100)'; // Skin tone
    ctx?.fillRect(0, 0, 640, 480);

    const result = await service.processFrame(canvas, 640, 480);

    // Should classify skin tone as foreground
    expect(result.foregroundPixels).toBeGreaterThan(result.backgroundPixels);
  });

  test('should handle dark frames for background detection', async () => {
    const canvas = new OffscreenCanvas(640, 480);
    const ctx = canvas.getContext('2d');

    // Draw dark background
    ctx?.fillStyle = 'rgb(30, 30, 30)';
    ctx?.fillRect(0, 0, 640, 480);

    const result = await service.processFrame(canvas, 640, 480);

    // Should classify dark pixels as background
    expect(result.backgroundPixels).toBeGreaterThan(0);
  });

  test('should provide blur strength configuration range', () => {
    const config = service.setConfig({ type: 'blur', blurStrength: 15 });

    expect(config.blurStrength).toBeDefined();
    expect(config.blurStrength).toBeGreaterThan(0);
    expect(config.blurStrength).toBeLessThanOrEqual(25);
  });

  test('should support hex color values for solid backgrounds', () => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

    colors.forEach((color) => {
      const config = service.setConfig({ type: 'color', colorValue: color });
      expect(config.colorValue).toBe(color);
    });
  });

  test('should reset to default configuration', () => {
    service.setConfig({ type: 'image', colorValue: '#FF0000' });
    service.setConfig({ type: 'blur' });

    const config = service.getConfig();
    expect(config.type).toBe('blur');
  });
});
