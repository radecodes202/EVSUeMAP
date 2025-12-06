// src/utils/authStorage.js - Authentication storage utilities
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = '@evsuemap_auth';

/**
 * Save authentication data
 * @param {Object} authData - { user, token }
 */
export const saveAuthData = async (authData) => {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error;
  }
};

/**
 * Get authentication data
 * @returns {Promise<Object|null>} Auth data or null
 */
export const getAuthData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(AUTH_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
};

/**
 * Clear authentication data
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

