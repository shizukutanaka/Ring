/**
 * Authentication Service
 * Handles login, registration, token management, and session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios, { AxiosInstance } from 'axios';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface RegisterResponse extends LoginResponse {}

class AuthService {
  private apiClient: AxiosInstance;
  private baseURL: string;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // Add token to requests
    this.apiClient.interceptors.request.use(
      async (config) => {
        const token = await this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.apiClient.post<LoginResponse>(
        '/api/auth/login',
        { email, password }
      );

      // Store user data
      await AsyncStorage.setItem(
        this.userKey,
        JSON.stringify(response.data.user)
      );

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new account
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<RegisterResponse> {
    try {
      const response = await this.apiClient.post<RegisterResponse>(
        '/api/auth/register',
        { email, password, name }
      );

      // Store user data
      await AsyncStorage.setItem(
        this.userKey,
        JSON.stringify(response.data.user)
      );

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }

    await this.clearToken();
  }

  /**
   * Store token securely
   */
  async storeToken(token: string): Promise<void> {
    try {
      // Use Secure Store for token
      await SecureStore.setItemAsync(this.tokenKey, token);

      // Also store expiration if available
      const decoded = this.decodeToken(token);
      if (decoded?.exp) {
        await AsyncStorage.setItem(
          'token_expiration',
          decoded.exp.toString()
        );
      }
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Retrieve stored token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      // Check if token is expired
      const expiration = await AsyncStorage.getItem('token_expiration');
      if (expiration && parseInt(expiration) * 1000 < Date.now()) {
        // Token expired
        await this.clearToken();
        return null;
      }

      // Get token from secure storage
      return await SecureStore.getItemAsync(this.tokenKey);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Clear stored token and user data
   */
  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.tokenKey);
      await AsyncStorage.removeItem(this.userKey);
      await AsyncStorage.removeItem('token_expiration');
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token');
      }

      const decoded = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );

      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const response = await this.apiClient.post<{ token: string }>(
        '/api/auth/refresh',
        {}
      );

      await this.storeToken(response.data.token);
      return response.data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearToken();
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const userJson = await AsyncStorage.getItem(this.userKey);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Enable/disable MFA
   */
  async enableMFA(): Promise<{ secret: string; qr: string }> {
    try {
      const response = await this.apiClient.post<{
        secret: string;
        qr: string;
      }>('/api/auth/mfa/enable', {});

      return response.data;
    } catch (error) {
      console.error('MFA enable error:', error);
      throw error;
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFA(token: string): Promise<{ enabled: boolean }> {
    try {
      const response = await this.apiClient.post<{ enabled: boolean }>(
        '/api/auth/mfa/verify',
        { token }
      );

      return response.data;
    } catch (error) {
      console.error('MFA verify error:', error);
      throw error;
    }
  }
}

export default new AuthService();
