# Troubleshooting Guide

Solutions to common issues and how to debug the WebRTC Call Recorder.

## Quick Diagnostics

### Run Health Check
```bash
cd server
npm run health-check
# or verbose output
npm run health-check -- --verbose
```

Expected output:
```
✓ 1. Health Endpoint (Status: healthy, 5.2ms)
✓ 2. Authentication (Status: working)
✓ 3. Legal Database (Status: available, v2025-11-17, 25 countries)
✓ 4. System Requirements (Status: healthy)
Overall Status: HEALTHY
```

---

## Backend Server Issues

### "Cannot connect to database"

**Error Messages**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: Client has encountered a connection error and is not queryable
```

**Solutions**:

1. **Verify PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgres

   # Linux
   sudo systemctl status postgresql

   # Windows
   services.msc (look for PostgreSQL)

   # Docker
   docker ps | grep postgres
   ```

2. **Check connection string**:
   ```bash
   # Verify .env has correct DATABASE_URL
   cat server/.env.development | grep DATABASE_URL

   # Test connection manually
   psql postgresql://user:password@localhost:5432/webrtc_recorder
   ```

3. **Create database if missing**:
   ```bash
   psql -U postgres -c "CREATE DATABASE webrtc_recorder;"
   ```

4. **Check port availability**:
   ```bash
   # macOS/Linux
   lsof -i :5432

   # Windows
   netstat -ano | findstr :5432
   ```

5. **Restart PostgreSQL**:
   ```bash
   # macOS
   brew services restart postgresql@15

   # Linux
   sudo systemctl restart postgresql

   # Windows/Docker
   docker restart webrtc-db
   ```

---

### "Port 3000 already in use"

**Error Message**:
```
listen EADDRINUSE: address already in use :::3000
```

**Solutions**:

1. **Use different port**:
   ```bash
   PORT=4000 npm run dev
   ```

2. **Find and kill process**:
   ```bash
   # macOS/Linux
   lsof -i :3000
   kill -9 <PID>

   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

3. **Check what's running**:
   ```bash
   ps aux | grep node  # macOS/Linux
   tasklist | findstr node  # Windows
   ```

---

### "npm install fails with ERESOLVE"

**Error Message**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions**:

1. **Use legacy peer deps flag**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Delete node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Use specific Node version**:
   ```bash
   # Check version
   node --version  # Should be 18+

   # Use nvm to switch (macOS/Linux)
   nvm install 18
   nvm use 18
   ```

---

### "Tests fail with timeout"

**Error Message**:
```
Jest did not exit one second after the test run
Async callbacks were not cleared
```

**Solutions**:

1. **Increase timeout**:
   ```bash
   npm test -- --testTimeout=10000
   ```

2. **Check database cleanup**:
   ```javascript
   // Ensure afterAll() closes connection
   afterAll(async () => {
     await db.disconnect();
   });
   ```

3. **Clear hanging connections**:
   ```bash
   # Kill stray processes
   pkill -f "node.*test"
   ```

---

### "Metrics endpoint returns 503"

**Error Message**:
```
GET /metrics HTTP/1.1 → 503 Service Unavailable
```

**Solutions**:

1. **Check server logs**:
   ```bash
   DEBUG=webrtc:* npm run dev
   ```

2. **Verify monitoring module loaded**:
   ```bash
   npm run health-check -- --verbose
   ```

3. **Clear old metrics**:
   ```bash
   # Restart server
   npm run dev
   ```

---

## Mobile Development Issues

### iOS Build Fails

#### "Pod install fails"

**Error**:
```
[!] Pod install has always failed in this project
```

**Solutions**:

```bash
cd ios

# Clear pods
rm -rf Pods
rm Podfile.lock

# Reinstall
pod install

# Update pods
pod repo update
pod install

cd ..
```

#### "Xcode build fails with architecture mismatch"

**Error**:
```
xcodebuild: error: Unknown architecture 'arm64e'
```

**Solutions**:

1. **Update Xcode**:
   ```bash
   xcode-select --install
   softwareupdate -ia
   ```

2. **Set correct architecture**:
   ```bash
   cd ios
   pod install --repo-update
   cd ..
   npm run ios
   ```

3. **Check minimum deployment target**:
   - Xcode → Project → Build Settings
   - Set to iOS 13.0 or higher

---

### Android Build Fails

#### "Android SDK not found"

**Error**:
```
Could not find android build tools version 31.0.0
```

**Solutions**:

1. **Set ANDROID_HOME**:
   ```bash
   # macOS/Linux
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

   # Windows
   setx ANDROID_HOME %LOCALAPPDATA%\Android\Sdk
   setx PATH "%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"
   ```

2. **Install missing SDK**:
   ```bash
   # Open Android Studio
   # Tools → SDK Manager → Install SDK 31+
   ```

3. **Update gradle**:
   ```bash
   cd android
   ./gradlew wrapper --gradle-version 7.6.2
   cd ..
   ```

#### "Metro bundler crashes"

**Error**:
```
Cannot find module 'react-native/...'
```

**Solutions**:

```bash
# Clear cache
npm start -- --reset-cache

# Or manually
cd mobile
rm -rf node_modules
npm install
npm start -- --reset-cache
```

---

### "Unable to reach localhost:8081"

**Error**: React Native Metro bundler not responding

**Solutions**:

1. **Ensure bundler is running**:
   ```bash
   # In separate terminal
   npm start
   ```

2. **Check port availability**:
   ```bash
   # macOS/Linux
   lsof -i :8081

   # Windows
   netstat -ano | findstr :8081
   ```

3. **Use different port**:
   ```bash
   npm start -- --port 8082
   ```

4. **Clear Metro cache**:
   ```bash
   npm start -- --reset-cache --clear
   ```

---

### "WebRTC peer connection fails"

**Error**: Media stream not establishing

**Solutions**:

1. **Check permissions in mobile app**:
   - iOS: Settings → Privacy → Microphone
   - Android: Settings → Apps → Permissions → Microphone

2. **Verify signaling server connectivity**:
   ```javascript
   // In mobile app console
   console.log('WebSocket connected:', this.state.connected);
   ```

3. **Check firewall/network**:
   ```bash
   # Ensure server port accessible
   curl -v http://localhost:3000/health
   ```

4. **Enable debug logging**:
   ```bash
   # In mobile app
   DEBUG=*
   npm start
   ```

---

## Web Dashboard Issues

### "Dashboard won't load"

**Error**: Blank page or 404

**Solutions**:

1. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check port configuration**:
   ```bash
   # Make sure client is served on correct port
   cd client
   npx http-server . -p 8080
   ```

3. **Check CORS headers**:
   ```bash
   curl -H "Origin: http://localhost:8080" \
        -v http://localhost:3000/api/legal/detect
   ```

4. **Verify API endpoint**:
   - Check browser console (F12)
   - Look for failed XHR requests
   - Verify `REACT_APP_API_URL` env var

### "API calls return 403 Forbidden"

**Error**: Unauthorized access to endpoint

**Solutions**:

1. **Check JWT token**:
   ```javascript
   // Browser console
   localStorage.getItem('jwt_token')
   ```

2. **Verify token isn't expired**:
   ```javascript
   // Decode JWT
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires:', new Date(decoded.exp * 1000));
   ```

3. **Re-authenticate**:
   - Clear local storage
   - Login again
   - Check auth endpoint returns valid token

4. **Check CORS configuration**:
   ```bash
   # Verify allowed origins
   grep -i "origin\|cors" server/index.js
   ```

---

## Performance Issues

### "Server is slow (responses > 500ms)"

**Diagnosis**:

1. **Check database slow queries**:
   ```sql
   -- Enable query logging in PostgreSQL
   ALTER SYSTEM SET log_statement = 'all';
   SELECT pg_reload_conf();
   ```

2. **Monitor server load**:
   ```bash
   npm run health-check -- --verbose
   # Check CPU, memory, request times
   ```

3. **Analyze endpoints**:
   ```bash
   curl http://localhost:3000/metrics | grep http_request_duration
   ```

**Solutions**:

1. **Add database indexes**:
   ```sql
   CREATE INDEX idx_calls_user_id ON calls(initiator_id);
   CREATE INDEX idx_consent_call_id ON consent_records(call_id);
   ```

2. **Enable caching**:
   ```bash
   # Add Redis for legal DB caching
   npm install redis
   ```

3. **Increase pool size**:
   ```env
   DB_POOL_MIN=5
   DB_POOL_MAX=20
   ```

4. **Upgrade Node.js**:
   ```bash
   nvm install 20
   nvm use 20
   ```

---

### "High memory usage"

**Diagnosis**:

```bash
# Check Node process memory
node --expose-gc -e "console.log(process.memoryUsage())" | npm run dev

# Monitor over time
watch -n 1 'ps aux | grep "node"'
```

**Solutions**:

1. **Increase heap size**:
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 npm run dev
   ```

2. **Fix memory leaks**:
   - Check for unclosed database connections
   - Verify EventEmitter listeners removed
   - Clear large data structures

3. **Enable garbage collection profiling**:
   ```bash
   node --trace-gc server/index.js
   ```

---

## Legal Database Issues

### "Legal rules not loading"

**Error**: Country lookup returns empty

**Solutions**:

1. **Verify legal DB exists**:
   ```bash
   ls -la server/legaldb/
   ```

2. **Check data integrity**:
   ```bash
   npm run health-check -- --verbose
   # Look for "Legal Database" status
   ```

3. **Validate JSON syntax**:
   ```bash
   # Test parsing
   node -e "console.log(require('./server/legaldb/expanded_legaldb.json'))"
   ```

4. **Update legal database**:
   ```bash
   # Pull latest rules
   git pull origin main
   npm run dev
   ```

---

### "Consent screen shows wrong language"

**Solutions**:

1. **Check device language setting**:
   - iOS: Settings → Language
   - Android: Settings → Languages

2. **Verify translation in legal DB**:
   ```bash
   grep -i "ja\|ja-jp" server/legaldb/expanded_legaldb.json
   ```

3. **Add missing translation**:
   - Edit `server/legaldb/countries/<country>.json`
   - Add new language key
   - Test with `npm test`

---

## Debugging Techniques

### Enable Full Debug Logging

```bash
# Server
DEBUG=webrtc:* npm run dev

# Mobile (React Native)
DEBUG=* npm start

# Client (Browser)
# F12 → Console → Filter: log level
```

### Debug Node.js Server

#### Chrome DevTools

```bash
# Start with inspector
node --inspect-brk server/index.js

# Open: chrome://inspect
# Click "inspect" on the running process
```

#### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch WebRTC Server",
      "program": "${workspaceFolder}/server/index.js",
      "env": {
        "DEBUG": "webrtc:*",
        "NODE_ENV": "development"
      }
    }
  ]
}
```

Then press F5 to start debugging.

### Database Query Debugging

```bash
# Enable query logging
psql -d webrtc_recorder

# In PostgreSQL
SET log_statement = 'all';

# Run query
SELECT * FROM calls WHERE id = '...';

# View logs
tail -f /var/log/postgresql/postgresql.log
```

### WebSocket Debugging

```javascript
// In server code
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('signal-offer', (data) => {
    console.log('Received offer:', JSON.stringify(data, null, 2));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

---

## Getting Help

### Check Existing Issues

```bash
# GitHub Issues
https://github.com/your-org/webrtc-call-recorder/issues

# Search by error message or component
# Example: "Port 3000 already in use"
```

### Enable Debug Mode for Support

```bash
# Generate debug bundle
DEBUG=webrtc:* npm run dev > debug.log 2>&1

# Include in bug report
```

### Provide System Info

```bash
# Get diagnostic info
node --version
npm --version
psql --version
git --version
uname -a  # macOS/Linux
systeminfo  # Windows

# Save to report
uname -a > system-info.txt
```

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| ECONNREFUSED | Connection rejected | Check service is running |
| EADDRINUSE | Port in use | Use different port or kill process |
| ENOENT | File not found | Check file path, run npm install |
| ERESOLVE | Dependency conflict | Use --legacy-peer-deps |
| EACCES | Permission denied | Run with sudo or fix permissions |
| ETIMEDOUT | Request timeout | Increase timeout, check network |

---

**Last Updated**: 2025-11-17

Need more help? Check [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) or create a [GitHub Issue](https://github.com/your-org/webrtc-call-recorder/issues).
