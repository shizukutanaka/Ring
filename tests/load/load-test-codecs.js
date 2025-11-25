import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  scenarios: {
    codec_negotiation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '0s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'failed_negotiations': ['rate<0.01'],
  },
};

const failedNegotiations = new Rate('failed_negotiations');
const negotiationDuration = new Trend('negotiation_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const CLIENT_PROFILES = [
  {
    name: 'Modern Browser (AV1)',
    capabilities: {
      codecs: ['AV1', 'VP9', 'H264'],
      bandwidth: 5000000, // 5 Mbps
      latency: 20
    }
  },
  {
    name: 'Mobile Device (VP9)',
    capabilities: {
      codecs: ['VP9', 'H264'],
      bandwidth: 2000000, // 2 Mbps
      latency: 50
    }
  },
  {
    name: 'Legacy Device (H264)',
    capabilities: {
      codecs: ['H264'],
      bandwidth: 1000000, // 1 Mbps
      latency: 100
    }
  }
];

export default function() {
  const profile = CLIENT_PROFILES[Math.floor(Math.random() * CLIENT_PROFILES.length)];

  group(`Negotiation - ${profile.name}`, function() {
    const payload = JSON.stringify({
      sdp: "v=0...", // Simplified SDP for load testing
      capabilities: profile.capabilities
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const startTime = new Date();
    const res = http.post(`${BASE_URL}/api/codecs/negotiate`, payload, params);
    const duration = new Date() - startTime;
    
    negotiationDuration.add(duration);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'has selected codec': (r) => r.json('selectedCodec') !== undefined,
    });

    if (!success) {
      failedNegotiations.add(1);
    } else {
      // Verify logic: AV1 clients should prefer AV1/VP9, Legacy should get H264
      const selected = res.json('selectedCodec');
      check(selected, {
        'correct codec selection': (s) => {
          if (profile.name.includes('AV1')) return ['AV1', 'VP9'].includes(s);
          if (profile.name.includes('VP9')) return ['VP9', 'H264'].includes(s);
          return s === 'H264';
        }
      });
    }
  });

  sleep(1);
}
