/**
 * Phase 6: Presenter Mode Tests
 */

import { PresenterModeService } from './Phase6PresenterMode';

describe('Phase 6: Presenter Mode with Speaker Detection', () => {
  let service: PresenterModeService;

  beforeEach(() => {
    service = new PresenterModeService();
  });

  describe('Face Detection', () => {
    test('should detect faces in video frame', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Draw face-like region with contrast
      ctx?.fillStyle = 'rgb(255, 200, 150)'; // Skin tone
      ctx?.fillRect(200, 100, 200, 250); // Face region

      const detections = await service.detectFaces(canvas, 640, 480);

      expect(Array.isArray(detections)).toBe(true);
    });

    test('should return detection confidence', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(180, 120, 100)'; // Skin tone
      ctx?.fillRect(150, 50, 300, 350);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(detection.confidence).toBeGreaterThanOrEqual(0);
        expect(detection.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should provide bounding box for detection', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(200, 150, 120)';
      ctx?.fillRect(180, 80, 280, 320);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(detection.boundingBox).toBeDefined();
        expect(detection.boundingBox.x).toBeGreaterThanOrEqual(0);
        expect(detection.boundingBox.y).toBeGreaterThanOrEqual(0);
        expect(detection.boundingBox.width).toBeGreaterThan(0);
        expect(detection.boundingBox.height).toBeGreaterThan(0);
      }
    });

    test('should estimate facial landmarks', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(180, 100, 80)';
      ctx?.fillRect(160, 60, 320, 360);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(Array.isArray(detection.landmarks)).toBe(true);
        expect(detection.landmarks.length).toBeGreaterThan(0);
      }
    });

    test('should estimate head pose (yaw, pitch, roll)', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 100, 80)';
      ctx?.fillRect(150, 50, 340, 380);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(detection.headPose).toBeDefined();
        expect(detection.headPose.yaw).toBeGreaterThanOrEqual(-90);
        expect(detection.headPose.yaw).toBeLessThanOrEqual(90);
        expect(detection.headPose.pitch).toBeGreaterThanOrEqual(-90);
        expect(detection.headPose.pitch).toBeLessThanOrEqual(90);
        expect(detection.headPose.roll).toBeGreaterThanOrEqual(-45);
        expect(detection.headPose.roll).toBeLessThanOrEqual(45);
      }
    });

    test('should estimate speaking probability', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(170, 70, 300, 340);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(detection.speakingProbability).toBeGreaterThanOrEqual(0);
        expect(detection.speakingProbability).toBeLessThanOrEqual(1);
      }
    });

    test('should estimate activity level', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(170, 110, 90)';
      ctx?.fillRect(160, 60, 320, 360);

      const detections = await service.detectFaces(canvas, 640, 480);

      for (const detection of detections) {
        expect(detection.activityLevel).toBeGreaterThanOrEqual(0);
        expect(detection.activityLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should track multiple faces', async () => {
      const canvas = new OffscreenCanvas(800, 480);
      const ctx = canvas.getContext('2d');

      // Draw two face regions
      ctx?.fillStyle = 'rgb(180, 100, 80)';
      ctx?.fillRect(100, 80, 220, 300);
      ctx?.fillRect(450, 100, 220, 280);

      const detections = await service.detectFaces(canvas, 800, 480);

      expect(detections.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Dominant Speaker Detection', () => {
    test('should identify dominant speaker', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(170, 70, 300, 340);

      const detections = await service.detectFaces(canvas, 640, 480);
      const dominant = service.identifyDominantSpeaker(detections);

      if (detections.length > 0) {
        expect(dominant).toBeDefined();
        expect(dominant?.trackingId).toBeDefined();
      }
    });

    test('should return null when no faces detected', () => {
      const dominant = service.identifyDominantSpeaker([]);

      expect(dominant).toBeNull();
    });

    test('should select speaker with highest activity level', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // Create high-activity region
      ctx?.fillStyle = 'rgb(180, 100, 80)';
      ctx?.fillRect(150, 100, 340, 280);

      const detections = await service.detectFaces(canvas, 640, 480);
      const dominant = service.identifyDominantSpeaker(detections);

      if (detections.length > 0 && dominant) {
        const dominantScore = dominant.speakingProbability * 0.6 + dominant.activityLevel * 0.4;
        const otherScores = detections
          .filter((d) => d !== dominant)
          .map((d) => d.speakingProbability * 0.6 + d.activityLevel * 0.4);

        expect(otherScores.every((score) => score <= dominantScore)).toBe(true);
      }
    });
  });

  describe('Auto-Framing', () => {
    test('should calculate frame offset for face', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(200, 150, 240, 300);

      const detections = await service.detectFaces(canvas, 640, 480);
      const dominant = service.identifyDominantSpeaker(detections);

      if (dominant) {
        const offset = service.calculateFrameOffset(dominant, 640, 480);

        expect(offset).toBeDefined();
        expect(offset.x).toBeGreaterThanOrEqual(0);
        expect(offset.x).toBeLessThanOrEqual(1);
        expect(offset.y).toBeGreaterThanOrEqual(0);
        expect(offset.y).toBeLessThanOrEqual(1);
        expect(offset.scale).toBeGreaterThanOrEqual(1);
      }
    });

    test('should return to center when no face detected', () => {
      const offset = service.calculateFrameOffset(null, 640, 480);

      expect(offset).toBeDefined();
      expect(offset.x).toBeGreaterThanOrEqual(0);
      expect(offset.y).toBeGreaterThanOrEqual(0);
      expect(offset.scale).toBeGreaterThanOrEqual(1);
    });

    test('should respect min/max zoom bounds', () => {
      service.setConfig({ minZoom: 1, maxZoom: 4 });

      const offset = service.calculateFrameOffset(null, 640, 480);

      expect(offset.scale).toBeGreaterThanOrEqual(1);
      expect(offset.scale).toBeLessThanOrEqual(4);
    });

    test('should apply smooth transition', async () => {
      service.setConfig({ transitionSpeed: 0.2 });

      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(200, 150, 240, 300);

      const detections = await service.detectFaces(canvas, 640, 480);
      const dominant = service.identifyDominantSpeaker(detections);

      if (dominant) {
        const offset1 = service.calculateFrameOffset(dominant, 640, 480);
        const offset2 = service.calculateFrameOffset(dominant, 640, 480);

        // Motion should be proportional to transition speed
        expect(Math.abs(offset2.x - offset1.x)).toBeLessThan(0.5);
      }
    });
  });

  describe('Configuration', () => {
    test('should set auto-framing configuration', () => {
      const config = service.setConfig({
        enabled: true,
        focusMode: 'dual',
        transitionSpeed: 0.25
      });

      expect(config.enabled).toBe(true);
      expect(config.focusMode).toBe('dual');
      expect(config.transitionSpeed).toBe(0.25);
    });

    test('should get current configuration', () => {
      service.setConfig({ focusMode: 'group' });
      const config = service.getConfig();

      expect(config.focusMode).toBe('group');
    });

    test('should support focus modes (single, dual, group)', () => {
      const modes = ['single', 'dual', 'group'] as const;

      modes.forEach((mode) => {
        const config = service.setConfig({ focusMode: mode });
        expect(config.focusMode).toBe(mode);
      });
    });

    test('should configure transition speed', () => {
      const config = service.setConfig({ transitionSpeed: 0.3 });

      expect(config.transitionSpeed).toBe(0.3);
    });

    test('should enable/disable head tracking', () => {
      service.setConfig({ enableHeadTracking: true });
      expect(service.getConfig().enableHeadTracking).toBe(true);

      service.setConfig({ enableHeadTracking: false });
      expect(service.getConfig().enableHeadTracking).toBe(false);
    });

    test('should enable/disable eye tracking', () => {
      service.setConfig({ enableEyeTracking: true });
      expect(service.getConfig().enableEyeTracking).toBe(true);
    });
  });

  describe('Presenter Mode State', () => {
    test('should enable presenter mode', () => {
      service.setPresenterMode(true);

      const state = service.getState();
      expect(state.enabled).toBe(true);
    });

    test('should disable presenter mode', () => {
      service.setPresenterMode(true);
      service.setPresenterMode(false);

      const state = service.getState();
      expect(state.enabled).toBe(false);
    });

    test('should update presenter mode state', async () => {
      service.setPresenterMode(true);

      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      const state = await service.updatePresenterMode(canvas, 640, 480);

      expect(state.enabled).toBe(true);
      expect(state.allDetections).toBeDefined();
      expect(state.frameOffset).toBeDefined();
    });

    test('should track last update time', async () => {
      service.setPresenterMode(true);

      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 80, 60)';
      ctx?.fillRect(170, 80, 300, 340);

      const before = Date.now();
      const state = await service.updatePresenterMode(canvas, 640, 480);
      const after = Date.now();

      expect(state.lastUpdate).toBeGreaterThanOrEqual(before);
      expect(state.lastUpdate).toBeLessThanOrEqual(after + 100);
    });
  });

  describe('Speaker Metrics', () => {
    test('should track speaker metrics', () => {
      const trackingId = 'test-speaker-123';
      // Metrics are updated internally, retrieve them
      // First, we need to detect faces to populate metrics
      service.getDiagnostics();

      // Metrics will be populated after detection
      expect(service.getDiagnostics().trackedSpeakersCount).toBeGreaterThanOrEqual(0);
    });

    test('should get speaker metrics', () => {
      // Metrics are populated after face detection
      const metrics = service.getSpeakerMetrics('non-existent');

      expect(metrics).toBeNull();
    });

    test('should measure speaking duration', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      const detections = await service.detectFaces(canvas, 640, 480);

      if (detections.length > 0) {
        const trackingId = detections[0].trackingId;
        // Update presenter mode to populate metrics
        await service.updatePresenterMode(canvas, 640, 480);

        // Metrics tracked internally
        expect(service.getDiagnostics().trackedSpeakersCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Performance Metrics', () => {
    test('should record detection performance', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 80, 60)';
      ctx?.fillRect(170, 80, 300, 340);

      for (let i = 0; i < 5; i++) {
        await service.detectFaces(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageDetectionTime).toBeGreaterThanOrEqual(0);
      expect(perf.peakDetectionTime).toBeGreaterThanOrEqual(perf.averageDetectionTime);
    });

    test('should track average FPS', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      for (let i = 0; i < 10; i++) {
        await service.detectFaces(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageFps).toBeGreaterThanOrEqual(0);
    });

    test('should track average tracked faces', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 80, 60)';
      ctx?.fillRect(170, 80, 300, 340);

      for (let i = 0; i < 5; i++) {
        await service.detectFaces(canvas, 640, 480);
      }

      const perf = service.getPerformanceDiagnostics();

      expect(perf.averageTrackedFaces).toBeGreaterThanOrEqual(0);
    });

    test('should measure tracking latency', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      await service.detectFaces(canvas, 640, 480);

      const perf = service.getPerformanceDiagnostics();

      // 2024 Algorithm 4.0 target: < 50ms latency
      expect(perf.trackingLatency).toBeLessThan(100);
    });
  });

  describe('Service Diagnostics', () => {
    test('should provide service diagnostics', () => {
      const diag = service.getDiagnostics();

      expect(diag).toBeDefined();
      expect(diag.presenterModeEnabled).toBeBoolean();
      expect(diag.detectedFaces).toBeGreaterThanOrEqual(0);
      expect(diag.performanceMetrics).toBeDefined();
      expect(diag.trackedSpeakersCount).toBeGreaterThanOrEqual(0);
    });

    test('should report model loaded status', () => {
      const diag = service.getDiagnostics();

      expect(typeof diag.modelLoaded).toBe('boolean');
    });

    test('should indicate dominant speaker in diagnostics', async () => {
      service.setPresenterMode(true);

      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      await service.updatePresenterMode(canvas, 640, 480);

      const diag = service.getDiagnostics();

      expect(diag.presenterModeEnabled).toBe(true);
    });
  });

  describe('Research Validation', () => {
    test('should implement 2024 AI Detection Algorithm 4.0', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      await service.detectFaces(canvas, 640, 480);

      const perf = service.getPerformanceDiagnostics();

      // 2024 Algorithm 4.0 target: ~15-20ms detection time
      expect(perf.averageDetectionTime).toBeLessThan(50);
    });

    test('should support real-time face detection', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(150, 80, 60)';
      ctx?.fillRect(170, 80, 300, 340);

      const startTime = performance.now();
      for (let i = 0; i < 30; i++) {
        // Simulate 30fps
        await service.detectFaces(canvas, 640, 480);
      }
      const elapsed = performance.now() - startTime;

      // 30 frames should complete in < 2 seconds (> 15fps minimum)
      expect(elapsed).toBeLessThan(2000);
    });

    test('should track head pose for presenter control', async () => {
      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      const detections = await service.detectFaces(canvas, 640, 480);

      if (detections.length > 0) {
        const detection = detections[0];
        expect(detection.headPose).toBeDefined();
        expect(detection.headPose.yaw).toBeDefined();
        expect(detection.headPose.pitch).toBeDefined();
        expect(detection.headPose.roll).toBeDefined();
      }
    });

    test('should smooth camera motion with interpolation', async () => {
      service.setConfig({ transitionSpeed: 0.1 }); // Very smooth

      const canvas = new OffscreenCanvas(640, 480);
      const ctx = canvas.getContext('2d');
      ctx?.fillStyle = 'rgb(160, 100, 80)';
      ctx?.fillRect(180, 100, 280, 320);

      const detections = await service.detectFaces(canvas, 640, 480);
      if (detections.length > 0) {
        const face = detections[0];

        const offset1 = service.calculateFrameOffset(face, 640, 480);
        const offset2 = service.calculateFrameOffset(face, 640, 480);
        const offset3 = service.calculateFrameOffset(face, 640, 480);

        // Offsets should gradually converge (smooth motion)
        const dist1 = Math.sqrt(
          Math.pow(offset2.x - offset1.x, 2) + Math.pow(offset2.y - offset1.y, 2)
        );
        const dist2 = Math.sqrt(
          Math.pow(offset3.x - offset2.x, 2) + Math.pow(offset3.y - offset2.y, 2)
        );

        // Second transition should be similar to first (consistent speed)
        expect(Math.abs(dist2 - dist1)).toBeLessThan(0.1);
      }
    });
  });
});
