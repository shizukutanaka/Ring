# Disaster Recovery & Backup Guide

Comprehensive disaster recovery and business continuity procedures for WebRTC Call Recorder.

## Overview

This guide covers:
- Backup strategies and schedules
- Recovery procedures
- Disaster response plans
- Business continuity
- Testing and validation

**RTO (Recovery Time Objective)**: 1 hour
**RPO (Recovery Point Objective)**: 15 minutes

---

## 1. Backup Strategy

### 1.1 Multi-Tier Backup Approach

```
┌──────────────────────────────────────────┐
│     Data Loss Scenarios                   │
├──────────────────────────────────────────┤
│                                          │
│  Scenario 1: Single Record Loss          │
│  Recovery: Database backup (Latest)      │
│  RTO: 5 minutes                          │
│                                          │
│  Scenario 2: Data Corruption             │
│  Recovery: Full database backup          │
│  RTO: 30 minutes                         │
│                                          │
│  Scenario 3: Complete System Failure     │
│  Recovery: Geo-replicated backup + DR    │
│  RTO: 1 hour                             │
│                                          │
│  Scenario 4: Ransomware/Malicious        │
│  Recovery: Air-gapped backup (monthly)   │
│  RTO: 2-4 hours                          │
└──────────────────────────────────────────┘
```

### 1.2 Backup Types

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| Full Backup | Daily (2am UTC) | 7 days | Complete system state |
| Incremental | Every 4 hours | 2 days | Quick recovery |
| WAL Archives | Continuous | 30 days | Point-in-time recovery |
| Application Snapshots | Hourly | 24 hours | App-level recovery |
| Air-gapped | Monthly | 1 year | Protection against ransomware |

### 1.3 Database Backups

**Automated Daily Backup Script**

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/mnt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="webrtc_backup_$TIMESTAMP.sql.gz"

# Create backup
pg_dump \
  -h localhost \
  -U webrtc \
  -d webrtc_recorder \
  --verbose \
  --compress=9 \
  --exclude-table-data='audit_logs' \
  > "$BACKUP_DIR/$BACKUP_FILE"

# Verify backup
pg_restore -d test_webrtc_recorder -l "$BACKUP_DIR/$BACKUP_FILE" > /dev/null
if [ $? -eq 0 ]; then
  echo "✓ Backup successful: $BACKUP_FILE"
  # Log success
  echo "$(date): Backup successful" >> /var/log/backup.log
else
  echo "✗ Backup verification failed!"
  # Alert
  curl -X POST https://alerts.example.com \
    -d "Backup verification failed for $TIMESTAMP"
  exit 1
fi

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" \
  s3://backups.example.com/database/$(date +%Y/%m/%d)/ \
  --storage-class GLACIER

# Clean old backups (keep 7 days)
find "$BACKUP_DIR" -name "webrtc_backup_*.sql.gz" -mtime +7 -delete
```

**Schedule with Cron**

```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/backup.log 2>&1
```

### 1.4 WAL Archiving (Point-in-Time Recovery)

```bash
# Enable WAL archiving in PostgreSQL
sudo vi /etc/postgresql/15/main/postgresql.conf
```

```ini
# Add these settings
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'
archive_timeout = 300
max_wal_senders = 10
wal_keep_segments = 64
```

**Upload WAL to S3**

```bash
#!/bin/bash
# upload-wal.sh

AWS_BUCKET="s3://backups.example.com/wal"
WAL_DIR="/mnt/wal_archive"

# Compress and upload WAL files
for file in "$WAL_DIR"/*; do
  if [ -f "$file" ]; then
    gzip "$file"
    aws s3 cp "$file.gz" "$AWS_BUCKET/$(date +%Y/%m/%d)/"
    rm "$file.gz"
  fi
done
```

---

## 2. Recovery Procedures

### 2.1 Recovery from Full Backup

**Scenario: Database corrupted, need full restore**

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE="$1"  # e.g., webrtc_backup_20251117_020000.sql.gz

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "Starting database restore from $BACKUP_FILE..."

# Step 1: Stop application
systemctl stop webrtc-recorder

# Step 2: Create temporary database
createdb -U postgres webrtc_recorder_tmp

# Step 3: Restore from backup
pg_restore \
  -d webrtc_recorder_tmp \
  -U postgres \
  -v \
  "$BACKUP_FILE"

if [ $? -ne 0 ]; then
  echo "✗ Restore failed!"
  dropdb -U postgres webrtc_recorder_tmp
  exit 1
fi

# Step 4: Verify data integrity
psql -U postgres -d webrtc_recorder_tmp -c \
  "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public'"

# Step 5: Swap databases
psql -U postgres -c "ALTER DATABASE webrtc_recorder RENAME TO webrtc_recorder_old"
psql -U postgres -c "ALTER DATABASE webrtc_recorder_tmp RENAME TO webrtc_recorder"

# Step 6: Start application
systemctl start webrtc-recorder

# Step 7: Verify application is working
sleep 5
curl http://localhost:3000/health

if [ $? -eq 0 ]; then
  echo "✓ Database restore successful"
  # Clean up old database after 24 hours
  psql -U postgres -c "DROP DATABASE webrtc_recorder_old"
else
  echo "✗ Application verification failed, rolling back..."
  psql -U postgres -c "ALTER DATABASE webrtc_recorder RENAME TO webrtc_recorder_tmp"
  psql -U postgres -c "ALTER DATABASE webrtc_recorder_old RENAME TO webrtc_recorder"
  systemctl start webrtc-recorder
  dropdb -U postgres webrtc_recorder_tmp
  exit 1
fi
```

### 2.2 Point-in-Time Recovery (PITR)

**Recover to a specific timestamp**

```bash
#!/bin/bash
# pitr-recovery.sh

TARGET_TIME="2025-11-17 14:30:00"

echo "Starting PITR to $TARGET_TIME..."

# Step 1: Stop application
systemctl stop webrtc-recorder

# Step 2: Create recovery database
createdb -U postgres webrtc_recovery

# Step 3: Restore base backup
pg_restore -d webrtc_recovery -U postgres webrtc_backup_latest.sql.gz

# Step 4: Create recovery.conf
cat > /mnt/recovery.conf << EOF
recovery_target_name = 'before_corruption'
recovery_target_inclusive = false
recovery_target_timeline = 'latest'
restore_command = 'cp /mnt/wal_archive/%f %p'
EOF

# Step 5: Start recovery
pg_ctl -D /var/lib/postgresql/15/main -l /tmp/recovery.log start

# Monitor recovery progress
tail -f /tmp/recovery.log

# Step 6: Switch back to normal mode
touch /var/lib/postgresql/15/main/recovery.done

# Step 7: Verify and rename
psql -U postgres -c "ALTER DATABASE webrtc_recovery RENAME TO webrtc_recorder_recovered"
```

### 2.3 Application Backup Recovery

**Restore application configuration**

```bash
#!/bin/bash
# restore-application.sh

APP_BACKUP="app_backup_20251117.tar.gz"

echo "Restoring application from $APP_BACKUP..."

# Stop application
systemctl stop webrtc-recorder

# Backup current application
tar -czf /backups/app_current_$(date +%s).tar.gz /opt/webrtc-recorder

# Restore from backup
tar -xzf "/backups/$APP_BACKUP" -C /opt/

# Restart application
systemctl start webrtc-recorder

# Verify
curl http://localhost:3000/health
```

---

## 3. Geo-Replication Setup

### 3.1 PostgreSQL Replication

**On Primary Server**

```bash
# postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_segments = 64

# Create replication user
createuser -U postgres -P -e --replication replication
```

**On Standby Server**

```bash
# Create standby from backup
pg_basebackup -h primary.example.com \
  -D /var/lib/postgresql/15/main \
  -U replication \
  -P -v -R \
  -W

# Configure recovery (recovery.conf or postgresql.auto.conf)
primary_conninfo = 'host=primary.example.com port=5432 user=replication password=xxxxx'
```

### 3.2 Data Synchronization Monitoring

```sql
-- Check replication lag on primary
SELECT client_addr, slot_name, restart_lsn,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as replication_lag_bytes
FROM pg_stat_replication;

-- Monitor on standby
SELECT pg_last_wal_receive_lsn() as receive_lsn,
  pg_last_wal_replay_lsn() as replay_lsn,
  now() - pg_last_xact_replay_timestamp() as replication_delay;
```

---

## 4. Application-Level Backups

### 4.1 Backup Call Data

```javascript
// backup-service.js
const fs = require('fs');
const db = require('./index.js');

async function backupCallData() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFile = `backups/calls_${timestamp}.ndjson`;

  const stream = fs.createWriteStream(backupFile);

  // Stream calls in batches
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const calls = await db.query(`
      SELECT * FROM calls
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [batchSize, offset]);

    if (calls.rows.length === 0) break;

    calls.rows.forEach(call => {
      stream.write(JSON.stringify(call) + '\n');
    });

    offset += batchSize;
  }

  stream.end();

  // Upload to S3
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3();
  const fileContent = fs.readFileSync(backupFile);

  await s3.putObject({
    Bucket: 'backups.example.com',
    Key: `calls/${timestamp}.ndjson.gz`,
    Body: fileContent,
    ServerSideEncryption: 'AES256'
  }).promise();

  console.log('✓ Call data backup complete');
}

// Schedule daily
setInterval(backupCallData, 24 * 60 * 60 * 1000);
```

### 4.2 Backup Consent Records

```javascript
async function backupConsentRecords() {
  const timestamp = new Date().toISOString().split('T')[0];
  const query = `
    SELECT cr.*, c.initiator_id, c.recipient_id
    FROM consent_records cr
    JOIN calls c ON cr.call_id = c.id
    WHERE cr.recorded_at >= NOW() - INTERVAL '1 day'
  `;

  const records = await db.query(query);

  // Sign backup file for integrity
  const crypto = require('crypto');
  const signature = crypto.sign('sha256', Buffer.from(JSON.stringify(records)));

  // Store with signature
  const backup = {
    timestamp,
    record_count: records.rows.length,
    signature: signature.toString('base64'),
    data: records.rows
  };

  // Encrypt before storing
  const encrypted = encryptBackup(JSON.stringify(backup));

  // Store in S3 with encryption
  await s3.putObject({
    Bucket: 'backups.example.com',
    Key: `consent/${timestamp}.json.enc`,
    Body: encrypted,
    ServerSideEncryption: 'AES256'
  }).promise();
}
```

---

## 5. Backup Verification

### 5.1 Regular Restore Tests

```bash
#!/bin/bash
# test-backup-restore.sh

# Run monthly backup restore test
BACKUP_FILE="webrtc_backup_latest.sql.gz"
TEST_DB="webrtc_test_restore"

echo "Testing backup restore..."

# Create test database
createdb -U postgres "$TEST_DB"

# Restore backup
pg_restore -d "$TEST_DB" -U postgres "$BACKUP_FILE"

if [ $? -ne 0 ]; then
  echo "✗ Restore test failed!"
  dropdb -U postgres "$TEST_DB"
  exit 1
fi

# Run integrity checks
echo "Running integrity checks..."

psql -U postgres -d "$TEST_DB" << SQL
  -- Check table counts
  SELECT 'calls' as table_name, COUNT(*) as record_count FROM calls
  UNION ALL
  SELECT 'consent_records', COUNT(*) FROM consent_records
  UNION ALL
  SELECT 'users', COUNT(*) FROM users;

  -- Check for corrupted records
  SELECT COUNT(*) as unsigned_consents
  FROM consent_records WHERE signature IS NULL;

  -- Verify foreign key integrity
  SELECT COUNT(*) as orphaned_consents
  FROM consent_records
  WHERE call_id NOT IN (SELECT id FROM calls);
SQL

# Clean up
dropdb -U postgres "$TEST_DB"

echo "✓ Backup verification complete"
```

### 5.2 Backup Integrity Checks

```bash
#!/bin/bash
# verify-backups.sh

BACKUP_DIR="/mnt/backups"

echo "Verifying backups..."

for backup_file in "$BACKUP_DIR"/*.sql.gz; do
  echo "Checking: $(basename $backup_file)"

  # Test if file is valid gzip
  gzip -t "$backup_file"
  if [ $? -ne 0 ]; then
    echo "✗ Corrupt backup: $backup_file"
    alert "Corrupt backup detected: $backup_file"
    continue
  fi

  # Verify backup can be listed
  pg_restore -l "$backup_file" > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "✗ Unreadable backup: $backup_file"
    continue
  fi

  echo "✓ Backup OK"
done
```

---

## 6. Disaster Response Plan

### 6.1 Incident Response Steps

**Level 1: Data Warning (Data potentially at risk)**

```
1. Activate incident response team
2. Assess data integrity
3. Enable increased monitoring
4. Prepare for potential restore
5. Notify stakeholders
```

**Level 2: Data Loss (Data loss confirmed)**

```
1. Activate full disaster response
2. Identify recovery point needed
3. Prepare restore from backup
4. Communicate with users
5. Begin restore process
```

**Level 3: System Failure (Complete outage)**

```
1. Activate disaster recovery (DR) site
2. Switch to geo-replicated backup
3. Update DNS to point to DR site
4. Restore to latest point-in-time
5. Verify all services operational
6. Begin user cutover
```

### 6.2 Communication Plan

```markdown
# Incident Communication Template

## Internal Notification (within 15 min)
- Incident severity
- Services affected
- ETA for resolution
- Action items assigned

## User Notification (within 30 min)
- What happened (brief)
- What data affected
- What we're doing
- When to expect resolution
- How to stay informed

## Status Updates (every 30 min until resolved)
- Current status
- Work in progress
- Revised ETA
- Next steps

## Resolution Notification (within 1 hour)
- Issue fully resolved
- What we fixed
- Measures to prevent recurrence
- Thank you and apology
```

---

## 7. Testing Schedule

### 7.1 Monthly Tests

```bash
# First Monday of each month
0 2 * * 1 test $(date +\%d) -le 7 && /usr/local/bin/test-backup-restore.sh
```

### 7.2 Quarterly DR Tests

```markdown
# Quarterly DR Exercise

## Q1: Database Recovery
- Test full database restore
- Verify data integrity
- Validate application connectivity
- Estimated time to recovery

## Q2: Geo-Failover
- Switch to standby site
- Verify all services
- Test user connectivity
- Document lessons learned

## Q3: Application Recovery
- Restore from application backup
- Verify configuration
- Test data synchronization
- Performance validation

## Q4: End-to-End Recovery
- Simulate complete system failure
- Perform full recovery
- Measure RTO and RPO
- Plan improvements
```

---

## 8. Monitoring & Alerting

### 8.1 Backup Status Monitoring

```javascript
// Monitor backup completion
async function monitorBackups() {
  const query = `
    SELECT
      backup_time,
      backup_size,
      status,
      error_message
    FROM backup_logs
    ORDER BY backup_time DESC
    LIMIT 1
  `;

  const result = await db.query(query);
  const lastBackup = result.rows[0];

  if (!lastBackup || lastBackup.status !== 'SUCCESS') {
    // Alert
    alerting.error('Backup failed', {
      error: lastBackup?.error_message,
      last_successful: lastBackup?.backup_time
    });
  }
}

// Check hourly
setInterval(monitorBackups, 3600000);
```

### 8.2 Alert Rules

```yaml
alerts:
  - name: backup_failed
    condition: backup_status == 'FAILED'
    severity: critical
    notification: email, slack, pagerduty

  - name: replication_lag
    condition: replication_delay_seconds > 60
    severity: high
    notification: email, slack

  - name: backup_size_anomaly
    condition: backup_size > 2x_average
    severity: medium
    notification: email
```

---

## 9. RTO/RPO Targets

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| Single Record Loss | 5 min | 15 min | Backup restore |
| Data Corruption | 30 min | 1 hour | Full backup |
| Server Failure | 1 hour | 15 min | Geo-replica |
| Ransomware | 4 hours | 30 days | Air-gapped |

---

## 10. Disaster Recovery Checklist

**Planning**
- [ ] Backup strategy documented
- [ ] Recovery procedures tested
- [ ] RTO/RPO targets defined
- [ ] Incident response plan created
- [ ] Communication plan prepared

**Implementation**
- [ ] Backup automation in place
- [ ] Offsite backup storage set up
- [ ] Geo-replication configured
- [ ] Monitoring and alerting enabled
- [ ] Testing schedule created

**Maintenance**
- [ ] Monthly backup verification
- [ ] Quarterly DR drills
- [ ] Backup encryption verified
- [ ] Documentation updated
- [ ] Team trained

---

**Last Updated**: 2025-11-17
**Backup Manager**: automation@example.com
