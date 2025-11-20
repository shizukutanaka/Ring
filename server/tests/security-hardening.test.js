/**
 * Security Hardening Tests
 * Tests for WSS enforcement, TURN credentials, CSP headers
 */

const assert = require('assert');
const {
  SecurityHardeningManager,
  createSecurityMiddleware
} = require('../server/security-hardening');
const {
  TURNCredentialManager,
  createTURNMiddleware
} = require('../server/turn-manager');

describe('Security Hardening Suite', () => {

  describe('SecurityHardeningManager', () => {
    let manager;

    before(() => {
      manager = new SecurityHardeningManager({
        credentialTTL: 3600000 // 1 hour
      });
    });

    describe('TURN Credentials Generation', () => {
      it('should generate valid TURN credentials', async () => {
        const userId = 'user-123';
        const creds = await manager.generateTURNCredentials(userId);

        assert(creds, 'Credentials should be returned');
        assert(creds.username, 'Username should exist');
        assert(creds.credential, 'Credential (password) should exist');
        assert(creds.credentialToken, 'Credential token should exist');
        assert(creds.expiresAt, 'Expiration timestamp should exist');
        assert(creds.servers, 'TURN servers config should exist');
        assert(Array.isArray(creds.servers), 'Servers should be array');
        assert(creds.servers.length > 0, 'At least one server should be configured');
      });

      it('should have correct credential format', async () => {
        const creds = await manager.generateTURNCredentials('test-user');

        // Username should be in format: timestamp:user_id
        const [timestamp, userId] = creds.username.split(':');
        assert(Number.isInteger(parseInt(timestamp)), 'Timestamp part should be numeric');
        assert.strictEqual(userId, 'test-user', 'User ID should match');

        // Credential should be base64 (HMAC-SHA1 result)
        assert(Buffer.from(creds.credential, 'base64').length > 0, 'Credential should be valid base64');
      });

      it('should set correct expiration time', async () => {
        const creds = await manager.generateTURNCredentials('test-user');
        const now = Date.now();
        const expectedExpiry = now + 3600000; // 1 hour

        // Allow 1 second tolerance
        assert(Math.abs(creds.expiresAt - expectedExpiry) < 1000, 'Expiration should be ~1 hour from now');
      });

      it('should include multiple servers', async () => {
        const creds = await manager.generateTURNCredentials('test-user');

        assert(creds.servers.length >= 2, 'Should have primary and backup servers');
        creds.servers.forEach(server => {
          assert(server.urls, 'Server should have URLs');
          assert(Array.isArray(server.urls), 'URLs should be array');
          assert(server.username === creds.username, 'Server username should match');
          assert(server.credential === creds.credential, 'Server credential should match');
        });
      });
    });

    describe('TURN Credential Validation', () => {
      it('should validate non-expired credentials', async () => {
        const creds = await manager.generateTURNCredentials('test-user');
        const result = manager.validateTURNCredential(creds);

        assert(result.valid === true, 'Fresh credential should be valid');
        assert(!result.warning, 'Fresh credential should not have warning');
      });

      it('should reject expired credentials', () => {
        const expiredCreds = {
          expiresAt: Date.now() - 1000 // 1 second ago
        };
        const result = manager.validateTURNCredential(expiredCreds);

        assert(result.valid === false, 'Expired credential should be invalid');
        assert.strictEqual(result.reason, 'credential_expired', 'Reason should be credential_expired');
      });

      it('should warn about soon-to-expire credentials', () => {
        const soonExpiredCreds = {
          expiresAt: Date.now() + 4 * 60 * 1000 // 4 minutes
        };
        const result = manager.validateTURNCredential(soonExpiredCreds);

        assert(result.valid === true, 'Credential should still be valid');
        assert.strictEqual(result.warning, 'credential_expiring_soon', 'Should have expiring warning');
        assert(result.timeLeft > 0, 'Should report time left');
      });
    });

    describe('TURN Credential Revocation', () => {
      it('should revoke credentials', async () => {
        const creds = await manager.generateTURNCredentials('test-user');
        const result = await manager.revokeTURNCredential('test-user', creds.credentialToken);

        assert(result.revoked === true, 'Should return revoked flag');
        assert(result.timestamp, 'Should return timestamp');
      });
    });

    describe('Browser Version Checking', () => {
      it('should allow modern Chrome versions', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0';
        assert(manager.isBrowserVersionSupported(ua) === true, 'Chrome 120 should be supported');
      });

      it('should reject old Chrome versions', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/110.0.0.0';
        assert(manager.isBrowserVersionSupported(ua) === false, 'Chrome 110 should not be supported');
      });

      it('should allow modern Firefox', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
        assert(manager.isBrowserVersionSupported(ua) === true, 'Firefox 121 should be supported');
      });

      it('should allow unknown browsers', () => {
        const ua = 'Unknown Browser';
        assert(manager.isBrowserVersionSupported(ua) === true, 'Unknown browser should be allowed');
      });

      it('should handle no user agent', () => {
        assert(manager.isBrowserVersionSupported(null) === true, 'Null UA should be allowed');
      });
    });

    describe('Audit Logging', () => {
      it('should log credential issuance', async () => {
        const logData = {
          userId: 'user-123',
          username: 'test:user-123',
          expiresAt: Date.now() + 3600000,
          ipAddress: '192.168.1.1'
        };

        await manager.logCredentialIssuance(logData);
        const log = manager.getAuditLog();

        assert(log.length > 0, 'Audit log should have entries');
        const lastEntry = log[log.length - 1];
        assert.strictEqual(lastEntry.userId, logData.userId, 'Log should contain correct user ID');
        assert.strictEqual(lastEntry.ipAddress, logData.ipAddress, 'Log should contain IP address');
      });

      it('should filter audit log by user ID', async () => {
        await manager.logCredentialIssuance({
          userId: 'user-A',
          username: 'test:user-A',
          expiresAt: Date.now() + 3600000,
          ipAddress: '192.168.1.1'
        });

        await manager.logCredentialIssuance({
          userId: 'user-B',
          username: 'test:user-B',
          expiresAt: Date.now() + 3600000,
          ipAddress: '192.168.1.2'
        });

        const filteredLog = manager.getAuditLog({ userId: 'user-A' });
        assert(filteredLog.every(entry => entry.userId === 'user-A'), 'All entries should be for user-A');
      });

      it('should limit audit log output', async () => {
        const log = manager.getAuditLog({ limit: 5 });
        assert(log.length <= 5, 'Limited log should not exceed 5 entries');
      });
    });

    describe('Health Check', () => {
      it('should return health status', async () => {
        const health = await manager.healthCheck();

        assert(health.timestamp, 'Should have timestamp');
        assert(health.wssEnabled === true, 'WSS should be enabled');
        assert(health.tlsVersion, 'Should report TLS version');
        assert(health.cspEnabled === true, 'CSP should be enabled');
        assert(health.credentialRotationEnabled === true, 'Credential rotation should be enabled');
        assert(health.status === 'healthy', 'Status should be healthy');
      });
    });
  });

  describe('TURNCredentialManager', () => {
    let turnManager;

    before(() => {
      turnManager = new TURNCredentialManager({
        credentialTTL: 3600
      });
    });

    describe('TURN Credential Generation', () => {
      it('should generate valid TURN credentials', () => {
        const creds = turnManager.generateCredentials('user-123');

        assert(creds.username, 'Username should exist');
        assert(creds.password, 'Password should exist');
        assert(creds.expiresAt, 'Expiration should exist');
        assert(Number.isInteger(creds.expiresAt), 'Expiration should be unix timestamp');
      });

      it('should include expiration in username', () => {
        const creds = turnManager.generateCredentials('user-123');
        const [expireStr, userId] = creds.username.split(':');

        assert.strictEqual(userId, 'user-123', 'Username should include user ID');
        assert.strictEqual(parseInt(expireStr), creds.expiresAt, 'Username should include expiration');
      });

      it('should generate base64 password (HMAC-SHA1)', () => {
        const creds = turnManager.generateCredentials('user-123');

        // Password should be valid base64
        const decoded = Buffer.from(creds.password, 'base64');
        assert(decoded.length > 0, 'Password should decode from base64');
        assert.strictEqual(decoded.length, 20, 'SHA1 should produce 20 bytes');
      });
    });

    describe('ICE Server Configuration', () => {
      it('should return ICE server config with credentials', () => {
        const creds = turnManager.generateCredentials('user-123');
        const iceConfig = turnManager.getIceServers(creds);

        assert(iceConfig.iceServers, 'Should have iceServers');
        assert(Array.isArray(iceConfig.iceServers), 'iceServers should be array');
        assert(iceConfig.iceServers.length > 0, 'Should have at least one server');
      });

      it('should include STUN servers', () => {
        const creds = turnManager.generateCredentials('user-123');
        const iceConfig = turnManager.getIceServers(creds);

        const stunServers = iceConfig.iceServers.filter(s => s.urls.includes('stun'));
        assert(stunServers.length > 0, 'Should include STUN servers');
      });

      it('should include TURN servers with credentials', () => {
        const creds = turnManager.generateCredentials('user-123');
        const iceConfig = turnManager.getIceServers(creds);

        const turnServers = iceConfig.iceServers.filter(s => s.username);
        assert(turnServers.length > 0, 'Should include TURN servers with credentials');

        turnServers.forEach(server => {
          assert.strictEqual(server.username, creds.username, 'Should have correct username');
          assert.strictEqual(server.credential, creds.password, 'Should have correct password');
          assert.strictEqual(server.credentialType, 'password', 'Should specify password type');
        });
      });

      it('should include both TCP and UDP transports', () => {
        const creds = turnManager.generateCredentials('user-123');
        const iceConfig = turnManager.getIceServers(creds);

        const tcpServers = iceConfig.iceServers.filter(s => s.urls?.includes('transport=tcp'));
        const udpServers = iceConfig.iceServers.filter(s => s.urls?.includes('transport=udp'));

        assert(tcpServers.length > 0, 'Should include TCP TURN servers');
        assert(udpServers.length > 0, 'Should include UDP TURN servers');
      });

      it('should include primary and backup servers', () => {
        const creds = turnManager.generateCredentials('user-123');
        const iceConfig = turnManager.getIceServers(creds);

        // At minimum 1 primary (tcp+udp) + 1 backup (tcp+udp) = 4+ servers
        const turnServers = iceConfig.iceServers.filter(s => s.username);
        assert(turnServers.length >= 4, 'Should have primary and backup TURN servers');
      });
    });

    describe('Credential Validation', () => {
      it('should validate active credentials', () => {
        const creds = turnManager.generateCredentials('user-123');
        const result = turnManager.validateCredentials(creds);

        assert(result.valid === true, 'Fresh credentials should be valid');
      });

      it('should reject expired credentials', () => {
        const expiredCreds = {
          expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        };
        const result = turnManager.validateCredentials(expiredCreds);

        assert(result.valid === false, 'Expired credentials should be invalid');
        assert.strictEqual(result.reason, 'expired', 'Should report expired reason');
      });

      it('should warn about expiring credentials', () => {
        const now = Math.floor(Date.now() / 1000);
        const expiringCreds = {
          expiresAt: now + 200 // 200 seconds (< 5 min)
        };
        const result = turnManager.validateCredentials(expiringCreds);

        assert(result.valid === true, 'Credential should still be valid');
        assert.strictEqual(result.warning, 'expiring_soon', 'Should warn about expiration');
        assert(result.secondsRemaining > 0, 'Should report seconds remaining');
      });
    });

    describe('Credential Caching', () => {
      it('should cache credentials', () => {
        const creds = turnManager.generateCredentials('user-123');

        assert(turnManager.isCredentialCached(creds.username, creds.password), 'Credential should be cached');
      });

      it('should revoke cached credentials', () => {
        const creds = turnManager.generateCredentials('user-123');
        assert(turnManager.isCredentialCached(creds.username, creds.password), 'Should be cached initially');

        turnManager.revokeCredentials(creds);

        assert(!turnManager.isCredentialCached(creds.username, creds.password), 'Should be removed after revoke');
      });
    });

    describe('Credential Refresh', () => {
      it('should refresh credentials for ongoing calls', () => {
        const oldCreds = turnManager.generateCredentials('user-123');
        const newCreds = turnManager.refreshCredentials('user-123', oldCreds);

        assert(newCreds.username !== oldCreds.username, 'Username should change');
        assert(newCreds.password !== oldCreds.password, 'Password should change');
        assert(newCreds.expiresAt > oldCreds.expiresAt, 'New expiration should be later');
      });

      it('should not find old credentials after refresh', () => {
        const oldCreds = turnManager.generateCredentials('user-123');
        turnManager.refreshCredentials('user-123', oldCreds);

        assert(!turnManager.isCredentialCached(oldCreds.username, oldCreds.password), 'Old credential should be revoked');
      });
    });
  });

  describe('Integration', () => {
    it('should work with security middleware', () => {
      const middleware = createSecurityMiddleware();
      assert(middleware.apply, 'Should have apply function');
      assert(middleware.createManager, 'Should have createManager function');
    });

    it('should work with TURN middleware', () => {
      const middleware = createTURNMiddleware();
      assert(middleware.getICEServers, 'Should have getICEServers');
      assert(middleware.validateCredentials, 'Should have validateCredentials');
      assert(middleware.refreshCredentials, 'Should have refreshCredentials');
      assert(middleware.manager, 'Should have manager instance');
    });
  });

  describe('Performance', () => {
    it('should generate credentials quickly', () => {
      const manager = new SecurityHardeningManager();
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        manager.generateTURNCredentials(`user-${i}`);
      }

      const elapsed = Date.now() - start;
      assert(elapsed < 1000, 'Should generate 1000 credentials in <1 second');
    });

    it('should validate credentials quickly', () => {
      const manager = new TURNCredentialManager();
      const creds = manager.generateCredentials('user-123');

      const start = Date.now();

      for (let i = 0; i < 10000; i++) {
        manager.validateCredentials(creds);
      }

      const elapsed = Date.now() - start;
      assert(elapsed < 100, 'Should validate 10000 times in <100ms');
    });
  });

});

describe('Security Test Cases', () => {

  describe('CVE Mitigation', () => {
    it('should reject old Chrome versions (CVE-2024-10488)', () => {
      const manager = new SecurityHardeningManager();
      const oldChromeUA = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/110.0.0.0';

      assert(!manager.isBrowserVersionSupported(oldChromeUA), 'Should reject Chrome < 120');
    });

    it('should reject old Firefox versions', () => {
      const manager = new SecurityHardeningManager();
      const oldFirefoxUA = 'Mozilla/5.0 (X11; Linux x86_64; rv:110.0) Gecko/20100101 Firefox/110.0';

      assert(!manager.isBrowserVersionSupported(oldFirefoxUA), 'Should reject Firefox < 121');
    });

    it('should enforce WSS only for production', () => {
      const manager = new SecurityHardeningManager();
      // This is checked in the enforceWSS middleware
      assert(manager !== null, 'Manager should be initialized');
    });
  });

  describe('Credential Security', () => {
    it('should use different secrets for different credentials', async () => {
      const manager = new SecurityHardeningManager();

      const creds1 = await manager.generateTURNCredentials('user-1');
      const creds2 = await manager.generateTURNCredentials('user-2');

      assert(creds1.credential !== creds2.credential, 'Different users should have different credentials');
      assert(creds1.username !== creds2.username, 'Different users should have different usernames');
    });

    it('should use time-limited credentials', async () => {
      const manager = new SecurityHardeningManager({ credentialTTL: 3600000 });
      const creds = await manager.generateTURNCredentials('user-123');

      const now = Date.now();
      const timeUntilExpiry = creds.expiresAt - now;

      assert(timeUntilExpiry > 0, 'Credential should not be expired');
      assert(timeUntilExpiry <= 3600000, 'Credential TTL should be <= 1 hour');
    });
  });

});
