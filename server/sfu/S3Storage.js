/**
 * AWS S3 Storage Module for Call Recordings
 *
 * Handles:
 * - Direct streaming to S3 from FFmpeg
 * - Server-side encryption with AES-256
 * - Multi-part upload for large files
 * - Compression and lifecycle management
 * - Access control and presigned URLs
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const stream = require('stream');

class S3Storage extends EventEmitter {
  constructor(options = {}) {
    super();

    this.s3 = new AWS.S3({
      accessKeyId: options.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      region: options.region || process.env.AWS_REGION || 'us-east-1'
    });

    this.bucket = options.bucket || process.env.S3_BUCKET || 'webrtc-recordings';
    this.encryption = options.encryption || 'AES256';
    this.storageClass = options.storageClass || 'STANDARD_IA'; // Infrequent Access
    this.enableVersioning = options.enableVersioning !== false;

    this.uploads = new Map(); // uploadId -> upload state
  }

  /**
   * Initialize S3 bucket (create if needed)
   */
  async initialize() {
    try {
      console.log('🏗️  Initializing S3 bucket configuration...');

      // Check if bucket exists
      try {
        await this.s3.headBucket({ Bucket: this.bucket }).promise();
        console.log(`✅ S3 bucket exists: ${this.bucket}`);
      } catch (err) {
        if (err.code === 'NotFound') {
          console.log(`Creating S3 bucket: ${this.bucket}`);
          await this.s3.createBucket({ Bucket: this.bucket }).promise();
          console.log(`✅ S3 bucket created: ${this.bucket}`);
        } else {
          throw err;
        }
      }

      // Enable versioning if requested
      if (this.enableVersioning) {
        await this.s3.putBucketVersioning({
          Bucket: this.bucket,
          VersioningConfiguration: { Status: 'Enabled' }
        }).promise();
        console.log(`✅ Versioning enabled on ${this.bucket}`);
      }

      // Set bucket encryption
      await this.s3.putBucketEncryption({
        Bucket: this.bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: this.encryption
              },
              BucketKeyEnabled: true
            }
          ]
        }
      }).promise();
      console.log(`✅ Bucket encryption enabled: ${this.encryption}`);

      // Set lifecycle policy (delete old recordings after 90 days)
      await this.s3.putBucketLifecycleConfiguration({
        Bucket: this.bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DeleteOldRecordings',
              Status: 'Enabled',
              Prefix: 'recordings/',
              Expiration: { Days: 90 },
              NoncurrentVersionExpiration: { NoncurrentDays: 30 }
            },
            {
              Id: 'TransitionToGlacier',
              Status: 'Enabled',
              Prefix: 'recordings/',
              Transitions: [
                {
                  Days: 30,
                  StorageClass: 'GLACIER'
                }
              ]
            }
          ]
        }
      }).promise();
      console.log('✅ Lifecycle policy configured');

      // Block public access
      await this.s3.putPublicAccessBlockConfiguration({
        Bucket: this.bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true
        }
      }).promise();
      console.log('✅ Public access blocked');

      return true;
    } catch (err) {
      console.error('Failed to initialize S3:', err);
      throw err;
    }
  }

  /**
   * Create writable stream to S3
   */
  createUploadStream(recordingId, metadata = {}) {
    const key = `recordings/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${recordingId}.mp4`;

    const uploadParams = {
      Bucket: this.bucket,
      Key: key,
      ContentType: 'video/mp4',
      ServerSideEncryption: this.encryption,
      StorageClass: this.storageClass,
      Metadata: {
        'recording-id': recordingId,
        'upload-time': new Date().toISOString(),
        ...metadata
      },
      Tagging: `recordingId=${recordingId}&type=call-recording`
    };

    // Create upload stream
    const passThrough = new stream.PassThrough();

    // Start multipart upload
    (async () => {
      try {
        const upload = this.s3.upload(uploadParams, {
          partSize: 10 * 1024 * 1024, // 10MB parts
          queueSize: 5
        });

        // Track upload
        this.uploads.set(recordingId, {
          key,
          startTime: Date.now(),
          state: 'uploading'
        });

        // Handle upload progress
        upload.on('httpUploadProgress', (progress) => {
          const uploadState = this.uploads.get(recordingId);
          if (uploadState) {
            uploadState.bytesUploaded = progress.loaded;
            uploadState.totalBytes = progress.total;
          }

          this.emit('upload:progress', {
            recordingId,
            loaded: progress.loaded,
            total: progress.total,
            percentage: Math.round((progress.loaded / progress.total) * 100)
          });
        });

        const result = await upload.promise();

        // Update upload state
        const uploadState = this.uploads.get(recordingId);
        if (uploadState) {
          uploadState.state = 'completed';
          uploadState.etag = result.ETag;
          uploadState.location = result.Location;
          uploadState.duration = Date.now() - uploadState.startTime;
        }

        console.log(`✅ Recording uploaded to S3: ${key}`);
        this.emit('upload:completed', {
          recordingId,
          key,
          location: result.Location,
          size: uploadState.totalBytes,
          duration: uploadState.duration
        });
      } catch (err) {
        console.error(`Upload failed for ${recordingId}:`, err);

        const uploadState = this.uploads.get(recordingId);
        if (uploadState) {
          uploadState.state = 'failed';
          uploadState.error = err.message;
        }

        this.emit('upload:error', { recordingId, error: err });
      }
    })();

    return passThrough;
  }

  /**
   * Get presigned download URL
   */
  async getDownloadUrl(recordingId, expirySeconds = 3600) {
    try {
      const uploadState = this.uploads.get(recordingId);
      if (!uploadState) {
        throw new Error('Recording not found');
      }

      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucket,
        Key: uploadState.key,
        Expires: expirySeconds
      });

      return url;
    } catch (err) {
      console.error('Failed to get download URL:', err);
      throw err;
    }
  }

  /**
   * Get recording metadata from S3
   */
  async getRecordingMetadata(recordingId) {
    try {
      const uploadState = this.uploads.get(recordingId);
      if (!uploadState) {
        throw new Error('Recording not found');
      }

      const headObject = await this.s3.headObject({
        Bucket: this.bucket,
        Key: uploadState.key
      }).promise();

      return {
        recordingId,
        key: uploadState.key,
        size: headObject.ContentLength,
        uploadDate: headObject.LastModified,
        etag: headObject.ETag,
        storageClass: headObject.StorageClass,
        metadata: headObject.Metadata
      };
    } catch (err) {
      console.error('Failed to get recording metadata:', err);
      throw err;
    }
  }

  /**
   * Delete recording from S3
   */
  async deleteRecording(recordingId) {
    try {
      const uploadState = this.uploads.get(recordingId);
      if (!uploadState) {
        throw new Error('Recording not found');
      }

      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: uploadState.key
      }).promise();

      this.uploads.delete(recordingId);
      console.log(`✅ Recording deleted from S3: ${uploadState.key}`);
    } catch (err) {
      console.error('Failed to delete recording:', err);
      throw err;
    }
  }

  /**
   * List recordings with optional filtering
   */
  async listRecordings(options = {}) {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: options.prefix || 'recordings/',
        MaxKeys: options.maxKeys || 100
      };

      const result = await this.s3.listObjectsV2(params).promise();

      return result.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        storageClass: item.StorageClass
      }));
    } catch (err) {
      console.error('Failed to list recordings:', err);
      throw err;
    }
  }

  /**
   * Calculate storage costs
   */
  async calculateStorageCosts() {
    try {
      const recordings = await this.listRecordings();

      const totalSizeGB = recordings.reduce((sum, rec) => sum + rec.size, 0) / (1024 ** 3);

      // AWS S3 pricing (approximate)
      const standardPrice = 0.023; // per GB
      const gp2Price = 0.02;       // general purpose per GB
      const glacierPrice = 0.004;  // per GB

      return {
        totalRecordings: recordings.length,
        totalSizeGB: totalSizeGB.toFixed(2),
        estimatedMonthlyCost: (totalSizeGB * standardPrice).toFixed(2),
        recordingDetails: recordings.slice(0, 10) // First 10
      };
    } catch (err) {
      console.error('Failed to calculate storage costs:', err);
      throw err;
    }
  }

  /**
   * Get upload progress
   */
  getUploadProgress(recordingId) {
    const uploadState = this.uploads.get(recordingId);
    if (!uploadState) {
      return null;
    }

    return {
      recordingId,
      state: uploadState.state,
      percentage: uploadState.totalBytes ? Math.round((uploadState.bytesUploaded / uploadState.totalBytes) * 100) : 0,
      bytesUploaded: uploadState.bytesUploaded,
      totalBytes: uploadState.totalBytes,
      duration: Date.now() - uploadState.startTime,
      error: uploadState.error || null
    };
  }

  /**
   * List all active uploads
   */
  getActiveUploads() {
    const active = [];

    for (const [recordingId, state] of this.uploads.entries()) {
      if (state.state === 'uploading') {
        active.push({
          recordingId,
          key: state.key,
          percentage: state.totalBytes ? Math.round((state.bytesUploaded / state.totalBytes) * 100) : 0,
          elapsedTime: Date.now() - state.startTime
        });
      }
    }

    return active;
  }
}

module.exports = S3Storage;
