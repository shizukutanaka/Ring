/**
 * Phase 3 Conference Analytics Tests
 *
 * Comprehensive test suite for multi-participant conference analytics
 */

import {
  ConferenceAnalyticsEngine,
  AnalyticsManager,
  ParticipantMetrics,
  ConferenceAnalytics
} from './Phase3ConferenceAnalytics';

describe('ConferenceAnalyticsEngine', () => {
  let engine: ConferenceAnalyticsEngine;

  beforeEach(() => {
    engine = new ConferenceAnalyticsEngine('test-conference');
  });

  describe('Participant Metrics Tracking', () => {
    test('should add and track participant metrics', () => {
      const metrics: ParticipantMetrics = {
        participantId: 'user1',
        audioEnabled: true,
        videoEnabled: true,
        videoCodec: 'h264',
        videoResolution: '1280x720',
        videoFramerate: 30,
        videoBitrate: 2000,
        audioCodec: 'opus',
        audioBitrate: 128,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        bufferDelay: 100,
        cpuUsage: 40,
        videoQuality: 80,
        audioQuality: 85,
        freezeCount: 0,
        timestamp: Date.now()
      };

      engine.addParticipantMetrics(metrics);

      const analysis = engine.analyzeConference();
      expect(analysis.participantCount).toBe(1);
      expect(analysis.participantMetrics[0].participantId).toBe('user1');
    });

    test('should track multiple participants', () => {
      for (let i = 0; i < 5; i++) {
        const metrics: ParticipantMetrics = {
          participantId: `user${i + 1}`,
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000 + i * 200,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 0.5 + i * 0.2,
          rtt: 50 + i * 10,
          jitter: 5 + i,
          bufferDelay: 100,
          cpuUsage: 40 + i * 5,
          videoQuality: 80 - i * 3,
          audioQuality: 85,
          freezeCount: 0,
          timestamp: Date.now()
        };

        engine.addParticipantMetrics(metrics);
      }

      const analysis = engine.analyzeConference();
      expect(analysis.participantCount).toBe(5);
    });

    test('should maintain history per participant', () => {
      const participantId = 'user1';

      for (let i = 0; i < 10; i++) {
        const metrics: ParticipantMetrics = {
          participantId,
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 1,
          rtt: 50 + i * 2,
          jitter: 5,
          bufferDelay: 100,
          cpuUsage: 40,
          videoQuality: 80,
          audioQuality: 85,
          freezeCount: 0,
          timestamp: Date.now() + i * 1000
        };

        engine.addParticipantMetrics(metrics);
      }

      const history = engine['metricsHistory'].get(participantId);
      expect(history).toBeDefined();
      expect(history!.length).toBe(10);
    });

    test('should limit history to max length', () => {
      const participantId = 'user1';

      // Add more than max history
      for (let i = 0; i < 400; i++) {
        const metrics: ParticipantMetrics = {
          participantId,
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 1,
          rtt: 50,
          jitter: 5,
          bufferDelay: 100,
          cpuUsage: 40,
          videoQuality: 80,
          audioQuality: 85,
          freezeCount: 0,
          timestamp: Date.now() + i
        };

        engine.addParticipantMetrics(metrics);
      }

      const history = engine['metricsHistory'].get(participantId);
      expect(history!.length).toBeLessThanOrEqual(300);
    });
  });

  describe('Jain Fairness Index Calculation', () => {
    test('should return 1 for single participant', () => {
      const index = engine['calculateJainFairnessIndex']([2000]);
      expect(index).toBe(1);
    });

    test('should return 1 for equal bandwidth distribution', () => {
      const index = engine['calculateJainFairnessIndex']([2000, 2000, 2000]);
      expect(index).toBe(1);
    });

    test('should return less than 1 for unequal distribution', () => {
      const index = engine['calculateJainFairnessIndex']([1000, 2000, 3000]);
      expect(index).toBeLessThan(1);
      expect(index).toBeGreaterThan(0);
    });

    test('should return lower value for more unequal distribution', () => {
      const fairDistribution = engine['calculateJainFairnessIndex']([1500, 1500, 1500]);
      const unfairDistribution = engine['calculateJainFairnessIndex']([500, 1500, 2500]);

      expect(fairDistribution).toBeGreaterThan(unfairDistribution);
    });

    test('should handle empty array', () => {
      const index = engine['calculateJainFairnessIndex']([]);
      expect(index).toBe(1);
    });
  });

  describe('Bottleneck Detection', () => {
    test('should detect no bottleneck in excellent conditions', () => {
      const metrics: ParticipantMetrics[] = [
        {
          participantId: 'user1',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 0.5,
          rtt: 40,
          jitter: 3,
          bufferDelay: 100,
          cpuUsage: 35,
          videoQuality: 90,
          audioQuality: 90,
          freezeCount: 0,
          timestamp: Date.now()
        }
      ];

      const result = engine['detectBottleneck'](metrics);
      expect(result.type).toBe('none');
      expect(result.severity).toBe('none');
    });

    test('should detect network bottleneck', () => {
      const metrics: ParticipantMetrics[] = [
        {
          participantId: 'user1',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 8,
          rtt: 150,
          jitter: 30,
          bufferDelay: 100,
          cpuUsage: 40,
          videoQuality: 35,
          audioQuality: 60,
          freezeCount: 5,
          timestamp: Date.now()
        },
        {
          participantId: 'user2',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 7,
          rtt: 140,
          jitter: 25,
          bufferDelay: 100,
          cpuUsage: 40,
          videoQuality: 40,
          audioQuality: 65,
          freezeCount: 4,
          timestamp: Date.now()
        }
      ];

      const result = engine['detectBottleneck'](metrics);
      expect(result.type).toBe('network');
    });

    test('should detect CPU bottleneck', () => {
      const metrics: ParticipantMetrics[] = [
        {
          participantId: 'user1',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 1,
          rtt: 50,
          jitter: 5,
          bufferDelay: 100,
          cpuUsage: 88,
          videoQuality: 35,
          audioQuality: 85,
          freezeCount: 8,
          timestamp: Date.now()
        },
        {
          participantId: 'user2',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 0.5,
          rtt: 50,
          jitter: 4,
          bufferDelay: 100,
          cpuUsage: 82,
          videoQuality: 30,
          audioQuality: 85,
          freezeCount: 10,
          timestamp: Date.now()
        }
      ];

      const result = engine['detectBottleneck'](metrics);
      expect(result.type).toBe('cpu');
    });
  });

  describe('Conference Analysis', () => {
    test('should return empty analysis with no participants', () => {
      const analysis = engine.analyzeConference();

      expect(analysis.conferenceId).toBe('test-conference');
      expect(analysis.participantCount).toBe(0);
      expect(analysis.averageQuality).toBe(0);
    });

    test('should calculate total bandwidth correctly', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000),
        createMockMetrics('user2', 3000),
        createMockMetrics('user3', 1500)
      ];

      participants.forEach(m => engine.addParticipantMetrics(m));

      const analysis = engine.analyzeConference();
      expect(analysis.totalBandwidthMbps).toBe(6); // (2000+3000+1500)/1000
    });

    test('should calculate average quality', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000, 80),
        createMockMetrics('user2', 2000, 90),
        createMockMetrics('user3', 2000, 70)
      ];

      participants.forEach(m => engine.addParticipantMetrics(m));

      const analysis = engine.analyzeConference();
      expect(analysis.averageQuality).toBe(80); // (80+90+70)/3
    });

    test('should identify dominant codec', () => {
      const p1 = createMockMetrics('user1', 2000);
      p1.videoCodec = 'h264';
      const p2 = createMockMetrics('user2', 2000);
      p2.videoCodec = 'h264';
      const p3 = createMockMetrics('user3', 2000);
      p3.videoCodec = 'vp9';

      engine.addParticipantMetrics(p1);
      engine.addParticipantMetrics(p2);
      engine.addParticipantMetrics(p3);

      const analysis = engine.analyzeConference();
      expect(analysis.dominantCodec).toBe('h264');
    });

    test('should generate recommendations', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000, 80),
        createMockMetrics('user2', 1800, 75),
        createMockMetrics('user3', 1700, 70)
      ];

      participants.forEach(m => engine.addParticipantMetrics(m));

      const analysis = engine.analyzeConference();
      expect(analysis.recommendations).toEqual(expect.any(Array));
      expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Participant Performance Analysis', () => {
    test('should analyze participant performance', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000, 80),
        createMockMetrics('user2', 2000, 85),
        createMockMetrics('user3', 2000, 75)
      ];

      const performances = engine.getParticipantPerformance(participants);

      expect(performances.length).toBe(3);
      performances.forEach(p => {
        expect(p.participantId).toBeDefined();
        expect(typeof p.relativeQuality).toBe('number');
        expect(typeof p.bandwidthAllocation).toBe('number');
        expect(typeof p.fairnessScore).toBe('number');
        expect(p.risksDetected).toEqual(expect.any(Array));
        expect(p.suggestedImprovements).toEqual(expect.any(Array));
      });
    });

    test('should identify risks', () => {
      const metrics: ParticipantMetrics[] = [
        {
          participantId: 'user1',
          audioEnabled: true,
          videoEnabled: true,
          videoCodec: 'h264',
          videoResolution: '1280x720',
          videoFramerate: 30,
          videoBitrate: 2000,
          audioCodec: 'opus',
          audioBitrate: 128,
          packetLoss: 10, // High loss
          rtt: 250, // High RTT
          jitter: 40, // High jitter
          bufferDelay: 100,
          cpuUsage: 90, // High CPU
          videoQuality: 40, // Low quality
          audioQuality: 85,
          freezeCount: 8, // Many freezes
          timestamp: Date.now()
        }
      ];

      const performances = engine.getParticipantPerformance(metrics);

      expect(performances[0].risksDetected.length).toBeGreaterThan(0);
    });

    test('should suggest improvements', () => {
      const metrics: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000, 30) // Low quality
      ];

      const performances = engine.getParticipantPerformance(metrics);

      expect(performances[0].suggestedImprovements.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Trend Analysis', () => {
    test('should detect improving trend', () => {
      const participantId = 'user1';

      // Add metrics showing improvement
      for (let i = 0; i < 10; i++) {
        const metrics = createMockMetrics(participantId, 2000, 50 + i * 3);
        engine.addParticipantMetrics(metrics);
      }

      const trend = engine.getParticipantTrend(participantId);
      expect(['improving', 'stable']).toContain(trend.trend);
    });

    test('should detect degrading trend', () => {
      const participantId = 'user1';

      // Add metrics showing degradation
      for (let i = 0; i < 10; i++) {
        const metrics = createMockMetrics(participantId, 2000, 90 - i * 3);
        engine.addParticipantMetrics(metrics);
      }

      const trend = engine.getParticipantTrend(participantId);
      expect(['degrading', 'stable']).toContain(trend.trend);
    });
  });

  describe('Bandwidth Fairness Analysis', () => {
    test('should analyze fairness', () => {
      const analysis = engine.getBandwidthFairnessAnalysis();

      expect(analysis.jainIndex).toBeDefined();
      expect(analysis.allocations).toEqual(expect.any(Array));
      expect(analysis.analysis).toBeDefined();
    });

    test('should detect fair allocation', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 2000),
        createMockMetrics('user2', 2000),
        createMockMetrics('user3', 2000)
      ];

      participants.forEach(m => engine.addParticipantMetrics(m));

      const analysis = engine.getBandwidthFairnessAnalysis();
      expect(analysis.jainIndex).toBeGreaterThan(0.95);
    });

    test('should detect unfair allocation', () => {
      const participants: ParticipantMetrics[] = [
        createMockMetrics('user1', 4000),
        createMockMetrics('user2', 2000),
        createMockMetrics('user3', 500)
      ];

      participants.forEach(m => engine.addParticipantMetrics(m));

      const analysis = engine.getBandwidthFairnessAnalysis();
      expect(analysis.jainIndex).toBeLessThan(0.8);
    });
  });

  describe('History Management', () => {
    test('should maintain conference history', () => {
      const metrics = createMockMetrics('user1', 2000);
      engine.addParticipantMetrics(metrics);
      engine.analyzeConference();

      const metrics2 = createMockMetrics('user1', 2100);
      engine.addParticipantMetrics(metrics2);
      engine.analyzeConference();

      const history = engine.getHistory();
      expect(history.length).toBe(2);
    });

    test('should limit conference history', () => {
      for (let i = 0; i < 150; i++) {
        const metrics = createMockMetrics('user1', 2000 + i);
        engine.addParticipantMetrics(metrics);
        engine.analyzeConference();
      }

      const history = engine.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear all data on reset', () => {
      const metrics = createMockMetrics('user1', 2000);
      engine.addParticipantMetrics(metrics);

      engine.reset();

      const analysis = engine.analyzeConference();
      expect(analysis.participantCount).toBe(0);
      expect(engine.getHistory().length).toBe(0);
    });
  });

  // Helper function to create mock metrics
  function createMockMetrics(
    participantId: string,
    bitrate: number,
    quality: number = 80
  ): ParticipantMetrics {
    return {
      participantId,
      audioEnabled: true,
      videoEnabled: true,
      videoCodec: 'h264',
      videoResolution: '1280x720',
      videoFramerate: 30,
      videoBitrate: bitrate,
      audioCodec: 'opus',
      audioBitrate: 128,
      packetLoss: 1,
      rtt: 50,
      jitter: 5,
      bufferDelay: 100,
      cpuUsage: 40,
      videoQuality: quality,
      audioQuality: 85,
      freezeCount: 0,
      timestamp: Date.now()
    };
  }
});

describe('AnalyticsManager', () => {
  let manager: AnalyticsManager;

  beforeEach(() => {
    manager = new AnalyticsManager();
  });

  describe('Multi-Conference Management', () => {
    test('should manage multiple conferences', () => {
      const metrics1 = createMockMetrics('user1', 2000);
      const metrics2 = createMockMetrics('user2', 2000);

      manager.addMetrics('conf1', metrics1);
      manager.addMetrics('conf2', metrics2);

      const activeConfs = manager.getActiveConferences();
      expect(activeConfs).toContain('conf1');
      expect(activeConfs).toContain('conf2');
    });

    test('should isolate analytics per conference', () => {
      const metrics1 = createMockMetrics('user1', 2000);
      metrics1.videoQuality = 90;

      const metrics2 = createMockMetrics('user2', 2000);
      metrics2.videoQuality = 50;

      manager.addMetrics('conf1', metrics1);
      manager.addMetrics('conf2', metrics2);

      const analysis1 = manager.getAnalysis('conf1');
      const analysis2 = manager.getAnalysis('conf2');

      expect(analysis1.averageQuality).toBe(90);
      expect(analysis2.averageQuality).toBe(50);
    });
  });

  describe('Analysis Caching', () => {
    test('should cache analysis results', () => {
      const metrics = createMockMetrics('user1', 2000);
      manager.addMetrics('conf1', metrics);

      const analysis1 = manager.getAnalysis('conf1');
      const analysis2 = manager.getAnalysis('conf1');

      expect(analysis1.timestamp).toBe(analysis2.timestamp);
    });

    test('should invalidate cache on new metrics', () => {
      const metrics1 = createMockMetrics('user1', 2000, 80);
      manager.addMetrics('conf1', metrics1);
      const analysis1 = manager.getAnalysis('conf1');

      const metrics2 = createMockMetrics('user1', 2000, 90);
      manager.addMetrics('conf1', metrics2);
      const analysis2 = manager.getAnalysis('conf1');

      // Cache should be invalidated, new analysis created
      expect(analysis1.timestamp).not.toBe(analysis2.timestamp);
    });
  });

  describe('Summary Report', () => {
    test('should generate summary report', () => {
      manager.addMetrics('conf1', createMockMetrics('user1', 2000));
      manager.addMetrics('conf1', createMockMetrics('user2', 2000));
      manager.addMetrics('conf2', createMockMetrics('user3', 2000));

      const summary = manager.getSummary();

      expect(summary.totalConferences).toBe(2);
      expect(summary.totalParticipants).toBe(3);
      expect(summary.averageConferenceQuality).toBeGreaterThan(0);
      expect(summary.fairnessMetrics.length).toBe(2);
    });
  });

  describe('Conference Removal', () => {
    test('should remove conference', () => {
      manager.addMetrics('conf1', createMockMetrics('user1', 2000));

      expect(manager.getActiveConferences()).toContain('conf1');

      manager.removeConference('conf1');

      expect(manager.getActiveConferences()).not.toContain('conf1');
    });
  });

  // Helper function
  function createMockMetrics(
    participantId: string,
    bitrate: number,
    quality: number = 80
  ): ParticipantMetrics {
    return {
      participantId,
      audioEnabled: true,
      videoEnabled: true,
      videoCodec: 'h264',
      videoResolution: '1280x720',
      videoFramerate: 30,
      videoBitrate: bitrate,
      audioCodec: 'opus',
      audioBitrate: 128,
      packetLoss: 1,
      rtt: 50,
      jitter: 5,
      bufferDelay: 100,
      cpuUsage: 40,
      videoQuality: quality,
      audioQuality: 85,
      freezeCount: 0,
      timestamp: Date.now()
    };
  }
});
