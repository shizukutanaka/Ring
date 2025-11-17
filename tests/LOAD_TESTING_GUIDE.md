# Load Testing Guide

Comprehensive guide for running load tests, stress tests, and soak tests on WebRTC Call Recorder.

## Overview

This guide covers:
- Load testing setup and prerequisites
- Running different test scenarios
- Interpreting test results
- Performance baselines and targets
- Capacity planning based on test results
- Troubleshooting performance issues
- CI/CD integration for continuous testing

---

## 1. Prerequisites

### Install K6

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
apt-get install k6

# Windows
choco install k6

# Docker
docker run -i grafana/k6 run --vus 10 --duration 30s - < script.js
```

### Verify Installation

```bash
k6 version
```

### Start the Application

```bash
# Terminal 1: Start the server
cd server
npm install
npm start

# Terminal 2: Start the database (if using Docker)
docker run -d \
  --name webrtc-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=webrtc_test \
  -p 5432:5432 \
  postgres:15

# Terminal 3: Start Redis (if using Docker)
docker run -d \
  --name webrtc-redis \
  -p 6379:6379 \
  redis:7
```

---

## 2. Load Testing Scenarios

### 2.1 Main Load Test

**Purpose**: Simulate realistic user load with ramping and peak traffic

**Duration**: ~30 minutes
**Max Users**: 1,000
**Stages**:
- Ramp up: 0 → 100 users (2 min)
- Ramp up: 100 → 500 users (5 min)
- Sustained: 500 users (10 min)
- Spike: 500 → 1,000 users (5 min)
- Cool down: 1,000 → 0 users (7 min)

**Run Test**:
```bash
k6 run tests/load/load-test-main.js \
  --vus 100 \
  --duration 30m \
  -e BASE_URL=http://localhost:3000 \
  -e AUTH_TOKEN=test-token
```

**Expected Results**:
- P95 response time: < 200 ms
- P99 response time: < 500 ms
- Error rate: < 0.1%
- Throughput: 100+ requests/sec

---

### 2.2 Stress Test

**Purpose**: Push system beyond normal capacity to find breaking points

**Duration**: ~7 minutes
**Max Users**: 3,000
**Stages**:
- Warm up: → 500 users (1 min)
- High: → 1,000 users (1 min)
- Push: → 2,000 users (2 min)
- Break: → 3,000 users (2 min)
- Recovery: → 0 users (1 min)

**Run Test**:
```bash
k6 run tests/load/load-test-stress.js \
  --vus 500 \
  --duration 7m \
  -e BASE_URL=http://localhost:3000
```

**Expected Results**:
- System should handle up to 2,000 concurrent users
- Graceful degradation beyond capacity
- Recovery to normal after load reduction
- No data corruption or loss

---

### 2.3 Soak Test

**Purpose**: Identify issues during extended load (memory leaks, connection exhaustion)

**Duration**: 60 minutes
**Load**: 100 concurrent users
**Check For**:
- Memory growth over time
- Connection pool exhaustion
- Database connection limits
- Cache hit rate stability

**Run Test**:
```bash
k6 run tests/load/load-test-soak.js \
  --vus 100 \
  --duration 60m \
  -e BASE_URL=http://localhost:3000
```

**Expected Results**:
- Steady response time throughout
- No memory growth > 10 MB/hour
- Stable error rate < 0.05%
- Database connections remain < 80% of pool

---

### 2.4 Custom Test (Template)

```bash
# Create custom test
cat > tests/load/custom-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'http_req_failed': ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const response = http.get(`${BASE_URL}/api/calls`, {
    headers: {
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  });

  check(response, {
    'status 200': (r) => r.status === 200,
  });

  sleep(1);
}
EOF

# Run test
k6 run tests/load/custom-test.js -e BASE_URL=http://localhost:3000
```

---

## 3. Running Tests

### 3.1 Local Execution

```bash
# Simple load test
k6 run tests/load/load-test-main.js

# With increased verbosity
k6 run -v tests/load/load-test-main.js

# With specific output
k6 run tests/load/load-test-main.js --out csv=results.csv

# To JSON for processing
k6 run tests/load/load-test-main.js --out json=results.json
```

### 3.2 Docker Execution

```bash
# Run K6 test in Docker
docker run -v $(pwd):/scripts \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e AUTH_TOKEN=test-token \
  grafana/k6 run /scripts/tests/load/load-test-main.js

# With results saved
docker run -v $(pwd):/scripts \
  -e BASE_URL=http://host.docker.internal:3000 \
  grafana/k6 run --out csv=/scripts/results.csv \
  /scripts/tests/load/load-test-main.js
```

### 3.3 Cloud Execution (K6 Cloud)

```bash
# Setup K6 Cloud account
k6 login cloud

# Run test in cloud
k6 cloud tests/load/load-test-main.js

# View results
# https://app.k6.io/runs/xxxxx
```

### 3.4 Batch Testing Script

```bash
#!/bin/bash
# scripts/run-load-tests.sh

echo "Starting Load Tests..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="test-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

echo "1. Running Main Load Test..."
k6 run tests/load/load-test-main.js \
  --out csv=$RESULTS_DIR/main.csv \
  --out json=$RESULTS_DIR/main.json

echo "2. Running Stress Test..."
k6 run tests/load/load-test-stress.js \
  --out csv=$RESULTS_DIR/stress.csv \
  --out json=$RESULTS_DIR/stress.json

echo "3. Running Soak Test..."
k6 run tests/load/load-test-soak.js \
  --out csv=$RESULTS_DIR/soak.csv \
  --out json=$RESULTS_DIR/soak.json

echo "Tests completed. Results saved to $RESULTS_DIR"

# Generate report
node scripts/analyze-load-test-results.js "$RESULTS_DIR"
```

---

## 4. Interpreting Results

### 4.1 Key Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| P50 Response | < 50ms | 50-100ms | > 100ms |
| P95 Response | < 200ms | 200-500ms | > 500ms |
| P99 Response | < 500ms | 500-1000ms | > 1000ms |
| Error Rate | < 0.1% | 0.1-1% | > 1% |
| Throughput | > 500 req/s | 100-500 req/s | < 100 req/s |
| Connection Time | < 50ms | 50-100ms | > 100ms |

### 4.2 Reading K6 Output

```
execution: local
  script: load-test-main.js
  output: -

scenario: default
  executor: ramping-vus
  stages: [
    {duration: '2m0s', target: 100, ...}
    {duration: '5m0s', target: 500, ...}
  ]

INFO[0001] Request 1 complete
...

     checks.........................: 100.00% (5000 out of 5000)
     connection_errors..............: 0
     data_received..................: 5.0 MB
     data_sent.......................: 2.5 MB
     dropped_iterations.............: 0
     http_req_blocked...............: avg=2.54ms   min=100µs    med=800µs    max=150ms    p(90)=5.1ms    p(95)=7.8ms
     http_req_connecting............: avg=1.21ms   min=0s       med=0s       max=100ms    p(90)=2.1ms    p(95)=3.2ms
     http_req_duration..............: avg=95.34ms  min=12ms     med=87ms     max=950ms    p(90)=180ms    p(95)=210ms
     http_req_failed................: 0.10%
     http_req_receiving.............: avg=1.54ms   min=100µs    med=1.2ms    max=50ms     p(90)=3.1ms    p(95)=4.5ms
     http_req_sending...............: avg=0.98ms   min=100µs    med=0.8ms    max=10ms     p(90)=1.8ms    p(95)=2.5ms
     http_req_tls_handshaking.......: avg=0ms      min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
     http_req_waiting...............: avg=92.82ms  min=10ms     med=85ms     max=920ms    p(90)=175ms    p(95)=205ms
     http_requests..................: 5000    166.666667/s
     iterations......................: 5000    166.666667/s
     vus............................: 100     min=100 max=500
     vus_max........................: 500     min=500 max=500
```

### 4.3 Analyzing JSON Results

```javascript
// scripts/analyze-load-test-results.js
const fs = require('fs');
const path = require('path');

function analyzeResults(resultsDir) {
  const mainResults = JSON.parse(fs.readFileSync(path.join(resultsDir, 'main.json')));
  const metrics = mainResults.metrics;

  const analysis = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_req_duration: metrics.http_req_duration,
      http_req_failed: metrics.http_req_failed,
      http_requests: metrics.http_requests,
      checks: metrics.checks
    },
    assessment: assessPerformance(metrics)
  };

  // Save analysis
  fs.writeFileSync(
    path.join(resultsDir, 'analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  console.log('Performance Assessment:', analysis.assessment);
}

function assessPerformance(metrics) {
  const issues = [];

  if (metrics.http_req_duration?.values?.['p(95)'] > 200) {
    issues.push('P95 response time exceeds 200ms');
  }

  if (metrics.http_req_failed?.value > 0.001) {
    issues.push('Error rate exceeds 0.1%');
  }

  return issues.length === 0 ? 'PASS' : 'FAIL: ' + issues.join('; ');
}

analyzeResults(process.argv[2]);
```

---

## 5. Performance Baselines

### Development Environment (Local)

```
Baseline: t3.small EC2 instance
- CPU: 2 vCPU
- Memory: 2 GB
- Database: Single AZ PostgreSQL

Expected Capacity:
- Concurrent Users: 100-200
- Requests/sec: 50-100
- P95 Response: 100-200ms
```

### Staging Environment

```
Baseline: t3.medium EC2 instances (2 replicas)
- CPU: 2 vCPU × 2
- Memory: 4 GB × 2
- Database: Multi-AZ PostgreSQL
- Cache: Redis cluster

Expected Capacity:
- Concurrent Users: 500-1,000
- Requests/sec: 500-1,000
- P95 Response: < 200ms
```

### Production Environment

```
Baseline: c5.xlarge EC2 instances (4 replicas)
- CPU: 4 vCPU × 4
- Memory: 8 GB × 4
- Database: Multi-AZ PostgreSQL with read replicas
- Cache: Redis cluster with failover

Expected Capacity:
- Concurrent Users: 5,000+
- Requests/sec: 5,000+
- P95 Response: < 200ms
```

---

## 6. Capacity Planning

### 6.1 Using Load Test Results

```javascript
// Calculate capacity from load test results
function calculateCapacity(loadTestResults) {
  const maxThroughput = loadTestResults.http_requests.rate; // req/s
  const avgCallDuration = 300; // seconds
  const callsPerSecond = 0.1; // API calls per second per call

  const maxCalls = (maxThroughput / callsPerSecond) * avgCallDuration;
  const safeCapacity = maxCalls * 0.7; // 70% of max

  console.log(`
    Max Throughput: ${maxThroughput} req/s
    Max Concurrent Calls: ${maxCalls}
    Recommended Capacity: ${safeCapacity} concurrent calls
  `);
}
```

### 6.2 Scaling Decision

```
If load test shows:
├─ P95 < 200ms and Error < 0.1%
│  └─ Current infrastructure sufficient
├─ P95 > 200ms or Error > 0.1%
│  ├─ Check CPU usage > 80%
│  │  └─ Add more application instances
│  ├─ Check Database CPU > 80%
│  │  ├─ Optimize slow queries
│  │  └─ Consider read replicas
│  └─ Check Memory > 85%
│     ├─ Reduce cache size
│     └─ Add more instances
└─ System becomes unstable > 2000 VUs
   └─ Architect for sharding or geographic distribution
```

---

## 7. Troubleshooting

### 7.1 High Response Times

```bash
# Check server logs
docker logs webrtc-app | grep -i error | head -20

# Check database performance
psql -U postgres -d webrtc_test -c "
  SELECT query, calls, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC LIMIT 10;
"

# Check system resources
htop  # CPU and memory usage
iotop # Disk I/O

# Check network
iftop # Network bandwidth usage
```

### 7.2 Connection Errors

```bash
# Check database connections
psql -U postgres -d webrtc_test -c "
  SELECT count(*) FROM pg_stat_activity;
"

# Increase connection pool
psql -U postgres -d webrtc_test -c "
  ALTER SYSTEM SET max_connections = 500;
"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 7.3 Memory Issues

```bash
# Check Node.js memory
node --max-old-space-size=4096 server/index.js

# Monitor memory growth
watch -n 5 'ps aux | grep node'

# Check for memory leaks
npm install -g clinic
clinic doctor -- npm start
```

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/load-test.yml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM UTC
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres

      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Start server
        run: npm start &
        env:
          DATABASE_URL: postgres://postgres:postgres@postgres:5432/webrtc_test

      - name: Install K6
        run: sudo apt-get install -y k6

      - name: Run Load Test
        run: k6 run tests/load/load-test-main.js --out json=results.json

      - name: Analyze Results
        run: node scripts/analyze-load-test-results.js .

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

---

## Performance Monitoring Checklist

- [ ] Baseline established for each environment
- [ ] Load tests automated in CI/CD
- [ ] Weekly soak tests scheduled
- [ ] Quarterly capacity planning reviews
- [ ] Response time monitored continuously
- [ ] Error rate tracked and alerted
- [ ] Database performance optimized
- [ ] Cache hit rates > 80%

---

**Last Updated**: 2025-11-17
**Tool**: K6 (Load Aggregator)
**Recommended Frequency**: Weekly baseline, Monthly full suite
