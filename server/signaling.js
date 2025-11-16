/**
 * WebRTC Signaling Module
 *
 * Handles WebRTC signaling for peer-to-peer call establishment
 * Manages call state, SDP offers/answers, ICE candidates
 */

const { EventEmitter } = require('events');
const uuid = require('uuid');

class SignalingManager extends EventEmitter {
  constructor(pool) {
    super();
    this.pool = pool;
    this.activeCalls = new Map();
    this.peers = new Map();
  }

  /**
   * Initiate a new call between two users
   */
  async initiateCall(initiatorId, recipientId, callType = 'audio') {
    try {
      const callId = uuid.v4();
      const callTimestamp = new Date().toISOString();

      const call = {
        id: callId,
        initiator: initiatorId,
        recipient: recipientId,
        type: callType,
        status: 'pending',
        createdAt: callTimestamp,
        startedAt: null,
        endedAt: null,
        recordingConsent: false,
        recordingStarted: false
      };

      this.activeCalls.set(callId, call);

      // Persist to database
      await this.pool.query(
        `INSERT INTO call_records (id, initiator_hash, recipient_hash, created_at)
         VALUES ($1, $2, $3, $4)`,
        [callId, initiatorId, recipientId, callTimestamp]
      );

      this.emit('call:initiated', call);
      return call;
    } catch (err) {
      console.error('Error initiating call:', err);
      throw err;
    }
  }

  /**
   * Handle call acceptance
   */
  async acceptCall(callId, userId) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');
      if (call.recipient !== userId) throw new Error('Unauthorized');

      call.status = 'accepted';
      call.startedAt = new Date().toISOString();

      await this.pool.query(
        `UPDATE call_records SET updated_at = NOW() WHERE id = $1`,
        [callId]
      );

      this.emit('call:accepted', call);
      return call;
    } catch (err) {
      console.error('Error accepting call:', err);
      throw err;
    }
  }

  /**
   * Handle call rejection
   */
  async rejectCall(callId, userId, reason = 'declined') {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      call.status = 'rejected';
      call.endedAt = new Date().toISOString();

      await this.pool.query(
        `UPDATE call_records SET updated_at = NOW() WHERE id = $1`,
        [callId]
      );

      this.activeCalls.delete(callId);
      this.emit('call:rejected', { ...call, reason });
      return call;
    } catch (err) {
      console.error('Error rejecting call:', err);
      throw err;
    }
  }

  /**
   * Handle SDP offer
   */
  async handleOffer(callId, userId, offer) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      call.sdpOffer = offer;
      this.emit('call:offer', { callId, userId, offer });
      return { success: true };
    } catch (err) {
      console.error('Error handling offer:', err);
      throw err;
    }
  }

  /**
   * Handle SDP answer
   */
  async handleAnswer(callId, userId, answer) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      call.sdpAnswer = answer;
      this.emit('call:answer', { callId, userId, answer });
      return { success: true };
    } catch (err) {
      console.error('Error handling answer:', err);
      throw err;
    }
  }

  /**
   * Handle ICE candidates
   */
  async handleIceCandidate(callId, userId, candidate) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      if (!call.iceCandidates) {
        call.iceCandidates = [];
      }
      call.iceCandidates.push(candidate);

      this.emit('call:ice-candidate', { callId, userId, candidate });
      return { success: true };
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
      throw err;
    }
  }

  /**
   * Request recording consent
   */
  async requestRecordingConsent(callId, userId) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      this.emit('recording:consent-request', { callId, userId });
      return { success: true };
    } catch (err) {
      console.error('Error requesting recording consent:', err);
      throw err;
    }
  }

  /**
   * Handle recording consent response
   */
  async handleRecordingConsent(callId, userId, consentGiven) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      call.recordingConsent = consentGiven;
      call.recordingConsentTimestamp = new Date().toISOString();

      // Persist consent to database
      await this.pool.query(
        `UPDATE call_records SET consent_given = $1, consent_timestamp = $2
         WHERE id = $3`,
        [consentGiven, call.recordingConsentTimestamp, callId]
      );

      this.emit('recording:consent-received', {
        callId,
        userId,
        consentGiven,
        timestamp: call.recordingConsentTimestamp
      });

      return { success: true };
    } catch (err) {
      console.error('Error handling recording consent:', err);
      throw err;
    }
  }

  /**
   * Start recording (server-side)
   */
  async startRecording(callId) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');
      if (!call.recordingConsent) throw new Error('Recording consent not given');

      call.recordingStarted = true;
      call.recordingStartedAt = new Date().toISOString();

      // Generate recording file path
      call.recordingFilePath = `/recordings/${callId}.webm`;

      this.emit('recording:started', {
        callId,
        filePath: call.recordingFilePath,
        timestamp: call.recordingStartedAt
      });

      return { success: true, filePath: call.recordingFilePath };
    } catch (err) {
      console.error('Error starting recording:', err);
      throw err;
    }
  }

  /**
   * End call and cleanup
   */
  async endCall(callId, userId) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) throw new Error('Call not found');

      call.status = 'ended';
      call.endedAt = new Date().toISOString();

      // Calculate call duration
      const startTime = new Date(call.startedAt);
      const endTime = new Date(call.endedAt);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      await this.pool.query(
        `UPDATE call_records
         SET updated_at = NOW(), recording_duration_seconds = $1
         WHERE id = $2`,
        [durationSeconds, callId]
      );

      this.activeCalls.delete(callId);

      this.emit('call:ended', {
        ...call,
        durationSeconds
      });

      return { success: true, durationSeconds };
    } catch (err) {
      console.error('Error ending call:', err);
      throw err;
    }
  }

  /**
   * Get active call info
   */
  getCallInfo(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Get all active calls
   */
  getAllActiveCalls() {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Get call history for a user
   */
  async getCallHistory(userId, limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM call_records
         WHERE initiator_hash = $1 OR recipient_hash = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (err) {
      console.error('Error fetching call history:', err);
      throw err;
    }
  }
}

module.exports = SignalingManager;
