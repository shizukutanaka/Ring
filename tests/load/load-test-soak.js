import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

/**
 * Soak Test (Endurance Test): Run sustained load for extended period
 * Goal: Identify memory leaks, connection issues, and degradation over time
 * Duration: 60 minutes of continuous load
 */
export const options = {
  stages: [
    { duration: '5m', target: 100 },       // Warm up gradually
    { duration: '50m', target: 100 },      // Sustain for 50 minutes
    { duration: '5m', target: 0 },         // Cool down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<300'],    // Steady response time
    'http_req_failed': ['rate<0.05'],      // Very low failure rate expected
    'memory_trend': ['value<1000'],        // Monitor memory usage
  },

  ext: {
    loadimpact: {
      projectID: 3437678,
      name: 'WebRTC Call Recorder - Soak Test (60 minutes)'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const responseTimeTrend = new Trend('response_time');
const successCounter = new Counter('successful_requests');
const failureCounter = new Counter('failed_requests');
const memoryTrend = new Trend('memory_usage');

let requestCount = 0;
let errorCount = 0;

export default function() {
  const callId = 'soak-call-' + Math.random().toString(36).substr(2, 10);

  // Simulate realistic call workflow
  const workflows = [
    initializeCall,
    recordConsent,
    getCallDetails,
    listCalls
  ];

  const workflow = workflows[Math.floor(Math.random() * workflows.length)];
  workflow(callId);

  requestCount++;

  // Log progress every 100 requests
  if (requestCount % 100 === 0) {
    console.log(`Soak test progress: ${requestCount} requests, ${errorCount} errors`);
  }

  // Steady sleep between requests
  sleep(1);
}

function initializeCall(callId) {
  const response = http.post(
    `${BASE_URL}/api/calls/initiate`,
    JSON.stringify({
      recipient_id: 'user-' + Math.random().toString(36).substr(2, 5)
    }),
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  recordMetrics(response, 'initiate_call');
}

function recordConsent(callId) {
  const response = http.post(
    `${BASE_URL}/api/consent/record`,
    JSON.stringify({
      call_id: callId,
      consented: true,
      consent_method: 'visual'
    }),
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  recordMetrics(response, 'record_consent');
}

function getCallDetails(callId) {
  const response = http.get(
    `${BASE_URL}/api/calls/${callId}`,
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  recordMetrics(response, 'get_call_details');
}

function listCalls() {
  const response = http.get(
    `${BASE_URL}/api/calls?limit=50&offset=0`,
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  recordMetrics(response, 'list_calls');
}

function recordMetrics(response, operation) {
  const isSuccess = response.status >= 200 && response.status < 400;

  responseTimeTrend.add(response.timings.duration, { operation });

  if (isSuccess) {
    successCounter.add(1);
  } else {
    failureCounter.add(1);
    errorCount++;
  }

  check(response, {
    'status ok': (r) => r.status >= 200 && r.status < 400,
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const summary = `
    Soak Test Summary
    =================
    Duration: ${data.state.testRunDurationMs} ms
    Successful Requests: ${successCounter.value || 0}
    Failed Requests: ${failureCounter.value || 0}

    Response Times:
    - p(50): ${data.metrics.response_time?.values?.['p(50)'] || 'N/A'} ms
    - p(95): ${data.metrics.response_time?.values?.['p(95)'] || 'N/A'} ms
    - p(99): ${data.metrics.response_time?.values?.['p(99)'] || 'N/A'} ms

    Status: ${failureCounter.value < data.metrics.http_requests?.value * 0.05 ? 'PASS' : 'FAIL'}
  `;

  return summary;
}
