// src/utils/storage.js - AsyncStorage utilities for favorites
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@evsuemap_favorites';
const ROOM_FAVORITES_KEY = '@evsuemap_room_favorites';

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

// ============================================================================
// ROOM FAVORITES
// ============================================================================

/**
 * Get all favorite rooms
 * @returns {Promise<Array>} Array of favorite room IDs
 */
export const getRoomFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(ROOM_FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error getting room favorites:', error);
    return [];
  }
};

/**
 * Add a room to favorites
 * @param {string|number} roomId - Room ID to add
 * @returns {Promise<boolean>} Success status
 */
export const addRoomFavorite = async (roomId) => {
  try {
    // Normalize to string for consistent storage
    const id = String(roomId);
    const favorites = await getRoomFavorites();
    if (!favorites.includes(id)) {
      favorites.push(id);
      await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding room favorite:', error);
    return false;
  }
};

/**
 * Remove a room from favorites
 * @param {string|number} roomId - Room ID to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeRoomFavorite = async (roomId) => {
  try {
    // Normalize to string for consistent comparison
    const id = String(roomId);
    const favorites = await getRoomFavorites();
    const filtered = favorites.filter(favId => String(favId) !== id);
    await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing room favorite:', error);
    return false;
  }
};

/**
 * Check if a room is favorited
 * @param {string|number} roomId - Room ID to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isRoomFavorite = async (roomId) => {
  try {
    // Normalize to string for consistent comparison
    const id = String(roomId);
    const favorites = await getRoomFavorites();
    return favorites.some(favId => String(favId) === id);
  } catch (error) {
    console.error('Error checking room favorite:', error);
    return false;
  }
};

