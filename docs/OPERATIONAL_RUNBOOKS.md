# Operational Runbooks

Step-by-step procedures for daily operations, incident response, and maintenance.

---

## Runbook 1: Daily Operations

### Morning Health Check (8:00 AM)

**Duration**: 5 minutes | **Owner**: Operations Team

```bash
#!/bin/bash
# daily-morning-check.sh

echo "=== Daily Morning Health Check ==="
echo "Started: $(date)"

# 1. Check system services
echo "1. Checking services..."
systemctl is-active webrtc-recorder || systemctl start webrtc-recorder
systemctl is-active postgresql || systemctl start postgresql
systemctl is-active nginx || systemctl start nginx
systemctl is-active prometheus || systemctl start prometheus
systemctl is-active grafana-server || systemctl start grafana-server

# 2. Check application health
echo "2. Checking application..."
HEALTH=$(curl -s http://localhost:3000/health | jq '.status')
if [ "$HEALTH" != '"healthy"' ]; then
  echo "✗ Application unhealthy!"
  systemctl restart webrtc-recorder
  sleep 5
  HEALTH=$(curl -s http://localhost:3000/health | jq '.status')
  if [ "$HEALTH" != '"healthy"' ]; then
    notify_emergency "Application failed to recover"
    exit 1
  fi
fi
echo "✓ Application healthy"

# 3. Check database
echo "3. Checking database..."
psql -U webrtc -d webrtc_recorder -c "SELECT 1" > /dev/null || {
  echo "✗ Database connection failed!"
  notify_emergency "Database unreachable"
  exit 1
}
echo "✓ Database accessible"

# 4. Check disk space
echo "4. Checking disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
  echo "⚠ Disk usage: $DISK_USAGE%"
  notify_alert "Disk usage high: $DISK_USAGE%"
fi
echo "✓ Disk usage: $DISK_USAGE%"

# 5. Check recent errors
echo "5. Checking recent errors..."
ERROR_COUNT=$(curl -s http://localhost:3000/metrics | grep "errors_total" | awk '{print $2}')
echo "  Recent errors: $ERROR_COUNT"

# 6. Backup status
echo "6. Checking backups..."
LAST_BACKUP=$(ls -t /mnt/backups/webrtc_backup_*.sql.gz 2>/dev/null | head -1)
if [ -z "$LAST_BACKUP" ]; then
  echo "✗ No backup found!"
  notify_emergency "Backup missing"
  exit 1
fi
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))
if [ $BACKUP_AGE -gt 30 ]; then
  echo "⚠ Backup is $BACKUP_AGE hours old"
  notify_alert "Backup is stale"
else
  echo "✓ Last backup: $BACKUP_AGE hours ago"
fi

echo "=== Health Check Complete ==="
echo "Completed: $(date)"
```

### Hourly Monitoring (Every Hour)

**Duration**: 2 minutes | **Owner**: Automated Monitoring

```javascript
// monitoring/hourly-check.js
async function hourlyMonitoringCheck() {
  const checks = [];

  // 1. API availability
  try {
    const health = await fetch('http://localhost:3000/health').then(r => r.json());
    checks.push({
      check: 'API Health',
      status: health.status === 'healthy' ? 'PASS' : 'FAIL',
      timestamp: new Date()
    });
  } catch (error) {
    checks.push({
      check: 'API Health',
      status: 'FAIL',
      error: error.message,
      timestamp: new Date()
    });
  }

  // 2. Database connections
  try {
    const result = await db.query('SELECT COUNT(*) FROM calls');
    checks.push({
      check: 'Database',
      status: 'PASS',
      details: `${result.rows[0].count} calls in database`
    });
  } catch (error) {
    checks.push({
      check: 'Database',
      status: 'FAIL',
      error: error.message
    });
  }

  // 3. Memory usage
  const memUsage = process.memoryUsage();
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.push({
    check: 'Memory',
    status: heapUsagePercent > 85 ? 'WARN' : 'PASS',
    details: `Heap: ${heapUsagePercent.toFixed(1)}%`
  });

  // 4. Replication lag
  try {
    const lag = await db.query(`
      SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int as lag_seconds
    `);
    const lagSeconds = lag.rows[0].lag_seconds;
    checks.push({
      check: 'Replication',
      status: lagSeconds > 300 ? 'WARN' : 'PASS',
      details: `Lag: ${lagSeconds}s`
    });
  } catch (error) {
    checks.push({
      check: 'Replication',
      status: 'N/A',
      details: 'Not configured'
    });
  }

  // Log results
  const failedChecks = checks.filter(c => c.status === 'FAIL');
  if (failedChecks.length > 0) {
    logger.error('Hourly check failures:', failedChecks);
    alerting.notify('Hourly checks failed', { checks: failedChecks });
  } else {
    logger.info('Hourly checks passed', { checks });
  }

  return checks;
}

// Run hourly
setInterval(hourlyMonitoringCheck, 60 * 60 * 1000);
```

### End-of-Day Report (5:00 PM)

**Duration**: 5 minutes | **Owner**: Operations Team

```bash
#!/bin/bash
# daily-eod-report.sh

echo "=== End-of-Day Report ==="
echo "Generated: $(date)"

# Summary of the day
echo ""
echo "Daily Statistics:"

# Total calls
TOTAL_CALLS=$(psql -t -U webrtc -d webrtc_recorder \
  -c "SELECT COUNT(*) FROM calls WHERE DATE(started_at) = CURRENT_DATE")
echo "  Calls today: $TOTAL_CALLS"

# Successful calls
SUCCESSFUL=$(psql -t -U webrtc -d webrtc_recorder \
  -c "SELECT COUNT(*) FROM calls WHERE DATE(started_at) = CURRENT_DATE AND status = 'ended'")
echo "  Successful: $SUCCESSFUL"

# Average duration
AVG_DURATION=$(psql -t -U webrtc -d webrtc_recorder \
  -c "SELECT ROUND(AVG(duration_seconds)::numeric, 1) FROM calls WHERE DATE(started_at) = CURRENT_DATE")
echo "  Avg duration: ${AVG_DURATION}s"

# Consent records
CONSENTS=$(psql -t -U webrtc -d webrtc_recorder \
  -c "SELECT COUNT(*) FROM consent_records WHERE DATE(recorded_at) = CURRENT_DATE")
echo "  Consent records: $CONSENTS"

# Error rate
ERROR_RATE=$(curl -s http://localhost:3000/metrics | grep "error_rate" | awk '{print $2}')
echo "  Error rate: $ERROR_RATE"

# Performance
LATENCY=$(curl -s http://localhost:3000/metrics | grep "response_time_p95" | awk '{print $2}')
echo "  P95 latency: ${LATENCY}ms"

# Send report
send_email "daily-report@example.com" << EOF
Daily Operations Report
Generated: $(date)

Statistics:
- Calls: $TOTAL_CALLS
- Success: $SUCCESSFUL
- Avg Duration: ${AVG_DURATION}s
- Consents: $CONSENTS
- Error Rate: $ERROR_RATE
- P95 Latency: ${LATENCY}ms

All systems operating normally.
EOF

echo "=== Report Complete ==="
```

---

## Runbook 2: Incident Response

### Incident Priority Levels

| Level | Impact | RTO | Example |
|-------|--------|-----|---------|
| P1 (Critical) | Complete outage | 15 min | All users affected, no access |
| P2 (High) | Significant degradation | 1 hour | 25%+ users affected, slow |
| P3 (Medium) | Limited impact | 4 hours | <10% users affected |
| P4 (Low) | Minor issue | 24 hours | Individual user issue |

### P1: Complete System Outage

**Duration**: 30 minutes to recover | **Owner**: Emergency Team

```bash
#!/bin/bash
# incident-response-p1.sh

set -e

echo "=== P1 INCIDENT RESPONSE: SYSTEM OUTAGE ==="
echo "Time: $(date)"

# Phase 1: Assessment (1 min)
echo "[Phase 1] Assessing situation..."

# Check if services are up
SERVICES=("webrtc-recorder" "postgresql" "nginx" "prometheus")
for service in "${SERVICES[@]}"; do
  STATUS=$(systemctl is-active $service)
  echo "  $service: $STATUS"
done

# Phase 2: Emergency Actions (5 min)
echo "[Phase 2] Taking emergency actions..."

# 2.1 Try service restart
echo "  2.1 Restarting services..."
systemctl restart webrtc-recorder
sleep 5

# 2.2 Check if recovered
HEALTH=$(curl -s http://localhost:3000/health | jq '.status' 2>/dev/null)
if [ "$HEALTH" = '"healthy"' ]; then
  echo "  ✓ System recovered after restart"
  # Send recovery notification
  notify "RESOLVED: System recovered after restart"
  exit 0
fi

# Phase 3: Database Recovery (15 min)
echo "[Phase 3] Database recovery..."

# 3.1 Check database status
psql -U webrtc -d webrtc_recorder -c "SELECT 1" 2>/dev/null || {
  echo "  Database unreachable, checking file system..."

  # 3.2 Check disk space
  DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
  if [ $DISK_USAGE -gt 95 ]; then
    echo "  ✗ DISK FULL! Manual intervention required"
    notify_emergency "DISK FULL - Manual intervention required"
    exit 1
  fi

  # 3.3 Try PostgreSQL recovery
  echo "  Attempting PostgreSQL recovery..."
  systemctl restart postgresql
  sleep 10

  psql -U webrtc -d webrtc_recorder -c "SELECT 1" || {
    echo "  ✗ Database still unreachable"
    # Fall back to standby
    echo "  Failing over to standby..."
    switchto_standby
    exit 0
  }
}

echo "  ✓ Database recovered"

# Phase 4: Verification (5 min)
echo "[Phase 4] Verifying recovery..."

# 4.1 Health check
HEALTH=$(curl -s http://localhost:3000/health)
echo "  Health: $HEALTH"

# 4.2 Data validation
CALL_COUNT=$(psql -t -U webrtc -d webrtc_recorder -c "SELECT COUNT(*) FROM calls")
echo "  Call records: $CALL_COUNT"

# 4.3 Metrics check
METRICS=$(curl -s http://localhost:3000/metrics)
echo "  Metrics: OK"

# Phase 5: Notification
echo "[Phase 5] Notifying users..."

notify "RESOLVED: System outage resolved at $(date)"
send_status_page_update "System operational"

echo "=== INCIDENT CLOSED ==="
```

### P2: Database Performance Degradation

**Duration**: 5-10 minutes | **Owner**: Database Team

```bash
#!/bin/bash
# incident-response-p2-db.sh

echo "=== P2 INCIDENT: DATABASE PERFORMANCE ==="

# Phase 1: Identify slow queries
echo "[Phase 1] Identifying slow queries..."

psql -U postgres -d webrtc_recorder << SQL
  SELECT
    query,
    calls,
    mean_time::numeric(10,2) as avg_time_ms,
    max_time::numeric(10,2) as max_time_ms
  FROM pg_stat_statements
  WHERE mean_time > 100
  ORDER BY mean_time DESC
  LIMIT 10;
SQL

# Phase 2: Kill long-running queries
echo "[Phase 2] Killing long-running queries..."

psql -U postgres -d webrtc_recorder << SQL
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'webrtc_recorder'
    AND state = 'active'
    AND query_start < now() - INTERVAL '10 minutes'
    AND usename != 'postgres';
SQL

# Phase 3: Analyze tables
echo "[Phase 3] Analyzing tables..."

psql -U postgres -d webrtc_recorder << SQL
  ANALYZE calls;
  ANALYZE consent_records;
  ANALYZE users;
SQL

# Phase 4: Rebuild indexes if needed
echo "[Phase 4] Checking index efficiency..."

psql -U postgres -d webrtc_recorder << SQL
  REINDEX TABLE CONCURRENTLY calls;
  REINDEX TABLE CONCURRENTLY consent_records;
SQL

# Phase 5: Verify performance
echo "[Phase 5] Verifying performance..."

LATENCY=$(curl -s http://localhost:3000/metrics | grep response_time_p95 | awk '{print $2}')
echo "P95 Latency: ${LATENCY}ms"

if (( $(echo "$LATENCY < 500" | bc -l) )); then
  echo "✓ Performance recovered"
  notify "RESOLVED: Database performance normalized"
else
  echo "⚠ Performance still degraded, may need scaling"
  notify "P2: Database performance degraded, investigating..."
fi
```

### P3: API Error Rate High

**Duration**: 15 minutes | **Owner**: Platform Team

```bash
#!/bin/bash
# incident-response-p3-errors.sh

echo "=== P3 INCIDENT: HIGH ERROR RATE ==="

# Phase 1: Measure error rate
echo "[Phase 1] Measuring current error rate..."

ERROR_RATE=$(curl -s http://localhost:3000/metrics | grep "error_rate" | awk '{print $2}')
echo "Current error rate: $ERROR_RATE"

# Phase 2: Check error logs
echo "[Phase 2] Analyzing recent errors..."

journalctl -u webrtc-recorder -n 50 --no-pager | grep -i error

# Phase 3: Check resource utilization
echo "[Phase 3] Checking resource utilization..."

# Memory
MEMORY=$(free | grep Mem | awk '{printf("%.1f%%", ($3/$2)*100)}')
echo "Memory: $MEMORY"

# CPU
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
echo "CPU: $CPU"

# Phase 4: If resources constrained, restart
if (( $(echo "$MEMORY > 85" | bc -l) )); then
  echo "Memory high, restarting application..."
  systemctl restart webrtc-recorder
  sleep 5
fi

# Phase 5: Verify error rate dropped
echo "[Phase 5] Verifying error rate..."

NEW_ERROR_RATE=$(curl -s http://localhost:3000/metrics | grep "error_rate" | awk '{print $2}')
echo "Error rate after remediation: $NEW_ERROR_RATE"

if (( $(echo "$NEW_ERROR_RATE < 0.01" | bc -l) )); then
  echo "✓ Error rate normalized"
  notify "RESOLVED: Error rate normalized"
else
  echo "⚠ Error rate still high, escalating..."
  notify_escalate "Error rate remains high: $NEW_ERROR_RATE"
fi
```

---

## Runbook 3: Maintenance & Upgrades

### Database Maintenance Window

**Duration**: 30-60 minutes | **Owner**: Database Team | **Downtime**: 5 minutes

```bash
#!/bin/bash
# maintenance-database.sh

echo "=== DATABASE MAINTENANCE WINDOW ==="
echo "Start time: $(date)"

# Phase 1: Notification (5 min before)
echo "[Phase 1] Notifying users..."
notify "Scheduled maintenance starting in 5 minutes"

# Phase 2: Quiesce requests
echo "[Phase 2] Quiescing requests..."
# Set service to drain connections
systemctl set-environment MAINTENANCE_MODE=true

# Wait for active requests to complete
sleep 30

# Phase 3: Backup
echo "[Phase 3] Creating backup..."
pg_dump -U postgres -d webrtc_recorder --compress=9 > \
  "/backups/pre_maintenance_$(date +%Y%m%d_%H%M%S).sql.gz"

# Phase 4: Maintenance tasks
echo "[Phase 4] Running maintenance tasks..."

psql -U postgres -d webrtc_recorder << SQL
  -- Vacuum
  VACUUM FULL;

  -- Reindex
  REINDEX DATABASE webrtc_recorder;

  -- Analyze
  ANALYZE;

  -- Check table bloat
  SELECT schemaname, tablename, ROUND(100 * (OTTA::numeric / CASE WHEN otta = 0 THEN 1 ELSE otta END)) AS table_waste_ratio
  FROM pgstattuple('calls');
SQL

# Phase 5: Restore normal operations
echo "[Phase 5] Restoring normal operations..."
systemctl unset-environment MAINTENANCE_MODE
systemctl restart webrtc-recorder

# Phase 6: Verification
echo "[Phase 6] Verifying..."
sleep 5
HEALTH=$(curl -s http://localhost:3000/health)
echo "Health status: $HEALTH"

# Phase 7: Notification
echo "[Phase 7] Notifying users of completion..."
notify "Maintenance complete, system operational"

echo "=== MAINTENANCE COMPLETE ==="
echo "End time: $(date)"
```

### Application Version Upgrade

**Duration**: 15-30 minutes | **Owner**: Engineering Team | **Downtime**: 2-5 minutes

```bash
#!/bin/bash
# upgrade-application.sh

TARGET_VERSION="$1"

if [ -z "$TARGET_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "=== APPLICATION UPGRADE ==="
echo "Target version: $TARGET_VERSION"
echo "Start time: $(date)"

# Phase 1: Pre-upgrade checks
echo "[Phase 1] Pre-upgrade checks..."
git fetch origin
git diff origin/main..origin/$TARGET_VERSION --stat

# Phase 2: Backup
echo "[Phase 2] Creating backup..."
tar -czf /backups/app_backup_$(date +%s).tar.gz /opt/webrtc-recorder

# Phase 3: Download and verify
echo "[Phase 3] Downloading new version..."
cd /tmp
git clone --branch $TARGET_VERSION https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder

# Verify integrity
npm test

# Phase 4: Stop application
echo "[Phase 4] Stopping application..."
systemctl stop webrtc-recorder

# Phase 5: Install new version
echo "[Phase 5] Installing new version..."
npm install
npm run build

# Phase 6: Database migrations
echo "[Phase 6] Running migrations..."
npm run migrate

# Phase 7: Start application
echo "[Phase 7] Starting application..."
systemctl start webrtc-recorder

# Phase 8: Verify
echo "[Phase 8] Verifying..."
sleep 10
HEALTH=$(curl -s http://localhost:3000/health)
VERSION=$(curl -s http://localhost:3000/api/version)

if [ "$(echo $HEALTH | jq '.status')" = '"healthy"' ]; then
  echo "✓ Upgrade successful"
  notify "Application upgraded to $TARGET_VERSION"
else
  echo "✗ Upgrade failed, rolling back..."
  systemctl stop webrtc-recorder
  tar -xzf /backups/app_backup_latest.tar.gz -C /
  systemctl start webrtc-recorder
  notify_emergency "Upgrade failed and rolled back"
  exit 1
fi

echo "=== UPGRADE COMPLETE ==="
echo "Version: $VERSION"
echo "End time: $(date)"
```

---

## Appendix: Contact Information

**Escalation Chain**
```
Level 1: On-Call Engineer
Level 2: Platform Lead
Level 3: Engineering Manager
Level 4: CTO
```

**Critical Services**
```
- API Server: api.example.com:3000
- Database: db.example.com:5432
- Monitoring: monitoring.example.com
- Dashboard: app.example.com
```

**Emergency Procedures**
```
Critical Issue: Call #911 or ops@example.com
Security Issue: security@example.com
Page On-Call: use PagerDuty
```

---

**Last Updated**: 2025-11-17
**Document Owner**: Operations Team
