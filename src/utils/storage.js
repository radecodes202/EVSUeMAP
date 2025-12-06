// src/utils/storage.js - AsyncStorage utilities for favorites
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@evsuemap_favorites';

/**
 * Get all favorite buildings
 * @returns {Promise<Array>} Array of favorite building IDs
 */
export const getFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

/**
 * Add a building to favorites
 * @param {string|number} buildingId - Building ID to add
 * @returns {Promise<boolean>} Success status
 */
export const addFavorite = async (buildingId) => {
  try {
    // Normalize to string for consistent storage
    const id = String(buildingId);
    const favorites = await getFavorites();
    if (!favorites.includes(id)) {
      favorites.push(id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return false;
  }
};

/**
 * Remove a building from favorites
 * @param {string|number} buildingId - Building ID to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeFavorite = async (buildingId) => {
  try {
    // Normalize to string for consistent comparison
    const id = String(buildingId);
    const favorites = await getFavorites();
    const filtered = favorites.filter(favId => String(favId) !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
};

/**
 * Check if a building is favorited
 * @param {string|number} buildingId - Building ID to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isFavorite = async (buildingId) => {
  try {
    // Normalize to string for consistent comparison
    const id = String(buildingId);
    const favorites = await getFavorites();
    return favorites.some(favId => String(favId) === id);
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
};

