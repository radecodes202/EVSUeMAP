// src/context/AuthContext.js - Authentication Context
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuthData, saveAuthData, clearAuthData } from '../utils/authStorage';
import axios from 'axios';
import { API_URL, USE_MOCK_DATA, API_TIMEOUT } from '../constants/config';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const authData = await getAuthData();
      if (authData && authData.token) {
        setUser(authData.user);
        setIsAuthenticated(true);
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Demo mode: Instant login when USE_MOCK_DATA is enabled
      if (USE_MOCK_DATA) {
        console.log('📦 Demo mode: Using mock authentication');
        
        // Accept any email/password for demo, or use demo credentials
        const demoUser = {
          id: 1,
          email: email.trim() || 'demo@evsu.edu.ph',
          name: 'Demo User',
          role: 'admin', // Default to admin for demo
        };
        
        const demoToken = 'demo_token_' + Date.now();
        const authData = { user: demoUser, token: demoToken };
        
        await saveAuthData(authData);
        setUser(demoUser);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
        
        return { success: true };
      }

      // Production mode: Try API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        const response = await axios.post(
          `${API_URL}/auth/login`,
          { email, password },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (response.data.success) {
          const { user, token } = response.data;
          const authData = { user, token };
          
          await saveAuthData(authData);
          setUser(user);
          setIsAuthenticated(true);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } else {
          return { success: false, error: response.data.message || 'Login failed' };
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        throw apiError;
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // If API fails and we're in dev mode, fallback to demo
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      if (isDev && (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network'))) {
        console.log('📦 API unavailable, using demo mode fallback');
        
        const demoUser = {
          id: 1,
          email: email.trim() || 'demo@evsu.edu.ph',
          name: 'Demo User',
          role: 'admin',
        };
        
        const demoToken = 'demo_token_' + Date.now();
        const authData = { user: demoUser, token: demoToken };
        
        await saveAuthData(authData);
        setUser(demoUser);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
        
        return { success: true };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Network error. Please try again.',
      };
    }
  };

  const loginAsGuest = async () => {
    try {
      console.log('👤 Logging in as guest');
      
      const guestUser = {
        id: 0,
        email: 'guest@evsu.edu.ph',
        name: 'Guest User',
        role: 'user', // Guest users are regular users, not admin
      };
      
      const guestToken = 'guest_token_' + Date.now();
      const authData = { user: guestUser, token: guestToken };
      
      await saveAuthData(authData);
      setUser(guestUser);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${guestToken}`;
      
      return { success: true };
    } catch (error) {
      console.error('Guest login error:', error);
      return {
        success: false,
        error: 'Failed to login as guest',
      };
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin === true;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    loginAsGuest,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

