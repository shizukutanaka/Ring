/**
 * Timing & Synchronization Layer - HIGH Tier
 *
 * Addresses HIGH priority defects:
 * - D1: System clock change handling
 * - D2: High-precision timer management
 *
 * Ensures reliable timing even with clock skew and drift
 */

/**
 * Clock change detector and handler
 */
export class ClockChangeDetector {
  private lastTimestamp = Date.now();
  private maxAllowedSkew = 1000; // 1 second
  private clockSkewHistory: Array<{ delta: number; timestamp: number }> = [];
  private skewListeners: Array<(skew: number) => void> = [];
  private maxHistory = 100;

  constructor(maxAllowedSkewMs: number = 1000) {
    this.maxAllowedSkew = maxAllowedSkewMs;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.checkClockSkew();
    }, 100); // Check every 100ms
  }

  private checkClockSkew(): void {
    const now = Date.now();
    const delta = now - this.lastTimestamp;

    // Negative delta indicates clock went backward
    if (delta < 0) {
      this.handleClockSkew(delta);
    }
    // Large forward jump indicates clock adjustment
    else if (delta > this.maxAllowedSkew) {
      this.handleClockSkew(delta);
    }

    this.lastTimestamp = now;
  }

  private handleClockSkew(delta: number): void {
    this.clockSkewHistory.push({
      delta,
      timestamp: Date.now()
    });

    if (this.clockSkewHistory.length > this.maxHistory) {
      this.clockSkewHistory.shift();
    }

    // Notify listeners
    for (const listener of this.skewListeners) {
      try {
        listener(delta);
      } catch (error) {
        console.error('Error in clock skew listener:', error);
      }
    }
  }

  addSkewListener(callback: (skew: number) => void): void {
    this.skewListeners.push(callback);
  }

  removeSkewListener(callback: (skew: number) => void): void {
    const index = this.skewListeners.indexOf(callback);
    if (index > -1) {
      this.skewListeners.splice(index, 1);
    }
  }

  hasSkewDetected(): boolean {
    return this.clockSkewHistory.length > 0;
  }

  getLatestSkew(): number | null {
    if (this.clockSkewHistory.length === 0) return null;
    return this.clockSkewHistory[this.clockSkewHistory.length - 1].delta;
  }

  getSkewStatistics(): {
    count: number;
    min: number;
    max: number;
    avg: number;
  } | null {
    if (this.clockSkewHistory.length === 0) return null;

    const deltas = this.clockSkewHistory.map((h) => h.delta);
    return {
      count: deltas.length,
      min: Math.min(...deltas),
      max: Math.max(...deltas),
      avg: deltas.reduce((a, b) => a + b, 0) / deltas.length
    };
  }

  reset(): void {
    this.clockSkewHistory = [];
    this.lastTimestamp = Date.now();
  }
}

/**
 * High-precision monotonic timer
 */
export class MonotonicTimer {
  private startTime = performance.now();
  private offsetCorrection = 0;
  private measurements: Array<{ label: string; time: number }> = [];
  private maxMeasurements = 1000;

  /**
   * Get elapsed time in milliseconds with monotonic guarantee
   */
  getElapsedTime(): number {
    const current = performance.now();
    const elapsed = current - this.startTime + this.offsetCorrection;

    // Ensure monotonic increase
    if (this.measurements.length > 0) {
      const lastMeasurement = this.measurements[this.measurements.length - 1].time;
      if (elapsed < lastMeasurement) {
        // Clock went backward, adjust
        this.offsetCorrection += lastMeasurement - elapsed;
        return lastMeasurement;
      }
    }

    return elapsed;
  }

  /**
   * Create a measurement interval
   */
  createInterval(label: string): () => number {
    const startTime = this.getElapsedTime();

    return () => {
      const endTime = this.getElapsedTime();
      const duration = endTime - startTime;

      this.measurements.push({
        label,
        time: endTime
      });

      if (this.measurements.length > this.maxMeasurements) {
        this.measurements.shift();
      }

      return duration;
    };
  }

  /**
   * Get measurement history
   */
  getMeasurementHistory(label?: string): Array<{ label: string; time: number }> {
    if (label) {
      return this.measurements.filter((m) => m.label === label);
    }
    return [...this.measurements];
  }

  /**
   * Reset timer
   */
  reset(): void {
    this.startTime = performance.now();
    this.offsetCorrection = 0;
    this.measurements = [];
  }
}

/**
 * Adaptive timer with drift correction
 */
export class AdaptiveTimer {
  private targetInterval: number;
  private lastExecutionTime: number | null = null;
  private drift = 0;
  private driftHistory: number[] = [];
  private maxDriftHistory = 50;
  private isRunning = false;
  private timerId: NodeJS.Timeout | null = null;

  constructor(intervalMs: number) {
    this.targetInterval = intervalMs;
  }

  /**
   * Start timer with drift correction
   */
  start(callback: () => void | Promise<void>): void {
    if (this.isRunning) {
      throw new Error('Timer already running');
    }

    this.isRunning = true;
    this.lastExecutionTime = performance.now();
    this.scheduleNext(callback);
  }

  private async scheduleNext(callback: () => void | Promise<void>): Promise<void> {
    if (!this.isRunning) return;

    const now = performance.now();
    const timeSinceLastExecution = now - (this.lastExecutionTime || now);

    // Calculate adjusted interval accounting for drift
    const adjustedInterval = Math.max(
      1,
      this.targetInterval - this.drift
    );

    this.timerId = setTimeout(async () => {
      if (!this.isRunning) return;

      try {
        const execStart = performance.now();
        await callback();
        const execEnd = performance.now();
        const executionTime = execEnd - execStart;

        // Calculate drift
        const actualInterval = execEnd - (this.lastExecutionTime || execStart);
        const expectedInterval = this.targetInterval;
        const currentDrift = actualInterval - expectedInterval;

        this.recordDrift(currentDrift);
        this.lastExecutionTime = execEnd;

        // Schedule next execution
        this.scheduleNext(callback);

      } catch (error) {
        console.error('Error in adaptive timer:', error);
        this.scheduleNext(callback);
      }
    }, adjustedInterval);
  }

  private recordDrift(drift: number): void {
    this.driftHistory.push(drift);

    if (this.driftHistory.length > this.maxDriftHistory) {
      this.driftHistory.shift();
    }

    // Exponential moving average of drift
    const alpha = 0.3;
    this.drift = this.drift * (1 - alpha) + drift * alpha;
  }

  /**
   * Stop timer
   */
  stop(): void {
    this.isRunning = false;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Get drift statistics
   */
  getDriftStatistics(): {
    currentDrift: number;
    avgDrift: number;
    maxDrift: number;
    minDrift: number;
  } | null {
    if (this.driftHistory.length === 0) return null;

    const sorted = [...this.driftHistory].sort((a, b) => a - b);

    return {
      currentDrift: this.drift,
      avgDrift: this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length,
      maxDrift: sorted[sorted.length - 1],
      minDrift: sorted[0]
    };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  reset(): void {
    this.stop();
    this.lastExecutionTime = null;
    this.drift = 0;
    this.driftHistory = [];
  }
}

/**
 * Scheduler for managing multiple timers
 */
export class TimerScheduler {
  private timers: Map<string, AdaptiveTimer> = new Map();
  private clockDetector = new ClockChangeDetector();

  /**
   * Schedule a recurring task
   */
  schedule(
    name: string,
    intervalMs: number,
    callback: () => void | Promise<void>
  ): void {
    if (this.timers.has(name)) {
      throw new Error(`Timer '${name}' already scheduled`);
    }

    const timer = new AdaptiveTimer(intervalMs);

    // Handle clock skew
    this.clockDetector.addSkewListener(() => {
      if (timer.isActive()) {
        timer.reset();
        timer.start(callback);
      }
    });

    timer.start(callback);
    this.timers.set(name, timer);
  }

  /**
   * Cancel a scheduled task
   */
  cancel(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      timer.stop();
      this.timers.delete(name);
    }
  }

  /**
   * Get timer statistics
   */
  getTimerStats(name: string) {
    const timer = this.timers.get(name);
    if (!timer) return null;

    return {
      isActive: timer.isActive(),
      drift: timer.getDriftStatistics()
    };
  }

  /**
   * Shutdown all timers
   */
  shutdown(): void {
    for (const timer of this.timers.values()) {
      timer.stop();
    }
    this.timers.clear();
  }

  /**
   * Get all timer names
   */
  getTimerNames(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Check for clock issues
   */
  hasClockIssues(): boolean {
    return this.clockDetector.hasSkewDetected();
  }

  /**
   * Get clock statistics
   */
  getClockStatistics() {
    return this.clockDetector.getSkewStatistics();
  }
}

/**
 * Timeout with guaranteed delivery
 */
export class GuaranteedTimeout {
  private timeoutId: NodeJS.Timeout | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private fired = false;
  private callback: (() => void) | null = null;

  /**
   * Set timeout with backup interval check
   */
  set(callback: () => void, delayMs: number): void {
    this.callback = callback;
    this.fired = false;

    // Primary timeout
    this.timeoutId = setTimeout(() => {
      if (!this.fired) {
        this.fired = true;
        try {
          callback();
        } catch (error) {
          console.error('Error in guaranteed timeout:', error);
        }
      }
      this.clear();
    }, delayMs);

    // Backup interval for clock skew
    this.intervalId = setInterval(() => {
      if (!this.fired && Date.now() >= Date.now() + delayMs) {
        this.fired = true;
        try {
          callback();
        } catch (error) {
          console.error('Error in guaranteed timeout backup:', error);
        }
        this.clear();
      }
    }, Math.max(10, delayMs / 10));
  }

  /**
   * Clear timeout
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.fired = false;
    this.callback = null;
  }

  hasFired(): boolean {
    return this.fired;
  }
}

/**
 * Timing synchronization manager
 */
export class TimingSynchronizationManager {
  private clockDetector = new ClockChangeDetector();
  private monotonicTimer = new MonotonicTimer();
  private scheduler = new TimerScheduler();

  getClockDetector(): ClockChangeDetector {
    return this.clockDetector;
  }

  getMonotonicTimer(): MonotonicTimer {
    return this.monotonicTimer;
  }

  getScheduler(): TimerScheduler {
    return this.scheduler;
  }

  /**
   * Create a guaranteed timeout
   */
  createGuaranteedTimeout(): GuaranteedTimeout {
    return new GuaranteedTimeout();
  }

  /**
   * Get complete diagnostics
   */
  getDiagnostics(): {
    clockSkew: any;
    activeTimers: number;
    monotonicTime: number;
  } {
    return {
      clockSkew: this.clockDetector.getSkewStatistics(),
      activeTimers: this.scheduler.getTimerNames().length,
      monotonicTime: this.monotonicTimer.getElapsedTime()
    };
  }

  /**
   * Shutdown all timing resources
   */
  shutdown(): void {
    this.scheduler.shutdown();
    this.monotonicTimer.reset();
    this.clockDetector.reset();
  }
}

export {
  ClockChangeDetector,
  MonotonicTimer,
  AdaptiveTimer,
  TimerScheduler,
  GuaranteedTimeout,
  TimingSynchronizationManager
};
