# Enterprise Security Hardening Guide

Comprehensive security guide for deploying WebRTC Call Recorder in enterprise environments with compliance requirements.

## Overview

This guide covers:
- Threat modeling and security architecture
- Authentication & authorization hardening
- Encryption and cryptographic best practices
- Network security and firewall configuration
- API security and rate limiting
- Database security and access control
- Compliance frameworks (GDPR, HIPAA, SOC2, PCI-DSS)
- Security monitoring and incident response
- Vulnerability management

---

## 1. Threat Model

### Identified Threats

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|-----------|
| Unauthorized API access | Critical | High | OAuth2, API keys, rate limiting |
| Recording intercept | Critical | Medium | TLS 1.3, DTLS encryption |
| Consent data tampering | Critical | Low | Digital signatures, audit logs |
| Consent record theft | High | Medium | Encryption at rest, access control |
| Call metadata leakage | Medium | Medium | Network segmentation, VPN |
| Brute force attacks | Medium | High | Account lockout, CAPTCHA, 2FA |
| SQL injection | Critical | Low | Parameterized queries, input validation |
| DDoS attacks | High | High | Rate limiting, WAF, CDN |
| Insider threats | High | Medium | RBAC, audit logging, secrets rotation |
| Zero-day exploits | Medium | Low | Monitoring, patching, IDS/IPS |

### Security Zones

```
┌─────────────────────────────────────────────────────┐
│                  Public Internet                     │
│  (Untrusted, subject to DDoS, attacks)              │
└──────────────────┬──────────────────────────────────┘
                   │ WAF, DDoS Protection, TLS
                   ▼
┌─────────────────────────────────────────────────────┐
│              DMZ / Edge Layer                        │
│  (API Gateway, rate limiting, authentication)      │
│  - API Gateway (OAuth2, JWT validation)             │
│  - WAF (OWASP top 10 protection)                    │
│  - CDN (cache, DDoS mitigation)                     │
└──────────────────┬──────────────────────────────────┘
                   │ Internal TLS, mTLS
                   ▼
┌─────────────────────────────────────────────────────┐
│            Internal Application Layer                │
│  (Application servers, microservices)               │
│  - Node.js/Express server                           │
│  - Service-to-service mTLS                          │
│  - Internal monitoring                              │
└──────────────────┬──────────────────────────────────┘
                   │ Network isolation, encryption
                   ▼
┌─────────────────────────────────────────────────────┐
│              Data Layer                              │
│  (Databases, file storage)                          │
│  - PostgreSQL with encryption                       │
│  - S3/encrypted storage                             │
│  - Encrypted backups                                │
└─────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Authorization

### 2.1 OAuth2 Implementation

```javascript
// server/auth/oauth2.js
const oauth2 = require('oauth2orize');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const crypto = require('crypto');

// Initialize OAuth2 server
const server = oauth2.createServer();

// Configure local strategy (username/password)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!user.rows[0]) {
      return done(null, false, { message: 'Unknown user' });
    }

    // Hash password with bcrypt
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isValid) {
      return done(null, false, { message: 'Invalid password' });
    }

    return done(null, user.rows[0]);
  } catch (err) {
    return done(err);
  }
}));

// Configure JWT strategy
passport.use(new JwtStrategy({
  jwtFromRequest: (req) => {
    // Extract from Authorization header
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }
    return null;
  },
  secretOrKey: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE
}, async (payload, done) => {
  try {
    const user = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!user.rows[0]) {
      return done(null, false);
    }

    return done(null, user.rows[0], payload);
  } catch (err) {
    return done(err);
  }
}));

// Immediate token endpoint
server.immediate((client, user, done) => {
  done(null, true);
});

// Grant code exchange
server.exchange(oauth2.grant.authorizationCode(async (client, code, redirectUri, done) => {
  try {
    const authCode = await db.query(
      'SELECT * FROM auth_codes WHERE code = $1 AND client_id = $2',
      [code, client.id]
    );

    if (!authCode.rows[0]) {
      return done(null, false);
    }

    // Generate access token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({
      sub: authCode.rows[0].user_id,
      email: authCode.rows[0].email,
      scope: authCode.rows[0].scope
    }, process.env.JWT_SECRET, {
      expiresIn: '1h',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    return done(null, token);
  } catch (err) {
    return done(err);
  }
}));

// Express endpoints
app.post('/oauth/authorize',
  passport.authenticate('local', { session: false }),
  server.authorization(async (clientId, redirectUri, scope, done) => {
    // Verify client
    const client = await db.query(
      'SELECT * FROM oauth_clients WHERE id = $1',
      [clientId]
    );

    if (!client.rows[0]) {
      return done(null, false);
    }

    return done(null, client.rows[0], redirectUri);
  }),
  (req, res) => {
    res.render('dialog', { transactionID: req.oauth2.info.transactionID });
  }
);

app.post('/oauth/token',
  server.token(),
  server.errorHandler()
);

module.exports = { passport, server };
```

### 2.2 Multi-Factor Authentication

```javascript
// server/auth/mfa.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class MFAManager {
  // Generate TOTP secret
  async generateSecret(userId) {
    const secret = speakeasy.generateSecret({
      name: `WebRTC Recorder (${userId})`,
      length: 32
    });

    // Generate QR code
    const qr = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not confirmed yet)
    await db.query(
      'UPDATE users SET mfa_secret_pending = $1 WHERE id = $2',
      [secret.base32, userId]
    );

    return {
      secret: secret.base32,
      qr: qr
    };
  }

  // Verify TOTP token and enable MFA
  async verifyAndEnableMFA(userId, token) {
    const user = await db.query(
      'SELECT mfa_secret_pending FROM users WHERE id = $1',
      [userId]
    );

    const isValid = speakeasy.totp.verify({
      secret: user.rows[0].mfa_secret_pending,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValid) {
      throw new Error('Invalid TOTP token');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Enable MFA
    await db.query(
      `UPDATE users SET
        mfa_enabled = true,
        mfa_secret = $1,
        mfa_secret_pending = NULL,
        mfa_backup_codes = $2
       WHERE id = $3`,
      [user.rows[0].mfa_secret_pending, backupCodes, userId]
    );

    return {
      enabled: true,
      backup_codes: backupCodes
    };
  }

  // Verify TOTP token during login
  async verifyTOTP(userId, token) {
    const user = await db.query(
      'SELECT mfa_secret FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );

    if (!user.rows[0]) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.rows[0].mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
  }

  // Generate backup codes
  generateBackupCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

module.exports = new MFAManager();
```

### 2.3 Role-Based Access Control (RBAC)

```javascript
// server/auth/rbac.js
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  USER: 'user',
  GUEST: 'guest'
};

const PERMISSIONS = {
  // User management
  'users:create': ['super_admin', 'admin'],
  'users:read': ['super_admin', 'admin', 'operator'],
  'users:update': ['super_admin', 'admin'],
  'users:delete': ['super_admin'],

  // Call management
  'calls:create': ['super_admin', 'admin', 'operator', 'user'],
  'calls:read': ['super_admin', 'admin', 'operator', 'user'],
  'calls:update': ['super_admin', 'admin', 'operator'],
  'calls:delete': ['super_admin'],

  // Consent management
  'consent:create': ['super_admin', 'admin', 'operator', 'user'],
  'consent:read': ['super_admin', 'admin', 'operator', 'user'],
  'consent:verify': ['super_admin', 'admin'],

  // Reports
  'reports:read': ['super_admin', 'admin', 'operator'],
  'reports:export': ['super_admin', 'admin'],

  // System
  'system:configure': ['super_admin'],
  'system:backup': ['super_admin'],
  'system:monitor': ['super_admin', 'admin']
};

function authorize(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userPermissions = PERMISSIONS[permission] || [];

    if (!userPermissions.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

module.exports = { authorize, ROLES, PERMISSIONS };
```

---

## 3. Encryption & Cryptography

### 3.1 TLS/SSL Configuration

```nginx
# nginx.conf - TLS hardening
server {
  listen 443 ssl http2;
  server_name api.example.com;

  # TLS 1.2+ only
  ssl_protocols TLSv1.2 TLSv1.3;

  # Strong ciphers, prefer ECDHE
  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;
  ssl_session_tickets off;

  # HSTS (HTTP Strict Transport Security)
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

  # Certificate
  ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  # OCSP stapling
  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 8.8.8.8 8.8.4.4;

  location / {
    proxy_pass http://app:3000;
  }
}

# Force HTTPS
server {
  listen 80;
  server_name api.example.com;
  return 301 https://$server_name$request_uri;
}
```

### 3.2 Database Encryption at Rest

```sql
-- PostgreSQL encryption at rest
-- Option 1: Encrypted filesystem (Linux dm-crypt)
-- Option 2: pgcrypto for column-level encryption

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
ALTER TABLE consent_records
ADD COLUMN signature_encrypted bytea;

-- Store encrypted signatures
CREATE OR REPLACE FUNCTION encrypt_consent_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.signature IS NOT NULL THEN
    NEW.signature_encrypted := pgp_pub_encrypt(
      NEW.signature::bytea,
      dearmor(get_encryption_key())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_encrypt
BEFORE INSERT OR UPDATE ON consent_records
FOR EACH ROW
EXECUTE FUNCTION encrypt_consent_signature();

-- Decrypt when reading
SELECT
  id,
  call_id,
  pgp_pub_decrypt(
    signature_encrypted,
    dearmor(get_decryption_key())
  )::text as signature
FROM consent_records;
```

### 3.3 Key Management

```javascript
// server/security/key-management.js
const aws = require('aws-sdk');

class KeyManager {
  constructor() {
    this.kms = new aws.KMS({
      region: process.env.AWS_REGION
    });
  }

  // Get encryption key
  async getKey(keyId) {
    try {
      const result = await this.kms.describeKey({
        KeyId: keyId
      }).promise();

      return result.KeyMetadata;
    } catch (err) {
      console.error('Failed to get key:', err);
      throw err;
    }
  }

  // Encrypt data
  async encrypt(plaintext, keyId) {
    try {
      const result = await this.kms.encrypt({
        KeyId: keyId,
        Plaintext: plaintext
      }).promise();

      return result.CiphertextBlob;
    } catch (err) {
      console.error('Encryption failed:', err);
      throw err;
    }
  }

  // Decrypt data
  async decrypt(ciphertext) {
    try {
      const result = await this.kms.decrypt({
        CiphertextBlob: ciphertext
      }).promise();

      return result.Plaintext;
    } catch (err) {
      console.error('Decryption failed:', err);
      throw err;
    }
  }

  // Rotate keys
  async rotateKeys() {
    try {
      const result = await this.kms.enableKeyRotation({
        KeyId: process.env.KMS_KEY_ID
      }).promise();

      console.log('Key rotation enabled');
      return result;
    } catch (err) {
      console.error('Key rotation failed:', err);
      throw err;
    }
  }

  // Audit key usage
  async auditKeyUsage(keyId) {
    try {
      const cloudtrail = new aws.CloudTrail();

      const result = await cloudtrail.lookupEvents({
        LookupAttributes: [
          {
            AttributeKey: 'ResourceName',
            AttributeValue: keyId
          }
        ]
      }).promise();

      return result.Events;
    } catch (err) {
      console.error('Audit failed:', err);
      throw err;
    }
  }
}

module.exports = new KeyManager();
```

---

## 4. Network Security

### 4.1 Firewall Configuration

```bash
#!/bin/bash
# firewall-config.sh - Configure UFW (Ubuntu Firewall)

# Enable UFW
sudo ufw enable

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (with rate limiting)
sudo ufw limit 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Allow Redis (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 6379

# Allow Prometheus (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 9090

# Verify rules
sudo ufw status verbose

# Logging
sudo ufw logging on
sudo ufw logging high
```

### 4.2 DDoS Protection

```javascript
// server/security/ddos-protection.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10k requests per 15 minutes
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

// Per-user rate limiter
const perUserLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:user'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes per user
  keyGenerator: (req, res) => req.user?.id || req.ip
});

// API endpoint rate limiter (strict)
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  skipSuccessfulRequests: false
});

// Login attempt limiter
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts'
});

module.exports = {
  globalLimiter,
  perUserLimiter,
  apiLimiter,
  loginLimiter
};
```

### 4.3 WAF Configuration (AWS WAF)

```javascript
// security/waf-rules.js
const aws = require('aws-sdk');
const wafv2 = new aws.WAFV2({ region: process.env.AWS_REGION });

const wafRules = [
  {
    Name: 'AWSManagedRulesCommonRuleSet',
    Priority: 0,
    OverrideAction: { None: {} },
    VisibilityConfig: {
      SampledRequestsEnabled: true,
      CloudWatchMetricsEnabled: true,
      MetricName: 'AWSManagedRulesCommonRuleSetMetric'
    },
    ManagedRuleGroupStatement: {
      VendorName: 'AWS',
      Name: 'AWSManagedRulesCommonRuleSet'
    }
  },
  {
    Name: 'AWSManagedRulesKnownBadInputsRuleSet',
    Priority: 1,
    OverrideAction: { None: {} },
    VisibilityConfig: {
      SampledRequestsEnabled: true,
      CloudWatchMetricsEnabled: true,
      MetricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric'
    },
    ManagedRuleGroupStatement: {
      VendorName: 'AWS',
      Name: 'AWSManagedRulesKnownBadInputsRuleSet'
    }
  },
  {
    Name: 'AWSManagedRulesAmazonIpReputationList',
    Priority: 2,
    OverrideAction: { None: {} },
    VisibilityConfig: {
      SampledRequestsEnabled: true,
      CloudWatchMetricsEnabled: true,
      MetricName: 'AWSManagedRulesAmazonIpReputationListMetric'
    },
    ManagedRuleGroupStatement: {
      VendorName: 'AWS',
      Name: 'AWSManagedRulesAmazonIpReputationList'
    }
  }
];

module.exports = { wafRules };
```

---

## 5. API Security

### 5.1 Input Validation

```javascript
// server/security/input-validation.js
const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules
const callValidationRules = () => [
  body('recipient_id')
    .isUUID()
    .withMessage('Invalid recipient ID'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  body('metadata.tags')
    .optional()
    .isArray()
    .custom(val => val.every(tag => typeof tag === 'string' && tag.length <= 50))
    .withMessage('Tags must be strings <= 50 characters')
];

const consentValidationRules = () => [
  param('callId')
    .isUUID()
    .withMessage('Invalid call ID'),
  body('consented')
    .isBoolean()
    .withMessage('Consented must be boolean'),
  body('consent_method')
    .isIn(['voice', 'visual', 'explicit', 'implied'])
    .withMessage('Invalid consent method')
];

module.exports = {
  validate,
  callValidationRules,
  consentValidationRules
};
```

### 5.2 CORS Configuration

```javascript
// server/security/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 3600 // 1 hour
};

module.exports = cors(corsOptions);
```

### 5.3 API Key Management

```javascript
// server/security/api-keys.js
const crypto = require('crypto');

class APIKeyManager {
  // Generate API key
  async generateAPIKey(userId, name, expiresIn = '1y') {
    const key = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    await db.query(
      `INSERT INTO api_keys (user_id, name, key_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${expiresIn}', NOW())`,
      [userId, name, hash]
    );

    return key; // Return unhashed key (user's only chance to see it)
  }

  // Validate API key
  async validateAPIKey(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const result = await db.query(
      `SELECT user_id FROM api_keys
       WHERE key_hash = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL`,
      [hash]
    );

    return result.rows[0]?.user_id || null;
  }

  // Revoke API key
  async revokeAPIKey(keyId) {
    await db.query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1',
      [keyId]
    );
  }

  // List API keys
  async listAPIKeys(userId) {
    const result = await db.query(
      `SELECT id, name, created_at, expires_at, revoked_at
       FROM api_keys WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }
}

module.exports = new APIKeyManager();
```

---

## 6. Database Security

### 6.1 PostgreSQL Hardening

```sql
-- PostgreSQL security hardening

-- 1. Disable unused extensions
DROP EXTENSION IF EXISTS plpgsql CASCADE;

-- 2. Limit connections
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET reserved_connections = 10;

-- 3. Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- 4. Enable SSL
ALTER SYSTEM SET ssl = on;

-- 5. Create restricted roles
CREATE ROLE app_user WITH LOGIN PASSWORD 'strong_password';
CREATE ROLE app_readonly WITH LOGIN PASSWORD 'strong_password';

-- 6. Grant limited permissions
GRANT CONNECT ON DATABASE webrtc_recorder TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- Read-only role
GRANT CONNECT ON DATABASE webrtc_recorder TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- 7. Row-level security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY calls_isolation ON calls
  USING (
    user_id = current_user_id() OR
    recipient_id = current_user_id() OR
    user_id IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- 8. Audit logging
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(63) NOT NULL,
  action VARCHAR(10) NOT NULL,
  record_id UUID,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, action, record_id, changed_by, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    current_user_id(),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calls_audit AFTER INSERT OR UPDATE OR DELETE ON calls
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### 6.2 Database Access Control

```bash
#!/bin/bash
# database-access-control.sh

# Only allow connections from app servers
psql -U postgres -d webrtc_recorder -c "
ALTER SYSTEM SET listen_addresses = '10.0.0.10';
"

# Create pg_hba.conf entries
cat >> /etc/postgresql/13/main/pg_hba.conf << 'EOF'
# Application server
hostssl webrtc_recorder app_user 10.0.0.10/32 md5 clientcert=require
hostssl webrtc_recorder app_readonly 10.0.0.10/32 md5 clientcert=require

# Backup server
hostssl webrtc_recorder backup_user 10.0.1.5/32 md5 clientcert=require

# Monitoring
hostssl webrtc_recorder monitoring_user 10.0.2.10/32 md5 clientcert=require

# Deny everything else
host    all all 0.0.0.0/0 reject
hostssl all all 0.0.0.0/0 reject
EOF

# Reload PostgreSQL
sudo systemctl reload postgresql
```

---

## 7. Compliance & Regulatory

### 7.1 GDPR Compliance

```javascript
// server/compliance/gdpr.js
class GDPRCompliance {
  // Right to be forgotten
  async deleteUserData(userId) {
    try {
      await db.query('BEGIN TRANSACTION');

      // 1. Delete personal data
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      await db.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);

      // 2. Anonymize consent records
      await db.query(
        `UPDATE consent_records
         SET user_id = NULL, signature = NULL, signature_encrypted = NULL
         WHERE user_id = $1`,
        [userId]
      );

      // 3. Anonymize call metadata
      await db.query(
        `UPDATE calls
         SET initiator_metadata = NULL, recipient_metadata = NULL
         WHERE initiator_id = $1 OR recipient_id = $1`,
        [userId]
      );

      // 4. Log deletion for audit
      await db.query(
        `INSERT INTO gdpr_audit_log (user_id, action, timestamp)
         VALUES ($1, 'DATA_DELETION_REQUESTED', NOW())`,
        [userId]
      );

      await db.query('COMMIT');

      return {
        success: true,
        message: 'User data deleted as per GDPR requirements'
      };
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  // Data portability
  async exportUserData(userId) {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const calls = await db.query(
      `SELECT * FROM calls WHERE initiator_id = $1 OR recipient_id = $1`,
      [userId]
    );

    const consents = await db.query(
      `SELECT * FROM consent_records WHERE user_id = $1`,
      [userId]
    );

    return {
      user: result.rows[0],
      calls: calls.rows,
      consent_records: consents.rows
    };
  }
}

module.exports = new GDPRCompliance();
```

### 7.2 HIPAA Compliance (Healthcare)

```javascript
// server/compliance/hipaa.js
const crypto = require('crypto');

class HIPAACompliance {
  // Business Associate Agreement (BAA) requirements
  async validateBAACompliance() {
    const checklist = {
      'Encryption in Transit': this.verifyTLSEncryption(),
      'Encryption at Rest': this.verifyDatabaseEncryption(),
      'Access Controls': this.verifyAccessControls(),
      'Audit Logging': this.verifyAuditLogging(),
      'Backup & Recovery': this.verifyBackupStrategy(),
      'Breach Notification': this.verifyBreachNotificationPlan(),
      'Incident Response': this.verifyIncidentResponse()
    };

    return checklist;
  }

  // Protected Health Information (PHI) encryption
  async encryptPHI(data, keyId) {
    const encrypted = await this.kms.encrypt({
      KeyId: keyId,
      Plaintext: JSON.stringify(data)
    }).promise();

    return encrypted.CiphertextBlob;
  }

  // Access audit trail
  async auditPHIAccess(userId, action, recordId) {
    await db.query(
      `INSERT INTO phi_audit_log (user_id, action, record_id, timestamp, ip_address)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [userId, action, recordId, getCurrentIPAddress()]
    );
  }

  // Minimum necessary principle
  async getPHIWithMinimumNecessary(userId, purpose) {
    // Only return fields necessary for the stated purpose
    const fields = this.getMinimalFieldsForPurpose(purpose);

    return await db.query(
      `SELECT ${fields.join(',')} FROM users WHERE id = $1`,
      [userId]
    );
  }
}

module.exports = new HIPAACompliance();
```

### 7.3 SOC2 Compliance

```bash
#!/bin/bash
# soc2-compliance-check.sh

echo "SOC2 Compliance Check"
echo "===================="

# 1. Check encryption
echo -n "✓ Encryption (TLS 1.2+): "
openssl s_client -connect api.example.com:443 -tls1_2 | grep "Protocol" && echo "PASS" || echo "FAIL"

# 2. Check access controls
echo -n "✓ Multi-factor authentication: "
curl -s https://api.example.com/api/mfa-status | jq '.enabled' && echo "PASS" || echo "FAIL"

# 3. Check audit logging
echo -n "✓ Audit logging enabled: "
psql -U postgres -d webrtc_recorder -c "SELECT count(*) FROM audit_log;" | grep -v "count" | grep -v "^$" && echo "PASS" || echo "FAIL"

# 4. Check backup strategy
echo -n "✓ Daily backups: "
ls -1 /backups/daily/* 2>/dev/null | wc -l | grep -E "[1-9]" && echo "PASS" || echo "FAIL"

# 5. Check monitoring
echo -n "✓ 24/7 Monitoring: "
curl -s http://localhost:3001/api/datasources | jq '.[] | select(.name=="Prometheus")' && echo "PASS" || echo "FAIL"

# 6. Check incident response plan
echo -n "✓ Incident response plan: "
test -f /docs/INCIDENT_RESPONSE_PLAN.md && echo "PASS" || echo "FAIL"

# 7. Check data retention policy
echo -n "✓ Data retention policy: "
test -f /docs/DATA_RETENTION_POLICY.md && echo "PASS" || echo "FAIL"

echo ""
echo "For full SOC2 Type II audit, engage external auditor"
```

---

## 8. Security Monitoring

### 8.1 Security Event Logging

```javascript
// server/security/event-logging.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // File transport with rotation
    new winston.transports.File({
      filename: '/var/log/webrtc/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 14 // Keep 2 weeks
    }),
    // Console for critical events
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple()
    })
  ],
  defaultMeta: { service: 'webrtc-recorder' }
});

class SecurityEventLogger {
  // Log authentication events
  async logAuthEvent(event) {
    securityLogger.info('AUTH_EVENT', {
      timestamp: new Date().toISOString(),
      event: event.type, // 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'MFA_SUCCESS', 'MFA_FAILED'
      user_id: event.userId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      success: event.success,
      reason: event.reason
    });
  }

  // Log access control events
  async logAccessEvent(event) {
    securityLogger.warn('ACCESS_EVENT', {
      timestamp: new Date().toISOString(),
      user_id: event.userId,
      resource: event.resource,
      action: event.action,
      result: event.result, // 'ALLOWED' or 'DENIED'
      reason: event.reason
    });
  }

  // Log data access
  async logDataAccess(event) {
    securityLogger.info('DATA_ACCESS', {
      timestamp: new Date().toISOString(),
      user_id: event.userId,
      table: event.table,
      rows_accessed: event.rowCount,
      query_hash: event.queryHash // Hash of SQL query
    });
  }

  // Log security violations
  async logSecurityViolation(violation) {
    securityLogger.error('SECURITY_VIOLATION', {
      timestamp: new Date().toISOString(),
      type: violation.type,
      severity: violation.severity, // 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
      description: violation.description,
      affected_user: violation.userId,
      ip_address: violation.ipAddress,
      action_taken: violation.actionTaken
    });
  }
}

module.exports = new SecurityEventLogger();
```

### 8.2 Intrusion Detection

```javascript
// server/security/intrusion-detection.js
const EventEmitter = require('events');

class IntrusionDetectionSystem extends EventEmitter {
  constructor() {
    super();
    this.thresholds = {
      failed_logins_per_hour: 10,
      api_errors_per_minute: 50,
      data_access_per_second: 1000,
      unusual_api_patterns: true
    };
  }

  // Detect brute force attacks
  async detectBruteForce(userId, ipAddress) {
    const key = `failed_login:${ipAddress}`;
    const count = await redis.incr(key);
    await redis.expire(key, 3600); // 1 hour

    if (count > this.thresholds.failed_logins_per_hour) {
      this.emit('intrusion_detected', {
        type: 'BRUTE_FORCE_ATTACK',
        ip_address: ipAddress,
        failed_attempts: count,
        action: 'BLOCK_IP'
      });

      return true;
    }

    return false;
  }

  // Detect SQL injection attempts
  async detectSQLInjection(query) {
    const sqlInjectionPatterns = [
      /('|"|;|(--)|\/\*|\*\/|xp_|sp_|union|select|insert|update|delete|drop)/i
    ];

    if (sqlInjectionPatterns.some(pattern => pattern.test(query))) {
      this.emit('intrusion_detected', {
        type: 'SQL_INJECTION_ATTEMPT',
        query: query,
        action: 'BLOCK_REQUEST'
      });

      return true;
    }

    return false;
  }

  // Detect unusual API patterns
  async detectUnusualPatterns(userId, endpoint, method) {
    const key = `api_pattern:${userId}:${endpoint}`;
    const pattern = `${method}`;

    const existingPatterns = await redis.smembers(key);

    // If user suddenly using new endpoints, investigate
    if (existingPatterns.length > 10) {
      this.emit('intrusion_detected', {
        type: 'UNUSUAL_API_PATTERN',
        user_id: userId,
        new_endpoint: endpoint,
        established_endpoints: existingPatterns.length,
        action: 'INVESTIGATE'
      });
    }

    await redis.sadd(key, pattern);
    await redis.expire(key, 86400); // 24 hours
  }

  // Detect privilege escalation
  async detectPrivilegeEscalation(userId, newRole) {
    const oldRole = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (oldRole.rows[0]?.role !== newRole) {
      this.emit('intrusion_detected', {
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        user_id: userId,
        from_role: oldRole.rows[0]?.role,
        to_role: newRole,
        action: 'ALERT_ADMIN'
      });
    }
  }
}

module.exports = new IntrusionDetectionSystem();
```

---

## 9. Incident Response

### 9.1 Security Incident Response Plan

```markdown
# Security Incident Response Plan

## Incident Severity Levels

### Level 1: CRITICAL
- Data breach or unauthorized access confirmed
- System unavailable/compromised
- **Response Time**: < 15 minutes
- **Escalation**: All hands on deck

### Level 2: HIGH
- Unauthorized access attempt (blocked)
- Data integrity concern
- Denial of service attack (in progress)
- **Response Time**: < 1 hour

### Level 3: MEDIUM
- Suspicious activity detected
- Minor security violation
- Potential vulnerability discovered
- **Response Time**: < 4 hours

### Level 4: LOW
- Security warning or policy violation
- Minor misconfiguration
- **Response Time**: < 24 hours

## Response Procedures

### Step 1: Detect & Report
- Monitor and alert on security events
- Immediately notify security team
- Document initial findings

### Step 2: Assess & Isolate
- Determine incident scope
- Isolate affected systems
- Preserve forensic evidence
- Contain the threat

### Step 3: Investigate & Analyze
- Analyze logs and forensics
- Identify root cause
- Determine exposure/impact
- Timeline of events

### Step 4: Remediate & Recover
- Apply patches/fixes
- Reset credentials
- Restore from backups
- Verify systems
```

### 9.2 Breach Notification

```javascript
// server/security/breach-notification.js
class BreachNotification {
  async notifyDataBreach(incidentDetails) {
    const affectedUsers = incidentDetails.affectedUsers || [];

    // 1. Log the incident
    await db.query(
      `INSERT INTO security_incidents
       (incident_type, severity, affected_user_count, description, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [incidentDetails.type, incidentDetails.severity,
       affectedUsers.length, incidentDetails.description]
    );

    // 2. Send notifications (must comply with 72-hour requirement in GDPR)
    for (const userId of affectedUsers) {
      const user = await db.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      await this.sendBreachNotificationEmail(user.rows[0].email, {
        incident_type: incidentDetails.type,
        date_discovered: new Date(),
        likely_impact: incidentDetails.impact,
        steps_taken: incidentDetails.steps,
        contact_email: 'security@example.com'
      });
    }

    // 3. Notify authorities (if required)
    if (incidentDetails.severity === 'CRITICAL') {
      await this.notifyRegulators(incidentDetails);
    }
  }

  async sendBreachNotificationEmail(email, details) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: 'security@example.com',
      to: email,
      subject: 'Security Incident Notification',
      html: `
        <h1>Security Incident Notification</h1>
        <p>We are writing to inform you of a security incident that may have affected your data.</p>
        <p><strong>Incident Type:</strong> ${details.incident_type}</p>
        <p><strong>Date Discovered:</strong> ${details.date_discovered}</p>
        <p><strong>Impact:</strong> ${details.likely_impact}</p>
        <p><strong>Steps Taken:</strong> ${details.steps_taken}</p>
        <p>For more information, please contact: ${details.contact_email}</p>
      `
    });
  }
}

module.exports = new BreachNotification();
```

---

## 10. Vulnerability Management

### 10.1 Dependency Scanning

```bash
#!/bin/bash
# vulnerability-scan.sh

echo "🔍 Scanning for vulnerabilities..."

# 1. Check npm dependencies
echo "Checking npm packages..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
  echo "⚠️  High-risk vulnerabilities found in npm packages"
  npm audit fix
fi

# 2. Check system packages
echo "Checking system packages..."
apt list --upgradable 2>/dev/null | grep -E "(security|updates)"

# 3. Check Node.js version
echo "Checking Node.js version..."
node -v
nvm install-latest-npm

# 4. OWASP Dependency Check
echo "Running OWASP Dependency Check..."
docker run --rm -v "$(pwd)":/src owasp/dependency-check \
  --project "WebRTC Recorder" \
  --scan /src \
  --format HTML \
  --out /src/reports/dependency-check.html

# 5. Static code analysis
echo "Running static code analysis (SonarQube)..."
docker run --rm -v "$(pwd)":/usr/src sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=webrtc-recorder \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.login=$SONAR_TOKEN

echo "✅ Vulnerability scan complete"
```

### 10.2 Patch Management

```bash
#!/bin/bash
# patch-management.sh

echo "🔧 Applying security patches..."

# Test environment
echo "Testing patches in staging..."
cd /home/app/staging
git pull origin main
npm install
npm audit fix --force
npm test

# Production deployment
if [ $? -eq 0 ]; then
  echo "✅ Tests passed. Deploying to production..."

  # Create maintenance window alert
  curl -X POST https://notify.example.com \
    -d "Deploying security patches - minimal impact expected"

  # Deploy
  cd /home/app/production
  git pull origin main
  npm install
  systemctl restart webrtc-recorder

  # Verify
  sleep 10
  curl http://localhost:3000/health

  echo "✅ Patches deployed successfully"
else
  echo "❌ Tests failed. Aborting deployment."
  exit 1
fi
```

---

## 11. Security Deployment Checklist

### Pre-Deployment

- [ ] All dependencies scanned for vulnerabilities
- [ ] Static code analysis passed
- [ ] OWASP top 10 checklist completed
- [ ] TLS certificates valid
- [ ] SSH keys rotated
- [ ] Secrets not in code/logs
- [ ] Database credentials rotated
- [ ] API keys regenerated

### Deployment

- [ ] Deploy to staging first
- [ ] Run full security test suite
- [ ] Verify firewall rules
- [ ] Confirm monitoring active
- [ ] Test alert systems
- [ ] Verify backup systems
- [ ] Check access controls
- [ ] Confirm encryption working

### Post-Deployment

- [ ] Monitor security logs
- [ ] Check error rates
- [ ] Verify performance
- [ ] Confirm backups running
- [ ] Test incident response
- [ ] Update documentation
- [ ] Conduct security review
- [ ] Plan next security audit

---

## 12. Security Resources

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)

---

**Last Updated**: 2025-11-17
**Maintainer**: Security Team
**Review Cycle**: Quarterly
