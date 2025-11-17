/**
 * TWCC Bandwidth Estimator
 *
 * Transport-Wide Congestion Control (Google standard)
 * Provides packet-level feedback for precise bandwidth estimation
 *
 * Reference: RFC draft-holmer-rmcat-transport-wide-cc-extensions-02
 * Implementation: WebRTC source code, Flussonic guide (2024)
 */

const { EventEmitter } = require('events');

class TWCCBandwidthEstimator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.callId = options.callId;
    this.ssrc = options.ssrc || 0; // Synchronization source

    // TWCC configuration
    this.config = {
      feedbackInterval: options.feedbackInterval || 100, // ms between feedback
      smoothingFactor: options.smoothingFactor || 0.8,   // For exponential averaging
      windowSize: options.windowSize || 5000,            // ms observation window
      minBitrate: options.minBitrate || 300,             // kbps
      maxBitrate: options.maxBitrate || 10000,           // kbps
      startBitrate: options.startBitrate || 2500         // kbps
    };

    // Packet tracking (sequence number → metadata)
    this.packets = new Map();
    this.sequenceNumberCycles = 0;
    this.lastSequenceNumber = 0;

    // Bandwidth estimation state
    this.state = {
      estimatedBandwidth: this.config.startBitrate,
      smoothedBandwidth: this.config.startBitrate,
      lossRate: 0,
      availableBandwidth: this.config.startBitrate,
      delayTrend: 'stable', // 'increasing', 'decreasing', 'stable'

      // Statistics
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
      bytesSent: 0,
      bytesReceived: 0,

      // Timing
      lastFeedbackTime: Date.now(),
      measurementStart: Date.now(),

      // GCC (Google Congestion Control) state
      mode: 'probe', // 'probe', 'increase', 'decrease', 'hold'
      targetBitrate: this.config.startBitrate
    };

    // History for trend analysis
    this.history = {
      bandwidthEstimates: [],
      delays: [],
      losses: [],
      maxHistorySize: 60 // Keep 1 minute of history
    };

    // GCC parameters (Google Congestion Control algorithm)
    this.gcc = {
      increaseRate: 1.08,    // 8% per second increase
      decreaseRate: 0.85,    // 15% decrease on congestion
      thresholdLow: 0.5,     // 50% increase threshold
      thresholdHigh: 0.95,   // 95% increase threshold
      alpha: 0.3,            // Loss-based control weight
      beta: 0.3              // Delay-based control weight
    };

    // Monitoring
    this.monitoringInterval = null;
  }

  /**
   * Start TWCC bandwidth estimation
   */
  startEstimation(interval = 1000) {
    console.log(`📊 Starting TWCC bandwidth estimator for call ${this.callId}`);

    this.monitoringInterval = setInterval(() => {
      this.evaluateBandwidth();
    }, interval);

    return this;
  }

  /**
   * Stop estimation
   */
  stopEstimation() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Register sent packet for TWCC tracking
   */
  recordPacketSent(sequenceNumber, byteSize, timestamp) {
    // Handle sequence number wrapping (16-bit counter)
    const extendedSeqNum = this.extendSequenceNumber(sequenceNumber);

    this.packets.set(extendedSeqNum, {
      sentTime: timestamp || Date.now(),
      size: byteSize,
      received: false,
      receiveTime: null,
      delay: null
    });

    this.state.packetsSent++;
    this.state.bytesSent += byteSize;

    // Clean up old packets
    if (this.packets.size > 10000) {
      this.cleanupOldPackets();
    }
  }

  /**
   * Record packet receipt and calculate one-way delay
   */
  recordPacketReceived(sequenceNumber, receiveTime) {
    const extendedSeqNum = this.extendSequenceNumber(sequenceNumber);
    const packet = this.packets.get(extendedSeqNum);

    if (!packet) {
      // Packet not found (may have been cleaned up or lost)
      this.state.packetsLost++;
      return null;
    }

    if (packet.received) {
      // Duplicate packet
      return null;
    }

    packet.received = true;
    packet.receiveTime = receiveTime || Date.now();
    packet.delay = packet.receiveTime - packet.sentTime;

    this.state.packetsReceived++;
    this.state.bytesReceived += packet.size;

    // Track delay for trend analysis
    this.history.delays.push({
      delay: packet.delay,
      timestamp: receiveTime,
      seqNum: extendedSeqNum
    });

    return packet.delay;
  }

  /**
   * Extend 16-bit sequence number to 32-bit extended sequence
   */
  extendSequenceNumber(seqNum) {
    // Detect wrap-around (sequence number decreased by more than 32k)
    if (seqNum < this.lastSequenceNumber - 32768) {
      this.sequenceNumberCycles++;
    }

    this.lastSequenceNumber = seqNum;
    return (this.sequenceNumberCycles << 16) | seqNum;
  }

  /**
   * Generate TWCC feedback report
   */
  generateFeedback() {
    const now = Date.now();
    const timeSinceLastFeedback = now - this.state.lastFeedbackTime;

    // Group packets by receive time (in 250ms buckets)
    const packetGroups = this.groupPacketsByTime(250);

    const feedback = {
      referenceTime: Math.floor(Date.now() / 64), // 64ms units
      feedback: {
        receivePackets: packetGroups.received,
        lostSequenceNumbers: packetGroups.lost,
        largestExtendedSeqNum: this.lastSequenceNumber,
        receivedSinceLast: packetGroups.received.length
      },
      metrics: {
        roundTripTime: this.estimateRTT(),
        interArrivalDelay: this.estimateInterArrivalDelay(),
        lossRate: this.calculateLossRate(),
        deliveryRate: this.calculateDeliveryRate()
      }
    };

    this.state.lastFeedbackTime = now;

    return feedback;
  }

  /**
   * Group received packets by time
   */
  groupPacketsByTime(bucketSize) {
    const received = [];
    const lost = [];
    const now = Date.now();
    const lookbackWindow = this.config.windowSize;

    let lastSeqNum = null;

    for (const [seqNum, packet] of Array.from(this.packets.entries()).sort()) {
      if (now - packet.sentTime > lookbackWindow) continue;

      if (packet.received) {
        received.push({
          seqNum,
          timestamp: packet.receiveTime,
          delay: packet.delay,
          size: packet.size
        });
        lastSeqNum = seqNum;
      } else if (lastSeqNum !== null && seqNum > lastSeqNum && seqNum < (lastSeqNum + 1000)) {
        // Only report reasonable gaps as lost
        lost.push(seqNum);
      }
    }

    return { received, lost };
  }

  /**
   * Estimate round-trip time from delay variations
   */
  estimateRTT() {
    if (this.history.delays.length === 0) return 0;

    // RTT ≈ 2 × one-way delay (assuming symmetric network)
    const recentDelays = this.history.delays.slice(-20);
    const avgDelay = recentDelays.reduce((sum, d) => sum + d.delay, 0) / recentDelays.length;

    return Math.round(avgDelay * 2);
  }

  /**
   * Estimate inter-arrival time variation (jitter)
   */
  estimateInterArrivalDelay() {
    if (this.history.delays.length < 2) return 0;

    const recentDelays = this.history.delays.slice(-20);
    let sumSquaredDiff = 0;

    for (let i = 1; i < recentDelays.length; i++) {
      const diff = recentDelays[i].delay - recentDelays[i - 1].delay;
      sumSquaredDiff += diff * diff;
    }

    return Math.sqrt(sumSquaredDiff / (recentDelays.length - 1));
  }

  /**
   * Calculate packet loss rate
   */
  calculateLossRate() {
    if (this.state.packetsSent === 0) return 0;

    const lossRate = this.state.packetsLost / this.state.packetsSent;
    this.state.lossRate = lossRate;

    // Store in history
    this.history.losses.push({
      rate: lossRate,
      timestamp: Date.now()
    });

    return lossRate;
  }

  /**
   * Calculate delivery rate (inverse of loss)
   */
  calculateDeliveryRate() {
    return 1 - this.calculateLossRate();
  }

  /**
   * Evaluate bandwidth based on TWCC feedback
   */
  evaluateBandwidth() {
    const feedback = this.generateFeedback();
    const { metrics } = feedback;

    // GCC algorithm: combine loss-based and delay-based control
    const newBitrate = this.runGCC(metrics);

    if (newBitrate !== this.state.estimatedBandwidth) {
      this.updateBandwidthEstimate(newBitrate, metrics);
    }

    // Detect congestion trend
    this.detectCongestionTrend();

    this.emit('feedback:generated', {
      feedback,
      estimatedBandwidth: this.state.estimatedBandwidth,
      trend: this.state.delayTrend
    });
  }

  /**
   * Run Google Congestion Control algorithm
   */
  runGCC(metrics) {
    const { lossRate, interArrivalDelay } = metrics;
    const currentBitrate = this.state.estimatedBandwidth;

    // Loss-based control
    let bitrateLoss = currentBitrate;
    if (lossRate > 0.1) {
      // High loss: aggressive decrease
      bitrateLoss = currentBitrate * (1 - this.gcc.alpha * Math.min(lossRate / 0.1, 1));
    } else if (lossRate > 0.02) {
      // Moderate loss: gradual decrease
      bitrateLoss = currentBitrate * (1 - this.gcc.alpha * (lossRate - 0.02) / 0.08);
    } else if (lossRate === 0) {
      // No loss: can increase
      bitrateLoss = currentBitrate * this.gcc.increaseRate;
    }

    // Delay-based control (AIMD)
    let bitrateDelay = currentBitrate;
    const delayTrend = this.detectDelayTrend();

    if (delayTrend === 'increasing') {
      // Increasing delay: decrease bitrate
      bitrateDelay = currentBitrate * this.gcc.decreaseRate;
      this.state.mode = 'decrease';
    } else if (delayTrend === 'decreasing') {
      // Decreasing delay: can increase
      bitrateDelay = currentBitrate * this.gcc.increaseRate;
      this.state.mode = 'increase';
    } else {
      // Stable delay: hold
      this.state.mode = 'hold';
    }

    // Combine loss and delay control (weighted average)
    const combinedBitrate = (bitrateLoss * (1 - this.gcc.beta)) + (bitrateDelay * this.gcc.beta);

    // Apply bitrate bounds
    return Math.max(
      this.config.minBitrate,
      Math.min(this.config.maxBitrate, Math.round(combinedBitrate))
    );
  }

  /**
   * Detect delay trend (increasing/decreasing/stable)
   */
  detectDelayTrend() {
    if (this.history.delays.length < 5) return 'stable';

    const recentDelays = this.history.delays.slice(-10);
    const firstHalf = recentDelays.slice(0, 5);
    const secondHalf = recentDelays.slice(5);

    const avgFirst = firstHalf.reduce((s, d) => s + d.delay, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, d) => s + d.delay, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;
    const threshold = 5; // 5ms threshold

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect congestion trend
   */
  detectCongestionTrend() {
    this.state.delayTrend = this.detectDelayTrend();

    if (this.state.delayTrend === 'increasing' && this.state.lossRate > 0.02) {
      this.state.delayTrend = 'increasing_congestion';
    }
  }

  /**
   * Update bandwidth estimate with smoothing
   */
  updateBandwidthEstimate(newBitrate, metrics) {
    const oldBitrate = this.state.estimatedBandwidth;

    // Exponential smoothing
    this.state.smoothedBandwidth =
      this.config.smoothingFactor * this.state.smoothedBandwidth +
      (1 - this.config.smoothingFactor) * newBitrate;

    this.state.estimatedBandwidth = Math.round(this.state.smoothedBandwidth);
    this.state.availableBandwidth = this.state.estimatedBandwidth;

    // Store in history
    this.history.bandwidthEstimates.push({
      estimate: this.state.estimatedBandwidth,
      timestamp: Date.now(),
      trend: this.state.delayTrend,
      metrics
    });

    if (this.history.bandwidthEstimates.length > this.history.maxHistorySize) {
      this.history.bandwidthEstimates.shift();
    }

    const change = ((this.state.estimatedBandwidth - oldBitrate) / oldBitrate * 100).toFixed(1);

    console.log(`📊 TWCC: ${oldBitrate} → ${this.state.estimatedBandwidth} kbps (${change}%)`);

    this.emit('bandwidth:updated', {
      oldBitrate,
      newBitrate: this.state.estimatedBandwidth,
      changePercent: parseFloat(change),
      mode: this.state.mode,
      metrics
    });
  }

  /**
   * Get current bandwidth status
   */
  getStatus() {
    return {
      callId: this.callId,
      estimatedBandwidth: this.state.estimatedBandwidth,
      availableBandwidth: this.state.availableBandwidth,
      mode: this.state.mode,
      delayTrend: this.state.delayTrend,
      metrics: {
        packetsSent: this.state.packetsSent,
        packetsReceived: this.state.packetsReceived,
        packetsLost: this.state.packetsLost,
        lossRate: (this.state.lossRate * 100).toFixed(2) + '%',
        deliveryRate: ((1 - this.state.lossRate) * 100).toFixed(2) + '%',
        bytesSent: this.state.bytesSent,
        bytesReceived: this.state.bytesReceived
      },
      estimates: this.history.bandwidthEstimates.slice(-5)
    };
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      callId: this.callId,
      status: this.getStatus(),
      gcc: this.gcc,
      config: this.config,
      history: {
        bandwidthEstimates: this.history.bandwidthEstimates.slice(-20),
        delays: this.history.delays.slice(-20),
        losses: this.history.losses.slice(-20)
      },
      activePackets: this.packets.size
    };
  }

  /**
   * Clean up old packets to prevent memory leak
   */
  cleanupOldPackets() {
    const now = Date.now();
    const threshold = this.config.windowSize * 2;

    for (const [seqNum, packet] of this.packets.entries()) {
      if (now - packet.sentTime > threshold) {
        this.packets.delete(seqNum);
      }
    }
  }

  /**
   * Get bandwidth recommendation
   */
  getBandwidthRecommendation() {
    const current = this.state.estimatedBandwidth;
    const recommended = this.state.targetBitrate;

    return {
      current,
      recommended,
      canIncrease: current < this.config.maxBitrate && this.state.lossRate < 0.05,
      canDecrease: current > this.config.minBitrate && (this.state.lossRate > 0.05 || this.state.delayTrend === 'increasing'),
      reason: this.generateRecommendationReason()
    };
  }

  /**
   * Generate reason for recommendation
   */
  generateRecommendationReason() {
    if (this.state.lossRate > 0.1) {
      return 'High packet loss - reduce bitrate';
    }
    if (this.state.delayTrend === 'increasing') {
      return 'Increasing delay - congestion detected';
    }
    if (this.state.lossRate === 0 && this.state.delayTrend === 'decreasing') {
      return 'Network improving - can increase bitrate';
    }
    return 'Network stable - maintain bitrate';
  }
}

module.exports = TWCCBandwidthEstimator;
