-- Migration: Add Consent Management Tables
-- Date: 2025-11-17
-- Purpose: Add database support for multi-jurisdiction consent management

-- ============= CONSENT REQUESTS =============

CREATE TABLE consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES call_records(id) ON DELETE CASCADE,
  initiator_id UUID,

  -- Request metadata
  status VARCHAR(50) DEFAULT 'pending', -- pending, partial, complete, rejected, expired
  request_data JSONB,
  request_type VARCHAR(50) DEFAULT 'recording', -- recording, storage, processing, analytics

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  completed_at TIMESTAMP,

  FOREIGN KEY (call_id) REFERENCES call_records(id)
);

CREATE INDEX idx_consent_requests_call_id ON consent_requests(call_id);
CREATE INDEX idx_consent_requests_status ON consent_requests(status);
CREATE INDEX idx_consent_requests_expires ON consent_requests(expires_at);

-- ============= PARTICIPANT CONSENTS =============

CREATE TABLE participant_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES consent_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,

  -- Consent details
  consent_type VARCHAR(50), -- recording, storage, processing, analytics
  jurisdiction VARCHAR(50), -- GDPR, CCPA, LGPD, PIPEDA, PDPA, NZDPA

  -- Participant info
  participant_name VARCHAR(255),
  participant_email VARCHAR(255),

  -- Signature and integrity
  signature TEXT, -- Base64-encoded RSA signature
  signature_algorithm VARCHAR(50) DEFAULT 'RSA-SHA256',
  signature_fingerprint VARCHAR(64), -- SHA-256 fingerprint
  consent_hash VARCHAR(64), -- SHA-256 hash of consent data

  -- Timestamps
  consented_at TIMESTAMP DEFAULT NOW(),
  signature_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_participant_consents_request ON participant_consents(request_id);
CREATE INDEX idx_participant_consents_participant ON participant_consents(participant_id);
CREATE INDEX idx_participant_consents_jurisdiction ON participant_consents(jurisdiction);

-- ============= CONSENT REJECTIONS =============

CREATE TABLE consent_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES consent_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,

  -- Rejection details
  reason TEXT,
  rejection_type VARCHAR(50) DEFAULT 'explicit', -- explicit, timeout, withdrawal

  -- Timestamps
  rejected_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_consent_rejections_request ON consent_rejections(request_id);
CREATE INDEX idx_consent_rejections_participant ON consent_rejections(participant_id);

-- ============= CONSENT AUDIT LOG =============

CREATE TABLE consent_audit_log (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID REFERENCES consent_requests(id) ON DELETE CASCADE,
  participant_id UUID,

  -- Audit details
  action VARCHAR(100), -- consent_given, consent_rejected, data_deleted, data_exported, signature_verified
  audit_type VARCHAR(50), -- compliance, security, administrative
  details JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,
  actor_id UUID,

  -- Timestamps
  occurred_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_audit_log_request ON consent_audit_log(request_id);
CREATE INDEX idx_audit_log_action ON consent_audit_log(action);
CREATE INDEX idx_audit_log_time ON consent_audit_log(occurred_at);

-- ============= DIGITAL SIGNATURES =============

CREATE TABLE digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,

  -- Key information
  public_key TEXT NOT NULL,
  key_fingerprint VARCHAR(64) NOT NULL UNIQUE,
  algorithm VARCHAR(50) DEFAULT 'RSA-SHA256',
  key_size INT DEFAULT 2048,

  -- Validity
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revocation_reason VARCHAR(255),

  -- Status
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_digital_signatures_participant ON digital_signatures(participant_id);
CREATE INDEX idx_digital_signatures_fingerprint ON digital_signatures(key_fingerprint);
CREATE INDEX idx_digital_signatures_active ON digital_signatures(active);

-- ============= CONSENT CERTIFICATES =============

CREATE TABLE consent_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES consent_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  signature_id UUID REFERENCES digital_signatures(id),

  -- Certificate data
  certificate_data JSONB NOT NULL,
  certificate_hash VARCHAR(64),

  -- Validity
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  verified_at TIMESTAMP,

  -- Status
  valid BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_certificates_request ON consent_certificates(request_id);
CREATE INDEX idx_certificates_participant ON consent_certificates(participant_id);
CREATE INDEX idx_certificates_signature ON consent_certificates(signature_id);
CREATE INDEX idx_certificates_valid ON consent_certificates(valid);

-- ============= RIGHT TO BE FORGOTTEN =============

CREATE TABLE right_to_be_forgotten_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  request_id UUID REFERENCES consent_requests(id),

  -- Request details
  request_type VARCHAR(50) DEFAULT 'full', -- full, partial
  jurisdiction VARCHAR(50), -- GDPR, LGPD, PIPEDA, PDPA, NZDPA
  reason TEXT,

  -- Processing
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,

  -- Data deletion
  data_deleted BOOLEAN DEFAULT false,
  recordings_deleted INT DEFAULT 0,
  metadata_deleted INT DEFAULT 0,

  -- Verification
  verified_by UUID,
  verified_at TIMESTAMP,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_rtbf_participant ON right_to_be_forgotten_requests(participant_id);
CREATE INDEX idx_rtbf_status ON right_to_be_forgotten_requests(status);
CREATE INDEX idx_rtbf_jurisdiction ON right_to_be_forgotten_requests(jurisdiction);

-- ============= DATA PORTABILITY EXPORTS =============

CREATE TABLE data_portability_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  request_id UUID REFERENCES consent_requests(id),

  -- Export details
  export_format VARCHAR(50) DEFAULT 'JSON', -- JSON, CSV, XML
  jurisdiction VARCHAR(50),
  export_data BYTEA, -- Encrypted export data
  data_hash VARCHAR(64),

  -- Encryption
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_key_id UUID,

  -- Access control
  access_token VARCHAR(255) UNIQUE,
  access_expires_at TIMESTAMP,
  accessed_at TIMESTAMP,
  access_count INT DEFAULT 0,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  exported_at TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_exports_participant ON data_portability_exports(participant_id);
CREATE INDEX idx_exports_token ON data_portability_exports(access_token);
CREATE INDEX idx_exports_expires ON data_portability_exports(access_expires_at);

-- ============= CONSENT COMPLIANCE METRICS =============

CREATE TABLE consent_compliance_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE DEFAULT CURRENT_DATE,

  -- Count metrics
  total_consent_requests INT DEFAULT 0,
  completed_consents INT DEFAULT 0,
  partial_consents INT DEFAULT 0,
  rejected_consents INT DEFAULT 0,
  expired_consents INT DEFAULT 0,

  -- Jurisdiction breakdown
  gdpr_requests INT DEFAULT 0,
  ccpa_requests INT DEFAULT 0,
  lgpd_requests INT DEFAULT 0,
  pipeda_requests INT DEFAULT 0,
  pdpa_requests INT DEFAULT 0,
  nzdpa_requests INT DEFAULT 0,

  -- Signature metrics
  signed_consents INT DEFAULT 0,
  unsigned_consents INT DEFAULT 0,
  signature_failures INT DEFAULT 0,

  -- Right to be forgotten
  rtbf_requests INT DEFAULT 0,
  rtbf_completed INT DEFAULT 0,

  -- Data portability
  export_requests INT DEFAULT 0,
  export_completed INT DEFAULT 0,

  -- Verification metrics
  verified_signatures INT DEFAULT 0,
  failed_verifications INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_metrics_date ON consent_compliance_metrics(metric_date);

-- ============= DATA RETENTION SCHEDULE =============

CREATE TABLE data_retention_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES consent_requests(id) ON DELETE CASCADE,
  participant_id UUID,

  -- Retention details
  jurisdiction VARCHAR(50),
  retention_days INT,
  retention_reason VARCHAR(255),

  -- Schedule
  created_at TIMESTAMP DEFAULT NOW(),
  retention_until TIMESTAMP,
  deletion_scheduled BOOLEAN DEFAULT false,
  deletion_executed BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES consent_requests(id)
);

CREATE INDEX idx_retention_schedule_retention ON data_retention_schedule(retention_until);
CREATE INDEX idx_retention_schedule_deleted ON data_retention_schedule(deleted_at);

-- ============= VIEWS FOR COMPLIANCE =============

-- View: Active consent requests
CREATE OR REPLACE VIEW active_consent_requests AS
SELECT
  cr.id,
  cr.call_id,
  cr.status,
  cr.created_at,
  cr.expires_at,
  COUNT(DISTINCT pc.participant_id) as participants_consented,
  COUNT(DISTINCT cr_reject.participant_id) as participants_rejected
FROM consent_requests cr
LEFT JOIN participant_consents pc ON cr.id = pc.request_id AND pc.consented_at IS NOT NULL
LEFT JOIN consent_rejections cr_reject ON cr.id = cr_reject.request_id
WHERE cr.status IN ('pending', 'partial')
AND cr.expires_at > NOW()
GROUP BY cr.id, cr.call_id, cr.status, cr.created_at, cr.expires_at;

-- View: Jurisdiction compliance summary
CREATE OR REPLACE VIEW jurisdiction_compliance_summary AS
SELECT
  pc.jurisdiction,
  COUNT(*) as total_consents,
  COUNT(CASE WHEN pc.consented_at IS NOT NULL THEN 1 END) as consented,
  COUNT(CASE WHEN cr.rejected_at IS NOT NULL THEN 1 END) as rejected,
  ROUND(
    COUNT(CASE WHEN pc.consented_at IS NOT NULL THEN 1 END)::NUMERIC /
    COUNT(*) * 100, 2
  ) as consent_rate
FROM participant_consents pc
LEFT JOIN consent_rejections cr ON pc.request_id = cr.request_id
GROUP BY pc.jurisdiction;

-- View: Pending data deletions
CREATE OR REPLACE VIEW pending_data_deletions AS
SELECT
  rtbf.id,
  rtbf.participant_id,
  rtbf.jurisdiction,
  rtbf.requested_at,
  CURRENT_TIMESTAMP - rtbf.requested_at as pending_duration
FROM right_to_be_forgotten_requests rtbf
WHERE rtbf.status != 'completed';

COMMIT;
