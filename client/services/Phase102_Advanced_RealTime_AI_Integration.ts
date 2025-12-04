/**
 * Phase 102: Advanced Real-Time AI Integration
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Real-time AI processing for WebRTC streams including live transcription,
 * translation, sentiment analysis, and noise cancellation.
 *
 * Research Sources:
 * - WebRTC MediaStream Processing
 * - OpenAI Whisper Real-Time
 * - Google Cloud Speech-to-Text Streaming
 * - AWS Transcribe Streaming
 * - Web Audio API Advanced Features
 *
 * @version 1.0.0
 * @phase 102
 * @date December 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AudioStreamConfig {
  sampleRate: number;
  channelCount: number;
  bufferSize: number;
  encoding: 'pcm' | 'opus' | 'wav';
}

interface TranscriptionConfig {
  language: string;
  model: 'whisper-large' | 'google-chirp' | 'aws-transcribe';
  enablePunctuation: boolean;
  enableSpeakerDiarization: boolean;
  vocabularyFilter?: string[];
  profanityFilter: boolean;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  startTime: number;
  endTime: number;
  speaker?: string;
  alternatives?: TranscriptionAlternative[];
}

interface TranscriptionAlternative {
  text: string;
  confidence: number;
}

interface SentimentResult {
  score: number; // -1 (negative) to 1 (positive)
  magnitude: number; // 0 to infinity
  label: 'positive' | 'neutral' | 'negative';
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
  };
}

interface SpamIndicators {
  isRobotic: boolean;
  hasScriptedSpeech: boolean;
  hasBackgroundNoise: boolean;
  hasMultipleSpeakers: boolean;
  confidenceScore: number;
  flags: string[];
}

interface NoiseProfile {
  type: 'white' | 'pink' | 'brown' | 'background' | 'interference';
  intensity: number;
  frequency: number;
  duration: number;
}

interface StreamMetrics {
  latency: number;
  packetsLost: number;
  jitter: number;
  bitrate: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// REAL-TIME AUDIO PROCESSOR
// ============================================================================

/**
 * Real-Time Audio Processor
 *
 * Processes WebRTC audio streams in real-time with AI models.
 *
 * Research: Web Audio API, AudioWorklet, MediaStream Processing
 */
export class RealTimeAudioProcessor {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bufferQueue: Float32Array[] = [];
  private isProcessing: boolean = false;

  /**
   * Initialize audio processor
   */
  async initialize(): Promise<void> {
    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
      latencyHint: 'interactive'
    });

    // Create analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Load audio worklet (for advanced processing)
    try {
      await this.audioContext.audioWorklet.addModule('/audio-processor-worklet.js');
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
    } catch (error) {
      console.warn('AudioWorklet not available, using ScriptProcessor fallback');
    }
  }

  /**
   * Process MediaStream
   */
  async processStream(
    stream: MediaStream,
    callback: (audioData: Float32Array) => Promise<void>
  ): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const source = this.audioContext!.createMediaStreamSource(stream);

    if (this.workletNode) {
      // Use AudioWorklet (preferred)
      source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext!.destination);

      this.workletNode.port.onmessage = async (event) => {
        const audioData = event.data.audioData;
        await callback(audioData);
      };
    } else {
      // Fallback to ScriptProcessor (deprecated but widely supported)
      const scriptProcessor = this.audioContext!.createScriptProcessor(4096, 1, 1);
      source.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext!.destination);

      scriptProcessor.onaudioprocess = async (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        await callback(audioData);
      };
    }

    // Connect to analyser
    source.connect(this.analyser!);

    this.isProcessing = true;
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Get time domain data
   */
  getTimeDomainData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  /**
   * Detect voice activity
   */
  detectVoiceActivity(): boolean {
    const frequencyData = this.getFrequencyData();

    // Calculate energy in voice frequency range (300Hz - 3400Hz)
    let energy = 0;
    const voiceRange = frequencyData.slice(
      Math.floor(frequencyData.length * 0.1),
      Math.floor(frequencyData.length * 0.4)
    );

    for (const value of voiceRange) {
      energy += value;
    }

    const avgEnergy = energy / voiceRange.length;
    return avgEnergy > 30; // Threshold for voice activity
  }

  /**
   * Stop processing
   */
  stop(): void {
    this.isProcessing = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ============================================================================
// STREAMING TRANSCRIPTION ENGINE
// ============================================================================

/**
 * Streaming Transcription Engine
 *
 * Real-time speech-to-text with multiple provider support.
 *
 * Research: Whisper Streaming, Google Cloud Speech API, AWS Transcribe
 */
export class StreamingTranscriptionEngine {
  private config: TranscriptionConfig;
  private websocket: WebSocket | null = null;
  private buffer: Float32Array[] = [];
  private lastTranscript: string = '';
  private listeners: Array<(result: TranscriptionResult) => void> = [];

  constructor(config: Partial<TranscriptionConfig> = {}) {
    this.config = {
      language: config.language || 'en-US',
      model: config.model || 'whisper-large',
      enablePunctuation: config.enablePunctuation !== false,
      enableSpeakerDiarization: config.enableSpeakerDiarization || false,
      vocabularyFilter: config.vocabularyFilter || [],
      profanityFilter: config.profanityFilter !== false
    };
  }

  /**
   * Start streaming transcription
   */
  async startStreaming(audioStream: MediaStream): Promise<void> {
    // Connect to transcription service (simulated)
    this.websocket = new WebSocket('wss://transcription.ring.io/stream');

    this.websocket.onopen = () => {
      // Send configuration
      this.websocket!.send(JSON.stringify({
        type: 'config',
        config: this.config
      }));
    };

    this.websocket.onmessage = (event) => {
      const result = JSON.parse(event.data) as TranscriptionResult;
      this.handleTranscriptionResult(result);
    };

    // Process audio and send to service
    const processor = new RealTimeAudioProcessor();
    await processor.processStream(audioStream, async (audioData) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // Convert to base64 or send as binary
        const buffer = this.float32ToInt16(audioData);
        this.websocket.send(buffer);
      }
    });
  }

  /**
   * Process audio chunk (offline mode)
   */
  async processAudioChunk(audioData: Float32Array): Promise<TranscriptionResult | null> {
    this.buffer.push(audioData);

    // Process when buffer is large enough (e.g., 1 second of audio)
    const bufferDuration = this.buffer.reduce((sum, chunk) => sum + chunk.length, 0) / 16000;

    if (bufferDuration >= 1.0) {
      const result = await this.transcribeBuffer();
      this.buffer = []; // Clear buffer
      return result;
    }

    return null;
  }

  /**
   * Transcribe buffered audio
   */
  private async transcribeBuffer(): Promise<TranscriptionResult> {
    // Simulate transcription (in production, would call actual API)
    await this.sleep(100);

    const texts = [
      'Hello, this is a test call',
      'We are calling about your car warranty',
      'Press 1 to speak with a representative',
      'This is an automated message',
      'Your account has been compromised'
    ];

    const text = texts[Math.floor(Math.random() * texts.length)];
    const isSpamRelated = text.includes('warranty') || text.includes('automated');

    return {
      text,
      confidence: 0.85 + Math.random() * 0.15,
      isFinal: true,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      speaker: this.config.enableSpeakerDiarization ? 'Speaker_1' : undefined,
      alternatives: [
        { text, confidence: 0.9 },
        { text: text.replace('test', 'text'), confidence: 0.7 }
      ]
    };
  }

  /**
   * Handle transcription result
   */
  private handleTranscriptionResult(result: TranscriptionResult): void {
    if (result.isFinal) {
      this.lastTranscript = result.text;
    }

    // Notify all listeners
    for (const listener of this.listeners) {
      listener(result);
    }
  }

  /**
   * Add transcription listener
   */
  onTranscription(listener: (result: TranscriptionResult) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Get last transcript
   */
  getLastTranscript(): string {
    return this.lastTranscript;
  }

  /**
   * Convert Float32Array to Int16Array
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  /**
   * Stop streaming
   */
  stop(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// REAL-TIME SENTIMENT ANALYZER
// ============================================================================

/**
 * Real-Time Sentiment Analyzer
 *
 * Analyzes sentiment of transcribed speech in real-time.
 *
 * Research: VADER Sentiment, TextBlob, Hugging Face Transformers
 */
export class RealTimeSentimentAnalyzer {
  private sentimentHistory: SentimentResult[] = [];
  private windowSize: number = 10;

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // Simulate sentiment analysis (in production, would use actual model)
    await this.sleep(50);

    // Simple keyword-based sentiment (for demo)
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'thank'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'hate', 'scam', 'fraud'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.3;
    }

    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.3;
    }

    score = Math.max(-1, Math.min(1, score));

    const result: SentimentResult = {
      score,
      magnitude: Math.abs(score) * 2,
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      emotions: {
        joy: score > 0 ? score : 0,
        anger: score < -0.5 ? Math.abs(score) : 0,
        fear: lowerText.includes('scam') ? 0.7 : 0,
        sadness: score < -0.3 ? Math.abs(score) * 0.5 : 0
      }
    };

    this.sentimentHistory.push(result);
    if (this.sentimentHistory.length > this.windowSize) {
      this.sentimentHistory.shift();
    }

    return result;
  }

  /**
   * Get aggregate sentiment over time window
   */
  getAggregateSentiment(): SentimentResult {
    if (this.sentimentHistory.length === 0) {
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral'
      };
    }

    const avgScore = this.sentimentHistory.reduce((sum, s) => sum + s.score, 0) / this.sentimentHistory.length;
    const avgMagnitude = this.sentimentHistory.reduce((sum, s) => sum + s.magnitude, 0) / this.sentimentHistory.length;

    return {
      score: avgScore,
      magnitude: avgMagnitude,
      label: avgScore > 0.1 ? 'positive' : avgScore < -0.1 ? 'negative' : 'neutral'
    };
  }

  /**
   * Get sentiment trend
   */
  getSentimentTrend(): 'improving' | 'declining' | 'stable' {
    if (this.sentimentHistory.length < 3) return 'stable';

    const recent = this.sentimentHistory.slice(-3);
    const trend = recent[2].score - recent[0].score;

    if (trend > 0.2) return 'improving';
    if (trend < -0.2) return 'declining';
    return 'stable';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SPAM DETECTION ENGINE
// ============================================================================

/**
 * Real-Time Spam Detection Engine
 *
 * Detects spam indicators from audio and transcription in real-time.
 *
 * Research: Voice biometrics, speech pattern analysis
 */
export class RealTimeSpamDetector {
  private indicators: SpamIndicators = {
    isRobotic: false,
    hasScriptedSpeech: false,
    hasBackgroundNoise: false,
    hasMultipleSpeakers: false,
    confidenceScore: 0,
    flags: []
  };

  /**
   * Analyze audio for spam indicators
   */
  async analyzeAudio(audioData: Float32Array, frequencyData: Uint8Array): Promise<SpamIndicators> {
    // Reset indicators
    this.indicators.flags = [];

    // Check for robotic voice (unnatural frequency patterns)
    this.indicators.isRobotic = this.detectRoboticVoice(frequencyData);
    if (this.indicators.isRobotic) {
      this.indicators.flags.push('robotic_voice');
    }

    // Check for background noise patterns
    this.indicators.hasBackgroundNoise = this.detectBackgroundNoise(audioData);
    if (this.indicators.hasBackgroundNoise) {
      this.indicators.flags.push('background_noise');
    }

    // Calculate overall confidence
    this.indicators.confidenceScore = this.calculateConfidence();

    return { ...this.indicators };
  }

  /**
   * Analyze transcript for spam patterns
   */
  async analyzeTranscript(text: string): Promise<void> {
    const spamKeywords = [
      'warranty', 'congratulations', 'winner', 'prize', 'urgent',
      'act now', 'limited time', 'free', 'click here', 'call now',
      'verify', 'suspended', 'account', 'confirm', 'social security'
    ];

    const scriptedPhrases = [
      'this is not a sales call',
      'press 1 to speak',
      'representative will be with you',
      'do not hang up',
      'final notice'
    ];

    const lowerText = text.toLowerCase();

    // Check for spam keywords
    const hasSpamKeywords = spamKeywords.some(keyword => lowerText.includes(keyword));
    if (hasSpamKeywords) {
      this.indicators.flags.push('spam_keywords');
    }

    // Check for scripted speech
    this.indicators.hasScriptedSpeech = scriptedPhrases.some(phrase => lowerText.includes(phrase));
    if (this.indicators.hasScriptedSpeech) {
      this.indicators.flags.push('scripted_speech');
    }

    // Recalculate confidence
    this.indicators.confidenceScore = this.calculateConfidence();
  }

  /**
   * Detect robotic voice
   */
  private detectRoboticVoice(frequencyData: Uint8Array): boolean {
    // Check for unnatural frequency distribution
    const lowFreq = frequencyData.slice(0, frequencyData.length / 3);
    const midFreq = frequencyData.slice(frequencyData.length / 3, 2 * frequencyData.length / 3);
    const highFreq = frequencyData.slice(2 * frequencyData.length / 3);

    const lowAvg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;
    const midAvg = midFreq.reduce((a, b) => a + b, 0) / midFreq.length;
    const highAvg = highFreq.reduce((a, b) => a + b, 0) / highFreq.length;

    // Robotic voices often have unnaturally even distribution
    const variance = Math.abs(lowAvg - midAvg) + Math.abs(midAvg - highAvg);
    return variance < 20; // Low variance indicates robotic voice
  }

  /**
   * Detect background noise
   */
  private detectBackgroundNoise(audioData: Float32Array): boolean {
    // Calculate noise floor
    const sorted = Array.from(audioData).map(Math.abs).sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.1)];

    return noiseFloor > 0.05; // Threshold for significant background noise
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(): number {
    let score = 0;

    if (this.indicators.isRobotic) score += 0.3;
    if (this.indicators.hasScriptedSpeech) score += 0.4;
    if (this.indicators.hasBackgroundNoise) score += 0.1;
    if (this.indicators.hasMultipleSpeakers) score += 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Get spam decision
   */
  getDecision(): { isSpam: boolean; confidence: number; reason: string } {
    const isSpam = this.indicators.confidenceScore > 0.5;

    let reason = '';
    if (isSpam) {
      reason = `Detected spam indicators: ${this.indicators.flags.join(', ')}`;
    } else {
      reason = 'No significant spam indicators detected';
    }

    return {
      isSpam,
      confidence: this.indicators.confidenceScore,
      reason
    };
  }

  /**
   * Get current indicators
   */
  getIndicators(): SpamIndicators {
    return { ...this.indicators };
  }
}

// ============================================================================
// NOISE CANCELLATION ENGINE
// ============================================================================

/**
 * Real-Time Noise Cancellation Engine
 *
 * Removes background noise from audio streams.
 *
 * Research: RNNoise, Krisp, NVIDIA RTX Voice
 */
export class NoiseCancellationEngine {
  private audioContext: AudioContext | null = null;
  private noiseGate: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;

  /**
   * Initialize noise cancellation
   */
  async initialize(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create noise gate (compressor)
    this.noiseGate = this.audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.setValueAtTime(-50, this.audioContext.currentTime);
    this.noiseGate.knee.setValueAtTime(40, this.audioContext.currentTime);
    this.noiseGate.ratio.setValueAtTime(12, this.audioContext.currentTime);
    this.noiseGate.attack.setValueAtTime(0, this.audioContext.currentTime);
    this.noiseGate.release.setValueAtTime(0.25, this.audioContext.currentTime);

    // Create high-pass filter (remove low-frequency noise)
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
  }

  /**
   * Apply noise cancellation to stream
   */
  applyToStream(inputStream: MediaStream): MediaStream {
    if (!this.audioContext) {
      throw new Error('Noise cancellation not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(inputStream);
    const destination = this.audioContext.createMediaStreamDestination();

    // Chain: source → filter → noise gate → destination
    source.connect(this.filter!);
    this.filter!.connect(this.noiseGate!);
    this.noiseGate!.connect(destination);

    return destination.stream;
  }

  /**
   * Analyze noise profile
   */
  async analyzeNoise(audioData: Float32Array): Promise<NoiseProfile> {
    // Calculate noise characteristics
    const intensity = this.calculateIntensity(audioData);
    const frequency = this.estimateDominantFrequency(audioData);

    return {
      type: this.classifyNoiseType(intensity, frequency),
      intensity,
      frequency,
      duration: audioData.length / 16000
    };
  }

  private calculateIntensity(audioData: Float32Array): number {
    let sum = 0;
    for (const sample of audioData) {
      sum += Math.abs(sample);
    }
    return sum / audioData.length;
  }

  private estimateDominantFrequency(audioData: Float32Array): number {
    // Simplified frequency estimation (in production, would use FFT)
    return 1000; // Placeholder
  }

  private classifyNoiseType(intensity: number, frequency: number): NoiseProfile['type'] {
    if (frequency < 100) return 'brown';
    if (frequency < 500) return 'pink';
    if (intensity > 0.5) return 'interference';
    return 'background';
  }

  /**
   * Adjust noise cancellation strength
   */
  setStrength(strength: number): void {
    if (!this.noiseGate) return;

    const threshold = -50 + (strength * 20); // -50 to -30
    this.noiseGate.threshold.setValueAtTime(threshold, this.audioContext!.currentTime);
  }
}

// ============================================================================
// INTEGRATED REAL-TIME AI PLATFORM
// ============================================================================

/**
 * Integrated Real-Time AI Platform for Ring
 */
export class IntegratedRealTimeAIPlatform {
  private audioProcessor: RealTimeAudioProcessor;
  private transcription: StreamingTranscriptionEngine;
  private sentiment: RealTimeSentimentAnalyzer;
  private spamDetector: RealTimeSpamDetector;
  private noiseCancellation: NoiseCancellationEngine;
  private isActive: boolean = false;

  constructor() {
    this.audioProcessor = new RealTimeAudioProcessor();
    this.transcription = new StreamingTranscriptionEngine();
    this.sentiment = new RealTimeSentimentAnalyzer();
    this.spamDetector = new RealTimeSpamDetector();
    this.noiseCancellation = new NoiseCancellationEngine();
  }

  /**
   * Start real-time processing
   */
  async startProcessing(
    stream: MediaStream,
    callbacks: RealTimeCallbacks
  ): Promise<void> {
    await this.audioProcessor.initialize();
    await this.noiseCancellation.initialize();

    // Apply noise cancellation
    const cleanStream = this.noiseCancellation.applyToStream(stream);

    // Setup transcription listener
    this.transcription.onTranscription(async (result) => {
      if (result.isFinal) {
        // Analyze sentiment
        const sentiment = await this.sentiment.analyzeSentiment(result.text);

        // Analyze for spam
        await this.spamDetector.analyzeTranscript(result.text);

        callbacks.onTranscription?.(result);
        callbacks.onSentiment?.(sentiment);
      }
    });

    // Process audio stream
    await this.audioProcessor.processStream(cleanStream, async (audioData) => {
      // Get frequency data
      const frequencyData = this.audioProcessor.getFrequencyData();

      // Detect voice activity
      const hasVoice = this.audioProcessor.detectVoiceActivity();

      if (hasVoice) {
        // Process transcription
        const transcriptResult = await this.transcription.processAudioChunk(audioData);

        // Analyze for spam indicators
        const spamIndicators = await this.spamDetector.analyzeAudio(audioData, frequencyData);

        callbacks.onSpamIndicators?.(spamIndicators);

        // Check if we should block
        const decision = this.spamDetector.getDecision();
        if (decision.isSpam && decision.confidence > 0.7) {
          callbacks.onSpamDetected?.(decision);
        }
      }
    });

    this.isActive = true;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): RealTimeMetrics {
    const sentiment = this.sentiment.getAggregateSentiment();
    const spamIndicators = this.spamDetector.getIndicators();
    const decision = this.spamDetector.getDecision();

    return {
      sentiment,
      spamIndicators,
      spamDecision: decision,
      transcript: this.transcription.getLastTranscript(),
      sentimentTrend: this.sentiment.getSentimentTrend(),
      isActive: this.isActive
    };
  }

  /**
   * Stop processing
   */
  stop(): void {
    this.audioProcessor.stop();
    this.transcription.stop();
    this.isActive = false;
  }
}

interface RealTimeCallbacks {
  onTranscription?: (result: TranscriptionResult) => void;
  onSentiment?: (result: SentimentResult) => void;
  onSpamIndicators?: (indicators: SpamIndicators) => void;
  onSpamDetected?: (decision: { isSpam: boolean; confidence: number; reason: string }) => void;
}

interface RealTimeMetrics {
  sentiment: SentimentResult;
  spamIndicators: SpamIndicators;
  spamDecision: { isSpam: boolean; confidence: number; reason: string };
  transcript: string;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  isActive: boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AudioStreamConfig,
  TranscriptionConfig,
  TranscriptionResult,
  TranscriptionAlternative,
  SentimentResult,
  SpamIndicators,
  NoiseProfile,
  StreamMetrics,
  RealTimeCallbacks,
  RealTimeMetrics
};
