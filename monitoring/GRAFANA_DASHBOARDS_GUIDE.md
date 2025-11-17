# Grafana Dashboards Setup Guide

Pre-built Grafana dashboards for monitoring WebRTC Call Recorder.

## Overview

The following dashboards are provided:

1. **Overview Dashboard** - System-wide metrics and health
2. **Performance Dashboard** - API response times and throughput
3. **Call Analytics Dashboard** - Call metrics and consent tracking
4. **Security Dashboard** - Security events and compliance
5. **Database Dashboard** - PostgreSQL performance

## Quick Import

### Import via Grafana UI

1. Go to **Dashboards → Import**
2. Upload JSON file or paste content
3. Select data source: **Prometheus**
4. Click **Import**

### Import via Provisioning

1. Copy JSON files to `/etc/grafana/provisioning/dashboards/`
2. Update `/etc/grafana/provisioning/dashboards/dashboards.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'WebRTC'
    orgId: 1
    folder: 'WebRTC'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

3. Restart Grafana:
```bash
sudo systemctl restart grafana-server
```

## Dashboard Details

### 1. Overview Dashboard

**Purpose**: Quick snapshot of system health

**Panels**:
- Request Rate (RPS)
- Error Rate (gauge)
- Response Time Percentiles (p50, p95, p99)
- CPU Usage (by instance)
- Memory Usage (by instance)

**Time Range**: Last 1 hour

**Ideal For**: Status page, team dashboards

### 2. Performance Dashboard

**Purpose**: Detailed performance analysis

**Panels**:
- P95 Response Time (stat)
- Requests/sec (stat)
- Error Rate (stat)
- Active Connections (stat)
- Request Distribution by Status
- Response Time Distribution (p50, p75, p90, p99)
- API Endpoints Request Rate

**Time Range**: Last 6 hours

**Ideal For**: Performance SLA tracking, optimization

### 3. Call Analytics Dashboard

**Purpose**: Call-specific metrics

**Panels**:
- Total Calls Initiated
- Active Calls (gauge)
- Average Call Duration
- Consent Recording Rate
- Calls by Status
- Legal Rules Distribution
- Consent Methods

**Time Range**: Last 24 hours

**Ideal For**: Operations, product metrics

### 4. Security Dashboard

**Purpose**: Security and compliance monitoring

**Panels**:
- Failed Login Attempts
- Unauthorized API Access Attempts
- Data Access Events
- Consent Signatures Verified
- Legal Compliance Status by Country
- Alert Timeline

**Time Range**: Last 7 days

**Ideal For**: Security team, compliance reporting

### 5. Database Dashboard

**Purpose**: PostgreSQL performance

**Panels**:
- Database Connections (active)
- Query Performance (slow queries)
- Cache Hit Ratio
- Disk Space Usage
- Replication Lag (if applicable)
- Table Sizes

**Time Range**: Last 6 hours

**Ideal For**: Database admins, optimization

## Installation Steps

### Step 1: Setup Prometheus Data Source

1. Go to **Configuration → Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - Name: `Prometheus`
   - URL: `http://localhost:9090`
   - Access: `Browser`
5. Click **Save & Test**

### Step 2: Create Dashboard Folder

1. Go to **Dashboards → Manage**
2. Click **New Folder**
3. Name: `WebRTC`
4. Click **Create**

### Step 3: Import Dashboards

```bash
# For each dashboard JSON file:
curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/dashboards/overview-dashboard.json

curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/dashboards/performance-dashboard.json

curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/dashboards/security-dashboard.json

curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/dashboards/database-dashboard.json

curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/dashboards/call-analytics-dashboard.json
```

### Step 4: Verify Metrics

Check that metrics are being collected:

```bash
# Query Prometheus
curl http://localhost:9090/api/v1/query?query=http_requests_total

# View Prometheus targets
http://localhost:9090/targets
```

## Customization

### Change Time Range

1. Click dashboard dropdown **← Back to dashboards**
2. Use time picker (top right)
3. Or set in dashboard JSON: `"time": { "from": "now-24h", "to": "now" }`

### Add Custom Metrics

To add new panels:

1. Click **+ Add panel**
2. Enter PromQL query
3. Configure visualization
4. Save dashboard

### Export Dashboard

1. Click **Dashboard settings** (gear icon)
2. Click **Export**
3. Save JSON

## Alerting

### Setup Alert Notifications

1. Go to **Alerting → Notification channels**
2. Add channel (email, Slack, PagerDuty, etc.)
3. Configure:
   - Name: `Team Slack`
   - Type: `Slack`
   - Webhook URL: `https://hooks.slack.com/...`
4. Send test notification

### Create Alert Rules

1. In dashboard, edit panel
2. Go to **Alert** tab
3. Click **Create Alert**
4. Set condition:
   - Query: `histogram_quantile(0.95, http_request_duration_ms)`
   - Evaluator: `is above`
   - Threshold: `200`
   - For: `5m`
5. Add notification channel
6. Save

### Example Alert Conditions

```
# High error rate
rate(http_request_failed[5m]) / rate(http_requests_total[5m]) > 0.05

# High response time
histogram_quantile(0.95, http_request_duration_ms) > 200

# High memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85

# Database connection pool exhaustion
pg_stat_activity_count > 80
```

## Metrics Reference

### HTTP Metrics

```
http_requests_total              # Total HTTP requests
http_request_duration_ms         # Request duration histogram
http_request_failed              # Failed requests
http_requests_in_flight          # In-flight requests
http_request_size_bytes          # Request size
http_response_size_bytes         # Response size
```

### Application Metrics

```
calls_total                      # Total calls initiated
active_calls_total               # Currently active calls
call_duration_seconds            # Call duration histogram
consent_records_total            # Total consent records
consent_signatures_verified      # Verified signatures
errors_total                     # Total errors by type
```

### System Metrics

```
node_cpu_seconds_total           # CPU time
node_memory_MemAvailable_bytes   # Available memory
node_memory_MemTotal_bytes       # Total memory
node_filesystem_avail_bytes      # Available disk space
node_network_receive_bytes_total # Network received bytes
node_processes_running           # Running processes
```

### Database Metrics

```
pg_stat_activity_count           # Active connections
pg_stat_database_tup_returned    # Tuples returned
pg_stat_database_tup_inserted    # Tuples inserted
pg_stat_database_tup_updated     # Tuples updated
pg_stat_database_tup_deleted     # Tuples deleted
pg_stat_statements               # Query statistics
```

## Dashboard Usage

### For Team Leads

1. **Overview Dashboard** - Daily check (5 min)
2. Set alerts for error rate > 1%
3. Weekly performance review

### For Operations

1. **Performance Dashboard** - Continuous monitoring
2. **Database Dashboard** - Hourly checks
3. **Security Dashboard** - Daily review

### For Developers

1. **Performance Dashboard** - During development
2. Load testing against dashboard metrics
3. Set personal alerts for their code

### For Security Team

1. **Security Dashboard** - Daily + on-demand
2. Compliance reports (monthly)
3. Incident investigation

## Best Practices

✅ Keep dashboards focused (5-8 panels per dashboard)
✅ Use consistent color schemes
✅ Set appropriate time ranges
✅ Enable alerting for critical metrics
✅ Review and update dashboards quarterly
✅ Archive old/unused dashboards
✅ Document custom metrics
✅ Test alerts before production

## Troubleshooting

### Dashboard Not Showing Data

1. Verify Prometheus is running
2. Check data source configuration
3. Verify metrics are being collected
4. Check query syntax in Prometheus UI

### Missing Metrics

1. Verify application is exporting metrics
2. Check Prometheus scrape configuration
3. Check metric naming in queries
4. Increase scrape frequency if needed

### Performance Issues

1. Reduce dashboard panels
2. Increase time range (fewer data points)
3. Adjust Prometheus retention policy
4. Use recording rules for complex queries

## Advanced

### Recording Rules

Pre-compute expensive queries:

```yaml
# prometheus/rules.yml
groups:
  - name: webrtc_recording_rules
    interval: 30s
    rules:
      - record: instance:node_cpu:rate5m
        expr: rate(node_cpu_seconds_total[5m])

      - record: instance:requests_per_second
        expr: rate(http_requests_total[5m])

      - record: instance:error_rate
        expr: rate(http_request_failed[5m]) / rate(http_requests_total[5m])
```

### Dashboard as Code

Generate dashboards programmatically:

```python
# Python: grafonnet-py
from grafonnet import Dashboard, Graph, Target

dashboard = Dashboard(
    title="WebRTC",
    panels=[
        Graph(
            title="Requests/sec",
            targets=[
                Target(expr="rate(http_requests_total[5m])", legendFormat="{{method}}")
            ]
        )
    ]
).auto_panel_ids()

dashboard.to_json_file("dashboard.json")
```

## Resources

- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Prometheus Queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/)

---

**Last Updated**: 2025-11-17
**Grafana Version**: 8.0+
**Prometheus Version**: 2.30+
