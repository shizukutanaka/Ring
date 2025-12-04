/**
 * Phase 95: Advanced Error Handling & Resilience
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Enterprise-grade fault tolerance with circuit breakers, retries,
 * bulkhead isolation, fallback strategies, and error tracking.
 *
 * Research Sources:
 * - Resilience4j Circuit Breaker (2024-2025)
 * - AWS Exponential Backoff with Jitter
 * - Bulkhead Pattern (Microsoft Azure)
 * - Graceful Degradation (Mercari)
 * - Sentry Error Boundaries
 *
 * @version 1.0.0
 * @phase 95
 * @date December 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  name: string;
  failureRateThreshold: number; // Percentage (0-100)
  slowCallRateThreshold: number; // Percentage (0-100)
  slowCallDurationThreshold: number; // milliseconds
  slidingWindowType: 'COUNT_BASED' | 'TIME_BASED';
  slidingWindowSize: number;
  minimumNumberOfCalls: number;
  waitDurationInOpenState: number; // milliseconds
  permittedNumberOfCallsInHalfOpenState: number;
  automaticTransitionFromOpenToHalfOpen: boolean;
}

interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureRate: number;
  slowCallRate: number;
  numberOfSuccessfulCalls: number;
  numberOfFailedCalls: number;
  numberOfSlowCalls: number;
  numberOfNotPermittedCalls: number;
  lastStateTransition: Date;
}

interface RetryConfig {
  maxAttempts: number;
  initialInterval: number; // milliseconds
  multiplier: number;
  maxInterval: number; // milliseconds
  jitterType: 'NONE' | 'FULL' | 'EQUAL' | 'DECORRELATED';
  retryOnException: (error: Error) => boolean;
  retryOnResult?: (result: unknown) => boolean;
}

interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  avgRetryDelay: number;
  maxRetryDelay: number;
}

interface BulkheadConfig {
  name: string;
  type: 'SEMAPHORE' | 'THREAD_POOL';
  maxConcurrentCalls: number;
  maxWaitDuration: number; // milliseconds
  fairCallHandlingEnabled: boolean;
}

interface BulkheadMetrics {
  availablePermits: number;
  maxAllowedConcurrentCalls: number;
  currentlyWaiting: number;
  rejectedCalls: number;
}

interface TimeoutConfig {
  timeout: number; // milliseconds
  cancelOnTimeout: boolean;
}

interface FallbackConfig<T> {
  fallbackMethod: (error: Error) => T | Promise<T>;
  fallbackOnException: (error: Error) => boolean;
  cacheLastSuccess: boolean;
  defaultValue?: T;
}

interface RateLimiterConfig {
  limitForPeriod: number;
  limitRefreshPeriod: number; // milliseconds
  timeoutDuration: number; // milliseconds
}

interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  fingerprint: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  tags: Record<string, string>;
  user?: { id: string; email?: string };
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: Date;
  type: 'navigation' | 'http' | 'ui' | 'user' | 'debug' | 'error';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level: 'debug' | 'info' | 'warning' | 'error';
}

interface ErrorGroup {
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  events: ErrorEvent[];
  status: 'unresolved' | 'resolved' | 'ignored';
  assignee?: string;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit Breaker Implementation
 *
 * Features:
 * - Three states: CLOSED, OPEN, HALF_OPEN
 * - Sliding window (count/time-based)
 * - Failure rate & slow call thresholds
 * - Automatic state transitions
 *
 * Research: Resilience4j, Netflix Hystrix
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = 'CLOSED';
  private metrics: CircuitBreakerMetrics;
  private callResults: Array<{ success: boolean; slow: boolean; duration: number; timestamp: number }> = [];
  private halfOpenCallCount = 0;
  private lastOpenTime = 0;
  private stateChangeListeners: Array<(state: CircuitBreakerState) => void> = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      name: config.name || 'default',
      failureRateThreshold: config.failureRateThreshold ?? 50,
      slowCallRateThreshold: config.slowCallRateThreshold ?? 100,
      slowCallDurationThreshold: config.slowCallDurationThreshold ?? 2000,
      slidingWindowType: config.slidingWindowType || 'COUNT_BASED',
      slidingWindowSize: config.slidingWindowSize ?? 10,
      minimumNumberOfCalls: config.minimumNumberOfCalls ?? 5,
      waitDurationInOpenState: config.waitDurationInOpenState ?? 10000,
      permittedNumberOfCallsInHalfOpenState: config.permittedNumberOfCallsInHalfOpenState ?? 3,
      automaticTransitionFromOpenToHalfOpen: config.automaticTransitionFromOpenToHalfOpen ?? true
    };

    this.metrics = this.initMetrics();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if call is permitted
    if (!this.isCallPermitted()) {
      this.metrics.numberOfNotPermittedCalls++;
      throw new CircuitBreakerOpenError(`Circuit breaker '${this.config.name}' is OPEN`);
    }

    const startTime = performance.now();

    try {
      const result = await fn();
      this.recordSuccess(performance.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Check if call is permitted
   */
  private isCallPermitted(): boolean {
    // Check for automatic transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.config.automaticTransitionFromOpenToHalfOpen) {
      if (Date.now() - this.lastOpenTime >= this.config.waitDurationInOpenState) {
        this.transitionTo('HALF_OPEN');
      }
    }

    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return false;
      case 'HALF_OPEN':
        return this.halfOpenCallCount < this.config.permittedNumberOfCallsInHalfOpenState;
      default:
        return false;
    }
  }

  /**
   * Record successful call
   */
  private recordSuccess(duration: number): void {
    const slow = duration > this.config.slowCallDurationThreshold;

    this.callResults.push({
      success: true,
      slow,
      duration,
      timestamp: Date.now()
    });

    this.pruneCallResults();

    this.metrics.numberOfSuccessfulCalls++;
    if (slow) {
      this.metrics.numberOfSlowCalls++;
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCallCount++;
      if (this.halfOpenCallCount >= this.config.permittedNumberOfCallsInHalfOpenState) {
        this.transitionTo('CLOSED');
      }
    } else {
      this.checkThresholds();
    }
  }

  /**
   * Record failed call
   */
  private recordFailure(duration: number): void {
    const slow = duration > this.config.slowCallDurationThreshold;

    this.callResults.push({
      success: false,
      slow,
      duration,
      timestamp: Date.now()
    });

    this.pruneCallResults();

    this.metrics.numberOfFailedCalls++;
    if (slow) {
      this.metrics.numberOfSlowCalls++;
    }

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else {
      this.checkThresholds();
    }
  }

  /**
   * Prune old call results based on sliding window
   */
  private pruneCallResults(): void {
    if (this.config.slidingWindowType === 'COUNT_BASED') {
      while (this.callResults.length > this.config.slidingWindowSize) {
        this.callResults.shift();
      }
    } else {
      const windowStart = Date.now() - this.config.slidingWindowSize * 1000;
      this.callResults = this.callResults.filter(r => r.timestamp >= windowStart);
    }
  }

  /**
   * Check if thresholds are exceeded
   */
  private checkThresholds(): void {
    if (this.callResults.length < this.config.minimumNumberOfCalls) {
      return;
    }

    const failureRate = this.calculateFailureRate();
    const slowCallRate = this.calculateSlowCallRate();

    this.metrics.failureRate = failureRate;
    this.metrics.slowCallRate = slowCallRate;

    if (failureRate >= this.config.failureRateThreshold ||
        slowCallRate >= this.config.slowCallRateThreshold) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Calculate failure rate
   */
  private calculateFailureRate(): number {
    if (this.callResults.length === 0) return 0;
    const failures = this.callResults.filter(r => !r.success).length;
    return (failures / this.callResults.length) * 100;
  }

  /**
   * Calculate slow call rate
   */
  private calculateSlowCallRate(): number {
    if (this.callResults.length === 0) return 0;
    const slowCalls = this.callResults.filter(r => r.slow).length;
    return (slowCalls / this.callResults.length) * 100;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.metrics.lastStateTransition = new Date();

    if (newState === 'OPEN') {
      this.lastOpenTime = Date.now();
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCallCount = 0;
    } else if (newState === 'CLOSED') {
      this.callResults = [];
    }

    // Notify listeners
    for (const listener of this.stateChangeListeners) {
      listener(newState);
    }

    console.log(`CircuitBreaker '${this.config.name}': ${oldState} -> ${newState}`);
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: CircuitBreakerState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force transition (for testing/maintenance)
   */
  forceState(state: CircuitBreakerState): void {
    this.transitionTo(state);
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.callResults = [];
    this.transitionTo('CLOSED');
    this.metrics = this.initMetrics();
  }

  /**
   * Initialize metrics
   */
  private initMetrics(): CircuitBreakerMetrics {
    return {
      state: 'CLOSED',
      failureRate: 0,
      slowCallRate: 0,
      numberOfSuccessfulCalls: 0,
      numberOfFailedCalls: 0,
      numberOfSlowCalls: 0,
      numberOfNotPermittedCalls: 0,
      lastStateTransition: new Date()
    };
  }
}

/**
 * Circuit Breaker Open Error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================================================
// RETRY ENGINE
// ============================================================================

/**
 * Retry Engine with Exponential Backoff and Jitter
 *
 * Features:
 * - Exponential backoff
 * - Multiple jitter strategies (Full, Equal, Decorrelated)
 * - Configurable retry conditions
 * - Max interval cap
 *
 * Research: AWS Exponential Backoff, Polly (.NET)
 */
export class RetryEngine {
  private config: RetryConfig;
  private metrics: RetryMetrics;
  private delayHistory: number[] = [];
  private lastRandom = 0;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialInterval: config.initialInterval ?? 500,
      multiplier: config.multiplier ?? 2,
      maxInterval: config.maxInterval ?? 30000,
      jitterType: config.jitterType || 'FULL',
      retryOnException: config.retryOnException || (() => true),
      retryOnResult: config.retryOnResult
    };

    this.metrics = this.initMetrics();
  }

  /**
   * Execute with retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      this.metrics.totalAttempts++;

      try {
        const result = await fn();

        // Check if result should trigger retry
        if (this.config.retryOnResult && this.config.retryOnResult(result)) {
          if (attempt < this.config.maxAttempts) {
            await this.delay(attempt);
            continue;
          }
        }

        if (attempt > 1) {
          this.metrics.successfulRetries++;
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this exception
        if (!this.config.retryOnException(lastError)) {
          throw lastError;
        }

        if (attempt < this.config.maxAttempts) {
          await this.delay(attempt);
        }
      }
    }

    this.metrics.failedRetries++;
    throw lastError || new Error('Retry failed');
  }

  /**
   * Calculate delay with jitter
   */
  private async delay(attempt: number): Promise<void> {
    const baseDelay = Math.min(
      this.config.initialInterval * Math.pow(this.config.multiplier, attempt - 1),
      this.config.maxInterval
    );

    let actualDelay: number;

    switch (this.config.jitterType) {
      case 'FULL':
        // sleep = random_between(0, min(cap, base * 2 ^ attempt))
        actualDelay = Math.random() * baseDelay;
        break;

      case 'EQUAL':
        // sleep = base / 2 + random_between(0, base / 2)
        actualDelay = baseDelay / 2 + Math.random() * (baseDelay / 2);
        break;

      case 'DECORRELATED':
        // sleep = min(cap, random_between(base, last * 3))
        const lowerBound = this.config.initialInterval;
        const upperBound = Math.min(this.lastRandom * 3, this.config.maxInterval);
        actualDelay = lowerBound + Math.random() * (upperBound - lowerBound);
        this.lastRandom = actualDelay;
        break;

      case 'NONE':
      default:
        actualDelay = baseDelay;
    }

    this.delayHistory.push(actualDelay);
    this.updateDelayMetrics();

    await new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  /**
   * Update delay metrics
   */
  private updateDelayMetrics(): void {
    if (this.delayHistory.length > 0) {
      this.metrics.avgRetryDelay =
        this.delayHistory.reduce((a, b) => a + b, 0) / this.delayHistory.length;
      this.metrics.maxRetryDelay = Math.max(...this.delayHistory);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Initialize metrics
   */
  private initMetrics(): RetryMetrics {
    return {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      avgRetryDelay: 0,
      maxRetryDelay: 0
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.initMetrics();
    this.delayHistory = [];
    this.lastRandom = 0;
  }
}

// ============================================================================
// BULKHEAD
// ============================================================================

/**
 * Bulkhead Pattern Implementation
 *
 * Features:
 * - Semaphore-based isolation
 * - Concurrent call limiting
 * - Queue waiting with timeout
 * - Fair call handling option
 *
 * Research: Microsoft Azure, Resilience4j
 */
export class Bulkhead {
  private config: BulkheadConfig;
  private currentConcurrent = 0;
  private waitingQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private metrics: BulkheadMetrics;

  constructor(config: Partial<BulkheadConfig> = {}) {
    this.config = {
      name: config.name || 'default',
      type: config.type || 'SEMAPHORE',
      maxConcurrentCalls: config.maxConcurrentCalls ?? 10,
      maxWaitDuration: config.maxWaitDuration ?? 5000,
      fairCallHandlingEnabled: config.fairCallHandlingEnabled ?? true
    };

    this.metrics = this.initMetrics();
  }

  /**
   * Execute with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquirePermit();

    try {
      return await fn();
    } finally {
      this.releasePermit();
    }
  }

  /**
   * Acquire permit to execute
   */
  private async acquirePermit(): Promise<void> {
    if (this.currentConcurrent < this.config.maxConcurrentCalls) {
      this.currentConcurrent++;
      return;
    }

    // Need to wait
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        this.metrics.rejectedCalls++;
        reject(new BulkheadFullError(`Bulkhead '${this.config.name}' is full`));
      }, this.config.maxWaitDuration);

      const waiter = { resolve, reject, timeout };

      if (this.config.fairCallHandlingEnabled) {
        this.waitingQueue.push(waiter);
      } else {
        // Random insertion for non-fair handling
        const pos = Math.floor(Math.random() * (this.waitingQueue.length + 1));
        this.waitingQueue.splice(pos, 0, waiter);
      }
    });
  }

  /**
   * Release permit after execution
   */
  private releasePermit(): void {
    this.currentConcurrent--;

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      clearTimeout(waiter.timeout);
      this.currentConcurrent++;
      waiter.resolve();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): BulkheadMetrics {
    return {
      availablePermits: this.config.maxConcurrentCalls - this.currentConcurrent,
      maxAllowedConcurrentCalls: this.config.maxConcurrentCalls,
      currentlyWaiting: this.waitingQueue.length,
      rejectedCalls: this.metrics.rejectedCalls
    };
  }

  /**
   * Initialize metrics
   */
  private initMetrics(): BulkheadMetrics {
    return {
      availablePermits: this.config.maxConcurrentCalls,
      maxAllowedConcurrentCalls: this.config.maxConcurrentCalls,
      currentlyWaiting: 0,
      rejectedCalls: 0
    };
  }

  /**
   * Reset bulkhead
   */
  reset(): void {
    // Clear waiting queue
    for (const waiter of this.waitingQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Bulkhead reset'));
    }
    this.waitingQueue = [];
    this.currentConcurrent = 0;
    this.metrics = this.initMetrics();
  }
}

/**
 * Bulkhead Full Error
 */
export class BulkheadFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadFullError';
  }
}

// ============================================================================
// TIMEOUT
// ============================================================================

/**
 * Timeout Wrapper
 *
 * Features:
 * - Configurable timeout duration
 * - Optional cancellation
 */
export class TimeoutWrapper {
  private config: TimeoutConfig;

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = {
      timeout: config.timeout ?? 5000,
      cancelOnTimeout: config.cancelOnTimeout ?? true
    };
  }

  /**
   * Execute with timeout
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Rate Limiter
 *
 * Features:
 * - Token bucket algorithm
 * - Configurable limits per period
 * - Queuing with timeout
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private waitingQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      limitForPeriod: config.limitForPeriod ?? 50,
      limitRefreshPeriod: config.limitRefreshPeriod ?? 1000,
      timeoutDuration: config.timeoutDuration ?? 5000
    };

    this.tokens = this.config.limitForPeriod;
    this.lastRefill = Date.now();
  }

  /**
   * Execute with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquirePermission();
    return fn();
  }

  /**
   * Acquire permission to proceed
   */
  private async acquirePermission(): Promise<void> {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new RateLimitExceededError('Rate limit exceeded'));
      }, this.config.timeoutDuration);

      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.limitRefreshPeriod) {
      const periods = Math.floor(elapsed / this.config.limitRefreshPeriod);
      this.tokens = Math.min(
        this.tokens + periods * this.config.limitForPeriod,
        this.config.limitForPeriod
      );
      this.lastRefill = now;

      // Process waiting queue
      while (this.waitingQueue.length > 0 && this.tokens > 0) {
        const waiter = this.waitingQueue.shift()!;
        clearTimeout(waiter.timeout);
        this.tokens--;
        waiter.resolve();
      }
    }
  }

  /**
   * Get available permissions
   */
  getAvailablePermissions(): number {
    this.refillTokens();
    return this.tokens;
  }
}

/**
 * Rate Limit Exceeded Error
 */
export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

// ============================================================================
// FALLBACK HANDLER
// ============================================================================

/**
 * Fallback Handler
 *
 * Features:
 * - Custom fallback methods
 * - Cache-based fallback
 * - Default value fallback
 * - Context-aware degradation
 */
export class FallbackHandler<T> {
  private config: FallbackConfig<T>;
  private lastSuccessfulResult: T | null = null;

  constructor(config: Partial<FallbackConfig<T>> = {}) {
    this.config = {
      fallbackMethod: config.fallbackMethod || (() => config.defaultValue as T),
      fallbackOnException: config.fallbackOnException || (() => true),
      cacheLastSuccess: config.cacheLastSuccess ?? true,
      defaultValue: config.defaultValue
    };
  }

  /**
   * Execute with fallback
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();

      if (this.config.cacheLastSuccess) {
        this.lastSuccessfulResult = result;
      }

      return result;
    } catch (error) {
      if (this.config.fallbackOnException(error as Error)) {
        return this.getFallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get fallback value
   */
  private async getFallback(error: Error): Promise<T> {
    // Try cached result first
    if (this.config.cacheLastSuccess && this.lastSuccessfulResult !== null) {
      return this.lastSuccessfulResult;
    }

    // Try fallback method
    return this.config.fallbackMethod(error);
  }

  /**
   * Clear cached result
   */
  clearCache(): void {
    this.lastSuccessfulResult = null;
  }
}

// ============================================================================
// ERROR TRACKER
// ============================================================================

/**
 * Error Tracker
 *
 * Features:
 * - Error aggregation by fingerprint
 * - Breadcrumb tracking
 * - Severity classification
 * - Error grouping
 *
 * Research: Sentry, Rollbar, GlitchTip
 */
export class ErrorTracker {
  private events: ErrorEvent[] = [];
  private groups: Map<string, ErrorGroup> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private maxEvents = 1000;
  private maxBreadcrumbs = 100;
  private globalContext: Record<string, unknown> = {};
  private globalTags: Record<string, string> = {};

  /**
   * Capture an error
   */
  captureError(
    error: Error,
    context: Record<string, unknown> = {},
    severity: ErrorEvent['severity'] = 'error'
  ): string {
    const event: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: error.name,
      message: error.message,
      stack: error.stack,
      context: { ...this.globalContext, ...context },
      fingerprint: this.generateFingerprint(error),
      severity,
      tags: { ...this.globalTags },
      breadcrumbs: [...this.breadcrumbs]
    };

    this.events.push(event);
    this.aggregateError(event);

    // Prune old events
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event.id;
  }

  /**
   * Capture a message
   */
  captureMessage(
    message: string,
    severity: ErrorEvent['severity'] = 'info',
    context: Record<string, unknown> = {}
  ): string {
    const event: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'Message',
      message,
      context: { ...this.globalContext, ...context },
      fingerprint: this.generateFingerprint({ message, name: 'Message' } as Error),
      severity,
      tags: { ...this.globalTags },
      breadcrumbs: [...this.breadcrumbs]
    };

    this.events.push(event);
    return event.id;
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date()
    });

    while (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Aggregate error into group
   */
  private aggregateError(event: ErrorEvent): void {
    const existing = this.groups.get(event.fingerprint);

    if (existing) {
      existing.lastSeen = event.timestamp;
      existing.count++;
      existing.events.push(event);

      // Keep only recent events
      if (existing.events.length > 10) {
        existing.events.shift();
      }
    } else {
      this.groups.set(event.fingerprint, {
        fingerprint: event.fingerprint,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        count: 1,
        events: [event],
        status: 'unresolved'
      });
    }
  }

  /**
   * Generate unique fingerprint for error
   */
  private generateFingerprint(error: Error): string {
    // Create fingerprint from error type and first line of stack
    const stackLine = error.stack?.split('\n')[1] || '';
    const normalized = `${error.name}:${error.message}:${stackLine.trim()}`;

    // Simple hash
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Set global context
   */
  setContext(context: Record<string, unknown>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Set global tags
   */
  setTags(tags: Record<string, string>): void {
    this.globalTags = { ...this.globalTags, ...tags };
  }

  /**
   * Get error groups
   */
  getGroups(status?: ErrorGroup['status']): ErrorGroup[] {
    const groups = Array.from(this.groups.values());

    if (status) {
      return groups.filter(g => g.status === status);
    }

    return groups;
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): ErrorEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Resolve error group
   */
  resolveGroup(fingerprint: string): boolean {
    const group = this.groups.get(fingerprint);
    if (group) {
      group.status = 'resolved';
      return true;
    }
    return false;
  }

  /**
   * Ignore error group
   */
  ignoreGroup(fingerprint: string): boolean {
    const group = this.groups.get(fingerprint);
    if (group) {
      group.status = 'ignored';
      return true;
    }
    return false;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    totalGroups: number;
    unresolvedGroups: number;
    errorRate: number;
  } {
    const unresolvedGroups = this.getGroups('unresolved').length;

    // Calculate error rate (errors per minute in last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = this.events.filter(e =>
      e.timestamp.getTime() > fiveMinutesAgo && e.severity === 'error'
    );

    return {
      totalEvents: this.events.length,
      totalGroups: this.groups.size,
      unresolvedGroups,
      errorRate: recentErrors.length / 5 // per minute
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events = [];
    this.groups.clear();
    this.breadcrumbs = [];
  }
}

// ============================================================================
// RESILIENCE FACADE
// ============================================================================

/**
 * Resilience Facade
 *
 * Combines all resilience patterns into a single, easy-to-use API.
 */
export class ResilienceFacade<T> {
  private circuitBreaker?: CircuitBreaker;
  private retry?: RetryEngine;
  private bulkhead?: Bulkhead;
  private timeout?: TimeoutWrapper;
  private rateLimiter?: RateLimiter;
  private fallback?: FallbackHandler<T>;

  /**
   * Add circuit breaker
   */
  withCircuitBreaker(config: Partial<CircuitBreakerConfig> = {}): this {
    this.circuitBreaker = new CircuitBreaker(config);
    return this;
  }

  /**
   * Add retry
   */
  withRetry(config: Partial<RetryConfig> = {}): this {
    this.retry = new RetryEngine(config);
    return this;
  }

  /**
   * Add bulkhead
   */
  withBulkhead(config: Partial<BulkheadConfig> = {}): this {
    this.bulkhead = new Bulkhead(config);
    return this;
  }

  /**
   * Add timeout
   */
  withTimeout(config: Partial<TimeoutConfig> = {}): this {
    this.timeout = new TimeoutWrapper(config);
    return this;
  }

  /**
   * Add rate limiter
   */
  withRateLimiter(config: Partial<RateLimiterConfig> = {}): this {
    this.rateLimiter = new RateLimiter(config);
    return this;
  }

  /**
   * Add fallback
   */
  withFallback(config: Partial<FallbackConfig<T>> = {}): this {
    this.fallback = new FallbackHandler<T>(config);
    return this;
  }

  /**
   * Execute with all configured patterns
   * Order: RateLimiter -> Timeout -> Bulkhead -> CircuitBreaker -> Retry -> Fallback
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    let wrapped = fn;

    // Apply patterns in order (innermost to outermost)
    if (this.retry) {
      const retryEngine = this.retry;
      const inner = wrapped;
      wrapped = () => retryEngine.execute(inner);
    }

    if (this.circuitBreaker) {
      const cb = this.circuitBreaker;
      const inner = wrapped;
      wrapped = () => cb.execute(inner);
    }

    if (this.bulkhead) {
      const bh = this.bulkhead;
      const inner = wrapped;
      wrapped = () => bh.execute(inner);
    }

    if (this.timeout) {
      const to = this.timeout;
      const inner = wrapped;
      wrapped = () => to.execute(inner);
    }

    if (this.rateLimiter) {
      const rl = this.rateLimiter;
      const inner = wrapped;
      wrapped = () => rl.execute(inner);
    }

    if (this.fallback) {
      return this.fallback.execute(wrapped);
    }

    return wrapped();
  }
}

// ============================================================================
// INTEGRATED RESILIENCE PLATFORM
// ============================================================================

/**
 * Integrated Resilience Platform for Ring
 */
export class IntegratedResiliencePlatform {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private errorTracker: ErrorTracker;

  constructor() {
    this.errorTracker = new ErrorTracker();
    this.errorTracker.setContext({ service: 'ring-spam-detection' });
    this.errorTracker.setTags({ environment: 'production' });

    // Initialize default circuit breakers
    this.circuitBreakers.set('spam-api', new CircuitBreaker({
      name: 'spam-api',
      failureRateThreshold: 50,
      waitDurationInOpenState: 30000
    }));

    this.circuitBreakers.set('blacklist-api', new CircuitBreaker({
      name: 'blacklist-api',
      failureRateThreshold: 60,
      waitDurationInOpenState: 20000
    }));

    // Initialize bulkheads
    this.bulkheads.set('spam-check', new Bulkhead({
      name: 'spam-check',
      maxConcurrentCalls: 100
    }));
  }

  /**
   * Execute spam check with full resilience
   */
  async checkSpam(phoneNumber: string): Promise<{
    isSpam: boolean;
    confidence: number;
    source: string;
  }> {
    const facade = new ResilienceFacade<{ isSpam: boolean; confidence: number; source: string }>()
      .withCircuitBreaker({
        name: 'spam-check',
        failureRateThreshold: 50
      })
      .withRetry({
        maxAttempts: 3,
        jitterType: 'FULL'
      })
      .withBulkhead({
        maxConcurrentCalls: 50
      })
      .withTimeout({
        timeout: 5000
      })
      .withFallback({
        defaultValue: { isSpam: false, confidence: 0, source: 'fallback' },
        cacheLastSuccess: true
      });

    try {
      return await facade.execute(async () => {
        // Simulated spam check
        this.errorTracker.addBreadcrumb({
          type: 'http',
          category: 'spam-check',
          message: `Checking phone: ${phoneNumber.substring(0, 4)}***`,
          level: 'info'
        });

        // Simulated result
        return {
          isSpam: Math.random() > 0.7,
          confidence: Math.random() * 0.5 + 0.5,
          source: 'api'
        };
      });
    } catch (error) {
      this.errorTracker.captureError(error as Error, { phoneNumber: phoneNumber.substring(0, 4) });
      throw error;
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    circuitBreakers: Record<string, CircuitBreakerState>;
    bulkheads: Record<string, BulkheadMetrics>;
    errors: { totalGroups: number; unresolvedGroups: number; errorRate: number };
  } {
    const cbStatus: Record<string, CircuitBreakerState> = {};
    for (const [name, cb] of this.circuitBreakers) {
      cbStatus[name] = cb.getState();
    }

    const bhStatus: Record<string, BulkheadMetrics> = {};
    for (const [name, bh] of this.bulkheads) {
      bhStatus[name] = bh.getMetrics();
    }

    const errorStats = this.errorTracker.getStats();

    return {
      circuitBreakers: cbStatus,
      bulkheads: bhStatus,
      errors: {
        totalGroups: errorStats.totalGroups,
        unresolvedGroups: errorStats.unresolvedGroups,
        errorRate: errorStats.errorRate
      }
    };
  }

  /**
   * Get error tracker
   */
  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerState,
  RetryConfig,
  RetryMetrics,
  BulkheadConfig,
  BulkheadMetrics,
  TimeoutConfig,
  FallbackConfig,
  RateLimiterConfig,
  ErrorEvent,
  Breadcrumb,
  ErrorGroup
};
