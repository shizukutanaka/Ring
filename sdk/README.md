# WebRTC Call Recorder - JavaScript/TypeScript SDK

Professional SDK for integrating with the WebRTC Call Recorder API.

## Installation

### From npm (when published)

```bash
npm install @webrtc-call-recorder/sdk
```

### From source

```bash
# Copy the SDK file
cp sdk/client-sdk.ts your-project/lib/

# Or build from TypeScript
tsc sdk/client-sdk.ts --declaration --outDir dist/
```

## Quick Start

```typescript
import WebRTCCallRecorderClient from './sdk/client-sdk';

// Initialize client
const client = new WebRTCCallRecorderClient('http://localhost:3000');

// Authenticate
await client.login('user@example.com', 'password');

// Initiate a call
const call = await client.initiateCall('recipient-id');

// Record consent
await client.recordConsent(call.id, true, 'visual');

// Get call history
const calls = await client.getCalls();
```

## API Reference

### Authentication

#### `login(email: string, password: string): Promise<AuthResponse>`

Authenticate with email and password.

```typescript
const auth = await client.login('user@example.com', 'password');
console.log(auth.token);
```

#### `logout(): void`

Clear authentication token.

```typescript
client.logout();
```

#### `isAuthenticated(): boolean`

Check if currently authenticated.

```typescript
if (client.isAuthenticated()) {
  // Make authenticated requests
}
```

### Call Management

#### `initiateCall(recipientId: string): Promise<Call>`

Start a new call.

```typescript
const call = await client.initiateCall('recipient-id');
console.log(call.id, call.status);
```

#### `getCalls(): Promise<Call[]>`

Get all calls for current user.

```typescript
const calls = await client.getCalls();
calls.forEach(call => {
  console.log(call.id, call.status, call.duration_seconds);
});
```

#### `getCall(callId: string): Promise<Call>`

Get a specific call by ID.

```typescript
const call = await client.getCall('call-id');
```

#### `endCall(callId: string): Promise<Call>`

End an active call.

```typescript
const call = await client.endCall('call-id');
console.log('Call ended at:', call.ended_at);
```

### Consent Management

#### `recordConsent(callId: string, consented: boolean, method: string): Promise<ConsentRecord>`

Record user consent for a call.

```typescript
const consent = await client.recordConsent(
  'call-id',
  true,  // consented
  'visual'  // method: 'voice', 'visual', or 'explicit'
);
console.log('Consent signature:', consent.signature);
```

#### `getConsentRecords(callId: string): Promise<ConsentRecord[]>`

Get consent records for a call.

```typescript
const records = await client.getConsentRecords('call-id');
records.forEach(record => {
  console.log(record.party_id, 'consented:', record.consented);
});
```

### Legal Compliance

#### `detectLegalRules(country: string, state?: string): Promise<LegalRules>`

Auto-detect legal rules by location.

```typescript
const rules = await client.detectLegalRules('US', 'CA');
console.log('Consent type:', rules.consent_type);
console.log('Consent required:', rules.consent_required);
```

#### `getLegalRules(country: string): Promise<LegalRules>`

Get legal rules for a country.

```typescript
const rules = await client.getLegalRules('JP');
console.log('Consent templates:', Object.keys(rules.consent_templates));
```

### Monitoring

#### `getHealth(): Promise<HealthStatus>`

Check server health status.

```typescript
const health = await client.getHealth();
if (health.status === 'healthy') {
  console.log('✓ Server is healthy');
}
```

#### `getMetrics(): Promise<Metrics>`

Get server metrics.

```typescript
const metrics = await client.getMetrics();
console.log('P95 Response:', metrics.http_request_duration_ms.p95, 'ms');
```

### Real-time Updates

#### `connectWebSocket(onMessage: Function, onError: Function): WebSocket`

Connect to real-time event stream.

```typescript
const ws = client.connectWebSocket(
  (data) => {
    console.log('Event:', data.type, data.payload);
  },
  (error) => {
    console.error('WebSocket error:', error);
  }
);

// Close when done
ws.close();
```

## Usage Examples

### Example 1: Complete Call Flow

```typescript
const client = new WebRTCCallRecorderClient('http://localhost:3000');

// 1. Authenticate
await client.login('alice@example.com', 'password');

// 2. Check legal requirements for recipient's location
const rules = await client.detectLegalRules('US', 'NY');
console.log('All-party consent required:', rules.consent_type === 'all-party');

// 3. Initiate call
const call = await client.initiateCall('bob-id');

// 4. Record consent from both parties
await client.recordConsent(call.id, true, 'visual');  // Alice consents
// Bob also consents via their client
await client.recordConsent(call.id, true, 'explicit'); // Bob's app confirms

// 5. Retrieve call details with consent records
const completedCall = await client.getCall(call.id);
const consents = await client.getConsentRecords(call.id);

console.log('Call completed with:', consents.length, 'consent records');
consents.forEach(c => {
  console.log(`- ${c.party_id}: ${c.consented ? '✓' : '✗'} (${c.consent_method})`);
});
```

### Example 2: Real-time Monitoring

```typescript
const client = new WebRTCCallRecorderClient('http://localhost:3000');

// Connect to real-time events
const ws = client.connectWebSocket(
  (event) => {
    switch (event.type) {
      case 'call-initiated':
        console.log('New call:', event.data.call_id);
        break;
      case 'call-ended':
        console.log('Call ended:', event.data.call_id);
        break;
      case 'consent-recorded':
        console.log('Consent recorded:', event.data.party_id);
        break;
    }
  },
  (error) => console.error('Connection error:', error)
);

// Monitor metrics every 10 seconds
setInterval(async () => {
  const metrics = await client.getMetrics();
  console.log('Active connections:', metrics.active_connections);
  console.log('Error rate:', metrics.errors_total);
}, 10000);
```

### Example 3: Legal Compliance Check

```typescript
const client = new WebRTCCallRecorderClient('http://localhost:3000');

const countries = ['US', 'JP', 'DE', 'GB', 'CA'];

console.log('Legal Requirements by Country:');
console.log('==============================\n');

for (const country of countries) {
  const rules = await client.detectLegalRules(country);
  console.log(`${country}:`);
  console.log(`  Consent Type: ${rules.consent_type}`);
  console.log(`  Required: ${rules.consent_required}`);
  console.log();
}
```

## Error Handling

```typescript
try {
  await client.login('invalid@email.com', 'wrong-password');
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    console.error('Invalid credentials');
  }
}

try {
  await client.initiateCall('invalid-id');
} catch (error) {
  if (error.message.includes('Failed to initiate')) {
    console.error('Could not start call');
  }
}
```

## TypeScript Support

Full TypeScript types are included:

```typescript
import WebRTCCallRecorderClient, {
  Call,
  ConsentRecord,
  LegalRules,
  AuthResponse,
  HealthStatus,
  Metrics
} from './sdk/client-sdk';

// Types are automatically available
const call: Call = await client.initiateCall('id');
const rules: LegalRules = await client.detectLegalRules('US');
```

## Browser Support

```html
<!-- Include in browser -->
<script src="sdk/client-sdk.js"></script>

<script>
  const client = new WebRTCCallRecorderClient('http://api.example.com');
  client.login('user@example.com', 'password')
    .then(auth => console.log('Logged in'))
    .catch(err => console.error(err));
</script>
```

## Node.js Usage

```javascript
const WebRTCCallRecorderClient = require('./sdk/client-sdk').default;

async function main() {
  const client = new WebRTCCallRecorderClient('http://localhost:3000');
  const auth = await client.login('user@example.com', 'password');
  console.log('Logged in as:', auth.user.email);
}

main().catch(console.error);
```

## Configuration

### Custom Headers

```typescript
// Extend the client for custom headers
class CustomClient extends WebRTCCallRecorderClient {
  private getHeaders(): Headers {
    const headers = super.getHeaders();
    headers.set('X-Custom-Header', 'value');
    return headers;
  }
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

const calls = await withRetry(() => client.getCalls());
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try/catch
2. **Token Management**: Store token securely (not in localStorage)
3. **WebSocket**: Close connections when done to prevent memory leaks
4. **Rate Limiting**: Implement backoff for repeated requests
5. **Validation**: Validate user input before sending to API
6. **Monitoring**: Track API response times and errors
7. **Testing**: Mock API responses in tests

## Contributing

To contribute improvements to the SDK:

1. Edit `sdk/client-sdk.ts`
2. Update types and documentation
3. Test with examples
4. Submit pull request

## Support

- [API Documentation](../docs/API.md)
- [Getting Started](../GETTING_STARTED.md)
- [GitHub Issues](https://github.com/your-org/webrtc-call-recorder/issues)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-17
