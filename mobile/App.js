/**
 * WebRTC Call Recorder Mobile App
 *
 * Main entry point for iOS/Android application
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom, useAtom } from 'jotai';

import LoginScreen from './src/screens/LoginScreen';
import CallsScreen from './src/screens/CallsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CallInProgressScreen from './src/screens/CallInProgressScreen';

// Global atoms for state management
export const authTokenAtom = atom(null);
export const currentUserAtom = atom(null);
export const activeCallAtom = atom(null);
export const recordingConsentAtom = atom(false);

const Tab = createBottomTabNavigator();

/**
 * Root Navigation Component
 */
const RootNavigator = ({ isLoggedIn, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        headerStyle: {
          backgroundColor: '#667eea'
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      }}
    >
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          tabBarLabel: 'Calls',
          headerTitle: '📞 Recent Calls'
        }}
      />
      <Tab.Screen
        name="CallInProgress"
        component={CallInProgressScreen}
        options={{
          tabBarLabel: 'Active',
          headerTitle: '🎙️ Active Call',
          tabBarBadge: 1 // Show if call is active
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent tab change if call is active
            // e.preventDefault();
          }
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          headerTitle: '⚙️ Settings'
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main App Component
 */
export default function App() {
  const [authToken, setAuthToken] = useAtom(authTokenAtom);
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize app - restore session from storage
   */
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Restore saved token and user info
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('currentUser');

      if (savedToken && savedUser) {
        setAuthToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));

        // Verify token is still valid
        const isValid = await verifyToken(savedToken);
        if (!isValid) {
          // Token expired, clear storage
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('currentUser');
          setAuthToken(null);
          setCurrentUser(null);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  /**
   * Verify JWT token validity
   */
  const verifyToken = async (token) => {
    try {
      // Decode and check expiration
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const exp = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      return now < exp;
    } catch (error) {
      return false;
    }
  };

  const isLoggedIn = !!authToken && !!currentUser;

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <RootNavigator isLoggedIn={isLoggedIn} isLoading={isLoading} />
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center'
  }
});
