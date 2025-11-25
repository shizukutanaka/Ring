/**
 * WebRTC Call Recorder Mobile App
 * React Native application for iOS and Android
 * Integrates with WebRTC Call Recorder API
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import CallsScreen from './src/screens/CallsScreen';
import CallInProgressScreen from './src/screens/CallInProgressScreen';
import ConsentScreen from './src/screens/ConsentScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Context
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CallProvider } from './context/CallContext';

const Stack = createNativeStackNavigator();

/**
 * Main App Component
 */
const AppContent = () => {
  const { userToken, isLoading } = React.useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
        }}
      >
        {userToken == null ? (
          // Auth Stack
          <Stack.Group
            screenOptions={{
              headerShown: false,
              animationEnabled: false,
            }}
          >
            <Stack.Screen name="SignIn" component={LoginScreen} />
          </Stack.Group>
        ) : (
          // App Stack
          <Stack.Group>
            <Stack.Screen
              name="Home"
              component={CallsScreen}
              options={{ title: 'Recent Calls' }}
            />
            <Stack.Screen
              name="Call"
              component={CallInProgressScreen}
              options={{ title: 'Active Call' }}
            />
            <Stack.Screen
              name="Consent"
              component={ConsentScreen}
              options={{ title: 'Consent Confirmation' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <AppContent />
      </CallProvider>
    </AuthProvider>
  );
}

