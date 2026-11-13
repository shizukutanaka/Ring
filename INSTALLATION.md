# Installation Guide

Comprehensive setup instructions for all components of the WebRTC Call Recorder.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Server](#backend-server)
3. [Mobile Client](#mobile-client)
4. [Web Dashboard](#web-dashboard)
5. [Docker Setup](#docker-setup)
6. [Environment Configuration](#environment-configuration)
7. [Verification](#verification)

## System Requirements

### All Platforms

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn 1.22+)
- **Git**: 2.30 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 2GB for installation

### Backend Server

- **PostgreSQL**: 12.0 or higher
- **OpenSSL**: 1.1.1 or higher (for JWT signing)

### Mobile Development (Optional)

- **iOS**: Xcode 14+ (macOS only), iOS 13+
- **Android**: Android Studio 2021.3+, Android SDK 31+, Android 8.0+

### Web Dashboard

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Backend Server

### 1. Install PostgreSQL

#### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create user and database
createdb webrtc_recorder
psql -d webrtc_recorder -c "CREATE USER webrtc WITH PASSWORD 'dev-password';"
psql -d webrtc_recorder -c "GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc;"
```

#### Windows

1. Download from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer, remember the password
3. PostgreSQL service starts automatically
4. Create database using pgAdmin or command line:

```cmd
psql -U postgres
```

```sql
CREATE DATABASE webrtc_recorder;
CREATE USER webrtc WITH PASSWORD 'dev-password';
GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc;
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql
```

```sql
CREATE DATABASE webrtc_recorder;
CREATE USER webrtc WITH PASSWORD 'dev-password';
GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc;
```

#### Using Docker (All Platforms)

```bash
docker run -d \
  --name webrtc-db \
  -e POSTGRES_DB=webrtc_recorder \
  -e POSTGRES_USER=webrtc \
  -e POSTGRES_PASSWORD=dev-password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15
```

### 2. Setup Server Application

```bash
# Clone repository
git clone https://github.com/shizukutanaka/Ring.git
cd Ring/server

# Install dependencies
npm install

# Create environment file
cp .env.example .env.development
```

### 3. Configure Environment

Edit `.env.development`:

```env
# Database
DATABASE_URL=postgresql://webrtc:dev-password@localhost:5432/webrtc_recorder

# JWT
JWT_SECRET=your-secret-key-minimum-32-characters-long-for-dev

# Node environment
NODE_ENV=development

# Server
PORT=3000
HOST=localhost

# Telemetry
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=1.0

# Debug
DEBUG=webrtc:*
LOG_LEVEL=debug
```

### 4. Verify Installation

```bash
# Test database connection
npm run health-check

# Run tests
npm test

# Start development server
npm run dev

# In another terminal, verify:
curl http://localhost:3000/health
```

---

## Mobile Client (React Native)

### Prerequisites

- Node.js 16+ with npm 8+
- For iOS: macOS 11+, Xcode 14+
- For Android: Android Studio, SDK 31+

### Installation

```bash
cd mobile

# Install dependencies
npm install

# Install pod dependencies (iOS only, on macOS)
cd ios
pod install
cd ..
```

### iOS Setup (macOS Only)

```bash
# Install Xcode command line tools
xcode-select --install

# Install Xcode
# Download from App Store or https://developer.apple.com/xcode/

# Run on simulator
npm run ios

# Or on physical device
npm run ios -- --device
```

### Android Setup

```bash
# Install Android Studio from https://developer.android.com/studio
# Open Android Studio > SDK Manager > Install SDK 31+

# Configure environment (Windows)
setx ANDROID_HOME %LOCALAPPDATA%\Android\Sdk
setx PATH "%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"

# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Run on emulator
npm run android

# Run on physical device
npm run android -- --deviceId <device-id>
```

### Development Server

```bash
# Start Metro bundler in a separate terminal
npm start

# Then in another terminal:
npm run ios    # iOS
npm run android # Android
```

---

## Web Dashboard

### Simple HTTP Server

```bash
cd client

# Using Python
python3 -m http.server 8080

# Or using npm
npx http-server . -p 8080

# Or using Node
node -e "require('http').createServer((q, s) => require('fs').createReadStream(require('path').join(__dirname, decodeURI(q.url))).pipe(s)).listen(8080)"
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Production Build

For production, serve from CDN or static host:

```bash
# Copy client files to your web host
cp -r client/* /var/www/webrtc-dashboard/
```

---

## Docker Setup

### Complete Stack (Server + Database)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: webrtc_recorder
      POSTGRES_USER: webrtc
      POSTGRES_PASSWORD: dev-password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U webrtc"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build: ./server
    environment:
      DATABASE_URL: postgresql://webrtc:dev-password@postgres:5432/webrtc_recorder
      JWT_SECRET: dev-secret-key-minimum-32-chars
      NODE_ENV: development
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./server:/app

volumes:
  postgres_data:
```

### Launch

```bash
docker-compose up -d

# View logs
docker-compose logs -f server

# Stop
docker-compose down
```

---

## Environment Configuration

### Development (.env.development)

```env
NODE_ENV=development
DEBUG=webrtc:*
LOG_LEVEL=debug
DATABASE_URL=postgresql://user:password@localhost:5432/webrtc_recorder
JWT_SECRET=dev-secret-key-minimum-32-chars
PORT=3000
TELEMETRY_SAMPLE_RATE=1.0
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Production (.env.production)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production configuration including:
- KMS encryption references
- CloudWatch logging
- DDoS thresholds
- Email alerts
- TLS certificates

---

## Verification

### Health Check

```bash
# Basic health
curl http://localhost:3000/health

# Detailed health with metrics
node scripts/health-check.js --verbose

# Expected output:
# ✓ 1. Health Endpoint
# ✓ 2. Authentication
# ✓ 3. Legal Database
# ✓ 4. System Requirements
# Overall Status: HEALTHY
```

### Run Tests

```bash
cd server

# All tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get legal rules
curl http://localhost:3000/api/legal/detect?country=US

# Metrics
curl http://localhost:3000/metrics

# Prometheus format
curl http://localhost:3000/metrics/prometheus
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
PORT=4000 npm run dev
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check credentials
psql -U webrtc -h localhost -d webrtc_recorder
```

### Node Memory Issues

```bash
# Increase heap size
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

### npm Install Fails

```bash
# Clear cache
npm cache clean --force

# Use legacy peer deps
npm install --legacy-peer-deps

# Try again
npm install
```

---

## Next Steps

1. **Read**: Review [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development workflow
2. **Test**: Run `npm test` to verify everything works
3. **Configure**: Customize `.env` file for your setup
4. **Deploy**: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment

---

**Need help?** Check [GitHub Issues](https://github.com/shizukutanaka/Ring/issues) or see [CONTRIBUTING.md](CONTRIBUTING.md).
