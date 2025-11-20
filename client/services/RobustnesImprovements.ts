/**
 * Robustness & Production Readiness Improvements
 *
 * Addresses critical deficiencies:
 * - Comprehensive error handling
 * - Input validation
 * - Configuration externalization
 * - Structured logging
 * - Graceful degradation
 */

export interface AppConfig {
  // Thresholds with documented rationale
  packetLossThresholds: {
    low: number; // 0-2% normal
    moderate: number; // 2-5% concerning
    high: number; // 5-10% critical
    critical: number; // >10% extreme
  };
  rttThresholds: {
    excellent: number; // <50ms
    good: number; // 50-100ms
    acceptable: number; // 100-200ms
    poor: number; // >200ms
  };
  cpuThresholds: {
    safe: number; // <60%
    caution: number; // 60-80%
    warning: number; // 80-90%
    critical: number; // >90%
  };

  // Memory management
  memory: {
    maxHistoryPerParticipant: number;
    maxConferenceSnapshots: number;
    cacheExpiration: number; // milliseconds
  };

  // Performance
  performance: {
    maxDecisionLatency: number; // milliseconds
    targetFrameRate: number;
    enableProfiling: boolean;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableStructured: boolean;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

export interface DecisionLog {
  timestamp: number;
  decisionType: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  reasoning: string;
  executionTime: number;
  module: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Default production configuration
 */
export const DEFAULT_CONFIG: AppConfig = {
  packetLossThresholds: {
    low: 2,
    moderate: 5,
    high: 10,
    critical: 15
  },
  rttThresholds: {
    excellent: 50,
    good: 100,
    acceptable: 200,
    poor: 300
  },
  cpuThresholds: {
    safe: 60,
    caution: 80,
    warning: 90,
    critical: 95
  },
  memory: {
    maxHistoryPerParticipant: 300,
    maxConferenceSnapshots: 100,
    cacheExpiration: 300000 // 5 minutes
  },
  performance: {
    maxDecisionLatency: 5,
    targetFrameRate: 30,
    enableProfiling: false
  },
  logging: {
    level: 'info',
    enableStructured: true,
    enableConsole: true,
    enableFile: false
  }
};

/**
 * Robust Parameter Validator
 */
export class ParameterValidator {
  static validateBitrate(bitrate: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(bitrate)) {
      errors.push(`Bitrate must be a finite number, got: ${bitrate}`);
    } else if (bitrate < 0) {
      errors.push(`Bitrate cannot be negative, got: ${bitrate}`);
    } else if (bitrate < 100) {
      warnings.push(`Bitrate is very low: ${bitrate}kbps (minimum: 100kbps)`);
    } else if (bitrate > 50000) {
      warnings.push(`Bitrate is very high: ${bitrate}kbps (typical max: 10000kbps)`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validatePacketLoss(loss: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(loss)) {
      errors.push(`Packet loss must be a finite number, got: ${loss}`);
    } else if (loss < 0 || loss > 100) {
      errors.push(`Packet loss must be 0-100%, got: ${loss}%`);
    } else if (loss > 50) {
      warnings.push(`Extremely high packet loss: ${loss}% (typical max: 20%)`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateResolution(resolution: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!resolution || typeof resolution !== 'string') {
      errors.push(`Resolution must be a string, got: ${typeof resolution}`);
      return { valid: false, errors, warnings };
    }

    const match = resolution.match(/^(\d+)x(\d+)$/);
    if (!match) {
      errors.push(`Invalid resolution format, expected WIDTHxHEIGHT, got: ${resolution}`);
      return { valid: false, errors, warnings };
    }

    const [, widthStr, heightStr] = match;
    const width = parseInt(widthStr);
    const height = parseInt(heightStr);

    if (width < 160 || height < 120) {
      errors.push(`Resolution too small: ${resolution} (minimum: 160x120)`);
    } else if (width > 7680 || height > 4320) {
      warnings.push(`Resolution very large: ${resolution} (typical max: 1920x1080)`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateFramerate(fps: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isInteger(fps)) {
      errors.push(`Framerate must be an integer, got: ${fps}`);
    } else if (fps < 1 || fps > 120) {
      errors.push(`Framerate must be 1-120fps, got: ${fps}`);
    } else if (fps < 15) {
      warnings.push(`Low framerate: ${fps}fps (typical minimum: 15fps)`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateParticipantCount(count: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isInteger(count)) {
      errors.push(`Participant count must be an integer, got: ${count}`);
    } else if (count < 0) {
      errors.push(`Participant count cannot be negative, got: ${count}`);
    } else if (count > 10000) {
      warnings.push(`Very large conference: ${count} participants`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateRTT(rtt: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(rtt)) {
      errors.push(`RTT must be a finite number, got: ${rtt}`);
    } else if (rtt < 0) {
      errors.push(`RTT cannot be negative, got: ${rtt}ms`);
    } else if (rtt > 5000) {
      warnings.push(`Extremely high RTT: ${rtt}ms (typical max: 500ms)`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateCPUUsage(usage: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(usage)) {
      errors.push(`CPU usage must be a finite number, got: ${usage}`);
    } else if (usage < 0 || usage > 100) {
      errors.push(`CPU usage must be 0-100%, got: ${usage}%`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

/**
 * Structured Logger with levels
 */
export class StructuredLogger {
  private logLevel: number;
  private logs: DecisionLog[] = [];
  private maxLogs = 1000;

  private levels = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = this.levels[level];
  }

  debug(module: string, message: string, data?: any): void {
    if (this.logLevel <= this.levels.debug) {
      this.output('DEBUG', module, message, data);
    }
  }

  info(module: string, message: string, data?: any): void {
    if (this.logLevel <= this.levels.info) {
      this.output('INFO', module, message, data);
    }
  }

  warn(module: string, message: string, data?: any): void {
    if (this.logLevel <= this.levels.warn) {
      this.output('WARN', module, message, data);
    }
  }

  error(module: string, message: string, error?: any): void {
    if (this.logLevel <= this.levels.error) {
      this.output('ERROR', module, message, error);
    }
  }

  private output(level: string, module: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ${level} [${module}] ${message}`;

    console.log(log, data || '');
  }

  logDecision(
    module: string,
    decisionType: string,
    inputs: any,
    outputs: any,
    reasoning: string,
    executionTime: number
  ): void {
    const decision: DecisionLog = {
      timestamp: Date.now(),
      decisionType,
      inputs,
      outputs,
      reasoning,
      executionTime,
      module
    };

    this.logs.push(decision);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.debug(module, `Decision: ${decisionType}`, {
      reasoning,
      executionTime: `${executionTime.toFixed(2)}ms`
    });
  }

  getDecisionHistory(): DecisionLog[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Error Handler with Graceful Degradation
 */
export class RobustErrorHandler {
  private fallbackStrategies: Map<string, () => any> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private maxErrorsBeforeFallback = 3;

  registerFallback(context: string, fallback: () => any): void {
    this.fallbackStrategies.set(context, fallback);
  }

  async executeWithFallback<T>(
    context: string,
    primary: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    try {
      const result = await primary();
      this.errorCounts.set(context, 0); // Reset on success
      return result;
    } catch (error) {
      const errorCount = (this.errorCounts.get(context) || 0) + 1;
      this.errorCounts.set(context, errorCount);

      console.warn(
        `⚠️ Error in ${context} (attempt ${errorCount}): ${error instanceof Error ? error.message : String(error)}`
      );

      if (errorCount >= this.maxErrorsBeforeFallback) {
        console.warn(`⚠️ Switching to fallback for ${context}`);
        return fallback();
      }

      throw error;
    }
  }

  handleNetworkError(error: any, context: string): any {
    console.error(`🚨 Network error in ${context}:`, error);

    // Return safe defaults
    return {
      recommendedBitrate: 1000,
      quality: 50,
      error: error instanceof Error ? error.message : 'Unknown network error'
    };
  }

  handleCodecError(codec: string, error: any): string {
    console.error(`🚨 Codec error for ${codec}:`, error);

    // Fallback to H.264
    return 'h264';
  }

  handleCalculationError(calc: string, error: any): number {
    console.error(`🚨 Calculation error in ${calc}:`, error);

    // Return safe default (50 = neutral)
    return 50;
  }
}

/**
 * Configuration Manager
 */
export class ConfigurationManager {
  private config: AppConfig;

  constructor(overrides?: Partial<AppConfig>) {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    if (overrides) {
      this.mergeConfig(overrides);
    }
  }

  private mergeConfig(overrides: Partial<AppConfig>): void {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined && value !== null) {
        (this.config as any)[key] = value;
      }
    }
  }

  getConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  updateThreshold(
    category: 'packetLoss' | 'rtt' | 'cpu',
    level: string,
    value: number
  ): void {
    const validation = this.validateThreshold(category, level, value);
    if (!validation.valid) {
      throw new Error(`Invalid threshold: ${validation.errors.join(', ')}`);
    }

    const thresholds = this.config[`${category}Thresholds` as keyof AppConfig] as any;
    if (thresholds && thresholds[level] !== undefined) {
      thresholds[level] = value;
    }
  }

  private validateThreshold(
    category: string,
    level: string,
    value: number
  ): ValidationResult {
    const errors: string[] = [];

    if (!Number.isFinite(value)) {
      errors.push(`Threshold must be a finite number, got: ${value}`);
    }

    if (category === 'packetLoss' && (value < 0 || value > 100)) {
      errors.push(`Packet loss threshold must be 0-100%, got: ${value}%`);
    } else if (category === 'rtt' && value < 0) {
      errors.push(`RTT threshold cannot be negative, got: ${value}ms`);
    } else if (category === 'cpu' && (value < 0 || value > 100)) {
      errors.push(`CPU threshold must be 0-100%, got: ${value}%`);
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private maxMeasurements = 100;

  startMeasurement(label: string): () => number {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }

      const measurements = this.measurements.get(label)!;
      measurements.push(duration);

      if (measurements.length > this.maxMeasurements) {
        measurements.shift();
      }

      return duration;
    };
  }

  getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, avg, min, max, p95 };
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [label, measurements] of this.measurements.entries()) {
      if (measurements.length > 0) {
        stats[label] = this.getStats(label);
      }
    }

    return stats;
  }

  reset(): void {
    this.measurements.clear();
  }
}

/**
 * WebRTC Integration Points (Stubs for connection)
 */
export interface WebRTCIntegration {
  onNetworkStats(stats: {
    bandwidth: number;
    packetLoss: number;
    rtt: number;
    jitter: number;
  }): void;

  onCodecSelected(codec: string, config: Record<string, any>): void;

  onQualityRecommendation(quality: number, reasoning: string): void;

  onError(error: string, recovery: string): void;
}

export class WebRTCAdapter {
  private integration: WebRTCIntegration | null = null;

  registerIntegration(integration: WebRTCIntegration): void {
    this.integration = integration;
  }

  notifyNetworkStats(stats: any): void {
    if (this.integration) {
      this.integration.onNetworkStats(stats);
    }
  }

  notifyCodecSelected(codec: string, config: any): void {
    if (this.integration) {
      this.integration.onCodecSelected(codec, config);
    }
  }

  notifyQualityRecommendation(quality: number, reasoning: string): void {
    if (this.integration) {
      this.integration.onQualityRecommendation(quality, reasoning);
    }
  }

  notifyError(error: string, recovery: string): void {
    if (this.integration) {
      this.integration.onError(error, recovery);
    }
  }
}

export { DEFAULT_CONFIG };
