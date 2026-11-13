# Quick Start Guide

Get the WebRTC Call Recorder up and running in 5 minutes.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download/))
- **npm** 9+ (comes with Node.js)
- **Git** 2.30+

## Step 1: Clone the Repository

```bash
git clone https://github.com/shizukutanaka/Ring.git
cd Ring
```

## Step 2: Start PostgreSQL

### macOS (Homebrew)
```bash
brew services start postgresql
```

### Windows
```cmd
# PostgreSQL service should be running (set during installation)
# Or use Docker:
docker run -d --name webrtc-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
```

### Linux
```bash
sudo systemctl start postgresql
```

## Step 3: Setup Server

```bash
cd server
npm install

# Create .env file for development
cp .env.example .env.development

# Initialize database
psql -U postgres -c "CREATE DATABASE webrtc_recorder;"
```

## Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
✓ Server listening on port 3000
✓ Database connected
✓ WebSocket server ready
```

## Step 5: Test the API

In a new terminal:

```bash
# Health check
curl http://localhost:3000/health

# Get sample legal data
curl http://localhost:3000/api/legal/detect?country=US&state=CA
```

## Step 6: (Optional) Start the Web Dashboard

```bash
# In another terminal
cd client
python3 -m http.server 8080
# or: npx http-server . -p 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## What's Next?

- **Read the docs**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full development guide
- **Run tests**: `npm test` in the server directory
- **Mobile development**: See [mobile/README.md](mobile/README.md)
- **Deploy**: Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup

## Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:5432"
Database is not running. Make sure PostgreSQL is started.

### "npm ERR! code ERESOLVE"
Try: `npm install --legacy-peer-deps`

### "Port 3000 already in use"
Change port: `PORT=4000 npm run dev`

### Metro bundler errors (React Native)
```bash
cd mobile
npm start -- --reset-cache
```

## Need Help?

- Check [GitHub Issues](https://github.com/shizukutanaka/Ring/issues)
- Read [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup
- See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report bugs

---

**Next step**: Run `npm test` to verify everything is working!
