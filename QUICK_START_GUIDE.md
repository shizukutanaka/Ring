# CodecSelector Enhanced - Quick Start Guide

**Last Updated:** November 20, 2025
**Status:** Production Ready
**Version:** 2.0 (Phase 1 Complete)

---

## 🚀 Quick Start

### Basic Usage (Before)
```typescript
const config = CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference'
);
```

### Basic Usage (After - With Auto-Detection)
```typescript
// Platform, hardware acceleration auto-detected
// Participant count required for optimal selection
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference',
  undefined,
  5  // 5 participants
);
```

### Full Usage (With All Parameters)
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference',
  { videoCodec: 'vp9', resolution: '1280x720' },
  5,                          // participantCount
  'iOS',                      // platform (auto-detected if omitted)
  hardwareAccelerationInfo    // hardware info (auto-detected if omitted)
);
```

---

## 📋 Common Use Cases

### Use Case 1: iOS Conference
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
  'conference',
  undefined,
  5,              // participants
  'iOS'           // force iOS detection
);

// Result:
// {
//   videoCodec: 'h264',        ✅ iOS mandatory
//   audioCodec: {              ✅ Full Opus config
//     codec: 'opus',
//     bitrate: 32000,
//     dtx: true,               ✅ 50-70% savings
//     fec: false,
//     sdpFmtpLine: 'minptime=10;maxaveragebitrate=32000;usedtx=1'
//   },
//   resolution: '1280x720',
//   framerate: 24,
//   bitrate: 800,
//   enableSimulcast: true,     ✅ H.264 MUST use simulcast
//   enableSVC: false,          ✅ Simulcast + SVC never both
//   scalabilityMode: undefined,
//   targetBitrates: {          ✅ For simulcast layers
//     low: 264,
//     medium: 536,
//     high: 800
//   }
// }
```

### Use Case 2: Desktop P2P (High Quality)
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 8000, rtt: 20, packetLoss: 0.1, jitter: 2 },
  'p2p',
  undefined,
  2,              // 2 participants (P2P)
  'Desktop'
);

// Result:
// {
//   videoCodec: 'av1',         ✅ Best compression
//   audioCodec: {
//     codec: 'opus',
//     bitrate: 48000,          ✅ High quality for P2P
//     dtx: false,              ✅ No DTX needed
//     fec: false
//   },
//   resolution: '1920x1080',   ✅ Full HD
//   framerate: 30,
//   bitrate: 1540,
//   enableSimulcast: false,    ✅ No simulcast for P2P
//   enableSVC: false,          ✅ No SVC for P2P
//   scalabilityMode: undefined
// }
```

### Use Case 3: Large Conference (20 participants, poor network)
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 1500, rtt: 150, packetLoss: 3, jitter: 20 },
  'conference',
  undefined,
  20             // Large conference
);

// Result:
// {
//   videoCodec: 'h264',        ✅ Compatibility
//   audioCodec: {
//     codec: 'opus',
//     bitrate: 16000,          ✅ Very efficient
//     dtx: true,               ✅ Silence detection
//     fec: true,               ✅ High packet loss
//     sdpFmtpLine: 'minptime=10;maxaveragebitrate=16000;useinbandfec=1;usedtx=1'
//   },
//   resolution: '640x480',     ✅ Reduced for scale
//   framerate: 15,             ✅ Reduced
//   bitrate: 400,              ✅ Very low
//   enableSimulcast: true,     ✅ For bandwidth adaptation
//   enableSVC: false,
//   scalabilityMode: undefined,
//   targetBitrates: {
//     low: 132,
//     medium: 268,
//     high: 400
//   }
// }
```

---

## 🔧 Implementation in Your Application

### Step 1: Update Call Setup
```typescript
// Old code (still works):
const config = CodecSelector.selectOptimalCodecs(caps, network);

// New code (with participant tracking):
const config = await CodecSelector.selectOptimalCodecs(
  caps,
  network,
  callType,
  userPref,
  participantCount  // ⭐ NEW
);
```

### Step 2: Use Audio Configuration
```typescript
// Old: audioCodec was just a string
const audioCodec = 'opus';

// New: audioCodec can be full configuration
const audioCodec = config.audioCodec;

if (typeof audioCodec === 'object') {
  // Extract SDP fmtpLine for signaling
  const sdpLine = audioCodec.sdpFmtpLine;
  // Use in SDP: a=fmtp:111 <sdpLine>
}
```

### Step 3: Apply Codec Settings
```typescript
// Configure video
const videoCodec = config.videoCodec;
const resolution = config.resolution;
const framerate = config.framerate;
const bitrate = config.bitrate;

// Apply constraints
const constraints = {
  video: {
    codec: videoCodec,
    // ... other video settings
  },
  audio: {
    // Use audioCodec.sdpFmtpLine for configuration
  }
};

// Configure simulcast/SVC
if (config.enableSimulcast) {
  // Use targetBitrates for simulcast layers
  // low: config.targetBitrates.low
  // medium: config.targetBitrates.medium
  // high: config.targetBitrates.high
}

if (config.enableSVC && config.scalabilityMode) {
  // Use config.scalabilityMode (e.g., 'L2T1', 'L2T2', 'L3T3')
}
```

### Step 4: Adapt to Network Changes
```typescript
// When network stats change:
const newStats = {
  bandwidth: currentBandwidth,
  packetLoss: currentPacketLoss,
  rtt: currentRTT
};

const newConfig = await CodecSelector.adaptCodecConfig(
  currentConfig,
  newStats,
  capabilities,
  participantCount  // ⭐ NEW
);

if (configChanged(currentConfig, newConfig)) {
  // Reconfigure encoder
  applyCodecConfig(newConfig);
}
```

---

## 🎯 Decision Tables

### Codec Selection
```
Platform: iOS
  → H.264 (forced, all browsers use WebKit)

Platform: Android
  + Hardware H.264 available
  → H.264 (battery optimal)

Platform: Desktop
  + High bandwidth (>5 Mbps)
  → AV1 (30% better than VP9, 50% better than H.264)

Call: Conference
  + Participants ≥ 15
  → H.264 (compatibility)

Call: Conference
  + Participants < 15
  + High bandwidth
  → VP9 or AV1 (efficiency)
```

### Simulcast vs SVC
```
Codec: H.264
  → Always simulcast (no SVC support)

Codec: VP9/AV1
  + Participants < 15
  → SVC preferred (more efficient)

Codec: VP9/AV1
  + Participants ≥ 15
  → Simulcast (better for scale)

Call: P2P
  → Neither (wasteful for 1 receiver)
```

### Audio Configuration
```
Call: P2P
  → Bitrate: 48 kbps, DTX: off, FEC: conditional

Call: Conference
  + Participants: 3-10
  → Bitrate: 32 kbps, DTX: on, FEC: if loss > 2%

Call: Conference
  + Participants: 10+
  → Bitrate: 16 kbps, DTX: on, FEC: if loss > 2%
```

---

## 📊 Expected Configuration Examples

### Small P2P Call
```json
{
  "videoCodec": "av1",
  "audioCodec": { "codec": "opus", "bitrate": 48000, "dtx": false },
  "resolution": "1920x1080",
  "framerate": 30,
  "bitrate": 1540,
  "enableSimulcast": false,
  "enableSVC": false
}
```

### Medium Conference (6 participants)
```json
{
  "videoCodec": "vp9",
  "audioCodec": { "codec": "opus", "bitrate": 32000, "dtx": true, "sdpFmtpLine": "...;usedtx=1" },
  "resolution": "1280x720",
  "framerate": 24,
  "bitrate": 800,
  "enableSimulcast": false,
  "enableSVC": true,
  "scalabilityMode": "L2T1"
}
```

### Large Conference (20 participants, poor network)
```json
{
  "videoCodec": "h264",
  "audioCodec": { "codec": "opus", "bitrate": 16000, "dtx": true, "fec": true, "sdpFmtpLine": "...;usedtx=1;useinbandfec=1" },
  "resolution": "640x480",
  "framerate": 15,
  "bitrate": 400,
  "enableSimulcast": true,
  "enableSVC": false,
  "scalabilityMode": undefined,
  "targetBitrates": { "low": 132, "medium": 268, "high": 400 }
}
```

---

## 🧪 Testing Your Integration

### Test 1: iOS Conference
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
  'conference',
  undefined,
  5,
  'iOS'
);

assert(config.videoCodec === 'h264', 'iOS must use H.264');
assert(config.enableSimulcast === true, 'H.264 must use simulcast');
assert(config.enableSVC === false, 'Cannot have both simulcast and SVC');
assert(typeof config.audioCodec === 'object', 'Audio should be configured');
assert(config.audioCodec.dtx === true, 'Conference should have DTX enabled');
```

### Test 2: Simulcast + SVC Mutual Exclusion
```typescript
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
  'conference',
  undefined,
  10
);

assert(
  !(config.enableSimulcast && config.enableSVC),
  'Simulcast and SVC should never both be true'
);
```

### Test 3: Participant Count Matters
```typescript
const smallConf = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
  'conference',
  undefined,
  5
);

const largeConf = await CodecSelector.selectOptimalCodecs(
  capabilities,
  { bandwidth: 2000, rtt: 50, packetLoss: 1, jitter: 5 },
  'conference',
  undefined,
  20
);

const smallRes = parseInt(smallConf.resolution.split('x')[0]);
const largeRes = parseInt(largeConf.resolution.split('x')[0]);

assert(largeRes <= smallRes, 'Large conference should use lower or equal resolution');
```

---

## ⚠️ Migration Notes

### Breaking Changes
1. **`selectOptimalCodecs()` is now async**
   - Old: `const config = selectOptimalCodecs(...)`
   - New: `const config = await selectOptimalCodecs(...)`

2. **`audioCodec` type changed**
   - Old: `audioCodec: string` (e.g., "opus")
   - New: `audioCodec: string | OpusConfiguration`

3. **`adaptCodecConfig()` is now async**
   - Old: `const config = adaptCodecConfig(...)`
   - New: `const config = await adaptCodecConfig(...)`

### Backwards Compatibility
- All new parameters are optional with sensible defaults
- Can still call with old parameter sets
- Old code will work, but needs `.then()` or `await`

### Migration Pattern
```typescript
// Old code:
const config = CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference'
);
applyConfig(config);

// New code (minimum change):
CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference',
  undefined,  // userPreference
  5           // participantCount ⭐ ADD THIS
).then(config => {
  applyConfig(config);
});

// Or with async/await:
const config = await CodecSelector.selectOptimalCodecs(
  capabilities,
  networkQuality,
  'conference',
  undefined,
  5
);
applyConfig(config);
```

---

## 🐛 Debugging

### Check Current Codec
```typescript
const stats = await pc.getStats();
for (const report of stats.values()) {
  if (report.type === 'outbound-rtp' && report.kind === 'video') {
    console.log('Current codec:', report.codecId);
  }
}
```

### Check Hardware Acceleration
```typescript
const hwAccel = await CodecSelector.detectHardwareAcceleration();
console.log('Hardware acceleration:', hwAccel);
// { h264: true, vp9: false, av1: false }
```

### Check Audio Configuration
```typescript
const config = await CodecSelector.selectOptimalCodecs(...);
if (typeof config.audioCodec === 'object') {
  console.log('Opus config:');
  console.log('  Bitrate:', config.audioCodec.bitrate);
  console.log('  DTX:', config.audioCodec.dtx);
  console.log('  FEC:', config.audioCodec.fec);
  console.log('  SDP:', config.audioCodec.sdpFmtpLine);
}
```

---

## 📞 Common Questions

### Q: Do I need to provide participantCount?
**A:** No, it defaults to 2 (P2P). But for optimal results in conferences, provide the actual participant count.

### Q: Why is iOS forced to H.264?
**A:** All iOS browsers (Chrome, Firefox, Safari) use WebKit internally. Only H.264 is hardware-accelerated on iOS. Software codecs drain battery 3-5× faster.

### Q: What's the difference between simulcast and SVC?
**A:** Simulcast = send multiple quality layers simultaneously (needs more bandwidth). SVC = encode with multiple layers (more efficient per sender). For large conferences (15+), simulcast is better. For small/medium (<15), SVC is better.

### Q: What does DTX do?
**A:** DTX (Discontinuous Transmission) stops sending audio during silence. Saves 50-70% bandwidth in conferences where people take turns speaking.

### Q: Why different codec per participant count?
**A:** 20 people with H.264 uses much more total bandwidth than 5 people. By switching to H.264 at 15+ participants, we get better scalability even if individual quality is slightly lower.

### Q: Is async really necessary?
**A:** Yes, hardware acceleration detection requires calling WebCodecs API, which is async. However, you can add `.then()` in legacy code if `async/await` isn't available.

---

## 📚 For More Information

- **Detailed Implementation:** `CODEC_SELECTOR_IMPLEMENTATION_COMPLETE.md`
- **Quick Reference:** `docs/CODEC_SELECTION_QUICK_REFERENCE.md`
- **Research & Theory:** `docs/WEBRTC_CODEC_SELECTION_RESEARCH.md`
- **Test Examples:** `client/services/CodecSelector.test.ts`

---

## ✅ Checklist for Integration

- [ ] Understand new async nature of `selectOptimalCodecs()`
- [ ] Add participant count tracking to your application
- [ ] Handle `audioCodec` as object, not just string
- [ ] Update SDP generation to use `audioCodec.sdpFmtpLine`
- [ ] Test iOS, Android, and Desktop scenarios
- [ ] Test large conference scenarios (15+ participants)
- [ ] Monitor codec selection in production
- [ ] Track audio bandwidth reduction (DTX)
- [ ] Run test suite to verify integration

---

**Ready to integrate?** Start with Use Case 1 (iOS Conference) or your most common scenario above.

Good luck! 🚀
