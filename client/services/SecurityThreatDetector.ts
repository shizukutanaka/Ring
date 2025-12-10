// Security Threat Detection Service
// Real-time threat detection and prevention for WebRTC communications

interface SecurityThreat {
  id: string;
  type: 'mitm' | 'spoofing' | 'dos' | 'malware' | 'data_leak' | 'unauthorized_access' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  description: string;
  source: string;
  timestamp: number;
  indicators: string[];
  mitigation: string;
  autoResponse: boolean;
}

interface SecurityMetrics {
  totalThreats: number;
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  blockedConnections: number;
  suspiciousActivities: number;
  responseTime: number;
  falsePositiveRate: number;
}

interface NetworkBehavior {
  endpointId: string;
  connectionTime: number;
  packetsTransmitted: number;
  packetsReceived: number;
  bytesTransmitted: number;
  bytesReceived: number;
  connectionAttempts: number;
  failedAttempts: number;
  protocolAnomalies: number;
  geoLocation: {
    country: string;
    region: string;
    isKnownProxy: boolean;
    isTorExit: boolean;
    riskScore: number;
  };
}

interface SecurityPolicy {
  id: string;
  name: string;
  enabled: boolean;
  rules: SecurityRule[];
  responseActions: ResponseAction[];
}

interface SecurityRule {
  id: string;
  name: string;
  type: 'network' | 'behavior' | 'content' | 'authentication' | 'encryption';
  condition: string;
  threshold?: number;
  timeframe?: number; // seconds
  enabled: boolean;
}

interface ResponseAction {
  type: 'block' | 'alert' | 'quarantine' | 'escalate' | 'log' | 'notify';
  parameters: Record<string, any>;
  automatic: boolean;
}

class SecurityThreatDetector extends EventTarget {
  private threats: SecurityThreat[] = [];
  private networkBehaviors: Map<string, NetworkBehavior> = new Map();
  private securityPolicies: SecurityPolicy[] = [];
  private metrics: SecurityMetrics;
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private mlModel: ThreatDetectionModel | null = null;
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private geoIPDatabase: Map<string, GeoIPData> = new Map();
  
  private readonly maxThreatHistory = 1000;
  private readonly maxBehaviorHistory = 10000;
  private readonly analysisIntervalMs = 5000;
  private readonly threatThresholds = {
    connectionAttempts: 10, // per minute
    failureRate: 0.3, // 30%
    anomalyScore: 0.7,
    geoRiskScore: 0.8
  };

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.initializeSecurityPolicies();
    this.loadThreatPatterns();
    this.initializeMLModel();
    this.startMonitoring();
  }

  // Initialize security metrics
  private initializeMetrics(): SecurityMetrics {
    return {
      totalThreats: 0,
      threatsByType: {},
      threatsBySeverity: {},
      blockedConnections: 0,
      suspiciousActivities: 0,
      responseTime: 0,
      falsePositiveRate: 0
    };
  }

  // Initialize default security policies
  private initializeSecurityPolicies(): void {
    this.securityPolicies = [
      {
        id: 'brute_force_protection',
        name: 'Brute Force Attack Protection',
        enabled: true,
        rules: [
          {
            id: 'connection_attempts',
            name: 'Excessive Connection Attempts',
            type: 'network',
            condition: 'connection_attempts > threshold',
            threshold: this.threatThresholds.connectionAttempts,
            timeframe: 60,
            enabled: true
          },
          {
            id: 'high_failure_rate',
            name: 'High Authentication Failure Rate',
            type: 'authentication',
            condition: 'failure_rate > threshold',
            threshold: this.threatThresholds.failureRate,
            timeframe: 300,
            enabled: true
          }
        ],
        responseActions: [
          { type: 'block', parameters: { duration: 300 }, automatic: true },
          { type: 'alert', parameters: { severity: 'high' }, automatic: true },
          { type: 'log', parameters: { level: 'critical' }, automatic: true }
        ]
      },
      {
        id: 'anomaly_detection',
        name: 'Behavioral Anomaly Detection',
        enabled: true,
        rules: [
          {
            id: 'unusual_traffic',
            name: 'Unusual Traffic Patterns',
            type: 'behavior',
            condition: 'anomaly_score > threshold',
            threshold: this.threatThresholds.anomalyScore,
            enabled: true
          },
          {
            id: 'geo_risk',
            name: 'High-Risk Geographic Location',
            type: 'network',
            condition: 'geo_risk_score > threshold',
            threshold: this.threatThresholds.geoRiskScore,
            enabled: true
          }
        ],
        responseActions: [
          { type: 'quarantine', parameters: { review_required: true }, automatic: false },
          { type: 'alert', parameters: { severity: 'medium' }, automatic: true },
          { type: 'escalate', parameters: { level: 2 }, automatic: false }
        ]
      },
      {
        id: 'data_protection',
        name: 'Data Leakage Protection',
        enabled: true,
        rules: [
          {
            id: 'unusual_data_transfer',
            name: 'Unusual Data Transfer Volume',
            type: 'content',
            condition: 'bytes_transferred > threshold',
            threshold: 100 * 1024 * 1024, // 100MB
            timeframe: 600, // 10 minutes
            enabled: true
          },
          {
            id: 'sensitive_data_access',
            name: 'Sensitive Data Access Pattern',
            type: 'content',
            condition: 'sensitive_data_accessed AND not_authorized',
            enabled: true
          }
        ],
        responseActions: [
          { type: 'block', parameters: { immediate: true }, automatic: true },
          { type: 'alert', parameters: { severity: 'critical' }, automatic: true },
          { type: 'notify', parameters: { channels: ['security_team', 'compliance'] }, automatic: true }
        ]
      }
    ];
  }

  // Load known threat patterns
  private loadThreatPatterns(): void {
    const patterns: ThreatPattern[] = [
      {
        id: 'ddos_pattern',
        name: 'DDoS Attack Pattern',
        indicators: ['high_connection_rate', 'repeated_requests', 'resource_exhaustion'],
        weights: [0.3, 0.4, 0.3],
        threshold: 0.8
      },
      {
        id: 'mitm_pattern',
        name: 'Man-in-the-Middle Pattern',
        indicators: ['certificate_anomaly', 'unexpected_route', 'timing_anomaly'],
        weights: [0.4, 0.3, 0.3],
        threshold: 0.7
      },
      {
        id: 'spoofing_pattern',
        name: 'IP Spoofing Pattern',
        indicators: ['inconsistent_geo', 'impossible_routing', 'identity_mismatch'],
        weights: [0.3, 0.4, 0.3],
        threshold: 0.75
      },
      {
        id: 'data_exfiltration',
        name: 'Data Exfiltration Pattern',
        indicators: ['large_transfer', 'unusual_timing', 'sensitive_content'],
        weights: [0.3, 0.2, 0.5],
        threshold: 0.8
      }
    ];

    patterns.forEach(pattern => {
      this.threatPatterns.set(pattern.id, pattern);
    });
  }

  // Initialize ML model for threat detection
  private initializeMLModel(): void {
    this.mlModel = new ThreatDetectionModel();
    
    // Train with historical data (simplified)
    this.mlModel.train([
      { features: [0.1, 0.2, 0.3], label: 0 }, // Normal
      { features: [0.8, 0.9, 0.7], label: 1 }, // Threat
      { features: [0.2, 0.1, 0.4], label: 0 }, // Normal
      { features: [0.9, 0.8, 0.9], label: 1 }, // Threat
    ]);
  }

  // Start security monitoring
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSecurityMetrics();
    }, 1000); // Collect every second

    this.analysisInterval = setInterval(() => {
      this.analyzeThreats();
      this.updateMetrics();
    }, this.analysisIntervalMs);
  }

  // Collect security metrics from network and system
  private collectSecurityMetrics(): void {
    // This would integrate with actual WebRTC and system APIs
    // For now, we'll simulate data collection
    
    const endpoints = this.getMonitoredEndpoints();
    
    endpoints.forEach(endpoint => {
      this.updateNetworkBehavior(endpoint);
    });
  }

  // Get monitored endpoints (WebRTC peers, servers, etc.)
  private getMonitoredEndpoints(): string[] {
    // This would return actual WebRTC connection endpoints
    return ['peer-1', 'peer-2', 'server-1', 'server-2'];
  }

  // Update network behavior for endpoint
  private updateNetworkBehavior(endpointId: string): void {
    let behavior = this.networkBehaviors.get(endpointId);
    
    if (!behavior) {
      behavior = {
        endpointId,
        connectionTime: Date.now(),
        packetsTransmitted: 0,
        packetsReceived: 0,
        bytesTransmitted: 0,
        bytesReceived: 0,
        connectionAttempts: 0,
        failedAttempts: 0,
        protocolAnomalies: 0,
        geoLocation: this.getGeoLocation(endpointId)
      };
      this.networkBehaviors.set(endpointId, behavior);
    }

    // Simulate metric updates
    behavior.packetsTransmitted += Math.floor(Math.random() * 100);
    behavior.packetsReceived += Math.floor(Math.random() * 100);
    behavior.bytesTransmitted += Math.floor(Math.random() * 1000);
    behavior.bytesReceived += Math.floor(Math.random() * 1000);
    
    // Randomly update failure attempts
    if (Math.random() < 0.05) {
      behavior.failedAttempts++;
    }

    // Check for protocol anomalies
    if (Math.random() < 0.02) {
      behavior.protocolAnomalies++;
    }
  }

  // Get geographic location for endpoint
  private getGeoLocation(endpointId: string): NetworkBehavior['geoLocation'] {
    // Simulate geo IP lookup
    const locations = [
      { country: 'US', region: 'California', isKnownProxy: false, isTorExit: false, riskScore: 0.1 },
      { country: 'CN', region: 'Beijing', isKnownProxy: true, isTorExit: false, riskScore: 0.7 },
      { country: 'RU', region: 'Moscow', isTorExit: true, riskScore: 0.9 },
      { country: 'DE', region: 'Berlin', isKnownProxy: false, isTorExit: false, riskScore: 0.2 }
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // Analyze threats using multiple detection methods
  private analyzeThreats(): void {
    const detectedThreats: SecurityThreat[] = [];

    // Rule-based detection
    detectedThreats.push(...this.detectRuleBasedThreats());

    // Pattern-based detection
    detectedThreats.push(...this.detectPatternBasedThreats());

    // ML-based detection
    if (this.mlModel) {
      detectedThreats.push(...this.detectMLBasedThreats());
    }

    // Behavioral anomaly detection
    detectedThreats.push(...this.detectBehavioralAnomalies());

    // Process detected threats
    detectedThreats.forEach(threat => {
      this.processThreat(threat);
    });
  }

  // Rule-based threat detection
  private detectRuleBasedThreats(): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    this.securityPolicies.forEach(policy => {
      if (!policy.enabled) return;

      policy.rules.forEach(rule => {
        if (!rule.enabled) return;

        const detectedThreats = this.evaluateRule(rule);
        threats.push(...detectedThreats);
      });
    });

    return threats;
  }

  // Evaluate individual security rule
  private evaluateRule(rule: SecurityRule): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    switch (rule.type) {
      case 'network':
        threats.push(...this.evaluateNetworkRule(rule));
        break;
      case 'behavior':
        threats.push(...this.evaluateBehaviorRule(rule));
        break;
      case 'authentication':
        threats.push(...this.evaluateAuthRule(rule));
        break;
      case 'content':
        threats.push(...this.evaluateContentRule(rule));
        break;
    }

    return threats;
  }

  // Evaluate network-based rules
  private evaluateNetworkRule(rule: SecurityRule): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (rule.id === 'connection_attempts') {
      this.networkBehaviors.forEach((behavior, endpointId) => {
        const recentAttempts = this.getRecentConnectionAttempts(endpointId, rule.timeframe);
        
        if (recentAttempts > (rule.threshold || 10)) {
          threats.push(this.createThreat('dos', 'high', 0.8,
            `Excessive connection attempts from ${endpointId}: ${recentAttempts}`,
            endpointId,
            ['high_connection_rate', 'potential_ddos'],
            'Rate limiting and connection monitoring'));
        }
      });
    }

    if (rule.id === 'geo_risk') {
      this.networkBehaviors.forEach((behavior, endpointId) => {
        if (behavior.geoLocation.riskScore > (rule.threshold || 0.8)) {
          threats.push(this.createThreat('unauthorized_access', 'medium', 0.7,
            `High-risk geographic location: ${behavior.geoLocation.country}`,
            endpointId,
            ['high_risk_geo', 'proxy_or_tor'],
            'Enhanced monitoring and verification'));
        }
      });
    }

    return threats;
  }

  // Evaluate behavior-based rules
  private evaluateBehaviorRule(rule: SecurityRule): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (rule.id === 'unusual_traffic') {
      this.networkBehaviors.forEach((behavior, endpointId) => {
        const anomalyScore = this.calculateAnomalyScore(behavior);
        
        if (anomalyScore > (rule.threshold || 0.7)) {
          threats.push(this.createThreat('anomaly', 'medium', anomalyScore,
            `Unusual traffic patterns detected from ${endpointId}`,
            endpointId,
            ['traffic_anomaly', 'behavioral_deviation'],
            'Behavioral analysis and pattern verification'));
        }
      });
    }

    return threats;
  }

  // Evaluate authentication rules
  private evaluateAuthRule(rule: SecurityRule): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (rule.id === 'high_failure_rate') {
      this.networkBehaviors.forEach((behavior, endpointId) => {
        const failureRate = this.calculateFailureRate(behavior, rule.timeframe);
        
        if (failureRate > (rule.threshold || 0.3)) {
          threats.push(this.createThreat('spoofing', 'high', failureRate,
            `High authentication failure rate from ${endpointId}: ${(failureRate * 100).toFixed(1)}%`,
            endpointId,
            ['auth_failures', 'potential_brute_force'],
            'Account lockout and enhanced authentication'));
        }
      });
    }

    return threats;
  }

  // Evaluate content-based rules
  private evaluateContentRule(rule: SecurityRule): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (rule.id === 'unusual_data_transfer') {
      this.networkBehaviors.forEach((behavior, endpointId) => {
        const recentTransfer = this.getRecentDataTransfer(endpointId, rule.timeframe);
        const threshold = rule.threshold || (100 * 1024 * 1024); // 100MB
        
        if (recentTransfer > threshold) {
          threats.push(this.createThreat('data_leak', 'high', 0.8,
            `Unusual data transfer volume from ${endpointId}: ${this.formatBytes(recentTransfer)}`,
            endpointId,
            ['large_transfer', 'potential_exfiltration'],
            'Transfer monitoring and content inspection'));
        }
      });
    }

    return threats;
  }

  // Pattern-based threat detection
  private detectPatternBasedThreats(): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    this.threatPatterns.forEach((pattern, patternId) => {
      const matchingEndpoints = this.findMatchingEndpoints(pattern);
      
      matchingEndpoints.forEach(({ endpointId, score }) => {
        if (score > pattern.threshold) {
          threats.push(this.createThreat('anomaly', 'medium', score,
            `${pattern.name} detected from ${endpointId}`,
            endpointId,
            pattern.indicators,
            'Pattern-based response and monitoring'));
        }
      });
    });

    return threats;
  }

  // Find endpoints matching threat patterns
  private findMatchingEndpoints(pattern: ThreatPattern): Array<{ endpointId: string; score: number }> {
    const matches: Array<{ endpointId: string; score: number }> = [];

    this.networkBehaviors.forEach((behavior, endpointId) => {
      const indicators = this.extractIndicators(behavior);
      const score = this.calculatePatternScore(indicators, pattern);
      
      if (score > 0) {
        matches.push({ endpointId, score });
      }
    });

    return matches;
  }

  // Extract indicators from network behavior
  private extractIndicators(behavior: NetworkBehavior): Record<string, number> {
    return {
      high_connection_rate: behavior.connectionAttempts / 10, // Normalized
      repeated_requests: behavior.packetsTransmitted / 1000,
      resource_exhaustion: (behavior.bytesTransmitted + behavior.bytesReceived) / (1024 * 1024),
      certificate_anomaly: behavior.protocolAnomalies / 10,
      unexpected_route: behavior.geoLocation.isKnownProxy ? 1 : 0,
      timing_anomaly: Math.random(), // Would be calculated from timing data
      inconsistent_geo: behavior.geoLocation.isTorExit ? 1 : 0,
      impossible_routing: 0, // Would be calculated from routing analysis
      identity_mismatch: 0, // Would be calculated from identity verification
      large_transfer: (behavior.bytesTransmitted + behavior.bytesReceived) / (100 * 1024 * 1024),
      unusual_timing: Math.random(), // Would be calculated from timing patterns
      sensitive_content: 0 // Would be calculated from content inspection
    };
  }

  // Calculate pattern matching score
  private calculatePatternScore(indicators: Record<string, number>, pattern: ThreatPattern): number {
    let score = 0;
    
    pattern.indicators.forEach((indicator, index) => {
      const value = indicators[indicator] || 0;
      const weight = pattern.weights[index] || 0;
      score += value * weight;
    });

    return Math.min(1, score);
  }

  // ML-based threat detection
  private detectMLBasedThreats(): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    if (!this.mlModel) return threats;

    this.networkBehaviors.forEach((behavior, endpointId) => {
      const features = this.extractFeatures(behavior);
      const prediction = this.mlModel.predict(features);
      
      if (prediction > 0.7) { // High confidence threat
        threats.push(this.createThreat('anomaly', 'high', prediction,
          `ML model detected threat from ${endpointId}`,
          endpointId,
          ['ml_detected_anomaly'],
          'ML-based threat response'));
      }
    });

    return threats;
  }

  // Extract features for ML model
  private extractFeatures(behavior: NetworkBehavior): number[] {
    return [
      behavior.connectionAttempts / 100,
      behavior.failedAttempts / Math.max(1, behavior.connectionAttempts),
      behavior.protocolAnomalies / 10,
      behavior.geoLocation.riskScore,
      (behavior.bytesTransmitted + behavior.bytesReceived) / (1024 * 1024),
      behavior.packetsTransmitted / 10000,
      behavior.geoLocation.isKnownProxy ? 1 : 0,
      behavior.geoLocation.isTorExit ? 1 : 0
    ];
  }

  // Detect behavioral anomalies
  private detectBehavioralAnomalies(): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Analyze each endpoint's behavior against baseline
    this.networkBehaviors.forEach((behavior, endpointId) => {
      const baseline = this.calculateBaselineBehavior(endpointId);
      const deviation = this.calculateBehavioralDeviation(behavior, baseline);
      
      if (deviation > 0.8) {
        threats.push(this.createThreat('anomaly', 'medium', deviation,
          `Behavioral anomaly detected from ${endpointId}`,
          endpointId,
          ['behavioral_deviation'],
          'Behavioral analysis and baseline adjustment'));
      }
    });

    return threats;
  }

  // Calculate baseline behavior for endpoint
  private calculateBaselineBehavior(endpointId: string): Partial<NetworkBehavior> {
    // This would calculate historical baseline
    // For now, return reasonable defaults
    return {
      packetsTransmitted: 500,
      packetsReceived: 500,
      bytesTransmitted: 50000,
      bytesReceived: 50000,
      connectionAttempts: 5,
      failedAttempts: 0.5,
      protocolAnomalies: 0.1
    };
  }

  // Calculate behavioral deviation
  private calculateBehavioralDeviation(current: NetworkBehavior, baseline: Partial<NetworkBehavior>): number {
    const deviations = [
      Math.abs(current.packetsTransmitted - (baseline.packetsTransmitted || 0)) / (baseline.packetsTransmitted || 1),
      Math.abs(current.bytesTransmitted - (baseline.bytesTransmitted || 0)) / (baseline.bytesTransmitted || 1),
      Math.abs(current.connectionAttempts - (baseline.connectionAttempts || 0)) / (baseline.connectionAttempts || 1),
      Math.abs(current.failedAttempts - (baseline.failedAttempts || 0)) / (baseline.failedAttempts || 1)
    ];

    return deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
  }

  // Process detected threat
  private processThreat(threat: SecurityThreat): void {
    // Check if this is a duplicate threat
    const isDuplicate = this.threats.some(existing => 
      existing.type === threat.type && 
      existing.source === threat.source && 
      (Date.now() - existing.timestamp) < 30000 // 30 seconds
    );

    if (isDuplicate) return;

    // Add to threats list
    this.threats.push(threat);
    this.maintainThreatHistory();

    // Update metrics
    this.updateThreatMetrics(threat);

    // Execute response actions
    if (threat.autoResponse) {
      this.executeResponseActions(threat);
    }

    // Dispatch event
    this.dispatchEvent(new CustomEvent('threatDetected', {
      detail: threat
    }));
  }

  // Create threat object
  private createThreat(type: SecurityThreat['type'], 
                      severity: SecurityThreat['severity'],
                      confidence: number,
                      description: string,
                      source: string,
                      indicators: string[],
                      mitigation: string,
                      autoResponse: boolean = true): SecurityThreat {
    return {
      id: `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      confidence,
      description,
      source,
      timestamp: Date.now(),
      indicators,
      mitigation,
      autoResponse
    };
  }

  // Execute response actions for threat
  private executeResponseActions(threat: SecurityThreat): void {
    const relevantPolicies = this.securityPolicies.filter(policy => 
      policy.enabled && this.isPolicyRelevant(policy, threat)
    );

    relevantPolicies.forEach(policy => {
      policy.responseActions.forEach(action => {
        if (action.automatic) {
          this.executeAction(action, threat);
        }
      });
    });
  }

  // Check if policy is relevant to threat
  private isPolicyRelevant(policy: SecurityPolicy, threat: SecurityThreat): boolean {
    // Simple relevance check - could be more sophisticated
    return policy.rules.some(rule => rule.enabled);
  }

  // Execute individual response action
  private executeAction(action: ResponseAction, threat: SecurityThreat): void {
    switch (action.type) {
      case 'block':
        this.blockEndpoint(threat.source, action.parameters.duration || 300);
        break;
      case 'alert':
        this.sendAlert(threat, action.parameters.severity || 'medium');
        break;
      case 'quarantine':
        this.quarantineEndpoint(threat.source, action.parameters.review_required || false);
        break;
      case 'escalate':
        this.escalateThreat(threat, action.parameters.level || 1);
        break;
      case 'log':
        this.logThreat(threat, action.parameters.level || 'info');
        break;
      case 'notify':
        this.notifyStakeholders(threat, action.parameters.channels || []);
        break;
    }
  }

  // Response action implementations
  private blockEndpoint(endpointId: string, duration: number): void {
    this.metrics.blockedConnections++;
    
    this.dispatchEvent(new CustomEvent('endpointBlocked', {
      detail: { endpointId, duration, timestamp: Date.now() }
    }));
  }

  private sendAlert(threat: SecurityThreat, severity: string): void {
    this.dispatchEvent(new CustomEvent('securityAlert', {
      detail: { threat, severity, timestamp: Date.now() }
    }));
  }

  private quarantineEndpoint(endpointId: string, reviewRequired: boolean): void {
    this.dispatchEvent(new CustomEvent('endpointQuarantined', {
      detail: { endpointId, reviewRequired, timestamp: Date.now() }
    }));
  }

  private escalateThreat(threat: SecurityThreat, level: number): void {
    this.dispatchEvent(new CustomEvent('threatEscalated', {
      detail: { threat, level, timestamp: Date.now() }
    }));
  }

  private logThreat(threat: SecurityThreat, level: string): void {
    console.log(`[${level.toUpperCase()}] Security Threat: ${threat.description}`);
  }

  private notifyStakeholders(threat: SecurityThreat, channels: string[]): void {
    this.dispatchEvent(new CustomEvent('stakeholderNotification', {
      detail: { threat, channels, timestamp: Date.now() }
    }));
  }

  // Utility methods
  private getRecentConnectionAttempts(endpointId: string, timeframe?: number): number {
    // This would calculate recent connection attempts
    // For now, return simulated value
    const behavior = this.networkBehaviors.get(endpointId);
    return behavior ? behavior.connectionAttempts : 0;
  }

  private getRecentDataTransfer(endpointId: string, timeframe?: number): number {
    const behavior = this.networkBehaviors.get(endpointId);
    return behavior ? behavior.bytesTransmitted + behavior.bytesReceived : 0;
  }

  private calculateFailureRate(behavior: NetworkBehavior, timeframe?: number): number {
    const total = behavior.connectionAttempts;
    const failed = behavior.failedAttempts;
    return total > 0 ? failed / total : 0;
  }

  private calculateAnomalyScore(behavior: NetworkBehavior): number {
    // Simplified anomaly calculation
    const factors = [
      behavior.protocolAnomalies / 10,
      behavior.failedAttempts / Math.max(1, behavior.connectionAttempts),
      behavior.geoLocation.riskScore
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private maintainThreatHistory(): void {
    if (this.threats.length > this.maxThreatHistory) {
      this.threats = this.threats.slice(-this.maxThreatHistory);
    }
  }

  private updateThreatMetrics(threat: SecurityThreat): void {
    this.metrics.totalThreats++;
    this.metrics.threatsByType[threat.type] = (this.metrics.threatsByType[threat.type] || 0) + 1;
    this.metrics.threatsBySeverity[threat.severity] = (this.metrics.threatsBySeverity[threat.severity] || 0) + 1;
  }

  private updateMetrics(): void {
    // Update response time, false positive rate, etc.
    this.metrics.responseTime = this.calculateAverageResponseTime();
    this.metrics.falsePositiveRate = this.calculateFalsePositiveRate();
  }

  private calculateAverageResponseTime(): number {
    // This would calculate actual response time
    return 150; // ms
  }

  private calculateFalsePositiveRate(): number {
    // This would calculate actual false positive rate
    return 0.05; // 5%
  }

  // Public API methods
  public getThreats(): SecurityThreat[] {
    return [...this.threats];
  }

  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public getNetworkBehaviors(): NetworkBehavior[] {
    return Array.from(this.networkBehaviors.values());
  }

  public getSecurityPolicies(): SecurityPolicy[] {
    return [...this.securityPolicies];
  }

  public updatePolicy(policyId: string, updates: Partial<SecurityPolicy>): void {
    const policy = this.securityPolicies.find(p => p.id === policyId);
    if (policy) {
      Object.assign(policy, updates);
      this.dispatchEvent(new CustomEvent('policyUpdated', {
        detail: { policyId, updates }
      }));
    }
  }

  public addCustomThreat(threat: Omit<SecurityThreat, 'id' | 'timestamp'>): void {
    const fullThreat: SecurityThreat = {
      ...threat,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    this.processThreat(fullThreat);
  }

  public getSecurityReport(): {
    summary: SecurityMetrics;
    recentThreats: SecurityThreat[];
    topThreatTypes: Array<{ type: string; count: number }>;
    recommendations: string[];
  } {
    const recentThreats = this.threats.slice(-10);
    const topThreatTypes = Object.entries(this.metrics.threatsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const recommendations = this.generateRecommendations();

    return {
      summary: this.metrics,
      recentThreats,
      topThreatTypes,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.totalThreats > 50) {
      recommendations.push('High threat volume detected - consider enhancing security measures');
    }

    if (this.metrics.blockedConnections > 20) {
      recommendations.push('Multiple connections blocked - review network security policies');
    }

    const criticalThreats = this.metrics.threatsBySeverity.critical || 0;
    if (criticalThreats > 5) {
      recommendations.push('Critical threats detected - immediate security review required');
    }

    if (this.metrics.falsePositiveRate > 0.1) {
      recommendations.push('High false positive rate - adjust threat detection thresholds');
    }

    return recommendations;
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }
}

// Supporting interfaces and classes
interface ThreatPattern {
  id: string;
  name: string;
  indicators: string[];
  weights: number[];
  threshold: number;
}

interface GeoIPData {
  country: string;
  region: string;
  riskScore: number;
  isKnownProxy: boolean;
  isTorExit: boolean;
}

class ThreatDetectionModel {
  private weights: number[] = [];
  private bias: number = 0;

  train(data: Array<{ features: number[]; label: number }>): void {
    // Simplified training - in reality would use proper ML algorithm
    this.weights = [0.5, -0.3, 0.8, 0.2, -0.1, 0.6, -0.4, 0.3];
    this.bias = 0.1;
  }

  predict(features: number[]): number {
    // Simplified prediction
    const activation = features.reduce((sum, feature, index) => 
      sum + feature * (this.weights[index] || 0), 0) + this.bias;
    
    return 1 / (1 + Math.exp(-activation)); // Sigmoid
  }
}

export { SecurityThreatDetector, SecurityThreat, SecurityMetrics, NetworkBehavior, SecurityPolicy };
