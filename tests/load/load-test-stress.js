import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Stress Test: Push the system to its limits
 * Goal: Identify breaking points and max capacity
 */
export const options = {
  stages: [
    { duration: '1m', target: 500 },     // Warm up
    { duration: '1m', target: 1000 },    // High load
    { duration: '2m', target: 2000 },    // Push to limit
    { duration: '2m', target: 3000 },    // Beyond expected capacity
    { duration: '1m', target: 1000 },    // Recovery
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<2000'],
    'http_req_failed': ['rate<0.2'],     // Relaxed threshold for stress
    'error_rate': ['value<30'],          // Expect some failures
  },

  ext: {
    loadimpact: {
      projectID: 3437678,
      name: 'WebRTC Call Recorder - Stress Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const errorRate = new Rate('error_rate');
const stressDuration = new Trend('stress_duration');
const failureCounter = new Counter('failures');

export default function() {
  const endpoints = [
    {
      name: 'Initiate Call',
      method: 'POST',
      url: `${BASE_URL}/api/calls/initiate`,
      payload: {
        recipient_id: 'user-' + Math.random().toString(36).substr(2, 5)
      }
    },
    {
      name: 'Get Calls',
      method: 'GET',
      url: `${BASE_URL}/api/calls`
    },
    {
      name: 'Record Consent',
      method: 'POST',
      url: `${BASE_URL}/api/consent/record`,
      payload: {
        call_id: 'call-' + Math.random().toString(36).substr(2, 5),
        consented: true,
        consent_method: 'visual'
      }
    }
  ];

  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const startTime = new Date();

  let response;

  if (randomEndpoint.method === 'GET') {
    response = http.get(randomEndpoint.url, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });
  } else {
    response = http.post(randomEndpoint.url, JSON.stringify(randomEndpoint.payload), {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  const duration = new Date() - startTime;
  stressDuration.add(duration);

  const success = response.status >= 200 && response.status < 400;
  if (!success) {
    failureCounter.add(1);
  }

  errorRate.add(!success);

  check(response, {
    'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
  });
}
