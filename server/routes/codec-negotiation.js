/**
 * Codec Negotiation API
 *
 * Handles codec selection between client and server
 * - Receives client capabilities
 * - Performs server-side codec negotiation
 * - Sends back optimal configuration
 */

const express = require('express');
const router = express.Router();

/**
 * Codec preference configuration
 */
const CODEC_PREFERENCES = {
  server: {
    video: ['av1', 'vp9', 'h264'], // Server prefers AV1 first
    audio: ['opus', 'g722', 'pcmu']
  },
  // Device-specific preferences
  deviceOverrides: {
    'iOS': {
      video: ['h264', 'vp9'], // iOS limited codec support
      audio: ['opus', 'pcmu']
    },
    'Android': {
      video: ['vp9', 'h264', 'av1'], // Android better VP9 support
      audio: ['opus', 'g722']
    }
  }
};

/**
 * POST /api/codecs/negotiate
 * Negotiate codec with client
 *
 * Request body:
 * {
 *   "clientCapabilities": { ... },
 *   "networkQuality": { bandwidth, rtt, packetLoss },
 *   "callType": "p2p" | "conference",
 *   "userPreferences": { videoCodec?, resolution? }
 * }
 */
router.post('/negotiate', async (req, res) => {
  const {
    clientCapabilities,
    networkQuality = {},
    callType = 'p2p',
    userPreferences = {}
  } = req.body;

  if (!clientCapabilities) {
    return res.status(400).json({ error: 'clientCapabilities required' });
  }

  try {
    // Determine applicable codec preferences based on device
    const os = clientCapabilities.browser?.os || 'Unknown';
    const preferences = CODEC_PREFERENCES.deviceOverrides[os] || CODEC_PREFERENCES.server;

    // Find intersection of client and server codecs
    const negotiatedVideoCodec = negotiateCodec(
      clientCapabilities.video.codecs,
      preferences.video,
      networkQuality,
      callType
    );

    const negotiatedAudioCodec = negotiateCodec(
      clientCapabilities.audio.codecs,
      preferences.audio,
      [],
      callType
    );

    // Get quality settings
    const qualitySettings = getQualitySettings(
      negotiatedVideoCodec,
      networkQuality,
      callType
    );

    // Determine if simulcast/SVC should be enabled
    const simulcastEnabled = shouldEnableSimulcast(
      clientCapabilities,
      negotiatedVideoCodec,
      callType
    );

    const svcEnabled = shouldEnableSVC(
      clientCapabilities,
      negotiatedVideoCodec,
      networkQuality,
      callType
    );

    // Prepare response
    const response = {
      negotiated: true,
      codec: {
        video: negotiatedVideoCodec,
        audio: negotiatedAudioCodec
      },
      quality: qualitySettings,
      features: {
        simulcast: simulcastEnabled,
        svc: svcEnabled,
        hardwareAcceleration: clientCapabilities.video.hardwareAcceleration
      },
      recommendations: {
        preferredCodec: getPreferredCodec(clientCapabilities, networkQuality),
        alternativeCodecs: getAlternativeCodecs(clientCapabilities, negotiatedVideoCodec),
        bandwidthEstimate: qualitySettings.targetBitrate
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Codec negotiation error:', err);
    res.status(500).json({ error: 'Codec negotiation failed' });
  }
});

/**
 * GET /api/codecs/capabilities
 * Get server codec capabilities
 */
router.get('/capabilities', (req, res) => {
  res.json({
    video: {
      codecs: [
        {
          codec: 'av1',
          supported: true,
          description: 'AV1 - Best compression (50% better than H.264)',
          bandwidth1080p30: '1.5 Mbps',
          cpuLoad: 'High'
        },
        {
          codec: 'vp9',
          supported: true,
          description: 'VP9 - Good compression (30% better than H.264)',
          bandwidth1080p30: '2.0 Mbps',
          cpuLoad: 'Medium-High'
        },
        {
          codec: 'h264',
          supported: true,
          description: 'H.264 - Maximum compatibility',
          bandwidth1080p30: '3.0 Mbps',
          cpuLoad: 'Medium'
        }
      ],
      features: {
        simulcast: true,
        svc: true,
        hardwareAcceleration: true
      }
    },
    audio: {
      codecs: [
        { codec: 'opus', supported: true, sampleRate: '48kHz', channels: 2 },
        { codec: 'g722', supported: true, sampleRate: '16kHz', channels: 1 },
        { codec: 'pcmu', supported: true, sampleRate: '8kHz', channels: 1 }
      ]
    }
  });
});

/**
 * POST /api/codecs/feedback
 * Receive codec performance feedback from client
 */
router.post('/feedback', async (req, res) => {
  const {
    callId,
    codec,
    packetLoss,
    bitrate,
    frameRate,
    quality,
    recommendation
  } = req.body;

  try {
    // Log codec performance metrics
    const feedback = {
      callId,
      codec,
      metrics: {
        packetLoss,
        bitrate,
        frameRate,
        quality
      },
      recommendation,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Codec feedback:', JSON.stringify(feedback, null, 2));

    // Could store this in database for analytics
    // await pool.query(
    //   'INSERT INTO codec_feedback(call_id, codec, packet_loss, bitrate, feedback_data) ...'
    // );

    res.json({
      received: true,
      suggestion: getSuggestion(feedback)
    });
  } catch (err) {
    console.error('Failed to process codec feedback:', err);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

// ============= HELPER FUNCTIONS =============

/**
 * Negotiate codec: find common codec between client and server
 */
function negotiateCodec(clientCodecs, serverPreferences, networkQuality, callType) {
  const clientCodecStrings = clientCodecs.map(c => c.mimeType.toLowerCase());

  for (const preferred of serverPreferences) {
    for (const clientCodec of clientCodecStrings) {
      if (clientCodec.includes(preferred)) {
        return preferred;
      }
    }
  }

  // Fallback
  if (clientCodecStrings.some(c => c.includes('h264'))) {
    return 'h264';
  }

  return clientCodecs[0]?.mimeType || 'unknown';
}

/**
 * Get quality settings for codec
 */
function getQualitySettings(codec, networkQuality, callType) {
  const bandwidth = networkQuality.bandwidth || 5000;
  const rtt = networkQuality.rtt || 50;

  let settings = {
    resolution: '1280x720',
    framerate: 30,
    targetBitrate: 2000,
    maxBitrate: 2500
  };

  // Adjust based on bandwidth
  if (bandwidth < 1500) {
    settings = {
      resolution: '640x480',
      framerate: 15,
      targetBitrate: 800,
      maxBitrate: 1000
    };
  } else if (bandwidth < 3000) {
    settings = {
      resolution: '1280x720',
      framerate: 24,
      targetBitrate: 1500,
      maxBitrate: 2000
    };
  } else if (bandwidth > 5000) {
    settings = {
      resolution: '1920x1080',
      framerate: 30,
      targetBitrate: 3000,
      maxBitrate: 4000
    };
  }

  // Adjust based on codec efficiency
  const codecEfficiency = {
    av1: 0.5,  // 50% of H.264 bitrate
    vp9: 0.67, // 67% of H.264 bitrate
    h264: 1.0  // baseline
  };

  const factor = codecEfficiency[codec] || 1.0;
  settings.targetBitrate = Math.round(settings.targetBitrate * factor);
  settings.maxBitrate = Math.round(settings.maxBitrate * factor);

  // Adjust for high RTT
  if (rtt > 100) {
    settings.framerate = Math.max(15, settings.framerate - 5);
  }

  return settings;
}

/**
 * Determine if simulcast should be enabled
 */
function shouldEnableSimulcast(caps, codec, callType) {
  if (callType !== 'conference') return false;
  if (codec === 'h264') return false;
  return caps.video.simulcastSupport === true;
}

/**
 * Determine if SVC should be enabled
 */
function shouldEnableSVC(caps, codec, networkQuality, callType) {
  if (!caps.video.svcSupport) return false;
  if (!['av1', 'vp9'].includes(codec)) return false;

  const bandwidth = networkQuality.bandwidth || 5000;

  if (callType === 'conference' && bandwidth < 3000) {
    return true;
  }

  if (callType === 'p2p' && bandwidth < 2000) {
    return true;
  }

  return false;
}

/**
 * Get preferred codec based on network quality
 */
function getPreferredCodec(caps, networkQuality) {
  const bandwidth = networkQuality.bandwidth || 5000;

  if (bandwidth > 5000) {
    if (hasCodec(caps, 'av1')) return 'av1';
  }

  if (bandwidth > 2500) {
    if (hasCodec(caps, 'vp9')) return 'vp9';
  }

  return 'h264';
}

/**
 * Get alternative codecs in order of preference
 */
function getAlternativeCodecs(caps, current) {
  const priority = ['av1', 'vp9', 'h264'];
  const alternatives = [];

  for (const codec of priority) {
    if (codec !== current && hasCodec(caps, codec)) {
      alternatives.push(codec);
    }
  }

  return alternatives;
}

/**
 * Check if codec is available
 */
function hasCodec(caps, codec) {
  return caps.video.codecs.some(c =>
    c.mimeType.toLowerCase().includes(codec.toLowerCase())
  );
}

/**
 * Get recommendation based on performance feedback
 */
function getSuggestion(feedback) {
  const { metrics, codec } = feedback;

  if (metrics.packetLoss > 5) {
    return {
      action: 'downgrade',
      reason: 'High packet loss',
      suggestedCodec: codec === 'av1' ? 'vp9' : 'h264'
    };
  }

  if (metrics.frameRate < 20) {
    return {
      action: 'reduce_quality',
      reason: 'Low frame rate',
      suggestion: 'Reduce resolution or framerate'
    };
  }

  if (metrics.quality > 8) {
    return {
      action: 'upgrade',
      reason: 'Excellent quality',
      suggestion: 'Can upgrade to better codec'
    };
  }

  return {
    action: 'maintain',
    reason: 'Current settings optimal',
    suggestion: 'No changes needed'
  };
}

module.exports = router;
