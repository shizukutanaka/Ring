/**
 * WebRTC Call Recorder - JavaScript/TypeScript Client SDK
 *
 * Usage:
 *   const client = new WebRTCCallRecorderClient('http://localhost:3000');
 *   await client.login('user@example.com', 'password');
 *   const calls = await client.getCalls();
 */

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

interface Call {
  id: string;
  initiator_id: string;
  recipient_id: string;
  status: 'pending' | 'ringing' | 'accepted' | 'ended';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

interface ConsentRecord {
  id: string;
  call_id: string;
  party_id: string;
  consented: boolean;
  consent_method: 'voice' | 'visual' | 'explicit';
  recorded_at: string;
  signature: string;
}

interface LegalRules {
  country: string;
  state?: string;
  consent_type: 'one-party' | 'all-party';
  consent_required: boolean;
  consent_templates: {
    [language: string]: string;
  };
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  components: {
    health_endpoint: boolean;
    authentication: boolean;
    legal_database: boolean;
    system_requirements: boolean;
  };
}

interface Metrics {
  http_requests_total: number;
  http_request_duration_ms: {
    p50: number;
    p95: number;
    p99: number;
  };
  errors_total: number;
  active_connections: number;
}

/**
 * WebRTC Call Recorder Client SDK
 */
export class WebRTCCallRecorderClient {
  private baseUrl: string;
  private token: string | null = null;
  private userId: string | null = null;
  private wsUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.wsUrl = this.baseUrl
      .replace(/^http/, 'ws')
      .replace(/^https/, 'wss');
  }

  /**
   * Authenticate with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    this.userId = data.user.id;
    return data;
  }

  /**
   * Logout and clear token
   */
  logout(): void {
    this.token = null;
    this.userId = null;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    return headers;
  }

  /**
   * Initiate a new call
   */
  async initiateCall(recipientId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/api/calls`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recipient_id: recipientId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate call: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all calls for current user
   */
  async getCalls(): Promise<Call[]> {
    const response = await fetch(`${this.baseUrl}/api/calls`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calls: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific call by ID
   */
  async getCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/api/calls/${callId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch call: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * End a call
   */
  async endCall(callId: string): Promise<Call> {
    const response = await fetch(`${this.baseUrl}/api/calls/${callId}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to end call: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get consent records for a call
   */
  async getConsentRecords(callId: string): Promise<ConsentRecord[]> {
    const response = await fetch(
      `${this.baseUrl}/api/calls/${callId}/consent`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch consent records: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Record consent for a call
   */
  async recordConsent(
    callId: string,
    consented: boolean,
    method: 'voice' | 'visual' | 'explicit'
  ): Promise<ConsentRecord> {
    const response = await fetch(
      `${this.baseUrl}/api/calls/${callId}/consent`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ consented, method }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to record consent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Detect legal rules by country/state
   */
  async detectLegalRules(
    country: string,
    state?: string
  ): Promise<LegalRules> {
    let url = `${this.baseUrl}/api/legal/detect?country=${encodeURIComponent(
      country
    )}`;
    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }

    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(
        `Failed to detect legal rules: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get legal rules for a specific jurisdiction
   */
  async getLegalRules(country: string): Promise<LegalRules> {
    const response = await fetch(
      `${this.baseUrl}/api/legal/${encodeURIComponent(country)}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch legal rules: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<Metrics> {
    const response = await fetch(`${this.baseUrl}/metrics`);

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    }

    // Parse Prometheus format if needed
    const text = await response.text();
    return this.parseMetrics(text);
  }

  /**
   * Connect to WebSocket for real-time events
   */
  connectWebSocket(
    onMessage: (data: any) => void,
    onError: (error: Event) => void
  ): WebSocket {
    const ws = new WebSocket(this.wsUrl);

    ws.onopen = () => {
      // Send authentication if token exists
      if (this.token) {
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            token: this.token,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = onError;

    return ws;
  }

  /**
   * Helper: Parse Prometheus metrics format
   */
  private parseMetrics(text: string): Metrics {
    const lines = text.split('\n');
    const metrics: any = {};

    for (const line of lines) {
      if (line.startsWith('#')) continue; // Skip comments

      const [key, value] = line.split(' ');
      if (key && value) {
        metrics[key] = parseFloat(value);
      }
    }

    return {
      http_requests_total: metrics['http_requests_total'] || 0,
      http_request_duration_ms: {
        p50: metrics['http_request_duration_ms_p50'] || 0,
        p95: metrics['http_request_duration_ms_p95'] || 0,
        p99: metrics['http_request_duration_ms_p99'] || 0,
      },
      errors_total: metrics['errors_total'] || 0,
      active_connections: metrics['active_connections'] || 0,
    };
  }
}

/**
 * Example usage:
 *
 * async function example() {
 *   const client = new WebRTCCallRecorderClient('http://localhost:3000');
 *
 *   // Authenticate
 *   await client.login('user@example.com', 'password');
 *
 *   // Get legal rules for country
 *   const rules = await client.detectLegalRules('US', 'CA');
 *   console.log('Consent required:', rules.consent_required);
 *
 *   // Initiate a call
 *   const call = await client.initiateCall('recipient-id');
 *   console.log('Call ID:', call.id);
 *
 *   // Record consent
 *   await client.recordConsent(call.id, true, 'visual');
 *
 *   // Get all calls
 *   const calls = await client.getCalls();
 *   console.log('Total calls:', calls.length);
 *
 *   // Connect to WebSocket for real-time updates
 *   const ws = client.connectWebSocket(
 *     (data) => console.log('Event:', data),
 *     (error) => console.error('WebSocket error:', error)
 *   );
 *
 *   // Get metrics
 *   const metrics = await client.getMetrics();
 *   console.log('Request P95:', metrics.http_request_duration_ms.p95, 'ms');
 * }
 */

export default WebRTCCallRecorderClient;
