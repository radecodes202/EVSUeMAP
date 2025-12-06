// src/utils/routing.js - Routing utilities using OSRM and custom paths
import axios from 'axios';
import { calculateDistance, calculateWalkingTime } from './distance';
import { API_URL, USE_MOCK_DATA } from '../constants/config';

// OSRM public API endpoint (free, no API key required)
// Using the demo server - for production, you might want to host your own OSRM instance
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Get route from OSRM routing service
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @param {string} profile - Routing profile: 'driving', 'walking', 'cycling' (default: 'walking')
 * @returns {Promise<Object>} Route data with coordinates, distance, and duration
 */
export const getOSRMRoute = async (start, end, profile = 'foot') => {
  try {
    // OSRM API format: /route/v1/{profile}/{coordinates}?overview=full&geometries=geojson
    // Coordinates format: longitude,latitude (note: lon first, then lat)
    const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true`;
    
    console.log('Fetching route from OSRM:', url);
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
    });

    if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const geometry = route.geometry.coordinates;
      
      // Convert GeoJSON coordinates [lon, lat] to [lat, lon] for react-native-maps
      const coordinates = geometry.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));

      // Distance in meters, convert to km
      const distanceKm = route.distance / 1000;
      
      // Duration in seconds, convert to minutes
      const durationMinutes = Math.ceil(route.duration / 60);

      return {
        success: true,
        coordinates,
        distance: distanceKm,
        duration: durationMinutes,
        steps: route.legs[0]?.steps || [],
      };
    } else {
      console.warn('OSRM route not found, using fallback');
      return {
        success: false,
        error: 'Route not found',
      };
    }
  } catch (error) {
    console.error('OSRM routing error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get custom paths from API
 * @returns {Promise<Array>} Array of paths with waypoints
 */
const getCustomPaths = async () => {
  try {
    if (USE_MOCK_DATA) {
      return []; // No custom paths in mock mode
    }

    const response = await axios.get(`${API_URL}/paths`, {
      timeout: 5000,
    });

    if (response.data.success) {
      return response.data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching custom paths:', error);
    return [];
  }
};

/**
 * Find nearest waypoint to a coordinate
 * @param {Object} coord - Coordinate {latitude, longitude}
 * @param {Array} paths - Array of paths with waypoints
 * @param {number} threshold - Maximum distance in km to consider "near" (default: 0.05 = 50m)
 * @returns {Object|null} Nearest waypoint info or null
 */
const findNearestWaypoint = (coord, paths, threshold = 0.05) => {
  let nearest = null;
  let minDistance = threshold;

  paths.forEach(path => {
    if (!path.is_active || !path.waypoints) return;

    path.waypoints.forEach(waypoint => {
      if (!waypoint.is_accessible) return;

      const distance = calculateDistance(coord, {
        latitude: parseFloat(waypoint.latitude),
        longitude: parseFloat(waypoint.longitude),
      });

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          path_id: path.path_id,
          path_name: path.path_name,
          waypoint: waypoint,
          distance,
        };
      }
    });
  });

  return nearest;
};

/**
 * Build route using custom paths
 * @param {Object} start - Start coordinate
 * @param {Object} end - End coordinate
 * @param {Array} paths - Custom paths
 * @returns {Object|null} Route data or null if no path found
 */
const buildCustomPathRoute = (start, end, paths) => {
  const startWaypoint = findNearestWaypoint(start, paths);
  const endWaypoint = findNearestWaypoint(end, paths);

  // If both start and end are on the same path
  if (startWaypoint && endWaypoint && startWaypoint.path_id === endWaypoint.path_id) {
    const path = paths.find(p => p.path_id === startWaypoint.path_id);
    if (!path || !path.waypoints) return null;

    // Get waypoints between start and end
    const startSeq = startWaypoint.waypoint.sequence;
    const endSeq = endWaypoint.waypoint.sequence;
    const startIdx = Math.min(startSeq, endSeq);
    const endIdx = Math.max(startSeq, endSeq);

    const routeWaypoints = path.waypoints
      .filter(wp => wp.sequence >= startIdx && wp.sequence <= endIdx && wp.is_accessible)
      .sort((a, b) => a.sequence - b.sequence);

    if (routeWaypoints.length < 2) return null;

    // Convert to coordinates
    const coordinates = [
      start, // Start from user location
      ...routeWaypoints.map(wp => ({
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
      })),
      end, // End at destination
    ];

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += calculateDistance(coordinates[i], coordinates[i + 1]);
    }

    return {
      success: true,
      coordinates,
      distance: totalDistance,
      duration: calculateWalkingTime(totalDistance),
      steps: [],
      isCustomPath: true,
    };
  }

  // TODO: Handle routing between different paths (requires path connections)
  return null;
};

/**
 * Calculate route with fallback to straight line if OSRM fails
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @returns {Promise<Object>} Route data
 */
export const calculateRoute = async (start, end) => {
  // Try custom paths first (if available)
  if (!USE_MOCK_DATA) {
    try {
      const customPaths = await getCustomPaths();
      if (customPaths.length > 0) {
        const customRoute = buildCustomPathRoute(start, end, customPaths);
        if (customRoute) {
          console.log('Using custom path route');
          return customRoute;
        }
      }
    } catch (error) {
      console.warn('Custom path routing failed, trying OSRM:', error);
    }
  }

  // Try OSRM second
  const osrmRoute = await getOSRMRoute(start, end);
  
  if (osrmRoute.success) {
    return osrmRoute;
  }

  // Fallback to straight line with intermediate points for smoother appearance
  console.log('Using fallback route calculation');
  const distance = calculateDistance(start, end);
  const timeMinutes = calculateWalkingTime(distance);
  
  // Create intermediate points for a smoother line (simulates following paths)
  const numPoints = Math.max(3, Math.ceil(distance * 10)); // More points for longer distances
  const coordinates = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
    });
  }

  return {
    success: true,
    coordinates,
    distance,
    duration: timeMinutes,
    steps: [],
    isFallback: true,
  };
};

/**
 * Get route instructions/steps
 * @param {Array} steps - Route steps from OSRM
 * @returns {Array} Formatted step instructions
 */
export const getRouteInstructions = (steps) => {
  if (!steps || steps.length === 0) return [];
  
  return steps.map((step, index) => {
    const instruction = step.maneuver?.instruction || `Step ${index + 1}`;
    const distance = step.distance ? (step.distance / 1000).toFixed(2) : '0';
    
    return {
      instruction,
      distance: `${distance} km`,
      type: step.maneuver?.type || 'turn',
    };
  });
};

