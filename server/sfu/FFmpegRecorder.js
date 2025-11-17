/**
 * FFmpeg Recorder Module
 *
 * Handles media encoding and recording:
 * - Receives RTP streams from consumers
 * - Encodes to multiple formats (H.264, VP9, AV1)
 * - Writes to file or streams to S3
 * - Manages bitrate adaptation
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class FFmpegRecorder extends EventEmitter {
  constructor(options = {}) {
    super();

    this.recordingId = options.recordingId;
    this.audioPort = options.audioPort;
    this.videoPort = options.videoPort;
    this.outputPath = options.outputPath || '/tmp';
    this.codec = options.codec || 'h264'; // h264, vp9, av1
    this.bitrate = options.bitrate || '2500k';
    this.resolution = options.resolution || '1920x1080';
    this.framerate = options.framerate || 30;
    this.s3Stream = options.s3Stream; // Optional S3 stream

    this.process = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    this.stats = {
      bytesWritten: 0,
      framesProcessed: 0,
      errors: 0
    };
  }

  /**
   * Get FFmpeg command based on codec
   */
  getFFmpegCommand() {
    const audioInput = `rtp://127.0.0.1:${this.audioPort}`;
    const videoInput = `rtp://127.0.0.1:${this.videoPort}`;

    // Output file or pipe to stdout (for S3)
    const output = this.s3Stream ? 'pipe:1' : path.join(this.outputPath, `recording_${this.recordingId}.mp4`);

    let videoCodec = 'libx264';
    let videoPreset = 'fast'; // fast, medium, slow
    let videoProfile = 'baseline';
    let additionalArgs = [];

    switch (this.codec) {
      case 'vp9':
        videoCodec = 'libvpx-vp9';
        videoPreset = 'realtime';
        additionalArgs = ['-cpu-used', '8']; // Higher = faster but lower quality
        break;
      case 'av1':
        videoCodec = 'libaom-av1';
        videoPreset = 'realtime';
        additionalArgs = ['-crf', '28']; // Quality (0-63, lower = better)
        break;
      case 'h264':
      default:
        videoCodec = 'libx264';
        videoPreset = 'fast';
        videoProfile = 'baseline';
        additionalArgs = [];
    }

    const args = [
      // Audio input
      '-protocol_whitelist', 'file,udp,rtp',
      '-i', audioInput,
      '-acodec', 'libopus',
      '-ab', '128k',
      '-ac', '2',
      '-ar', '48000',

      // Video input
      '-i', videoInput,
      '-vcodec', videoCodec,
      '-b:v', this.bitrate,
      '-s', this.resolution,
      '-r', this.framerate.toString(),
      '-preset', videoPreset,
      '-profile:v', videoProfile,

      // Additional codec-specific args
      ...additionalArgs,

      // Container settings
      '-c:a', 'aac',
      '-ab', '128k',
      '-f', 'mp4',
      '-movflags', '+faststart',

      // Enable statistics
      '-stats',

      // Output
      output
    ];

    return args;
  }

  /**
   * Start recording
   */
  start() {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      const args = this.getFFmpegCommand();

      console.log(`🎥 Starting FFmpeg recording (${this.codec.toUpperCase()})...`);
      console.log(`   Recording ID: ${this.recordingId}`);
      console.log(`   Codec: ${this.codec}`);
      console.log(`   Bitrate: ${this.bitrate}`);
      console.log(`   Resolution: ${this.resolution}`);

      this.process = spawn('ffmpeg', args, {
        stdio: this.s3Stream ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe']
      });

      this.isRecording = true;
      this.recordingStartTime = new Date();

      // Handle stdout (for S3 streaming)
      if (this.s3Stream) {
        this.process.stdout.on('data', (chunk) => {
          this.stats.bytesWritten += chunk.length;
          this.s3Stream.write(chunk);
        });
      }

      // Handle stderr (FFmpeg stats)
      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        this.parseFFmpegStats(output);
      });

      // Handle process events
      this.process.on('error', (err) => {
        console.error('❌ FFmpeg process error:', err);
        this.stats.errors++;
        this.emit('error', err);
      });

      this.process.on('exit', (code, signal) => {
        this.isRecording = false;
        if (code === 0) {
          console.log('✅ FFmpeg recording completed successfully');
          this.emit('recording:completed', this.stats);
        } else {
          console.error(`❌ FFmpeg exited with code ${code} (${signal})`);
          this.emit('recording:error', { code, signal });
        }
      });

      this.emit('recording:started', {
        recordingId: this.recordingId,
        codec: this.codec,
        startTime: this.recordingStartTime
      });

      return true;
    } catch (err) {
      console.error('Failed to start FFmpeg recording:', err);
      this.isRecording = false;
      throw err;
    }
  }

  /**
   * Parse FFmpeg statistics from stderr
   */
  parseFFmpegStats(output) {
    // Extract frame count from FFmpeg output: "frame= 150"
    const frameMatch = output.match(/frame=\s*(\d+)/);
    if (frameMatch) {
      this.stats.framesProcessed = parseInt(frameMatch[1]);
      this.emit('recording:progress', {
        frames: this.stats.framesProcessed,
        bytesWritten: this.stats.bytesWritten,
        duration: this.getDuration()
      });
    }

    // Log any errors
    if (output.toLowerCase().includes('error')) {
      console.warn('FFmpeg warning/error:', output.substring(0, 200));
      this.stats.errors++;
    }
  }

  /**
   * Stop recording
   */
  stop() {
    if (!this.isRecording || !this.process) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.process.kill('SIGKILL');
        reject(new Error('FFmpeg stop timeout'));
      }, 30000); // 30 second timeout

      this.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      console.log('⏹️  Stopping FFmpeg recording...');
      this.process.stdin.write('q\n');
      this.isRecording = false;
    });
  }

  /**
   * Get recording duration
   */
  getDuration() {
    if (!this.recordingStartTime) {
      return 0;
    }

    return Math.floor((Date.now() - this.recordingStartTime.getTime()) / 1000);
  }

  /**
   * Get recording statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRecording: this.isRecording,
      duration: this.getDuration(),
      recordingId: this.recordingId,
      codec: this.codec,
      startTime: this.recordingStartTime
    };
  }

  /**
   * Pause/resume recording
   */
  pause() {
    if (this.process) {
      this.process.stdin.write('p\n');
      console.log('⏸️  Recording paused');
    }
  }

  resume() {
    if (this.process) {
      this.process.stdin.write('p\n');
      console.log('▶️  Recording resumed');
    }
  }

  /**
   * Verify FFmpeg is installed
   */
  static async verifyFFmpeg() {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-version']);

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && output.includes('ffmpeg')) {
          // Extract version
          const versionMatch = output.match(/ffmpeg version ([\d.]+)/);
          resolve({
            installed: true,
            version: versionMatch ? versionMatch[1] : 'unknown'
          });
        } else {
          resolve({ installed: false });
        }
      });

      proc.on('error', () => {
        resolve({ installed: false });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
      }, 5000);
    });
  }

  /**
   * Check codec support in FFmpeg
   */
  static async checkCodecSupport(codec) {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-codecs']);

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        const codecMap = {
          h264: 'h264',
          vp9: 'vp9',
          av1: 'av1'
        };

        const supported = output.includes(codecMap[codec] || codec);
        resolve({ codec, supported });
      });

      proc.on('error', () => {
        resolve({ codec, supported: false });
      });
    });
  }
}

module.exports = FFmpegRecorder;
