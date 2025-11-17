/**
 * WebRTC Call Recorder Mobile App
 * React Native application for iOS and Android
 * Integrates with WebRTC Call Recorder API
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CallScreen from './screens/CallScreen';
import ConsentScreen from './screens/ConsentScreen';
import SettingsScreen from './screens/SettingsScreen';

// Context
import { AuthContext } from './context/AuthContext';
import { CallContext } from './context/CallContext';

// Services
import AuthService from './services/AuthService';
import CallService from './services/CallService';

const Stack = createNativeStackNavigator();

/**
 * Main App Component
 */
export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  useEffect(() => {
    // Fetch the token from storage then navigate to appropriate place
    const bootstrapAsync = async () => {
      let userToken;

      try {
        userToken = await AuthService.getStoredToken();
      } catch (e) {
        // Restoring token failed
        console.error('Failed to restore session', e);
      }

      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (email: string, password: string) => {
        try {
          const response = await AuthService.login(email, password);
          await AuthService.storeToken(response.token);
          dispatch({ type: 'SIGN_IN', token: response.token });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      signUp: async (email: string, password: string, name: string) => {
        try {
          const response = await AuthService.register(email, password, name);
          await AuthService.storeToken(response.token);
          dispatch({ type: 'SIGN_IN', token: response.token });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      signOut: async () => {
        try {
          await AuthService.logout();
          await AuthService.clearToken();
          dispatch({ type: 'SIGN_OUT' });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      signUp: async (email: string, password: string, name: string) => {
        try {
          const response = await AuthService.register(email, password, name);
          await AuthService.storeToken(response.token);
          dispatch({ type: 'SIGN_IN', token: response.token });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    }),
    []
  );

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
      <CallContext.Provider value={{}}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: true,
            }}
          >
            {state.userToken == null ? (
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
                  component={HomeScreen}
                  options={{ title: 'WebRTC Recorder' }}
                />
                <Stack.Screen
                  name="Call"
                  component={CallScreen}
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
      </CallContext.Provider>
    </AuthContext.Provider>
  );
}
