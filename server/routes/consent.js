/**
 * Consent Management API Routes
 *
 * Handles recording consent across jurisdictions
 * Implements GDPR, CCPA, LGPD, PIPEDA, PDPA compliance
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Module dependencies (initialized by parent)
let consentManager = null;
let digitalSignatureService = null;
let pool = null;

/**
 * Initialize consent routes with dependencies
 */
function initConsentRoutes(manager, signatureService, database) {
  consentManager = manager;
  digitalSignatureService = signatureService;
  pool = database;
}

/**
 * POST /api/consent/request
 * Create new consent request for call participants
 *
 * Request body:
 * {
 *   "callId": "uuid",
 *   "initiatorId": "uuid",
 *   "participants": [
 *     { "id": "uuid", "email": "user@example.com", "countryCode": "US" },
 *     ...
 *   ]
 * }
 */
router.post('/request', async (req, res) => {
  const { callId, initiatorId, participants } = req.body;

  if (!callId || !participants || !Array.isArray(participants)) {
    return res.status(400).json({
      error: 'callId and participants array required'
    });
  }

  try {
    // Create consent request
    const request = consentManager.createConsentRequest(callId, participants);

    // Store in database
    await pool.query(
      `INSERT INTO consent_requests(id, call_id, initiator_id, request_data, status)
       VALUES($1, $2, $3, $4, $5)`,
      [request.id, callId, initiatorId, JSON.stringify(request), 'pending']
    );

    res.status(201).json({
      requestId: request.id,
      callId,
      status: 'pending',
      participants: request.participants.map(p => ({
        id: p.id,
        email: p.email,
        jurisdiction: p.jurisdiction,
        consentStatus: 'pending'
      })),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    console.error('Failed to create consent request:', err);
    res.status(500).json({ error: 'Failed to create consent request' });
  }
});

/**
 * GET /api/consent/request/:requestId
 * Get consent request details
 */
router.get('/request/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    const status = consentManager.getConsentStatus(requestId);

    if (!status) {
      return res.status(404).json({ error: 'Consent request not found' });
    }

    res.json(status);
  } catch (err) {
    console.error('Failed to get consent request:', err);
    res.status(500).json({ error: 'Failed to get consent request' });
  }
});

/**
 * POST /api/consent/request/:requestId/consent
 * Record participant consent
 *
 * Request body:
 * {
 *   "participantId": "uuid",
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "consentType": "recording",
 *   "signature": "base64-encoded-signature"
 * }
 */
router.post('/request/:requestId/consent', async (req, res) => {
  const { requestId } = req.params;
  const { participantId, name, email, consentType, signature } = req.body;

  if (!participantId || !name || !email || !consentType) {
    return res.status(400).json({
      error: 'participantId, name, email, consentType required'
    });
  }

  try {
    // Verify signature if provided
    if (signature) {
      const isValid = digitalSignatureService.verifySignature(
        JSON.stringify({ name, email, consentType }),
        signature,
        participantId
      );

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Record consent
    const result = consentManager.recordConsent(requestId, participantId, {
      name,
      email,
      consentType,
      signature: signature || null,
      timestamp: new Date().toISOString()
    });

    // Store in database
    const consentHash = consentManager.hashConsent({
      name, email, consentType
    });

    await pool.query(
      `INSERT INTO participant_consents(request_id, participant_id, consent_type, consent_hash, signature)
       VALUES($1, $2, $3, $4, $5)`,
      [requestId, participantId, consentType, consentHash, signature || null]
    );

    // Check if recording can proceed
    const canRecord = consentManager.canRecordCall(requestId);

    res.json({
      requestId,
      participantId,
      consentStatus: result.consentStatus,
      requestStatus: result.requestStatus,
      canRecordCall: canRecord,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to record consent:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/consent/request/:requestId/reject
 * Participant rejects consent
 *
 * Request body:
 * {
 *   "participantId": "uuid",
 *   "reason": "Not comfortable with recording"
 * }
 */
router.post('/request/:requestId/reject', async (req, res) => {
  const { requestId } = req.params;
  const { participantId, reason } = req.body;

  if (!participantId) {
    return res.status(400).json({ error: 'participantId required' });
  }

  try {
    const result = consentManager.rejectConsent(
      requestId,
      participantId,
      reason || 'Not specified'
    );

    // Store in database
    await pool.query(
      `INSERT INTO consent_rejections(request_id, participant_id, reason)
       VALUES($1, $2, $3)`,
      [requestId, participantId, reason || null]
    );

    res.json({
      requestId,
      participantId,
      consentStatus: 'rejected',
      rejectedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to reject consent:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/consent/request/:requestId/verify
 * Verify consent integrity
 *
 * Request body:
 * {
 *   "participantId": "uuid",
 *   "consentHash": "sha256-hash"
 * }
 */
router.post('/request/:requestId/verify', async (req, res) => {
  const { requestId } = req.params;
  const { participantId, consentHash } = req.body;

  if (!participantId || !consentHash) {
    return res.status(400).json({
      error: 'participantId and consentHash required'
    });
  }

  try {
    const isValid = consentManager.verifyConsentIntegrity(
      requestId,
      participantId,
      consentHash
    );

    res.json({
      requestId,
      participantId,
      verified: isValid,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to verify consent:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/consent/audit/:requestId
 * Get compliance audit log
 */
router.get('/audit/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    const auditLog = consentManager.getAuditLog(requestId);

    if (auditLog.length === 0) {
      return res.status(404).json({ error: 'No audit log found' });
    }

    res.json({
      requestId,
      auditLog,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to get audit log:', err);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * GET /api/consent/report
 * Get compliance report for date range
 *
 * Query parameters:
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 */
router.get('/report', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'startDate and endDate required (YYYY-MM-DD format)'
    });
  }

  try {
    const report = consentManager.getComplianceReport(startDate, endDate);

    res.json({
      ...report,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to generate compliance report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * POST /api/consent/right-to-be-forgotten
 * Delete participant data (GDPR/LGPD/PIPEDA/PDPA)
 *
 * Request body:
 * {
 *   "requestId": "uuid",
 *   "participantId": "uuid"
 * }
 */
router.post('/right-to-be-forgotten', async (req, res) => {
  const { requestId, participantId } = req.body;

  if (!requestId || !participantId) {
    return res.status(400).json({
      error: 'requestId and participantId required'
    });
  }

  try {
    const result = consentManager.deleteParticipantData(requestId, participantId);

    // Mark recording data for deletion
    await pool.query(
      `UPDATE recording_sessions
       SET deleted_at = NOW()
       WHERE call_id IN (
         SELECT call_id FROM consent_requests WHERE id = $1
       )`,
      [requestId]
    );

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: 'Data marked for deletion in compliance with right to be forgotten'
    });
  } catch (err) {
    console.error('Failed to delete participant data:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/consent/export/:requestId/:participantId
 * Export participant data (GDPR data portability)
 */
router.get('/export/:requestId/:participantId', async (req, res) => {
  const { requestId, participantId } = req.params;

  try {
    const data = consentManager.exportParticipantData(requestId, participantId);

    res.json({
      ...data,
      format: 'JSON',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to export participant data:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/consent/retention-schedule
 * Get data retention and deletion schedule
 */
router.get('/retention-schedule', async (req, res) => {
  try {
    const schedule = consentManager.getRetentionSchedule();

    res.json({
      items: schedule,
      count: schedule.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to get retention schedule:', err);
    res.status(500).json({ error: 'Failed to get retention schedule' });
  }
});

/**
 * POST /api/consent/cleanup-expired
 * Clean up expired consents (administrative)
 */
router.post('/cleanup-expired', async (req, res) => {
  try {
    const result = consentManager.cleanupExpiredConsents();

    // Clean up database records
    await pool.query(
      `UPDATE consent_requests
       SET status = 'archived'
       WHERE created_at < NOW() - INTERVAL '90 days'
       AND status = 'complete'`
    );

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: `Cleaned up ${result.count} expired consent records`
    });
  } catch (err) {
    console.error('Failed to cleanup expired consents:', err);
    res.status(500).json({ error: 'Failed to cleanup expired consents' });
  }
});

/**
 * GET /api/consent/jurisdictions
 * Get available jurisdictions and requirements
 */
router.get('/jurisdictions', (req, res) => {
  const jurisdictions = consentManager.jurisdictions;

  res.json({
    available: Object.keys(jurisdictions),
    jurisdictions: Object.entries(jurisdictions).reduce((acc, [code, data]) => {
      acc[code] = {
        name: data.name,
        region: data.region,
        consentTypes: data.consentTypes,
        retentionDays: data.retentionDays,
        requiresSignature: data.requiresSignature,
        rightToBeForotten: data.rightToBeForotten,
        dataPortability: data.dataPortability
      };
      return acc;
    }, {})
  });
});

/**
 * GET /api/consent/status/:participantId
 * Get consent status for participant
 *
 * Query parameters:
 * - limit: number of recent requests
 */
router.get('/status/:participantId', async (req, res) => {
  const { participantId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const result = await pool.query(
      `SELECT cr.id, cr.call_id, cr.status, pc.consent_type, pc.consent_hash
       FROM consent_requests cr
       JOIN participant_consents pc ON cr.id = pc.request_id
       WHERE pc.participant_id = $1
       ORDER BY cr.created_at DESC
       LIMIT $2`,
      [participantId, parseInt(limit)]
    );

    res.json({
      participantId,
      totalRequests: result.rows.length,
      requests: result.rows.map(row => ({
        requestId: row.id,
        callId: row.call_id,
        status: row.status,
        consentType: row.consent_type,
        consentHash: row.consent_hash
      }))
    });
  } catch (err) {
    console.error('Failed to get participant status:', err);
    res.status(500).json({ error: 'Failed to get participant status' });
  }
});

module.exports = { router, initConsentRoutes };
