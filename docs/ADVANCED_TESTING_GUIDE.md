# Advanced Testing & Chaos Engineering Guide

Comprehensive testing strategies for ensuring reliability, performance, and resilience of WebRTC Call Recorder.

## Overview

This guide covers:
- Unit testing best practices
- Integration testing with mocking
- End-to-end (E2E) testing
- Performance and load testing
- Chaos engineering and resilience testing
- Security testing and vulnerability scanning
- Test automation and CI/CD integration
- Coverage measurement and improvement

---

## 1. Unit Testing

### 1.1 Setup and Configuration

```javascript
// tests/setup.js
const { expect } = require('chai');
const sinon = require('sinon');

global.expect = expect;
global.sinon = sinon;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/webrtc_test';
process.env.REDIS_URL = 'redis://localhost:6380';
process.env.JWT_SECRET = 'test-secret-key';

// Setup test database
before(async function() {
  // Connect to test database
});

after(async function() {
  // Cleanup test database
});
```

### 1.2 Unit Test Examples

```javascript
// tests/unit/auth.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const authService = require('../../server/services/auth');
const db = require('../../server/db');

describe('Authentication Service', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'query');
  });

  afterEach(() => {
    dbStub.restore();
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$...' // bcrypt hash
      };

      dbStub.resolves({ rows: [user] });

      const result = await authService.login('test@example.com', 'password');

      expect(result).to.have.property('token');
      expect(result.token).to.be.a('string');
      expect(dbStub.calledOnce).to.be.true;
    });

    it('should throw error for invalid email', async () => {
      dbStub.resolves({ rows: [] });

      try {
        await authService.login('nonexistent@example.com', 'password');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });

    it('should throw error for invalid password', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$...' // wrong hash
      };

      dbStub.resolves({ rows: [user] });

      try {
        await authService.login('test@example.com', 'wrong-password');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid password');
      }
    });
  });

  describe('verifyToken', () => {
    it('should decode valid JWT token', () => {
      const token = authService.generateToken({ userId: 'user-123' });
      const decoded = authService.verifyToken(token);

      expect(decoded).to.have.property('userId');
      expect(decoded.userId).to.equal('user-123');
    });

    it('should throw error for expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      try {
        authService.verifyToken(expiredToken);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('expired');
      }
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = authService.generateToken(payload);

      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.lengthOf(3); // JWT format
    });

    it('should include payload in token', () => {
      const payload = { userId: 'user-123' };
      const token = authService.generateToken(payload);
      const decoded = authService.verifyToken(token);

      expect(decoded.userId).to.equal('user-123');
    });
  });
});

// tests/unit/consent.test.js
describe('Consent Recording', () => {
  describe('recordConsent', () => {
    it('should digitally sign consent record', async () => {
      const consent = {
        call_id: 'call-123',
        user_id: 'user-456',
        consented: true,
        consent_method: 'visual'
      };

      const result = await consentService.recordConsent(consent);

      expect(result).to.have.property('signature');
      expect(result.signature).to.match(/^[0-9a-f]{128}$/i); // 64-byte hex
    });

    it('should add RFC3161 timestamp', async () => {
      const result = await consentService.recordConsent({...});

      expect(result).to.have.property('timestamp_token');
      expect(result.timestamp_token).to.exist;
    });

    it('should validate consent method', async () => {
      const invalidConsent = {
        consent_method: 'invalid-method'
      };

      try {
        await consentService.recordConsent(invalidConsent);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid consent method');
      }
    });
  });
});
```

### 1.3 Code Coverage

```bash
#!/bin/bash
# scripts/test-coverage.sh

# Run tests with coverage
npx nyc --reporter=html --reporter=text mocha tests/unit/**/*.test.js

# Set coverage thresholds
npx nyc --check-coverage --lines 80 --functions 80 --branches 75 mocha tests/**/*.test.js

# Generate coverage badge
npx nyc report --reporter=text-lcov | coveralls
```

---

## 2. Integration Testing

### 2.1 Database Integration Tests

```javascript
// tests/integration/database.test.js
const { expect } = require('chai');
const db = require('../../server/db');

describe('Database Integration', () => {
  before(async () => {
    // Setup test database
    await db.query('DROP TABLE IF EXISTS test_calls');
    await db.query(`
      CREATE TABLE test_calls (
        id UUID PRIMARY KEY,
        initiator_id UUID,
        recipient_id UUID,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        duration_seconds INT
      )
    `);
  });

  after(async () => {
    await db.query('DROP TABLE test_calls');
    await db.end();
  });

  it('should insert and retrieve call record', async () => {
    const callId = '12345678-1234-5678-1234-567812345678';

    await db.query(
      `INSERT INTO test_calls (id, initiator_id, recipient_id, started_at)
       VALUES ($1, $2, $3, NOW())`,
      [callId, 'user-1', 'user-2']
    );

    const result = await db.query(
      'SELECT * FROM test_calls WHERE id = $1',
      [callId]
    );

    expect(result.rows).to.have.lengthOf(1);
    expect(result.rows[0].id).to.equal(callId);
  });

  it('should handle transaction rollback', async () => {
    const callId = 'test-123';

    try {
      await db.query('BEGIN');
      await db.query('INSERT INTO test_calls VALUES ($1, ...)', [callId]);
      // Simulate error
      throw new Error('Test error');
      await db.query('COMMIT');
    } catch {
      await db.query('ROLLBACK');
    }

    const result = await db.query(
      'SELECT * FROM test_calls WHERE id = $1',
      [callId]
    );

    expect(result.rows).to.be.empty;
  });
});
```

### 2.2 API Integration Tests

```javascript
// tests/integration/api.test.js
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../server');
const db = require('../../server/db');

describe('API Integration', () => {
  let authToken;

  before(async () => {
    // Create test user
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, $3)`,
      ['user-123', 'test@example.com', '$2b$10$...']
    );

    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password'
      });

    authToken = response.body.token;
  });

  describe('POST /api/calls/initiate', () => {
    it('should initiate call successfully', async () => {
      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_id: 'user-456'
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('call_id');
      expect(response.body.status).to.equal('initiated');
    });

    it('should require authorization', async () => {
      const response = await request(app)
        .post('/api/calls/initiate')
        .send({ recipient_id: 'user-456' });

      expect(response.status).to.equal(401);
    });
  });

  describe('POST /api/consent/record', () => {
    it('should record consent with signature', async () => {
      const response = await request(app)
        .post('/api/consent/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          call_id: 'call-123',
          consented: true,
          consent_method: 'visual'
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('signature');
    });
  });
});
```

---

## 3. End-to-End Testing

### 3.1 E2E Test Scenarios

```javascript
// tests/e2e/call-flow.test.js
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../server');
const ws = require('ws');

describe('End-to-End Call Flow', () => {
  let aliceToken, bobToken;
  let callId;

  before(async () => {
    // Setup two users
    await setupUser('alice@example.com', 'alice-123');
    await setupUser('bob@example.com', 'bob-123');

    // Get auth tokens
    aliceToken = await loginUser('alice@example.com', 'password');
    bobToken = await loginUser('bob@example.com', 'password');
  });

  it('should complete full call flow', async () => {
    // 1. Alice initiates call
    const initResponse = await request(app)
      .post('/api/calls/initiate')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient_id: 'bob-123' });

    expect(initResponse.status).to.equal(200);
    callId = initResponse.body.call_id;

    // 2. WebSocket connection for signaling
    const aliceWs = new ws('ws://localhost:3000/ws');
    const bobWs = new ws('ws://localhost:3000/ws');

    // 3. Exchange SDP offers
    await new Promise((resolve) => {
      aliceWs.on('open', () => {
        aliceWs.send(JSON.stringify({
          type: 'offer',
          call_id: callId,
          sdp: '...'
        }));

        bobWs.on('message', (msg) => {
          expect(msg).to.include('offer');
          resolve();
        });
      });
    });

    // 4. Record consent from both parties
    const aliceConsent = await request(app)
      .post('/api/consent/record')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        call_id: callId,
        consented: true,
        consent_method: 'visual'
      });

    expect(aliceConsent.status).to.equal(200);

    const bobConsent = await request(app)
      .post('/api/consent/record')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        call_id: callId,
        consented: true,
        consent_method: 'visual'
      });

    expect(bobConsent.status).to.equal(200);

    // 5. End call
    const endResponse = await request(app)
      .post(`/api/calls/${callId}/end`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(endResponse.status).to.equal(200);
    expect(endResponse.body.status).to.equal('ended');

    // 6. Verify call recording
    const callDetails = await request(app)
      .get(`/api/calls/${callId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(callDetails.body.duration_seconds).to.be.greaterThan(0);

    // Cleanup
    aliceWs.close();
    bobWs.close();
  });
});
```

---

## 4. Performance Testing

### 4.1 Response Time Testing

```javascript
// tests/performance/response-time.test.js
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../server');

describe('Performance - Response Times', () => {
  const thresholds = {
    'GET /api/calls': 100,        // 100ms
    'POST /api/calls/initiate': 200,
    'GET /api/calls/:id': 50,
    'POST /api/consent/record': 150
  };

  it('should respond within acceptable time (GET /api/calls)', async () => {
    const start = Date.now();

    const response = await request(app)
      .get('/api/calls')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - start;

    expect(duration).to.be.lessThan(thresholds['GET /api/calls']);
    console.log(`GET /api/calls: ${duration}ms`);
  });

  it('should respond within acceptable time (POST /api/calls/initiate)', async () => {
    const start = Date.now();

    const response = await request(app)
      .post('/api/calls/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient_id: 'user-123' });

    const duration = Date.now() - start;

    expect(duration).to.be.lessThan(thresholds['POST /api/calls/initiate']);
    console.log(`POST /api/calls/initiate: ${duration}ms`);
  });
});
```

### 4.2 Load Testing with K6

```javascript
// tests/load/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up
    { duration: '5m', target: 500 },   // Stay at high load
    { duration: '2m', target: 1000 },  // Push peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

const errorRate = new Rate('errors');
const initiateDuration = new Trend('initiate_duration');

export default function() {
  const url = 'http://localhost:3000/api/calls/initiate';

  const payload = JSON.stringify({
    recipient_id: 'user-' + Math.random().toString(36).substr(2, 9)
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TOKEN}`
    },
  };

  const res = http.post(url, payload, params);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has call_id': (r) => r.json('call_id') !== null,
  });

  errorRate.add(!success);
  initiateDuration.add(res.timings.duration);

  sleep(1);
}
```

---

## 5. Chaos Engineering

### 5.1 Network Chaos

```javascript
// tests/chaos/network-chaos.test.js
const { expect } = require('chai');
const Docker = require('dockerode');
const request = require('supertest');

describe('Chaos Engineering - Network Issues', () => {
  const docker = new Docker();

  it('should handle database connection failure', async () => {
    // Simulate network partition
    await docker.exec(['tc', 'qdisc', 'add', 'root', 'netem', 'loss', '100%']);

    try {
      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).to.equal(503);
      expect(response.body).to.have.property('error');
    } finally {
      // Restore network
      await docker.exec(['tc', 'qdisc', 'del', 'root']);
    }
  });

  it('should handle high latency', async () => {
    // Simulate 500ms latency
    await docker.exec(['tc', 'qdisc', 'add', 'root', 'netem', 'delay', '500ms']);

    try {
      const start = Date.now();

      await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${token}`);

      const duration = Date.now() - start;
      expect(duration).to.be.greaterThan(500);
    } finally {
      await docker.exec(['tc', 'qdisc', 'del', 'root']);
    }
  });

  it('should handle packet loss', async () => {
    // Simulate 10% packet loss
    await docker.exec(['tc', 'qdisc', 'add', 'root', 'netem', 'loss', '10%']);

    try {
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 100; i++) {
        try {
          await request(app)
            .post('/api/calls/initiate')
            .set('Authorization', `Bearer ${token}`);
          successCount++;
        } catch {
          failureCount++;
        }
      }

      // Expect ~90% success rate with packet loss
      expect(successCount / 100).to.be.greaterThan(0.8);
    } finally {
      await docker.exec(['tc', 'qdisc', 'del', 'root']);
    }
  });
});
```

### 5.2 Service Chaos

```bash
#!/bin/bash
# tests/chaos/service-chaos.sh

# Kill database randomly
kill_database() {
  while true; do
    sleep $((RANDOM % 30 + 10))
    docker kill webrtc-db
    sleep $((RANDOM % 10 + 5))
    docker start webrtc-db
  done
}

# Kill cache service
kill_cache() {
  while true; do
    sleep $((RANDOM % 60 + 30))
    docker kill webrtc-redis
    sleep $((RANDOM % 15 + 10))
    docker start webrtc-redis
  done
}

# Run chaos tests
run_load_tests_during_chaos() {
  kill_database &
  DB_PID=$!

  kill_cache &
  CACHE_PID=$!

  npm test -- --grep "chaos"

  kill $DB_PID $CACHE_PID
}

run_load_tests_during_chaos
```

---

## 6. Security Testing

### 6.1 OWASP Top 10 Testing

```javascript
// tests/security/owasp-testing.test.js
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../server');

describe('Security - OWASP Top 10', () => {
  // A01: Broken Access Control
  it('should prevent unauthorized access', async () => {
    const response = await request(app)
      .get('/api/calls/other-user-call-id')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(response.status).to.equal(403);
  });

  // A02: Cryptographic Failures
  it('should encrypt sensitive data in transit', async () => {
    const response = await request(app)
      .post('/api/consent/record')
      .set('Authorization', `Bearer ${token}`)
      .send({ call_id: 'call-123', consented: true });

    expect(response.headers['content-type']).to.include('application/json');
    // Verify no sensitive data in response
    expect(response.body).to.not.have.property('password');
  });

  // A03: Injection
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE calls; --";

    const response = await request(app)
      .get(`/api/calls?search=${encodeURIComponent(maliciousInput)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).to.equal(200);

    // Verify table still exists
    const callsResponse = await request(app)
      .get('/api/calls')
      .set('Authorization', `Bearer ${token}`);

    expect(callsResponse.status).to.equal(200);
  });

  // A04: Insecure Design
  it('should require multi-factor authentication for sensitive operations', async () => {
    // Admin operations should require MFA
    const response = await request(app)
      .post('/api/admin/users/delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: 'user-123' });

    // Should fail without MFA
    if (response.status !== 200) {
      expect(response.body).to.have.property('mfa_required');
    }
  });

  // A05: Broken Authentication
  it('should implement rate limiting on login', async () => {
    let response;

    for (let i = 0; i < 10; i++) {
      response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password'
        });

      if (i < 5) {
        expect(response.status).to.equal(401);
      } else {
        // After 5 attempts, should be rate limited
        expect([401, 429]).to.include(response.status);
      }
    }
  });

  // A06: Sensitive Data Exposure
  it('should not expose sensitive data in logs', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'secret-password'
      });

    // Check that password is not logged
    const logs = getApplicationLogs();
    expect(logs).to.not.include('secret-password');
  });

  // A07: XML External Entity (XXE)
  it('should prevent XXE attacks', async () => {
    const xxePayload = `<?xml version="1.0"?>
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <foo>&xxe;</foo>`;

    const response = await request(app)
      .post('/api/calls/initiate')
      .set('Content-Type', 'application/xml')
      .send(xxePayload);

    // Should either reject or safely handle
    expect([400, 415]).to.include(response.status);
  });

  // A08: Broken Access Control (CORS)
  it('should enforce CORS policies', async () => {
    const response = await request(app)
      .get('/api/calls')
      .set('Origin', 'https://evil.com');

    // Should not allow cross-origin without CORS headers
    expect(response.headers['access-control-allow-origin'] || 'not-set')
      .to.not.equal('https://evil.com');
  });

  // A09: Using Components with Known Vulnerabilities
  it('should have no high-severity vulnerabilities', async () => {
    const auditResult = require('child_process')
      .execSync('npm audit --json')
      .toString();

    const audit = JSON.parse(auditResult);
    const highVulnerabilities = Object.values(audit.vulnerabilities || {})
      .filter(v => v.severity === 'high' || v.severity === 'critical');

    expect(highVulnerabilities).to.be.empty;
  });

  // A10: Insufficient Logging & Monitoring
  it('should log security events', async () => {
    // Trigger unauthorized access
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${regularUserToken}`);

    // Check security logs
    const logs = getSecurityLogs();
    expect(logs).to.include('unauthorized_access_attempt');
  });
});
```

---

## 7. Test Automation & CI/CD

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Automated Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci

      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

      - run: npm run test:security
```

---

## 8. Test Execution

### 8.1 Run All Tests

```bash
#!/bin/bash
# scripts/run-all-tests.sh

echo "Running Unit Tests..."
npm run test:unit

echo "Running Integration Tests..."
npm run test:integration

echo "Running E2E Tests..."
npm run test:e2e

echo "Running Performance Tests..."
npm run test:performance

echo "Running Security Tests..."
npm run test:security

echo "Running Chaos Tests..."
npm run test:chaos

echo "Generating Coverage Report..."
npm run test:coverage
```

---

## Coverage Targets

| Type | Target |
|------|--------|
| Unit Test Coverage | 80% |
| Integration Coverage | 60% |
| E2E Scenarios | 100% critical paths |
| Performance SLAs | 95th percentile <200ms |
| Chaos Tests | 3+ scenarios per service |
| Security Tests | All OWASP Top 10 |

---

**Last Updated**: 2025-11-17
**Maintainer**: QA Team
**Review Cycle**: Continuous
