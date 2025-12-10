// AI Assistant Service
// Intelligent voice-controlled assistant with natural language processing

interface VoiceCommand {
  commandId: string;
  transcript: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  timestamp: number;
  language: string;
  audioData?: ArrayBuffer;
}

interface AIContext {
  userId?: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
  userPreferences: UserPreferences;
  currentActivity: CurrentActivity;
  environmentContext: EnvironmentContext;
  learningProfile: LearningProfile;
}

interface ConversationMessage {
  messageId: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  intent?: string;
  entities?: Record<string, any>;
}

interface UserPreferences {
  language: string;
  voiceGender: 'male' | 'female' | 'neutral';
  speakingRate: number; // 0.5 - 2.0
  voiceVolume: number; // 0 - 1
  assistanceLevel: 'minimal' | 'moderate' | 'comprehensive';
  privacyMode: boolean;
  learningEnabled: boolean;
  shortcuts: Record<string, string>;
}

interface CurrentActivity {
  activityType: 'call' | 'meeting' | 'presentation' | 'recording' | 'settings' | 'idle';
  participants: string[];
  duration: number;
  startTime: number;
  context: Record<string, any>;
}

interface EnvironmentContext {
  noiseLevel: 'quiet' | 'normal' | 'noisy';
  ambientLight: 'dark' | 'dim' | 'normal' | 'bright';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  batteryLevel: number;
  locationPermission: boolean;
  cameraPermission: boolean;
  microphonePermission: boolean;
}

interface LearningProfile {
  commandPatterns: Record<string, number>;
  preferredCommands: string[];
  responseTimes: number[];
  errorPatterns: Record<string, number>;
  adaptationLevel: number; // 0-100
  lastUpdated: number;
}

interface AIResponse {
  responseId: string;
  content: string;
  audioData?: ArrayBuffer;
  actions: AIAction[];
  confidence: number;
  followUpQuestions?: string[];
  suggestions?: string[];
  timestamp: number;
}

interface AIAction {
  actionId: string;
  type: 'system' | 'ui' | 'communication' | 'settings' | 'help';
  command: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  autoExecute: boolean;
  confirmationRequired: boolean;
}

interface AIConfig {
  voiceRecognition: {
    engine: 'webkit' | 'azure' | 'google' | 'aws';
    language: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    confidenceThreshold: number;
  };
  naturalLanguage: {
    engine: 'openai' | 'google' | 'azure' | 'local';
    model: string;
    temperature: number;
    maxTokens: number;
    contextWindow: number;
  };
  voiceSynthesis: {
    engine: 'webkit' | 'azure' | 'google' | 'aws';
    voice: string;
    language: string;
    speakingRate: number;
    pitch: number;
    volume: number;
  };
  learning: {
    enabled: boolean;
    adaptationRate: number;
    retentionPeriod: number; // days
    privacyLevel: 'strict' | 'balanced' | 'permissive';
  };
  privacy: {
    dataRetention: number; // days
    anonymization: boolean;
    encryption: boolean;
    gdprCompliant: boolean;
  };
}

class AIAssistantService extends EventTarget {
  private context: AIContext;
  private config: AIConfig;
  private voiceRecognition: SpeechRecognition | null = null;
  private voiceSynthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private commandHistory: VoiceCommand[] = [];
  private learningData: Map<string, any> = new Map();
  private adaptationEngine: AdaptationEngine;
  
  // Audio processing
  private audioContext: AudioContext;
  private mediaRecorder: MediaRecorder | null = null;
  private audioBuffer: ArrayBuffer[] = [];
  
  // Natural language processing
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private responseGenerator: ResponseGenerator;
  
  private readonly maxCommandHistory = 1000;
  private readonly maxConversationHistory = 50;

  constructor(config?: Partial<AIConfig>) {
    super();
    this.config = this.initializeConfig(config);
    this.context = this.initializeContext();
    this.audioContext = new AudioContext();
    this.voiceSynthesis = window.speechSynthesis;
    this.adaptationEngine = new AdaptationEngine();
    
    this.initializeNLP();
    this.initializeVoiceRecognition();
    this.initializeVoiceSynthesis();
    this.startContextMonitoring();
  }

  // Initialize AI configuration
  private initializeConfig(userConfig?: Partial<AIConfig>): AIConfig {
    const defaultConfig: AIConfig = {
      voiceRecognition: {
        engine: 'webkit',
        language: 'ja-JP',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        confidenceThreshold: 0.7
      },
      naturalLanguage: {
        engine: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 150,
        contextWindow: 4096
      },
      voiceSynthesis: {
        engine: 'webkit',
        voice: 'default',
        language: 'ja-JP',
        speakingRate: 1.0,
        pitch: 1.0,
        volume: 0.8
      },
      learning: {
        enabled: true,
        adaptationRate: 0.1,
        retentionPeriod: 90,
        privacyLevel: 'balanced'
      },
      privacy: {
        dataRetention: 30,
        anonymization: true,
        encryption: true,
        gdprCompliant: true
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  // Initialize AI context
  private initializeContext(): AIContext {
    return {
      sessionId: this.generateSessionId(),
      conversationHistory: [],
      userPreferences: {
        language: 'ja-JP',
        voiceGender: 'neutral',
        speakingRate: 1.0,
        voiceVolume: 0.8,
        assistanceLevel: 'moderate',
        privacyMode: false,
        learningEnabled: true,
        shortcuts: {}
      },
      currentActivity: {
        activityType: 'idle',
        participants: [],
        duration: 0,
        startTime: Date.now(),
        context: {}
      },
      environmentContext: {
        noiseLevel: 'normal',
        ambientLight: 'normal',
        deviceType: this.detectDeviceType(),
        networkQuality: 'good',
        batteryLevel: 100,
        locationPermission: false,
        cameraPermission: false,
        microphonePermission: false
      },
      learningProfile: {
        commandPatterns: {},
        preferredCommands: [],
        responseTimes: [],
        errorPatterns: {},
        adaptationLevel: 0,
        lastUpdated: Date.now()
      }
    };
  }

  // Initialize NLP components
  private initializeNLP(): void {
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.responseGenerator = new ResponseGenerator();
  }

  // Initialize voice recognition
  private initializeVoiceRecognition(): void {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.voiceRecognition = new SpeechRecognition();

    this.voiceRecognition.continuous = this.config.voiceRecognition.continuous;
    this.voiceRecognition.interimResults = this.config.voiceRecognition.interimResults;
    this.voiceRecognition.maxAlternatives = this.config.voiceRecognition.maxAlternatives;
    this.voiceRecognition.lang = this.config.voiceRecognition.language;

    this.voiceRecognition.onstart = () => {
      this.isListening = true;
      this.dispatchEvent(new CustomEvent('listeningStarted', {
        detail: { timestamp: Date.now() }
      }));
    };

    this.voiceRecognition.onend = () => {
      this.isListening = false;
      this.dispatchEvent(new CustomEvent('listeningStopped', {
        detail: { timestamp: Date.now() }
      }));
    };

    this.voiceRecognition.onresult = (event) => {
      this.handleSpeechResult(event);
    };

    this.voiceRecognition.onerror = (event) => {
      this.handleSpeechError(event);
    };
  }

  // Initialize voice synthesis
  private initializeVoiceSynthesis(): void {
    // Load available voices
    const loadVoices = () => {
      const voices = this.voiceSynthesis.getVoices();
      const japaneseVoice = voices.find(voice => 
        voice.lang.includes('ja') || voice.lang.includes('JP')
      );
      
      if (japaneseVoice) {
        this.config.voiceSynthesis.voice = japaneseVoice.name;
      }
    };

    if (this.voiceSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      this.voiceSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Start voice listening
  public startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.voiceRecognition) {
        reject(new Error('Voice recognition not available'));
        return;
      }

      if (this.isListening) {
        resolve();
        return;
      }

      // Request microphone permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.voiceRecognition!.start();
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // Stop voice listening
  public stopListening(): void {
    if (this.voiceRecognition && this.isListening) {
      this.voiceRecognition.stop();
    }
  }

  // Handle speech recognition result
  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const lastResult = event.results[event.results.length - 1];
    
    if (lastResult.isFinal) {
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence;
      
      if (confidence >= this.config.voiceRecognition.confidenceThreshold) {
        this.processVoiceCommand(transcript, confidence);
      }
    }
  }

  // Handle speech recognition error
  private handleSpeechError(event: SpeechRecognitionErrorEvent): void {
    console.error('Speech recognition error:', event.error);
    
    this.dispatchEvent(new CustomEvent('recognitionError', {
      detail: { error: event.error, timestamp: Date.now() }
    }));
  }

  // Process voice command
  private async processVoiceCommand(transcript: string, confidence: number): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const startTime = performance.now();
      
      // Classify intent
      const intent = await this.intentClassifier.classify(transcript);
      
      // Extract entities
      const entities = await this.entityExtractor.extract(transcript);
      
      // Create voice command
      const command: VoiceCommand = {
        commandId: this.generateCommandId(),
        transcript,
        intent,
        entities,
        confidence,
        timestamp: Date.now(),
        language: this.config.voiceRecognition.language
      };
      
      // Add to history
      this.addToCommandHistory(command);
      
      // Add to conversation
      this.addToConversation('user', transcript, intent, entities);
      
      // Generate response
      const response = await this.generateAIResponse(command);
      
      // Execute actions
      await this.executeActions(response.actions);
      
      // Speak response
      if (response.content && !this.context.userPreferences.privacyMode) {
        await this.speakResponse(response.content);
      }
      
      // Update learning profile
      if (this.config.learning.enabled) {
        this.updateLearningProfile(command, response);
      }
      
      const endTime = performance.now();
      this.context.learningProfile.responseTimes.push(endTime - startTime);
      
      // Dispatch event
      this.dispatchEvent(new CustomEvent('commandProcessed', {
        detail: { command, response, processingTime: endTime - startTime }
      }));
      
    } catch (error) {
      console.error('Command processing failed:', error);
      
      this.dispatchEvent(new CustomEvent('commandError', {
        detail: { error: error.message, timestamp: Date.now() }
      }));
    } finally {
      this.isProcessing = false;
    }
  }

  // Generate AI response
  private async generateAIResponse(command: VoiceCommand): Promise<AIResponse> {
    const startTime = performance.now();
    
    try {
      // Build context for response generation
      const context = this.buildResponseContext(command);
      
      // Generate response using AI
      const responseContent = await this.responseGenerator.generate(
        command.transcript,
        command.intent,
        command.entities,
        context
      );
      
      // Generate actions based on intent
      const actions = await this.generateActions(command);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(command);
      
      const endTime = performance.now();
      
      return {
        responseId: this.generateResponseId(),
        content: responseContent,
        actions,
        confidence: command.confidence,
        suggestions,
        timestamp: Date.now()
      };
      
    } catch (error) {
      // Fallback response
      return {
        responseId: this.generateResponseId(),
        content: this.getFallbackResponse(command.intent),
        actions: [],
        confidence: 0.5,
        timestamp: Date.now()
      };
    }
  }

  // Build response context
  private buildResponseContext(command: VoiceCommand): any {
    return {
      conversation: this.context.conversationHistory.slice(-5),
      activity: this.context.currentActivity,
      environment: this.context.environmentContext,
      preferences: this.context.userPreferences,
      learning: this.context.learningProfile
    };
  }

  // Generate actions based on command
  private async generateActions(command: VoiceCommand): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    
    switch (command.intent) {
      case 'start_call':
        actions.push({
          actionId: this.generateActionId(),
          type: 'communication',
          command: 'startCall',
          parameters: {
            target: command.entities.contact || '',
            video: command.entities.video !== false
          },
          priority: 'high',
          autoExecute: true,
          confirmationRequired: false
        });
        break;
        
      case 'end_call':
        actions.push({
          actionId: this.generateActionId(),
          type: 'communication',
          command: 'endCall',
          parameters: {},
          priority: 'urgent',
          autoExecute: true,
          confirmationRequired: false
        });
        break;
        
      case 'start_recording':
        actions.push({
          actionId: this.generateActionId(),
          type: 'communication',
          command: 'startRecording',
          parameters: {
            quality: command.entities.quality || 'high'
          },
          priority: 'medium',
          autoExecute: true,
          confirmationRequired: false
        });
        break;
        
      case 'adjust_settings':
        actions.push({
          actionId: this.generateActionId(),
          type: 'settings',
          command: 'updateSettings',
          parameters: {
            setting: command.entities.setting,
            value: command.entities.value
          },
          priority: 'medium',
          autoExecute: true,
          confirmationRequired: true
        });
        break;
        
      case 'get_help':
        actions.push({
          actionId: this.generateActionId(),
          type: 'help',
          command: 'showHelp',
          parameters: {
            topic: command.entities.topic || 'general'
          },
          priority: 'low',
          autoExecute: true,
          confirmationRequired: false
        });
        break;
    }
    
    return actions;
  }

  // Generate suggestions
  private async generateSuggestions(command: VoiceCommand): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Based on intent and context
    if (command.intent === 'start_call' && !command.entities.contact) {
      suggestions.push('誰に発信しますか？連絡先を教えてください');
    }
    
    if (command.intent === 'adjust_settings') {
      suggestions.push('音量、画質、録音設定などを調整できます');
    }
    
    // Based on learning profile
    if (this.context.learningProfile.preferredCommands.length > 0) {
      const frequentCommands = this.context.learningProfile.preferredCommands.slice(0, 3);
      suggestions.push(...frequentCommands.map(cmd => `${cmd}も試してみませんか？`));
    }
    
    return suggestions;
  }

  // Execute actions
  private async executeActions(actions: AIAction[]): Promise<void> {
    for (const action of actions) {
      try {
        if (action.autoExecute && !action.confirmationRequired) {
          await this.executeAction(action);
        } else if (action.confirmationRequired) {
          this.dispatchEvent(new CustomEvent('actionConfirmation', {
            detail: { action, timestamp: Date.now() }
          }));
        }
      } catch (error) {
        console.error('Action execution failed:', error);
      }
    }
  }

  // Execute single action
  private async executeAction(action: AIAction): Promise<void> {
    switch (action.command) {
      case 'startCall':
        await this.executeStartCall(action.parameters);
        break;
      case 'endCall':
        await this.executeEndCall();
        break;
      case 'startRecording':
        await this.executeStartRecording(action.parameters);
        break;
      case 'updateSettings':
        await this.executeUpdateSettings(action.parameters);
        break;
      case 'showHelp':
        await this.executeShowHelp(action.parameters);
        break;
    }
    
    this.dispatchEvent(new CustomEvent('actionExecuted', {
      detail: { action, timestamp: Date.now() }
    }));
  }

  // Execute start call action
  private async executeStartCall(parameters: any): Promise<void> {
    this.dispatchEvent(new CustomEvent('startCall', {
      detail: { target: parameters.target, video: parameters.video }
    }));
  }

  // Execute end call action
  private async executeEndCall(): Promise<void> {
    this.dispatchEvent(new CustomEvent('endCall', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Execute start recording action
  private async executeStartRecording(parameters: any): Promise<void> {
    this.dispatchEvent(new CustomEvent('startRecording', {
      detail: { quality: parameters.quality }
    }));
  }

  // Execute update settings action
  private async executeUpdateSettings(parameters: any): Promise<void> {
    this.dispatchEvent(new CustomEvent('updateSettings', {
      detail: { setting: parameters.setting, value: parameters.value }
    }));
  }

  // Execute show help action
  private async executeShowHelp(parameters: any): Promise<void> {
    this.dispatchEvent(new CustomEvent('showHelp', {
      detail: { topic: parameters.topic }
    }));
  }

  // Speak response
  private async speakResponse(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.voiceSynthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice
      const voices = this.voiceSynthesis.getVoices();
      const voice = voices.find(v => v.name === this.config.voiceSynthesis.voice);
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.lang = this.config.voiceSynthesis.language;
      utterance.rate = this.config.voiceSynthesis.speakingRate;
      utterance.pitch = this.config.voiceSynthesis.pitch;
      utterance.volume = this.config.voiceSynthesis.volume;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      this.voiceSynthesis.speak(utterance);
    });
  }

  // Get fallback response
  private getFallbackResponse(intent: string): string {
    const fallbackResponses: Record<string, string> = {
      'start_call': '発信を開始します。連絡先を教えてください。',
      'end_call': '通話を終了します。',
      'start_recording': '録音を開始します。',
      'adjust_settings': '設定を調整します。',
      'get_help': 'どのようなお手伝いをしましょうか？',
      'unknown': 'すみません、よくわかりませんでした。もう一度お願いします。'
    };
    
    return fallbackResponses[intent] || fallbackResponses['unknown'];
  }

  // Add to command history
  private addToCommandHistory(command: VoiceCommand): void {
    this.commandHistory.push(command);
    
    if (this.commandHistory.length > this.maxCommandHistory) {
      this.commandHistory = this.commandHistory.slice(-this.maxCommandHistory);
    }
  }

  // Add to conversation
  private addToConversation(
    type: 'user' | 'assistant' | 'system',
    content: string,
    intent?: string,
    entities?: Record<string, any>
  ): void {
    const message: ConversationMessage = {
      messageId: this.generateMessageId(),
      type,
      content,
      timestamp: Date.now(),
      intent,
      entities
    };
    
    this.context.conversationHistory.push(message);
    
    if (this.context.conversationHistory.length > this.maxConversationHistory) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-this.maxConversationHistory);
    }
  }

  // Update learning profile
  private updateLearningProfile(command: VoiceCommand, response: AIResponse): void {
    const profile = this.context.learningProfile;
    
    // Update command patterns
    profile.commandPatterns[command.intent] = (profile.commandPatterns[command.intent] || 0) + 1;
    
    // Update preferred commands
    if (!profile.preferredCommands.includes(command.intent)) {
      profile.preferredCommands.push(command.intent);
      profile.preferredCommands.sort((a, b) => 
        (profile.commandPatterns[b] || 0) - (profile.commandPatterns[a] || 0)
      );
      profile.preferredCommands = profile.preferredCommands.slice(0, 10);
    }
    
    // Update adaptation level
    profile.adaptationLevel = Math.min(100, profile.adaptationLevel + this.config.learning.adaptationRate * 10);
    
    profile.lastUpdated = Date.now();
    
    // Trigger adaptation
    this.adaptationEngine.adapt(profile);
  }

  // Start context monitoring
  private startContextMonitoring(): void {
    setInterval(() => {
      this.updateEnvironmentContext();
      this.updateCurrentActivity();
    }, 5000); // Every 5 seconds
  }

  // Update environment context
  private updateEnvironmentContext(): void {
    const context = this.context.environmentContext;
    
    // Update battery level
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        context.batteryLevel = battery.level * 100;
      });
    }
    
    // Update network quality
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const downlink = connection.downlink || 10;
      if (downlink >= 10) context.networkQuality = 'excellent';
      else if (downlink >= 5) context.networkQuality = 'good';
      else if (downlink >= 2) context.networkQuality = 'fair';
      else context.networkQuality = 'poor';
    }
    
    // Update permissions
    this.updatePermissions();
  }

  // Update permissions
  private async updatePermissions(): Promise<void> {
    const context = this.context.environmentContext;
    
    try {
      context.locationPermission = await navigator.permissions.query({ name: 'geolocation' })
        .then(result => result.state === 'granted');
      
      context.cameraPermission = await navigator.permissions.query({ name: 'camera' })
        .then(result => result.state === 'granted');
      
      context.microphonePermission = await navigator.permissions.query({ name: 'microphone' })
        .then(result => result.state === 'granted');
    } catch (error) {
      // Permissions API not supported
    }
  }

  // Update current activity
  private updateCurrentActivity(): void {
    const activity = this.context.currentActivity;
    
    // Update duration
    if (activity.startTime) {
      activity.duration = Date.now() - activity.startTime;
    }
    
    // Detect activity type based on context
    // This would integrate with other services to get actual activity
  }

  // Detect device type
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  // Generate IDs
  private generateSessionId(): string {
    return `ai-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResponseId(): string {
    return `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  public getContext(): AIContext {
    return { ...this.context };
  }

  public getConfig(): AIConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update voice recognition settings
    if (this.voiceRecognition) {
      this.voiceRecognition.lang = this.config.voiceRecognition.language;
      this.voiceRecognition.continuous = this.config.voiceRecognition.continuous;
      this.voiceRecognition.interimResults = this.config.voiceRecognition.interimResults;
    }
    
    this.dispatchEvent(new CustomEvent('configUpdated', {
      detail: { config: this.config }
    }));
  }

  public getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  public getLearningProfile(): LearningProfile {
    return { ...this.context.learningProfile };
  }

  public updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.context.userPreferences = { ...this.context.userPreferences, ...preferences };
    
    this.dispatchEvent(new CustomEvent('preferencesUpdated', {
      detail: { preferences: this.context.userPreferences }
    }));
  }

  public async confirmAction(actionId: string): Promise<void> {
    // Find action in recent responses
    const action = this.findRecentAction(actionId);
    if (action) {
      await this.executeAction(action);
    }
  }

  private findRecentAction(actionId: string): AIAction | null {
    // Search recent command history for the action
    for (const command of this.commandHistory.slice(-10).reverse()) {
      // This would need to store actions with commands
      // For now, return null
    }
    return null;
  }

  public isListeningActive(): boolean {
    return this.isListening;
  }

  public isProcessingActive(): boolean {
    return this.isProcessing;
  }

  public async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    checks: Record<string, boolean>;
    context: AIContext;
  }> {
    const checks = {
      voiceRecognition: this.voiceRecognition !== null,
      voiceSynthesis: this.voiceSynthesis !== null,
      audioContext: this.audioContext.state === 'running',
      nlpServices: true, // Would check actual NLP services
      learning: this.config.learning.enabled
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (passedChecks === totalChecks) {
      status = 'healthy';
    } else if (passedChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      checks,
      context: this.context
    };
  }

  public stop(): void {
    // Stop voice recognition
    if (this.voiceRecognition && this.isListening) {
      this.voiceRecognition.stop();
    }
    
    // Stop voice synthesis
    if (this.voiceSynthesis) {
      this.voiceSynthesis.cancel();
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clean up
    this.isListening = false;
    this.isProcessing = false;
    this.commandHistory = [];
    this.learningData.clear();
    
    this.dispatchEvent(new CustomEvent('assistantStopped', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Supporting classes
class IntentClassifier {
  private intents: Record<string, string[]> = {
    'start_call': ['発信して', '電話して', 'コールして', '通話して'],
    'end_call': ['終了して', '切って', '終わらせて', '切断して'],
    'start_recording': ['録画して', '録音して', 'レコーディングして'],
    'adjust_settings': ['設定して', '調整して', '変更して'],
    'get_help': ['助けて', '教えて', 'ヘルプ', '使い方']
  };

  async classify(transcript: string): Promise<string> {
    const normalizedTranscript = transcript.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (normalizedTranscript.includes(keyword)) {
          return intent;
        }
      }
    }
    
    return 'unknown';
  }
}

class EntityExtractor {
  async extract(transcript: string): Promise<Record<string, any>> {
    const entities: Record<string, any> = {};
    
    // Extract contact names
    const contactPattern = /(.+)に|(.+)と/;
    const contactMatch = transcript.match(contactPattern);
    if (contactMatch) {
      entities.contact = contactMatch[1] || contactMatch[2];
    }
    
    // Extract quality preferences
    if (transcript.includes('高画質') || transcript.includes('高品質')) {
      entities.quality = 'high';
    } else if (transcript.includes('低画質') || transcript.includes('低品質')) {
      entities.quality = 'low';
    }
    
    // Extract video preference
    entities.video = !transcript.includes('音声のみ');
    
    return entities;
  }
}

class ResponseGenerator {
  async generate(
    transcript: string,
    intent: string,
    entities: Record<string, any>,
    context: any
  ): Promise<string> {
    const responses: Record<string, string> = {
      'start_call': `${entities.contact || '指定された相手'}に発信します。`,
      'end_call': '通話を終了します。',
      'start_recording': '録画を開始します。',
      'adjust_settings': `${entities.setting || '設定'}を${entities.value || '変更'}します。`,
      'get_help': 'どのようなお手伝いをしましょうか？',
      'unknown': 'すみません、よくわかりませんでした。もう一度お願いします。'
    };
    
    return responses[intent] || responses['unknown'];
  }
}

class AdaptationEngine {
  adapt(profile: LearningProfile): void {
    // Implement learning adaptation logic
    console.log('Adapting to user patterns:', profile);
  }
}

export { 
  AIAssistantService, 
  VoiceCommand, 
  AIContext, 
  AIResponse, 
  AIAction, 
  AIConfig,
  UserPreferences,
  LearningProfile
};
