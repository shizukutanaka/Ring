// Performance Optimization and Scaling Service
// Implements advanced caching, load balancing, and resource optimization

const Redis = require('ioredis');
const cluster = require('cluster');
const os = require('os');
const EventEmitter = require('events');

class PerformanceOptimizationService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.cache = new Map();
    this.metrics = new Map();
    this.loadBalancer = null;
    this.connectionPool = new Map();
    this.adaptiveStrategies = new Map();
    this.performanceThresholds = {
      cpu: 80, // percentage
      memory: 85, // percentage
      latency: 200, // ms
      throughput: 1000 // requests per second
    };
    
    this.initializeRedis();
    this.startMonitoring();
  }

  // Initialize Redis for distributed caching
  async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      await this.redis.connect();
      console.log('Redis connected for distributed caching');
    } catch (error) {
      console.warn('Redis connection failed, using local cache:', error);
      this.redis = null;
    }
  }

  // Advanced caching with multi-tier strategy
  async get(key, options = {}) {
    const { tier = 'L1', ttl = 3600 } = options;
    
    // L1: In-memory cache (fastest)
    if (tier === 'L1' || tier === 'all') {
      const l1Data = this.cache.get(key);
      if (l1Data && !this.isCacheExpired(l1Data)) {
        this.recordMetric('cache_hit_l1', 1);
        return l1Data.value;
      }
    }

    // L2: Redis cache (distributed)
    if ((tier === 'L2' || tier === 'all') && this.redis) {
      try {
        const l2Data = await this.redis.get(key);
        if (l2Data) {
          const parsed = JSON.parse(l2Data);
          
          // Promote to L1 cache
          if (tier !== 'L2') {
            this.cache.set(key, {
              value: parsed,
              timestamp: Date.now(),
              ttl
            });
          }
          
          this.recordMetric('cache_hit_l2', 1);
          return parsed;
        }
      } catch (error) {
        console.warn('Redis get error:', error);
      }
    }

    this.recordMetric('cache_miss', 1);
    return null;
  }

  // Set cache with multi-tier strategy
  async set(key, value, options = {}) {
    const { tier = 'all', ttl = 3600 } = options;
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl
    };

    // L1: In-memory cache
    if (tier === 'L1' || tier === 'all') {
      this.cache.set(key, cacheData);
      
      // Implement LRU eviction if cache is full
      if (this.cache.size > 10000) {
        this.evictLRU();
      }
    }

    // L2: Redis cache
    if ((tier === 'L2' || tier === 'all') && this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }

    this.recordMetric('cache_set', 1);
  }

  // Check if cache entry is expired
  isCacheExpired(cacheData) {
    const age = Date.now() - cacheData.timestamp;
    return age > (cacheData.ttl * 1000);
  }

  // LRU eviction for in-memory cache
  evictLRU() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    this.recordMetric('cache_eviction', toRemove);
  }

  // Connection pooling for database and external services
  async getConnection(serviceType, config = {}) {
    const poolKey = `${serviceType}_${JSON.stringify(config)}`;
    
    if (!this.connectionPool.has(poolKey)) {
      const pool = this.createConnectionPool(serviceType, config);
      this.connectionPool.set(poolKey, pool);
    }
    
    return this.connectionPool.get(poolKey).getConnection();
  }

  // Create connection pool for specific service
  createConnectionPool(serviceType, config) {
    const pools = {
      postgres: () => {
        const { Pool } = require('pg');
        return new Pool({
          host: config.host || process.env.DB_HOST,
          port: config.port || process.env.DB_PORT,
          database: config.database || process.env.DB_NAME,
          user: config.user || process.env.DB_USER,
          password: config.password || process.env.DB_PASSWORD,
          max: config.max || 20,
          idleTimeoutMillis: config.idleTimeout || 30000,
          connectionTimeoutMillis: config.connectionTimeout || 2000
        });
      },
      
      redis: () => {
        return new Redis({
          host: config.host || process.env.REDIS_HOST,
          port: config.port || process.env.REDIS_PORT,
          max: config.max || 10,
          retryDelayOnFailover: 100
        });
      }
    };
    
    return pools[serviceType] ? pools[serviceType]() : null;
  }

  // Load balancing strategies
  selectServer(servers, strategy = 'round_robin') {
    const strategies = {
      round_robin: () => {
        const index = this.getMetric('round_robin_index') || 0;
        this.recordMetric('round_robin_index', (index + 1) % servers.length);
        return servers[index];
      },
      
      least_connections: () => {
        return servers.reduce((least, server) => {
          const serverConnections = this.getMetric(`connections_${server.id}`) || 0;
          const leastConnections = this.getMetric(`connections_${least.id}`) || 0;
          return serverConnections < leastConnections ? server : least;
        });
      },
      
      weighted_round_robin: () => {
        const totalWeight = servers.reduce((sum, server) => sum + (server.weight || 1), 0);
        let random = Math.random() * totalWeight;
        
        for (const server of servers) {
          random -= (server.weight || 1);
          if (random <= 0) {
            return server;
          }
        }
        
        return servers[0];
      },
      
      adaptive: () => {
        return servers.reduce((best, server) => {
          const serverLatency = this.getMetric(`latency_${server.id}`) || 1000;
          const bestLatency = this.getMetric(`latency_${best.id}`) || 1000;
          return serverLatency < bestLatency ? server : best;
        });
      }
    };
    
    return strategies[strategy] ? strategies[strategy]() : servers[0];
  }

  // Performance monitoring
  startMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformance();
      this.adaptOptimizations();
    }, 5000); // Every 5 seconds
  }

  // Collect system metrics
  collectSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    
    this.recordMetric('cpu_usage', cpuUsage.user + cpuUsage.system);
    this.recordMetric('memory_usage', memoryUsage.heapUsed / memoryUsage.heapTotal * 100);
    this.recordMetric('load_average', loadAvg[0]);
    this.recordMetric('active_connections', this.connectionPool.size);
    this.recordMetric('cache_size', this.cache.size);
  }

  // Analyze performance and detect issues
  analyzePerformance() {
    const cpuUsage = this.getMetric('cpu_usage') || 0;
    const memoryUsage = this.getMetric('memory_usage') || 0;
    const avgLatency = this.getMetric('avg_latency') || 0;
    const throughput = this.getMetric('requests_per_second') || 0;
    
    const issues = [];
    
    if (cpuUsage > this.performanceThresholds.cpu) {
      issues.push({
        type: 'high_cpu',
        severity: 'high',
        value: cpuUsage,
        threshold: this.performanceThresholds.cpu
      });
    }
    
    if (memoryUsage > this.performanceThresholds.memory) {
      issues.push({
        type: 'high_memory',
        severity: 'medium',
        value: memoryUsage,
        threshold: this.performanceThresholds.memory
      });
    }
    
    if (avgLatency > this.performanceThresholds.latency) {
      issues.push({
        type: 'high_latency',
        severity: 'medium',
        value: avgLatency,
        threshold: this.performanceThresholds.latency
      });
    }
    
    if (throughput < this.performanceThresholds.throughput) {
      issues.push({
        type: 'low_throughput',
        severity: 'low',
        value: throughput,
        threshold: this.performanceThresholds.throughput
      });
    }
    
    if (issues.length > 0) {
      this.emit('performance_issue', issues);
    }
  }

  // Adaptive optimization strategies
  adaptOptimizations() {
    const cpuUsage = this.getMetric('cpu_usage') || 0;
    const memoryUsage = this.getMetric('memory_usage') || 0;
    
    // High CPU: reduce processing intensity
    if (cpuUsage > 80) {
      this.enableAdaptiveStrategy('cpu_optimization', {
        reduceProcessing: true,
        increaseCaching: true,
        throttleRequests: true
      });
    }
    
    // High memory: aggressive cache cleanup
    if (memoryUsage > 85) {
      this.enableAdaptiveStrategy('memory_optimization', {
        aggressiveCleanup: true,
        reduceCacheSize: true,
        compressData: true
      });
    }
    
    // Normal operation: disable adaptive strategies
    if (cpuUsage < 60 && memoryUsage < 70) {
      this.disableAdaptiveStrategies();
    }
  }

  // Enable adaptive strategy
  enableAdaptiveStrategy(name, config) {
    this.adaptiveStrategies.set(name, config);
    this.emit('adaptive_strategy_enabled', { name, config });
    
    console.log(`Adaptive strategy enabled: ${name}`);
  }

  // Disable all adaptive strategies
  disableAdaptiveStrategies() {
    const disabled = Array.from(this.adaptiveStrategies.keys());
    this.adaptiveStrategies.clear();
    this.emit('adaptive_strategies_disabled', { strategies: disabled });
    
    if (disabled.length > 0) {
      console.log('Adaptive strategies disabled:', disabled.join(', '));
    }
  }

  // Record performance metric
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricArray = this.metrics.get(name);
    metricArray.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 data points
    if (metricArray.length > 1000) {
      metricArray.splice(0, metricArray.length - 1000);
    }
  }

  // Get performance metric
  getMetric(name) {
    const metricArray = this.metrics.get(name);
    if (!metricArray || metricArray.length === 0) {
      return null;
    }
    
    // Return latest value
    return metricArray[metricArray.length - 1].value;
  }

  // Get metric statistics
  getMetricStats(name, period = 300000) { // 5 minutes default
    const metricArray = this.metrics.get(name);
    if (!metricArray || metricArray.length === 0) {
      return null;
    }
    
    const now = Date.now();
    const recentData = metricArray.filter(item => now - item.timestamp < period);
    
    if (recentData.length === 0) {
      return null;
    }
    
    const values = recentData.map(item => item.value);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      latest: values[values.length - 1]
    };
  }

  // WebRTC-specific optimizations
  optimizeWebRTCConnection(connectionConfig) {
    const optimizations = {
      // Adaptive bitrate based on network conditions
      adaptiveBitrate: {
        enabled: true,
        minBitrate: 100, // kbps
        maxBitrate: 2000, // kbps
        stepSize: 100
      },
      
      // ICE server optimization
      iceServers: {
        gatherTimeout: 5000,
        iceCandidatePoolSize: 10,
        continualGathering: true
      },
      
      // Media optimization
      media: {
        video: {
          enabled: true,
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 }
        },
        audio: {
          enabled: true,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      
      // Network optimization
      network: {
        enableDscp: true,
        preferIPv6: false,
        rtcpMuxPolicy: 'require',
        bundlePolicy: 'max-bundle'
      }
    };
    
    return { ...connectionConfig, ...optimizations };
  }

  // Media server scaling
  scaleMediaServers(loadInfo) {
    const { currentLoad, availableServers, targetLatency } = loadInfo;
    
    const recommendations = {
      addServers: 0,
      removeServers: 0,
      redistributeLoad: false,
      enableCompression: false
    };
    
    // Calculate if we need more servers
    if (currentLoad > 80) {
      recommendations.addServers = Math.ceil((currentLoad - 80) / 20);
      recommendations.enableCompression = true;
    }
    
    // Calculate if we can remove servers
    if (currentLoad < 40 && availableServers.length > 2) {
      recommendations.removeServers = Math.floor((40 - currentLoad) / 20);
    }
    
    // Check if load redistribution would help
    const serverLoads = this.getServerLoads(availableServers);
    const loadVariance = this.calculateVariance(serverLoads);
    
    if (loadVariance > 25) { // High variance indicates uneven distribution
      recommendations.redistributeLoad = true;
    }
    
    return recommendations;
  }

  // Get server loads
  getServerLoads(servers) {
    return servers.map(server => ({
      id: server.id,
      load: this.getMetric(`load_${server.id}`) || 0
    }));
  }

  // Calculate variance
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const loads = values.map(v => v.load);
    const mean = loads.reduce((sum, val) => sum + val, 0) / loads.length;
    const variance = loads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / loads.length;
    
    return variance;
  }

  // Auto-scaling based on metrics
  autoScale() {
    const cpuUsage = this.getMetric('cpu_usage') || 0;
    const memoryUsage = this.getMetric('memory_usage') || 0;
    const requestRate = this.getMetric('requests_per_second') || 0;
    
    const scalingDecision = {
      action: 'none',
      reason: '',
      targetInstances: 0
    };
    
    // Scale up conditions
    if (cpuUsage > 85 || memoryUsage > 90 || requestRate > 2000) {
      scalingDecision.action = 'scale_up';
      scalingDecision.reason = cpuUsage > 85 ? 'high_cpu' : 
                             memoryUsage > 90 ? 'high_memory' : 'high_request_rate';
      scalingDecision.targetInstances = Math.ceil(requestRate / 500);
    }
    
    // Scale down conditions
    if (cpuUsage < 30 && memoryUsage < 40 && requestRate < 200) {
      scalingDecision.action = 'scale_down';
      scalingDecision.reason = 'low_load';
      scalingDecision.targetInstances = Math.max(2, Math.ceil(requestRate / 500));
    }
    
    if (scalingDecision.action !== 'none') {
      this.emit('scaling_decision', scalingDecision);
    }
    
    return scalingDecision;
  }

  // Generate performance report
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      system: {
        cpu: this.getMetricStats('cpu_usage'),
        memory: this.getMetricStats('memory_usage'),
        loadAverage: this.getMetricStats('load_average')
      },
      application: {
        cache: {
          size: this.cache.size,
          hitRate: this.calculateCacheHitRate(),
          evictionRate: this.getMetric('cache_eviction') || 0
        },
        connections: {
          active: this.getMetric('active_connections') || 0,
          pooled: this.connectionPool.size
        },
        requests: {
          perSecond: this.getMetric('requests_per_second') || 0,
          avgLatency: this.getMetric('avg_latency') || 0,
          errorRate: this.getMetric('error_rate') || 0
        }
      },
      adaptive: {
        activeStrategies: Array.from(this.adaptiveStrategies.keys()),
        lastScaling: this.getMetric('last_scaling_time')
      },
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  // Calculate cache hit rate
  calculateCacheHitRate() {
    const hits = this.getMetric('cache_hit_l1') + this.getMetric('cache_hit_l2') || 0;
    const misses = this.getMetric('cache_miss') || 0;
    const total = hits + misses;
    
    return total > 0 ? (hits / total) * 100 : 0;
  }

  // Generate optimization recommendations
  generateRecommendations() {
    const recommendations = [];
    const cpuUsage = this.getMetric('cpu_usage') || 0;
    const memoryUsage = this.getMetric('memory_usage') || 0;
    const cacheHitRate = this.calculateCacheHitRate();
    
    if (cpuUsage > 80) {
      recommendations.push({
        type: 'scale_up',
        priority: 'high',
        message: 'High CPU usage detected. Consider scaling up or optimizing CPU-intensive operations.'
      });
    }
    
    if (memoryUsage > 85) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        message: 'High memory usage detected. Consider implementing memory optimization strategies.'
      });
    }
    
    if (cacheHitRate < 70) {
      recommendations.push({
        type: 'cache_optimization',
        priority: 'medium',
        message: `Low cache hit rate (${cacheHitRate.toFixed(1)}%). Consider optimizing cache strategy.`
      });
    }
    
    return recommendations;
  }

  // Cleanup resources
  async cleanup() {
    if (this.redis) {
      await this.redis.disconnect();
    }
    
    this.cache.clear();
    this.metrics.clear();
    this.connectionPool.clear();
    this.adaptiveStrategies.clear();
    
    console.log('Performance optimization service cleaned up');
  }
}

module.exports = new PerformanceOptimizationService();
