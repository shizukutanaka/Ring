/**
 * WebRTC Metrics Collector
 * 
 * Collects and exports WebRTC statistics for monitoring:
 * - Packet loss, jitter, RTT
 * - Bitrate (audio/video)
 * - Connection quality metrics
 * - Codec information
 * 
 * Integrates with Prometheus for metrics export
 */

const { register, Counter, Gauge, Histogram } = require('prom-client');

class WebRTCMetricsCollector {
    constructor() {
        // Connection metrics
        this.activeConnections = new Gauge({
            name: 'webrtc_active_connections',
            help: 'Number of active WebRTC connections'
        });

        this.totalConnections = new Counter({
            name: 'webrtc_total_connections',
            help: 'Total number of WebRTC connections established'
        });

        this.failedConnections = new Counter({
            name: 'webrtc_failed_connections',
            help: 'Total number of failed WebRTC connections',
            labelNames: ['reason']
        });

        // Audio quality metrics
        this.audioPacketLoss = new Gauge({
            name: 'webrtc_audio_packet_loss_percent',
            help: 'Audio packet loss percentage',
            labelNames: ['call_id', 'user_id']
        });

        this.audioJitter = new Gauge({
            name: 'webrtc_audio_jitter_ms',
            help: 'Audio jitter in milliseconds',
            labelNames: ['call_id', 'user_id']
        });

        this.audioBitrate = new Gauge({
            name: 'webrtc_audio_bitrate_kbps',
            help: 'Audio bitrate in kbps',
            labelNames: ['call_id', 'user_id', 'codec']
        });

        // Video quality metrics
        this.videoPacketLoss = new Gauge({
            name: 'webrtc_video_packet_loss_percent',
            help: 'Video packet loss percentage',
            labelNames: ['call_id', 'user_id']
        });

        this.videoBitrate = new Gauge({
            name: 'webrtc_video_bitrate_kbps',
            help: 'Video bitrate in kbps',
            labelNames: ['call_id', 'user_id', 'codec']
        });

        this.videoFramerate = new Gauge({
            name: 'webrtc_video_framerate_fps',
            help: 'Video framerate in FPS',
            labelNames: ['call_id', 'user_id']
        });

        this.videoResolution = new Gauge({
            name: 'webrtc_video_resolution_pixels',
            help: 'Video resolution in pixels',
            labelNames: ['call_id', 'user_id', 'dimension']
        });

        // Network metrics
        this.roundTripTime = new Gauge({
            name: 'webrtc_rtt_ms',
            help: 'Round-trip time in milliseconds',
            labelNames: ['call_id', 'user_id']
        });

        this.availableBandwidth = new Gauge({
            name: 'webrtc_available_bandwidth_kbps',
            help: 'Available bandwidth in kbps',
            labelNames: ['call_id', 'user_id']
        });

        // Call duration
        this.callDuration = new Histogram({
            name: 'webrtc_call_duration_seconds',
            help: 'Call duration in seconds',
            buckets: [10, 30, 60, 300, 600, 1800, 3600]
        });

        // Recording metrics
        this.recordingsStarted = new Counter({
            name: 'webrtc_recordings_started_total',
            help: 'Total number of recordings started'
        });

        this.recordingsFailed = new Counter({
            name: 'webrtc_recordings_failed_total',
            help: 'Total number of failed recordings',
            labelNames: ['reason']
        });

        this.recordingSize = new Histogram({
            name: 'webrtc_recording_size_mb',
            help: 'Recording file size in MB',
            buckets: [1, 10, 50, 100, 500, 1000]
        });

        // GDPR consent metrics
        this.consentRequests = new Counter({
            name: 'gdpr_consent_requests_total',
            help: 'Total number of consent requests'
        });

        this.consentApprovals = new Counter({
            name: 'gdpr_consent_approvals_total',
            help: 'Total number of consent approvals'
        });

        this.consentWithdrawals = new Counter({
            name: 'gdpr_consent_withdrawals_total',
            help: 'Total number of consent withdrawals'
        });

        this.dsarRequests = new Counter({
            name: 'gdpr_dsar_requests_total',
            help: 'Total number of DSAR requests',
            labelNames: ['type']
        });
    }

    /**
     * Update metrics from WebRTC getStats() report
     * @param {string} callId - Call identifier
     * @param {string} userId - User identifier
     * @param {RTCStatsReport} stats - WebRTC stats report
     */
    updateFromStats(callId, userId, stats) {
        stats.forEach(report => {
            const labels = { call_id: callId, user_id: userId };

            switch (report.type) {
                case 'inbound-rtp':
                    if (report.kind === 'audio') {
                        this._updateAudioInboundStats(report, labels);
                    } else if (report.kind === 'video') {
                        this._updateVideoInboundStats(report, labels);
                    }
                    break;

                case 'outbound-rtp':
                    if (report.kind === 'audio') {
                        this._updateAudioOutboundStats(report, labels);
                    } else if (report.kind === 'video') {
                        this._updateVideoOutboundStats(report, labels);
                    }
                    break;

                case 'candidate-pair':
                    if (report.state === 'succeeded') {
                        this._updateNetworkStats(report, labels);
                    }
                    break;
            }
        });
    }

    /**
     * Update audio inbound statistics
     * @private
     */
    _updateAudioInboundStats(report, labels) {
        // Packet loss
        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
            const totalPackets = report.packetsLost + report.packetsReceived;
            const packetLossPercent = totalPackets > 0
                ? (report.packetsLost / totalPackets) * 100
                : 0;
            this.audioPacketLoss.set(labels, packetLossPercent);
        }

        // Jitter
        if (report.jitter !== undefined) {
            this.audioJitter.set(labels, report.jitter * 1000); // Convert to ms
        }

        // Bitrate
        if (report.bytesReceived !== undefined && report.timestamp !== undefined) {
            // Calculate bitrate from bytes received
            const bitrate = this._calculateBitrate(report.bytesReceived, report.timestamp);
            if (bitrate > 0) {
                this.audioBitrate.set(
                    { ...labels, codec: report.codecId || 'unknown' },
                    bitrate / 1000 // Convert to kbps
                );
            }
        }
    }

    /**
     * Update audio outbound statistics
     * @private
     */
    _updateAudioOutboundStats(report, labels) {
        if (report.bytesSent !== undefined && report.timestamp !== undefined) {
            const bitrate = this._calculateBitrate(report.bytesSent, report.timestamp);
            if (bitrate > 0) {
                this.audioBitrate.set(
                    { ...labels, codec: report.codecId || 'unknown' },
                    bitrate / 1000
                );
            }
        }
    }

    /**
     * Update video inbound statistics
     * @private
     */
    _updateVideoInboundStats(report, labels) {
        // Packet loss
        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
            const totalPackets = report.packetsLost + report.packetsReceived;
            const packetLossPercent = totalPackets > 0
                ? (report.packetsLost / totalPackets) * 100
                : 0;
            this.videoPacketLoss.set(labels, packetLossPercent);
        }

        // Framerate
        if (report.framesPerSecond !== undefined) {
            this.videoFramerate.set(labels, report.framesPerSecond);
        }

        // Resolution
        if (report.frameWidth !== undefined) {
            this.videoResolution.set({ ...labels, dimension: 'width' }, report.frameWidth);
        }
        if (report.frameHeight !== undefined) {
            this.videoResolution.set({ ...labels, dimension: 'height' }, report.frameHeight);
        }

        // Bitrate
        if (report.bytesReceived !== undefined && report.timestamp !== undefined) {
            const bitrate = this._calculateBitrate(report.bytesReceived, report.timestamp);
            if (bitrate > 0) {
                this.videoBitrate.set(
                    { ...labels, codec: report.codecId || 'unknown' },
                    bitrate / 1000
                );
            }
        }
    }

    /**
     * Update video outbound statistics
     * @private
     */
    _updateVideoOutboundStats(report, labels) {
        if (report.bytesSent !== undefined && report.timestamp !== undefined) {
            const bitrate = this._calculateBitrate(report.bytesSent, report.timestamp);
            if (bitrate > 0) {
                this.videoBitrate.set(
                    { ...labels, codec: report.codecId || 'unknown' },
                    bitrate / 1000
                );
            }
        }

        if (report.framesPerSecond !== undefined) {
            this.videoFramerate.set(labels, report.framesPerSecond);
        }
    }

    /**
     * Update network statistics
     * @private
     */
    _updateNetworkStats(report, labels) {
        // Round-trip time
        if (report.currentRoundTripTime !== undefined) {
            this.roundTripTime.set(labels, report.currentRoundTripTime * 1000); // Convert to ms
        }

        // Available bandwidth
        if (report.availableOutgoingBitrate !== undefined) {
            this.availableBandwidth.set(labels, report.availableOutgoingBitrate / 1000); // Convert to kbps
        }
    }

    /**
     * Calculate bitrate from bytes and timestamp
     * @private
     */
    _calculateBitrate(bytes, timestamp) {
        // This is a simplified calculation
        // In production, you'd track previous values and calculate delta
        return bytes * 8; // Convert bytes to bits
    }

    /**
     * Record connection event
     */
    recordConnection() {
        this.totalConnections.inc();
        this.activeConnections.inc();
    }

    /**
     * Record connection close
     */
    recordConnectionClose() {
        this.activeConnections.dec();
    }

    /**
     * Record connection failure
     */
    recordConnectionFailure(reason) {
        this.failedConnections.inc({ reason });
    }

    /**
     * Record call duration
     */
    recordCallDuration(durationSeconds) {
        this.callDuration.observe(durationSeconds);
    }

    /**
     * Record recording started
     */
    recordRecordingStarted() {
        this.recordingsStarted.inc();
    }

    /**
     * Record recording failed
     */
    recordRecordingFailed(reason) {
        this.recordingsFailed.inc({ reason });
    }

    /**
     * Record recording size
     */
    recordRecordingSize(sizeMB) {
        this.recordingSize.observe(sizeMB);
    }

    /**
     * Record GDPR events
     */
    recordConsentRequest() {
        this.consentRequests.inc();
    }

    recordConsentApproval() {
        this.consentApprovals.inc();
    }

    recordConsentWithdrawal() {
        this.consentWithdrawals.inc();
    }

    recordDSAR(type) {
        this.dsarRequests.inc({ type });
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return register.metrics();
    }

    /**
     * Get metrics as JSON
     */
    async getMetricsJSON() {
        return register.getMetricsAsJSON();
    }

    /**
     * Reset all metrics
     */
    reset() {
        register.resetMetrics();
    }
}

module.exports = WebRTCMetricsCollector;
