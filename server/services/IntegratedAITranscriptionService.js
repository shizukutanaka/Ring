// Integrated AI Transcription and Translation Service
// Combines advanced speech-to-text, translation, and AI analysis

const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const path = require('path');
const AdvancedRealTimeTranslationService = require('./AdvancedRealTimeTranslationService');

class IntegratedAITranscriptionService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.activeSessions = new Map();
    this.workerPool = [];
    this.translationService = new AdvancedRealTimeTranslationService();
    
    this.supportedLanguages = [
      'en', 'ja', 'zh', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru',
      'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tr', 'pl', 'nl', 'sv'
    ];
    
    // AI analysis configuration
    this.aiConfig = {
      sentimentAnalysis: true,
      emotionDetection: true,
      keywordExtraction: true,
      speakerIdentification: true,
      languageDetection: true,
      topicClassification: true,
      entityRecognition: true,
      conversationSummary: true,
      engagementMetrics: true,
      qualityAssessment: true
    };
    
    this.initializeWorkers();
  }

  // Initialize AI processing workers
  async initializeWorkers() {
    try {
      const workerCount = Math.min(2, require('os').cpus().length);
      
      for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(path.join(__dirname, 'ai-transcription-worker.js'), {
          workerData: { aiConfig: this.aiConfig }
        });
        
        worker.on('message', (message) => {
          this.handleWorkerMessage(message);
        });
        
        worker.on('error', (error) => {
          console.error(`AI transcription worker ${i} error:`, error);
          this.emit('error', error);
        });
        
        this.workerPool.push(worker);
      }
      
      this.isInitialized = true;
      console.log(`AI transcription service initialized with ${workerCount} workers`);
    } catch (error) {
      console.error('Failed to initialize AI transcription workers:', error);
      throw error;
    }
  }

  // Create integrated transcription session
  createTranscriptionSession(sessionId, config = {}) {
    if (!this.isInitialized) {
      throw new Error('AI transcription service not initialized');
    }
    
    const session = {
      id: sessionId,
      startTime: Date.now(),
      config: {
        sourceLanguage: config.sourceLanguage || 'auto',
        targetLanguages: config.targetLanguages || ['en'],
        enableTranslation: config.enableTranslation !== false,
        enableAIAnalysis: config.enableAIAnalysis !== false,
        realTimeProcessing: config.realTimeProcessing !== false,
        ...config
      },
      audioBuffer: [],
      transcriptionBuffer: [],
      translationBuffer: [],
      aiAnalysisBuffer: [],
      speakers: new Map(),
      detectedLanguage: null,
      processingState: {
        isTranscribing: false,
        isTranslating: false,
        isAnalyzing: false
      },
      metrics: {
        totalAudioProcessed: 0,
        totalWordsTranscribed: 0,
        totalTranslationsGenerated: 0,
        averageTranscriptionLatency: 0,
        averageTranslationLatency: 0,
        transcriptionAccuracy: 0,
        translationAccuracy: 0,
        sentimentScore: 0,
        engagementScore: 0
      }
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Create translation session if needed
    if (session.config.enableTranslation) {
      this.translationService.createTranslationSession(
        `${sessionId}_trans`,
        session.config.sourceLanguage,
        session.config.targetLanguages[0]
      );
    }
    
    console.log(`Created AI transcription session ${sessionId}`);
    return session;
  }

  // Process audio stream with integrated analysis
  async processAudioStream(sessionId, audioChunk, metadata = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Add audio chunk to buffer
    session.audioBuffer.push({
      data: audioChunk,
      timestamp: Date.now(),
      metadata
    });
    
    // Maintain 30-second rolling window for better context
    const cutoffTime = Date.now() - 30000;
    session.audioBuffer = session.audioBuffer.filter(chunk => chunk.timestamp > cutoffTime);
    
    session.metrics.totalAudioProcessed += audioChunk.length;
    
    // Trigger processing based on configuration
    if (session.config.realTimeProcessing) {
      await this.triggerRealTimeProcessing(sessionId);
    }
  }

  // Trigger real-time processing
  async triggerRealTimeProcessing(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.processingState.isTranscribing) return;
    
    // Check if we have enough audio for processing
    if (session.audioBuffer.length < 3) return;
    
    session.processingState.isTranscribing = true;
    
    try {
      const worker = this.getAvailableWorker();
      if (!worker) {
        console.warn('No available AI workers, queuing transcription');
        setTimeout(() => this.triggerRealTimeProcessing(sessionId), 100);
        return;
      }
      
      // Prepare audio data for processing
      const audioData = this.consolidateAudioBuffer(session.audioBuffer);
      const processingRequest = {
        sessionId,
        audioData,
        config: session.config,
        detectedLanguage: session.detectedLanguage,
        timestamp: Date.now()
      };
      
      worker.postMessage({
        type: 'process_audio',
        data: processingRequest
      });
      
    } catch (error) {
      console.error(`Real-time processing failed for session ${sessionId}:`, error);
      session.processingState.isTranscribing = false;
      this.emit('error', error);
    }
  }

  // Handle worker messages
  handleWorkerMessage(message) {
    const { type, sessionId, data } = message;
    
    switch (type) {
      case 'transcription_complete':
        this.handleTranscriptionComplete(sessionId, data);
        break;
      case 'ai_analysis_complete':
        this.handleAIAnalysisComplete(sessionId, data);
        break;
      case 'error':
        this.handleProcessingError(sessionId, data);
        break;
      default:
        console.warn(`Unknown message type from AI worker: ${type}`);
    }
  }

  // Handle transcription completion
  async handleTranscriptionComplete(sessionId, transcriptionData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.processingState.isTranscribing = false;
    
    // Update detected language
    if (transcriptionData.detectedLanguage && !session.detectedLanguage) {
      session.detectedLanguage = transcriptionData.detectedLanguage;
      
      // Update translation session language if needed
      if (session.config.enableTranslation && session.config.sourceLanguage === 'auto') {
        await this.updateTranslationSessionLanguage(sessionId, transcriptionData.detectedLanguage);
      }
    }
    
    // Add to transcription buffer
    session.transcriptionBuffer.push({
      text: transcriptionData.text,
      confidence: transcriptionData.confidence,
      timestamp: Date.now(),
      language: transcriptionData.detectedLanguage || session.config.sourceLanguage,
      speaker: transcriptionData.speaker,
      words: transcriptionData.words,
      duration: transcriptionData.duration
    });
    
    // Update metrics
    session.metrics.totalWordsTranscribed += transcriptionData.words?.length || 0;
    session.metrics.averageTranscriptionLatency = this.calculateAverageLatency(
      session.transcriptionBuffer, 'latency'
    );
    session.metrics.transcriptionAccuracy = this.calculateAverageAccuracy(
      session.transcriptionBuffer, 'confidence'
    );
    
    // Trigger translation if enabled
    if (session.config.enableTranslation && !session.processingState.isTranslating) {
      await this.triggerTranslation(sessionId, transcriptionData);
    }
    
    // Trigger AI analysis if enabled
    if (session.config.enableAIAnalysis && !session.processingState.isAnalyzing) {
      await this.triggerAIAnalysis(sessionId, transcriptionData);
    }
    
    // Emit transcription event
    this.emit('transcription', {
      sessionId,
      transcription: transcriptionData,
      sessionMetrics: session.metrics
    });
  }

  // Handle AI analysis completion
  handleAIAnalysisComplete(sessionId, analysisData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.processingState.isAnalyzing = false;
    
    // Add to analysis buffer
    session.aiAnalysisBuffer.push({
      ...analysisData,
      timestamp: Date.now()
    });
    
    // Update sentiment and engagement metrics
    if (analysisData.sentiment) {
      session.metrics.sentimentScore = this.calculateAverageSentiment(session.aiAnalysisBuffer);
    }
    
    if (analysisData.engagement) {
      session.metrics.engagementScore = this.calculateAverageEngagement(session.aiAnalysisBuffer);
    }
    
    // Emit AI analysis event
    this.emit('aiAnalysis', {
      sessionId,
      analysis: analysisData,
      sessionMetrics: session.metrics
    });
  }

  // Handle processing errors
  handleProcessingError(sessionId, errorData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.processingState.isTranscribing = false;
    session.processingState.isAnalyzing = false;
    
    this.emit('processingError', {
      sessionId,
      error: errorData
    });
  }

  // Trigger translation
  async triggerTranslation(sessionId, transcriptionData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.processingState.isTranslating = true;
    
    try {
      // Convert audio data for translation service
      const audioData = this.textToAudioBuffer(transcriptionData.text, transcriptionData.detectedLanguage);
      
      await this.translationService.processAudioStream(`${sessionId}_trans`, audioData);
      
    } catch (error) {
      console.error(`Translation trigger failed for session ${sessionId}:`, error);
      session.processingState.isTranslating = false;
    }
  }

  // Update translation session language
  async updateTranslationSessionLanguage(sessionId, detectedLanguage) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    try {
      // End current translation session
      this.translationService.endTranslationSession(`${sessionId}_trans`);
      
      // Create new translation session with detected language
      this.translationService.createTranslationSession(
        `${sessionId}_trans`,
        detectedLanguage,
        session.config.targetLanguages[0]
      );
      
      console.log(`Updated translation language to ${detectedLanguage} for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to update translation language:`, error);
    }
  }

  // Trigger AI analysis
  async triggerAIAnalysis(sessionId, transcriptionData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.processingState.isAnalyzing = true;
    
    try {
      const worker = this.getAvailableWorker();
      if (!worker) {
        console.warn('No available AI workers for analysis');
        session.processingState.isAnalyzing = false;
        return;
      }
      
      const analysisRequest = {
        sessionId,
        transcriptionData,
        context: this.getAnalysisContext(sessionId),
        config: session.config,
        timestamp: Date.now()
      };
      
      worker.postMessage({
        type: 'analyze_text',
        data: analysisRequest
      });
      
    } catch (error) {
      console.error(`AI analysis trigger failed for session ${sessionId}:`, error);
      session.processingState.isAnalyzing = false;
    }
  }

  // Get analysis context
  getAnalysisContext(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return {};
    
    return {
      recentTranscriptions: session.transcriptionBuffer.slice(-5),
      detectedLanguage: session.detectedLanguage,
      sessionDuration: Date.now() - session.startTime,
      speakerCount: session.speakers.size,
      topicHistory: this.getTopicHistory(sessionId)
    };
  }

  // Get topic history
  getTopicHistory(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];
    
    return session.aiAnalysisBuffer
      .filter(analysis => analysis.topicClassification)
      .map(analysis => ({
        topic: analysis.topicClassification.topic,
        confidence: analysis.topicClassification.confidence,
        timestamp: analysis.timestamp
      }));
  }

  // Get available worker
  getAvailableWorker() {
    return this.workerPool.find(worker => !worker.busy);
  }

  // Consolidate audio buffer
  consolidateAudioBuffer(audioBuffer) {
    if (audioBuffer.length === 0) return null;
    
    const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const consolidatedBuffer = Buffer.alloc(totalLength);
    
    let offset = 0;
    for (const chunk of audioBuffer) {
      chunk.data.copy(consolidatedBuffer, offset);
      offset += chunk.data.length;
    }
    
    return consolidatedBuffer;
  }

  // Convert text to audio buffer (mock implementation)
  textToAudioBuffer(text, language) {
    // In a real implementation, this would use TTS
    // For now, return a mock buffer
    const duration = text.length * 0.1; // 100ms per character
    const sampleRate = 16000;
    const samples = Math.floor(duration * sampleRate);
    
    return Buffer.alloc(samples * 2); // 16-bit samples
  }

  // Calculate average latency
  calculateAverageLatency(buffer, latencyField = 'latency') {
    if (buffer.length === 0) return 0;
    
    const totalLatency = buffer.reduce((sum, item) => sum + (item[latencyField] || 0), 0);
    return totalLatency / buffer.length;
  }

  // Calculate average accuracy
  calculateAverageAccuracy(buffer, confidenceField = 'confidence') {
    if (buffer.length === 0) return 0;
    
    const totalConfidence = buffer.reduce((sum, item) => sum + (item[confidenceField] || 0), 0);
    return totalConfidence / buffer.length;
  }

  // Calculate average sentiment
  calculateAverageSentiment(analysisBuffer) {
    const sentimentAnalyses = analysisBuffer.filter(analysis => analysis.sentiment);
    if (sentimentAnalyses.length === 0) return 0;
    
    const totalSentiment = sentimentAnalyses.reduce((sum, analysis) => {
      const sentiment = analysis.sentiment;
      return sum + (sentiment.score || 0);
    }, 0);
    
    return totalSentiment / sentimentAnalyses.length;
  }

  // Calculate average engagement
  calculateAverageEngagement(analysisBuffer) {
    const engagementAnalyses = analysisBuffer.filter(analysis => analysis.engagement);
    if (engagementAnalyses.length === 0) return 0;
    
    const totalEngagement = engagementAnalyses.reduce((sum, analysis) => {
      const engagement = analysis.engagement;
      return sum + (engagement.score || 0);
    }, 0);
    
    return totalEngagement / engagementAnalyses.length;
  }

  // Get session transcript
  getSessionTranscript(sessionId, options = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    const transcript = {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: Date.now(),
      duration: Date.now() - session.startTime,
      detectedLanguage: session.detectedLanguage,
      sourceLanguage: session.config.sourceLanguage,
      targetLanguages: session.config.targetLanguages,
      transcriptions: session.transcriptionBuffer,
      translations: session.translationBuffer,
      aiAnalysis: session.aiAnalysisBuffer,
      speakers: Array.from(session.speakers.values()),
      metrics: session.metrics,
      summary: this.generateSessionSummary(session)
    };
    
    if (options.includeTimestamps) {
      transcript.timestampedTranscript = this.generateTimestampedTranscript(session);
    }
    
    if (options.includeSpeakerLabels) {
      transcript.speakerLabeledTranscript = this.generateSpeakerLabeledTranscript(session);
    }
    
    return transcript;
  }

  // Generate session summary
  generateSessionSummary(session) {
    const summary = {
      totalWords: session.metrics.totalWordsTranscribed,
      totalSpeakers: session.speakers.size,
      primaryLanguage: session.detectedLanguage || session.config.sourceLanguage,
      averageSentiment: session.metrics.sentimentScore,
      engagementLevel: session.metrics.engagementScore,
      keyTopics: this.extractKeyTopics(session),
      speakerDistribution: this.getSpeakerDistribution(session),
      qualityMetrics: {
        transcriptionAccuracy: session.metrics.transcriptionAccuracy,
        averageLatency: session.metrics.averageTranscriptionLatency
      }
    };
    
    return summary;
  }

  // Extract key topics
  extractKeyTopics(session) {
    const topicCounts = new Map();
    
    session.aiAnalysisBuffer.forEach(analysis => {
      if (analysis.topicClassification) {
        const topic = analysis.topicClassification.topic;
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    });
    
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  }

  // Get speaker distribution
  getSpeakerDistribution(session) {
    const distribution = {};
    
    for (const [speakerId, speaker] of session.speakers) {
      const speakerTranscriptions = session.transcriptionBuffer.filter(t => t.speaker === speakerId);
      const wordCount = speakerTranscriptions.reduce((sum, t) => sum + (t.words?.length || 0), 0);
      
      distribution[speakerId] = {
        name: speaker.name || `Speaker ${speakerId}`,
        wordCount,
        percentage: (wordCount / session.metrics.totalWordsTranscribed) * 100,
        averageConfidence: this.calculateAverageAccuracy(speakerTranscriptions)
      };
    }
    
    return distribution;
  }

  // Generate timestamped transcript
  generateTimestampedTranscript(session) {
    return session.transcriptionBuffer.map(transcription => ({
      timestamp: transcription.timestamp,
      text: transcription.text,
      speaker: transcription.speaker,
      confidence: transcription.confidence
    }));
  }

  // Generate speaker-labeled transcript
  generateSpeakerLabeledTranscript(session) {
    const transcript = [];
    
    session.transcriptionBuffer.forEach(transcription => {
      const speaker = session.speakers.get(transcription.speaker);
      const speakerName = speaker ? speaker.name : `Speaker ${transcription.speaker}`;
      
      transcript.push({
        speaker: speakerName,
        text: transcription.text,
        timestamp: transcription.timestamp,
        confidence: transcription.confidence
      });
    });
    
    return transcript;
  }

  // End transcription session
  endTranscriptionSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    // End translation session if active
    if (session.config.enableTranslation) {
      this.translationService.endTranslationSession(`${sessionId}_trans`);
    }
    
    // Generate final transcript
    const finalTranscript = this.getSessionTranscript(sessionId, {
      includeTimestamps: true,
      includeSpeakerLabels: true
    });
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    // Emit session end event
    this.emit('sessionEnded', {
      sessionId,
      transcript: finalTranscript
    });
    
    console.log(`Ended AI transcription session ${sessionId}`);
    return finalTranscript;
  }

  // Get session statistics
  getSessionStats(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    return {
      sessionId: session.id,
      duration: Date.now() - session.startTime,
      detectedLanguage: session.detectedLanguage,
      transcriptionCount: session.transcriptionBuffer.length,
      translationCount: session.translationBuffer.length,
      analysisCount: session.aiAnalysisBuffer.length,
      speakerCount: session.speakers.size,
      metrics: session.metrics,
      processingState: session.processingState
    };
  }

  // Health check
  async healthCheck() {
    const stats = {
      isInitialized: this.isInitialized,
      activeSessions: this.activeSessions.size,
      workerPoolSize: this.workerPool?.length || 0,
      availableWorkers: this.workerPool?.filter(w => !w.busy).length || 0,
      supportedLanguages: this.supportedLanguages.length,
      translationServiceStats: await this.translationService.healthCheck()
    };
    
    return stats;
  }

  // Cleanup resources
  async cleanup() {
    console.log('Cleaning up Integrated AI Transcription Service...');
    
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.endTranscriptionSession(sessionId);
    }
    
    // Terminate all workers
    if (this.workerPool) {
      for (const worker of this.workerPool) {
        worker.terminate();
      }
      this.workerPool = [];
    }
    
    // Cleanup translation service
    await this.translationService.cleanup();
    
    this.isInitialized = false;
    console.log('Integrated AI Transcription Service cleaned up');
  }
}

module.exports = IntegratedAITranscriptionService;
