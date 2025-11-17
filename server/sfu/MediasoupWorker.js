/**
 * Mediasoup SFU (Selective Forwarding Unit) Worker
 *
 * Manages WebRTC peer connections and media routing for call recording.
 * - Creates and manages SFU router instances
 * - Handles producer/consumer creation
 * - Manages recording of audio/video streams
 * - Integrates with FFmpeg for encoding
 */

const mediasoup = require('mediasoup');
const os = require('os');
const EventEmitter = require('events');

class MediasoupWorker extends EventEmitter {
  constructor(options = {}) {
    super();

    this.worker = null;
    this.routers = new Map(); // callId -> router
    this.peers = new Map();   // peerId -> peer state
    this.producerConsumerMap = new Map(); // producerId -> [consumerIds]

    this.config = {
      logLevel: options.logLevel || 'warn',
      logTags: options.logTags || [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        'rtx',
        'bwe',
        'score',
        'simulcast',
        'svc'
      ],
      rtcMinPort: options.rtcMinPort || 40000,
      rtcMaxPort: options.rtcMaxPort || 57000,
      numberOfWorkers: options.numberOfWorkers || Math.max(1, os.cpus().length / 2)
    };

    this.mediaCodecOptions = {
      audio: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
          parameters: {
            useinbandfec: 1,
            usedtx: 1,
            maxaveragebitrate: 256000,
            maxplaybackrate: 48000,
            stereo: 1
          }
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMU',
          clockRate: 8000,
          channels: 1
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMA',
          clockRate: 8000,
          channels: 1
        }
      ],
      video: [
        // AV1 (preferred - best compression)
        {
          kind: 'video',
          mimeType: 'video/AV1',
          clockRate: 90000,
          parameters: {
            'profile-id': 0,
            'level-idx': 31,
            'tier': 0,
            'scalabilityMode': 'L1T2'
          }
        },
        // VP9
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 0
          }
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 1
          }
        },
        // VP8
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000
        },
        // H.264
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'level-asymmetry-allowed': 1,
            'packetization-mode': 1,
            'profile-level-id': '42e01f'
          }
        }
      ]
    };

    this.routerConfig = {
      mediaCodecs: [...this.mediaCodecOptions.audio, ...this.mediaCodecOptions.video]
    };

    this.webRtcTransportConfig = {
      listenInfos: [
        {
          protocol: 'udp',
          ip: options.webRtcIp || '0.0.0.0',
          announcedIp: options.announcedIp || '127.0.0.1'
        }
      ],
      initialAvailableOutgoingBitrate: 1000000,
      maxIncomingBitrate: 1500000
    };

    this.plainRtpTransportConfig = {
      listenInfos: [
        {
          protocol: 'tcp',
          ip: options.plainRtpIp || '127.0.0.1',
          announcedIp: options.announcedIp || '127.0.0.1'
        }
      ]
    };
  }

  /**
   * Initialize Mediasoup worker
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Mediasoup worker...');

      // Create worker
      this.worker = await mediasoup.createWorker({
        logLevel: this.config.logLevel,
        logTags: this.config.logTags,
        rtcMinPort: this.config.rtcMinPort,
        rtcMaxPort: this.config.rtcMaxPort
      });

      // Handle worker events
      this.worker.on('died', () => {
        console.error('❌ Mediasoup worker died, restarting...');
        this.emit('worker:died');
      });

      console.log(`✅ Mediasoup worker initialized (PID: ${this.worker.pid})`);
      this.emit('worker:ready');

      return this.worker;
    } catch (err) {
      console.error('Failed to initialize Mediasoup:', err);
      throw err;
    }
  }

  /**
   * Create router for a call
   */
  async createRouter(callId) {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (this.routers.has(callId)) {
      return this.routers.get(callId);
    }

    try {
      const router = await this.worker.createRouter(this.routerConfig);

      // Handle router events
      router.on('rtptrace', (trace) => {
        // console.log('RTP trace:', trace);
      });

      this.routers.set(callId, router);
      console.log(`✅ Router created for call: ${callId}`);

      return router;
    } catch (err) {
      console.error(`Failed to create router for call ${callId}:`, err);
      throw err;
    }
  }

  /**
   * Create WebRTC transport (for clients)
   */
  async createWebRtcTransport(callId) {
    try {
      const router = await this.createRouter(callId);

      const transport = await router.createWebRtcTransport(
        this.webRtcTransportConfig
      );

      // Handle transport events
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'failed') {
          console.warn(`Transport DTLS failed for ${transport.id}`);
          transport.close();
        }
      });

      console.log(`✅ WebRTC transport created: ${transport.id}`);

      return {
        transport,
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          sctpParameters: transport.sctpParameters
        }
      };
    } catch (err) {
      console.error('Failed to create WebRTC transport:', err);
      throw err;
    }
  }

  /**
   * Connect transport with DTLS parameters from client
   */
  async connectTransport(transport, dtlsParameters) {
    try {
      await transport.connect({ dtlsParameters });
      console.log(`✅ Transport connected: ${transport.id}`);
    } catch (err) {
      console.error('Failed to connect transport:', err);
      throw err;
    }
  }

  /**
   * Create producer (for receiving media from client)
   */
  async createProducer(transport, kind, rtpParameters, appData = {}) {
    try {
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: {
          ...appData,
          createdAt: new Date().toISOString()
        }
      });

      // Handle producer events
      producer.on('score', (score) => {
        // console.log(`Producer ${producer.id} score:`, score);
      });

      console.log(`✅ Producer created: ${producer.id} (${kind})`);

      return producer;
    } catch (err) {
      console.error('Failed to create producer:', err);
      throw err;
    }
  }

  /**
   * Create consumer (for sending media to client)
   */
  async createConsumer(transport, producer, rtpCapabilities) {
    try {
      // Check if router can consume
      if (!this.worker.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        console.warn('Cannot consume produced media');
        return null;
      }

      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: true // Start paused
      });

      // Handle consumer events
      consumer.on('score', (score) => {
        // console.log(`Consumer ${consumer.id} score:`, score);
      });

      console.log(`✅ Consumer created: ${consumer.id}`);

      // Track producer-consumer relationship for recording
      if (!this.producerConsumerMap.has(producer.id)) {
        this.producerConsumerMap.set(producer.id, []);
      }
      this.producerConsumerMap.get(producer.id).push(consumer.id);

      return consumer;
    } catch (err) {
      console.error('Failed to create consumer:', err);
      throw err;
    }
  }

  /**
   * Create PlainRTP transport for recording
   */
  async createPlainRtpTransport(callId) {
    try {
      const router = await this.createRouter(callId);

      const transport = await router.createPlainRtpTransport(
        this.plainRtpTransportConfig
      );

      console.log(`✅ PlainRTP transport created: ${transport.id}`);

      return {
        transport,
        params: {
          id: transport.id,
          ip: transport.tuple.localIp,
          port: transport.tuple.localPort,
          rtcpPort: transport.rtcpTuple ? transport.rtcpTuple.localPort : null
        }
      };
    } catch (err) {
      console.error('Failed to create PlainRTP transport:', err);
      throw err;
    }
  }

  /**
   * Get router statistics
   */
  async getRouterStats(callId) {
    const router = this.routers.get(callId);
    if (!router) {
      return null;
    }

    try {
      return {
        id: router.id,
        transports: router.transports.size,
        producers: router.producers.size,
        consumers: router.consumers.size,
        dataProducers: router.dataProducers.size,
        dataConsumers: router.dataConsumers.size
      };
    } catch (err) {
      console.error('Failed to get router stats:', err);
      return null;
    }
  }

  /**
   * Close router (cleanup call)
   */
  async closeRouter(callId) {
    const router = this.routers.get(callId);
    if (!router) {
      return;
    }

    try {
      router.close();
      this.routers.delete(callId);
      console.log(`✅ Router closed for call: ${callId}`);
    } catch (err) {
      console.error(`Failed to close router for call ${callId}:`, err);
    }
  }

  /**
   * Cleanup all routers
   */
  async cleanup() {
    console.log('🧹 Cleaning up Mediasoup worker...');

    for (const [callId, router] of this.routers.entries()) {
      try {
        router.close();
      } catch (err) {
        console.error(`Error closing router ${callId}:`, err);
      }
    }

    this.routers.clear();
    this.peers.clear();
    this.producerConsumerMap.clear();

    if (this.worker) {
      this.worker.close();
      this.worker = null;
    }

    console.log('✅ Cleanup complete');
  }

  /**
   * Get worker status
   */
  getStatus() {
    if (!this.worker) {
      return { status: 'offline' };
    }

    return {
      status: 'online',
      pid: this.worker.pid,
      routersCount: this.routers.size,
      peersCount: this.peers.size
    };
  }
}

module.exports = MediasoupWorker;
