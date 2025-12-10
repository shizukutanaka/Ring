// WebRTC Scalability Enhancement Service
// SFU-based clustering and auto-scaling implementation

const EventEmitter = require('events');
const cluster = require('cluster');
const os = require('os');
const { Worker } = require('worker_threads');

class ScalabilityService extends EventEmitter {
  constructor() {
    super();
    this.clusterNodes = new Map();
    this.loadBalancer = null;
    this.scalingMetrics = new Map();
    this.autoScalingEnabled = true;
    this.sfuInstances = new Map();
    this.edgeNodes = new Map();
    this.originNodes = new Map();
    this.activeSessions = new Map();
    this.networkTopology = new Map();
    
    this.initializeCluster();
    this.startMetricsCollection();
    this.setupAutoScaling();
  }

  // Initialize SFU-based cluster
  initializeCluster() {
    const cpuCount = os.cpus().length;
    const nodeCount = Math.min(cpuCount, 8); // Limit to 8 SFU instances
    
    // Create SFU instances
    for (let i = 0; i < nodeCount; i++) {
      const sfuNode = this.createSFUNode(i);
      this.sfuInstances.set(`sfu-${i}`, sfuNode);
    }
    
    // Create origin nodes (transcoding)
    for (let i = 0; i < Math.ceil(nodeCount / 2); i++) {
      const originNode = this.createOriginNode(i);
      this.originNodes.set(`origin-${i}`, originNode);
    }
    
    // Create edge nodes (distribution)
    for (let i = 0; i < Math.ceil(nodeCount / 2); i++) {
      const edgeNode = this.createEdgeNode(i);
      this.edgeNodes.set(`edge-${i}`, edgeNode);
    }
    
    console.log(`Initialized cluster: ${nodeCount} SFU nodes, ${this.originNodes.size} origin nodes, ${this.edgeNodes.size} edge nodes`);
  }

  // Create SFU node
  createSFUNode(nodeId) {
    const node = {
      id: `sfu-${nodeId}`,
      type: 'SFU',
      status: 'active',
      capacity: {
        maxStreams: 1000,
        currentStreams: 0,
        maxBandwidth: 10000, // Mbps
        currentBandwidth: 0
      },
      performance: {
        cpu: 0,
        memory: 0,
        latency: 0,
        packetLoss: 0
      },
      network: {
        region: 'default',
        availabilityZone: 'az-1',
        publicIP: `192.168.1.${100 + nodeId}`,
        internalIP: `10.0.0.${10 + nodeId}`
      },
      sessions: new Set(),
      lastHealthCheck: Date.now()
    };
    
    // Start health monitoring
    this.startNodeHealthMonitoring(node);
    
    return node;
  }

  // Create origin node (transcoding)
  createOriginNode(nodeId) {
    const node = {
      id: `origin-${nodeId}`,
      type: 'ORIGIN',
      status: 'active',
      capabilities: ['h264', 'vp8', 'vp9', 'av1', 'opus', 'aac'],
      capacity: {
        maxTranscoders: 50,
        currentTranscoders: 0,
        maxBitrate: 5000, // Mbps
        currentBitrate: 0
      },
      performance: {
        cpu: 0,
        memory: 0,
        gpu: 0,
        encodingLatency: 0
      },
      network: {
        region: 'default',
        availabilityZone: 'az-1',
        storageCapacity: 10000, // GB
        currentStorage: 0
      },
      streams: new Set(),
      lastHealthCheck: Date.now()
    };
    
    this.startNodeHealthMonitoring(node);
    return node;
  }

  // Create edge node (distribution)
  createEdgeNode(nodeId) {
    const node = {
      id: `edge-${nodeId}`,
      type: 'EDGE',
      status: 'active',
      capacity: {
        maxViewers: 5000,
        currentViewers: 0,
        maxBandwidth: 20000, // Mbps
        currentBandwidth: 0
      },
      performance: {
        cpu: 0,
        memory: 0,
        networkLatency: 0,
        cacheHitRate: 0
      },
      network: {
        region: 'default',
        availabilityZone: 'az-2',
        cdnEndpoint: `cdn-${nodeId}.example.com`,
        cacheSize: 1000 // GB
      },
      streams: new Map(), // streamId -> viewerCount
      lastHealthCheck: Date.now()
    };
    
    this.startNodeHealthMonitoring(node);
    return node;
  }

  // Start node health monitoring
  startNodeHealthMonitoring(node) {
    setInterval(() => {
      this.updateNodeMetrics(node);
      this.checkNodeHealth(node);
    }, 5000); // Every 5 seconds
  }

  // Update node metrics
  updateNodeMetrics(node) {
    // Simulate metric collection
    const cpuUsage = Math.random() * 80;
    const memoryUsage = Math.random() * 85;
    
    if (node.type === 'SFU') {
      node.performance.cpu = cpuUsage;
      node.performance.memory = memoryUsage;
      node.performance.latency = Math.random() * 50 + 10; // 10-60ms
      node.performance.packetLoss = Math.random() * 2; // 0-2%
    } else if (node.type === 'ORIGIN') {
      node.performance.cpu = cpuUsage;
      node.performance.memory = memoryUsage;
      node.performance.gpu = Math.random() * 70;
      node.performance.encodingLatency = Math.random() * 100 + 50; // 50-150ms
    } else if (node.type === 'EDGE') {
      node.performance.cpu = cpuUsage;
      node.performance.memory = memoryUsage;
      node.performance.networkLatency = Math.random() * 20 + 5; // 5-25ms
      node.performance.cacheHitRate = 85 + Math.random() * 15; // 85-100%
    }
    
    node.lastHealthCheck = Date.now();
  }

  // Check node health
  checkNodeHealth(node) {
    const isHealthy = node.performance.cpu < 90 && 
                    node.performance.memory < 95 &&
                    (node.type !== 'SFU' || node.performance.packetLoss < 5);
    
    if (!isHealthy && node.status === 'active') {
      node.status = 'unhealthy';
      this.emit('node_unhealthy', node);
      this.handleUnhealthyNode(node);
    } else if (isHealthy && node.status === 'unhealthy') {
      node.status = 'active';
      this.emit('node_recovered', node);
    }
  }

  // Handle unhealthy node
  handleUnhealthyNode(node) {
    console.warn(`Node ${node.id} is unhealthy, redistributing load`);
    
    // Redistribute sessions to healthy nodes
    if (node.type === 'SFU') {
      const sessionsToMove = Array.from(node.sessions);
      sessionsToMove.forEach(sessionId => {
        this.redistributeSession(sessionId, node.id);
      });
      node.sessions.clear();
    }
  }

  // Intelligent session distribution
  distributeSession(sessionId, sessionRequirements) {
    const optimalNode = this.selectOptimalNode(sessionRequirements);
    
    if (!optimalNode) {
      throw new Error('No available nodes for session distribution');
    }
    
    // Assign session to node
    this.assignSessionToNode(sessionId, optimalNode, sessionRequirements);
    
    return optimalNode;
  }

  // Select optimal node based on requirements
  selectOptimalNode(requirements) {
    const { type, bandwidth, participants, region } = requirements;
    
    let candidates = [];
    
    if (type === 'SFU') {
      candidates = Array.from(this.sfuInstances.values())
        .filter(node => node.status === 'active')
        .filter(node => node.capacity.currentStreams < node.capacity.maxStreams)
        .filter(node => (node.capacity.currentBandwidth + bandwidth) < node.capacity.maxBandwidth);
    } else if (type === 'ORIGIN') {
      candidates = Array.from(this.originNodes.values())
        .filter(node => node.status === 'active')
        .filter(node => node.capacity.currentTranscoders < node.capacity.maxTranscoders);
    } else if (type === 'EDGE') {
      candidates = Array.from(this.edgeNodes.values())
        .filter(node => node.status === 'active')
        .filter(node => node.capacity.currentViewers < node.capacity.maxViewers);
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Select node with best performance
    return candidates.reduce((best, current) => {
      const bestScore = this.calculateNodeScore(best, requirements);
      const currentScore = this.calculateNodeScore(current, requirements);
      return currentScore > bestScore ? current : best;
    });
  }

  // Calculate node score for selection
  calculateNodeScore(node, requirements) {
    let score = 100;
    
    // CPU usage penalty
    score -= node.performance.cpu * 0.5;
    
    // Memory usage penalty
    score -= node.performance.memory * 0.3;
    
    // Capacity utilization penalty
    if (node.type === 'SFU') {
      const utilization = node.capacity.currentStreams / node.capacity.maxStreams;
      score -= utilization * 20;
      
      // Latency penalty
      score -= node.performance.latency * 0.1;
      
      // Packet loss penalty
      score -= node.performance.packetLoss * 10;
    } else if (node.type === 'ORIGIN') {
      const utilization = node.capacity.currentTranscoders / node.capacity.maxTranscoders;
      score -= utilization * 20;
      
      // Encoding latency penalty
      score -= node.performance.encodingLatency * 0.05;
    } else if (node.type === 'EDGE') {
      const utilization = node.capacity.currentViewers / node.capacity.maxViewers;
      score -= utilization * 20;
      
      // Cache hit rate bonus
      score += node.performance.cacheHitRate * 0.1;
    }
    
    return Math.max(0, score);
  }

  // Assign session to node
  assignSessionToNode(sessionId, node, requirements) {
    if (node.type === 'SFU') {
      node.sessions.add(sessionId);
      node.capacity.currentStreams++;
      node.capacity.currentBandwidth += requirements.bandwidth || 0;
    } else if (node.type === 'ORIGIN') {
      node.streams.add(sessionId);
      node.capacity.currentTranscoders++;
      node.capacity.currentBitrate += requirements.bitrate || 0;
    } else if (node.type === 'EDGE') {
      node.streams.set(sessionId, requirements.participants || 1);
      node.capacity.currentViewers += requirements.participants || 1;
      node.capacity.currentBandwidth += requirements.bandwidth || 0;
    }
    
    this.activeSessions.set(sessionId, {
      nodeId: node.id,
      nodeType: node.type,
      requirements,
      assignedAt: Date.now()
    });
    
    this.emit('session_assigned', { sessionId, node });
  }

  // Redistribute session from unhealthy node
  redistributeSession(sessionId, fromNodeId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    try {
      const newNode = this.selectOptimalNode(session.requirements);
      if (newNode && newNode.id !== fromNodeId) {
        this.assignSessionToNode(sessionId, newNode, session.requirements);
        console.log(`Session ${sessionId} redistributed from ${fromNodeId} to ${newNode.id}`);
      }
    } catch (error) {
      console.error(`Failed to redistribute session ${sessionId}:`, error);
    }
  }

  // Auto-scaling setup
  setupAutoScaling() {
    setInterval(() => {
      if (this.autoScalingEnabled) {
        this.evaluateScalingNeeds();
      }
    }, 30000); // Every 30 seconds
  }

  // Evaluate scaling needs
  evaluateScalingNeeds() {
    const sfuLoad = this.calculateSFULoad();
    const originLoad = this.calculateOriginLoad();
    const edgeLoad = this.calculateEdgeLoad();
    
    // Scale up SFU nodes if needed
    if (sfuLoad > 80) {
      this.scaleUpSFU();
    } else if (sfuLoad < 30 && this.sfuInstances.size > 2) {
      this.scaleDownSFU();
    }
    
    // Scale up origin nodes if needed
    if (originLoad > 80) {
      this.scaleUpOrigin();
    } else if (originLoad < 30 && this.originNodes.size > 1) {
      this.scaleDownOrigin();
    }
    
    // Scale up edge nodes if needed
    if (edgeLoad > 80) {
      this.scaleUpEdge();
    } else if (edgeLoad < 30 && this.edgeNodes.size > 1) {
      this.scaleDownEdge();
    }
  }

  // Calculate SFU load
  calculateSFULoad() {
    const nodes = Array.from(this.sfuInstances.values());
    if (nodes.length === 0) return 0;
    
    const totalLoad = nodes.reduce((sum, node) => {
      const streamUtilization = node.capacity.currentStreams / node.capacity.maxStreams;
      const bandwidthUtilization = node.capacity.currentBandwidth / node.capacity.maxBandwidth;
      const cpuLoad = node.performance.cpu;
      
      return sum + Math.max(streamUtilization, bandwidthUtilization, cpuLoad);
    }, 0);
    
    return totalLoad / nodes.length;
  }

  // Calculate origin load
  calculateOriginLoad() {
    const nodes = Array.from(this.originNodes.values());
    if (nodes.length === 0) return 0;
    
    const totalLoad = nodes.reduce((sum, node) => {
      const transcoderUtilization = node.capacity.currentTranscoders / node.capacity.maxTranscoders;
      const cpuLoad = node.performance.cpu;
      
      return sum + Math.max(transcoderUtilization, cpuLoad);
    }, 0);
    
    return totalLoad / nodes.length;
  }

  // Calculate edge load
  calculateEdgeLoad() {
    const nodes = Array.from(this.edgeNodes.values());
    if (nodes.length === 0) return 0;
    
    const totalLoad = nodes.reduce((sum, node) => {
      const viewerUtilization = node.capacity.currentViewers / node.capacity.maxViewers;
      const cpuLoad = node.performance.cpu;
      
      return sum + Math.max(viewerUtilization, cpuLoad);
    }, 0);
    
    return totalLoad / nodes.length;
  }

  // Scale up SFU
  scaleUpSFU() {
    const newNodeId = this.sfuInstances.size;
    const newNode = this.createSFUNode(newNodeId);
    this.sfuInstances.set(`sfu-${newNodeId}`, newNode);
    
    console.log(`Scaled up SFU: added node sfu-${newNodeId}`);
    this.emit('sfu_scaled_up', { nodeId: newNode.id });
  }

  // Scale down SFU
  scaleDownSFU() {
    if (this.sfuInstances.size <= 2) return; // Minimum 2 nodes
    
    // Find least loaded node
    const nodes = Array.from(this.sfuInstances.values());
    const leastLoadedNode = nodes.reduce((least, current) => {
      const leastLoad = least.capacity.currentStreams;
      const currentLoad = current.capacity.currentStreams;
      return currentLoad < leastLoad ? current : least;
    });
    
    // Drain node (don't accept new sessions)
    leastLoadedNode.status = 'draining';
    
    // Move existing sessions
    const sessionsToMove = Array.from(leastLoadedNode.sessions);
    sessionsToMove.forEach(sessionId => {
      this.redistributeSession(sessionId, leastLoadedNode.id);
    });
    
    // Remove node after sessions are moved
    setTimeout(() => {
      this.sfuInstances.delete(leastLoadedNode.id);
      console.log(`Scaled down SFU: removed node ${leastLoadedNode.id}`);
      this.emit('sfu_scaled_down', { nodeId: leastLoadedNode.id });
    }, 10000); // 10 seconds grace period
  }

  // Scale up origin
  scaleUpOrigin() {
    const newNodeId = this.originNodes.size;
    const newNode = this.createOriginNode(newNodeId);
    this.originNodes.set(`origin-${newNodeId}`, newNode);
    
    console.log(`Scaled up Origin: added node origin-${newNodeId}`);
    this.emit('origin_scaled_up', { nodeId: newNode.id });
  }

  // Scale down origin
  scaleDownOrigin() {
    if (this.originNodes.size <= 1) return; // Minimum 1 node
    
    const nodes = Array.from(this.originNodes.values());
    const leastLoadedNode = nodes.reduce((least, current) => {
      const leastLoad = least.capacity.currentTranscoders;
      const currentLoad = current.capacity.currentTranscoders;
      return currentLoad < leastLoad ? current : least;
    });
    
    leastLoadedNode.status = 'draining';
    
    setTimeout(() => {
      this.originNodes.delete(leastLoadedNode.id);
      console.log(`Scaled down Origin: removed node ${leastLoadedNode.id}`);
      this.emit('origin_scaled_down', { nodeId: leastLoadedNode.id });
    }, 10000);
  }

  // Scale up edge
  scaleUpEdge() {
    const newNodeId = this.edgeNodes.size;
    const newNode = this.createEdgeNode(newNodeId);
    this.edgeNodes.set(`edge-${newNodeId}`, newNode);
    
    console.log(`Scaled up Edge: added node edge-${newNodeId}`);
    this.emit('edge_scaled_up', { nodeId: newNode.id });
  }

  // Scale down edge
  scaleDownEdge() {
    if (this.edgeNodes.size <= 1) return; // Minimum 1 node
    
    const nodes = Array.from(this.edgeNodes.values());
    const leastLoadedNode = nodes.reduce((least, current) => {
      const leastLoad = least.capacity.currentViewers;
      const currentLoad = current.capacity.currentViewers;
      return currentLoad < leastLoad ? current : least;
    });
    
    leastLoadedNode.status = 'draining';
    
    setTimeout(() => {
      this.edgeNodes.delete(leastLoadedNode.id);
      console.log(`Scaled down Edge: removed node ${leastLoadedNode.id}`);
      this.emit('edge_scaled_down', { nodeId: leastLoadedNode.id });
    }, 10000);
  }

  // Start metrics collection
  startMetricsCollection() {
    setInterval(() => {
      this.collectClusterMetrics();
    }, 10000); // Every 10 seconds
  }

  // Collect cluster metrics
  collectClusterMetrics() {
    const metrics = {
      timestamp: Date.now(),
      cluster: {
        totalNodes: this.sfuInstances.size + this.originNodes.size + this.edgeNodes.size,
        activeNodes: this.countActiveNodes(),
        unhealthyNodes: this.countUnhealthyNodes()
      },
      sfu: {
        totalStreams: this.getTotalSFUStreams(),
        totalBandwidth: this.getTotalSFUBandwidth(),
        averageLatency: this.getAverageSFULatency()
      },
      origin: {
        totalTranscoders: this.getTotalOriginTranscoders(),
        totalBitrate: this.getTotalOriginBitrate(),
        averageEncodingLatency: this.getAverageOriginEncodingLatency()
      },
      edge: {
        totalViewers: this.getTotalEdgeViewers(),
        totalBandwidth: this.getTotalEdgeBandwidth(),
        averageCacheHitRate: this.getAverageEdgeCacheHitRate()
      },
      sessions: {
        active: this.activeSessions.size,
        byType: this.getSessionsByType()
      }
    };
    
    this.scalingMetrics.set(Date.now(), metrics);
    this.emit('metrics_collected', metrics);
  }

  // Helper methods for metrics
  countActiveNodes() {
    return [...this.sfuInstances.values(), ...this.originNodes.values(), ...this.edgeNodes.values()]
      .filter(node => node.status === 'active').length;
  }

  countUnhealthyNodes() {
    return [...this.sfuInstances.values(), ...this.originNodes.values(), ...this.edgeNodes.values()]
      .filter(node => node.status === 'unhealthy').length;
  }

  getTotalSFUStreams() {
    return Array.from(this.sfuInstances.values())
      .reduce((sum, node) => sum + node.capacity.currentStreams, 0);
  }

  getTotalSFUBandwidth() {
    return Array.from(this.sfuInstances.values())
      .reduce((sum, node) => sum + node.capacity.currentBandwidth, 0);
  }

  getAverageSFULatency() {
    const nodes = Array.from(this.sfuInstances.values());
    if (nodes.length === 0) return 0;
    
    const totalLatency = nodes.reduce((sum, node) => sum + node.performance.latency, 0);
    return totalLatency / nodes.length;
  }

  getTotalOriginTranscoders() {
    return Array.from(this.originNodes.values())
      .reduce((sum, node) => sum + node.capacity.currentTranscoders, 0);
  }

  getTotalOriginBitrate() {
    return Array.from(this.originNodes.values())
      .reduce((sum, node) => sum + node.capacity.currentBitrate, 0);
  }

  getAverageOriginEncodingLatency() {
    const nodes = Array.from(this.originNodes.values());
    if (nodes.length === 0) return 0;
    
    const totalLatency = nodes.reduce((sum, node) => sum + node.performance.encodingLatency, 0);
    return totalLatency / nodes.length;
  }

  getTotalEdgeViewers() {
    return Array.from(this.edgeNodes.values())
      .reduce((sum, node) => sum + node.capacity.currentViewers, 0);
  }

  getTotalEdgeBandwidth() {
    return Array.from(this.edgeNodes.values())
      .reduce((sum, node) => sum + node.capacity.currentBandwidth, 0);
  }

  getAverageEdgeCacheHitRate() {
    const nodes = Array.from(this.edgeNodes.values());
    if (nodes.length === 0) return 0;
    
    const totalHitRate = nodes.reduce((sum, node) => sum + node.performance.cacheHitRate, 0);
    return totalHitRate / nodes.length;
  }

  getSessionsByType() {
    const sessionsByType = { SFU: 0, ORIGIN: 0, EDGE: 0 };
    
    this.activeSessions.forEach(session => {
      sessionsByType[session.nodeType]++;
    });
    
    return sessionsByType;
  }

  // Get cluster status
  getClusterStatus() {
    return {
      nodes: {
        sfu: Array.from(this.sfuInstances.values()).map(node => ({
          id: node.id,
          status: node.status,
          capacity: node.capacity,
          performance: node.performance
        })),
        origin: Array.from(this.originNodes.values()).map(node => ({
          id: node.id,
          status: node.status,
          capacity: node.capacity,
          performance: node.performance
        })),
        edge: Array.from(this.edgeNodes.values()).map(node => ({
          id: node.id,
          status: node.status,
          capacity: node.capacity,
          performance: node.performance
        }))
      },
      sessions: this.activeSessions.size,
      autoScaling: this.autoScalingEnabled,
      lastMetrics: this.getLatestMetrics()
    };
  }

  // Get latest metrics
  getLatestMetrics() {
    const timestamps = Array.from(this.scalingMetrics.keys()).sort((a, b) => b - a);
    return timestamps.length > 0 ? this.scalingMetrics.get(timestamps[0]) : null;
  }

  // Enable/disable auto-scaling
  setAutoScaling(enabled) {
    this.autoScalingEnabled = enabled;
    console.log(`Auto-scaling ${enabled ? 'enabled' : 'disabled'}`);
    this.emit('auto_scaling_changed', { enabled });
  }

  // Handle session termination
  terminateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    const node = this.getNodeById(session.nodeId, session.nodeType);
    if (node) {
      if (node.type === 'SFU') {
        node.sessions.delete(sessionId);
        node.capacity.currentStreams--;
        node.capacity.currentBandwidth -= session.requirements.bandwidth || 0;
      } else if (node.type === 'ORIGIN') {
        node.streams.delete(sessionId);
        node.capacity.currentTranscoders--;
        node.capacity.currentBitrate -= session.requirements.bitrate || 0;
      } else if (node.type === 'EDGE') {
        node.streams.delete(sessionId);
        node.capacity.currentViewers -= session.requirements.participants || 1;
        node.capacity.currentBandwidth -= session.requirements.bandwidth || 0;
      }
    }
    
    this.activeSessions.delete(sessionId);
    this.emit('session_terminated', { sessionId });
    
    return true;
  }

  // Get node by ID and type
  getNodeById(nodeId, nodeType) {
    if (nodeType === 'SFU') {
      return this.sfuInstances.get(nodeId);
    } else if (nodeType === 'ORIGIN') {
      return this.originNodes.get(nodeId);
    } else if (nodeType === 'EDGE') {
      return this.edgeNodes.get(nodeId);
    }
    return null;
  }

  // Generate scalability report
  generateScalabilityReport() {
    const latestMetrics = this.getLatestMetrics();
    const clusterStatus = this.getClusterStatus();
    
    return {
      timestamp: Date.now(),
      summary: {
        totalNodes: clusterStatus.nodes.sfu.length + clusterStatus.nodes.origin.length + clusterStatus.nodes.edge.length,
        activeSessions: clusterStatus.sessions,
        autoScalingEnabled: this.autoScalingEnabled
      },
      performance: latestMetrics,
      recommendations: this.generateScalabilityRecommendations(),
      scalingEvents: this.getRecentScalingEvents()
    };
  }

  // Generate scalability recommendations
  generateScalabilityRecommendations() {
    const recommendations = [];
    const sfuLoad = this.calculateSFULoad();
    const originLoad = this.calculateOriginLoad();
    const edgeLoad = this.calculateEdgeLoad();
    
    if (sfuLoad > 85) {
      recommendations.push({
        type: 'scale_up_sfu',
        priority: 'high',
        message: 'SFU load is high. Consider scaling up SFU nodes.'
      });
    }
    
    if (originLoad > 85) {
      recommendations.push({
        type: 'scale_up_origin',
        priority: 'high',
        message: 'Origin load is high. Consider scaling up transcoding nodes.'
      });
    }
    
    if (edgeLoad > 85) {
      recommendations.push({
        type: 'scale_up_edge',
        priority: 'high',
        message: 'Edge load is high. Consider scaling up distribution nodes.'
      });
    }
    
    if (sfuLoad < 20 && this.sfuInstances.size > 4) {
      recommendations.push({
        type: 'scale_down_sfu',
        priority: 'low',
        message: 'SFU load is low. Consider scaling down to reduce costs.'
      });
    }
    
    return recommendations;
  }

  // Get recent scaling events
  getRecentScalingEvents() {
    // This would track scaling events in a real implementation
    return [];
  }
}

module.exports = new ScalabilityService();
