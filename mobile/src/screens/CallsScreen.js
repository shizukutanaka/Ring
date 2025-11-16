/**
 * Calls Screen Component
 *
 * Displays list of recent calls and call history
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAtom } from 'jotai';

import { authTokenAtom } from '../../App';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function CallsScreen() {
  const [authToken] = useAtom(authTokenAtom);
  const [calls, setCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCalls();
  }, []);

  /**
   * Load call history
   */
  const loadCalls = async () => {
    setIsLoading(true);
    try {
      // Mock data for now - replace with actual API call
      const mockCalls = [
        {
          id: '1',
          contact: 'John Doe',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          duration: 1200,
          type: 'outgoing',
          recorded: true
        },
        {
          id: '2',
          contact: 'Jane Smith',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          duration: 480,
          type: 'incoming',
          recorded: false
        },
        {
          id: '3',
          contact: 'Mike Johnson',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          duration: 600,
          type: 'missed',
          recorded: false
        }
      ];

      setCalls(mockCalls);
    } catch (error) {
      console.error('Error loading calls:', error);
      Alert.alert('Error', 'Failed to load calls');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  };

  /**
   * Format duration to MM:SS
   */
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  /**
   * Render call item
   */
  const renderCallItem = ({ item }) => (
    <TouchableOpacity style={styles.callItem}>
      <View style={styles.callLeft}>
        <View style={[styles.icon, { backgroundColor: item.type === 'missed' ? '#ff6b6b' : '#667eea' }]}>
          <Text style={styles.iconText}>
            {item.type === 'outgoing' ? '📤' : item.type === 'incoming' ? '📥' : '❌'}
          </Text>
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.contactName}>{item.contact}</Text>
          <View style={styles.callMeta}>
            <Text style={styles.callType}>{item.type.toUpperCase()}</Text>
            {item.recorded && <Text style={styles.recordedBadge}>🎙️ Recorded</Text>}
          </View>
        </View>
      </View>
      <View style={styles.callRight}>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && calls.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Calls</Text>
        <Text style={styles.headerSubtitle}>{calls.length} calls</Text>
      </View>

      {calls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📞 No calls yet</Text>
          <Text style={styles.emptySubtext}>Your call history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  callItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  callLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  iconText: {
    fontSize: 24
  },
  callInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  callType: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginRight: 8
  },
  recordedBadge: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600'
  },
  callRight: {
    alignItems: 'flex-end',
    marginLeft: 12
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 24,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999'
  }
});
