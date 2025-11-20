# WebRTC Codec Selection - Quick Reference Guide

**For Developers:** Fast lookup of codec selection best practices

---

## Platform-Specific Codec Priority

### iOS (All Browsers)
```
Priority: ['h264']
Reason: All iOS browsers use WebKit, only H.264 hardware-accelerated
```

### Android
```
If hardware H.264: ['h264', 'vp9', 'av1']
Else: ['vp9', 'h264', 'av1']
Reason: Hardware acceleration critical for battery life
```

### Desktop (High Bandwidth > 5 Mbps)
```
Priority: ['av1', 'vp9', 'h264']
Reason: Compression efficiency (AV1 = 50% less bandwidth than H.264)
```

### Desktop (Low Bandwidth < 2 Mbps)
```
Priority: ['h264', 'vp9']
Reason: H.264 lower CPU overhead, more battery efficient
```

---

## Simulcast vs SVC Decision Tree

```
Is P2P (2 participants)?
├─ YES → Use neither (wasteful for single receiver)
└─ NO → Continue

Is H.264?
├─ YES → Use SIMULCAST (H.264 has no SVC support)
└─ NO → Continue

Is VP9 or AV1?
├─ Participant count < 15?
│  ├─ YES → Use SVC (more efficient for sender)
│  └─ NO → Use SIMULCAST (better for large conferences)
└─ Network unstable (packetLoss > 3%)?
   ├─ YES → Use SVC (better adaptation)
   └─ NO → Use SIMULCAST
```

---

## SVC Scalability Mode Selection

### AV1 Modes
```typescript
Participants 1-2:  undefined (no SVC needed)
Participants 3-5:  'L2T1' (2 spatial, 1 temporal)
Participants 6-10: 'L2T2' (2 spatial, 2 temporal)
Participants 10+:  'L3T3' (3 spatial, 3 temporal)

Poor network (bandwidth < 2000 kbps): 'L1T2' (temporal only)
```

### VP9 Modes
```typescript
Participants 1-2:  undefined
Participants 3-5:  'L2T1'
Participants 6-10: 'L2T2'
Participants 10+:  'L3T3' (if supported)

Poor network: 'L1T2'
```

---

## Bitrate Estimation

### Formula: Bits per Pixel
```typescript
targetBitrate = (width × height × fps × bitsPerPixel) / 1000  // kbps

Bits per Pixel (BPP):
├─ H.264: 0.10-0.15 BPP
├─ VP9:   0.07-0.10 BPP
├─ AV1:   0.05-0.08 BPP
└─ VP8:   0.12-0.18 BPP

Content Type Multipliers:
├─ Motion (video call):      1.0×
├─ Detail (screen + video):  1.3×
└─ Text (screen sharing):    0.8×
```

### Quick Bitrate Table
| Resolution | FPS | H.264 | VP9 | AV1 |
|------------|-----|-------|-----|-----|
| 1920x1080 | 30 | 3000 | 2000 | 1500 |
| 1920x1080 | 24 | 2500 | 1700 | 1200 |
| 1280x720 | 30 | 1500 | 1000 | 750 |
| 1280x720 | 24 | 1200 | 800 | 600 |
| 640x480 | 30 | 800 | 500 | 400 |
| 640x480 | 24 | 600 | 400 | 300 |
| 640x480 | 15 | 400 | 250 | 200 |
| 320x240 | 15 | 200 | 150 | 100 |

---

## Opus Audio Configuration

### Bitrate Selection
```typescript
P2P (high quality):         48 kbps
Conference (3-10 people):   32 kbps
Conference (10+ people):    16 kbps
Music (stereo):             128 kbps
```

### DTX (Discontinuous Transmission)
```typescript
Enable DTX when:
├─ Call type is conference (3+ participants)
├─ Content is voice (not music)
└─ Expected savings: 50-70% bandwidth

Disable DTX when:
└─ Content is music (causes quality issues)
```

### FEC (Forward Error Correction)
```typescript
Enable FEC when:
├─ Packet loss > 2%
├─ Bitrate ≥ 12.4 kbps (FEC threshold)
└─ Overhead: +20-25% bitrate

Disable FEC when:
└─ Bitrate < 12.4 kbps (FEC won't activate anyway)
```

### RED (Redundant Audio Data)
```typescript
Enable RED when:
├─ Packet loss > 5%
├─ Bandwidth allows (RED doubles audio bitrate)
└─ Overhead: +100% bitrate

Typical usage: Extreme packet loss scenarios only
```

### SDP fmtpLine Example
```typescript
// Good network, conference
'minptime=10;maxaveragebitrate=32000;useinbandfec=1;usedtx=1'

// Poor network, high packet loss
'minptime=10;maxaveragebitrate=24000;useinbandfec=1;usedtx=1'

// Music
'minptime=10;maxaveragebitrate=128000;useinbandfec=0;usedtx=0'
```

---

## Network Quality Thresholds

### Bandwidth
```
Excellent: > 5000 kbps   → 1080p @ 30fps, AV1
Good:      2000-5000     → 720p @ 30fps, VP9
Fair:      1000-2000     → 720p @ 24fps, H.264
Poor:      < 1000        → 480p @ 15fps, H.264
```

### RTT (Round-Trip Time)
```
Excellent: < 50 ms       → No adaptation needed
Good:      50-150 ms     → Monitor closely
Fair:      150-300 ms    → Consider reducing quality
Poor:      > 300 ms      → Reduce bitrate, resolution
```

### Packet Loss
```
Excellent: < 0.5%        → No action
Good:      0.5-2%        → Enable FEC
Fair:      2-5%          → Enable FEC + RED, monitor
Poor:      5-10%         → Reduce bitrate
Critical:  > 10%         → Downgrade codec (AV1 → VP9 → H.264)
```

### Jitter
```
Excellent: < 10 ms       → No action
Good:      10-30 ms      → Monitor jitter buffer
Fair:      30-50 ms      → Increase jitter buffer
Poor:      > 50 ms       → Reduce framerate, bitrate
```

---

## Quality Adaptation Ladder

### Graceful Degradation Steps
```
Step 1: Reduce bitrate (-15%)
  Example: 2000 kbps → 1700 kbps

Step 2: Reduce framerate
  30 fps → 24 fps → 15 fps

Step 3: Reduce resolution
  1080p → 720p → 480p → 240p

Step 4: Disable SVC/Simulcast
  (Reduces encoding overhead)

Step 5: Switch codec (last resort)
  AV1 → VP9 → H.264
```

### Quality Upgrade (with Hysteresis)
```
Conditions:
├─ Sustained bandwidth improvement (30s+)
├─ Packet loss < 2%
└─ RTT stable

Steps (reverse of degradation):
  H.264 → VP9 → AV1
  480p → 720p → 1080p
  15 fps → 24 fps → 30 fps
  Bitrate increase (+15%)
```

---

## Screen Sharing Optimization

### Presentation Mode (Slides, Documents)
```typescript
Resolution:  1920x1080 (high detail for text)
Framerate:   10 fps (low motion)
Bitrate:     800-1200 kbps (text compression efficient)
ContentHint: 'text' or 'detail'
Codec:       H.264 or VP9 (AV1 screen content tools if available)
```

### Video Playback Mode
```typescript
Resolution:  1280x720 (balanced)
Framerate:   24 fps (smooth playback)
Bitrate:     1500-2000 kbps
ContentHint: 'motion'
Codec:       VP9 or H.264
```

### Mixed Content Mode
```typescript
Resolution:  1920x1080
Framerate:   15 fps
Bitrate:     1000-1500 kbps
ContentHint: 'detail'
Codec:       VP9 or H.264
```

---

## Browser Codec Support (2024-2025)

### Chrome/Edge
```
VP8:   ✅ Full support, hardware on some platforms
VP9:   ✅ Full support, hardware on modern GPUs
H.264: ✅ Full support, hardware acceleration
AV1:   ✅ Production-ready (M120+), limited hardware
H.265: ✅ Native support (v136+)
```

### Firefox
```
VP8:   ✅ Full support
VP9:   ✅ Full support (software)
H.264: ✅ Software only (on Android)
AV1:   ⚠️ Partial support
```

### Safari (macOS)
```
VP8:   ✅ Support (v13+)
VP9:   ✅ Support (v17+)
H.264: ✅ Full support, hardware acceleration
AV1:   ⚠️ Experimental only
H.265: ✅ Hardware support
```

### Safari (iOS)
```
VP8:   ✅ Support (v13+) - SOFTWARE ONLY, drains battery
VP9:   ✅ Support (v17+) - SOFTWARE ONLY, drains battery
H.264: ✅ Full support, hardware acceleration
AV1:   ❌ Not supported
H.265: ✅ Hardware support

IMPORTANT: All iOS browsers (Chrome, Firefox, Edge) use WebKit!
           → Same codec support as Safari
           → Always prefer H.264 on iOS
```

---

## Hardware Acceleration Detection

### Check Using WebCodecs API
```javascript
async function hasHardwareAccel(codec) {
  if (!('VideoEncoder' in window)) return false;

  const config = {
    codec: codec,  // e.g., 'avc1.42E01F', 'vp09.00.10.08', 'av01.0.05M.08'
    width: 1280,
    height: 720,
    bitrate: 2000000,
    framerate: 30,
    hardwareAcceleration: 'prefer-hardware'
  };

  try {
    const support = await VideoEncoder.isConfigSupported(config);
    return support.supported;
  } catch {
    return false;
  }
}
```

### Platform Defaults
```
iOS:      H.264 only
Android:  H.264 (most devices), VP8/VP9 (varies by chipset)
Desktop:  H.264 (universal), VP9 (Intel Gen 9+, AMD VCN 2.0+, NVIDIA Maxwell+)
          AV1 (Intel Arc, AMD RDNA 3, NVIDIA RTX 30+)
```

---

## Battery Optimization

### Battery Status API
```javascript
const battery = await navigator.getBattery();

if (battery.level < 0.2 && !battery.charging) {
  // Low battery: Force hardware-accelerated codec
  preferredCodec = 'h264';
}
```

### Battery Impact by Codec
```
Hardware H.264: ⚡ (baseline, most efficient)
Software VP9:   ⚡⚡⚡ (2-3× more CPU than HW H.264)
Software AV1:   ⚡⚡⚡⚡⚡ (3-5× more CPU than VP9)
```

### Battery-Aware Strategy
```typescript
Battery Level > 80% (charging):
  → Can use AV1/VP9 (better compression)

Battery Level 20-80%:
  → Prefer hardware-accelerated codecs

Battery Level < 20% (not charging):
  → FORCE hardware H.264 (maximum battery savings)

Device overheating:
  → Downgrade to H.264, reduce resolution/framerate
```

---

## Conference Size Optimization

### P2P (2 participants)
```typescript
Codec:      Best available (AV1 > VP9 > H.264)
Resolution: 1920x1080
Framerate:  30 fps
Simulcast:  No (wasteful)
SVC:        No (wasteful)
Bitrate:    Up to 80% of available bandwidth
```

### Small Conference (3-5 participants)
```typescript
Codec:      VP9 or H.264
Resolution: 1280x720
Framerate:  30 fps
Simulcast:  Yes (if H.264)
SVC:        Yes (if VP9/AV1, prefer over simulcast)
  Mode:     L2T1 or L2T2
Bitrate:    Cap at 2000 kbps
```

### Medium Conference (6-15 participants)
```typescript
Codec:      VP9 or H.264
Resolution: 1280x720
Framerate:  24-30 fps
Simulcast:  Yes
SVC:        Optional (if VP9/AV1 and CPU allows)
  Mode:     L2T2
Bitrate:    Cap at 1500 kbps (70% of available)
```

### Large Conference (15+ participants)
```typescript
Codec:      H.264 (compatibility)
Resolution: 1280x720 or 640x480
Framerate:  24 fps
Simulcast:  Yes (essential)
SVC:        No (simulcast preferred for large scale)
Bitrate:    Cap at 1000 kbps (60% of available)
```

---

## Common Pitfalls to Avoid

### 1. Enabling Both Simulcast and SVC
```typescript
// BAD: Wasteful, contradictory
enableSimulcast = true;
enableSVC = true;

// GOOD: Mutual exclusion
if (codec === 'h264') {
  enableSimulcast = true;
  enableSVC = false;
} else {
  enableSimulcast = false;
  enableSVC = true;
}
```

### 2. Not Detecting iOS WebKit
```typescript
// BAD: Assumes Chrome on iOS has real Chrome codec support
if (browser === 'Chrome') {
  codec = 'av1';  // Won't work on iOS!
}

// GOOD: Platform detection first
if (platform === 'iOS') {
  codec = 'h264';  // All iOS browsers use WebKit
}
```

### 3. Disabling Simulcast for H.264
```typescript
// BAD: H.264 has no SVC support
if (codec === 'h264') {
  enableSimulcast = false;  // BUG!
}

// GOOD: H.264 REQUIRES simulcast for multi-layer
if (codec === 'h264' && participantCount >= 3) {
  enableSimulcast = true;
}
```

### 4. Ignoring Hardware Acceleration
```typescript
// BAD: Software AV1 drains battery on mobile
codec = 'av1';  // Might be software-only

// GOOD: Check hardware support first
if (hasHardwareAV1) {
  codec = 'av1';
} else if (hasHardwareH264) {
  codec = 'h264';  // Better for battery
}
```

### 5. No Opus Configuration
```typescript
// BAD: Missing 50-70% bandwidth savings
audioCodec = 'opus';

// GOOD: Configure DTX, FEC, bitrate
audioCodec = {
  codec: 'opus',
  bitrate: 32000,
  dtx: true,  // 50-70% savings in conference
  fec: true,  // If packet loss > 2%
  sdpFmtpLine: 'minptime=10;maxaveragebitrate=32000;useinbandfec=1;usedtx=1'
};
```

---

## Key Performance Indicators (KPIs)

### Monitor These Metrics
```
Codec Distribution:
  ├─ iOS: Should be 100% H.264
  ├─ Desktop: Mix of AV1, VP9, H.264
  └─ Android: Majority H.264 (hardware)

Hardware Acceleration Usage:
  ├─ Target: > 80% of sessions
  └─ Indicates: Battery optimization working

Simulcast/SVC Enablement:
  ├─ H.264 conferences: 100% simulcast
  ├─ VP9/AV1 conferences: 80%+ SVC
  └─ P2P: 0% (both disabled)

Audio Bandwidth (Opus):
  ├─ Conference with DTX: 30-50% of without DTX
  ├─ Expected average: ~12 kbps (with silence)
  └─ Peak: 32 kbps (active speech)

Quality Adaptation Frequency:
  ├─ Target: < 2 changes per minute
  └─ Indicates: Stable adaptation (not oscillating)
```

---

## Quick Diagnostic Commands

### Check Current Codec
```javascript
const stats = await pc.getStats();
for (const report of stats.values()) {
  if (report.type === 'outbound-rtp' && report.kind === 'video') {
    console.log('Codec:', report.codecId);
    console.log('Bitrate:', report.bytesSent * 8 / report.timestamp / 1000, 'kbps');
  }
}
```

### Check Quality Limitation
```javascript
const stats = await pc.getStats();
for (const report of stats.values()) {
  if (report.type === 'outbound-rtp' && report.kind === 'video') {
    console.log('Quality limitation:', report.qualityLimitationReason);
    // Values: 'none', 'cpu', 'bandwidth', 'other'
  }
}
```

### Check Packet Loss
```javascript
const stats = await pc.getStats();
for (const report of stats.values()) {
  if (report.type === 'inbound-rtp' && report.kind === 'video') {
    const lossRate = (report.packetsLost / (report.packetsReceived + report.packetsLost)) * 100;
    console.log('Packet loss:', lossRate.toFixed(2), '%');
  }
}
```

### Check Hardware Acceleration
```javascript
const config = {
  codec: 'avc1.42E01F',
  width: 1280,
  height: 720,
  bitrate: 2000000,
  framerate: 30,
  hardwareAcceleration: 'prefer-hardware'
};

const support = await VideoEncoder.isConfigSupported(config);
console.log('Hardware H.264:', support.supported);
```

---

**For detailed explanations and references, see:**
- `WEBRTC_CODEC_SELECTION_RESEARCH.md` (comprehensive research)
- `CODEC_SELECTOR_IMPROVEMENTS_SUMMARY.md` (implementation roadmap)
