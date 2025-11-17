-- Migration: Add Recording Tables and Related Schemas
-- Date: 2025-11-17
-- Purpose: Add database support for WebRTC SFU recording functionality

-- ============= RECORDING SESSIONS =============

CREATE TABLE recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES call_records(id) ON DELETE CASCADE,

  -- Recording metadata
  recording_status VARCHAR(50) DEFAULT 'pending', -- pending, recording, completed, failed, archived
  initiated_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Codec and quality
  video_codec VARCHAR(50) DEFAULT 'h264', -- h264, vp9, av1
  audio_codec VARCHAR(50) DEFAULT 'opus',
  bitrate_kbps INTEGER DEFAULT 2500,
  target_resolution VARCHAR(20) DEFAULT '1920x1080',
  target_framerate INT DEFAULT 30,

  -- Storage
  s3_bucket VARCHAR(255),
  s3_key VARCHAR(500),
  file_size_bytes BIGINT,
  storage_class VARCHAR(50) DEFAULT 'STANDARD_IA',

  -- Metadata
  participants_count INT,
  recording_type VARCHAR(50) DEFAULT 'full', -- full, audio-only, screen-share
  quality_metrics JSONB,

  -- Lifecycle
  retention_days INT DEFAULT 90,
  archived_at TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (call_id) REFERENCES call_records(id)
);

CREATE INDEX idx_recording_sessions_call_id ON recording_sessions(call_id);
CREATE INDEX idx_recording_sessions_status ON recording_sessions(recording_status);
CREATE INDEX idx_recording_sessions_created ON recording_sessions(initiated_at);
CREATE INDEX idx_recording_sessions_retention ON recording_sessions(retention_days);

-- ============= RECORDING PARTICIPANTS =============

CREATE TABLE recording_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,
  participant_id UUID,

  -- Participation details
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  role VARCHAR(50) DEFAULT 'participant', -- initiator, participant, observer

  -- Media tracks
  has_audio BOOLEAN DEFAULT true,
  has_video BOOLEAN DEFAULT true,
  audio_enabled BOOLEAN DEFAULT true,
  video_enabled BOOLEAN DEFAULT true,

  -- Network quality
  avg_bitrate_kbps NUMERIC(10, 2),
  avg_packet_loss_percent NUMERIC(5, 2),
  avg_rtt_ms NUMERIC(8, 2),
  min_bitrate_kbps NUMERIC(10, 2),
  max_bitrate_kbps NUMERIC(10, 2),

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_participants_recording_id ON recording_participants(recording_id);
CREATE INDEX idx_recording_participants_participant_id ON recording_participants(participant_id);

-- ============= RECORDING SEGMENTS =============

CREATE TABLE recording_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Segment info
  segment_number INT NOT NULL,
  segment_type VARCHAR(50) DEFAULT 'video', -- video, audio, screen-share, data

  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INT,

  -- Storage
  s3_key VARCHAR(500),
  file_size_bytes BIGINT,
  content_hash VARCHAR(64), -- SHA256 for integrity

  -- Quality metrics
  frame_count INT,
  key_frame_count INT,
  avg_frame_size_bytes INT,
  bitrate_kbps INT,

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_segments_recording_id ON recording_segments(recording_id);
CREATE INDEX idx_recording_segments_segment_number ON recording_segments(recording_id, segment_number);
CREATE INDEX idx_recording_segments_time ON recording_segments(start_time);

-- ============= RECORDING EVENTS =============

CREATE TABLE recording_events (
  id BIGSERIAL PRIMARY KEY,
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(100), -- participant_joined, participant_left, codec_changed, quality_issue, error
  severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical

  -- Event data
  event_data JSONB,
  participant_id UUID,

  -- Timestamps
  occurred_at TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_events_recording_id ON recording_events(recording_id);
CREATE INDEX idx_recording_events_type ON recording_events(event_type);
CREATE INDEX idx_recording_events_time ON recording_events(occurred_at);
CREATE INDEX idx_recording_events_severity ON recording_events(severity);

-- ============= RECORDING QUALITY METRICS =============

CREATE TABLE recording_quality_snapshots (
  id BIGSERIAL PRIMARY KEY,
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Video metrics
  video_bitrate_kbps INTEGER,
  video_frame_rate NUMERIC(5, 2),
  video_resolution VARCHAR(20),
  video_codec VARCHAR(50),

  -- Audio metrics
  audio_bitrate_kbps INTEGER,
  audio_sample_rate INTEGER,
  audio_codec VARCHAR(50),

  -- Network metrics
  packet_loss_percent NUMERIC(5, 2),
  rtt_ms INTEGER,
  jitter_ms INTEGER,
  bandwidth_available_kbps INTEGER,

  -- CPU/Memory
  encoder_cpu_usage_percent NUMERIC(5, 2),
  system_cpu_usage_percent NUMERIC(5, 2),
  system_memory_usage_percent NUMERIC(5, 2),

  -- Quality score
  overall_quality_score NUMERIC(3, 1), -- 0-10

  snapshot_time TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_quality_snapshots_recording_id ON recording_quality_snapshots(recording_id);
CREATE INDEX idx_quality_snapshots_time ON recording_quality_snapshots(snapshot_time);

-- ============= RECORDING ERRORS AND RECOVERY =============

CREATE TABLE recording_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Error details
  error_code VARCHAR(50),
  error_message TEXT,
  stack_trace TEXT,

  -- Context
  component VARCHAR(100), -- mediasoup, ffmpeg, s3, database
  context JSONB,

  -- Recovery
  is_recoverable BOOLEAN DEFAULT false,
  recovery_attempted BOOLEAN DEFAULT false,
  recovery_successful BOOLEAN DEFAULT false,

  -- Timeline
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_errors_recording_id ON recording_errors(recording_id);
CREATE INDEX idx_recording_errors_code ON recording_errors(error_code);
CREATE INDEX idx_recording_errors_component ON recording_errors(component);

-- ============= RECORDING DOWNLOADS =============

CREATE TABLE recording_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Download info
  requested_by UUID,
  request_method VARCHAR(50), -- presigned_url, direct_download, streaming

  -- File info
  file_format VARCHAR(50) DEFAULT 'mp4', -- mp4, webm, mkv, etc.
  file_size_bytes BIGINT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, expired
  download_started_at TIMESTAMP,
  download_completed_at TIMESTAMP,

  -- Access control
  presigned_url_expires_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_downloads_recording_id ON recording_downloads(recording_id);
CREATE INDEX idx_recording_downloads_status ON recording_downloads(status);
CREATE INDEX idx_recording_downloads_requested_by ON recording_downloads(requested_by);

-- ============= RECORDING COMPLIANCE AND CONSENT =============

CREATE TABLE recording_consent_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,
  consent_id UUID REFERENCES consent_records(id) ON DELETE SET NULL,

  -- Link details
  verified BOOLEAN DEFAULT false,
  verification_timestamp TIMESTAMP,

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_consent_link_recording ON recording_consent_link(recording_id);
CREATE INDEX idx_recording_consent_link_consent ON recording_consent_link(consent_id);

-- ============= RECORDING RECOVERY/BACKUP =============

CREATE TABLE recording_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recording_sessions(id) ON DELETE CASCADE,

  -- Backup info
  backup_location VARCHAR(500),
  backup_type VARCHAR(50), -- full, incremental, snapshot

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  backed_up_at TIMESTAMP,

  -- Verification
  checksum VARCHAR(64), -- SHA256
  verified BOOLEAN DEFAULT false,

  -- Lifecycle
  retention_days INT DEFAULT 365,
  expiration_date TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (recording_id) REFERENCES recording_sessions(id)
);

CREATE INDEX idx_recording_backups_recording_id ON recording_backups(recording_id);
CREATE INDEX idx_recording_backups_created ON recording_backups(created_at);

-- ============= RECORDING STATISTICS TABLE =============

CREATE TABLE recording_statistics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE DEFAULT CURRENT_DATE,

  -- Count metrics
  total_recordings INT DEFAULT 0,
  completed_recordings INT DEFAULT 0,
  failed_recordings INT DEFAULT 0,

  -- Storage metrics
  total_storage_gb NUMERIC(12, 2) DEFAULT 0,
  avg_recording_size_gb NUMERIC(12, 2),

  -- Quality metrics
  avg_bitrate_kbps NUMERIC(8, 2),
  avg_video_framerate NUMERIC(5, 2),
  avg_packet_loss_percent NUMERIC(5, 2),

  -- Duration metrics
  total_recording_hours NUMERIC(10, 2),
  avg_recording_duration_minutes NUMERIC(8, 2),

  -- Cost metrics
  estimated_storage_cost NUMERIC(10, 4),
  estimated_transfer_cost NUMERIC(10, 4),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recording_statistics_date ON recording_statistics(metric_date);

-- ============= VIEWS FOR EASIER QUERYING =============

-- View: Active recordings
CREATE OR REPLACE VIEW active_recordings AS
SELECT
  rs.id,
  rs.call_id,
  rs.recording_status,
  rs.initiated_at,
  rs.started_at,
  rs.video_codec,
  rs.bitrate_kbps,
  COUNT(DISTINCT rp.participant_id) as participant_count,
  EXTRACT(EPOCH FROM (NOW() - rs.started_at)) as duration_seconds
FROM recording_sessions rs
LEFT JOIN recording_participants rp ON rs.id = rp.recording_id
WHERE rs.recording_status IN ('recording', 'pending')
GROUP BY rs.id, rs.call_id;

-- View: Recording health
CREATE OR REPLACE VIEW recording_health_status AS
SELECT
  rs.id,
  rs.recording_status,
  COUNT(CASE WHEN re.error_code IS NOT NULL THEN 1 END) as error_count,
  COUNT(CASE WHEN re.is_recoverable THEN 1 END) as recoverable_errors,
  MAX(re.occurred_at) as last_error_time,
  AVG(rqs.overall_quality_score) as avg_quality_score
FROM recording_sessions rs
LEFT JOIN recording_errors re ON rs.id = re.recording_id
LEFT JOIN recording_quality_snapshots rqs ON rs.id = rqs.recording_id
GROUP BY rs.id, rs.recording_status;

COMMIT;
