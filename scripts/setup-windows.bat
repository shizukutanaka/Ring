@echo off
REM Windows Setup Script for WebRTC Call Recorder
REM This script automates the setup of the development environment on Windows

echo.
echo ============================================================
echo WebRTC Call Recorder - Windows Setup Script
echo ============================================================
echo.

REM Check if running as Administrator
openfiles > nul 2>&1
if errorlevel 1 (
    echo Warning: This script should be run as Administrator for best results.
    echo Some features may not work correctly.
    echo.
    pause
)

REM Check Node.js
echo Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed.
    echo Please download and install Node.js 18+ from https://nodejs.org
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] Node.js is installed: %NODE_VERSION%
)

REM Check npm
echo Checking npm...
npm -v >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo [OK] npm is installed: %NPM_VERSION%
)

REM Check PostgreSQL
echo Checking PostgreSQL...
psql -V >nul 2>&1
if errorlevel 1 (
    echo Error: PostgreSQL is not installed.
    echo Please download and install PostgreSQL 12+ from https://www.postgresql.org
    echo.
    pause
    exit /b 1
) else (
    echo [OK] PostgreSQL is installed
)

REM Check if PostgreSQL service is running
echo Checking PostgreSQL service...
net start | find /I "postgresql" >nul 2>&1
if errorlevel 1 (
    echo Warning: PostgreSQL service may not be running.
    echo Please start the PostgreSQL service from Services.msc
)

REM Create database and user
echo.
echo Setting up PostgreSQL database...
setlocal enabledelayedexpansion
for /f "tokens=*" %%i in ('psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'webrtc_recorder'" 2^>nul') do set DB_EXISTS=%%i

if "%DB_EXISTS%"=="" (
    echo Creating database...
    psql -U postgres -c "CREATE DATABASE webrtc_recorder;" >nul 2>&1
)

psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = 'webrtc'" >nul 2>&1
if errorlevel 1 (
    echo Creating database user...
    psql -U postgres -c "CREATE USER webrtc WITH PASSWORD 'dev-password';" >nul 2>&1
)

psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc;" >nul 2>&1

echo [OK] PostgreSQL setup complete

REM Setup server
echo.
echo Setting up server...
cd /d "%~dp0..\server"
if errorlevel 1 (
    echo Error: Could not navigate to server directory.
    exit /b 1
)

echo Installing server dependencies...
call npm install
if errorlevel 1 (
    echo Warning: npm install had issues, but continuing...
)

REM Create .env file if it doesn't exist
if not exist ".env.development" (
    echo Creating .env.development...
    (
        echo DATABASE_URL=postgresql://webrtc:dev-password@localhost:5432/webrtc_recorder
        echo JWT_SECRET=dev-secret-key-minimum-32-characters-long
        echo NODE_ENV=development
        echo PORT=3000
        echo DEBUG=webrtc:*
        echo LOG_LEVEL=debug
        echo TELEMETRY_ENABLED=true
        echo TELEMETRY_SAMPLE_RATE=1.0
    ) > .env.development
    echo [OK] Created .env.development
)

REM Initialize database
echo Initializing database schema...
psql -U webrtc -h localhost -d webrtc_recorder -f init_db.sql >nul 2>&1
if not errorlevel 1 (
    echo [OK] Database schema initialized
) else (
    echo Note: Database schema may already be initialized
)

REM Setup mobile (optional)
echo.
set /p SETUP_MOBILE="Setup mobile development environment? (y/n): "
if /i "%SETUP_MOBILE%"=="y" (
    echo Setting up mobile environment...
    cd /d "%~dp0..\mobile"
    if errorlevel 1 (
        echo Error: Could not navigate to mobile directory.
    ) else (
        echo Installing mobile dependencies...
        call npm install
        echo [OK] Mobile setup complete
    )
)

echo.
echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Verify PostgreSQL is running:
echo    - Open Services.msc and ensure "postgresql-x64-*" is running
echo.
echo 2. Start the development server:
echo    cd server
echo    npm run dev
echo.
echo 3. In another terminal, start mobile development:
echo    cd mobile
echo    npm start
echo.
echo 4. In another terminal, start the dashboard:
echo    cd client
echo    npx http-server . -p 8080
echo.
echo 5. Check health:
echo    curl http://localhost:3000/health
echo.
pause
