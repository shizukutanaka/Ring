# WebRTC Call Recorder - Mobile Application

Professional React Native mobile application for iOS and Android with WebRTC call recording, consent management, and multi-jurisdiction legal compliance.

## Overview

This React Native application provides:
- User authentication with MFA support
- Initiate and manage calls
- Digital consent recording with RSA-2048 signatures
- RFC3161 timestamp support for legal evidence
- Multi-jurisdiction legal compliance detection
- Secure token storage (Secure Store)
- Offline support with local storage
- Real-time call status updates via WebSocket
- Comprehensive error handling

## Quick Start

### Prerequisites

```bash
# Node.js v16+ and npm v8+
node --version   # v16.0.0+
npm --version    # v8.0.0+

# Install Expo CLI
npm install -g expo-cli

# iOS (macOS only)
xcode-select --install

# Android
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
```

### Install & Run

```bash
cd mobile
npm install
expo start

# Press 'i' for iOS or 'a' for Android
```

## Architecture

### App Structure
```
App.tsx (Main entry point with Navigation)
├── AuthContext (Authentication state)
├── CallContext (Call state)
└── Navigation Stack
    ├── Auth Stack (Login/Register)
    └── App Stack (Home, Call, Consent, Settings)
```

### Services

**AuthService** - Token management and authentication
```typescript
await AuthService.login(email, password);
await AuthService.register(email, password, name);
await AuthService.logout();
const token = await AuthService.getStoredToken();
```

**CallService** - Call management and consent
```typescript
const call = await CallService.initiateCall(recipientId);
const consent = await CallService.recordConsent(callId, true, 'visual');
const rules = await CallService.detectLegalRules('US', 'CA');
```

## Key Features

### Authentication
- Secure token storage (Secure Store)
- Multi-factor authentication (MFA)
- Automatic token refresh
- Logout with cleanup

### Calls
- Initiate calls with metadata
- Real-time status updates (WebSocket)
- Call history management
- Offline support

### Consent
- Multi-jurisdiction legal compliance
- Consent method selection (voice, visual, explicit)
- Digital signatures (RSA-2048)
- RFC3161 timestamps
- Offline consent recording

### Security
- TLS 1.2+ for API calls
- Secure token storage
- SSL certificate pinning (production)
- Permission management (camera, microphone, location)

## Screens

### LoginScreen
- Email/password authentication
- Registration form
- Password reset
- Error handling

### HomeScreen
- Call history
- Legal rules display
- "Initiate Call" button
- Call details view

### CallScreen
- Active call interface
- Real-time timer
- Call controls (mute, speaker, end)
- Caller information

### ConsentScreen
- Legal requirement display
- Consent method selection
- Signature capture
- Confirmation

### SettingsScreen
- User profile
- Privacy settings
- MFA management
- About & Help

## Development

### Project Structure
```
mobile/
├── App.tsx              # Main component
├── app.json             # Expo config
├── screens/             # Screen components
├── services/            # API services
├── context/             # Context providers
├── components/          # Reusable components
├── utils/               # Utilities
└── types/               # TypeScript types
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
detox build-framework-cache
detox build-app-cache
detox test
```

### Build Production

**Android**
```bash
eas build --platform android --profile release
eas submit --platform android --latest
```

**iOS**
```bash
eas build --platform ios --profile release
eas submit --platform ios --latest
```

## Configuration

### Environment
```bash
# .env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

### Permissions (iOS/Android)
- Microphone
- Camera
- Location (for legal compliance)
- Calendar (optional)

## Performance

- Memoized components with React.memo
- Lazy loaded screens
- Image caching
- Efficient re-renders

## Security Best Practices

✅ Secure token storage
✅ HTTPS/TLS 1.2+
✅ Input validation
✅ Error handling
✅ Permission management
✅ Offline data encryption

## Troubleshooting

**Cannot find module**: `npm install`
**Build failed**: `expo prebuild --clean`
**Network errors**: Check `.env` API URL

## Support

- GitHub: https://github.com/your-org/webrtc-recorder
- Email: support@example.com
- Documentation: See docs/ folder

---

**Version**: 1.0.0-beta
**Platform**: React Native 0.72+
**Updated**: 2025-11-17
