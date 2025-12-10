// Edge Computing Optimization Service
// Provides intelligent edge node selection, content delivery, and distributed processing

interface EdgeNode {
  id: string;
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  capabilities: {
    compute: number; // CPU cores
    memory: number; // GB
    storage: number; // GB
    bandwidth: number; // Mbps
  };
  metrics: {
    latency: number; // ms
    availability: number; // 0-1
    load: number; // 0-1
    cost: number; // per GB
  };
  services: string[];
  status: 'active' | 'degraded' | 'offline';
}

interface EdgeRequest {
  type: 'compute' | 'storage' | 'streaming' | 'cache' | 'ai';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requirements: {
    minLatency?: number;
    maxCost?: number;
    minBandwidth?: number;
    requiredServices?: string[];
    geoRestrictions?: string[];
  };
}

interface EdgeResponse {
  nodeId: string;
  result: any;
  metrics: {
    processingTime: number;
    networkLatency: number;
    totalLatency: number;
    cost: number;
  };
  timestamp: number;
}

interface ContentDeliveryPlan {
  strategy: 'cdn' | 'p2p' | 'hybrid' | 'adaptive';
  edgeNodes: string[];
  cacheStrategy: 'aggressive' | 'conservative' | 'intelligent';
  compressionLevel: number; // 0-9
  replication: number; // number of replicas
}

interface DistributedTask {
  id: string;
  type: string;
  data: any;
  partitions: TaskPartition[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: any[];
}

interface TaskPartition {
  id: string;
  nodeId: string;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  metrics?: {
    startTime: number;
    endTime?: number;
    processingTime?: number;
  };
}

class EdgeComputingOptimizer extends EventTarget {
  private edgeNodes: Map<string, EdgeNode> = new Map();
  private activeRequests: Map<string, Promise<EdgeResponse>> = new Map();
  private cache: Map<string, any> = new Map();
  private locationCache: Map<string, EdgeNode[]> = new Map();
  private metricsCollector: Map<string, number[]> = new Map();
  
  private readonly maxCacheSize = 1000;
  private readonly cacheTTL = 300000; // 5 minutes
  private readonly maxRetries = 3;
  private readonly requestTimeout = 10000; // 10 seconds

  constructor() {
    super();
    this.initializeEdgeNodes();
    this.startMetricsCollection();
    this.startCacheCleanup();
  }

  // Initialize edge nodes with real-world locations
  private initializeEdgeNodes(): void {
    const defaultNodes: EdgeNode[] = [
      {
        id: 'edge-tokyo-1',
        location: {
          city: 'Tokyo',
          country: 'Japan',
          latitude: 35.6762,
          longitude: 139.6503
        },
        capabilities: {
          compute: 32,
          memory: 128,
          storage: 2000,
          bandwidth: 10000
        },
        metrics: {
          latency: 15,
          availability: 0.999,
          load: 0.3,
          cost: 0.08
        },
        services: ['compute', 'storage', 'streaming', 'ai', 'cache'],
        status: 'active'
      },
      {
        id: 'edge-singapore-1',
        location: {
          city: 'Singapore',
          country: 'Singapore',
          latitude: 1.3521,
          longitude: 103.8198
        },
        capabilities: {
          compute: 24,
          memory: 96,
          storage: 1500,
          bandwidth: 8000
        },
        metrics: {
          latency: 25,
          availability: 0.998,
          load: 0.4,
          cost: 0.07
        },
        services: ['compute', 'storage', 'streaming', 'cache'],
        status: 'active'
      },
      {
        id: 'edge-london-1',
        location: {
          city: 'London',
          country: 'UK',
          latitude: 51.5074,
          longitude: -0.1278
        },
        capabilities: {
          compute: 28,
          memory: 112,
          storage: 1800,
          bandwidth: 9000
        },
        metrics: {
          latency: 20,
          availability: 0.997,
          load: 0.35,
          cost: 0.09
        },
        services: ['compute', 'storage', 'streaming', 'ai', 'cache'],
        status: 'active'
      },
      {
        id: 'edge-newyork-1',
        location: {
          city: 'New York',
          country: 'USA',
          latitude: 40.7128,
          longitude: -74.0060
        },
        capabilities: {
          compute: 36,
          memory: 144,
          storage: 2500,
          bandwidth: 12000
        },
        metrics: {
          latency: 18,
          availability: 0.999,
          load: 0.25,
          cost: 0.10
        },
        services: ['compute', 'storage', 'streaming', 'ai', 'cache'],
        status: 'active'
      },
      {
        id: 'edge-saopaulo-1',
        location: {
          city: 'São Paulo',
          country: 'Brazil',
          latitude: -23.5505,
          longitude: -46.6333
        },
        capabilities: {
          compute: 20,
          memory: 80,
          storage: 1200,
          bandwidth: 6000
        },
        metrics: {
          latency: 35,
          availability: 0.996,
          load: 0.45,
          cost: 0.06
        },
        services: ['compute', 'storage', 'cache'],
        status: 'active'
      },
      {
        id: 'edge-dubai-1',
        location: {
          city: 'Dubai',
          country: 'UAE',
          latitude: 25.2048,
          longitude: 55.2708
        },
        capabilities: {
          compute: 16,
          memory: 64,
          storage: 1000,
          bandwidth: 5000
        },
        metrics: {
          latency: 30,
          availability: 0.995,
          load: 0.5,
          cost: 0.05
        },
        services: ['compute', 'storage', 'cache'],
        status: 'active'
      }
    ];

    defaultNodes.forEach(node => {
      this.edgeNodes.set(node.id, node);
    });

    this.dispatchEvent(new CustomEvent('nodesInitialized', {
      detail: { count: defaultNodes.length, nodes: defaultNodes }
    }));
  }

  // Get optimal edge node for request
  public async getOptimalNode(request: EdgeRequest, userLocation?: { latitude: number; longitude: number }): Promise<EdgeNode> {
    const cacheKey = this.generateCacheKey(request, userLocation);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.node;
    }

    // Filter available nodes
    const availableNodes = Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active')
      .filter(node => this.matchesRequirements(node, request.requirements));

    if (availableNodes.length === 0) {
      throw new Error('No suitable edge nodes available');
    }

    // Score nodes based on multiple factors
    const scoredNodes = availableNodes.map(node => ({
      node,
      score: this.calculateNodeScore(node, request, userLocation)
    }));

    // Sort by score (higher is better)
    scoredNodes.sort((a, b) => b.score - a.score);

    const optimalNode = scoredNodes[0].node;

    // Cache the result
    this.cache.set(cacheKey, {
      node: optimalNode,
      timestamp: Date.now()
    });

    this.maintainCacheSize();

    return optimalNode;
  }

  // Calculate node score based on various factors
  private calculateNodeScore(node: EdgeNode, request: EdgeRequest, userLocation?: { latitude: number; longitude: number }): number {
    let score = 0;

    // Latency score (40% weight)
    const latencyScore = userLocation 
      ? this.calculateGeographicLatency(node.location, userLocation)
      : node.metrics.latency;
    score += (1 - Math.min(latencyScore / 200, 1)) * 40;

    // Availability score (25% weight)
    score += node.metrics.availability * 25;

    // Load score (20% weight) - lower load is better
    score += (1 - node.metrics.load) * 20;

    // Cost score (10% weight) - lower cost is better
    const maxCost = 0.15; // Maximum expected cost
    score += (1 - Math.min(node.metrics.cost / maxCost, 1)) * 10;

    // Capability match score (5% weight)
    const capabilityScore = this.calculateCapabilityScore(node, request);
    score += capabilityScore * 5;

    return score;
  }

  // Calculate geographic distance and estimated latency
  private calculateGeographicLatency(nodeLocation: EdgeNode['location'], userLocation: { latitude: number; longitude: number }): number {
    const distance = this.calculateDistance(nodeLocation, userLocation);
    
    // Estimate latency based on distance (rough approximation)
    // Speed of light in fiber: ~200,000 km/s
    // Add routing overhead factor of 2.5
    const lightSpeedLatency = (distance / 200000) * 2.5 * 1000; // Convert to ms
    
    // Add base processing latency
    return Math.max(nodeLocation.latency || 20, lightSpeedLatency + 10);
  }

  // Calculate distance between two geographic points (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate capability match score
  private calculateCapabilityScore(node: EdgeNode, request: EdgeRequest): number {
    if (!request.requirements.requiredServices) {
      return 1.0;
    }

    const requiredServices = request.requirements.requiredServices;
    const availableServices = node.services;
    
    const matches = requiredServices.filter(service => availableServices.includes(service));
    return matches.length / requiredServices.length;
  }

  // Check if node matches requirements
  private matchesRequirements(node: EdgeNode, requirements: EdgeRequest['requirements']): boolean {
    // Check service requirements
    if (requirements.requiredServices) {
      const hasAllServices = requirements.requiredServices.every(service => 
        node.services.includes(service)
      );
      if (!hasAllServices) return false;
    }

    // Check latency requirements
    if (requirements.minLatency && node.metrics.latency > requirements.minLatency) {
      return false;
    }

    // Check cost requirements
    if (requirements.maxCost && node.metrics.cost > requirements.maxCost) {
      return false;
    }

    // Check bandwidth requirements
    if (requirements.minBandwidth && node.capabilities.bandwidth < requirements.minBandwidth) {
      return false;
    }

    return true;
  }

  // Execute request on optimal edge node
  public async executeRequest(request: EdgeRequest, userLocation?: { latitude: number; longitude: number }): Promise<EdgeResponse> {
    const requestId = this.generateRequestId();
    
    try {
      const optimalNode = await this.getOptimalNode(request, userLocation);
      const response = await this.executeOnNode(optimalNode, request, requestId);
      
      // Update node metrics based on actual performance
      this.updateNodeMetrics(optimalNode.id, response.metrics);
      
      // Record metrics for analysis
      this.recordMetrics(optimalNode.id, response.metrics.totalLatency);
      
      this.dispatchEvent(new CustomEvent('requestCompleted', {
        detail: { requestId, node: optimalNode, response }
      }));
      
      return response;
      
    } catch (error) {
      this.dispatchEvent(new CustomEvent('requestFailed', {
        detail: { requestId, error: error.message }
      }));
      throw error;
    }
  }

  // Execute request on specific node
  private async executeOnNode(node: EdgeNode, request: EdgeRequest, requestId: string): Promise<EdgeResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate network latency
      const networkLatency = node.metrics.latency + Math.random() * 10;
      await this.delay(networkLatency);
      
      // Simulate processing based on request type
      const processingTime = this.simulateProcessing(node, request);
      await this.delay(processingTime);
      
      const endTime = Date.now();
      
      return {
        nodeId: node.id,
        result: this.generateMockResult(request),
        metrics: {
          processingTime,
          networkLatency,
          totalLatency: endTime - startTime,
          cost: this.calculateCost(node, request, processingTime)
        },
        timestamp: endTime
      };
      
    } catch (error) {
      throw new Error(`Failed to execute on node ${node.id}: ${error.message}`);
    }
  }

  // Simulate processing time based on node capabilities and request type
  private simulateProcessing(node: EdgeNode, request: EdgeRequest): number {
    const baseTimes = {
      compute: 100,
      storage: 50,
      streaming: 20,
      cache: 10,
      ai: 500
    };
    
    const baseTime = baseTimes[request.type] || 100;
    const loadFactor = 1 + node.metrics.load;
    const capabilityFactor = 32 / node.capabilities.compute; // Normalize to 32 cores
    
    return baseTime * loadFactor * capabilityFactor;
  }

  // Generate mock result based on request type
  private generateMockResult(request: EdgeRequest): any {
    switch (request.type) {
      case 'compute':
        return { computation: Math.random() * 1000, status: 'completed' };
      case 'storage':
        return { stored: true, size: request.payload.size || 1024, location: 'edge' };
      case 'streaming':
        return { streamUrl: `https://edge-${Math.random().toString(36).substr(2, 9)}.example.com/stream` };
      case 'cache':
        return { cached: true, hitRate: 0.85 };
      case 'ai':
        return { prediction: Math.random(), confidence: Math.random(), model: 'edge-optimized' };
      default:
        return { success: true, data: 'mock result' };
    }
  }

  // Calculate cost for request
  private calculateCost(node: EdgeNode, request: EdgeRequest, processingTime: number): number {
    const baseCost = node.metrics.cost;
    const complexityMultiplier = {
      compute: 1.0,
      storage: 0.5,
      streaming: 0.8,
      cache: 0.2,
      ai: 2.0
    };
    
    const multiplier = complexityMultiplier[request.type] || 1.0;
    const timeFactor = processingTime / 1000; // Convert to seconds
    
    return baseCost * multiplier * timeFactor;
  }

  // Create content delivery plan
  public createContentDeliveryPlan(content: {
    size: number;
    type: string;
    targetRegions: string[];
    priority: 'low' | 'medium' | 'high';
  }): ContentDeliveryPlan {
    const strategy = this.determineDeliveryStrategy(content);
    const edgeNodes = this.selectNodesForRegions(content.targetRegions);
    
    return {
      strategy,
      edgeNodes,
      cacheStrategy: this.determineCacheStrategy(content),
      compressionLevel: this.determineCompressionLevel(content),
      replication: this.determineReplicationCount(content, edgeNodes.length)
    };
  }

  // Determine optimal delivery strategy
  private determineDeliveryStrategy(content: any): ContentDeliveryPlan['strategy'] {
    if (content.priority === 'high' && content.size < 1024 * 1024) {
      return 'cdn';
    } else if (content.size > 100 * 1024 * 1024) {
      return 'p2p';
    } else if (content.targetRegions.length > 3) {
      return 'hybrid';
    } else {
      return 'adaptive';
    }
  }

  // Select edge nodes for target regions
  private selectNodesForRegions(regions: string[]): string[] {
    const regionNodes: string[] = [];
    
    regions.forEach(region => {
      const nodes = Array.from(this.edgeNodes.values())
        .filter(node => 
          node.location.country === region || 
          node.location.city.toLowerCase().includes(region.toLowerCase())
        )
        .filter(node => node.status === 'active')
        .sort((a, b) => a.metrics.latency - b.metrics.latency);
      
      if (nodes.length > 0) {
        regionNodes.push(nodes[0].id);
      }
    });
    
    return regionNodes.length > 0 ? regionNodes : ['edge-tokyo-1']; // Fallback
  }

  // Determine cache strategy
  private determineCacheStrategy(content: any): ContentDeliveryPlan['cacheStrategy'] {
    if (content.priority === 'high') {
      return 'aggressive';
    } else if (content.size > 50 * 1024 * 1024) {
      return 'conservative';
    } else {
      return 'intelligent';
    }
  }

  // Determine compression level
  private determineCompressionLevel(content: any): number {
    if (content.type.includes('image') || content.type.includes('video')) {
      return 3; // Light compression for media
    } else if (content.type.includes('text')) {
      return 6; // Medium compression for text
    } else {
      return 4; // Default compression
    }
  }

  // Determine replication count
  private determineReplicationCount(content: any, availableNodes: number): number {
    if (content.priority === 'high') {
      return Math.min(availableNodes, 5);
    } else if (content.size > 10 * 1024 * 1024) {
      return Math.min(availableNodes, 3);
    } else {
      return Math.min(availableNodes, 2);
    }
  }

  // Distribute task across multiple edge nodes
  public async distributeTask(task: {
    type: string;
    data: any;
    partitions: number;
    requirements?: EdgeRequest['requirements'];
  }): Promise<DistributedTask> {
    const taskId = this.generateTaskId();
    const availableNodes = this.getAvailableNodesForTask(task.requirements);
    
    if (availableNodes.length < task.partitions) {
      throw new Error(`Not enough nodes available. Required: ${task.partitions}, Available: ${availableNodes.length}`);
    }

    // Create task partitions
    const partitions: TaskPartition[] = [];
    const partitionSize = Math.ceil(task.data.length / task.partitions);
    
    for (let i = 0; i < task.partitions; i++) {
      const start = i * partitionSize;
      const end = Math.min(start + partitionSize, task.data.length);
      const partitionData = task.data.slice(start, end);
      const nodeId = availableNodes[i % availableNodes.length].id;
      
      partitions.push({
        id: `${taskId}-partition-${i}`,
        nodeId,
        data: partitionData,
        status: 'pending'
      });
    }

    const distributedTask: DistributedTask = {
      id: taskId,
      type: task.type,
      data: task.data,
      partitions,
      status: 'pending',
      results: []
    };

    // Execute partitions in parallel
    const partitionPromises = partitions.map(partition => 
      this.executePartition(partition)
    );
    
    distributedTask.status = 'running';
    
    try {
      const results = await Promise.allSettled(partitionPromises);
      
      // Process results
      results.forEach((result, index) => {
        const partition = partitions[index];
        if (result.status === 'fulfilled') {
          partition.status = 'completed';
          partition.result = result.value;
          partition.metrics = {
            startTime: Date.now() - 1000, // Mock start time
            endTime: Date.now(),
            processingTime: 1000 // Mock processing time
          };
        } else {
          partition.status = 'failed';
        }
      });
      
      const completedPartitions = partitions.filter(p => p.status === 'completed');
      distributedTask.results = completedPartitions.map(p => p.result);
      distributedTask.status = completedPartitions.length === partitions.length ? 'completed' : 'failed';
      
    } catch (error) {
      distributedTask.status = 'failed';
      partitions.forEach(p => p.status = 'failed');
    }

    this.dispatchEvent(new CustomEvent('taskCompleted', {
      detail: { taskId, task: distributedTask }
    }));

    return distributedTask;
  }

  // Execute single partition
  private async executePartition(partition: TaskPartition): Promise<any> {
    const node = this.edgeNodes.get(partition.nodeId);
    if (!node) {
      throw new Error(`Node ${partition.nodeId} not found`);
    }

    partition.status = 'running';
    
    // Simulate partition execution
    const processingTime = this.simulateProcessing(node, { type: 'compute', payload: partition.data, priority: 'medium', requirements: {} });
    await this.delay(processingTime);
    
    return {
      partitionId: partition.id,
      nodeId: partition.nodeId,
      result: `processed-${partition.data.length}-items`,
      processingTime
    };
  }

  // Get available nodes for task
  private getAvailableNodesForTask(requirements?: EdgeRequest['requirements']): EdgeNode[] {
    return Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active')
      .filter(node => !requirements || this.matchesRequirements(node, requirements))
      .sort((a, b) => a.metrics.load - b.metrics.load); // Prefer less loaded nodes
  }

  // Update node metrics based on actual performance
  private updateNodeMetrics(nodeId: string, metrics: EdgeResponse['metrics']): void {
    const node = this.edgeNodes.get(nodeId);
    if (!node) return;

    // Update load with exponential moving average
    const loadFactor = metrics.processingTime / 1000; // Convert to seconds
    node.metrics.load = node.metrics.load * 0.8 + loadFactor * 0.2;

    // Update latency with exponential moving average
    node.metrics.latency = node.metrics.latency * 0.9 + metrics.networkLatency * 0.1;
  }

  // Record metrics for analysis
  private recordMetrics(nodeId: string, latency: number): void {
    if (!this.metricsCollector.has(nodeId)) {
      this.metricsCollector.set(nodeId, []);
    }
    
    const metrics = this.metricsCollector.get(nodeId)!;
    metrics.push(latency);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  // Get analytics for edge nodes
  public getAnalytics(): {
    nodePerformance: Record<string, {
      avgLatency: number;
      p95Latency: number;
      requestCount: number;
      availability: number;
    }>;
    globalMetrics: {
      totalRequests: number;
      avgLatency: number;
      cacheHitRate: number;
      costEfficiency: number;
    };
  } {
    const nodePerformance: Record<string, any> = {};
    
    this.edgeNodes.forEach((node, nodeId) => {
      const metrics = this.metricsCollector.get(nodeId) || [];
      
      if (metrics.length > 0) {
        const sorted = [...metrics].sort((a, b) => a - b);
        nodePerformance[nodeId] = {
          avgLatency: metrics.reduce((a, b) => a + b, 0) / metrics.length,
          p95Latency: sorted[Math.floor(sorted.length * 0.95)],
          requestCount: metrics.length,
          availability: node.metrics.availability
        };
      } else {
        nodePerformance[nodeId] = {
          avgLatency: node.metrics.latency,
          p95Latency: node.metrics.latency,
          requestCount: 0,
          availability: node.metrics.availability
        };
      }
    });

    const globalMetrics = {
      totalRequests: Array.from(this.metricsCollector.values())
        .reduce((sum, metrics) => sum + metrics.length, 0),
      avgLatency: this.calculateGlobalAvgLatency(),
      cacheHitRate: this.calculateCacheHitRate(),
      costEfficiency: this.calculateCostEfficiency()
    };

    return { nodePerformance, globalMetrics };
  }

  // Calculate global average latency
  private calculateGlobalAvgLatency(): number {
    const allMetrics = Array.from(this.metricsCollector.values()).flat();
    if (allMetrics.length === 0) return 0;
    return allMetrics.reduce((sum, latency) => sum + latency, 0) / allMetrics.length;
  }

  // Calculate cache hit rate
  private calculateCacheHitRate(): number {
    // This would be calculated based on actual cache hits/misses
    // For now, return a mock value
    return 0.85;
  }

  // Calculate cost efficiency
  private calculateCostEfficiency(): number {
    const totalCost = Array.from(this.edgeNodes.values())
      .reduce((sum, node) => sum + node.metrics.cost, 0);
    const totalPerformance = Array.from(this.edgeNodes.values())
      .reduce((sum, node) => sum + (1 / node.metrics.latency), 0);
    
    return totalPerformance / totalCost;
  }

  // Utility methods
  private generateCacheKey(request: EdgeRequest, userLocation?: { latitude: number; longitude: number }): string {
    const locationKey = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'global';
    return `${request.type}-${request.priority}-${JSON.stringify(request.requirements)}-${locationKey}`;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private maintainCacheSize(): void {
    if (this.cache.size > this.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.dispatchEvent(new CustomEvent('metricsUpdate', {
        detail: this.getAnalytics()
      }));
    }, 30000); // Update analytics every 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  public getEdgeNodes(): EdgeNode[] {
    return Array.from(this.edgeNodes.values());
  }

  public getNode(nodeId: string): EdgeNode | undefined {
    return this.edgeNodes.get(nodeId);
  }

  public updateNodeStatus(nodeId: string, status: EdgeNode['status']): void {
    const node = this.edgeNodes.get(nodeId);
    if (node) {
      node.status = status;
      this.dispatchEvent(new CustomEvent('nodeStatusChanged', {
        detail: { nodeId, status }
      }));
    }
  }

  public clearCache(): void {
    this.cache.clear();
    this.locationCache.clear();
  }

  public getCacheStats(): { size: number; hitRate: number; entries: number } {
    return {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      entries: this.cache.size
    };
  }
}

export { EdgeComputingOptimizer, EdgeNode, EdgeRequest, EdgeResponse, ContentDeliveryPlan, DistributedTask };
