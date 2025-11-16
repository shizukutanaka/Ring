-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry table (for analytics)
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  region_code TEXT,
  app_version TEXT,
  os TEXT,
  anon_user_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call recordings metadata
CREATE TABLE IF NOT EXISTS call_records (
  id UUID PRIMARY KEY,
  initiator_hash TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  region_code TEXT,
  consent_given BOOLEAN,
  consent_timestamp TIMESTAMP,
  consent_signature TEXT,
  recording_duration_seconds INT,
  recording_file_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent logs (audit trail)
CREATE TABLE IF NOT EXISTS consent_logs (
  id BIGSERIAL PRIMARY KEY,
  call_record_id UUID REFERENCES call_records(id),
  user_hash TEXT NOT NULL,
  consent_type TEXT,
  consent_date TIMESTAMP,
  signature TEXT,
  tsa_timestamp TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_telemetry_ts ON telemetry(ts);
CREATE INDEX idx_telemetry_region ON telemetry(region_code);
CREATE INDEX idx_call_records_region ON call_records(region_code);
CREATE INDEX idx_consent_logs_call ON consent_logs(call_record_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;
