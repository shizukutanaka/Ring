# Capacity Planning & Scaling Guide

Strategic guide for planning infrastructure capacity, predicting growth, and implementing scaling strategies for WebRTC Call Recorder.

## Overview

This guide covers:
- Capacity planning fundamentals
- Load estimation and projections
- Infrastructure sizing guidelines
- Vertical vs horizontal scaling trade-offs
- Database scaling strategies
- Application tier scaling
- Auto-scaling configuration
- Cost optimization
- Capacity monitoring and trending

---

## 1. Capacity Planning Fundamentals

### 1.1 Key Metrics

| Metric | Unit | Current | Target | Safety Margin |
|--------|------|---------|--------|----------------|
| Concurrent Calls | calls | 100 | 1,000 | 50% |
| Peak RPS (API) | req/s | 500 | 5,000 | 50% |
| Data Growth | GB/month | 50 | 500 | 100% |
| Concurrent Users | users | 500 | 5,000 | 50% |
| Call Storage | GB/call | 10 | 10 | - |
| Bandwidth | Mbps | 500 | 5,000 | 50% |

### 1.2 Planning Horizons

```
Current State (Now)
├─ 3 Month (Near-term capacity)
├─ 12 Month (Annual planning)
├─ 3 Year (Strategic planning)
└─ 5 Year (Long-term vision)
```

### 1.3 Capacity Planning Process

```
1. Estimate Current Capacity
   ├─ Measure existing usage
   ├─ Profile bottlenecks
   └─ Document baseline

2. Project Growth
   ├─ Historical growth rate
   ├─ Business projections
   ├─ Market analysis
   └─ Competitor benchmarking

3. Size Infrastructure
   ├─ Calculate required resources
   ├─ Apply safety margins
   ├─ Consider seasonality
   └─ Plan headroom

4. Implement Scaling
   ├─ Horizontal scaling
   ├─ Vertical scaling
   ├─ Auto-scaling policies
   └─ Cost optimization

5. Monitor & Adjust
   ├─ Track growth trends
   ├─ Refine estimates
   ├─ Adjust scaling policies
   └─ Plan next cycle
```

---

## 2. Load Estimation

### 2.1 Call Volume Calculation

```javascript
// Estimate call volume
const callVolumeModel = {
  // Business parameters
  activeUsers: 5000,
  dailyActiveUserRatio: 0.4, // 40% of users active daily
  callsPerUser: 2.5, // Average calls per active user
  peakHourRatio: 0.3, // 30% of daily calls in peak hour

  // Calculated metrics
  dailyActiveUsers: function() {
    return this.activeUsers * this.dailyActiveUserRatio;
  },

  dailyCallVolume: function() {
    return this.dailyActiveUsers() * this.callsPerUser;
  },

  averageRPS: function() {
    const secondsPerDay = 86400;
    return this.dailyCallVolume() / secondsPerDay;
  },

  peakHourRPS: function() {
    const secondsPerHour = 3600;
    const peakHourCalls = this.dailyCallVolume() * this.peakHourRatio;
    return peakHourCalls / secondsPerHour;
  },

  concurrentCalls: function() {
    const avgCallDuration = 300; // 5 minutes
    return this.averageRPS() * avgCallDuration;
  }
};

// Example calculations
console.log('Daily Calls:', callVolumeModel.dailyCallVolume()); // 5000 calls
console.log('Average RPS:', callVolumeModel.averageRPS()); // 0.06 req/s
console.log('Peak Hour RPS:', callVolumeModel.peakHourRPS()); // 0.5 req/s
console.log('Concurrent Calls:', callVolumeModel.concurrentCalls()); // ~18 calls
```

### 2.2 Data Growth Projection

```sql
-- Calculate data growth
WITH call_stats AS (
  SELECT
    DATE_TRUNC('month', started_at) as month,
    COUNT(*) as call_count,
    AVG(duration_seconds) as avg_duration,
    SUM(CASE WHEN recorded THEN 1 ELSE 0 END) as recorded_count,
    SUM(CASE WHEN recorded THEN
      (duration_seconds * 64 / 8 / 1024 / 1024)  -- 64kbps audio in MB
    ELSE 0 END) as storage_gb
  FROM calls
  GROUP BY DATE_TRUNC('month', started_at)
)
SELECT
  month,
  call_count,
  ROUND(avg_duration, 2) as avg_duration_sec,
  recorded_count,
  ROUND(storage_gb, 2) as storage_gb,
  ROUND(
    (storage_gb - LAG(storage_gb) OVER (ORDER BY month)) /
    LAG(storage_gb) OVER (ORDER BY month) * 100,
    2
  ) as growth_percent
FROM call_stats
ORDER BY month DESC;
```

### 2.3 Growth Projection Models

```javascript
// Linear, exponential, and logistic growth models
class GrowthProjection {
  constructor(historicalData) {
    this.data = historicalData; // Array of {month, value}
  }

  // Linear projection
  linearProjection(monthsAhead) {
    const n = this.data.length;
    const xMean = (n - 1) / 2;
    const yMean = this.data.reduce((sum, d) => sum + d.value, 0) / n;

    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (this.data[i].value - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    return intercept + slope * (n + monthsAhead - 1);
  }

  // Exponential projection
  exponentialProjection(monthsAhead) {
    const ratios = [];
    for (let i = 1; i < this.data.length; i++) {
      ratios.push(this.data[i].value / this.data[i - 1].value);
    }

    const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
    const lastValue = this.data[this.data.length - 1].value;

    return lastValue * Math.pow(avgRatio, monthsAhead);
  }

  // Logistic projection (S-curve with saturation)
  logisticProjection(monthsAhead, maxCapacity) {
    const n = this.data.length;
    const lastValue = this.data[n - 1].value;

    // Estimate growth rate from historical data
    const growthRate = (this.data[n - 1].value - this.data[0].value) /
                       (maxCapacity - this.data[0].value);

    return maxCapacity / (1 + Math.exp(-growthRate * (n + monthsAhead)));
  }
}

// Usage example
const historicalCallVolume = [
  { month: 'Jan', value: 1000 },
  { month: 'Feb', value: 1500 },
  { month: 'Mar', value: 2250 },
  { month: 'Apr', value: 3375 },
  { month: 'May', value: 5000 }
];

const projection = new GrowthProjection(historicalCallVolume);

console.log('Linear (12 months):', projection.linearProjection(12)); // Conservative
console.log('Exponential (12 months):', projection.exponentialProjection(12)); // Aggressive
console.log('Logistic (12 months):', projection.logisticProjection(12, 100000)); // Realistic
```

---

## 3. Infrastructure Sizing

### 3.1 Application Server Sizing

```
Node.js Server Capacity Estimation

┌─ Single Core
│  ├─ CPU: 1 vCore
│  ├─ Memory: 1-2 GB
│  ├─ RPS Capacity: 50-100 req/s
│  └─ Concurrent Connections: 500-1000
│
├─ Standard Instance (2-4 cores)
│  ├─ CPU: 2-4 vCore
│  ├─ Memory: 4-8 GB
│  ├─ RPS Capacity: 200-500 req/s
│  └─ Concurrent Connections: 2000-5000
│
├─ High-Performance (8+ cores)
│  ├─ CPU: 8+ vCore
│  ├─ Memory: 16-32 GB
│  ├─ RPS Capacity: 1000-3000 req/s
│  └─ Concurrent Connections: 10000-20000
│
└─ Ultra-High (16+ cores)
   ├─ CPU: 16+ vCore
   ├─ Memory: 32-64 GB
   ├─ RPS Capacity: 5000+ req/s
   └─ Concurrent Connections: 50000+
```

### 3.2 Database Sizing

```javascript
// PostgreSQL server sizing
const databaseSizing = {
  // Storage calculation
  estimateStorage: function(
    callsPerDay,
    recordingSize = 10 // MB per call
  ) {
    const callsPerYear = callsPerDay * 365;
    const consentRecordsPerCall = 2; // Average 2 consent records

    // Call records: ~50KB per call
    const callRecordsSize = (callsPerYear * 50) / 1024 / 1024; // MB -> GB

    // Recording files: 10MB per call average
    const recordingStorage = (callsPerYear * recordingSize) / 1024; // GB

    // Consent records: ~5KB per record
    const consentSize = (callsPerYear * consentRecordsPerCall * 5) / 1024 / 1024;

    // Indexes: ~30% of data
    const indexSize = (callRecordsSize + recordingStorage + consentSize) * 0.3;

    // Overhead: ~20%
    const overhead = (callRecordsSize + recordingStorage + consentSize) * 0.2;

    return {
      call_records_gb: callRecordsSize,
      recording_storage_gb: recordingStorage,
      consent_records_gb: consentSize,
      index_storage_gb: indexSize,
      overhead_gb: overhead,
      total_gb: callRecordsSize + recordingStorage + consentSize + indexSize + overhead
    };
  },

  // Connection pool sizing
  connectionPoolSize: function(
    concurrentRequests = 100,
    avgQueryTime = 50 // milliseconds
  ) {
    const queryThroughput = 1000 / avgQueryTime;
    const safetyFactor = 1.5;

    return Math.ceil((concurrentRequests / queryThroughput) * safetyFactor);
  },

  // Memory calculation
  estimateMemory: function(
    activeConnections = 100,
    cacheSizeGB = 4,
    memoryPerConnection = 2 // MB
  ) {
    const baseMemory = 2; // GB for OS/Postgres
    const connectionMemory = (activeConnections * memoryPerConnection) / 1024;
    const sharedBuffers = 2; // GB default
    const workMemory = 0.5; // GB for operations

    return baseMemory + connectionMemory + sharedBuffers + workMemory + cacheSizeGB;
  }
};

// Example: 5000 calls/day, 10MB recordings
const storage = databaseSizing.estimateStorage(5000, 10);
console.log('Estimated Database Storage:', storage.total_gb.toFixed(2), 'GB');
// Output: ~22 GB/year

// Connection pool for 100 concurrent requests
const poolSize = databaseSizing.connectionPoolSize(100, 50);
console.log('Recommended Connection Pool:', poolSize); // ~3 connections

// Memory for 100 active connections
const memory = databaseSizing.estimateMemory(100, 4);
console.log('Estimated Database Memory:', memory.toFixed(2), 'GB');
// Output: ~8.78 GB
```

### 3.3 Load Balancer Configuration

```nginx
# Nginx load balancer sizing
upstream app_servers {
  least_conn; # Use least connections algorithm

  server app1.internal:3000 weight=5 max_fails=3 fail_timeout=30s;
  server app2.internal:3000 weight=5 max_fails=3 fail_timeout=30s;
  server app3.internal:3000 weight=5 max_fails=3 fail_timeout=30s;
  server app4.internal:3000 weight=5 max_fails=3 fail_timeout=30s;

  keepalive 32; # Connection pool
  keepalive_timeout 60s;
}

server {
  listen 80;

  # Load balancing
  location /api {
    proxy_pass http://app_servers;
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    # Timeouts
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 30s;

    # Health check
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
  }
}
```

---

## 4. Vertical vs Horizontal Scaling

### 4.1 Comparison Matrix

| Aspect | Vertical | Horizontal |
|--------|----------|-----------|
| **Implementation** | Add hardware to single machine | Add more machines |
| **Complexity** | Simple | Complex |
| **Cost Scaling** | Exponential | Linear |
| **Downtime** | Required for upgrades | Zero-downtime possible |
| **Fault Tolerance** | Single point of failure | Redundancy |
| **Management** | Easier | Requires orchestration |
| **Limits** | Hardware limits | Virtually unlimited |
| **Best for** | Startups, simple apps | Growth stage, complex apps |

### 4.2 Decision Tree

```
Start: Need More Capacity?
│
├─ YES: Can single server handle load?
│  │
│  ├─ YES: Vertical Scaling
│  │  ├─ Add more CPU cores
│  │  ├─ Increase memory to 64-128GB
│  │  ├─ Upgrade storage to NVMe SSD
│  │  └─ Optimize single-instance performance
│  │
│  └─ NO: Horizontal Scaling
│     ├─ Deploy multiple instances
│     ├─ Set up load balancer
│     ├─ Implement sticky sessions (if needed)
│     ├─ Distribute database load
│     └─ Monitor cross-instance consistency
│
└─ Consider Hybrid Approach
   ├─ Vertical: For database servers
   ├─ Horizontal: For application servers
   ├─ Auto-scaling: For traffic spikes
   └─ CDN: For static content
```

---

## 5. Database Scaling Strategies

### 5.1 Read Replicas

```bash
#!/bin/bash
# setup-read-replica.sh

# Primary server: postgresql1.internal
# Replica server: postgresql2.internal

# On primary server, enable WAL archiving
sudo -u postgres psql << 'EOF'
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET wal_keep_size = '1GB';
ALTER SYSTEM SET hot_standby = on;
EOF

sudo systemctl reload postgresql

# Create replication user
sudo -u postgres psql << 'EOF'
CREATE ROLE replicator WITH REPLICATION ENCRYPTED PASSWORD 'strong_password' LOGIN;
EOF

# Configure pg_hba.conf for replication
cat >> /etc/postgresql/13/main/pg_hba.conf << 'EOF'
# Replication connection
host  replication  replicator  10.0.1.0/24  md5
EOF

sudo systemctl reload postgresql

# On replica server, set up as standby
pg_basebackup -h postgresql1.internal -D /var/lib/postgresql/13/main \
              -U replicator -v -P

# Create standby signal file
touch /var/lib/postgresql/13/main/standby.signal

# Start replica
sudo systemctl start postgresql

# Verify replication status (on primary)
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

### 5.2 Sharding Strategy

```javascript
// Database sharding implementation
class DatabaseSharding {
  // Shard key: based on call_id hash
  calculateShard(callId, shardCount = 4) {
    const hash = require('crypto')
      .createHash('md5')
      .update(callId)
      .digest('hex');

    const shardId = parseInt(hash.substring(0, 8), 16) % shardCount;
    return shardId;
  }

  // Get shard connection
  getShardConnection(callId) {
    const shardId = this.calculateShard(callId);
    const shards = {
      0: 'db-shard-0.internal',
      1: 'db-shard-1.internal',
      2: 'db-shard-2.internal',
      3: 'db-shard-3.internal'
    };

    return this.getConnection(shards[shardId]);
  }

  // Shard query example
  async getCall(callId) {
    const shard = this.getShardConnection(callId);

    return await shard.query(
      'SELECT * FROM calls WHERE id = $1',
      [callId]
    );
  }

  // Cross-shard query (expensive)
  async getAllCallsByUser(userId) {
    const results = [];

    // Query all shards
    for (let i = 0; i < 4; i++) {
      const connection = this.getConnection(`db-shard-${i}.internal`);
      const shardResults = await connection.query(
        'SELECT * FROM calls WHERE initiator_id = $1 OR recipient_id = $1',
        [userId]
      );
      results.push(...shardResults.rows);
    }

    return results.sort((a, b) => b.started_at - a.started_at);
  }
}
```

### 5.3 Connection Pooling

```javascript
// Database connection pooling with pgBouncer
const { Pool } = require('pg');

const pool = new Pool({
  host: 'pgbouncer.internal', // Point to pgBouncer, not directly to PostgreSQL
  port: 6432, // pgBouncer port
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  database: 'webrtc_recorder',
  max: 10, // Max connections from app to pgBouncer
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// pgBouncer config (/etc/pgbouncer/pgbouncer.ini)
const pgbouncerConfig = `
[databases]
webrtc_recorder = host=postgresql1.internal port=5432 user=app_user dbname=webrtc_recorder

[pgbouncer]
pool_mode = transaction      # Connection mode
max_client_conn = 1000       # Max client connections
default_pool_size = 25       # Pool size per database
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
tcp_keepalives = 1
tcp_keepidles = 30
tcp_keepintvl = 10
`;

module.exports = pool;
```

---

## 6. Application Scaling

### 6.1 Horizontal Scaling with Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webrtc-api
spec:
  replicas: 3  # Start with 3 replicas
  selector:
    matchLabels:
      app: webrtc-api
  template:
    metadata:
      labels:
        app: webrtc-api
    spec:
      containers:
      - name: api
        image: webrtc-recorder:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webrtc-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webrtc-api
  minReplicas: 2
  maxReplicas: 10
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 60
```

### 6.2 Auto-Scaling Policies

```javascript
// Auto-scaling decision logic
class AutoScalingManager {
  async evaluateScaling() {
    const metrics = await this.getCurrentMetrics();
    const scaling = this.calculateScaling(metrics);

    if (scaling.shouldScale) {
      await this.executeScaling(scaling);
    }
  }

  calculateScaling(metrics) {
    const cpuThreshold = 70; // %
    const memoryThreshold = 80; // %
    const requestsThreshold = 80; // % of capacity

    const cpuPercentage = (metrics.cpu / metrics.cpuCapacity) * 100;
    const memoryPercentage = (metrics.memory / metrics.memoryCapacity) * 100;
    const requestsPercentage = (metrics.rps / metrics.rpsCapacity) * 100;

    // Scale up if any metric exceeds threshold
    if (cpuPercentage > cpuThreshold ||
        memoryPercentage > memoryThreshold ||
        requestsPercentage > requestsThreshold) {
      return {
        shouldScale: true,
        direction: 'UP',
        reason: this.getScalingReason(cpuPercentage, memoryPercentage, requestsPercentage),
        newInstanceCount: Math.ceil(metrics.currentInstances * 1.5) // Scale by 50%
      };
    }

    // Scale down if all metrics are low
    const lowThreshold = 30; // %
    if (cpuPercentage < lowThreshold &&
        memoryPercentage < lowThreshold &&
        requestsPercentage < lowThreshold &&
        metrics.currentInstances > metrics.minInstances) {
      return {
        shouldScale: true,
        direction: 'DOWN',
        reason: 'Low utilization across all metrics',
        newInstanceCount: Math.max(metrics.minInstances,
                                   Math.floor(metrics.currentInstances * 0.75)) // Scale by 25%
      };
    }

    return { shouldScale: false };
  }

  getScalingReason(cpu, memory, requests) {
    const reasons = [];
    if (cpu > 70) reasons.push(`High CPU usage (${cpu.toFixed(1)}%)`);
    if (memory > 80) reasons.push(`High memory usage (${memory.toFixed(1)}%)`);
    if (requests > 80) reasons.push(`High request rate (${requests.toFixed(1)}%)`);
    return reasons.join(', ');
  }
}
```

---

## 7. Cost Optimization

### 7.1 Resource Optimization

```javascript
// Cost analysis and optimization
class CostOptimization {
  // Calculate cost per request
  calculateCPR(monthlySpend, requestsPerMonth) {
    return (monthlySpend / requestsPerMonth).toFixed(6);
  }

  // Identify waste
  identifyWaste() {
    return {
      idle_instances: 'Instances with <5% CPU for 7+ days',
      oversized_instances: 'Instances with 20%+ available capacity',
      unused_storage: 'Volumes not attached or unused',
      data_transfer: 'Expensive cross-region transfers',
      reserved_capacity: 'Reserved instances vs on-demand'
    };
  }

  // Cost optimization recommendations
  getRecommendations(currentMetrics) {
    const recommendations = [];

    // Right-sizing
    if (currentMetrics.avgCpuUsage < 20) {
      recommendations.push({
        category: 'Right-sizing',
        action: 'Downgrade instance type',
        savings: 'Up to 50% on compute'
      });
    }

    // Reserved instances
    if (currentMetrics.baselineCapacity > 50) {
      recommendations.push({
        category: 'Commitment discounts',
        action: 'Purchase reserved instances for baseline',
        savings: 'Up to 40% on committed compute'
      });
    }

    // Spot instances
    if (currentMetrics.hasFlexibleWorkloads) {
      recommendations.push({
        category: 'Spot pricing',
        action: 'Use spot instances for batch/scale jobs',
        savings: 'Up to 90% on variable workloads'
      });
    }

    // Caching
    if (currentMetrics.databaseQueriesPerSecond > 100) {
      recommendations.push({
        category: 'Caching',
        action: 'Implement Redis caching layer',
        savings: 'Up to 30% on database load'
      });
    }

    return recommendations;
  }

  // Monthly cost breakdown
  estimateMonthlyCost(config) {
    const costs = {
      compute: {
        app_servers: config.appServers * config.appInstanceCost,
        db_server: config.dbInstanceCost,
        total: 0
      },
      storage: {
        database: config.databaseStorageGB * 0.023,
        backups: config.backupStorageGB * 0.023,
        cdn: config.bandwidthGB * 0.085,
        total: 0
      },
      networking: {
        data_transfer: config.dataTransferGB * 0.09,
        load_balancer: 16.20,
        total: 0
      },
      services: {
        monitoring: 19, // Prometheus/Grafana
        logging: 50,
        vpn: 32,
        total: 0
      }
    };

    // Calculate totals
    costs.compute.total = costs.compute.app_servers + costs.compute.db_server;
    costs.storage.total = costs.storage.database + costs.storage.backups + costs.storage.cdn;
    costs.networking.total = costs.networking.data_transfer + costs.networking.load_balancer;
    costs.services.total = costs.services.monitoring + costs.services.logging + costs.services.vpn;

    const monthlyTotal = costs.compute.total + costs.storage.total +
                        costs.networking.total + costs.services.total;

    return { costs, monthlyTotal };
  }
}

// Example: 5000 calls/day setup
const config = {
  appServers: 4,
  appInstanceCost: 150, // per instance/month
  dbInstanceCost: 800,
  databaseStorageGB: 500,
  backupStorageGB: 1000,
  bandwidthGB: 1000,
  dataTransferGB: 500
};

const costOptimizer = new CostOptimization();
const { costs, monthlyTotal } = costOptimizer.estimateMonthlyCost(config);

console.log('Monthly Cost Estimate:', monthlyTotal.toFixed(2)); // ~$4,000/month
console.log('Cost per call:', costOptimizer.calculateCPR(monthlyTotal, 5000 * 30).toFixed(6));
```

### 7.2 Spot Instance Strategy

```bash
#!/bin/bash
# spot-instance-setup.sh

# Launch spot instances for flexible workloads
aws ec2 request-spot-instances \
  --spot-price "0.03" \
  --instance-count 5 \
  --launch-specification '{
    "ImageId": "ami-xxxxx",
    "InstanceType": "c5.xlarge",
    "KeyName": "deployment",
    "SecurityGroupIds": ["sg-xxxxx"],
    "SubnetId": "subnet-xxxxx",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "webrtc-batch-processing"}]
    }]
  }' \
  --valid-until 2025-12-31T23:59:59.000Z

# Reduce costs by 70%+ vs on-demand pricing
# Suitable for: batch jobs, non-critical workloads, development/testing
```

---

## 8. Capacity Monitoring

### 8.1 Key Metrics Dashboard

```javascript
// Prometheus queries for capacity monitoring
const capacityQueries = {
  cpu_usage: 'avg(rate(cpu_usage_seconds_total[5m])) * 100',
  memory_usage: 'avg((1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))) * 100',
  disk_usage: 'avg((1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes))) * 100',

  api_rps: 'rate(http_requests_total[5m])',
  api_p95_latency: 'histogram_quantile(0.95, http_request_duration_ms)',

  database_connections: 'count(pg_stat_activity_count)',
  database_qps: 'rate(pg_stat_database_tup_returned[5m])',

  concurrent_calls: 'active_calls_total',

  // Capacity thresholds
  capacity_utilization: '(current_load / maximum_capacity) * 100'
};

// Grafana dashboard panels
const dashboardPanels = [
  {
    title: 'CPU Utilization Trend',
    query: 'avg(cpu_usage)',
    alert: 'CPU > 80% for 5 minutes'
  },
  {
    title: 'Memory Availability',
    query: 'node_memory_MemAvailable_bytes',
    alert: 'Memory < 512MB'
  },
  {
    title: 'API Request Rate',
    query: 'rate(http_requests_total[5m])',
    alert: 'RPS > 80% of capacity'
  },
  {
    title: 'Database Connections',
    query: 'pg_stat_activity_count',
    alert: 'Connections > 80% of pool'
  }
];
```

### 8.2 Capacity Trending

```sql
-- Historical capacity analysis
CREATE MATERIALIZED VIEW capacity_trending AS
SELECT
  DATE_TRUNC('day', timestamp) as day,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cpu_usage) as p95_cpu,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY memory_usage) as p95_memory,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rps) as p95_rps,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency,
  MAX(concurrent_calls) as peak_concurrent_calls
FROM metrics
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day DESC;

-- Capacity forecast
WITH monthly_peaks AS (
  SELECT
    DATE_TRUNC('month', day) as month,
    MAX(p95_cpu) as peak_cpu,
    MAX(p95_rps) as peak_rps
  FROM capacity_trending
  GROUP BY DATE_TRUNC('month', day)
)
SELECT
  month,
  peak_cpu,
  peak_rps,
  LAG(peak_rps) OVER (ORDER BY month) as previous_month_peak,
  ROUND(
    (peak_rps - LAG(peak_rps) OVER (ORDER BY month)) /
    LAG(peak_rps) OVER (ORDER BY month) * 100,
    2
  ) as growth_percent,
  ROUND(peak_rps * 1.5, 0) as recommended_capacity_12_months
FROM monthly_peaks
ORDER BY month DESC;
```

---

## 9. Scaling Decision Flowchart

```
Are you experiencing performance issues?
│
├─ CPU high (>80%)?
│  ├─ App servers: Add more instances (horizontal)
│  └─ Database: Increase CPU/memory (vertical) or add read replicas
│
├─ Memory high (>85%)?
│  ├─ App servers: Reduce cache, add instances, tune heap size
│  └─ Database: Reduce working memory, optimize queries
│
├─ Disk space low (<20%)?
│  ├─ Archive old data
│  ├─ Increase storage capacity
│  └─ Implement data retention policy
│
├─ API latency high (>500ms)?
│  ├─ Database: Add indexes, optimize queries, increase connections
│  ├─ App: Implement caching, reduce computation
│  └─ Network: Check bandwidth, reduce hops
│
└─ Network bandwidth saturated?
   ├─ Enable compression (gzip)
   ├─ Add CDN for static content
   ├─ Implement pagination/filtering
   └─ Monitor and optimize payloads
```

---

## 10. Capacity Planning Checklist

### Monthly Review
- [ ] Analyze usage trends
- [ ] Review peak metrics
- [ ] Check forecasting accuracy
- [ ] Update growth projections
- [ ] Identify optimization opportunities

### Quarterly Planning
- [ ] Review capacity vs demand
- [ ] Plan infrastructure upgrades
- [ ] Update cost projections
- [ ] Test auto-scaling policies
- [ ] Plan load tests

### Annual Strategic
- [ ] Long-term capacity roadmap
- [ ] Multi-year cost planning
- [ ] Technology evolution planning
- [ ] Risk assessment and contingencies
- [ ] Executive reporting

---

**Last Updated**: 2025-11-17
**Review Cycle**: Monthly
**Next Review**: 2025-12-17
