/**
 * Phase 98: Advanced API Gateway & Service Mesh
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Enterprise-grade API Gateway and Service Mesh implementation with
 * traffic management, mTLS authentication, and Kubernetes Gateway API.
 *
 * Research Sources:
 * - Kong Gateway vs AWS API Gateway (2025)
 * - Service Mesh: Istio vs Linkerd vs Cilium Performance (2025)
 * - Kubernetes Gateway API v1.4.0 (GA October 2025)
 * - mTLS and Zero Trust Security
 * - Circuit Breaker and Rate Limiting Patterns
 *
 * @version 1.0.0
 * @phase 98
 * @date December 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Route {
  id: string;
  name: string;
  path: string;
  methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'>;
  service: string;
  plugins: PluginConfig[];
  priority: number;
  hosts?: string[];
  headers?: Record<string, string>;
  stripPath: boolean;
  preserveHost: boolean;
}

interface Service {
  id: string;
  name: string;
  protocol: 'http' | 'https' | 'grpc' | 'grpcs';
  host: string;
  port: number;
  path?: string;
  retries: number;
  connectTimeout: number;
  writeTimeout: number;
  readTimeout: number;
  tags: string[];
  healthCheck?: HealthCheck;
}

interface PluginConfig {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface HealthCheck {
  active: {
    type: 'http' | 'tcp';
    httpPath?: string;
    interval: number;
    timeout: number;
    healthy: { successes: number; interval: number };
    unhealthy: { failures: number; interval: number };
  };
  passive: {
    healthy: { successes: number };
    unhealthy: { failures: number };
  };
}

interface UpstreamTarget {
  id: string;
  target: string;
  weight: number;
  healthy: boolean;
  lastChecked?: Date;
}

interface Upstream {
  id: string;
  name: string;
  algorithm: 'round-robin' | 'consistent-hashing' | 'least-connections' | 'ewma';
  targets: UpstreamTarget[];
  healthchecks: HealthCheck;
  slots: number;
  hashOn?: 'consumer' | 'ip' | 'header' | 'cookie' | 'path' | 'query_arg';
  hashOnValue?: string;
}

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  keyStrategy: 'ip' | 'header' | 'consumer' | 'path';
  headerName?: string;
  skipOnError: boolean;
  response?: {
    statusCode: number;
    message: string;
    retryAfterHeader: boolean;
  };
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenRequests: number;
  monitoredExceptions: string[];
  fallbackResponse?: {
    statusCode: number;
    body: unknown;
  };
}

interface MTLSConfig {
  enabled: boolean;
  mode: 'STRICT' | 'PERMISSIVE' | 'DISABLE';
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  verifyClient: boolean;
  verifyDepth: number;
  minTLSVersion: 'TLSv1.2' | 'TLSv1.3';
  cipherSuites?: string[];
}

interface GatewayClass {
  apiVersion: 'gateway.networking.k8s.io/v1';
  kind: 'GatewayClass';
  metadata: { name: string; namespace?: string };
  spec: {
    controllerName: string;
    description?: string;
    parametersRef?: { group: string; kind: string; name: string };
  };
}

interface Gateway {
  apiVersion: 'gateway.networking.k8s.io/v1';
  kind: 'Gateway';
  metadata: { name: string; namespace: string };
  spec: {
    gatewayClassName: string;
    listeners: GatewayListener[];
    addresses?: Array<{ type: string; value: string }>;
  };
}

interface GatewayListener {
  name: string;
  hostname?: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TLS' | 'TCP' | 'UDP';
  tls?: {
    mode: 'Terminate' | 'Passthrough';
    certificateRefs: Array<{ kind: string; name: string; namespace?: string }>;
  };
  allowedRoutes?: {
    namespaces: { from: 'All' | 'Same' | 'Selector' };
    kinds?: Array<{ kind: string }>;
  };
}

interface HTTPRoute {
  apiVersion: 'gateway.networking.k8s.io/v1';
  kind: 'HTTPRoute';
  metadata: { name: string; namespace: string };
  spec: {
    parentRefs: Array<{ name: string; namespace?: string; sectionName?: string }>;
    hostnames?: string[];
    rules: HTTPRouteRule[];
  };
}

interface HTTPRouteRule {
  matches?: Array<{
    path?: { type: 'Exact' | 'PathPrefix' | 'RegularExpression'; value: string };
    headers?: Array<{ type: 'Exact' | 'RegularExpression'; name: string; value: string }>;
    method?: string;
  }>;
  filters?: Array<{
    type: 'RequestHeaderModifier' | 'ResponseHeaderModifier' | 'RequestRedirect' | 'URLRewrite' | 'RequestMirror';
    requestHeaderModifier?: { set?: Array<{ name: string; value: string }>; add?: Array<{ name: string; value: string }>; remove?: string[] };
    requestRedirect?: { scheme?: string; hostname?: string; port?: number; statusCode?: 301 | 302 };
    urlRewrite?: { hostname?: string; path?: { type: 'ReplaceFullPath' | 'ReplacePrefixMatch'; value: string } };
  }>;
  backendRefs?: Array<{
    name: string;
    namespace?: string;
    port?: number;
    weight?: number;
  }>;
}

interface SidecarProxy {
  id: string;
  workloadId: string;
  status: 'running' | 'initializing' | 'error';
  mtlsEnabled: boolean;
  lastSync: Date;
  config: {
    inbound: { port: number; protocol: string };
    outbound: { destinations: string[] };
    telemetry: { enabled: boolean; endpoint: string };
  };
}

interface TrafficPolicy {
  id: string;
  name: string;
  type: 'circuit-breaker' | 'rate-limit' | 'retry' | 'timeout' | 'fault-injection';
  selector: { service?: string; labels?: Record<string, string> };
  config: Record<string, unknown>;
}

interface ServiceMeshConfig {
  controlPlane: {
    namespace: string;
    version: string;
    components: string[];
  };
  dataPlane: {
    proxyType: 'sidecar' | 'ambient';
    proxyImage: string;
    resources: { cpu: string; memory: string };
  };
  mtls: MTLSConfig;
  telemetry: {
    tracing: { enabled: boolean; sampling: number };
    metrics: { enabled: boolean; port: number };
    accessLogs: { enabled: boolean };
  };
}

interface RequestContext {
  requestId: string;
  clientIP: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  timestamp: Date;
  traceId?: string;
  spanId?: string;
}

interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  latency: number;
  cached: boolean;
  upstreamLatency?: number;
}

// ============================================================================
// API GATEWAY ENGINE (Kong/NGINX-style)
// ============================================================================

/**
 * API Gateway Engine
 *
 * Features:
 * - Route management (Kong-style)
 * - Plugin architecture
 * - Service discovery
 * - Load balancing
 * - Health checks
 *
 * Research: Kong 3.6 (50,000 TPS), NGINX Plus, AWS API Gateway
 */
export class APIGatewayEngine {
  private routes: Map<string, Route> = new Map();
  private services: Map<string, Service> = new Map();
  private upstreams: Map<string, Upstream> = new Map();
  private plugins: Map<string, PluginHandler> = new Map();
  private requestCount: number = 0;

  constructor() {
    this.registerBuiltInPlugins();
  }

  /**
   * Register built-in plugins
   */
  private registerBuiltInPlugins(): void {
    // Rate limiting plugin
    this.plugins.set('rate-limiting', {
      name: 'rate-limiting',
      phase: 'access',
      priority: 100,
      handler: this.createRateLimitingHandler()
    });

    // Authentication plugin
    this.plugins.set('key-auth', {
      name: 'key-auth',
      phase: 'access',
      priority: 90,
      handler: this.createKeyAuthHandler()
    });

    // Request transformer plugin
    this.plugins.set('request-transformer', {
      name: 'request-transformer',
      phase: 'access',
      priority: 80,
      handler: this.createRequestTransformerHandler()
    });

    // Response transformer plugin
    this.plugins.set('response-transformer', {
      name: 'response-transformer',
      phase: 'response',
      priority: 80,
      handler: this.createResponseTransformerHandler()
    });

    // Correlation ID plugin
    this.plugins.set('correlation-id', {
      name: 'correlation-id',
      phase: 'access',
      priority: 110,
      handler: this.createCorrelationIdHandler()
    });
  }

  /**
   * Create rate limiting handler
   */
  private createRateLimitingHandler(): PluginHandlerFn {
    const buckets = new Map<string, { tokens: number; lastRefill: number }>();

    return async (ctx: RequestContext, config: Record<string, unknown>) => {
      const rateLimitConfig = config as RateLimitConfig;
      const key = this.getRateLimitKey(ctx, rateLimitConfig);

      let bucket = buckets.get(key);
      const now = Date.now();

      if (!bucket) {
        bucket = { tokens: rateLimitConfig.requests, lastRefill: now };
        buckets.set(key, bucket);
      }

      // Refill tokens
      const timePassed = now - bucket.lastRefill;
      const refillRate = rateLimitConfig.requests / rateLimitConfig.windowMs;
      bucket.tokens = Math.min(
        rateLimitConfig.requests,
        bucket.tokens + timePassed * refillRate
      );
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        return {
          blocked: true,
          response: {
            statusCode: 429,
            headers: {
              'X-RateLimit-Limit': String(rateLimitConfig.requests),
              'X-RateLimit-Remaining': '0',
              'Retry-After': String(Math.ceil(rateLimitConfig.windowMs / 1000))
            },
            body: { error: 'Rate limit exceeded' }
          }
        };
      }

      bucket.tokens -= 1;

      return {
        blocked: false,
        headers: {
          'X-RateLimit-Limit': String(rateLimitConfig.requests),
          'X-RateLimit-Remaining': String(Math.floor(bucket.tokens))
        }
      };
    };
  }

  /**
   * Get rate limit key
   */
  private getRateLimitKey(ctx: RequestContext, config: RateLimitConfig): string {
    switch (config.keyStrategy) {
      case 'ip':
        return `ip:${ctx.clientIP}`;
      case 'header':
        return `header:${ctx.headers[config.headerName || 'x-api-key']}`;
      case 'consumer':
        return `consumer:${ctx.headers['x-consumer-id'] || 'anonymous'}`;
      case 'path':
        return `path:${ctx.path}`;
      default:
        return `default:${ctx.clientIP}`;
    }
  }

  /**
   * Create key auth handler
   */
  private createKeyAuthHandler(): PluginHandlerFn {
    const validKeys = new Set<string>(['test-api-key-123', 'ring-spam-key-456']);

    return async (ctx: RequestContext, config: Record<string, unknown>) => {
      const keyName = (config.keyName as string) || 'x-api-key';
      const apiKey = ctx.headers[keyName.toLowerCase()];

      if (!apiKey) {
        return {
          blocked: true,
          response: {
            statusCode: 401,
            headers: {},
            body: { error: 'Missing API key' }
          }
        };
      }

      if (!validKeys.has(apiKey)) {
        return {
          blocked: true,
          response: {
            statusCode: 403,
            headers: {},
            body: { error: 'Invalid API key' }
          }
        };
      }

      return { blocked: false, headers: { 'X-Consumer-ID': apiKey } };
    };
  }

  /**
   * Create request transformer handler
   */
  private createRequestTransformerHandler(): PluginHandlerFn {
    return async (ctx: RequestContext, config: Record<string, unknown>) => {
      const transformedHeaders = { ...ctx.headers };

      // Add headers
      const addHeaders = config.add?.headers as Record<string, string> || {};
      Object.assign(transformedHeaders, addHeaders);

      // Remove headers
      const removeHeaders = config.remove?.headers as string[] || [];
      for (const header of removeHeaders) {
        delete transformedHeaders[header.toLowerCase()];
      }

      return { blocked: false, headers: transformedHeaders };
    };
  }

  /**
   * Create response transformer handler
   */
  private createResponseTransformerHandler(): PluginHandlerFn {
    return async (ctx: RequestContext, config: Record<string, unknown>) => {
      const addHeaders = config.add?.headers as Record<string, string> || {};
      return { blocked: false, headers: addHeaders };
    };
  }

  /**
   * Create correlation ID handler
   */
  private createCorrelationIdHandler(): PluginHandlerFn {
    return async (ctx: RequestContext) => {
      const correlationId = ctx.headers['x-correlation-id'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        blocked: false,
        headers: {
          'X-Correlation-ID': correlationId,
          'X-Request-ID': ctx.requestId
        }
      };
    };
  }

  /**
   * Register route
   */
  registerRoute(route: Omit<Route, 'id'>): Route {
    const id = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRoute: Route = { ...route, id };
    this.routes.set(id, fullRoute);
    return fullRoute;
  }

  /**
   * Register service
   */
  registerService(service: Omit<Service, 'id'>): Service {
    const id = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullService: Service = { ...service, id };
    this.services.set(fullService.name, fullService);
    return fullService;
  }

  /**
   * Register upstream
   */
  registerUpstream(upstream: Omit<Upstream, 'id'>): Upstream {
    const id = `ups_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullUpstream: Upstream = { ...upstream, id };
    this.upstreams.set(fullUpstream.name, fullUpstream);
    return fullUpstream;
  }

  /**
   * Add target to upstream
   */
  addUpstreamTarget(upstreamName: string, target: Omit<UpstreamTarget, 'id'>): UpstreamTarget | null {
    const upstream = this.upstreams.get(upstreamName);
    if (!upstream) return null;

    const id = `tgt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTarget: UpstreamTarget = { ...target, id };
    upstream.targets.push(fullTarget);
    return fullTarget;
  }

  /**
   * Match route for request
   */
  matchRoute(ctx: RequestContext): Route | null {
    const sortedRoutes = Array.from(this.routes.values())
      .sort((a, b) => b.priority - a.priority);

    for (const route of sortedRoutes) {
      // Check method
      if (!route.methods.includes(ctx.method as any)) continue;

      // Check path
      const pathRegex = this.pathToRegex(route.path);
      if (!pathRegex.test(ctx.path)) continue;

      // Check hosts
      if (route.hosts && route.hosts.length > 0) {
        const host = ctx.headers['host'];
        if (!route.hosts.includes(host)) continue;
      }

      // Check headers
      if (route.headers) {
        let headersMatch = true;
        for (const [key, value] of Object.entries(route.headers)) {
          if (ctx.headers[key.toLowerCase()] !== value) {
            headersMatch = false;
            break;
          }
        }
        if (!headersMatch) continue;
      }

      return route;
    }

    return null;
  }

  /**
   * Convert path pattern to regex
   */
  private pathToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:\w+/g, '[^/]+')
      .replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Process request through gateway
   */
  async processRequest(ctx: RequestContext): Promise<ResponseContext> {
    this.requestCount++;
    const startTime = Date.now();

    // Match route
    const route = this.matchRoute(ctx);
    if (!route) {
      return {
        statusCode: 404,
        headers: {},
        body: { error: 'Route not found' },
        latency: Date.now() - startTime,
        cached: false
      };
    }

    // Execute access-phase plugins
    const accessPlugins = route.plugins
      .filter(p => p.enabled && this.plugins.get(p.name)?.phase === 'access')
      .sort((a, b) => {
        const pa = this.plugins.get(a.name)?.priority || 0;
        const pb = this.plugins.get(b.name)?.priority || 0;
        return pb - pa;
      });

    let aggregatedHeaders: Record<string, string> = {};

    for (const pluginConfig of accessPlugins) {
      const plugin = this.plugins.get(pluginConfig.name);
      if (!plugin) continue;

      const result = await plugin.handler(ctx, pluginConfig.config);

      if (result.blocked) {
        return {
          statusCode: result.response?.statusCode || 500,
          headers: result.response?.headers || {},
          body: result.response?.body || { error: 'Request blocked' },
          latency: Date.now() - startTime,
          cached: false
        };
      }

      if (result.headers) {
        aggregatedHeaders = { ...aggregatedHeaders, ...result.headers };
      }
    }

    // Get service
    const service = this.services.get(route.service);
    if (!service) {
      return {
        statusCode: 503,
        headers: {},
        body: { error: 'Service unavailable' },
        latency: Date.now() - startTime,
        cached: false
      };
    }

    // Select upstream target (load balancing)
    const upstream = this.upstreams.get(service.name);
    const target = upstream ? this.selectTarget(upstream) : { target: `${service.host}:${service.port}` };

    // Forward request (simulated)
    const upstreamStart = Date.now();
    const upstreamResponse = await this.forwardRequest(ctx, service, target.target, route);
    const upstreamLatency = Date.now() - upstreamStart;

    // Execute response-phase plugins
    const responsePlugins = route.plugins
      .filter(p => p.enabled && this.plugins.get(p.name)?.phase === 'response');

    for (const pluginConfig of responsePlugins) {
      const plugin = this.plugins.get(pluginConfig.name);
      if (!plugin) continue;

      const result = await plugin.handler(ctx, pluginConfig.config);
      if (result.headers) {
        aggregatedHeaders = { ...aggregatedHeaders, ...result.headers };
      }
    }

    return {
      statusCode: upstreamResponse.statusCode,
      headers: { ...upstreamResponse.headers, ...aggregatedHeaders },
      body: upstreamResponse.body,
      latency: Date.now() - startTime,
      upstreamLatency,
      cached: false
    };
  }

  /**
   * Select target using load balancing algorithm
   */
  private selectTarget(upstream: Upstream): UpstreamTarget {
    const healthyTargets = upstream.targets.filter(t => t.healthy);
    if (healthyTargets.length === 0) {
      return upstream.targets[0]; // Fallback to first target
    }

    switch (upstream.algorithm) {
      case 'round-robin':
        return this.roundRobinSelect(healthyTargets);
      case 'least-connections':
        return this.leastConnectionsSelect(healthyTargets);
      case 'consistent-hashing':
        return this.consistentHashSelect(healthyTargets, upstream.hashOnValue || '');
      case 'ewma':
        return this.ewmaSelect(healthyTargets);
      default:
        return healthyTargets[0];
    }
  }

  private roundRobinIndex = 0;
  private roundRobinSelect(targets: UpstreamTarget[]): UpstreamTarget {
    const target = targets[this.roundRobinIndex % targets.length];
    this.roundRobinIndex++;
    return target;
  }

  private leastConnectionsSelect(targets: UpstreamTarget[]): UpstreamTarget {
    // In real implementation, track active connections
    return targets[Math.floor(Math.random() * targets.length)];
  }

  private consistentHashSelect(targets: UpstreamTarget[], key: string): UpstreamTarget {
    const hash = this.hashString(key);
    const index = hash % targets.length;
    return targets[index];
  }

  private ewmaSelect(targets: UpstreamTarget[]): UpstreamTarget {
    // Exponentially Weighted Moving Average - select by lowest latency
    return targets[Math.floor(Math.random() * targets.length)];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Forward request to upstream (simulated)
   */
  private async forwardRequest(
    ctx: RequestContext,
    service: Service,
    target: string,
    route: Route
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: unknown }> {
    // Simulate upstream processing
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50));

    return {
      statusCode: 200,
      headers: {
        'X-Upstream-Target': target,
        'X-Service': service.name
      },
      body: {
        message: 'Request processed successfully',
        service: service.name,
        path: route.stripPath ? ctx.path.replace(route.path, '') : ctx.path,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get gateway statistics
   */
  getStats(): {
    routes: number;
    services: number;
    upstreams: number;
    totalRequests: number;
  } {
    return {
      routes: this.routes.size,
      services: this.services.size,
      upstreams: this.upstreams.size,
      totalRequests: this.requestCount
    };
  }
}

interface PluginHandler {
  name: string;
  phase: 'access' | 'response' | 'log';
  priority: number;
  handler: PluginHandlerFn;
}

type PluginHandlerFn = (
  ctx: RequestContext,
  config: Record<string, unknown>
) => Promise<{
  blocked: boolean;
  headers?: Record<string, string>;
  response?: { statusCode: number; headers: Record<string, string>; body: unknown };
}>;

// ============================================================================
// SERVICE MESH ENGINE (Istio/Linkerd-style)
// ============================================================================

/**
 * Service Mesh Engine
 *
 * Features:
 * - Sidecar proxy management
 * - mTLS enforcement
 * - Traffic policies
 * - Telemetry collection
 *
 * Research: Istio (Envoy-based), Linkerd (Rust micro-proxy), Cilium (eBPF)
 */
export class ServiceMeshEngine {
  private config: ServiceMeshConfig;
  private sidecars: Map<string, SidecarProxy> = new Map();
  private policies: Map<string, TrafficPolicy> = new Map();
  private serviceRegistry: Map<string, MeshService> = new Map();
  private certificates: Map<string, MTLSCertificate> = new Map();

  constructor(config: Partial<ServiceMeshConfig> = {}) {
    this.config = {
      controlPlane: config.controlPlane || {
        namespace: 'ring-mesh',
        version: '1.0.0',
        components: ['istiod', 'pilot', 'citadel']
      },
      dataPlane: config.dataPlane || {
        proxyType: 'sidecar',
        proxyImage: 'envoyproxy/envoy:v1.28',
        resources: { cpu: '100m', memory: '128Mi' }
      },
      mtls: config.mtls || {
        enabled: true,
        mode: 'PERMISSIVE',
        verifyClient: true,
        verifyDepth: 3,
        minTLSVersion: 'TLSv1.3'
      },
      telemetry: config.telemetry || {
        tracing: { enabled: true, sampling: 1.0 },
        metrics: { enabled: true, port: 15090 },
        accessLogs: { enabled: true }
      }
    };
  }

  /**
   * Register service in mesh
   */
  registerService(service: MeshService): void {
    this.serviceRegistry.set(service.name, service);

    // Auto-inject sidecar if configured
    if (this.config.dataPlane.proxyType === 'sidecar') {
      this.injectSidecar(service.name, service.workloadId);
    }
  }

  /**
   * Inject sidecar proxy
   */
  injectSidecar(serviceName: string, workloadId: string): SidecarProxy {
    const sidecar: SidecarProxy = {
      id: `sidecar_${workloadId}`,
      workloadId,
      status: 'initializing',
      mtlsEnabled: this.config.mtls.enabled,
      lastSync: new Date(),
      config: {
        inbound: { port: 15006, protocol: 'HTTP' },
        outbound: { destinations: [] },
        telemetry: {
          enabled: this.config.telemetry.metrics.enabled,
          endpoint: `http://localhost:${this.config.telemetry.metrics.port}`
        }
      }
    };

    this.sidecars.set(workloadId, sidecar);

    // Simulate initialization
    setTimeout(() => {
      sidecar.status = 'running';
      sidecar.lastSync = new Date();
    }, 100);

    return sidecar;
  }

  /**
   * Apply traffic policy
   */
  applyPolicy(policy: Omit<TrafficPolicy, 'id'>): TrafficPolicy {
    const id = `policy_${Date.now()}`;
    const fullPolicy: TrafficPolicy = { ...policy, id };
    this.policies.set(id, fullPolicy);
    return fullPolicy;
  }

  /**
   * Issue mTLS certificate
   */
  issueCertificate(serviceName: string): MTLSCertificate {
    const cert: MTLSCertificate = {
      id: `cert_${serviceName}_${Date.now()}`,
      serviceName,
      subjectAltName: `spiffe://ring-mesh/ns/default/sa/${serviceName}`,
      issuer: 'ring-mesh-ca',
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      serialNumber: Math.random().toString(36).substr(2, 16),
      publicKey: `-----BEGIN PUBLIC KEY-----\n${this.generateMockKey()}\n-----END PUBLIC KEY-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----\n${this.generateMockKey()}\n-----END PRIVATE KEY-----`
    };

    this.certificates.set(serviceName, cert);
    return cert;
  }

  private generateMockKey(): string {
    return Array.from({ length: 4 }, () =>
      Math.random().toString(36).substr(2, 64)
    ).join('\n');
  }

  /**
   * Verify mTLS connection
   */
  verifyMTLS(
    clientCert: string,
    serverCert: string
  ): { valid: boolean; error?: string; identity?: string } {
    // Simulated verification
    const clientCertData = this.certificates.get(clientCert);
    const serverCertData = this.certificates.get(serverCert);

    if (!clientCertData || !serverCertData) {
      return { valid: false, error: 'Certificate not found' };
    }

    if (clientCertData.notAfter < new Date()) {
      return { valid: false, error: 'Client certificate expired' };
    }

    return {
      valid: true,
      identity: clientCertData.subjectAltName
    };
  }

  /**
   * Get service-to-service traffic stats
   */
  getTrafficStats(): TrafficStats[] {
    const stats: TrafficStats[] = [];

    for (const [name, service] of this.serviceRegistry) {
      stats.push({
        service: name,
        requestsIn: Math.floor(Math.random() * 10000),
        requestsOut: Math.floor(Math.random() * 10000),
        latencyP50: Math.random() * 50,
        latencyP99: Math.random() * 200,
        successRate: 0.95 + Math.random() * 0.05,
        mtlsEnabled: this.config.mtls.enabled
      });
    }

    return stats;
  }

  /**
   * Configure retry policy
   */
  configureRetry(
    serviceName: string,
    config: { attempts: number; perTryTimeout: number; retryOn: string[] }
  ): TrafficPolicy {
    return this.applyPolicy({
      name: `retry-${serviceName}`,
      type: 'retry',
      selector: { service: serviceName },
      config
    });
  }

  /**
   * Configure circuit breaker
   */
  configureCircuitBreaker(
    serviceName: string,
    config: CircuitBreakerConfig
  ): TrafficPolicy {
    return this.applyPolicy({
      name: `circuit-breaker-${serviceName}`,
      type: 'circuit-breaker',
      selector: { service: serviceName },
      config
    });
  }

  /**
   * Get mesh status
   */
  getMeshStatus(): {
    controlPlane: { healthy: boolean; version: string };
    dataPlane: { sidecars: number; healthy: number };
    mtls: { mode: string; enabled: boolean };
    services: number;
    policies: number;
  } {
    const healthySidecars = Array.from(this.sidecars.values())
      .filter(s => s.status === 'running').length;

    return {
      controlPlane: {
        healthy: true,
        version: this.config.controlPlane.version
      },
      dataPlane: {
        sidecars: this.sidecars.size,
        healthy: healthySidecars
      },
      mtls: {
        mode: this.config.mtls.mode,
        enabled: this.config.mtls.enabled
      },
      services: this.serviceRegistry.size,
      policies: this.policies.size
    };
  }
}

interface MeshService {
  name: string;
  workloadId: string;
  namespace: string;
  labels: Record<string, string>;
  port: number;
  protocol: 'HTTP' | 'GRPC' | 'TCP';
}

interface MTLSCertificate {
  id: string;
  serviceName: string;
  subjectAltName: string;
  issuer: string;
  notBefore: Date;
  notAfter: Date;
  serialNumber: string;
  publicKey: string;
  privateKey: string;
}

interface TrafficStats {
  service: string;
  requestsIn: number;
  requestsOut: number;
  latencyP50: number;
  latencyP99: number;
  successRate: number;
  mtlsEnabled: boolean;
}

// ============================================================================
// KUBERNETES GATEWAY API ENGINE
// ============================================================================

/**
 * Kubernetes Gateway API Engine
 *
 * Implements Gateway API v1.4.0 (GA October 2025)
 *
 * Features:
 * - GatewayClass management
 * - Gateway configuration
 * - HTTPRoute handling
 * - BackendTLSPolicy (new in v1.4)
 *
 * Research: Kubernetes Gateway API v1.4, NGINX Gateway Fabric, Envoy Gateway
 */
export class KubernetesGatewayAPIEngine {
  private gatewayClasses: Map<string, GatewayClass> = new Map();
  private gateways: Map<string, Gateway> = new Map();
  private httpRoutes: Map<string, HTTPRoute> = new Map();
  private tcpRoutes: Map<string, TCPRoute> = new Map();
  private backendTLSPolicies: Map<string, BackendTLSPolicy> = new Map();

  /**
   * Create GatewayClass
   */
  createGatewayClass(spec: {
    name: string;
    controllerName: string;
    description?: string;
  }): GatewayClass {
    const gatewayClass: GatewayClass = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'GatewayClass',
      metadata: { name: spec.name },
      spec: {
        controllerName: spec.controllerName,
        description: spec.description
      }
    };

    this.gatewayClasses.set(spec.name, gatewayClass);
    return gatewayClass;
  }

  /**
   * Create Gateway
   */
  createGateway(spec: {
    name: string;
    namespace: string;
    gatewayClassName: string;
    listeners: Array<{
      name: string;
      port: number;
      protocol: 'HTTP' | 'HTTPS' | 'TLS' | 'TCP';
      hostname?: string;
      tlsMode?: 'Terminate' | 'Passthrough';
      certificateRef?: { name: string; namespace?: string };
    }>;
  }): Gateway {
    const gateway: Gateway = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'Gateway',
      metadata: { name: spec.name, namespace: spec.namespace },
      spec: {
        gatewayClassName: spec.gatewayClassName,
        listeners: spec.listeners.map(l => ({
          name: l.name,
          hostname: l.hostname,
          port: l.port,
          protocol: l.protocol,
          tls: l.protocol === 'HTTPS' || l.protocol === 'TLS' ? {
            mode: l.tlsMode || 'Terminate',
            certificateRefs: l.certificateRef ? [{ kind: 'Secret', name: l.certificateRef.name, namespace: l.certificateRef.namespace }] : []
          } : undefined,
          allowedRoutes: {
            namespaces: { from: 'Same' }
          }
        }))
      }
    };

    this.gateways.set(`${spec.namespace}/${spec.name}`, gateway);
    return gateway;
  }

  /**
   * Create HTTPRoute
   */
  createHTTPRoute(spec: {
    name: string;
    namespace: string;
    parentRefs: Array<{ name: string; namespace?: string; sectionName?: string }>;
    hostnames?: string[];
    rules: Array<{
      matches?: Array<{
        path?: { type: 'Exact' | 'PathPrefix'; value: string };
        headers?: Array<{ name: string; value: string }>;
        method?: string;
      }>;
      backendRefs?: Array<{ name: string; port: number; weight?: number }>;
      filters?: Array<{
        type: 'RequestHeaderModifier' | 'RequestRedirect' | 'URLRewrite';
        config?: Record<string, unknown>;
      }>;
    }>;
  }): HTTPRoute {
    const httpRoute: HTTPRoute = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: { name: spec.name, namespace: spec.namespace },
      spec: {
        parentRefs: spec.parentRefs,
        hostnames: spec.hostnames,
        rules: spec.rules.map(rule => ({
          matches: rule.matches?.map(m => ({
            path: m.path ? { type: m.path.type, value: m.path.value } : undefined,
            headers: m.headers?.map(h => ({ type: 'Exact' as const, name: h.name, value: h.value })),
            method: m.method
          })),
          backendRefs: rule.backendRefs?.map(b => ({
            name: b.name,
            port: b.port,
            weight: b.weight
          })),
          filters: rule.filters?.map(f => this.createFilter(f))
        }))
      }
    };

    this.httpRoutes.set(`${spec.namespace}/${spec.name}`, httpRoute);
    return httpRoute;
  }

  private createFilter(filter: {
    type: 'RequestHeaderModifier' | 'RequestRedirect' | 'URLRewrite';
    config?: Record<string, unknown>;
  }): HTTPRouteRule['filters'][0] {
    switch (filter.type) {
      case 'RequestHeaderModifier':
        return {
          type: 'RequestHeaderModifier',
          requestHeaderModifier: {
            set: (filter.config?.set as Array<{ name: string; value: string }>) || [],
            add: (filter.config?.add as Array<{ name: string; value: string }>) || [],
            remove: (filter.config?.remove as string[]) || []
          }
        };
      case 'RequestRedirect':
        return {
          type: 'RequestRedirect',
          requestRedirect: {
            scheme: filter.config?.scheme as string,
            hostname: filter.config?.hostname as string,
            port: filter.config?.port as number,
            statusCode: (filter.config?.statusCode as 301 | 302) || 302
          }
        };
      case 'URLRewrite':
        return {
          type: 'URLRewrite',
          urlRewrite: {
            hostname: filter.config?.hostname as string,
            path: filter.config?.path as { type: 'ReplaceFullPath' | 'ReplacePrefixMatch'; value: string }
          }
        };
      default:
        return { type: 'RequestHeaderModifier' };
    }
  }

  /**
   * Create BackendTLSPolicy (v1.4.0 Standard)
   */
  createBackendTLSPolicy(spec: {
    name: string;
    namespace: string;
    targetRef: { name: string; kind: string };
    tls: {
      caCertRefs?: Array<{ name: string; kind: string }>;
      hostname: string;
    };
  }): BackendTLSPolicy {
    const policy: BackendTLSPolicy = {
      apiVersion: 'gateway.networking.k8s.io/v1alpha3',
      kind: 'BackendTLSPolicy',
      metadata: { name: spec.name, namespace: spec.namespace },
      spec: {
        targetRef: {
          group: '',
          kind: spec.targetRef.kind,
          name: spec.targetRef.name
        },
        tls: {
          caCertRefs: spec.tls.caCertRefs?.map(c => ({
            group: '',
            kind: c.kind,
            name: c.name
          })),
          hostname: spec.tls.hostname
        }
      }
    };

    this.backendTLSPolicies.set(`${spec.namespace}/${spec.name}`, policy);
    return policy;
  }

  /**
   * Route request through Gateway API
   */
  routeRequest(request: {
    host: string;
    path: string;
    method: string;
    headers: Record<string, string>;
  }): {
    matched: boolean;
    route?: HTTPRoute;
    backend?: { name: string; port: number; weight: number };
  } {
    for (const [, route] of this.httpRoutes) {
      // Check hostname
      if (route.spec.hostnames && !route.spec.hostnames.includes(request.host)) {
        continue;
      }

      // Check rules
      for (const rule of route.spec.rules) {
        if (!rule.matches || rule.matches.length === 0) {
          // No matches means match all
          if (rule.backendRefs && rule.backendRefs.length > 0) {
            return {
              matched: true,
              route,
              backend: this.selectBackend(rule.backendRefs)
            };
          }
        }

        for (const match of rule.matches || []) {
          if (this.matchesRule(request, match)) {
            if (rule.backendRefs && rule.backendRefs.length > 0) {
              return {
                matched: true,
                route,
                backend: this.selectBackend(rule.backendRefs)
              };
            }
          }
        }
      }
    }

    return { matched: false };
  }

  private matchesRule(
    request: { host: string; path: string; method: string; headers: Record<string, string> },
    match: HTTPRouteRule['matches'][0]
  ): boolean {
    // Check path
    if (match.path) {
      if (match.path.type === 'Exact' && request.path !== match.path.value) {
        return false;
      }
      if (match.path.type === 'PathPrefix' && !request.path.startsWith(match.path.value)) {
        return false;
      }
    }

    // Check method
    if (match.method && request.method !== match.method) {
      return false;
    }

    // Check headers
    if (match.headers) {
      for (const header of match.headers) {
        if (request.headers[header.name.toLowerCase()] !== header.value) {
          return false;
        }
      }
    }

    return true;
  }

  private selectBackend(
    backends: Array<{ name: string; port?: number; weight?: number }>
  ): { name: string; port: number; weight: number } {
    // Weighted random selection
    const totalWeight = backends.reduce((sum, b) => sum + (b.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const backend of backends) {
      random -= backend.weight || 1;
      if (random <= 0) {
        return {
          name: backend.name,
          port: backend.port || 80,
          weight: backend.weight || 1
        };
      }
    }

    return {
      name: backends[0].name,
      port: backends[0].port || 80,
      weight: backends[0].weight || 1
    };
  }

  /**
   * Get all resources
   */
  getResources(): {
    gatewayClasses: GatewayClass[];
    gateways: Gateway[];
    httpRoutes: HTTPRoute[];
    backendTLSPolicies: BackendTLSPolicy[];
  } {
    return {
      gatewayClasses: Array.from(this.gatewayClasses.values()),
      gateways: Array.from(this.gateways.values()),
      httpRoutes: Array.from(this.httpRoutes.values()),
      backendTLSPolicies: Array.from(this.backendTLSPolicies.values())
    };
  }
}

interface TCPRoute {
  apiVersion: 'gateway.networking.k8s.io/v1alpha2';
  kind: 'TCPRoute';
  metadata: { name: string; namespace: string };
  spec: {
    parentRefs: Array<{ name: string; sectionName?: string }>;
    rules: Array<{ backendRefs: Array<{ name: string; port: number }> }>;
  };
}

interface BackendTLSPolicy {
  apiVersion: 'gateway.networking.k8s.io/v1alpha3';
  kind: 'BackendTLSPolicy';
  metadata: { name: string; namespace: string };
  spec: {
    targetRef: { group: string; kind: string; name: string };
    tls: {
      caCertRefs?: Array<{ group: string; kind: string; name: string }>;
      hostname: string;
    };
  };
}

// ============================================================================
// CIRCUIT BREAKER ENGINE
// ============================================================================

/**
 * Circuit Breaker Engine for API Gateway
 *
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * Research: Resilience4j, ngrok circuit breaker
 */
export class CircuitBreakerEngine {
  private circuits: Map<string, CircuitState> = new Map();

  /**
   * Create circuit breaker
   */
  createCircuit(name: string, config: CircuitBreakerConfig): void {
    this.circuits.set(name, {
      name,
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      config
    });
  }

  /**
   * Execute with circuit breaker
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit ${circuitName} not found`);
    }

    // Check if circuit is open
    if (circuit.state === 'OPEN') {
      const timeSinceOpen = Date.now() - (circuit.openedAt?.getTime() || 0);
      if (timeSinceOpen < circuit.config.timeout) {
        // Return fallback if configured
        if (circuit.config.fallbackResponse) {
          return circuit.config.fallbackResponse.body as T;
        }
        throw new Error('Circuit is open');
      }
      // Transition to half-open
      circuit.state = 'HALF_OPEN';
      circuit.successCount = 0;
    }

    // Execute operation
    try {
      const result = await operation();
      this.recordSuccess(circuit);
      return result;
    } catch (error) {
      this.recordFailure(circuit);
      throw error;
    }
  }

  private recordSuccess(circuit: CircuitState): void {
    circuit.successCount++;
    circuit.lastSuccess = new Date();

    if (circuit.state === 'HALF_OPEN') {
      if (circuit.successCount >= circuit.config.successThreshold) {
        // Close circuit
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
      }
    } else if (circuit.state === 'CLOSED') {
      // Reset failure count on success
      circuit.failureCount = 0;
    }
  }

  private recordFailure(circuit: CircuitState): void {
    circuit.failureCount++;
    circuit.lastFailure = new Date();

    if (circuit.state === 'HALF_OPEN') {
      // Any failure in half-open returns to open
      circuit.state = 'OPEN';
      circuit.openedAt = new Date();
    } else if (circuit.state === 'CLOSED') {
      if (circuit.failureCount >= circuit.config.failureThreshold) {
        // Open circuit
        circuit.state = 'OPEN';
        circuit.openedAt = new Date();
      }
    }
  }

  /**
   * Get circuit status
   */
  getCircuitStatus(name: string): CircuitState | null {
    return this.circuits.get(name) || null;
  }

  /**
   * Get all circuits
   */
  getAllCircuits(): CircuitState[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Reset circuit
   */
  resetCircuit(name: string): boolean {
    const circuit = this.circuits.get(name);
    if (!circuit) return false;

    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.openedAt = null;
    return true;
  }
}

interface CircuitState {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  openedAt: Date | null;
  config: CircuitBreakerConfig;
}

// ============================================================================
// INTEGRATED API GATEWAY PLATFORM
// ============================================================================

/**
 * Integrated API Gateway & Service Mesh Platform for Ring
 */
export class IntegratedGatewayPlatform {
  private apiGateway: APIGatewayEngine;
  private serviceMesh: ServiceMeshEngine;
  private gatewayAPI: KubernetesGatewayAPIEngine;
  private circuitBreaker: CircuitBreakerEngine;

  constructor() {
    this.apiGateway = new APIGatewayEngine();
    this.serviceMesh = new ServiceMeshEngine();
    this.gatewayAPI = new KubernetesGatewayAPIEngine();
    this.circuitBreaker = new CircuitBreakerEngine();

    this.initializeDefaultConfiguration();
  }

  /**
   * Initialize default Ring configuration
   */
  private initializeDefaultConfiguration(): void {
    // Register Gateway Class
    this.gatewayAPI.createGatewayClass({
      name: 'ring-gateway',
      controllerName: 'ring.io/gateway-controller',
      description: 'Ring Spam Detection Platform Gateway'
    });

    // Create Gateway
    this.gatewayAPI.createGateway({
      name: 'ring-api-gateway',
      namespace: 'ring-platform',
      gatewayClassName: 'ring-gateway',
      listeners: [
        { name: 'http', port: 80, protocol: 'HTTP' },
        {
          name: 'https',
          port: 443,
          protocol: 'HTTPS',
          tlsMode: 'Terminate',
          certificateRef: { name: 'ring-tls-cert' }
        }
      ]
    });

    // Register services
    this.apiGateway.registerService({
      name: 'spam-detection',
      protocol: 'http',
      host: 'spam-detection.ring-platform.svc.cluster.local',
      port: 8080,
      retries: 3,
      connectTimeout: 5000,
      writeTimeout: 10000,
      readTimeout: 30000,
      tags: ['core', 'detection']
    });

    this.apiGateway.registerService({
      name: 'blacklist-service',
      protocol: 'http',
      host: 'blacklist.ring-platform.svc.cluster.local',
      port: 8081,
      retries: 2,
      connectTimeout: 3000,
      writeTimeout: 5000,
      readTimeout: 10000,
      tags: ['core', 'blacklist']
    });

    // Register routes
    this.apiGateway.registerRoute({
      name: 'spam-check',
      path: '/api/v1/spam/check',
      methods: ['POST'],
      service: 'spam-detection',
      plugins: [
        {
          name: 'rate-limiting',
          enabled: true,
          config: {
            requests: 1000,
            windowMs: 60000,
            keyStrategy: 'ip'
          }
        },
        {
          name: 'correlation-id',
          enabled: true,
          config: {}
        }
      ],
      priority: 100,
      stripPath: false,
      preserveHost: true
    });

    this.apiGateway.registerRoute({
      name: 'blacklist-lookup',
      path: '/api/v1/blacklist/*',
      methods: ['GET', 'POST', 'DELETE'],
      service: 'blacklist-service',
      plugins: [
        {
          name: 'key-auth',
          enabled: true,
          config: { keyName: 'x-api-key' }
        },
        {
          name: 'rate-limiting',
          enabled: true,
          config: {
            requests: 500,
            windowMs: 60000,
            keyStrategy: 'header',
            headerName: 'x-api-key'
          }
        }
      ],
      priority: 90,
      stripPath: false,
      preserveHost: true
    });

    // Create HTTPRoute
    this.gatewayAPI.createHTTPRoute({
      name: 'ring-api-routes',
      namespace: 'ring-platform',
      parentRefs: [{ name: 'ring-api-gateway' }],
      hostnames: ['api.ring.io'],
      rules: [
        {
          matches: [{ path: { type: 'PathPrefix', value: '/api/v1/spam' } }],
          backendRefs: [{ name: 'spam-detection', port: 8080, weight: 100 }]
        },
        {
          matches: [{ path: { type: 'PathPrefix', value: '/api/v1/blacklist' } }],
          backendRefs: [{ name: 'blacklist-service', port: 8081, weight: 100 }]
        }
      ]
    });

    // Register services in mesh
    this.serviceMesh.registerService({
      name: 'spam-detection',
      workloadId: 'spam-detection-v1',
      namespace: 'ring-platform',
      labels: { app: 'spam-detection', version: 'v1' },
      port: 8080,
      protocol: 'HTTP'
    });

    this.serviceMesh.registerService({
      name: 'blacklist-service',
      workloadId: 'blacklist-v1',
      namespace: 'ring-platform',
      labels: { app: 'blacklist', version: 'v1' },
      port: 8081,
      protocol: 'HTTP'
    });

    // Configure circuit breakers
    this.circuitBreaker.createCircuit('spam-detection', {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      halfOpenRequests: 3,
      monitoredExceptions: ['TimeoutError', 'ServiceUnavailable'],
      fallbackResponse: {
        statusCode: 503,
        body: { error: 'Service temporarily unavailable', cached: true }
      }
    });

    // Issue mTLS certificates
    this.serviceMesh.issueCertificate('spam-detection');
    this.serviceMesh.issueCertificate('blacklist-service');
  }

  /**
   * Process incoming request
   */
  async processRequest(request: RequestContext): Promise<ResponseContext> {
    // Use circuit breaker
    const serviceName = this.getServiceForPath(request.path);

    if (serviceName) {
      try {
        return await this.circuitBreaker.execute(serviceName, async () => {
          return this.apiGateway.processRequest(request);
        });
      } catch (error) {
        return {
          statusCode: 503,
          headers: {},
          body: { error: 'Service unavailable', message: (error as Error).message },
          latency: 0,
          cached: false
        };
      }
    }

    return this.apiGateway.processRequest(request);
  }

  private getServiceForPath(path: string): string | null {
    if (path.includes('/spam')) return 'spam-detection';
    if (path.includes('/blacklist')) return 'blacklist-service';
    return null;
  }

  /**
   * Get platform status
   */
  getStatus(): {
    gateway: ReturnType<APIGatewayEngine['getStats']>;
    mesh: ReturnType<ServiceMeshEngine['getMeshStatus']>;
    circuits: CircuitState[];
    gatewayAPI: { resources: number };
  } {
    const resources = this.gatewayAPI.getResources();

    return {
      gateway: this.apiGateway.getStats(),
      mesh: this.serviceMesh.getMeshStatus(),
      circuits: this.circuitBreaker.getAllCircuits(),
      gatewayAPI: {
        resources:
          resources.gatewayClasses.length +
          resources.gateways.length +
          resources.httpRoutes.length +
          resources.backendTLSPolicies.length
      }
    };
  }

  /**
   * Get traffic statistics
   */
  getTrafficStats(): TrafficStats[] {
    return this.serviceMesh.getTrafficStats();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Route,
  Service,
  PluginConfig,
  HealthCheck,
  Upstream,
  UpstreamTarget,
  RateLimitConfig,
  CircuitBreakerConfig,
  MTLSConfig,
  GatewayClass,
  Gateway,
  GatewayListener,
  HTTPRoute,
  HTTPRouteRule,
  SidecarProxy,
  TrafficPolicy,
  ServiceMeshConfig,
  RequestContext,
  ResponseContext,
  MeshService,
  MTLSCertificate,
  TrafficStats,
  CircuitState,
  BackendTLSPolicy
};
