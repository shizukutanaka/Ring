/**
 * Synchronization Layer - Thread-Safe Operations
 *
 * Addresses CRITICAL defects:
 * - A1: Race conditions in cache access
 * - A2: Concurrent metrics updates
 * - A3: Logging buffer thread-safety
 *
 * Implements mutex-like locking and safe concurrency patterns
 */

/**
 * Simple lock mechanism for synchronizing access
 */
export class Lock {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }

  async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquire();
    try {
      return await Promise.resolve(fn());
    } finally {
      this.release();
    }
  }
}

/**
 * Read-Write lock for optimized concurrent access
 * Allows multiple readers but exclusive writer
 */
export class ReadWriteLock {
  private readers = 0;
  private writers = 0;
  private writeQueue: (() => void)[] = [];
  private readQueue: (() => void)[] = [];

  async acquireRead(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writers === 0 && this.writeQueue.length === 0) {
        this.readers++;
        resolve();
      } else {
        this.readQueue.push(() => {
          this.readers++;
          resolve();
        });
      }
    });
  }

  releaseRead(): void {
    this.readers--;
    this.processQueues();
  }

  async acquireWrite(): Promise<void> {
    return new Promise((resolve) => {
      if (this.readers === 0 && this.writers === 0) {
        this.writers++;
        resolve();
      } else {
        this.writeQueue.push(() => {
          this.writers++;
          resolve();
        });
      }
    });
  }

  releaseWrite(): void {
    this.writers--;
    this.processQueues();
  }

  private processQueues(): void {
    if (this.writers === 0 && this.writeQueue.length > 0) {
      const writeResolve = this.writeQueue.shift();
      if (writeResolve) writeResolve();
    } else if (this.writers === 0 && this.readers === 0) {
      while (this.readQueue.length > 0) {
        const readResolve = this.readQueue.shift();
        if (readResolve) readResolve();
      }
    }
  }

  async withReadLock<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquireRead();
    try {
      return await Promise.resolve(fn());
    } finally {
      this.releaseRead();
    }
  }

  async withWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquireWrite();
    try {
      return await Promise.resolve(fn());
    } finally {
      this.releaseWrite();
    }
  }
}

/**
 * Thread-safe cache with synchronization
 */
export class SynchronizedCache<K, V> {
  private cache: Map<K, V> = new Map();
  private lock = new ReadWriteLock();
  private accessLog: Array<{ key: K; operation: string; timestamp: number }> = [];
  private maxAccessLog = 1000;

  async get(key: K): Promise<V | undefined> {
    return this.lock.withReadLock(async () => {
      this.logAccess(key, 'get');
      return this.cache.get(key);
    });
  }

  async set(key: K, value: V): Promise<void> {
    return this.lock.withWriteLock(async () => {
      this.logAccess(key, 'set');
      this.cache.set(key, value);
    });
  }

  async delete(key: K): Promise<boolean> {
    return this.lock.withWriteLock(async () => {
      this.logAccess(key, 'delete');
      return this.cache.delete(key);
    });
  }

  async clear(): Promise<void> {
    return this.lock.withWriteLock(async () => {
      this.logAccess(null as any, 'clear');
      this.cache.clear();
    });
  }

  async has(key: K): Promise<boolean> {
    return this.lock.withReadLock(async () => {
      return this.cache.has(key);
    });
  }

  async size(): Promise<number> {
    return this.lock.withReadLock(async () => {
      return this.cache.size;
    });
  }

  async getAllEntries(): Promise<Array<[K, V]>> {
    return this.lock.withReadLock(async () => {
      return Array.from(this.cache.entries());
    });
  }

  private logAccess(key: K, operation: string): void {
    this.accessLog.push({
      key,
      operation,
      timestamp: Date.now()
    });

    if (this.accessLog.length > this.maxAccessLog) {
      this.accessLog.shift();
    }
  }

  getAccessLog() {
    return [...this.accessLog];
  }
}

/**
 * Thread-safe metrics accumulator
 */
export class SynchronizedMetrics {
  private metrics: Map<string, number[]> = new Map();
  private lock = new ReadWriteLock();
  private lastUpdate: Map<string, number> = new Map();

  async addMetric(name: string, value: number): Promise<void> {
    // Validate input
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid metric value for ${name}: ${value}`);
    }

    return this.lock.withWriteLock(async () => {
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }

      const values = this.metrics.get(name)!;
      values.push(value);

      // Keep only last 1000 values per metric
      if (values.length > 1000) {
        values.shift();
      }

      this.lastUpdate.set(name, Date.now());
    });
  }

  async getMetric(name: string): Promise<number | undefined> {
    return this.lock.withReadLock(async () => {
      const values = this.metrics.get(name);
      if (!values || values.length === 0) {
        return undefined;
      }
      return values[values.length - 1];
    });
  }

  async getMetrics(name: string): Promise<number[]> {
    return this.lock.withReadLock(async () => {
      return [...(this.metrics.get(name) || [])];
    });
  }

  async getStatistics(name: string): Promise<{
    count: number;
    min: number;
    max: number;
    avg: number;
    latest: number;
    lastUpdated: number;
  } | null> {
    return this.lock.withReadLock(async () => {
      const values = this.metrics.get(name);
      if (!values || values.length === 0) {
        return null;
      }

      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      const min = sorted[0];
      const max = sorted[count - 1];
      const avg = sorted.reduce((a, b) => a + b, 0) / count;
      const latest = values[values.length - 1];
      const lastUpdated = this.lastUpdate.get(name) || 0;

      return { count, min, max, avg, latest, lastUpdated };
    });
  }

  async getAllMetrics(): Promise<{
    [key: string]: {
      count: number;
      min: number;
      max: number;
      avg: number;
      latest: number;
      lastUpdated: number;
    };
  }> {
    return this.lock.withReadLock(async () => {
      const result: any = {};

      for (const [name] of this.metrics) {
        const stats = await this.getStatistics(name);
        if (stats) {
          result[name] = stats;
        }
      }

      return result;
    });
  }

  async clear(): Promise<void> {
    return this.lock.withWriteLock(async () => {
      this.metrics.clear();
      this.lastUpdate.clear();
    });
  }
}

/**
 * Thread-safe event emitter
 */
export class SynchronizedEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();
  private lock = new Lock();
  private eventLog: Array<{ event: string; timestamp: number }> = [];
  private maxEventLog = 1000;

  async on(event: string, handler: Function): Promise<void> {
    return this.lock.withLock(async () => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(handler);
    });
  }

  async off(event: string, handler: Function): Promise<void> {
    return this.lock.withLock(async () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    });
  }

  async emit(event: string, data?: any): Promise<void> {
    this.logEvent(event);

    // Get handlers without holding lock during execution
    const handlers: Function[] = [];
    await this.lock.withLock(async () => {
      const set = this.listeners.get(event);
      if (set) {
        handlers.push(...set);
      }
    });

    // Execute handlers
    for (const handler of handlers) {
      try {
        await Promise.resolve(handler(data));
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  async once(event: string, handler: Function): Promise<void> {
    const wrapper = async (data: any) => {
      await handler(data);
      await this.off(event, wrapper);
    };

    return this.on(event, wrapper);
  }

  async removeAllListeners(event?: string): Promise<void> {
    return this.lock.withLock(async () => {
      if (event) {
        this.listeners.delete(event);
      } else {
        this.listeners.clear();
      }
    });
  }

  async listenerCount(event: string): Promise<number> {
    return this.lock.withLock(async () => {
      return this.listeners.get(event)?.size || 0;
    });
  }

  private logEvent(event: string): void {
    this.eventLog.push({
      event,
      timestamp: Date.now()
    });

    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
  }

  getEventLog() {
    return [...this.eventLog];
  }
}

/**
 * Thread-safe queue for async operations
 */
export class SynchronizedQueue<T> {
  private queue: T[] = [];
  private lock = new Lock();
  private processing = false;

  async enqueue(item: T): Promise<void> {
    return this.lock.withLock(async () => {
      this.queue.push(item);
    });
  }

  async dequeue(): Promise<T | undefined> {
    return this.lock.withLock(async () => {
      return this.queue.shift();
    });
  }

  async size(): Promise<number> {
    return this.lock.withLock(async () => {
      return this.queue.length;
    });
  }

  async clear(): Promise<void> {
    return this.lock.withLock(async () => {
      this.queue = [];
    });
  }

  async processAll(processor: (item: T) => Promise<void>): Promise<void> {
    if (this.processing) {
      throw new Error('Processing already in progress');
    }

    this.processing = true;
    try {
      while (true) {
        const item = await this.dequeue();
        if (!item) break;

        try {
          await processor(item);
        } catch (error) {
          console.error('Error processing queue item:', error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

/**
 * Synchronization manager - coordinates all thread-safe operations
 */
export class SynchronizationManager {
  private caches: Map<string, SynchronizedCache<any, any>> = new Map();
  private metrics = new SynchronizedMetrics();
  private eventEmitter = new SynchronizedEventEmitter();
  private queues: Map<string, SynchronizedQueue<any>> = new Map();
  private mainLock = new ReadWriteLock();

  async getOrCreateCache<K, V>(name: string): Promise<SynchronizedCache<K, V>> {
    return this.mainLock.withReadLock(async () => {
      if (!this.caches.has(name)) {
        this.mainLock.withWriteLock(async () => {
          if (!this.caches.has(name)) {
            this.caches.set(name, new SynchronizedCache<K, V>());
          }
        });
      }
      return this.caches.get(name) as SynchronizedCache<K, V>;
    });
  }

  getMetrics(): SynchronizedMetrics {
    return this.metrics;
  }

  getEventEmitter(): SynchronizedEventEmitter {
    return this.eventEmitter;
  }

  async getOrCreateQueue<T>(name: string): Promise<SynchronizedQueue<T>> {
    return this.mainLock.withReadLock(async () => {
      if (!this.queues.has(name)) {
        this.mainLock.withWriteLock(async () => {
          if (!this.queues.has(name)) {
            this.queues.set(name, new SynchronizedQueue<T>());
          }
        });
      }
      return this.queues.get(name) as SynchronizedQueue<T>;
    });
  }

  async shutdown(): Promise<void> {
    return this.mainLock.withWriteLock(async () => {
      this.caches.clear();
      this.queues.clear();
      await this.metrics.clear();
      await this.eventEmitter.removeAllListeners();
    });
  }

  async getDiagnostics(): Promise<{
    caches: number;
    queues: number;
    metrics: { [key: string]: any };
    eventLog: Array<any>;
  }> {
    return this.mainLock.withReadLock(async () => {
      const metrics = await this.metrics.getAllMetrics();
      const eventLog = this.eventEmitter.getEventLog();

      return {
        caches: this.caches.size,
        queues: this.queues.size,
        metrics,
        eventLog
      };
    });
  }
}

export { Lock, ReadWriteLock, SynchronizedCache, SynchronizedMetrics, SynchronizedEventEmitter, SynchronizedQueue, SynchronizationManager };
