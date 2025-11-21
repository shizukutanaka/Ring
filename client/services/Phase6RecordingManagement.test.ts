/**
 * Phase 6: Recording Management Tests
 */

import { RecordingManagementService } from './Phase6RecordingManagement';

describe('Phase 6: Recording Management Service', () => {
  let service: RecordingManagementService;

  beforeEach(() => {
    service = new RecordingManagementService();
  });

  afterEach(() => {
    service.stopCleanupScheduler();
  });

  describe('Recording Lifecycle', () => {
    test('should start recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');

      expect(recording).toBeDefined();
      expect(recording.recordingId).toBeDefined();
      expect(recording.callId).toBe('call-123');
      expect(recording.status).toBe('recording');
      expect(recording.tenantId).toBe('tenant-1');
      expect(recording.encryptionKey).toBeDefined();
    });

    test('should pause recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      const paused = service.pauseRecording(recording.recordingId, 'user-1');

      expect(paused).toBeDefined();
      expect(paused?.status).toBe('paused');
    });

    test('should resume recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      service.pauseRecording(recording.recordingId, 'user-1');
      const resumed = service.resumeRecording(recording.recordingId, 'user-1');

      expect(resumed).toBeDefined();
      expect(resumed?.status).toBe('recording');
    });

    test('should stop recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      const stopped = service.stopRecording(
        recording.recordingId,
        'user-1',
        1024 * 1024 * 100, // 100MB
        60000 // 60 seconds
      );

      expect(stopped).toBeDefined();
      expect(stopped?.status).toBe('completed');
      expect(stopped?.duration).toBe(60000);
      expect(stopped?.fileSize).toBe(1024 * 1024 * 100);
    });

    test('should delete recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      const deleted = service.deleteRecording(recording.recordingId, 'user-1', 'Test deletion');

      expect(deleted).toBe(true);

      const retrieved = service.getRecording(recording.recordingId);
      expect(retrieved?.status).toBe('deleted');
    });

    test('should archive recording', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      const archived = service.archiveRecording(recording.recordingId, 'user-1');

      expect(archived).toBeDefined();
      expect(archived?.status).toBe('archived');
    });

    test('should return null for non-existent recording', () => {
      const result = service.pauseRecording('non-existent-id', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('Recording Retrieval', () => {
    test('should get recording metadata', () => {
      const recording = service.startRecording('call-123', 'tenant-1', 'user-1');
      const retrieved = service.getRecording(recording.recordingId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.recordingId).toBe(recording.recordingId);
      expect(retrieved?.callId).toBe('call-123');
    });

    test('should list recordings for tenant', () => {
      service.startRecording('call-1', 'tenant-1', 'user-1');
      service.startRecording('call-2', 'tenant-1', 'user-1');
      service.startRecording('call-3', 'tenant-2', 'user-2');

      const tenantRecordings = service.listRecordings('tenant-1');

      expect(tenantRecordings.length).toBe(2);
      expect(tenantRecordings.every((r) => r.tenantId === 'tenant-1')).toBe(true);
    });

    test('should filter recordings by status', () => {
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');
      const rec2 = service.startRecording('call-2', 'tenant-1', 'user-1');

      service.pauseRecording(rec1.recordingId, 'user-1');

      const pausedRecordings = service.listRecordings('tenant-1', { status: 'paused' });

      expect(pausedRecordings.length).toBe(1);
      expect(pausedRecordings[0].recordingId).toBe(rec1.recordingId);
    });

    test('should filter recordings by date range', () => {
      const now = Date.now();
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');

      const recordings = service.listRecordings('tenant-1', {
        startDate: now - 10000,
        endDate: now + 10000
      });

      expect(recordings.length).toBeGreaterThan(0);
      expect(recordings[0].recordingId).toBe(rec1.recordingId);
    });

    test('should filter recordings by minimum duration', () => {
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');
      const rec2 = service.startRecording('call-2', 'tenant-1', 'user-1');

      service.stopRecording(rec1.recordingId, 'user-1', 1024 * 100, 10000); // 10 seconds
      service.stopRecording(rec2.recordingId, 'user-1', 1024 * 100, 5000); // 5 seconds

      const filtered = service.listRecordings('tenant-1', { minDuration: 7000 });

      expect(filtered.length).toBe(1);
      expect(filtered[0].recordingId).toBe(rec1.recordingId);
    });
  });

  describe('Storage Quota Management', () => {
    test('should set storage quota', () => {
      const quota = service.setStorageQuota('tenant-1', 10);

      expect(quota).toBeDefined();
      expect(quota.tenantId).toBe('tenant-1');
      expect(quota.totalQuotaBytes).toBe(10 * 1024 * 1024 * 1024);
    });

    test('should get storage quota', () => {
      service.setStorageQuota('tenant-1', 5);
      const quota = service.getStorageQuota('tenant-1');

      expect(quota).toBeDefined();
      expect(quota?.totalQuotaBytes).toBe(5 * 1024 * 1024 * 1024);
    });

    test('should create default quota if not set', () => {
      const quota = service.getStorageQuota('tenant-2');

      expect(quota).toBeDefined();
      expect(quota?.totalQuotaBytes).toBeGreaterThan(0);
    });

    test('should track quota usage', () => {
      service.setStorageQuota('tenant-1', 1); // 1GB
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 512 * 1024 * 1024, 60000); // 512MB

      const quota = service.getStorageQuota('tenant-1');

      expect(quota?.usedBytes).toBe(512 * 1024 * 1024);
      expect(quota?.quotaPercentage).toBe(50);
    });

    test('should calculate available bytes correctly', () => {
      service.setStorageQuota('tenant-1', 1); // 1GB
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 256 * 1024 * 1024, 60000); // 256MB

      const quota = service.getStorageQuota('tenant-1');

      expect(quota?.availableBytes).toBe(768 * 1024 * 1024);
    });

    test('should detect quota overage', () => {
      service.setStorageQuota('tenant-1', 0.5); // 512MB
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 600 * 1024 * 1024, 60000); // 600MB (over quota)

      const isOver = service.isOverQuota('tenant-1');

      expect(isOver).toBe(true);
    });

    test('should respect warning threshold', () => {
      service.setStorageQuota('tenant-1', 1, 80); // 80% warning threshold

      const quota = service.getStorageQuota('tenant-1');
      expect(quota?.warningThreshold).toBe(80);
    });
  });

  describe('Retention Policies', () => {
    test('should set retention policy', () => {
      const policy = service.setRetentionPolicy('tenant-1', 30, true);

      expect(policy).toBeDefined();
      expect(policy.tenantId).toBe('tenant-1');
      expect(policy.maxRetentionDays).toBe(30);
      expect(policy.autoDeleteEnabled).toBe(true);
    });

    test('should enable auto-delete in retention policy', () => {
      const policy = service.setRetentionPolicy('tenant-1', 30, true);

      expect(policy.deleteOnExpiry).toBe(true);
    });

    test('should set archive before delete option', () => {
      const policy = service.setRetentionPolicy('tenant-1', 30, true);

      expect(policy.archiveBeforeDelete).toBe(true);
    });

    test('should apply expiration time to recordings', () => {
      service.setRetentionPolicy('tenant-1', 30, true);

      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 1024 * 100, 60000);

      const retrieved = service.getRecording(rec.recordingId);
      expect(retrieved?.expiresAt).toBeDefined();
      expect(retrieved?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Cost Estimation', () => {
    test('should estimate recording cost', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 1024 * 1024 * 100, 60000); // 100MB, 60 seconds

      const estimate = service.getCostEstimate(rec.recordingId);

      expect(estimate).toBeDefined();
      expect(estimate?.storageCostPerMonth).toBeGreaterThan(0);
      expect(estimate?.provider).toBe('s3');
      expect(estimate?.currency).toBe('USD');
    });

    test('should calculate monthly tenant cost', () => {
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec1.recordingId, 'user-1', 1024 * 1024 * 100, 60000);

      const rec2 = service.startRecording('call-2', 'tenant-1', 'user-1');
      service.stopRecording(rec2.recordingId, 'user-1', 1024 * 1024 * 100, 60000);

      const monthlyCost = service.getTenantMonthlyCost('tenant-1');

      expect(monthlyCost).toBeGreaterThan(0);
    });

    test('should include storage and retrieval costs', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 1024 * 1024 * 100, 60000);

      const estimate = service.getCostEstimate(rec.recordingId);

      expect(estimate?.storageCostPerMonth).toBeGreaterThan(0);
      expect(estimate?.totalEstimatedCost).toBeGreaterThanOrEqual(
        estimate?.storageCostPerMonth || 0
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log start recording action', () => {
      service.startRecording('call-1', 'tenant-1', 'user-1');

      const auditLog = service.getAuditLog('tenant-1');

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].action).toBe('START_RECORDING');
    });

    test('should log pause recording action', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.pauseRecording(rec.recordingId, 'user-1');

      const auditLog = service.getAuditLog('tenant-1');

      expect(auditLog.some((entry) => entry.action === 'PAUSE_RECORDING')).toBe(true);
    });

    test('should log stop recording action', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 1024 * 100, 60000);

      const auditLog = service.getAuditLog('tenant-1');

      expect(auditLog.some((entry) => entry.action === 'STOP_RECORDING')).toBe(true);
    });

    test('should include user in audit log', () => {
      service.startRecording('call-1', 'tenant-1', 'user-123');

      const auditLog = service.getAuditLog('tenant-1');

      expect(auditLog[0].userId).toBe('user-123');
    });

    test('should limit audit log size', () => {
      for (let i = 0; i < 150; i++) {
        service.startRecording(`call-${i}`, 'tenant-1', 'user-1');
      }

      const auditLog = service.getAuditLog('tenant-1', 100);

      expect(auditLog.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Service Diagnostics', () => {
    test('should provide service diagnostics', () => {
      service.startRecording('call-1', 'tenant-1', 'user-1');

      const diag = service.getDiagnostics();

      expect(diag).toBeDefined();
      expect(diag.totalRecordings).toBeGreaterThanOrEqual(0);
      expect(diag.activeRecordings).toBeGreaterThanOrEqual(0);
      expect(diag.completedRecordings).toBeGreaterThanOrEqual(0);
      expect(diag.totalStorageUsed).toBeGreaterThanOrEqual(0);
    });

    test('should count active recordings', () => {
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');
      const rec2 = service.startRecording('call-2', 'tenant-1', 'user-1');
      service.stopRecording(rec2.recordingId, 'user-1', 1024 * 100, 60000);

      const diag = service.getDiagnostics();

      expect(diag.activeRecordings).toBe(1);
      expect(diag.completedRecordings).toBe(1);
    });

    test('should track total storage used', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      const fileSize = 1024 * 1024 * 100; // 100MB
      service.stopRecording(rec.recordingId, 'user-1', fileSize, 60000);

      const diag = service.getDiagnostics();

      expect(diag.totalStorageUsed).toBe(fileSize);
    });

    test('should calculate quota utilization by tenant', () => {
      service.setStorageQuota('tenant-1', 1); // 1GB
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      service.stopRecording(rec.recordingId, 'user-1', 512 * 1024 * 1024, 60000); // 512MB

      const diag = service.getDiagnostics();

      expect(diag.tenantQuotaUtilization['tenant-1']).toBe(50);
    });
  });

  describe('Research Validation', () => {
    test('should support multi-tenant storage isolation', () => {
      const rec1 = service.startRecording('call-1', 'tenant-1', 'user-1');
      const rec2 = service.startRecording('call-2', 'tenant-2', 'user-2');

      const tenant1Recordings = service.listRecordings('tenant-1');
      const tenant2Recordings = service.listRecordings('tenant-2');

      expect(tenant1Recordings.length).toBe(1);
      expect(tenant2Recordings.length).toBe(1);
      expect(tenant1Recordings[0].recordingId).toBe(rec1.recordingId);
      expect(tenant2Recordings[0].recordingId).toBe(rec2.recordingId);
    });

    test('should provide compliance audit logging', () => {
      service.startRecording('call-1', 'tenant-1', 'user-1');
      service.setStorageQuota('tenant-1', 5);
      service.setRetentionPolicy('tenant-1', 30, true);

      const auditLog = service.getAuditLog('tenant-1');

      expect(auditLog.some((entry) => entry.action === 'START_RECORDING')).toBe(true);
      expect(auditLog.some((entry) => entry.action === 'SET_QUOTA')).toBe(true);
      expect(auditLog.some((entry) => entry.action === 'SET_RETENTION_POLICY')).toBe(true);
    });

    test('should encrypt recording metadata', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');

      expect(rec.encryptionKey).toBeDefined();
      expect(rec.encryptionKey?.length).toBeGreaterThan(0);
      // Should be hex-encoded (0-9, a-f)
      expect(/^[0-9a-f]+$/.test(rec.encryptionKey || '')).toBe(true);
    });

    test('should track recording lifecycle states', () => {
      const rec = service.startRecording('call-1', 'tenant-1', 'user-1');
      expect(rec.status).toBe('recording');

      service.pauseRecording(rec.recordingId, 'user-1');
      expect(service.getRecording(rec.recordingId)?.status).toBe('paused');

      service.resumeRecording(rec.recordingId, 'user-1');
      expect(service.getRecording(rec.recordingId)?.status).toBe('recording');

      service.stopRecording(rec.recordingId, 'user-1', 1024 * 100, 60000);
      expect(service.getRecording(rec.recordingId)?.status).toBe('completed');
    });
  });
});
