/**
 * Phase 54: Advanced Observability & Monitoring
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Comprehensive observability stack for production operations
 *
 * Components:
 * 1. Distributed Tracing Engine - OpenTelemetry compatible
 * 2. Metrics Aggregation Engine - Prometheus-style metrics
 * 3. Log Aggregation Engine - Structured logging with correlation
 * 4. Real-Time Alerting Engine - Multi-channel alerting
 * 5. Performance Profiling Engine - Continuous profiling
 * 6. Anomaly Detection Engine - ML-based anomaly detection
 * 7. SLO/SLI Management Engine - Service level objectives
 *
 * Research Sources:
 * - OpenTelemetry specification (2024)
 * - Prometheus best practices
 * - Grafana observability stack
 * - Datadog APM architecture
 * - Google SRE book
 * - Netflix Atlas monitoring
 *
 * @module Phase54_Advanced_Observability_Monitoring
 * @version 1.0.0
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  status: 'OK' | 'ERROR' | 'UNSET';
  attributes: Map<string, string | number | boolean>;
  events: SpanEvent[];
  links: SpanLink[];
}

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Map<string, string | number | boolean>;
}

interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Map<string, string | number | boolean>;
}

interface Trace {
  traceId: string;
  spans: Span[];
  rootSpan: Span | null;
  startTime: number;
  endTime: number;
  duration: number;
  serviceCalls: Map<string, number>;
  errorCount: number;
}

interface MetricPoint {
  timestamp: number;
  value: number;
  labels: Map<string, string>;
}

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  unit: string;
  points: MetricPoint[];
  labels: Map<string, string>;
}

interface Histogram {
  buckets: number[];
  counts: number[];
  sum: number;
  count: number;
}

interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  attributes: Map<string, any>;
  stackTrace?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
  cooldownMs: number;
  enabled: boolean;
  lastFired?: number;
}

interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number; // Must be true for this duration
  aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolvedAt?: number;
  acknowledged: boolean;
}

interface ProfileSample {
  timestamp: number;
  stackTrace: string[];
  cpuTime: number;
  allocations: number;
  threadId: string;
}

interface Profile {
  id: string;
  type: 'cpu' | 'memory' | 'wall' | 'goroutine';
  startTime: number;
  endTime: number;
  samples: ProfileSample[];
  aggregatedStacks: Map<string, number>;
}

interface AnomalyResult {
  metric: string;
  timestamp: number;
  value: number;
  expected: number;
  deviation: number;
  isAnomaly: boolean;
  confidence: number;
  type: 'spike' | 'drop' | 'trend_change' | 'seasonal';
}

interface SLO {
  id: string;
  name: string;
  description: string;
  sli: SLI;
  target: number; // e.g., 99.9
  window: 'rolling_7d' | 'rolling_30d' | 'calendar_month';
  errorBudget: number;
  burnRate: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface SLI {
  type: 'availability' | 'latency' | 'error_rate' | 'throughput';
  goodQuery: string;
  totalQuery: string;
}

// ============================================================================
// 1. Distributed Tracing Engine (OpenTelemetry Compatible)
// ============================================================================

/**
 * Distributed Tracing with OpenTelemetry
 *
 * Features:
 * - W3C Trace Context propagation
 * - Span creation and management
 * - Trace correlation across services
 * - Sampling strategies
 *
 * Research: OpenTelemetry, Jaeger, Zipkin
 */
class DistributedTracingEngine {
  private traces: Map<string, Trace> = new Map();
  private activeSpans: Map<string, Span> = new Map();
  private samplingRate: number;
  private serviceName: string;
  private spanProcessors: ((span: Span) => void)[] = [];
  private maxTracesStored: number = 10000;

  constructor(serviceName: string, samplingRate: number = 1.0) {
    this.serviceName = serviceName;
    this.samplingRate = samplingRate;
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string): Span {
    const traceId = this.generateTraceId();
    return this.startSpan(operationName, traceId, null);
  }

  /**
   * Start a new span
   */
  startSpan(
    operationName: string,
    traceId?: string,
    parentSpanId?: string | null
  ): Span {
    // Check sampling
    if (Math.random() > this.samplingRate) {
      // Return no-op span for unsampled requests
      return this.createNoOpSpan();
    }

    const span: Span = {
      traceId: traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parentSpanId ?? null,
      operationName,
      serviceName: this.serviceName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      status: 'UNSET',
      attributes: new Map(),
      events: [],
      links: []
    };

    this.activeSpans.set(span.spanId, span);

    // Ensure trace exists
    if (!this.traces.has(span.traceId)) {
      this.traces.set(span.traceId, {
        traceId: span.traceId,
        spans: [],
        rootSpan: parentSpanId === null ? span : null,
        startTime: span.startTime,
        endTime: 0,
        duration: 0,
        serviceCalls: new Map(),
        errorCount: 0
      });
    }

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status: 'OK' | 'ERROR' = 'OK'): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(span.spanId);

    // Add to trace
    const trace = this.traces.get(span.traceId);
    if (trace) {
      trace.spans.push(span);
      trace.endTime = Math.max(trace.endTime, span.endTime);
      trace.duration = trace.endTime - trace.startTime;

      // Track service calls
      const serviceCount = trace.serviceCalls.get(span.serviceName) || 0;
      trace.serviceCalls.set(span.serviceName, serviceCount + 1);

      if (status === 'ERROR') {
        trace.errorCount++;
      }
    }

    // Process span
    for (const processor of this.spanProcessors) {
      try {
        processor(span);
      } catch (error) {
        console.error('Span processor error:', error);
      }
    }

    // Cleanup old traces
    this.cleanupOldTraces();
  }

  /**
   * Add event to span
   */
  addEvent(span: Span, name: string, attributes?: Record<string, any>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes: new Map(Object.entries(attributes || {}))
    });
  }

  /**
   * Set span attribute
   */
  setAttribute(span: Span, key: string, value: string | number | boolean): void {
    span.attributes.set(key, value);
  }

  /**
   * Set span error
   */
  setError(span: Span, error: Error): void {
    span.status = 'ERROR';
    span.attributes.set('error.type', error.name);
    span.attributes.set('error.message', error.message);
    if (error.stack) {
      span.attributes.set('error.stack', error.stack);
    }
  }

  /**
   * Create child span
   */
  createChildSpan(parent: Span, operationName: string): Span {
    return this.startSpan(operationName, parent.traceId, parent.spanId);
  }

  /**
   * Get trace context for propagation (W3C format)
   */
  getTraceContext(span: Span): { traceparent: string; tracestate: string } {
    // W3C Trace Context format: version-traceId-spanId-flags
    const traceparent = `00-${span.traceId}-${span.spanId}-01`;
    const tracestate = `ring=${this.serviceName}`;

    return { traceparent, tracestate };
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): {
    traceId: string;
    parentSpanId: string;
  } | null {
    const traceparent = headers['traceparent'];
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    return {
      traceId: parts[1],
      parentSpanId: parts[2]
    };
  }

  /**
   * Register span processor
   */
  addSpanProcessor(processor: (span: Span) => void): void {
    this.spanProcessors.push(processor);
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Search traces
   */
  searchTraces(
    query: {
      service?: string;
      operation?: string;
      minDuration?: number;
      maxDuration?: number;
      hasError?: boolean;
      limit?: number;
    }
  ): Trace[] {
    const results: Trace[] = [];
    const limit = query.limit || 100;

    for (const trace of this.traces.values()) {
      if (results.length >= limit) break;

      let matches = true;

      if (query.service && !trace.serviceCalls.has(query.service)) {
        matches = false;
      }

      if (query.operation) {
        const hasOperation = trace.spans.some(s => s.operationName === query.operation);
        if (!hasOperation) matches = false;
      }

      if (query.minDuration && trace.duration < query.minDuration) {
        matches = false;
      }

      if (query.maxDuration && trace.duration > query.maxDuration) {
        matches = false;
      }

      if (query.hasError !== undefined && (trace.errorCount > 0) !== query.hasError) {
        matches = false;
      }

      if (matches) {
        results.push(trace);
      }
    }

    return results;
  }

  /**
   * Generate trace ID (32 hex characters)
   */
  private generateTraceId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate span ID (16 hex characters)
   */
  private generateSpanId(): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create no-op span for unsampled requests
   */
  private createNoOpSpan(): Span {
    return {
      traceId: '0'.repeat(32),
      spanId: '0'.repeat(16),
      parentSpanId: null,
      operationName: 'noop',
      serviceName: this.serviceName,
      startTime: 0,
      endTime: 0,
      duration: 0,
      status: 'UNSET',
      attributes: new Map(),
      events: [],
      links: []
    };
  }

  /**
   * Cleanup old traces
   */
  private cleanupOldTraces(): void {
    if (this.traces.size > this.maxTracesStored) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort((a, b) => a[1].startTime - b[1].startTime);

      const toRemove = sortedTraces.slice(0, this.traces.size - this.maxTracesStored);
      for (const [traceId] of toRemove) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalTraces: number;
    activeSpans: number;
    samplingRate: number;
    avgTraceSpans: number;
    errorRate: number;
  } {
    const traces = Array.from(this.traces.values());
    const totalSpans = traces.reduce((sum, t) => sum + t.spans.length, 0);
    const totalErrors = traces.reduce((sum, t) => sum + t.errorCount, 0);

    return {
      totalTraces: this.traces.size,
      activeSpans: this.activeSpans.size,
      samplingRate: this.samplingRate,
      avgTraceSpans: traces.length > 0 ? totalSpans / traces.length : 0,
      errorRate: totalSpans > 0 ? totalErrors / totalSpans : 0
    };
  }
}

// ============================================================================
// 2. Metrics Aggregation Engine (Prometheus-style)
// ============================================================================

/**
 * Prometheus-style Metrics Collection
 *
 * Features:
 * - Counter, Gauge, Histogram, Summary
 * - Label-based dimensions
 * - Time series storage
 * - PromQL-compatible queries
 *
 * Research: Prometheus, OpenMetrics, VictoriaMetrics
 */
class MetricsAggregationEngine {
  private metrics: Map<string, Metric> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  private maxPointsPerMetric = 1000;

  /**
   * Create a counter metric
   */
  counter(name: string, description: string, labels?: Record<string, string>): void {
    this.createMetric(name, 'counter', description, 'count', labels);
  }

  /**
   * Increment counter
   */
  inc(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, 'counter');
    const key = this.labelsToKey(labels);
    const lastPoint = this.getLastPoint(metric, key);
    const newValue = (lastPoint?.value || 0) + value;

    this.addPoint(metric, newValue, labels);
  }

  /**
   * Create a gauge metric
   */
  gauge(name: string, description: string, labels?: Record<string, string>): void {
    this.createMetric(name, 'gauge', description, 'value', labels);
  }

  /**
   * Set gauge value
   */
  set(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, 'gauge');
    this.addPoint(metric, value, labels);
  }

  /**
   * Increment gauge
   */
  incGauge(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, 'gauge');
    const key = this.labelsToKey(labels);
    const lastPoint = this.getLastPoint(metric, key);
    const newValue = (lastPoint?.value || 0) + value;

    this.addPoint(metric, newValue, labels);
  }

  /**
   * Decrement gauge
   */
  decGauge(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.incGauge(name, -value, labels);
  }

  /**
   * Create histogram metric
   */
  histogram(
    name: string,
    description: string,
    buckets?: number[],
    labels?: Record<string, string>
  ): void {
    this.createMetric(name, 'histogram', description, 'seconds', labels);

    const histKey = this.labelsToKey(labels) + ':' + name;
    this.histograms.set(histKey, {
      buckets: buckets || this.defaultBuckets,
      counts: new Array((buckets || this.defaultBuckets).length + 1).fill(0),
      sum: 0,
      count: 0
    });
  }

  /**
   * Observe histogram value
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    const histKey = this.labelsToKey(labels) + ':' + name;
    let hist = this.histograms.get(histKey);

    if (!hist) {
      this.histogram(name, '', undefined, labels);
      hist = this.histograms.get(histKey)!;
    }

    // Update histogram
    hist.sum += value;
    hist.count++;

    // Update bucket counts
    for (let i = 0; i < hist.buckets.length; i++) {
      if (value <= hist.buckets[i]) {
        hist.counts[i]++;
      }
    }
    hist.counts[hist.counts.length - 1]++; // +Inf bucket

    // Also store as time series point
    const metric = this.getOrCreateMetric(name, 'histogram');
    this.addPoint(metric, value, labels);
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = (performance.now() - start) / 1000; // Convert to seconds
      this.observe(name, duration, labels);
    }
  }

  /**
   * Query metric
   */
  query(
    name: string,
    options?: {
      labels?: Record<string, string>;
      start?: number;
      end?: number;
      aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count' | 'rate';
      step?: number;
    }
  ): number | number[] {
    const metric = this.metrics.get(name);
    if (!metric) return 0;

    const now = Date.now();
    const start = options?.start || now - 3600000; // Default 1 hour
    const end = options?.end || now;
    const labelKey = this.labelsToKey(options?.labels);

    // Filter points by time range and labels
    let points = metric.points.filter(p => {
      const timeMatch = p.timestamp >= start && p.timestamp <= end;
      const labelMatch = !labelKey || this.labelsToKey(Object.fromEntries(p.labels)) === labelKey;
      return timeMatch && labelMatch;
    });

    if (points.length === 0) return 0;

    // Apply aggregation
    switch (options?.aggregation) {
      case 'avg':
        return points.reduce((sum, p) => sum + p.value, 0) / points.length;
      case 'min':
        return Math.min(...points.map(p => p.value));
      case 'max':
        return Math.max(...points.map(p => p.value));
      case 'sum':
        return points.reduce((sum, p) => sum + p.value, 0);
      case 'count':
        return points.length;
      case 'rate':
        // Calculate rate of change
        if (points.length < 2) return 0;
        const first = points[0];
        const last = points[points.length - 1];
        const timeDiff = (last.timestamp - first.timestamp) / 1000;
        return timeDiff > 0 ? (last.value - first.value) / timeDiff : 0;
      default:
        // Return raw values for range queries
        if (options?.step) {
          return this.aggregateByStep(points, start, end, options.step);
        }
        return points[points.length - 1].value;
    }
  }

  /**
   * Get histogram percentile
   */
  percentile(name: string, p: number, labels?: Record<string, string>): number {
    const histKey = this.labelsToKey(labels) + ':' + name;
    const hist = this.histograms.get(histKey);

    if (!hist || hist.count === 0) return 0;

    const targetCount = hist.count * (p / 100);
    let cumulativeCount = 0;

    for (let i = 0; i < hist.buckets.length; i++) {
      cumulativeCount += hist.counts[i];
      if (cumulativeCount >= targetCount) {
        // Linear interpolation within bucket
        const prevCount = i > 0 ? hist.counts[i - 1] : 0;
        const prevBucket = i > 0 ? hist.buckets[i - 1] : 0;
        const bucketRange = hist.buckets[i] - prevBucket;
        const bucketRatio = (targetCount - prevCount) / (hist.counts[i] || 1);
        return prevBucket + bucketRange * bucketRatio;
      }
    }

    return hist.buckets[hist.buckets.length - 1];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.metrics) {
      lines.push(`# HELP ${name} ${metric.description}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      // Group points by labels
      const labelGroups = new Map<string, MetricPoint>();
      for (const point of metric.points) {
        const key = this.labelsToKey(Object.fromEntries(point.labels));
        labelGroups.set(key, point);
      }

      for (const [, point] of labelGroups) {
        const labelStr = Array.from(point.labels.entries())
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        const metricLine = labelStr
          ? `${name}{${labelStr}} ${point.value}`
          : `${name} ${point.value}`;

        lines.push(metricLine);
      }
    }

    return lines.join('\n');
  }

  /**
   * Create metric
   */
  private createMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'summary',
    description: string,
    unit: string,
    labels?: Record<string, string>
  ): Metric {
    const metric: Metric = {
      name,
      type,
      description,
      unit,
      points: [],
      labels: new Map(Object.entries(labels || {}))
    };

    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Get or create metric
   */
  private getOrCreateMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram' | 'summary'
  ): Metric {
    let metric = this.metrics.get(name);
    if (!metric) {
      metric = this.createMetric(name, type, '', '', {});
    }
    return metric;
  }

  /**
   * Add point to metric
   */
  private addPoint(metric: Metric, value: number, labels?: Record<string, string>): void {
    metric.points.push({
      timestamp: Date.now(),
      value,
      labels: new Map(Object.entries(labels || {}))
    });

    // Cleanup old points
    if (metric.points.length > this.maxPointsPerMetric) {
      metric.points = metric.points.slice(-this.maxPointsPerMetric);
    }
  }

  /**
   * Get last point for labels
   */
  private getLastPoint(metric: Metric, labelKey: string): MetricPoint | undefined {
    for (let i = metric.points.length - 1; i >= 0; i--) {
      if (this.labelsToKey(Object.fromEntries(metric.points[i].labels)) === labelKey) {
        return metric.points[i];
      }
    }
    return undefined;
  }

  /**
   * Convert labels to key
   */
  private labelsToKey(labels?: Record<string, string>): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
  }

  /**
   * Aggregate by step
   */
  private aggregateByStep(
    points: MetricPoint[],
    start: number,
    end: number,
    step: number
  ): number[] {
    const result: number[] = [];
    let currentStep = start;

    while (currentStep < end) {
      const stepEnd = currentStep + step;
      const stepPoints = points.filter(
        p => p.timestamp >= currentStep && p.timestamp < stepEnd
      );

      if (stepPoints.length > 0) {
        result.push(stepPoints.reduce((sum, p) => sum + p.value, 0) / stepPoints.length);
      } else {
        result.push(0);
      }

      currentStep = stepEnd;
    }

    return result;
  }

  /**
   * Get metrics summary
   */
  getMetrics(): {
    totalMetrics: number;
    totalPoints: number;
    histograms: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    let totalPoints = 0;

    for (const metric of this.metrics.values()) {
      byType[metric.type] = (byType[metric.type] || 0) + 1;
      totalPoints += metric.points.length;
    }

    return {
      totalMetrics: this.metrics.size,
      totalPoints,
      histograms: this.histograms.size,
      byType
    };
  }
}

// ============================================================================
// 3. Log Aggregation Engine
// ============================================================================

/**
 * Structured Logging with Trace Correlation
 *
 * Features:
 * - JSON structured logging
 * - Log levels with filtering
 * - Trace ID correlation
 * - Log shipping to external systems
 *
 * Research: ELK Stack, Loki, Fluentd
 */
class LogAggregationEngine {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100000;
  private logHandlers: ((entry: LogEntry) => void)[] = [];
  private serviceName: string;
  private minLevel: number;
  private readonly levelPriority = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
  };

  constructor(serviceName: string, minLevel: LogEntry['level'] = 'INFO') {
    this.serviceName = serviceName;
    this.minLevel = this.levelPriority[minLevel];
  }

  /**
   * Log debug message
   */
  debug(message: string, attributes?: Record<string, any>): void {
    this.log('DEBUG', message, attributes);
  }

  /**
   * Log info message
   */
  info(message: string, attributes?: Record<string, any>): void {
    this.log('INFO', message, attributes);
  }

  /**
   * Log warning message
   */
  warn(message: string, attributes?: Record<string, any>): void {
    this.log('WARN', message, attributes);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, attributes?: Record<string, any>): void {
    this.log('ERROR', message, {
      ...attributes,
      error: error?.message,
      errorType: error?.name
    }, error?.stack);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error, attributes?: Record<string, any>): void {
    this.log('FATAL', message, {
      ...attributes,
      error: error?.message,
      errorType: error?.name
    }, error?.stack);
  }

  /**
   * Log with trace context
   */
  withTrace(traceId: string, spanId?: string): {
    debug: (message: string, attributes?: Record<string, any>) => void;
    info: (message: string, attributes?: Record<string, any>) => void;
    warn: (message: string, attributes?: Record<string, any>) => void;
    error: (message: string, error?: Error, attributes?: Record<string, any>) => void;
  } {
    return {
      debug: (message, attributes) =>
        this.log('DEBUG', message, attributes, undefined, traceId, spanId),
      info: (message, attributes) =>
        this.log('INFO', message, attributes, undefined, traceId, spanId),
      warn: (message, attributes) =>
        this.log('WARN', message, attributes, undefined, traceId, spanId),
      error: (message, error, attributes) =>
        this.log('ERROR', message, { ...attributes, error: error?.message },
          error?.stack, traceId, spanId)
    };
  }

  /**
   * Internal log method
   */
  private log(
    level: LogEntry['level'],
    message: string,
    attributes?: Record<string, any>,
    stackTrace?: string,
    traceId?: string,
    spanId?: string
  ): void {
    if (this.levelPriority[level] < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      service: this.serviceName,
      traceId,
      spanId,
      attributes: new Map(Object.entries(attributes || {})),
      stackTrace
    };

    this.logs.push(entry);

    // Cleanup old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify handlers
    for (const handler of this.logHandlers) {
      try {
        handler(entry);
      } catch (e) {
        console.error('Log handler error:', e);
      }
    }
  }

  /**
   * Add log handler
   */
  addHandler(handler: (entry: LogEntry) => void): void {
    this.logHandlers.push(handler);
  }

  /**
   * Search logs
   */
  search(query: {
    level?: LogEntry['level'];
    service?: string;
    traceId?: string;
    message?: string;
    start?: number;
    end?: number;
    limit?: number;
  }): LogEntry[] {
    const limit = query.limit || 100;
    const results: LogEntry[] = [];

    for (let i = this.logs.length - 1; i >= 0 && results.length < limit; i--) {
      const entry = this.logs[i];
      let matches = true;

      if (query.level && this.levelPriority[entry.level] < this.levelPriority[query.level]) {
        matches = false;
      }

      if (query.service && entry.service !== query.service) {
        matches = false;
      }

      if (query.traceId && entry.traceId !== query.traceId) {
        matches = false;
      }

      if (query.message && !entry.message.includes(query.message)) {
        matches = false;
      }

      if (query.start && entry.timestamp < query.start) {
        matches = false;
      }

      if (query.end && entry.timestamp > query.end) {
        matches = false;
      }

      if (matches) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Get logs for trace
   */
  getLogsForTrace(traceId: string): LogEntry[] {
    return this.logs.filter(l => l.traceId === traceId);
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.logs.map(entry => ({
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level,
      message: entry.message,
      service: entry.service,
      traceId: entry.traceId,
      spanId: entry.spanId,
      attributes: Object.fromEntries(entry.attributes),
      stackTrace: entry.stackTrace
    })), null, 2);
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byService: Record<string, number>;
    errorsLast5Min: number;
  } {
    const byLevel: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const fiveMinAgo = Date.now() - 300000;
    let errorsLast5Min = 0;

    for (const entry of this.logs) {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
      byService[entry.service] = (byService[entry.service] || 0) + 1;

      if (entry.timestamp > fiveMinAgo &&
        (entry.level === 'ERROR' || entry.level === 'FATAL')) {
        errorsLast5Min++;
      }
    }

    return {
      total: this.logs.length,
      byLevel,
      byService,
      errorsLast5Min
    };
  }
}

// ============================================================================
// 4. Real-Time Alerting Engine
// ============================================================================

/**
 * Multi-Channel Alerting System
 *
 * Features:
 * - Configurable alert rules
 * - Multiple notification channels
 * - Alert correlation and deduplication
 * - Cooldown periods
 *
 * Research: PagerDuty, OpsGenie, Alertmanager
 */
class RealTimeAlertingEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private channels: Map<string, (alert: Alert) => Promise<void>> = new Map();
  private metricsEngine: MetricsAggregationEngine;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(metricsEngine: MetricsAggregationEngine) {
    this.metricsEngine = metricsEngine;
  }

  /**
   * Start alert checking
   */
  start(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkRules();
    }, intervalMs);

    // Initial check
    this.checkRules();
  }

  /**
   * Stop alert checking
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Register notification channel
   */
  registerChannel(name: string, handler: (alert: Alert) => Promise<void>): void {
    this.channels.set(name, handler);
  }

  /**
   * Check all rules
   */
  private async checkRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldFire = await this.evaluateCondition(rule.condition);

        if (shouldFire) {
          await this.fireAlert(rule);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    const value = this.metricsEngine.query(condition.metric, {
      aggregation: condition.aggregation,
      start: Date.now() - condition.duration
    }) as number;

    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      case '==': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Fire alert
   */
  private async fireAlert(rule: AlertRule): Promise<void> {
    const now = Date.now();

    // Check cooldown
    if (rule.lastFired && now - rule.lastFired < rule.cooldownMs) {
      return;
    }

    const value = this.metricsEngine.query(rule.condition.metric, {
      aggregation: rule.condition.aggregation
    }) as number;

    const alert: Alert = {
      id: `alert-${now}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold} (current: ${value.toFixed(2)})`,
      value,
      threshold: rule.condition.threshold,
      timestamp: now,
      acknowledged: false
    };

    this.alerts.push(alert);
    rule.lastFired = now;

    // Send to channels
    for (const channelName of rule.channels) {
      const channel = this.channels.get(channelName);
      if (channel) {
        try {
          await channel(alert);
        } catch (error) {
          console.error(`Error sending to channel ${channelName}:`, error);
        }
      }
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolvedAt);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: string): Alert[] {
    return this.alerts.filter(a => a.severity === severity && !a.resolvedAt);
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalRules: number;
    enabledRules: number;
    totalAlerts: number;
    activeAlerts: number;
    bySeverity: Record<string, number>;
  } {
    const activeAlerts = this.alerts.filter(a => !a.resolvedAt);
    const bySeverity: Record<string, number> = {};

    for (const alert of activeAlerts) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length,
      bySeverity
    };
  }
}

// ============================================================================
// 5. Performance Profiling Engine
// ============================================================================

/**
 * Continuous Performance Profiling
 *
 * Features:
 * - CPU profiling
 * - Memory profiling
 * - Wall-clock profiling
 * - Flame graph generation
 *
 * Research: Pyroscope, Datadog Profiler, pprof
 */
class PerformanceProfilingEngine {
  private profiles: Map<string, Profile> = new Map();
  private activeProfile: Profile | null = null;
  private sampleInterval: number = 10; // ms
  private maxSamples: number = 10000;

  /**
   * Start profiling
   */
  startProfile(type: Profile['type'] = 'cpu'): string {
    const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.activeProfile = {
      id: profileId,
      type,
      startTime: Date.now(),
      endTime: 0,
      samples: [],
      aggregatedStacks: new Map()
    };

    return profileId;
  }

  /**
   * Add sample (called periodically during profiling)
   */
  addSample(stackTrace: string[], cpuTime: number, allocations: number = 0): void {
    if (!this.activeProfile) return;

    if (this.activeProfile.samples.length >= this.maxSamples) {
      // Aggregate older samples
      this.aggregateSamples();
    }

    this.activeProfile.samples.push({
      timestamp: Date.now(),
      stackTrace,
      cpuTime,
      allocations,
      threadId: 'main'
    });

    // Update aggregated stacks
    const stackKey = stackTrace.join(' <- ');
    const current = this.activeProfile.aggregatedStacks.get(stackKey) || 0;
    this.activeProfile.aggregatedStacks.set(stackKey, current + cpuTime);
  }

  /**
   * Stop profiling
   */
  stopProfile(): Profile | null {
    if (!this.activeProfile) return null;

    this.activeProfile.endTime = Date.now();
    this.profiles.set(this.activeProfile.id, this.activeProfile);

    const profile = this.activeProfile;
    this.activeProfile = null;

    return profile;
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId: string): Profile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Generate flame graph data
   */
  generateFlameGraph(profileId: string): Array<{
    name: string;
    value: number;
    children: Array<any>;
  }> {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    // Build tree structure from stacks
    const root: Map<string, any> = new Map();

    for (const [stack, value] of profile.aggregatedStacks) {
      const frames = stack.split(' <- ').reverse();
      let current = root;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        if (!current.has(frame)) {
          current.set(frame, {
            name: frame,
            value: 0,
            children: new Map()
          });
        }

        const node = current.get(frame);
        if (i === frames.length - 1) {
          node.value += value;
        }
        current = node.children;
      }
    }

    // Convert to array format
    const convertToArray = (map: Map<string, any>): any[] => {
      return Array.from(map.values()).map(node => ({
        name: node.name,
        value: node.value,
        children: convertToArray(node.children)
      }));
    };

    return convertToArray(root);
  }

  /**
   * Get hot functions
   */
  getHotFunctions(profileId: string, limit: number = 10): Array<{
    function: string;
    totalTime: number;
    percentage: number;
  }> {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    const totalTime = Array.from(profile.aggregatedStacks.values())
      .reduce((sum, v) => sum + v, 0);

    const functions = new Map<string, number>();

    for (const [stack, value] of profile.aggregatedStacks) {
      const topFrame = stack.split(' <- ')[0];
      const current = functions.get(topFrame) || 0;
      functions.set(topFrame, current + value);
    }

    return Array.from(functions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([func, time]) => ({
        function: func,
        totalTime: time,
        percentage: (time / totalTime) * 100
      }));
  }

  /**
   * Aggregate samples
   */
  private aggregateSamples(): void {
    if (!this.activeProfile) return;

    // Keep only recent samples, aggregate older ones
    const midpoint = Math.floor(this.activeProfile.samples.length / 2);
    this.activeProfile.samples = this.activeProfile.samples.slice(midpoint);
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalProfiles: number;
    isProfilingActive: boolean;
    currentSamples: number;
    avgSampleRate: number;
  } {
    return {
      totalProfiles: this.profiles.size,
      isProfilingActive: this.activeProfile !== null,
      currentSamples: this.activeProfile?.samples.length || 0,
      avgSampleRate: this.sampleInterval
    };
  }
}

// ============================================================================
// 6. Anomaly Detection Engine
// ============================================================================

/**
 * ML-Based Anomaly Detection
 *
 * Features:
 * - Statistical anomaly detection
 * - Seasonal decomposition
 * - Trend analysis
 * - Real-time alerting integration
 *
 * Research: Netflix Surus, Twitter AnomalyDetection, Prophet
 */
class AnomalyDetectionEngine {
  private history: Map<string, number[]> = new Map();
  private anomalies: AnomalyResult[] = [];
  private readonly historySize = 1000;
  private readonly zScoreThreshold = 3;
  private metricsEngine: MetricsAggregationEngine;

  constructor(metricsEngine: MetricsAggregationEngine) {
    this.metricsEngine = metricsEngine;
  }

  /**
   * Add data point and check for anomaly
   */
  detectAnomaly(metric: string, value: number): AnomalyResult {
    // Get or create history
    let history = this.history.get(metric);
    if (!history) {
      history = [];
      this.history.set(metric, history);
    }

    // Add to history
    history.push(value);
    if (history.length > this.historySize) {
      history.shift();
    }

    // Need at least 30 points for meaningful detection
    if (history.length < 30) {
      return this.createResult(metric, value, value, 0, false, 0, 'spike');
    }

    // Calculate statistics
    const mean = this.calculateMean(history);
    const stdDev = this.calculateStdDev(history, mean);

    // Z-score calculation
    const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;
    const isAnomaly = Math.abs(zScore) > this.zScoreThreshold;

    // Determine anomaly type
    let type: AnomalyResult['type'] = 'spike';
    if (zScore > this.zScoreThreshold) {
      type = 'spike';
    } else if (zScore < -this.zScoreThreshold) {
      type = 'drop';
    }

    // Check for trend changes
    if (history.length >= 50) {
      const trendChange = this.detectTrendChange(history);
      if (trendChange) {
        type = 'trend_change';
      }
    }

    // Calculate confidence based on data quality
    const confidence = Math.min(history.length / 100, 1) * (1 - 1 / (1 + Math.abs(zScore)));

    const result = this.createResult(
      metric,
      value,
      mean,
      Math.abs(value - mean),
      isAnomaly,
      confidence,
      type
    );

    if (isAnomaly) {
      this.anomalies.push(result);

      // Keep only recent anomalies
      if (this.anomalies.length > 1000) {
        this.anomalies = this.anomalies.slice(-1000);
      }
    }

    return result;
  }

  /**
   * Detect anomalies using IQR method
   */
  detectIQRAnomaly(metric: string, value: number): AnomalyResult {
    let history = this.history.get(metric);
    if (!history || history.length < 30) {
      return this.detectAnomaly(metric, value);
    }

    const sorted = [...history].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const isAnomaly = value < lowerBound || value > upperBound;
    const expected = (q1 + q3) / 2;
    const type: AnomalyResult['type'] = value > upperBound ? 'spike' : 'drop';

    return this.createResult(
      metric,
      value,
      expected,
      Math.abs(value - expected),
      isAnomaly,
      0.8,
      type
    );
  }

  /**
   * Detect seasonal anomaly
   */
  detectSeasonalAnomaly(
    metric: string,
    value: number,
    seasonLength: number = 24 // hours
  ): AnomalyResult {
    let history = this.history.get(metric);
    if (!history || history.length < seasonLength * 2) {
      return this.detectAnomaly(metric, value);
    }

    // Get values at same position in previous seasons
    const seasonalValues: number[] = [];
    for (let i = history.length - 1; i >= 0; i -= seasonLength) {
      if (i < 0) break;
      seasonalValues.push(history[i]);
    }

    if (seasonalValues.length < 3) {
      return this.detectAnomaly(metric, value);
    }

    const seasonalMean = this.calculateMean(seasonalValues);
    const seasonalStdDev = this.calculateStdDev(seasonalValues, seasonalMean);

    const zScore = seasonalStdDev > 0 ? (value - seasonalMean) / seasonalStdDev : 0;
    const isAnomaly = Math.abs(zScore) > this.zScoreThreshold;

    return this.createResult(
      metric,
      value,
      seasonalMean,
      Math.abs(value - seasonalMean),
      isAnomaly,
      0.85,
      isAnomaly ? 'seasonal' : 'spike'
    );
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(
    timeWindowMs: number = 3600000,
    metric?: string
  ): AnomalyResult[] {
    const cutoff = Date.now() - timeWindowMs;

    return this.anomalies.filter(a => {
      const timeMatch = a.timestamp >= cutoff;
      const metricMatch = !metric || a.metric === metric;
      return timeMatch && metricMatch;
    });
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect trend change
   */
  private detectTrendChange(history: number[]): boolean {
    const halfLength = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, halfLength);
    const secondHalf = history.slice(halfLength);

    const firstTrend = this.calculateTrend(firstHalf);
    const secondTrend = this.calculateTrend(secondHalf);

    // Detect significant trend reversal
    return (firstTrend > 0.1 && secondTrend < -0.1) ||
      (firstTrend < -0.1 && secondTrend > 0.1);
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Create anomaly result
   */
  private createResult(
    metric: string,
    value: number,
    expected: number,
    deviation: number,
    isAnomaly: boolean,
    confidence: number,
    type: AnomalyResult['type']
  ): AnomalyResult {
    return {
      metric,
      timestamp: Date.now(),
      value,
      expected,
      deviation,
      isAnomaly,
      confidence,
      type
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    trackedMetrics: number;
    totalAnomalies: number;
    recentAnomalies: number;
    avgHistorySize: number;
  } {
    const histories = Array.from(this.history.values());
    const avgHistorySize = histories.length > 0
      ? histories.reduce((sum, h) => sum + h.length, 0) / histories.length
      : 0;

    return {
      trackedMetrics: this.history.size,
      totalAnomalies: this.anomalies.length,
      recentAnomalies: this.getRecentAnomalies().length,
      avgHistorySize
    };
  }
}

// ============================================================================
// 7. SLO/SLI Management Engine
// ============================================================================

/**
 * Service Level Objective Management
 *
 * Features:
 * - SLO definition and tracking
 * - Error budget calculation
 * - Burn rate alerts
 * - SLI calculation
 *
 * Research: Google SRE Book, Sloth, OpenSLO
 */
class SLOManagementEngine {
  private slos: Map<string, SLO> = new Map();
  private measurements: Map<string, { good: number; total: number; timestamp: number }[]> = new Map();
  private metricsEngine: MetricsAggregationEngine;
  private readonly measurementRetention = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(metricsEngine: MetricsAggregationEngine) {
    this.metricsEngine = metricsEngine;
  }

  /**
   * Define an SLO
   */
  defineSLO(slo: Omit<SLO, 'errorBudget' | 'burnRate' | 'status'>): void {
    const fullSLO: SLO = {
      ...slo,
      errorBudget: 100 - slo.target,
      burnRate: 0,
      status: 'healthy'
    };

    this.slos.set(slo.id, fullSLO);
    this.measurements.set(slo.id, []);
  }

  /**
   * Record measurement
   */
  recordMeasurement(sloId: string, good: number, total: number): void {
    const measurements = this.measurements.get(sloId);
    if (!measurements) return;

    measurements.push({
      good,
      total,
      timestamp: Date.now()
    });

    // Cleanup old measurements
    const cutoff = Date.now() - this.measurementRetention;
    const filtered = measurements.filter(m => m.timestamp >= cutoff);
    this.measurements.set(sloId, filtered);

    // Update SLO status
    this.updateSLOStatus(sloId);
  }

  /**
   * Get current SLI value
   */
  getSLI(sloId: string): number {
    const slo = this.slos.get(sloId);
    const measurements = this.measurements.get(sloId);

    if (!slo || !measurements || measurements.length === 0) {
      return 100;
    }

    const windowMs = this.getWindowMs(slo.window);
    const cutoff = Date.now() - windowMs;

    const windowMeasurements = measurements.filter(m => m.timestamp >= cutoff);

    if (windowMeasurements.length === 0) {
      return 100;
    }

    const totalGood = windowMeasurements.reduce((sum, m) => sum + m.good, 0);
    const totalAll = windowMeasurements.reduce((sum, m) => sum + m.total, 0);

    return totalAll > 0 ? (totalGood / totalAll) * 100 : 100;
  }

  /**
   * Get remaining error budget
   */
  getRemainingErrorBudget(sloId: string): {
    percentage: number;
    absolute: number;
    consumed: number;
  } {
    const slo = this.slos.get(sloId);
    const measurements = this.measurements.get(sloId);

    if (!slo || !measurements) {
      return { percentage: 100, absolute: 0, consumed: 0 };
    }

    const currentSLI = this.getSLI(sloId);
    const errorRatioObserved = 100 - currentSLI;
    const errorBudgetTotal = 100 - slo.target;

    const consumed = errorBudgetTotal > 0
      ? (errorRatioObserved / errorBudgetTotal) * 100
      : 0;

    const remaining = Math.max(0, 100 - consumed);

    const windowMs = this.getWindowMs(slo.window);
    const measurements_in_window = measurements.filter(
      m => m.timestamp >= Date.now() - windowMs
    );
    const totalRequests = measurements_in_window.reduce((sum, m) => sum + m.total, 0);
    const absoluteRemaining = Math.floor(
      (remaining / 100) * (errorBudgetTotal / 100) * totalRequests
    );

    return {
      percentage: remaining,
      absolute: absoluteRemaining,
      consumed
    };
  }

  /**
   * Calculate burn rate
   */
  calculateBurnRate(sloId: string, shortWindowMinutes: number = 60): number {
    const slo = this.slos.get(sloId);
    const measurements = this.measurements.get(sloId);

    if (!slo || !measurements || measurements.length === 0) {
      return 0;
    }

    // Short window error rate
    const shortCutoff = Date.now() - shortWindowMinutes * 60 * 1000;
    const shortMeasurements = measurements.filter(m => m.timestamp >= shortCutoff);

    if (shortMeasurements.length === 0) {
      return 0;
    }

    const shortGood = shortMeasurements.reduce((sum, m) => sum + m.good, 0);
    const shortTotal = shortMeasurements.reduce((sum, m) => sum + m.total, 0);
    const shortErrorRate = shortTotal > 0 ? (1 - shortGood / shortTotal) * 100 : 0;

    // Expected error rate based on SLO
    const expectedErrorRate = 100 - slo.target;

    // Burn rate = actual / expected
    return expectedErrorRate > 0 ? shortErrorRate / expectedErrorRate : 0;
  }

  /**
   * Update SLO status
   */
  private updateSLOStatus(sloId: string): void {
    const slo = this.slos.get(sloId);
    if (!slo) return;

    const budget = this.getRemainingErrorBudget(sloId);
    const burnRate = this.calculateBurnRate(sloId);

    slo.burnRate = burnRate;

    // Determine status based on burn rate and remaining budget
    if (burnRate > 10 || budget.percentage < 10) {
      slo.status = 'critical';
    } else if (burnRate > 2 || budget.percentage < 30) {
      slo.status = 'warning';
    } else {
      slo.status = 'healthy';
    }
  }

  /**
   * Get window duration in milliseconds
   */
  private getWindowMs(window: SLO['window']): number {
    switch (window) {
      case 'rolling_7d':
        return 7 * 24 * 60 * 60 * 1000;
      case 'rolling_30d':
        return 30 * 24 * 60 * 60 * 1000;
      case 'calendar_month':
        return 30 * 24 * 60 * 60 * 1000; // Simplified
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get all SLOs
   */
  getAllSLOs(): SLO[] {
    return Array.from(this.slos.values());
  }

  /**
   * Get SLO by ID
   */
  getSLO(sloId: string): SLO | undefined {
    return this.slos.get(sloId);
  }

  /**
   * Get SLO report
   */
  getSLOReport(sloId: string): {
    slo: SLO;
    currentSLI: number;
    errorBudget: { percentage: number; absolute: number; consumed: number };
    burnRate: number;
    trend: 'improving' | 'stable' | 'degrading';
  } | null {
    const slo = this.slos.get(sloId);
    if (!slo) return null;

    const currentSLI = this.getSLI(sloId);
    const errorBudget = this.getRemainingErrorBudget(sloId);
    const burnRate = this.calculateBurnRate(sloId);

    // Calculate trend
    const measurements = this.measurements.get(sloId) || [];
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (measurements.length >= 10) {
      const recent = measurements.slice(-10);
      const older = measurements.slice(-20, -10);

      if (older.length >= 5) {
        const recentRate = recent.reduce((sum, m) => sum + m.good, 0) /
          recent.reduce((sum, m) => sum + m.total, 0);
        const olderRate = older.reduce((sum, m) => sum + m.good, 0) /
          older.reduce((sum, m) => sum + m.total, 0);

        if (recentRate > olderRate + 0.01) {
          trend = 'improving';
        } else if (recentRate < olderRate - 0.01) {
          trend = 'degrading';
        }
      }
    }

    return {
      slo,
      currentSLI,
      errorBudget,
      burnRate,
      trend
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalSLOs: number;
    healthySLOs: number;
    warningSLOs: number;
    criticalSLOs: number;
    avgSLI: number;
  } {
    const slos = Array.from(this.slos.values());
    const healthySLOs = slos.filter(s => s.status === 'healthy').length;
    const warningSLOs = slos.filter(s => s.status === 'warning').length;
    const criticalSLOs = slos.filter(s => s.status === 'critical').length;

    let totalSLI = 0;
    for (const slo of slos) {
      totalSLI += this.getSLI(slo.id);
    }

    return {
      totalSLOs: slos.length,
      healthySLOs,
      warningSLOs,
      criticalSLOs,
      avgSLI: slos.length > 0 ? totalSLI / slos.length : 100
    };
  }
}

// ============================================================================
// Integrated Observability Platform
// ============================================================================

/**
 * Integrated system combining all 7 observability components
 */
class IntegratedObservabilityPlatform {
  private tracing: DistributedTracingEngine;
  private metrics: MetricsAggregationEngine;
  private logging: LogAggregationEngine;
  private alerting: RealTimeAlertingEngine;
  private profiling: PerformanceProfilingEngine;
  private anomalyDetection: AnomalyDetectionEngine;
  private sloManagement: SLOManagementEngine;

  constructor(serviceName: string) {
    this.metrics = new MetricsAggregationEngine();
    this.tracing = new DistributedTracingEngine(serviceName);
    this.logging = new LogAggregationEngine(serviceName);
    this.alerting = new RealTimeAlertingEngine(this.metrics);
    this.profiling = new PerformanceProfilingEngine();
    this.anomalyDetection = new AnomalyDetectionEngine(this.metrics);
    this.sloManagement = new SLOManagementEngine(this.metrics);

    this.setupIntegrations();
  }

  /**
   * Setup cross-component integrations
   */
  private setupIntegrations(): void {
    // Add trace context to logs
    this.tracing.addSpanProcessor(span => {
      if (span.status === 'ERROR') {
        this.logging.withTrace(span.traceId, span.spanId).error(
          `Span error: ${span.operationName}`,
          undefined,
          { duration: span.duration }
        );
      }
    });

    // Log handler for metrics
    this.logging.addHandler(entry => {
      this.metrics.inc('log_entries_total', 1, { level: entry.level });
    });
  }

  /**
   * Instrument an async operation
   */
  async instrument<T>(
    operationName: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.tracing.startTrace(operationName);

    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        this.tracing.setAttribute(span, key, value);
      }
    }

    const logger = this.logging.withTrace(span.traceId, span.spanId);
    logger.info(`Starting ${operationName}`);

    const startTime = performance.now();

    try {
      const result = await fn();

      const duration = (performance.now() - startTime) / 1000;
      this.metrics.observe('operation_duration_seconds', duration, { operation: operationName });
      this.metrics.inc('operation_total', 1, { operation: operationName, status: 'success' });

      this.tracing.endSpan(span, 'OK');
      logger.info(`Completed ${operationName}`, { duration });

      // Check for anomalies
      this.anomalyDetection.detectAnomaly(`operation_duration:${operationName}`, duration);

      return result;
    } catch (error) {
      this.tracing.setError(span, error as Error);
      this.tracing.endSpan(span, 'ERROR');

      this.metrics.inc('operation_total', 1, { operation: operationName, status: 'error' });
      logger.error(`Failed ${operationName}`, error as Error);

      throw error;
    }
  }

  /**
   * Get platform health
   */
  getPlatformHealth(): {
    tracing: any;
    metrics: any;
    logging: any;
    alerting: any;
    profiling: any;
    anomalyDetection: any;
    sloManagement: any;
  } {
    return {
      tracing: this.tracing.getMetrics(),
      metrics: this.metrics.getMetrics(),
      logging: this.logging.getStats(),
      alerting: this.alerting.getMetrics(),
      profiling: this.profiling.getMetrics(),
      anomalyDetection: this.anomalyDetection.getMetrics(),
      sloManagement: this.sloManagement.getMetrics()
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Main integrated platform
  IntegratedObservabilityPlatform,
  // Individual components
  DistributedTracingEngine,
  MetricsAggregationEngine,
  LogAggregationEngine,
  RealTimeAlertingEngine,
  PerformanceProfilingEngine,
  AnomalyDetectionEngine,
  SLOManagementEngine,
  // Types
  Span,
  SpanEvent,
  SpanLink,
  Trace,
  Metric,
  MetricPoint,
  Histogram,
  LogEntry,
  AlertRule,
  AlertCondition,
  Alert,
  ProfileSample,
  Profile,
  AnomalyResult,
  SLO,
  SLI
};
