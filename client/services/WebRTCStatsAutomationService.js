// WebRTC Statistics Automation Service
// Advanced WebRTC stats collection, analysis, and automation

class WebRTCStatsAutomationService extends EventTarget {
  constructor() {
    super();
    this.isInitialized = false;
    this.peerConnections = new Map();
    this.statsCollectors = new Map();
    this.automationRules = new Map();
    this.statsHistory = new Map();
    this.analysisEngine = null;
    
    // Configuration
    this.config = {
      collectionInterval: 1000, // 1 second
      historySize: 300, // 5 minutes of data
      analysisInterval: 5000, // 5 seconds
      automationEnabled: true,
      realTimeAlerts: true
    };
    
    this.initializeService();
  }

  // Initialize the service
  async initializeService() {
    try {
      console.log('Initializing WebRTC Stats Automation Service...');
      
      // Initialize analysis engine
      this.analysisEngine = new WebRTCStatsAnalysisEngine();
      await this.analysisEngine.initialize();
      
      // Setup default automation rules
      this.setupDefaultRules();
      
      // Start periodic analysis
      this.startPeriodicAnalysis();
      
      this.isInitialized = true;
      console.log('WebRTC Stats Automation Service initialized successfully');
      
      this.dispatchEvent(new CustomEvent('initialized', {
        detail: { 
          collectors: this.statsCollectors.size,
          rules: this.automationRules.size 
        }
      }));
      
    } catch (error) {
      console.error('Failed to initialize WebRTC Stats Automation Service:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  // Register a peer connection for monitoring
  registerPeerConnection(pcId, peerConnection) {
    if (!peerConnection || typeof peerConnection.getStats !== 'function') {
      throw new Error('Invalid peer connection provided');
    }

    // Create stats collector for this connection
    const collector = new WebRTCStatsCollector(pcId, peerConnection, this.config);
    
    this.peerConnections.set(pcId, peerConnection);
    this.statsCollectors.set(pcId, collector);
    this.statsHistory.set(pcId, []);
    
    // Setup event listeners
    collector.addEventListener('statsCollected', (event) => {
      this.handleStatsCollected(pcId, event.detail);
    });
    
    collector.addEventListener('alert', (event) => {
      this.handleAlert(pcId, event.detail);
    });
    
    // Start collection
    collector.startCollection();
    
    console.log(`Registered peer connection ${pcId} for stats monitoring`);
    
    this.dispatchEvent(new CustomEvent('peerConnectionRegistered', {
      detail: { pcId, timestamp: Date.now() }
    }));
    
    return collector;
  }

  // Unregister a peer connection
  unregisterPeerConnection(pcId) {
    const collector = this.statsCollectors.get(pcId);
    if (collector) {
      collector.stopCollection();
      this.statsCollectors.delete(pcId);
      this.statsHistory.delete(pcId);
    }
    
    this.peerConnections.delete(pcId);
    
    console.log(`Unregistered peer connection ${pcId}`);
    
    this.dispatchEvent(new CustomEvent('peerConnectionUnregistered', {
      detail: { pcId, timestamp: Date.now() }
    }));
  }

  // Handle collected stats
  handleStatsCollected(pcId, stats) {
    // Add to history
    const history = this.statsHistory.get(pcId) || [];
    history.push({
      ...stats,
      timestamp: Date.now()
    });
    
    // Maintain history size
    if (history.length > this.config.historySize) {
      history.shift();
    }
    
    this.statsHistory.set(pcId, history);
    
    // Apply automation rules
    if (this.config.automationEnabled) {
      this.applyAutomationRules(pcId, stats);
    }
    
    // Dispatch stats event
    this.dispatchEvent(new CustomEvent('statsUpdated', {
      detail: { pcId, stats, historySize: history.length }
    }));
  }

  // Handle alerts from collectors
  handleAlert(pcId, alert) {
    if (this.config.realTimeAlerts) {
      this.dispatchEvent(new CustomEvent('alert', {
        detail: {
          pcId,
          ...alert,
          timestamp: Date.now()
        }
      }));
    }
  }

  // Apply automation rules
  applyAutomationRules(pcId, stats) {
    const rules = Array.from(this.automationRules.values());
    
    for (const rule of rules) {
      try {
        if (rule.evaluate(stats)) {
          this.executeAutomationRule(pcId, rule, stats);
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
      }
    }
  }

  // Execute automation rule
  executeAutomationRule(pcId, rule, stats) {
    const action = {
      ruleId: rule.id,
      ruleName: rule.name,
      pcId,
      triggeredBy: stats,
      timestamp: Date.now(),
      actions: []
    };
    
    // Execute rule actions
    for (const ruleAction of rule.actions) {
      try {
        const result = this.executeAction(pcId, ruleAction, stats);
        action.actions.push({
          type: ruleAction.type,
          success: true,
          result
        });
      } catch (error) {
        action.actions.push({
          type: ruleAction.type,
          success: false,
          error: error.message
        });
      }
    }
    
    // Dispatch automation event
    this.dispatchEvent(new CustomEvent('automationExecuted', {
      detail: action
    }));
  }

  // Execute individual action
  executeAction(pcId, action, stats) {
    switch (action.type) {
      case 'adjustBitrate':
        return this.adjustBitrate(pcId, action.params);
      case 'changeResolution':
        return this.changeResolution(pcId, action.params);
      case 'toggleVideo':
        return this.toggleVideo(pcId, action.params);
      case 'toggleAudio':
        return this.toggleAudio(pcId, action.params);
      case 'restartIce':
        return this.restartIce(pcId);
      case 'notifyUser':
        return this.notifyUser(action.params);
      case 'logEvent':
        return this.logEvent(pcId, action.params, stats);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Adjust bitrate
  adjustBitrate(pcId, params) {
    const pc = this.peerConnections.get(pcId);
    if (!pc) throw new Error('Peer connection not found');
    
    const { direction, bitrate } = params;
    
    // This would integrate with actual WebRTC bitrate adjustment
    console.log(`Adjusting ${direction} bitrate to ${bitrate} kbps for PC ${pcId}`);
    
    return { direction, newBitrate: bitrate };
  }

  // Change resolution
  changeResolution(pcId, params) {
    const pc = this.peerConnections.get(pcId);
    if (!pc) throw new Error('Peer connection not found');
    
    const { width, height } = params;
    
    // This would integrate with actual WebRTC resolution change
    console.log(`Changing resolution to ${width}x${height} for PC ${pcId}`);
    
    return { width, height };
  }

  // Toggle video
  toggleVideo(pcId, params) {
    const pc = this.peerConnections.get(pcId);
    if (!pc) throw new Error('Peer connection not found');
    
    const { enabled } = params;
    
    // This would integrate with actual WebRTC video track control
    console.log(`Video ${enabled ? 'enabled' : 'disabled'} for PC ${pcId}`);
    
    return { videoEnabled: enabled };
  }

  // Toggle audio
  toggleAudio(pcId, params) {
    const pc = this.peerConnections.get(pcId);
    if (!pc) throw new Error('Peer connection not found');
    
    const { enabled } = params;
    
    // This would integrate with actual WebRTC audio track control
    console.log(`Audio ${enabled ? 'enabled' : 'disabled'} for PC ${pcId}`);
    
    return { audioEnabled: enabled };
  }

  // Restart ICE
  restartIce(pcId) {
    const pc = this.peerConnections.get(pcId);
    if (!pc) throw new Error('Peer connection not found');
    
    // Restart ICE connection
    pc.restartIce();
    
    console.log(`ICE restart initiated for PC ${pcId}`);
    
    return { iceRestarted: true };
  }

  // Notify user
  notifyUser(params) {
    const { message, level } = params;
    
    console.log(`User notification [${level}]: ${message}`);
    
    // This would integrate with actual notification system
    return { message, level, notified: true };
  }

  // Log event
  logEvent(pcId, params, stats) {
    const { event, data } = params;
    
    const logEntry = {
      timestamp: Date.now(),
      pcId,
      event,
      data,
      stats: this.summarizeStats(stats)
    };
    
    console.log(`Event logged:`, logEntry);
    
    return { logged: true, logEntry };
  }

  // Summarize stats for logging
  summarizeStats(stats) {
    return {
      timestamp: stats.timestamp,
      connectionState: stats.connectionState,
      iceConnectionState: stats.iceConnectionState,
      bytesReceived: stats.bytesReceived,
      bytesSent: stats.bytesSent,
      packetsLost: stats.packetsLost,
      rtt: stats.rtt,
      jitter: stats.jitter
    };
  }

  // Setup default automation rules
  setupDefaultRules() {
    // High packet loss rule
    this.addAutomationRule({
      id: 'high-packet-loss',
      name: 'High Packet Loss Detection',
      condition: {
        type: 'threshold',
        metric: 'packetsLostPercentage',
        operator: '>',
        value: 3
      },
      actions: [
        {
          type: 'adjustBitrate',
          params: { direction: 'send', bitrate: 500 }
        },
        {
          type: 'notifyUser',
          params: { message: 'Network quality degraded, adjusting bitrate', level: 'warning' }
        }
      ]
    });
    
    // High latency rule
    this.addAutomationRule({
      id: 'high-latency',
      name: 'High Latency Detection',
      condition: {
        type: 'threshold',
        metric: 'rtt',
        operator: '>',
        value: 300
      },
      actions: [
        {
          type: 'adjustBitrate',
          params: { direction: 'send', bitrate: 800 }
        },
        {
          type: 'logEvent',
          params: { event: 'high_latency', data: { threshold: 300 } }
        }
      ]
    });
    
    // Connection failure rule
    this.addAutomationRule({
      id: 'connection-failure',
      name: 'Connection Failure Detection',
      condition: {
        type: 'state',
        metric: 'iceConnectionState',
        operator: '==',
        value: 'failed'
      },
      actions: [
        {
          type: 'restartIce',
          params: {}
        },
        {
          type: 'notifyUser',
          params: { message: 'Connection failed, attempting to reconnect...', level: 'error' }
        }
      ]
    });
    
    // Low bandwidth rule
    this.addAutomationRule({
      id: 'low-bandwidth',
      name: 'Low Bandwidth Detection',
      condition: {
        type: 'threshold',
        metric: 'availableOutgoingBitrate',
        operator: '<',
        value: 500
      },
      actions: [
        {
          type: 'changeResolution',
          params: { width: 640, height: 360 }
        },
        {
          type: 'adjustBitrate',
          params: { direction: 'send', bitrate: 400 }
        }
      ]
    });
  }

  // Add automation rule
  addAutomationRule(rule) {
    const automationRule = new AutomationRule(rule);
    this.automationRules.set(rule.id, automationRule);
    
    console.log(`Added automation rule: ${rule.name}`);
    
    this.dispatchEvent(new CustomEvent('ruleAdded', {
      detail: { ruleId: rule.id, ruleName: rule.name }
    }));
  }

  // Remove automation rule
  removeAutomationRule(ruleId) {
    const removed = this.automationRules.delete(ruleId);
    
    if (removed) {
      console.log(`Removed automation rule: ${ruleId}`);
      
      this.dispatchEvent(new CustomEvent('ruleRemoved', {
        detail: { ruleId }
      }));
    }
    
    return removed;
  }

  // Start periodic analysis
  startPeriodicAnalysis() {
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, this.config.analysisInterval);
  }

  // Perform periodic analysis
  async performPeriodicAnalysis() {
    if (!this.analysisEngine) return;
    
    for (const [pcId, history] of this.statsHistory.entries()) {
      if (history.length < 10) continue; // Need enough data for analysis
      
      try {
        const analysis = await this.analysisEngine.analyze(pcId, history);
        
        this.dispatchEvent(new CustomEvent('analysisCompleted', {
          detail: { pcId, analysis }
        }));
        
      } catch (error) {
        console.error(`Analysis error for PC ${pcId}:`, error);
      }
    }
  }

  // Get comprehensive stats report
  getStatsReport(pcId) {
    const history = this.statsHistory.get(pcId) || [];
    const collector = this.statsCollectors.get(pcId);
    
    if (history.length === 0) {
      return null;
    }
    
    const latest = history[history.length - 1];
    const analysis = this.analysisEngine?.getLastAnalysis(pcId);
    
    return {
      pcId,
      timestamp: Date.now(),
      current: latest,
      historySize: history.length,
      analysis,
      summary: this.generateSummary(history),
      trends: this.calculateTrends(history),
      alerts: collector?.getRecentAlerts() || []
    };
  }

  // Generate summary from history
  generateSummary(history) {
    if (history.length === 0) return {};
    
    const latest = history[history.length - 1];
    const first = history[0];
    const duration = latest.timestamp - first.timestamp;
    
    // Calculate averages
    const avgStats = {
      bytesReceived: history.reduce((sum, h) => sum + (h.bytesReceived || 0), 0) / history.length,
      bytesSent: history.reduce((sum, h) => sum + (h.bytesSent || 0), 0) / history.length,
      packetsLost: history.reduce((sum, h) => sum + (h.packetsLost || 0), 0) / history.length,
      rtt: history.reduce((sum, h) => sum + (h.rtt || 0), 0) / history.length,
      jitter: history.reduce((sum, h) => sum + (h.jitter || 0), 0) / history.length
    };
    
    return {
      duration,
      dataReceived: latest.bytesReceived - first.bytesReceived,
      dataSent: latest.bytesSent - first.bytesSent,
      averageStats: avgStats,
      qualityScore: this.calculateQualityScore(avgStats)
    };
  }

  // Calculate trends
  calculateTrends(history) {
    if (history.length < 10) return {};
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    const trends = {};
    
    // Calculate trend for each metric
    ['rtt', 'jitter', 'packetsLost', 'bytesReceived', 'bytesSent'].forEach(metric => {
      const recentAvg = recent.reduce((sum, h) => sum + (h[metric] || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, h) => sum + (h[metric] || 0), 0) / older.length;
      
      const change = recentAvg - olderAvg;
      const percentChange = olderAvg !== 0 ? (change / olderAvg) * 100 : 0;
      
      trends[metric] = {
        current: recentAvg,
        change,
        percentChange,
        direction: percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable'
      };
    });
    
    return trends;
  }

  // Calculate quality score
  calculateQualityScore(stats) {
    let score = 100;
    
    // Deduct points for poor metrics
    if (stats.rtt > 200) score -= 20;
    else if (stats.rtt > 100) score -= 10;
    
    if (stats.jitter > 30) score -= 15;
    else if (stats.jitter > 15) score -= 8;
    
    if (stats.packetsLost > 2) score -= 25;
    else if (stats.packetsLost > 1) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // Get service statistics
  getServiceStats() {
    return {
      isInitialized: this.isInitialized,
      monitoredConnections: this.peerConnections.size,
      activeCollectors: this.statsCollectors.size,
      automationRules: this.automationRules.size,
      totalHistoryPoints: Array.from(this.statsHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      config: this.config
    };
  }

  // Export all data
  exportData() {
    return {
      peerConnections: Array.from(this.peerConnections.keys()),
      statsHistory: Object.fromEntries(this.statsHistory),
      automationRules: Array.from(this.automationRules.values()).map(rule => rule.serialize()),
      serviceStats: this.getServiceStats(),
      timestamp: Date.now()
    };
  }

  // Cleanup service
  cleanup() {
    console.log('Cleaning up WebRTC Stats Automation Service...');
    
    // Stop all collectors
    for (const collector of this.statsCollectors.values()) {
      collector.stopCollection();
    }
    
    // Clear data
    this.peerConnections.clear();
    this.statsCollectors.clear();
    this.statsHistory.clear();
    this.automationRules.clear();
    
    this.isInitialized = false;
    console.log('WebRTC Stats Automation Service cleaned up');
  }
}

// WebRTC Stats Collector
class WebRTCStatsCollector extends EventTarget {
  constructor(pcId, peerConnection, config) {
    super();
    this.pcId = pcId;
    this.peerConnection = peerConnection;
    this.config = config;
    this.collectionInterval = null;
    this.recentAlerts = [];
  }

  startCollection() {
    this.collectionInterval = setInterval(async () => {
      try {
        const stats = await this.collectStats();
        this.processStats(stats);
      } catch (error) {
        console.error(`Error collecting stats for PC ${this.pcId}:`, error);
      }
    }, this.config.collectionInterval);
  }

  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  async collectStats() {
    const stats = await this.peerConnection.getStats();
    const processedStats = this.processRawStats(stats);
    
    return {
      pcId: this.pcId,
      timestamp: Date.now(),
      ...processedStats
    };
  }

  processRawStats(stats) {
    const result = {
      connectionState: this.peerConnection.connectionState,
      iceConnectionState: this.peerConnection.iceConnectionState,
      iceGatheringState: this.peerConnection.iceGatheringState,
      signalingState: this.peerConnection.signalingState
    };
    
    // Process inbound-rtp stats
    stats.forEach(report => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'video') {
            result.videoPacketsReceived = report.packetsReceived;
            result.videoPacketsLost = report.packetsLost;
            result.videoBytesReceived = report.bytesReceived;
            result.videoJitter = report.jitter;
            result.videoFramerate = report.framerateMean;
          } else if (report.mediaType === 'audio') {
            result.audioPacketsReceived = report.packetsReceived;
            result.audioPacketsLost = report.packetsLost;
            result.audioBytesReceived = report.bytesReceived;
            result.audioJitter = report.jitter;
            result.audioLevel = report.audioLevel;
          }
          break;
          
        case 'outbound-rtp':
          if (report.mediaType === 'video') {
            result.videoPacketsSent = report.packetsSent;
            result.videoBytesSent = report.bytesSent;
            result.videoBitrate = report.bitrateMean;
          } else if (report.mediaType === 'audio') {
            result.audioPacketsSent = report.packetsSent;
            result.audioBytesSent = report.bytesSent;
            result.audioBitrate = report.bitrateMean;
          }
          break;
          
        case 'remote-inbound-rtp':
          result.rtt = report.roundTripTime;
          break;
          
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            result.availableOutgoingBitrate = report.availableOutgoingBitrate;
            result.bytesReceived = report.bytesReceived;
            result.bytesSent = report.bytesSent;
            result.packetsLost = report.packetsLost;
          }
          break;
      }
    });
    
    // Calculate derived metrics
    result.totalPacketsReceived = (result.videoPacketsReceived || 0) + (result.audioPacketsReceived || 0);
    result.totalPacketsSent = (result.videoPacketsSent || 0) + (result.audioPacketsSent || 0);
    result.totalPacketsLost = (result.videoPacketsLost || 0) + (result.audioPacketsLost || 0);
    result.totalBytesReceived = (result.videoBytesReceived || 0) + (result.audioBytesReceived || 0);
    result.totalBytesSent = (result.videoBytesSent || 0) + (result.audioBytesSent || 0);
    
    result.packetsLostPercentage = result.totalPacketsReceived > 0 
      ? (result.totalPacketsLost / result.totalPacketsReceived) * 100 
      : 0;
    
    return result;
  }

  processStats(stats) {
    // Check for alerts
    this.checkAlerts(stats);
    
    // Dispatch stats event
    this.dispatchEvent(new CustomEvent('statsCollected', { detail: stats }));
  }

  checkAlerts(stats) {
    const alerts = [];
    
    // Check for high packet loss
    if (stats.packetsLostPercentage > 3) {
      alerts.push({
        type: 'packet_loss',
        severity: 'high',
        message: `High packet loss: ${stats.packetsLostPercentage.toFixed(2)}%`,
        value: stats.packetsLostPercentage
      });
    }
    
    // Check for high latency
    if (stats.rtt > 300) {
      alerts.push({
        type: 'latency',
        severity: 'medium',
        message: `High round-trip time: ${stats.rtt}ms`,
        value: stats.rtt
      });
    }
    
    // Check for connection issues
    if (stats.iceConnectionState === 'disconnected' || stats.iceConnectionState === 'failed') {
      alerts.push({
        type: 'connection',
        severity: 'critical',
        message: `Connection state: ${stats.iceConnectionState}`,
        value: stats.iceConnectionState
      });
    }
    
    // Store and dispatch alerts
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        this.recentAlerts.push({ ...alert, timestamp: Date.now() });
        this.dispatchEvent(new CustomEvent('alert', { detail: alert }));
      });
      
      // Keep only recent alerts
      if (this.recentAlerts.length > 10) {
        this.recentAlerts.shift();
      }
    }
  }

  getRecentAlerts() {
    const cutoff = Date.now() - 60000; // Last minute
    return this.recentAlerts.filter(alert => alert.timestamp >= cutoff);
  }
}

// Automation Rule
class AutomationRule {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.condition = config.condition;
    this.actions = config.actions;
    this.enabled = true;
    this.executionCount = 0;
    this.lastExecuted = null;
  }

  evaluate(stats) {
    if (!this.enabled) return false;
    
    switch (this.condition.type) {
      case 'threshold':
        return this.evaluateThreshold(stats);
      case 'state':
        return this.evaluateState(stats);
      case 'trend':
        return this.evaluateTrend(stats);
      default:
        return false;
    }
  }

  evaluateThreshold(stats) {
    const { metric, operator, value } = this.condition;
    const statValue = stats[metric];
    
    if (statValue === undefined) return false;
    
    switch (operator) {
      case '>': return statValue > value;
      case '<': return statValue < value;
      case '>=': return statValue >= value;
      case '<=': return statValue <= value;
      case '==': return statValue === value;
      case '!=': return statValue !== value;
      default: return false;
    }
  }

  evaluateState(stats) {
    const { metric, operator, value } = this.condition;
    const statValue = stats[metric];
    
    return statValue === value;
  }

  evaluateTrend(stats) {
    // This would require historical data for trend analysis
    // For now, return false
    return false;
  }

  execute() {
    this.executionCount++;
    this.lastExecuted = Date.now();
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      condition: this.condition,
      actions: this.actions,
      enabled: this.enabled,
      executionCount: this.executionCount,
      lastExecuted: this.lastExecuted
    };
  }
}

// WebRTC Stats Analysis Engine
class WebRTCStatsAnalysisEngine {
  constructor() {
    this.isInitialized = false;
    this.lastAnalysis = new Map();
  }

  async initialize() {
    this.isInitialized = true;
  }

  async analyze(pcId, history) {
    if (history.length < 10) {
      throw new Error('Insufficient data for analysis');
    }
    
    const analysis = {
      pcId,
      timestamp: Date.now(),
      quality: this.analyzeQuality(history),
      stability: this.analyzeStability(history),
      performance: this.analyzePerformance(history),
      recommendations: this.generateRecommendations(history)
    };
    
    this.lastAnalysis.set(pcId, analysis);
    return analysis;
  }

  analyzeQuality(history) {
    const recent = history.slice(-30);
    
    const avgPacketLoss = recent.reduce((sum, h) => sum + (h.packetsLostPercentage || 0), 0) / recent.length;
    const avgRtt = recent.reduce((sum, h) => sum + (h.rtt || 0), 0) / recent.length;
    const avgJitter = recent.reduce((sum, h) => sum + (h.jitter || 0), 0) / recent.length;
    
    let score = 100;
    if (avgPacketLoss > 2) score -= 30;
    else if (avgPacketLoss > 1) score -= 15;
    
    if (avgRtt > 200) score -= 25;
    else if (avgRtt > 100) score -= 10;
    
    if (avgJitter > 30) score -= 20;
    else if (avgJitter > 15) score -= 10;
    
    return {
      score: Math.max(0, score),
      grade: this.getGrade(score),
      factors: {
        packetLoss: avgPacketLoss,
        latency: avgRtt,
        jitter: avgJitter
      }
    };
  }

  analyzeStability(history) {
    const connectionStates = history.map(h => h.iceConnectionState);
    const stateChanges = this.countStateChanges(connectionStates);
    
    const disconnections = connectionStates.filter(state => 
      state === 'disconnected' || state === 'failed'
    ).length;
    
    const stabilityScore = Math.max(0, 100 - (stateChanges * 10) - (disconnections * 20));
    
    return {
      score: stabilityScore,
      grade: this.getGrade(stabilityScore),
      stateChanges,
      disconnections,
      uptime: this.calculateUptime(connectionStates)
    };
  }

  analyzePerformance(history) {
    const recent = history.slice(-30);
    
    const throughput = this.calculateThroughput(recent);
    const efficiency = this.calculateEfficiency(recent);
    
    return {
      throughput,
      efficiency,
      trend: this.calculateTrend(recent)
    };
  }

  generateRecommendations(history) {
    const recommendations = [];
    const recent = history.slice(-10);
    
    const avgPacketLoss = recent.reduce((sum, h) => sum + (h.packetsLostPercentage || 0), 0) / recent.length;
    const avgRtt = recent.reduce((sum, h) => sum + (h.rtt || 0), 0) / recent.length;
    
    if (avgPacketLoss > 2) {
      recommendations.push({
        priority: 'high',
        type: 'network',
        message: 'High packet loss detected, consider reducing bitrate',
        action: 'reduce_bitrate'
      });
    }
    
    if (avgRtt > 200) {
      recommendations.push({
        priority: 'medium',
        type: 'network',
        message: 'High latency detected, check network connection',
        action: 'check_network'
      });
    }
    
    return recommendations;
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  countStateChanges(states) {
    let changes = 0;
    for (let i = 1; i < states.length; i++) {
      if (states[i] !== states[i - 1]) {
        changes++;
      }
    }
    return changes;
  }

  calculateUptime(states) {
    const connectedStates = states.filter(state => 
      state === 'connected' || state === 'completed'
    ).length;
    
    return (connectedStates / states.length) * 100;
  }

  calculateThroughput(history) {
    if (history.length < 2) return 0;
    
    const first = history[0];
    const last = history[history.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    
    if (timeDiff === 0) return 0;
    
    const bytesReceived = last.totalBytesReceived - first.totalBytesReceived;
    const bytesSent = last.totalBytesSent - first.totalBytesSent;
    
    return {
      download: (bytesReceived * 8) / timeDiff / 1000, // Mbps
      upload: (bytesSent * 8) / timeDiff / 1000 // Mbps
    };
  }

  calculateEfficiency(history) {
    const recent = history.slice(-10);
    
    const packetsReceived = recent.reduce((sum, h) => sum + (h.totalPacketsReceived || 0), 0);
    const packetsLost = recent.reduce((sum, h) => sum + (h.totalPacketsLost || 0), 0);
    
    const efficiency = packetsReceived > 0 
      ? ((packetsReceived - packetsLost) / packetsReceived) * 100 
      : 0;
    
    return {
      packetEfficiency: efficiency,
      grade: this.getGrade(efficiency)
    };
  }

  calculateTrend(history) {
    // Simple trend calculation
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, h) => sum + (h.rtt || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + (h.rtt || 0), 0) / older.length;
    
    const change = recentAvg - olderAvg;
    
    return {
      direction: change > 10 ? 'degrading' : change < -10 ? 'improving' : 'stable',
      change
    };
  }

  getLastAnalysis(pcId) {
    return this.lastAnalysis.get(pcId);
  }
}

export { WebRTCStatsAutomationService };
