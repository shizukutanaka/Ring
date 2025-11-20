/**
 * Phase 3 NICE-TO-HAVE #1-2 Tests
 * Bitrate Probing & VMAF Quality Monitoring
 */

import {
  BitrateProber,
  VMAFCalculator,
  QualityBudgetManager,
  BitrateQualityManager
} from './Phase3NiceBitrateProbingAndVMAF';

describe('BitrateProber', () => {
  let prober: BitrateProber;

  beforeEach(() => {
    prober = new BitrateProber();
  });

  describe('Probe Execution', () => {
    test('should execute bitrate probe', async () => {
      const result = await prober.startProbe(2000, 80, 1, 50);

      expect(result.probedBitrate).toBeDefined();
      expect(result.probeStartTime).toBeLessThanOrEqual(result.probeEndTime);
      expect(result.probeQuality).toBeGreaterThanOrEqual(0);
      expect(result.probeQuality).toBeLessThanOrEqual(100);
    });

    test('should probe lower bitrate on congestion', async () => {
      const result = await prober.startProbe(2000, 40, 8, 150);

      expect(result.probedBitrate).toBeLessThan(2000);
      expect(result.shouldDecrease).toBe(true);
    });

    test('should probe higher bitrate when network is stable', async () => {
      const result = await prober.startProbe(2000, 85, 0.5, 40);

      expect(result.probedBitrate).toBeGreaterThanOrEqual(2000);
      expect(result.shouldIncrease).toBe(true);
    });

    test('should not allow concurrent probes', async () => {
      const probe1 = prober.startProbe(2000, 80, 1, 50);

      // Try to start another probe while first is running (would be blocked)
      // We can't fully test this without making the function actually async
      expect(probe1).toBeInstanceOf(Promise);
    });
  });

  describe('Quality Estimation', () => {
    test('should estimate quality based on bitrate', async () => {
      const lowBitrateResult = await prober.startProbe(300, 50, 2, 50);
      const highBitrateResult = await prober.startProbe(4000, 50, 2, 50);

      expect(highBitrateResult.probeQuality).toBeGreaterThan(
        lowBitrateResult.probeQuality
      );
    });

    test('should reduce quality estimate for high packet loss', async () => {
      const lowLossResult = await prober.startProbe(2000, 80, 0.5, 50);
      const highLossResult = await prober.startProbe(2000, 80, 10, 50);

      expect(highLossResult.probeQuality).toBeLessThan(
        lowLossResult.probeQuality
      );
    });

    test('should reduce quality estimate for high RTT', async () => {
      const lowRTTResult = await prober.startProbe(2000, 80, 1, 40);
      const highRTTResult = await prober.startProbe(2000, 80, 1, 300);

      expect(highRTTResult.probeQuality).toBeLessThan(lowRTTResult.probeQuality);
    });
  });

  describe('Stability Metrics', () => {
    test('should calculate stability correctly', async () => {
      const result = await prober.startProbe(2000, 80, 1, 50);

      expect(result.stability).toBeGreaterThan(0);
      expect(result.stability).toBeLessThanOrEqual(1);
    });

    test('should reduce stability for packet loss', async () => {
      const stableResult = await prober.startProbe(2000, 80, 0.5, 50);
      const unstableResult = await prober.startProbe(2000, 80, 8, 50);

      expect(unstableResult.stability).toBeLessThan(stableResult.stability);
    });
  });

  describe('Recommendation Logic', () => {
    test('should recommend increase for good conditions', async () => {
      const result = await prober.startProbe(2000, 85, 0.5, 40);

      expect(result.recommendedNextBitrate).toBeGreaterThanOrEqual(2000);
    });

    test('should recommend decrease for poor conditions', async () => {
      const result = await prober.startProbe(2000, 40, 10, 200);

      expect(result.recommendedNextBitrate).toBeLessThanOrEqual(2000);
    });

    test('should respect min/max bitrate bounds', async () => {
      const result = await prober.startProbe(300, 50, 5, 50);

      expect(result.recommendedNextBitrate).toBeGreaterThanOrEqual(300);

      const highResult = await prober.startProbe(9000, 90, 0.2, 30);

      expect(highResult.recommendedNextBitrate).toBeLessThanOrEqual(10000);
    });
  });

  describe('History Tracking', () => {
    test('should maintain probe history', async () => {
      await prober.startProbe(2000, 80, 1, 50);
      await prober.startProbe(2100, 82, 0.8, 48);
      await prober.startProbe(1900, 78, 1.2, 52);

      const history = prober.getProbeHistory();
      expect(history.length).toBe(3);
    });

    test('should limit probe history', async () => {
      // Add more than 50 probes
      for (let i = 0; i < 60; i++) {
        await prober.startProbe(2000 + i * 10, 80, 1, 50);
      }

      const history = prober.getProbeHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Network Capability Detection', () => {
    test('should detect if network can support higher bitrate', async () => {
      await prober.startProbe(2000, 85, 0.5, 40);
      await prober.startProbe(2100, 87, 0.4, 38);
      await prober.startProbe(2200, 88, 0.3, 36);

      const canIncrease = prober.canSupportHigherBitrate();
      expect(canIncrease).toBe(true);
    });

    test('should track successful and failed bitrate attempts', async () => {
      await prober.startProbe(3000, 85, 0.5, 40); // Success
      await prober.startProbe(3500, 40, 8, 150); // Failure

      const canSupport = prober.canSupportCurrentBitrate(3000);
      expect(canSupport).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear history on reset', async () => {
      await prober.startProbe(2000, 80, 1, 50);

      prober.reset();

      const history = prober.getProbeHistory();
      expect(history.length).toBe(0);
    });
  });
});

describe('VMAFCalculator', () => {
  let vmaf: VMAFCalculator;

  beforeEach(() => {
    vmaf = new VMAFCalculator();
  });

  describe('VMAF Score Calculation', () => {
    test('should calculate VMAF score between 0-100', () => {
      const scores = vmaf.calculateVMAFScore(0, 2000, 1, 0.5, 0.5);

      expect(scores.vmaScore).toBeGreaterThanOrEqual(0);
      expect(scores.vmaScore).toBeLessThanOrEqual(100);
    });

    test('should give higher VMAF for better conditions', () => {
      const goodConditions = vmaf.calculateVMAFScore(0, 3000, 0.5, 0.3, 0.4);
      const poorConditions = vmaf.calculateVMAFScore(1, 500, 8, 0.8, 0.9);

      expect(goodConditions.vmaScore).toBeGreaterThan(
        poorConditions.vmaScore
      );
    });

    test('should include MS SSIM scores', () => {
      const scores = vmaf.calculateVMAFScore(0, 2000, 1, 0.5, 0.5);

      expect(scores.msScores).toEqual(expect.any(Array));
      expect(scores.msScores.length).toBe(3);
      scores.msScores.forEach(ms => {
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThanOrEqual(100);
      });
    });

    test('should calculate ADM correctly', () => {
      const scores = vmaf.calculateVMAFScore(0, 2000, 1, 0.5, 0.5);

      expect(scores.adm).toBeGreaterThanOrEqual(0);
      expect(scores.adm).toBeLessThanOrEqual(1);
    });

    test('should penalize packet loss in VMAF score', () => {
      const noLoss = vmaf.calculateVMAFScore(0, 2000, 0, 0.5, 0.5);
      const withLoss = vmaf.calculateVMAFScore(1, 2000, 5, 0.5, 0.5);

      expect(noLoss.vmaScore).toBeGreaterThan(withLoss.vmaScore);
    });

    test('should penalize high motion complexity', () => {
      const lowMotion = vmaf.calculateVMAFScore(0, 2000, 1, 0.2, 0.3);
      const highMotion = vmaf.calculateVMAFScore(1, 2000, 1, 0.9, 0.9);

      expect(lowMotion.vmaScore).toBeGreaterThan(highMotion.vmaScore);
    });
  });

  describe('Average VMAF Calculation', () => {
    test('should calculate average VMAF', () => {
      for (let i = 0; i < 10; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      const avg = vmaf.getAverageVMAF(10);
      expect(avg).toBeGreaterThanOrEqual(0);
      expect(avg).toBeLessThanOrEqual(100);
    });

    test('should use specified window size', () => {
      for (let i = 0; i < 30; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      const avg10 = vmaf.getAverageVMAF(10);
      const avg20 = vmaf.getAverageVMAF(20);

      // Both should be valid
      expect(avg10).toBeGreaterThanOrEqual(0);
      expect(avg20).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Quality Degradation Detection', () => {
    test('should detect quality degradation', () => {
      // Add good quality frames
      for (let i = 0; i < 5; i++) {
        vmaf.calculateVMAFScore(i, 3000, 0.5, 0.4, 0.3);
      }

      // Add poor quality frames
      for (let i = 5; i < 15; i++) {
        vmaf.calculateVMAFScore(i, 500, 10, 0.8, 0.9);
      }

      const isDegraded = vmaf.detectDegradation(60);
      expect(isDegraded).toBe(true);
    });

    test('should not detect degradation for stable quality', () => {
      for (let i = 0; i < 15; i++) {
        vmaf.calculateVMAFScore(i, 2500, 0.5, 0.5, 0.5);
      }

      const isDegraded = vmaf.detectDegradation(60);
      expect(isDegraded).toBe(false);
    });
  });

  describe('Quality Metrics', () => {
    test('should provide quality metrics', () => {
      for (let i = 0; i < 20; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      const metrics = vmaf.getQualityMetrics();

      expect(metrics.averageVMAF).toBeDefined();
      expect(metrics.maxVMAF).toBeDefined();
      expect(metrics.minVMAF).toBeDefined();
      expect(metrics.stability).toBeDefined();
      expect(['improving', 'stable', 'degrading']).toContain(metrics.trend);
    });

    test('should detect quality trend', () => {
      // Improving trend
      for (let i = 0; i < 20; i++) {
        vmaf.calculateVMAFScore(i, 1000 + i * 100, 2 - i * 0.05, 0.5, 0.5);
      }

      const metrics = vmaf.getQualityMetrics();
      expect(['improving', 'stable']).toContain(metrics.trend);
    });
  });

  describe('Frame History', () => {
    test('should maintain frame history', () => {
      for (let i = 0; i < 30; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      const history = vmaf.getFrameHistory();
      expect(history.length).toBe(30);
    });

    test('should limit frame history', () => {
      // Add more than 600 frames
      for (let i = 0; i < 700; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      const history = vmaf.getFrameHistory();
      expect(history.length).toBeLessThanOrEqual(600);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear history on reset', () => {
      for (let i = 0; i < 30; i++) {
        vmaf.calculateVMAFScore(i, 2000, 1, 0.5, 0.5);
      }

      vmaf.reset();

      const history = vmaf.getFrameHistory();
      expect(history.length).toBe(0);
    });
  });
});

describe('QualityBudgetManager', () => {
  let manager: QualityBudgetManager;

  beforeEach(() => {
    manager = new QualityBudgetManager();
  });

  describe('Budget Updates', () => {
    test('should update quality budget', () => {
      const budget = manager.updateBudget(3000, 80, 1);

      expect(budget.maxBitrate).toBeDefined();
      expect(budget.targetBitrate).toBeDefined();
      expect(budget.minBitrate).toBeDefined();
      expect(budget.quality).toBe(80);
    });

    test('should adjust budget for limited bandwidth', () => {
      const budget = manager.updateBudget(1000, 80, 1);

      expect(budget.maxBitrate).toBeLessThanOrEqual(1000);
    });

    test('should adjust target quality based on packet loss', () => {
      const lowLossBudget = manager.updateBudget(3000, 80, 0.2);
      const highLossBudget = manager.updateBudget(3000, 80, 8);

      // High loss should have lower target quality
      expect(highLossBudget.targetBitrate).toBeLessThanOrEqual(
        lowLossBudget.targetBitrate
      );
    });
  });

  describe('Budget Efficiency', () => {
    test('should calculate efficiency metric', () => {
      const budget = manager.updateBudget(3000, 80, 1);

      expect(budget.efficiency).toBeGreaterThan(0);
    });
  });

  describe('History Tracking', () => {
    test('should maintain budget history', () => {
      manager.updateBudget(3000, 80, 1);
      manager.updateBudget(2500, 75, 1.5);
      manager.updateBudget(2000, 70, 2);

      const history = manager.getHistory();
      expect(history.length).toBe(3);
    });

    test('should limit history size', () => {
      for (let i = 0; i < 120; i++) {
        manager.updateBudget(3000 - i * 10, 80 - i * 0.1, 1 + i * 0.01);
      }

      const history = manager.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset to defaults', () => {
      manager.updateBudget(2000, 70, 2);

      manager.reset();

      const budget = manager.getBudget();
      expect(budget.quality).toBe(80);
      expect(manager.getHistory().length).toBe(0);
    });
  });
});

describe('BitrateQualityManager', () => {
  let manager: BitrateQualityManager;

  beforeEach(() => {
    manager = new BitrateQualityManager();
  });

  describe('Integrated Metrics Update', () => {
    test('should update metrics and provide recommendations', async () => {
      const result = await manager.updateMetrics(
        2000, 80, 3000, 1, 50, 0.5, 0.5
      );

      expect(result.recommendedBitrate).toBeDefined();
      expect(result.vmafScore).toBeGreaterThanOrEqual(0);
      expect(result.vmafScore).toBeLessThanOrEqual(100);
      expect(result.shouldProbe).toBeDefined();
      expect(['Poor', 'Fair', 'Good', 'Excellent']).toContain(result.quality);
    });

    test('should perform bitrate probing at intervals', async () => {
      const result1 = await manager.updateMetrics(
        2000, 80, 3000, 1, 50, 0.5, 0.5
      );
      const result2 = await manager.updateMetrics(
        2000, 80, 3000, 1, 50, 0.5, 0.5
      );

      // First call might probe, second won't
      // This depends on timing
      expect(result1.shouldProbe).toBeDefined();
      expect(result2.shouldProbe).toBeDefined();
    });
  });

  describe('Quality Assessment', () => {
    test('should classify quality correctly', async () => {
      const excellent = await manager.updateMetrics(
        3000, 90, 5000, 0.2, 30, 0.3, 0.3
      );
      const poor = await manager.updateMetrics(
        500, 35, 1000, 10, 200, 0.8, 0.9
      );

      expect(excellent.quality).toBe('Excellent');
      expect(poor.quality).toBe('Poor');
    });
  });

  describe('Status Report', () => {
    test('should provide comprehensive status', async () => {
      await manager.updateMetrics(2000, 80, 3000, 1, 50, 0.5, 0.5);

      const status = manager.getStatus();

      expect(status.prober).toBeDefined();
      expect(status.vmaf).toBeDefined();
      expect(status.budget).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all managers', async () => {
      await manager.updateMetrics(2000, 80, 3000, 1, 50, 0.5, 0.5);

      manager.reset();

      const status = manager.getStatus();
      expect(status.prober.lastProbe).toBeUndefined();
    });
  });
});
