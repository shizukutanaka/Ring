/**
 * TURN Credential Manager
 * Handles time-limited TURN server credentials with rotation
 *
 * References:
 * - RFC 5766 (TURN protocol)
 * - RFC 5928 (TURN extensions for IPv6)
 * - RFC 7064 (URI Scheme for TURN Resources)
 */

const crypto = require('crypto');
const { Pool } = require('pg');

class TURNCredentialManager {
  constructor(options = {}) {
    this.primaryServers = options.primaryServers || [
      {
        host: process.env.TURN_SERVER_PRIMARY || 'turn.ring.local',
        port: 443,
        protocol: 'turns'
      }
    ];

    this.backupServers = options.backupServers || [
      {
        host: process.env.TURN_SERVER_BACKUP || 'turn-backup.ring.local',
        port: 443,
        protocol: 'turns'
      }
    ];

    this.stunServers = options.stunServers || [
      { host: 'stun.ring.local', port: 3478 },
      { host: 'stun-backup.ring.local', port: 3478 }
    ];

    this.credentialTTL = options.credentialTTL || 3600; // 1 hour in seconds
    this.db = options.db || null;
    this.sharedSecret = process.env.TURN_SHARED_SECRET || 'default-shared-secret';

    // In-memory cache for credential validation
    this.credentialCache = new Map();
    this.maxCacheSize = 10000;
  }

  /**
   * Generate ephemeral username:password credentials
   * Time-window based (RFC 5766 Section 2.2)
   */
  generateCredentials(userId) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.credentialTTL;

    // Username format: expiration_timestamp:user_id
    const username = `${expiresAt}:${userId}`;

    // HMAC-SHA1 based password generation
    const password = crypto
      .createHmac('sha1', this.sharedSecret)
      .update(username)
      .digest('base64');

    const credentials = {
      username,
      password,
      expiresAt,
      createdAt: now
    };

    // Cache for quick validation
    this.cacheCredential(credentials);

    return credentials;
  }

  /**
   * Get ICE server configuration for a peer connection
   */
  getIceServers(credentials) {
    const servers = {
      iceServers: [
        // STUN servers (for public IP discovery)
        ...this.stunServers.map(server => ({
          urls: `stun:${server.host}:${server.port}`
        })),

        // TURN servers (for relay)
        ...this.primaryServers.map(server => ({
          urls: `${server.protocol}:${server.host}:${server.port}?transport=tcp`,
          username: credentials.username,
          credential: credentials.password,
          credentialType: 'password'
        })),
        ...this.primaryServers.map(server => ({
          urls: `${server.protocol}:${server.host}:${server.port}?transport=udp`,
          username: credentials.username,
          credential: credentials.password,
          credentialType: 'password'
        })),

        // Backup TURN servers
        ...this.backupServers.map(server => ({
          urls: `${server.protocol}:${server.host}:${server.port}?transport=tcp`,
          username: credentials.username,
          credential: credentials.password,
          credentialType: 'password'
        })),
        ...this.backupServers.map(server => ({
          urls: `${server.protocol}:${server.host}:${server.port}?transport=udp`,
          username: credentials.username,
          credential: credentials.password,
          credentialType: 'password'
        }))
      ],

      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    return servers;
  }

  /**
   * Validate credentials (check expiration)
   */
  validateCredentials(credentials) {
    const now = Math.floor(Date.now() / 1000);

    // Check if expired
    if (credentials.expiresAt <= now) {
      return {
        valid: false,
        reason: 'expired',
        expiredAt: new Date(credentials.expiresAt * 1000)
      };
    }

    // Check if expiring soon (< 5 minutes)
    const timeUntilExpiry = credentials.expiresAt - now;
    if (timeUntilExpiry < 300) {
      return {
        valid: true,
        warning: 'expiring_soon',
        secondsRemaining: timeUntilExpiry
      };
    }

    return { valid: true };
  }

  /**
   * Refresh credentials for ongoing calls
   */
  refreshCredentials(userId, oldCredentials) {
    // Revoke old credentials
    this.revokeCredentials(oldCredentials);

    // Generate new ones
    return this.generateCredentials(userId);
  }

  /**
   * Revoke credentials (remove from cache)
   */
  revokeCredentials(credentials) {
    const key = `${credentials.username}:${credentials.password}`;
    this.credentialCache.delete(key);

    // In production, also add to blacklist in database
    return { revoked: true };
  }

  /**
   * Cache credential for quick validation
   */
  cacheCredential(credentials) {
    if (this.credentialCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.credentialCache.keys().next().value;
      this.credentialCache.delete(firstKey);
    }

    const key = `${credentials.username}:${credentials.password}`;
    this.credentialCache.set(key, credentials);
  }

  /**
   * Check if credential is in cache (quick validation)
   */
  isCredentialCached(username, password) {
    const key = `${username}:${password}`;
    return this.credentialCache.has(key);
  }

  /**
   * Get TURN server statistics
   */
  async getServerStats() {
    const stats = {
      timestamp: new Date(),
      primary: this.primaryServers.length,
      backup: this.backupServers.length,
      stun: this.stunServers.length,
      credentialsCached: this.credentialCache.size,
      health: {
        primary: 'healthy', // In production, check actual health
        backup: 'healthy',
        stun: 'healthy'
      }
    };

    if (this.db) {
      try {
        const result = await this.db.query(
          `SELECT
             COUNT(*) as total_credentials,
             COUNT(CASE WHEN revoked_at IS NULL THEN 1 END) as active_credentials
           FROM turn_credentials`
        );
        stats.database = result.rows[0];
      } catch (err) {
        console.error('Error fetching credential stats:', err);
      }
    }

    return stats;
  }

  /**
   * Database schema migration (run once)
   */
  async createSchema() {
    if (!this.db) return false;

    const schema = `
      -- TURN credentials table
      CREATE TABLE IF NOT EXISTS turn_credentials (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        ip_address INET,
        call_id UUID,
        INDEX idx_expires_at (expires_at),
        INDEX idx_user_id (user_id),
        INDEX idx_revoked_at (revoked_at)
      );

      -- Credential audit log
      CREATE TABLE IF NOT EXISTS turn_credential_audit (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(50), -- 'issued', 'validated', 'refreshed', 'revoked'
        ip_address INET,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp)
      );

      -- TURN server health check log
      CREATE TABLE IF NOT EXISTS turn_server_health (
        id BIGSERIAL PRIMARY KEY,
        server_host VARCHAR(255) NOT NULL,
        server_port INT NOT NULL,
        status VARCHAR(50), -- 'healthy', 'degraded', 'unhealthy'
        last_check TIMESTAMPTZ,
        response_time_ms INT,
        error_message TEXT,
        INDEX idx_server_host (server_host)
      );
    `;

    try {
      await this.db.query(schema);
      console.log('TURN credential schema created successfully');
      return true;
    } catch (err) {
      console.error('Error creating TURN schema:', err);
      return false;
    }
  }

  /**
   * Cleanup expired credentials from database
   * Should be run periodically (e.g., hourly)
   */
  async cleanupExpiredCredentials() {
    if (!this.db) return false;

    try {
      const result = await this.db.query(
        `DELETE FROM turn_credentials
         WHERE expires_at < NOW() - INTERVAL '24 hours'`
      );

      console.log(`Cleaned up ${result.rowCount} expired credentials`);
      return result.rowCount;
    } catch (err) {
      console.error('Error cleaning up credentials:', err);
      return 0;
    }
  }

  /**
   * Get credential usage report
   */
  async getUsageReport(timeWindow = '24h') {
    if (!this.db) return null;

    try {
      const result = await this.db.query(
        `SELECT
           DATE_TRUNC('hour', timestamp) as hour,
           COUNT(*) as credential_generations,
           COUNT(DISTINCT user_id) as unique_users
         FROM turn_credential_audit
         WHERE action = 'issued'
         AND timestamp > NOW() - INTERVAL $1
         GROUP BY DATE_TRUNC('hour', timestamp)
         ORDER BY hour DESC`,
        [timeWindow]
      );

      return result.rows;
    } catch (err) {
      console.error('Error fetching usage report:', err);
      return null;
    }
  }
}

/**
 * Express middleware factory
 */
function createTURNMiddleware(options = {}) {
  const manager = new TURNCredentialManager(options);

  return {
    // Get ICE servers for a WebRTC peer connection
    getICEServers: async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const credentials = manager.generateCredentials(userId);
        const iceServers = manager.getIceServers(credentials);

        res.json({
          iceServers,
          credentials: {
            username: credentials.username,
            expiresAt: credentials.expiresAt
          },
          ttl: manager.credentialTTL
        });
      } catch (err) {
        console.error('Error getting ICE servers:', err);
        res.status(500).json({ error: 'Failed to get ICE servers' });
      }
    },

    // Validate existing credentials
    validateCredentials: (req, res) => {
      const result = manager.validateCredentials(req.body.credentials);
      res.json(result);
    },

    // Refresh credentials for ongoing calls
    refreshCredentials: (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const newCredentials = manager.refreshCredentials(userId, req.body.credentials);
        const iceServers = manager.getIceServers(newCredentials);

        res.json({
          iceServers,
          credentials: newCredentials
        });
      } catch (err) {
        console.error('Error refreshing credentials:', err);
        res.status(500).json({ error: 'Failed to refresh credentials' });
      }
    },

    // Get server statistics
    getStats: async (req, res) => {
      try {
        const stats = await manager.getServerStats();
        res.json(stats);
      } catch (err) {
        console.error('Error getting stats:', err);
        res.status(500).json({ error: 'Failed to get stats' });
      }
    },

    // Get usage report
    getUsageReport: async (req, res) => {
      try {
        const report = await manager.getUsageReport(req.query.timeWindow || '24h');
        res.json(report);
      } catch (err) {
        console.error('Error getting usage report:', err);
        res.status(500).json({ error: 'Failed to get usage report' });
      }
    },

    // Initialize database schema
    initializeSchema: async (req, res) => {
      try {
        const result = await manager.createSchema();
        res.json({ initialized: result });
      } catch (err) {
        console.error('Error initializing schema:', err);
        res.status(500).json({ error: 'Failed to initialize schema' });
      }
    },

    // Cleanup expired credentials
    cleanupExpired: async (req, res) => {
      try {
        const count = await manager.cleanupExpiredCredentials();
        res.json({ deleted: count });
      } catch (err) {
        console.error('Error cleaning up:', err);
        res.status(500).json({ error: 'Failed to cleanup' });
      }
    },

    manager
  };
}

module.exports = {
  TURNCredentialManager,
  createTURNMiddleware
};
