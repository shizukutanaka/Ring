require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Rate limiting for login attempts
const loginAttempts = new Map();
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/webrtc_recorder'
});

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });
const connectedClients = new Map();

console.log(`WebSocket server listening on port ${WS_PORT}`);

// ============= API ENDPOINTS =============

// Rate limiting helper
function checkLoginAttempts(username) {
  const now = Date.now();
  const attempts = loginAttempts.get(username) || { count: 0, lastAttempt: 0, lockedUntil: 0 };

  // Check if account is locked
  if (attempts.lockedUntil > now) {
    return {
      allowed: false,
      reason: 'account_locked',
      remainingTime: Math.ceil((attempts.lockedUntil - now) / 1000)
    };
  }

  // Reset if lockout period has passed
  if (attempts.count > 0 && (now - attempts.lastAttempt) > LOCKOUT_DURATION) {
    loginAttempts.delete(username);
    return { allowed: true };
  }

  // Check attempt threshold
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
    loginAttempts.set(username, attempts);
    return {
      allowed: false,
      reason: 'max_attempts_exceeded',
      remainingTime: Math.ceil(LOCKOUT_DURATION / 1000)
    };
  }

  return { allowed: true };
}

function recordLoginAttempt(username, success) {
  const now = Date.now();
  if (success) {
    loginAttempts.delete(username);
  } else {
    const attempts = loginAttempts.get(username) || { count: 0, lastAttempt: 0, lockedUntil: 0 };
    attempts.count += 1;
    attempts.lastAttempt = now;
    loginAttempts.set(username, attempts);
  }
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize AuthService
const AuthService = require('./services/AuthService');
const authService = new AuthService(pool, JWT_SECRET);

// Ensure AuthService is initialized
authService.initialize().catch(console.error);

// Registration Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    if (password.length < 12) {
      return res.status(400).json({ error: 'password must be at least 12 characters' });
    }

    const result = await authService.register(username, password, email);
    res.status(201).json(result);
  } catch (err) {
    console.error('Registration error:', err);
    if (err.message.includes('already exists')) {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    // Check rate limiting
    const rateLimit = checkLoginAttempts(username);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: rateLimit.reason,
        remainingTime: rateLimit.remainingTime
      });
    }

    try {
      const result = await authService.login(username, password);
      recordLoginAttempt(username, true);
      res.json(result);
    } catch (authError) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh Token Endpoint
app.post('/api/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// RBAC Middleware
const { checkPermission } = require('./middleware/rbac');
const { PERMISSIONS } = require('./config/permissions');

// JWT Authentication Middleware (Extracting from existing logic if needed, or assuming it's applied globally or per route)
// For this demo, we'll assume a middleware populates req.user from the token.
// Let's create a simple authenticateToken middleware inline or import it if it existed.
// Since index.js didn't have a global auth middleware, I'll add one here.

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Telemetry Collection Endpoint (Protected)
app.post('/api/collect', authenticateToken, checkPermission(PERMISSIONS.SYSTEM_STATS), async (req, res) => {
  try {
    const events = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'payload must be array of events' });
    }

    // Insert events to DB
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO telemetry(event_type, ts, region_code, app_version, os, anon_user_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const event of events) {
        await client.query(insertQuery, [
          event.event || 'unknown',
          new Date(event.ts || Date.now()),
          event.region_code || null,
          event.app_version || null,
          event.os || null,
          event.anon_user_hash || null
        ]);
      }

      await client.query('COMMIT');
      res.json({ received: events.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Collection error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Legal DB Endpoints
app.get('/api/legaldb/latest', (req, res) => {
  const legaldb = require('./legaldb/expanded_legaldb.json');
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(JSON.stringify(legaldb)).digest('hex');
  res.json({
    version: legaldb.version,
    updated: legaldb.updated,
    hash,
    supported_countries: Object.keys(legaldb.countries || {}).length
  });
});

app.get('/api/legaldb/lookup', (req, res) => {
  try {
    const { country_code, state_code } = req.query;

    if (!country_code) {
      return res.status(400).json({ error: 'country_code required' });
    }

    const legaldb = require('./legaldb/expanded_legaldb.json');
    const countries = legaldb.countries || {};

    // Try state-level lookup first
    let rule = null;
    if (state_code) {
      const stateKey = `${country_code}-${state_code}`;
      rule = countries[stateKey];
    }

    // Fall back to country-level
    if (!rule) {
      rule = countries[country_code];
    }

    if (!rule) {
      return res.json({ type: 'unknown', note: 'Country/state not found in database' });
    }

    res.json(rule);
  } catch (err) {
    console.error('Legal DB lookup error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ============= HTTPS / mTLS SETUP =============
const https = require('https');
const fs = require('fs');
const path = require('path');

const IS_MTLS_ENABLED = process.env.MTLS_ENABLED === 'true';

if (IS_MTLS_ENABLED) {
  try {
    const options = {
      key: fs.readFileSync(path.join(__dirname, 'certs', 'server-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs', 'server-cert.pem')),
      ca: fs.readFileSync(path.join(__dirname, 'certs', 'ca-cert.pem')),
      requestCert: true,
      rejectUnauthorized: true // Enforce mTLS
    };

    https.createServer(options, app).listen(PORT, () => {
      console.log(`HTTPS/mTLS server listening on port ${PORT}`);
      console.log(`Health check: https://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start mTLS server:', error.message);
    console.log('Falling back to HTTP...');
    app.listen(PORT, () => {
      console.log(`HTTP server listening on port ${PORT}`);
    });
  }
} else {
  app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API: http://localhost:${PORT}/api/*`);
  });
}


// ============= WEBSOCKET HANDLERS =============

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  const clientId = Math.random().toString(36).substr(2, 9);
  connectedClients.set(clientId, ws);

  // Send initial aggregated data
  (async () => {
    try {
      const result = await pool.query(
        `SELECT event_type, COUNT(*) as count FROM telemetry
         WHERE ts > NOW() - INTERVAL '24 hours'
         GROUP BY event_type LIMIT 10`
      );
      ws.send(JSON.stringify({
        type: 'init',
        data: result.rows
      }));
    } catch (err) {
      console.error('Init data error:', err);
    }
  })();

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      console.log('WS message:', msg);

      // Broadcast to all connected clients
      broadcastEvent({
        type: 'update',
        data: msg,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(clientId);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function broadcastEvent(event) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  wss.close();
  process.exit(0);
});
