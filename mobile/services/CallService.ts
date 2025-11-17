/**
 * Call Service
 * Handles call management, recording, and consent
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Call {
  id: string;
  initiator_id: string;
  recipient_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: 'initiated' | 'ringing' | 'active' | 'ended';
}

interface ConsentRecord {
  id: string;
  call_id: string;
  user_id: string;
  consented: boolean;
  consent_method: 'voice' | 'visual' | 'explicit';
  signature: string;
  timestamp_token: string;
  recorded_at: string;
}

interface LegalRules {
  country: string;
  state?: string;
  consent_type: string;
  consent_required: boolean;
  consent_templates: Record<string, string>;
}

class CallService {
  private apiClient: AxiosInstance;
  private baseURL: string;
  private activeCall: Call | null = null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Set API client with auth token
   */
  setAuthClient(client: AxiosInstance) {
    this.apiClient = client;
  }

  /**
   * Initiate a call
   */
  async initiateCall(recipientId: string, metadata?: Record<string, any>): Promise<Call> {
    try {
      const response = await this.apiClient.post<Call>(
        '/api/calls/initiate',
        { recipient_id: recipientId, metadata }
      );

      this.activeCall = response.data;

      // Store call locally
      await this.storeCall(response.data);

      return response.data;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  /**
   * End active call
   */
  async endCall(callId: string): Promise<Call> {
    try {
      const response = await this.apiClient.post<Call>(
        `/api/calls/${callId}/end`,
        {}
      );

      this.activeCall = null;

      return response.data;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<Call> {
    try {
      const response = await this.apiClient.get<Call>(
        `/api/calls/${callId}`
      );

      return response.data;
    } catch (error) {
      console.error('Error getting call details:', error);
      throw error;
    }
  }

  /**
   * Get all calls for current user
   */
  async getCalls(limit: number = 50, offset: number = 0): Promise<Call[]> {
    try {
      const response = await this.apiClient.get<Call[]>('/api/calls', {
        params: { limit, offset },
      });

      return response.data;
    } catch (error) {
      console.error('Error getting calls:', error);
      throw error;
    }
  }

  /**
   * Record consent for a call
   */
  async recordConsent(
    callId: string,
    consented: boolean,
    consentMethod: 'voice' | 'visual' | 'explicit'
  ): Promise<ConsentRecord> {
    try {
      const response = await this.apiClient.post<ConsentRecord>(
        '/api/consent/record',
        {
          call_id: callId,
          consented,
          consent_method: consentMethod,
        }
      );

      // Store consent record locally
      await this.storeConsentRecord(response.data);

      return response.data;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Get consent records for a call
   */
  async getConsentRecords(callId: string): Promise<ConsentRecord[]> {
    try {
      const response = await this.apiClient.get<ConsentRecord[]>(
        `/api/consent/records/${callId}`
      );

      return response.data;
    } catch (error) {
      console.error('Error getting consent records:', error);
      throw error;
    }
  }

  /**
   * Get legal rules for location
   */
  async detectLegalRules(country: string, state?: string): Promise<LegalRules> {
    try {
      const response = await this.apiClient.get<LegalRules>(
        '/api/legal/rules',
        { params: { country, state } }
      );

      return response.data;
    } catch (error) {
      console.error('Error detecting legal rules:', error);
      throw error;
    }
  }

  /**
   * Check if consent is required for location
   */
  async isConsentRequired(country: string, state?: string): Promise<boolean> {
    try {
      const rules = await this.detectLegalRules(country, state);
      return rules.consent_required;
    } catch (error) {
      console.error('Error checking consent requirement:', error);
      return true; // Default to requiring consent
    }
  }

  /**
   * Get active call
   */
  getActiveCall(): Call | null {
    return this.activeCall;
  }

  /**
   * Store call locally
   */
  private async storeCall(call: Call): Promise<void> {
    try {
      const calls = await this.getStoredCalls();
      calls.push(call);
      await AsyncStorage.setItem('calls', JSON.stringify(calls));
    } catch (error) {
      console.error('Error storing call:', error);
    }
  }

  /**
   * Get stored calls
   */
  async getStoredCalls(): Promise<Call[]> {
    try {
      const data = await AsyncStorage.getItem('calls');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving stored calls:', error);
      return [];
    }
  }

  /**
   * Clear stored calls
   */
  async clearStoredCalls(): Promise<void> {
    try {
      await AsyncStorage.removeItem('calls');
    } catch (error) {
      console.error('Error clearing stored calls:', error);
    }
  }

  /**
   * Store consent record locally
   */
  private async storeConsentRecord(record: ConsentRecord): Promise<void> {
    try {
      const records = await this.getStoredConsentRecords();
      records.push(record);
      await AsyncStorage.setItem('consent_records', JSON.stringify(records));
    } catch (error) {
      console.error('Error storing consent record:', error);
    }
  }

  /**
   * Get stored consent records
   */
  async getStoredConsentRecords(): Promise<ConsentRecord[]> {
    try {
      const data = await AsyncStorage.getItem('consent_records');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving consent records:', error);
      return [];
    }
  }

  /**
   * Monitor call status (for real-time updates via WebSocket)
   */
  subscribeToCallUpdates(
    callId: string,
    onUpdate: (call: Call) => void,
    onError: (error: Error) => void
  ): () => void {
    const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        call_id: callId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.call_id === callId) {
          onUpdate(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (event) => {
      onError(new Error('WebSocket error'));
    };

    // Return unsubscribe function
    return () => {
      ws.close();
    };
  }
}

export default new CallService();
