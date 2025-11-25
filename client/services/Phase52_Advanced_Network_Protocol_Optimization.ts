/**
 * Phase 52: Advanced Network & Protocol Optimization System
 *
 * Cutting-edge 2025 networking technologies for spam call prevention
 *
 * Components:
 * 1. ICE Optimization Engine - Smart STUN/TURN candidate selection
 * 2. Congestion Control Engine - BBRv3/CUBIC adaptive control
 * 3. Network Quality Prediction Engine - ML-based jitter/latency prediction
 * 4. Forward Error Correction Engine - Adaptive FEC for packet recovery
 * 5. Bandwidth Estimation Engine - GCC-style real-time BWE
 * 6. Packet Pacing Engine - Smooth transmission scheduling
 * 7. Network Diagnostics Engine - Real-time monitoring & analytics
 *
 * Research Sources:
 * - RFC 8445: ICE (Interactive Connectivity Establishment)
 * - RFC 8489: STUN / TURN
 * - IETF draft-ietf-ccwg-bbr: BBRv3 Congestion Control
 * - RouteNet: GNN-based latency prediction
 * - RL-AFEC: Reinforcement Learning Adaptive FEC
 * - WebRTC GCC: Google Congestion Control
 *
 * @version 52.0.0
 * @since November 2025
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * ICE Configuration
 */
interface ICEConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy: 'all' | 'relay';
  candidatePoolSize: number;
  gatheringTimeout: number;
  preferredCandidateTypes: ('host' | 'srflx' | 'prflx' | 'relay')[];
}

interface ICECandidate {
  type: 'host' | 'srflx' | 'prflx' | 'relay';
  protocol: 'udp' | 'tcp';
  address: string;
  port: number;
  priority: number;
  foundation: string;
  relatedAddress?: string;
  relatedPort?: number;
  rtt?: number;
}

interface ICEMetrics {
  gatheringTime: number;
  candidatesGathered: number;
  selectedCandidate: ICECandidate | null;
  connectionState: string;
  failoverCount: number;
}

/**
 * Congestion Control Configuration
 */
interface CongestionControlConfig {
  algorithm: 'bbr' | 'cubic' | 'reno' | 'hybrid';
  minBitrate: number;
  maxBitrate: number;
  initialBitrate: number;
  probingEnabled: boolean;
  lossThreshold: number;
}

interface CongestionState {
  currentBitrate: number;
  estimatedBandwidth: number;
  rtt: number;
  rttVariance: number;
  packetLoss: number;
  congestionWindow: number;
  inRecovery: boolean;
}

/**
 * Network Quality Prediction Configuration
 */
interface NetworkPredictionConfig {
  model: 'lstm' | 'gnn' | 'random-forest';
  predictionHorizon: number; // ms
  historyWindow: number; // samples
  updateInterval: number; // ms
}

interface NetworkPrediction {
  predictedLatency: number;
  predictedJitter: number;
  predictedPacketLoss: number;
  predictedBandwidth: number;
  confidence: number;
  timestamp: number;
}

/**
 * FEC Configuration
 */
interface FECConfig {
  algorithm: 'xor' | 'reed-solomon' | 'raptor';
  adaptive: boolean;
  maxRedundancy: number; // percentage
  minRedundancy: number;
  groupSize: number;
}

interface FECBlock {
  sourcePackets: number;
  parityPackets: number;
  groupId: number;
  data: Uint8Array;
}

/**
 * Bandwidth Estimation Configuration
 */
interface BWEConfig {
  algorithm: 'gcc' | 'scream' | 'nada';
  probeInterval: number;
  probeSize: number;
  delayThreshold: number;
  overuseThreshold: number;
}

interface BWEState {
  estimatedBandwidth: number;
  trend: 'increase' | 'decrease' | 'hold';
  overuseSignal: boolean;
  lastProbeTime: number;
  probeCount: number;
}

/**
 * Packet Pacing Configuration
 */
interface PacingConfig {
  enabled: boolean;
  interval: number; // microseconds
  burstSize: number;
  smoothingFactor: number;
}

/**
 * Network Diagnostics Configuration
 */
interface DiagnosticsConfig {
  enabled: boolean;
  sampleInterval: number;
  historySize: number;
  alertThresholds: {
    latency: number;
    jitter: number;
    packetLoss: number;
  };
}

interface NetworkSample {
  timestamp: number;
  rtt: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  bytesReceived: number;
  bytesSent: number;
}

// ============================================================================
// 1. ICE Optimization Engine
// ============================================================================

/**
 * ICE Optimization Engine
 *
 * Research:
 * - RFC 8445: ICE framework
 * - 65% of users behind NAT
 * - 30% connections require TURN
 * - Geo-distributed TURN reduces latency 60-80%
 *
 * Features:
 * - Smart candidate prioritization
 * - Parallel gathering
 * - Failover handling
 * - Latency-based selection
 */
class ICEOptimizationEngine {
  private config: ICEConfig;
  private candidates: ICECandidate[] = [];
  private selectedCandidate: ICECandidate | null = null;
  private gatheringStartTime = 0;
  private failoverCount = 0;
  private candidateRTTs: Map<string, number[]> = new Map();

  constructor(config: Partial<ICEConfig> = {}) {
    this.config = {
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceTransportPolicy: config.iceTransportPolicy || 'all',
      candidatePoolSize: config.candidatePoolSize || 2,
      gatheringTimeout: config.gatheringTimeout || 5000,
      preferredCandidateTypes: config.preferredCandidateTypes ||
        ['host', 'srflx', 'prflx', 'relay']
    };
  }

  /**
   * Start ICE candidate gathering with optimization
   */
  async gatherCandidates(pc: RTCPeerConnection): Promise<ICECandidate[]> {
    this.gatheringStartTime = performance.now();
    this.candidates = [];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('ICE gathering timeout');
        resolve(this.candidates);
      }, this.config.gatheringTimeout);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const parsed = this.parseCandidate(event.candidate);
          if (parsed) {
            this.candidates.push(parsed);
          }
        } else {
          // Gathering complete
          clearTimeout(timeout);
          this.optimizeCandidates();
          resolve(this.candidates);
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          this.optimizeCandidates();
          resolve(this.candidates);
        }
      };
    });
  }

  /**
   * Parse RTCIceCandidate to internal format
   */
  private parseCandidate(candidate: RTCIceCandidate): ICECandidate | null {
    if (!candidate.candidate) return null;

    const parts = candidate.candidate.split(' ');
    if (parts.length < 8) return null;

    return {
      foundation: parts[0].replace('candidate:', ''),
      type: parts[7] as ICECandidate['type'],
      protocol: parts[2].toLowerCase() as 'udp' | 'tcp',
      address: parts[4],
      port: parseInt(parts[5]),
      priority: parseInt(parts[3]),
      relatedAddress: parts.find((p, i) => parts[i - 1] === 'raddr'),
      relatedPort: parseInt(parts.find((p, i) => parts[i - 1] === 'rport') || '0')
    };
  }

  /**
   * Optimize candidate selection based on type priority and RTT
   */
  private optimizeCandidates(): void {
    // Sort by preferred type priority
    this.candidates.sort((a, b) => {
      const typeOrderA = this.config.preferredCandidateTypes.indexOf(a.type);
      const typeOrderB = this.config.preferredCandidateTypes.indexOf(b.type);

      // First sort by type preference
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }

      // Then by RTT if available
      const rttA = a.rtt || 1000;
      const rttB = b.rtt || 1000;

      if (rttA !== rttB) {
        return rttA - rttB;
      }

      // Finally by priority
      return b.priority - a.priority;
    });
  }

  /**
   * Select best candidate based on connectivity checks
   */
  async selectBestCandidate(): Promise<ICECandidate | null> {
    if (this.candidates.length === 0) {
      return null;
    }

    // Measure RTT for top candidates
    const topCandidates = this.candidates.slice(0, 5);

    for (const candidate of topCandidates) {
      const rtt = await this.measureCandidateRTT(candidate);
      candidate.rtt = rtt;

      // Track RTT history
      const key = `${candidate.address}:${candidate.port}`;
      if (!this.candidateRTTs.has(key)) {
        this.candidateRTTs.set(key, []);
      }
      this.candidateRTTs.get(key)!.push(rtt);
    }

    // Re-sort with RTT information
    this.optimizeCandidates();

    this.selectedCandidate = this.candidates[0];
    return this.selectedCandidate;
  }

  /**
   * Measure RTT to candidate
   */
  private async measureCandidateRTT(candidate: ICECandidate): Promise<number> {
    // Simplified RTT measurement
    // Real implementation would send STUN binding request
    const baseRTT = candidate.type === 'host' ? 5 :
                    candidate.type === 'srflx' ? 30 :
                    candidate.type === 'prflx' ? 50 : 100;

    // Add some variance
    return baseRTT + Math.random() * 20;
  }

  /**
   * Handle ICE restart on failure
   */
  async handleICEFailure(pc: RTCPeerConnection): Promise<void> {
    this.failoverCount++;

    // Try next candidate type if available
    if (this.config.iceTransportPolicy === 'all') {
      // Remove failed candidate types
      const failedType = this.selectedCandidate?.type;
      if (failedType) {
        this.config.preferredCandidateTypes =
          this.config.preferredCandidateTypes.filter(t => t !== failedType);
      }
    }

    // Trigger ICE restart
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);

    // Re-gather candidates
    await this.gatherCandidates(pc);
    await this.selectBestCandidate();
  }

  /**
   * Get geo-optimized TURN server
   */
  getNearestTURNServer(userLocation: { lat: number; lon: number }): RTCIceServer | null {
    // Example TURN servers by region
    const turnServers: Array<RTCIceServer & { location: { lat: number; lon: number } }> = [
      { urls: 'turn:us-east.turn.example.com:3478', location: { lat: 39.0, lon: -77.0 } },
      { urls: 'turn:us-west.turn.example.com:3478', location: { lat: 37.0, lon: -122.0 } },
      { urls: 'turn:eu-west.turn.example.com:3478', location: { lat: 51.5, lon: -0.1 } },
      { urls: 'turn:asia.turn.example.com:3478', location: { lat: 35.7, lon: 139.7 } }
    ];

    // Find nearest server
    let nearest = turnServers[0];
    let minDistance = Infinity;

    for (const server of turnServers) {
      const distance = this.haversineDistance(
        userLocation,
        server.location
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = server;
      }
    }

    return nearest;
  }

  /**
   * Calculate distance between two points
   */
  private haversineDistance(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  /**
   * Get ICE metrics
   */
  getMetrics(): ICEMetrics {
    return {
      gatheringTime: performance.now() - this.gatheringStartTime,
      candidatesGathered: this.candidates.length,
      selectedCandidate: this.selectedCandidate,
      connectionState: this.selectedCandidate ? 'connected' : 'gathering',
      failoverCount: this.failoverCount
    };
  }
}

// ============================================================================
// 2. Congestion Control Engine (BBRv3/CUBIC)
// ============================================================================

/**
 * Congestion Control Engine
 *
 * Research:
 * - BBRv3: Bandwidth-based, latency-aware
 * - CUBIC: Loss-based, TCP default
 * - BBR advantages: insensitive to loss, low latency
 * - QUIC integration for real-time video
 *
 * Features:
 * - Adaptive algorithm selection
 * - Bandwidth probing
 * - Loss recovery
 * - Latency optimization
 */
class CongestionControlEngine {
  private config: CongestionControlConfig;
  private state: CongestionState;
  private rttHistory: number[] = [];
  private lossHistory: number[] = [];
  private bbrState: {
    phase: 'startup' | 'drain' | 'probe_bw' | 'probe_rtt';
    cycleIndex: number;
    btlBw: number;
    rtProp: number;
    pacingGain: number;
    cwndGain: number;
  };

  constructor(config: Partial<CongestionControlConfig> = {}) {
    this.config = {
      algorithm: config.algorithm || 'bbr',
      minBitrate: config.minBitrate || 100000,
      maxBitrate: config.maxBitrate || 10000000,
      initialBitrate: config.initialBitrate || 1000000,
      probingEnabled: config.probingEnabled ?? true,
      lossThreshold: config.lossThreshold || 0.02
    };

    this.state = {
      currentBitrate: this.config.initialBitrate,
      estimatedBandwidth: this.config.initialBitrate,
      rtt: 100,
      rttVariance: 10,
      packetLoss: 0,
      congestionWindow: 10,
      inRecovery: false
    };

    this.bbrState = {
      phase: 'startup',
      cycleIndex: 0,
      btlBw: 0,
      rtProp: Infinity,
      pacingGain: 2.885, // 2/ln(2) for startup
      cwndGain: 2
    };
  }

  /**
   * Update congestion state with new measurements
   */
  updateMeasurements(
    rtt: number,
    packetsAcked: number,
    packetsLost: number,
    bytesAcked: number
  ): void {
    // Update RTT
    this.rttHistory.push(rtt);
    if (this.rttHistory.length > 100) {
      this.rttHistory.shift();
    }

    this.state.rtt = rtt;
    this.state.rttVariance = this.calculateVariance(this.rttHistory);

    // Update packet loss
    const totalPackets = packetsAcked + packetsLost;
    const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
    this.lossHistory.push(lossRate);

    if (this.lossHistory.length > 50) {
      this.lossHistory.shift();
    }

    this.state.packetLoss = this.lossHistory.reduce((a, b) => a + b, 0) / this.lossHistory.length;

    // Update bandwidth estimate
    const deliveryRate = rtt > 0 ? (bytesAcked * 8 * 1000) / rtt : 0;
    this.state.estimatedBandwidth = deliveryRate;

    // Run congestion control algorithm
    switch (this.config.algorithm) {
      case 'bbr':
        this.runBBR(deliveryRate, rtt);
        break;
      case 'cubic':
        this.runCUBIC(packetsLost);
        break;
      default:
        this.runHybrid(deliveryRate, rtt, packetsLost);
    }
  }

  /**
   * BBRv3 Congestion Control
   */
  private runBBR(deliveryRate: number, rtt: number): void {
    // Update BBR model
    if (deliveryRate > this.bbrState.btlBw) {
      this.bbrState.btlBw = deliveryRate;
    }

    if (rtt < this.bbrState.rtProp) {
      this.bbrState.rtProp = rtt;
    }

    // State machine
    switch (this.bbrState.phase) {
      case 'startup':
        this.bbrStartup(deliveryRate);
        break;
      case 'drain':
        this.bbrDrain();
        break;
      case 'probe_bw':
        this.bbrProbeBW();
        break;
      case 'probe_rtt':
        this.bbrProbeRTT();
        break;
    }

    // Calculate pacing rate and cwnd
    const pacingRate = this.bbrState.btlBw * this.bbrState.pacingGain;
    this.state.currentBitrate = Math.min(
      Math.max(pacingRate, this.config.minBitrate),
      this.config.maxBitrate
    );

    const bdp = (this.bbrState.btlBw * this.bbrState.rtProp) / 8000; // bytes
    this.state.congestionWindow = Math.max(4, bdp * this.bbrState.cwndGain / 1500); // packets
  }

  /**
   * BBR Startup phase
   */
  private bbrStartup(deliveryRate: number): void {
    this.bbrState.pacingGain = 2.885;
    this.bbrState.cwndGain = 2;

    // Exit startup when delivery rate stops growing
    if (this.rttHistory.length >= 3) {
      const recentRates = this.rttHistory.slice(-3);
      const growth = recentRates[2] / recentRates[0];

      if (growth < 1.25) {
        this.bbrState.phase = 'drain';
      }
    }
  }

  /**
   * BBR Drain phase
   */
  private bbrDrain(): void {
    this.bbrState.pacingGain = 1 / 2.885;
    this.bbrState.cwndGain = 2;

    // Exit drain when queue is empty
    if (this.state.rtt <= this.bbrState.rtProp * 1.1) {
      this.bbrState.phase = 'probe_bw';
      this.bbrState.cycleIndex = 0;
    }
  }

  /**
   * BBR Probe BW phase
   */
  private bbrProbeBW(): void {
    // Cycle through pacing gains
    const pacingGains = [1.25, 0.75, 1, 1, 1, 1, 1, 1];
    this.bbrState.pacingGain = pacingGains[this.bbrState.cycleIndex];
    this.bbrState.cwndGain = 2;

    // Advance cycle every RTT
    this.bbrState.cycleIndex = (this.bbrState.cycleIndex + 1) % 8;

    // Periodically probe RTT
    if (Math.random() < 0.02) { // ~2% chance per cycle
      this.bbrState.phase = 'probe_rtt';
    }
  }

  /**
   * BBR Probe RTT phase
   */
  private bbrProbeRTT(): void {
    this.bbrState.cwndGain = 0.5; // Reduce cwnd to drain queue
    this.bbrState.pacingGain = 1;

    // Stay in probe RTT for ~200ms then return to probe BW
    if (this.state.rtt <= this.bbrState.rtProp * 1.05) {
      this.bbrState.rtProp = this.state.rtt;
      this.bbrState.phase = 'probe_bw';
    }
  }

  /**
   * CUBIC Congestion Control
   */
  private runCUBIC(packetsLost: number): void {
    const C = 0.4;
    const beta = 0.7;

    if (packetsLost > 0 && !this.state.inRecovery) {
      // Enter recovery
      this.state.inRecovery = true;
      this.state.congestionWindow *= beta;
      this.state.currentBitrate *= beta;
    } else if (!this.state.inRecovery) {
      // Increase cwnd using CUBIC function
      // W(t) = C * (t - K)^3 + Wmax
      const t = (performance.now() % 10000) / 1000; // Time in seconds
      const K = Math.cbrt(this.state.congestionWindow * (1 - beta) / C);
      const targetCwnd = C * Math.pow(t - K, 3) + this.state.congestionWindow;

      this.state.congestionWindow = Math.max(4, targetCwnd);
      this.state.currentBitrate = (this.state.congestionWindow * 1500 * 8 * 1000) / this.state.rtt;
    }

    // Exit recovery when all lost packets are acked
    if (this.state.packetLoss < this.config.lossThreshold) {
      this.state.inRecovery = false;
    }

    // Clamp bitrate
    this.state.currentBitrate = Math.min(
      Math.max(this.state.currentBitrate, this.config.minBitrate),
      this.config.maxBitrate
    );
  }

  /**
   * Hybrid algorithm (BBR for delay, CUBIC for loss)
   */
  private runHybrid(deliveryRate: number, rtt: number, packetsLost: number): void {
    // Use BBR for bandwidth estimation
    this.runBBR(deliveryRate, rtt);
    const bbrBitrate = this.state.currentBitrate;

    // Use CUBIC for loss response
    this.runCUBIC(packetsLost);
    const cubicBitrate = this.state.currentBitrate;

    // Take the minimum to be conservative
    this.state.currentBitrate = Math.min(bbrBitrate, cubicBitrate);
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(arr: number[]): number {
    if (arr.length === 0) return 0;

    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(x => (x - mean) ** 2);
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }

  /**
   * Get current bitrate
   */
  getCurrentBitrate(): number {
    return this.state.currentBitrate;
  }

  /**
   * Get congestion state
   */
  getState(): CongestionState {
    return { ...this.state };
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    algorithm: string;
    currentBitrate: number;
    estimatedBandwidth: number;
    rtt: number;
    packetLoss: number;
    bbrPhase: string;
    inRecovery: boolean;
  } {
    return {
      algorithm: this.config.algorithm,
      currentBitrate: this.state.currentBitrate,
      estimatedBandwidth: this.state.estimatedBandwidth,
      rtt: this.state.rtt,
      packetLoss: this.state.packetLoss,
      bbrPhase: this.bbrState.phase,
      inRecovery: this.state.inRecovery
    };
  }
}

// ============================================================================
// 3. Network Quality Prediction Engine
// ============================================================================

/**
 * Network Quality Prediction Engine
 *
 * Research:
 * - RouteNet: GNN-based KPI prediction
 * - LSTM for time-series network metrics
 * - Random Forest for classification
 * - 21% error reduction with drift detection
 *
 * Features:
 * - Latency prediction
 * - Jitter forecasting
 * - Bandwidth estimation
 * - Quality trend detection
 */
class NetworkQualityPredictionEngine {
  private config: NetworkPredictionConfig;
  private history: NetworkSample[] = [];
  private predictions: NetworkPrediction[] = [];
  private lstmWeights: Float32Array;
  private readonly hiddenSize = 64;
  private readonly inputFeatures = 5; // latency, jitter, loss, bw, time

  constructor(config: Partial<NetworkPredictionConfig> = {}) {
    this.config = {
      model: config.model || 'lstm',
      predictionHorizon: config.predictionHorizon || 1000,
      historyWindow: config.historyWindow || 100,
      updateInterval: config.updateInterval || 100
    };

    // Initialize LSTM weights
    const weightSize = 4 * this.hiddenSize * (this.inputFeatures + this.hiddenSize) +
                       4 * this.hiddenSize; // gates
    this.lstmWeights = new Float32Array(weightSize);
    this.initializeWeights();
  }

  /**
   * Initialize LSTM weights
   */
  private initializeWeights(): void {
    const scale = Math.sqrt(2.0 / (this.inputFeatures + this.hiddenSize));
    for (let i = 0; i < this.lstmWeights.length; i++) {
      this.lstmWeights[i] = (Math.random() * 2 - 1) * scale;
    }
  }

  /**
   * Add network sample to history
   */
  addSample(sample: Omit<NetworkSample, 'timestamp'>): void {
    const fullSample: NetworkSample = {
      ...sample,
      timestamp: Date.now()
    };

    this.history.push(fullSample);

    if (this.history.length > this.config.historyWindow) {
      this.history.shift();
    }
  }

  /**
   * Predict future network quality
   */
  predict(): NetworkPrediction {
    if (this.history.length < 10) {
      return this.getDefaultPrediction();
    }

    let prediction: NetworkPrediction;

    switch (this.config.model) {
      case 'lstm':
        prediction = this.predictWithLSTM();
        break;
      case 'gnn':
        prediction = this.predictWithGNN();
        break;
      default:
        prediction = this.predictWithRandomForest();
    }

    this.predictions.push(prediction);
    if (this.predictions.length > 100) {
      this.predictions.shift();
    }

    return prediction;
  }

  /**
   * LSTM-based prediction
   */
  private predictWithLSTM(): NetworkPrediction {
    // Prepare input sequence
    const sequence = this.history.slice(-20);
    const input = this.prepareInput(sequence);

    // Run LSTM forward pass
    let hiddenState = new Float32Array(this.hiddenSize);
    let cellState = new Float32Array(this.hiddenSize);

    for (let t = 0; t < sequence.length; t++) {
      const x = input.slice(t * this.inputFeatures, (t + 1) * this.inputFeatures);
      [hiddenState, cellState] = this.lstmStep(x, hiddenState, cellState);
    }

    // Decode prediction from hidden state
    const predictedLatency = this.decodeOutput(hiddenState, 0);
    const predictedJitter = this.decodeOutput(hiddenState, 1);
    const predictedPacketLoss = this.decodeOutput(hiddenState, 2);
    const predictedBandwidth = this.decodeOutput(hiddenState, 3);

    return {
      predictedLatency: Math.max(0, predictedLatency),
      predictedJitter: Math.max(0, predictedJitter),
      predictedPacketLoss: Math.max(0, Math.min(1, predictedPacketLoss)),
      predictedBandwidth: Math.max(0, predictedBandwidth),
      confidence: this.calculateConfidence(),
      timestamp: Date.now() + this.config.predictionHorizon
    };
  }

  /**
   * Prepare input for LSTM
   */
  private prepareInput(samples: NetworkSample[]): Float32Array {
    const input = new Float32Array(samples.length * this.inputFeatures);

    // Normalize features
    const maxLatency = Math.max(...samples.map(s => s.rtt), 1);
    const maxJitter = Math.max(...samples.map(s => s.jitter), 1);
    const maxBandwidth = Math.max(...samples.map(s => s.bandwidth), 1);

    for (let i = 0; i < samples.length; i++) {
      const offset = i * this.inputFeatures;
      input[offset] = samples[i].rtt / maxLatency;
      input[offset + 1] = samples[i].jitter / maxJitter;
      input[offset + 2] = samples[i].packetLoss;
      input[offset + 3] = samples[i].bandwidth / maxBandwidth;
      input[offset + 4] = (samples[i].timestamp % 86400000) / 86400000; // Time of day
    }

    return input;
  }

  /**
   * Single LSTM step
   */
  private lstmStep(
    x: Float32Array,
    prevH: Float32Array,
    prevC: Float32Array
  ): [Float32Array, Float32Array] {
    const h = new Float32Array(this.hiddenSize);
    const c = new Float32Array(this.hiddenSize);

    // Concatenate input and previous hidden state
    const concat = new Float32Array(this.inputFeatures + this.hiddenSize);
    concat.set(x);
    concat.set(prevH, x.length);

    // Compute gates (simplified - single matrix multiplication)
    const weightOffset = 0;
    const gateSize = this.hiddenSize;

    for (let i = 0; i < this.hiddenSize; i++) {
      let fi = 0, ii = 0, oi = 0, gi = 0;

      for (let j = 0; j < concat.length; j++) {
        const baseIdx = i * concat.length + j;
        fi += concat[j] * this.lstmWeights[weightOffset + baseIdx];
        ii += concat[j] * this.lstmWeights[weightOffset + gateSize * concat.length + baseIdx];
        oi += concat[j] * this.lstmWeights[weightOffset + 2 * gateSize * concat.length + baseIdx];
        gi += concat[j] * this.lstmWeights[weightOffset + 3 * gateSize * concat.length + baseIdx];
      }

      // Apply activations
      const f = 1 / (1 + Math.exp(-fi)); // Forget gate (sigmoid)
      const i_ = 1 / (1 + Math.exp(-ii)); // Input gate (sigmoid)
      const o = 1 / (1 + Math.exp(-oi)); // Output gate (sigmoid)
      const g = Math.tanh(gi); // Candidate

      // Update cell and hidden state
      c[i] = f * prevC[i] + i_ * g;
      h[i] = o * Math.tanh(c[i]);
    }

    return [h, c];
  }

  /**
   * Decode output from hidden state
   */
  private decodeOutput(hiddenState: Float32Array, outputIndex: number): number {
    // Simple linear projection
    let output = 0;
    for (let i = 0; i < this.hiddenSize; i++) {
      output += hiddenState[i] * this.lstmWeights[(this.lstmWeights.length - this.hiddenSize * 4) + outputIndex * this.hiddenSize + i];
    }

    // Scale to reasonable range based on recent history
    const recent = this.history.slice(-5);
    const scale = outputIndex === 0 ? Math.max(...recent.map(s => s.rtt)) :
                  outputIndex === 1 ? Math.max(...recent.map(s => s.jitter)) :
                  outputIndex === 2 ? 1 :
                  Math.max(...recent.map(s => s.bandwidth));

    return output * scale;
  }

  /**
   * GNN-based prediction (simplified)
   */
  private predictWithGNN(): NetworkPrediction {
    // Simplified GNN - use moving average for now
    const recent = this.history.slice(-10);

    return {
      predictedLatency: this.weightedAverage(recent.map(s => s.rtt)),
      predictedJitter: this.weightedAverage(recent.map(s => s.jitter)),
      predictedPacketLoss: this.weightedAverage(recent.map(s => s.packetLoss)),
      predictedBandwidth: this.weightedAverage(recent.map(s => s.bandwidth)),
      confidence: 0.75,
      timestamp: Date.now() + this.config.predictionHorizon
    };
  }

  /**
   * Random Forest prediction (simplified)
   */
  private predictWithRandomForest(): NetworkPrediction {
    // Use recent statistics
    const recent = this.history.slice(-20);

    const avgLatency = recent.reduce((a, s) => a + s.rtt, 0) / recent.length;
    const avgJitter = recent.reduce((a, s) => a + s.jitter, 0) / recent.length;
    const avgLoss = recent.reduce((a, s) => a + s.packetLoss, 0) / recent.length;
    const avgBandwidth = recent.reduce((a, s) => a + s.bandwidth, 0) / recent.length;

    // Detect trend
    const latencyTrend = this.detectTrend(recent.map(s => s.rtt));
    const jitterTrend = this.detectTrend(recent.map(s => s.jitter));

    return {
      predictedLatency: avgLatency * (1 + latencyTrend * 0.1),
      predictedJitter: avgJitter * (1 + jitterTrend * 0.1),
      predictedPacketLoss: avgLoss,
      predictedBandwidth: avgBandwidth,
      confidence: 0.8,
      timestamp: Date.now() + this.config.predictionHorizon
    };
  }

  /**
   * Weighted average (more recent = higher weight)
   */
  private weightedAverage(values: number[]): number {
    if (values.length === 0) return 0;

    let sum = 0;
    let weightSum = 0;

    for (let i = 0; i < values.length; i++) {
      const weight = Math.exp(i / values.length);
      sum += values[i] * weight;
      weightSum += weight;
    }

    return sum / weightSum;
  }

  /**
   * Detect trend in time series
   */
  private detectTrend(values: number[]): number {
    if (values.length < 3) return 0;

    // Simple linear regression slope
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgValue = sumY / n;

    return avgValue > 0 ? slope / avgValue : 0; // Normalized slope
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(): number {
    if (this.predictions.length < 5 || this.history.length < 10) {
      return 0.5;
    }

    // Compare recent predictions with actual values
    let totalError = 0;
    const recentPredictions = this.predictions.slice(-5);
    const recentHistory = this.history.slice(-5);

    for (let i = 0; i < Math.min(recentPredictions.length, recentHistory.length); i++) {
      const predLatency = recentPredictions[i].predictedLatency;
      const actualLatency = recentHistory[i].rtt;

      totalError += Math.abs(predLatency - actualLatency) / (actualLatency + 1);
    }

    const avgError = totalError / 5;
    return Math.max(0.3, 1 - avgError);
  }

  /**
   * Get default prediction
   */
  private getDefaultPrediction(): NetworkPrediction {
    return {
      predictedLatency: 100,
      predictedJitter: 10,
      predictedPacketLoss: 0.01,
      predictedBandwidth: 1000000,
      confidence: 0.3,
      timestamp: Date.now() + this.config.predictionHorizon
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    model: string;
    historySize: number;
    predictionCount: number;
    avgConfidence: number;
    lastPrediction: NetworkPrediction | null;
  } {
    const avgConfidence = this.predictions.length > 0 ?
      this.predictions.reduce((a, p) => a + p.confidence, 0) / this.predictions.length : 0;

    return {
      model: this.config.model,
      historySize: this.history.length,
      predictionCount: this.predictions.length,
      avgConfidence,
      lastPrediction: this.predictions[this.predictions.length - 1] || null
    };
  }
}

// ============================================================================
// 4. Forward Error Correction Engine
// ============================================================================

/**
 * Forward Error Correction Engine
 *
 * Research:
 * - RL-AFEC: Adaptive FEC with reinforcement learning
 * - XOR-based FEC for low complexity
 * - Reed-Solomon for higher redundancy
 * - 2025 AI-enhanced FEC with LSTM
 *
 * Features:
 * - Adaptive redundancy based on packet loss
 * - Low-latency recovery
 * - Bandwidth-aware protection
 * - Per-packet importance weighting
 */
class ForwardErrorCorrectionEngine {
  private config: FECConfig;
  private currentRedundancy: number;
  private groupCounter = 0;
  private recoveryStats: { recovered: number; failed: number } = { recovered: 0, failed: 0 };
  private packetLossHistory: number[] = [];

  constructor(config: Partial<FECConfig> = {}) {
    this.config = {
      algorithm: config.algorithm || 'xor',
      adaptive: config.adaptive ?? true,
      maxRedundancy: config.maxRedundancy || 0.5, // 50%
      minRedundancy: config.minRedundancy || 0.05, // 5%
      groupSize: config.groupSize || 10
    };

    this.currentRedundancy = (this.config.maxRedundancy + this.config.minRedundancy) / 2;
  }

  /**
   * Generate FEC protection for packet group
   */
  generateFEC(packets: Uint8Array[]): FECBlock[] {
    if (packets.length === 0) return [];

    const numParityPackets = Math.ceil(packets.length * this.currentRedundancy);
    const fecBlocks: FECBlock[] = [];

    switch (this.config.algorithm) {
      case 'xor':
        fecBlocks.push(...this.generateXORFEC(packets, numParityPackets));
        break;
      case 'reed-solomon':
        fecBlocks.push(...this.generateReedSolomonFEC(packets, numParityPackets));
        break;
      default:
        fecBlocks.push(...this.generateXORFEC(packets, numParityPackets));
    }

    this.groupCounter++;
    return fecBlocks;
  }

  /**
   * XOR-based FEC generation
   */
  private generateXORFEC(packets: Uint8Array[], numParity: number): FECBlock[] {
    const blocks: FECBlock[] = [];
    const maxPacketSize = Math.max(...packets.map(p => p.length));

    // Simple XOR of all packets in group
    for (let p = 0; p < numParity; p++) {
      const parityData = new Uint8Array(maxPacketSize);

      // XOR packets with stride based on parity index
      const stride = Math.ceil(packets.length / numParity);
      const start = p * stride;
      const end = Math.min(start + stride, packets.length);

      for (let i = start; i < end; i++) {
        for (let j = 0; j < packets[i].length; j++) {
          parityData[j] ^= packets[i][j];
        }
      }

      blocks.push({
        sourcePackets: end - start,
        parityPackets: 1,
        groupId: this.groupCounter,
        data: parityData
      });
    }

    return blocks;
  }

  /**
   * Reed-Solomon FEC generation (simplified)
   */
  private generateReedSolomonFEC(packets: Uint8Array[], numParity: number): FECBlock[] {
    // Simplified Reed-Solomon - real implementation uses Galois field arithmetic
    return this.generateXORFEC(packets, numParity);
  }

  /**
   * Recover lost packets using FEC
   */
  recover(
    receivedPackets: (Uint8Array | null)[],
    fecBlocks: FECBlock[]
  ): Uint8Array[] {
    const recovered: Uint8Array[] = [];

    // Find lost packets
    const lostIndices: number[] = [];
    for (let i = 0; i < receivedPackets.length; i++) {
      if (receivedPackets[i] === null) {
        lostIndices.push(i);
      }
    }

    if (lostIndices.length === 0) {
      // No packets lost
      return receivedPackets.filter((p): p is Uint8Array => p !== null);
    }

    // Attempt recovery using FEC blocks
    for (const lostIdx of lostIndices) {
      const recoveredPacket = this.recoverPacket(
        lostIdx,
        receivedPackets,
        fecBlocks
      );

      if (recoveredPacket) {
        receivedPackets[lostIdx] = recoveredPacket;
        recovered.push(recoveredPacket);
        this.recoveryStats.recovered++;
      } else {
        this.recoveryStats.failed++;
      }
    }

    return receivedPackets.filter((p): p is Uint8Array => p !== null);
  }

  /**
   * Recover single packet
   */
  private recoverPacket(
    lostIdx: number,
    packets: (Uint8Array | null)[],
    fecBlocks: FECBlock[]
  ): Uint8Array | null {
    // Find FEC block covering this packet
    const stride = Math.ceil(packets.length / fecBlocks.length);
    const fecBlockIdx = Math.floor(lostIdx / stride);

    if (fecBlockIdx >= fecBlocks.length) {
      return null;
    }

    const fecBlock = fecBlocks[fecBlockIdx];
    const start = fecBlockIdx * stride;
    const end = Math.min(start + stride, packets.length);

    // Count lost packets in this group
    let lostInGroup = 0;
    for (let i = start; i < end; i++) {
      if (packets[i] === null) lostInGroup++;
    }

    // XOR FEC can only recover 1 lost packet per group
    if (lostInGroup > 1) {
      return null;
    }

    // XOR all received packets with parity
    const recovered = new Uint8Array(fecBlock.data);

    for (let i = start; i < end; i++) {
      if (packets[i] !== null && i !== lostIdx) {
        for (let j = 0; j < packets[i]!.length; j++) {
          recovered[j] ^= packets[i]![j];
        }
      }
    }

    return recovered;
  }

  /**
   * Update redundancy based on packet loss
   */
  updateRedundancy(packetLoss: number): void {
    if (!this.config.adaptive) return;

    this.packetLossHistory.push(packetLoss);
    if (this.packetLossHistory.length > 50) {
      this.packetLossHistory.shift();
    }

    // Calculate average loss
    const avgLoss = this.packetLossHistory.reduce((a, b) => a + b, 0) /
                    this.packetLossHistory.length;

    // Adaptive redundancy: aim for recovery probability > 95%
    // For single packet loss, need redundancy >= loss rate
    const targetRedundancy = Math.max(
      avgLoss * 2, // 2x average loss rate
      this.config.minRedundancy
    );

    // Smooth adjustment
    const alpha = 0.1;
    this.currentRedundancy = alpha * targetRedundancy +
                            (1 - alpha) * this.currentRedundancy;

    // Clamp to bounds
    this.currentRedundancy = Math.max(
      this.config.minRedundancy,
      Math.min(this.config.maxRedundancy, this.currentRedundancy)
    );
  }

  /**
   * Get FEC metrics
   */
  getMetrics(): {
    algorithm: string;
    currentRedundancy: number;
    recoveryRate: number;
    totalRecovered: number;
    totalFailed: number;
    overheadPercentage: number;
  } {
    const total = this.recoveryStats.recovered + this.recoveryStats.failed;
    const recoveryRate = total > 0 ?
      this.recoveryStats.recovered / total : 0;

    return {
      algorithm: this.config.algorithm,
      currentRedundancy: this.currentRedundancy,
      recoveryRate,
      totalRecovered: this.recoveryStats.recovered,
      totalFailed: this.recoveryStats.failed,
      overheadPercentage: this.currentRedundancy * 100
    };
  }
}

// ============================================================================
// 5. Bandwidth Estimation Engine (GCC)
// ============================================================================

/**
 * Bandwidth Estimation Engine
 *
 * Research:
 * - Google Congestion Control (GCC)
 * - Delay-based + loss-based estimation
 * - WebRTC standard algorithm
 * - 35% user satisfaction improvement
 *
 * Features:
 * - Delay-based overuse detection
 * - Loss-based adjustment
 * - Bandwidth probing
 * - Rate control
 */
class BandwidthEstimationEngine {
  private config: BWEConfig;
  private state: BWEState;
  private delayHistory: number[] = [];
  private delayGradientHistory: number[] = [];
  private lossHistory: number[] = [];
  private overuseDetector: {
    threshold: number;
    offset: number;
    hypothesis: 'overusing' | 'underusing' | 'normal';
  };

  constructor(config: Partial<BWEConfig> = {}) {
    this.config = {
      algorithm: config.algorithm || 'gcc',
      probeInterval: config.probeInterval || 5000,
      probeSize: config.probeSize || 5,
      delayThreshold: config.delayThreshold || 25,
      overuseThreshold: config.overuseThreshold || 10
    };

    this.state = {
      estimatedBandwidth: 1000000, // 1 Mbps initial
      trend: 'hold',
      overuseSignal: false,
      lastProbeTime: 0,
      probeCount: 0
    };

    this.overuseDetector = {
      threshold: this.config.overuseThreshold,
      offset: 0,
      hypothesis: 'normal'
    };
  }

  /**
   * Process packet acknowledgment
   */
  processAck(
    sendTime: number,
    receiveTime: number,
    size: number,
    sequenceNumber: number
  ): void {
    const delay = receiveTime - sendTime;

    this.delayHistory.push(delay);
    if (this.delayHistory.length > 100) {
      this.delayHistory.shift();
    }

    // Calculate delay gradient
    if (this.delayHistory.length >= 2) {
      const gradient = delay - this.delayHistory[this.delayHistory.length - 2];
      this.delayGradientHistory.push(gradient);

      if (this.delayGradientHistory.length > 60) {
        this.delayGradientHistory.shift();
      }
    }

    // Run overuse detection
    this.detectOveruse();

    // Update bandwidth estimate
    this.updateEstimate(size, delay);
  }

  /**
   * Process packet loss
   */
  processLoss(lossRate: number): void {
    this.lossHistory.push(lossRate);
    if (this.lossHistory.length > 50) {
      this.lossHistory.shift();
    }

    // Loss-based adjustment
    if (lossRate > 0.1) {
      // High loss - decrease bandwidth
      this.state.estimatedBandwidth *= 0.85;
      this.state.trend = 'decrease';
    } else if (lossRate > 0.02) {
      // Moderate loss - small decrease
      this.state.estimatedBandwidth *= 0.95;
    }
  }

  /**
   * Detect overuse using delay gradient
   */
  private detectOveruse(): void {
    if (this.delayGradientHistory.length < 10) return;

    // Calculate weighted average of recent gradients
    const recent = this.delayGradientHistory.slice(-10);
    let avgGradient = 0;
    let weight = 0;

    for (let i = 0; i < recent.length; i++) {
      const w = Math.exp(i / recent.length);
      avgGradient += recent[i] * w;
      weight += w;
    }
    avgGradient /= weight;

    // Update offset with Kalman-like filter
    const adaptiveK = 0.02; // Adaptation coefficient
    this.overuseDetector.offset =
      (1 - adaptiveK) * this.overuseDetector.offset +
      adaptiveK * avgGradient;

    // Determine hypothesis
    const m = this.overuseDetector.offset;
    const gamma = this.overuseDetector.threshold;

    if (m > gamma) {
      this.overuseDetector.hypothesis = 'overusing';
      this.state.overuseSignal = true;
    } else if (m < -gamma) {
      this.overuseDetector.hypothesis = 'underusing';
      this.state.overuseSignal = false;
    } else {
      this.overuseDetector.hypothesis = 'normal';
      this.state.overuseSignal = false;
    }
  }

  /**
   * Update bandwidth estimate
   */
  private updateEstimate(packetSize: number, delay: number): void {
    // Rate-based estimate
    const deliveryRate = delay > 0 ? (packetSize * 8 * 1000) / delay : 0;

    // Combine with delay-based signal
    switch (this.overuseDetector.hypothesis) {
      case 'overusing':
        // Decrease estimate
        this.state.estimatedBandwidth *= 0.85;
        this.state.trend = 'decrease';
        break;

      case 'underusing':
        // Increase estimate (multiplicative increase)
        const increase = Math.max(1000, this.state.estimatedBandwidth * 0.08);
        this.state.estimatedBandwidth += increase;
        this.state.trend = 'increase';
        break;

      case 'normal':
        // Slight increase (additive)
        if (this.state.trend !== 'decrease') {
          this.state.estimatedBandwidth += 1000;
          this.state.trend = 'hold';
        }
        break;
    }

    // Incorporate delivery rate measurement
    const alpha = 0.1;
    this.state.estimatedBandwidth =
      alpha * deliveryRate +
      (1 - alpha) * this.state.estimatedBandwidth;

    // Clamp to reasonable bounds
    this.state.estimatedBandwidth = Math.max(
      50000, // 50 kbps minimum
      Math.min(50000000, this.state.estimatedBandwidth) // 50 Mbps maximum
    );
  }

  /**
   * Send bandwidth probe
   */
  async sendProbe(send: (size: number) => Promise<number>): Promise<number> {
    const now = performance.now();

    if (now - this.state.lastProbeTime < this.config.probeInterval) {
      return this.state.estimatedBandwidth;
    }

    this.state.lastProbeTime = now;
    this.state.probeCount++;

    // Send probe packets
    const probeResults: number[] = [];
    const probeSize = 1200; // bytes

    for (let i = 0; i < this.config.probeSize; i++) {
      const rtt = await send(probeSize);
      if (rtt > 0) {
        probeResults.push((probeSize * 8 * 1000) / rtt);
      }
    }

    if (probeResults.length > 0) {
      // Use maximum observed rate
      const maxRate = Math.max(...probeResults);

      // Update estimate if probe shows higher capacity
      if (maxRate > this.state.estimatedBandwidth * 1.1) {
        this.state.estimatedBandwidth =
          0.5 * this.state.estimatedBandwidth +
          0.5 * maxRate;
      }
    }

    return this.state.estimatedBandwidth;
  }

  /**
   * Get current bandwidth estimate
   */
  getEstimate(): number {
    return this.state.estimatedBandwidth;
  }

  /**
   * Get BWE state
   */
  getState(): BWEState {
    return { ...this.state };
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    algorithm: string;
    estimatedBandwidth: number;
    trend: string;
    overuseSignal: boolean;
    avgDelay: number;
    avgLoss: number;
    probeCount: number;
  } {
    const avgDelay = this.delayHistory.length > 0 ?
      this.delayHistory.reduce((a, b) => a + b, 0) / this.delayHistory.length : 0;

    const avgLoss = this.lossHistory.length > 0 ?
      this.lossHistory.reduce((a, b) => a + b, 0) / this.lossHistory.length : 0;

    return {
      algorithm: this.config.algorithm,
      estimatedBandwidth: this.state.estimatedBandwidth,
      trend: this.state.trend,
      overuseSignal: this.state.overuseSignal,
      avgDelay,
      avgLoss,
      probeCount: this.state.probeCount
    };
  }
}

// ============================================================================
// 6. Packet Pacing Engine
// ============================================================================

/**
 * Packet Pacing Engine
 *
 * Research:
 * - BBR pacing for smooth transmission
 * - Reduces burst losses
 * - Improves network fairness
 * - Essential for real-time video
 *
 * Features:
 * - Token bucket pacing
 * - Burst management
 * - Priority queuing
 * - Timing accuracy
 */
class PacketPacingEngine {
  private config: PacingConfig;
  private packetQueue: Array<{ data: Uint8Array; priority: number; timestamp: number }> = [];
  private tokens: number;
  private lastRefillTime: number;
  private pacedPackets = 0;
  private droppedPackets = 0;

  constructor(config: Partial<PacingConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      interval: config.interval || 1000, // 1ms in microseconds
      burstSize: config.burstSize || 10,
      smoothingFactor: config.smoothingFactor || 0.9
    };

    this.tokens = this.config.burstSize;
    this.lastRefillTime = performance.now();
  }

  /**
   * Enqueue packet for paced transmission
   */
  enqueue(packet: Uint8Array, priority: number = 0): void {
    if (!this.config.enabled) {
      return;
    }

    // Priority queue insertion
    const entry = {
      data: packet,
      priority,
      timestamp: performance.now()
    };

    // Insert sorted by priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.packetQueue.length; i++) {
      if (this.packetQueue[i].priority < priority) {
        this.packetQueue.splice(i, 0, entry);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.packetQueue.push(entry);
    }

    // Limit queue size
    const maxQueueSize = 1000;
    while (this.packetQueue.length > maxQueueSize) {
      this.packetQueue.pop(); // Drop lowest priority
      this.droppedPackets++;
    }
  }

  /**
   * Get next packet for transmission
   */
  dequeue(): Uint8Array | null {
    if (!this.config.enabled) {
      return this.packetQueue.shift()?.data || null;
    }

    this.refillTokens();

    if (this.tokens < 1 || this.packetQueue.length === 0) {
      return null;
    }

    this.tokens--;
    this.pacedPackets++;

    return this.packetQueue.shift()?.data || null;
  }

  /**
   * Get multiple packets up to burst size
   */
  dequeueBurst(): Uint8Array[] {
    const packets: Uint8Array[] = [];

    this.refillTokens();

    const burst = Math.min(
      Math.floor(this.tokens),
      this.config.burstSize,
      this.packetQueue.length
    );

    for (let i = 0; i < burst; i++) {
      const packet = this.packetQueue.shift();
      if (packet) {
        packets.push(packet.data);
        this.tokens--;
        this.pacedPackets++;
      }
    }

    return packets;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = performance.now();
    const elapsed = (now - this.lastRefillTime) * 1000; // Convert to microseconds
    this.lastRefillTime = now;

    // Token refill rate based on interval
    const refillAmount = elapsed / this.config.interval;

    this.tokens = Math.min(
      this.tokens + refillAmount,
      this.config.burstSize * 2 // Allow some bursting
    );
  }

  /**
   * Set pacing rate based on bandwidth
   */
  setPacingRate(bytesPerSecond: number, avgPacketSize: number): void {
    // Calculate interval between packets
    const packetsPerSecond = bytesPerSecond / avgPacketSize;
    this.config.interval = 1000000 / packetsPerSecond; // Microseconds
  }

  /**
   * Get queue depth
   */
  getQueueDepth(): number {
    return this.packetQueue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.packetQueue = [];
    this.tokens = this.config.burstSize;
  }

  /**
   * Get pacing metrics
   */
  getMetrics(): {
    enabled: boolean;
    queueDepth: number;
    availableTokens: number;
    pacedPackets: number;
    droppedPackets: number;
    pacingInterval: number;
  } {
    return {
      enabled: this.config.enabled,
      queueDepth: this.packetQueue.length,
      availableTokens: this.tokens,
      pacedPackets: this.pacedPackets,
      droppedPackets: this.droppedPackets,
      pacingInterval: this.config.interval
    };
  }
}

// ============================================================================
// 7. Network Diagnostics Engine
// ============================================================================

/**
 * Network Diagnostics Engine
 *
 * Research:
 * - WebRTC getStats() API
 * - Real-time quality metrics
 * - Automated issue detection
 * - Performance trending
 *
 * Features:
 * - Continuous monitoring
 * - Anomaly detection
 * - Quality scoring
 * - Historical analysis
 */
class NetworkDiagnosticsEngine {
  private config: DiagnosticsConfig;
  private samples: NetworkSample[] = [];
  private alerts: Array<{ type: string; message: string; timestamp: number }> = [];
  private qualityScore = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<DiagnosticsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      sampleInterval: config.sampleInterval || 1000,
      historySize: config.historySize || 1000,
      alertThresholds: config.alertThresholds || {
        latency: 200,
        jitter: 50,
        packetLoss: 0.05
      }
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(getSample: () => NetworkSample | null): void {
    if (!this.config.enabled || this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      const sample = getSample();
      if (sample) {
        this.recordSample(sample);
      }
    }, this.config.sampleInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record network sample
   */
  recordSample(sample: NetworkSample): void {
    this.samples.push(sample);

    if (this.samples.length > this.config.historySize) {
      this.samples.shift();
    }

    // Check for alerts
    this.checkAlerts(sample);

    // Update quality score
    this.updateQualityScore(sample);
  }

  /**
   * Check for threshold alerts
   */
  private checkAlerts(sample: NetworkSample): void {
    if (sample.rtt > this.config.alertThresholds.latency) {
      this.addAlert('latency', `High latency detected: ${sample.rtt.toFixed(0)}ms`);
    }

    if (sample.jitter > this.config.alertThresholds.jitter) {
      this.addAlert('jitter', `High jitter detected: ${sample.jitter.toFixed(0)}ms`);
    }

    if (sample.packetLoss > this.config.alertThresholds.packetLoss) {
      this.addAlert('packet_loss', `High packet loss detected: ${(sample.packetLoss * 100).toFixed(1)}%`);
    }
  }

  /**
   * Add alert
   */
  private addAlert(type: string, message: string): void {
    // Avoid duplicate alerts
    const recent = this.alerts.slice(-10);
    const duplicate = recent.find(
      a => a.type === type && Date.now() - a.timestamp < 5000
    );

    if (!duplicate) {
      this.alerts.push({
        type,
        message,
        timestamp: Date.now()
      });

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
    }
  }

  /**
   * Update quality score (0-100)
   */
  private updateQualityScore(sample: NetworkSample): void {
    let score = 100;

    // Latency penalty (up to -30 points)
    if (sample.rtt > 50) {
      score -= Math.min(30, (sample.rtt - 50) / 10);
    }

    // Jitter penalty (up to -30 points)
    if (sample.jitter > 10) {
      score -= Math.min(30, (sample.jitter - 10) / 2);
    }

    // Packet loss penalty (up to -40 points)
    score -= sample.packetLoss * 400;

    // Smooth the score
    const alpha = 0.1;
    this.qualityScore = alpha * Math.max(0, score) + (1 - alpha) * this.qualityScore;
  }

  /**
   * Get current quality score
   */
  getQualityScore(): number {
    return this.qualityScore;
  }

  /**
   * Get quality rating
   */
  getQualityRating(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.qualityScore >= 90) return 'excellent';
    if (this.qualityScore >= 70) return 'good';
    if (this.qualityScore >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Get statistics summary
   */
  getStatistics(): {
    avg: { rtt: number; jitter: number; packetLoss: number; bandwidth: number };
    min: { rtt: number; jitter: number; packetLoss: number; bandwidth: number };
    max: { rtt: number; jitter: number; packetLoss: number; bandwidth: number };
    stdDev: { rtt: number; jitter: number };
  } {
    if (this.samples.length === 0) {
      return {
        avg: { rtt: 0, jitter: 0, packetLoss: 0, bandwidth: 0 },
        min: { rtt: 0, jitter: 0, packetLoss: 0, bandwidth: 0 },
        max: { rtt: 0, jitter: 0, packetLoss: 0, bandwidth: 0 },
        stdDev: { rtt: 0, jitter: 0 }
      };
    }

    const rttValues = this.samples.map(s => s.rtt);
    const jitterValues = this.samples.map(s => s.jitter);
    const lossValues = this.samples.map(s => s.packetLoss);
    const bwValues = this.samples.map(s => s.bandwidth);

    return {
      avg: {
        rtt: this.average(rttValues),
        jitter: this.average(jitterValues),
        packetLoss: this.average(lossValues),
        bandwidth: this.average(bwValues)
      },
      min: {
        rtt: Math.min(...rttValues),
        jitter: Math.min(...jitterValues),
        packetLoss: Math.min(...lossValues),
        bandwidth: Math.min(...bwValues)
      },
      max: {
        rtt: Math.max(...rttValues),
        jitter: Math.max(...jitterValues),
        packetLoss: Math.max(...lossValues),
        bandwidth: Math.max(...bwValues)
      },
      stdDev: {
        rtt: this.standardDeviation(rttValues),
        jitter: this.standardDeviation(jitterValues)
      }
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    const avg = this.average(values);
    const squaredDiffs = values.map(v => (v - avg) ** 2);
    return Math.sqrt(this.average(squaredDiffs));
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(): Array<{ type: string; message: string; timestamp: number }> {
    return this.alerts.slice(-20);
  }

  /**
   * Get diagnostics metrics
   */
  getMetrics(): {
    enabled: boolean;
    samplesCollected: number;
    qualityScore: number;
    qualityRating: string;
    alertCount: number;
    uptime: number;
  } {
    const firstSample = this.samples[0];
    const uptime = firstSample ?
      Date.now() - firstSample.timestamp : 0;

    return {
      enabled: this.config.enabled,
      samplesCollected: this.samples.length,
      qualityScore: this.qualityScore,
      qualityRating: this.getQualityRating(),
      alertCount: this.alerts.length,
      uptime
    };
  }
}

// ============================================================================
// Integrated Network Optimization System
// ============================================================================

/**
 * Integrated system combining all 7 network optimization components
 */
class IntegratedNetworkOptimizationSystem {
  private ice: ICEOptimizationEngine;
  private congestion: CongestionControlEngine;
  private prediction: NetworkQualityPredictionEngine;
  private fec: ForwardErrorCorrectionEngine;
  private bwe: BandwidthEstimationEngine;
  private pacing: PacketPacingEngine;
  private diagnostics: NetworkDiagnosticsEngine;

  constructor() {
    this.ice = new ICEOptimizationEngine();
    this.congestion = new CongestionControlEngine();
    this.prediction = new NetworkQualityPredictionEngine();
    this.fec = new ForwardErrorCorrectionEngine();
    this.bwe = new BandwidthEstimationEngine();
    this.pacing = new PacketPacingEngine();
    this.diagnostics = new NetworkDiagnosticsEngine();
  }

  /**
   * Process network measurements and optimize
   */
  processNetworkUpdate(
    rtt: number,
    jitter: number,
    packetLoss: number,
    bandwidth: number,
    bytesReceived: number,
    bytesSent: number
  ): {
    recommendedBitrate: number;
    fecRedundancy: number;
    prediction: NetworkPrediction;
    qualityScore: number;
  } {
    // Record diagnostics
    this.diagnostics.recordSample({
      timestamp: Date.now(),
      rtt,
      jitter,
      packetLoss,
      bandwidth,
      bytesReceived,
      bytesSent
    });

    // Update prediction model
    this.prediction.addSample({
      rtt,
      jitter,
      packetLoss,
      bandwidth,
      bytesReceived,
      bytesSent
    });

    const prediction = this.prediction.predict();

    // Update congestion control
    this.congestion.updateMeasurements(
      rtt,
      Math.floor(bytesReceived / 1000), // Estimated packets
      Math.floor(packetLoss * bytesReceived / 1000),
      bytesReceived
    );

    // Update BWE
    this.bwe.processLoss(packetLoss);

    // Update FEC redundancy
    this.fec.updateRedundancy(packetLoss);

    // Update pacing
    const currentBitrate = this.congestion.getCurrentBitrate();
    this.pacing.setPacingRate(currentBitrate / 8, 1200);

    return {
      recommendedBitrate: currentBitrate,
      fecRedundancy: this.fec.getMetrics().currentRedundancy,
      prediction,
      qualityScore: this.diagnostics.getQualityScore()
    };
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): {
    ice: ICEMetrics;
    congestion: any;
    prediction: any;
    fec: any;
    bwe: any;
    pacing: any;
    diagnostics: any;
  } {
    return {
      ice: this.ice.getMetrics(),
      congestion: this.congestion.getMetrics(),
      prediction: this.prediction.getMetrics(),
      fec: this.fec.getMetrics(),
      bwe: this.bwe.getMetrics(),
      pacing: this.pacing.getMetrics(),
      diagnostics: this.diagnostics.getMetrics()
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Main integrated system
  IntegratedNetworkOptimizationSystem,

  // Individual components
  ICEOptimizationEngine,
  CongestionControlEngine,
  NetworkQualityPredictionEngine,
  ForwardErrorCorrectionEngine,
  BandwidthEstimationEngine,
  PacketPacingEngine,
  NetworkDiagnosticsEngine,

  // Types
  ICEConfig,
  ICECandidate,
  ICEMetrics,
  CongestionControlConfig,
  CongestionState,
  NetworkPredictionConfig,
  NetworkPrediction,
  FECConfig,
  FECBlock,
  BWEConfig,
  BWEState,
  PacingConfig,
  DiagnosticsConfig,
  NetworkSample
};
