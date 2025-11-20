/**
 * Phase 3: Conference-Wide Analytics System
 *
 * Comprehensive real-time analytics for multi-participant video conferences:
 * - Per-participant quality metrics tracking
 * - Network fairness analysis (Jain's fairness index)
 * - Bandwidth distribution optimization
 * - Conference-level bottleneck detection
 * - Participant performance comparison
 * - Recommendations for quality improvement
 *
 * Research-backed by: Jain's Fairness Index, Cisco QoS research,
 * WebRTC statistics API, network resource allocation algorithms
 */

export interface ParticipantMetrics {
  participantId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  videoCodec: string;
  videoResolution: string;
  videoFramerate: number;
  videoBitrate: number;
  audioCodec: string;
  audioBitrate: number;
  packetLoss: number;
  rtt: number;
  jitter: number;
  bufferDelay: number;
  cpuUsage: number;
  videoQuality: number; // 0-100
  audioQuality: number; // 0-100
  freezeCount: number;
  timestamp: number;
}

export interface ConferenceAnalytics {
  conferenceId: string;
  participantCount: number;
  totalBandwidthMbps: number;
  averageQuality: number;
  qualityVariance: number;
  jainFairnessIndex: number; // 0-1, higher = fairer
  bottleneckType: 'none' | 'network' | 'cpu' | 'bandwidth' | 'mixed';
  bottleneckSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  dominantCodec: string;
  participantMetrics: ParticipantMetrics[];
  recommendations: string[];
  timestamp: number;
}

export interface ParticipantPerformance {
  participantId: string;
  relativeQuality: number; // -50 to +50, 0 = average
  bandwidthAllocation: number; // Actual vs fair share
  fairnessScore: number; // 0-100
  risksDetected: string[];
  suggestedImprovements: string[];
}

export interface BandwidthAllocation {
  participantId: string;
  currentBitrate: number;
  fairShareBitrate: number;
  effectiveShare: number; // Current / fair share
  canIncrease: boolean;
  shouldDecrease: boolean;
  priority: number; // 1-10, higher = more important
}

/**
 * Conference-Wide Analytics Engine - Phase 3 Improvement #5
 *
 * Analyzes quality metrics across all conference participants and provides
 * fairness analysis and optimization recommendations.
 */
export class ConferenceAnalyticsEngine {
  private conferenceId: string;
  private metricsHistory: Map<string, ParticipantMetrics[]> = new Map();
  private conferenceHistory: ConferenceAnalytics[] = [];
  private readonly maxHistoryPerParticipant = 300; // 5 minutes at 1Hz
  private readonly maxConferenceHistory = 100;

  constructor(conferenceId: string) {
    this.conferenceId = conferenceId;
  }

  /**
   * Add metrics for a participant
   */
  addParticipantMetrics(metrics: ParticipantMetrics): void {
    if (!this.metricsHistory.has(metrics.participantId)) {
      this.metricsHistory.set(metrics.participantId, []);
    }

    const history = this.metricsHistory.get(metrics.participantId)!;
    history.push(metrics);

    // Maintain history limit
    if (history.length > this.maxHistoryPerParticipant) {
      history.shift();
    }
  }

  /**
   * Calculate Jain's Fairness Index
   * Measures how fairly bandwidth is distributed among participants
   * Formula: (Σx)² / (n * Σx²)
   * Range: 0-1 (1 = perfect fairness)
   */
  private calculateJainFairnessIndex(bitrates: number[]): number {
    if (bitrates.length === 0) return 1;
    if (bitrates.length === 1) return 1;

    const sum = bitrates.reduce((a, b) => a + b, 0);
    const sumOfSquares = bitrates.reduce((a, b) => a + b * b, 0);

    const numerator = sum * sum;
    const denominator = bitrates.length * sumOfSquares;

    return denominator > 0 ? numerator / denominator : 1;
  }

  /**
   * Identify conference bottleneck
   */
  private detectBottleneck(
    metrics: ParticipantMetrics[]
  ): { type: 'none' | 'network' | 'cpu' | 'bandwidth' | 'mixed'; severity: 'none' | 'low' | 'medium' | 'high' | 'critical' } {
    if (metrics.length === 0) {
      return { type: 'none', severity: 'none' };
    }

    let avgPacketLoss = 0;
    let avgCpuUsage = 0;
    let avgQuality = 0;
    let participantsWithHighLoss = 0;
    let participantsWithHighCpu = 0;

    for (const m of metrics) {
      avgPacketLoss += m.packetLoss;
      avgCpuUsage += m.cpuUsage;
      avgQuality += m.videoQuality;

      if (m.packetLoss > 5) participantsWithHighLoss++;
      if (m.cpuUsage > 80) participantsWithHighCpu++;
    }

    avgPacketLoss /= metrics.length;
    avgCpuUsage /= metrics.length;
    avgQuality /= metrics.length;

    // Determine bottleneck type and severity
    let type: 'none' | 'network' | 'cpu' | 'bandwidth' | 'mixed' = 'none';
    let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    if (avgQuality < 50) {
      // Quality is poor, determine cause
      const networkScore =
        (avgPacketLoss / 15) * 0.5 + (participantsWithHighLoss / metrics.length) * 0.5;
      const cpuScore =
        (avgCpuUsage / 100) * 0.5 + (participantsWithHighCpu / metrics.length) * 0.5;

      if (networkScore > cpuScore) {
        type = 'network';
      } else if (cpuScore > networkScore) {
        type = 'cpu';
      } else {
        type = 'mixed';
      }

      if (avgQuality < 30) {
        severity = 'critical';
      } else if (avgQuality < 40) {
        severity = 'high';
      } else if (avgQuality < 50) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
    } else if (avgQuality < 70) {
      // Quality is moderate
      if (avgPacketLoss > 2 || avgCpuUsage > 70) {
        type = avgPacketLoss > 2 ? 'network' : 'cpu';
        severity = 'low';
      }
    }

    return { type, severity };
  }

  /**
   * Analyze bandwidth allocation fairness
   */
  private analyzeBandwidthFairness(
    metrics: ParticipantMetrics[]
  ): BandwidthAllocation[] {
    const totalBandwidth = metrics.reduce((sum, m) => sum + m.videoBitrate, 0);
    const fairShare = totalBandwidth / Math.max(1, metrics.length);

    const allocations: BandwidthAllocation[] = metrics.map(m => {
      const effectiveShare = fairShare > 0 ? m.videoBitrate / fairShare : 1;
      const quality = m.videoQuality;

      // Determine if participant can increase or should decrease
      const canIncrease = effectiveShare < 0.8 && quality > 60;
      const shouldDecrease = effectiveShare > 1.2 && quality < 50;

      // Calculate priority based on quality and status
      let priority = 5; // Neutral
      if (quality < 50) {
        priority = 1; // Low quality = low priority (might be losing bandwidth)
      } else if (quality > 80) {
        priority = 10; // High quality = can reduce
      }

      return {
        participantId: m.participantId,
        currentBitrate: m.videoBitrate,
        fairShareBitrate: Math.round(fairShare),
        effectiveShare,
        canIncrease,
        shouldDecrease,
        priority
      };
    });

    return allocations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get per-participant performance analysis
   */
  getParticipantPerformance(
    metrics: ParticipantMetrics[]
  ): ParticipantPerformance[] {
    const avgQuality =
      metrics.reduce((sum, m) => sum + m.videoQuality, 0) / Math.max(1, metrics.length);

    return metrics.map(m => {
      const relativeQuality = m.videoQuality - avgQuality;

      const bandwidthAllocations = this.analyzeBandwidthFairness(metrics);
      const allocation = bandwidthAllocations.find(
        a => a.participantId === m.participantId
      );

      const bandwidthAllocation = allocation
        ? allocation.effectiveShare
        : 1;

      // Calculate fairness score
      let fairnessScore = 50;
      if (bandwidthAllocation < 0.5) {
        fairnessScore = 20; // Getting significantly less than fair share
      } else if (bandwidthAllocation < 0.8) {
        fairnessScore = 40;
      } else if (bandwidthAllocation < 1.2) {
        fairnessScore = 80; // Fair
      } else if (bandwidthAllocation < 1.5) {
        fairnessScore = 60;
      } else {
        fairnessScore = 30; // Getting too much
      }

      // Detect risks
      const risksDetected: string[] = [];
      if (m.packetLoss > 5) {
        risksDetected.push(`High packet loss: ${m.packetLoss.toFixed(1)}%`);
      }
      if (m.cpuUsage > 85) {
        risksDetected.push(`High CPU usage: ${m.cpuUsage.toFixed(1)}%`);
      }
      if (m.rtt > 200) {
        risksDetected.push(`High RTT: ${m.rtt}ms`);
      }
      if (m.freezeCount > 5) {
        risksDetected.push(`Multiple video freezes: ${m.freezeCount}`);
      }
      if (m.videoQuality < 50) {
        risksDetected.push('Poor video quality');
      }

      // Suggest improvements
      const suggestedImprovements: string[] = [];
      if (m.videoQuality < 50) {
        suggestedImprovements.push('Reduce resolution or framerate');
        suggestedImprovements.push('Check network connection');
      }
      if (m.cpuUsage > 80) {
        suggestedImprovements.push('Reduce encoding complexity');
        suggestedImprovements.push('Close background applications');
      }
      if (m.rtt > 150) {
        suggestedImprovements.push('Consider changing network');
      }
      if (bandwidthAllocation < 0.7) {
        suggestedImprovements.push('Network congestion detected');
      }

      return {
        participantId: m.participantId,
        relativeQuality,
        bandwidthAllocation,
        fairnessScore,
        risksDetected,
        suggestedImprovements
      };
    });
  }

  /**
   * Generate conference-level recommendations
   */
  private generateRecommendations(
    metrics: ParticipantMetrics[],
    bottleneck: ReturnType<typeof this.detectBottleneck>,
    jainIndex: number
  ): string[] {
    const recommendations: string[] = [];
    const avgQuality =
      metrics.reduce((sum, m) => sum + m.videoQuality, 0) / Math.max(1, metrics.length);

    // Bottleneck-based recommendations
    switch (bottleneck.type) {
      case 'network':
        if (bottleneck.severity === 'critical') {
          recommendations.push('🚨 Critical network issues - reduce participant count or video quality');
        } else if (bottleneck.severity === 'high') {
          recommendations.push('⚠️ Network congestion detected - consider disabling video for some participants');
        } else {
          recommendations.push('📉 Minor network issues - monitor packet loss');
        }
        break;

      case 'cpu':
        if (bottleneck.severity === 'critical') {
          recommendations.push('🚨 CPU overload - reduce encoding complexity or resolution');
        } else if (bottleneck.severity === 'high') {
          recommendations.push('⚠️ High CPU usage - optimize codec settings');
        }
        break;

      case 'bandwidth':
        recommendations.push('📊 Bandwidth constraints - consider simulcast or SVC');
        break;

      case 'mixed':
        recommendations.push('⚖️ Mixed resource constraints - optimize multiple parameters');
        break;
    }

    // Fairness-based recommendations
    if (jainIndex < 0.7) {
      recommendations.push('⚠️ Unfair bandwidth distribution - some participants getting limited bandwidth');
    }

    // Quality-based recommendations
    if (avgQuality < 50) {
      recommendations.push('📉 Conference quality is poor - investigate bottlenecks');
    } else if (avgQuality < 70) {
      recommendations.push('⚡ Quality can be improved - optimize codec and network settings');
    }

    // Codec recommendation
    const codecCounts = new Map<string, number>();
    for (const m of metrics) {
      codecCounts.set(m.videoCodec, (codecCounts.get(m.videoCodec) || 0) + 1);
    }

    const dominantCodec = Array.from(codecCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    if (dominantCodec !== 'h264' && metrics.length > 5) {
      recommendations.push(`✅ Using ${dominantCodec.toUpperCase()} - good codec choice for this conference size`);
    }

    return recommendations;
  }

  /**
   * Analyze current conference state
   */
  analyzeConference(): ConferenceAnalytics {
    // Gather latest metrics from all participants
    const latestMetrics: ParticipantMetrics[] = [];

    for (const [participantId, history] of this.metricsHistory.entries()) {
      if (history.length > 0) {
        latestMetrics.push(history[history.length - 1]);
      }
    }

    if (latestMetrics.length === 0) {
      return {
        conferenceId: this.conferenceId,
        participantCount: 0,
        totalBandwidthMbps: 0,
        averageQuality: 0,
        qualityVariance: 0,
        jainFairnessIndex: 1,
        bottleneckType: 'none',
        bottleneckSeverity: 'none',
        dominantCodec: 'h264',
        participantMetrics: [],
        recommendations: [],
        timestamp: Date.now()
      };
    }

    // Calculate metrics
    const videoBitrates = latestMetrics.map(m => m.videoBitrate);
    const totalBandwidth = videoBitrates.reduce((a, b) => a + b, 0);
    const videoQualities = latestMetrics.map(m => m.videoQuality);
    const avgQuality =
      videoQualities.reduce((a, b) => a + b, 0) / videoQualities.length;

    // Calculate quality variance
    const qualityVariance = this.calculateVariance(videoQualities);

    // Calculate Jain's fairness index
    const jainIndex = this.calculateJainFairnessIndex(videoBitrates);

    // Detect bottleneck
    const bottleneck = this.detectBottleneck(latestMetrics);

    // Find dominant codec
    const codecCounts = new Map<string, number>();
    for (const m of latestMetrics) {
      codecCounts.set(m.videoCodec, (codecCounts.get(m.videoCodec) || 0) + 1);
    }
    const dominantCodec = Array.from(codecCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      latestMetrics,
      bottleneck,
      jainIndex
    );

    const analysis: ConferenceAnalytics = {
      conferenceId: this.conferenceId,
      participantCount: latestMetrics.length,
      totalBandwidthMbps: Math.round(totalBandwidth / 1000),
      averageQuality: Math.round(avgQuality),
      qualityVariance: Math.round(qualityVariance),
      jainFairnessIndex: Math.round(jainIndex * 1000) / 1000,
      bottleneckType: bottleneck.type,
      bottleneckSeverity: bottleneck.severity,
      dominantCodec,
      participantMetrics: latestMetrics,
      recommendations,
      timestamp: Date.now()
    };

    this.conferenceHistory.push(analysis);
    if (this.conferenceHistory.length > this.maxConferenceHistory) {
      this.conferenceHistory.shift();
    }

    return analysis;
  }

  /**
   * Calculate variance of array values
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Get quality trend for participant
   */
  getParticipantTrend(
    participantId: string
  ): {
    trend: 'improving' | 'stable' | 'degrading';
    direction: number; // -1 to 1
    recentQuality: number[];
  } {
    const history = this.metricsHistory.get(participantId) || [];

    if (history.length < 2) {
      return {
        trend: 'stable',
        direction: 0,
        recentQuality: history.map(h => h.videoQuality)
      };
    }

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const recentAvg =
      recent.reduce((sum, m) => sum + m.videoQuality, 0) / recent.length;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, m) => sum + m.videoQuality, 0) / older.length
        : recentAvg;

    const direction = (recentAvg - olderAvg) / 100;
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (direction > 0.1) {
      trend = 'improving';
    } else if (direction < -0.1) {
      trend = 'degrading';
    }

    return {
      trend,
      direction,
      recentQuality: recent.map(h => h.videoQuality)
    };
  }

  /**
   * Get fairness analysis
   */
  getBandwidthFairnessAnalysis(): {
    jainIndex: number;
    allocations: BandwidthAllocation[];
    analysis: string;
  } {
    const latestMetrics = Array.from(this.metricsHistory.values())
      .filter(h => h.length > 0)
      .map(h => h[h.length - 1]);

    const videoBitrates = latestMetrics.map(m => m.videoBitrate);
    const jainIndex = this.calculateJainFairnessIndex(videoBitrates);

    const allocations = this.analyzeBandwidthFairness(latestMetrics);

    let analysis = '';
    if (jainIndex > 0.9) {
      analysis = 'Excellent fairness - bandwidth well distributed';
    } else if (jainIndex > 0.7) {
      analysis = 'Good fairness - minor imbalances detected';
    } else if (jainIndex > 0.5) {
      analysis = 'Fair allocation - some participants limited';
    } else {
      analysis = 'Poor fairness - significant imbalances detected';
    }

    return {
      jainIndex,
      allocations,
      analysis
    };
  }

  /**
   * Get conference history
   */
  getHistory(): ConferenceAnalytics[] {
    return [...this.conferenceHistory];
  }

  /**
   * Reset analytics
   */
  reset(): void {
    this.metricsHistory.clear();
    this.conferenceHistory = [];
    console.log(`🔄 Conference analytics for ${this.conferenceId} reset`);
  }
}

/**
 * Analytics Manager for multiple concurrent conferences
 */
export class AnalyticsManager {
  private engines: Map<string, ConferenceAnalyticsEngine> = new Map();
  private analysisCache: Map<string, ConferenceAnalytics> = new Map();

  /**
   * Get or create analytics engine for conference
   */
  getEngine(conferenceId: string): ConferenceAnalyticsEngine {
    if (!this.engines.has(conferenceId)) {
      this.engines.set(conferenceId, new ConferenceAnalyticsEngine(conferenceId));
    }

    return this.engines.get(conferenceId)!;
  }

  /**
   * Add participant metrics
   */
  addMetrics(conferenceId: string, metrics: ParticipantMetrics): void {
    this.getEngine(conferenceId).addParticipantMetrics(metrics);

    // Invalidate cache
    this.analysisCache.delete(conferenceId);
  }

  /**
   * Get conference analysis with caching
   */
  getAnalysis(conferenceId: string): ConferenceAnalytics {
    if (this.analysisCache.has(conferenceId)) {
      return this.analysisCache.get(conferenceId)!;
    }

    const analysis = this.getEngine(conferenceId).analyzeConference();
    this.analysisCache.set(conferenceId, analysis);

    return analysis;
  }

  /**
   * Get active conferences
   */
  getActiveConferences(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Get summary of all conferences
   */
  getSummary() {
    const conferences = Array.from(this.engines.keys());

    return {
      totalConferences: conferences.length,
      totalParticipants: conferences.reduce(
        (sum, id) => sum + (this.getAnalysis(id).participantCount || 0),
        0
      ),
      averageConferenceQuality:
        conferences.reduce((sum, id) => sum + (this.getAnalysis(id).averageQuality || 0), 0) /
        Math.max(1, conferences.length),
      fairnessMetrics: conferences.map(id => ({
        conferenceId: id,
        jainIndex: this.getAnalysis(id).jainFairnessIndex
      }))
    };
  }

  /**
   * Clean up inactive conferences
   */
  removeConference(conferenceId: string): void {
    this.engines.delete(conferenceId);
    this.analysisCache.delete(conferenceId);
  }
}
