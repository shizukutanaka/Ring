/**
 * SVC (Scalable Video Coding) Layer Manager
 *
 * Manages spatial and temporal layers for VP9 and AV1
 * Enables bandwidth-aware quality adaptation without re-encoding
 *
 * Reference: W3C WebRTC-SVC specification, Chrome VP9 SVC layer cake
 */

const { EventEmitter } = require('events');

class SVCLayerManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.callId = options.callId;
    this.codec = options.codec || 'vp9'; // 'vp9', 'av1'

    // SVC scalability modes (W3C standard)
    this.scalabilityModes = {
      vp9: {
        'L1T1': {
          name: 'Single Layer',
          spatialLayers: 1,
          temporalLayers: 1,
          description: 'No scalability - single quality'
        },
        'L1T2': {
          name: 'Temporal Scalability',
          spatialLayers: 1,
          temporalLayers: 2,
          description: 'Two temporal layers: 15fps + 15fps = 30fps',
          resolutions: [
            { width: 1280, height: 720, fps: 15, bitrate: 1000 },
            { width: 1280, height: 720, fps: 30, bitrate: 2000 }
          ]
        },
        'L1T3': {
          name: 'Temporal Scalability (3-layer)',
          spatialLayers: 1,
          temporalLayers: 3,
          description: '3 temporal layers',
          resolutions: [
            { width: 1280, height: 720, fps: 10, bitrate: 600 },
            { width: 1280, height: 720, fps: 20, bitrate: 1200 },
            { width: 1280, height: 720, fps: 30, bitrate: 2000 }
          ]
        },
        'L2T1': {
          name: 'Spatial Scalability',
          spatialLayers: 2,
          temporalLayers: 1,
          description: 'Two spatial layers with 2:1 resolution ratio',
          resolutions: [
            { width: 640, height: 360, fps: 30, bitrate: 600 },
            { width: 1280, height: 720, fps: 30, bitrate: 1500 }
          ]
        },
        'L2T2': {
          name: 'Spatial + Temporal Scalability (STANDARD)',
          spatialLayers: 2,
          temporalLayers: 2,
          description: 'VP9 standard: 2 spatial (2:1 ratio) + 2 temporal (2x FPS)',
          resolutions: [
            { width: 640, height: 360, fps: 15, bitrate: 400 },
            { width: 640, height: 360, fps: 30, bitrate: 800 },
            { width: 1280, height: 720, fps: 15, bitrate: 1000 },
            { width: 1280, height: 720, fps: 30, bitrate: 2000 }
          ]
        },
        'L2T2_KEY_SHIFT': {
          name: 'Spatial + Temporal (Key Frame Shifted)',
          spatialLayers: 2,
          temporalLayers: 2,
          keyFrameShift: true,
          description: 'VP9 mode where spatial layers depend on key frames'
        },
        'L3T1': {
          name: '3-Layer Spatial',
          spatialLayers: 3,
          temporalLayers: 1,
          description: 'Three spatial layers with 2:1 ratio progression'
        },
        'L3T2': {
          name: '3-Layer Spatial + Temporal',
          spatialLayers: 3,
          temporalLayers: 2,
          description: 'Three spatial + two temporal layers'
        },
        'L3T3': {
          name: '3-Layer Spatial + 3-Layer Temporal',
          spatialLayers: 3,
          temporalLayers: 3,
          description: '3S3T configuration'
        }
      },

      av1: {
        'L1T1': {
          name: 'Single Layer',
          spatialLayers: 1,
          temporalLayers: 1,
          description: 'No scalability'
        },
        'L2T1': {
          name: 'Spatial Scalability',
          spatialLayers: 2,
          temporalLayers: 1,
          description: 'Two spatial layers'
        },
        'L2T2': {
          name: 'Spatial + Temporal Scalability',
          spatialLayers: 2,
          temporalLayers: 2,
          description: 'AV1 2-spatial, 2-temporal'
        },
        'L3T1': {
          name: '3-Layer Spatial',
          spatialLayers: 3,
          temporalLayers: 1,
          description: 'Three spatial layers'
        },
        'L3T2': {
          name: '3-Layer Spatial + 2-Layer Temporal',
          spatialLayers: 3,
          temporalLayers: 2,
          description: 'L3T2 configuration'
        },
        'L3T3': {
          name: '3-Layer Spatial + 3-Layer Temporal (RECOMMENDED)',
          spatialLayers: 3,
          temporalLayers: 3,
          description: 'AV1 standard: 3S3T for maximum flexibility',
          resolutions: [
            { spatial: 0, temporal: 0, width: 426, height: 240, fps: 10, bitrate: 200 },
            { spatial: 0, temporal: 1, width: 426, height: 240, fps: 20, bitrate: 400 },
            { spatial: 0, temporal: 2, width: 426, height: 240, fps: 30, bitrate: 600 },

            { spatial: 1, temporal: 0, width: 852, height: 480, fps: 10, bitrate: 400 },
            { spatial: 1, temporal: 1, width: 852, height: 480, fps: 20, bitrate: 800 },
            { spatial: 1, temporal: 2, width: 852, height: 480, fps: 30, bitrate: 1200 },

            { spatial: 2, temporal: 0, width: 1920, height: 1080, fps: 10, bitrate: 1000 },
            { spatial: 2, temporal: 1, width: 1920, height: 1080, fps: 20, bitrate: 2000 },
            { spatial: 2, temporal: 2, width: 1920, height: 1080, fps: 30, bitrate: 3000 }
          ]
        }
      }
    };

    // Current SVC configuration
    this.config = {
      scalabilityMode: options.scalabilityMode || this.getRecommendedMode(),
      activeLayers: [],
      encodingParams: {}
    };

    // Layer state
    this.state = {
      activeLayerCount: 0,
      droppedLayers: [],
      activeResolutions: [],
      totalBitrate: 0,
      lastUpdate: Date.now()
    };

    // Monitoring
    this.monitoringInterval = null;
  }

  /**
   * Get recommended scalability mode for codec
   */
  getRecommendedMode() {
    if (this.codec === 'av1') {
      return 'L3T3'; // AV1 standard
    }
    return 'L2T2'; // VP9 standard
  }

  /**
   * Configure SVC encoding
   */
  configureEncoding(scalabilityMode) {
    const modeConfig = this.scalabilityModes[this.codec][scalabilityMode];

    if (!modeConfig) {
      throw new Error(`Unknown scalability mode: ${scalabilityMode}`);
    }

    console.log(`📊 Configuring ${this.codec.toUpperCase()} SVC: ${scalabilityMode}`);
    console.log(`   ${modeConfig.name}`);
    console.log(`   Spatial layers: ${modeConfig.spatialLayers}, Temporal layers: ${modeConfig.temporalLayers}`);

    this.config.scalabilityMode = scalabilityMode;
    this.config.modeConfig = modeConfig;

    // Generate encoding parameters for each layer
    this.generateEncodingParams();

    this.emit('svc:configured', {
      codec: this.codec,
      mode: scalabilityMode,
      config: modeConfig
    });

    return modeConfig;
  }

  /**
   * Generate encoding parameters for all layers
   */
  generateEncodingParams() {
    const mode = this.config.modeConfig;
    const params = [];

    const resolutions = mode.resolutions || this.generateDefaultResolutions(mode);

    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      const rid = `l${i}`; // Layer identifier: l0, l1, l2, etc.

      params.push({
        rid,
        active: true,
        maxBitrate: (res.bitrate * 1000) || (res.bitrate * 1.2 * 1000),
        targetBitrate: (res.bitrate * 1000) || undefined,
        scaleResolutionDownBy: res.scaleResolutionDownBy || 1,
        maxFramerate: res.fps || 30,
        width: res.width,
        height: res.height,
        fps: res.fps,
        description: `SVC Layer ${i}: ${res.width}x${res.height} @ ${res.fps}fps, ${res.bitrate}kbps`
      });
    }

    this.config.encodingParams = params;

    return params;
  }

  /**
   * Generate default resolutions for scalability mode
   */
  generateDefaultResolutions(mode) {
    const { spatialLayers, temporalLayers } = mode;
    const resolutions = [];

    // VP9/AV1 standard: spatial layers with 2:1 resolution ratio
    const baseSpatialResolutions = [
      { width: 640, height: 360 },   // S0
      { width: 1280, height: 720 },  // S1 (2x resolution)
      { width: 1920, height: 1080 }  // S2 (2x resolution)
    ];

    const temporalFPS = [10, 20, 30]; // T0, T1, T2

    for (let s = 0; s < spatialLayers; s++) {
      const spatial = baseSpatialResolutions[s];

      for (let t = 0; t < temporalLayers; t++) {
        const bitrates = {
          '360p_T0': 400, '360p_T1': 800, '360p_T2': 1200,
          '720p_T0': 1000, '720p_T1': 1500, '720p_T2': 2000,
          '1080p_T0': 2000, '1080p_T1': 3000, '1080p_T2': 4000
        };

        const key = `${spatial.height}p_T${t}`;
        const bitrate = bitrates[key] || 1000;

        resolutions.push({
          spatial: s,
          temporal: t,
          width: spatial.width,
          height: spatial.height,
          fps: temporalFPS[t],
          bitrate
        });
      }
    }

    return resolutions;
  }

  /**
   * Enable/disable specific layers based on bandwidth
   */
  adaptLayers(availableBitrate) {
    const modeConfig = this.config.modeConfig;
    const resolutions = modeConfig.resolutions || this.generateDefaultResolutions(modeConfig);

    // Sort by bitrate (ascending)
    const sortedResolutions = [...resolutions].sort((a, b) => a.bitrate - b.bitrate);

    const activeLayers = [];
    let totalBitrate = 0;

    // Enable layers up to available bandwidth
    for (const res of sortedResolutions) {
      if (totalBitrate + res.bitrate <= availableBitrate) {
        activeLayers.push(res);
        totalBitrate += res.bitrate;
      } else {
        // Can't afford this layer
        break;
      }
    }

    // Always enable at least the lowest quality layer
    if (activeLayers.length === 0 && resolutions.length > 0) {
      activeLayers.push(sortedResolutions[0]);
      totalBitrate = sortedResolutions[0].bitrate;
    }

    this.state.activeLayerCount = activeLayers.length;
    this.state.droppedLayers = resolutions.filter(r => !activeLayers.includes(r));
    this.state.activeResolutions = activeLayers.map(r =>
      `${r.width}x${r.height}@${r.fps}fps`
    );
    this.state.totalBitrate = totalBitrate;

    console.log(`📊 Layer adaptation: ${activeLayers.length}/${resolutions.length} layers (${totalBitrate}kbps)`);

    this.emit('layers:adapted', {
      activeLayers,
      droppedLayers: this.state.droppedLayers,
      totalBitrate,
      availableBitrate
    });

    return activeLayers;
  }

  /**
   * Get current SVC status
   */
  getStatus() {
    return {
      callId: this.callId,
      codec: this.codec,
      scalabilityMode: this.config.scalabilityMode,
      modeConfig: this.config.modeConfig,
      activeLayerCount: this.state.activeLayerCount,
      activeResolutions: this.state.activeResolutions,
      totalBitrate: this.state.totalBitrate,
      droppedLayers: this.state.droppedLayers
    };
  }

  /**
   * Get encoding parameters for WebRTC
   */
  getEncodingParameters() {
    return this.config.encodingParams.map(param => ({
      rid: param.rid,
      active: param.active,
      maxBitrate: param.maxBitrate,
      maxFramerate: param.maxFramerate,
      scaleResolutionDownBy: param.scaleResolutionDownBy
    }));
  }

  /**
   * Compare SVC vs Simulcast
   */
  compareWithSimulcast() {
    const svcConfig = this.config.modeConfig;
    const svcBitrate = this.state.totalBitrate;

    // Simulcast would need 3 full encodings
    const simulcastBitrates = [1000, 1500, 2000]; // Low, medium, high quality
    const simulcastTotalBitrate = simulcastBitrates.reduce((a, b) => a + b, 0);

    return {
      svc: {
        totalBitrate: svcBitrate,
        cpuUsage: 'Single encoding',
        layers: this.state.activeLayerCount,
        efficiency: 'High - single encoding with layer dropping'
      },
      simulcast: {
        totalBitrate: simulcastTotalBitrate,
        cpuUsage: `3x encoding (${3 * 100}% higher)`,
        layers: 3,
        efficiency: 'Low - redundant encoding of all layers'
      },
      savings: {
        bitrate: ((1 - svcBitrate / simulcastTotalBitrate) * 100).toFixed(1) + '%',
        cpu: '66% reduction (single vs triple encoding)',
        quality: 'Maintains same quality options'
      }
    };
  }

  /**
   * Get recommended configuration
   */
  getRecommendation(bandwidth) {
    if (this.codec === 'av1') {
      if (bandwidth > 5000) return 'L3T3'; // Full configuration
      if (bandwidth > 2500) return 'L2T2';
      if (bandwidth > 1000) return 'L1T3';
      return 'L1T1';
    }

    // VP9 recommendations
    if (bandwidth > 4000) return 'L2T2';
    if (bandwidth > 2000) return 'L1T2';
    return 'L1T1';
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      callId: this.callId,
      codec: this.codec,
      configuration: {
        scalabilityMode: this.config.scalabilityMode,
        modeConfig: this.config.modeConfig,
        encodingParams: this.config.encodingParams
      },
      state: this.state,
      comparison: this.compareWithSimulcast(),
      availableModes: Object.keys(this.scalabilityModes[this.codec])
    };
  }

  /**
   * Start layer monitoring
   */
  startMonitoring(interval = 5000) {
    console.log(`📊 Starting SVC layer monitoring for ${this.codec.toUpperCase()}`);

    this.monitoringInterval = setInterval(() => {
      this.emit('monitoring:tick', this.getStatus());
    }, interval);

    return this;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

module.exports = SVCLayerManager;
