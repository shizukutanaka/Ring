# Migration & Integration Guide

Complete guide for migrating from existing call recording systems or integrating with legacy applications.

## Overview

This guide covers:
- Migrating from other call recording systems
- Integrating with existing telecommunications infrastructure
- Data migration strategies
- Minimal downtime deployment
- Rollback procedures

---

## Phase 0: Pre-Migration Planning

### 1. Assessment

**Current System Inventory**
```bash
# Document existing system
- Recording platform: _____________
- Current capacity: _____________ calls/day
- Data storage: _____________ GB
- User count: _____________
- API integrations: _____________
- Geographic distribution: _____________
```

**Migration Scope**
- [ ] Full replacement or parallel setup?
- [ ] Gradual migration or big-bang?
- [ ] Data migration requirements
- [ ] API compatibility needs
- [ ] User notification strategy

### 2. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Call loss during migration | Medium | Critical | Parallel setup, gradual cutover |
| Consent data loss | Low | Critical | Full backup verification |
| User confusion | High | Medium | Documentation, training |
| Performance degradation | Medium | High | Load testing, capacity planning |

### 3. Timeline Planning

```
Week 1:     Setup & Testing
Week 2:     Parallel operation (5-10% traffic)
Week 3:     Gradual increase (25% → 50%)
Week 4:     Full migration with rollback ready
Week 5+:    Legacy system decommission
```

---

## Phase 1: Environment Preparation

### 1.1 Staging Environment Setup

```bash
# Create staging environment
docker-compose -f docker-compose-monitoring.yml up -d

# Verify services
curl http://localhost:3000/health
curl http://localhost:3001  # Grafana

# Load test capacity
cd tests && node load-test.js --duration 60000 --rps 100
```

### 1.2 Data Preparation

**Export from Current System**

```sql
-- Example: Export call records
SELECT
  call_id,
  initiator_id,
  recipient_id,
  started_at,
  ended_at,
  duration_seconds,
  recording_location
FROM calls
WHERE recorded_at >= '2025-01-01'
ORDER BY recorded_at DESC;

-- Export user consent records
SELECT
  call_id,
  user_id,
  consented,
  consent_method,
  recorded_at
FROM consent_records
WHERE recorded_at >= '2025-01-01';
```

**Data Validation Checklist**

```
- [ ] Total records count matches
- [ ] Date ranges are complete
- [ ] No missing foreign keys
- [ ] All required fields populated
- [ ] Encoding is consistent (UTF-8)
- [ ] Timestamps are in UTC
```

### 1.3 User Preparation

**Create Migration Plan**
```markdown
# User Communication Plan

## Week 1: Announcement
- Email: "New call recording system coming"
- FAQ: Common questions
- Support: Extra staff ready

## Week 2-3: Training
- Video tutorials
- Documentation links
- Live Q&A sessions

## Week 4: Cutover
- Final announcements
- Support availability increased
- Rollback plan ready
```

---

## Phase 2: Data Migration

### 2.1 Migration Strategy Options

#### Option A: Batch Migration (Recommended)

Migrate all historical data before cutover.

```bash
# 1. Export data
pg_dump -U olduser -h oldhost olddb > export.sql

# 2. Validate exported data
grep "^COPY" export.sql | wc -l

# 3. Import to new system
psql -U webrtc -h localhost webrtc_recorder < export.sql

# 4. Run integrity checks
node scripts/validate-migration.js
```

#### Option B: Streaming Migration

Migrate data gradually during parallel operation.

```javascript
// Migration worker
async function migrateCallBatch() {
  const oldCalls = await legacyDB.getCalls({
    limit: 1000,
    offset: lastMigratedId
  });

  for (const call of oldCalls) {
    await newDB.createCall(transformCall(call));
  }

  lastMigratedId += oldCalls.length;
}

// Run periodically
setInterval(migrateCallBatch, 60000);
```

#### Option C: Hybrid Approach

Keep reading from old system, write to new system.

```javascript
// During transition period
async function getCall(callId) {
  try {
    // Try new system first
    return await newDB.getCall(callId);
  } catch {
    // Fall back to old system
    return await legacyDB.getCall(callId);
  }
}
```

### 2.2 Consent Record Migration

**Critical: Validate Consent Data**

```sql
-- Verify all consent records migrated
SELECT COUNT(*) as total_records FROM consent_records;

-- Check for missing signatures
SELECT COUNT(*) as unsigned FROM consent_records
WHERE signature IS NULL;

-- Verify timestamps
SELECT COUNT(*) as no_timestamps FROM consent_records
WHERE recorded_at IS NULL;
```

**Add RFC3161 Timestamps to Migrated Records**

```javascript
async function addTimestampsToMigratedData() {
  const records = await db.query(
    'SELECT * FROM consent_records WHERE timestamp_token IS NULL'
  );

  for (const record of records) {
    const token = await tsa.getTimestamp(record.signature);
    await db.updateConsentRecord(record.id, { timestamp_token: token });
  }
}
```

### 2.3 Data Validation

Create `scripts/validate-migration.js`:

```javascript
const db = require('../server');

async function validateMigration() {
  console.log('🔍 Validating data migration...\n');

  // Check call counts
  const calls = await db.query('SELECT COUNT(*) FROM calls');
  console.log(`✓ Total calls: ${calls.rows[0].count}`);

  // Check consent records
  const consents = await db.query('SELECT COUNT(*) FROM consent_records');
  console.log(`✓ Total consent records: ${consents.rows[0].count}`);

  // Verify signatures
  const unsigned = await db.query(
    'SELECT COUNT(*) FROM consent_records WHERE signature IS NULL'
  );
  if (unsigned.rows[0].count > 0) {
    console.warn(`⚠ ${unsigned.rows[0].count} records without signatures`);
  }

  // Check for orphaned records
  const orphaned = await db.query(`
    SELECT COUNT(*) FROM consent_records
    WHERE call_id NOT IN (SELECT id FROM calls)
  `);
  if (orphaned.rows[0].count > 0) {
    console.warn(`⚠ ${orphaned.rows[0].count} orphaned consent records`);
  }

  console.log('\n✓ Validation complete');
}

validateMigration().catch(console.error);
```

---

## Phase 3: Parallel Operation

### 3.1 Gradual Traffic Shift

```
Old System → Load Balancer → Both Systems
                              ├─ Old System (90%)
                              └─ New System (10%)
```

**Week 1-2: 10% Traffic**
```nginx
upstream old_system {
  server old.example.com:3000;
}

upstream new_system {
  server new.example.com:3000;
}

server {
  listen 3000;

  location /api {
    if ($request_uri ~* "^/api/(calls|consent)" ) {
      # 10% to new system
      set $backend old_system;
      if ($msec % 10 < 1) {
        set $backend new_system;
      }
    }
    proxy_pass http://$backend;
  }
}
```

**Week 2-3: 50% Traffic**
```nginx
# Change modulo logic
if ($msec % 2 < 1) {
  set $backend new_system;
}
```

**Week 3-4: 90% Traffic**
```nginx
# Reverse the logic
if ($msec % 10 < 9) {
  set $backend new_system;
}
```

### 3.2 Monitoring During Migration

```bash
# Monitor both systems in parallel
# Terminal 1: Watch old system
watch 'curl http://old.example.com:3000/health | jq .'

# Terminal 2: Watch new system
watch 'curl http://new.example.com:3000/health | jq .'

# Terminal 3: Compare metrics
watch 'echo "Old:" && curl http://old:3000/metrics && \
       echo "New:" && curl http://new:3000/metrics'
```

---

## Phase 4: Cutover

### 4.1 Final Validation

**Pre-Cutover Checklist**

```bash
#!/bin/bash
echo "Pre-Cutover Checklist"
echo "===================="

# 1. Verify data consistency
node scripts/validate-migration.js

# 2. Run health checks
node scripts/health-check.js --verbose

# 3. Load test
cd tests && node load-test.js --duration 30000 --rps 200

# 4. Verify monitoring
curl http://localhost:3001/api/datasources  # Grafana

# 5. Check backups
ls -lah /backups/

echo "✓ All checks passed. Ready for cutover."
```

### 4.2 Cutover Execution

**Cutover Plan**

```
T-30 min: Final backup
T-15 min: Notify users
T-00 min: Switch DNS/Load Balancer
T+05 min: Verify all traffic on new system
T+30 min: Monitor for errors
T+60 min: Final validation
```

**DNS Update (if applicable)**

```bash
# Update DNS to point to new system
nslookup api.example.com
# Should resolve to new.example.com IP

# Verify propagation
dig api.example.com @8.8.8.8
```

**Load Balancer Update**

```nginx
# Old nginx config
upstream backend {
  server old.example.com:3000;
}

# New nginx config
upstream backend {
  server new.example.com:3000;
}

# Reload without downtime
nginx -s reload
```

### 4.3 Cutover Monitoring

```bash
# Real-time monitoring script
#!/bin/bash

INTERVAL=5
THRESHOLD_ERROR_RATE=0.05
THRESHOLD_LATENCY=500

while true; do
  echo "=== $(date) ==="

  # Check metrics
  METRICS=$(curl -s http://localhost:3000/metrics)

  ERROR_RATE=$(echo "$METRICS" | grep error_rate | tail -1 | awk '{print $2}')
  LATENCY=$(echo "$METRICS" | grep response_time_p95 | tail -1 | awk '{print $2}')

  echo "Error Rate: $ERROR_RATE"
  echo "P95 Latency: ${LATENCY}ms"

  # Alert if thresholds exceeded
  if (( $(echo "$ERROR_RATE > $THRESHOLD_ERROR_RATE" | bc -l) )); then
    echo "⚠️  ERROR: High error rate!"
    # Trigger rollback
  fi

  if (( $(echo "$LATENCY > $THRESHOLD_LATENCY" | bc -l) )); then
    echo "⚠️  ERROR: High latency!"
    # Trigger rollback
  fi

  sleep $INTERVAL
done
```

---

## Phase 5: Post-Migration

### 5.1 Monitoring and Validation

```javascript
// Run post-migration audit
async function postMigrationAudit() {
  const stats = {
    calls_total: await countCalls(),
    calls_with_recordings: await countRecordedCalls(),
    consent_records: await countConsentRecords(),
    unsigned_consents: await countUnsignedConsents(),
    average_call_duration: await getAverageDuration(),
    error_rate_24h: await getErrorRate(),
  };

  return stats;
}
```

### 5.2 Data Reconciliation

```sql
-- Compare record counts
SELECT
  'old' as system,
  COUNT(*) as total
FROM old_system_calls
UNION ALL
SELECT
  'new',
  COUNT(*)
FROM calls;

-- Check for discrepancies
SELECT call_id, old_count, new_count
FROM (
  SELECT call_id, COUNT(*) as old_count FROM old_calls GROUP BY call_id
) old
FULL OUTER JOIN (
  SELECT call_id, COUNT(*) as new_count FROM calls GROUP BY call_id
) new USING (call_id)
WHERE old_count != new_count;
```

### 5.3 User Communication

```markdown
# Post-Migration Update

## What Changed
- Improved performance: 40% faster response times
- Better monitoring: Real-time dashboards
- Enhanced compliance: Automatic legal updates

## Support
- Help Center: https://...
- Live Chat: Available 9am-5pm EST
- Email: support@...

## Feedback
- We'd love to hear from you!
- Survey: https://...
```

### 5.4 Legacy System Decommission

```bash
#!/bin/bash
# After 4 weeks of successful operation

# 1. Final backup
pg_dump -U olduser -h oldhost olddb > final_backup_$(date +%Y%m%d).sql

# 2. Archive backup
tar -czf legacy_backup_$(date +%Y%m%d).tar.gz final_backup_*.sql

# 3. Shut down old system
systemctl stop old-call-recorder

# 4. Document decommission
echo "Legacy system decommissioned: $(date)" >> CHANGELOG.md

# 5. Update DNS (remove old records after TTL)
```

---

## Phase 6: Rollback Procedures

### 6.1 Emergency Rollback

If issues occur during migration:

```bash
#!/bin/bash
# Immediate rollback script

echo "🚨 Starting emergency rollback..."

# 1. Switch load balancer back to old system
sed -i 's/new.example.com/old.example.com/g' /etc/nginx/nginx.conf
nginx -s reload

# 2. Notify users
curl -X POST https://notify.example.com/alert \
  -d "Emergency rollback in progress"

# 3. Start old system services
systemctl start old-call-recorder

# 4. Verify old system is responding
sleep 5
curl http://old.example.com:3000/health

echo "✓ Rollback complete"
```

### 6.2 Rollback Decision Matrix

| Symptom | Impact | Decision |
|---------|--------|----------|
| Error rate > 5% | Critical | Rollback immediately |
| Latency > 1s | High | Investigate, then decide |
| Data corruption detected | Critical | Rollback immediately |
| User reports missing data | Critical | Rollback immediately |
| Consent signature failures | Critical | Rollback immediately |

---

## Integration Patterns

### API-to-API Integration

```typescript
// Integrate with existing API
const client = new WebRTCCallRecorderClient('http://new.example.com');

// Create call wrapper that matches old API
async function initiateCall(recipientPhone: string) {
  // Map phone to user ID
  const userId = await phoneToUserIdMapping(recipientPhone);

  // Create call via new API
  const call = await client.initiateCall(userId);

  // Return in old API format for compatibility
  return {
    call_id: call.id,
    status: call.status,
    created_at: call.started_at
  };
}
```

### Message Queue Integration

```javascript
// For event-driven systems
const amqp = require('amqplib');

async function setupIntegration() {
  const connection = await amqp.connect('amqp://rabbitmq:5672');
  const channel = await connection.createChannel();

  // Subscribe to call events
  await channel.assertQueue('call_events');
  channel.consume('call_events', async (msg) => {
    const event = JSON.parse(msg.content.toString());

    // Forward to new system
    await client.initiateCall(event.recipient_id);

    channel.ack(msg);
  });
}
```

### Webhook Integration

```javascript
// Existing system sends webhooks to new system
app.post('/api/webhooks/call-initiated', async (req, res) => {
  const { recipient_id, metadata } = req.body;

  try {
    const call = await client.initiateCall(recipient_id);
    res.json({ success: true, call_id: call.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Performance Considerations

### Capacity Planning

```
Current Load:  500 calls/day
New System:    600+ RPS capacity (5.18M calls/day)
Safety Factor: 10x headroom

Recommendation: Safe to migrate
```

### Database Tuning for Migration

```sql
-- Optimize for bulk inserts during migration
ALTER TABLE calls SET UNLOGGED;  -- Faster writes
DISABLE TRIGGER ALL;             -- Skip triggers

-- After migration complete
ALTER TABLE calls SET LOGGED;
ENABLE TRIGGER ALL;
VACUUM ANALYZE;                  -- Update statistics
```

---

## Troubleshooting

### Common Issues & Solutions

**Issue: Data mismatch between old and new systems**

```bash
# Identify discrepancies
node scripts/validate-migration.js > validation_report.json

# Check specific records
psql -c "SELECT * FROM calls WHERE id = 'xxx'"
psql -c "SELECT * FROM old_calls WHERE id = 'xxx'"

# Resync if needed
node scripts/resync-specific-records.js --record-ids xxx,yyy,zzz
```

**Issue: Performance degradation after cutover**

```bash
# Check slow queries
psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"

# Add missing indexes
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_consent_call_id ON consent_records(call_id);

# Analyze query plans
EXPLAIN ANALYZE SELECT * FROM calls WHERE status = 'ended' LIMIT 100;
```

**Issue: User data loss reported**

```bash
# Check database integrity
psql -c "SELECT * FROM pg_stat_user_tables ORDER BY last_vacuum;"

# Restore from backup if needed
pg_restore -d webrtc_recorder backup_$(date +%Y%m%d).sql
```

---

## Checklist

### Pre-Migration
- [ ] Environment prepared and tested
- [ ] Data export validated
- [ ] Users notified and trained
- [ ] Rollback plan documented
- [ ] Backups verified

### During Migration
- [ ] Parallel systems running correctly
- [ ] Traffic gradually shifted
- [ ] Monitoring alerts configured
- [ ] Support team staffed
- [ ] Issues logged and tracked

### Post-Migration
- [ ] Data reconciliation complete
- [ ] Users confirmed no data loss
- [ ] Performance meets targets
- [ ] Legacy system decommissioned
- [ ] Documentation updated

---

**Migration Duration**: 4-6 weeks
**Risk Level**: Low (with proper planning)
**Team Required**: 2-3 engineers + support staff

For assistance, contact: migration-support@example.com

---

**Last Updated**: 2025-11-17
