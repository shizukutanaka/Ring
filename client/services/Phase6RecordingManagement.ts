/**
 * Phase 6: Recording Management Service
 *
 * Research-backed implementation based on:
 * - Recording lifecycle management (start, pause, resume, stop)
 * - Storage quota and cost tracking
 * - Retention policies and automatic cleanup
 * - Integration with Phase 5 CallRecording service
 * - Security audit logging for compliance
 * - Multi-tenant storage isolation
 */

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  recordingId: string;
  callId: string;
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds
  format: 'webm' | 'mp4' | 'mkv';
  codec: 'vp9' | 'h264' | 'av1';
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number; // kbps
  fileSize: number; // bytes
  storageLocation: 'local' | 's3' | 'gcs';
  status: 'recording' | 'paused' | 'completed' | 'archived' | 'deleted';
  tenantId: string;
  createdBy: string;
  expiresAt?: number;
  encryptionKey?: string;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  tenantId: string;
  totalQuotaBytes: number;
  usedBytes: number;
  availableBytes: number;
  quotaPercentage: number; // 0-100
  warningThreshold: number; // percentage
  overageRate: number; // cost per GB overage
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  policyId: string;
  tenantId: string;
  maxRetentionDays: number;
  autoDeleteEnabled: boolean;
  deleteOnExpiry: boolean;
  archiveBeforeDelete: boolean;
  minRecordingQuality?: 'low' | 'medium' | 'high';
}

/**
 * Recording cost estimate
 */
export interface RecordingCostEstimate {
  recordingId: string;
  storageCostPerMonth: number; // USD
  bandwidthCostPerMonth: number; // USD
  retrieval CostEstimate: number; // USD
  totalEstimatedCost: number; // USD
  provider: 'aws_s3' | 'gcs' | 'azure_blob';
  currency: string;
}

/**
 * Recording Management Service
 */
export class RecordingManagementService {
  private recordings: Map<string, RecordingMetadata> = new Map();
  private storageQuotas: Map<string, StorageQuota> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private auditLog: Array<{
    timestamp: number;
    action: string;
    recordingId?: string;
    tenantId: string;
    userId: string;
    details: string;
  }> = [];
  private costEstimates: Map<string, RecordingCostEstimate> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    this.initializeDefaults();
    this.startCleanupScheduler();
  }

  /**
   * Initialize default configurations
   */
  private initializeDefaults(): void {
    // Start periodic cleanup scheduler
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.performAutomaticCleanup();
      }, 3600000); // Run every hour
    }
  }

  /**
   * Set storage quota for tenant
   */
  setStorageQuota(
    tenantId: string,
    quotaGb: number,
    warningThreshold: number = 80
  ): StorageQuota {
    const quotaBytes = quotaGb * 1024 * 1024 * 1024; // Convert GB to bytes
    const usedBytes = this.getUsedStorageBytes(tenantId);

    const quota: StorageQuota = {
      tenantId,
      totalQuotaBytes: quotaBytes,
      usedBytes,
      availableBytes: Math.max(0, quotaBytes - usedBytes),
      quotaPercentage: Math.round((usedBytes / quotaBytes) * 100),
      warningThreshold,
      overageRate: 0.023 // AWS S3 standard pricing
    };

    this.storageQuotas.set(tenantId, quota);
    this.auditLog.push({
      timestamp: Date.now(),
      action: 'SET_QUOTA',
      tenantId,
      userId: 'system',
      details: `Quota set to ${quotaGb}GB with ${warningThreshold}% warning threshold`
    });

    return quota;
  }

  /**
   * Create retention policy for tenant
   */
  setRetentionPolicy(
    tenantId: string,
    maxRetentionDays: number,
    autoDeleteEnabled: boolean = true
  ): RetentionPolicy {
    const policyId = `policy-${Date.now()}`;

    const policy: RetentionPolicy = {
      policyId,
      tenantId,
      maxRetentionDays,
      autoDeleteEnabled,
      deleteOnExpiry: autoDeleteEnabled,
      archiveBeforeDelete: true
    };

    this.retentionPolicies.set(policyId, policy);

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'SET_RETENTION_POLICY',
      tenantId,
      userId: 'system',
      details: `Retention policy created: ${maxRetentionDays} days, auto-delete: ${autoDeleteEnabled}`
    });

    return policy;
  }

  /**
   * Start recording metadata tracking
   */
  startRecording(
    callId: string,
    tenantId: string,
    userId: string,
    format: 'webm' | 'mp4' | 'mkv' = 'webm',
    codec: 'vp9' | 'h264' | 'av1' = 'vp9'
  ): RecordingMetadata {
    const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate encryption key for this recording
    const encryptionKey = this.generateEncryptionKey();

    const metadata: RecordingMetadata = {
      recordingId,
      callId,
      startTime: Date.now(),
      format,
      codec,
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 2500,
      fileSize: 0,
      storageLocation: 's3',
      status: 'recording',
      tenantId,
      createdBy: userId,
      encryptionKey
    };

    this.recordings.set(recordingId, metadata);

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'START_RECORDING',
      recordingId,
      tenantId,
      userId,
      details: `Recording started: ${format} with ${codec} codec`
    });

    return metadata;
  }

  /**
   * Pause recording
   */
  pauseRecording(recordingId: string, userId: string): RecordingMetadata | null {
    const metadata = this.recordings.get(recordingId);
    if (!metadata) return null;

    metadata.status = 'paused';

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'PAUSE_RECORDING',
      recordingId,
      tenantId: metadata.tenantId,
      userId,
      details: `Recording paused`
    });

    return metadata;
  }

  /**
   * Resume recording
   */
  resumeRecording(recordingId: string, userId: string): RecordingMetadata | null {
    const metadata = this.recordings.get(recordingId);
    if (!metadata) return null;

    metadata.status = 'recording';

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'RESUME_RECORDING',
      recordingId,
      tenantId: metadata.tenantId,
      userId,
      details: `Recording resumed`
    });

    return metadata;
  }

  /**
   * Stop recording and finalize metadata
   */
  stopRecording(
    recordingId: string,
    userId: string,
    fileSize: number,
    duration: number
  ): RecordingMetadata | null {
    const metadata = this.recordings.get(recordingId);
    if (!metadata) return null;

    metadata.status = 'completed';
    metadata.endTime = Date.now();
    metadata.duration = duration;
    metadata.fileSize = fileSize;

    // Set expiration time based on retention policy
    const policy = this.getTenantRetentionPolicy(metadata.tenantId);
    if (policy) {
      metadata.expiresAt = Date.now() + policy.maxRetentionDays * 24 * 60 * 60 * 1000;
    }

    // Calculate cost estimate
    this.estimateRecordingCost(recordingId, metadata);

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'STOP_RECORDING',
      recordingId,
      tenantId: metadata.tenantId,
      userId,
      details: `Recording completed: ${(fileSize / 1024 / 1024).toFixed(2)}MB, ${(duration / 1000).toFixed(2)}s`
    });

    return metadata;
  }

  /**
   * Get recording metadata
   */
  getRecording(recordingId: string): RecordingMetadata | null {
    return this.recordings.get(recordingId) || null;
  }

  /**
   * List recordings for tenant
   */
  listRecordings(
    tenantId: string,
    filters?: {
      status?: 'recording' | 'paused' | 'completed' | 'archived' | 'deleted';
      startDate?: number;
      endDate?: number;
      minDuration?: number; // milliseconds
    }
  ): RecordingMetadata[] {
    const recordings = Array.from(this.recordings.values()).filter((r) => r.tenantId === tenantId);

    if (filters) {
      return recordings.filter((r) => {
        if (filters.status && r.status !== filters.status) return false;
        if (filters.startDate && r.startTime < filters.startDate) return false;
        if (filters.endDate && r.startTime > filters.endDate) return false;
        if (filters.minDuration && (!r.duration || r.duration < filters.minDuration))
          return false;
        return true;
      });
    }

    return recordings;
  }

  /**
   * Delete recording
   */
  deleteRecording(recordingId: string, userId: string, reason?: string): boolean {
    const metadata = this.recordings.get(recordingId);
    if (!metadata) return false;

    metadata.status = 'deleted';

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'DELETE_RECORDING',
      recordingId,
      tenantId: metadata.tenantId,
      userId,
      details: `Recording deleted${reason ? ': ' + reason : ''}`
    });

    return true;
  }

  /**
   * Archive recording (move to cold storage)
   */
  archiveRecording(recordingId: string, userId: string): RecordingMetadata | null {
    const metadata = this.recordings.get(recordingId);
    if (!metadata) return null;

    metadata.status = 'archived';
    metadata.storageLocation = 's3'; // Would move to Glacier in production

    this.auditLog.push({
      timestamp: Date.now(),
      action: 'ARCHIVE_RECORDING',
      recordingId,
      tenantId: metadata.tenantId,
      userId,
      details: `Recording archived to cold storage`
    });

    return metadata;
  }

  /**
   * Get storage quota for tenant
   */
  getStorageQuota(tenantId: string): StorageQuota | null {
    const quota = this.storageQuotas.get(tenantId);
    if (!quota) {
      // Create default 1GB quota
      return this.setStorageQuota(tenantId, 1);
    }

    // Update used bytes
    quota.usedBytes = this.getUsedStorageBytes(tenantId);
    quota.availableBytes = Math.max(0, quota.totalQuotaBytes - quota.usedBytes);
    quota.quotaPercentage = Math.round((quota.usedBytes / quota.totalQuotaBytes) * 100);

    return quota;
  }

  /**
   * Calculate used storage bytes for tenant
   */
  private getUsedStorageBytes(tenantId: string): number {
    let total = 0;

    for (const recording of this.recordings.values()) {
      if (recording.tenantId === tenantId && recording.status !== 'deleted') {
        total += recording.fileSize;
      }
    }

    return total;
  }

  /**
   * Check if tenant is over quota
   */
  isOverQuota(tenantId: string): boolean {
    const quota = this.getStorageQuota(tenantId);
    if (!quota) return false;

    return quota.usedBytes > quota.totalQuotaBytes;
  }

  /**
   * Get cost estimate for recording
   */
  private estimateRecordingCost(
    recordingId: string,
    metadata: RecordingMetadata
  ): RecordingCostEstimate {
    const storageGb = metadata.fileSize / 1024 / 1024 / 1024;
    const durationHours = (metadata.duration || 0) / 1000 / 3600;

    // AWS S3 pricing (as of 2024)
    const storageCostPerGb = 0.023; // Standard storage
    const retrievalCostPerGb = 0.0004; // Standard retrieval
    const bandwidthCost = 0;

    const storageCostPerMonth = storageGb * storageCostPerGb * 30; // Assume 30 days retention
    const retrieval Cost = storageGb * retrievalCostPerGb;

    const estimate: RecordingCostEstimate = {
      recordingId,
      storageCostPerMonth,
      bandwidthCostPerMonth: bandwidthCost,
      retrieval CostEstimate: retrieval Cost,
      totalEstimatedCost: storageCostPerMonth + retrieval Cost + bandwidthCost,
      provider: 's3',
      currency: 'USD'
    };

    this.costEstimates.set(recordingId, estimate);
    return estimate;
  }

  /**
   * Get cost estimate for recording
   */
  getCostEstimate(recordingId: string): RecordingCostEstimate | null {
    return this.costEstimates.get(recordingId) || null;
  }

  /**
   * Get total estimated monthly cost for tenant
   */
  getTenantMonthlyCost(tenantId: string): number {
    let total = 0;

    for (const estimate of this.costEstimates.values()) {
      const recording = this.recordings.get(estimate.recordingId);
      if (recording && recording.tenantId === tenantId) {
        total += estimate.storageCostPerMonth;
      }
    }

    return total;
  }

  /**
   * Get retention policy for tenant
   */
  private getTenantRetentionPolicy(tenantId: string): RetentionPolicy | null {
    for (const policy of this.retentionPolicies.values()) {
      if (policy.tenantId === tenantId) {
        return policy;
      }
    }
    return null;
  }

  /**
   * Perform automatic cleanup based on retention policies
   */
  private performAutomaticCleanup(): void {
    const now = Date.now();

    for (const metadata of this.recordings.values()) {
      if (metadata.status === 'deleted') {
        // Already marked for deletion
        continue;
      }

      // Check retention policy
      if (metadata.expiresAt && metadata.expiresAt < now) {
        const policy = this.getTenantRetentionPolicy(metadata.tenantId);

        if (policy?.deleteOnExpiry) {
          // Archive first if requested
          if (policy.archiveBeforeDelete && metadata.status === 'completed') {
            metadata.status = 'archived';
          } else {
            metadata.status = 'deleted';

            this.auditLog.push({
              timestamp: now,
              action: 'AUTO_DELETE_RECORDING',
              recordingId: metadata.recordingId,
              tenantId: metadata.tenantId,
              userId: 'system',
              details: `Automatic deletion due to retention policy expiration`
            });
          }
        }
      }
    }
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.performAutomaticCleanup();
      }, 3600000); // Every hour
    }
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate encryption key for recording
   */
  private generateEncryptionKey(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get audit log for tenant
   */
  getAuditLog(tenantId: string, limit: number = 100): typeof this.auditLog {
    return this.auditLog
      .filter((entry) => entry.tenantId === tenantId)
      .slice(-limit);
  }

  /**
   * Get service diagnostics
   */
  getDiagnostics(): {
    totalRecordings: number;
    activeRecordings: number;
    completedRecordings: number;
    totalStorageUsed: number; // bytes
    tenantQuotaUtilization: Record<string, number>;
    auditLogSize: number;
    costEstimatesCount: number;
  } {
    const recordings = Array.from(this.recordings.values());
    const activeCount = recordings.filter(
      (r) => r.status === 'recording' || r.status === 'paused'
    ).length;
    const completedCount = recordings.filter((r) => r.status === 'completed').length;
    const totalStorage = recordings.reduce((sum, r) => sum + r.fileSize, 0);

    // Calculate quota utilization by tenant
    const tenantQuotaUtilization: Record<string, number> = {};
    const tenantIds = new Set(recordings.map((r) => r.tenantId));

    for (const tenantId of tenantIds) {
      const quota = this.getStorageQuota(tenantId);
      if (quota) {
        tenantQuotaUtilization[tenantId] = quota.quotaPercentage;
      }
    }

    return {
      totalRecordings: this.recordings.size,
      activeRecordings: activeCount,
      completedRecordings: completedCount,
      totalStorageUsed: totalStorage,
      tenantQuotaUtilization,
      auditLogSize: this.auditLog.length,
      costEstimatesCount: this.costEstimates.size
    };
  }
}

export { RecordingManagementService };
