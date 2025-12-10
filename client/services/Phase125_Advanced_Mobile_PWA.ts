/**
 * Phase 125: Advanced Mobile Optimization & Progressive Web App (PWA)
 *
 * Competitive Differentiation:
 * - vs Truecaller: Native app only, no PWA
 * - vs Hiya: Basic mobile app, no offline support
 * - vs RoboKiller: iOS/Android apps, no web version
 *
 * Key Features:
 * - Progressive Web App (PWA) with offline support
 * - Service Worker with intelligent caching
 * - Push notifications (Web Push API)
 * - App-like installation experience
 * - Adaptive UI for different screen sizes
 * - Touch gesture optimization
 * - Battery and network-aware optimization
 * - Background sync
 *
 * Use Cases:
 * - Mobile-first user experience
 * - Offline call blocking
 * - Cross-platform deployment
 * - Reduced app store dependencies
 * - Lower bandwidth consumption
 *
 * Research Sources:
 * - Google PWA best practices (2024-2025)
 * - Apple iOS PWA support
 * - Workbox service worker library
 * - Web Push Protocol (RFC 8030)
 * - Lighthouse PWA audit criteria
 * - Core Web Vitals optimization
 *
 * @module Phase125_Advanced_Mobile_PWA
 * @version 1.0.0
 * @since December 2025
 */

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  backgroundColor: string;
  themeColor: string;
  icons: PWAIcon[];
  orientation: 'any' | 'portrait' | 'landscape';
  scope: string;
  categories: string[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'maskable' | 'any' | 'monochrome';
}

export interface ServiceWorkerConfig {
  cacheName: string;
  version: string;
  cacheStrategy: CacheStrategy;
  precacheAssets: string[];
  runtimeCaching: RuntimeCacheRule[];
  offlinePage: string;
}

export type CacheStrategy =
  | 'cache_first'
  | 'network_first'
  | 'stale_while_revalidate'
  | 'network_only'
  | 'cache_only';

export interface RuntimeCacheRule {
  urlPattern: RegExp | string;
  handler: CacheStrategy;
  options?: CacheOptions;
}

export interface CacheOptions {
  cacheName?: string;
  expiration?: {
    maxEntries?: number;
    maxAgeSeconds?: number;
  };
  networkTimeout?: number;
}

export interface PushSubscription {
  subscriptionId: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number;
  createdAt: number;
}

export interface PushNotification {
  notificationId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface OfflineQueue {
  queueId: string;
  items: QueuedRequest[];
}

export interface QueuedRequest {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  queuedAt: number;
  retries: number;
}

export interface NetworkStatus {
  online: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

export interface BatteryStatus {
  charging: boolean;
  level: number; // 0-1
  chargingTime: number; // seconds
  dischargingTime: number; // seconds
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  columns: number;
  layout: 'mobile' | 'tablet' | 'desktop';
}

// ============================================================================
// PWA Manifest Generator
// ============================================================================

export class PWAManifestGenerator {
  /**
   * Generate manifest.json
   */
  generateManifest(config: PWAConfig): any {
    return {
      name: config.name,
      short_name: config.shortName,
      description: config.description,
      start_url: config.startUrl,
      display: config.display,
      background_color: config.backgroundColor,
      theme_color: config.themeColor,
      icons: config.icons,
      orientation: config.orientation,
      scope: config.scope,
      categories: config.categories
    };
  }

  /**
   * Validate manifest
   */
  validateManifest(manifest: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.short_name) errors.push('Missing required field: short_name');
    if (!manifest.start_url) errors.push('Missing required field: start_url');
    if (!manifest.icons || manifest.icons.length === 0) {
      errors.push('At least one icon is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Service Worker Manager
// ============================================================================

export class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: ServiceWorkerConfig) {
    this.config = config;
  }

  /**
   * Install service worker
   */
  async install(): Promise<void> {
    // Precache assets
    for (const asset of this.config.precacheAssets) {
      await this.cacheAsset(asset);
    }
  }

  /**
   * Handle fetch request
   */
  async fetch(request: Request): Promise<Response> {
    const url = request.url;

    // Find matching runtime cache rule
    const rule = this.config.runtimeCaching.find(r => {
      if (typeof r.urlPattern === 'string') {
        return url.includes(r.urlPattern);
      }
      return r.urlPattern.test(url);
    });

    const strategy = rule?.handler || this.config.cacheStrategy;

    return await this.applyStrategy(request, strategy, rule?.options);
  }

  private async applyStrategy(
    request: Request,
    strategy: CacheStrategy,
    options?: CacheOptions
  ): Promise<Response> {
    switch (strategy) {
      case 'cache_first':
        return await this.cacheFirst(request, options);
      case 'network_first':
        return await this.networkFirst(request, options);
      case 'stale_while_revalidate':
        return await this.staleWhileRevalidate(request, options);
      case 'network_only':
        return await this.networkOnly(request);
      case 'cache_only':
        return await this.cacheOnly(request);
      default:
        return await this.networkFirst(request, options);
    }
  }

  private async cacheFirst(request: Request, options?: CacheOptions): Promise<Response> {
    const cached = this.cache.get(request.url);
    if (cached) {
      return new Response(JSON.stringify(cached));
    }

    try {
      const response = await fetch(request);
      await this.cacheResponse(request.url, response.clone(), options);
      return response;
    } catch (error) {
      return new Response('Offline', { status: 503 });
    }
  }

  private async networkFirst(request: Request, options?: CacheOptions): Promise<Response> {
    try {
      const timeout = options?.networkTimeout || 3000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);

      await this.cacheResponse(request.url, response.clone(), options);
      return response;
    } catch (error) {
      const cached = this.cache.get(request.url);
      if (cached) {
        return new Response(JSON.stringify(cached));
      }
      return new Response('Offline', { status: 503 });
    }
  }

  private async staleWhileRevalidate(
    request: Request,
    options?: CacheOptions
  ): Promise<Response> {
    const cached = this.cache.get(request.url);

    // Return cached immediately
    const cachedResponse = cached ? new Response(JSON.stringify(cached)) : null;

    // Fetch and update cache in background
    fetch(request)
      .then(response => this.cacheResponse(request.url, response, options))
      .catch(() => {});

    return cachedResponse || fetch(request);
  }

  private async networkOnly(request: Request): Promise<Response> {
    return fetch(request);
  }

  private async cacheOnly(request: Request): Promise<Response> {
    const cached = this.cache.get(request.url);
    if (cached) {
      return new Response(JSON.stringify(cached));
    }
    return new Response('Not found in cache', { status: 404 });
  }

  private async cacheAsset(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      await this.cacheResponse(url, response);
    } catch (error) {
      console.error(`Failed to cache asset: ${url}`, error);
    }
  }

  private async cacheResponse(
    url: string,
    response: Response,
    options?: CacheOptions
  ): Promise<void> {
    const data = await response.json();
    this.cache.set(url, data);

    // Apply expiration
    if (options?.expiration) {
      setTimeout(() => {
        this.cache.delete(url);
      }, (options.expiration.maxAgeSeconds || 86400) * 1000);
    }
  }
}

// ============================================================================
// Push Notification Manager
// ============================================================================

export class PushNotificationManager {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private vapidKeys = {
    publicKey: 'BPx...',
    privateKey: 'xxx...'
  };

  /**
   * Subscribe to push notifications
   */
  async subscribe(userId: string): Promise<PushSubscription> {
    const subscriptionId = `sub_${Date.now()}`;

    // Simulate browser push subscription
    const subscription: PushSubscription = {
      subscriptionId,
      userId,
      endpoint: `https://fcm.googleapis.com/fcm/send/${subscriptionId}`,
      keys: {
        p256dh: 'BPx...',
        auth: 'xxx...'
      },
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Send push notification
   */
  async sendNotification(
    userId: string,
    notification: PushNotification
  ): Promise<void> {
    const userSubscriptions = Array.from(this.subscriptions.values()).filter(
      s => s.userId === userId
    );

    for (const subscription of userSubscriptions) {
      await this.deliverNotification(subscription, notification);
    }
  }

  private async deliverNotification(
    subscription: PushSubscription,
    notification: PushNotification
  ): Promise<void> {
    // Simulate push delivery
    console.log(`Sending push to ${subscription.endpoint}:`, notification.title);

    // Would use web-push library in production
    // webpush.sendNotification(subscription, JSON.stringify(notification))
  }

  /**
   * Unsubscribe
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }
}

// ============================================================================
// Offline Queue Manager
// ============================================================================

export class OfflineQueueManager {
  private queue: QueuedRequest[] = [];
  private processing = false;

  /**
   * Add request to queue
   */
  enqueue(request: Omit<QueuedRequest, 'requestId' | 'queuedAt' | 'retries'>): void {
    this.queue.push({
      requestId: `req_${Date.now()}`,
      queuedAt: Date.now(),
      retries: 0,
      ...request
    });
  }

  /**
   * Process queue when online
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined
        });

        // Success - remove from queue
        this.queue.shift();
      } catch (error) {
        request.retries++;

        if (request.retries >= 3) {
          // Max retries - remove from queue
          this.queue.shift();
        } else {
          // Will retry later
          break;
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; oldestRequest?: number } {
    return {
      pending: this.queue.length,
      oldestRequest: this.queue.length > 0 ? this.queue[0].queuedAt : undefined
    };
  }
}

// ============================================================================
// Network Monitor
// ============================================================================

export class NetworkMonitor {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    online: true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  };

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Subscribe to network changes
   */
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Simulate network change
   */
  updateStatus(status: Partial<NetworkStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  /**
   * Check if should optimize for data saving
   */
  shouldOptimize(): boolean {
    return (
      this.currentStatus.saveData ||
      ['2g', 'slow-2g'].includes(this.currentStatus.effectiveType)
    );
  }
}

// ============================================================================
// Battery Monitor
// ============================================================================

export class BatteryMonitor {
  private status: BatteryStatus = {
    charging: true,
    level: 1.0,
    chargingTime: 0,
    dischargingTime: Infinity
  };

  /**
   * Get battery status
   */
  async getStatus(): Promise<BatteryStatus> {
    return { ...this.status };
  }

  /**
   * Check if should optimize for battery
   */
  shouldOptimize(): boolean {
    return !this.status.charging && this.status.level < 0.2;
  }
}

// ============================================================================
// Responsive Layout Manager
// ============================================================================

export class ResponsiveLayoutManager {
  private breakpoints: ResponsiveBreakpoint[] = [
    { name: 'mobile', minWidth: 0, maxWidth: 767, columns: 1, layout: 'mobile' },
    { name: 'tablet', minWidth: 768, maxWidth: 1023, columns: 2, layout: 'tablet' },
    { name: 'desktop', minWidth: 1024, columns: 3, layout: 'desktop' }
  ];

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(width: number): ResponsiveBreakpoint {
    return (
      this.breakpoints.find(bp => width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) ||
      this.breakpoints[0]
    );
  }

  /**
   * Apply responsive layout
   */
  applyLayout(width: number): { layout: string; columns: number } {
    const breakpoint = this.getCurrentBreakpoint(width);
    return {
      layout: breakpoint.layout,
      columns: breakpoint.columns
    };
  }
}

// ============================================================================
// Touch Gesture Handler
// ============================================================================

export class TouchGestureHandler {
  private startX = 0;
  private startY = 0;
  private threshold = 50; // pixels

  /**
   * Handle touch start
   */
  handleTouchStart(event: TouchEvent): void {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }

  /**
   * Handle touch end and detect gesture
   */
  handleTouchEnd(event: TouchEvent): {
    gesture: 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'tap' | null;
  } {
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;

    const diffX = endX - this.startX;
    const diffY = endY - this.startY;

    if (Math.abs(diffX) < this.threshold && Math.abs(diffY) < this.threshold) {
      return { gesture: 'tap' };
    }

    if (Math.abs(diffX) > Math.abs(diffY)) {
      return { gesture: diffX > 0 ? 'swipe_right' : 'swipe_left' };
    } else {
      return { gesture: diffY > 0 ? 'swipe_down' : 'swipe_up' };
    }
  }
}

// ============================================================================
// Integrated PWA Platform
// ============================================================================

export class ProgressiveWebAppPlatform {
  private manifestGenerator: PWAManifestGenerator;
  private serviceWorker: ServiceWorkerManager;
  private pushManager: PushNotificationManager;
  private offlineQueue: OfflineQueueManager;
  private networkMonitor: NetworkMonitor;
  private batteryMonitor: BatteryMonitor;
  private layoutManager: ResponsiveLayoutManager;
  private gestureHandler: TouchGestureHandler;

  constructor(swConfig: ServiceWorkerConfig) {
    this.manifestGenerator = new PWAManifestGenerator();
    this.serviceWorker = new ServiceWorkerManager(swConfig);
    this.pushManager = new PushNotificationManager();
    this.offlineQueue = new OfflineQueueManager();
    this.networkMonitor = new NetworkMonitor();
    this.batteryMonitor = new BatteryMonitor();
    this.layoutManager = new ResponsiveLayoutManager();
    this.gestureHandler = new TouchGestureHandler();

    this.setupListeners();
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    // Listen for network changes
    this.networkMonitor.subscribe(status => {
      if (status.online) {
        // Process offline queue when coming back online
        this.offlineQueue.processQueue();
      }
    });
  }

  /**
   * Install PWA
   */
  async install(pwaConfig: PWAConfig): Promise<void> {
    // Generate and register manifest
    const manifest = this.manifestGenerator.generateManifest(pwaConfig);
    const validation = this.manifestGenerator.validateManifest(manifest);

    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
    }

    // Install service worker
    await this.serviceWorker.install();
  }

  /**
   * Send notification
   */
  async sendNotification(userId: string, notification: PushNotification): Promise<void> {
    await this.pushManager.sendNotification(userId, notification);
  }

  /**
   * Get platform status
   */
  async getStatus(): Promise<any> {
    const network = this.networkMonitor.getStatus();
    const battery = await this.batteryMonitor.getStatus();
    const queue = this.offlineQueue.getStatus();

    return {
      online: network.online,
      networkType: network.effectiveType,
      batteryLevel: battery.level,
      charging: battery.charging,
      offlineQueuePending: queue.pending,
      shouldOptimize: this.networkMonitor.shouldOptimize() || this.batteryMonitor.shouldOptimize(),
      timestamp: Date.now()
    };
  }

  // Expose managers
  getManifestGenerator(): PWAManifestGenerator {
    return this.manifestGenerator;
  }
  getServiceWorker(): ServiceWorkerManager {
    return this.serviceWorker;
  }
  getPushManager(): PushNotificationManager {
    return this.pushManager;
  }
  getOfflineQueue(): OfflineQueueManager {
    return this.offlineQueue;
  }
  getNetworkMonitor(): NetworkMonitor {
    return this.networkMonitor;
  }
  getBatteryMonitor(): BatteryMonitor {
    return this.batteryMonitor;
  }
  getLayoutManager(): ResponsiveLayoutManager {
    return this.layoutManager;
  }
  getGestureHandler(): TouchGestureHandler {
    return this.gestureHandler;
  }
}

export default ProgressiveWebAppPlatform;
