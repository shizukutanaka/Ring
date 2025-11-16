/**
 * Tests for Signing Manager
 */

const crypto = require('crypto');
const SigningManager = require('../signing');

describe('SigningManager', () => {
  let signingManager;
  let publicKey, privateKey;

  beforeEach(() => {
    // Generate test RSA key pair
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    publicKey = pub;
    privateKey = priv;

    signingManager = new SigningManager(priv, pub);
  });

  describe('createSignature', () => {
    it('should create a valid RSA signature', () => {
      const data = { test: 'data' };
      const result = signingManager.createSignature(data);

      expect(result.signature).toBeDefined();
      expect(result.algorithm).toBe('RSA-SHA256');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle string input', () => {
      const data = 'test string';
      const result = signingManager.createSignature(data);

      expect(result.signature).toBeDefined();
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const data = { test: 'data' };
      const { signature } = signingManager.createSignature(data);

      const isValid = signingManager.verifySignature(data, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const data = { test: 'data' };
      const invalidSignature = Buffer.from('invalid').toString('base64');

      const isValid = signingManager.verifySignature(data, invalidSignature);

      expect(isValid).toBe(false);
    });

    it('should reject modified data', () => {
      const data = { test: 'data' };
      const { signature } = signingManager.createSignature(data);

      const modifiedData = { test: 'modified' };
      const isValid = signingManager.verifySignature(modifiedData, signature);

      expect(isValid).toBe(false);
    });
  });

  describe('createConsentAuditTrail', () => {
    it('should create audit trail with required fields', () => {
      const auditTrail = signingManager.createConsentAuditTrail(
        'call-123',
        'user-123',
        'one_party',
        'JP'
      );

      expect(auditTrail.id).toBeDefined();
      expect(auditTrail.call_id).toBe('call-123');
      expect(auditTrail.user_hash).toBe('user-123');
      expect(auditTrail.consent_type).toBe('one_party');
      expect(auditTrail.region_code).toBe('JP');
      expect(auditTrail.signature).toBeDefined();
      expect(auditTrail.algorithm).toBe('RSA-SHA256');
    });

    it('should have valid signature', () => {
      const auditTrail = signingManager.createConsentAuditTrail(
        'call-123',
        'user-123',
        'one_party',
        'JP'
      );

      // Remove signature fields for verification
      const { signature, algorithm, signed_at, ...dataToVerify } = auditTrail;

      const isValid = signingManager.verifySignature(dataToVerify, signature);

      expect(isValid).toBe(true);
    });
  });

  describe('createRecordingMetadata', () => {
    it('should create metadata with recording details', () => {
      const metadata = signingManager.createRecordingMetadata(
        'call-123',
        'user-1',
        'user-2',
        'JP',
        120
      );

      expect(metadata.recording_id).toBe('call-123');
      expect(metadata.duration_seconds).toBe(120);
      expect(metadata.format).toBe('webm');
      expect(metadata.codec_audio).toBe('opus');
      expect(metadata.signature).toBeDefined();
    });

    it('should have valid signature', () => {
      const metadata = signingManager.createRecordingMetadata(
        'call-123',
        'user-1',
        'user-2',
        'JP',
        120
      );

      const { signature, algorithm, signed_at, ...dataToVerify } = metadata;

      const isValid = signingManager.verifySignature(dataToVerify, signature);

      expect(isValid).toBe(true);
    });
  });

  describe('createSignedConsentLog', () => {
    it('should create complete consent log', async () => {
      const consentLog = await signingManager.createSignedConsentLog(
        'call-123',
        'user-123',
        true,
        'JP'
      );

      expect(consentLog.audit_trail).toBeDefined();
      expect(consentLog.audit_hash).toBeDefined();
      expect(consentLog.timestamp).toBeDefined();
      expect(consentLog.consent_given).toBe(true);
      expect(consentLog.verified).toBe(true);
    });
  });

  describe('verifyConsentLog', () => {
    it('should verify valid consent log', async () => {
      const consentLog = await signingManager.createSignedConsentLog(
        'call-123',
        'user-123',
        true,
        'JP'
      );

      const verification = signingManager.verifyConsentLog(consentLog);

      expect(verification.overall_valid).toBe(true);
      expect(verification.signature_valid).toBe(true);
      expect(verification.hash_valid).toBe(true);
    });
  });

  describe('createAuditReport', () => {
    it('should create audit report with all consents', async () => {
      const consentLog = await signingManager.createSignedConsentLog(
        'call-123',
        'user-123',
        true,
        'JP'
      );

      const report = signingManager.createAuditReport('call-123', [consentLog]);

      expect(report.report_id).toBeDefined();
      expect(report.call_id).toBe('call-123');
      expect(report.total_consents).toBe(1);
      expect(report.report_signature).toBeDefined();
      expect(report.certification.verified).toBe(true);
    });
  });

  describe('createJsonLdConsentProof', () => {
    it('should create JSON-LD compliant consent proof', async () => {
      const consentLog = await signingManager.createSignedConsentLog(
        'call-123',
        'user-123',
        true,
        'JP'
      );

      const proof = signingManager.createJsonLdConsentProof(consentLog);

      expect(proof['@context']).toBeDefined();
      expect(proof.type).toContain('VerifiableCredential');
      expect(proof.credentialSubject).toBeDefined();
      expect(proof.proof).toBeDefined();
      expect(proof.proof.type).toBe('RsaSignature2018');
    });
  });
});
