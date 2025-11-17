# Consent Management & Compliance Implementation

## Overview

Comprehensive multi-jurisdiction consent management system for WebRTC recording. Implements GDPR, CCPA, LGPD, PIPEDA, PDPA, and NZDPA compliance with digital signatures, audit trails, and data portability.

**Implementation Status**: ✅ Complete (Tier 1, Phase 2)

---

## Supported Jurisdictions

### GDPR (European Union)
- **Strictest Standard**: Requires explicit, informed consent
- **Key Requirements**:
  - ✅ Digital signatures (RSA-2048)
  - ✅ Audit logging
  - ✅ Right to be forgotten
  - ✅ Data portability
  - ✅ Data controller designation
- **Retention**: 90 days default
- **Consent Types**: recording, storage, processing, analytics

### CCPA (California)
- **US-Specific**: Opt-out oriented (less strict than GDPR)
- **Key Requirements**:
  - ✅ Consumer disclosure
  - ✅ Audit logging (no signature required)
  - ✅ Right to be forgotten
  - ✅ Data portability
- **Retention**: 365 days default
- **Consent Types**: recording, storage, analytics

### LGPD (Brazil)
- **Similar to GDPR**: Explicit consent required
- **Key Requirements**:
  - ✅ CPF (Brazilian ID) tracking
  - ✅ Digital signatures
  - ✅ Audit logging
  - ✅ Right to be forgotten
  - ✅ Data portability
- **Retention**: 90 days default
- **Consent Types**: recording, storage, processing

### PIPEDA (Canada)
- **Privacy-Focused**: Informed consent requirement
- **Key Requirements**:
  - ✅ Digital signatures
  - ✅ Audit logging
  - ✅ Right to be forgotten
  - ✅ Data portability
- **Retention**: 180 days default
- **Consent Types**: recording, storage, processing

### PDPA (Thailand)
- **Recently Enacted**: GDPR-like in strictness
- **Key Requirements**:
  - ✅ Digital signatures
  - ✅ Audit logging
  - ✅ Right to be forgotten
  - ✅ Data portability
  - ✅ Consent required for disclosure
- **Retention**: 180 days default
- **Consent Types**: recording, storage, processing, disclosure

### NZDPA (New Zealand)
- **Privacy Act**: Principles-based approach
- **Key Requirements**:
  - ✅ Digital signatures
  - ✅ Audit logging
  - ✅ Right to be forgotten
  - ✅ Data portability
- **Retention**: 180 days default
- **Consent Types**: recording, storage, processing

---

## Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Consent Management Flow                │
├──────────────────────────────────────────────────────────┤

1. Call Initiated
   └─> Detect participants' jurisdictions
   └─> Create consent request
   └─> Send consent forms to participants

2. Participant Response
   ├─ Consents
   │  └─> Sign with RSA-2048 private key
   │  └─> Send signed consent
   │  └─> Record in database with hash
   │  └─> Create digital certificate
   │
   └─ Rejects
      └─> Record rejection with reason
      └─> Prevent recording unless opt-out allowed

3. Compliance & Audit
   ├─ Real-time audit logging
   ├─ Digital signature verification
   ├─ Certificate validity checking
   ├─ Compliance reporting by jurisdiction
   └─ Automated data retention/deletion

4. Data Subject Rights
   ├─ Right to be Forgotten (GDPR/LGPD/PIPEDA/PDPA/NZDPA)
   │  └─> Mark for deletion
   │  └─> Remove recordings
   │  └─> Clean metadata
   │
   └─ Data Portability (all jurisdictions)
      └─> Export consent data
      └─> Generate portable format
      └─> Provide temporary download link
```

---

## Services

### 1. ConsentManager.js

**Purpose**: Core consent logic and jurisdiction handling

**Key Methods**:

#### `detectJurisdiction(userInfo)`
Identifies applicable jurisdiction

```javascript
const jurisdiction = consentManager.detectJurisdiction({
  countryCode: 'DE', // Germany
  email: 'user@example.de'
});
// Returns: 'GDPR'
```

#### `createConsentRequest(callId, participants)`
Initiates consent workflow

```javascript
const request = consentManager.createConsentRequest('call-123', [
  { id: 'user-1', email: 'alice@example.com', countryCode: 'US' },
  { id: 'user-2', email: 'bob@example.de', countryCode: 'DE' }
]);

// Returns:
{
  id: 'consent-req-123',
  callId: 'call-123',
  participants: [
    {
      id: 'user-1',
      jurisdiction: 'CCPA',  // California
      consentStatus: 'pending'
    },
    {
      id: 'user-2',
      jurisdiction: 'GDPR',  // Germany
      consentStatus: 'pending'
    }
  ],
  status: 'pending'
}
```

#### `recordConsent(requestId, participantId, consentData)`
Records participant consent

```javascript
const result = consentManager.recordConsent(
  'consent-req-123',
  'user-1',
  {
    name: 'Alice Smith',
    email: 'alice@example.com',
    consentType: 'recording',
    signature: 'base64-rsa-signature'
  }
);

// Returns:
{
  requestId: 'consent-req-123',
  participantId: 'user-1',
  consentStatus: 'consented',
  requestStatus: 'partial' // or 'complete'
}
```

#### `canRecordCall(requestId)`
Determines if recording is allowed

```javascript
const allowed = consentManager.canRecordCall('consent-req-123');
// true only if ALL participants consented (GDPR standard)
```

#### `deleteParticipantData(requestId, participantId)`
Right to be forgotten implementation

```javascript
const result = consentManager.deleteParticipantData(
  'consent-req-123',
  'user-1'
);

// Returns: {
//   requestId: 'consent-req-123',
//   participantId: 'user-1',
//   status: 'deleted'
// }
```

#### `exportParticipantData(requestId, participantId)`
Data portability export

```javascript
const exportData = consentManager.exportParticipantData(
  'consent-req-123',
  'user-1'
);

// Returns: {
//   participant: { id, email, jurisdiction },
//   consentData: { ... },
//   exportedAt: '2025-11-17T...'
// }
```

#### `getComplianceReport(startDate, endDate)`
Generate jurisdiction compliance report

```javascript
const report = consentManager.getComplianceReport('2025-11-01', '2025-11-30');

// Returns: {
//   period: { startDate, endDate },
//   summary: {
//     totalRequests: 150,
//     completedRequests: 140,
//     partialRequests: 10
//   },
//   jurisdictions: {
//     GDPR: { requests: 80, consented: 75, rejected: 5 },
//     CCPA: { requests: 40, consented: 35, rejected: 5 },
//     LGPD: { requests: 30, consented: 30, rejected: 0 }
//   }
// }
```

---

### 2. DigitalSignatureService.js

**Purpose**: RSA-2048 digital signatures for non-repudiation

**Key Methods**:

#### `generateKeyPair(participantId)`
Create RSA-2048 key pair

```javascript
const keys = signatureService.generateKeyPair('user-1');

// Returns: {
//   participantId: 'user-1',
//   publicKey: '-----BEGIN PUBLIC KEY-----\n...',
//   fingerprint: 'a1b2c3d4...',
//   algorithm: 'RSA-SHA256',
//   createdAt: '2025-11-17T...'
// }
```

#### `signConsent(participantId, consentData)`
Sign consent with participant's private key

```javascript
const signature = signatureService.signConsent(
  'user-1',
  {
    name: 'Alice Smith',
    email: 'alice@example.com',
    consentType: 'recording',
    jurisdiction: 'GDPR'
  }
);

// Returns: {
//   participantId: 'user-1',
//   signature: 'base64-encoded-signature',
//   algorithm: 'RSA-SHA256',
//   dataHash: 'sha256-hash',
//   timestamp: '2025-11-17T...',
//   fingerprint: 'a1b2c3d4...'
// }
```

#### `verifySignature(consentData, signature, participantId)`
Verify signature integrity

```javascript
const isValid = signatureService.verifySignature(
  { name: 'Alice Smith', email: 'alice@example.com', ... },
  'base64-signature',
  'user-1'
);

// Returns: true/false
```

#### `createSignedCertificate(participantId, consentData)`
Create RFC3161-like certificate

```javascript
const cert = signatureService.createSignedCertificate(
  'user-1',
  { name: 'Alice Smith', consentType: 'recording', ... }
);

// Returns: {
//   version: '1.0',
//   type: 'CONSENT_CERTIFICATE',
//   issuedAt: '2025-11-17T...',
//   subject: { participantId: 'user-1', commonName: 'Alice Smith' },
//   consent: { type: 'recording', jurisdiction: 'GDPR', data: {...} },
//   signature: { algorithm, value, fingerprint, timestamp },
//   validity: { notBefore, notAfter },
//   extensions: { dataHash, keyFingerprint }
// }
```

#### `verifyCertificate(certificate)`
Validate certificate

```javascript
const result = signatureService.verifyCertificate(certificate);

// Returns: {
//   valid: true,
//   certificate: '1.0',
//   issuedAt: '2025-11-17T...',
//   fingerprint: 'a1b2c3d4...',
//   reason: 'Valid'
// }
```

---

## API Endpoints

### POST /api/consent/request
Create consent request

```bash
curl -X POST http://localhost:3000/api/consent/request \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "call-123",
    "initiatorId": "organizer-id",
    "participants": [
      { "id": "user-1", "email": "alice@example.com", "countryCode": "US" },
      { "id": "user-2", "email": "bob@example.de", "countryCode": "DE" }
    ]
  }'
```

**Response** (201 Created):
```json
{
  "requestId": "consent-req-123",
  "callId": "call-123",
  "status": "pending",
  "participants": [
    {
      "id": "user-1",
      "email": "alice@example.com",
      "jurisdiction": "CCPA",
      "consentStatus": "pending"
    },
    {
      "id": "user-2",
      "email": "bob@example.de",
      "jurisdiction": "GDPR",
      "consentStatus": "pending"
    }
  ],
  "expiresAt": "2025-11-18T10:30:00Z"
}
```

### GET /api/consent/request/:requestId
Get consent request status

```bash
curl http://localhost:3000/api/consent/request/consent-req-123
```

**Response** (200 OK):
```json
{
  "id": "consent-req-123",
  "callId": "call-123",
  "status": "partial",
  "timestamp": "2025-11-17T10:30:00Z",
  "completedAt": null,
  "participants": [
    {
      "id": "user-1",
      "email": "alice@example.com",
      "jurisdiction": "CCPA",
      "consentStatus": "consented",
      "consentedAt": "2025-11-17T10:35:00Z"
    },
    {
      "id": "user-2",
      "email": "bob@example.de",
      "jurisdiction": "GDPR",
      "consentStatus": "pending",
      "consentedAt": null
    }
  ]
}
```

### POST /api/consent/request/:requestId/consent
Record participant consent

```bash
curl -X POST http://localhost:3000/api/consent/request/consent-req-123/consent \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "user-1",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "consentType": "recording",
    "signature": "base64-encoded-rsa-signature"
  }'
```

**Response** (200 OK):
```json
{
  "requestId": "consent-req-123",
  "participantId": "user-1",
  "consentStatus": "consented",
  "requestStatus": "partial",
  "canRecordCall": false,
  "timestamp": "2025-11-17T10:35:00Z"
}
```

### POST /api/consent/request/:requestId/reject
Reject consent

```bash
curl -X POST http://localhost:3000/api/consent/request/consent-req-123/reject \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "user-2",
    "reason": "Not comfortable with recording"
  }'
```

**Response** (200 OK):
```json
{
  "requestId": "consent-req-123",
  "participantId": "user-2",
  "consentStatus": "rejected",
  "rejectedAt": "2025-11-17T10:40:00Z"
}
```

### GET /api/consent/report?startDate=2025-11-01&endDate=2025-11-30
Get compliance report

```bash
curl "http://localhost:3000/api/consent/report?startDate=2025-11-01&endDate=2025-11-30"
```

**Response** (200 OK):
```json
{
  "period": {
    "startDate": "2025-11-01",
    "endDate": "2025-11-30"
  },
  "summary": {
    "totalRequests": 150,
    "completedRequests": 140,
    "partialRequests": 10,
    "rejectedRequests": 0
  },
  "jurisdictions": {
    "GDPR": {
      "requests": 80,
      "consented": 75,
      "rejected": 5,
      "pending": 0
    },
    "CCPA": {
      "requests": 40,
      "consented": 35,
      "rejected": 5,
      "pending": 0
    },
    "LGPD": {
      "requests": 30,
      "consented": 30,
      "rejected": 0,
      "pending": 0
    }
  },
  "generatedAt": "2025-11-17T10:45:00Z"
}
```

### POST /api/consent/right-to-be-forgotten
Delete participant data (GDPR)

```bash
curl -X POST http://localhost:3000/api/consent/right-to-be-forgotten \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "consent-req-123",
    "participantId": "user-1"
  }'
```

**Response** (200 OK):
```json
{
  "requestId": "consent-req-123",
  "participantId": "user-1",
  "status": "deleted",
  "timestamp": "2025-11-17T11:00:00Z",
  "message": "Data marked for deletion in compliance with right to be forgotten"
}
```

### GET /api/consent/export/:requestId/:participantId
Export participant data

```bash
curl http://localhost:3000/api/consent/export/consent-req-123/user-1
```

**Response** (200 OK):
```json
{
  "participant": {
    "id": "user-1",
    "email": "alice@example.com",
    "jurisdiction": "GDPR"
  },
  "consentData": {
    "name": "Alice Smith",
    "consentType": "recording",
    "recordedAt": "2025-11-17T10:35:00Z",
    "consentHash": "sha256-hash"
  },
  "callData": {
    "callId": "call-123",
    "timestamp": "2025-11-17T10:30:00Z"
  },
  "exportedAt": "2025-11-17T11:05:00Z",
  "format": "JSON"
}
```

### GET /api/consent/jurisdictions
Get jurisdiction requirements

```bash
curl http://localhost:3000/api/consent/jurisdictions
```

**Response** (200 OK):
```json
{
  "available": ["GDPR", "CCPA", "LGPD", "PIPEDA", "PDPA", "NZDPA"],
  "jurisdictions": {
    "GDPR": {
      "name": "General Data Protection Regulation",
      "region": "EU",
      "consentTypes": ["recording", "storage", "processing", "analytics"],
      "retentionDays": 90,
      "requiresSignature": true,
      "rightToBeForotten": true,
      "dataPortability": true
    },
    "CCPA": {
      "name": "California Consumer Privacy Act",
      "region": "US-California",
      "consentTypes": ["recording", "storage", "analytics"],
      "retentionDays": 365,
      "requiresSignature": false,
      "rightToBeForotten": true,
      "dataPortability": true
    }
  }
}
```

---

## Usage Example: Complete Flow

### 1. Call Setup

```javascript
// Server initializes consent system
const ConsentManager = require('./services/ConsentManager');
const DigitalSignatureService = require('./services/DigitalSignatureService');

const consentManager = new ConsentManager();
const signatureService = new DigitalSignatureService();

// Generate keys for organizer
const organizerKeys = signatureService.generateKeyPair('organizer-id');
console.log('Organizer public key:', organizerKeys.publicKey);
```

### 2. Consent Request

```javascript
// Organizer initiates recording with participants from different jurisdictions
const consentRequest = consentManager.createConsentRequest('call-123', [
  { id: 'alice', email: 'alice@example.com', countryCode: 'DE' }, // GDPR
  { id: 'bob', email: 'bob@example.ca', countryCode: 'CA' },      // PIPEDA
  { id: 'charlie', email: 'charlie@example.br', countryCode: 'BR' } // LGPD
]);

console.log('Consent request created:', consentRequest.id);
// Different jurisdictions detected automatically
```

### 3. Participant Consent

```javascript
// Alice (GDPR - Germany) provides signed consent
const aliceKeys = signatureService.generateKeyPair('alice');

const aliceSignature = signatureService.signConsent('alice', {
  name: 'Alice Müller',
  email: 'alice@example.com',
  consentType: 'recording'
});

// Record Alice's consent
const aliceResult = consentManager.recordConsent(
  'consent-req-123',
  'alice',
  {
    name: 'Alice Müller',
    email: 'alice@example.com',
    consentType: 'recording',
    signature: aliceSignature.signature
  }
);

console.log('Alice consented:', aliceResult.consentStatus); // 'consented'
```

### 4. Verify Consent & Recording

```javascript
// Check if recording can proceed
const canRecord = consentManager.canRecordCall('consent-req-123');

if (canRecord) {
  // All participants consented - proceed with recording
  startRecording('call-123');
} else {
  // Some participants rejected or not yet responded
  notifyOrganizer('Waiting for all participants to consent');
}
```

### 5. Compliance & Audit

```javascript
// Get audit trail
const auditLog = consentManager.getAuditLog('consent-req-123');

auditLog.forEach(entry => {
  console.log(
    `${entry.participantId} (${entry.jurisdiction}): ${entry.action}`
  );
});

// Generate monthly compliance report
const report = consentManager.getComplianceReport('2025-11-01', '2025-11-30');

console.log(`GDPR: ${report.jurisdictions.GDPR.consented}/${report.jurisdictions.GDPR.requests}`);
console.log(`PIPEDA: ${report.jurisdictions.PIPEDA.consented}/${report.jurisdictions.PIPEDA.requests}`);
console.log(`LGPD: ${report.jurisdictions.LGPD.consented}/${report.jurisdictions.LGPD.requests}`);
```

### 6. Data Subject Rights

```javascript
// Alice exercises right to be forgotten (GDPR)
const deletion = consentManager.deleteParticipantData(
  'consent-req-123',
  'alice'
);

console.log('Data deletion initiated:', deletion.status); // 'deleted'

// Bob requests data export (PIPEDA)
const exportData = consentManager.exportParticipantData(
  'consent-req-123',
  'bob'
);

console.log('Export data:', JSON.stringify(exportData, null, 2));
```

---

## Database Schema

Key tables (see migrations/003-add-consent-tables.sql):

- `consent_requests`: Core consent workflow
- `participant_consents`: Individual participant consent records
- `consent_rejections`: Rejection tracking
- `consent_audit_log`: Compliance audit trail
- `digital_signatures`: RSA key storage and metadata
- `consent_certificates`: Signed certificate storage
- `right_to_be_forgotten_requests`: GDPR deletion requests
- `data_portability_exports`: Data export requests
- `consent_compliance_metrics`: Daily compliance stats
- `data_retention_schedule`: Auto-deletion scheduling

---

## Security Considerations

1. **Key Management**:
   - RSA-2048 minimum (2048-bit keys)
   - Private keys encrypted at rest
   - Regular key rotation (annually recommended)
   - Compromised keys can be revoked

2. **Signature Verification**:
   - SHA-256 hashing
   - RSA signature verification on each access
   - Timestamp validation (90-day default)
   - Audit trail for all signature operations

3. **Data Privacy**:
   - Encryption at rest (AES-256-GCM)
   - Encryption in transit (HTTPS)
   - Database-level access controls
   - Participant data separated by jurisdiction

4. **Compliance**:
   - Audit logging of all consent operations
   - Immutable audit trail
   - Automated retention/deletion
   - Compliance reporting per jurisdiction

---

## Troubleshooting

### Issue: Signature Verification Fails

**Problem**: `verifySignature()` returns false

**Solution**:
1. Ensure data hasn't been modified
2. Verify correct participant ID
3. Check key pair still exists in keyStore
4. Verify timestamp is within validity window

### Issue: Consent Request Expires

**Problem**: Participants can't consent after 24 hours

**Solution**:
1. Modify expiration in ConsentManager constructor
2. Create new consent request if needed
3. Notify participants before expiration

### Issue: Right to Be Forgotten Data Not Deleted

**Problem**: Data still visible after deletion request

**Solution**:
1. Check cleanup task is running
2. Verify database cleanup executed
3. Check S3/storage service logs
4. May have 24-48 hour delay for full cleanup

---

## Future Enhancements

1. **Blockchain Integration**: Immutable consent record on blockchain
2. **Biometric Signatures**: Fingerprint/Face ID consent verification
3. **AI Compliance**: Automated jurisdiction detection via ML
4. **Real-time Dashboard**: Live consent status monitoring
5. **WebAuthn Support**: FIDO2 for passwordless consent signing
6. **Post-Quantum Cryptography**: NIST-approved PQC algorithms

---

## Compliance Checklist

### GDPR
- ✅ Explicit consent required
- ✅ Digital signatures
- ✅ Audit logging
- ✅ Right to be forgotten
- ✅ Data portability
- ✅ Data controller assignment
- ✅ 90-day retention

### CCPA
- ✅ Consumer disclosure
- ✅ Opt-out capability
- ✅ Audit logging
- ✅ Right to delete
- ✅ Data portability
- ✅ 365-day retention

### LGPD
- ✅ Explicit consent
- ✅ CPF tracking
- ✅ Digital signatures
- ✅ Audit logging
- ✅ Right to be forgotten
- ✅ Data portability
- ✅ 90-day retention

---

Last Updated: 2025-11-17
Implementation Phase: Tier 1, Complete
