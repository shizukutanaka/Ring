/**
 * Phase 3 Quality Prediction Tests
 *
 * Comprehensive test suite for ML-based quality prediction model
 */

import {
  MLQualityPredictor,
  QualityPredictionEngine,
  QualityPredictionMetrics,
  PredictionResult
} from './Phase3QualityPrediction';

describe('MLQualityPredictor', () => {
  let predictor: MLQualityPredictor;

  beforeEach(() => {
    predictor = new MLQualityPredictor();
  });

  describe('Metric Normalization', () => {
    test('should normalize metrics to 0-1 range', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 5000,
        packetLoss: 0,
        rtt: 20,
        jitter: 2,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.4,
        timestamp: Date.now()
      };

      // Test by indirectly verifying prediction produces valid output
      const prediction = predictor.predict(metrics);
      expect(prediction.predictedQuality).toBeLessThanOrEqual(100);
      expect(prediction.predictedQuality).toBeGreaterThanOrEqual(0);
    });

    test('should handle edge cases in metrics', () => {
      const extremeMetrics: QualityPredictionMetrics = {
        bandwidth: 100,
        packetLoss: 50,
        rtt: 500,
        jitter: 100,
        frameComplexity: 1,
        bufferLevel: 0,
        deviceCpuUsage: 1,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(extremeMetrics);
      expect(prediction.degradationRisk).toBe('critical');
      expect(prediction.predictedQuality).toBeLessThan(50);
    });
  });

  describe('Quality Score Calculation', () => {
    test('should give high quality for excellent network conditions', () => {
      const excellentMetrics: QualityPredictionMetrics = {
        bandwidth: 5000,
        packetLoss: 0,
        rtt: 20,
        jitter: 2,
        frameComplexity: 0.3,
        bufferLevel: 200,
        deviceCpuUsage: 0.3,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(excellentMetrics);
      expect(prediction.predictedQuality).toBeGreaterThan(85);
      expect(prediction.degradationRisk).toBe('low');
    });

    test('should give low quality for poor network conditions', () => {
      const poorMetrics: QualityPredictionMetrics = {
        bandwidth: 200,
        packetLoss: 15,
        rtt: 250,
        jitter: 80,
        frameComplexity: 0.9,
        bufferLevel: 50,
        deviceCpuUsage: 0.95,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(poorMetrics);
      expect(prediction.predictedQuality).toBeLessThan(50);
      expect(prediction.degradationRisk).toBe('critical');
    });

    test('should account for packet loss non-linearly', () => {
      const metrics1: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 2,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const metrics2: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 5,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const prediction1 = predictor.predict(metrics1);
      const prediction2 = predictor.predict(metrics2);

      // Higher loss should give significantly lower quality
      expect(prediction2.predictedQuality).toBeLessThan(
        prediction1.predictedQuality * 0.8
      );
    });
  });

  describe('Prediction Results', () => {
    test('should return valid PredictionResult structure', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(metrics);

      expect(prediction.predictedQuality).toBeDefined();
      expect(prediction.confidence).toBeDefined();
      expect(prediction.predictedBitrate).toBeDefined();
      expect(prediction.recommendedResolution).toBeDefined();
      expect(prediction.stabilityScore).toBeDefined();
      expect(prediction.predictedFreezeTime).toBeDefined();
      expect(prediction.degradationRisk).toBeDefined();

      // Validate ranges
      expect(prediction.predictedQuality).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedQuality).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(prediction.stabilityScore).toBeLessThanOrEqual(1);
    });

    test('should recommend appropriate resolution based on bitrate', () => {
      const lowBitrateMetrics: QualityPredictionMetrics = {
        bandwidth: 300,
        packetLoss: 5,
        rtt: 100,
        jitter: 20,
        frameComplexity: 0.5,
        bufferLevel: 50,
        deviceCpuUsage: 0.6,
        timestamp: Date.now()
      };

      const highBitrateMetrics: QualityPredictionMetrics = {
        bandwidth: 5000,
        packetLoss: 0,
        rtt: 20,
        jitter: 2,
        frameComplexity: 0.5,
        bufferLevel: 200,
        deviceCpuUsage: 0.4,
        timestamp: Date.now()
      };

      const lowPrediction = predictor.predict(lowBitrateMetrics);
      const highPrediction = predictor.predict(highBitrateMetrics);

      expect(lowPrediction.recommendedResolution).toMatch(/^\d+x\d+$/);
      expect(highPrediction.recommendedResolution).toMatch(/^\d+x\d+$/);

      // Higher bitrate should recommend higher resolution
      const lowResPixels = this.extractPixels(
        lowPrediction.recommendedResolution
      );
      const highResPixels = this.extractPixels(
        highPrediction.recommendedResolution
      );
      expect(highResPixels).toBeGreaterThanOrEqual(lowResPixels);
    });

    extractPixels(resolution: string): number {
      const [width, height] = resolution.split('x').map(Number);
      return width * height;
    }
  });

  describe('Degradation Risk Classification', () => {
    test('should classify risk as low for good conditions', () => {
      const goodMetrics: QualityPredictionMetrics = {
        bandwidth: 3000,
        packetLoss: 0.5,
        rtt: 40,
        jitter: 3,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.4,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(goodMetrics);
      expect(prediction.degradationRisk).toBe('low');
    });

    test('should classify risk as medium for moderate conditions', () => {
      const moderateMetrics: QualityPredictionMetrics = {
        bandwidth: 1000,
        packetLoss: 2,
        rtt: 80,
        jitter: 10,
        frameComplexity: 0.5,
        bufferLevel: 80,
        deviceCpuUsage: 0.6,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(moderateMetrics);
      expect(['medium', 'high']).toContain(prediction.degradationRisk);
    });

    test('should classify risk as critical for poor conditions', () => {
      const criticalMetrics: QualityPredictionMetrics = {
        bandwidth: 200,
        packetLoss: 15,
        rtt: 250,
        jitter: 50,
        frameComplexity: 0.8,
        bufferLevel: 30,
        deviceCpuUsage: 0.9,
        timestamp: Date.now()
      };

      const prediction = predictor.predict(criticalMetrics);
      expect(prediction.degradationRisk).toBe('critical');
    });
  });

  describe('History and Caching', () => {
    test('should accumulate metrics history', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      for (let i = 0; i < 10; i++) {
        predictor.addMetrics({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const history = predictor.getHistory();
      expect(history.length).toBe(10);
    });

    test('should limit history to max length', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      // Add more than max history (60)
      for (let i = 0; i < 100; i++) {
        predictor.addMetrics({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const history = predictor.getHistory();
      expect(history.length).toBeLessThanOrEqual(60);
    });

    test('should cache predictions for identical metrics', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const prediction1 = predictor.predict(metrics);
      const prediction2 = predictor.predict(metrics);

      expect(prediction1.predictedQuality).toBe(prediction2.predictedQuality);
      expect(prediction1.predictedBitrate).toBe(prediction2.predictedBitrate);
    });
  });

  describe('Confidence Metrics', () => {
    test('should report low confidence with insufficient history', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      predictor.addMetrics(metrics);

      const confidence = predictor.getConfidenceMetrics();
      expect(confidence.overallConfidence).toBeLessThan(0.5);
    });

    test('should improve confidence with more history', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      // Add sufficient history
      for (let i = 0; i < 30; i++) {
        predictor.addMetrics({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const confidence = predictor.getConfidenceMetrics();
      expect(confidence.historyScore).toBeGreaterThan(0.4);
    });
  });

  describe('Reset Functionality', () => {
    test('should clear all state on reset', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      predictor.addMetrics(metrics);
      predictor.addMetrics(metrics);

      predictor.reset();

      const history = predictor.getHistory();
      expect(history.length).toBe(0);

      const confidence = predictor.getConfidenceMetrics();
      expect(confidence.historyLength).toBe(0);
    });
  });

  describe('Diagnostics', () => {
    test('should provide comprehensive diagnostics', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      predictor.addMetrics(metrics);

      const diagnostics = predictor.getDiagnostics();
      expect(diagnostics.timestamp).toBeDefined();
      expect(diagnostics.modelState).toBeDefined();
      expect(diagnostics.confidence).toBeDefined();
      expect(diagnostics.recentMetrics).toBeDefined();
    });
  });
});

describe('QualityPredictionEngine', () => {
  let engine: QualityPredictionEngine;

  beforeEach(() => {
    engine = new QualityPredictionEngine();
  });

  describe('Update and Predict', () => {
    test('should update and predict in single call', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const result = engine.updateAndPredict(metrics);
      expect(result.predictedQuality).toBeDefined();
      expect(result.trend).toBeDefined();
    });

    test('should accumulate prediction history', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      for (let i = 0; i < 10; i++) {
        engine.updateAndPredict({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const status = engine.getStatus();
      expect(status.predictionHistoryLength).toBe(10);
    });
  });

  describe('Trend Detection', () => {
    test('should detect improving trend', () => {
      // Simulate improving conditions
      const metrics1: QualityPredictionMetrics = {
        bandwidth: 1000,
        packetLoss: 5,
        rtt: 100,
        jitter: 15,
        frameComplexity: 0.5,
        bufferLevel: 80,
        deviceCpuUsage: 0.6,
        timestamp: Date.now()
      };

      const metrics2: QualityPredictionMetrics = {
        bandwidth: 1500,
        packetLoss: 3,
        rtt: 80,
        jitter: 10,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.55,
        timestamp: Date.now()
      };

      const metrics3: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 120,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      engine.updateAndPredict(metrics1);
      engine.updateAndPredict(metrics2);
      const result = engine.updateAndPredict(metrics3);

      // Should eventually detect improvement
      expect(['stable', 'improving']).toContain(result.trend);
    });

    test('should detect degrading trend', () => {
      // Simulate degrading conditions
      const metrics1: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 120,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const metrics2: QualityPredictionMetrics = {
        bandwidth: 1500,
        packetLoss: 3,
        rtt: 80,
        jitter: 10,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.55,
        timestamp: Date.now()
      };

      const metrics3: QualityPredictionMetrics = {
        bandwidth: 1000,
        packetLoss: 5,
        rtt: 100,
        jitter: 15,
        frameComplexity: 0.5,
        bufferLevel: 80,
        deviceCpuUsage: 0.6,
        timestamp: Date.now()
      };

      engine.updateAndPredict(metrics1);
      engine.updateAndPredict(metrics2);
      const result = engine.updateAndPredict(metrics3);

      // Should eventually detect degradation
      expect(['stable', 'degrading']).toContain(result.trend);
    });
  });

  describe('Smoothed Predictions', () => {
    test('should provide smoothed quality prediction', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      for (let i = 0; i < 10; i++) {
        engine.updateAndPredict({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const smooth = engine.getSmoothPrediction();
      expect(smooth.predictedQuality).toBeDefined();
      expect(smooth.confidence).toBeDefined();
      expect(smooth.predictedBitrate).toBeDefined();
    });

    test('should return valid prediction for empty history', () => {
      const smooth = engine.getSmoothPrediction();
      expect(smooth.predictedQuality).toBe(50); // Default
      expect(smooth.confidence).toBe(0);
    });
  });

  describe('Degradation Detection', () => {
    test('should detect quality degradation', () => {
      const metrics1: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      const metrics2: QualityPredictionMetrics = {
        bandwidth: 500,
        packetLoss: 8,
        rtt: 150,
        jitter: 30,
        frameComplexity: 0.8,
        bufferLevel: 40,
        deviceCpuUsage: 0.8,
        timestamp: Date.now()
      };

      engine.updateAndPredict(metrics1);
      engine.updateAndPredict(metrics2);

      expect(engine.willDegrade()).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    test('should analyze quality trend', () => {
      const baseMetrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      for (let i = 0; i < 10; i++) {
        engine.updateAndPredict({ ...baseMetrics, timestamp: Date.now() + i });
      }

      const analysis = engine.getTrendAnalysis();
      expect(['improving', 'degrading', 'stable']).toContain(analysis.trend);
      expect(analysis.direction).toBeDefined();
      expect(analysis.magnitude).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(analysis.stability);
    });

    test('should return insufficient_data with short history', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      engine.updateAndPredict(metrics);

      const analysis = engine.getTrendAnalysis();
      expect(analysis.trend).toBe('insufficient_data');
    });
  });

  describe('Status Report', () => {
    test('should provide comprehensive status', () => {
      const metrics: QualityPredictionMetrics = {
        bandwidth: 2000,
        packetLoss: 1,
        rtt: 50,
        jitter: 5,
        frameComplexity: 0.5,
        bufferLevel: 100,
        deviceCpuUsage: 0.5,
        timestamp: Date.now()
      };

      engine.updateAndPredict(metrics);

      const status = engine.getStatus();
      expect(status.timestamp).toBeDefined();
      expect(status.predictor).toBeDefined();
      expect(status.lastPrediction).toBeDefined();
      expect(status.smoothPrediction).toBeDefined();
      expect(status.trend).toBeDefined();
      expect(status.predictionHistoryLength).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle office broadband scenario', () => {
      const scenarios = [
        {
          bandwidth: 3000,
          packetLoss: 0.5,
          rtt: 30,
          jitter: 3,
          frameComplexity: 0.4
        },
        {
          bandwidth: 3100,
          packetLoss: 0.3,
          rtt: 28,
          jitter: 2,
          frameComplexity: 0.4
        },
        {
          bandwidth: 3200,
          packetLoss: 0.2,
          rtt: 25,
          jitter: 2,
          frameComplexity: 0.4
        }
      ];

      scenarios.forEach((s, i) => {
        const result = engine.updateAndPredict({
          bandwidth: s.bandwidth,
          packetLoss: s.packetLoss,
          rtt: s.rtt,
          jitter: s.jitter,
          frameComplexity: s.frameComplexity,
          bufferLevel: 150,
          deviceCpuUsage: 0.3,
          timestamp: Date.now() + i
        });

        expect(result.predictedQuality).toBeGreaterThan(80);
      });
    });

    test('should handle mobile 4G scenario', () => {
      const scenarios = [
        {
          bandwidth: 1000,
          packetLoss: 2,
          rtt: 80,
          jitter: 15,
          frameComplexity: 0.5
        },
        {
          bandwidth: 900,
          packetLoss: 2.5,
          rtt: 85,
          jitter: 18,
          frameComplexity: 0.5
        },
        {
          bandwidth: 850,
          packetLoss: 3,
          rtt: 90,
          jitter: 20,
          frameComplexity: 0.5
        }
      ];

      scenarios.forEach((s, i) => {
        const result = engine.updateAndPredict({
          bandwidth: s.bandwidth,
          packetLoss: s.packetLoss,
          rtt: s.rtt,
          jitter: s.jitter,
          frameComplexity: s.frameComplexity,
          bufferLevel: 100,
          deviceCpuUsage: 0.5,
          timestamp: Date.now() + i
        });

        expect(result.predictedQuality).toBeGreaterThan(50);
        expect(result.predictedQuality).toBeLessThan(85);
      });
    });

    test('should handle extreme weather scenario', () => {
      const scenarios = [
        {
          bandwidth: 500,
          packetLoss: 8,
          rtt: 150,
          jitter: 40,
          frameComplexity: 0.7
        },
        {
          bandwidth: 400,
          packetLoss: 12,
          rtt: 180,
          jitter: 60,
          frameComplexity: 0.8
        },
        {
          bandwidth: 300,
          packetLoss: 16,
          rtt: 200,
          jitter: 80,
          frameComplexity: 0.9
        }
      ];

      scenarios.forEach((s, i) => {
        const result = engine.updateAndPredict({
          bandwidth: s.bandwidth,
          packetLoss: s.packetLoss,
          rtt: s.rtt,
          jitter: s.jitter,
          frameComplexity: s.frameComplexity,
          bufferLevel: 50,
          deviceCpuUsage: 0.7,
          timestamp: Date.now() + i
        });

        expect(result.degradationRisk).toBe('critical');
        expect(result.predictedQuality).toBeLessThan(50);
      });
    });
  });
});
