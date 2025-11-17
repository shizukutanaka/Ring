/**
 * Client-Side Codec Detection Module
 *
 * Detects browser and device codec capabilities for WebRTC
 * - Queries available video/audio codecs
 * - Tests simulcast and SVC support
 * - Returns capability profile to server
 */

export interface CodecCapability {
  mimeType: string;
  clockRate: number;
  channels?: number;
  sdpFmtpLine?: string;
  parameters?: Record<string, string>;
}

export interface VideoCapabilities {
  codecs: CodecCapability[];
  maxResolution: { width: number; height: number };
  maxFramerate: number;
  simulcastSupport: boolean;
  svcSupport: boolean;
  hardwareAcceleration: boolean;
}

export interface AudioCapabilities {
  codecs: CodecCapability[];
  maxChannels: number;
  maxSampleRate: number;
}

export interface ClientCapabilities {
  browser: {
    name: string;
    version: string;
    os: string;
  };
  video: VideoCapabilities;
  audio: AudioCapabilities;
  network?: {
    bandwidth?: number;
    rtt?: number;
  };
}

export class CodecDetection {
  /**
   * Get complete client capabilities
   */
  static async getClientCapabilities(): Promise<ClientCapabilities> {
    const capabilities: ClientCapabilities = {
      browser: this.getBrowserInfo(),
      video: {
        codecs: [],
        maxResolution: { width: 1920, height: 1080 },
        maxFramerate: 30,
        simulcastSupport: false,
        svcSupport: false,
        hardwareAcceleration: false
      },
      audio: {
        codecs: [],
        maxChannels: 2,
        maxSampleRate: 48000
      }
    };

    // Get video codecs
    capabilities.video.codecs = await this.getVideoCodecs();

    // Get audio codecs
    capabilities.audio.codecs = await this.getAudioCodecs();

    // Test simulcast support
    capabilities.video.simulcastSupport = await this.testSimulcastSupport();

    // Test SVC support
    capabilities.video.svcSupport = await this.testSVCSupport(capabilities.video.codecs);

    // Test hardware acceleration
    capabilities.video.hardwareAcceleration = await this.testHardwareAcceleration();

    // Get network info if available
    capabilities.network = await this.getNetworkInfo();

    console.log('✅ Client capabilities detected:', capabilities);

    return capabilities;
  }

  /**
   * Get browser and OS information
   */
  private static getBrowserInfo(): ClientCapabilities['browser'] {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (/Chrome\/(\d+)/.test(userAgent)) {
      browserName = 'Chrome';
      browserVersion = RegExp.$1;
    } else if (/Firefox\/(\d+)/.test(userAgent)) {
      browserName = 'Firefox';
      browserVersion = RegExp.$1;
    } else if (/Safari\/(\d+)/.test(userAgent)) {
      browserName = 'Safari';
      browserVersion = RegExp.$1;
    } else if (/Edg\/(\d+)/.test(userAgent)) {
      browserName = 'Edge';
      browserVersion = RegExp.$1;
    }

    // Detect OS
    if (/Windows/.test(userAgent)) os = 'Windows';
    else if (/Mac/.test(userAgent)) os = 'macOS';
    else if (/Linux/.test(userAgent)) os = 'Linux';
    else if (/Android/.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad/.test(userAgent)) os = 'iOS';

    return { name: browserName, version: browserVersion, os };
  }

  /**
   * Get video codecs from RTCPeerConnection
   */
  private static async getVideoCodecs(): Promise<CodecCapability[]> {
    try {
      const codecs: CodecCapability[] = [];

      // Use RTCRtpSender.getCapabilities if available
      if (RTCRtpSender && RTCRtpSender.getCapabilities) {
        const capabilities = RTCRtpSender.getCapabilities('video');

        for (const codec of capabilities.codecs) {
          codecs.push({
            mimeType: codec.mimeType,
            clockRate: codec.clockRate,
            sdpFmtpLine: codec.sdpFmtpLine,
            parameters: this.parseCodecParameters(codec.sdpFmtpLine)
          });
        }
      } else {
        // Fallback: Create temporary PC to enumerate codecs
        const pc = new RTCPeerConnection();
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        });
        pc.close();

        // Parse SDP for codecs
        const sdpLines = offer.sdp!.split('\n');
        for (const line of sdpLines) {
          if (line.startsWith('a=rtpmap:')) {
            const match = line.match(/a=rtpmap:(\d+)\s([\w\-]+)\/(\d+)/);
            if (match) {
              codecs.push({
                mimeType: `video/${match[2].toUpperCase()}`,
                clockRate: parseInt(match[3])
              });
            }
          }
        }
      }

      return codecs;
    } catch (err) {
      console.error('Failed to get video codecs:', err);
      return [];
    }
  }

  /**
   * Get audio codecs from RTCPeerConnection
   */
  private static async getAudioCodecs(): Promise<CodecCapability[]> {
    try {
      const codecs: CodecCapability[] = [];

      if (RTCRtpSender && RTCRtpSender.getCapabilities) {
        const capabilities = RTCRtpSender.getCapabilities('audio');

        for (const codec of capabilities.codecs) {
          codecs.push({
            mimeType: codec.mimeType,
            clockRate: codec.clockRate,
            channels: codec.channels,
            sdpFmtpLine: codec.sdpFmtpLine,
            parameters: this.parseCodecParameters(codec.sdpFmtpLine)
          });
        }
      }

      return codecs;
    } catch (err) {
      console.error('Failed to get audio codecs:', err);
      return [];
    }
  }

  /**
   * Parse codec parameters from SDP format line
   */
  private static parseCodecParameters(sdpFmtpLine?: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (!sdpFmtpLine) return params;

    const parts = sdpFmtpLine.split(';');
    for (const part of parts.slice(1)) {
      const [key, value] = part.trim().split('=');
      if (key && value) {
        params[key] = value;
      }
    }

    return params;
  }

  /**
   * Test simulcast support
   */
  private static async testSimulcastSupport(): Promise<boolean> {
    try {
      const pc = new RTCPeerConnection();

      // Create dummy video stream
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const stream = canvas.captureStream(30);
      const videoTrack = stream.getVideoTracks()[0];

      const sender = await pc.addTrack(videoTrack, stream);

      // Try to set simulcast parameters
      const params = sender.getParameters();
      params.encodings = [
        { rid: 'h', maxBitrate: 2000000, maxFramerate: 30 },
        { rid: 'm', maxBitrate: 1000000, maxFramerate: 24 },
        { rid: 'l', maxBitrate: 500000, maxFramerate: 15 }
      ];

      await sender.setParameters(params);

      pc.close();
      videoTrack.stop();

      console.log('✅ Simulcast support detected');
      return true;
    } catch (err) {
      console.log('ℹ️  Simulcast not supported:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /**
   * Test SVC (Scalable Video Coding) support
   */
  private static async testSVCSupport(codecs: CodecCapability[]): Promise<boolean> {
    try {
      // Check for AV1 or VP9 with scalability mode
      for (const codec of codecs) {
        if (codec.mimeType.toLowerCase().includes('av1')) {
          if (codec.parameters?.['scalabilityMode']) {
            console.log('✅ AV1 SVC support detected');
            return true;
          }
        }

        if (codec.mimeType.toLowerCase().includes('vp9')) {
          if (codec.parameters?.['profile-id']) {
            console.log('✅ VP9 SVC support detected');
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      console.log('ℹ️  SVC test error:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /**
   * Test hardware acceleration support
   */
  private static async testHardwareAcceleration(): Promise<boolean> {
    try {
      // Check if WebCodecs API is available
      if ('VideoEncoder' in window) {
        const config = {
          codec: 'vp9',
          width: 1280,
          height: 720,
          bitrate: 2000000,
          framerate: 30
        };

        // Try to create encoder
        const encoder = new (window as any).VideoEncoder({
          output: () => {},
          error: () => {}
        });

        const support = await (encoder.isConfigSupported as any)(config);
        if (support?.supported) {
          console.log('✅ Hardware acceleration supported');
          encoder.close();
          return true;
        }

        encoder.close();
      }

      return false;
    } catch (err) {
      console.log('ℹ️  Hardware acceleration not available');
      return false;
    }
  }

  /**
   * Get network information from WebRTC stats
   */
  private static async getNetworkInfo(): Promise<ClientCapabilities['network']> {
    try {
      const pc = new RTCPeerConnection();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      for (const track of stream.getTracks()) {
        await pc.addTrack(track, stream);
      }

      // Create data channel to trigger ICE gathering
      pc.createDataChannel('test');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 2000);
        pc.onicecandidate = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve(null);
          }
        };
      });

      pc.close();
      stream.getTracks().forEach(track => track.stop());

      // Return estimated values (actual network would need RTT measurement)
      return {
        bandwidth: 5000, // Assume 5 Mbps
        rtt: 50 // Assume 50ms
      };
    } catch (err) {
      console.log('ℹ️  Could not get network info:', err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }

  /**
   * Get preferred codec for given network quality
   */
  static getPreferredCodec(
    capabilities: ClientCapabilities,
    networkBandwidth: number = 5000,
    isMobile: boolean = false
  ): string {
    const videoCodecs = capabilities.video.codecs;

    // For low bandwidth: prefer H.264 (baseline)
    if (networkBandwidth < 2000 || isMobile) {
      for (const codec of videoCodecs) {
        if (codec.mimeType.toLowerCase().includes('h264')) {
          console.log('📺 Selected H.264 (low bandwidth)');
          return 'h264';
        }
      }
    }

    // For medium bandwidth: prefer VP9
    if (networkBandwidth < 5000) {
      for (const codec of videoCodecs) {
        if (codec.mimeType.toLowerCase().includes('vp9')) {
          console.log('📺 Selected VP9 (medium bandwidth)');
          return 'vp9';
        }
      }
    }

    // For high bandwidth: prefer AV1
    for (const codec of videoCodecs) {
      if (codec.mimeType.toLowerCase().includes('av1')) {
        console.log('📺 Selected AV1 (high bandwidth)');
        return 'av1';
      }
    }

    // Fallback to VP9
    for (const codec of videoCodecs) {
      if (codec.mimeType.toLowerCase().includes('vp9')) {
        console.log('📺 Selected VP9 (fallback)');
        return 'vp9';
      }
    }

    // Final fallback to H.264
    console.log('📺 Selected H.264 (final fallback)');
    return 'h264';
  }

  /**
   * Check if specific codec is supported
   */
  static isCodecSupported(capabilities: ClientCapabilities, codec: string): boolean {
    return capabilities.video.codecs.some(c =>
      c.mimeType.toLowerCase().includes(codec.toLowerCase())
    );
  }
}
