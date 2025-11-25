import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const options = {
    scenarios: {
        high_quality_clients: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 20 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 0 },
            ],
            env: { CLIENT_TYPE: 'high_quality' },
        },
        mobile_clients: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 50 },
                { duration: '5m', target: 50 },
                { duration: '2m', target: 0 },
            ],
            env: { CLIENT_TYPE: 'mobile' },
        },
        legacy_clients: {
            executor: 'constant-vus',
            vus: 10,
            duration: '9m',
            env: { CLIENT_TYPE: 'legacy' },
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<500'],
        'failed_requests': ['rate<0.05'],
    },
};

const failedRequests = new Rate('failed_requests');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const CLIENT_CONFIGS = {
    high_quality: {
        capabilities: { codecs: ['AV1', 'VP9', 'H264'], bandwidth: 5000000 },
        behavior: { callDuration: 60, consentRate: 0.9 }
    },
    mobile: {
        capabilities: { codecs: ['VP9', 'H264'], bandwidth: 2000000 },
        behavior: { callDuration: 30, consentRate: 0.7 }
    },
    legacy: {
        capabilities: { codecs: ['H264'], bandwidth: 1000000 },
        behavior: { callDuration: 15, consentRate: 0.5 }
    }
};

export default function () {
    const clientType = __ENV.CLIENT_TYPE || 'mobile';
    const config = CLIENT_CONFIGS[clientType];

    // 1. Negotiate Codec
    const negotiateRes = http.post(
        `${BASE_URL}/api/codecs/negotiate`,
        JSON.stringify({ capabilities: config.capabilities }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (!check(negotiateRes, { 'negotiation success': (r) => r.status === 200 })) {
        failedRequests.add(1);
        return;
    }

    // 2. Initiate Call
    const callRes = http.post(
        `${BASE_URL}/api/calls/initiate`,
        JSON.stringify({ recipient_id: `recipient-${Math.random()}` }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (!check(callRes, { 'call initiated': (r) => r.status === 200 })) {
        failedRequests.add(1);
        return;
    }

    const callId = callRes.json('call_id');

    // 3. Record Consent (Probabilistic)
    if (Math.random() < config.behavior.consentRate) {
        http.post(
            `${BASE_URL}/api/consent/record`,
            JSON.stringify({ call_id: callId, consented: true, consent_method: 'visual' }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 4. Simulate Call Duration
    sleep(Math.random() * 5 + 1); // Shortened for test speed

    // 5. End Call
    http.post(
        `${BASE_URL}/api/calls/${callId}/end`,
        JSON.stringify({}),
        { headers: { 'Content-Type': 'application/json' } }
    );
}
