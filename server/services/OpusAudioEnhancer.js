/**
 * Opus Audio Enhancer Service
 * 
 * Implements advanced Opus codec features for improved audio quality:
 * - Forward Error Correction (FEC) for packet loss recovery
 * - Redundant Audio Data (RED) for critical streams
 * - Dynamic bitrate adjustment based on network conditions
 * - Discontinuous Transmission (DTX) for bandwidth savings
 * 
 * Based on 2024-2025 WebRTC best practices
 */

class OpusAudioEnhancer {
  constructor(options = {}) {
    this.config = {
      // Opus FEC settings
      fecEnabled: options.fecEnabled !== undefined ? options.fecEnabled : true,
      
      // RED (Redundant Audio Data) settings
      redEnabled: options.redEnabled !== undefined ? options.redEnabled : true,
      redDistance: options.redDistance || 2, // Number of packets to duplicate
      
      // DTX (Discontinuous Transmission) for silence suppression
      dtxEnabled: options.dtxEnabled !== undefined ? options.dtxEnabled : true,
      
      // Adaptive bitrate settings
      minBitrate: options.minBitrate || 16000,  // 16 kbps minimum
      maxBitrate: options.maxBitrate || 128000, // 128 kbps maximum
      targetBitrate: options.targetBitrate || 64000, // 64 kbps default
      
      // Network condition thresholds
      packetLossThreshold: options.packetLossThreshold || 0.05, // 5%
      jitterThreshold: options.jitterThreshold || 30, // 30ms
      
      // Quality levels
      qualityLevel: options.qualityLevel || 'high' // 'low', 'medium', 'high'
    };
    
    this.networkStats = {
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      bandwidth: 0
    };
    
    this.currentBitrate = this.config.targetBitrate;
  }

  /**
   * Apply Opus enhancements to audio sender
   * @param {RTCRtpSender} audioSender - WebRTC audio sender
   * @returns {Promise<Object>} Applied configuration
   */
  async applyEnhancements(audioSender) {
    try {
      if (!audioSender || audioSender.track?.kind !== 'audio') {
        throw new Error('Invalid audio sender');
      }

      const parameters = audioSender.getParameters();
      
      if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
      }

      const encoding = parameters.encodings[0];

      // Enable FEC (Forward Error Correction)
      if (this.config.fecEnabled) {
        encoding.fec = { enabled: true };
      }

      // Enable DTX (Discontinuous Transmission)
      if (this.config.dtxEnabled) {
        encoding.dtx = true;
      }

      // Set bitrate constraints
      encoding.maxBitrate = this.config.maxBitrate;
      encoding.minBitrate = this.config.minBitrate;

      // Apply current adaptive bitrate
      if (this.currentBitrate) {
        encoding.maxBitrate = this.currentBitrate;
      }

      // Set codec-specific parameters for Opus
      if (parameters.codecs) {
        const opusCodec = parameters.codecs.find(codec => 
          codec.mimeType.toLowerCase() === 'audio/opus'
        );
        
        if (opusCodec) {
          // Configure Opus-specific parameters
          opusCodec.sdpFmtpLine = this._buildOpusFmtpLine();
        }
      }

      await audioSender.setParameters(parameters);

      console.log('[OpusAudioEnhancer] Applied enhancements:', {
        fec: this.config.fecEnabled,
        dtx: this.config.dtxEnabled,
        bitrate: this.currentBitrate,
        quality: this.config.qualityLevel
      });

      return {
        success: true,
        config: {
          fec: this.config.fecEnabled,
          dtx: this.config.dtxEnabled,
          red: this.config.redEnabled,
          bitrate: this.currentBitrate
        }
      };
    } catch (error) {
      console.error('[OpusAudioEnhancer] Error applying enhancements:', error);
      throw error;
    }
  }

  /**
   * Build Opus FMTP line for SDP
   * @returns {string} FMTP parameters
   */
  _buildOpusFmtpLine() {
    const params = [];
    
    // Set quality parameters based on quality level
    switch (this.config.qualityLevel) {
      case 'high':
        params.push('maxaveragebitrate=128000');
        params.push('stereo=1');
        params.push('sprop-stereo=1');
        params.push('cbr=0'); // Variable bitrate for better quality
        break;
      case 'medium':
        params.push('maxaveragebitrate=64000');
        params.push('stereo=0');
        params.push('cbr=0');
        break;
      case 'low':
        params.push('maxaveragebitrate=32000');
        params.push('stereo=0');
        params.push('cbr=1'); // Constant bitrate for predictability
        break;
    }

    // Enable in-band FEC
    if (this.config.fecEnabled) {
      params.push('useinbandfec=1');
    }

    // Enable DTX
    if (this.config.dtxEnabled) {
      params.push('usedtx=1');
    }

    // Set packet loss percentage expectation
    params.push('ptime=20'); // 20ms packet time
    params.push('maxptime=60'); // Maximum 60ms

    return params.join(';');
  }

  /**
   * Update network statistics and adjust bitrate adaptively
   * @param {Object} stats - Network statistics from getStats()
   */
  updateNetworkStats(stats) {
    this.networkStats = {
      packetLoss: stats.packetLoss || 0,
      jitter: stats.jitter || 0,
      rtt: stats.rtt || 0,
      bandwidth: stats.bandwidth || 0
    };

    // Adaptive bitrate adjustment
    this._adjustBitrate();
  }

  /**
   * Adjust bitrate based on network conditions
   * @private
   */
  _adjustBitrate() {
    const { packetLoss, jitter, rtt } = this.networkStats;
    
    let targetBitrate = this.config.targetBitrate;

    // Reduce bitrate if packet loss is high
    if (packetLoss > this.config.packetLossThreshold) {
      const lossRatio = packetLoss / this.config.packetLossThreshold;
      targetBitrate = Math.max(
        this.config.minBitrate,
        targetBitrate * (1 - (lossRatio * 0.3)) // Reduce up to 30%
      );
    }

    // Reduce bitrate if jitter is high
    if (jitter > this.config.jitterThreshold) {
      const jitterRatio = jitter / this.config.jitterThreshold;
      targetBitrate = Math.max(
        this.config.minBitrate,
        targetBitrate * (1 - (jitterRatio * 0.2)) // Reduce up to 20%
      );
    }

    // Reduce bitrate if RTT is high (>200ms)
    if (rtt > 200) {
      targetBitrate = Math.max(
        this.config.minBitrate,
        targetBitrate * 0.8 // Reduce by 20%
      );
    }

    // Ensure bitrate is within bounds
    this.currentBitrate = Math.max(
      this.config.minBitrate,
      Math.min(this.config.maxBitrate, targetBitrate)
    );

    console.log('[OpusAudioEnhancer] Adaptive bitrate:', {
      packetLoss: `${(packetLoss * 100).toFixed(2)}%`,
      jitter: `${jitter.toFixed(2)}ms`,
      rtt: `${rtt.toFixed(2)}ms`,
      newBitrate: `${(this.currentBitrate / 1000).toFixed(1)} kbps`
    });
  }

  /**
   * Enable RED (Redundant Audio Data) in SDP
   * @param {string} sdp - Session Description Protocol
   * @returns {string} Modified SDP with RED enabled
   */
  enableREDInSDP(sdp) {
    if (!this.config.redEnabled) {
      return sdp;
    }

    // Add RED codec to SDP
    // RED payload type is typically 63
    const lines = sdp.split('\r\n');
    const modifiedLines = [];
    let audioMLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find audio m-line
      if (line.startsWith('m=audio')) {
        audioMLineIndex = i;
        // Add RED payload type to m-line
        if (!line.includes('63')) {
          modifiedLines.push(line.replace(/(\d+)$/, '$1 63'));
        } else {
          modifiedLines.push(line);
        }
      } else if (audioMLineIndex !== -1 && line.startsWith('a=rtpmap:')) {
        modifiedLines.push(line);
        // Add RED rtpmap after Opus
        if (line.includes('opus')) {
          modifiedLines.push('a=rtpmap:63 red/48000/2');
          modifiedLines.push(`a=fmtp:63 111/111`); // Duplicate Opus payload
        }
      } else {
        modifiedLines.push(line);
      }
    }

    return modifiedLines.join('\r\n');
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.config,
      currentBitrate: this.currentBitrate,
      networkStats: this.networkStats
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[OpusAudioEnhancer] Configuration updated:', this.config);
  }

  /**
   * Get quality recommendations based on network conditions
   * @returns {Object} Quality recommendations
   */
  getQualityRecommendations() {
    const { packetLoss, jitter, rtt } = this.networkStats;
    const recommendations = {
      quality: 'high',
      fec: true,
      red: false,
      bitrate: this.config.maxBitrate,
      warnings: []
    };

    // Poor network conditions
    if (packetLoss > 0.1 || jitter > 50 || rtt > 300) {
      recommendations.quality = 'low';
      recommendations.fec = true;
      recommendations.red = true;
      recommendations.bitrate = this.config.minBitrate;
      recommendations.warnings.push('Poor network conditions detected');
    }
    // Moderate network conditions
    else if (packetLoss > 0.05 || jitter > 30 || rtt > 150) {
      recommendations.quality = 'medium';
      recommendations.fec = true;
      recommendations.red = true;
      recommendations.bitrate = this.config.targetBitrate;
      recommendations.warnings.push('Moderate network conditions');
    }

    return recommendations;
  }
}

module.exports = OpusAudioEnhancer;
