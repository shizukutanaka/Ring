# WebRTC Call Recorder - Management CLI

Command-line tool for managing WebRTC Call Recorder server.

## Installation

```bash
npm install -g ./cli
# Or run locally:
node cli/webrtc-cli.js
```

## Quick Start

```bash
# Set API token
export WEBRTC_API_TOKEN=your-api-token
export WEBRTC_API_URL=http://localhost:3000

# Check server health
webrtc-cli status health

# List users
webrtc-cli user list

# List recent calls
webrtc-cli call list --days 7
```

## Commands

### User Management

#### List Users
```bash
webrtc-cli user list

# Output:
# ┌─────────────────────────────┬─────────────────┬──────────┬─────────┬─────────────┐
# │ ID                          │ Email           │ Name     │ Role    │ Created At  │
# ├─────────────────────────────┼─────────────────┼──────────┼─────────┼─────────────┤
# │ 123e4567-e89b-12d3-a456... │ user@example... │ John     │ user    │ 11/17/2025  │
# │ 223e4567-e89b-12d3-a456... │ admin@example...│ Admin    │ admin   │ 11/15/2025  │
# └─────────────────────────────┴─────────────────┴──────────┴─────────┴─────────────┘
```

#### Create User
```bash
webrtc-cli user create \
  --email user@example.com \
  --password SecurePassword123 \
  --name "John Doe" \
  --role user

# Output:
# ✓ User created successfully
# ID: 123e4567-e89b-12d3-a456-426614174000
# Email: user@example.com
```

#### Delete User
```bash
webrtc-cli user delete --id 123e4567-e89b-12d3-a456-426614174000

# Output:
# ✓ User deleted successfully
```

#### Reset Password
```bash
webrtc-cli user reset-password \
  --id 123e4567-e89b-12d3-a456-426614174000 \
  --password NewPassword456

# Output:
# ✓ Password reset successfully
```

### Call Management

#### List Calls
```bash
# List all calls
webrtc-cli call list

# Filter by status
webrtc-cli call list --status ended

# Last 7 days
webrtc-cli call list --days 7

# With pagination
webrtc-cli call list --limit 100 --offset 50

# Output:
# ┌────────┬───────────┬───────────┬──────────┬────────┬─────────────────────┐
# │ ID     │ Initiator │ Recipient │ Duration │ Status │ Started             │
# ├────────┼───────────┼───────────┼──────────┼────────┼─────────────────────┤
# │ 123e.. │ user-1    │ user-2    │ 300s     │ ended  │ 11/17/2025 10:30 AM │
# │ 223e.. │ user-3    │ user-4    │ 120s     │ ended  │ 11/17/2025 10:15 AM │
# └────────┴───────────┴───────────┴──────────┴────────┴─────────────────────┘
```

#### Call Details
```bash
webrtc-cli call details --id 123e4567-e89b-12d3-a456-426614174000

# Output:
# === Call Details ===
#
# ID: 123e4567-e89b-12d3-a456-426614174000
# Initiator: user-123
# Recipient: user-456
# Status: ended
# Duration: 300s
# Started: 11/17/2025, 10:30:00 AM
# Ended: 11/17/2025, 10:35:00 AM
# Recorded: Yes
```

### Server Status

#### Health Check
```bash
webrtc-cli status health

# Output:
# === Server Health ===
#
# Status: healthy
# Uptime: 86400s
# Timestamp: 11/17/2025, 3:45:30 PM
#
# Database: ✓
# Cache: ✓
# Metrics: ✓
```

#### Metrics
```bash
webrtc-cli status metrics

# Output:
# === Server Metrics ===
#
# HTTP Requests: 50000
# Errors: 45
# Active Calls: 15
# Uptime: 24 hours
#
# Response Times (ms):
#   P50: 45
#   P95: 180
#   P99: 520
```

#### Statistics
```bash
# Overall stats
webrtc-cli status stats

# Last 7 days
webrtc-cli status stats --days 7

# Output:
# === System Statistics ===
#
# Total Users: 1250
# Active Users (24h): 350
# Total Calls: 25000
# Calls (24h): 1500
# Total Consent Records: 24500
# Consent Rate: 98.00%
# Average Call Duration: 300s
# Storage Used: 150.50 GB
```

### Database Management

#### Backup Database
```bash
# Auto-generated filename
webrtc-cli db backup

# Custom filename
webrtc-cli db backup --file my-backup.sql

# Output:
# Creating backup to backup-1700000000000.sql...
# ✓ Backup created successfully: backup-1700000000000.sql
```

#### Run Migrations
```bash
webrtc-cli db migrate

# Output:
# Running database migrations...
# ✓ Migrations completed
# Applied 5 migrations
```

#### Seed Database
```bash
webrtc-cli db seed

# Output:
# Seeding database...
# ✓ Database seeded successfully
# Created 100 records
```

## Configuration

### Environment Variables

```bash
# API endpoint
export WEBRTC_API_URL=http://localhost:3000

# API authentication token
export WEBRTC_API_TOKEN=your-api-token

# Log level
export WEBRTC_LOG_LEVEL=debug
```

### Command-line Flags

```bash
# Override API URL
webrtc-cli --url http://api.example.com user list

# Override API token
webrtc-cli --token your-token user list
```

## Use Cases

### Daily Operations

```bash
# Morning health check
webrtc-cli status health
webrtc-cli status metrics

# Monitor daily stats
webrtc-cli status stats --days 1

# List recent errors (if implemented)
# webrtc-cli logs errors --days 1
```

### User Management

```bash
# Create new user for onboarding
webrtc-cli user create \
  --email newuser@company.com \
  --password InitialPassword123 \
  --name "Jane Smith" \
  --role user

# Reset forgotten password
webrtc-cli user reset-password --id user-id --password NewPassword456

# Audit: List all admin users
webrtc-cli user list | grep admin
```

### Call Analytics

```bash
# Review calls from last 7 days
webrtc-cli call list --days 7 | less

# Check specific call details
webrtc-cli call details --id call-id

# Verify consent rates
webrtc-cli status stats
```

### Maintenance

```bash
# Pre-maintenance backup
webrtc-cli db backup --file pre-maintenance-backup.sql

# Update database schema
webrtc-cli db migrate

# Health check after maintenance
webrtc-cli status health
```

## Scripts

### Automated Daily Report

```bash
#!/bin/bash
# scripts/daily-report.sh

echo "Daily WebRTC Recorder Report - $(date)" > report.txt
echo "" >> report.txt

echo "=== Health Status ===" >> report.txt
webrtc-cli status health >> report.txt 2>&1

echo "" >> report.txt
echo "=== Statistics ===" >> report.txt
webrtc-cli status stats --days 1 >> report.txt 2>&1

echo "" >> report.txt
echo "=== Recent Calls ===" >> report.txt
webrtc-cli call list --days 1 --limit 10 >> report.txt 2>&1

# Email report
mail -s "Daily Report" admin@example.com < report.txt
```

### Automated Backup

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/webrtc"
mkdir -p $BACKUP_DIR

echo "Backing up WebRTC database..."
webrtc-cli db backup --file $BACKUP_DIR/backup-$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup-*.sql" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/backup-$DATE.sql"
```

## Performance Tips

1. **Pagination**: Use `--limit` and `--offset` for large result sets
2. **Filtering**: Use `--days` to reduce data volume
3. **Caching**: Results are cached in memory during single CLI invocation
4. **Batch Operations**: Consider scripting multiple commands

## Error Handling

```bash
# Check exit codes
webrtc-cli user list
if [ $? -ne 0 ]; then
  echo "Failed to list users"
  exit 1
fi

# Capture error messages
ERROR=$(webrtc-cli user create --email invalid 2>&1)
if [[ $ERROR == *"Error"* ]]; then
  echo "Creation failed: $ERROR"
fi
```

## Troubleshooting

### Connection Error

```bash
# Check API is running
curl http://localhost:3000/api/health

# Verify API URL
export WEBRTC_API_URL=http://localhost:3000

# Verify token is set
echo $WEBRTC_API_TOKEN
```

### Authorization Error

```bash
# Generate new token via API
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"admin@example.com","password":"password"}' \
  -H 'Content-Type: application/json'

# Set token
export WEBRTC_API_TOKEN=<new-token>
```

### Database Connection Error

```bash
# Check database health
webrtc-cli status health

# View server logs
docker logs webrtc-app
```

## Security

✅ API token stored in environment variable
✅ Never commit `.env` files
✅ Use strong API tokens (min 32 chars)
✅ Rotate tokens regularly
✅ Restrict CLI access to authorized admins
✅ Audit CLI command usage via server logs

## Development

### Running Locally

```bash
node cli/webrtc-cli.js user list
```

### Adding Commands

1. Add command function to appropriate section
2. Register in yargs configuration
3. Update documentation
4. Test with `node cli/webrtc-cli.js <command>`

### Dependencies

```json
{
  "yargs": "^17.0.0",
  "chalk": "^4.1.0",
  "axios": "^0.27.0",
  "cli-table3": "^0.6.0"
}
```

---

**Version**: 1.0.0
**Updated**: 2025-11-17
**License**: MIT
