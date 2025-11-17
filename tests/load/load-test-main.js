import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Load configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up: 0 → 100 users
    { duration: '5m', target: 500 },    // Ramp up: 100 → 500 users
    { duration: '10m', target: 500 },   // Stay at high load
    { duration: '5m', target: 1000 },   // Spike: 500 → 1000 users
    { duration: '5m', target: 500 },    // Cool down: 1000 → 500 users
    { duration: '2m', target: 0 },      // Ramp down: 500 → 0 users
  ],

  thresholds: {
    // HTTP metrics
    'http_req_duration': ['p(95)<200', 'p(99)<500', 'p(99.9)<1000'],
    'http_req_failed': ['rate<0.1'],
    'http_requests': ['rate>100'],

    // Custom metrics
    'api_errors': ['rate<0.05'],
    'call_initiated': ['rate>10'],
    'consent_recorded': ['rate>10'],
  },

  ext: {
    loadimpact: {
      projectID: 3437678,
      name: 'WebRTC Call Recorder - Main Load Test'
    }
  }
};

// Custom metrics
const errorRate = new Rate('api_errors');
const callInitiatedCounter = new Counter('call_initiated');
const consentRecordedCounter = new Counter('consent_recorded');
const apiDurationTrend = new Trend('api_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Utility functions
function randomUserId() {
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

function randomCallId() {
  return 'call-' + Math.random().toString(36).substr(2, 9);
}

export default function() {
  const userPair = {
    initiator: randomUserId(),
    recipient: randomUserId()
  };

  // Authenticate
  group('Authentication', function() {
    const loginResponse = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'has token': (r) => r.json('token') !== undefined,
    });

    errorRate.add(loginResponse.status !== 200);
  });

  // Test: Initiate Call
  group('Initiate Call', function() {
    const startTime = new Date();

    const initiateResponse = http.post(
      `${BASE_URL}/api/calls/initiate`,
      JSON.stringify({
        recipient_id: userPair.recipient
      }),
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const duration = new Date() - startTime;
    apiDurationTrend.add(duration);

    const success = check(initiateResponse, {
      'call initiated': (r) => r.status === 200,
      'has call_id': (r) => r.json('call_id') !== null,
      'status is initiated': (r) => r.json('status') === 'initiated',
    });

    if (success) {
      callInitiatedCounter.add(1);
      userPair.callId = initiateResponse.json('call_id');
    }

    errorRate.add(!success);
  });

  // Test: Record Consent
  if (userPair.callId) {
    group('Record Consent', function() {
      const consentResponse = http.post(
        `${BASE_URL}/api/consent/record`,
        JSON.stringify({
          call_id: userPair.callId,
          consented: Math.random() > 0.1, // 90% consent rate
          consent_method: ['voice', 'visual', 'explicit'][Math.floor(Math.random() * 3)]
        }),
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const success = check(consentResponse, {
        'consent recorded': (r) => r.status === 200,
        'has signature': (r) => r.json('signature') !== undefined,
      });

      if (success) {
        consentRecordedCounter.add(1);
      }

      errorRate.add(!success);
    });
  }

  // Test: Get Call Details
  group('Get Call Details', function() {
    const getResponse = http.get(
      `${BASE_URL}/api/calls/${userPair.callId}`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    check(getResponse, {
      'call retrieved': (r) => r.status === 200,
      'has call data': (r) => r.json('id') !== undefined,
    });

    errorRate.add(getResponse.status !== 200);
  });

  // Test: End Call
  if (userPair.callId) {
    group('End Call', function() {
      const endResponse = http.post(
        `${BASE_URL}/api/calls/${userPair.callId}/end`,
        JSON.stringify({}),
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      check(endResponse, {
        'call ended': (r) => r.status === 200,
        'status is ended': (r) => r.json('status') === 'ended',
      });

      errorRate.add(endResponse.status !== 200);
    });
  }

  sleep(1);
}

export function setup() {
  return {
    baseUrl: BASE_URL,
    token: AUTH_TOKEN
  };
}

export function teardown(data) {
  console.log(`Test completed. Total duration: ${new Date() - __ENV.TEST_START}`);
}
