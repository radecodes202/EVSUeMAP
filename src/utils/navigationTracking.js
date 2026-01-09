// src/utils/navigationTracking.js - Navigation event tracking for statistics
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { USE_MOCK_DATA } from '../constants/config';

/**
 * Log a navigation event when user navigates to a building or room
 * @param {Object} params - Navigation event parameters
 * @param {string} params.entityType - 'building' or 'room'
 * @param {string|UUID} params.entityId - Building or room ID
 * @param {string|UUID} params.buildingId - Building ID (required for rooms)
 * @param {string|UUID} params.roomId - Room ID (only for room navigation)
 * @param {Object} params.userLocation - User's current location {latitude, longitude}
 * @param {number} params.distanceMeters - Distance from user to destination
 * @param {boolean} params.routeCalculated - Whether a route was calculated
 * @returns {Promise<boolean>} Success status
 */
export const logNavigationEvent = async ({
  entityType,
  entityId,
  buildingId = null,
  roomId = null,
  userLocation = null,
  distanceMeters = null,
  routeCalculated = false,
}) => {
  try {
    // Skip logging in mock mode or if Supabase not configured
    if (USE_MOCK_DATA || !isSupabaseConfigured()) {
      console.log('📊 Navigation event (mock mode - not logged):', { entityType, entityId });
      return true;
    }

    // Get current user
    let userId = null;
    let userEmail = null;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch (error) {
      console.warn('Could not get user for navigation tracking:', error);
      // Continue without user info (for guest users)
    }

    // Normalize IDs to UUIDs (if needed)
    // UUIDs must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
    const normalizeId = (id) => {
      if (!id) return null;
      const idStr = String(id);
      // Check if it's a valid UUID format (36 chars with dashes in correct positions)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(idStr)) {
        return idStr; // Valid UUID
      }
      // If not a UUID, log warning but still try to use it (database will validate)
      console.warn('ID is not in UUID format:', idStr);
      return idStr; // Return as-is, let database handle validation
    };

    // Prepare event data
    const eventData = {
      user_id: userId,
      user_email: userEmail,
      entity_type: entityType, // 'building' or 'room'
      entity_id: normalizeId(entityId),
      building_id: buildingId ? normalizeId(buildingId) : null,
      room_id: roomId ? normalizeId(roomId) : null,
      action_type: 'navigate',
      route_calculated: routeCalculated,
      user_location_lat: userLocation?.latitude || null,
      user_location_lng: userLocation?.longitude || null,
      distance_meters: distanceMeters || null,
    };

    // Insert navigation event
    const { data, error } = await supabase
      .from('navigation_events')
      .insert(eventData)
      .select('id')
      .single();

    if (error) {
      // Check if it's a UUID format error
      if (error.message && (error.message.includes('invalid input syntax for type uuid') || error.message.includes('uuid'))) {
        console.warn('⚠️ Navigation event not logged: Invalid UUID format for entity:', { entityType, entityId, error: error.message });
        return false;
      }
      console.error('❌ Error logging navigation event:', error);
      return false;
    }

    console.log('✅ Navigation event logged:', { entityType, entityId, eventId: data?.id });
    return true;
  } catch (error) {
    console.error('Error in logNavigationEvent:', error);
    return false;
  }
};

/**
 * Log navigation to a building
 * @param {Object} building - Building object
 * @param {Object} userLocation - User's current location
 * @param {number} distanceMeters - Distance to building
 * @param {boolean} routeCalculated - Whether route was calculated
 */
export const logBuildingNavigation = async (building, userLocation = null, distanceMeters = null, routeCalculated = false) => {
  const buildingId = building.building_id || building.id;
  
  return await logNavigationEvent({
    entityType: 'building',
    entityId: buildingId,
    buildingId: buildingId,
    userLocation,
    distanceMeters,
    routeCalculated,
  });
};

/**
 * Log navigation to a room
 * @param {Object} room - Room object
 * @param {Object} building - Building object (required)
 * @param {Object} userLocation - User's current location
 * @param {number} distanceMeters - Distance to building
 * @param {boolean} routeCalculated - Whether route was calculated
 */
export const logRoomNavigation = async (room, building, userLocation = null, distanceMeters = null, routeCalculated = false) => {
  const roomId = room.id;
  const buildingId = building?.building_id || building?.id || room.building?.id || room.building_id;
  
  if (!buildingId) {
    console.warn('Cannot log room navigation: building ID not found');
    return false;
  }
  
  return await logNavigationEvent({
    entityType: 'room',
    entityId: roomId,
    buildingId: buildingId,
    roomId: roomId,
    userLocation,
    distanceMeters,
    routeCalculated,
  });
};

