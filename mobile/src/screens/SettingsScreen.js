/**
 * Settings Screen Component
 *
 * User settings and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAtom } from 'jotai';

import { authTokenAtom, currentUserAtom } from '../../App';

export default function SettingsScreen({ navigation }) {
  const [, setAuthToken] = useAtom(authTokenAtom);
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [recordingConsent, setRecordingConsent] = useState(true);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load user settings
   */
  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('userSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setRecordingConsent(settings.recordingConsent ?? true);
        setTelemetryEnabled(settings.telemetryEnabled ?? false);
        setAutoAccept(settings.autoAccept ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  /**
   * Save user settings
   */
  const saveSettings = async (updates) => {
    try {
      const settings = {
        recordingConsent,
        telemetryEnabled,
        autoAccept,
        ...updates
      };
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('currentUser');
          setAuthToken(null);
          setCurrentUser(null);
        },
        style: 'destructive'
      }
    ]);
  };

  /**
   * Handle recording consent toggle
   */
  const handleRecordingConsentToggle = (value) => {
    setRecordingConsent(value);
    saveSettings({ recordingConsent: value });
  };

  /**
   * Handle telemetry toggle
   */
  const handleTelemetryToggle = (value) => {
    setTelemetryEnabled(value);
    saveSettings({ telemetryEnabled: value });

    if (value) {
      Alert.alert('Analytics Enabled', 'Anonymized usage data will be collected to help improve the app.');
    }
  };

  /**
   * Handle auto-accept toggle
   */
  const handleAutoAcceptToggle = (value) => {
    setAutoAccept(value);
    saveSettings({ autoAccept: value });

    if (value) {
      Alert.alert('Warning', 'Auto-accepting calls may bypass legal consent requirements. Use with caution.');
    }
  };

  /**
   * Render setting item
   */
  const SettingItem = ({ label, description, value, onToggle }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: '#ddd', true: '#667eea' }} />
    </View>
  );

  /**
   * Render info item
   */
  const InfoItem = ({ label, value }) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <InfoItem label="Username" value={currentUser?.username || 'N/A'} />
            <InfoItem label="Role" value={currentUser?.role || 'user'} />
            <InfoItem label="User ID" value={currentUser?.id?.toString() || 'N/A'} />
          </View>
        </View>

        {/* Privacy & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Legal</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              label="Recording Consent"
              description="Require explicit consent before recording"
              value={recordingConsent}
              onToggle={handleRecordingConsentToggle}
            />
            <SettingItem
              label="Analytics"
              description="Help improve the app with anonymous usage data"
              value={telemetryEnabled}
              onToggle={handleTelemetryToggle}
            />
          </View>
        </View>

        {/* Call Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Settings</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              label="Auto-Accept Calls"
              description="Automatically accept incoming calls"
              value={autoAccept}
              onToggle={handleAutoAcceptToggle}
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            <InfoItem label="App Version" value="0.1.0 (Beta)" />
            <InfoItem label="API Version" value="1.0.0" />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://github.com/your-org/webrtc-call-recorder/blob/main/docs/LEGAL.md')}
            >
              <Text style={styles.linkButtonText}>📋 Legal Notice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://github.com/your-org/webrtc-call-recorder/blob/main/SECURITY.md')}
            >
              <Text style={styles.linkButtonText}>🔒 Security & Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://github.com/your-org/webrtc-call-recorder')}
            >
              <Text style={styles.linkButtonText}>⭐ GitHub Repository</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  section: {
    marginBottom: 20,
    marginHorizontal: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: 8
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingText: {
    flex: 1,
    marginRight: 12
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16
  },
  infoItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  linkButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500'
  },
  logoutButton: {
    marginHorizontal: 12,
    marginVertical: 24,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    height: 20
  }
});
