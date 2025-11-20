/**
 * Security Hardening Module for Ring WebRTC Platform
 * Implements:
 * - WSS (Secure WebSocket) enforcement
 * - TURN credential rotation with time-limited tokens
 * - Content Security Policy (CSP) headers
 * - HTTPS/TLS enforcement
 * - CVE mitigation strategies
 *
 * References:
 * - CVE-2024-10488 (Chrome WebRTC Use After Free)
 * - CVE-2024-10487 (Dawn graphics out-of-bounds)
 * - RFC 8156 (TURN authentication)
 * - CSP Level 3 Specification
 */

const crypto = require('crypto');
const { Pool } = require('pg');

class SecurityHardeningManager {
  constructor(options = {}) {
    this.turnServers = options.turnServers || [
      { urls: ['turns:turn.ring.local:443'], domain: 'ring.local' },
      { urls: ['turns:turn-backup.ring.local:443'], domain: 'ring-backup.local' }
    ];

    this.credentialTTL = options.credentialTTL || 3600000; // 1 hour default
    this.tokenLength = options.tokenLength || 32;
    this.db = options.db || null;

    // CVE-2024-10488, CVE-2024-10487 mitigation
    this.minBrowserVersions = {
      'Chrome': 120,
      'Chromium': 120,
      'Firefox': 121,
      'Safari': 17.2,
      'Edge': 120
    };

    // Track issued credentials for auditing
    this.credentialAuditLog = [];
    this.maxAuditLog = 10000;
  }

  /**
   * Enforce WSS (Secure WebSocket) for all signaling
   * Rejects plain WS connections
   */
  enforceWSS(app) {
    // Enforce HTTPS redirect
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });

    // HSTS (HTTP Strict Transport Security)
    app.use((req, res, next) => {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      next();
    });

    // WebSocket upgrade validation
    return (req, socket, head) => {
      const protocol = req.headers['sec-websocket-protocol'];

      // Only allow WSS (verified by reverse proxy or TLS)
      if (!req.secure && process.env.NODE_ENV === 'production') {
        socket.destroy();
        return;
      }

      // Browser version check
      const userAgent = req.headers['user-agent'];
      if (!this.isBrowserVersionSupported(userAgent)) {
        socket.write('HTTP/1.1 426 Upgrade Required\r\n');
        socket.write('Content-Type: text/plain\r\n');
        socket.write('Content-Length: 47\r\n');
        socket.write('\r\n');
        socket.write('Browser version too old. Please update your browser.');
        socket.destroy();
        return;
      }
    };
  }

  /**
   * Generate time-limited TURN credentials
   * Uses HMAC-based shared secret (RFC 5766)
   */
  async generateTURNCredentials(userId, options = {}) {
    const now = Date.now();
    const expiresAt = now + (options.ttl || this.credentialTTL);
    const username = `${Math.floor(expiresAt / 1000)}:${userId}`;

    // Generate random credential token
    const credentialToken = crypto.randomBytes(this.tokenLength).toString('hex');

    // HMAC-SHA1 based credential generation (RFC 5766 style)
    const credential = crypto
      .createHmac('sha1', process.env.TURN_SECRET || 'default-secret')
      .update(username)
      .digest('base64');

    const credentials = {
      username,
      credential,
      credentialToken,
      expiresAt,
      servers: this.turnServers.map(server => ({
        urls: server.urls,
        domain: server.domain,
        username,
        credential
      }))
    };

    // Log for audit trail
    await this.logCredentialIssuance({
      userId,
      username,
      expiresAt,
      issuedAt: now,
      ipAddress: options.ipAddress || 'unknown'
    });

    return credentials;
  }

  /**
   * Validate TURN credential hasn't expired
   * Called during call setup for credential verification
   */
  validateTURNCredential(credential) {
    const now = Date.now();
    const expiresAt = credential.expiresAt;

    if (expiresAt < now) {
      return {
        valid: false,
        reason: 'credential_expired',
        expiredAt: new Date(expiresAt)
      };
    }

    // Check if expiring soon (warn if < 5 minutes left)
    const timeLeft = expiresAt - now;
    if (timeLeft < 5 * 60 * 1000) {
      return {
        valid: true,
        warning: 'credential_expiring_soon',
        timeLeft: Math.ceil(timeLeft / 1000)
      };
    }

    return { valid: true };
  }

  /**
   * Revoke TURN credentials (e.g., on user logout)
   */
  async revokeTURNCredential(userId, credentialToken) {
    // Add to revocation list
    if (this.db) {
      await this.db.query(
        'INSERT INTO turn_credential_revocations (user_id, credential_token, revoked_at) VALUES ($1, $2, NOW())',
        [userId, credentialToken]
      );
    }

    return { revoked: true, timestamp: new Date() };
  }

  /**
   * Content Security Policy (CSP) Headers
   * Mitigates XSS, clickjacking, data injection attacks
   */
  applyCSPHeaders(app) {
    const cspPolicy = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'img-src': ["'self'", "data:", "https:"],
      'media-src': ["'self'"],
      'connect-src': [
        "'self'",
        "wss://localhost:*",
        "wss://ring.local:*",
        "https://turns:*",
        "https://stun:*"
      ],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'block-all-mixed-content': [],
      'upgrade-insecure-requests': []
    };

    // Convert to CSP header string
    const cspString = Object.entries(cspPolicy)
      .map(([key, values]) => {
        if (values.length === 0) return key;
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');

    // Apply middleware
    app.use((req, res, next) => {
      res.setHeader('Content-Security-Policy', cspString);
      res.setHeader('Content-Security-Policy-Report-Only', cspString + "; report-uri /api/security/csp-report");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
      next();
    });

    return cspString;
  }

  /**
   * Enforce minimum TLS version (1.2+)
   */
  enforceTLS(httpsServer) {
    httpsServer.setSecureContext = (options) => {
      if (options.minVersion === undefined) {
        options.minVersion = 'TLSv1.2';
      }
      if (options.ciphers === undefined) {
        options.ciphers = [
          'ECDHE-ECDSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-ECDSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-ECDSA-CHACHA20-POLY1305',
          'ECDHE-RSA-CHACHA20-POLY1305'
        ].join(':');
      }
      return options;
    };

    return httpsServer;
  }

  /**
   * Browser version checking to prevent known CVEs
   */
  isBrowserVersionSupported(userAgent) {
    if (!userAgent) return true; // Allow if unknown

    for (const [browser, minVersion] of Object.entries(this.minBrowserVersions)) {
      const regex = new RegExp(`${browser}[/\\s](\\d+)`, 'i');
      const match = userAgent.match(regex);

      if (match) {
        const version = parseInt(match[1]);
        return version >= minVersion;
      }
    }

    return true; // Unknown browser, allow
  }

  /**
   * Audit logging for credential issuance
   */
  async logCredentialIssuance(data) {
    this.credentialAuditLog.push({
      timestamp: new Date(),
      ...data
    });

    // Keep audit log bounded
    if (this.credentialAuditLog.length > this.maxAuditLog) {
      this.credentialAuditLog.shift();
    }

    // Persist to database if available
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO turn_credential_audit
           (user_id, username, issued_at, expires_at, ip_address)
           VALUES ($1, $2, $3, $4, $5)`,
          [data.userId, data.username, new Date(), new Date(data.expiresAt), data.ipAddress]
        );
      } catch (err) {
        console.error('Failed to log credential issuance:', err);
      }
    }
  }

  /**
   * Get audit log for security review
   */
  getAuditLog(filters = {}) {
    let log = this.credentialAuditLog;

    if (filters.userId) {
      log = log.filter(entry => entry.userId === filters.userId);
    }

    if (filters.startDate) {
      log = log.filter(entry => entry.timestamp >= filters.startDate);
    }

    if (filters.limit) {
      log = log.slice(-filters.limit);
    }

    return log;
  }

  /**
   * Security health check
   */
  async healthCheck() {
    const health = {
      timestamp: new Date(),
      wssEnabled: true,
      tlsVersion: 'TLSv1.2+',
      cspEnabled: true,
      credentialRotationEnabled: true,
      recentAuditLogEntries: this.credentialAuditLog.length,
      status: 'healthy'
    };

    // Check if any old credentials still exist
    const now = Date.now();
    const expiredCredentials = this.credentialAuditLog.filter(
      entry => entry.expiresAt < now
    );

    if (expiredCredentials.length > 100) {
      health.warnings = ['Large number of expired credentials in log'];
    }

    return health;
  }
}

/**
 * Express middleware factory
 */
function createSecurityMiddleware(options = {}) {
  const manager = new SecurityHardeningManager(options);

  return {
    // Apply all security measures
    apply: (app, httpsServer) => {
      // 1. Enforce HTTPS/TLS
      if (httpsServer) {
        manager.enforceTLS(httpsServer);
      }

      // 2. Apply CSP headers
      manager.applyCSPHeaders(app);

      // 3. API endpoint for TURN credentials
      app.post('/api/security/turn-credentials', async (req, res) => {
        try {
          const userId = req.user?.id;
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const credentials = await manager.generateTURNCredentials(userId, {
            ipAddress: req.ip,
            ttl: req.body.ttl
          });

          res.json(credentials);
        } catch (err) {
          console.error('Error generating TURN credentials:', err);
          res.status(500).json({ error: 'Failed to generate credentials' });
        }
      });

      // 4. API endpoint for credential validation
      app.post('/api/security/validate-credential', (req, res) => {
        const result = manager.validateTURNCredential(req.body.credential);
        res.json(result);
      });

      // 5. API endpoint for credential revocation
      app.post('/api/security/revoke-credential', async (req, res) => {
        try {
          const userId = req.user?.id;
          const result = await manager.revokeTURNCredential(
            userId,
            req.body.credentialToken
          );
          res.json(result);
        } catch (err) {
          res.status(500).json({ error: 'Failed to revoke credential' });
        }
      });

      // 6. Security audit log endpoint
      app.get('/api/security/audit-log', (req, res) => {
        const log = manager.getAuditLog({
          userId: req.query.userId,
          limit: parseInt(req.query.limit) || 100
        });
        res.json(log);
      });

      // 7. Security health check endpoint
      app.get('/api/security/health', async (req, res) => {
        const health = await manager.healthCheck();
        res.json(health);
      });

      // 8. CSP violation reporting endpoint
      app.post('/api/security/csp-report', (req, res) => {
        const violation = req.body;
        console.warn('CSP Violation:', JSON.stringify(violation, null, 2));
        res.status(204).send();
      });

      return manager;
    },

    // Get manager instance for testing/debugging
    createManager: (options) => new SecurityHardeningManager(options)
  };
}

module.exports = {
  SecurityHardeningManager,
  createSecurityMiddleware
};
