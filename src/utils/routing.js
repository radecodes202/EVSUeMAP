// src/utils/routing.js - Routing utilities using custom campus paths only
// No external routing services - uses paths created in the database

import { calculateDistance, calculateWalkingTime } from './distance';
import { USE_MOCK_DATA } from '../constants/config';
import { mapService } from '../services/mapService';

/**
 * Get custom paths from Supabase
 * @returns {Promise<Array>} Array of paths with waypoints
 */
export const getCustomPaths = async () => {
  try {
    if (USE_MOCK_DATA) {
      return []; // No custom paths in mock mode
    }

    // Use mapService to fetch paths from Supabase
    const paths = await mapService.getPaths();
    
    // Transform to match expected format
    return paths.map(path => ({
      path_id: path.id,
      path_name: path.name,
      path_type: path.type,
      is_active: path.is_active,
      waypoints: path.waypoints || [],
    }));
  } catch (error) {
    console.error('Error fetching custom paths:', error);
    return [];
  }
};

/**
 * Find the nearest waypoint to a given coordinate across all paths
 * @param {Object} coord - Coordinate {latitude, longitude}
 * @param {Array} paths - Array of paths with waypoints
 * @param {number} threshold - Maximum distance in km to consider "near" (default: 0.5 = 500m)
 * @returns {Object|null} Nearest waypoint info or null
 */
const findNearestWaypoint = (coord, paths, threshold = 0.5) => {
  let nearest = null;
  let minDistance = threshold;

  paths.forEach(path => {
    if (!path.is_active || !path.waypoints || path.waypoints.length === 0) return;

    path.waypoints.forEach((waypoint, index) => {
      if (waypoint.is_accessible === false) return;

      const distance = calculateDistance(coord, {
        latitude: parseFloat(waypoint.latitude),
        longitude: parseFloat(waypoint.longitude),
      });

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          path_id: path.path_id,
          path_name: path.path_name,
          path_type: path.path_type,
          waypoint: waypoint,
          waypointIndex: index,
          distance,
        };
      }
    });
  });

  return nearest;
};

/**
 * Build a route using a single admin path
 * @param {Object} start - Start coordinate
 * @param {Object} end - End coordinate (destination building)
 * @param {Object} path - The path to use
 * @param {Object} startWaypoint - Nearest waypoint to start
 * @param {Object} endWaypoint - Nearest waypoint to end
 * @returns {Object} Route data
 */
const buildSinglePathRoute = (start, end, path, startWaypoint, endWaypoint) => {
  const waypoints = path.waypoints || [];
  if (waypoints.length < 2) return null;

  // Get waypoints between start and end
  const startSeq = startWaypoint.waypoint.sequence;
  const endSeq = endWaypoint.waypoint.sequence;
  
  // Determine direction (forward or reverse)
  const forward = startSeq <= endSeq;
  const minSeq = Math.min(startSeq, endSeq);
  const maxSeq = Math.max(startSeq, endSeq);

  // Get waypoints in the route
  let routeWaypoints = waypoints
    .filter(wp => wp.sequence >= minSeq && wp.sequence <= maxSeq && wp.is_accessible !== false)
    .sort((a, b) => a.sequence - b.sequence);

  // Reverse if needed
  if (!forward) {
    routeWaypoints = routeWaypoints.reverse();
  }

  if (routeWaypoints.length === 0) return null;

  // Build coordinates array: start -> waypoints -> end
  const coordinates = [
    start, // User's current location
    ...routeWaypoints.map(wp => ({
      latitude: parseFloat(wp.latitude),
      longitude: parseFloat(wp.longitude),
    })),
    end, // Destination building
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
      pathName: path.path_name,
      pathType: path.path_type,
      isCustomPath: true,
    };
};

/**
 * Find the best path between two points using custom paths
 * Picks the path where endpoints are closest to start and end
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @param {Array} paths - Array of custom paths
 * @returns {Object|null} Best route or null if no suitable path found
 */
export const findBestCustomPath = (start, end, paths) => {
  if (!paths || paths.length === 0) return null;

  let bestRoute = null;
  let bestScore = Number.POSITIVE_INFINITY;

  paths.forEach(path => {
    const waypoints = path.waypoints || [];
    if (waypoints.length < 2) return;

    // Find nearest waypoints on this path to start and end
    let nearestToStart = null;
    let nearestToEnd = null;
    let minDistStart = Number.POSITIVE_INFINITY;
    let minDistEnd = Number.POSITIVE_INFINITY;

    waypoints.forEach(wp => {
      if (wp.is_accessible === false) return;

      const wpCoord = {
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
      };

      const distToStart = calculateDistance(start, wpCoord);
      const distToEnd = calculateDistance(end, wpCoord);

      if (distToStart < minDistStart) {
        minDistStart = distToStart;
        nearestToStart = { waypoint: wp, distance: distToStart };
      }
      if (distToEnd < minDistEnd) {
        minDistEnd = distToEnd;
        nearestToEnd = { waypoint: wp, distance: distToEnd };
      }
    });

    if (!nearestToStart || !nearestToEnd) return;

    // Score = sum of distances from start/end to their nearest waypoints
    const score = minDistStart + minDistEnd;

    if (score < bestScore) {
      bestScore = score;
      
      // Build route using this path
      const route = buildSinglePathRoute(start, end, path, nearestToStart, nearestToEnd);
      if (route) {
        bestRoute = {
          ...route,
          score,
          startDistance: minDistStart,
          endDistance: minDistEnd,
        };
      }
    }
  });

  // Only return if the path is reasonably close (within 500m combined distance to start/end)
  if (bestRoute && bestScore <= 0.5) {
    return bestRoute;
  }

  return null;
};

/**
 * Calculate route using custom campus paths only
 * No external routing services - purely uses paths from the database
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @returns {Promise<Object>} Route data
 */
export const calculateRoute = async (start, end) => {
  console.log('Calculating campus route from', start, 'to', end);

  // Try to get custom paths
  if (!USE_MOCK_DATA) {
    try {
      const customPaths = await getCustomPaths();
      
      if (customPaths.length > 0) {
        const route = findBestCustomPath(start, end, customPaths);
        if (route) {
          console.log('✅ Using custom path:', route.pathName);
          return route;
        } else {
          console.log('⚠️ No suitable custom path found for this route');
        }
      } else {
        console.log('⚠️ No custom paths available in database');
      }
    } catch (error) {
      console.error('Error finding custom path:', error);
    }
  }

  // Fallback: Direct line to destination (no external routing)
  // This is only used when no custom path covers the route
  console.log('📍 Using direct route (no custom path available)');
  
  const distance = calculateDistance(start, end);
  const duration = calculateWalkingTime(distance);

  // Create a simple direct line with a few intermediate points
  const numPoints = Math.max(2, Math.ceil(distance * 5));
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
    duration,
    isDirectRoute: true, // Flag to indicate this is not a real path
    message: 'No custom path available for this route. Showing direct line.',
  };
};

/**
 * Check if custom paths are available
 * @returns {Promise<boolean>} True if paths exist
 */
export const hasCustomPaths = async () => {
  if (USE_MOCK_DATA) return false;
  
  try {
    const paths = await getCustomPaths();
    return paths.length > 0;
  } catch {
    return false;
  }
};

/**
 * Get route summary text
 * @param {Object} route - Route data from calculateRoute
 * @returns {string} Human-readable route summary
 */
export const getRouteSummary = (route) => {
  if (!route) return 'No route available';

  const distanceText = `${route.distance.toFixed(2)} km`;
  const timeText = `${route.duration} min walk`;

  if (route.isCustomPath) {
    return `📍 ${route.pathName || 'Campus Path'}\n${distanceText} • ${timeText}`;
  } else if (route.isDirectRoute) {
    return `📍 Direct Route\n${distanceText} • ${timeText}\n(No custom path available)`;
  }

  return `${distanceText} • ${timeText}`;
};
