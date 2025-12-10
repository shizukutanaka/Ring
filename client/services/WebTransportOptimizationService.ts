// WebTransport Optimization Service
// High-performance HTTP/3 and QUIC-based communication for WebRTC

interface WebTransportConfig {
  transport: {
    protocol: 'http3' | 'quic';
    maxConnections: number;
    connectionTimeout: number; // ms
    keepAlive: boolean;
    enableDatagrams: boolean;
    enableStreams: boolean;
  };
  performance: {
    maxBandwidth: number; // Mbps
    targetLatency: number; // ms
    bufferSize: number; // KB
    congestionControl: 'bbr' | 'cubic' | 'copa' | 'nada' | 'scream';
    enableMultiplexing: boolean;
  };
  security: {
    encryption: 'tls13' | 'custom';
    certificateValidation: boolean;
    enable0RTT: boolean;
    enableEarlyData: boolean;
  };
  features: {
    connectionMigration: boolean;
    serverPush: boolean;
    adaptiveBitrate: boolean;
    errorCorrection: boolean;
  };
  optimization: {
    enableCompression: boolean;
    enableCaching: boolean;
    enablePrefetch: boolean;
    enableBatching: boolean;
  };
}

interface TransportConnection {
  connectionId: string;
  url: string;
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  startTime: number;
  lastActivity: number;
  bytesTransmitted: number;
  bytesReceived: number;
  rtt: number; // ms
  packetLoss: number; // 0-1
  bandwidth: number; // Mbps
  congestionWindow: number; // bytes
  streams: Map<string, TransportStream>;
  datagrams: DatagramStats;
}

interface TransportStream {
  streamId: string;
  type: 'reliable' | 'unreliable';
  direction: 'bidirectional' | 'unidirectional';
  state: 'open' | 'closed' | 'error';
  bytesTransmitted: number;
  bytesReceived: number;
  startTime: number;
  lastActivity: number;
  priority: number; // 0-255
}

interface DatagramStats {
  sent: number;
  received: number;
  lost: number;
  reordered: number;
  averageSize: number; // bytes
  maxLatency: number; // ms
}

interface WebTransportMetrics {
  timestamp: number;
  connections: {
    total: number;
    active: number;
    failed: number;
    migrating: number;
  };
  performance: {
    totalBandwidth: number; // Mbps
    averageLatency: number; // ms
    packetLossRate: number; // 0-1
    connectionUtilization: number; // 0-1
    throughput: number; // Mbps
  };
  congestion: {
    algorithm: string;
    windowSize: number; // bytes
    cwnd: number; // congestion window
    ssthresh: number; // slow start threshold
    recoveryMode: boolean;
  };
  quality: {
    mos: number; // Mean Opinion Score
    plr: number; // Packet Loss Rate
    jitter: number; // ms
    bufferHealth: number; // 0-1
  };
}

interface WebTransportAlert {
  alertId: string;
  type: 'connection' | 'performance' | 'congestion' | 'security' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  connectionId?: string;
  metrics: WebTransportMetrics;
  recommendation: string;
  timestamp: number;
  resolved: boolean;
}

class WebTransportOptimizationService extends EventTarget {
  private config: WebTransportConfig;
  private connections: Map<string, TransportConnection> = new Map();
  private currentMetrics: WebTransportMetrics;
  private historicalMetrics: WebTransportMetrics[] = [];
  private alerts: Map<string, WebTransportAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private transportPool: WebTransport[] = [];
  private congestionController: CongestionController;

  constructor(config: Partial<WebTransportConfig> = {}) {
    super();
    this.config = this.mergeConfig(config);
    this.currentMetrics = this.initializeMetrics();
    this.congestionController = new CongestionController(this.config.performance.congestionControl);
  }

  private mergeConfig(userConfig: Partial<WebTransportConfig>): WebTransportConfig {
    return {
      transport: {
        protocol: 'http3',
        maxConnections: 10,
        connectionTimeout: 30000,
        keepAlive: true,
        enableDatagrams: true,
        enableStreams: true,
        ...userConfig.transport
      },
      performance: {
        maxBandwidth: 1000, // 1 Gbps
        targetLatency: 50, // 50ms
        bufferSize: 1024, // 1MB
        congestionControl: 'bbr',
        enableMultiplexing: true,
        ...userConfig.performance
      },
      security: {
        encryption: 'tls13',
        certificateValidation: true,
        enable0RTT: true,
        enableEarlyData: true,
        ...userConfig.security
      },
      features: {
        connectionMigration: true,
        serverPush: false,
        adaptiveBitrate: true,
        errorCorrection: true,
        ...userConfig.features
      },
      optimization: {
        enableCompression: true,
        enableCaching: true,
        enablePrefetch: true,
        enableBatching: true,
        ...userConfig.optimization
      }
    };
  }

  private initializeMetrics(): WebTransportMetrics {
    return {
      timestamp: Date.now(),
      connections: {
        total: 0,
        active: 0,
        failed: 0,
        migrating: 0
      },
      performance: {
        totalBandwidth: 0,
        averageLatency: 0,
        packetLossRate: 0,
        connectionUtilization: 0,
        throughput: 0
      },
      congestion: {
        algorithm: this.config.performance.congestionControl,
        windowSize: 65536, // 64KB initial
        cwnd: 65536,
        ssthresh: 0x7fffffff,
        recoveryMode: false
      },
      quality: {
        mos: 0,
        plr: 0,
        jitter: 0,
        bufferHealth: 1
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('WebTransport Optimization Service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing WebTransport Optimization Service...');
      
      // Check WebTransport support
      if (!this.checkWebTransportSupport()) {
        throw new Error('WebTransport not supported');
      }
      
      // Initialize transport pool
      await this.initializeTransportPool();
      
      // Initialize congestion controller
      await this.congestionController.initialize();
      
      // Start monitoring
      this.startMonitoring();
      
      this.isInitialized = true;
      console.log('✅ WebTransport Optimization Service initialized');
      console.log(`🌐 Protocol: ${this.config.transport.protocol}, Congestion Control: ${this.config.performance.congestionControl}`);
      
      this.dispatchEvent(new CustomEvent('webTransportInitialized', {
        detail: { 
          protocol: this.config.transport.protocol,
          connections: this.transportPool.length,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      console.error('Failed to initialize WebTransport Optimization Service:', error);
      throw error;
    }
  }

  private checkWebTransportSupport(): boolean {
    if (typeof WebTransport === 'undefined') {
      console.error('WebTransport is not supported');
      return false;
    }
    
    // Check for QUIC support
    const quicSupported = 'quic' in navigator || 'http3' in navigator;
    console.log('WebTransport features supported:', { webTransport: true, quic: quicSupported });
    return true;
  }

  private async initializeTransportPool(): Promise<void> {
    console.log(`🏊 Initializing transport pool with ${this.config.transport.maxConnections} connections`);
    
    for (let i = 0; i < this.config.transport.maxConnections; i++) {
      try {
        // Simulate WebTransport connection creation
        const transport = await this.createTransportConnection();
        this.transportPool.push(transport);
      } catch (error) {
        console.warn(`Failed to create transport connection ${i}:`, error);
      }
    }
    
    console.log(`✅ Transport pool initialized: ${this.transportPool.length} connections`);
  }

  private async createTransportConnection(): Promise<WebTransport> {
    // Simulate WebTransport connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation, this would create actual WebTransport connection
    const mockTransport = {} as WebTransport;
    return mockTransport;
  }

  public async createConnection(url: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('WebTransport Service not initialized');
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: TransportConnection = {
      connectionId,
      url,
      state: 'connecting',
      startTime: Date.now(),
      lastActivity: Date.now(),
      bytesTransmitted: 0,
      bytesReceived: 0,
      rtt: 0,
      packetLoss: 0,
      bandwidth: 0,
      congestionWindow: this.config.performance.bufferSize * 1024,
      streams: new Map(),
      datagrams: {
        sent: 0,
        received: 0,
        lost: 0,
        reordered: 0,
        averageSize: 1200,
        maxLatency: 0
      }
    };

    this.connections.set(connectionId, connection);
    this.currentMetrics.connections.total++;

    try {
      // Simulate connection establishment
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      connection.state = 'connected';
      connection.rtt = 30 + Math.random() * 50; // 30-80ms
      connection.bandwidth = 100 + Math.random() * 900; // 100-1000 Mbps
      
      this.currentMetrics.connections.active++;
      
      console.log(`🔗 WebTransport connection established: ${connectionId} (${connection.rtt.toFixed(2)}ms RTT)`);
      
      this.dispatchEvent(new CustomEvent('connectionEstablished', {
        detail: { connection, timestamp: Date.now() }
      }));

      return connectionId;

    } catch (error) {
      connection.state = 'error';
      this.currentMetrics.connections.failed++;
      
      console.error(`Failed to establish connection ${connectionId}:`, error);
      this.createAlert('connection', 'high', `Connection failed: ${connectionId}`);
      
      throw error;
    }
  }

  public async createStream(
    connectionId: string,
    type: TransportStream['type'] = 'reliable',
    direction: TransportStream['direction'] = 'bidirectional'
  ): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.state !== 'connected') {
      throw new Error(`Connection ${connectionId} not available`);
    }

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stream: TransportStream = {
      streamId,
      type,
      direction,
      state: 'open',
      bytesTransmitted: 0,
      bytesReceived: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      priority: Math.floor(Math.random() * 256)
    };

    connection.streams.set(streamId, stream);
    
    console.log(`📡 Stream created: ${streamId} on connection ${connectionId}`);
    
    this.dispatchEvent(new CustomEvent('streamCreated', {
      detail: { connectionId, stream, timestamp: Date.now() }
    }));

    return streamId;
  }

  public async sendData(
    connectionId: string,
    streamId: string,
    data: ArrayBuffer
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    const stream = connection?.streams.get(streamId);
    
    if (!connection || !stream) {
      throw new Error(`Connection ${connectionId} or stream ${streamId} not found`);
    }

    const startTime = Date.now();
    const dataSize = data.byteLength;
    
    try {
      // Apply congestion control
      const canSend = this.congestionController.canSend(dataSize);
      if (!canSend) {
        await this.congestionController.waitForWindow();
      }
      
      // Simulate data transmission
      await new Promise(resolve => setTimeout(resolve, dataSize / 100000)); // Simulate transmission time
      
      stream.bytesTransmitted += dataSize;
      connection.bytesTransmitted += dataSize;
      connection.lastActivity = Date.now();
      stream.lastActivity = Date.now();
      
      const transmissionTime = Date.now() - startTime;
      
      // Update congestion controller
      this.congestionController.onPacketSent(dataSize, transmissionTime);
      
      // Update metrics
      this.updateMetrics();
      
      console.log(`📤 Data sent: ${dataSize} bytes on stream ${streamId} (${transmissionTime}ms)`);
      
      this.dispatchEvent(new CustomEvent('dataSent', {
        detail: { connectionId, streamId, dataSize, transmissionTime, timestamp: Date.now() }
      }));

    } catch (error) {
      stream.state = 'error';
      console.error(`Failed to send data on stream ${streamId}:`, error);
      throw error;
    }
  }

  public async sendDatagram(
    connectionId: string,
    data: ArrayBuffer
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.state !== 'connected') {
      throw new Error(`Connection ${connectionId} not available`);
    }

    const dataSize = data.byteLength;
    const startTime = Date.now();
    
    try {
      // Simulate datagram transmission
      await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
      
      connection.datagrams.sent++;
      connection.bytesTransmitted += dataSize;
      connection.lastActivity = Date.now();
      
      const transmissionTime = Date.now() - startTime;
      connection.datagrams.maxLatency = Math.max(connection.datagrams.maxLatency, transmissionTime);
      
      console.log(`📦 Datagram sent: ${dataSize} bytes (${transmissionTime}ms)`);
      
      this.dispatchEvent(new CustomEvent('datagramSent', {
        detail: { connectionId, dataSize, transmissionTime, timestamp: Date.now() }
      }));

    } catch (error) {
      connection.datagrams.lost++;
      console.error(`Failed to send datagram:`, error);
      throw error;
    }
  }

  public async migrateConnection(connectionId: string, newUrl: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    if (!this.config.features.connectionMigration) {
      throw new Error('Connection migration not enabled');
    }

    console.log(`🔄 Migrating connection ${connectionId} to ${newUrl}`);
    
    connection.state = 'connecting';
    this.currentMetrics.connections.migrating++;
    
    try {
      // Simulate connection migration
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      connection.url = newUrl;
      connection.state = 'connected';
      connection.rtt = 30 + Math.random() * 50; // New RTT
      this.currentMetrics.connections.migrating--;
      
      console.log(`✅ Connection migrated: ${connectionId}`);
      
      this.dispatchEvent(new CustomEvent('connectionMigrated', {
        detail: { connectionId, newUrl, timestamp: Date.now() }
      }));

    } catch (error) {
      connection.state = 'error';
      this.currentMetrics.connections.migrating--;
      console.error(`Failed to migrate connection ${connectionId}:`, error);
      throw error;
    }
  }

  private updateMetrics(): void {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.state === 'connected');
    
    if (activeConnections.length === 0) {
      return;
    }
    
    // Calculate total bandwidth
    this.currentMetrics.performance.totalBandwidth = activeConnections
      .reduce((sum, conn) => sum + conn.bandwidth, 0);
    
    // Calculate average latency
    this.currentMetrics.performance.averageLatency = activeConnections
      .reduce((sum, conn) => sum + conn.rtt, 0) / activeConnections.length;
    
    // Calculate packet loss rate
    const totalDatagrams = activeConnections
      .reduce((sum, conn) => sum + conn.datagrams.sent, 0);
    const totalLost = activeConnections
      .reduce((sum, conn) => sum + conn.datagrams.lost, 0);
    this.currentMetrics.performance.packetLossRate = totalLost / Math.max(totalDatagrams, 1);
    
    // Calculate throughput
    const totalBytes = activeConnections
      .reduce((sum, conn) => sum + conn.bytesTransmitted + conn.bytesReceived, 0);
    const timeWindow = 1000; // 1 second
    this.currentMetrics.performance.throughput = (totalBytes * 8) / (timeWindow * 1000000); // Mbps
    
    // Update congestion metrics
    this.currentMetrics.congestion = this.congestionController.getMetrics();
    
    // Calculate quality metrics
    this.currentMetrics.quality.mos = this.calculateMOS();
    this.currentMetrics.quality.plr = this.currentMetrics.performance.packetLossRate;
    this.currentMetrics.quality.jitter = this.calculateJitter();
    this.currentMetrics.quality.bufferHealth = this.calculateBufferHealth();
    
    // Update connection utilization
    const maxConnections = this.config.transport.maxConnections;
    this.currentMetrics.performance.connectionUtilization = activeConnections.length / maxConnections;
  }

  private calculateMOS(): number {
    // Simplified MOS calculation based on latency and packet loss
    const latency = this.currentMetrics.performance.averageLatency;
    const packetLoss = this.currentMetrics.performance.packetLossRate;
    
    let mos = 4.5; // Start with excellent
    
    // Penalize high latency
    if (latency > 150) mos -= 1.0;
    else if (latency > 100) mos -= 0.5;
    else if (latency > 50) mos -= 0.2;
    
    // Penalize packet loss
    if (packetLoss > 0.05) mos -= 1.5;
    else if (packetLoss > 0.02) mos -= 0.8;
    else if (packetLoss > 0.01) mos -= 0.3;
    
    return Math.max(1.0, Math.min(4.5, mos));
  }

  private calculateJitter(): number {
    // Simplified jitter calculation
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.state === 'connected');
    
    if (connections.length === 0) return 0;
    
    const rttValues = connections.map(conn => conn.rtt);
    const avgRtt = rttValues.reduce((sum, rtt) => sum + rtt, 0) / rttValues.length;
    
    const variance = rttValues.reduce((sum, rtt) => sum + Math.pow(rtt - avgRtt, 2), 0) / rttValues.length;
    return Math.sqrt(variance);
  }

  private calculateBufferHealth(): number {
    // Simplified buffer health calculation
    const totalBuffer = this.currentMetrics.congestion.windowSize;
    const maxBuffer = this.config.performance.bufferSize * 1024;
    return Math.min(1.0, totalBuffer / maxBuffer);
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.detectIssues();
      this.updateHistoricalData();
    }, 1000); // Collect metrics every second
  }

  private collectMetrics(): void {
    this.currentMetrics.timestamp = Date.now();
    this.updateMetrics();
    
    // Update connection counts
    this.currentMetrics.connections.active = Array.from(this.connections.values())
      .filter(conn => conn.state === 'connected').length;
  }

  private detectIssues(): void {
    // Check for high latency
    if (this.currentMetrics.performance.averageLatency > 200) {
      this.createAlert('performance', 'high', 
        `High latency: ${this.currentMetrics.performance.averageLatency.toFixed(2)}ms`);
    }
    
    // Check for high packet loss
    if (this.currentMetrics.performance.packetLossRate > 0.05) {
      this.createAlert('quality', 'high', 
        `High packet loss: ${(this.currentMetrics.performance.packetLossRate * 100).toFixed(2)}%`);
    }
    
    // Check for low quality
    if (this.currentMetrics.quality.mos < 3.0) {
      this.createAlert('quality', 'medium', 
        `Poor quality: MOS ${this.currentMetrics.quality.mos.toFixed(2)}`);
    }
    
    // Check for connection failures
    const failureRate = this.currentMetrics.connections.failed / Math.max(this.currentMetrics.connections.total, 1);
    if (failureRate > 0.2) {
      this.createAlert('connection', 'high', 
        `High connection failure rate: ${(failureRate * 100).toFixed(2)}%`);
    }
  }

  private createAlert(
    type: WebTransportAlert['type'], 
    severity: WebTransportAlert['severity'], 
    message: string
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: WebTransportAlert = {
      alertId,
      type,
      severity,
      message,
      metrics: this.currentMetrics,
      recommendation: this.getRecommendation(type, severity),
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    
    console.warn(`🚨 WebTransport Alert [${severity.toUpperCase()}]: ${message}`);
    
    this.dispatchEvent(new CustomEvent('webTransportAlert', {
      detail: { alert, timestamp: Date.now() }
    }));
  }

  private getRecommendation(type: WebTransportAlert['type'], severity: WebTransportAlert['severity']): string {
    const recommendations = {
      connection: {
        critical: 'Check network connectivity and server availability',
        high: 'Retry connection with exponential backoff',
        medium: 'Monitor connection stability',
        low: 'Connection performance is acceptable'
      },
      performance: {
        critical: 'Switch to alternative congestion control algorithm',
        high: 'Adjust buffer sizes and timeouts',
        medium: 'Optimize connection parameters',
        low: 'Performance is within acceptable range'
      },
      congestion: {
        critical: 'Reduce sending rate immediately',
        high: 'Implement aggressive congestion avoidance',
        medium: 'Monitor congestion window',
        low: 'Congestion control is working properly'
      },
      security: {
        critical: 'Terminate connection and investigate',
        high: 'Verify certificate chain',
        medium: 'Monitor security events',
        low: 'Security parameters are valid'
      },
      quality: {
        critical: 'Switch to lower quality profile',
        high: 'Adjust bitrate and resolution',
        medium: 'Monitor quality metrics',
        low: 'Quality is acceptable'
      }
    };
    
    return recommendations[type]?.[severity] || 'Monitor system performance';
  }

  private updateHistoricalData(): void {
    this.historicalMetrics.push({ ...this.currentMetrics });
    
    // Keep only last 1000 data points
    if (this.historicalMetrics.length > 1000) {
      this.historicalMetrics.shift();
    }
  }

  public getMetrics(): WebTransportMetrics {
    return { ...this.currentMetrics };
  }

  public getHistoricalMetrics(limit: number = 100): WebTransportMetrics[] {
    return this.historicalMetrics.slice(-limit);
  }

  public getActiveConnections(): TransportConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.state === 'connected');
  }

  public getConnection(connectionId: string): TransportConnection | undefined {
    return this.connections.get(connectionId);
  }

  public getAlerts(): WebTransportAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.dispatchEvent(new CustomEvent('alertResolved', {
        detail: { alert, timestamp: Date.now() }
      }));
      return true;
    }
    return false;
  }

  public updateCongestionControl(algorithm: WebTransportConfig['performance']['congestionControl']): void {
    this.config.performance.congestionControl = algorithm;
    this.congestionController = new CongestionController(algorithm);
    console.log(`🎛️ Congestion control changed to: ${algorithm}`);
    
    this.dispatchEvent(new CustomEvent('congestionControlChanged', {
      detail: { algorithm, timestamp: Date.now() }
    }));
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.state = 'disconnected';
      this.connections.delete(connectionId);
      
      if (this.currentMetrics.connections.active > 0) {
        this.currentMetrics.connections.active--;
      }
      
      console.log(`🔌 Connection closed: ${connectionId}`);
      
      this.dispatchEvent(new CustomEvent('connectionClosed', {
        detail: { connectionId, timestamp: Date.now() }
      }));
    }
  }

  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Close all connections
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(connectionIds.map(id => this.closeConnection(id)));
    
    // Clean up resources
    this.transportPool = [];
    this.connections.clear();
    this.alerts.clear();
    
    this.isInitialized = false;
    
    console.log('🛑 WebTransport Optimization Service stopped');
    
    this.dispatchEvent(new CustomEvent('webTransportStopped', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Congestion Controller implementation
class CongestionController {
  private algorithm: string;
  private cwnd: number; // congestion window
  private ssthresh: number; // slow start threshold
  private bytesInFlight: number;
  private minRtt: number;
  private maxBandwidth: number;
  private pacingRate: number;

  constructor(algorithm: string) {
    this.algorithm = algorithm;
    this.cwnd = 65536; // 64KB initial
    this.ssthresh = 0x7fffffff;
    this.bytesInFlight = 0;
    this.minRtt = Infinity;
    this.maxBandwidth = 0;
    this.pacingRate = 0;
  }

  public async initialize(): Promise<void> {
    console.log(`🎛️ Initializing congestion controller: ${this.algorithm}`);
  }

  public canSend(bytes: number): boolean {
    return this.bytesInFlight + bytes <= this.cwnd;
  }

  public async waitForWindow(): Promise<void> {
    while (!this.canSend(1200)) { // MTU size
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  public onPacketSent(bytes: number, rtt: number): void {
    this.bytesInFlight += bytes;
    this.minRtt = Math.min(this.minRtt, rtt);
    
    // Update pacing rate
    this.updatePacingRate();
  }

  public onPacketAcked(bytes: number, rtt: number): void {
    this.bytesInFlight -= bytes;
    
    switch (this.algorithm) {
      case 'bbr':
        this.bbrOnAck(bytes, rtt);
        break;
      case 'cubic':
        this.cubicOnAck(bytes);
        break;
      default:
        this.defaultOnAck(bytes);
    }
  }

  private bbrOnAck(bytes: number, rtt: number): void {
    // Simplified BBR implementation
    const bandwidth = bytes / (rtt / 1000); // bytes per second
    this.maxBandwidth = Math.max(this.maxBandwidth, bandwidth);
    
    // BBR pacing
    const targetCwnd = this.maxBandwidth * (this.minRtt / 1000);
    this.cwnd = Math.min(targetCwnd * 2, this.cwnd + bytes);
  }

  private cubicOnAck(bytes: number): void {
    // Simplified CUBIC implementation
    if (this.cwnd < this.ssthresh) {
      // Slow start
      this.cwnd += bytes;
    } else {
      // Congestion avoidance
      this.cwnd += bytes * bytes / this.cwnd;
    }
  }

  private defaultOnAck(bytes: number): void {
    // Default TCP-like congestion control
    if (this.cwnd < this.ssthresh) {
      this.cwnd += bytes; // Slow start
    } else {
      this.cwnd += bytes * bytes / this.cwnd; // Congestion avoidance
    }
  }

  private updatePacingRate(): void {
    this.pacingRate = this.cwnd / (this.minRtt / 1000);
  }

  public getMetrics() {
    return {
      algorithm: this.algorithm,
      windowSize: this.cwnd,
      cwnd: this.cwnd,
      ssthresh: this.ssthresh,
      recoveryMode: false
    };
  }
}

export { WebTransportOptimizationService, WebTransportConfig, TransportConnection, TransportStream, WebTransportMetrics, WebTransportAlert };
