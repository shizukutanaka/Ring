/**
 * SFU Recording API Endpoints
 *
 * Manages WebRTC SFU connections and recording sessions
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// These would be initialized by the main server
let sfuWorker = null;
let s3Storage = null;
let pool = null;

/**
 * Initialize SFU routes with dependencies
 */
function initSFURoutes(worker, storage, database) {
  sfuWorker = worker;
  s3Storage = storage;
  pool = database;
}

/**
 * POST /api/sfu/recording/start
 * Start a new recording session
 */
router.post('/recording/start', async (req, res) => {
  const { callId, videoCodec = 'h264', bitrate = 2500, resolution = '1920x1080' } = req.body;

  if (!callId) {
    return res.status(400).json({ error: 'callId required' });
  }

  try {
    const recordingId = uuidv4();

    // Create recording session in database
    const result = await pool.query(
      `INSERT INTO recording_sessions(
        id, call_id, video_codec, bitrate_kbps,
        target_resolution, recording_status
      ) VALUES($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
      [recordingId, callId, videoCodec, bitrate, resolution]
    );

    const recording = result.rows[0];

    // Get Mediasoup router for this call
    const router = await sfuWorker.createRouter(callId);

    // Create PlainRTP transport for recording (receives media from consumers)
    const audioTransport = await sfuWorker.createPlainRtpTransport(callId);
    const videoTransport = await sfuWorker.createPlainRtpTransport(callId);

    // Create S3 upload stream
    const s3Stream = s3Storage.createUploadStream(recordingId, {
      'call-id': callId,
      'video-codec': videoCodec
    });

    // Create FFmpeg recorder instance
    const FFmpegRecorder = require('../sfu/FFmpegRecorder');
    const recorder = new FFmpegRecorder({
      recordingId,
      audioPort: audioTransport.params.port,
      videoPort: videoTransport.params.port,
      codec: videoCodec,
      bitrate: `${bitrate}k`,
      resolution,
      s3Stream
    });

    // Handle recording events
    recorder.on('recording:started', (event) => {
      console.log('Recording started:', event);
      updateRecordingStatus(recordingId, 'recording', { startedAt: new Date() });
    });

    recorder.on('recording:progress', (event) => {
      // Update metrics periodically
      if (event.frames % 30 === 0) { // Every 30 frames
        updateRecordingMetrics(recordingId, event);
      }
    });

    recorder.on('recording:error', (error) => {
      console.error('Recording error:', error);
      updateRecordingStatus(recordingId, 'failed', { error: error.message });
    });

    // Start recording
    recorder.start();

    // Store recorder instance for later reference
    recording.recorder = recorder;
    recording.audioTransport = audioTransport;
    recording.videoTransport = videoTransport;

    res.status(201).json({
      recordingId,
      status: 'started',
      callId,
      audioTransport: audioTransport.params,
      videoTransport: videoTransport.params,
      config: {
        codec: videoCodec,
        bitrate,
        resolution
      }
    });
  } catch (err) {
    console.error('Failed to start recording:', err);
    res.status(500).json({ error: 'Failed to start recording' });
  }
});

/**
 * POST /api/sfu/recording/:recordingId/stop
 * Stop and finalize recording
 */
router.post('/recording/:recordingId/stop', async (req, res) => {
  const { recordingId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM recording_sessions WHERE id = $1',
      [recordingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const recording = result.rows[0];

    // Stop FFmpeg recorder
    if (recording.recorder) {
      await recording.recorder.stop();
    }

    // Update recording status
    await pool.query(
      `UPDATE recording_sessions
       SET recording_status = 'completed', ended_at = NOW()
       WHERE id = $1`,
      [recordingId]
    );

    // Get final stats
    const stats = recording.recorder ? recording.recorder.getStats() : {};

    res.json({
      recordingId,
      status: 'completed',
      stats,
      s3Location: `s3://${s3Storage.bucket}/recordings/...`
    });
  } catch (err) {
    console.error('Failed to stop recording:', err);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

/**
 * GET /api/sfu/recording/:recordingId/status
 * Get recording status and metrics
 */
router.get('/recording/:recordingId/status', async (req, res) => {
  const { recordingId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM recording_sessions WHERE id = $1',
      [recordingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const recording = result.rows[0];

    // Get recent quality metrics
    const metricsResult = await pool.query(
      `SELECT * FROM recording_quality_snapshots
       WHERE recording_id = $1
       ORDER BY snapshot_time DESC
       LIMIT 10`,
      [recordingId]
    );

    // Get participant info
    const participantsResult = await pool.query(
      `SELECT * FROM recording_participants WHERE recording_id = $1`,
      [recordingId]
    );

    // Get upload progress if uploading
    const uploadProgress = s3Storage.getUploadProgress(recordingId);

    res.json({
      recording: {
        id: recording.id,
        callId: recording.call_id,
        status: recording.recording_status,
        startedAt: recording.started_at,
        codec: recording.video_codec,
        bitrate: recording.bitrate_kbps,
        resolution: recording.target_resolution
      },
      metrics: metricsResult.rows,
      participants: participantsResult.rows,
      upload: uploadProgress,
      duration: recording.started_at ?
        Math.floor((new Date() - new Date(recording.started_at)) / 1000) : 0
    });
  } catch (err) {
    console.error('Failed to get recording status:', err);
    res.status(500).json({ error: 'Failed to get recording status' });
  }
});

/**
 * GET /api/sfu/recording/:recordingId/download
 * Get presigned download URL
 */
router.get('/recording/:recordingId/download', async (req, res) => {
  const { recordingId } = req.params;
  const { expirySeconds = 3600 } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM recording_sessions WHERE id = $1',
      [recordingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const url = await s3Storage.getDownloadUrl(recordingId, parseInt(expirySeconds));

    res.json({
      recordingId,
      downloadUrl: url,
      expiresIn: expirySeconds,
      expiresAt: new Date(Date.now() + expirySeconds * 1000)
    });
  } catch (err) {
    console.error('Failed to get download URL:', err);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

/**
 * GET /api/sfu/recordings
 * List all recordings with filtering
 */
router.get('/recordings', async (req, res) => {
  const { callId, status = 'completed', limit = 50, offset = 0 } = req.query;

  try {
    let query = 'SELECT * FROM recording_sessions WHERE 1=1';
    const params = [];

    if (callId) {
      query += ' AND call_id = $' + (params.length + 1);
      params.push(callId);
    }

    if (status) {
      query += ' AND recording_status = $' + (params.length + 1);
      params.push(status);
    }

    query += ` ORDER BY initiated_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(query, params);

    res.json({
      recordings: result.rows,
      total: result.rowCount,
      limit,
      offset
    });
  } catch (err) {
    console.error('Failed to list recordings:', err);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

/**
 * POST /api/sfu/recording/:recordingId/register-consumer
 * Register a consumer for the recording
 */
router.post('/recording/:recordingId/register-consumer', async (req, res) => {
  const { recordingId } = req.params;
  const { peerId, kind } = req.body;

  try {
    // Get recording session
    const result = await pool.query(
      'SELECT * FROM recording_sessions WHERE id = $1',
      [recordingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Register participant if not already registered
    const participantCheck = await pool.query(
      'SELECT * FROM recording_participants WHERE recording_id = $1 AND participant_id = $2',
      [recordingId, peerId]
    );

    if (participantCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO recording_participants(
          recording_id, participant_id, joined_at
        ) VALUES($1, $2, NOW())`,
        [recordingId, peerId]
      );
    }

    res.json({
      recordingId,
      peerId,
      registered: true
    });
  } catch (err) {
    console.error('Failed to register consumer:', err);
    res.status(500).json({ error: 'Failed to register consumer' });
  }
});

/**
 * GET /api/sfu/health
 * Get SFU health status
 */
router.get('/health', async (req, res) => {
  try {
    const activeRecordings = await pool.query(
      `SELECT COUNT(*) as count FROM recording_sessions
       WHERE recording_status = 'recording'`
    );

    const sfuStatus = sfuWorker.getStatus();

    res.json({
      status: 'healthy',
      sfu: sfuStatus,
      activeRecordings: activeRecordings.rows[0].count,
      s3: {
        bucket: s3Storage.bucket,
        activeUploads: s3Storage.getActiveUploads().length
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// ============= HELPER FUNCTIONS =============

async function updateRecordingStatus(recordingId, status, metadata = {}) {
  try {
    const update = {
      recording_status: status,
      ...metadata
    };

    let query = 'UPDATE recording_sessions SET ';
    const parts = [];
    const params = [recordingId];
    let paramCount = 2;

    for (const [key, value] of Object.entries(update)) {
      parts.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }

    query += parts.join(', ') + ' WHERE id = $1';

    await pool.query(query, params);
  } catch (err) {
    console.error('Failed to update recording status:', err);
  }
}

async function updateRecordingMetrics(recordingId, metrics) {
  try {
    await pool.query(
      `INSERT INTO recording_quality_snapshots(
        recording_id, video_frame_rate, overall_quality_score
      ) VALUES($1, $2, $3)`,
      [recordingId, metrics.framerate || 0, calculateQualityScore(metrics)]
    );
  } catch (err) {
    console.error('Failed to update metrics:', err);
  }
}

function calculateQualityScore(metrics) {
  // Simple quality score (0-10)
  // Based on bitrate, frame rate, resolution
  let score = 10;

  if (metrics.bitrate < 1000) score -= 3; // Low bitrate
  if (metrics.framerate < 15) score -= 2;  // Low framerate
  if (metrics.resolution.includes('480')) score -= 1; // Low resolution

  return Math.max(0, Math.min(10, score));
}

module.exports = { router, initSFURoutes };
