/**
 * WebRTC Metrics Exporter for Prometheus
 *
 * Real-time collection and export of WebRTC quality metrics
 * Enables Prometheus scraping for Grafana dashboards
 * Tracks 10+ critical quality metrics with alerting thresholds
 *
 * Metrics Exported:
 * - Packet loss rate (target: <1%)
 * - Jitter (target: <30ms)
 * - Round-trip time/RTT (target: <150ms)
 * - Bitrate trends
 * - Codec distribution
 * - Call quality score (0-10)
 * - CPU/memory usage
 * - Participant count
 *
 * Reference: Prometheus best practices, WebRTC statistics API (getStats)
 */

const { EventEmitter } = require('events');

class WebRTCMetricsExporter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.serverId = options.serverId || `server-${Date.now()}`;
    this.environment = options.environment || 'production'; // 'development', 'staging', 'production'
    this.port = options.port || 9090;

    // Prometheus registry (simulated)
    this.registry = {
      gauges: {},
      counters: {},
      histograms: {}
    };

    // Metrics storage
    this.metrics = {
      // Connection metrics
      activeConnections: 0,
      totalConnectionsCreated: 0,
      failedConnections: 0,

      // Quality metrics (per-call average)
      packetLoss: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        threshold: 1.0  // 1% threshold
      },
      jitter: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        unit: 'ms',
        threshold: 30   // 30ms threshold
      },
      rtt: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        unit: 'ms',
        threshold: 150  // 150ms threshold
      },
      bitrate: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        unit: 'kbps',
        targetRange: { min: 500, max: 5000 }
      },

      // Quality score (0-10)
      qualityScore: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        threshold: 6.0  // 6.0 minimum acceptable
      },

      // Codec metrics
      codecDistribution: {
        h264: 0,
        vp9: 0,
        av1: 0,
        total: 0
      },

      // CPU/Memory
      cpuUsage: {
        current: 0,
        avg: 0,
        threshold: 80,  // 80% threshold
        unit: '%'
      },
      memoryUsage: {
        current: 0,
        avg: 0,
        threshold: 85,  // 85% threshold
        unit: '%'
      },

      // Participant metrics
      participantCount: 0,
      maxParticipantsReached: 0,

      // SVC Layer metrics
      svcLayers: {
        active: 0,
        dropped: 0,
        avgLayersPerParticipant: 0
      },

      // Recording metrics
      recordingCount: 0,
      recordingBitrate: 0,

      // Error metrics
      errorCount: {
        total: 0,
        iceFailure: 0,
        dtlsFailure: 0,
        mediaFailure: 0,
        timeout: 0
      },

      // Temporal data (time-series)
      timeSeries: {
        packetLoss: [],
        jitter: [],
        rtt: [],
        qualityScore: [],
        bitrate: [],
        participantCount: []
      }
    };

    // Alert states
    this.alerts = {
      highPacketLoss: false,
      highJitter: false,
      highRTT: false,
      lowQualityScore: false,
      highCPU: false,
      highMemory: false,
      iceFailure: false
    };

    // Scrape configuration
    this.scrapeInterval = options.scrapeInterval || 10000;  // 10 seconds
    this.retentionPeriod = options.retentionPeriod || 3600000; // 1 hour
    this.samplingSize = 60; // Keep 60 data points for trends

    // Monitoring state
    this.monitoring = false;
    this.monitoringInterval = null;

    // Alert handlers
    this.alertHandlers = {};
  }

  /**
   * Initialize metrics exporter
   */
  initialize() {
    console.log(`📊 Initializing WebRTC Metrics Exporter (${this.serverId})`);

    // Initialize time-series storage
    this.initializeTimeSeries();

    // Start scraping
    this.start();

    this.emit('exporter:initialized', {
      serverId: this.serverId,
      port: this.port,
      environment: this.environment
    });
  }

  /**
   * Initialize time-series storage
   */
  initializeTimeSeries() {
    const now = Date.now();

    for (const key of Object.keys(this.metrics.timeSeries)) {
      this.metrics.timeSeries[key] = [];
    }
  }

  /**
   * Record packet loss metrics (from TWCC or RTCP RR)
   */
  recordPacketLoss(lossRate, timestamp = Date.now()) {
    this.metrics.packetLoss.current = lossRate;

    // Update min/max/avg
    if (lossRate < this.metrics.packetLoss.min || this.metrics.packetLoss.min === 0) {
      this.metrics.packetLoss.min = lossRate;
    }
    if (lossRate > this.metrics.packetLoss.max) {
      this.metrics.packetLoss.max = lossRate;
    }

    // Calculate rolling average
    this.addTimeSeriesData('packetLoss', lossRate, timestamp);
    this.updateAverage('packetLoss');

    // Check threshold
    if (lossRate > this.metrics.packetLoss.threshold && !this.alerts.highPacketLoss) {
      this.triggerAlert('highPacketLoss', {
        value: lossRate,
        threshold: this.metrics.packetLoss.threshold,
        unit: '%'
      });
    } else if (lossRate <= this.metrics.packetLoss.threshold && this.alerts.highPacketLoss) {
      this.clearAlert('highPacketLoss');
    }
  }

  /**
   * Record jitter metrics (from RTCP RR)
   */
  recordJitter(jitterMs, timestamp = Date.now()) {
    this.metrics.jitter.current = jitterMs;

    if (jitterMs < this.metrics.jitter.min || this.metrics.jitter.min === 0) {
      this.metrics.jitter.min = jitterMs;
    }
    if (jitterMs > this.metrics.jitter.max) {
      this.metrics.jitter.max = jitterMs;
    }

    this.addTimeSeriesData('jitter', jitterMs, timestamp);
    this.updateAverage('jitter');

    // Check threshold
    if (jitterMs > this.metrics.jitter.threshold && !this.alerts.highJitter) {
      this.triggerAlert('highJitter', {
        value: jitterMs,
        threshold: this.metrics.jitter.threshold,
        unit: 'ms'
      });
    } else if (jitterMs <= this.metrics.jitter.threshold && this.alerts.highJitter) {
      this.clearAlert('highJitter');
    }
  }

  /**
   * Record RTT (Round-Trip Time) metrics
   */
  recordRTT(rttMs, timestamp = Date.now()) {
    this.metrics.rtt.current = rttMs;

    if (rttMs < this.metrics.rtt.min || this.metrics.rtt.min === 0) {
      this.metrics.rtt.min = rttMs;
    }
    if (rttMs > this.metrics.rtt.max) {
      this.metrics.rtt.max = rttMs;
    }

    this.addTimeSeriesData('rtt', rttMs, timestamp);
    this.updateAverage('rtt');

    // Check threshold
    if (rttMs > this.metrics.rtt.threshold && !this.alerts.highRTT) {
      this.triggerAlert('highRTT', {
        value: rttMs,
        threshold: this.metrics.rtt.threshold,
        unit: 'ms'
      });
    } else if (rttMs <= this.metrics.rtt.threshold && this.alerts.highRTT) {
      this.clearAlert('highRTT');
    }
  }

  /**
   * Record bitrate metrics (from RTP or TWCC)
   */
  recordBitrate(bitrate, timestamp = Date.now()) {
    this.metrics.bitrate.current = bitrate;

    if (bitrate < this.metrics.bitrate.min || this.metrics.bitrate.min === 0) {
      this.metrics.bitrate.min = bitrate;
    }
    if (bitrate > this.metrics.bitrate.max) {
      this.metrics.bitrate.max = bitrate;
    }

    this.addTimeSeriesData('bitrate', bitrate, timestamp);
    this.updateAverage('bitrate');
  }

  /**
   * Calculate and record quality score (0-10)
   */
  calculateQualityScore() {
    let score = 10.0;

    // Deduct based on packet loss (max 3 points)
    score -= Math.min(3, (this.metrics.packetLoss.current / 10) * 3);

    // Deduct based on jitter (max 2 points)
    score -= Math.min(2, (this.metrics.jitter.current / 50) * 2);

    // Deduct based on RTT (max 2 points)
    score -= Math.min(2, (this.metrics.rtt.current / 200) * 2);

    // Bonus for stable quality (up to +1 point)
    const variance = this.calculateVariance('qualityScore');
    if (variance < 0.5) {
      score = Math.min(10, score + 1);
    }

    const finalScore = Math.max(0, Math.min(10, score));

    this.metrics.qualityScore.current = parseFloat(finalScore.toFixed(1));
    this.addTimeSeriesData('qualityScore', finalScore);
    this.updateAverage('qualityScore');

    // Check threshold
    if (finalScore < this.metrics.qualityScore.threshold && !this.alerts.lowQualityScore) {
      this.triggerAlert('lowQualityScore', {
        value: finalScore,
        threshold: this.metrics.qualityScore.threshold
      });
    } else if (finalScore >= this.metrics.qualityScore.threshold && this.alerts.lowQualityScore) {
      this.clearAlert('lowQualityScore');
    }

    return finalScore;
  }

  /**
   * Record codec metrics
   */
  recordCodec(codec) {
    const validCodecs = ['h264', 'vp9', 'av1'];
    if (!validCodecs.includes(codec)) return;

    this.metrics.codecDistribution[codec]++;
    this.metrics.codecDistribution.total++;
  }

  /**
   * Record CPU usage
   */
  recordCPUUsage(cpuPercent) {
    this.metrics.cpuUsage.current = cpuPercent;
    this.metrics.cpuUsage.avg = (this.metrics.cpuUsage.avg * 0.9) + (cpuPercent * 0.1);

    if (cpuPercent > this.metrics.cpuUsage.threshold && !this.alerts.highCPU) {
      this.triggerAlert('highCPU', {
        value: cpuPercent,
        threshold: this.metrics.cpuUsage.threshold,
        unit: '%'
      });
    } else if (cpuPercent <= this.metrics.cpuUsage.threshold && this.alerts.highCPU) {
      this.clearAlert('highCPU');
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(memoryPercent) {
    this.metrics.memoryUsage.current = memoryPercent;
    this.metrics.memoryUsage.avg = (this.metrics.memoryUsage.avg * 0.9) + (memoryPercent * 0.1);

    if (memoryPercent > this.metrics.memoryUsage.threshold && !this.alerts.highMemory) {
      this.triggerAlert('highMemory', {
        value: memoryPercent,
        threshold: this.metrics.memoryUsage.threshold,
        unit: '%'
      });
    } else if (memoryPercent <= this.metrics.memoryUsage.threshold && this.alerts.highMemory) {
      this.clearAlert('highMemory');
    }
  }

  /**
   * Record participant count
   */
  recordParticipants(count) {
    this.metrics.participantCount = count;
    if (count > this.metrics.maxParticipantsReached) {
      this.metrics.maxParticipantsReached = count;
    }
    this.addTimeSeriesData('participantCount', count);
  }

  /**
   * Record error
   */
  recordError(errorType) {
    this.metrics.errorCount.total++;

    if (this.metrics.errorCount[errorType] !== undefined) {
      this.metrics.errorCount[errorType]++;
    }

    if (errorType === 'iceFailure' && !this.alerts.iceFailure) {
      this.triggerAlert('iceFailure', {
        count: this.metrics.errorCount.iceFailure
      });
    }
  }

  /**
   * Add data point to time-series
   */
  addTimeSeriesData(metric, value, timestamp = Date.now()) {
    const timeSeries = this.metrics.timeSeries[metric];

    timeSeries.push({
      timestamp,
      value
    });

    // Keep only recent data (sampling size)
    if (timeSeries.length > this.samplingSize) {
      timeSeries.shift();
    }
  }

  /**
   * Update rolling average
   */
  updateAverage(metric) {
    const timeSeries = this.metrics.timeSeries[metric];
    if (timeSeries.length === 0) return;

    const sum = timeSeries.reduce((acc, point) => acc + point.value, 0);
    this.metrics[metric].avg = sum / timeSeries.length;
  }

  /**
   * Calculate variance for trend detection
   */
  calculateVariance(metric) {
    const timeSeries = this.metrics.timeSeries[metric];
    if (timeSeries.length < 2) return 0;

    const mean = this.metrics[metric].avg;
    const squaredDiffs = timeSeries.map(point => Math.pow(point.value - mean, 2));
    const sumSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0);

    return sumSquaredDiffs / timeSeries.length;
  }

  /**
   * Trigger alert
   */
  triggerAlert(alertName, details) {
    this.alerts[alertName] = true;

    console.warn(`⚠️  ALERT: ${alertName}`, details);

    this.emit('alert:triggered', {
      alert: alertName,
      severity: this.getAlertSeverity(alertName),
      details,
      timestamp: Date.now()
    });

    // Execute alert handler if registered
    if (this.alertHandlers[alertName]) {
      this.alertHandlers[alertName](details);
    }
  }

  /**
   * Clear alert
   */
  clearAlert(alertName) {
    if (this.alerts[alertName]) {
      this.alerts[alertName] = false;

      console.log(`✅ ALERT CLEARED: ${alertName}`);

      this.emit('alert:cleared', {
        alert: alertName,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get alert severity level
   */
  getAlertSeverity(alertName) {
    const severities = {
      'highPacketLoss': 'critical',
      'highJitter': 'warning',
      'highRTT': 'warning',
      'lowQualityScore': 'critical',
      'highCPU': 'warning',
      'highMemory': 'critical',
      'iceFailure': 'critical'
    };

    return severities[alertName] || 'info';
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(alertName, handler) {
    this.alertHandlers[alertName] = handler;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.monitoring) return;

    this.monitoring = true;
    console.log(`📊 Starting metrics collection...`);

    this.monitoringInterval = setInterval(() => {
      this.scrapeMetrics();
    }, this.scrapeInterval);

    this.emit('monitoring:started', { serverId: this.serverId });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log(`⏹️  Stopped metrics collection`);

    this.emit('monitoring:stopped', { serverId: this.serverId });
  }

  /**
   * Scrape metrics (Prometheus-style)
   */
  scrapeMetrics() {
    // Recalculate quality score
    this.calculateQualityScore();

    this.emit('metrics:scraped', {
      timestamp: Date.now(),
      metrics: this.getMetricsSnapshot()
    });
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot() {
    return {
      timestamp: Date.now(),
      serverId: this.serverId,
      environment: this.environment,
      activeConnections: this.metrics.activeConnections,
      totalConnections: this.metrics.totalConnectionsCreated,
      failedConnections: this.metrics.failedConnections,
      quality: {
        packetLoss: {
          current: this.metrics.packetLoss.current,
          avg: parseFloat(this.metrics.packetLoss.avg.toFixed(2)),
          threshold: this.metrics.packetLoss.threshold,
          status: this.metrics.packetLoss.current > this.metrics.packetLoss.threshold ? 'alert' : 'ok'
        },
        jitter: {
          current: this.metrics.jitter.current,
          avg: parseFloat(this.metrics.jitter.avg.toFixed(2)),
          threshold: this.metrics.jitter.threshold,
          status: this.metrics.jitter.current > this.metrics.jitter.threshold ? 'alert' : 'ok'
        },
        rtt: {
          current: this.metrics.rtt.current,
          avg: parseFloat(this.metrics.rtt.avg.toFixed(2)),
          threshold: this.metrics.rtt.threshold,
          status: this.metrics.rtt.current > this.metrics.rtt.threshold ? 'alert' : 'ok'
        },
        qualityScore: parseFloat(this.metrics.qualityScore.current.toFixed(1))
      },
      bitrate: {
        current: this.metrics.bitrate.current,
        avg: parseFloat(this.metrics.bitrate.avg.toFixed(0))
      },
      codecs: this.metrics.codecDistribution,
      participants: this.metrics.participantCount,
      cpu: this.metrics.cpuUsage.current,
      memory: this.metrics.memoryUsage.current,
      errors: this.metrics.errorCount.total,
      alerts: Object.entries(this.alerts)
        .filter(([, active]) => active)
        .map(([alert]) => alert)
    };
  }

  /**
   * Get Prometheus-format metrics
   */
  getPrometheusMetrics() {
    const snapshot = this.getMetricsSnapshot();
    let output = '';

    // Header
    output += `# HELP webrtc_packet_loss Packet loss percentage\n`;
    output += `# TYPE webrtc_packet_loss gauge\n`;
    output += `webrtc_packet_loss{server="${this.serverId}",environment="${this.environment}"} ${snapshot.quality.packetLoss.current}\n\n`;

    output += `# HELP webrtc_jitter Jitter in milliseconds\n`;
    output += `# TYPE webrtc_jitter gauge\n`;
    output += `webrtc_jitter{server="${this.serverId}",environment="${this.environment}"} ${snapshot.quality.jitter.current}\n\n`;

    output += `# HELP webrtc_rtt Round trip time in milliseconds\n`;
    output += `# TYPE webrtc_rtt gauge\n`;
    output += `webrtc_rtt{server="${this.serverId}",environment="${this.environment}"} ${snapshot.quality.rtt.current}\n\n`;

    output += `# HELP webrtc_quality_score Overall quality score 0-10\n`;
    output += `# TYPE webrtc_quality_score gauge\n`;
    output += `webrtc_quality_score{server="${this.serverId}",environment="${this.environment}"} ${snapshot.quality.qualityScore}\n\n`;

    output += `# HELP webrtc_bitrate Current bitrate in kbps\n`;
    output += `# TYPE webrtc_bitrate gauge\n`;
    output += `webrtc_bitrate{server="${this.serverId}",environment="${this.environment}"} ${snapshot.bitrate.current}\n\n`;

    output += `# HELP webrtc_participants Current participant count\n`;
    output += `# TYPE webrtc_participants gauge\n`;
    output += `webrtc_participants{server="${this.serverId}",environment="${this.environment}"} ${snapshot.participants}\n\n`;

    output += `# HELP webrtc_cpu_usage CPU usage percentage\n`;
    output += `# TYPE webrtc_cpu_usage gauge\n`;
    output += `webrtc_cpu_usage{server="${this.serverId}",environment="${this.environment}"} ${snapshot.cpu}\n\n`;

    output += `# HELP webrtc_memory_usage Memory usage percentage\n`;
    output += `# TYPE webrtc_memory_usage gauge\n`;
    output += `webrtc_memory_usage{server="${this.serverId}",environment="${this.environment}"} ${snapshot.memory}\n\n`;

    return output;
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      serverId: this.serverId,
      environment: this.environment,
      uptime: Date.now() - this.state?.startTime || 0,
      metrics: this.getMetricsSnapshot(),
      alerts: Object.entries(this.alerts)
        .filter(([, active]) => active)
        .reduce((acc, [alert]) => ({ ...acc, [alert]: true }), {}),
      timeSeries: Object.entries(this.metrics.timeSeries).reduce((acc, [key, data]) => {
        acc[key] = {
          current: data.length > 0 ? data[data.length - 1].value : 0,
          count: data.length,
          trend: this.calculateTrend(data)
        };
        return acc;
      }, {}),
      errorMetrics: this.metrics.errorCount
    };
  }

  /**
   * Calculate trend (improving, stable, degrading)
   */
  calculateTrend(timeSeries) {
    if (timeSeries.length < 2) return 'stable';

    const recentHalf = timeSeries.slice(Math.floor(timeSeries.length / 2));
    const olderHalf = timeSeries.slice(0, Math.floor(timeSeries.length / 2));

    const recentAvg = recentHalf.reduce((sum, p) => sum + p.value, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, p) => sum + p.value, 0) / olderHalf.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'degrading';
    if (change < -5) return 'improving';
    return 'stable';
  }
}

module.exports = WebRTCMetricsExporter;
