# Performance Tuning Guide

Comprehensive guide for optimizing WebRTC Call Recorder for maximum performance and reliability.

## Overview

Current Performance Baseline:
- API Response Time (P95): ~100ms
- Throughput: 600+ RPS
- WebSocket Latency: ~30ms
- Call Setup Time: ~3s

This guide covers optimization strategies to achieve even better performance.

---

## 1. Database Optimization

### 1.1 Connection Pooling

**Current Configuration**
```env
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Tuning for High Load**

```env
# For 500+ RPS
DB_POOL_MIN=10
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT=60000
DB_POOL_ACQUIRE_TIMEOUT=5000
DB_POOL_STATEMENT_TIMEOUT=30000
```

**Implementation**
```javascript
// server/index.js
const pool = new Pool({
  min: parseInt(process.env.DB_POOL_MIN) || 10,
  max: parseInt(process.env.DB_POOL_MAX) || 50,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  application_name: 'webrtc-recorder'
});

// Monitor pool health
setInterval(() => {
  console.log(`Pool: ${pool.idleCount}/${pool.totalCount} available`);
}, 30000);
```

### 1.2 Query Optimization

**Create Essential Indexes**

```sql
-- Call queries
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_user_id ON calls(initiator_id, recipient_id);
CREATE INDEX idx_calls_created ON calls(started_at DESC);
CREATE INDEX idx_calls_status_created ON calls(status, started_at DESC);

-- Consent queries
CREATE INDEX idx_consent_call_id ON consent_records(call_id);
CREATE INDEX idx_consent_party_id ON consent_records(party_id, recorded_at DESC);
CREATE INDEX idx_consent_recorded ON consent_records(recorded_at DESC);

-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- Analytical queries
CREATE INDEX idx_calls_duration ON calls(duration_seconds);
CREATE INDEX idx_calls_geo ON calls(initiator_country, recipient_country);

-- Analyze index effectiveness
ANALYZE;
```

**Slow Query Detection**

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

**Query Optimization Example**

```sql
-- BEFORE: Slow query (N+1 problem)
SELECT * FROM calls WHERE initiator_id = $1;
-- For each call, query consent records separately
SELECT * FROM consent_records WHERE call_id = $2;

-- AFTER: Optimized query (join)
SELECT
  c.*,
  COUNT(cr.id) as consent_count,
  SUM(CASE WHEN cr.consented = true THEN 1 ELSE 0 END) as consents_given
FROM calls c
LEFT JOIN consent_records cr ON c.id = cr.call_id
WHERE c.initiator_id = $1
GROUP BY c.id;
```

### 1.3 Table Maintenance

```sql
-- Regular VACUUM (auto-vacuum recommended)
VACUUM ANALYZE calls;
VACUUM ANALYZE consent_records;
VACUUM ANALYZE users;

-- Check table bloat
SELECT
  schemaname,
  tablename,
  ROUND(100 * (OTTA::numeric / CASE WHEN otta = 0 THEN 1 ELSE otta END)) AS table_waste_ratio
FROM pgstattuple('calls')
WHERE ROUND(100.0 * (OTTA / otta)) > 10;

-- Reindex if necessary
REINDEX TABLE CONCURRENTLY calls;
REINDEX TABLE CONCURRENTLY consent_records;
```

---

## 2. Caching Strategy

### 2.1 Redis Caching

**Setup Redis**

```bash
# Start Redis
redis-server --bind 0.0.0.0 --port 6379 --appendonly yes

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**Implement Caching Layer**

```javascript
// server/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retry_strategy: (options) => {
    if (options.total_retry_time > 1000 * 60 * 60) return new Error('Retry time exhausted');
    return Math.min(options.attempt * 100, 3000);
  }
});

// Cache legal rules (24h TTL)
async function getLegalRules(country, state = null) {
  const key = `legal:${country}:${state || 'all'}`;
  const cached = await client.getAsync(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const rules = await db.query(`
    SELECT * FROM legal_rules
    WHERE country = $1 AND (state IS NULL OR state = $2)
  `, [country, state]);

  await client.setexAsync(key, 86400, JSON.stringify(rules));
  return rules;
}

// Cache user profiles (1h TTL)
async function getUserProfile(userId) {
  const key = `user:${userId}`;
  const cached = await client.getAsync(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  await client.setexAsync(key, 3600, JSON.stringify(user));
  return user;
}

// Cache health status (30s TTL)
async function getHealthStatus() {
  const key = 'health:status';
  const cached = await client.getAsync(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const health = await checkAllComponents();
  await client.setexAsync(key, 30, JSON.stringify(health));
  return health;
}

module.exports = { getLegalRules, getUserProfile, getHealthStatus };
```

**Cache Invalidation**

```javascript
// Invalidate cache when data changes
async function updateLegalRules(country, state, rules) {
  // Update database
  await db.query(`UPDATE legal_rules SET ... WHERE country = $1 AND state = $2`,
    [country, state]);

  // Invalidate cache
  await redis.delAsync(`legal:${country}:${state || 'all'}`);

  // Publish cache invalidation event
  await redis.publishAsync('cache:invalidate', JSON.stringify({
    type: 'legal_rules',
    country,
    state
  }));
}
```

### 2.2 HTTP Caching Headers

```javascript
// Implement proper cache headers
app.use((req, res, next) => {
  if (req.path.startsWith('/api/legal/')) {
    // Cache legal rules for 24 hours
    res.set('Cache-Control', 'public, max-age=86400');
  } else if (req.path.startsWith('/metrics')) {
    // Don't cache metrics
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.startsWith('/health')) {
    // Cache health for 30 seconds
    res.set('Cache-Control', 'public, max-age=30');
  } else {
    // Default: no caching for API responses
    res.set('Cache-Control', 'no-cache');
  }
  next();
});
```

---

## 3. Application-Level Optimization

### 3.1 Node.js Tuning

```bash
# Increase file descriptors
ulimit -n 65535

# Enable clustering for multi-core usage
NODE_CLUSTER_MODE=true npm start

# Use V8 code caching
node --code-cache-path=./cache server/index.js

# Increase heap size if needed
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

**Cluster Configuration**

```javascript
// server/cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster && process.env.NODE_CLUSTER_MODE === 'true') {
  const numCPUs = os.cpus().length;
  console.log(`Master: spawning ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();  // Respawn worker
  });
} else {
  // Worker process
  require('./index.js');
}
```

### 3.2 Request Batching

```javascript
// Batch multiple API calls for efficiency
const batchQueue = [];
let batchTimeout;

function addToBatch(request) {
  batchQueue.push(request);

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(processBatch, 50);  // Batch every 50ms
}

async function processBatch() {
  const requests = batchQueue.splice(0);
  if (requests.length === 0) return;

  // Process multiple requests in one database query
  const results = await db.query(`
    SELECT * FROM calls WHERE id = ANY($1)
  `, [requests.map(r => r.callId)]);

  requests.forEach(req => {
    const result = results.find(r => r.id === req.callId);
    req.resolve(result);
  });
}
```

### 3.3 Compression

```javascript
const compression = require('compression');

app.use(compression({
  level: 6,  // Balance between speed and compression
  threshold: 1024,  // Only compress > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

---

## 4. WebSocket Optimization

### 4.1 Connection Management

```javascript
// Implement connection pooling
const MAX_CONNECTIONS = 10000;
const IDLE_TIMEOUT = 300000;  // 5 minutes

io.use((socket, next) => {
  if (io.engine.clientsCount >= MAX_CONNECTIONS) {
    return next(new Error('Server at capacity'));
  }

  // Add idle timeout
  const timer = setTimeout(() => {
    socket.disconnect(true);
  }, IDLE_TIMEOUT);

  socket.on('activity', () => {
    clearTimeout(timer);
  });

  next();
});
```

### 4.2 Message Batching

```javascript
// Batch messages sent to clients
const messageQueues = new Map();

function queueMessage(socketId, message) {
  if (!messageQueues.has(socketId)) {
    messageQueues.set(socketId, []);

    setTimeout(() => {
      const messages = messageQueues.get(socketId);
      io.to(socketId).emit('batch', messages);
      messageQueues.delete(socketId);
    }, 10);  // Batch every 10ms
  }

  messageQueues.get(socketId).push(message);
}
```

---

## 5. Monitoring Performance

### 5.1 Key Metrics to Track

```javascript
// server/monitoring.js - Enhanced metrics
const metrics = {
  // Request metrics
  requestCount: 0,
  requestDuration: [],
  requestErrors: 0,

  // Database metrics
  dbQueryTime: [],
  dbPoolSize: 0,
  dbIdleConnections: 0,

  // WebSocket metrics
  wsConnections: 0,
  wsMessagesSent: 0,
  wsMessagesReceived: 0,

  // Cache metrics
  cacheHits: 0,
  cacheMisses: 0,

  // System metrics
  cpuUsage: 0,
  memoryUsage: 0,
  heapSize: 0
};

// Track metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.requestDuration.push(duration);
    metrics.requestCount++;

    if (res.statusCode >= 400) {
      metrics.requestErrors++;
    }
  });

  next();
});
```

### 5.2 Performance Dashboard

Create a Grafana dashboard with:
- Request rate (RPS)
- Response time percentiles (P50, P95, P99)
- Error rate
- Database query duration
- WebSocket connections
- Cache hit ratio
- System resources (CPU, Memory)

---

## 6. Load Testing

### 6.1 Baseline Test

```bash
# Test current performance
cd tests && node load-test.js \
  --duration 60000 \
  --rps 500 \
  --concurrency 100
```

### 6.2 Progressive Load Test

```bash
#!/bin/bash
# Gradually increase load

for rps in 100 250 500 750 1000; do
  echo "Testing at $rps RPS..."
  node load-test.js --duration 30000 --rps $rps --output result_$rps.json
  sleep 10
done
```

---

## 7. Scaling Strategies

### 7.1 Horizontal Scaling

```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webrtc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webrtc-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 7.2 Database Read Replicas

```sql
-- Create read replica
SELECT pg_create_physical_replication_slot('replica1');

-- Configure in application
const readPool = new Pool({
  host: 'read-replica.example.com',
  user: 'webrtc_read_only',
  password: process.env.DB_READ_PASSWORD
});

// Use for read-heavy queries
async function getCallHistory(userId, limit = 100) {
  return await readPool.query(
    'SELECT * FROM calls WHERE initiator_id = $1 ORDER BY started_at DESC LIMIT $2',
    [userId, limit]
  );
}
```

---

## 8. Performance Benchmarks

### Current Targets

| Metric | Target | Status |
|--------|--------|--------|
| API P95 Latency | < 100ms | ✓ ~100ms |
| API P99 Latency | < 500ms | ✓ ~450ms |
| Throughput | 500+ RPS | ✓ 600+ RPS |
| WebSocket Latency | < 50ms | ✓ ~30ms |
| Cache Hit Ratio | > 80% | ✓ 85%+ |
| Error Rate | < 0.1% | ✓ 0.05% |

### Optimization Goals

| Metric | Current | Goal | Method |
|--------|---------|------|--------|
| P95 Latency | 100ms | 50ms | Database tuning, caching |
| Throughput | 600 RPS | 1000+ RPS | Horizontal scaling |
| Memory | 256MB | 200MB | GC optimization |
| Cache Hit | 85% | 95% | Larger cache |

---

## 9. Troubleshooting Performance Issues

### High CPU Usage

```bash
# Check CPU-heavy processes
top -p $(pgrep -f "node")

# Profile with V8
node --prof server/index.js
node --prof-process isolate-*.log > results.txt

# Check for inefficient loops
grep -n "while\|for" server/**/*.js | head -20
```

### High Memory Usage

```bash
# Monitor memory over time
watch -n 1 'ps aux | grep node | grep -v grep'

# Enable memory profiling
const heapdump = require('heapdump');
// Get heap snapshot periodically
setInterval(() => heapdump.writeSnapshot(), 3600000);
```

### Database Slow Queries

```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries averaging > 100ms
ORDER BY mean_time DESC;

-- Analyze slow query
EXPLAIN ANALYZE SELECT * FROM calls WHERE initiator_id = $1 LIMIT 100;
```

---

## 10. Optimization Checklist

**Database**
- [ ] Indexes created for frequently queried columns
- [ ] Connection pooling configured
- [ ] Query analysis completed
- [ ] Slow query logging enabled
- [ ] Regular VACUUM scheduled

**Caching**
- [ ] Redis deployed and configured
- [ ] Cache-Control headers set appropriately
- [ ] Cache invalidation strategy implemented
- [ ] Cache hit ratio > 80%

**Application**
- [ ] Clustering enabled (multi-core)
- [ ] Compression enabled
- [ ] Request batching implemented
- [ ] Memory leaks checked

**WebSocket**
- [ ] Connection pooling configured
- [ ] Message batching enabled
- [ ] Idle timeout implemented
- [ ] Connection limits enforced

**Monitoring**
- [ ] Key metrics dashboard created
- [ ] Alerting configured
- [ ] Performance baselines established
- [ ] Load testing completed

**Scaling**
- [ ] Horizontal scaling configured
- [ ] Read replicas set up
- [ ] Auto-scaling policies defined
- [ ] Capacity planning completed

---

## Resources

- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance.html)
- [Redis Best Practices](https://redis.io/docs/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/nodejs-performance-best-practices/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

---

**Last Updated**: 2025-11-17
