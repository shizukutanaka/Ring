/**
 * Error Context Layer - Enhanced Error Handling & Diagnostics
 *
 * Addresses CRITICAL defects:
 * - E1: Error propagation failures
 * - E2: Missing error context
 * - Plus: Stack trace preservation, error chaining, diagnostic capture
 */

/**
 * Enhanced error with context information
 */
export class ContextualError extends Error {
  context: Record<string, any>;
  originalError: Error | null;
  timestamp: number;
  stackTrace: string;
  breadcrumbs: Array<{ time: number; message: string; level: string }>;
  codeLocation?: { file: string; line: number; function: string };

  constructor(
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ContextualError';
    this.context = context || {};
    this.originalError = originalError || null;
    this.timestamp = Date.now();
    this.stackTrace = this.captureStackTrace();
    this.breadcrumbs = [];

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ContextualError.prototype);
  }

  private captureStackTrace(): string {
    if (Error.captureStackTrace) {
      const obj: any = {};
      Error.captureStackTrace(obj, ContextualError);
      return obj.stack || '';
    }
    return this.stack || '';
  }

  addBreadcrumb(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    this.breadcrumbs.push({
      time: Date.now(),
      message,
      level
    });

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  setCodeLocation(file: string, line: number, functionName: string): void {
    this.codeLocation = { file, line, function: functionName };
  }

  getFullContext(): {
    message: string;
    name: string;
    context: Record<string, any>;
    timestamp: number;
    stackTrace: string;
    breadcrumbs: Array<any>;
    originalError: Error | null;
    codeLocation?: any;
    chain: any[];
  } {
    const chain: any[] = [];
    let current: ContextualError | null = this;

    while (current) {
      chain.push({
        message: current.message,
        context: current.context,
        timestamp: current.timestamp
      });

      current = current.originalError instanceof ContextualError
        ? (current.originalError as ContextualError)
        : null;
    }

    return {
      message: this.message,
      name: this.name,
      context: this.context,
      timestamp: this.timestamp,
      stackTrace: this.stackTrace,
      breadcrumbs: this.breadcrumbs,
      originalError: this.originalError,
      codeLocation: this.codeLocation,
      chain
    };
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`;

    if (this.codeLocation) {
      result += ` (at ${this.codeLocation.function} in ${this.codeLocation.file}:${this.codeLocation.line})`;
    }

    if (Object.keys(this.context).length > 0) {
      result += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }

    if (this.breadcrumbs.length > 0) {
      result += '\nBreadcrumbs:';
      this.breadcrumbs.forEach((bc) => {
        result += `\n  [${new Date(bc.time).toISOString()}] ${bc.level.toUpperCase()}: ${bc.message}`;
      });
    }

    return result;
  }
}

/**
 * Error category and severity levels
 */
export enum ErrorSeverity {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  CODEC = 'CODEC',
  RESOURCE = 'RESOURCE',
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  COMPUTATION = 'COMPUTATION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Structured error with categorization
 */
export class CategorizedError extends ContextualError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  suggestedAction?: string;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, context, originalError);
    this.name = 'CategorizedError';
    this.category = category;
    this.severity = severity;
    this.recoverable = true;

    Object.setPrototypeOf(this, CategorizedError.prototype);
  }

  setSuggestedAction(action: string): void {
    this.suggestedAction = action;
  }

  setRecoverable(recoverable: boolean): void {
    this.recoverable = recoverable;
  }

  getRecoveryInfo(): {
    recoverable: boolean;
    suggestedAction?: string;
    category: string;
    severity: string;
  } {
    return {
      recoverable: this.recoverable,
      suggestedAction: this.suggestedAction,
      category: this.category,
      severity: ErrorSeverity[this.severity]
    };
  }
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  name: string;
  condition: (error: Error) => boolean;
  handler: (error: Error) => Promise<any>;
  timeout?: number; // milliseconds
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
  private strategies: Map<string, RecoveryStrategy[]> = new Map();
  private successCount: Map<string, number> = new Map();
  private failureCount: Map<string, number> = new Map();

  registerStrategy(category: ErrorCategory, strategy: RecoveryStrategy): void {
    if (!this.strategies.has(category)) {
      this.strategies.set(category, []);
    }
    this.strategies.get(category)!.push(strategy);

    // Initialize counters
    const key = `${category}:${strategy.name}`;
    this.successCount.set(key, 0);
    this.failureCount.set(key, 0);
  }

  async attemptRecovery(error: Error, category: ErrorCategory): Promise<{
    recovered: boolean;
    result?: any;
    error?: Error;
    attemptedStrategies: string[];
  }> {
    const strategies = this.strategies.get(category) || [];
    const attemptedStrategies: string[] = [];

    for (const strategy of strategies) {
      if (!strategy.condition(error)) {
        continue;
      }

      attemptedStrategies.push(strategy.name);

      try {
        const result = await this.executeWithTimeout(
          strategy.handler(error),
          strategy.timeout || 5000
        );

        const key = `${category}:${strategy.name}`;
        this.successCount.set(key, (this.successCount.get(key) || 0) + 1);

        return {
          recovered: true,
          result,
          attemptedStrategies
        };
      } catch (recoveryError) {
        const key = `${category}:${strategy.name}`;
        this.failureCount.set(key, (this.failureCount.get(key) || 0) + 1);

        console.warn(
          `Recovery strategy ${strategy.name} failed:`,
          recoveryError
        );
      }
    }

    return {
      recovered: false,
      error,
      attemptedStrategies
    };
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Recovery timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ]);
  }

  getStatistics(): {
    [strategyKey: string]: {
      successes: number;
      failures: number;
      successRate: number;
    };
  } {
    const stats: any = {};

    for (const [key, successes] of this.successCount.entries()) {
      const failures = this.failureCount.get(key) || 0;
      const total = successes + failures;

      stats[key] = {
        successes,
        failures,
        successRate: total > 0 ? (successes / total) * 100 : 0
      };
    }

    return stats;
  }
}

/**
 * Error aggregator for batch error handling
 */
export class ErrorAggregator {
  private errors: ContextualError[] = [];
  private maxErrors = 1000;
  private groupedErrors: Map<string, number> = new Map();

  addError(error: Error, groupKey?: string): void {
    const contextual = error instanceof ContextualError
      ? error
      : new ContextualError(error.message, {}, error);

    this.errors.push(contextual);

    if (groupKey) {
      this.groupedErrors.set(
        groupKey,
        (this.groupedErrors.get(groupKey) || 0) + 1
      );
    }

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  getErrors(category?: ErrorCategory, limit?: number): ContextualError[] {
    let filtered = this.errors;

    if (category) {
      filtered = filtered.filter(
        (e) => e instanceof CategorizedError && e.category === category
      );
    }

    if (limit) {
      return filtered.slice(-limit);
    }

    return [...filtered];
  }

  getErrorSummary(): {
    totalErrors: number;
    byCategory: { [key: string]: number };
    recentErrors: Array<{ message: string; timestamp: number; category?: string }>;
    topErrorGroups: Array<{ group: string; count: number }>;
  } {
    const byCategory: any = {};

    for (const error of this.errors) {
      if (error instanceof CategorizedError) {
        const cat = error.category;
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }
    }

    const topErrorGroups = Array.from(this.groupedErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([group, count]) => ({ group, count }));

    const recentErrors = this.errors.slice(-10).map((e) => ({
      message: e.message,
      timestamp: e.timestamp,
      category: e instanceof CategorizedError ? e.category : undefined
    }));

    return {
      totalErrors: this.errors.length,
      byCategory,
      recentErrors,
      topErrorGroups
    };
  }

  clear(): void {
    this.errors = [];
    this.groupedErrors.clear();
  }
}

/**
 * Error context manager - coordinates all error handling
 */
export class ErrorContextManager {
  private aggregator = new ErrorAggregator();
  private recoveryManager = new ErrorRecoveryManager();
  private errorListeners: Map<ErrorCategory, Function[]> = new Map();

  addErrorListener(category: ErrorCategory, handler: (error: Error) => void): void {
    if (!this.errorListeners.has(category)) {
      this.errorListeners.set(category, []);
    }
    this.errorListeners.get(category)!.push(handler);
  }

  async handleError(
    error: Error,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: Record<string, any>
  ): Promise<{
    handled: boolean;
    recovered: boolean;
    result?: any;
    contextualError: ContextualError;
  }> {
    // Create contextual error
    const contextualError =
      error instanceof CategorizedError
        ? error
        : new CategorizedError(
          error.message,
          category,
          ErrorSeverity.MEDIUM,
          context,
          error
        );

    // Add to aggregator
    this.aggregator.addError(contextualError);

    // Notify listeners
    const listeners = this.errorListeners.get(category) || [];
    for (const listener of listeners) {
      try {
        listener(contextualError);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    }

    // Attempt recovery
    const recovery = await this.recoveryManager.attemptRecovery(
      contextualError,
      category
    );

    return {
      handled: true,
      recovered: recovery.recovered,
      result: recovery.result,
      contextualError
    };
  }

  registerRecoveryStrategy(
    category: ErrorCategory,
    strategy: RecoveryStrategy
  ): void {
    this.recoveryManager.registerStrategy(category, strategy);
  }

  getErrorHistory(): ContextualError[] {
    return this.aggregator.getErrors();
  }

  getErrorSummary() {
    return this.aggregator.getErrorSummary();
  }

  getRecoveryStatistics() {
    return this.recoveryManager.getStatistics();
  }

  getDiagnostics(): {
    errors: any;
    recovery: any;
    listeners: { [key: string]: number };
  } {
    const listeners: any = {};
    for (const [category, handlers] of this.errorListeners.entries()) {
      listeners[category] = handlers.length;
    }

    return {
      errors: this.aggregator.getErrorSummary(),
      recovery: this.recoveryManager.getStatistics(),
      listeners
    };
  }

  clear(): void {
    this.aggregator.clear();
    this.errorListeners.clear();
  }
}

export {
  ContextualError,
  CategorizedError,
  ErrorRecoveryManager,
  ErrorAggregator,
  ErrorContextManager,
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy
};
