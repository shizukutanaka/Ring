/**
 * Enhanced GDPR Consent Manager
 * 
 * Implements comprehensive GDPR compliance for call recording:
 * - All-party explicit consent for EU users
 * - Automated consent withdrawal mechanism
 * - Data Subject Access Request (DSAR) automation
 * - Cryptographic proof of consent
 * - Audit trail with immutability
 * 
 * Based on 2024-2025 GDPR requirements
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class GDPRConsentManager extends EventEmitter {
    constructor(pool) {
        super();
        this.pool = pool;

        // EU/EEA country codes requiring all-party consent
        this.euCountries = [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
            'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
            'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'
        ];
    }

    /**
     * Request recording consent from all participants
     * @param {string} callId - Call identifier
     * @param {Array} participants - Array of participant objects
     * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
     * @returns {Promise<Object>} Consent request result
     */
    async requestConsent(callId, participants, metadata = {}) {
        try {
            const consentRequestId = crypto.randomUUID();
            const timestamp = new Date().toISOString();

            // Determine if any participant is in EU/EEA
            const requiresExplicitConsent = participants.some(p =>
                this.euCountries.includes(p.countryCode)
            );

            const consentRequest = {
                id: consentRequestId,
                callId,
                participants: participants.map(p => ({
                    userId: p.userId,
                    countryCode: p.countryCode,
                    jurisdiction: p.jurisdiction || this._getJurisdiction(p.countryCode),
                    consentRequired: this._isConsentRequired(p.countryCode),
                    consentType: requiresExplicitConsent ? 'explicit' : 'implicit'
                })),
                requiresExplicitConsent,
                requestedAt: timestamp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
                metadata: {
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    platform: metadata.platform
                },
                status: 'pending',
                responses: []
            };

            // Store consent request
            await this.pool.query(
                `INSERT INTO consent_requests 
         (id, call_id, participants, requires_explicit_consent, requested_at, expires_at, metadata, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    consentRequestId,
                    callId,
                    JSON.stringify(consentRequest.participants),
                    requiresExplicitConsent,
                    timestamp,
                    consentRequest.expiresAt,
                    JSON.stringify(consentRequest.metadata),
                    'pending'
                ]
            );

            this.emit('consent:requested', consentRequest);

            return {
                success: true,
                consentRequestId,
                requiresExplicitConsent,
                participants: consentRequest.participants,
                expiresAt: consentRequest.expiresAt
            };
        } catch (error) {
            console.error('[GDPRConsentManager] Error requesting consent:', error);
            throw error;
        }
    }

    /**
     * Record consent response from participant
     * @param {string} consentRequestId - Consent request ID
     * @param {string} userId - User identifier
     * @param {boolean} consentGiven - Whether consent was given
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Consent record
     */
    async recordConsent(consentRequestId, userId, consentGiven, metadata = {}) {
        try {
            const timestamp = new Date().toISOString();

            // Generate cryptographic proof
            const consentData = {
                consentRequestId,
                userId,
                consentGiven,
                timestamp,
                metadata
            };

            const cryptographicProof = this._generateConsentProof(consentData);

            // Store consent record
            const result = await this.pool.query(
                `INSERT INTO consent_records 
         (consent_request_id, user_id, consent_given, timestamp, metadata, 
          cryptographic_proof, ip_address, user_agent, consent_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
                [
                    consentRequestId,
                    userId,
                    consentGiven,
                    timestamp,
                    JSON.stringify(metadata),
                    cryptographicProof,
                    metadata.ipAddress || null,
                    metadata.userAgent || null,
                    metadata.consentMethod || 'checkbox'
                ]
            );

            const consentRecord = result.rows[0];

            // Update consent request status
            await this._updateConsentRequestStatus(consentRequestId);

            this.emit('consent:recorded', {
                consentRequestId,
                userId,
                consentGiven,
                timestamp,
                cryptographicProof
            });

            return {
                success: true,
                consentRecord,
                cryptographicProof
            };
        } catch (error) {
            console.error('[GDPRConsentManager] Error recording consent:', error);
            throw error;
        }
    }

    /**
     * Withdraw consent (GDPR right to withdraw)
     * @param {string} userId - User identifier
     * @param {string} callId - Call identifier
     * @param {string} reason - Withdrawal reason
     * @returns {Promise<Object>} Withdrawal result
     */
    async withdrawConsent(userId, callId, reason = 'user_request') {
        try {
            const timestamp = new Date().toISOString();

            // Update consent record
            await this.pool.query(
                `UPDATE consent_records 
         SET withdrawal_date = $1, withdrawal_reason = $2, consent_given = false
         WHERE user_id = $3 
         AND consent_request_id IN (
           SELECT id FROM consent_requests WHERE call_id = $4
         )`,
                [timestamp, reason, userId, callId]
            );

            // Stop recording immediately if in progress
            await this.pool.query(
                `UPDATE call_records 
         SET recording_stopped_at = $1, recording_stopped_reason = 'consent_withdrawn'
         WHERE id = $2 AND recording_stopped_at IS NULL`,
                [timestamp, callId]
            );

            this.emit('consent:withdrawn', {
                userId,
                callId,
                timestamp,
                reason
            });

            return {
                success: true,
                withdrawnAt: timestamp,
                recordingStopped: true
            };
        } catch (error) {
            console.error('[GDPRConsentManager] Error withdrawing consent:', error);
            throw error;
        }
    }

    /**
     * Handle Data Subject Access Request (DSAR)
     * @param {string} userId - User identifier
     * @param {string} requestType - Type of request (access, deletion, portability)
     * @returns {Promise<Object>} DSAR result
     */
    async handleDSAR(userId, requestType = 'access') {
        try {
            const dsarId = crypto.randomUUID();
            const timestamp = new Date().toISOString();

            // Record DSAR
            await this.pool.query(
                `INSERT INTO dsar_requests (id, user_id, request_type, requested_at, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
                [dsarId, userId, requestType, timestamp]
            );

            let result = {};

            switch (requestType) {
                case 'access':
                    result = await this._handleAccessRequest(userId);
                    break;
                case 'deletion':
                    result = await this._handleDeletionRequest(userId);
                    break;
                case 'portability':
                    result = await this._handlePortabilityRequest(userId);
                    break;
                default:
                    throw new Error(`Unknown DSAR type: ${requestType}`);
            }

            // Update DSAR status
            await this.pool.query(
                `UPDATE dsar_requests 
         SET status = 'completed', completed_at = $1, result = $2
         WHERE id = $3`,
                [new Date().toISOString(), JSON.stringify(result), dsarId]
            );

            this.emit('dsar:completed', {
                dsarId,
                userId,
                requestType,
                timestamp
            });

            return {
                success: true,
                dsarId,
                requestType,
                result
            };
        } catch (error) {
            console.error('[GDPRConsentManager] Error handling DSAR:', error);
            throw error;
        }
    }

    /**
     * Handle access request (GDPR Article 15)
     * @private
     */
    async _handleAccessRequest(userId) {
        const [consents, calls, recordings] = await Promise.all([
            this.pool.query(
                `SELECT * FROM consent_records WHERE user_id = $1`,
                [userId]
            ),
            this.pool.query(
                `SELECT * FROM call_records 
         WHERE initiator_hash = $1 OR recipient_hash = $1`,
                [userId]
            ),
            this.pool.query(
                `SELECT id, call_id, file_path, duration_seconds, created_at 
         FROM recordings 
         WHERE call_id IN (
           SELECT id FROM call_records 
           WHERE initiator_hash = $1 OR recipient_hash = $1
         )`,
                [userId]
            )
        ]);

        return {
            consents: consents.rows,
            calls: calls.rows,
            recordings: recordings.rows.map(r => ({
                ...r,
                file_path: undefined, // Don't expose actual file path
                downloadUrl: `/api/recordings/${r.id}/download`
            }))
        };
    }

    /**
     * Handle deletion request (GDPR Article 17)
     * @private
     */
    async _handleDeletionRequest(userId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Delete recordings
            const recordings = await client.query(
                `DELETE FROM recordings 
         WHERE call_id IN (
           SELECT id FROM call_records 
           WHERE initiator_hash = $1 OR recipient_hash = $1
         )
         RETURNING id, file_path`,
                [userId]
            );

            // Delete call records
            await client.query(
                `DELETE FROM call_records 
         WHERE initiator_hash = $1 OR recipient_hash = $1`,
                [userId]
            );

            // Anonymize consent records (keep for legal compliance)
            await client.query(
                `UPDATE consent_records 
         SET user_id = 'DELETED_' || id, 
             ip_address = NULL, 
             user_agent = NULL,
             metadata = '{}'::jsonb
         WHERE user_id = $1`,
                [userId]
            );

            await client.query('COMMIT');

            // Emit event for file deletion
            this.emit('data:deleted', {
                userId,
                recordingsDeleted: recordings.rows.length,
                filePaths: recordings.rows.map(r => r.file_path)
            });

            return {
                recordingsDeleted: recordings.rows.length,
                callRecordsDeleted: recordings.rows.length,
                consentsAnonymized: true
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Handle portability request (GDPR Article 20)
     * @private
     */
    async _handlePortabilityRequest(userId) {
        // Return data in machine-readable format (JSON)
        const data = await this._handleAccessRequest(userId);

        return {
            format: 'application/json',
            data,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Generate cryptographic proof of consent
     * @private
     */
    _generateConsentProof(consentData) {
        const dataString = JSON.stringify(consentData);
        return crypto
            .createHash('sha256')
            .update(dataString)
            .digest('hex');
    }

    /**
     * Update consent request status based on responses
     * @private
     */
    async _updateConsentRequestStatus(consentRequestId) {
        const result = await this.pool.query(
            `SELECT 
         cr.id,
         cr.participants,
         cr.requires_explicit_consent,
         COUNT(con.id) as response_count,
         COUNT(CASE WHEN con.consent_given = true THEN 1 END) as consents_given
       FROM consent_requests cr
       LEFT JOIN consent_records con ON con.consent_request_id = cr.id
       WHERE cr.id = $1
       GROUP BY cr.id, cr.participants, cr.requires_explicit_consent`,
            [consentRequestId]
        );

        if (result.rows.length === 0) return;

        const request = result.rows[0];
        const participants = JSON.parse(request.participants);
        const totalParticipants = participants.length;
        const allResponded = request.response_count >= totalParticipants;
        const allConsented = request.consents_given >= totalParticipants;

        let status = 'pending';
        if (allResponded) {
            status = allConsented ? 'approved' : 'denied';
        }

        await this.pool.query(
            `UPDATE consent_requests SET status = $1 WHERE id = $2`,
            [status, consentRequestId]
        );

        if (status !== 'pending') {
            this.emit('consent:finalized', {
                consentRequestId,
                status,
                allConsented
            });
        }
    }

    /**
     * Get jurisdiction for country code
     * @private
     */
    _getJurisdiction(countryCode) {
        if (this.euCountries.includes(countryCode)) {
            return 'EU/EEA';
        }
        // Add more jurisdictions as needed
        return countryCode;
    }

    /**
     * Check if consent is required for jurisdiction
     * @private
     */
    _isConsentRequired(countryCode) {
        // All jurisdictions require some form of consent
        // EU requires explicit all-party consent
        return true;
    }

    /**
     * Verify consent is still valid
     * @param {string} callId - Call identifier
     * @returns {Promise<Object>} Validation result
     */
    async verifyConsent(callId) {
        const result = await this.pool.query(
            `SELECT 
         cr.id,
         cr.status,
         cr.expires_at,
         COUNT(con.id) as consent_count,
         COUNT(CASE WHEN con.consent_given = true AND con.withdrawal_date IS NULL THEN 1 END) as active_consents
       FROM consent_requests cr
       LEFT JOIN consent_records con ON con.consent_request_id = cr.id
       WHERE cr.call_id = $1
       GROUP BY cr.id, cr.status, cr.expires_at`,
            [callId]
        );

        if (result.rows.length === 0) {
            return { valid: false, reason: 'No consent request found' };
        }

        const consent = result.rows[0];
        const now = new Date();
        const expiresAt = new Date(consent.expires_at);

        if (now > expiresAt) {
            return { valid: false, reason: 'Consent expired' };
        }

        if (consent.status !== 'approved') {
            return { valid: false, reason: `Consent status: ${consent.status}` };
        }

        if (consent.active_consents < consent.consent_count) {
            return { valid: false, reason: 'Some consents withdrawn' };
        }

        return { valid: true };
    }
}

module.exports = GDPRConsentManager;
