# Tier 1: Automated Multi-Jurisdictional Consent Management Implementation Guide

**Status**: Planned
**Estimated Timeline**: 4-5 weeks
**Team Size**: 2-3 engineers
**Priority**: CRITICAL (Legal Compliance)
**Implementation Difficulty**: HIGH

---

## Executive Summary

This document provides the technical roadmap for implementing automated, jurisdiction-aware consent management with digital signatures and RFC3161 timestamps. This addresses legal compliance requirements across multiple jurisdictions (GDPR, CCPA, eIDAS, state-specific laws).

**Key Features**:
- Automatic country/state detection from client IP
- GDPR/CCPA/eIDAS compliance detection
- RSA-2048 digital signatures for legal evidence
- RFC3161 Time-Stamp Authority integration
- Complete audit trail for compliance verification
- Consent revocation mechanism

**Legal Impact**: Transforms compliance risk from HIGH to LOW

---

## Phase 1: Legal & Regulatory Research (Week 1)

### 1.1 Jurisdiction Matrix Creation

Build comprehensive jurisdiction map:

```javascript
// server/compliance/JurisdictionMatrix.js

const jurisdictionRules = {
  'US-CA': {
    name: 'California (CCPA)',
    recordingLaws: {
      type: 'two-party',
      description: 'All parties must consent to recording'
    },
    requirements: {
      explicitConsent: true,
      disclosureMethod: 'before_recording_starts',
      disclosureFrequency: 'per_call',
      revokeRightsWithin: 'P30D',
      dataRetention: 'P90D',
      dataMinimization: true
    },
    penalties: {
      civilViolation: 'up to $2,500 per violation',
      criminalViolation: 'up to $10,000 and imprisonment',
      classAction: 'yes'
    }
  },
  'US-NY': {
    name: 'New York',
    recordingLaws: {
      type: 'one-party',
      description: 'Recording party may consent on behalf of one party'
    },
    requirements: {
      explicitConsent: false,
      disclosureMethod: 'before_recording_starts',
      consentForm: 'verbal_acceptable',
      audioNotification: true
    }
  },
  'US-PA': {
    name: 'Pennsylvania',
    recordingLaws: {
      type: 'two-party-strict',
      description: 'All parties must explicitly consent, written notice required'
    },
    requirements: {
      explicitConsent: true,
      disclosureMethod: 'written_before_call',
      consentForm: 'written_required',
      revokeRights: true
    }
  },
  'EU': {
    name: 'European Union (GDPR)',
    recordingLaws: {
      type: 'explicit_consent_required',
      description: 'GDPR Article 6: Lawful Basis Required'
    },
    requirements: {
      lawfulBasis: 'explicit_consent',
      rightToData: true,
      rightToAccess: 'within_P30D',
      rightToErase: true,
      dataController: 'required',
      dpia: 'data_protection_impact_assessment',
      dpr: 'required',
      retention: 'P30D_max',
      transferOutside: false
    },
    penalties: {
      severe: 'up to €20,000,000 or 4% annual turnover'
    }
  },
  'DE': {
    name: 'Germany (eIDAS)',
    recordingLaws: {
      type: 'two-party',
      description: 'Both parties must consent, eIDAS qualified signature required'
    },
    requirements: {
      signatureType: 'qualified_electronic_signature',
      signatureCertificate: 'eIDAS_qualified',
      timestamp: 'RFC3161_required',
      videoNotarization: 'optional'
    }
  },
  'JP': {
    name: 'Japan',
    recordingLaws: {
      type: 'consent_required',
      description: 'Reasonable expectation of privacy; consent required'
    },
    requirements: {
      explicitConsent: true,
      privacyNotice: true,
      localStorage: 'data_must_stay_in_jp'
    }
  },
  'AU': {
    name: 'Australia',
    recordingLaws: {
      type: 'all_parties_consent',
      description: 'Telecommunications Interception Act; all parties must consent'
    },
    requirements: {
      explicitConsent: true,
      disclosureAtStart: true,
      partiesCanRejoin: 'no_recording'
    }
  }
};

class JurisdictionMatrix {
  static getJurisdictionRules(countryCode, stateCode) {
    const key = stateCode ? `${countryCode}-${stateCode}` : countryCode;
    return jurisdictionRules[key] || jurisdictionRules['DEFAULT'];
  }

  static detectJurisdiction(clientIP) {
    // Use GeoIP database to detect country/state
    // Recommended: MaxMind GeoIP2, IP2Location
    const geoData = geoIPDatabase.lookup(clientIP);
    return {
      country: geoData.country_code,
      state: geoData.region_code,
      city: geoData.city
    };
  }

  static getApplicableRules(clientIP, otherParticipants) {
    const clientJurisdiction = this.detectJurisdiction(clientIP);
    const jurisdictions = [clientJurisdiction];

    // Add jurisdictions for other participants
    for (const participant of otherParticipants) {
      jurisdictions.push(this.detectJurisdiction(participant.ip));
    }

    // Return most restrictive rules (strictest jurisdiction wins)
    return this.getMostRestrictive(jurisdictions);
  }

  private static getMostRestrictive(jurisdictions) {
    // GDPR (EU) is most restrictive, followed by two-party states
    const severityOrder = ['EU', 'US-PA', 'US-CA', 'DE'];

    for (const strict of severityOrder) {
      for (const jurisdiction of jurisdictions) {
        if (jurisdiction.country === strict ||
            `${jurisdiction.country}-${jurisdiction.state}` === strict) {
          return this.getJurisdictionRules(
            jurisdiction.country,
            jurisdiction.state
          );
        }
      }
    }

    return jurisdictionRules['DEFAULT'];
  }
}

module.exports = JurisdictionMatrix;
```

### 1.2 Consent Type Documentation

Create consent templates for different jurisdictions:

```javascript
// server/compliance/ConsentTemplates.js

const consentTemplates = {
  'california_ccpa': {
    title: 'California Recording Consent (CCPA)',
    language: 'en-US',
    requiresAcknowledgment: true,
    template: `
RECORDING CONSENT FORM - CALIFORNIA (CCPA)

This call may be monitored and recorded for quality assurance,
training, and compliance purposes.

By continuing with this call, you acknowledge and consent to:
1. Recording of audio and/or video
2. Storage of recorded content for 90 days
3. Processing for compliance and quality purposes
4. Your rights to access and deletion under CCPA

Your Rights:
- You may revoke this consent at any time
- You have the right to know what data is collected
- You have the right to delete your data within 30 days
- You will not face discrimination for exercising these rights

For more information about how your data is used, please visit our
Privacy Policy at https://company.com/privacy

Do you consent to this recording?
☐ YES, I consent
☐ NO, I do not consent
    `
  },
  'gdpr_european': {
    title: 'European Recording Consent (GDPR)',
    language: 'en-EU',
    requiresAcknowledgment: true,
    requiresQualifiedSignature: true,
    template: `
GDPR RECORDING CONSENT & DATA PROCESSING

This call will be recorded and your personal data will be processed.

Legal Basis: Article 6(1)(a) GDPR - Explicit Consent
Data Controller: [Company Name], [Address]
Data Protection Officer: dpo@company.com

Processing Details:
- Type: Audio/Video Recording
- Duration: 90 days
- Purposes: Quality, compliance, training, legal
- Recipients: Authorized staff only
- Your Rights:
  * Right of access (within 30 days)
  * Right to rectification
  * Right to erasure ("right to be forgotten")
  * Right to restrict processing
  * Right to data portability
  * Right to object
  * Rights related to automated decision making

This company maintains Data Protection Impact Assessments as
required by GDPR Article 35.

I explicitly consent to the recording and processing of my personal
data as described above.

Signature (eIDAS Qualified): _________________
Date: _________________
    `
  },
  'pennsylvania_two_party': {
    title: 'Pennsylvania Recording Consent (Two-Party)',
    language: 'en-US',
    requiresAcknowledgment: true,
    requiresWritten: true,
    template: `
PENNSYLVANIA RECORDING CONSENT - TWO-PARTY CONSENT STATE

Pennsylvania requires the CONSENT OF ALL PARTIES to any recording.

I, _________________, hereby acknowledge that:

1. I understand that this call WILL BE RECORDED
2. I voluntarily and knowingly CONSENT to this recording
3. The recording may be used for quality, training, or legal purposes
4. I have been given the opportunity to ask questions
5. I can revoke my consent at any time by hanging up or notifying the operator

By proceeding with this call after this notice, I provide my
explicit consent to this recording.

Print Name: _________________
Signature: _________________
Date: _________________
Time: _________________
    `
  },
  'japan_consent': {
    title: 'Japan Recording Consent',
    language: 'ja-JP',
    requiresAcknowledgment: true,
    requiresLocalStorage: true,
    template: `
日本 通話録音同意書

本通話は記録される場合があります。

同意について:
☐ はい、記録に同意します
☐ いいえ、記録に同意しません

個人情報保護:
- 記録は日本国内のサーバーにのみ保存されます
- 記録期間: 90日
- アクセス権: いつでも削除を要求できます

同意日時: _________________
    `
  }
};

module.exports = consentTemplates;
```

---

## Phase 2: Digital Signature Infrastructure (Week 2)

### 2.1 RSA-2048 Signature Generation

```javascript
// server/compliance/DigitalSignature.js

const crypto = require('crypto');
const fs = require('fs');
const timestamp = require('node-timestamp');

class DigitalSignature {
  constructor() {
    // Load company's private key (stored securely in HSM in production)
    this.privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
    this.publicKey = fs.readFileSync(process.env.PUBLIC_KEY_PATH, 'utf8');
    this.certificateChain = fs.readFileSync(process.env.CERT_CHAIN_PATH, 'utf8');
  }

  signConsentRecord(consentData) {
    // Create canonical JSON representation for signing
    const canonicalJson = JSON.stringify(consentData, Object.keys(consentData).sort());

    // Sign using RSA-2048 with SHA-256
    const signature = crypto.createSign('RSA-SHA256');
    signature.update(canonicalJson);
    const signatureHex = signature.sign(this.privateKey, 'hex');

    return {
      signature: signatureHex,
      algorithm: 'RSA-SHA256',
      keyVersion: this.getKeyVersion(),
      signedData: canonicalJson,
      timestamp: new Date().toISOString()
    };
  }

  verifyConsentSignature(consentData, signature) {
    const canonicalJson = JSON.stringify(consentData, Object.keys(consentData).sort());

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(canonicalJson);

    return verify.verify(this.publicKey, Buffer.from(signature, 'hex'));
  }

  getKeyVersion() {
    // Return current key version for key rotation support
    return process.env.KEY_VERSION || '1';
  }

  createSignedConsentCertificate(consentData, signatureData) {
    // Create a signed PDF certificate for legal evidence
    return {
      type: 'ConsentCertificate',
      version: '1.0',
      issuedBy: process.env.COMPANY_NAME,
      issuedDate: new Date().toISOString(),
      consentData,
      signature: signatureData,
      certificateChain: this.certificateChain,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

module.exports = DigitalSignature;
```

### 2.2 RFC3161 Timestamp Authority Integration

```javascript
// server/compliance/TimestampAuthority.js

const https = require('https');
const asn1 = require('asn1.js');

class RFC3161Timestamping {
  constructor(tsaUrl = 'https://freetsa.org/tsr') {
    this.tsaUrl = tsaUrl;
  }

  async requestTimestamp(dataHash) {
    // Create RFC3161 TimeStampReq ASN.1 structure
    const timeStampReq = {
      version: 1,
      messageImprint: {
        hashAlgorithm: {
          algorithm: 'sha256' // OID: 2.16.840.1.101.3.4.2.1
        },
        hashedMessage: Buffer.from(dataHash, 'hex')
      },
      reqPolicy: '1.3.6.1.4.1.58.4.2.1.1', // TSA policy OID
      nonce: this.generateNonce(),
      certReq: true,
      extensions: []
    };

    // Send to TSA and get response
    const response = await this.sendTimeStampRequest(timeStampReq);

    return {
      timeStampToken: response.timeStampToken,
      status: response.status,
      requestId: response.requestId,
      genTime: response.genTime
    };
  }

  private async sendTimeStampRequest(req) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query'
        }
      };

      const request = https.request(this.tsaUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = this.parseTimeStampResp(data);
            resolve(response);
          } catch (err) {
            reject(err);
          }
        });
      });

      request.on('error', reject);
      request.write(Buffer.from(JSON.stringify(req)));
      request.end();
    });
  }

  private parseTimeStampResp(data) {
    // Parse RFC3161 TimeStampResp ASN.1 structure
    // Implementation depends on asn1.js library
    return {
      status: 0, // PKIStatus: 0 = GRANTED
      timeStampToken: data,
      genTime: new Date().toISOString()
    };
  }

  private generateNonce() {
    return Math.floor(Math.random() * Math.pow(2, 63));
  }

  verifyTimestamp(timestamp, originalData) {
    // Verify that timestamp is valid and matches original data
    // Implementation involves cryptographic verification
    return true; // Simplified
  }
}

module.exports = RFC3161Timestamping;
```

---

## Phase 3: Consent Database & API (Week 2-3)

### 3.1 Database Schema

```sql
-- Consent records table
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES call_records(id) ON DELETE CASCADE,
  participant_id UUID,
  participant_name VARCHAR(255),
  participant_email VARCHAR(255),
  participant_phone VARCHAR(20),
  jurisdiction_code VARCHAR(10),
  jurisdiction_name VARCHAR(100),
  consent_type VARCHAR(50), -- 'explicit', 'implied', 'revoked'
  consent_date TIMESTAMP DEFAULT NOW(),
  consent_method VARCHAR(50), -- 'verbal', 'written', 'electronic'
  consent_form_version VARCHAR(10),
  consent_language VARCHAR(10),
  acknowledgment_confirmed BOOLEAN DEFAULT false,
  acknowledgment_timestamp TIMESTAMP,
  ip_address INET,
  user_agent TEXT,

  FOREIGN KEY (participant_id) REFERENCES users(id)
);

-- Digital signature records
CREATE TABLE consent_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID REFERENCES consent_records(id) ON DELETE CASCADE,
  signature_type VARCHAR(50), -- 'rsa-2048', 'qualified-signature'
  signature_hex TEXT NOT NULL,
  signature_algorithm VARCHAR(50),
  key_version VARCHAR(10),
  signed_timestamp TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  verification_timestamp TIMESTAMP,
  certificate_chain TEXT
);

-- RFC3161 timestamps
CREATE TABLE consent_timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID REFERENCES consent_records(id) ON DELETE CASCADE,
  tsa_url VARCHAR(500),
  tsa_response TEXT, -- RFC3161 TimeStampToken
  tsa_status INT,
  gen_time TIMESTAMP,
  verified BOOLEAN DEFAULT false
);

-- Consent audit trail
CREATE TABLE consent_audit_log (
  id BIGSERIAL PRIMARY KEY,
  consent_id UUID REFERENCES consent_records(id) ON DELETE CASCADE,
  action VARCHAR(50), -- 'created', 'acknowledged', 'revoked', 'verified'
  actor_id UUID,
  actor_type VARCHAR(50), -- 'participant', 'system', 'admin'
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_consent_call_id ON consent_records(call_id);
CREATE INDEX idx_consent_participant_id ON consent_records(participant_id);
CREATE INDEX idx_consent_jurisdiction ON consent_records(jurisdiction_code);
CREATE INDEX idx_consent_date ON consent_records(consent_date);
CREATE INDEX idx_signature_consent_id ON consent_signatures(consent_id);
CREATE INDEX idx_timestamp_consent_id ON consent_timestamps(consent_id);
```

### 3.2 Consent API Endpoints

```javascript
// server/routes/consent.js

// Get applicable consent rules based on jurisdiction
router.post('/api/consent/rules', async (req, res) => {
  const { clientIP, otherParticipantIPs } = req.body;

  try {
    const rules = JurisdictionMatrix.getApplicableRules(
      clientIP,
      otherParticipantIPs.map(ip => ({ ip }))
    );

    const template = ConsentTemplates.getTemplate(rules.jurisdiction);

    res.json({
      jurisdiction: rules.jurisdiction,
      requirements: rules.requirements,
      consentTemplate: template,
      signatureRequired: rules.requiresQualifiedSignature,
      timestampRequired: rules.requiresTimestamp
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get consent rules' });
  }
});

// Record consent
router.post('/api/consent/record', async (req, res) => {
  const {
    callId,
    participantId,
    jurisdiction,
    consentType,
    consentMethod,
    acknowledgment,
    ipAddress,
    userAgent
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert consent record
    const consentResult = await client.query(
      `INSERT INTO consent_records(
        call_id, participant_id, jurisdiction_code, consent_type,
        consent_method, ip_address, user_agent, acknowledgment_confirmed,
        acknowledgment_timestamp
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        callId,
        participantId,
        jurisdiction,
        consentType,
        consentMethod,
        ipAddress,
        userAgent,
        acknowledgment
      ]
    );

    const consentId = consentResult.rows[0].id;

    // 2. Generate digital signature
    const signature = digitalSigner.signConsentRecord({
      consentId,
      callId,
      participantId,
      jurisdiction,
      consentType,
      timestamp: new Date().toISOString()
    });

    // 3. Store signature
    await client.query(
      `INSERT INTO consent_signatures(
        consent_id, signature_type, signature_hex,
        signature_algorithm, key_version
      ) VALUES($1, $2, $3, $4, $5)`,
      [consentId, 'rsa-2048', signature.signature, signature.algorithm, signature.keyVersion]
    );

    // 4. Request RFC3161 timestamp
    const tsa = new RFC3161Timestamping();
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signature.signedData))
      .digest('hex');
    const timestamp = await tsa.requestTimestamp(dataHash);

    // 5. Store timestamp
    await client.query(
      `INSERT INTO consent_timestamps(
        consent_id, tsa_url, tsa_response, tsa_status, gen_time
      ) VALUES($1, $2, $3, $4, $5)`,
      [consentId, tsa.tsaUrl, timestamp.timeStampToken, timestamp.status, timestamp.genTime]
    );

    // 6. Log to audit trail
    await client.query(
      `INSERT INTO consent_audit_log(
        consent_id, action, actor_id, actor_type, details
      ) VALUES($1, 'created', $2, 'participant', $3)`,
      [consentId, participantId, JSON.stringify({ method: consentMethod })]
    );

    await client.query('COMMIT');

    res.status(201).json({
      consentId,
      signatureId: signature.signature.substring(0, 16) + '...',
      timestampToken: timestamp.timeStampToken.substring(0, 50) + '...',
      verificationUrl: `/api/consent/${consentId}/verify`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Consent recording error:', err);
    res.status(500).json({ error: 'Failed to record consent' });
  } finally {
    client.release();
  }
});

// Verify consent record
router.get('/api/consent/:consentId/verify', async (req, res) => {
  try {
    const consentResult = await pool.query(
      'SELECT * FROM consent_records WHERE id = $1',
      [req.params.consentId]
    );

    const consent = consentResult.rows[0];
    const signatureResult = await pool.query(
      'SELECT * FROM consent_signatures WHERE consent_id = $1',
      [consent.id]
    );

    const signature = signatureResult.rows[0];

    // Verify signature
    const verified = digitalSigner.verifyConsentSignature(consent, signature.signature_hex);

    res.json({
      consent,
      signature: {
        verified,
        algorithm: signature.signature_algorithm
      },
      legalWeight: verified ? 'high' : 'low'
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Revoke consent
router.post('/api/consent/:consentId/revoke', async (req, res) => {
  try {
    const { reason } = req.body;

    await pool.query(
      'UPDATE consent_records SET consent_type = $1 WHERE id = $2',
      ['revoked', req.params.consentId]
    );

    await pool.query(
      `INSERT INTO consent_audit_log(
        consent_id, action, actor_id, actor_type, details
      ) VALUES($1, 'revoked', $2, 'participant', $3)`,
      [req.params.consentId, req.user.id, JSON.stringify({ reason })]
    );

    res.json({ status: 'revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Revocation failed' });
  }
});
```

---

## Phase 4: Compliance Reporting (Week 4)

### 4.1 Compliance Dashboard

```javascript
// server/routes/compliance-reports.js

router.get('/api/compliance/report/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const report = await pool.query(`
      SELECT
        jurisdiction_code,
        COUNT(*) as total_calls,
        SUM(CASE WHEN consent_type = 'explicit' THEN 1 ELSE 0 END) as explicit_consents,
        SUM(CASE WHEN consent_type = 'revoked' THEN 1 ELSE 0 END) as revoked_consents,
        COUNT(*) FILTER (WHERE verified = true) as verified_signatures,
        AVG(EXTRACT(EPOCH FROM (acknowledgment_timestamp - consent_date))) as avg_acknowledgment_time
      FROM consent_records
      WHERE consent_date BETWEEN $1 AND $2
      GROUP BY jurisdiction_code
      ORDER BY jurisdiction_code
    `, [startDate, endDate]);

    res.json({
      period: { start: startDate, end: endDate },
      summary: report.rows,
      complianceRate: this.calculateComplianceRate(report.rows)
    });
  } catch (err) {
    res.status(500).json({ error: 'Report generation failed' });
  }
});

router.get('/api/compliance/audit-trail/:consentId', async (req, res) => {
  try {
    const trail = await pool.query(`
      SELECT * FROM consent_audit_log
      WHERE consent_id = $1
      ORDER BY timestamp ASC
    `, [req.params.consentId]);

    res.json(trail.rows);
  } catch (err) {
    res.status(500).json({ error: 'Audit trail retrieval failed' });
  }
});
```

---

## Phase 5: Testing & Validation (Week 4-5)

### 5.1 Compliance Testing

```javascript
// tests/compliance.test.js

describe('Jurisdiction Detection', () => {
  test('should detect GDPR for EU IP', () => {
    const rules = JurisdictionMatrix.getJurisdictionRules('DE');
    expect(rules.requirements.lawfulBasis).toBe('explicit_consent');
    expect(rules.requirements.dpia).toBeDefined();
  });

  test('should enforce two-party consent for PA', () => {
    const rules = JurisdictionMatrix.getJurisdictionRules('US', 'PA');
    expect(rules.recordingLaws.type).toBe('two-party-strict');
    expect(rules.requirements.consentForm).toBe('written_required');
  });
});

describe('Digital Signature', () => {
  test('should create valid RSA-2048 signature', () => {
    const data = { callId: '123', consent: 'yes' };
    const sig = signer.signConsentRecord(data);

    expect(sig.algorithm).toBe('RSA-SHA256');
    expect(sig.signature.length).toBeGreaterThan(256);
  });

  test('should verify valid signature', () => {
    const data = { callId: '123', consent: 'yes' };
    const sig = signer.signConsentRecord(data);
    const verified = signer.verifyConsentSignature(data, sig.signature);

    expect(verified).toBe(true);
  });
});

describe('Consent Recording', () => {
  test('should record consent with signature and timestamp', async () => {
    const response = await api.post('/api/consent/record').send({
      callId: '123',
      participantId: '456',
      jurisdiction: 'EU',
      consentType: 'explicit',
      acknowledgment: true
    });

    expect(response.status).toBe(201);
    expect(response.body.consentId).toBeDefined();
    expect(response.body.signatureId).toBeDefined();
    expect(response.body.timestampToken).toBeDefined();
  });
});
```

---

## Deployment Checklist

- [ ] Jurisdiction matrix configured for all target markets
- [ ] GeoIP database integrated
- [ ] RSA-2048 key pair generated and secured
- [ ] RFC3161 TSA integration tested
- [ ] Database schema deployed
- [ ] Consent API endpoints tested
- [ ] Digital signature verification working
- [ ] Audit logging enabled
- [ ] Compliance reports generating correctly
- [ ] Legal team has reviewed all templates
- [ ] All tests passing (>90% coverage)

---

## References

- [GDPR Article 6 - Lawful Basis](https://gdpr-info.eu/art-6-gdpr/)
- [CCPA - Consumer Rights](https://www.sos.ca.gov/administration/news-releases/2020-03-02-department-consumer-affairs-opines-consumer-privacy-act)
- [eIDAS Regulation](https://ec.europa.eu/digital-single-market/en/eid-regulation-electronic-identification-digital-signature)
- [RFC3161 - Time-Stamp Protocol](https://tools.ietf.org/html/rfc3161)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)

---

**Implementation Status**: Planned
**Last Updated**: 2025-11-17
**Next Phase Start**: Week 1 of implementation sprint
