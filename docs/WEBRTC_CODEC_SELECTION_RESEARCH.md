# WebRTC Codec Selection Best Practices - Comprehensive Research Report

**Research Date:** November 20, 2025
**Target Implementation:** CodecSelector.ts
**Research Scope:** Multi-source analysis (academic papers, web resources, technical documentation)

---

## Executive Summary

This document presents comprehensive research on WebRTC codec selection best practices, covering 10 key areas: codec performance, network adaptation, device capabilities, SVC implementation, simulcast strategies, real-time metrics, bitrate estimation, browser support, call type optimization, and audio codec selection. Based on this research, **20 specific improvements** are recommended for the CodecSelector implementation, categorized by priority level (Must-Have, Should-Have, Nice-to-Have).

---

## Table of Contents

1. [Codec Performance & Efficiency](#1-codec-performance--efficiency)
2. [Network Adaptation](#2-network-adaptation)
3. [Device Capabilities](#3-device-capabilities)
4. [SVC Implementation](#4-svc-implementation)
5. [Simulcast vs SVC](#5-simulcast-vs-svc)
6. [Real-time Metrics](#6-real-time-metrics)
7. [Bitrate Estimation](#7-bitrate-estimation)
8. [Browser Support](#8-browser-support)
9. [Call Type Optimization](#9-call-type-optimization)
10. [Audio Codec Selection](#10-audio-codec-selection)
11. [Recommended Improvements](#11-recommended-improvements)

---

## 1. Codec Performance & Efficiency

### 1.1 Compression Efficiency Comparison

**AV1:**
- **Compression:** 30% better than VP9, 50% better than H.264
- **CPU Usage:** 3-5× more CPU-intensive than VP9 on desktop CPUs
- **Status:** Production-ready as of Chrome M120 (2024)
- **License:** Fully open and royalty-free
- **Hardware Acceleration:** Limited but growing (Chrome 136+ supports native AV1)

**VP9:**
- **Compression:** 50% bitrate reduction vs VP8, ~40% less data than H.264 for same quality
- **CPU Usage:** Moderate (more efficient than AV1, less than H.264)
- **Browser Support:** 88%+ on modern browsers (Q1 2024)
- **Hardware Acceleration:** Increasingly available on modern devices

**H.264:**
- **Compression:** Baseline efficiency (reference standard)
- **CPU Usage:** Lowest when hardware accelerated
- **Browser Support:** Universal (mandatory codec per RFC 7742)
- **Hardware Acceleration:** Available on nearly all modern devices
- **Best Use Case:** Mobile devices, battery-constrained environments

**VP8:**
- **Compression:** Baseline (similar to H.264 but less efficient)
- **CPU Usage:** Moderate
- **Browser Support:** Mandatory codec (RFC 7742)
- **Hardware Acceleration:** Limited (not supported on iOS)

### 1.2 Current Implementation Analysis

**CodecSelector.ts Current Priority:**
```typescript
private static readonly CODEC_PRIORITY = ['av1', 'vp9', 'h264'];
```

**Issues:**
1. Doesn't consider hardware acceleration availability
2. No CPU constraint awareness
3. Missing VP8 fallback
4. No platform-specific optimization (iOS vs Android vs Desktop)

### 1.3 Best Practices

1. **Platform-First Strategy:** Detect platform and adjust codec priority accordingly
2. **Hardware Detection:** Query hardware acceleration before codec selection
3. **Efficiency vs Quality Trade-off:** Balance compression efficiency with encoding complexity
4. **Battery Awareness:** Prioritize hardware-accelerated codecs on mobile devices

---

## 2. Network Adaptation

### 2.1 Key Network Metrics

**RTT (Round-Trip Time):**
- **Definition:** Time for packet to travel to destination and back
- **Impact:** Affects real-time responsiveness and feedback loops
- **Thresholds:**
  - Excellent: <50ms
  - Good: 50-150ms
  - Fair: 150-300ms
  - Poor: >300ms

**Jitter:**
- **Definition:** Variation in packet arrival time
- **Impact:** Causes audio/video stuttering
- **Mitigation:** Adaptive jitter buffer (NetEQ for audio)
- **Thresholds:**
  - Excellent: <10ms
  - Good: 10-30ms
  - Fair: 30-50ms
  - Poor: >50ms

**Packet Loss:**
- **Definition:** Percentage of packets lost in transit
- **Impact:** Video quality degradation, artifacts
- **Thresholds:**
  - Excellent: <0.5%
  - Good: 0.5-2%
  - Fair: 2-5%
  - Poor: 5-10%
  - Critical: >10%

**Bandwidth:**
- **Definition:** Available network capacity (kbps/Mbps)
- **Dynamic Nature:** Constantly fluctuating in real networks
- **Estimation:** GCC (Google Congestion Control) algorithm

### 2.2 Congestion Detection Algorithms

**Loss-Based Algorithm:**
```
if packet_loss < 2%:
    bandwidth += 8%
elif 2% <= packet_loss <= 10%:
    bandwidth unchanged
else:  # packet_loss > 10%
    bandwidth = current_rate × (1 - 0.5 × loss)
```

**Delay-Based Algorithm (GCC):**
- Analyzes inter-packet arrival times
- Detects congestion before packet loss occurs
- Two components:
  1. Delay-based controller at receiver
  2. Loss-based controller at sender

### 2.3 Current Implementation Issues

**NetworkQuality Interface:**
```typescript
export interface NetworkQuality {
  bandwidth: number; // kbps
  rtt: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
}
```

**Problems:**
1. No historical tracking (trends over time)
2. Missing bandwidth fluctuation detection
3. No congestion state tracking
4. Jitter not actively used in decision-making
5. No adaptive thresholds based on call duration

### 2.4 Best Practices

1. **Multi-Metric Analysis:** Combine RTT, jitter, packet loss, and bandwidth
2. **Trend Detection:** Track metrics over time windows (5s, 30s, 60s)
3. **Proactive Adaptation:** React to delay increases before packet loss
4. **Hysteresis:** Avoid rapid switching (add cooldown periods)
5. **Graceful Degradation:** Step-down quality gradually, not abruptly

---

## 3. Device Capabilities

### 3.1 Hardware Acceleration Detection

**Current Implementation:**
```typescript
hardwareAcceleration: boolean;  // Simple boolean
```

**Enhanced Approach:**
```typescript
interface HardwareAcceleration {
  available: boolean;
  codecs: {
    h264: { encode: boolean; decode: boolean; profiles: string[] };
    vp8: { encode: boolean; decode: boolean };
    vp9: { encode: boolean; decode: boolean; profiles: number[] };
    av1: { encode: boolean; decode: boolean };
  };
  maxResolution: { width: number; height: number };
  maxFramerate: number;
}
```

### 3.2 Platform-Specific Considerations

**iOS:**
- Only H.264 hardware acceleration guaranteed
- VP8/VP9 software-only (high CPU usage, battery drain)
- Safari enforces H.264-first strategy
- All browsers use WebKit (same limitations)

**Android:**
- H.264 hardware acceleration on most modern devices
- VP8/VP9 support varies by chipset
- AV1 hardware decoding on newer devices (2023+)
- Battery impact significant for software codecs

**Desktop (Windows/macOS/Linux):**
- H.264 widely hardware-accelerated
- VP9 hardware support on modern GPUs (Intel Gen 9+, AMD VCN 2.0+, NVIDIA Maxwell+)
- AV1 hardware support on latest GPUs (Intel Arc, AMD RDNA 3, NVIDIA RTX 30+)

### 3.3 CPU Constraint Detection

**Metrics:**
- Device type (mobile vs tablet vs desktop)
- CPU cores and architecture
- Available memory
- Battery status (charging vs battery)
- Thermal state (normal vs overheating)

**WebRTC-Specific:**
```javascript
// Check CPU usage impact
const stats = await pc.getStats();
stats.forEach(report => {
  if (report.type === 'media-source') {
    console.log('Encoding time:', report.totalEncodeTime);
    console.log('Frame count:', report.framesEncoded);
    // Calculate: avgEncodeTime = totalEncodeTime / framesEncoded
  }
});
```

### 3.4 Battery Impact Optimization

**Research Findings:**
- Hardware-accelerated H.264: 2-3× better battery life vs software VP9
- Software AV1: Severe battery drain on mobile devices
- Screen sharing: Lower framerate (10 FPS) saves significant battery

**Best Practices:**
1. **Battery-First Mode:** When battery <20%, force hardware-accelerated codecs
2. **Thermal Throttling:** Downgrade codec/resolution when device overheating
3. **Charging Detection:** Allow higher-quality codecs when charging
4. **Background Detection:** Reduce quality when app in background

### 3.5 Current Implementation Issues

1. No platform detection (iOS vs Android vs Desktop)
2. No battery status awareness
3. Hardware acceleration is boolean (not per-codec)
4. No CPU usage monitoring
5. No thermal state detection

---

## 4. SVC Implementation

### 4.1 Scalability Mode Taxonomy

**Format:** `LxTy[_modifier]`
- **L:** Spatial layers (resolution scaling)
- **T:** Temporal layers (framerate scaling)
- **Modifier:** Additional options (KEY, KEY_SHIFT, etc.)

### 4.2 Common Scalability Modes

**Temporal-Only Modes:**
- **L1T1:** Single layer (no scalability)
- **L1T2:** 2 temporal layers (full FPS, half FPS)
- **L1T3:** 3 temporal layers (full FPS, half FPS, quarter FPS)

**Spatial + Temporal Modes:**
- **L2T1:** 2 spatial layers (full res, half res), 1 temporal layer
- **L2T2:** 2 spatial layers × 2 temporal layers = 4 decode targets
- **L2T3:** 2 spatial layers × 3 temporal layers = 6 decode targets
- **L3T1:** 3 spatial layers (1080p, 720p, 360p)
- **L3T2:** 3 spatial layers × 2 temporal layers = 6 decode targets
- **L3T3:** 3 spatial layers × 3 temporal layers = 9 decode targets

**Special Modes:**
- **L2T1_KEY:** Spatial layers only depend on lower layers at key frames
- **L2T2_KEY_SHIFT:** KEY variant with temporal ID shifted upward
- **S2T1, S3T1:** Simulcast-style spatial layers (independent)

### 4.3 Codec SVC Support

**VP8:**
- Only temporal scalability: L1T2, L1T3
- No spatial scalability

**VP9:**
- Full SVC support: L1T2, L1T3, L2T1, L2T2, L2T3, L3T3
- Chrome implements subset

**AV1:**
- Extensive SVC modes: L1T2, L1T3, L2T1, L2T1h, L2T2, L3T1, L3T3, S2T1, S3T1
- libwebrtc implements: L1T2, L1T3, L2T1, L2T1h, L2T1_KEY, L2T2, L2T2_KEY, L2T2_KEY_SHIFT, L3T1, L3T3, L3T3_KEY, S2T1
- Hardware decoder limitations: May not support spatial modes (check referenceScaling)

**H.264:**
- Limited SVC support
- Primarily simulcast-based

### 4.4 SVC vs Simulcast Trade-offs

**SVC Advantages:**
- Single encode (lower CPU usage for sender)
- Bandwidth efficient (layers build on each other)
- SFU can drop layers without re-encoding
- Better for fluctuating networks

**SVC Disadvantages:**
- Requires codec support (VP9, AV1)
- More complex decoder
- Hardware support limited
- Larger decode targets (more data per frame)

**Simulcast Advantages:**
- Independent layers (easier to drop)
- Works with any codec (including H.264)
- Hardware acceleration compatible
- Simpler decoder

**Simulcast Disadvantages:**
- Multiple encodes (3× CPU usage)
- Higher bandwidth for sender
- Not efficient for single-receiver scenarios

### 4.5 Current Implementation Analysis

**Current SVC Selection:**
```typescript
private static shouldEnableSVC(
  caps: ClientCapabilities,
  videoCodec: string,
  network: NetworkQuality,
  callType: string
): boolean {
  // Only if client supports SVC
  if (!caps.video.svcSupport) return false;

  // Only for AV1 and VP9
  if (!['av1', 'vp9'].includes(videoCodec)) return false;

  // Enable for conference calls on limited bandwidth
  if (callType === 'conference' && network.bandwidth < 3000) return true;

  // Enable for p2p on poor network
  if (callType === 'p2p' && network.bandwidth < 2000) return true;

  return false;
}
```

**Issues:**
1. Hardcoded bandwidth thresholds
2. No consideration of hardware decoder limitations
3. Fixed scalability modes (L2T2 for AV1, L2T1 for VP9)
4. No dynamic mode switching based on participant count
5. Doesn't check actual SVC mode support

**Current Scalability Mode Selection:**
```typescript
private static getScalabilityMode(videoCodec: string, enableSVC: boolean): string | undefined {
  if (!enableSVC) return undefined;

  if (videoCodec === 'av1') {
    return 'L2T2'; // Fixed: 2 spatial layers, 2 temporal layers
  }

  if (videoCodec === 'vp9') {
    return 'L2T1'; // Fixed: 2 spatial layers, 1 temporal layer
  }

  return undefined;
}
```

**Problems:**
1. No consideration of use case (conference size, network conditions)
2. Missing L1T2/L1T3 for temporal-only scenarios
3. No L3T3 for large conferences
4. Doesn't validate mode support before selection

### 4.6 Best Practices

1. **Mode Selection Strategy:**
   - P2P: L1T2 or L1T3 (temporal only, low overhead)
   - Small conference (3-5): L2T1 or L2T2
   - Medium conference (6-10): L2T2 or L2T3
   - Large conference (10+): L3T3 or S3T1

2. **Hardware Decoder Check:**
   ```javascript
   // Check if hardware supports spatial scalability
   const encoder = new VideoEncoder({...});
   const support = await encoder.isConfigSupported({
     codec: 'av01.0.05M.08',
     scalabilityMode: 'L2T2',
     ...
   });
   if (!support.config.scalabilityMode) {
     // Fallback to L1T2 or simulcast
   }
   ```

3. **Dynamic Mode Switching:**
   - Start with L1T2 (low overhead)
   - Upgrade to L2T1 when participants > 3
   - Upgrade to L3T3 when participants > 10
   - Downgrade if encoding time exceeds frame duration

4. **Network-Adaptive SVC:**
   - Good network: L3T3 (max flexibility)
   - Medium network: L2T2 (balanced)
   - Poor network: L1T2 (minimal overhead)

---

## 5. Simulcast vs SVC

### 5.1 When to Use Simulcast

**Ideal Scenarios:**
- Using H.264 (no native SVC support)
- Conference with heterogeneous receivers (mobile + desktop)
- Need guaranteed quality tiers
- SFU supports simulcast switching
- Hardware acceleration required (some SVC modes break HW accel)

**Conference Size:**
- Small (3-5): Optional (P2P may suffice)
- Medium (6-15): Highly recommended
- Large (15+): Essential

**Implementation:**
```javascript
const encodings = [
  { rid: 'h', maxBitrate: 2000000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  { rid: 'm', maxBitrate: 1000000, maxFramerate: 24, scaleResolutionDownBy: 2 },
  { rid: 'l', maxBitrate: 500000, maxFramerate: 15, scaleResolutionDownBy: 4 }
];
```

### 5.2 When to Use SVC

**Ideal Scenarios:**
- Using VP9 or AV1 (native SVC support)
- Conference with moderate participants (3-10)
- Need to minimize sender-side CPU/bandwidth
- Network conditions fluctuate frequently
- Single receiver with varying network

**Network Conditions:**
- Fluctuating bandwidth: SVC superior (SFU drops layers)
- Stable bandwidth: Simulcast acceptable
- Low sender bandwidth: SVC (sends once, not 3×)

**CPU Constraints:**
- Low CPU: SVC (single encode)
- High CPU: Simulcast acceptable (parallel encodes)

### 5.3 Hybrid Approach

**Best Practice:** Conditional selection based on context

```typescript
function selectMultiLayerStrategy(
  codec: string,
  participantCount: number,
  networkStability: 'stable' | 'fluctuating',
  senderCPU: 'low' | 'medium' | 'high',
  hardwareAccel: boolean
): 'simulcast' | 'svc' | 'none' {

  // P2P: No multi-layer needed
  if (participantCount <= 2) return 'none';

  // H.264: Must use simulcast (no SVC)
  if (codec === 'h264') {
    return participantCount >= 3 ? 'simulcast' : 'none';
  }

  // VP9/AV1: Prefer SVC with conditions
  if (['vp9', 'av1'].includes(codec)) {
    // Low CPU or fluctuating network: SVC
    if (senderCPU === 'low' || networkStability === 'fluctuating') {
      return 'svc';
    }

    // Large conference with stable network: Simulcast
    if (participantCount >= 15 && networkStability === 'stable') {
      return 'simulcast';
    }

    // Medium conference: SVC (more efficient)
    if (participantCount < 15) {
      return 'svc';
    }
  }

  return 'none';
}
```

### 5.4 Current Implementation Issues

**Current Simulcast Logic:**
```typescript
private static shouldEnableSimulcast(
  caps: ClientCapabilities,
  videoCodec: string,
  callType: string
): boolean {
  if (callType !== 'conference') return false;
  if (videoCodec === 'h264') return false;  // BUG: Should enable for H.264!
  return caps.video.simulcastSupport;
}
```

**Problems:**
1. **Critical Bug:** Disables simulcast for H.264 (should be primary use case!)
2. No participant count consideration
3. No network stability check
4. No CPU constraint awareness
5. Can enable both simulcast AND SVC simultaneously (wasteful)

**Mutual Exclusion Needed:**
```typescript
// Should NEVER enable both
if (enableSimulcast && enableSVC) {
  console.warn('Cannot enable both simulcast and SVC!');
  // Choose one based on codec/conditions
}
```

### 5.5 Research-Based Recommendations

1. **H.264 Conference:** ALWAYS use simulcast (only option)
2. **VP9/AV1 Conference (3-10 participants):** Prefer SVC
3. **VP9/AV1 Conference (10+ participants):** Consider simulcast
4. **Unstable Network:** Prefer SVC (better adaptation)
5. **Low Sender CPU:** Prefer SVC (single encode)
6. **iOS Clients Present:** Use H.264 + simulcast

---

## 6. Real-time Metrics

### 6.1 Critical WebRTC Stats

**RTCPeerConnection.getStats() Reports:**

```javascript
// Inbound RTP Stats
{
  type: 'inbound-rtp',
  packetsLost: number,
  jitter: number,
  framesDecoded: number,
  framesDropped: number,
  totalDecodeTime: number,
  bytesReceived: number,
  timestamp: number
}

// Outbound RTP Stats
{
  type: 'outbound-rtp',
  packetsSent: number,
  bytesSent: number,
  framesEncoded: number,
  totalEncodeTime: number,
  qualityLimitationReason: 'none' | 'cpu' | 'bandwidth' | 'other',
  timestamp: number
}

// Remote Inbound RTP (from RTCP feedback)
{
  type: 'remote-inbound-rtp',
  packetsLost: number,
  jitter: number,
  roundTripTime: number,
  fractionLost: number
}

// Candidate Pair (ICE connection)
{
  type: 'candidate-pair',
  availableOutgoingBitrate: number,
  currentRoundTripTime: number,
  totalRoundTripTime: number,
  requestsReceived: number,
  requestsSent: number
}
```

### 6.2 Bandwidth Estimation Mechanisms

**REMB (Receiver Estimated Maximum Bitrate):**
- Legacy mechanism
- Receiver calculates available bandwidth
- Sends feedback via RTCP
- Less accurate than TWCC

**TWCC (Transport-Wide Congestion Control):**
- Modern approach (preferred)
- Sender-side bandwidth estimation
- Receiver reports packet arrival times
- Sender calculates bandwidth using GCC algorithm
- More accurate and responsive

**GCC Probing:**
```
Initial estimate: 300 kbps
Probe 1: 3 × start = 900 kbps
Probe 2: 6 × start = 1800 kbps
```

### 6.3 Quality Limitation Detection

**qualityLimitationReason values:**
- `'none'`: No limitations (ideal)
- `'cpu'`: Encoder CPU-bound (reduce resolution/framerate)
- `'bandwidth'`: Network-limited (reduce bitrate)
- `'other'`: Other constraints

**Adaptive Response:**
```typescript
const reason = outboundStats.qualityLimitationReason;

if (reason === 'cpu') {
  // Reduce encoding complexity
  // Option 1: Lower resolution
  // Option 2: Reduce framerate
  // Option 3: Switch to lighter codec (AV1 → VP9 → H.264)
  // Option 4: Disable SVC (reduce encode overhead)
}

if (reason === 'bandwidth') {
  // Reduce bitrate
  // Option 1: Lower target bitrate
  // Option 2: Reduce resolution
  // Option 3: Enable SVC/simulcast (SFU drops layers)
  // Option 4: Reduce framerate
}
```

### 6.4 NACK and FEC Metrics

**NACK (Negative Acknowledgment):**
- Retransmission requests
- High NACK rate = packet loss
- Monitor: `nackCount` in stats

**FEC (Forward Error Correction):**
- Redundant data for recovery
- Threshold: 12400 bps for Opus FEC
- Monitor: `fecPacketsReceived`

### 6.5 Current Implementation Issues

**adaptCodecConfig() function:**
```typescript
static adaptCodecConfig(
  currentConfig: CodecConfiguration,
  networkStats: {
    bandwidth: number;
    packetLoss: number;
    rtt: number;
  },
  capabilities: ClientCapabilities
): CodecConfiguration {
  // Only checks packet loss and bandwidth
  // Missing: jitter, quality limitations, encode time, NACK rate

  if (networkStats.packetLoss > 5) {
    // Downgrades codec (AV1 → VP9 → H.264)
  }

  if (networkStats.bandwidth > 5000 && currentConfig.videoCodec !== 'av1') {
    // Upgrades to AV1
  }

  return currentConfig;
}
```

**Problems:**
1. No jitter consideration
2. No quality limitation reason detection
3. No encode time monitoring (CPU overload detection)
4. No NACK rate tracking
5. No gradual resolution/framerate adjustment
6. Codec switching too aggressive (should be last resort)
7. No hysteresis (rapid switching possible)
8. No trend analysis (reacts to single data point)

### 6.6 Best Practices

1. **Stats Collection Frequency:** Every 1-2 seconds
2. **Trend Analysis:** Track moving averages (5s, 30s windows)
3. **Hysteresis:** Require sustained degradation before adapting
4. **Graceful Adaptation:**
   - Step 1: Reduce bitrate (10-20%)
   - Step 2: Reduce framerate (30 → 24 → 15)
   - Step 3: Reduce resolution (1080p → 720p → 480p)
   - Step 4: Disable SVC (reduce encode overhead)
   - Step 5: Switch codec (last resort)

5. **Quality Metrics Priority:**
   ```
   Critical: packetLoss > 10%, framesDropped > 30%, qualityLimitationReason
   Important: jitter > 50ms, RTT > 300ms, NACK rate high
   Monitoring: bandwidth fluctuation, encode/decode time
   ```

---

## 7. Bitrate Estimation

### 7.1 GCC Algorithm (Google Congestion Control)

**Components:**
1. **Delay-Based Controller (Receiver):**
   - Analyzes inter-packet arrival times
   - Detects congestion via delay increases
   - Computes rate limit
   - Sends feedback to sender

2. **Loss-Based Controller (Sender):**
   - Monitors packet loss rate
   - Adjusts sending rate
   - Cannot exceed receiver's rate limit

**Algorithm:**
```
Start: 300 kbps initial estimate

Probing:
  - Probe 1: 900 kbps (3× initial)
  - Probe 2: 1800 kbps (6× initial)

Adaptation:
  if delay_increase detected:
    rate = rate × 0.85  // Reduce 15%
  elif packet_loss < 2%:
    rate = rate × 1.08  // Increase 8%
  elif packet_loss 2-10%:
    rate = unchanged
  else:  // packet_loss > 10%
    rate = rate × (1 - 0.5 × loss_fraction)
```

### 7.2 TWCC vs REMB

**TWCC Advantages:**
- Sender-side estimation (better control in SFU scenarios)
- More accurate (uses arrival timestamps)
- Detects congestion earlier (delay-based)
- Preferred by modern implementations

**REMB Legacy:**
- Receiver-side estimation
- Coarser granularity
- Only used when TWCC unavailable

### 7.3 Bitrate Ladder Configuration

**Recommended Profiles:**

```javascript
// ABR Bitrate Ladder
const bitrateProfiles = [
  // Resolution, FPS, Bitrate (kbps) - H.264, VP9, AV1
  { res: '1920x1080', fps: 30, h264: 3000, vp9: 2000, av1: 1500 },
  { res: '1920x1080', fps: 24, h264: 2500, vp9: 1700, av1: 1200 },
  { res: '1280x720',  fps: 30, h264: 1500, vp9: 1000, av1: 750 },
  { res: '1280x720',  fps: 24, h264: 1200, vp9: 800,  av1: 600 },
  { res: '640x480',   fps: 30, h264: 800,  vp9: 500,  av1: 400 },
  { res: '640x480',   fps: 24, h264: 600,  vp9: 400,  av1: 300 },
  { res: '640x480',   fps: 15, h264: 400,  vp9: 250,  av1: 200 },
  { res: '320x240',   fps: 15, h264: 200,  vp9: 150,  av1: 100 }
];

// Simulcast Layers
const simulcastLayers = [
  { rid: 'h', resolution: '1280x720',  fps: 30, bitrate: 1500 },  // High
  { rid: 'm', resolution: '640x480',   fps: 24, bitrate: 600 },   // Medium
  { rid: 'l', resolution: '320x240',   fps: 15, bitrate: 200 }    // Low
];
```

**Best Practices:**
1. **Minimum Profile:** Always include 240p @ 15fps (100-200 kbps)
2. **Number of Profiles:** 5-7 profiles for smooth adaptation
3. **Ratio Between Profiles:** 1.5-2× bitrate increase per step
4. **Screen Sharing:** Lower fps (10-15), higher resolution, lower bitrate

### 7.4 Current Implementation Analysis

**estimatedBitrate() function:**
```typescript
private static estimatedBitrate(
  codec: string,
  resolution: string,
  framerate: number,
  availableBandwidth: number
): number {
  const baseMap: Record<string, number> = {
    av1: 1500,   // 1080p@30fps
    vp9: 2000,
    h264: 3000
  };

  const resolutionMap: Record<string, number> = {
    '1920x1080': 1.0,
    '1280x720': 0.5,
    '640x480': 0.25,
    '320x240': 0.1
  };

  const baseRate = baseMap[codec] || 3000;
  const resMult = resolutionMap[resolution] || 0.5;
  const fpsRatio = framerate / 30;

  let targetBitrate = baseRate * resMult * fpsRatio;

  // Constrain to 80% of available bandwidth
  const maxBitrate = availableBandwidth * 0.8;
  targetBitrate = Math.min(targetBitrate, maxBitrate);

  return Math.round(targetBitrate);
}
```

**Issues:**
1. Linear scaling assumption (not accurate for all codecs)
2. Missing intermediate resolutions (960x540, 854x480)
3. No content type consideration (motion vs static)
4. 80% bandwidth margin may be too conservative or aggressive depending on scenario
5. No consideration of SVC/simulcast overhead
6. Missing VP8 bitrate baseline
7. No quality-based adjustment (CRF/QP parameters)

### 7.5 Advanced Bitrate Estimation

**Content-Aware Bitrate:**
```typescript
function estimateBitrateContentAware(
  codec: string,
  resolution: { width: number; height: number },
  framerate: number,
  contentHint: 'motion' | 'detail' | 'text',
  availableBandwidth: number
): number {

  // Pixels per second
  const pixelsPerSec = resolution.width * resolution.height * framerate;

  // Bits per pixel based on codec and content
  const bitsPerPixel = {
    motion: { h264: 0.10, vp9: 0.07, av1: 0.05, vp8: 0.12 },
    detail: { h264: 0.15, vp9: 0.10, av1: 0.08, vp8: 0.18 },
    text:   { h264: 0.08, vp9: 0.05, av1: 0.04, vp8: 0.10 }
  };

  const bpp = bitsPerPixel[contentHint][codec] || 0.10;
  const targetBitrate = (pixelsPerSec * bpp) / 1000; // Convert to kbps

  // Apply bandwidth constraint with adaptive margin
  const margin = contentHint === 'motion' ? 0.85 : 0.90;
  const maxBitrate = availableBandwidth * margin;

  return Math.min(targetBitrate, maxBitrate);
}
```

**Research-Based Recommendations:**
1. **Bits per pixel (BPP) approach:** More accurate than fixed bitrates
2. **Content hint integration:** Adjust BPP for content type
3. **Dynamic bandwidth margin:** 85-90% depending on network stability
4. **Probe-based initialization:** Use GCC probing for initial estimate
5. **ABR ladder:** Pre-calculate bitrate ladder for fast switching

---

## 8. Browser Support

### 8.1 Browser Codec Support Matrix (2024-2025)

| Codec | Chrome/Edge | Firefox | Safari (macOS) | Safari (iOS) | Mobile Chrome | Mobile Firefox |
|-------|-------------|---------|----------------|--------------|---------------|----------------|
| **VP8** | ✅ Full | ✅ Full | ✅ (v13+) | ✅ (v13+) | ✅ Full | ✅ Full |
| **VP9** | ✅ Full | ✅ Full | ✅ (v17+) | ✅ (v17+) | ✅ Full | ✅ Full |
| **H.264 Baseline** | ✅ Full | ✅ Software | ✅ Hardware | ✅ Hardware | ✅ Full | ✅ Software |
| **H.264 Main** | ✅ Full | ✅ Software | ✅ Hardware | ✅ Hardware | ✅ Full | ✅ Software |
| **H.264 High** | ✅ Full | ⚠️ Limited | ✅ Hardware | ✅ Hardware | ✅ Full | ⚠️ Limited |
| **AV1** | ✅ (M120+) | ✅ Partial | ⚠️ Experimental | ❌ No | ⚠️ Limited | ⚠️ Limited |
| **H.265/HEVC** | ✅ (v136+) | ❌ No | ✅ Hardware | ✅ Hardware | ⚠️ Limited | ❌ No |

**Legend:**
- ✅ Full: Full support with hardware acceleration (where available)
- ✅ Software: Full support, software-only
- ⚠️ Limited: Partial support or specific conditions
- ❌ No: Not supported

### 8.2 Mandatory Codecs (RFC 7742 & RFC 7874)

**Video:**
- VP8 (mandatory)
- H.264 Constrained Baseline Profile (mandatory)

**Audio:**
- Opus (mandatory, RFC 7874)
- G.711 PCMA (mandatory)
- G.711 PCMU (mandatory)

### 8.3 Platform-Specific Quirks

**Safari/iOS:**
- H.264 only guaranteed codec
- VP8/VP9 support recent (Safari 13+, Safari 17+)
- All iOS browsers use WebKit (Chrome/Firefox/Edge on iOS = Safari engine)
- Hardware acceleration only for H.264
- AV1 experimental, not production-ready

**Firefox:**
- Software H.264 codec on Android (no hardware acceleration)
- VP9 software implementation (CPU-intensive)
- Limited H.264 High Profile support

**Chrome/Edge:**
- Best codec support overall
- Hardware H.264 on most platforms
- AV1 support since M120 (production-ready)
- H.265 support since v136
- TWCC preferred over REMB

### 8.4 Hardware Acceleration Platform Matrix

| Platform | H.264 HW | VP8 HW | VP9 HW | AV1 HW |
|----------|----------|--------|--------|--------|
| **Windows (Intel 9th gen+)** | ✅ | ❌ | ✅ | ⚠️ (11th gen+) |
| **Windows (AMD RDNA 2+)** | ✅ | ❌ | ✅ | ✅ (RDNA 3+) |
| **Windows (NVIDIA GTX 10+)** | ✅ | ❌ | ✅ (GTX 16+) | ✅ (RTX 30+) |
| **macOS (Intel)** | ✅ | ❌ | ⚠️ | ❌ |
| **macOS (Apple Silicon)** | ✅ | ❌ | ✅ (M1+) | ❌ |
| **iOS** | ✅ | ❌ | ❌ | ❌ |
| **Android (Snapdragon 845+)** | ✅ | ❌ | ✅ | ⚠️ (8 Gen 2+) |
| **Android (MediaTek D900+)** | ✅ | ❌ | ✅ | ⚠️ |

### 8.5 Advanced Feature Support

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| **Simulcast** | ✅ Full | ✅ Full | ⚠️ Limited |
| **SVC (VP9)** | ✅ Full | ✅ Partial | ❌ No |
| **SVC (AV1)** | ✅ Full | ⚠️ Experimental | ❌ No |
| **TWCC** | ✅ Yes | ✅ Yes | ⚠️ Limited |
| **Insertable Streams** | ✅ Yes | ✅ Yes | ❌ No |
| **WebCodecs API** | ✅ Yes | ⚠️ Experimental | ❌ No |

### 8.6 Current Implementation Issues

**Browser Detection:**
```typescript
// CodecDetection.ts
private static getBrowserInfo(): ClientCapabilities['browser'] {
  const userAgent = navigator.userAgent;
  // Simple regex matching
  if (/Chrome\/(\d+)/.test(userAgent)) { ... }
  else if (/Firefox\/(\d+)/.test(userAgent)) { ... }
  else if (/Safari\/(\d+)/.test(userAgent)) { ... }
  // ...
}
```

**Problems:**
1. No iOS WebKit detection (Chrome/Firefox on iOS show as Chrome/Firefox)
2. No Edge detection (Edge uses "Edg" in user agent)
3. No mobile-specific detection
4. No browser version-specific capability mapping
5. Doesn't detect Chrome on iOS (which is actually Safari)

### 8.7 Best Practices

1. **iOS Detection:**
   ```typescript
   const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
   const isIOSWebView = isIOS && !/Safari/.test(navigator.userAgent);
   const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
   const isIOSFirefox = isIOS && /FxiOS/.test(navigator.userAgent);

   // All iOS browsers = WebKit = H.264 only
   if (isIOS || isIOSChrome || isIOSFirefox) {
     codecPriority = ['h264'];
   }
   ```

2. **Feature Detection over Browser Detection:**
   ```typescript
   // Don't assume based on browser name
   // Test actual codec support
   const hasVP9 = codecs.some(c => c.mimeType.includes('VP9'));
   const hasAV1 = codecs.some(c => c.mimeType.includes('AV01'));
   ```

3. **Version-Aware Capabilities:**
   ```typescript
   const chromeVersion = parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
   const hasAV1 = chromeVersion >= 120 || codecs.some(c => c.mimeType.includes('AV01'));
   ```

4. **Graceful Degradation:**
   ```typescript
   // Priority order with feature detection
   const codecPriority = [];

   if (hasAV1 && hardwareAccel && !isMobile) codecPriority.push('av1');
   if (hasVP9 && !isIOS) codecPriority.push('vp9');
   codecPriority.push('h264');  // Always available (mandatory)
   if (hasVP8) codecPriority.push('vp8');  // Fallback
   ```

---

## 9. Call Type Optimization

### 9.1 P2P (Peer-to-Peer) Optimization

**Characteristics:**
- Direct connection between 2 participants
- No intermediate server processing
- Bandwidth: Each peer sends once, receives once
- Latency: Lowest possible (direct path)

**Codec Selection Strategy:**
```typescript
// P2P optimization
if (callType === 'p2p') {
  // Prioritize quality and efficiency
  if (network.bandwidth > 5000) {
    // High bandwidth: Use best compression
    codec = 'av1';  // 50% less bandwidth than H.264
  } else if (network.bandwidth > 2000) {
    codec = 'vp9';  // 40% less bandwidth than H.264
  } else {
    // Low bandwidth: Use hardware-accelerated
    codec = 'h264';  // Best battery life, universal support
  }

  // No simulcast needed (only one receiver)
  enableSimulcast = false;

  // SVC only for unstable networks
  enableSVC = network.packetLoss > 3 || network.jitter > 30;
  scalabilityMode = 'L1T2';  // Temporal only (low overhead)
}
```

**Best Practices:**
1. **No Simulcast:** Wasteful for single receiver
2. **SVC Minimal:** L1T2 or L1T3 for temporal adaptation only
3. **Quality First:** Prioritize highest quality within bandwidth
4. **Hardware Acceleration:** Important for mobile battery life

### 9.2 Conference (SFU) Optimization

**Characteristics:**
- 3+ participants
- Selective Forwarding Unit (SFU) relays streams
- Bandwidth: Sender uploads once, SFU forwards to N receivers
- CPU: Sender encodes once (SFU doesn't transcode)

**Small Conference (3-5 participants):**
```typescript
if (participantCount <= 5) {
  // Balance quality and compatibility
  codec = isIOS ? 'h264' : selectBestCodec();

  // Simulcast or SVC (not both)
  if (codec === 'h264') {
    enableSimulcast = true;  // H.264 doesn't support SVC
    layers = 3;  // High, medium, low
  } else if (['vp9', 'av1'].includes(codec)) {
    enableSVC = true;
    scalabilityMode = 'L2T1';  // 2 spatial, 1 temporal
  }
}
```

**Medium Conference (6-15 participants):**
```typescript
if (participantCount <= 15) {
  // Optimize for sender bandwidth
  codec = 'vp9';  // Good compression, wide support

  if (hardwareAccel) {
    enableSimulcast = true;  // Independent layers
    layers = 3;
  } else {
    enableSVC = true;  // Lower CPU for sender
    scalabilityMode = 'L2T2';  // 2 spatial × 2 temporal
  }

  // Reduce sender bitrate
  maxBitrate = Math.min(availableBandwidth * 0.7, 2000);  // Cap at 2 Mbps
}
```

**Large Conference (15+ participants):**
```typescript
if (participantCount > 15) {
  // Maximize compatibility and scalability
  codec = 'h264';  // Best compatibility
  enableSimulcast = true;  // Required for scaling
  layers = 3;

  // Aggressive bitrate limits
  maxBitrate = Math.min(availableBandwidth * 0.6, 1500);  // Cap at 1.5 Mbps

  // Lower default quality
  defaultResolution = '1280x720';  // 720p max
  defaultFramerate = 24;  // 24 fps
}
```

### 9.3 MCU (Multipoint Control Unit) Optimization

**Characteristics:**
- Server mixes/transcodes all streams
- Each participant receives single composite stream
- Bandwidth: Each peer sends once, receives once
- CPU: Server CPU-intensive (transcoding)

**Strategy:**
```typescript
if (architecture === 'mcu') {
  // Server handles transcoding, prioritize quality to server
  codec = 'h264';  // MCU likely has H.264 hardware

  // No simulcast/SVC needed (server creates layers)
  enableSimulcast = false;
  enableSVC = false;

  // High quality upload (server will downscale)
  resolution = '1920x1080';
  framerate = 30;
  bitrate = Math.min(availableBandwidth * 0.8, 3000);
}
```

### 9.4 Hybrid P2P/SFU Optimization

**Strategy:**
```typescript
function selectArchitecture(participantCount: number) {
  if (participantCount <= 2) {
    return 'p2p';  // Direct connection
  } else if (participantCount <= 4) {
    // Conditional: P2P mesh or SFU
    if (allParticipantsHighBandwidth()) {
      return 'p2p-mesh';  // Full mesh (N² connections)
    } else {
      return 'sfu';  // Use server
    }
  } else {
    return 'sfu';  // Always use SFU for 5+
  }
}

// Optimize per architecture
if (arch === 'p2p-mesh') {
  // Each peer sends to N-1 others
  const uploadBandwidth = availableBandwidth / (participantCount - 1);
  targetBitrate = uploadBandwidth * 0.8;  // Leave margin

  // Disable simulcast (bandwidth intensive)
  enableSimulcast = false;
  enableSVC = false;
}
```

### 9.5 Current Implementation Analysis

**Current Logic:**
```typescript
if (callType === 'conference' && network.bandwidth < 2000) {
  // Use H.264 for poor network
  codec = 'h264';
}

if (callType === 'p2p' && network.bandwidth > 5000) {
  // Use AV1 for high bandwidth P2P
  codec = 'av1';
}

// Simulcast: Only for conference, not H.264
enableSimulcast = (callType === 'conference') && (codec !== 'h264');
```

**Issues:**
1. No participant count consideration
2. **Bug:** Disables simulcast for H.264 (should enable!)
3. No architecture detection (SFU vs MCU vs P2P mesh)
4. Fixed bandwidth thresholds (not adaptive)
5. No consideration of receiver capabilities
6. Missing hybrid P2P/SFU strategy
7. Doesn't adjust resolution/framerate for large conferences

### 9.6 Best Practices Summary

1. **P2P (1-1):**
   - No simulcast/SVC (wasteful)
   - Prioritize quality and battery life
   - Codec: Hardware-accelerated preferred

2. **Small SFU (3-5):**
   - Simulcast OR SVC (based on codec)
   - Moderate quality settings
   - Balance sender/receiver constraints

3. **Medium SFU (6-15):**
   - Simulcast recommended
   - Limit sender bitrate (0.7× bandwidth)
   - Consider VP9/AV1 for bandwidth savings

4. **Large SFU (15+):**
   - Simulcast essential
   - Aggressive bitrate limits (0.6× bandwidth)
   - H.264 for compatibility
   - Default to 720p @ 24fps

5. **MCU:**
   - No simulcast/SVC
   - High quality upload
   - Let server handle adaptation

---

## 10. Audio Codec Selection

### 10.1 Opus Codec Configuration

**Opus Characteristics:**
- Bitrate range: 6 kbps to 510 kbps
- Sample rates: 8 kHz to 48 kHz (48 kHz recommended)
- Frame sizes: 2.5ms to 60ms (20ms standard)
- Modes: SILK (voice), CELT (music), Hybrid
- Channels: Mono or stereo

**WebRTC Opus Defaults:**
```javascript
{
  mimeType: 'audio/opus',
  clockRate: 48000,
  channels: 2,
  sdpFmtpLine: 'minptime=10;useinbandfec=1'
}
```

### 10.2 DTX (Discontinuous Transmission)

**Definition:**
- Stops sending packets when audio silent
- Reduces bandwidth during silence
- Saves 50-70% bandwidth in typical conversations

**Configuration:**
```javascript
// Enable DTX
const audioParams = {
  codecs: [{
    mimeType: 'audio/opus',
    sdpFmtpLine: 'usedtx=1;useinbandfec=1'
  }]
};
```

**WebRTC Implementation:**
- DTX enabled only in SILK/Hybrid mode (voice)
- CELT mode (music) keeps stream active
- Requires bitrate: Set via `maxBitrate` parameter

**Best Practices:**
1. **Enable for conferences:** Reduces aggregate bandwidth (N participants, ~60% silent)
2. **Disable for music:** Causes quality issues
3. **Combine with VAD:** Voice Activity Detection for better silence detection

### 10.3 FEC (Forward Error Correction)

**Definition:**
- Embeds redundant data in bitstream
- Allows recovery of lost packets
- Opus-specific: In-band FEC (previous packet N-1 in packet N)

**Configuration:**
```javascript
{
  mimeType: 'audio/opus',
  sdpFmtpLine: 'useinbandfec=1'  // Enable FEC
}
```

**FEC Threshold:**
- Activated at bitrate ≥ 12,400 bps
- Below 12.4 kbps: No FEC data included
- Trade-off: +20-25% bitrate overhead for packet loss recovery

**Best Practices:**
1. **Enable for unreliable networks:** Packet loss > 2%
2. **Combine with NACK:** FEC recovers, NACK requests retransmission
3. **Bitrate consideration:** Ensure bitrate ≥ 12.4 kbps
4. **Disable for very low bandwidth:** When bitrate < 12 kbps (FEC won't work anyway)

### 10.4 RED (Redundant Audio Data)

**Definition:**
- Sends duplicate/redundant audio data
- Separate mechanism from Opus in-band FEC
- RFC 2198 redundancy encoding

**Configuration:**
```javascript
// Enable RED for audio
const audioCodecs = [
  { mimeType: 'audio/red', clockRate: 48000 },
  { mimeType: 'audio/opus', clockRate: 48000 }
];
```

**RED vs FEC:**
- RED: Sends duplicate frames (100% overhead)
- FEC: Sends compressed redundancy (20-25% overhead)
- Use RED when packet loss > 5% and bandwidth allows

**Best Practices:**
1. **High packet loss scenarios:** Packet loss > 5%
2. **Sufficient bandwidth:** Doubles audio bitrate
3. **Combine with FEC:** Layered redundancy (FEC → RED → NACK)
4. **Monitor overhead:** RED + FEC = significant bandwidth increase

### 10.5 Bitrate Configuration

**Recommended Bitrate by Use Case:**

```javascript
const opusBitrates = {
  narrowband_voice: 16000,      // 16 kbps - Phone quality
  wideband_voice: 24000,        // 24 kbps - VoIP quality
  superwideband_voice: 32000,   // 32 kbps - HD voice
  fullband_voice: 48000,        // 48 kbps - Studio voice
  music_mono: 64000,            // 64 kbps - Music mono
  music_stereo: 128000          // 128 kbps - Music stereo
};

// WebRTC default: 32 kbps (superwideband voice)
```

**Dynamic Bitrate Adjustment:**
```typescript
function selectOpusBitrate(
  callType: 'p2p' | 'conference',
  participantCount: number,
  networkQuality: NetworkQuality,
  isMusic: boolean
): number {

  if (isMusic) {
    // Music: Higher bitrate, disable DTX
    return networkQuality.bandwidth > 3000 ? 128000 : 64000;
  }

  // Voice communication
  if (callType === 'p2p') {
    // P2P: Can afford higher quality
    if (networkQuality.bandwidth > 5000) return 48000;  // Fullband
    if (networkQuality.bandwidth > 2000) return 32000;  // Superwideband
    return 24000;  // Wideband
  }

  // Conference: Optimize for aggregate bandwidth
  if (participantCount > 10) {
    return 16000;  // Narrowband (save bandwidth)
  }

  if (networkQuality.bandwidth > 3000) {
    return 32000;  // Superwideband
  }

  return 24000;  // Wideband
}
```

### 10.6 Adaptive Jitter Buffer

**NetEQ (Chrome's Jitter Buffer):**
- Histogram-based adaptive buffer
- Targets 95th percentile of arrival intervals
- Forgetting factor for adapting to changes
- Automatic delay adjustment

**Monitoring:**
```javascript
// Get jitter buffer stats
const stats = await pc.getStats();
stats.forEach(report => {
  if (report.type === 'inbound-rtp' && report.kind === 'audio') {
    console.log('Jitter:', report.jitter);
    console.log('Jitter buffer delay:', report.jitterBufferDelay);
    console.log('Jitter buffer emitted count:', report.jitterBufferEmittedCount);
  }
});

// Calculate average jitter buffer delay
const avgJitterDelay = report.jitterBufferDelay / report.jitterBufferEmittedCount;
```

### 10.7 Packet Loss Concealment (PLC)

**Opus PLC:**
- Built-in packet loss concealment
- Generates plausible audio for lost packets
- Works without FEC
- Most effective for losses < 5%

**Layered Recovery Strategy:**
```
Packet Loss < 2%:
  → PLC only (built-in, no overhead)

Packet Loss 2-5%:
  → FEC + PLC (20% overhead)

Packet Loss 5-10%:
  → RED + FEC + PLC (100% overhead)

Packet Loss > 10%:
  → NACK + RED + FEC + PLC (request retransmission)
```

### 10.8 Current Implementation Analysis

**Current Audio Selection:**
```typescript
private static readonly AUDIO_CODEC_PRIORITY = ['opus', 'g722', 'pcmu'];

private static selectAudioCodec(caps: ClientCapabilities): string {
  for (const codec of this.AUDIO_CODEC_PRIORITY) {
    const found = caps.audio.codecs.find(c =>
      c.mimeType.toLowerCase().includes(codec)
    );
    if (found) {
      console.log(`🔊 Selected audio codec: ${codec}`);
      return codec;
    }
  }

  // Fallback
  return 'opus';
}
```

**Issues:**
1. **No Configuration:** Doesn't configure Opus parameters (DTX, FEC, bitrate)
2. **No Network Awareness:** Doesn't adjust based on network quality
3. **No Use Case Optimization:** Same config for P2P and conference
4. **Missing RED:** Doesn't enable redundancy for high packet loss
5. **No NACK Configuration:** Doesn't tune retransmission behavior
6. **G.722 Priority:** G.722 is inferior to Opus (should remove or lower priority)
7. **No Stereo/Mono Selection:** Doesn't optimize channel count

**Should Return Full Configuration:**
```typescript
interface AudioCodecConfig {
  codec: string;
  bitrate: number;
  dtx: boolean;
  fec: boolean;
  red: boolean;
  channels: 1 | 2;
  nackEnabled: boolean;
  sdpFmtpLine: string;
}
```

### 10.9 Best Practices Summary

1. **Always Use Opus:** Mandatory codec, superior to alternatives
2. **Enable DTX for Conferences:** 50-70% bandwidth savings
3. **Enable FEC for Unreliable Networks:** Packet loss > 2%
4. **Bitrate Adaptation:**
   - P2P: 32-48 kbps
   - Small conference: 24-32 kbps
   - Large conference: 16-24 kbps
   - Music: 64-128 kbps
5. **Disable DTX for Music:** Use CELT mode, higher bitrate
6. **RED for High Loss:** Packet loss > 5%, if bandwidth allows
7. **Monitor Jitter Buffer:** Ensure adaptive buffering working correctly
8. **Layered Recovery:** PLC → FEC → RED → NACK

---

## 11. Recommended Improvements

Based on comprehensive research, here are **20 specific improvements** for the CodecSelector implementation, categorized by priority:

---

### MUST-HAVE IMPROVEMENTS (Critical)

#### 1. Fix Simulcast H.264 Bug
**Current Issue:**
```typescript
if (videoCodec === 'h264') {
  return false;  // BUG: Disables simulcast for H.264
}
```

**Fix:**
```typescript
if (videoCodec === 'h264') {
  return true;  // H.264 conferences MUST use simulcast (no SVC support)
}
```

**Reasoning:** H.264 doesn't support SVC, so simulcast is the ONLY multi-layer option. This is a critical bug affecting all H.264 conferences.

**Priority:** MUST-HAVE (Critical Bug)
**Impact:** High - Affects all Safari users and mobile devices
**Effort:** Minimal (1-line fix)

---

#### 2. Add Platform-Specific Codec Selection
**Implementation:**
```typescript
private static selectVideoCodec(
  caps: ClientCapabilities,
  network: NetworkQuality,
  callType: string,
  userPreference?: string
): string {
  const platform = this.detectPlatform(caps.browser);

  // iOS: H.264 only (all browsers use WebKit)
  if (platform.isIOS) {
    console.log('📺 iOS detected: forcing H.264');
    return 'h264';
  }

  // Android: Prefer hardware-accelerated codec
  if (platform.isAndroid) {
    const hwCodecs = this.getHardwareCodecs(caps);
    if (hwCodecs.length > 0) {
      console.log(`📺 Android HW codec: ${hwCodecs[0]}`);
      return hwCodecs[0];
    }
  }

  // Desktop: Follow standard priority
  // ... existing logic
}

private static detectPlatform(browser: ClientCapabilities['browser']) {
  const ua = navigator.userAgent;
  return {
    isIOS: /iPhone|iPad|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isDesktop: !(/iPhone|iPad|iPod|Android/.test(ua)),
    isSafari: browser.name === 'Safari',
    isChrome: browser.name === 'Chrome',
    isFirefox: browser.name === 'Firefox'
  };
}
```

**Reasoning:** Platform differences are critical for codec selection (iOS only supports H.264 reliably).

**Priority:** MUST-HAVE
**Impact:** High - Ensures compatibility across all platforms
**Effort:** Medium (requires platform detection logic)
**References:**
- Safari enforces H.264-first strategy
- iOS browsers all use WebKit engine

---

#### 3. Implement Hardware Acceleration Detection
**Implementation:**
```typescript
interface HardwareAcceleration {
  available: boolean;
  codecs: {
    h264: { encode: boolean; decode: boolean };
    vp8: { encode: boolean; decode: boolean };
    vp9: { encode: boolean; decode: boolean };
    av1: { encode: boolean; decode: boolean };
  };
}

private static async detectHardwareAcceleration(): Promise<HardwareAcceleration> {
  const hwAccel: HardwareAcceleration = {
    available: false,
    codecs: {
      h264: { encode: false, decode: false },
      vp8: { encode: false, decode: false },
      vp9: { encode: false, decode: false },
      av1: { encode: false, decode: false }
    }
  };

  if (!('VideoEncoder' in window)) {
    return hwAccel;
  }

  // Test each codec
  const codecs = ['avc1.42E01F', 'vp8', 'vp09.00.10.08', 'av01.0.05M.08'];

  for (const codec of codecs) {
    try {
      const encoder = new (window as any).VideoEncoder({
        output: () => {},
        error: () => {}
      });

      const config = {
        codec,
        width: 1280,
        height: 720,
        bitrate: 2000000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware'
      };

      const support = await encoder.isConfigSupported(config);

      if (support.supported) {
        const codecName = this.getCodecName(codec);
        hwAccel.codecs[codecName].encode = true;
        hwAccel.available = true;
      }

      encoder.close();
    } catch (err) {
      console.log(`HW accel test failed for ${codec}:`, err);
    }
  }

  return hwAccel;
}
```

**Reasoning:** Hardware acceleration dramatically impacts battery life and CPU usage, especially on mobile.

**Priority:** MUST-HAVE
**Impact:** High - 2-3× battery life improvement on mobile
**Effort:** Medium (WebCodecs API)
**References:**
- Hardware H.264 allows better battery life
- VP8 has no hardware support on iOS

---

#### 4. Add Participant Count to Decision Logic
**Implementation:**
```typescript
export interface CallContext {
  callType: 'p2p' | 'conference';
  participantCount: number;
  architecture: 'p2p' | 'sfu' | 'mcu' | 'p2p-mesh';
}

static selectOptimalCodecs(
  clientCapabilities: ClientCapabilities,
  networkQuality: NetworkQuality,
  callContext: CallContext,  // Changed from callType string
  userPreference?: { videoCodec?: string; resolution?: string }
): CodecConfiguration {

  const participantCount = callContext.participantCount;

  // Auto-detect architecture for small groups
  if (participantCount <= 2) {
    callContext.architecture = 'p2p';
  } else if (participantCount <= 4 && this.allHighBandwidth(networkQuality)) {
    callContext.architecture = 'p2p-mesh';
  } else {
    callContext.architecture = 'sfu';
  }

  // Adjust quality based on participant count
  let qualityConstraints = {
    maxResolution: '1920x1080',
    maxFramerate: 30,
    maxBitrate: 3000
  };

  if (participantCount > 15) {
    qualityConstraints = {
      maxResolution: '1280x720',
      maxFramerate: 24,
      maxBitrate: 1500
    };
  } else if (participantCount > 5) {
    qualityConstraints = {
      maxResolution: '1920x1080',
      maxFramerate: 30,
      maxBitrate: 2000
    };
  }

  // ... rest of selection logic with qualityConstraints
}
```

**Reasoning:** Conference size drastically affects optimal settings (bandwidth, simulcast layers, codec choice).

**Priority:** MUST-HAVE
**Impact:** High - Prevents bandwidth overload in large conferences
**Effort:** Medium (refactor function signature)
**References:**
- Large conferences require aggressive bitrate limits
- P2P mesh only viable for 2-4 participants

---

#### 5. Prevent Simultaneous Simulcast + SVC
**Implementation:**
```typescript
private static selectMultiLayerStrategy(
  videoCodec: string,
  callContext: CallContext,
  network: NetworkQuality,
  hwAccel: HardwareAcceleration
): { enableSimulcast: boolean; enableSVC: boolean; scalabilityMode?: string } {

  // H.264: Must use simulcast (no SVC support)
  if (videoCodec === 'h264' && callContext.participantCount >= 3) {
    return {
      enableSimulcast: true,
      enableSVC: false,
      scalabilityMode: undefined
    };
  }

  // VP9/AV1: Choose SVC or simulcast (NOT BOTH)
  if (['vp9', 'av1'].includes(videoCodec) && callContext.participantCount >= 3) {
    // Prefer SVC for:
    // - Small/medium conferences (< 15 participants)
    // - Low sender CPU
    // - Unstable network
    const preferSVC = (
      callContext.participantCount < 15 ||
      network.bandwidth < 3000 ||
      network.packetLoss > 3
    );

    if (preferSVC) {
      return {
        enableSimulcast: false,
        enableSVC: true,
        scalabilityMode: this.selectScalabilityMode(videoCodec, callContext, network)
      };
    } else {
      // Large conference or stable network: simulcast
      return {
        enableSimulcast: true,
        enableSVC: false,
        scalabilityMode: undefined
      };
    }
  }

  // P2P or single participant: No multi-layer
  return {
    enableSimulcast: false,
    enableSVC: false,
    scalabilityMode: undefined
  };
}
```

**Reasoning:** Enabling both simulcast and SVC is wasteful and contradictory.

**Priority:** MUST-HAVE
**Impact:** High - Prevents wasting CPU/bandwidth
**Effort:** Medium (refactor decision logic)
**References:**
- Simulcast vs SVC are alternative strategies, not complementary

---

#### 6. Add Opus Configuration Support
**Implementation:**
```typescript
export interface AudioCodecConfiguration {
  codec: string;
  bitrate: number;
  dtx: boolean;  // Discontinuous Transmission
  fec: boolean;  // Forward Error Correction
  red: boolean;  // Redundant Audio Data
  channels: 1 | 2;
  sdpFmtpLine: string;
}

export interface CodecConfiguration {
  videoCodec: string;
  audioCodec: string;
  audioConfig: AudioCodecConfiguration;  // NEW
  // ... existing fields
}

private static selectAudioCodecConfig(
  callContext: CallContext,
  network: NetworkQuality,
  isMusic: boolean = false
): AudioCodecConfiguration {

  // Determine bitrate
  let bitrate = 32000;  // Default: 32 kbps superwideband

  if (isMusic) {
    bitrate = network.bandwidth > 3000 ? 128000 : 64000;
  } else if (callContext.callType === 'conference' && callContext.participantCount > 10) {
    bitrate = 16000;  // Narrowband for large conferences
  } else if (callContext.callType === 'p2p' && network.bandwidth > 5000) {
    bitrate = 48000;  // Fullband for high-quality P2P
  }

  // DTX: Enable for conferences (voice only)
  const dtx = callContext.callType === 'conference' && !isMusic;

  // FEC: Enable for packet loss > 2%
  const fec = network.packetLoss > 2;

  // RED: Enable for high packet loss > 5%
  const red = network.packetLoss > 5 && network.bandwidth > 1000;

  // Channels: Stereo for music, mono for voice
  const channels = isMusic ? 2 : 1;

  // Build SDP fmtp line
  const params: string[] = [
    'minptime=10',
    `maxaveragebitrate=${bitrate}`,
    fec ? 'useinbandfec=1' : 'useinbandfec=0',
    dtx ? 'usedtx=1' : 'usedtx=0'
  ];

  return {
    codec: 'opus',
    bitrate,
    dtx,
    fec,
    red,
    channels,
    sdpFmtpLine: params.join(';')
  };
}
```

**Reasoning:** Opus configuration significantly impacts audio quality and bandwidth efficiency.

**Priority:** MUST-HAVE
**Impact:** High - 50-70% bandwidth savings with DTX in conferences
**Effort:** Medium (add audio config logic)
**References:**
- DTX saves 50-70% bandwidth in conferences
- FEC requires bitrate ≥ 12.4 kbps
- RED doubles bitrate but helps with high packet loss

---

### SHOULD-HAVE IMPROVEMENTS (High Priority)

#### 7. Implement Dynamic Scalability Mode Selection
**Implementation:**
```typescript
private static selectScalabilityMode(
  videoCodec: string,
  callContext: CallContext,
  network: NetworkQuality
): string {

  if (videoCodec === 'av1') {
    // AV1 scalability modes
    if (callContext.participantCount > 10) {
      return 'L3T3';  // Large conference: 3 spatial × 3 temporal
    } else if (callContext.participantCount > 5) {
      return 'L2T2';  // Medium conference: 2 spatial × 2 temporal
    } else if (network.bandwidth < 2000) {
      return 'L1T2';  // Poor network: temporal only
    } else {
      return 'L2T2';  // Balanced default
    }
  }

  if (videoCodec === 'vp9') {
    // VP9 scalability modes (more limited than AV1)
    if (callContext.participantCount > 10) {
      return 'L3T3';  // Large conference (if supported)
    } else if (callContext.participantCount > 5) {
      return 'L2T2';  // Medium conference
    } else if (network.bandwidth < 2000) {
      return 'L1T2';  // Poor network: temporal only
    } else {
      return 'L2T1';  // Balanced default (lower overhead than L2T2)
    }
  }

  return undefined;
}
```

**Reasoning:** Fixed scalability modes (L2T2 for AV1, L2T1 for VP9) don't adapt to conference size or network conditions.

**Priority:** SHOULD-HAVE
**Impact:** Medium - Better SFU layer selection
**Effort:** Low (extend existing logic)
**References:**
- L3T3 optimal for large conferences (9 decode targets)
- L1T2 minimal overhead for poor networks

---

#### 8. Add Trend-Based Network Adaptation
**Implementation:**
```typescript
interface NetworkHistory {
  bandwidth: number[];
  packetLoss: number[];
  rtt: number[];
  jitter: number[];
  timestamps: number[];
}

class NetworkMonitor {
  private history: NetworkHistory = {
    bandwidth: [],
    packetLoss: [],
    rtt: [],
    jitter: [],
    timestamps: []
  };

  private readonly HISTORY_WINDOW_MS = 30000;  // 30 seconds

  addSample(stats: NetworkQuality) {
    const now = Date.now();

    this.history.bandwidth.push(stats.bandwidth);
    this.history.packetLoss.push(stats.packetLoss);
    this.history.rtt.push(stats.rtt);
    this.history.jitter.push(stats.jitter);
    this.history.timestamps.push(now);

    // Remove old samples
    const cutoff = now - this.HISTORY_WINDOW_MS;
    while (this.history.timestamps[0] < cutoff) {
      this.history.bandwidth.shift();
      this.history.packetLoss.shift();
      this.history.rtt.shift();
      this.history.jitter.shift();
      this.history.timestamps.shift();
    }
  }

  getTrend(metric: keyof NetworkHistory): 'improving' | 'stable' | 'degrading' {
    const values = this.history[metric] as number[];

    if (values.length < 5) return 'stable';

    // Calculate moving averages
    const recentAvg = this.average(values.slice(-5));
    const olderAvg = this.average(values.slice(0, Math.max(1, values.length - 5)));

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    // For bandwidth: increase = improving
    // For packetLoss/RTT/jitter: increase = degrading
    const isImproving = (metric === 'bandwidth' && percentChange > 10) ||
                        (metric !== 'bandwidth' && percentChange < -10);

    const isDegrading = (metric === 'bandwidth' && percentChange < -10) ||
                        (metric !== 'bandwidth' && percentChange > 10);

    if (isImproving) return 'improving';
    if (isDegrading) return 'degrading';
    return 'stable';
  }

  private average(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

// Usage in adaptCodecConfig
static adaptCodecConfig(
  currentConfig: CodecConfiguration,
  networkStats: NetworkQuality,
  capabilities: ClientCapabilities,
  monitor: NetworkMonitor  // NEW
): CodecConfiguration {

  monitor.addSample(networkStats);

  const bandwidthTrend = monitor.getTrend('bandwidth');
  const lossTraend = monitor.getTrend('packetLoss');

  // Only adapt if trend is sustained
  if (bandwidthTrend === 'degrading' && lossTraend === 'degrading') {
    // Network degrading: reduce quality
    return this.downgradeQuality(currentConfig, networkStats);
  }

  if (bandwidthTrend === 'improving' && networkStats.bandwidth > 5000) {
    // Network improved: upgrade quality (with hysteresis)
    return this.upgradeQuality(currentConfig, networkStats);
  }

  return currentConfig;
}
```

**Reasoning:** Current implementation reacts to single data points, causing rapid switching. Trend analysis provides stability.

**Priority:** SHOULD-HAVE
**Impact:** Medium - Prevents quality oscillation
**Effort:** Medium (add history tracking)
**References:**
- Hysteresis prevents rapid switching
- Trend detection more reliable than point-in-time

---

#### 9. Add Quality Limitation Reason Detection
**Implementation:**
```typescript
interface WebRTCStats {
  qualityLimitationReason: 'none' | 'cpu' | 'bandwidth' | 'other';
  totalEncodeTime: number;
  framesEncoded: number;
  packetsSent: number;
  bytesSent: number;
}

private static async getQualityLimitationReason(
  pc: RTCPeerConnection
): Promise<'none' | 'cpu' | 'bandwidth' | 'other'> {

  const stats = await pc.getStats();

  for (const report of stats.values()) {
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      return report.qualityLimitationReason || 'none';
    }
  }

  return 'none';
}

static async adaptCodecConfigAdvanced(
  currentConfig: CodecConfiguration,
  pc: RTCPeerConnection,
  capabilities: ClientCapabilities
): Promise<CodecConfiguration> {

  const qualityReason = await this.getQualityLimitationReason(pc);

  if (qualityReason === 'cpu') {
    console.log('⚠️ CPU limitation detected, reducing encoding complexity...');

    // Option 1: Reduce resolution
    if (currentConfig.resolution === '1920x1080') {
      return { ...currentConfig, resolution: '1280x720' };
    }

    // Option 2: Reduce framerate
    if (currentConfig.framerate === 30) {
      return { ...currentConfig, framerate: 24 };
    }

    // Option 3: Switch to lighter codec
    if (currentConfig.videoCodec === 'av1') {
      return { ...currentConfig, videoCodec: 'vp9' };
    }
    if (currentConfig.videoCodec === 'vp9') {
      return { ...currentConfig, videoCodec: 'h264' };
    }

    // Option 4: Disable SVC (reduce encode overhead)
    if (currentConfig.enableSVC) {
      return { ...currentConfig, enableSVC: false };
    }
  }

  if (qualityReason === 'bandwidth') {
    console.log('⚠️ Bandwidth limitation detected, reducing bitrate...');

    // Reduce target bitrate by 20%
    const newBitrate = Math.round(currentConfig.bitrate * 0.8);
    return { ...currentConfig, bitrate: newBitrate };
  }

  return currentConfig;
}
```

**Reasoning:** WebRTC provides explicit quality limitation reasons, which are more reliable than manual bandwidth detection.

**Priority:** SHOULD-HAVE
**Impact:** Medium - More precise adaptation
**Effort:** Medium (integrate with getStats)
**References:**
- qualityLimitationReason is official WebRTC stat
- Distinguishes CPU vs bandwidth constraints

---

#### 10. Implement Content-Aware Bitrate Estimation
**Implementation:**
```typescript
private static estimateBitrateContentAware(
  codec: string,
  resolution: { width: number; height: number },
  framerate: number,
  contentHint: 'motion' | 'detail' | 'text' | undefined,
  availableBandwidth: number
): number {

  // Pixels per second
  const pixelsPerSec = resolution.width * resolution.height * framerate;

  // Bits per pixel based on codec and content type
  const bitsPerPixel: Record<string, Record<string, number>> = {
    motion: { h264: 0.10, vp9: 0.07, av1: 0.05, vp8: 0.12 },
    detail: { h264: 0.15, vp9: 0.10, av1: 0.08, vp8: 0.18 },
    text:   { h264: 0.08, vp9: 0.05, av1: 0.04, vp8: 0.10 },
    default: { h264: 0.12, vp9: 0.08, av1: 0.06, vp8: 0.14 }
  };

  const hint = contentHint || 'default';
  const bpp = bitsPerPixel[hint]?.[codec] || 0.10;

  // Calculate target bitrate in kbps
  const targetBitrate = (pixelsPerSec * bpp) / 1000;

  // Apply bandwidth constraint with adaptive margin
  let margin = 0.85;  // Default: 85% of available bandwidth

  if (hint === 'text') {
    margin = 0.90;  // Screen sharing: less motion, more predictable
  } else if (hint === 'motion') {
    margin = 0.80;  // High motion: leave more margin for spikes
  }

  const maxBitrate = availableBandwidth * margin;

  return Math.round(Math.min(targetBitrate, maxBitrate));
}
```

**Reasoning:** Current linear scaling (resolution multipliers) less accurate than bits-per-pixel approach.

**Priority:** SHOULD-HAVE
**Impact:** Medium - More accurate bitrate estimation
**Effort:** Medium (refactor bitrate calculation)
**References:**
- Bits per pixel varies by content type
- Screen sharing needs different bitrate than video call

---

#### 11. Add Browser Version-Aware Codec Support
**Implementation:**
```typescript
interface BrowserCapabilities {
  name: string;
  version: number;
  os: string;
  supportsAV1: boolean;
  supportsVP9: boolean;
  supportsH264High: boolean;
  supportsHEVC: boolean;
  supportsSVC: boolean;
  supportsSimulcast: boolean;
  supportsTWCC: boolean;
}

private static getBrowserCapabilities(): BrowserCapabilities {
  const ua = navigator.userAgent;

  let name = 'Unknown';
  let version = 0;

  // Chrome/Edge
  if (/Chrome\/(\d+)/.test(ua) || /Edg\/(\d+)/.test(ua)) {
    name = /Edg/.test(ua) ? 'Edge' : 'Chrome';
    version = parseInt(RegExp.$1);
  }
  // Firefox
  else if (/Firefox\/(\d+)/.test(ua)) {
    name = 'Firefox';
    version = parseInt(RegExp.$1);
  }
  // Safari
  else if (/Version\/(\d+).*Safari/.test(ua)) {
    name = 'Safari';
    version = parseInt(RegExp.$1);
  }

  const os = this.detectOS(ua);

  return {
    name,
    version,
    os,
    // Chrome M120+ has production AV1
    supportsAV1: (name === 'Chrome' && version >= 120) ||
                 (name === 'Edge' && version >= 120),
    // Safari 17+ has VP9
    supportsVP9: (name === 'Safari' && version >= 17) ||
                 !['Safari'].includes(name),
    // Chrome/Safari support H.264 High Profile
    supportsH264High: ['Chrome', 'Safari', 'Edge'].includes(name),
    // Chrome 136+ has H.265
    supportsHEVC: (name === 'Chrome' && version >= 136) ||
                  (name === 'Safari'),  // Safari always supports HEVC
    // Chrome/Firefox support SVC
    supportsSVC: ['Chrome', 'Edge', 'Firefox'].includes(name) &&
                 !(os === 'iOS'),  // Not on iOS WebKit
    // All modern browsers support simulcast
    supportsSimulcast: true,
    // Chrome/Firefox support TWCC
    supportsTWCC: ['Chrome', 'Edge', 'Firefox'].includes(name)
  };
}

private static selectVideoCodecVersionAware(
  caps: ClientCapabilities,
  network: NetworkQuality,
  browserCaps: BrowserCapabilities
): string {

  // iOS: Force H.264
  if (browserCaps.os === 'iOS') {
    return 'h264';
  }

  // Chrome M120+: AV1 available for high bandwidth
  if (browserCaps.supportsAV1 && network.bandwidth > 5000) {
    return 'av1';
  }

  // Safari 17+: Can use VP9
  if (browserCaps.name === 'Safari' && browserCaps.version >= 17 &&
      network.bandwidth > 3000) {
    return 'vp9';
  }

  // Fallback to H.264
  return 'h264';
}
```

**Reasoning:** Codec support varies significantly by browser version (e.g., Safari 17+ added VP9, Chrome 120+ production AV1).

**Priority:** SHOULD-HAVE
**Impact:** Medium - Better codec selection for newer browsers
**Effort:** Medium (version detection logic)
**References:**
- Safari 17+ supports VP9
- Chrome M120+ has production-ready AV1
- Chrome 136+ supports H.265

---

#### 12. Add Graceful Quality Degradation
**Implementation:**
```typescript
interface QualityLevel {
  resolution: string;
  framerate: number;
  bitrate: number;
  codec: string;
  level: number;  // 0 = best, higher = lower quality
}

private static readonly QUALITY_LADDER: QualityLevel[] = [
  // Level 0: Best quality
  { resolution: '1920x1080', framerate: 30, bitrate: 3000, codec: 'av1', level: 0 },
  { resolution: '1920x1080', framerate: 30, bitrate: 3000, codec: 'vp9', level: 1 },
  { resolution: '1920x1080', framerate: 30, bitrate: 3000, codec: 'h264', level: 2 },

  // Level 3: Reduce framerate
  { resolution: '1920x1080', framerate: 24, bitrate: 2500, codec: 'h264', level: 3 },

  // Level 4: 720p
  { resolution: '1280x720', framerate: 30, bitrate: 1500, codec: 'h264', level: 4 },
  { resolution: '1280x720', framerate: 24, bitrate: 1200, codec: 'h264', level: 5 },

  // Level 6: 480p
  { resolution: '640x480', framerate: 30, bitrate: 800, codec: 'h264', level: 6 },
  { resolution: '640x480', framerate: 24, bitrate: 600, codec: 'h264', level: 7 },
  { resolution: '640x480', framerate: 15, bitrate: 400, codec: 'h264', level: 8 },

  // Level 9: 240p (minimum)
  { resolution: '320x240', framerate: 15, bitrate: 200, codec: 'h264', level: 9 }
];

private static degradeQuality(
  currentConfig: CodecConfiguration,
  steps: number = 1
): CodecConfiguration {

  // Find current level
  let currentLevel = this.QUALITY_LADDER.findIndex(q =>
    q.resolution === currentConfig.resolution &&
    q.framerate === currentConfig.framerate &&
    q.codec === currentConfig.videoCodec
  );

  if (currentLevel === -1) {
    currentLevel = 2;  // Default to level 2 (1080p H.264)
  }

  // Move down quality ladder
  const newLevel = Math.min(
    currentLevel + steps,
    this.QUALITY_LADDER.length - 1
  );

  const newQuality = this.QUALITY_LADDER[newLevel];

  console.log(`⬇️ Degrading quality: Level ${currentLevel} → ${newLevel}`);

  return {
    ...currentConfig,
    videoCodec: newQuality.codec,
    resolution: newQuality.resolution,
    framerate: newQuality.framerate,
    bitrate: newQuality.bitrate
  };
}

private static upgradeQuality(
  currentConfig: CodecConfiguration,
  steps: number = 1
): CodecConfiguration {

  // Find current level
  let currentLevel = this.QUALITY_LADDER.findIndex(q =>
    q.resolution === currentConfig.resolution &&
    q.framerate === currentConfig.framerate &&
    q.codec === currentConfig.videoCodec
  );

  if (currentLevel === -1) return currentConfig;

  // Move up quality ladder (with hysteresis)
  const newLevel = Math.max(currentLevel - steps, 0);

  const newQuality = this.QUALITY_LADDER[newLevel];

  console.log(`⬆️ Upgrading quality: Level ${currentLevel} → ${newLevel}`);

  return {
    ...currentConfig,
    videoCodec: newQuality.codec,
    resolution: newQuality.resolution,
    framerate: newQuality.framerate,
    bitrate: newQuality.bitrate
  };
}
```

**Reasoning:** Current adaptation jumps directly between codec/resolution. Gradual degradation provides better user experience.

**Priority:** SHOULD-HAVE
**Impact:** Medium - Smoother quality transitions
**Effort:** Medium (define quality ladder)
**References:**
- Gradual adaptation better than abrupt changes
- Quality ladder provides predictable steps

---

#### 13. Add Screen Sharing Optimization
**Implementation:**
```typescript
interface ScreenShareConfig {
  isScreenShare: boolean;
  contentType: 'presentation' | 'video' | 'mixed';
}

private static selectScreenShareSettings(
  contentType: 'presentation' | 'video' | 'mixed',
  network: NetworkQuality
): Partial<CodecConfiguration> {

  if (contentType === 'presentation') {
    // Presentation: High resolution, low framerate, optimize for text
    return {
      resolution: '1920x1080',
      framerate: 10,  // 10 FPS sufficient for slides
      bitrate: this.estimateBitrateContentAware(
        'h264',
        { width: 1920, height: 1080 },
        10,
        'text',
        network.bandwidth
      )
    };
  }

  if (contentType === 'video') {
    // Video sharing: Medium resolution, higher framerate
    return {
      resolution: '1280x720',
      framerate: 24,  // 24 FPS for video playback
      bitrate: this.estimateBitrateContentAware(
        'h264',
        { width: 1280, height: 720 },
        24,
        'motion',
        network.bandwidth
      )
    };
  }

  // Mixed content: Balanced settings
  return {
    resolution: '1920x1080',
    framerate: 15,
    bitrate: this.estimateBitrateContentAware(
      'h264',
      { width: 1920, height: 1080 },
      15,
      'detail',
      network.bandwidth
    )
  };
}

// Usage
static selectOptimalCodecs(
  clientCapabilities: ClientCapabilities,
  networkQuality: NetworkQuality,
  callContext: CallContext,
  screenShare?: ScreenShareConfig,  // NEW
  userPreference?: { videoCodec?: string; resolution?: string }
): CodecConfiguration {

  // ... existing logic

  // Override for screen sharing
  if (screenShare?.isScreenShare) {
    const screenSettings = this.selectScreenShareSettings(
      screenShare.contentType,
      networkQuality
    );

    return {
      ...config,
      ...screenSettings
    };
  }

  return config;
}
```

**Reasoning:** Screen sharing has different requirements (lower FPS, higher resolution, text optimization).

**Priority:** SHOULD-HAVE
**Impact:** Medium - Better screen sharing quality
**Effort:** Medium (add screen share detection)
**References:**
- Screen sharing: 10-15 FPS sufficient, saves bandwidth
- contentHint: 'detail' or 'text' for screen sharing

---

#### 14. Add Battery-Aware Codec Selection
**Implementation:**
```typescript
interface DeviceStatus {
  batteryLevel: number;  // 0-100
  isCharging: boolean;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
}

private static async getDeviceStatus(): Promise<DeviceStatus> {
  const status: DeviceStatus = {
    batteryLevel: 100,
    isCharging: true,
    thermalState: 'nominal'
  };

  // Battery Status API
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      status.batteryLevel = battery.level * 100;
      status.isCharging = battery.charging;
    } catch (err) {
      console.log('Battery API not available');
    }
  }

  // Thermal state (if available)
  // Note: Not widely supported, but future API
  if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
    status.thermalState = 'fair';  // Low-memory devices likely have thermal constraints
  }

  return status;
}

private static selectCodecBatteryAware(
  caps: ClientCapabilities,
  network: NetworkQuality,
  deviceStatus: DeviceStatus
): string {

  // Critical battery: Force hardware-accelerated codec
  if (deviceStatus.batteryLevel < 20 && !deviceStatus.isCharging) {
    console.log('🔋 Low battery: forcing hardware-accelerated H.264');
    return 'h264';
  }

  // Thermal throttling: Reduce to lighter codec
  if (deviceStatus.thermalState === 'serious' || deviceStatus.thermalState === 'critical') {
    console.log('🌡️ Thermal throttling: forcing H.264');
    return 'h264';
  }

  // Charging: Can use more intensive codec
  if (deviceStatus.isCharging && network.bandwidth > 5000) {
    if (this.isCodecAvailable(caps, 'av1')) {
      return 'av1';
    }
  }

  // Normal battery operation: Prefer hardware-accelerated
  const hwCodecs = this.getHardwareAcceleratedCodecs(caps);
  if (hwCodecs.length > 0) {
    return hwCodecs[0];
  }

  // Fallback
  return 'h264';
}
```

**Reasoning:** Battery life critical for mobile devices. Hardware-accelerated codecs provide 2-3× better battery life.

**Priority:** SHOULD-HAVE
**Impact:** High - Significant battery savings on mobile
**Effort:** Medium (Battery Status API)
**References:**
- Hardware H.264: 2-3× better battery life vs software VP9
- Software AV1: Severe battery drain on mobile

---

### NICE-TO-HAVE IMPROVEMENTS (Lower Priority)

#### 15. Add Bitrate Probing Support
**Implementation:**
```typescript
interface BandwidthProbe {
  targetBitrate: number;
  duration: number;  // ms
  result?: 'success' | 'failure';
}

class BandwidthProber {
  private probeHistory: BandwidthProbe[] = [];

  async runInitialProbes(): Promise<number> {
    // GCC-style exponential probing
    const startBitrate = 300;  // kbps

    const probe1 = await this.probe(startBitrate * 3);  // 900 kbps
    if (probe1 === 'failure') {
      return startBitrate;
    }

    const probe2 = await this.probe(startBitrate * 6);  // 1800 kbps
    if (probe2 === 'failure') {
      return startBitrate * 3;
    }

    // Continue probing until failure
    let currentBitrate = startBitrate * 6;
    while (true) {
      const nextBitrate = currentBitrate * 1.5;
      const result = await this.probe(nextBitrate);

      if (result === 'failure') {
        return currentBitrate;
      }

      currentBitrate = nextBitrate;

      // Safety cap
      if (currentBitrate > 10000) break;
    }

    return currentBitrate;
  }

  private async probe(targetBitrate: number): Promise<'success' | 'failure'> {
    // Temporarily increase bitrate
    // Monitor packet loss and RTT
    // If packet loss < 5% and RTT stable: success
    // Otherwise: failure

    // Implementation would use RTCPeerConnection.setParameters()
    // and monitor stats for 2-3 seconds

    // Placeholder
    return 'success';
  }
}
```

**Reasoning:** Initial bandwidth estimation more accurate with active probing.

**Priority:** NICE-TO-HAVE
**Impact:** Low - Improves initial quality selection
**Effort:** High (complex implementation)
**References:**
- GCC starts at 300 kbps, probes 900 kbps then 1800 kbps
- Probing detects available bandwidth faster

---

#### 16. Add VMAF Quality Monitoring
**Implementation:**
```typescript
interface QualityMetrics {
  ssim: number;  // Structural Similarity (0-1)
  psnr: number;  // Peak Signal-to-Noise Ratio (dB)
  vmaf: number;  // Video Multimethod Assessment Fusion (0-100)
}

class VideoQualityMonitor {
  async measureQuality(
    originalFrame: VideoFrame,
    encodedFrame: VideoFrame
  ): Promise<QualityMetrics> {

    // This would require WebAssembly implementation of VMAF
    // Or server-side quality assessment

    // Placeholder
    return {
      ssim: 0.95,
      psnr: 42,
      vmaf: 85
    };
  }

  shouldAdjustQuality(vmaf: number): 'upgrade' | 'downgrade' | 'maintain' {
    if (vmaf < 70) {
      return 'downgrade';  // Quality too low, reduce complexity
    }
    if (vmaf > 95) {
      return 'upgrade';  // Quality excellent, can increase
    }
    return 'maintain';
  }
}
```

**Reasoning:** VMAF provides perceptual quality measurement, better than simple bitrate monitoring.

**Priority:** NICE-TO-HAVE
**Impact:** Low - Quality measurement, not critical for operation
**Effort:** Very High (requires VMAF library integration)
**References:**
- VMAF better correlation with human perception than PSNR/SSIM
- Used by Netflix for quality assessment

---

#### 17. Add Simulcast Bitrate Ladder Configuration
**Implementation:**
```typescript
private static calculateSimulcastLayers(
  baseResolution: string,
  baseFramerate: number,
  baseBitrate: number,
  codec: string
): Array<{ rid: string; resolution: string; framerate: number; bitrate: number; scaleDownBy: number }> {

  const [width, height] = baseResolution.split('x').map(Number);

  // 3-layer simulcast
  return [
    {
      rid: 'h',
      resolution: `${width}x${height}`,
      framerate: baseFramerate,
      bitrate: baseBitrate,
      scaleDownBy: 1
    },
    {
      rid: 'm',
      resolution: `${Math.floor(width / 2)}x${Math.floor(height / 2)}`,
      framerate: Math.max(15, Math.floor(baseFramerate * 0.8)),
      bitrate: Math.floor(baseBitrate * 0.4),  // 40% of base
      scaleDownBy: 2
    },
    {
      rid: 'l',
      resolution: `${Math.floor(width / 4)}x${Math.floor(height / 4)}`,
      framerate: 15,
      bitrate: Math.floor(baseBitrate * 0.15),  // 15% of base
      scaleDownBy: 4
    }
  ];
}
```

**Reasoning:** Current simulcast implementation doesn't configure proper bitrate ladder.

**Priority:** NICE-TO-HAVE
**Impact:** Low - Improves simulcast efficiency
**Effort:** Low (calculation logic)
**References:**
- Simulcast typically uses 1:0.4:0.15 bitrate ratio
- Scale factors: 1×, 0.5×, 0.25× resolution

---

#### 18. Add H.264 Profile Negotiation
**Implementation:**
```typescript
interface H264Profile {
  profileLevelId: string;
  profile: 'baseline' | 'main' | 'high';
  level: string;
}

private static selectH264Profile(
  caps: ClientCapabilities,
  network: NetworkQuality,
  deviceType: 'mobile' | 'desktop'
): H264Profile {

  // Desktop with good network: High Profile
  if (deviceType === 'desktop' && network.bandwidth > 5000) {
    return {
      profileLevelId: '64001f',  // High Profile, Level 3.1
      profile: 'high',
      level: '3.1'
    };
  }

  // Desktop with medium network: Main Profile
  if (deviceType === 'desktop' && network.bandwidth > 2000) {
    return {
      profileLevelId: '4d001f',  // Main Profile, Level 3.1
      profile: 'main',
      level: '3.1'
    };
  }

  // Mobile or low bandwidth: Constrained Baseline
  return {
    profileLevelId: '42e01f',  // Constrained Baseline, Level 3.1
    profile: 'baseline',
    level: '3.1'
  };
}
```

**Reasoning:** H.264 profile selection impacts compression efficiency and compatibility.

**Priority:** NICE-TO-HAVE
**Impact:** Low - Marginal quality improvement
**Effort:** Medium (SDP manipulation)
**References:**
- High Profile: Better compression, less compatible
- Constrained Baseline: Maximum compatibility

---

#### 19. Add Codec Warmup/Preloading
**Implementation:**
```typescript
class CodecWarmer {
  private warmedCodecs: Set<string> = new Set();

  async warmupCodec(codec: string): Promise<boolean> {
    if (this.warmedCodecs.has(codec)) {
      return true;
    }

    try {
      // Create temporary encoder to trigger codec initialization
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const stream = canvas.captureStream(1);
      const track = stream.getVideoTracks()[0];

      const pc = new RTCPeerConnection();
      const sender = pc.addTrack(track);

      // Set preferred codec
      const transceiverInit = {
        direction: 'sendonly',
        streams: [stream],
        sendEncodings: [{ maxBitrate: 500000 }]
      };

      await pc.setLocalDescription(await pc.createOffer());

      // Wait 100ms for codec initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      pc.close();
      track.stop();

      this.warmedCodecs.add(codec);
      console.log(`✅ Warmed up codec: ${codec}`);

      return true;
    } catch (err) {
      console.error(`Failed to warm up codec ${codec}:`, err);
      return false;
    }
  }

  async warmupLikelyCodecs(caps: ClientCapabilities): Promise<void> {
    // Warm up likely codecs to reduce first-frame latency
    const codecs = ['h264', 'vp9', 'av1'].filter(codec =>
      this.isCodecAvailable(caps, codec)
    );

    await Promise.all(codecs.map(codec => this.warmupCodec(codec)));
  }
}
```

**Reasoning:** Pre-warming codecs reduces initial connection time (first frame delay).

**Priority:** NICE-TO-HAVE
**Impact:** Low - Reduces startup latency by 100-500ms
**Effort:** Medium (background task management)
**References:**
- Codec initialization can take 100-500ms on first use
- Pre-warming reduces perceived latency

---

#### 20. Add Codec Feature Detection (SVC Mode Support)
**Implementation:**
```typescript
interface SVCModeSupport {
  codec: string;
  supportedModes: string[];
}

private static async detectSVCModes(codec: string): Promise<string[]> {
  const supportedModes: string[] = [];

  const modesToTest = [
    'L1T1', 'L1T2', 'L1T3',
    'L2T1', 'L2T2', 'L2T3',
    'L3T1', 'L3T2', 'L3T3',
    'L2T1_KEY', 'L2T2_KEY', 'L3T3_KEY'
  ];

  if (!('VideoEncoder' in window)) {
    return supportedModes;
  }

  for (const mode of modesToTest) {
    try {
      const config = {
        codec: this.getCodecString(codec),
        width: 1280,
        height: 720,
        bitrate: 1000000,
        framerate: 30,
        scalabilityMode: mode
      };

      const support = await (window as any).VideoEncoder.isConfigSupported(config);

      if (support.supported && support.config?.scalabilityMode === mode) {
        supportedModes.push(mode);
      }
    } catch (err) {
      // Mode not supported
    }
  }

  console.log(`📊 ${codec} supported SVC modes:`, supportedModes);

  return supportedModes;
}

private static selectValidScalabilityMode(
  codec: string,
  preferredMode: string,
  supportedModes: string[]
): string | undefined {

  // If preferred mode supported, use it
  if (supportedModes.includes(preferredMode)) {
    return preferredMode;
  }

  // Fallback priority
  const fallbackPriority = ['L2T2', 'L1T2', 'L2T1', 'L1T3', 'L3T3'];

  for (const mode of fallbackPriority) {
    if (supportedModes.includes(mode)) {
      console.log(`⚠️ Fallback to ${mode} (${preferredMode} not supported)`);
      return mode;
    }
  }

  return undefined;
}
```

**Reasoning:** Not all SVC modes supported on all devices (especially hardware decoders).

**Priority:** NICE-TO-HAVE
**Impact:** Low - Prevents selecting unsupported SVC modes
**Effort:** Medium (WebCodecs API)
**References:**
- Hardware decoders may not support all SVC modes
- L3T3 requires high-end hardware

---

## 12. Implementation Priority Summary

### MUST-HAVE (Implement First)
1. **Fix Simulcast H.264 Bug** - Critical bug affecting Safari/iOS
2. **Platform-Specific Codec Selection** - iOS compatibility
3. **Hardware Acceleration Detection** - Battery life optimization
4. **Participant Count in Decision Logic** - Conference scaling
5. **Prevent Simulcast + SVC Simultaneously** - Resource waste prevention
6. **Opus Configuration Support** - Audio optimization

### SHOULD-HAVE (High Value)
7. **Dynamic Scalability Mode Selection** - SFU optimization
8. **Trend-Based Network Adaptation** - Stability improvement
9. **Quality Limitation Reason Detection** - Precise adaptation
10. **Content-Aware Bitrate Estimation** - Accuracy improvement
11. **Browser Version-Aware Codec Support** - Modern browser features
12. **Graceful Quality Degradation** - User experience
13. **Screen Sharing Optimization** - Use case support
14. **Battery-Aware Codec Selection** - Mobile optimization

### NICE-TO-HAVE (Future Enhancements)
15. **Bitrate Probing Support** - Initial bandwidth detection
16. **VMAF Quality Monitoring** - Perceptual quality measurement
17. **Simulcast Bitrate Ladder Configuration** - Efficiency
18. **H.264 Profile Negotiation** - Advanced optimization
19. **Codec Warmup/Preloading** - Latency reduction
20. **SVC Mode Feature Detection** - Compatibility verification

---

## 13. Key Takeaways

1. **Platform Matters:** iOS requires H.264-first strategy (all browsers use WebKit)
2. **Hardware Acceleration is Critical:** 2-3× battery life improvement on mobile
3. **Simulcast vs SVC:** Choose based on codec, participant count, and network
4. **Audio Optimization:** DTX saves 50-70% bandwidth in conferences
5. **Gradual Adaptation:** Step-down quality gradually, not abruptly
6. **Trend Analysis:** React to sustained trends, not single data points
7. **Quality Limitations:** Use WebRTC's qualityLimitationReason for precise adaptation
8. **Content-Aware Encoding:** Screen sharing needs different settings than video calls
9. **Browser Versions:** Modern browsers (Chrome 120+, Safari 17+) have better codec support
10. **Battery Awareness:** Low battery should force hardware-accelerated codecs

---

## 14. References

### Academic Papers
- "Practical Evaluation of VMAF Perceptual Video Quality for WebRTC Applications" (MDPI Electronics, 2019)
- "Motion-based Adaptive Streaming in WebRTC using Spatio-Temporal Scalable VP9 Video Coding" (IEEE, 2017)
- "Analysis and design of the google congestion control for web real-time communication" (ResearchGate, 2016)

### Technical Documentation
- RFC 7742: WebRTC Video Processing and Codec Requirements
- RFC 7874: WebRTC Audio Codec and Processing Requirements
- RFC 6184: RTP Payload Format for H.264 Video
- W3C WebRTC SVC Extension: https://www.w3.org/TR/webrtc-svc/

### Industry Resources
- MDN WebRTC Codecs Guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs
- WebRTC for the Curious: https://webrtcforthecurious.com/
- BlogGeek.me WebRTC Resources
- webrtcHacks Technical Articles

### Research Sources
- Google Congestion Control (GCC) documentation
- Opus Codec documentation (RFC 6716)
- AV1 Codec specification
- VP9 Bitstream specification

---

**End of Research Document**
