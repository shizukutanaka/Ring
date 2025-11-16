/**
 * Call In Progress Screen Component
 *
 * Displays active call interface with recording controls
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Switch
} from 'react-native';
import { useAtom } from 'jotai';

import { activeCallAtom, recordingConsentAtom } from '../../App';

export default function CallInProgressScreen() {
  const [activeCall, setActiveCall] = useAtom(activeCallAtom);
  const [recordingConsent, setRecordingConsent] = useAtom(recordingConsentAtom);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnSpeaker, setIsOnSpeaker] = useState(false);

  /**
   * Update call duration every second
   */
  useEffect(() => {
    if (!activeCall) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  /**
   * Format duration to HH:MM:SS
   */
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle recording start
   */
  const handleStartRecording = () => {
    if (!recordingConsent) {
      Alert.alert(
        'Consent Required',
        'Recording consent is required. Please enable recording consent in settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsRecording(true);
    Alert.alert('Recording Started', '🎙️ This call is now being recorded.');
  };

  /**
   * Handle recording stop
   */
  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert('Recording Stopped', '✅ Call recording has been saved.');
  };

  /**
   * Handle end call
   */
  const handleEndCall = () => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'End Call',
        onPress: () => {
          setActiveCall(null);
          setCallDuration(0);
          setIsRecording(false);
          setIsMuted(false);
          setIsOnSpeaker(false);
        },
        style: 'destructive'
      }
    ]);
  };

  /**
   * No active call view
   */
  if (!activeCall) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📞 No Active Calls</Text>
          <Text style={styles.emptySubtext}>Start a call to begin recording</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.contactName}>{activeCall.contact || 'Unknown'}</Text>
        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
      </View>

      <View style={styles.statusContainer}>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording in progress</Text>
          </View>
        )}
      </View>

      {/* Recording Consent Switch */}
      <View style={styles.consentContainer}>
        <View style={styles.consentText}>
          <Text style={styles.consentLabel}>Recording Consent</Text>
          <Text style={styles.consentDescription}>
            Recording requires both parties' consent. Ensure the other party is aware.
          </Text>
        </View>
        <Switch
          value={recordingConsent}
          onValueChange={setRecordingConsent}
          trackColor={{ false: '#ddd', true: '#667eea' }}
        />
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity
            style={[styles.controlButton, isOnSpeaker && styles.controlButtonActive]}
            onPress={() => setIsOnSpeaker(!isOnSpeaker)}
          >
            <Text style={styles.controlIcon}>{isOnSpeaker ? '📢' : '📱'}</Text>
            <Text style={styles.controlLabel}>{isOnSpeaker ? 'Speaker' : 'Phone'}</Text>
          </TouchableOpacity>

          {/* Recording Button */}
          <TouchableOpacity
            style={[styles.controlButton, isRecording && styles.controlButtonActive]}
            onPress={() => (isRecording ? handleStopRecording() : handleStartRecording())}
          >
            <Text style={styles.controlIcon}>🎙️</Text>
            <Text style={styles.controlLabel}>{isRecording ? 'Stop' : 'Record'}</Text>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Text style={styles.endCallIcon}>☎️</Text>
          <Text style={styles.endCallText}>End Call</Text>
        </TouchableOpacity>
      </View>

      {/* Recording Info */}
      {isRecording && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Recording Information</Text>
          <Text style={styles.infoText}>✓ Consent obtained</Text>
          <Text style={styles.infoText}>✓ Encryption enabled</Text>
          <Text style={styles.infoText}>✓ Legal compliance active</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999'
  },
  header: {
    backgroundColor: '#667eea',
    paddingVertical: 24,
    alignItems: 'center'
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  duration: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff'
  },
  statusContainer: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f44336',
    marginRight: 8,
    animation: 'pulse 1s infinite'
  },
  recordingText: {
    color: '#f44336',
    fontWeight: '600',
    fontSize: 13
  },
  consentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea'
  },
  consentText: {
    flex: 1,
    marginRight: 12
  },
  consentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  consentDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16
  },
  controlsContainer: {
    paddingHorizontal: 12,
    marginBottom: 24
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  controlButton: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  controlButtonActive: {
    backgroundColor: '#667eea'
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  controlLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500'
  },
  endCallButton: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  endCallIcon: {
    fontSize: 20,
    marginRight: 8
  },
  endCallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  infoContainer: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#2e7d32',
    marginBottom: 4
  }
});
