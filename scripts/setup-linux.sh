#!/bin/bash
# Linux Setup Script for WebRTC Call Recorder (Ubuntu/Debian)
# This script automates the setup of the development environment on Linux

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ WebRTC Call Recorder - Linux Setup Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root for system-level installs
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}This script requires sudo for system package installation.${NC}"
    echo -e "${YELLOW}You may be prompted for your password.${NC}"
    echo ""
fi

# Update package manager
echo -e "${YELLOW}Updating package manager...${NC}"
sudo apt-get update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION${NC}"
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Installing PostgreSQL...${NC}"
    sudo apt-get install -y postgresql postgresql-contrib
    # Start PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
fi

# Create database and user
echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE webrtc_recorder;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER webrtc WITH PASSWORD 'dev-password';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc;" 2>/dev/null || true

echo -e "${GREEN}✓ PostgreSQL setup complete${NC}"

# Install other development tools
echo -e "${YELLOW}Installing additional development tools...${NC}"
sudo apt-get install -y build-essential python3 git curl

# Setup server
echo -e "${YELLOW}Setting up server...${NC}"
cd "$(dirname "$0")/../server" || exit 1
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env.development" ]; then
    echo -e "${YELLOW}Creating .env.development...${NC}"
    cp .env.example .env.development 2>/dev/null || cat > .env.development << 'ENVEOF'
DATABASE_URL=postgresql://webrtc:dev-password@localhost:5432/webrtc_recorder
JWT_SECRET=dev-secret-key-minimum-32-characters-long
NODE_ENV=development
PORT=3000
DEBUG=webrtc:*
LOG_LEVEL=debug
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=1.0
ENVEOF
    echo -e "${GREEN}✓ Created .env.development${NC}"
fi

# Initialize database
echo -e "${YELLOW}Initializing database schema...${NC}"
psql -U webrtc -h localhost -d webrtc_recorder -f init_db.sql 2>/dev/null || echo "Schema already initialized"

# Setup mobile (optional)
echo ""
read -p "Setup mobile development environment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Setting up mobile environment...${NC}"
    cd ../mobile || exit 1
    npm install
    echo -e "${GREEN}✓ Mobile setup complete${NC}"
    echo -e "${YELLOW}Note: For Android development, install Android Studio separately${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ Setup Complete!                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Verify PostgreSQL is running:"
echo -e "   ${YELLOW}sudo systemctl status postgresql${NC}"
echo ""
echo "2. Start the development server:"
echo -e "   ${YELLOW}cd server && npm run dev${NC}"
echo ""
echo "3. In another terminal, start mobile development:"
echo -e "   ${YELLOW}cd mobile && npm start${NC}"
echo ""
echo "4. In another terminal, start the dashboard:"
echo -e "   ${YELLOW}cd client && npx http-server . -p 8080${NC}"
echo ""
echo "5. Check health:"
echo -e "   ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""
echo -e "${GREEN}✓ Setup complete! Happy coding!${NC}"
