// Recording Manager Service
// Comprehensive recording management with storage optimization

interface RecordingConfig {
  recording: {
    enabled: boolean;
    autoStart: boolean;
    maxDuration: number; // minutes
    quality: 'low' | 'medium' | 'high' | 'ultra';
    format: 'webm' | 'mp4' | 'avi' | 'mov';
    compression: boolean;
    adaptiveQuality: boolean; // Adaptive quality based on network
    silenceDetection: boolean; // Skip silence periods
  };
  storage: {
    provider: 'local' | 'cloud' | 'hybrid';
    maxStorageSize: number; // MB
    retentionDays: number;
    encryption: boolean;
    compressionLevel: number; // 0-9
    tieredStorage: boolean; // Hot/cold storage tiers
    cdnDistribution: boolean; // CDN for recordings
  };
  metadata: {
    includeTranscript: boolean;
    includeAnalytics: boolean;
    includeParticipants: boolean;
    includeTimestamps: boolean;
    customFields: string[];
    realTimeTranscription: boolean; // Live transcription
    sentimentAnalysis: boolean; // Emotion analysis
  };
  sharing: {
    enabled: boolean;
    defaultPermissions: 'private' | 'shared' | 'public';
    requirePassword: boolean;
    expirationDays: number;
    allowDownload: boolean;
    allowStreaming: boolean; // Stream without download
    generateThumbnails: boolean; // Video thumbnails
  };
}

interface RecordingInfo {
  recordingId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number; // seconds
  size: number; // bytes
  format: string;
  quality: string;
  participants: ParticipantInfo[];
  metadata: RecordingMetadata;
  status: 'recording' | 'processing' | 'completed' | 'failed' | 'deleted';
  storageLocation: string;
  downloadUrl?: string;
  shareUrl?: string;
}

interface ParticipantInfo {
  participantId: string;
  name: string;
  role: 'host' | 'participant' | 'observer';
  joinTime: number;
  leaveTime?: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareActive: boolean;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface RecordingMetadata {
  title: string;
  description?: string;
  tags: string[];
  category?: string;
  language: string;
  transcript?: string;
  analytics?: RecordingAnalytics;
  customFields: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface RecordingAnalytics {
  totalSpeakingTime: number; // seconds
  speakingTimePerParticipant: Record<string, number>;
  engagementScore: number; // 0-100
  attentionLevel: number; // 0-100
  keyMoments: KeyMoment[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: TopicAnalysis[];
}

interface KeyMoment {
  timestamp: number;
  type: 'important' | 'decision' | 'question' | 'action_item' | 'highlight';
  description: string;
  participants: string[];
  confidence: number; // 0-100
}

interface TopicAnalysis {
  topic: string;
  startTime: number;
  endTime: number;
  confidence: number; // 0-100
  keywords: string[];
}

interface StorageStats {
  totalUsed: number; // bytes
  totalAvailable: number; // bytes
  recordingsCount: number;
  averageSize: number; // bytes
  oldestRecording: number; // timestamp
  newestRecording: number; // timestamp
}

class RecordingManager extends EventTarget {
  private config: RecordingConfig;
  private recordings: Map<string, RecordingInfo> = new Map();
  private activeRecordings: Map<string, MediaRecorder> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();
  private storageManager: StorageManager;
  private transcriptionService: TranscriptionService;
  private analyticsService: AnalyticsService;
  private isInitialized: boolean = false;

  constructor(config?: Partial<RecordingConfig>) {
    super();
    this.config = this.initializeConfig(config);
    this.storageManager = new StorageManager(this.config.storage);
    this.transcriptionService = new TranscriptionService();
    this.analyticsService = new AnalyticsService();
    
    this.initialize();
  }

  // Initialize configuration
  private initializeConfig(userConfig?: Partial<RecordingConfig>): RecordingConfig {
    const defaultConfig: RecordingConfig = {
      recording: {
        enabled: true,
        autoStart: false,
        maxDuration: 120, // 2 hours
        quality: 'medium',
        format: 'webm',
        compression: true
      },
      storage: {
        provider: 'local',
        maxStorageSize: 10240, // 10GB
        retentionDays: 30,
        encryption: true,
        compressionLevel: 6
      },
      metadata: {
        includeTranscript: true,
        includeAnalytics: true,
        includeParticipants: true,
        includeTimestamps: true,
        customFields: []
      },
      sharing: {
        enabled: true,
        defaultPermissions: 'private',
        requirePassword: false,
        expirationDays: 7,
        allowDownload: true
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  // Initialize recording manager
  private async initialize(): Promise<void> {
    try {
      await this.storageManager.initialize();
      await this.loadExistingRecordings();
      
      this.isInitialized = true;
      console.log('Recording manager initialized');
      
      this.dispatchEvent(new CustomEvent('initialized', {
        detail: { timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('Failed to initialize recording manager:', error);
      throw error;
    }
  }

  // Load existing recordings
  private async loadExistingRecordings(): Promise<void> {
    try {
      const recordings = await this.storageManager.listRecordings();
      
      for (const recording of recordings) {
        this.recordings.set(recording.recordingId, recording);
      }
      
      console.log(`Loaded ${recordings.length} existing recordings`);
      
    } catch (error) {
      console.error('Failed to load existing recordings:', error);
    }
  }

  // Start recording
  public async startRecording(
    sessionId: string,
    mediaStream: MediaStream,
    options?: {
      title?: string;
      description?: string;
      participants?: ParticipantInfo[];
    }
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Recording manager not initialized');
    }
    
    if (!this.config.recording.enabled) {
      throw new Error('Recording is disabled');
    }
    
    if (this.activeRecordings.has(sessionId)) {
      throw new Error(`Recording already active for session ${sessionId}`);
    }
    
    try {
      // Create recording info
      const recordingId = this.generateRecordingId();
      const recordingInfo: RecordingInfo = {
        recordingId,
        sessionId,
        startTime: Date.now(),
        size: 0,
        format: this.config.recording.format,
        quality: this.config.recording.quality,
        participants: options?.participants || [],
        metadata: {
          title: options?.title || `Recording ${new Date().toISOString()}`,
          description: options?.description,
          tags: [],
          language: 'en',
          customFields: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        status: 'recording',
        storageLocation: this.config.storage.provider
      };
      
      // Store media stream
      this.mediaStreams.set(sessionId, mediaStream);
      
      // Create media recorder
      const mediaRecorder = this.createMediaRecorder(mediaStream, recordingId);
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      
      // Store active recording
      this.activeRecordings.set(sessionId, mediaRecorder);
      this.recordings.set(recordingId, recordingInfo);
      
      // Set up recording monitoring
      this.setupRecordingMonitoring(sessionId, recordingId);
      
      console.log(`Started recording ${recordingId} for session ${sessionId}`);
      
      this.dispatchEvent(new CustomEvent('recordingStarted', {
        detail: { recordingId, sessionId, timestamp: Date.now() }
      }));
      
      return recordingId;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  // Create media recorder
  private createMediaRecorder(mediaStream: MediaStream, recordingId: string): MediaRecorder {
    const mimeType = this.getMimeType();
    
    const options: MediaRecorderOptions = {
      mimeType
    };
    
    // Add quality settings if supported
    if (this.config.recording.quality !== 'medium') {
      const videoBitsPerSecond = this.getVideoBitrate();
      const audioBitsPerSecond = this.getAudioBitrate();
      
      options.videoBitsPerSecond = videoBitsPerSecond;
      options.audioBitsPerSecond = audioBitsPerSecond;
    }
    
    const mediaRecorder = new MediaRecorder(mediaStream, options);
    
    // Handle data available
    mediaRecorder.addEventListener('dataavailable', async (event) => {
      if (event.data.size > 0) {
        await this.handleRecordingData(recordingId, event.data);
      }
    });
    
    // Handle recording stop
    mediaRecorder.addEventListener('stop', async () => {
      await this.handleRecordingStop(recordingId);
    });
    
    // Handle recording error
    mediaRecorder.addEventListener('error', (event) => {
      console.error('Recording error:', event);
      this.handleRecordingError(recordingId, event);
    });
    
    return mediaRecorder;
  }

  // Get MIME type based on format
  private getMimeType(): string {
    switch (this.config.recording.format) {
      case 'webm':
        return 'video/webm;codecs=vp9,opus';
      case 'mp4':
        return 'video/mp4;codecs=h264,aac';
      case 'avi':
        return 'video/x-msvideo';
      case 'mov':
        return 'video/quicktime';
      default:
        return 'video/webm';
    }
  }

  // Get video bitrate based on quality
  private getVideoBitrate(): number {
    switch (this.config.recording.quality) {
      case 'low':
        return 500000; // 500 kbps
      case 'medium':
        return 1500000; // 1.5 Mbps
      case 'high':
        return 3000000; // 3 Mbps
      case 'ultra':
        return 6000000; // 6 Mbps
      default:
        return 1500000;
    }
  }

  // Get audio bitrate based on quality
  private getAudioBitrate(): number {
    switch (this.config.recording.quality) {
      case 'low':
        return 64000; // 64 kbps
      case 'medium':
        return 128000; // 128 kbps
      case 'high':
        return 192000; // 192 kbps
      case 'ultra':
        return 320000; // 320 kbps
      default:
        return 128000;
    }
  }

  // Handle recording data
  private async handleRecordingData(recordingId: string, data: Blob): Promise<void> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) return;
      
      // Update recording size
      recording.size += data.size;
      
      // Store data chunk
      await this.storageManager.storeChunk(recordingId, data);
      
      // Update recording info
      recording.updatedAt = Date.now();
      
      // Dispatch progress event
      this.dispatchEvent(new CustomEvent('recordingProgress', {
        detail: {
          recordingId,
          size: recording.size,
          duration: (Date.now() - recording.startTime) / 1000
        }
      }));
      
    } catch (error) {
      console.error('Failed to handle recording data:', error);
    }
  }

  // Setup recording monitoring
  private setupRecordingMonitoring(sessionId: string, recordingId: string): void {
    const checkInterval = setInterval(async () => {
      const recording = this.recordings.get(recordingId);
      if (!recording) {
        clearInterval(checkInterval);
        return;
      }
      
      // Check maximum duration
      const duration = (Date.now() - recording.startTime) / 1000 / 60; // minutes
      if (duration >= this.config.recording.maxDuration) {
        await this.stopRecording(sessionId);
        clearInterval(checkInterval);
        return;
      }
      
      // Check storage limits
      const stats = await this.storageManager.getStorageStats();
      if (stats.totalUsed >= this.config.storage.maxStorageSize * 0.9) {
        console.warn('Storage nearly full, consider stopping recordings');
        this.dispatchEvent(new CustomEvent('storageWarning', {
          detail: { used: stats.totalUsed, available: stats.totalAvailable }
        }));
      }
      
    }, 30000); // Check every 30 seconds
  }

  // Stop recording
  public async stopRecording(sessionId: string): Promise<void> {
    const mediaRecorder = this.activeRecordings.get(sessionId);
    const recordingId = this.findRecordingIdBySession(sessionId);
    
    if (!mediaRecorder || !recordingId) {
      throw new Error(`No active recording found for session ${sessionId}`);
    }
    
    try {
      // Stop media recorder
      mediaRecorder.stop();
      
      // Clean up
      this.activeRecordings.delete(sessionId);
      this.mediaStreams.delete(sessionId);
      
      console.log(`Stopped recording ${recordingId} for session ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  // Handle recording stop
  private async handleRecordingStop(recordingId: string): Promise<void> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) return;
      
      // Update recording info
      recording.endTime = Date.now();
      recording.duration = (recording.endTime - recording.startTime) / 1000;
      recording.status = 'processing';
      
      // Finalize recording storage
      await this.storageManager.finalizeRecording(recordingId);
      
      // Generate transcript if enabled
      if (this.config.metadata.includeTranscript) {
        const transcript = await this.transcriptionService.generateTranscript(recordingId);
        if (transcript) {
          recording.metadata.transcript = transcript;
        }
      }
      
      // Generate analytics if enabled
      if (this.config.metadata.includeAnalytics) {
        const analytics = await this.analyticsService.generateAnalytics(recordingId);
        if (analytics) {
          recording.metadata.analytics = analytics;
        }
      }
      
      // Update status to completed
      recording.status = 'completed';
      recording.updatedAt = Date.now();
      
      // Generate share URL if sharing is enabled
      if (this.config.sharing.enabled) {
        recording.shareUrl = await this.generateShareUrl(recordingId);
      }
      
      // Save updated recording info
      await this.storageManager.saveRecordingInfo(recording);
      
      console.log(`Recording ${recordingId} completed successfully`);
      
      this.dispatchEvent(new CustomEvent('recordingCompleted', {
        detail: { recordingId, recording }
      }));
      
    } catch (error) {
      console.error('Failed to handle recording stop:', error);
      
      const recording = this.recordings.get(recordingId);
      if (recording) {
        recording.status = 'failed';
        recording.updatedAt = Date.now();
      }
      
      this.dispatchEvent(new CustomEvent('recordingFailed', {
        detail: { recordingId, error: error.message }
      }));
    }
  }

  // Handle recording error
  private handleRecordingError(recordingId: string, error: any): void {
    const recording = this.recordings.get(recordingId);
    if (recording) {
      recording.status = 'failed';
      recording.updatedAt = Date.now();
    }
    
    this.dispatchEvent(new CustomEvent('recordingError', {
      detail: { recordingId, error: error.message }
    }));
  }

  // Find recording ID by session ID
  private findRecordingIdBySession(sessionId: string): string | undefined {
    for (const [recordingId, recording] of this.recordings) {
      if (recording.sessionId === sessionId && recording.status === 'recording') {
        return recordingId;
      }
    }
    return undefined;
  }

  // Generate share URL
  private async generateShareUrl(recordingId: string): Promise<string> {
    const recording = this.recordings.get(recordingId);
    if (!recording || !this.config.sharing.enabled) {
      return '';
    }
    
    // Generate unique share token
    const shareToken = this.generateShareToken();
    
    // Store share token
    await this.storageManager.storeShareToken(recordingId, shareToken);
    
    // Build share URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${shareToken}`;
  }

  // Generate share token
  private generateShareToken(): string {
    return btoa(Date.now().toString() + Math.random().toString(36)).replace(/=/g, '');
  }

  // Get recording
  public getRecording(recordingId: string): RecordingInfo | undefined {
    return this.recordings.get(recordingId);
  }

  // Get all recordings
  public getAllRecordings(): RecordingInfo[] {
    return Array.from(this.recordings.values());
  }

  // Get recordings by status
  public getRecordingsByStatus(status: RecordingInfo['status']): RecordingInfo[] {
    return Array.from(this.recordings.values()).filter(r => r.status === status);
  }

  // Delete recording
  public async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) return false;
      
      // Stop recording if active
      if (recording.status === 'recording') {
        await this.stopRecording(recording.sessionId);
      }
      
      // Delete from storage
      await this.storageManager.deleteRecording(recordingId);
      
      // Remove from memory
      this.recordings.delete(recordingId);
      
      console.log(`Recording ${recordingId} deleted`);
      
      this.dispatchEvent(new CustomEvent('recordingDeleted', {
        detail: { recordingId, timestamp: Date.now() }
      }));
      
      return true;
      
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return false;
    }
  }

  // Update recording metadata
  public async updateRecordingMetadata(
    recordingId: string,
    metadata: Partial<RecordingMetadata>
  ): Promise<boolean> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) return false;
      
      // Update metadata
      recording.metadata = { ...recording.metadata, ...metadata, updatedAt: Date.now() };
      
      // Save updated info
      await this.storageManager.saveRecordingInfo(recording);
      
      this.dispatchEvent(new CustomEvent('metadataUpdated', {
        detail: { recordingId, metadata }
      }));
      
      return true;
      
    } catch (error) {
      console.error('Failed to update recording metadata:', error);
      return false;
    }
  }

  // Get storage statistics
  public async getStorageStatistics(): Promise<StorageStats> {
    return await this.storageManager.getStorageStats();
  }

  // Cleanup old recordings
  public async cleanupOldRecordings(): Promise<number> {
    const cutoffDate = Date.now() - (this.config.storage.retentionDays * 24 * 60 * 60 * 1000);
    const oldRecordings = Array.from(this.recordings.values())
      .filter(r => r.startTime < cutoffDate && r.status === 'completed');
    
    let deletedCount = 0;
    
    for (const recording of oldRecordings) {
      if (await this.deleteRecording(recording.recordingId)) {
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} old recordings`);
    
    this.dispatchEvent(new CustomEvent('cleanupCompleted', {
      detail: { deletedCount, timestamp: Date.now() }
    }));
    
    return deletedCount;
  }

  // Generate recording ID
  private generateRecordingId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get configuration
  public getConfig(): RecordingConfig {
    return { ...this.config };
  }

  // Update configuration
  public updateConfig(newConfig: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.dispatchEvent(new CustomEvent('configUpdated', {
      detail: { config: this.config }
    }));
  }

  // Export recording data
  public async exportRecording(recordingId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }
    
    const exportData = {
      recording,
      exportDate: Date.now(),
      format
    };
    
    const dataStr = format === 'json' 
      ? JSON.stringify(exportData, null, 2)
      : this.convertToCSV(exportData);
    
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    return new Blob([dataStr], { type: mimeType });
  }

  // Convert to CSV
  private convertToCSV(data: any): string {
    // Simple CSV conversion for recording data
    const headers = ['Recording ID', 'Session ID', 'Title', 'Duration', 'Size', 'Status', 'Created At'];
    const values = [
      data.recording.recordingId,
      data.recording.sessionId,
      data.recording.metadata.title,
      data.recording.duration || 0,
      data.recording.size,
      data.recording.status,
      new Date(data.recording.metadata.createdAt).toISOString()
    ];
    
    return [headers.join(','), values.join(',')].join('\n');
  }

  // Destroy recording manager
  public destroy(): void {
    // Stop all active recordings
    for (const [sessionId] of this.activeRecordings) {
      this.stopRecording(sessionId).catch(console.error);
    }
    
    // Clean up services
    this.storageManager.destroy();
    this.transcriptionService.destroy();
    this.analyticsService.destroy();
    
    // Clear data
    this.recordings.clear();
    this.activeRecordings.clear();
    this.mediaStreams.clear();
    
    this.dispatchEvent(new CustomEvent('destroyed', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Storage Manager helper class
class StorageManager {
  private config: RecordingConfig['storage'];
  private chunks: Map<string, Blob[]> = new Map();

  constructor(config: RecordingConfig['storage']) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('Storage manager initialized');
  }

  async storeChunk(recordingId: string, chunk: Blob): Promise<void> {
    if (!this.chunks.has(recordingId)) {
      this.chunks.set(recordingId, []);
    }
    
    this.chunks.get(recordingId)!.push(chunk);
  }

  async finalizeRecording(recordingId: string): Promise<void> {
    const chunks = this.chunks.get(recordingId);
    if (!chunks) return;
    
    // Combine chunks into single blob
    const completeBlob = new Blob(chunks);
    
    // Store the complete recording
    await this.storeCompleteRecording(recordingId, completeBlob);
    
    // Clear chunks
    this.chunks.delete(recordingId);
  }

  private async storeCompleteRecording(recordingId: string, blob: Blob): Promise<void> {
    // In a real implementation, this would store to cloud storage or local file system
    console.log(`Stored recording ${recordingId}, size: ${blob.size} bytes`);
  }

  async saveRecordingInfo(recording: RecordingInfo): Promise<void> {
    // In a real implementation, this would save to database
    console.log(`Saved recording info for ${recording.recordingId}`);
  }

  async listRecordings(): Promise<RecordingInfo[]> {
    // In a real implementation, this would query database
    return [];
  }

  async deleteRecording(recordingId: string): Promise<void> {
    // In a real implementation, this would delete from storage
    console.log(`Deleted recording ${recordingId}`);
  }

  async getStorageStats(): Promise<StorageStats> {
    return {
      totalUsed: 0,
      totalAvailable: this.config.maxStorageSize * 1024 * 1024,
      recordingsCount: 0,
      averageSize: 0,
      oldestRecording: 0,
      newestRecording: 0
    };
  }

  async storeShareToken(recordingId: string, token: string): Promise<void> {
    // In a real implementation, this would store in database
    console.log(`Stored share token for ${recordingId}`);
  }

  destroy(): void {
    this.chunks.clear();
  }
}

// Transcription Service helper class
class TranscriptionService {
  async generateTranscript(recordingId: string): Promise<string | null> {
    // In a real implementation, this would use speech-to-text API
    return `Sample transcript for recording ${recordingId}`;
  }

  destroy(): void {
    // Cleanup
  }
}

// Analytics Service helper class
class AnalyticsService {
  async generateAnalytics(recordingId: string): Promise<RecordingAnalytics | null> {
    // In a real implementation, this would analyze the recording
    return {
      totalSpeakingTime: 300,
      speakingTimePerParticipant: {},
      engagementScore: 85,
      attentionLevel: 90,
      keyMoments: [],
      sentiment: 'positive',
      topics: []
    };
  }

  destroy(): void {
    // Cleanup
  }
}

export { 
  RecordingManager, 
  RecordingConfig, 
  RecordingInfo, 
  RecordingMetadata, 
  RecordingAnalytics,
  StorageStats 
};
