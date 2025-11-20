/**
 * Resource Management Layer - Memory and Resource Leak Prevention
 *
 * Addresses CRITICAL defects:
 * - B1: WebRTC resource leaks
 * - B2: Buffer overflow protection
 * - Plus: Circular reference handling, event cleanup, lifecycle management
 */

/**
 * Weak reference holder for preventing memory leaks
 */
export class WeakReferenceHolder<T extends object> {
  private ref: WeakRef<T> | null = null;
  private registry: FinalizationRegistry<string>;

  constructor(private id: string) {
    this.registry = new FinalizationRegistry((id) => {
      console.debug(`Object ${id} was garbage collected`);
    });
  }

  set(obj: T): void {
    this.ref = new WeakRef(obj);
    this.registry.register(obj, this.id);
  }

  get(): T | undefined {
    return this.ref?.deref();
  }

  clear(): void {
    this.ref = null;
  }

  isAlive(): boolean {
    return this.ref?.deref() !== undefined;
  }
}

/**
 * Resource handle for tracking and cleanup
 */
export interface ResourceHandle {
  id: string;
  type: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

/**
 * Resource pool with lifecycle management
 */
export class ResourcePool<T> {
  private resources: Map<string, T> = new Map();
  private metadata: Map<string, ResourceHandle> = new Map();
  private cleanupCallbacks: Map<string, () => Promise<void>> = new Map();
  private maxAge: number; // milliseconds
  private activeCount = 0;

  constructor(
    private type: string,
    private maxSize: number = 1000,
    maxAgeMinutes: number = 5
  ) {
    this.maxAge = maxAgeMinutes * 60 * 1000;
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  async acquire(id: string, factory: () => Promise<T>): Promise<T> {
    // Return existing resource if available
    if (this.resources.has(id)) {
      const handle = this.metadata.get(id)!;
      handle.lastUsed = Date.now();
      this.activeCount++;
      return this.resources.get(id)!;
    }

    // Check size limit
    if (this.resources.size >= this.maxSize) {
      throw new Error(
        `Resource pool ${this.type} exceeded maximum size of ${this.maxSize}`
      );
    }

    // Create new resource
    const resource = await factory();
    this.resources.set(id, resource);

    const handle: ResourceHandle = {
      id,
      type: this.type,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: true
    };

    this.metadata.set(id, handle);
    this.activeCount++;

    return resource;
  }

  async release(id: string): Promise<void> {
    const handle = this.metadata.get(id);
    if (handle) {
      handle.isActive = false;
      this.activeCount--;
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const idsToRemove: string[] = [];

    for (const [id, handle] of this.metadata.entries()) {
      // Remove inactive resources older than maxAge
      if (
        !handle.isActive &&
        now - handle.lastUsed > this.maxAge
      ) {
        idsToRemove.push(id);
      }
    }

    // Execute cleanup callbacks and remove resources
    for (const id of idsToRemove) {
      const callback = this.cleanupCallbacks.get(id);
      if (callback) {
        try {
          await callback();
        } catch (error) {
          console.error(`Error cleaning up resource ${id}:`, error);
        }
      }

      this.resources.delete(id);
      this.metadata.delete(id);
      this.cleanupCallbacks.delete(id);
    }

    if (idsToRemove.length > 0) {
      console.debug(`Cleaned up ${idsToRemove.length} resources from pool ${this.type}`);
    }
  }

  registerCleanup(id: string, callback: () => Promise<void>): void {
    this.cleanupCallbacks.set(id, callback);
  }

  async shutdown(): Promise<void> {
    // Execute all cleanup callbacks
    for (const [id, callback] of this.cleanupCallbacks.entries()) {
      try {
        await callback();
      } catch (error) {
        console.error(`Error during shutdown of resource ${id}:`, error);
      }
    }

    this.resources.clear();
    this.metadata.clear();
    this.cleanupCallbacks.clear();
    this.activeCount = 0;
  }

  getMetrics(): {
    total: number;
    active: number;
    inactive: number;
  } {
    const active = Array.from(this.metadata.values()).filter(
      (h) => h.isActive
    ).length;
    const inactive = this.metadata.size - active;

    return {
      total: this.metadata.size,
      active,
      inactive
    };
  }
}

/**
 * Event listener tracker for cleanup
 */
export class EventListenerTracker {
  private listeners: Map<
    EventTarget,
    Map<string, Set<EventListenerOrEventListenerObject>>
  > = new Map();

  addListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners.has(target)) {
      this.listeners.set(target, new Map());
    }

    const typeMap = this.listeners.get(target)!;
    if (!typeMap.has(type)) {
      typeMap.set(type, new Set());
    }

    typeMap.get(type)!.add(listener);

    target.addEventListener(type, listener, options);
  }

  removeListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    const typeMap = this.listeners.get(target);
    if (typeMap) {
      const set = typeMap.get(type);
      if (set) {
        set.delete(listener);
      }
    }

    target.removeEventListener(type, listener);
  }

  removeAllListeners(target?: EventTarget): void {
    if (target) {
      const typeMap = this.listeners.get(target);
      if (typeMap) {
        for (const [type, listeners] of typeMap.entries()) {
          for (const listener of listeners) {
            target.removeEventListener(type, listener);
          }
        }
      }
      this.listeners.delete(target);
    } else {
      for (const [target, typeMap] of this.listeners.entries()) {
        for (const [type, listeners] of typeMap.entries()) {
          for (const listener of listeners) {
            target.removeEventListener(type, listener);
          }
        }
      }
      this.listeners.clear();
    }
  }

  getListenerCount(target?: EventTarget): number {
    if (target) {
      const typeMap = this.listeners.get(target);
      if (!typeMap) return 0;

      let count = 0;
      for (const listeners of typeMap.values()) {
        count += listeners.size;
      }
      return count;
    }

    let total = 0;
    for (const typeMap of this.listeners.values()) {
      for (const listeners of typeMap.values()) {
        total += listeners.size;
      }
    }
    return total;
  }

  getDiagnostics(): {
    totalTargets: number;
    totalListeners: number;
    byTarget: { target: string; count: number }[];
  } {
    const byTarget = [];
    let totalListeners = 0;

    for (const [target, typeMap] of this.listeners.entries()) {
      let count = 0;
      for (const listeners of typeMap.values()) {
        count += listeners.size;
      }

      if (count > 0) {
        byTarget.push({
          target: (target as any)?.constructor?.name || 'Unknown',
          count
        });
        totalListeners += count;
      }
    }

    return {
      totalTargets: this.listeners.size,
      totalListeners,
      byTarget
    };
  }
}

/**
 * Circular reference detector
 */
export class CircularReferenceDetector {
  private visited: WeakSet<object> = new WeakSet();

  detectCircular(obj: any, depth: number = 0): {
    hasCircular: boolean;
    path: string[];
    depthReached: number;
  } {
    const path: string[] = [];
    const MAX_DEPTH = 20;

    const detect = (value: any, currentPath: string[]): boolean => {
      if (currentPath.length > MAX_DEPTH) {
        return false;
      }

      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value !== 'object') {
        return false;
      }

      if (this.visited.has(value)) {
        path.push(...currentPath);
        return true;
      }

      this.visited.add(value);

      for (const [key, val] of Object.entries(value)) {
        if (detect(val, [...currentPath, key])) {
          return true;
        }
      }

      return false;
    };

    const result = detect(obj, []);
    this.visited = new WeakSet(); // Reset for next detection

    return {
      hasCircular: result,
      path,
      depthReached: depth
    };
  }

  clearVisited(): void {
    this.visited = new WeakSet();
  }
}

/**
 * Memory monitor for tracking allocations
 */
export class MemoryMonitor {
  private snapshots: Array<{
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  }> = [];
  private maxSnapshots = 100;

  takeSnapshot(): {
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  } | null {
    const perf = performance as any;
    if (!perf.memory) {
      console.warn('Memory API not available');
      return null;
    }

    const snapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  getMemoryTrend(): {
    current: number;
    min: number;
    max: number;
    avg: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null {
    if (this.snapshots.length === 0) return null;

    const heaps = this.snapshots.map((s) => s.usedJSHeapSize);
    const current = heaps[heaps.length - 1];
    const min = Math.min(...heaps);
    const max = Math.max(...heaps);
    const avg = heaps.reduce((a, b) => a + b, 0) / heaps.length;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (heaps.length > 2) {
      const recent = heaps.slice(-5);
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(recent.length / 2);
      const secondHalf = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(recent.length / 2);

      if (secondHalf > firstHalf * 1.05) {
        trend = 'increasing';
      } else if (secondHalf < firstHalf * 0.95) {
        trend = 'decreasing';
      }
    }

    return { current, min, max, avg, trend };
  }

  detectLeak(threshold: number = 0.1): boolean {
    const trend = this.getMemoryTrend();
    if (!trend) return false;

    // If memory increased by more than threshold over snapshots, suspect leak
    const increase = (trend.current - trend.min) / trend.min;
    return increase > threshold;
  }

  clearSnapshots(): void {
    this.snapshots = [];
  }
}

/**
 * Buffer overflow protection
 */
export class BufferGuard {
  static validateLength(length: number, max: number, context: string): void {
    if (length < 0) {
      throw new Error(`Invalid buffer length (negative): ${length} in ${context}`);
    }

    if (length > max) {
      throw new Error(
        `Buffer size ${length} exceeds maximum ${max} in ${context}`
      );
    }

    if (!Number.isFinite(length)) {
      throw new Error(`Invalid buffer length (non-finite): ${length} in ${context}`);
    }
  }

  static createSafeBuffer(size: number, maxSize: number = 1048576): Uint8Array {
    // Max 1MB by default
    this.validateLength(size, maxSize, 'buffer creation');
    return new Uint8Array(size);
  }

  static validateArrayAccess(
    array: any[],
    index: number,
    context: string
  ): void {
    if (!Array.isArray(array)) {
      throw new Error(`Not an array in ${context}`);
    }

    if (index < 0 || index >= array.length) {
      throw new Error(
        `Array index ${index} out of bounds [0, ${array.length - 1}] in ${context}`
      );
    }

    if (!Number.isInteger(index)) {
      throw new Error(`Invalid array index (non-integer): ${index} in ${context}`);
    }
  }
}

/**
 * Resource manager - coordinates all resource management
 */
export class ResourceManager {
  private pools: Map<string, ResourcePool<any>> = new Map();
  private eventTracker = new EventListenerTracker();
  private circularDetector = new CircularReferenceDetector();
  private memoryMonitor = new MemoryMonitor();

  getOrCreatePool<T>(
    type: string,
    maxSize?: number,
    maxAgeMinutes?: number
  ): ResourcePool<T> {
    if (!this.pools.has(type)) {
      this.pools.set(type, new ResourcePool<T>(type, maxSize, maxAgeMinutes));
    }
    return this.pools.get(type) as ResourcePool<T>;
  }

  getEventTracker(): EventListenerTracker {
    return this.eventTracker;
  }

  getCircularDetector(): CircularReferenceDetector {
    return this.circularDetector;
  }

  getMemoryMonitor(): MemoryMonitor {
    return this.memoryMonitor;
  }

  async shutdown(): Promise<void> {
    // Shutdown all resource pools
    for (const pool of this.pools.values()) {
      await pool.shutdown();
    }
    this.pools.clear();

    // Remove all event listeners
    this.eventTracker.removeAllListeners();

    // Clear detectors
    this.circularDetector.clearVisited();
    this.memoryMonitor.clearSnapshots();
  }

  getDiagnostics(): {
    pools: { [key: string]: any };
    listeners: any;
    memory: any;
  } {
    const pools: any = {};
    for (const [type, pool] of this.pools.entries()) {
      pools[type] = pool.getMetrics();
    }

    return {
      pools,
      listeners: this.eventTracker.getDiagnostics(),
      memory: this.memoryMonitor.getMemoryTrend()
    };
  }
}

export {
  WeakReferenceHolder,
  ResourceHandle,
  ResourcePool,
  EventListenerTracker,
  CircularReferenceDetector,
  MemoryMonitor,
  BufferGuard,
  ResourceManager
};
