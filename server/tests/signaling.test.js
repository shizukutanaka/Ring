/**
 * Tests for Signaling Manager
 */

const SignalingManager = require('../signaling');

// Mock pool for testing
const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [] })
};

describe('SignalingManager', () => {
  let signalingManager;

  beforeEach(() => {
    signalingManager = new SignalingManager(mockPool);
    jest.clearAllMocks();
  });

  describe('initiateCall', () => {
    it('should create a new call with unique ID', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2', 'audio');

      expect(call).toBeDefined();
      expect(call.id).toBeDefined();
      expect(call.initiator).toBe('user1');
      expect(call.recipient).toBe('user2');
      expect(call.status).toBe('pending');
      expect(call.type).toBe('audio');
    });

    it('should emit call:initiated event', async () => {
      const listener = jest.fn();
      signalingManager.on('call:initiated', listener);

      await signalingManager.initiateCall('user1', 'user2');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].status).toBe('pending');
    });

    it('should persist call to database', async () => {
      await signalingManager.initiateCall('user1', 'user2');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO call_records'),
        expect.any(Array)
      );
    });
  });

  describe('acceptCall', () => {
    it('should update call status to accepted', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2');
      const accepted = await signalingManager.acceptCall(call.id, 'user2');

      expect(accepted.status).toBe('accepted');
      expect(accepted.startedAt).toBeDefined();
    });

    it('should emit call:accepted event', async () => {
      const listener = jest.fn();
      signalingManager.on('call:accepted', listener);

      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.acceptCall(call.id, 'user2');

      expect(listener).toHaveBeenCalled();
    });

    it('should reject if wrong user tries to accept', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2');

      await expect(signalingManager.acceptCall(call.id, 'user1')).rejects.toThrow('Unauthorized');
    });
  });

  describe('handleRecordingConsent', () => {
    it('should update recording consent flag', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.acceptCall(call.id, 'user2');

      await signalingManager.handleRecordingConsent(call.id, 'user2', true);

      const updatedCall = signalingManager.getCallInfo(call.id);
      expect(updatedCall.recordingConsent).toBe(true);
    });

    it('should emit recording:consent-received event', async () => {
      const listener = jest.fn();
      signalingManager.on('recording:consent-received', listener);

      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.handleRecordingConsent(call.id, 'user2', true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          consentGiven: true
        })
      );
    });
  });

  describe('endCall', () => {
    it('should set call status to ended', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.acceptCall(call.id, 'user2');

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      const ended = await signalingManager.endCall(call.id, 'user1');

      expect(ended.success).toBe(true);
      expect(ended.durationSeconds).toBeGreaterThan(0);
    });

    it('should remove call from active calls', async () => {
      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.endCall(call.id, 'user1');

      expect(signalingManager.getCallInfo(call.id)).toBeUndefined();
    });

    it('should emit call:ended event with duration', async () => {
      const listener = jest.fn();
      signalingManager.on('call:ended', listener);

      const call = await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.acceptCall(call.id, 'user2');
      await signalingManager.endCall(call.id, 'user1');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ended',
          durationSeconds: expect.any(Number)
        })
      );
    });
  });

  describe('getAllActiveCalls', () => {
    it('should return array of active calls', async () => {
      await signalingManager.initiateCall('user1', 'user2');
      await signalingManager.initiateCall('user2', 'user3');

      const activeCalls = signalingManager.getAllActiveCalls();

      expect(activeCalls).toHaveLength(2);
    });
  });
});
