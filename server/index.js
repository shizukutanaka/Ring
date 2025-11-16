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

// Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/webrtc_recorder'
});

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });
const connectedClients = new Map();

console.log(`WebSocket server listening on port ${WS_PORT}`);

// ============= API ENDPOINTS =============

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    // Query user from DB
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const user = result.rows[0];

    // Verify password (simplified for PoC; use bcrypt in production)
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Issue JWT
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
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
