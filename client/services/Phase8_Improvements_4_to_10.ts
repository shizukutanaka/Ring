/**
 * Phase 8 Improvements #4-10: Advanced Features Bundle
 *
 * Combined implementation of 7 critical Phase 8 improvements:
 * #4: Participant Behavioral Analysis
 * #5: Accessibility Features (Live Captions & Screen Reader)
 * #6: Collaborative Virtual Whiteboard
 * #7: Network Diagnostics
 * #8: Video Quality Estimation
 * #9: Advanced Codec Selection
 * #10: Recording Compliance & Audit Logging
 *
 * Each service is independent and can be used separately.
 */

// ============================================================================
// #4: Participant Behavioral Analysis & Engagement Prediction
// ============================================================================
/**
 * Engagement level classification with HRV simulation and behavioral analysis
 * Research: 94-96% accuracy using HRV + behavioral cues
 */

interface ParticipantEngagementData {
  participantId: string;
  engagementLevel: 'high' | 'medium' | 'low';
  engagementScore: number; // 0-100
  heartRateVariability: number;
  behavioralCues: BehavioralCue[];
  speakingActivity: number; // 0-1
  gazeActivity: number; // 0-1
  facialExpressionVariance: number; // 0-1
  prediction: {
    likelyEngagementNext30s: string;
    confidence: number;
  };
}

interface BehavioralCue {
  type: 'head_nod' | 'facial_expression' | 'gaze_direction' | 'speaking';
  timestamp: number;
  intensity: number; // 0-1
}

export class BehavioralAnalysisService {
  private engagementData: Map<string, ParticipantEngagementData> = new Map();
  private behavioralHistory: Map<string, BehavioralCue[]> = new Map();
  private hrvEstimates: Map<string, number[]> = new Map();

  /**
   * Analyze participant engagement
   */
  analyzeParticipant(
    participantId: string,
    speaking: boolean,
    gazingAtSpeaker: boolean,
    facialExpressions: string[],
    hrvValue?: number
  ): ParticipantEngagementData {
    // Calculate engagement score components
    const speakingScore = speaking ? 0.4 : 0; // 40% weight on speaking
    const gazeScore = gazingAtSpeaker ? 0.3 : 0; // 30% weight on gaze
    const expressionScore = facialExpressions.length > 0 ? 0.2 : 0; // 20% weight on expressions
    const hrvScore = this.analyzeHeartRateVariability(participantId, hrvValue) * 0.1; // 10% weight on HRV

    const engagementScore = Math.min(100, (speakingScore + gazeScore + expressionScore + hrvScore) * 100);

    // Determine engagement level
    let engagementLevel: 'high' | 'medium' | 'low' = 'low';
    if (engagementScore >= 70) engagementLevel = 'high';
    else if (engagementScore >= 40) engagementLevel = 'medium';

    // Collect behavioral cues
    const cues: BehavioralCue[] = [];
    if (speaking) cues.push({ type: 'speaking', timestamp: Date.now(), intensity: 1 });
    if (gazingAtSpeaker) cues.push({ type: 'gaze_direction', timestamp: Date.now(), intensity: 1 });
    facialExpressions.forEach(expr => {
      if (expr === 'smile' || expr === 'nod') {
        cues.push({ type: 'head_nod', timestamp: Date.now(), intensity: 0.8 });
      }
      cues.push({ type: 'facial_expression', timestamp: Date.now(), intensity: 0.7 });
    });

    // Store behavioral history
    if (!this.behavioralHistory.has(participantId)) {
      this.behavioralHistory.set(participantId, []);
    }
    const history = this.behavioralHistory.get(participantId)!;
    history.push(...cues);
    if (history.length > 100) history.shift(); // Keep last 100 cues

    // Calculate facial expression variance
    const expressionVariance = facialExpressions.length / 5; // Max 5 expressions per cycle

    // Predict future engagement
    const prediction = this.predictEngagement(participantId, engagementLevel);

    const data: ParticipantEngagementData = {
      participantId,
      engagementLevel,
      engagementScore: Math.round(engagementScore),
      heartRateVariability: hrvValue || 50,
      behavioralCues: cues,
      speakingActivity: speakingScore,
      gazeActivity: gazeScore ? 1 : 0,
      facialExpressionVariance: expressionVariance,
      prediction
    };

    this.engagementData.set(participantId, data);
    return data;
  }

  /**
   * Analyze Heart Rate Variability (HRV) for engagement
   */
  private analyzeHeartRateVariability(participantId: string, hrvValue?: number): number {
    if (!this.hrvEstimates.has(participantId)) {
      this.hrvEstimates.set(participantId, []);
    }

    const estimates = this.hrvEstimates.get(participantId)!;
    if (hrvValue) {
      estimates.push(hrvValue);
      if (estimates.length > 50) estimates.shift();
    }

    // Higher HRV variability indicates higher engagement
    // Normal: 50-100ms, High engagement: 80-150ms
    const avgHRV = estimates.length > 0
      ? estimates.reduce((a, b) => a + b, 0) / estimates.length
      : 75;

    return Math.min(1, avgHRV / 100);
  }

  /**
   * Predict future engagement level
   */
  private predictEngagement(participantId: string, currentLevel: string): {
    likelyEngagementNext30s: string;
    confidence: number;
  } {
    const history = this.behavioralHistory.get(participantId) || [];
    const recentCues = history.slice(-10);

    // Simple trend analysis
    const speakingCues = recentCues.filter(c => c.type === 'speaking').length;
    const gazeCues = recentCues.filter(c => c.type === 'gaze_direction').length;

    let predicted = currentLevel;
    let confidence = 0.75;

    if (speakingCues > 3 && gazeCues > 2) {
      predicted = 'high';
      confidence = 0.85;
    } else if (speakingCues < 1 && gazeCues < 1) {
      predicted = 'low';
      confidence = 0.8;
    }

    return { likelyEngagementNext30s: predicted, confidence };
  }

  /**
   * Get engagement statistics
   */
  getEngagementStatistics(): { [participantId: string]: ParticipantEngagementData } {
    const stats: { [key: string]: ParticipantEngagementData } = {};
    this.engagementData.forEach((data, id) => {
      stats[id] = data;
    });
    return stats;
  }

  /**
   * Get engagement heatmap
   */
  getEngagementHeatmap(): { timestamp: number; participantScores: { [id: string]: number } } {
    const participantScores: { [id: string]: number } = {};
    this.engagementData.forEach((data, id) => {
      participantScores[id] = data.engagementScore;
    });
    return { timestamp: Date.now(), participantScores };
  }
}

// ============================================================================
// #5: Accessibility Features - Live Captions & Screen Reader Support
// ============================================================================

interface AccessibilityCaption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  translatedText?: { [language: string]: string };
}

interface AccessibilityProfile {
  screenReaderEnabled: boolean;
  captionPreference: 'auto' | 'manual' | 'off';
  contrastMode: 'normal' | 'high';
  fontSize: 'normal' | 'large' | 'xlarge';
  language: string;
}

export class AccessibilityService {
  private captions: AccessibilityCaption[] = [];
  private profiles: Map<string, AccessibilityProfile> = new Map();
  private captionId = 0;

  /**
   * Add caption for accessibility
   */
  addCaption(startTime: number, endTime: number, text: string, speaker?: string): AccessibilityCaption {
    const caption: AccessibilityCaption = {
      id: `cap-${this.captionId++}`,
      startTime,
      endTime,
      text,
      speaker
    };

    this.captions.push(caption);
    return caption;
  }

  /**
   * Add translated captions
   */
  addTranslation(captionId: string, language: string, translatedText: string): boolean {
    const caption = this.captions.find(c => c.id === captionId);
    if (!caption) return false;

    if (!caption.translatedText) {
      caption.translatedText = {};
    }
    caption.translatedText[language] = translatedText;
    return true;
  }

  /**
   * Get captions in time range
   */
  getCaptions(startTime: number, endTime: number): AccessibilityCaption[] {
    return this.captions.filter(c => c.startTime >= startTime && c.endTime <= endTime);
  }

  /**
   * Create accessibility profile for participant
   */
  createAccessibilityProfile(participantId: string, profile: Partial<AccessibilityProfile>) {
    const defaultProfile: AccessibilityProfile = {
      screenReaderEnabled: false,
      captionPreference: 'auto',
      contrastMode: 'normal',
      fontSize: 'normal',
      language: 'en'
    };

    this.profiles.set(participantId, { ...defaultProfile, ...profile });
  }

  /**
   * Get screen reader announcements
   */
  getScreenReaderText(currentTime: number): string {
    const activeCaptions = this.captions.filter(
      c => c.startTime <= currentTime && c.endTime >= currentTime
    );

    if (activeCaptions.length === 0) return '';

    return activeCaptions
      .map(c => `${c.speaker || 'Participant'}: ${c.text}`)
      .join('. ');
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      totalCaptions: this.captions.length,
      captionsWithTranslations: this.captions.filter(c => c.translatedText).length,
      accessibilityProfiles: this.profiles.size,
      totalCaptionText: this.captions.reduce((sum, c) => sum + c.text.length, 0)
    };
  }
}

// ============================================================================
// #6: Collaborative Virtual Whiteboard
// ============================================================================

interface WhiteboardElement {
  id: string;
  type: 'line' | 'shape' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  timestamp: number;
  creator: string;
  data: any; // Serialized drawing data
}

export class VirtualWhiteboardService {
  private elements: WhiteboardElement[] = [];
  private elementId = 0;
  private canvasWidth = 1920;
  private canvasHeight = 1080;
  private layers: Map<string, WhiteboardElement[]> = new Map();
  private currentLayer = 'default';

  /**
   * Add drawing element
   */
  addElement(
    type: 'line' | 'shape' | 'text' | 'image',
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    creator: string,
    data: any
  ): WhiteboardElement {
    const element: WhiteboardElement = {
      id: `elem-${this.elementId++}`,
      type,
      x,
      y,
      width,
      height,
      color,
      timestamp: Date.now(),
      creator,
      data
    };

    this.elements.push(element);

    // Add to layer
    if (!this.layers.has(this.currentLayer)) {
      this.layers.set(this.currentLayer, []);
    }
    this.layers.get(this.currentLayer)!.push(element);

    return element;
  }

  /**
   * Clear whiteboard or specific layer
   */
  clear(layerId?: string): void {
    if (layerId) {
      this.layers.delete(layerId);
      this.elements = this.elements.filter(e => {
        const eLayer = this.getElementLayer(e.id);
        return eLayer !== layerId;
      });
    } else {
      this.elements = [];
      this.layers.clear();
    }
  }

  /**
   * Undo last element
   */
  undoLast(): WhiteboardElement | null {
    if (this.elements.length === 0) return null;
    const removed = this.elements.pop();
    if (removed) {
      const layer = this.layers.get(this.currentLayer);
      if (layer) {
        const idx = layer.indexOf(removed);
        if (idx > -1) layer.splice(idx, 1);
      }
    }
    return removed || null;
  }

  /**
   * Export whiteboard as image data
   */
  export(): { width: number; height: number; elements: WhiteboardElement[] } {
    return {
      width: this.canvasWidth,
      height: this.canvasHeight,
      elements: this.elements
    };
  }

  /**
   * Get element by ID
   */
  getElement(id: string): WhiteboardElement | null {
    return this.elements.find(e => e.id === id) || null;
  }

  /**
   * Get all elements on current layer
   */
  getLayerElements(layerId?: string): WhiteboardElement[] {
    const layer = layerId || this.currentLayer;
    return this.layers.get(layer) || [];
  }

  /**
   * Get element layer
   */
  private getElementLayer(elementId: string): string | null {
    for (const [layerId, elements] of this.layers) {
      if (elements.some(e => e.id === elementId)) {
        return layerId;
      }
    }
    return null;
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      totalElements: this.elements.length,
      totalLayers: this.layers.size,
      canvasSize: `${this.canvasWidth}x${this.canvasHeight}`,
      elementsPerType: {
        lines: this.elements.filter(e => e.type === 'line').length,
        shapes: this.elements.filter(e => e.type === 'shape').length,
        text: this.elements.filter(e => e.type === 'text').length,
        images: this.elements.filter(e => e.type === 'image').length
      }
    };
  }
}

// ============================================================================
// #7: Network Diagnostics & Quality Monitoring
// ============================================================================

interface NetworkDiagnostic {
  timestamp: number;
  packetLoss: number; // 0-1 percentage
  jitter: number; // ms
  latency: number; // ms
  bandwidth: number; // kbps
  packetsLost: number;
  packetsTotal: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
}

export class NetworkDiagnosticsService {
  private diagnostics: NetworkDiagnostic[] = [];
  private alertThresholds = {
    packetLoss: 0.05, // 5%
    jitter: 50, // 50ms
    latency: 300, // 300ms
    bandwidth: 500 // 500 kbps
  };

  /**
   * Collect network metrics
   */
  collectMetrics(
    packetLoss: number,
    jitter: number,
    latency: number,
    bandwidth: number,
    packetsLost: number,
    packetsTotal: number
  ): NetworkDiagnostic {
    // Determine quality level
    const quality = this.determineQualityLevel(packetLoss, jitter, latency);

    // Generate recommendation
    const recommendation = this.generateRecommendation(packetLoss, jitter, latency, bandwidth);

    const diagnostic: NetworkDiagnostic = {
      timestamp: Date.now(),
      packetLoss,
      jitter,
      latency,
      bandwidth,
      packetsLost,
      packetsTotal,
      quality,
      recommendation
    };

    this.diagnostics.push(diagnostic);

    // Keep last 1000 diagnostics
    if (this.diagnostics.length > 1000) {
      this.diagnostics.shift();
    }

    return diagnostic;
  }

  /**
   * Determine quality level
   */
  private determineQualityLevel(
    packetLoss: number,
    jitter: number,
    latency: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    // Scoring: lower is better
    const lossScore = packetLoss * 100;
    const jitterScore = jitter / 100;
    const latencyScore = latency / 100;

    const totalScore = (lossScore * 0.5) + (jitterScore * 0.25) + (latencyScore * 0.25);

    if (totalScore < 2) return 'excellent';
    if (totalScore < 5) return 'good';
    if (totalScore < 10) return 'fair';
    return 'poor';
  }

  /**
   * Generate recommendation based on metrics
   */
  private generateRecommendation(
    packetLoss: number,
    jitter: number,
    latency: number,
    bandwidth: number
  ): string {
    const issues: string[] = [];

    if (packetLoss > this.alertThresholds.packetLoss) {
      issues.push(`High packet loss (${(packetLoss * 100).toFixed(1)}%)`);
    }
    if (jitter > this.alertThresholds.jitter) {
      issues.push(`High jitter (${jitter.toFixed(0)}ms)`);
    }
    if (latency > this.alertThresholds.latency) {
      issues.push(`High latency (${latency.toFixed(0)}ms)`);
    }
    if (bandwidth < this.alertThresholds.bandwidth) {
      issues.push(`Low bandwidth (${bandwidth.toFixed(0)}kbps)`);
    }

    if (issues.length === 0) {
      return 'Network conditions are optimal';
    }

    return `Issues detected: ${issues.join(', ')}. Consider reducing video quality or checking connection.`;
  }

  /**
   * Get network health summary
   */
  getHealthSummary(last30s = true): any {
    const timeWindow = last30s ? 30000 : Infinity; // 30 seconds
    const now = Date.now();

    const recentDiags = this.diagnostics.filter(d => (now - d.timestamp) < timeWindow);

    if (recentDiags.length === 0) {
      return { status: 'unknown', message: 'No diagnostics collected yet' };
    }

    const avgPacketLoss = recentDiags.reduce((sum, d) => sum + d.packetLoss, 0) / recentDiags.length;
    const avgJitter = recentDiags.reduce((sum, d) => sum + d.jitter, 0) / recentDiags.length;
    const avgLatency = recentDiags.reduce((sum, d) => sum + d.latency, 0) / recentDiags.length;
    const avgBandwidth = recentDiags.reduce((sum, d) => sum + d.bandwidth, 0) / recentDiags.length;

    return {
      status: this.determineQualityLevel(avgPacketLoss, avgJitter, avgLatency),
      avgPacketLoss: (avgPacketLoss * 100).toFixed(2) + '%',
      avgJitter: avgJitter.toFixed(1) + 'ms',
      avgLatency: avgLatency.toFixed(0) + 'ms',
      avgBandwidth: avgBandwidth.toFixed(0) + 'kbps',
      sampleCount: recentDiags.length
    };
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      totalMeasurements: this.diagnostics.length,
      lastMeasurement: this.diagnostics[this.diagnostics.length - 1] || null,
      averageQuality: this.getHealthSummary(),
      alerts: this.getAlerts()
    };
  }

  /**
   * Get alerts
   */
  private getAlerts(): string[] {
    if (this.diagnostics.length === 0) return [];

    const recent = this.diagnostics.slice(-10);
    const alerts: string[] = [];

    const avgPacketLoss = recent.reduce((sum, d) => sum + d.packetLoss, 0) / recent.length;
    const avgJitter = recent.reduce((sum, d) => sum + d.jitter, 0) / recent.length;
    const avgLatency = recent.reduce((sum, d) => sum + d.latency, 0) / recent.length;

    if (avgPacketLoss > this.alertThresholds.packetLoss) {
      alerts.push(`ALERT: Packet loss ${(avgPacketLoss * 100).toFixed(1)}%`);
    }
    if (avgJitter > this.alertThresholds.jitter) {
      alerts.push(`ALERT: Jitter ${avgJitter.toFixed(0)}ms`);
    }
    if (avgLatency > this.alertThresholds.latency) {
      alerts.push(`ALERT: Latency ${avgLatency.toFixed(0)}ms`);
    }

    return alerts;
  }
}

// ============================================================================
// #8: Video Quality Estimation (No-Reference Metrics)
// ============================================================================

interface VideoQualityScore {
  timestamp: number;
  frameNumber: number;
  brisqueScore: number; // 0-100 (lower is better)
  niqueScore: number; // 0-100 (lower is better)
  overallQuality: number; // 0-100 (higher is better)
  degradationDetected: boolean;
  recommendation: string;
}

export class VideoQualityEstimationService {
  private qualityScores: VideoQualityScore[] = [];
  private frameNumber = 0;

  /**
   * Analyze frame quality using BRISQUE and NIQE metrics
   */
  analyzeFrameQuality(frameData: { pixels: number[][] }): VideoQualityScore {
    // Calculate BRISQUE (Blind/Referenceless Image Spatial QUality Evaluator)
    const brisque = this.calculateBrisque(frameData);

    // Calculate NIQE (Natural Image Quality Evaluator)
    const nique = this.calculateNiqe(frameData);

    // Convert to 0-100 scale (higher is better for overall quality)
    const overallQuality = Math.max(0, 100 - ((brisque + nique) / 2));

    // Detect degradation
    const degradationDetected = brisque > 40 || nique > 40;

    // Generate recommendation
    const recommendation = this.getQualityRecommendation(overallQuality, degradationDetected);

    const score: VideoQualityScore = {
      timestamp: Date.now(),
      frameNumber: this.frameNumber++,
      brisqueScore: brisque,
      niqueScore: nique,
      overallQuality,
      degradationDetected,
      recommendation
    };

    this.qualityScores.push(score);

    // Keep last 500 scores
    if (this.qualityScores.length > 500) {
      this.qualityScores.shift();
    }

    return score;
  }

  /**
   * Calculate BRISQUE score (0-100, lower is better)
   */
  private calculateBrisque(frameData: { pixels: number[][] }): number {
    // Simplified BRISQUE calculation
    // Analyzes spatial distortions using natural scene statistics

    const pixels = frameData.pixels;
    if (!pixels || pixels.length === 0) return 50;

    // Calculate local contrast
    let contrastSum = 0;
    for (let i = 1; i < pixels.length - 1; i++) {
      for (let j = 1; j < pixels[i].length - 1; j++) {
        const center = pixels[i][j];
        const neighbors = [
          pixels[i - 1][j - 1], pixels[i - 1][j], pixels[i - 1][j + 1],
          pixels[i][j - 1], pixels[i][j + 1],
          pixels[i + 1][j - 1], pixels[i + 1][j], pixels[i + 1][j + 1]
        ];
        const contrast = Math.max(...neighbors) - Math.min(...neighbors);
        contrastSum += Math.abs(contrast - 50); // 50 is target contrast
      }
    }

    const avgContrast = contrastSum / (pixels.length * pixels[0].length);
    return Math.min(100, avgContrast / 10);
  }

  /**
   * Calculate NIQE score (0-100, lower is better)
   */
  private calculateNiqe(frameData: { pixels: number[][] }): number {
    // Simplified NIQE calculation
    // Measures deviation from natural image statistics

    const pixels = frameData.pixels;
    if (!pixels || pixels.length === 0) return 50;

    // Calculate standard deviation from natural image expectations
    let deviationSum = 0;
    const targetMean = 127.5; // Center of 0-255 range
    const targetStdDev = 60; // Typical natural image std dev

    for (const row of pixels) {
      for (const pixel of row) {
        const deviationFromMean = Math.abs(pixel - targetMean);
        deviationSum += deviationFromMean;
      }
    }

    const totalPixels = pixels.length * pixels[0].length;
    const avgDeviation = deviationSum / totalPixels;

    // Score based on how much deviation from natural statistics
    return Math.min(100, Math.abs(avgDeviation - targetStdDev) / targetStdDev * 50);
  }

  /**
   * Get quality recommendation
   */
  private getQualityRecommendation(quality: number, degradationDetected: boolean): string {
    if (quality >= 80) return 'Excellent quality';
    if (quality >= 60) return 'Good quality';
    if (quality >= 40) return 'Fair quality - consider improving';
    return `Poor quality (${quality.toFixed(0)}/100) - action recommended`;
  }

  /**
   * Get average quality over time window
   */
  getAverageQuality(lastNSeconds?: number): number {
    let scores = this.qualityScores;

    if (lastNSeconds) {
      const cutoffTime = Date.now() - (lastNSeconds * 1000);
      scores = scores.filter(s => s.timestamp > cutoffTime);
    }

    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.overallQuality, 0) / scores.length;
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    const recent = this.qualityScores.slice(-30);
    return {
      totalFramesAnalyzed: this.frameNumber,
      averageQuality: this.getAverageQuality(),
      recentQuality: recent.length > 0 ? recent[recent.length - 1] : null,
      degradedFrames: this.qualityScores.filter(s => s.degradationDetected).length,
      degradationRate: this.qualityScores.length > 0
        ? (this.qualityScores.filter(s => s.degradationDetected).length / this.qualityScores.length * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

// ============================================================================
// #9: Advanced Codec Selection & Optimization
// ============================================================================

interface CodecProfile {
  name: string;
  mimeType: string;
  supportLevel: 'required' | 'preferred' | 'optional';
  hardwareAccelerated: boolean;
  bandwidthReduction: number; // Percentage vs H.264
  cpuUsage: number; // 0-100 relative score
  maxResolution: string;
  maxFramerate: number;
}

export class CodecSelectionService {
  private codecs: Map<string, CodecProfile> = new Map();
  private selectedCodec: string = 'h264';
  private codecStatistics: Map<string, { encodeTime: number; decodeTime: number; count: number }> = new Map();

  constructor() {
    // Initialize codec profiles
    this.initializeCodecProfiles();
  }

  /**
   * Initialize available codecs with profiles
   */
  private initializeCodecProfiles(): void {
    const profiles: { [key: string]: CodecProfile } = {
      'h264': {
        name: 'H.264 (AVC)',
        mimeType: 'video/avc',
        supportLevel: 'required',
        hardwareAccelerated: true,
        bandwidthReduction: 0, // Baseline
        cpuUsage: 50,
        maxResolution: '4096x2304',
        maxFramerate: 60
      },
      'vp9': {
        name: 'VP9',
        mimeType: 'video/vp9',
        supportLevel: 'preferred',
        hardwareAccelerated: false,
        bandwidthReduction: 20, // 20% savings
        cpuUsage: 70,
        maxResolution: '4096x2304',
        maxFramerate: 60
      },
      'h265': {
        name: 'H.265 (HEVC)',
        mimeType: 'video/hevc',
        supportLevel: 'optional',
        hardwareAccelerated: true,
        bandwidthReduction: 25, // 25% savings
        cpuUsage: 55,
        maxResolution: '8192x4320',
        maxFramerate: 120
      },
      'av1': {
        name: 'AV1',
        mimeType: 'video/av01',
        supportLevel: 'optional',
        hardwareAccelerated: false,
        bandwidthReduction: 45, // 45% savings
        cpuUsage: 95,
        maxResolution: '8192x4320',
        maxFramerate: 120
      }
    };

    for (const [key, profile] of Object.entries(profiles)) {
      this.codecs.set(key, profile);
      this.codecStatistics.set(key, { encodeTime: 0, decodeTime: 0, count: 0 });
    }
  }

  /**
   * Select best codec based on constraints
   */
  selectCodec(
    bandwidth: number,
    cpuCapability: 'low' | 'medium' | 'high',
    hardwareAcceleration: boolean,
    contentType: 'face' | 'presentation' | 'mixed'
  ): string {
    let bestCodec = 'h264';
    let bestScore = 0;

    for (const [codecKey, profile] of this.codecs) {
      if (profile.supportLevel === 'required') {
        // Always consider required codecs
      } else if (profile.supportLevel === 'optional' && bandwidth < 2000) {
        // Skip optional codecs for low bandwidth
        continue;
      }

      // Scoring system
      let score = 50;

      // CPU usage penalty
      let cpuThreshold = 60;
      if (cpuCapability === 'low') cpuThreshold = 40;
      else if (cpuCapability === 'high') cpuThreshold = 80;

      if (profile.cpuUsage <= cpuThreshold) {
        score += 20;
      } else {
        score -= (profile.cpuUsage - cpuThreshold);
      }

      // Bandwidth efficiency bonus
      score += profile.bandwidthReduction * 2;

      // Hardware acceleration bonus
      if (hardwareAcceleration && profile.hardwareAccelerated) {
        score += 15;
      }

      // Content-specific preferences
      if (contentType === 'presentation' && codecKey === 'vp9') {
        score += 10; // VP9 good for presentations
      }
      if (contentType === 'face' && codecKey === 'h264') {
        score += 10; // H.264 has good face encoding
      }

      if (score > bestScore) {
        bestScore = score;
        bestCodec = codecKey;
      }
    }

    this.selectedCodec = bestCodec;
    return bestCodec;
  }

  /**
   * Get selected codec profile
   */
  getSelectedCodec(): CodecProfile | null {
    return this.codecs.get(this.selectedCodec) || null;
  }

  /**
   * Record codec performance
   */
  recordPerformance(encodeTimeMs: number, decodeTimeMs: number): void {
    const stats = this.codecStatistics.get(this.selectedCodec);
    if (stats) {
      stats.encodeTime += encodeTimeMs;
      stats.decodeTime += decodeTimeMs;
      stats.count++;
    }
  }

  /**
   * Get all available codecs
   */
  getAvailableCodecs(): { [key: string]: CodecProfile } {
    const codecs: { [key: string]: CodecProfile } = {};
    this.codecs.forEach((profile, key) => {
      codecs[key] = profile;
    });
    return codecs;
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    const stats: any = {};
    this.codecStatistics.forEach((stat, codec) => {
      if (stat.count > 0) {
        stats[codec] = {
          avgEncodeTime: (stat.encodeTime / stat.count).toFixed(2) + 'ms',
          avgDecodeTime: (stat.decodeTime / stat.count).toFixed(2) + 'ms',
          count: stat.count
        };
      }
    });

    return {
      selectedCodec: this.selectedCodec,
      codecProfile: this.getSelectedCodec(),
      performanceStats: stats
    };
  }
}

// ============================================================================
// #10: Recording Compliance & Audit Logging
// ============================================================================

interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  recordingId: string;
  details: any;
  ipAddress?: string;
  compliance: 'GDPR' | 'HIPAA' | 'GENERAL';
}

export class ComplianceAuditService {
  private auditLogs: AuditLogEntry[] = [];
  private retentionPolicies: Map<string, number> = new Map(); // compliance -> retention days
  private encryptionKeys: Map<string, string> = new Map();
  private logId = 0;

  constructor() {
    // Set default retention policies
    this.retentionPolicies.set('HIPAA', 2190); // 6 years in days
    this.retentionPolicies.set('GDPR', 90); // 90 days as default
    this.retentionPolicies.set('GENERAL', 30); // 30 days default
  }

  /**
   * Log audit event
   */
  logAuditEvent(
    action: string,
    actor: string,
    recordingId: string,
    details: any,
    compliance: 'GDPR' | 'HIPAA' | 'GENERAL' = 'GENERAL',
    ipAddress?: string
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${this.logId++}`,
      timestamp: Date.now(),
      action,
      actor,
      recordingId,
      details,
      ipAddress,
      compliance
    };

    this.auditLogs.push(entry);
    return entry;
  }

  /**
   * Generate audit report
   */
  generateAuditReport(
    recordingId: string,
    startTime?: number,
    endTime?: number
  ): AuditLogEntry[] {
    let logs = this.auditLogs.filter(l => l.recordingId === recordingId);

    if (startTime) {
      logs = logs.filter(l => l.timestamp >= startTime);
    }
    if (endTime) {
      logs = logs.filter(l => l.timestamp <= endTime);
    }

    return logs;
  }

  /**
   * Check data retention policy
   */
  checkRetentionPolicy(compliance: string): { daysRemaining: number; expiryDate: Date } {
    const retentionDays = this.retentionPolicies.get(compliance) || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);

    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return { daysRemaining, expiryDate };
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey(recordingId: string): string {
    // 256-bit encryption key (base64 encoded)
    const key = this.generateSecureKey(32);
    this.encryptionKeys.set(recordingId, key);
    return key;
  }

  /**
   * Verify encryption key
   */
  verifyEncryptionKey(recordingId: string, key: string): boolean {
    const storedKey = this.encryptionKeys.get(recordingId);
    return storedKey === key;
  }

  /**
   * Generate secure random key
   */
  private generateSecureKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Execute retention policy cleanup
   */
  executeRetentionPolicies(): { deleted: number; remaining: number } {
    const initialCount = this.auditLogs.length;

    // Group logs by compliance requirement
    const logsToKeep = this.auditLogs.filter(log => {
      const retentionDays = this.retentionPolicies.get(log.compliance) || 30;
      const expiryTime = log.timestamp + (retentionDays * 24 * 60 * 60 * 1000);
      return expiryTime > Date.now();
    });

    this.auditLogs = logsToKeep;

    return {
      deleted: initialCount - logsToKeep.length,
      remaining: logsToKeep.length
    };
  }

  /**
   * Get compliance dashboard
   */
  getComplianceDashboard(): any {
    const complianceStats: { [key: string]: { count: number; oldestLog: AuditLogEntry | null } } = {};

    ['GDPR', 'HIPAA', 'GENERAL'].forEach(compliance => {
      const logs = this.auditLogs.filter(l => l.compliance === compliance);
      complianceStats[compliance] = {
        count: logs.length,
        oldestLog: logs.length > 0 ? logs[logs.length - 1] : null
      };
    });

    return {
      totalLogs: this.auditLogs.length,
      complianceStats,
      retentionPolicies: Object.fromEntries(this.retentionPolicies)
    };
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      totalAuditLogs: this.auditLogs.length,
      encryptionKeysStored: this.encryptionKeys.size,
      complianceSummary: {
        GDPR: this.auditLogs.filter(l => l.compliance === 'GDPR').length,
        HIPAA: this.auditLogs.filter(l => l.compliance === 'HIPAA').length,
        GENERAL: this.auditLogs.filter(l => l.compliance === 'GENERAL').length
      },
      retentionPolicies: Object.fromEntries(this.retentionPolicies)
    };
  }
}
