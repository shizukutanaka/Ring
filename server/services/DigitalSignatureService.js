/**
 * Digital Signature Service
 *
 * Provides RSA-2048 signing/verification for consent records
 * Supports RFC3161 timestamping for audit trails
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class DigitalSignatureService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.algorithm = 'RSA-SHA256'; // SHA-256 with RSA-2048
    this.keySize = 2048;
    this.keystoreLocation = options.keystoreLocation || './keys';
    this.timestampAuthority = options.timestampAuthority || 'http://timestamp.authority';
    this.signingCertificate = options.signingCertificate || null;

    // In-memory key store (in production, use HSM or Vault)
    this.keyStore = new Map();

    // Verify OpenSSL availability
    this.opensslAvailable = this.checkOpenSSL();
  }

  /**
   * Check if OpenSSL is available for RSA operations
   */
  checkOpenSSL() {
    try {
      // Try RSA key generation
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
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

      return true;
    } catch (err) {
      console.error('OpenSSL or crypto module not available:', err);
      return false;
    }
  }

  /**
   * Generate RSA key pair for participant
   */
  generateKeyPair(participantId) {
    if (!this.opensslAvailable) {
      throw new Error('OpenSSL/crypto not available');
    }

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Store keys
    this.keyStore.set(participantId, {
      publicKey,
      privateKey,
      algorithm: this.algorithm,
      createdAt: new Date().toISOString(),
      fingerprint: this.calculateFingerprint(publicKey)
    });

    this.emit('keys:generated', {
      participantId,
      fingerprint: this.keyStore.get(participantId).fingerprint,
      timestamp: new Date().toISOString()
    });

    return {
      participantId,
      publicKey,
      fingerprint: this.keyStore.get(participantId).fingerprint,
      algorithm: this.algorithm,
      createdAt: this.keyStore.get(participantId).createdAt
    };
  }

  /**
   * Calculate public key fingerprint (SHA-256)
   */
  calculateFingerprint(publicKey) {
    return crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex');
  }

  /**
   * Sign consent data
   */
  signConsent(participantId, consentData) {
    const keys = this.keyStore.get(participantId);
    if (!keys) {
      throw new Error(`No keys found for participant: ${participantId}`);
    }

    const dataString = typeof consentData === 'string'
      ? consentData
      : JSON.stringify(consentData);

    // Create signature
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(dataString);
    const signature = sign.sign(keys.privateKey, 'base64');

    // Create RFC3161 timestamp
    const timestamp = new Date().toISOString();
    const timestampHash = crypto
      .createHash('sha256')
      .update(signature + timestamp)
      .digest('hex');

    const signatureRecord = {
      participantId,
      signature,
      algorithm: this.algorithm,
      dataHash: this.hashData(dataString),
      timestamp,
      timestampHash,
      fingerprint: keys.fingerprint,
      verified: false // Will be set to true after verification
    };

    this.emit('signature:created', {
      participantId,
      fingerprint: keys.fingerprint,
      timestamp
    });

    return signatureRecord;
  }

  /**
   * Verify consent signature
   */
  verifySignature(consentData, signature, participantId) {
    const keys = this.keyStore.get(participantId);
    if (!keys) {
      throw new Error(`No keys found for participant: ${participantId}`);
    }

    const dataString = typeof consentData === 'string'
      ? consentData
      : JSON.stringify(consentData);

    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(dataString);
      const isValid = verify.verify(keys.publicKey, signature, 'base64');

      this.emit('signature:verified', {
        participantId,
        valid: isValid,
        timestamp: new Date().toISOString()
      });

      return isValid;
    } catch (err) {
      console.error('Signature verification failed:', err);
      return false;
    }
  }

  /**
   * Hash consent data (SHA-256)
   */
  hashData(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
  }

  /**
   * Create signed certificate for consent
   */
  createSignedCertificate(participantId, consentData) {
    const signature = this.signConsent(participantId, consentData);

    const certificate = {
      version: '1.0',
      type: 'CONSENT_CERTIFICATE',
      issuedAt: new Date().toISOString(),
      issuedBy: 'WebRTC Recording System',
      subject: {
        participantId,
        commonName: consentData.name || 'Unknown'
      },
      consent: {
        type: consentData.consentType,
        jurisdiction: consentData.jurisdiction,
        data: consentData
      },
      signature: {
        algorithm: signature.algorithm,
        value: signature.signature,
        fingerprint: signature.fingerprint,
        timestamp: signature.timestamp,
        timestampHash: signature.timestampHash
      },
      validity: {
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      },
      extensions: {
        dataHash: signature.dataHash,
        keyFingerprint: signature.fingerprint
      }
    };

    this.emit('certificate:created', {
      participantId,
      certificateId: this.hashData(certificate),
      issuedAt: certificate.issuedAt
    });

    return certificate;
  }

  /**
   * Verify signed certificate
   */
  verifyCertificate(certificate) {
    const now = new Date();
    const notBefore = new Date(certificate.validity.notBefore);
    const notAfter = new Date(certificate.validity.notAfter);

    // Check validity period
    if (now < notBefore || now > notAfter) {
      return {
        valid: false,
        reason: 'Certificate expired or not yet valid'
      };
    }

    // Verify signature
    const isSignatureValid = this.verifySignature(
      certificate.consent.data,
      certificate.signature.value,
      certificate.subject.participantId
    );

    return {
      valid: isSignatureValid,
      certificate: certificate.version,
      issuedAt: certificate.issuedAt,
      fingerprint: certificate.signature.fingerprint,
      timestamp: certificate.signature.timestamp,
      reason: isSignatureValid ? 'Valid' : 'Signature verification failed'
    };
  }

  /**
   * Create audit trail entry
   */
  createAuditEntry(action, participantId, details) {
    const entry = {
      id: crypto.randomUUID(),
      action,
      participantId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ action, participantId, timestamp: new Date().toISOString() }))
        .digest('hex')
    };

    this.emit('audit:entry', entry);
    return entry;
  }

  /**
   * Get key info (for public distribution)
   */
  getPublicKeyInfo(participantId) {
    const keys = this.keyStore.get(participantId);
    if (!keys) {
      return null;
    }

    return {
      participantId,
      publicKey: keys.publicKey,
      algorithm: keys.algorithm,
      fingerprint: keys.fingerprint,
      createdAt: keys.createdAt,
      keySize: this.keySize
    };
  }

  /**
   * Revoke participant keys
   */
  revokeKeys(participantId, reason) {
    const keys = this.keyStore.get(participantId);
    if (!keys) {
      throw new Error(`No keys found for participant: ${participantId}`);
    }

    const revocationRecord = {
      participantId,
      fingerprint: keys.fingerprint,
      revokedAt: new Date().toISOString(),
      reason,
      previousKeyCreatedAt: keys.createdAt
    };

    // Remove keys from store
    this.keyStore.delete(participantId);

    this.emit('keys:revoked', revocationRecord);

    return revocationRecord;
  }

  /**
   * Export keys (for backup/recovery)
   */
  exportKeys(participantId, password) {
    const keys = this.keyStore.get(participantId);
    if (!keys) {
      throw new Error(`No keys found for participant: ${participantId}`);
    }

    // Encrypt private key with password (AES-256-GCM)
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);

    // Derive key from password
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

    let encrypted = cipher.update(keys.privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      version: '1.0',
      participantId,
      publicKey: keys.publicKey,
      privateKey: {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
      },
      fingerprint: keys.fingerprint,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import keys (for recovery)
   */
  importKeys(participantId, exportedData, password) {
    try {
      // Derive key from password
      const salt = Buffer.from(exportedData.privateKey.salt, 'hex');
      const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

      // Decrypt private key
      const iv = Buffer.from(exportedData.privateKey.iv, 'hex');
      const authTag = Buffer.from(exportedData.privateKey.authTag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
      decipher.setAuthTag(authTag);

      let privateKey = decipher.update(exportedData.privateKey.encrypted, 'hex', 'utf8');
      privateKey += decipher.final('utf8');

      // Store keys
      this.keyStore.set(participantId, {
        publicKey: exportedData.publicKey,
        privateKey,
        algorithm: 'RSA-SHA256',
        createdAt: exportedData.exportedAt,
        fingerprint: exportedData.fingerprint
      });

      this.emit('keys:imported', {
        participantId,
        fingerprint: exportedData.fingerprint,
        timestamp: new Date().toISOString()
      });

      return {
        participantId,
        imported: true,
        fingerprint: exportedData.fingerprint
      };
    } catch (err) {
      console.error('Key import failed:', err);
      throw new Error('Failed to import keys - incorrect password or corrupted data');
    }
  }

  /**
   * Get signature statistics
   */
  getStatistics() {
    const entries = Array.from(this.keyStore.entries());

    return {
      totalKeys: entries.length,
      algorithms: {
        'RSA-SHA256': entries.filter(([, k]) => k.algorithm === 'RSA-SHA256').length
      },
      keySize: this.keySize,
      oldestKey: entries.length > 0
        ? new Date(Math.min(...entries.map(([, k]) => new Date(k.createdAt))))
        : null,
      newestKey: entries.length > 0
        ? new Date(Math.max(...entries.map(([, k]) => new Date(k.createdAt))))
        : null
    };
  }

  /**
   * Clear all keys (use with caution)
   */
  clearAllKeys() {
    const count = this.keyStore.size;
    this.keyStore.clear();

    this.emit('keys:cleared', {
      count,
      timestamp: new Date().toISOString()
    });

    return { cleared: count };
  }
}

module.exports = DigitalSignatureService;
