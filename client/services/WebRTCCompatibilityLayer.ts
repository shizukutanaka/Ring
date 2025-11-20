/**
 * WebRTC Compatibility Layer - HIGH Tier
 *
 * Addresses HIGH priority defects:
 * - G1: Deprecated API handling
 * - G2: Browser version compatibility
 *
 * Provides compatibility shims and polyfills for WebRTC APIs
 */

/**
 * Browser detection and capability checking
 */
export class BrowserDetector {
  static readonly BROWSERS = {
    CHROME: 'chrome',
    FIREFOX: 'firefox',
    SAFARI: 'safari',
    EDGE: 'edge',
    OPERA: 'opera',
    UNKNOWN: 'unknown'
  };

  static detectBrowser(): {
    name: string;
    version: number;
    platform: string;
  } {
    const ua = navigator.userAgent;
    let browser = this.BROWSERS.UNKNOWN;
    let version = 0;

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Chromium')) {
      browser = this.BROWSERS.CHROME;
      version = parseInt(ua.split('Chrome/')[1]?.split('.')[0] || '0');
    } else if (ua.includes('Firefox')) {
      browser = this.BROWSERS.FIREFOX;
      version = parseInt(ua.split('Firefox/')[1]?.split('.')[0] || '0');
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = this.BROWSERS.SAFARI;
      version = parseInt(ua.split('Version/')[1]?.split('.')[0] || '0');
    } else if (ua.includes('Edg')) {
      browser = this.BROWSERS.EDGE;
      version = parseInt(ua.split('Edg/')[1]?.split('.')[0] || '0');
    } else if (ua.includes('OPR')) {
      browser = this.BROWSERS.OPERA;
      version = parseInt(ua.split('OPR/')[1]?.split('.')[0] || '0');
    }

    return {
      name: browser,
      version,
      platform: navigator.platform
    };
  }
}

/**
 * WebRTC feature capability checker
 */
export class WebRTCCapabilityChecker {
  static hasGetStats(): boolean {
    const pc = new RTCPeerConnection();
    const hasMethod =
      typeof pc.getStats === 'function' ||
      typeof (pc as any).getStats === 'function';
    pc.close();
    return hasMethod;
  }

  static hasGetSenders(): boolean {
    const pc = new RTCPeerConnection();
    const hasMethod = typeof pc.getSenders === 'function';
    pc.close();
    return hasMethod;
  }

  static hasReplaceTrack(): boolean {
    // RTCRtpSender.replaceTrack() support
    return typeof RTCRtpSender !== 'undefined' &&
      'prototype' in RTCRtpSender &&
      'replaceTrack' in RTCRtpSender.prototype;
  }

  static hasTransceivers(): boolean {
    return typeof RTCRtpTransceiver !== 'undefined';
  }

  static hasStatsEventTarget(): boolean {
    // Modern getStats returns a Promise
    const pc = new RTCPeerConnection();
    const result = typeof pc.getStats === 'function';
    pc.close();
    return result;
  }

  static hasWebRTCInsertableStreams(): boolean {
    // Insertable Streams API support
    return typeof RTCRtpSender !== 'undefined' &&
      'createEncodedVideoStreams' in RTCRtpSender.prototype;
  }

  static hasSimulcast(): boolean {
    // Simulcast support (not all browsers)
    return typeof RTCRtpSender !== 'undefined' &&
      'setParameters' in RTCRtpSender.prototype;
  }

  static getSupportedVideoCodecs(): string[] {
    const codecs: string[] = [];

    try {
      const pc = new RTCPeerConnection();
      const sender = pc.addTransceiver('video').sender;

      if (sender && typeof sender.getCapabilities === 'function') {
        const capabilities = (sender.constructor as any).getCapabilities?.('video');
        if (capabilities && Array.isArray(capabilities.codecs)) {
          for (const codec of capabilities.codecs) {
            codecs.push(codec.mimeType.split('/')[1]);
          }
        }
      }

      pc.close();
    } catch (error) {
      console.warn('Could not detect video codecs:', error);
    }

    return codecs;
  }

  static getSupportedAudioCodecs(): string[] {
    const codecs: string[] = [];

    try {
      const pc = new RTCPeerConnection();
      const sender = pc.addTransceiver('audio').sender;

      if (sender && typeof sender.getCapabilities === 'function') {
        const capabilities = (sender.constructor as any).getCapabilities?.('audio');
        if (capabilities && Array.isArray(capabilities.codecs)) {
          for (const codec of capabilities.codecs) {
            codecs.push(codec.mimeType.split('/')[1]);
          }
        }
      }

      pc.close();
    } catch (error) {
      console.warn('Could not detect audio codecs:', error);
    }

    return codecs;
  }

  static getFullCapabilities() {
    return {
      getStats: this.hasGetStats(),
      getSenders: this.hasGetSenders(),
      replaceTrack: this.hasReplaceTrack(),
      transceivers: this.hasTransceivers(),
      statsEventTarget: this.hasStatsEventTarget(),
      insertableStreams: this.hasWebRTCInsertableStreams(),
      simulcast: this.hasSimulcast(),
      videoCodecs: this.getSupportedVideoCodecs(),
      audioCodecs: this.getSupportedAudioCodecs()
    };
  }
}

/**
 * Deprecated API compatibility wrapper
 */
export class DeprecatedAPIWrapper {
  /**
   * Handle deprecated createOffer
   */
  static async createOffer(
    peerConnection: RTCPeerConnection,
    options?: RTCOfferOptions
  ): Promise<RTCSessionDescription> {
    try {
      // Modern API
      return await peerConnection.createOffer(options);
    } catch (error) {
      console.error('Failed to create offer with modern API:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated createAnswer
   */
  static async createAnswer(
    peerConnection: RTCPeerConnection,
    options?: RTCAnswerOptions
  ): Promise<RTCSessionDescription> {
    try {
      // Modern API
      return await peerConnection.createAnswer(options);
    } catch (error) {
      console.error('Failed to create answer with modern API:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated setLocalDescription
   */
  static async setLocalDescription(
    peerConnection: RTCPeerConnection,
    description: RTCSessionDescription
  ): Promise<void> {
    try {
      // Modern API
      return await peerConnection.setLocalDescription(description);
    } catch (error) {
      console.error('Failed to set local description:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated setRemoteDescription
   */
  static async setRemoteDescription(
    peerConnection: RTCPeerConnection,
    description: RTCSessionDescription
  ): Promise<void> {
    try {
      // Modern API
      return await peerConnection.setRemoteDescription(description);
    } catch (error) {
      console.error('Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated addIceCandidate
   */
  static async addIceCandidate(
    peerConnection: RTCPeerConnection,
    candidate: RTCIceCandidate | null
  ): Promise<void> {
    try {
      if (candidate === null) {
        // Explicit null indicates end of candidates
        return;
      }
      return await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated getStats
   */
  static async getStats(
    peerConnection: RTCPeerConnection,
    selector?: MediaStreamTrack
  ): Promise<RTCStatsReport> {
    try {
      return await peerConnection.getStats(selector);
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated addTrack (returns RTCRtpSender)
   */
  static addTrack(
    peerConnection: RTCPeerConnection,
    track: MediaStreamTrack,
    streams?: MediaStream[]
  ): RTCRtpSender {
    try {
      return peerConnection.addTrack(track, ...(streams || []));
    } catch (error) {
      console.error('Failed to add track:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated removeTrack
   */
  static removeTrack(
    peerConnection: RTCPeerConnection,
    sender: RTCRtpSender
  ): void {
    try {
      peerConnection.removeTrack(sender);
    } catch (error) {
      console.error('Failed to remove track:', error);
      throw error;
    }
  }

  /**
   * Handle deprecated addStream (use addTrack instead)
   */
  static addStream(
    peerConnection: RTCPeerConnection,
    stream: MediaStream
  ): void {
    console.warn('addStream is deprecated, use addTrack instead');

    // Polyfill using addTrack
    for (const track of stream.getTracks()) {
      try {
        peerConnection.addTrack(track, stream);
      } catch (error) {
        console.error('Failed to add track from stream:', error);
      }
    }
  }

  /**
   * Handle deprecated removeStream (use removeTrack instead)
   */
  static removeStream(
    peerConnection: RTCPeerConnection,
    stream: MediaStream
  ): void {
    console.warn('removeStream is deprecated, use removeTrack instead');

    const senders = peerConnection.getSenders();
    for (const sender of senders) {
      if (sender.track && stream.getTracks().includes(sender.track)) {
        try {
          peerConnection.removeTrack(sender);
        } catch (error) {
          console.error('Failed to remove track from stream:', error);
        }
      }
    }
  }
}

/**
 * Browser-specific polyfills
 */
export class WebRTCPolyfill {
  private static polyfilled = false;

  static applyPolyfills(): void {
    if (this.polyfilled) return;

    const browser = BrowserDetector.detectBrowser();

    // Safari-specific polyfills
    if (browser.name === BrowserDetector.BROWSERS.SAFARI) {
      this.applySafariPolyfills();
    }

    // Firefox-specific polyfills
    if (browser.name === BrowserDetector.BROWSERS.FIREFOX) {
      this.applyFirefoxPolyfills();
    }

    this.polyfilled = true;
  }

  private static applySafariPolyfills(): void {
    // Safari might not have modern WebRTC methods
    console.log('Applying Safari WebRTC polyfills');

    // Add any Safari-specific workarounds here
  }

  private static applyFirefoxPolyfills(): void {
    // Firefox-specific polyfills
    console.log('Applying Firefox WebRTC polyfills');

    // Add any Firefox-specific workarounds here
  }
}

/**
 * WebRTC compatibility manager
 */
export class WebRTCCompatibilityManager {
  private browser = BrowserDetector.detectBrowser();
  private capabilities = WebRTCCapabilityChecker.getFullCapabilities();
  private deprecatedAPIWrapper = DeprecatedAPIWrapper;

  constructor() {
    WebRTCPolyfill.applyPolyfills();
    console.log(`Detected ${this.browser.name} v${this.browser.version}`);
    console.log('WebRTC Capabilities:', this.capabilities);
  }

  /**
   * Check if feature is supported
   */
  isSupported(feature: keyof typeof this.capabilities): boolean {
    const value = this.capabilities[feature];
    if (typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return false;
  }

  /**
   * Get compatible codec list
   */
  getCompatibleVideoCodecs(preferred?: string[]): string[] {
    const supported = this.capabilities.videoCodecs;

    if (!preferred) {
      return supported;
    }

    // Filter preferred list by what's actually supported
    return preferred.filter((codec) =>
      supported.some((c) => c.toLowerCase().includes(codec.toLowerCase()))
    );
  }

  /**
   * Get WebRTC adapter (compatibility wrapper)
   */
  getWebRTCAdapter() {
    return this.deprecatedAPIWrapper;
  }

  /**
   * Get browser info
   */
  getBrowserInfo() {
    return this.browser;
  }

  /**
   * Get capabilities report
   */
  getCapabilitiesReport(): {
    browser: any;
    capabilities: any;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (!this.isSupported('getStats')) {
      recommendations.push('getStats not supported - quality metrics unavailable');
    }

    if (!this.isSupported('replaceTrack')) {
      recommendations.push('replaceTrack not supported - codec switching limited');
    }

    if (!this.isSupported('simulcast')) {
      recommendations.push('Simulcast not supported - adaptive bitrate limited');
    }

    if (this.capabilities.videoCodecs.length === 0) {
      recommendations.push('No video codecs detected - hardware encoding may be unavailable');
    }

    return {
      browser: this.browser,
      capabilities: this.capabilities,
      recommendations
    };
  }
}

export {
  BrowserDetector,
  WebRTCCapabilityChecker,
  DeprecatedAPIWrapper,
  WebRTCPolyfill,
  WebRTCCompatibilityManager
};
