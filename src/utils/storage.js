// src/utils/storage.js - Favorites storage (Supabase database with AsyncStorage fallback)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { USE_MOCK_DATA } from '../constants/config';
import { getAuthData } from './authStorage';

const FAVORITES_KEY = '@evsuemap_favorites';
const ROOM_FAVORITES_KEY = '@evsuemap_room_favorites';

// Helper to check if user can use favorites (must be authenticated and not a guest)
const canUseFavorites = async () => {
  try {
    const authData = await getAuthData();
    if (!authData || !authData.user) {
      return false; // Not logged in
    }
    // Check if user is a guest (guests have role 'guest' or id 0)
    if (authData.user.role === 'guest' || authData.user.id === 0) {
      return false; // Guest user
    }
    return true; // Authenticated non-guest user
  } catch (error) {
    console.error('Error checking if user can use favorites:', error);
    return false;
  }
};

// Helper to get current user ID
const getUserId = async () => {
  if (USE_MOCK_DATA || !isSupabaseConfigured()) {
    return null;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Helper to convert ID to UUID format (if needed)
const normalizeId = (id) => {
  if (!id) return null;
  // If it's already a UUID format, return as is
  if (typeof id === 'string' && id.includes('-') && id.length === 36) {
    return id;
  }
  // Otherwise, try to convert (for compatibility with existing data)
  return String(id);
};

// ============================================================================
// BUILDING FAVORITES
// ============================================================================

/**
 * Get all favorite building IDs for current user
 * @returns {Promise<Array>} Array of favorite building IDs
 */
export const getFavorites = async () => {
  try {
    // Check if user can use favorites
    const canUse = await canUseFavorites();
    if (!canUse) {
      return []; // Return empty array for guests/unauthenticated users
    }

    const userId = await getUserId();
    
    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('favorites')
      .select('building_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorites from database:', error);
      // Fallback to AsyncStorage on error
      const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    }

    // Return array of building IDs (as strings for compatibility)
    return data.map(fav => String(fav.building_id));
  } catch (error) {
    console.error('Error getting favorites:', error);
    // Fallback to AsyncStorage
    try {
      const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Add a building to favorites
 * @param {string|number|UUID} buildingId - Building ID to add
 * @returns {Promise<boolean>} Success status
 */
export const addFavorite = async (buildingId) => {
  try {
    // Check if user is authenticated and not a guest
    const canUse = await canUseFavorites();
    if (!canUse) {
      console.warn('Cannot add favorite: User must be logged in and not a guest');
      return false;
    }

    const userId = await getUserId();
    const normalizedId = normalizeId(buildingId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(buildingId);
      const favorites = await getFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    }

    // Add to Supabase
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        building_id: normalizedId,
      });

    if (error) {
      // If duplicate, that's okay - already favorited
      if (error.code === '23505') { // Unique constraint violation
        return true;
      }
      console.error('Error adding favorite to database:', error);
      // Fallback to AsyncStorage
      const id = String(buildingId);
      const favorites = await getFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(buildingId);
      const favorites = await getFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};

/**
 * Remove a building from favorites
 * @param {string|number|UUID} buildingId - Building ID to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeFavorite = async (buildingId) => {
  try {
    // Check if user is authenticated and not a guest
    const canUse = await canUseFavorites();
    if (!canUse) {
      console.warn('Cannot remove favorite: User must be logged in and not a guest');
      return false;
    }

    const userId = await getUserId();
    const normalizedId = normalizeId(buildingId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(buildingId);
      const favorites = await getFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    }

    // Remove from Supabase
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('building_id', normalizedId);

    if (error) {
      console.error('Error removing favorite from database:', error);
      // Fallback to AsyncStorage
      const id = String(buildingId);
      const favorites = await getFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(buildingId);
      const favorites = await getFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Check if a building is favorited
 * @param {string|number|UUID} buildingId - Building ID to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isFavorite = async (buildingId) => {
  try {
    const userId = await getUserId();
    const normalizedId = normalizeId(buildingId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for guests/mock mode
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(buildingId);
      const favorites = await getFavorites();
      return favorites.some(favId => String(favId) === id);
    }

    // Check in Supabase
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('building_id', normalizedId)
      .limit(1)
      .single();

    if (error) {
      // Not found or error - fallback to AsyncStorage
      if (error.code === 'PGRST116') { // Not found
        return false;
      }
      console.error('Error checking favorite in database:', error);
      const id = String(buildingId);
      const favorites = await getFavorites();
      return favorites.some(favId => String(favId) === id);
    }

    return !!data;
  } catch (error) {
    console.error('Error checking favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(buildingId);
      const favorites = await getFavorites();
      return favorites.some(favId => String(favId) === id);
    } catch {
      return false;
    }
  }
};

// ============================================================================
// ROOM FAVORITES
// ============================================================================

/**
 * Get all favorite room IDs for current user
 * @returns {Promise<Array>} Array of favorite room IDs
 */
export const getRoomFavorites = async () => {
  try {
    // Check if user can use favorites
    const canUse = await canUseFavorites();
    if (!canUse) {
      return []; // Return empty array for guests/unauthenticated users
    }

    const userId = await getUserId();
    
    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const jsonValue = await AsyncStorage.getItem(ROOM_FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('room_favorites')
      .select('room_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching room favorites from database:', error);
      // Fallback to AsyncStorage on error
      const jsonValue = await AsyncStorage.getItem(ROOM_FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    }

    // Return array of room IDs (as strings for compatibility)
    return data.map(fav => String(fav.room_id));
  } catch (error) {
    console.error('Error getting room favorites:', error);
    // Fallback to AsyncStorage
    try {
      const jsonValue = await AsyncStorage.getItem(ROOM_FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Add a room to favorites
 * @param {string|number|UUID} roomId - Room ID to add
 * @returns {Promise<boolean>} Success status
 */
export const addRoomFavorite = async (roomId) => {
  try {
    // Check if user is authenticated and not a guest
    const canUse = await canUseFavorites();
    if (!canUse) {
      console.warn('Cannot add room favorite: User must be logged in and not a guest');
      return false;
    }

    const userId = await getUserId();
    const normalizedId = normalizeId(roomId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    }

    // Add to Supabase
    const { error } = await supabase
      .from('room_favorites')
      .insert({
        user_id: userId,
        room_id: normalizedId,
      });

    if (error) {
      // If duplicate, that's okay - already favorited
      if (error.code === '23505') { // Unique constraint violation
        return true;
      }
      console.error('Error adding room favorite to database:', error);
      // Fallback to AsyncStorage
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding room favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      if (!favorites.includes(id)) {
        favorites.push(id);
        await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(favorites));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};

/**
 * Remove a room from favorites
 * @param {string|number|UUID} roomId - Room ID to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeRoomFavorite = async (roomId) => {
  try {
    // Check if user is authenticated and not a guest
    const canUse = await canUseFavorites();
    if (!canUse) {
      console.warn('Cannot remove room favorite: User must be logged in and not a guest');
      return false;
    }

    const userId = await getUserId();
    const normalizedId = normalizeId(roomId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for mock mode only (not for guests)
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    }

    // Remove from Supabase
    const { error } = await supabase
      .from('room_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', normalizedId);

    if (error) {
      console.error('Error removing room favorite from database:', error);
      // Fallback to AsyncStorage
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error removing room favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      const filtered = favorites.filter(favId => String(favId) !== id);
      await AsyncStorage.setItem(ROOM_FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Check if a room is favorited
 * @param {string|number|UUID} roomId - Room ID to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isRoomFavorite = async (roomId) => {
  try {
    const userId = await getUserId();
    const normalizedId = normalizeId(roomId);
    
    if (!normalizedId) {
      return false;
    }

    // Fallback to AsyncStorage for guests/mock mode
    if (!userId || USE_MOCK_DATA || !isSupabaseConfigured()) {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      return favorites.some(favId => String(favId) === id);
    }

    // Check in Supabase
    const { data, error } = await supabase
      .from('room_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('room_id', normalizedId)
      .limit(1)
      .single();

    if (error) {
      // Not found or error - fallback to AsyncStorage
      if (error.code === 'PGRST116') { // Not found
        return false;
      }
      console.error('Error checking room favorite in database:', error);
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      return favorites.some(favId => String(favId) === id);
    }

    return !!data;
  } catch (error) {
    console.error('Error checking room favorite:', error);
    // Fallback to AsyncStorage
    try {
      const id = String(roomId);
      const favorites = await getRoomFavorites();
      return favorites.some(favId => String(favId) === id);
    } catch {
      return false;
    }
  }
};
