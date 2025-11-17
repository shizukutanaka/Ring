/**
 * Consent Management Service
 *
 * Handles recording consent across multiple jurisdictions:
 * - GDPR (EU)
 * - CCPA (California)
 * - eIDAS (Digital signatures)
 * - LGPD (Brazil)
 * - PIPEDA (Canada)
 * - PDPA (Thailand)
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class ConsentManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.jurisdictions = {
      // GDPR - European Union (mandatory consent)
      GDPR: {
        name: 'GDPR',
        region: 'EU',
        requiredFields: ['name', 'email', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'processing', 'analytics'],
        retentionDays: 90,
        requiresSignature: true,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: true
      },

      // CCPA - California (opt-out, less stringent)
      CCPA: {
        name: 'CCPA',
        region: 'US-California',
        requiredFields: ['name', 'email', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'analytics'],
        retentionDays: 365,
        requiresSignature: false,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: false
      },

      // LGPD - Brazil (similar to GDPR)
      LGPD: {
        name: 'LGPD',
        region: 'Brazil',
        requiredFields: ['name', 'email', 'cpf', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'processing'],
        retentionDays: 90,
        requiresSignature: true,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: true
      },

      // PIPEDA - Canada
      PIPEDA: {
        name: 'PIPEDA',
        region: 'Canada',
        requiredFields: ['name', 'email', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'processing'],
        retentionDays: 180,
        requiresSignature: true,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: true
      },

      // PDPA - Thailand
      PDPA: {
        name: 'PDPA',
        region: 'Thailand',
        requiredFields: ['name', 'email', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'processing', 'disclosure'],
        retentionDays: 180,
        requiresSignature: true,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: true
      },

      // NZDPA - New Zealand
      NZDPA: {
        name: 'NZDPA',
        region: 'New Zealand',
        requiredFields: ['name', 'email', 'consentType', 'timestamp'],
        consentTypes: ['recording', 'storage', 'processing'],
        retentionDays: 180,
        requiresSignature: true,
        requiresAuditLog: true,
        rightToBeForotten: true,
        dataPortability: true,
        requiresDataController: true
      }
    };

    this.store = options.store || new Map(); // In-memory store, can be replaced with DB
  }

  /**
   * Detect participant jurisdiction based on IP/location
   */
  detectJurisdiction(userInfo) {
    // This would typically use GeoIP library
    // For now, allow explicit specification or default to GDPR (most strict)
    if (userInfo.jurisdiction) {
      return userInfo.jurisdiction;
    }

    if (userInfo.countryCode) {
      const jurisdictionMap = {
        'AT': 'GDPR', 'BE': 'GDPR', 'BG': 'GDPR', 'HR': 'GDPR', 'CY': 'GDPR',
        'CZ': 'GDPR', 'DK': 'GDPR', 'EE': 'GDPR', 'FI': 'GDPR', 'FR': 'GDPR',
        'DE': 'GDPR', 'GR': 'GDPR', 'HU': 'GDPR', 'IE': 'GDPR', 'IT': 'GDPR',
        'LV': 'GDPR', 'LT': 'GDPR', 'LU': 'GDPR', 'MT': 'GDPR', 'NL': 'GDPR',
        'PL': 'GDPR', 'PT': 'GDPR', 'RO': 'GDPR', 'SK': 'GDPR', 'SI': 'GDPR',
        'ES': 'GDPR', 'SE': 'GDPR',
        'US-CA': 'CCPA', 'CA': 'PIPEDA', 'BR': 'LGPD', 'TH': 'PDPA', 'NZ': 'NZDPA'
      };

      return jurisdictionMap[userInfo.countryCode] || 'GDPR';
    }

    return 'GDPR'; // Default to most strict
  }

  /**
   * Get jurisdiction requirements
   */
  getJurisdictionRequirements(jurisdictionCode) {
    return this.jurisdictions[jurisdictionCode] || this.jurisdictions.GDPR;
  }

  /**
   * Create consent request
   */
  createConsentRequest(callId, participants) {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const request = {
      id: requestId,
      callId,
      timestamp,
      participants: participants.map(p => ({
        id: p.id,
        email: p.email,
        jurisdiction: this.detectJurisdiction(p),
        requirements: this.getJurisdictionRequirements(
          this.detectJurisdiction(p)
        ),
        consentStatus: 'pending',
        consentData: null
      })),
      status: 'pending', // pending, partial, complete
      completedAt: null
    };

    this.store.set(requestId, request);
    this.emit('consent:requested', { requestId, request });

    return request;
  }

  /**
   * Record participant consent
   */
  recordConsent(requestId, participantId, consentData) {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Consent request not found: ${requestId}`);
    }

    const participant = request.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    // Validate consent data
    const requirements = participant.requirements;
    this.validateConsent(consentData, requirements);

    // Store consent
    participant.consentData = {
      ...consentData,
      recordedAt: new Date().toISOString(),
      consentHash: this.hashConsent(consentData),
      signature: consentData.signature || null
    };

    participant.consentStatus = 'consented';

    // Check if all participants consented
    const allConsented = request.participants.every(p => p.consentStatus === 'consented');
    const someConsented = request.participants.some(p => p.consentStatus === 'consented');

    request.status = allConsented ? 'complete' : 'partial';
    if (allConsented) {
      request.completedAt = new Date().toISOString();
    }

    this.emit('consent:recorded', {
      requestId,
      participantId,
      jurisdiction: participant.jurisdiction,
      status: request.status
    });

    return {
      requestId,
      participantId,
      consentStatus: participant.consentStatus,
      requestStatus: request.status
    };
  }

  /**
   * Reject consent
   */
  rejectConsent(requestId, participantId, reason) {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Consent request not found: ${requestId}`);
    }

    const participant = request.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.consentStatus = 'rejected';
    participant.consentData = {
      rejectedAt: new Date().toISOString(),
      reason
    };

    request.status = 'partial';

    this.emit('consent:rejected', {
      requestId,
      participantId,
      reason
    });

    return {
      requestId,
      participantId,
      consentStatus: 'rejected'
    };
  }

  /**
   * Validate consent against jurisdiction requirements
   */
  validateConsent(consentData, requirements) {
    for (const field of requirements.requiredFields) {
      if (!consentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!requirements.consentTypes.includes(consentData.consentType)) {
      throw new Error(`Invalid consent type: ${consentData.consentType}`);
    }

    if (requirements.requiresSignature && !consentData.signature) {
      throw new Error('Signature required for this jurisdiction');
    }

    return true;
  }

  /**
   * Hash consent for integrity verification
   */
  hashConsent(consentData) {
    const dataString = JSON.stringify(consentData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Get consent request status
   */
  getConsentStatus(requestId) {
    const request = this.store.get(requestId);
    if (!request) {
      return null;
    }

    return {
      id: requestId,
      callId: request.callId,
      status: request.status,
      timestamp: request.timestamp,
      completedAt: request.completedAt,
      participants: request.participants.map(p => ({
        id: p.id,
        email: p.email,
        jurisdiction: p.jurisdiction,
        consentStatus: p.consentStatus,
        consentedAt: p.consentData?.recordedAt || null
      }))
    };
  }

  /**
   * Check if recording is allowed
   */
  canRecordCall(requestId) {
    const request = this.store.get(requestId);
    if (!request) {
      return false;
    }

    // Strict: all must consent
    // Moderate: majority (>50%) must consent
    // Lenient: at least one must consent

    const consentedCount = request.participants.filter(
      p => p.consentStatus === 'consented'
    ).length;

    // Default: all must consent (GDPR standard)
    return consentedCount === request.participants.length;
  }

  /**
   * Delete participant data (right to be forgotten)
   */
  async deleteParticipantData(requestId, participantId) {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Consent request not found: ${requestId}`);
    }

    const participant = request.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    if (!participant.requirements.rightToBeForotten) {
      throw new Error('Right to be forgotten not available in this jurisdiction');
    }

    // Mark for deletion
    participant.consentData = {
      deletedAt: new Date().toISOString(),
      reason: 'right_to_be_forgotten',
      deletedBy: participantId
    };

    this.emit('consent:deleted', {
      requestId,
      participantId,
      timestamp: new Date().toISOString()
    });

    return {
      requestId,
      participantId,
      status: 'deleted'
    };
  }

  /**
   * Export participant data (data portability)
   */
  exportParticipantData(requestId, participantId) {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Consent request not found: ${requestId}`);
    }

    const participant = request.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    if (!participant.requirements.dataPortability) {
      throw new Error('Data portability not available in this jurisdiction');
    }

    return {
      participant: {
        id: participant.id,
        email: participant.email,
        jurisdiction: participant.jurisdiction
      },
      consentData: participant.consentData,
      callData: {
        callId: request.callId,
        timestamp: request.timestamp
      },
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Get compliance audit log
   */
  getAuditLog(requestId) {
    const request = this.store.get(requestId);
    if (!request) {
      return [];
    }

    return request.participants
      .filter(p => p.requirements.requiresAuditLog)
      .map(p => ({
        requestId,
        participantId: p.id,
        jurisdiction: p.jurisdiction,
        action: p.consentStatus,
        timestamp: p.consentData?.recordedAt || null,
        consentHash: p.consentData?.consentHash || null
      }));
  }

  /**
   * Get jurisdiction compliance report
   */
  getComplianceReport(startDate, endDate) {
    const report = {
      period: { startDate, endDate },
      jurisdictions: {},
      summary: {
        totalRequests: 0,
        completedRequests: 0,
        partialRequests: 0,
        rejectedRequests: 0
      }
    };

    for (const [requestId, request] of this.store.entries()) {
      const reqTimestamp = new Date(request.timestamp);
      if (reqTimestamp >= new Date(startDate) && reqTimestamp <= new Date(endDate)) {
        report.summary.totalRequests++;

        if (request.status === 'complete') {
          report.summary.completedRequests++;
        } else if (request.status === 'partial') {
          report.summary.partialRequests++;
        }

        // Track by jurisdiction
        for (const participant of request.participants) {
          const jurisdiction = participant.jurisdiction;
          if (!report.jurisdictions[jurisdiction]) {
            report.jurisdictions[jurisdiction] = {
              requests: 0,
              consented: 0,
              rejected: 0,
              pending: 0
            };
          }

          report.jurisdictions[jurisdiction].requests++;

          if (participant.consentStatus === 'consented') {
            report.jurisdictions[jurisdiction].consented++;
          } else if (participant.consentStatus === 'rejected') {
            report.jurisdictions[jurisdiction].rejected++;
          } else {
            report.jurisdictions[jurisdiction].pending++;
          }
        }
      }
    }

    return report;
  }

  /**
   * Verify consent integrity
   */
  verifyConsentIntegrity(requestId, participantId, expectedHash) {
    const request = this.store.get(requestId);
    if (!request) {
      throw new Error(`Consent request not found: ${requestId}`);
    }

    const participant = request.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    if (!participant.consentData) {
      return false;
    }

    const actualHash = participant.consentData.consentHash;
    return actualHash === expectedHash;
  }

  /**
   * Get retention schedule
   */
  getRetentionSchedule() {
    const schedule = [];

    for (const [requestId, request] of this.store.entries()) {
      for (const participant of request.participants) {
        const requirements = participant.requirements;
        const consentDate = new Date(participant.consentData?.recordedAt || request.timestamp);
        const deletionDate = new Date(consentDate.getTime() + (requirements.retentionDays * 24 * 60 * 60 * 1000));

        schedule.push({
          requestId,
          participantId: participant.id,
          jurisdiction: participant.jurisdiction,
          consentDate,
          retentionDays: requirements.retentionDays,
          deletionDate,
          status: new Date() > deletionDate ? 'expired' : 'active'
        });
      }
    }

    return schedule.sort((a, b) => a.deletionDate - b.deletionDate);
  }

  /**
   * Clean up expired consents
   */
  cleanupExpiredConsents() {
    const now = new Date();
    const schedule = this.getRetentionSchedule();
    const expiredCount = { count: 0 };

    for (const item of schedule) {
      if (item.status === 'expired') {
        const request = this.store.get(item.requestId);
        if (request) {
          const participant = request.participants.find(p => p.id === item.participantId);
          if (participant) {
            participant.consentData = {
              cleanedUpAt: now.toISOString(),
              reason: 'retention_expired'
            };
            expiredCount.count++;
          }
        }
      }
    }

    this.emit('consent:cleaned', {
      cleanedAt: now.toISOString(),
      count: expiredCount.count
    });

    return expiredCount;
  }
}

module.exports = ConsentManager;
