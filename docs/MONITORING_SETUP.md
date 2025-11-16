# Monitoring Setup Guide

Complete guide to setting up monitoring and observability for WebRTC Call Recorder.

## Overview

The project includes a complete monitoring stack with:
- **Prometheus**: Time-series metrics database
- **Grafana**: Visualization and dashboards
- **Node Exporter**: System metrics collection
- **Redis**: Caching (optional)
- **pgAdmin**: Database management (optional)

## Quick Start with Docker Compose

### 1. Start the Full Stack

```bash
# Start all services including monitoring
docker-compose -f docker-compose-monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose-monitoring.yml ps
```

### 2. Access the Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API Server | http://localhost:3000 | - |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| pgAdmin | http://localhost:5050 | admin@example.com/admin |
| Adminer | http://localhost:8081 | - |

---

## Manual Setup (Without Docker)

### Prerequisites

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
sudo mv prometheus-* /opt/prometheus

# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo mv node_exporter-* /opt/node_exporter

# Install Grafana
sudo apt-get install -y grafana-server
sudo systemctl start grafana-server
```

### 1. Configure Prometheus

Create `/opt/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'webrtc-server'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

### 2. Start Services

```bash
# Start Prometheus
cd /opt/prometheus
./prometheus --config.file=prometheus.yml

# In another terminal, start Node Exporter
cd /opt/node_exporter
./node_exporter

# Access Prometheus at http://localhost:9090
```

### 3. Configure Grafana

1. Go to http://localhost:3000
2. Login with admin/admin
3. Add Prometheus data source:
   - URL: http://localhost:9090
4. Create dashboards (see templates below)

---

## Metrics Available

### Server Metrics (from `/metrics` endpoint)

```
http_requests_total                    # Total HTTP requests
http_request_duration_ms               # Request duration percentiles
errors_total                           # Total errors by type
active_connections                     # Current WebSocket connections
calls_total                            # Total calls initiated
consent_records_total                  # Total consent records
```

### System Metrics (from Node Exporter)

```
node_cpu_seconds_total                 # CPU time
node_memory_MemAvailable_bytes         # Available memory
node_filesystem_avail_bytes            # Disk space available
node_network_receive_bytes_total       # Network traffic
node_processes_running                 # Running processes
```

---

## Grafana Dashboards

### Create a Basic Dashboard

1. **Dashboard → New**
2. **Add Query**:
   - Metric: `http_requests_total`
   - Legend: `{{ method }} {{ path }}`
3. **Visualization**: Graph
4. **Save**

### Dashboard Panels

#### 1. Request Rate

```
rate(http_requests_total[5m])
```

#### 2. Error Rate

```
rate(errors_total[5m]) / rate(http_requests_total[5m])
```

#### 3. Response Time (P95)

```
histogram_quantile(0.95, http_request_duration_ms)
```

#### 4. Active Connections

```
active_connections
```

#### 5. Total Calls

```
calls_total
```

#### 6. Consent Records

```
consent_records_total
```

#### 7. CPU Usage

```
rate(node_cpu_seconds_total{mode="user"}[5m]) * 100
```

#### 8. Memory Usage

```
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100
```

---

## Alerting

### Create Alerts in Prometheus

Create `monitoring/rules.yml`:

```yaml
groups:
  - name: webrtc
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow responses
      - alert: SlowResponse
        expr: |
          histogram_quantile(0.95, http_request_duration_ms) > 500
        for: 5m
        annotations:
          summary: "Slow API response"
          description: "P95 response time is {{ $value }}ms"

      # Low disk space
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space available"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
        for: 5m
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # Database connection issues
      - alert: DatabaseConnections
        expr: |
          pg_stat_activity_count > 80
        for: 5m
        annotations:
          summary: "High database connections"
          description: "{{ $value }} active database connections"
```

### Email Notifications

Configure in `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

---

## Performance Monitoring

### Request Metrics

Monitor these key metrics:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| P50 Response Time | < 50ms | Check slow queries |
| P95 Response Time | < 100ms | Optimize database |
| P99 Response Time | < 500ms | Add caching |
| Error Rate | < 0.1% | Review logs |
| Request Rate | < 500 RPS | Scale horizontally |

### System Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| CPU Usage | < 70% | Scale horizontally |
| Memory Usage | < 80% | Increase heap size |
| Disk Usage | < 70% | Archive old data |
| Network Bandwidth | < 80% | Add CDN or cache |

---

## Troubleshooting

### Prometheus not scraping metrics

```bash
# Check if server is responding
curl http://localhost:3000/metrics

# Check Prometheus targets
http://localhost:9090/targets

# Verify prometheus.yml syntax
./promtool check config prometheus.yml
```

### Grafana data not showing

1. Check data source connectivity
2. Verify Prometheus is scraping metrics
3. Check metric names in PromQL

### High memory usage in Prometheus

```yaml
# Reduce retention in prometheus.yml
--storage.tsdb.retention.time=7d
--storage.tsdb.max-block-duration=2h
```

---

## Advanced: Custom Metrics

Add custom metrics to your application:

```javascript
// In server/index.js
const prometheus = require('prom-client');

// Create custom metric
const callDuration = new prometheus.Histogram({
  name: 'call_duration_seconds',
  help: 'Duration of calls in seconds',
  buckets: [5, 10, 30, 60, 300, 600]
});

// Use metric
callDuration.observe(duration);

// Expose metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

---

## Backup and Long-term Storage

### Backup Metrics

```bash
# Backup Prometheus data
tar czf prometheus-backup-$(date +%Y%m%d).tar.gz /var/lib/prometheus

# Backup Grafana dashboards
curl http://localhost:3000/api/search > dashboards.json
```

### Long-term Storage

For production, consider:
- **Thanos**: Long-term Prometheus storage
- **Cortex**: Multi-tenant Prometheus
- **InfluxDB**: Alternative time-series DB
- **TimescaleDB**: PostgreSQL extension

---

## Best Practices

1. **Retention Policy**: Keep 7-30 days of metrics
2. **Scrape Interval**: Balance between granularity and resource usage
3. **Alerting**: Define critical thresholds
4. **Dashboards**: Create dashboards for each component
5. **Logging**: Combine metrics with structured logging
6. **Testing**: Load test before production
7. **Capacity Planning**: Monitor trends over time

---

## Production Checklist

- [ ] Prometheus running with persistent storage
- [ ] Grafana configured with strong password
- [ ] Alerts configured and tested
- [ ] Retention policy set appropriately
- [ ] Backups configured
- [ ] Dashboard created for operators
- [ ] On-call procedures documented
- [ ] Runbooks written for common alerts
- [ ] HTTPS enabled for Grafana
- [ ] Access control configured

---

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node Exporter Metrics](https://github.com/prometheus/node_exporter)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Last Updated**: 2025-11-17
