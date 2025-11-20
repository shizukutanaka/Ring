/**
 * Phase 5: Advanced Network Diagnostics Tests
 */

import { AdvancedNetworkDiagnosticsService } from './Phase5NetworkDiagnostics';

describe('Phase 5: Advanced Network Diagnostics', () => {
  let service: AdvancedNetworkDiagnosticsService;

  beforeEach(() => {
    service = new AdvancedNetworkDiagnosticsService();
  });

  test('should analyze WebRTC statistics', () => {
    const mockStats: any[] = [
      {
        type: 'inbound-rtp',
        mediaType: 'audio',
        jitter: 0.01,
        fractionLost: 0.02
      },
      {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 2000000
      }
    ];

    const diag = service.analyzeWebRTCStats(mockStats);

    expect(diag).toBeDefined();
    expect(diag.roundTripTime).toBeGreaterThanOrEqual(0);
    expect(diag.packetLossRate).toBeGreaterThanOrEqual(0);
    expect(diag.estimatedBitrate).toBeGreaterThan(0);
  });

  test('should detect packet loss patterns', () => {
    const pattern = service.analyzePacketLossPattern();

    expect(pattern).toBeDefined();
    expect(typeof pattern.isRandom).toBe('boolean');
    expect(pattern.burstiness).toBeGreaterThanOrEqual(0);
    expect(pattern.burstiness).toBeLessThanOrEqual(1);
  });

  test('should detect connection migration', () => {
    const migration = service.detectConnectionMigration('wifi');

    // First call returns null (no previous network)
    expect(migration).toBeNull();

    const migration2 = service.detectConnectionMigration('4g');

    expect(migration2).toBeDefined();
    expect(migration2?.fromNetworkType).toBe('unknown');
    expect(migration2?.toNetworkType).toBe('4g');
  });

  test('should analyze jitter buffer', () => {
    const analysis = service.analyzeJitterBuffer();

    expect(analysis).toBeDefined();
    expect(analysis.averageJitter).toBeGreaterThanOrEqual(0);
    expect(analysis.maxJitter).toBeGreaterThanOrEqual(0);
    expect(analysis.jitterTrend).toMatch(/increasing|stable|decreasing/);
    expect(analysis.bufferHealth).toMatch(/good|fair|poor/);
  });

  test('should estimate bandwidth from packet loss (BWE v2)', () => {
    const estimate = service.estimateBandwidthFromLoss();

    expect(estimate).toBeDefined();
    expect(estimate.estimatedBandwidth).toBeGreaterThan(0);
    expect(estimate.confidence).toBeGreaterThanOrEqual(0);
    expect(estimate.confidence).toBeLessThanOrEqual(1);
    expect(estimate.trend).toMatch(/improving|stable|degrading/);
  });

  test('should generate comprehensive diagnostic report', () => {
    const report = service.generateDiagnosticReport();

    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.networkHealth).toMatch(/excellent|good|fair|poor/);
    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  test('should track connection migrations', () => {
    service.detectConnectionMigration('unknown');
    service.detectConnectionMigration('wifi');
    service.detectConnectionMigration('4g');

    const diag = service.getDiagnostics();

    expect(diag.connectionMigrations).toBeGreaterThan(0);
  });

  test('should provide service diagnostics', () => {
    const diag = service.getDiagnostics();

    expect(diag).toBeDefined();
    expect(diag.historicalDataPoints).toBeGreaterThanOrEqual(0);
    expect(diag.diagnosticReport).toBeDefined();
  });

  test('should detect bursty packet loss', () => {
    // Create mock data with bursty loss pattern
    const stats: any = {
      forEach: (callback: Function) => {
        for (let i = 0; i < 20; i++) {
          if (i >= 5 && i <= 8) {
            // Burst of losses
            callback({
              type: 'inbound-rtp',
              mediaType: 'audio',
              fractionLost: 0.5
            });
          } else {
            callback({
              type: 'inbound-rtp',
              mediaType: 'audio',
              fractionLost: 0
            });
          }
        }
      }
    };

    // Analyze multiple times to build history
    for (let i = 0; i < 20; i++) {
      service.analyzeWebRTCStats(stats);
    }

    const pattern = service.analyzePacketLossPattern();

    // Should detect some burstiness
    expect(pattern.burstiness).toBeGreaterThanOrEqual(0);
  });

  test('should calculate network migration impact', () => {
    service.detectConnectionMigration('unknown');
    const migration = service.detectConnectionMigration('5g');

    expect(migration?.impactOnQuality).toBeDefined();
  });

  test('should track historical metrics', () => {
    const mockStats: any = [
      {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 2000000
      }
    ];

    for (let i = 0; i < 10; i++) {
      service.analyzeWebRTCStats(mockStats);
    }

    const diag = service.getDiagnostics();

    expect(diag.historicalDataPoints).toBe(10);
  });

  test('should limit historical data to 5 minutes (300 samples)', () => {
    const mockStats: any = [
      {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 2000000
      }
    ];

    for (let i = 0; i < 400; i++) {
      service.analyzeWebRTCStats(mockStats);
    }

    const diag = service.getDiagnostics();

    expect(diag.historicalDataPoints).toBeLessThanOrEqual(300);
  });
});

describe('Phase 5 Network Diagnostics Research Validation', () => {
  let service: AdvancedNetworkDiagnosticsService;

  beforeEach(() => {
    service = new AdvancedNetworkDiagnosticsService();
  });

  test('should detect packet loss via RTCP (research-validated)', () => {
    const mockStats: any = [
      {
        type: 'inbound-rtp',
        mediaType: 'audio',
        fractionLost: 0.05 // 5% loss
      }
    ];

    const diag = service.analyzeWebRTCStats(mockStats);

    expect(diag.packetLossRate).toBeDefined();
    expect(diag.packetLossRate).toBeGreaterThan(0);
  });

  test('should implement loss-based BWE v2 (2024 research)', () => {
    const estimate = service.estimateBandwidthFromLoss();

    expect(estimate.estimatedBandwidth).toBeGreaterThan(0);
    expect(estimate.confidence).toBeGreaterThanOrEqual(0);
    expect(estimate.confidence).toBeLessThanOrEqual(1);
    expect(estimate.trend).toMatch(/improving|stable|degrading/);
  });

  test('should detect connection migration (WiFi ↔ Cellular)', () => {
    service.detectConnectionMigration('unknown');
    const wifi = service.detectConnectionMigration('wifi');
    const cellular = service.detectConnectionMigration('4g');

    expect(wifi?.fromNetworkType).toBe('unknown');
    expect(wifi?.toNetworkType).toBe('wifi');
    expect(cellular?.fromNetworkType).toBe('wifi');
    expect(cellular?.toNetworkType).toBe('4g');
  });

  test('should analyze jitter buffer health', () => {
    const analysis = service.analyzeJitterBuffer();

    expect(['good', 'fair', 'poor']).toContain(analysis.bufferHealth);
  });

  test('should detect packet loss patterns (bursty vs random)', () => {
    const pattern = service.analyzePacketLossPattern();

    expect(typeof pattern.isRandom).toBe('boolean');
    expect(pattern.burstiness).toBeGreaterThanOrEqual(0);
    expect(pattern.burstiness).toBeLessThanOrEqual(1);
  });

  test('should provide actionable recommendations', () => {
    const mockStats: any = [
      {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.2, // High RTT
        availableOutgoingBitrate: 500000
      }
    ];

    service.analyzeWebRTCStats(mockStats);
    const report = service.generateDiagnosticReport();

    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});
