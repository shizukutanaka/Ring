/**
 * Codec Implementation Tests
 *
 * Unit and integration tests for:
 * - Codec detection
 * - Codec selection
 * - Codec negotiation
 * - Quality monitoring
 * - Adaptation logic
 */

const { expect } = require('chai');
const sinon = require('sinon');
const CodecDetection = require('../client/services/CodecDetection');
const CodecSelector = require('../client/services/CodecSelector');
const CodecQualityMonitor = require('../server/services/CodecQualityMonitor');

describe('Codec Detection', () => {
  let detection;

  beforeEach(() => {
    detection = new CodecDetection({
      testCodecSupport: true
    });
  });

  describe('getClientCapabilities()', () => {
    it('should return complete capabilities object', async () => {
      const caps = detection.getClientCapabilities();

      expect(caps).to.have.all.keys([
        'browser',
        'video',
        'audio',
        'network'
      ]);
      expect(caps.browser).to.have.keys(['name', 'version', 'os']);
      expect(caps.video).to.have.keys(['codecs', 'simulcastSupport', 'svcSupport', 'hardwareAcceleration']);
      expect(caps.audio).to.have.keys(['codecs']);
    });

    it('should include video codecs', () => {
      const caps = detection.getClientCapabilities();

      expect(caps.video.codecs).to.be.an('array');
      expect(caps.video.codecs.length).to.be.greaterThan(0);
      expect(caps.video.codecs[0]).to.have.keys(['mimeType', 'mimeSubtype', 'sdpFmtpLine']);
    });

    it('should include audio codecs', () => {
      const caps = detection.getClientCapabilities();

      expect(caps.audio.codecs).to.be.an('array');
      expect(caps.audio.codecs.length).to.be.greaterThan(0);
      expect(caps.audio.codecs[0]).to.have.keys(['mimeType', 'mimeSubtype']);
    });

    it('should detect browser information', () => {
      const caps = detection.getClientCapabilities();

      expect(caps.browser.name).to.be.a('string');
      expect(caps.browser.version).to.be.a('string');
      expect(caps.browser.os).to.be.a('string');
    });
  });

  describe('getVideoCodecs()', () => {
    it('should return array of video codecs', () => {
      const codecs = detection.getVideoCodecs();

      expect(codecs).to.be.an('array');
      codecs.forEach(codec => {
        expect(codec).to.have.keys(['mimeType', 'mimeSubtype', 'sdpFmtpLine']);
        expect(codec.mimeType).to.include('video');
      });
    });

    it('should include H.264 codec', () => {
      const codecs = detection.getVideoCodecs();
      const hasH264 = codecs.some(c => c.mimeSubtype.toLowerCase().includes('h264') || c.mimeSubtype.toLowerCase().includes('avc'));

      expect(hasH264).to.be.true;
    });
  });

  describe('getAudioCodecs()', () => {
    it('should return array of audio codecs', () => {
      const codecs = detection.getAudioCodecs();

      expect(codecs).to.be.an('array');
      codecs.forEach(codec => {
        expect(codec).to.have.keys(['mimeType', 'mimeSubtype']);
        expect(codec.mimeType).to.include('audio');
      });
    });

    it('should prioritize Opus codec', () => {
      const codecs = detection.getAudioCodecs();
      const opusCodec = codecs.find(c => c.mimeSubtype.toLowerCase() === 'opus');

      expect(opusCodec).to.exist;
    });
  });

  describe('testSimulcastSupport()', () => {
    it('should return boolean for simulcast support', () => {
      const support = detection.testSimulcastSupport();

      expect(support).to.be.a('boolean');
    });
  });

  describe('testSVCSupport()', () => {
    it('should return boolean for SVC support', () => {
      const support = detection.testSVCSupport();

      expect(support).to.be.a('boolean');
    });
  });
});

describe('Codec Selection', () => {
  let selector;

  beforeEach(() => {
    selector = new CodecSelector();
  });

  describe('selectOptimalCodecs()', () => {
    it('should select H.264 for low bandwidth', () => {
      const capabilities = {
        video: {
          codecs: [
            { mimeType: 'video/av1' },
            { mimeType: 'video/vp9' },
            { mimeType: 'video/h264' }
          ]
        },
        audio: {
          codecs: [
            { mimeType: 'audio/opus' }
          ]
        }
      };

      const networkQuality = {
        bandwidth: 1000, // kbps
        rtt: 50,
        packetLoss: 2
      };

      const config = selector.selectOptimalCodecs(capabilities, networkQuality, 'p2p');

      expect(config.videoCodec).to.equal('h264');
      expect(config.audioCodec).to.equal('opus');
    });

    it('should select VP9 for medium bandwidth', () => {
      const capabilities = {
        video: {
          codecs: [
            { mimeType: 'video/av1' },
            { mimeType: 'video/vp9' },
            { mimeType: 'video/h264' }
          ]
        },
        audio: {
          codecs: [
            { mimeType: 'audio/opus' }
          ]
        }
      };

      const networkQuality = {
        bandwidth: 3000, // kbps
        rtt: 50,
        packetLoss: 1
      };

      const config = selector.selectOptimalCodecs(capabilities, networkQuality, 'p2p');

      expect(config.videoCodec).to.equal('vp9');
    });

    it('should select AV1 for high bandwidth', () => {
      const capabilities = {
        video: {
          codecs: [
            { mimeType: 'video/av1' },
            { mimeType: 'video/vp9' },
            { mimeType: 'video/h264' }
          ]
        },
        audio: {
          codecs: [
            { mimeType: 'audio/opus' }
          ]
        }
      };

      const networkQuality = {
        bandwidth: 6000, // kbps
        rtt: 30,
        packetLoss: 0
      };

      const config = selector.selectOptimalCodecs(capabilities, networkQuality, 'p2p');

      expect(config.videoCodec).to.equal('av1');
    });

    it('should return valid configuration object', () => {
      const capabilities = {
        video: {
          codecs: [{ mimeType: 'video/h264' }]
        },
        audio: {
          codecs: [{ mimeType: 'audio/opus' }]
        }
      };

      const config = selector.selectOptimalCodecs(capabilities, {}, 'p2p');

      expect(config).to.have.all.keys([
        'videoCodec',
        'audioCodec',
        'resolution',
        'framerate',
        'bitrate',
        'enableSimulcast',
        'enableSVC'
      ]);

      expect(config.resolution).to.be.a('string');
      expect(config.framerate).to.be.a('number');
      expect(config.bitrate).to.be.a('number');
      expect(config.enableSimulcast).to.be.a('boolean');
      expect(config.enableSVC).to.be.a('boolean');
    });
  });

  describe('selectVideoCodec()', () => {
    it('should select based on network quality', () => {
      const codecs = [
        { mimeType: 'video/av1' },
        { mimeType: 'video/vp9' },
        { mimeType: 'video/h264' }
      ];

      const lowBandwidth = selector.selectVideoCodec(codecs, { bandwidth: 800 });
      const mediumBandwidth = selector.selectVideoCodec(codecs, { bandwidth: 3000 });
      const highBandwidth = selector.selectVideoCodec(codecs, { bandwidth: 6000 });

      expect(lowBandwidth).to.equal('h264');
      expect(['h264', 'vp9']).to.include(mediumBandwidth);
      expect(['av1', 'vp9']).to.include(highBandwidth);
    });

    it('should fallback to H.264 when others unavailable', () => {
      const codecs = [{ mimeType: 'video/h264' }];

      const codec = selector.selectVideoCodec(codecs, { bandwidth: 6000 });

      expect(codec).to.equal('h264');
    });
  });

  describe('selectQualitySettings()', () => {
    it('should return appropriate settings for low bandwidth', () => {
      const settings = selector.selectQualitySettings('h264', { bandwidth: 800 });

      expect(settings.resolution).to.equal('640x480');
      expect(settings.framerate).to.equal(15);
      expect(settings.bitrate).to.be.below(1000);
    });

    it('should return HD settings for high bandwidth', () => {
      const settings = selector.selectQualitySettings('av1', { bandwidth: 6000 });

      expect(['1920x1080', '1280x720']).to.include(settings.resolution);
      expect(settings.framerate).to.be.greaterThanOrEqual(24);
      expect(settings.bitrate).to.be.above(2000);
    });

    it('should adjust bitrate for codec efficiency', () => {
      const h264Settings = selector.selectQualitySettings('h264', { bandwidth: 3000 });
      const vp9Settings = selector.selectQualitySettings('vp9', { bandwidth: 3000 });
      const av1Settings = selector.selectQualitySettings('av1', { bandwidth: 3000 });

      // AV1 should have lowest bitrate (best efficiency)
      expect(av1Settings.bitrate).to.be.below(vp9Settings.bitrate);
      expect(vp9Settings.bitrate).to.be.below(h264Settings.bitrate);
    });
  });

  describe('shouldEnableSimulcast()', () => {
    it('should enable for conference calls with non-H264 codec', () => {
      const caps = { video: { simulcastSupport: true } };

      expect(selector.shouldEnableSimulcast(caps, 'vp9', 'conference')).to.be.true;
      expect(selector.shouldEnableSimulcast(caps, 'av1', 'conference')).to.be.true;
    });

    it('should disable for P2P calls', () => {
      const caps = { video: { simulcastSupport: true } };

      expect(selector.shouldEnableSimulcast(caps, 'vp9', 'p2p')).to.be.false;
    });

    it('should disable for H.264', () => {
      const caps = { video: { simulcastSupport: true } };

      expect(selector.shouldEnableSimulcast(caps, 'h264', 'conference')).to.be.false;
    });
  });

  describe('shouldEnableSVC()', () => {
    it('should enable for modern codecs with bandwidth constraints', () => {
      const caps = { video: { svcSupport: true } };

      const conferenceResult = selector.shouldEnableSVC(
        caps,
        'vp9',
        { bandwidth: 2500 },
        'conference'
      );

      expect(conferenceResult).to.be.true;
    });

    it('should disable for H.264', () => {
      const caps = { video: { svcSupport: true } };

      expect(selector.shouldEnableSVC(caps, 'h264', { bandwidth: 1000 }, 'conference')).to.be.false;
    });
  });

  describe('adaptCodecConfig()', () => {
    it('should adjust settings based on stats', () => {
      const original = {
        videoCodec: 'vp9',
        bitrate: 2500,
        resolution: '1280x720',
        framerate: 30
      };

      const stats = {
        packetLoss: 8,
        bandwidth: 1500,
        frameDropRate: 12
      };

      const adapted = selector.adaptCodecConfig(original, stats);

      expect(adapted.bitrate).to.be.below(original.bitrate);
      expect(adapted.resolution).to.not.equal(original.resolution);
    });

    it('should handle improving network conditions', () => {
      const original = {
        videoCodec: 'h264',
        bitrate: 1000,
        resolution: '640x480',
        framerate: 15
      };

      const stats = {
        packetLoss: 0,
        bandwidth: 5000,
        frameDropRate: 0
      };

      const adapted = selector.adaptCodecConfig(original, stats);

      expect(adapted.bitrate).to.be.greaterThan(original.bitrate);
    });
  });
});

describe('Codec Quality Monitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new CodecQualityMonitor({
      callId: 'test-call-123',
      codec: 'h264'
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('initialization', () => {
    it('should initialize with correct defaults', () => {
      expect(monitor.callId).to.equal('test-call-123');
      expect(monitor.adaptationState.currentCodec).to.equal('h264');
      expect(monitor.adaptationState.currentBitrate).to.equal(2500);
    });
  });

  describe('updateNetworkMetrics()', () => {
    it('should store network metrics', () => {
      const metrics = {
        bandwidth: 3000,
        rtt: 50,
        packetLoss: 1,
        jitter: 10
      };

      monitor.updateNetworkMetrics(metrics);

      expect(monitor.metrics.networkQuality).to.deep.include(metrics);
    });

    it('should maintain history', () => {
      monitor.updateNetworkMetrics({ bandwidth: 3000 });
      monitor.updateNetworkMetrics({ bandwidth: 2500 });
      monitor.updateNetworkMetrics({ bandwidth: 2000 });

      expect(monitor.history.networkQuality.length).to.equal(3);
    });
  });

  describe('calculateQualityScore()', () => {
    it('should return 10 for perfect conditions', () => {
      monitor.updateNetworkMetrics({
        bandwidth: 6000,
        rtt: 20,
        packetLoss: 0,
        jitter: 5
      });

      const score = monitor.calculateQualityScore();

      expect(score).to.be.closeTo(10, 0.5);
    });

    it('should reduce score for packet loss', () => {
      monitor.updateNetworkMetrics({
        bandwidth: 6000,
        rtt: 20,
        packetLoss: 8,
        jitter: 5
      });

      const score = monitor.calculateQualityScore();

      expect(score).to.be.below(8);
    });

    it('should reduce score for low bandwidth', () => {
      monitor.updateNetworkMetrics({
        bandwidth: 500,
        rtt: 20,
        packetLoss: 0,
        jitter: 5
      });

      const score = monitor.calculateQualityScore();

      expect(score).to.be.below(7);
    });

    it('should reduce score for high RTT', () => {
      monitor.updateNetworkMetrics({
        bandwidth: 6000,
        rtt: 200,
        packetLoss: 0,
        jitter: 5
      });

      const score = monitor.calculateQualityScore();

      expect(score).to.be.below(9);
    });

    it('should keep score between 0-10', () => {
      monitor.updateNetworkMetrics({
        bandwidth: 100,
        rtt: 500,
        packetLoss: 20,
        jitter: 100
      });

      const score = monitor.calculateQualityScore();

      expect(score).to.be.within(0, 10);
    });
  });

  describe('detectTrend()', () => {
    it('should detect improving trend', () => {
      // Simulate improving quality scores
      for (const score of [3, 5, 7, 8]) {
        monitor.history.qualityScore.push({ score, timestamp: Date.now() });
      }

      const trend = monitor.detectTrend();

      expect(trend).to.equal('improving');
    });

    it('should detect degrading trend', () => {
      // Simulate degrading quality scores
      for (const score of [8, 6, 4, 2]) {
        monitor.history.qualityScore.push({ score, timestamp: Date.now() });
      }

      const trend = monitor.detectTrend();

      expect(trend).to.equal('degrading');
    });

    it('should detect stable trend', () => {
      // Simulate stable quality scores
      for (const score of [5, 5.1, 5.2, 5]) {
        monitor.history.qualityScore.push({ score, timestamp: Date.now() });
      }

      const trend = monitor.detectTrend();

      expect(trend).to.equal('stable');
    });
  });

  describe('getAdaptationRecommendation()', () => {
    it('should recommend downgrade for critical quality', () => {
      const recommendation = monitor.getAdaptationRecommendation(1, 'degrading');

      expect(recommendation).to.exist;
      expect(recommendation.action).to.equal('downgrade');
      expect(recommendation.severity).to.equal('critical');
    });

    it('should recommend reduce_quality for poor quality trend', () => {
      const recommendation = monitor.getAdaptationRecommendation(3.5, 'degrading');

      expect(recommendation).to.exist;
      expect(recommendation.action).to.equal('reduce_quality');
    });

    it('should recommend upgrade for excellent quality', () => {
      const recommendation = monitor.getAdaptationRecommendation(9, 'improving');

      expect(recommendation).to.exist;
      expect(recommendation.action).to.equal('upgrade');
    });

    it('should return null for stable good quality', () => {
      const recommendation = monitor.getAdaptationRecommendation(7, 'stable');

      expect(recommendation).to.be.null;
    });
  });

  describe('applyAdaptation()', () => {
    it('should apply downgrade adaptation', () => {
      monitor.adaptationState.currentCodec = 'av1';
      monitor.adaptationState.currentBitrate = 3000;

      const recommendation = {
        action: 'downgrade',
        severity: 'critical',
        suggestedCodec: 'vp9',
        suggestedBitrate: 1500
      };

      monitor.applyAdaptation(recommendation);

      expect(monitor.adaptationState.currentCodec).to.equal('vp9');
      expect(monitor.adaptationState.currentBitrate).to.equal(1500);
    });

    it('should apply upgrade adaptation', () => {
      monitor.adaptationState.currentCodec = 'h264';
      monitor.adaptationState.currentBitrate = 1500;

      const recommendation = {
        action: 'upgrade',
        severity: 'low',
        suggestedBitrate: 3000
      };

      monitor.applyAdaptation(recommendation);

      expect(monitor.adaptationState.currentBitrate).to.equal(3000);
    });

    it('should enforce cooldown period', () => {
      const recommendation = {
        action: 'downgrade',
        severity: 'critical',
        suggestedCodec: 'h264',
        suggestedBitrate: 1000
      };

      const firstAdaptTime = monitor.adaptationState.lastAdaptationTime;
      monitor.applyAdaptation(recommendation);
      const secondAdaptTime = monitor.adaptationState.lastAdaptationTime;

      expect(secondAdaptTime).to.be.greaterThan(firstAdaptTime);
    });
  });

  describe('getStatus()', () => {
    it('should return complete status', () => {
      monitor.updateNetworkMetrics({ bandwidth: 3000 });

      const status = monitor.getStatus();

      expect(status).to.have.all.keys([
        'callId',
        'qualityScore',
        'trend',
        'currentCodec',
        'currentBitrate',
        'currentResolution',
        'networkMetrics',
        'encoderMetrics',
        'decoderMetrics'
      ]);
    });
  });

  describe('getDiagnostics()', () => {
    it('should include average metrics', () => {
      for (let i = 0; i < 5; i++) {
        monitor.updateNetworkMetrics({ bandwidth: 3000, packetLoss: 2 });
        monitor.history.qualityScore.push({ score: 7 + (i * 0.2) });
      }

      const diags = monitor.getDiagnostics();

      expect(diags).to.have.property('averageQuality');
      expect(diags).to.have.property('averagePacketLoss');
      expect(diags.averageQuality).to.be.a('number');
      expect(diags.averagePacketLoss).to.be.a('number');
    });
  });
});

describe('Integration Tests', () => {
  it('should complete codec negotiation flow', () => {
    // 1. Client detects capabilities
    const detection = new CodecDetection();
    const clientCaps = detection.getClientCapabilities();

    expect(clientCaps.video.codecs.length).to.be.greaterThan(0);
    expect(clientCaps.audio.codecs.length).to.be.greaterThan(0);

    // 2. Server negotiates codec
    const selector = new CodecSelector();
    const networkQuality = {
      bandwidth: 3000,
      rtt: 50,
      packetLoss: 1
    };

    const config = selector.selectOptimalCodecs(clientCaps, networkQuality, 'p2p');

    expect(config.videoCodec).to.be.a('string');
    expect(config.audioCodec).to.be.a('string');

    // 3. Monitor quality during call
    const monitor = new CodecQualityMonitor({
      callId: 'integration-test',
      codec: config.videoCodec
    });

    monitor.updateNetworkMetrics(networkQuality);
    const qualityScore = monitor.calculateQualityScore();

    expect(qualityScore).to.be.within(0, 10);

    monitor.stopMonitoring();
  });

  it('should handle network degradation and recovery', () => {
    const monitor = new CodecQualityMonitor({ callId: 'degradation-test' });
    const selector = new CodecSelector();

    // Good network
    monitor.updateNetworkMetrics({ bandwidth: 5000, rtt: 30, packetLoss: 0 });
    let score = monitor.calculateQualityScore();
    expect(score).to.be.above(8);

    // Network degrades
    monitor.updateNetworkMetrics({ bandwidth: 1000, rtt: 150, packetLoss: 5 });
    score = monitor.calculateQualityScore();
    expect(score).to.be.below(6);

    // Should get downgrade recommendation
    const recommendation = monitor.getAdaptationRecommendation(score, 'degrading');
    expect(recommendation.action).to.be.oneOf(['downgrade', 'reduce_quality']);

    // Network recovers
    monitor.updateNetworkMetrics({ bandwidth: 4000, rtt: 40, packetLoss: 0 });
    score = monitor.calculateQualityScore();
    expect(score).to.be.above(7);

    monitor.stopMonitoring();
  });
});
