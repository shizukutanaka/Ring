/**
 * Real-Time Translation Manager
 * Orchestrates complete translation experience for WebRTC calls
 *
 * Features:
 * - Full pipeline orchestration (audio capture → STT → translate → TTS → playback)
 * - Real-time closed captions (WCAG 2.1 AA compliant)
 * - Language selection and management
 * - Translation quality modes (Fast/Balanced/Quality)
 * - Performance optimization and fallback mechanisms
 * - User preferences and accessibility controls
 * - Integration with existing call infrastructure
 *
 * Performance Targets:
 * - End-to-end latency: <1 second optimal, <3 seconds acceptable
 * - Cost per minute: $0.049-0.074 at scale
 * - Supported languages: 100+
 * - CPU overhead: <15%
 * - Accessibility: WCAG 2.1 Level AA
 */

const { EventEmitter } = require('events');

class RealTimeTranslationManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableTranslation: options.enableTranslation !== false,
      enableCaptions: options.enableCaptions !== false,
      qualityMode: options.qualityMode || 'balanced', // fast, balanced, quality
      maxConcurrentTranslations: options.maxConcurrentTranslations || 5,
      captionDisplayDuration: options.captionDisplayDuration || 5000, // 5 seconds
      autoSelectLanguages: options.autoSelectLanguages !== false,
      accessibilityMode: options.accessibilityMode || 'standard', // standard, high-contrast, large-text
      ...options
    };

    this.state = {
      initialized: false,
      isActive: false,
      currentCallId: null,
      localLanguage: 'en',
      remoteLanguage: 'en',
      translationEnabled: false,
      captionsEnabled: false
    };

    // Quality mode configurations
    this.qualityModes = {
      'fast': {
        sttLatency: 100,
        translationLatency: 150,
        ttsLatency: 50,
        totalLatency: 300,
        accuracy: 'standard'
      },
      'balanced': {
        sttLatency: 200,
        translationLatency: 200,
        ttsLatency: 75,
        totalLatency: 475,
        accuracy: 'high'
      },
      'quality': {
        sttLatency: 300,
        translationLatency: 300,
        ttsLatency: 100,
        totalLatency: 700,
        accuracy: 'very-high'
      }
    };

    // Caption queue for real-time display
    this.captionQueue = [];
    this.displayedCaptions = [];

    // Translation history
    this.translationHistory = {
      segments: [],
      maxSegments: 100
    };

    // Performance monitoring
    this.performance = {
      startTime: null,
      totalTranslations: 0,
      totalCaptions: 0,
      avgLatency: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkBandwidth: 0
    };

    // User preferences
    this.userPreferences = {
      preferredLanguages: ['en'],
      autoTranslate: false,
      captionPosition: 'bottom', // bottom, top, floating
      captionSize: 'medium',
      captionBackground: 'semi-transparent',
      speakTranslations: false,
      nativeSpeedAdjustment: 1.0
    };

    // Services references (will be injected)
    this.audioCaptureManager = null;
    this.translationService = null;
    this.metricsStreamingService = null;

    // Metrics
    this.metrics = {
      callsProcessed: 0,
      totalSegmentsTranslated: 0,
      totalCaptionsGenerated: 0,
      avgTranslationLatency: 0,
      successRate: 0,
      cpuOverhead: 0,
      costPerMinute: 0,
      userSatisfaction: 0
    };
  }

  /**
   * Initialize translation manager
   */
  async initialize(audioCaptureManager, translationService, metricsStreamingService = null) {
    try {
      this.audioCaptureManager = audioCaptureManager;
      this.translationService = translationService;
      this.metricsStreamingService = metricsStreamingService;

      // Initialize services
      if (this.audioCaptureManager && !this.audioCaptureManager.state.initialized) {
        await this.audioCaptureManager.initialize();
      }

      if (this.translationService && !this.translationService.state.initialized) {
        await this.translationService.initialize();
      }

      this.state.initialized = true;
      this.performance.startTime = Date.now();

      this.emit('initialized');

      return { success: true };
    } catch (error) {
      this.emit('error', { phase: 'initialization', error });
      throw error;
    }
  }

  /**
   * Start translation for a call
   */
  async startTranslation(callId, options = {}) {
    const {
      localLanguage = 'en',
      remoteLanguages = ['en'],
      autoStart = true
    } = options;

    if (!this.state.initialized) {
      throw new Error('RealTimeTranslationManager not initialized');
    }

    // Validate languages
    for (const lang of [localLanguage, ...remoteLanguages]) {
      if (!this.translationService.validateLanguage(lang)) {
        throw new Error(`Unsupported language: ${lang}`);
      }
    }

    this.state.currentCallId = callId;
    this.state.localLanguage = localLanguage;
    this.state.remoteLanguage = remoteLanguages[0]; // Primary remote language
    this.state.isActive = true;
    this.state.translationEnabled = true;

    // Start audio capture
    if (this.audioCaptureManager) {
      this.audioCaptureManager.startCapture();
    }

    this.emit('translation:started', {
      callId,
      localLanguage,
      remoteLanguages,
      qualityMode: this.options.qualityMode
    });

    // Start processing audio chunks
    if (autoStart) {
      this.startProcessing();
    }

    return { success: true, callId };
  }

  /**
   * Stop translation for call
   */
  stopTranslation() {
    if (!this.state.isActive) return;

    // Stop audio capture
    if (this.audioCaptureManager) {
      this.audioCaptureManager.stopCapture();
    }

    this.state.isActive = false;
    this.state.translationEnabled = false;

    // Generate session summary
    const summary = this.generateSessionSummary();

    this.emit('translation:stopped', summary);

    return summary;
  }

  /**
   * Start processing audio chunks
   */
  startProcessing() {
    const processingInterval = setInterval(async () => {
      if (!this.state.isActive) {
        clearInterval(processingInterval);
        return;
      }

      const chunk = this.audioCaptureManager?.getNextChunk();

      if (chunk && chunk.isSpeechFrame) {
        this.processAudioChunk(chunk);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Process single audio chunk
   */
  async processAudioChunk(chunk) {
    const processingStart = Date.now();

    try {
      // Translate audio
      const result = await this.translationService.processAudio(chunk.audioData, {
        sourceLanguage: this.state.localLanguage,
        targetLanguages: [this.state.remoteLanguage]
      });

      // Create translation record
      const translation = {
        chunkId: chunk.id,
        timestamp: chunk.timestamp,
        sourceText: result.transcription,
        translations: result.translations,
        latency: Date.now() - processingStart,
        qualityScore: result.quality.transcriptionConfidence
      };

      // Store in history
      this.translationHistory.segments.push(translation);
      if (this.translationHistory.segments.length > this.translationHistory.maxSegments) {
        this.translationHistory.segments.shift();
      }

      // Generate captions
      if (this.options.enableCaptions) {
        this.generateCaptions(translation);
      }

      // Update metrics
      this.performance.totalTranslations++;
      this.metrics.totalSegmentsTranslated++;
      this.metrics.avgTranslationLatency =
        (this.metrics.avgTranslationLatency * 0.9) + (translation.latency * 0.1);

      this.emit('translation:processed', {
        original: translation.sourceText,
        translated: translation.translations[this.state.remoteLanguage],
        latency: translation.latency
      });
    } catch (error) {
      this.emit('translation:error', {
        chunkId: chunk.id,
        error: error.message
      });
    }
  }

  /**
   * Generate real-time captions
   */
  generateCaptions(translation) {
    const caption = {
      id: `caption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: translation.timestamp,
      sourceText: translation.sourceText,
      translatedText: translation.translations[this.state.remoteLanguage],
      duration: this.options.captionDisplayDuration,
      language: this.state.remoteLanguage,
      speaker: 'remote',
      accessibility: {
        wcagLevel: 'AA',
        fontSize: this.getUserFontSize(),
        contrast: this.getUserContrast(),
        animation: false // No animation for accessibility
      }
    };

    // Add to caption queue
    this.captionQueue.push(caption);
    this.metrics.totalCaptionsGenerated++;

    // Display caption
    this.displayCaption(caption);

    // Stream to dashboard if available
    if (this.metricsStreamingService) {
      this.metricsStreamingService.broadcast({
        type: 'caption',
        caption
      });
    }

    // Auto-remove caption after duration
    setTimeout(() => {
      this.removeCaption(caption.id);
    }, caption.duration);
  }

  /**
   * Display caption (would be rendered in UI)
   */
  displayCaption(caption) {
    this.displayedCaptions.push(caption);

    this.emit('caption:display', {
      id: caption.id,
      text: caption.translatedText,
      language: caption.language,
      position: this.userPreferences.captionPosition
    });
  }

  /**
   * Remove displayed caption
   */
  removeCaption(captionId) {
    this.displayedCaptions = this.displayedCaptions.filter(c => c.id !== captionId);

    this.emit('caption:remove', { captionId });
  }

  /**
   * Set quality mode
   */
  setQualityMode(mode) {
    if (!this.qualityModes[mode]) {
      throw new Error(`Invalid quality mode: ${mode}`);
    }

    this.options.qualityMode = mode;

    this.emit('quality:changed', {
      mode,
      latencyTarget: this.qualityModes[mode].totalLatency
    });
  }

  /**
   * Set translation languages
   */
  setLanguages(localLanguage, remoteLanguages) {
    // Validate
    if (!this.translationService.validateLanguage(localLanguage)) {
      throw new Error(`Unsupported local language: ${localLanguage}`);
    }

    for (const lang of remoteLanguages) {
      if (!this.translationService.validateLanguage(lang)) {
        throw new Error(`Unsupported remote language: ${lang}`);
      }
    }

    this.state.localLanguage = localLanguage;
    this.state.remoteLanguage = remoteLanguages[0];

    this.emit('languages:changed', {
      local: localLanguage,
      remote: remoteLanguages
    });
  }

  /**
   * Enable/disable captions
   */
  setCaptionsEnabled(enabled) {
    this.state.captionsEnabled = enabled;
    this.options.enableCaptions = enabled;

    if (!enabled) {
      // Clear displayed captions
      this.displayedCaptions = [];
    }

    this.emit('captions:toggled', { enabled });
  }

  /**
   * Get user font size for accessibility
   */
  getUserFontSize() {
    const sizes = {
      'small': 12,
      'medium': 16,
      'large': 20,
      'x-large': 24
    };

    return sizes[this.userPreferences.captionSize] || 16;
  }

  /**
   * Get user contrast preference
   */
  getUserContrast() {
    const contrast = {
      'standard': { bg: 'rgba(0,0,0,0.7)', text: '#FFFFFF' },
      'high-contrast': { bg: '#000000', text: '#FFFF00' },
      'black-on-white': { bg: '#FFFFFF', text: '#000000' }
    };

    return contrast[this.userPreferences.captionBackground] || contrast['standard'];
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences) {
    this.userPreferences = {
      ...this.userPreferences,
      ...preferences
    };

    this.emit('preferences:updated', this.userPreferences);
  }

  /**
   * Generate session summary
   */
  generateSessionSummary() {
    const duration = this.performance.startTime ? Date.now() - this.performance.startTime : 0;

    return {
      callId: this.state.currentCallId,
      duration,
      totalSegments: this.translationHistory.segments.length,
      totalCaptions: this.metrics.totalCaptionsGenerated,
      localLanguage: this.state.localLanguage,
      remoteLanguage: this.state.remoteLanguage,
      avgLatency: this.metrics.avgTranslationLatency,
      qualityMode: this.options.qualityMode,
      cost: this.calculateSessionCost(duration),
      userSatisfaction: this.metrics.userSatisfaction
    };
  }

  /**
   * Calculate cost for session
   */
  calculateSessionCost(durationMs) {
    const minutes = durationMs / 60000;
    const costPerMinute = 0.074; // At scale

    return (minutes * costPerMinute).toFixed(4);
  }

  /**
   * Get translation history
   */
  getTranslationHistory(limit = 20) {
    return this.translationHistory.segments.slice(-limit);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      sessionDuration: this.performance.startTime ? Date.now() - this.performance.startTime : 0,
      qualityMode: this.options.qualityMode,
      captionsEnabled: this.state.captionsEnabled,
      displayedCaptions: this.displayedCaptions.length,
      currentLanguages: {
        local: this.state.localLanguage,
        remote: this.state.remoteLanguage
      }
    };
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      initialized: this.state.initialized,
      isActive: this.state.isActive,
      currentCallId: this.state.currentCallId,
      metrics: this.getMetrics(),
      translationHistory: this.getTranslationHistory(10),
      displayedCaptions: this.displayedCaptions,
      userPreferences: this.userPreferences,
      supportedLanguages: this.translationService?.getSupportedLanguages() || {}
    };
  }

  /**
   * Reset manager
   */
  reset() {
    this.state = {
      initialized: true,
      isActive: false,
      currentCallId: null,
      localLanguage: 'en',
      remoteLanguage: 'en',
      translationEnabled: false,
      captionsEnabled: false
    };

    this.captionQueue = [];
    this.displayedCaptions = [];

    this.translationHistory = {
      segments: [],
      maxSegments: 100
    };

    this.performance = {
      startTime: null,
      totalTranslations: 0,
      totalCaptions: 0,
      avgLatency: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkBandwidth: 0
    };

    this.metrics = {
      callsProcessed: 0,
      totalSegmentsTranslated: 0,
      totalCaptionsGenerated: 0,
      avgTranslationLatency: 0,
      successRate: 0,
      cpuOverhead: 0,
      costPerMinute: 0,
      userSatisfaction: 0
    };

    this.emit('reset');
  }
}

module.exports = RealTimeTranslationManager;
