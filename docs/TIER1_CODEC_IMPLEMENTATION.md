# Tier 1: AV1/VP9 Codec Support Implementation Guide

**Status**: Planned
**Estimated Timeline**: 3-4 weeks
**Team Size**: 2-3 engineers
**Priority**: HIGH (30-50% bandwidth savings)
**Implementation Difficulty**: MEDIUM

---

## Executive Summary

This document provides the technical roadmap for implementing modern codec support (AV1/VP9) with simulcast technology to reduce bandwidth consumption by 30-50% compared to H.264.

**Key Benefits**:
- 30-50% bandwidth reduction through superior compression
- Automatic client capability detection
- Network-aware codec selection
- Backward compatibility with H.264

**Affected Components**:
- WebRTC peer connection configuration
- Server-side codec negotiation
- Client codec capability detection
- Network quality monitoring

---

## Phase 1: Research & Preparation (Week 1)

### 1.1 Browser & Device Support Matrix

Create comprehensive support matrix:

```javascript
const codecSupport = {
  browsers: {
    chrome: {
      av1: { support: true, minVersion: 110, profile: 'main' },
      vp9: { support: true, minVersion: 48, profile: 'profile0' },
      h264: { support: true, minVersion: 1 }
    },
    firefox: {
      av1: { support: false, minVersion: null },
      vp9: { support: true, minVersion: 63 },
      h264: { support: false, minVersion: null }
    },
    safari: {
      av1: { support: false, minVersion: null },
      vp9: { support: false, minVersion: null },
      h264: { support: true, minVersion: 11 }
    },
    edge: {
      av1: { support: true, minVersion: 110 },
      vp9: { support: true, minVersion: 18 },
      h264: { support: true, minVersion: 1 }
    }
  },
  platforms: {
    desktop: ['h264', 'vp9', 'av1'],
    mobile: {
      android: ['h264', 'vp9'],
      ios: ['h264']
    }
  }
};
```

### 1.2 W3C WebRTC SVC Extension Study

References:
- [W3C RTP Payload Format for AV1](https://aomediacodec.org/av1-rtp-spec/)
- [W3C Scalable Video Coding Extension](https://w3c.github.io/webrtc-svc/)
- [VP9 RTP Payload Format (RFC 7741)](https://tools.ietf.org/html/rfc7741)

Key concepts to implement:
- **SVC (Scalable Video Coding)**: Multiple quality layers
- **Temporal Scalability**: Frame skipping for lower quality
- **Spatial Scalability**: Resolution reduction
- **Bitstream Dependency**: Defining layer relationships

### 1.3 Performance Benchmarking

Setup benchmarking environment:

```bash
# Install codec comparison tools
# 1. FFmpeg with codec support
ffmpeg -codecs | grep -E "hevc|av1|vp9"

# 2. WebRTC testing framework
npm install webrtc-adapter mediasoup --save-dev

# 3. Network simulation tools
npm install network-simulator --save-dev
```

---

## Phase 2: Client-Side Implementation (Week 1-2)

### 2.1 Codec Capability Detection

Create capability detection module:

```javascript
// client/services/CodecDetection.ts

import RTCAdapterLibrary from 'webrtc-adapter';

export class CodecDetection {
  static async getClientCapabilities(): Promise<CodecCapabilities> {
    const capabilities = {
      video: {
        codecs: [],
        maxResolution: { width: 1920, height: 1080 },
        maxFramerate: 30,
        simulcastSupport: false,
        svcSupport: false
      },
      audio: {
        codecs: [],
        maxChannels: 2,
        maxSampleRate: 48000
      }
    };

    // Detect video codecs
    const pc = new RTCPeerConnection();
    const sender = await pc.addTrack(
      new MediaStreamVideoTrack(),
      new MediaStream()
    );

    // Query codec capabilities
    const capabilities = RTCRtpSender.getCapabilities('video');

    for (const codec of capabilities.codecs) {
      capabilities.video.codecs.push({
        mimeType: codec.mimeType,
        clockRate: codec.clockRate,
        channels: codec.channels,
        sdpFmtpLine: codec.sdpFmtpLine,
        parameters: this.parseParameters(codec.sdpFmtpLine)
      });
    }

    // Detect simulcast support
    capabilities.video.simulcastSupport = this.testSimulcastSupport(sender);

    // Detect SVC support
    capabilities.video.svcSupport = this.testSVCSupport(capabilities);

    pc.close();
    return capabilities;
  }

  private static parseParameters(sdpFmtpLine: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (!sdpFmtpLine) return params;

    const parts = sdpFmtpLine.split(';');
    for (const part of parts.slice(1)) {
      const [key, value] = part.trim().split('=');
      if (key && value) params[key] = value;
    }
    return params;
  }

  private static testSimulcastSupport(sender: RTCRtpSender): boolean {
    try {
      // Try to set simulcast parameters
      const params = sender.getParameters();
      params.encodings = [
        { rid: 'h', maxBitrate: 2000000 },
        { rid: 'm', maxBitrate: 1000000 },
        { rid: 'l', maxBitrate: 500000 }
      ];
      sender.setParameters(params);
      return true;
    } catch (e) {
      return false;
    }
  }

  private static testSVCSupport(capabilities: RTCRtpCapabilities): boolean {
    // Check for SVC in codec parameters
    for (const codec of capabilities.video.codecs) {
      if (codec.mimeType.includes('av1') && codec.parameters?.['scalabilityMode']) {
        return true;
      }
      if (codec.mimeType.includes('vp9') && codec.parameters?.['profile-id']) {
        return true;
      }
    }
    return false;
  }
}
```

### 2.2 Codec Selection Algorithm

Implement intelligent codec selection:

```javascript
// client/services/CodecSelector.ts

export class CodecSelector {
  static selectOptimalCodecs(
    clientCapabilities: CodecCapabilities,
    networkQuality: NetworkQuality,
    callType: 'p2p' | 'conference'
  ): CodecConfiguration {
    const config: CodecConfiguration = {
      videoCodec: this.selectVideoCodec(clientCapabilities, networkQuality, callType),
      audioCodec: this.selectAudioCodec(clientCapabilities),
      enableSimulcast: this.shouldEnableSimulcast(clientCapabilities, callType),
      enableSVC: this.shouldEnableSVC(clientCapabilities, networkQuality, callType)
    };

    return config;
  }

  private static selectVideoCodec(
    caps: CodecCapabilities,
    network: NetworkQuality,
    callType: string
  ): VideoCodecSelection {
    // Priority: AV1 > VP9 > H.264
    // Availability: Browser support + device support + network quality

    // For conference calls with poor network: use H.264
    if (callType === 'conference' && network.bandwidth < 2000) {
      return this.selectCodec(caps, 'h264', 'main');
    }

    // For good network: try AV1
    if (network.bandwidth > 5000) {
      const av1 = this.selectCodec(caps, 'av1', 'main');
      if (av1) return av1;
    }

    // Fallback to VP9
    const vp9 = this.selectCodec(caps, 'vp9', 'profile0');
    if (vp9) return vp9;

    // Final fallback to H.264
    return this.selectCodec(caps, 'h264', 'main');
  }

  private static selectCodec(
    caps: CodecCapabilities,
    mimePrefix: string,
    preferredProfile?: string
  ): VideoCodecSelection | null {
    const codec = caps.video.codecs.find(c =>
      c.mimeType.toLowerCase().includes(mimePrefix) &&
      (!preferredProfile || c.parameters?.['profile-id'] === preferredProfile)
    );

    if (!codec) return null;

    return {
      mimeType: codec.mimeType,
      clockRate: codec.clockRate,
      parameters: codec.parameters,
      payloadType: 0 // Assigned during negotiation
    };
  }

  private static selectAudioCodec(caps: CodecCapabilities): AudioCodecSelection {
    // Prefer Opus > G.722 > PCMU
    const preferredCodecs = ['opus', 'g722', 'pcmu'];

    for (const preferred of preferredCodecs) {
      const codec = caps.audio.codecs.find(c =>
        c.mimeType.toLowerCase().includes(preferred)
      );
      if (codec) {
        return {
          mimeType: codec.mimeType,
          clockRate: codec.clockRate,
          channels: codec.channels
        };
      }
    }

    // Fallback to first available
    return {
      mimeType: caps.audio.codecs[0].mimeType,
      clockRate: caps.audio.codecs[0].clockRate,
      channels: caps.audio.codecs[0].channels
    };
  }

  private static shouldEnableSimulcast(caps: CodecCapabilities, callType: string): boolean {
    // Enable simulcast for conference calls with supported codec
    if (callType === 'conference' && caps.video.simulcastSupport) {
      return true;
    }
    return false;
  }

  private static shouldEnableSVC(
    caps: CodecCapabilities,
    network: NetworkQuality,
    callType: string
  ): boolean {
    // Enable SVC for poor network conditions or conference calls
    if (!caps.video.svcSupport) return false;

    if (callType === 'conference' && network.bandwidth < 3000) {
      return true;
    }

    return false;
  }
}
```

### 2.3 Simulcast Configuration

Configure simulcast for three quality layers:

```javascript
// client/services/SimulcastConfig.ts

export class SimulcastConfig {
  static getSimulcastEncodings(
    videoCodec: string,
    availableBandwidth: number
  ): RTCRtpEncodingParameters[] {
    const encodings: RTCRtpEncodingParameters[] = [];

    if (videoCodec.includes('av1')) {
      // AV1 with SVC: Use scalability mode
      encodings.push(
        {
          rid: 'l',
          maxBitrate: Math.max(300000, availableBandwidth * 0.2),
          scalabilityMode: 'L1T2',
          maxFramerate: 15
        },
        {
          rid: 'm',
          maxBitrate: Math.max(700000, availableBandwidth * 0.5),
          scalabilityMode: 'L2T2',
          maxFramerate: 24
        },
        {
          rid: 'h',
          maxBitrate: Math.max(2000000, availableBandwidth * 0.8),
          scalabilityMode: 'L3T2',
          maxFramerate: 30
        }
      );
    } else if (videoCodec.includes('vp9')) {
      // VP9 with flexible simulcast
      encodings.push(
        {
          rid: 'l',
          maxBitrate: 300000,
          scaleResolutionDownBy: 4,
          maxFramerate: 15
        },
        {
          rid: 'm',
          maxBitrate: 1000000,
          scaleResolutionDownBy: 2,
          maxFramerate: 24
        },
        {
          rid: 'h',
          maxBitrate: 2000000,
          scaleResolutionDownBy: 1,
          maxFramerate: 30
        }
      );
    } else {
      // H.264 with basic simulcast
      encodings.push(
        {
          rid: 'l',
          maxBitrate: 500000,
          scaleResolutionDownBy: 2,
          maxFramerate: 15
        },
        {
          rid: 'h',
          maxBitrate: 1500000,
          maxFramerate: 30
        }
      );
    }

    return encodings;
  }
}
```

---

## Phase 3: Server-Side Implementation (Week 2-3)

### 3.1 Codec Negotiation

Implement server-side codec selection:

```javascript
// server/codecs/CodecNegotiation.js

class CodecNegotiator {
  static negotiateCodecs(clientCapabilities, serverPreferences) {
    // Server codec preference order: AV1 > VP9 > H.264
    const serverCodecOrder = ['av1', 'vp9', 'h264'];

    // Find intersection of client and server capabilities
    const negotiatedCodecs = [];

    for (const serverCodec of serverCodecOrder) {
      const clientCodec = clientCapabilities.video.codecs.find(c =>
        c.mimeType.toLowerCase().includes(serverCodec)
      );

      if (clientCodec) {
        negotiatedCodecs.push({
          codec: serverCodec,
          mimeType: clientCodec.mimeType,
          parameters: clientCodec.parameters,
          bandwidth: this.estimatedBandwidth(serverCodec)
        });
      }
    }

    return {
      videoCodec: negotiatedCodecs[0],
      alternativeCodecs: negotiatedCodecs.slice(1),
      simulcastSupport: clientCapabilities.video.simulcastSupport &&
        (negotiatedCodecs[0].codec !== 'h264'),
      svcSupport: clientCapabilities.video.svcSupport
    };
  }

  static estimatedBandwidth(codec) {
    // Estimated bandwidth for 1080p30 at 95% quality
    const bandwidthMap = {
      'av1': 1500000,    // 1.5 Mbps (50% less than H.264)
      'vp9': 2000000,    // 2.0 Mbps (30% less than H.264)
      'h264': 3000000    // 3.0 Mbps baseline
    };
    return bandwidthMap[codec] || 3000000;
  }
}

module.exports = CodecNegotiator;
```

### 3.2 Database Schema Updates

```sql
-- Add codec tracking to call records
ALTER TABLE call_records
  ADD COLUMN codec_video VARCHAR(50) DEFAULT 'h264',
  ADD COLUMN codec_video_profile VARCHAR(50),
  ADD COLUMN codec_audio VARCHAR(50) DEFAULT 'opus',
  ADD COLUMN simulcast_enabled BOOLEAN DEFAULT false,
  ADD COLUMN svc_enabled BOOLEAN DEFAULT false,
  ADD COLUMN estimated_bandwidth_mbps NUMERIC(5,2);

-- Create codec statistics table
CREATE TABLE call_codec_stats (
  id BIGSERIAL PRIMARY KEY,
  call_id UUID REFERENCES call_records(id) ON DELETE CASCADE,
  participant_id UUID,
  codec_video VARCHAR(50),
  codec_audio VARCHAR(50),
  bitrate_video_kbps INTEGER,
  bitrate_audio_kbps INTEGER,
  frame_rate_fps INTEGER,
  resolution_width INTEGER,
  resolution_height INTEGER,
  packet_loss_percent NUMERIC(5,2),
  timestamp TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (call_id) REFERENCES call_records(id)
);

-- Index for analytics
CREATE INDEX idx_call_codec_stats_call_id ON call_codec_stats(call_id);
CREATE INDEX idx_call_codec_stats_timestamp ON call_codec_stats(timestamp);
```

### 3.3 API Endpoints for Codec Selection

```javascript
// server/routes/codecs.js

router.post('/api/codec/negotiate', async (req, res) => {
  const { clientCapabilities, networkQuality } = req.body;

  try {
    const negotiation = CodecNegotiator.negotiateCodecs(
      clientCapabilities,
      serverPreferences
    );

    res.json({
      selectedCodec: negotiation.videoCodec,
      alternatives: negotiation.alternativeCodecs,
      simulcast: negotiation.simulcastSupport,
      svc: negotiation.svcSupport,
      bandwidthEstimate: negotiation.videoCodec.bandwidth
    });
  } catch (err) {
    console.error('Codec negotiation error:', err);
    res.status(500).json({ error: 'codec negotiation failed' });
  }
});

router.get('/api/codec/capabilities', async (req, res) => {
  const serverCapabilities = {
    video: [
      { codec: 'av1', supported: true, bandwidth: 1500000 },
      { codec: 'vp9', supported: true, bandwidth: 2000000 },
      { codec: 'h264', supported: true, bandwidth: 3000000 }
    ],
    audio: [
      { codec: 'opus', supported: true, sampleRate: 48000 },
      { codec: 'g722', supported: true, sampleRate: 16000 }
    ]
  };

  res.json(serverCapabilities);
});
```

---

## Phase 4: Quality Monitoring (Week 3-4)

### 4.1 Real-time Codec Metrics

```javascript
// client/monitoring/CodecMetrics.ts

export class CodecMetrics {
  private stats: Map<string, CodecStat> = new Map();

  async collectStats(peerConnection: RTCPeerConnection): Promise<void> {
    const stats = await peerConnection.getStats();

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        this.recordInboundMetrics(report);
      } else if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
        this.recordOutboundMetrics(report);
      }
    });
  }

  private recordInboundMetrics(report: RTCInboundRtpStreamStats): void {
    const key = `inbound_${report.ssrc}`;
    this.stats.set(key, {
      codec: report.mimeType,
      bytesReceived: report.bytesReceived,
      packetsLost: report.packetsLost,
      frameRate: report.framesPerSecond,
      frameWidth: report.frameWidth,
      frameHeight: report.frameHeight,
      timestamp: report.timestamp
    });
  }

  getCodecReport(): CodecReport {
    const inboundStats = Array.from(this.stats.values())
      .filter(s => s.codec);

    const currentCodec = inboundStats[0]?.codec || 'unknown';
    const avgPacketLoss = inboundStats.reduce((sum, s) =>
      sum + (s.packetsLost || 0), 0) / inboundStats.length;

    return {
      codec: currentCodec,
      packetLoss: avgPacketLoss,
      qualityMetrics: this.calculateQualityMetrics(inboundStats)
    };
  }

  private calculateQualityMetrics(stats: CodecStat[]): QualityMetrics {
    return {
      excellent: stats.length > 0 && this.getAverageFrameRate(stats) >= 25,
      good: this.getAveragePacketLoss(stats) < 2,
      fair: this.getAverageFrameRate(stats) >= 10,
      poor: this.getAverageFrameRate(stats) < 10
    };
  }
}
```

### 4.2 Bandwidth Monitoring

```javascript
// server/monitoring/BandwidthMonitor.js

class BandwidthMonitor {
  async recordCallBandwidth(callId, participant, stats) {
    const bandwidthMbps = (stats.bitrate / 1000000).toFixed(2);

    await pool.query(
      `INSERT INTO call_codec_stats(
        call_id, participant_id, codec_video, codec_audio,
        bitrate_video_kbps, bitrate_audio_kbps, frame_rate_fps,
        resolution_width, resolution_height, packet_loss_percent
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        callId,
        participant.id,
        stats.videoCodec,
        stats.audioCodec,
        stats.videoBitrate,
        stats.audioBitrate,
        stats.frameRate,
        stats.resolution.width,
        stats.resolution.height,
        stats.packetLoss
      ]
    );
  }
}
```

---

## Phase 5: Testing (Week 4)

### 5.1 Unit Tests

```javascript
// tests/codecs.test.js

describe('Codec Selection', () => {
  test('should prefer AV1 over VP9', () => {
    const capabilities = {
      video: {
        codecs: [
          { mimeType: 'video/av1' },
          { mimeType: 'video/vp9' },
          { mimeType: 'video/h264' }
        ]
      }
    };

    const selected = CodecSelector.selectVideoCodec(
      capabilities,
      { bandwidth: 5000 },
      'p2p'
    );

    expect(selected.mimeType).toContain('av1');
  });

  test('should fallback to H.264 on poor network', () => {
    const capabilities = {
      video: {
        codecs: [
          { mimeType: 'video/h264' }
        ]
      }
    };

    const selected = CodecSelector.selectVideoCodec(
      capabilities,
      { bandwidth: 500 },
      'conference'
    );

    expect(selected.mimeType).toContain('h264');
  });
});
```

### 5.2 Integration Tests

```bash
# Test with different network conditions
npm run test:codec:bandwidth-low
npm run test:codec:bandwidth-medium
npm run test:codec:bandwidth-high

# Test codec negotiation
npm run test:codec:negotiation

# Test simulcast functionality
npm run test:codec:simulcast
```

### 5.3 Load Testing

Compare bandwidth usage across codecs:

```bash
# H.264 baseline
k6 run tests/load-test-h264.js --vus 100 --duration 5m

# VP9
k6 run tests/load-test-vp9.js --vus 100 --duration 5m

# AV1
k6 run tests/load-test-av1.js --vus 100 --duration 5m

# Compare results
# Expected: AV1 ~50% less bandwidth than H.264
# Expected: VP9 ~30% less bandwidth than H.264
```

---

## Deployment Checklist

- [ ] Client-side codec detection implemented
- [ ] Codec selection algorithm tested
- [ ] Server-side negotiation working
- [ ] Database schema updated
- [ ] Simulcast configuration complete
- [ ] Quality monitoring enabled
- [ ] API endpoints tested
- [ ] All tests passing (>95% coverage)
- [ ] Performance benchmarks verified
- [ ] Documentation updated

---

## References

- [AV1 Codec Specification](https://aomediacodec.org/av1-spec/)
- [VP9 RFC 7741](https://tools.ietf.org/html/rfc7741)
- [W3C WebRTC SVC Extension](https://w3c.github.io/webrtc-svc/)
- [Libav1 Encoding Guide](https://aomedia.org/av1/specification/)

---

**Implementation Status**: Planned
**Last Updated**: 2025-11-17
**Next Phase Start**: Week 1 of implementation sprint
