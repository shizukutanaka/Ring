# Getting Started with WebRTC Call Recorder

Welcome to the WebRTC Call Recorder project! This guide will help you navigate the documentation and get up and running quickly.

## Choose Your Path

### 🚀 I want to try it out NOW (5 minutes)
→ Go to **[QUICKSTART.md](QUICKSTART.md)**
- Minimal setup steps
- Local development environment
- Verify it works with curl commands

### 📖 I want detailed installation instructions
→ Go to **[INSTALLATION.md](INSTALLATION.md)**
- Platform-specific steps (macOS, Windows, Linux)
- Docker setup instructions
- Dependency version requirements
- Troubleshooting during setup

### 🏗️ I want to understand the architecture
→ Go to **[ARCHITECTURE.md](ARCHITECTURE.md)**
- System component overview
- Data flow diagrams
- Security architecture
- Performance characteristics
- Monitoring & observability
- Testing strategy

### 🔧 I'm debugging an issue
→ Go to **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**
- Common errors and solutions
- Database connectivity issues
- Mobile development problems
- Performance debugging
- WebSocket debugging

### 👨‍💻 I want to contribute code
→ Go to **[CONTRIBUTING.md](CONTRIBUTING.md)**
- Code of conduct
- Development workflow
- PR review criteria
- Code quality standards

### 📚 I want comprehensive development docs
→ Go to **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**
- Setup prerequisites
- Daily workflow
- Testing strategies
- Code conventions
- Security guidelines
- Git commit conventions

---

## Quick Reference

### Important Links
- **API Documentation**: [docs/API.md](docs/API.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Legal Requirements**: [docs/LEGAL.md](docs/LEGAL.md)
- **Security Policy**: [SECURITY.md](SECURITY.md)
- **License**: [LICENSE](LICENSE)

### Repository Structure
```
webrtc-call-recorder/
├── server/                 # Node.js backend
│   ├── index.js           # Main server
│   ├── signaling.js       # WebRTC negotiation
│   ├── signing.js         # Digital signatures
│   ├── monitoring.js      # Metrics collection
│   ├── legaldb/           # 25+ country rules
│   └── tests/             # Unit & integration tests
│
├── mobile/                # React Native app
│   ├── src/screens/       # UI screens
│   ├── src/services/      # API & WebRTC
│   └── tests/             # Mobile tests
│
├── client/                # Web dashboard
│   └── dashboard.html
│
├── docs/                  # Full documentation
├── scripts/               # Utility scripts
├── .github/workflows/     # CI/CD pipelines
└── QUICKSTART.md          # Start here!
```

---

## Common Tasks

### Task: Start developing locally

```bash
# 1. Clone repo
git clone https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder

# 2. Start server
cd server
npm install
npm run dev

# 3. Start mobile development (in another terminal)
cd mobile
npm install
npm start

# 4. Open web dashboard (in another terminal)
cd client
npx http-server . -p 8080
# Visit http://localhost:8080
```

See **[QUICKSTART.md](QUICKSTART.md)** for more details.

---

### Task: Deploy to production

```bash
# 1. Read deployment guide
# Check docs/DEPLOYMENT.md

# 2. Configure environment
# Create .env.production with secrets

# 3. Deploy to your platform
# AWS: Use CloudFormation templates
# Kubernetes: Use Helm charts
# Docker: Build and push images
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for complete instructions.

---

### Task: Add support for a new country

```bash
# 1. Create legal rules file
touch server/legaldb/countries/NEW-COUNTRY.json

# 2. Define consent requirements
# Reference existing: server/legaldb/countries/US.json

# 3. Add auto-detection rule
# Edit server/legaldb/expanded_legaldb.json

# 4. Run tests
npm test

# 5. Commit changes
git commit -m "feat(legal): Add NEW-COUNTRY support"
```

See **[docs/LEGAL.md](docs/LEGAL.md)** for legal rule specifications.

---

### Task: Debug a failing test

```bash
# 1. Run specific test with logs
npm test -- signaling.test.js --verbose

# 2. Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand signaling.test.js

# 3. Check Chrome DevTools
# Visit chrome://inspect

# 4. Review test output
cat debug.log
```

See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for more debugging techniques.

---

## Key Concepts

### WebRTC Call Flow
1. User A initiates call → Server creates Call record
2. User B receives notification via WebSocket
3. User B accepts → Consent screen shows jurisdiction rules
4. Both sides generate SDP offers
5. Server bridges offers/answers via WebSocket
6. Peers establish direct audio connection
7. Recording occurs locally on both devices
8. Server records consent with RSA signature + timestamp
9. Evidence trail created for legal compliance

### Legal Compliance
- Automatic country/state detection
- Jurisdiction-specific consent requirements
- One-party vs all-party consent handling
- Consent logs with cryptographic proofs
- Multi-language consent templates
- 25+ countries supported

### Security Architecture
- JWT authentication for API access
- TLS 1.3+ for data in transit
- AES-256-CBC for recordings at rest
- RSA-2048 for consent signatures
- RFC3161 timestamps for legal evidence
- Rate limiting & DDoS protection

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | Node.js 18+ | Server, signaling, consent management |
| Frontend | React Native | iOS/Android mobile app |
| Dashboard | HTML/CSS/JS | Admin interface |
| Database | PostgreSQL 12+ | User data, call logs, consent records |
| Messaging | WebSocket | Real-time signaling |
| Security | OpenSSL, RSA | Signatures, encryption |
| Testing | Jest, Supertest | Unit & integration tests |
| Deployment | Docker, Kubernetes | Containerization & orchestration |
| Monitoring | Prometheus | Metrics & alerting |

---

## Development Workflow

### First Time Setup (5-10 minutes)

```bash
1. Clone repository
2. Install dependencies (npm install)
3. Setup PostgreSQL database
4. Configure .env file
5. Run npm run dev
6. Verify health check: curl localhost:3000/health
```

### Daily Development

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Mobile
cd mobile
npm start

# Terminal 3: Frontend
cd client
npx http-server . -p 8080

# Terminal 4: Testing
cd server
npm test -- --watch
```

### Before Committing

```bash
npm run lint          # Check code style
npm run format        # Auto-format code
npm test              # Run all tests
npm run health-check  # Verify system health
git add .
git commit -m "feat: Your feature description"
```

See **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** for complete workflow details.

---

## Frequently Asked Questions

### Q: Can I use this in production?

**A**: The project is in **Beta** (v0.1.0). Before production:
1. Have a lawyer review legal compliance for your jurisdiction
2. Complete security audit
3. Load test with expected traffic
4. Setup monitoring & alerting
5. Establish disaster recovery procedures

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for production checklist.

---

### Q: What platforms are supported?

**A**:
- **Mobile**: iOS 13+ (TestFlight/sideload), Android 8+ (sideload)
- **Backend**: Any platform with Node.js 18+ and PostgreSQL 12+
- **Dashboard**: Any modern web browser
- **App Store**: Not on Play Store/App Store (see LEGAL.md for why)

---

### Q: How do I add support for my country?

**A**:
1. Research your country's recording consent laws
2. Create `server/legaldb/countries/YOUR-COUNTRY.json`
3. Add rules for consent type, notifications, etc.
4. Submit pull request with legal references

See **[docs/LEGAL.md](docs/LEGAL.md)** for legal rule format.

---

### Q: Is there commercial support?

**A**: This is an open-source project. For:
- Bug reports: Use GitHub Issues
- Feature requests: Use GitHub Discussions
- Security issues: See SECURITY.md for reporting

---

### Q: Can I integrate with other services?

**A**: Yes! The API is extensible:
- REST API for external integrations
- WebSocket for real-time updates
- PostgreSQL for direct queries
- Webhook support planned

See **[docs/API.md](docs/API.md)** for integration examples.

---

## Getting Help

### Documentation
- **Quick Setup**: [QUICKSTART.md](QUICKSTART.md)
- **Installation**: [INSTALLATION.md](INSTALLATION.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **API Reference**: [docs/API.md](docs/API.md)
- **Development**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

### Community
- **Issues**: [GitHub Issues](https://github.com/your-org/webrtc-call-recorder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/webrtc-call-recorder/discussions)
- **Security**: [SECURITY.md](SECURITY.md)

### Contributing
- **Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Next Steps

1. **Choose your path** from the options above
2. **Setup your environment** following the relevant guide
3. **Run the health check** to verify everything works
4. **Explore the API** with curl commands
5. **Read the code** in server/ and mobile/ directories
6. **Write tests** for your changes
7. **Submit a PR** when ready to contribute

---

## Project Status

| Phase | Status | Components |
|-------|--------|-----------|
| **Phase 1** | ✅ Complete | API server, database schema, legal DB |
| **Phase 2** | ✅ Complete | WebRTC signaling, signing, mobile client |
| **Phase 3** | ✅ Complete | Monitoring, health checks, documentation |
| **Phase 4** | 🔄 Ready | Security audit, law review, production deployment |

---

**Last Updated**: 2025-11-17

**Version**: 0.2.0 (Beta)

---

Ready to get started? → **[QUICKSTART.md](QUICKSTART.md)** 🚀
