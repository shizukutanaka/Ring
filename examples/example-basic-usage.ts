/**
 * Basic Usage Example - WebRTC Call Recorder Client SDK
 *
 * This example demonstrates:
 * 1. Authenticating with the API
 * 2. Detecting legal rules by country
 * 3. Initiating a call
 * 4. Recording consent
 * 5. Retrieving call history
 */

import WebRTCCallRecorderClient from '../sdk/client-sdk';

/**
 * Example 1: Basic Authentication and Health Check
 */
async function exampleAuthentication() {
  console.log('\n=== Example 1: Authentication ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');

  try {
    // Check server health
    const health = await client.getHealth();
    console.log('Server Status:', health.status);
    console.log('Components:', health.components);

    // Login
    const auth = await client.login('user@example.com', 'password');
    console.log('Logged in as:', auth.user.email);
    console.log('Token received:', auth.token.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Detect Legal Rules by Location
 */
async function exampleLegalRules() {
  console.log('\n=== Example 2: Legal Rules Detection ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');
  await client.login('user@example.com', 'password');

  // Detect rules for California (all-party consent state)
  const caRules = await client.detectLegalRules('US', 'CA');
  console.log('California (US-CA):');
  console.log('  Consent Type:', caRules.consent_type);
  console.log('  Consent Required:', caRules.consent_required);

  // Detect rules for Japan (one-party consent)
  const jpRules = await client.detectLegalRules('JP');
  console.log('\nJapan (JP):');
  console.log('  Consent Type:', jpRules.consent_type);
  console.log('  Consent Required:', jpRules.consent_required);

  // Detect rules for EU (GDPR)
  const euRules = await client.detectLegalRules('DE');
  console.log('\nGermany (EU-DE):');
  console.log('  Consent Type:', euRules.consent_type);
  console.log('  Consent Template (EN):', euRules.consent_templates.en.substring(0, 100) + '...');
}

/**
 * Example 3: Initiate and Manage Calls
 */
async function exampleCallManagement() {
  console.log('\n=== Example 3: Call Management ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');
  await client.login('user@example.com', 'password');

  // Initiate a call
  const call = await client.initiateCall('recipient-user-id');
  console.log('Call Initiated:');
  console.log('  ID:', call.id);
  console.log('  Status:', call.status);
  console.log('  Started At:', call.started_at);

  // Record consent from caller
  const consentRecord = await client.recordConsent(call.id, true, 'visual');
  console.log('\nConsent Recorded:');
  console.log('  Consented:', consentRecord.consented);
  console.log('  Method:', consentRecord.method);
  console.log('  Signature:', consentRecord.signature.substring(0, 50) + '...');

  // End the call
  const endedCall = await client.endCall(call.id);
  console.log('\nCall Ended:');
  console.log('  Status:', endedCall.status);
  console.log('  Duration:', endedCall.duration_seconds, 'seconds');
}

/**
 * Example 4: Retrieve Call History
 */
async function exampleCallHistory() {
  console.log('\n=== Example 4: Call History ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');
  await client.login('user@example.com', 'password');

  // Get all calls
  const calls = await client.getCalls();
  console.log(`Total Calls: ${calls.length}`);

  // Display summary
  calls.forEach((call, index) => {
    console.log(
      `\n${index + 1}. Call ${call.id.substring(0, 8)}...`
    );
    console.log(`   Status: ${call.status}`);
    console.log(`   Started: ${call.started_at}`);
    if (call.duration_seconds) {
      console.log(`   Duration: ${call.duration_seconds}s`);
    }
  });

  // Get a specific call
  if (calls.length > 0) {
    const callId = calls[0].id;
    const specificCall = await client.getCall(callId);
    console.log('\nSpecific Call Details:');
    console.log('  ID:', specificCall.id);
    console.log('  Initiator ID:', specificCall.initiator_id);
    console.log('  Status:', specificCall.status);

    // Get consent records for this call
    const consentRecords = await client.getConsentRecords(callId);
    console.log(`  Consent Records: ${consentRecords.length}`);
    consentRecords.forEach((record) => {
      console.log(`    - ${record.party_id}: ${record.consented ? 'Consented' : 'Did Not Consent'}`);
    });
  }
}

/**
 * Example 5: Real-time Monitoring with WebSocket
 */
async function exampleRealtimeMonitoring() {
  console.log('\n=== Example 5: Real-time Monitoring ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');
  await client.login('user@example.com', 'password');

  // Connect to WebSocket for real-time updates
  const ws = client.connectWebSocket(
    (data) => {
      console.log('Event received:');
      console.log('  Type:', data.type);
      console.log('  Timestamp:', data.timestamp);
      console.log('  Data:', JSON.stringify(data, null, 2));
    },
    (error) => {
      console.error('WebSocket error:', error);
    }
  );

  // Wait for WebSocket to connect
  await new Promise((resolve) => {
    ws.onopen = () => {
      console.log('Connected to real-time events');
      resolve(null);
    };
  });

  // Listen for events for 30 seconds
  await new Promise((resolve) => {
    setTimeout(() => {
      console.log('Closing WebSocket connection');
      ws.close();
      resolve(null);
    }, 30000);
  });
}

/**
 * Example 6: Monitor Metrics
 */
async function exampleMetrics() {
  console.log('\n=== Example 6: Server Metrics ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');

  const metrics = await client.getMetrics();
  console.log('API Metrics:');
  console.log('  Total Requests:', metrics.http_requests_total);
  console.log('  Response Time (P50):', metrics.http_request_duration_ms.p50, 'ms');
  console.log('  Response Time (P95):', metrics.http_request_duration_ms.p95, 'ms');
  console.log('  Response Time (P99):', metrics.http_request_duration_ms.p99, 'ms');
  console.log('  Total Errors:', metrics.errors_total);
  console.log('  Active Connections:', metrics.active_connections);
}

/**
 * Example 7: Error Handling
 */
async function exampleErrorHandling() {
  console.log('\n=== Example 7: Error Handling ===\n');

  const client = new WebRTCCallRecorderClient('http://localhost:3000');

  try {
    // Try to login with invalid credentials
    await client.login('nonexistent@example.com', 'wrongpassword');
  } catch (error) {
    console.log('Caught expected error:', error);
  }

  try {
    // Try to initiate call without authentication
    const unauthenticatedClient = new WebRTCCallRecorderClient('http://localhost:3000');
    await unauthenticatedClient.initiateCall('some-id');
  } catch (error) {
    console.log('Caught expected error:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('WebRTC Call Recorder - Usage Examples');
  console.log('=====================================\n');

  try {
    await exampleAuthentication();
    await exampleLegalRules();
    await exampleCallManagement();
    await exampleCallHistory();
    await exampleRealtimeMonitoring();
    await exampleMetrics();
    await exampleErrorHandling();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run examples
if (require.main === module) {
  runAllExamples();
}

export {
  exampleAuthentication,
  exampleLegalRules,
  exampleCallManagement,
  exampleCallHistory,
  exampleRealtimeMonitoring,
  exampleMetrics,
  exampleErrorHandling,
};
