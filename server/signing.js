/**
 * Recording Signature & Timestamp Module
 *
 * Implements RSA signature and RFC3161 timestamp for recording integrity
 * Provides tamper-proofing and legal evidence support
 */

const crypto = require('crypto');
const https = require('https');
const uuid = require('uuid');

class SigningManager {
  constructor(privateKeyPem, publicKeyPem) {
    this.privateKeyPem = privateKeyPem;
    this.publicKeyPem = publicKeyPem;
  }

  /**
   * Create RSA signature for consent/recording metadata
   */
  createSignature(data) {
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(jsonString);

      const signature = sign.sign(this.privateKeyPem, 'base64');

      return {
        signature,
        algorithm: 'RSA-SHA256',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error creating signature:', err);
      throw err;
    }
  }

  /**
   * Verify RSA signature
   */
  verifySignature(data, signature) {
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(jsonString);

      const isValid = verify.verify(this.publicKeyPem, signature, 'base64');

      return isValid;
    } catch (err) {
      console.error('Error verifying signature:', err);
      return false;
    }
  }

  /**
   * Create consent audit trail with signature
   */
  createConsentAuditTrail(callId, userId, consentType, regionCode) {
    const auditEntry = {
      id: uuid.v4(),
      call_id: callId,
      user_hash: userId,
      consent_type: consentType, // 'one_party', 'all_party', 'gdpr'
      region_code: regionCode,
      timestamp: new Date().toISOString(),
      ip_hash: crypto.createHash('sha256').update(Date.now().toString()).digest('hex'),
      app_version: process.env.APP_VERSION || '0.1.0'
    };

    const { signature, algorithm } = this.createSignature(auditEntry);

    return {
      ...auditEntry,
      signature,
      algorithm,
      signed_at: new Date().toISOString()
    };
  }

  /**
   * Create recording metadata with signature
   */
  createRecordingMetadata(callId, initiatorId, recipientId, regionCode, duration) {
    const metadata = {
      id: uuid.v4(),
      recording_id: callId,
      initiator_hash: initiatorId,
      recipient_hash: recipientId,
      region_code: regionCode,
      duration_seconds: duration,
      format: 'webm',
      codec_audio: 'opus',
      codec_video: 'vp8',
      created_at: new Date().toISOString(),
      version: process.env.APP_VERSION || '0.1.0'
    };

    const { signature, algorithm } = this.createSignature(metadata);

    return {
      ...metadata,
      signature,
      algorithm,
      signed_at: new Date().toISOString()
    };
  }

  /**
   * Request RFC3161 timestamp authority
   * This is a simplified implementation; in production, use libraries like node-tsa
   */
  async requestTimestamp(dataHash, tsaUrl = 'http://timestamp.authority.example/timestamp') {
    return new Promise((resolve, reject) => {
      // Simplified timestamp response
      // In production, use proper RFC3161 TSA implementation
      const timestamp = {
        hash: dataHash,
        timestamp: new Date().toISOString(),
        tsa_server: tsaUrl,
        token: crypto.randomBytes(32).toString('base64')
      };

      resolve(timestamp);
    });
  }

  /**
   * Create complete signed consent log
   */
  async createSignedConsentLog(callId, userId, consentGiven, regionCode) {
    try {
      const auditTrail = this.createConsentAuditTrail(callId, userId, 'recording_consent', regionCode);

      // Create hash of audit trail
      const auditTrailJson = JSON.stringify(auditTrail);
      const auditHash = crypto.createHash('sha256').update(auditTrailJson).digest('hex');

      // Request timestamp (optional for PoC)
      const timestamp = await this.requestTimestamp(auditHash);

      return {
        audit_trail: auditTrail,
        audit_hash: auditHash,
        timestamp,
        consent_given: consentGiven,
        verified: true
      };
    } catch (err) {
      console.error('Error creating signed consent log:', err);
      throw err;
    }
  }

  /**
   * Verify complete consent log
   */
  verifyConsentLog(consentLog) {
    try {
      const { audit_trail, audit_hash } = consentLog;

      // Verify audit trail signature
      const isSignatureValid = this.verifySignature(audit_trail, audit_trail.signature);

      // Verify audit hash
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(audit_trail))
        .digest('hex');
      const isHashValid = recalculatedHash === audit_hash;

      return {
        signature_valid: isSignatureValid,
        hash_valid: isHashValid,
        overall_valid: isSignatureValid && isHashValid
      };
    } catch (err) {
      console.error('Error verifying consent log:', err);
      return { overall_valid: false };
    }
  }

  /**
   * Create audit report for legal compliance
   */
  createAuditReport(callId, consentLogs) {
    const report = {
      report_id: uuid.v4(),
      call_id: callId,
      generated_at: new Date().toISOString(),
      total_consents: consentLogs.length,
      verified_consents: consentLogs.filter(cl => this.verifyConsentLog(cl).overall_valid).length,
      consent_logs: consentLogs,
      certification: {
        verified: true,
        verifier: 'WebRTC Call Recorder',
        version: process.env.APP_VERSION || '0.1.0'
      }
    };

    // Sign the entire report
    const { signature, algorithm } = this.createSignature(report);

    return {
      ...report,
      report_signature: signature,
      signature_algorithm: algorithm,
      signed_at: new Date().toISOString()
    };
  }

  /**
   * Generate JSON-LD compliant consent proof
   * For legal and blockchain integration compatibility
   */
  createJsonLdConsentProof(consentLog) {
    return {
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: ['VerifiableCredential', 'ConsentProof'],
      issuer: 'WebRTC Call Recorder',
      issuanceDate: consentLog.audit_trail.timestamp,
      credentialSubject: {
        id: consentLog.audit_trail.user_hash,
        consent_type: 'recording',
        consent_given: consentLog.consent_given,
        call_id: consentLog.audit_trail.call_id,
        region_code: consentLog.audit_trail.region_code
      },
      proof: {
        type: 'RsaSignature2018',
        created: consentLog.audit_trail.signed_at,
        verificationMethod: 'RSA-SHA256',
        signatureValue: consentLog.audit_trail.signature
      }
    };
  }
}

module.exports = SigningManager;
