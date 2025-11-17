# Security Migration Guide - Password Hashing Implementation

**Document**: Production Deployment Guide for Password Hashing Fix
**Version**: v0.2.0
**Status**: CRITICAL - Execute Immediately
**Audience**: DevOps, Database Administrators, Security Team

---

## Executive Summary

This guide provides step-by-step instructions for deploying the critical password hashing security fix to production environments. The vulnerability (CWE-256) allows unauthorized access if the database is compromised.

**Risk Level**: 🔴 CRITICAL
**Estimated Migration Time**: 30-60 minutes per environment
**Downtime**: 0 minutes (zero-downtime deployment)
**Rollback Complexity**: Low

---

## Pre-Deployment Checklist

### 1. Backup and Recovery

- [ ] Full database backup created: `pg_dump webrtc_recorder > backup_$(date +%s).sql`
- [ ] Backup verified: `pg_restore --list backup_*.sql | head -10`
- [ ] Backup location secured: Off-site backup and local copy
- [ ] Recovery procedure tested: Restore on staging and verify
- [ ] Backup retention policy documented: 30-day retention minimum

**Backup Command**:
```bash
#!/bin/bash
BACKUP_DIR="/backups/webrtc"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/webrtc_recorder_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"
pg_dump -h localhost -U postgres -d webrtc_recorder \
  --verbose \
  --format=custom \
  --file="$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"
du -h "$BACKUP_FILE"
```

### 2. Code Review

- [ ] Security patch code reviewed by 2+ team members
- [ ] No SQL injection vulnerabilities in migration script
- [ ] Bcrypt parameters verified (SALT_ROUNDS=12)
- [ ] Rate limiting logic reviewed for edge cases
- [ ] All dependencies up-to-date

### 3. Staging Environment

- [ ] Code deployed to staging
- [ ] Database migration tested on staging
- [ ] Login/registration endpoints tested
- [ ] Rate limiting verification: 5 attempts then lockout
- [ ] Password reset flow verified
- [ ] Load testing completed (no performance regression)

### 4. Communication

- [ ] Maintenance window scheduled (if needed)
- [ ] Status page updated
- [ ] Ops team briefed
- [ ] Security team notified
- [ ] On-call personnel assigned

---

## Deployment Steps

### Phase 1: Pre-Deployment (Staging Only)

#### Step 1.1: Deploy Code to Staging

```bash
# Pull latest code
cd /app/webrtc-recorder
git fetch origin
git checkout origin/master

# Install dependencies
npm install

# Verify tests pass
npm test

# Start staging server
npm run dev
```

#### Step 1.2: Test New Registration Endpoint

```bash
# Test successful registration
curl -X POST http://staging:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_123",
    "password": "StrongPassword123!@#",
    "email": "test@example.com"
  }' | jq

# Expected response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "...",
#     "username": "test_user_123",
#     "email": "test@example.com",
#     "role": "user"
#   }
# }
```

#### Step 1.3: Test Login Endpoint

```bash
# Test login with correct password
curl -X POST http://staging:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_123",
    "password": "StrongPassword123!@#"
  }' | jq

# Test login with wrong password
curl -X POST http://staging:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_123",
    "password": "WrongPassword"
  }' | jq

# Expected error:
# {
#   "error": "invalid_credentials"
# }
```

#### Step 1.4: Test Rate Limiting

```bash
# Run login 6 times with wrong password
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://staging:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{
      "username": "test_rate_limit",
      "password": "WrongPassword"
    }' | jq '.error'
done

# After attempt 5, should get:
# "error": "max_attempts_exceeded"
# "remainingTime": 900 (15 minutes in seconds)
```

#### Step 1.5: Verify Existing User Migration

```bash
# Create test user with plain text password (simulate legacy data)
psql -h localhost -U postgres -d webrtc_recorder << EOF
INSERT INTO users(username, email, password_hash, role, created_at)
VALUES ('legacy_user', 'legacy@example.com', 'plaintext_password_123', 'user', NOW())
ON CONFLICT DO NOTHING;
EOF

# Check current password format
psql -h localhost -U postgres -d webrtc_recorder << EOF
SELECT username, LENGTH(password_hash) as hash_length,
       SUBSTRING(password_hash FROM 1 FOR 3) as prefix
FROM users
WHERE username IN ('legacy_user', 'test_user_123');
EOF

# Output before migration:
# username    | hash_length | prefix
# legacy_user |          22 | pla
# test_user_123 |          60 | $2b
```

### Phase 2: Production Deployment

#### Step 2.1: Pre-Migration Checks

```bash
# Verify database connection
psql -h prod-db:5432 -U postgres -d webrtc_recorder << EOF
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as plain_text_count FROM users
WHERE password_hash NOT LIKE '$2%'
AND LENGTH(password_hash) < 100;
EOF

# Monitor current metrics
curl http://prod-api:3000/api/metrics | jq '{
  uptime_seconds,
  active_connections,
  http_requests_total
}'
```

#### Step 2.2: Deploy New Code

```bash
# On production server
cd /app/webrtc-recorder

# Backup current code
git stash

# Pull latest code
git fetch origin
git checkout origin/master

# Install dependencies (if new packages)
npm install --production

# Verify code integrity
node -c server/index.js  # Check syntax
```

#### Step 2.3: Run Password Migration (ZERO DOWNTIME)

```bash
# The migration runs while the server is active
cd /app/webrtc-recorder/server

# Option A: Run migration script directly
node migrations/001-hash-passwords.js

# Option B: Run with increased timeout (for large databases)
timeout 3600 node migrations/001-hash-passwords.js

# Monitor database during migration
# In separate terminal:
watch -n 5 'psql -h prod-db:5432 -U postgres -d webrtc_recorder \
  -c "SELECT COUNT(*) FROM users WHERE password_hash LIKE \"\$2%\""'
```

#### Step 2.4: Verify Migration Success

```bash
# Check migration results
psql -h prod-db:5432 -U postgres -d webrtc_recorder << EOF
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN password_hash LIKE '$2%' THEN 1 ELSE 0 END) as hashed_count,
  SUM(CASE WHEN password_hash NOT LIKE '$2%' AND LENGTH(password_hash) < 100 THEN 1 ELSE 0 END) as plain_text_count
FROM users;
EOF

# Expected output:
# total_users | hashed_count | plain_text_count
#          42 |           42 |                0
```

#### Step 2.5: Graceful Server Restart

```bash
# For systemd-managed services
sudo systemctl restart webrtc-recorder

# For supervisor-managed services
supervisorctl restart webrtc-recorder

# For Docker deployments
docker-compose restart api

# Wait for service to be healthy
sleep 10
curl http://localhost:3000/health | jq

# Should output:
# {
#   "status": "ok",
#   "timestamp": "2025-11-17T10:30:00.000Z"
# }
```

### Phase 3: Post-Deployment Verification

#### Step 3.1: Functional Testing

```bash
# Test 1: New user registration
curl -X POST http://prod-api:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "prod_test_user",
    "password": "ProductionTest123!@",
    "email": "prod_test@example.com"
  }' | jq '.user.username'

# Test 2: Login with registered user
curl -X POST http://prod-api:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "prod_test_user",
    "password": "ProductionTest123!@"
  }' | jq '.token' | head -c 50

# Test 3: Login with legacy user (migrated password)
curl -X POST http://prod-api:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "existing_prod_user",
    "password": "their_original_password"
  }' | jq '.token' | head -c 50
```

#### Step 3.2: Security Verification

```bash
# Verify all passwords are hashed
psql -h prod-db:5432 -U postgres -d webrtc_recorder << EOF
SELECT COUNT(*) as plain_text_passwords FROM users
WHERE password_hash NOT LIKE '$2%'
AND LENGTH(password_hash) < 100;
EOF

# Expected result: 0 plain text passwords

# Verify no passwords in logs
grep -r "password" /var/log/webrtc-recorder/ || echo "No passwords in logs ✓"
```

#### Step 3.3: Performance Monitoring

```bash
# Monitor authentication endpoint performance
# (Run this for 5-10 minutes after deployment)

curl -X POST http://prod-api:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\nTime: %{time_total}s\n"

# Expected: 100-150ms (bcrypt hashing time)
```

#### Step 3.4: Check Application Metrics

```bash
# Verify server is healthy
curl http://prod-api:3000/api/metrics | jq '{
  status: .status,
  http_requests_total,
  errors_total,
  http_request_duration_ms: .http_request_duration_ms.p95
}'

# Verify no spike in error rate
# Check: errors_total should not significantly increase
# Check: Error rate should remain < 1%
```

---

## Rollback Procedure

If critical issues arise after deployment:

### Immediate Rollback (Within 5 Minutes)

```bash
# Step 1: Revert code
cd /app/webrtc-recorder
git revert HEAD
npm install --production
sudo systemctl restart webrtc-recorder

# Step 2: Restore database from backup
BACKUP_FILE=$(ls -t /backups/webrtc/webrtc_recorder_*.sql | head -1)
pg_restore -h localhost -U postgres -d webrtc_recorder \
  --clean \
  --if-exists \
  "$BACKUP_FILE"

# Step 3: Verify rollback
curl http://localhost:3000/health | jq

# Step 4: Notify team
# Send incident notification with rollback details
```

### Database Rollback Only (If Code is OK)

```bash
# If code is fine but migration needs to be redone:

# Restore password_hash column to original state
psql -h localhost -U postgres -d webrtc_recorder << EOF
-- This assumes we have backups of the original passwords
-- In production, only restore from full backup
pg_restore --data-only -t users "$BACKUP_FILE"
EOF
```

### Root Cause Analysis

```bash
# After rollback, investigate:
1. Check application logs for errors
2. Check database query performance
3. Verify bcrypt configuration
4. Check rate limiting logic
5. Review test results from staging

# Gather diagnostics
journalctl -u webrtc-recorder -n 100 > /tmp/webrtc.log
pg_dump -h localhost -U postgres webrtc_recorder -t users -a > /tmp/users_backup.sql
ps aux | grep node > /tmp/processes.log

# Share with security team for investigation
```

---

## Monitoring and Maintenance

### Post-Deployment Monitoring (24 Hours)

```bash
#!/bin/bash
# Monitor login endpoint metrics

while true; do
  echo "=== $(date) ==="

  # Check error rate
  curl -s http://prod-api:3000/api/metrics | jq '.errors_total'

  # Check response time
  curl -s -w "Response time: %{time_total}s\n" \
    -X POST http://prod-api:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' \
    > /dev/null

  sleep 300  # Every 5 minutes
done
```

### Weekly Security Audit

```bash
# Run weekly to ensure security is maintained

# Check 1: Verify no plain text passwords exist
psql -h prod-db:5432 -U postgres -d webrtc_recorder << EOF
SELECT COUNT(*) FROM users
WHERE password_hash NOT LIKE '$2%'
AND LENGTH(password_hash) < 100;
EOF

# Check 2: Verify bcrypt version is current
npm list bcryptjs

# Check 3: Review login attempt logs
tail -n 1000 /var/log/webrtc-recorder/auth.log | \
  grep -i "failed\|lockout" | wc -l

# Check 4: Verify rate limiting is functioning
# (Intentionally trigger rate limit and verify response)
```

---

## Appendix: Troubleshooting

### Issue: Migration Script Hangs on Large Database

**Symptoms**: Migration takes > 30 minutes for > 1M users

**Solution**:
```bash
# Run migration in batches
BATCH_SIZE=1000

for ((i=0; i<$(psql -t -c "SELECT COUNT(*) FROM users"); i+=BATCH_SIZE)); do
  psql << EOF
  UPDATE users
  SET password_hash = crypt(password_hash, gen_salt('bf', 12))
  WHERE id >= $i AND id < $((i+BATCH_SIZE))
  AND password_hash NOT LIKE '\$2%';
EOF
  echo "Processed batch $((i/BATCH_SIZE + 1))"
done
```

### Issue: Login Fails After Migration

**Symptoms**: Users cannot login even with correct password

**Debug Steps**:
```bash
# 1. Verify user exists
psql << EOF
SELECT id, username, password_hash FROM users WHERE username = 'testuser';
EOF

# 2. Test bcrypt comparison
node << 'JS'
const bcrypt = require('bcryptjs');
const hash = '$2b$12$...'; // Hash from database
bcrypt.compare('password', hash).then(result => console.log(result));
JS

# 3. Check logs for errors
journalctl -u webrtc-recorder | grep -i error | tail -20

# 4. Verify database connection
psql -h prod-db:5432 -l | grep webrtc_recorder
```

### Issue: High CPU Usage After Deployment

**Symptoms**: CPU spikes to 80%+ during login

**Analysis**:
- Bcrypt hashing intentionally uses CPU (security-by-design)
- With SALT_ROUNDS=12, expected: 100-200ms per login
- Spike is normal for first day; should normalize as cache stabilizes

**Optimization**:
```bash
# Consider increasing SALT_ROUNDS gradually if CPU is critical
# Current: SALT_ROUNDS=12 (recommended by OWASP)
# If CPU is bottleneck, can reduce to 11 (less secure but 50% faster)
# BUT NOT RECOMMENDED - keep at 12

# Instead, scale horizontally: Add more login servers
```

---

## Sign-Off Checklist

- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] No performance regression observed
- [ ] Database integrity verified
- [ ] Security patches applied
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation updated
- [ ] Incident response tested

**Deployed By**: ___________________
**Date**: ___________________
**Approved By**: ___________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Next Review**: 2025-12-17
