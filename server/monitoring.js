/**
 * Monitoring and Metrics Collection Module
 *
 * Collects application metrics and exposes them in Prometheus format
 */

const { performance } = require('perf_hooks');
const os = require('os');

class MetricsCollector {
  constructor() {
    this.metrics = {
      http_requests_total: new Map(),
      http_request_duration_ms: [],
      http_errors_total: new Map(),
      active_connections: 0,
      database_connections: 0,
      process_memory_bytes: 0,
      process_cpu_seconds_total: 0,
      custom_events: new Map()
    };

    this.startTime = Date.now();
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method, path, statusCode, duration) {
    const key = `${method}_${path}`;

    // Request count
    const current = this.metrics.http_requests_total.get(key) || 0;
    this.metrics.http_requests_total.set(key, current + 1);

    // Request duration
    this.metrics.http_request_duration_ms.push(duration);

    // Error tracking
    if (statusCode >= 400) {
      const errorKey = `${statusCode}_${method}_${path}`;
      const errorCount = this.metrics.http_errors_total.get(errorKey) || 0;
      this.metrics.http_errors_total.set(errorKey, errorCount + 1);
    }
  }

  /**
   * Record custom event
   */
  recordEvent(eventName, count = 1) {
    const current = this.metrics.custom_events.get(eventName) || 0;
    this.metrics.custom_events.set(eventName, current + count);
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.process_memory_bytes = memUsage.heapUsed;
    this.metrics.process_cpu_seconds_total = (cpuUsage.user + cpuUsage.system) / 1000000;
  }

  /**
   * Get current metrics as object
   */
  getMetrics() {
    this.updateSystemMetrics();

    const requestDurations = this.metrics.http_request_duration_ms;
    const avgDuration = requestDurations.length > 0
      ? requestDurations.reduce((a, b) => a + b, 0) / requestDurations.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      http: {
        requests_total: Array.from(this.metrics.http_requests_total.entries()).reduce((a, b) => a + b[1], 0),
        requests_by_method: this._aggregateByMethod(),
        errors_total: Array.from(this.metrics.http_errors_total.entries()).reduce((a, b) => a + b[1], 0),
        avg_duration_ms: avgDuration.toFixed(2),
        p95_duration_ms: this._calculatePercentile(95),
        p99_duration_ms: this._calculatePercentile(99)
      },
      system: {
        memory_bytes: this.metrics.process_memory_bytes,
        memory_mb: Math.round(this.metrics.process_memory_bytes / 1024 / 1024),
        cpu_seconds: this.metrics.process_cpu_seconds_total.toFixed(2),
        free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
        total_memory_mb: Math.round(os.totalmem() / 1024 / 1024)
      },
      events: Object.fromEntries(this.metrics.custom_events)
    };
  }

  /**
   * Aggregate requests by method
   */
  _aggregateByMethod() {
    const byMethod = {};

    for (const [key, count] of this.metrics.http_requests_total.entries()) {
      const method = key.split('_')[0];
      byMethod[method] = (byMethod[method] || 0) + count;
    }

    return byMethod;
  }

  /**
   * Calculate percentile duration
   */
  _calculatePercentile(percentile) {
    if (this.metrics.http_request_duration_ms.length === 0) return 0;

    const sorted = [...this.metrics.http_request_duration_ms].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)].toFixed(2);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus() {
    const metrics = this.getMetrics();
    let output = '# HELP webrtc_http_requests_total Total HTTP requests\n';
    output += '# TYPE webrtc_http_requests_total counter\n';

    for (const [key, value] of this.metrics.http_requests_total.entries()) {
      const [method, ...pathParts] = key.split('_');
      const path = pathParts.join('_');
      output += `webrtc_http_requests_total{method="${method}",path="${path}"} ${value}\n`;
    }

    output += '\n# HELP webrtc_http_request_duration_ms HTTP request duration\n';
    output += '# TYPE webrtc_http_request_duration_ms gauge\n';
    output += `webrtc_http_request_duration_ms{quantile="0.5"} ${metrics.http.avg_duration_ms}\n`;
    output += `webrtc_http_request_duration_ms{quantile="0.95"} ${metrics.http.p95_duration_ms}\n`;
    output += `webrtc_http_request_duration_ms{quantile="0.99"} ${metrics.http.p99_duration_ms}\n`;

    output += '\n# HELP webrtc_process_memory_bytes Process memory usage\n';
    output += '# TYPE webrtc_process_memory_bytes gauge\n';
    output += `webrtc_process_memory_bytes ${metrics.system.memory_bytes}\n`;

    output += '\n# HELP webrtc_process_uptime_seconds Process uptime\n';
    output += '# TYPE webrtc_process_uptime_seconds counter\n';
    output += `webrtc_process_uptime_seconds ${metrics.uptime_seconds}\n`;

    return output;
  }

  /**
   * Export metrics as JSON
   */
  exportJSON() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Print metrics summary to console
   */
  printSummary() {
    const metrics = this.getMetrics();

    console.log('\n═════════════════════════════════════════════════════');
    console.log('📊 METRICS SUMMARY');
    console.log('═════════════════════════════════════════════════════');
    console.log(`⏱️  Uptime: ${metrics.uptime_seconds}s`);
    console.log(`\n📈 HTTP Metrics:`);
    console.log(`   Total Requests: ${metrics.http.requests_total}`);
    console.log(`   Avg Duration: ${metrics.http.avg_duration_ms}ms`);
    console.log(`   P95: ${metrics.http.p95_duration_ms}ms`);
    console.log(`   P99: ${metrics.http.p99_duration_ms}ms`);
    console.log(`   Errors: ${metrics.http.errors_total}`);
    console.log(`\n💾 System Metrics:`);
    console.log(`   Memory: ${metrics.system.memory_mb}MB / ${metrics.system.total_memory_mb}MB`);
    console.log(`   Free: ${metrics.system.free_memory_mb}MB`);
    console.log(`   CPU: ${metrics.system.cpu_seconds}s`);

    if (Object.keys(metrics.events).length > 0) {
      console.log(`\n🎯 Custom Events:`);
      for (const [event, count] of Object.entries(metrics.events)) {
        console.log(`   ${event}: ${count}`);
      }
    }

    console.log('═════════════════════════════════════════════════════\n');
  }
}

/**
 * Express middleware for request tracking
 */
function createMetricsMiddleware(collector) {
  return (req, res, next) => {
    const startTime = performance.now();

    // Hook into response finish
    res.on('finish', () => {
      const duration = performance.now() - startTime;
      collector.recordHttpRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
  };
}

module.exports = {
  MetricsCollector,
  createMetricsMiddleware
};
