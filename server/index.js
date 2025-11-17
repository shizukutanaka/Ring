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

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email || null]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'user already exists' });
    }

    // Hash password with bcrypt
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      'INSERT INTO users(username, email, password_hash, role, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING id, username, email, role',
      [username, email || null, password_hash, 'user']
    );

    const user = result.rows[0];

    // Issue JWT
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'internal server error' });
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

    // Query user from DB
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const user = result.rows[0];

    // Verify password using bcrypt (secure comparison)
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      recordLoginAttempt(username, false);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Clear login attempts on successful auth
    recordLoginAttempt(username, true);

    // Issue JWT
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Telemetry Collection Endpoint
app.post('/api/collect', async (req, res) => {
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

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api/*`);
});

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
