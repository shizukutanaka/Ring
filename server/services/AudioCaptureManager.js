/**
 * Audio Capture Manager
 * Captures and buffers audio from WebRTC streams for translation processing
 *
 * Features:
 * - WebRTC audio capture via Insertable Streams API
 * - Audio buffering for STT processing
 * - PCM/WAV format conversion
 * - Voice activity detection (VAD)
 * - Audio quality monitoring
 * - Chunked processing for latency optimization
 *
 * Supported Formats: PCM 16-bit, WAV
 * Sample Rates: 16kHz, 48kHz
 * Channels: Mono, Stereo (converts to mono for STT)
 */

const { EventEmitter } = require('events');

class AudioCaptureManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableCapture: options.enableCapture !== false,
      sampleRate: options.sampleRate || 16000, // 16kHz for speech recognition
      channelCount: options.channelCount || 1, // Mono
      bufferSize: options.bufferSize || 4096, // 256ms at 16kHz
      chunkDurationMs: options.chunkDurationMs || 500, // 500ms chunks for STT
      enableVAD: options.enableVAD !== false,
      vadThreshold: options.vadThreshold || -40, // dB
      ...options
    };

    this.state = {
      initialized: false,
      isCapturing: false,
      audioContext: null,
      mediaStream: null,
      processor: null
    };

    // Audio buffers
    this.audioBuffer = [];
    this.totalSamplesCaptured = 0;

    // VAD state
    this.vadState = {
      isSpeaking: false,
      silenceDuration: 0,
      silenceThreshold: 1000 // 1 second of silence to consider speech ended
    };

    // Audio quality metrics
    this.metrics = {
      totalFrames: 0,
      totalSamples: 0,
      totalBytes: 0,
      avgAudioLevel: 0,
      peakAudioLevel: 0,
      noisyFrames: 0,
      vadFrames: 0,
      chunksCreated: 0,
      avgChunkSize: 0
    };

    // Chunk processing queue
    this.chunksQueue = [];
    this.chunkTimer = null;
  }

  /**
   * Initialize audio capture
   */
  async initialize(mediaStream = null) {
    try {
      // Create audio context if not provided
      this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.options.sampleRate
      });

      // Use provided media stream or request one
      if (mediaStream) {
        this.state.mediaStream = mediaStream;
      } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.state.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: this.options.sampleRate
          }
        });
      } else {
        throw new Error('Audio capture not supported');
      }

      // Create audio source and processor
      const source = this.state.audioContext.createMediaStreamSource(this.state.mediaStream);

      // Create ScriptProcessorNode (deprecated but widely supported)
      // In production, use AudioWorklet
      this.state.processor = this.state.audioContext.createScriptProcessor(
        this.options.bufferSize,
        1, // input channels
        1  // output channels
      );

      // Handle audio data
      this.state.processor.onaudioprocess = (event) => {
        this.handleAudioProcess(event);
      };

      source.connect(this.state.processor);
      this.state.processor.connect(this.state.audioContext.destination);

      this.state.initialized = true;
      this.emit('initialized');

      return { success: true };
    } catch (error) {
      this.emit('error', { phase: 'initialization', error });
      throw error;
    }
  }

  /**
   * Start capturing audio
   */
  startCapture() {
    if (!this.state.initialized) {
      throw new Error('AudioCaptureManager not initialized');
    }

    if (this.state.audioContext.state === 'suspended') {
      this.state.audioContext.resume();
    }

    this.state.isCapturing = true;
    this.audioBuffer = [];
    this.totalSamplesCaptured = 0;

    // Start chunk timer
    this.chunkTimer = setInterval(() => {
      this.createChunk();
    }, this.options.chunkDurationMs);

    this.emit('capture:started');
  }

  /**
   * Stop capturing audio
   */
  stopCapture() {
    this.state.isCapturing = false;

    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Finalize any remaining audio
    if (this.audioBuffer.length > 0) {
      this.createChunk();
    }

    this.emit('capture:stopped');
  }

  /**
   * Handle audio process event
   */
  handleAudioProcess(event) {
    if (!this.state.isCapturing) return;

    const inputData = event.inputBuffer.getChannelData(0);

    // Copy audio data
    const audioData = new Float32Array(inputData.length);
    audioData.set(inputData);

    // Analyze audio level and VAD
    const analysis = this.analyzeAudio(audioData);

    // Update metrics
    this.updateMetrics(analysis);

    // Store in buffer
    this.audioBuffer.push(audioData);
    this.totalSamplesCaptured += audioData.length;

    // Update VAD state
    if (this.options.enableVAD) {
      this.updateVADState(analysis.audioLevel);
    }

    this.emit('audio:frame', {
      timestamp: Date.now(),
      sampleCount: audioData.length,
      audioLevel: analysis.audioLevel,
      isSpeechDetected: analysis.isSpeechDetected
    });
  }

  /**
   * Analyze audio frame
   */
  analyzeAudio(audioData) {
    let sum = 0;
    let max = 0;
    let min = 0;

    // Calculate RMS (Root Mean Square) for audio level
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      sum += sample * sample;
      if (sample > max) max = sample;
      if (sample < min) min = sample;
    }

    const rms = Math.sqrt(sum / audioData.length);
    const audioLevel = 20 * Math.log10(rms + 1e-10); // Convert to dB

    // Simple speech detection based on energy
    const isSpeechDetected = audioLevel > this.options.vadThreshold;

    return {
      audioLevel,
      peakLevel: Math.max(Math.abs(max), Math.abs(min)),
      rms,
      isSpeechDetected
    };
  }

  /**
   * Update VAD state
   */
  updateVADState(audioLevel) {
    if (audioLevel > this.options.vadThreshold) {
      // Speech detected
      if (!this.vadState.isSpeaking) {
        this.vadState.isSpeaking = true;
        this.emit('vad:speech-start');
      }
      this.vadState.silenceDuration = 0;
    } else {
      // Silence detected
      this.vadState.silenceDuration += this.options.bufferSize / this.options.sampleRate * 1000;

      if (this.vadState.isSpeaking && this.vadState.silenceDuration > this.vadState.silenceThreshold) {
        this.vadState.isSpeaking = false;
        this.emit('vad:speech-end');
      }
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(analysis) {
    this.metrics.totalFrames++;
    this.metrics.totalSamples += this.options.bufferSize;
    this.metrics.totalBytes += this.options.bufferSize * 2; // 16-bit = 2 bytes per sample

    // Track audio levels
    if (this.metrics.avgAudioLevel === 0) {
      this.metrics.avgAudioLevel = analysis.audioLevel;
    } else {
      this.metrics.avgAudioLevel = (this.metrics.avgAudioLevel * 0.9) + (analysis.audioLevel * 0.1);
    }

    if (analysis.peakLevel > this.metrics.peakAudioLevel) {
      this.metrics.peakAudioLevel = analysis.peakLevel;
    }

    if (analysis.isSpeechDetected) {
      this.metrics.vadFrames++;
    }

    // Track noisy frames (high energy in speech band)
    if (analysis.audioLevel > 0) {
      this.metrics.noisyFrames++;
    }
  }

  /**
   * Create audio chunk for processing
   */
  createChunk() {
    if (this.audioBuffer.length === 0) return;

    // Combine all buffered audio
    const totalSamples = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const chunkData = new Float32Array(totalSamples);

    let offset = 0;
    for (const buf of this.audioBuffer) {
      chunkData.set(buf, offset);
      offset += buf.length;
    }

    // Convert to WAV
    const wavBuffer = this.float32ToWAV(chunkData);

    const chunk = {
      id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      audioData: chunkData,
      wavBuffer,
      duration: (chunkData.length / this.options.sampleRate) * 1000, // ms
      sampleRate: this.options.sampleRate,
      sampleCount: chunkData.length,
      bytes: wavBuffer.byteLength,
      isSpeechFrame: this.vadState.isSpeaking
    };

    this.chunksQueue.push(chunk);
    this.metrics.chunksCreated++;

    // Update average chunk size
    this.metrics.avgChunkSize = this.metrics.totalBytes / this.metrics.chunksCreated;

    // Clear buffer
    this.audioBuffer = [];

    this.emit('chunk:created', chunk);

    return chunk;
  }

  /**
   * Convert Float32 audio to WAV format
   */
  float32ToWAV(float32Array) {
    // WAV header: 44 bytes
    const sampleRate = this.options.sampleRate;
    const channels = 1;
    const bitDepth = 16;

    // Convert float32 to int16
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = float32Array[i] < 0
        ? float32Array[i] * 0x8000
        : float32Array[i] * 0x7FFF;
    }

    // Create WAV file
    const bytesPerSample = bitDepth / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = int16Array.length * bytesPerSample;

    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < int16Array.length; i++) {
      view.setInt16(offset, int16Array[i], true);
      offset += 2;
    }

    return wavBuffer;
  }

  /**
   * Get next chunk from queue
   */
  getNextChunk() {
    return this.chunksQueue.shift();
  }

  /**
   * Get remaining chunks count
   */
  getChunksCount() {
    return this.chunksQueue.length;
  }

  /**
   * Get audio metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentState: {
        isCapturing: this.state.isCapturing,
        isSpeaking: this.vadState.isSpeaking,
        bufferedChunks: this.chunksQueue.length,
        bufferSize: this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0)
      }
    };
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      initialized: this.state.initialized,
      isCapturing: this.state.isCapturing,
      sampleRate: this.options.sampleRate,
      metrics: this.getMetrics(),
      vadState: this.vadState,
      contextState: this.state.audioContext?.state
    };
  }

  /**
   * Stop and cleanup
   */
  cleanup() {
    this.stopCapture();

    if (this.state.processor) {
      this.state.processor.disconnect();
    }

    if (this.state.mediaStream) {
      this.state.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.state.audioContext) {
      this.state.audioContext.close();
    }

    this.audioBuffer = [];
    this.chunksQueue = [];

    this.emit('cleanup');
  }

  /**
   * Reset state
   */
  reset() {
    this.audioBuffer = [];
    this.chunksQueue = [];
    this.totalSamplesCaptured = 0;

    this.metrics = {
      totalFrames: 0,
      totalSamples: 0,
      totalBytes: 0,
      avgAudioLevel: 0,
      peakAudioLevel: 0,
      noisyFrames: 0,
      vadFrames: 0,
      chunksCreated: 0,
      avgChunkSize: 0
    };

    this.emit('reset');
  }
}

module.exports = AudioCaptureManager;
