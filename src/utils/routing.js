// src/utils/routing.js - Hybrid routing: OSRM for outside campus, custom paths for inside
// Uses OSRM when outside campus boundaries, switches to custom paths when entering campus

import axios from 'axios';
import { calculateDistance, calculateWalkingTime } from './distance';
import { USE_MOCK_DATA, CAMPUS_BOUNDARIES } from '../constants/config';
import { mapService } from '../services/mapService';

// OSRM public API endpoint (for routing outside campus)
const OSRM_BASE_URL = 'https://router.project-osrm.org';

// Cache campus settings to avoid repeated database calls
let cachedCampusSettings = null;
let settingsFetchPromise = null;

/**
 * Get campus boundaries from database (with fallback to config)
 * @returns {Promise<Object>} Campus boundaries
 */
const getCampusBoundaries = async () => {
  // Return cached settings if available
  if (cachedCampusSettings) {
    return cachedCampusSettings.boundaries;
  }

  // If already fetching, wait for that promise
  if (settingsFetchPromise) {
    await settingsFetchPromise;
    return cachedCampusSettings?.boundaries || CAMPUS_BOUNDARIES;
  }

  // Fetch from database
  settingsFetchPromise = (async () => {
    try {
      const settings = await mapService.getCampusSettings();
      if (settings) {
        cachedCampusSettings = settings;
        console.log('✅ Loaded campus settings from database');
        return settings.boundaries;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch campus settings, using config fallback:', error);
    }
    return CAMPUS_BOUNDARIES;
  })();

  const boundaries = await settingsFetchPromise;
  settingsFetchPromise = null;
  return boundaries;
};

/**
 * Check if a coordinate is within campus boundaries
 * @param {Object} coord - Coordinate {latitude, longitude}
 * @returns {Promise<boolean>} True if inside campus
 */
const isInsideCampus = async (coord) => {
  const boundaries = await getCampusBoundaries();
  const { northEast, southWest } = boundaries;
  return (
    coord.latitude >= southWest.latitude &&
    coord.latitude <= northEast.latitude &&
    coord.longitude >= southWest.longitude &&
    coord.longitude <= northEast.longitude
  );
};

/**
 * Find the nearest waypoint to campus boundary (entry point)
 * @param {Object} coord - Coordinate outside campus
 * @param {Array} paths - Array of paths with waypoints
 * @returns {Object|null} Nearest waypoint info or null
 */
const findCampusEntryPoint = (coord, paths) => {
  let nearest = null;
  let minDistance = Number.POSITIVE_INFINITY;

  paths.forEach(path => {
    if (!path.is_active || !path.waypoints) return;

    path.waypoints.forEach(wp => {
      if (wp.is_accessible === false) return;

      const wpCoord = {
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
      };

      // Only consider waypoints inside campus
      // Note: This is in a sync context, so we'll check boundaries directly
      // For performance, we'll use cached boundaries if available
      const boundaries = cachedCampusSettings?.boundaries || CAMPUS_BOUNDARIES;
      const { northEast, southWest } = boundaries;
      const inside = (
        wpCoord.latitude >= southWest.latitude &&
        wpCoord.latitude <= northEast.latitude &&
        wpCoord.longitude >= southWest.longitude &&
        wpCoord.longitude <= northEast.longitude
      );
      if (!inside) return;

      const distance = calculateDistance(coord, wpCoord);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          path_id: path.path_id,
          path_name: path.path_name,
          waypoint: wp,
          distance,
        };
      }
    });
  });

  return nearest;
};

/**
 * Get route from OSRM routing service (for outside campus)
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @param {string} profile - Routing profile (default: 'foot' for walking)
 * @returns {Promise<Object>} Route data with coordinates, distance, and duration
 */
const getOSRMRoute = async (start, end, profile = 'foot') => {
  try {
    // OSRM API format: /route/v1/{profile}/{coordinates}?overview=full&geometries=geojson
    // Coordinates format: longitude,latitude (note: lon first, then lat)
    const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true`;
    
    console.log('🌍 Fetching OSRM route (outside campus):', url);
    
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
        isOSRMRoute: true,
      };
    } else {
      console.warn('OSRM route not found');
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
 * Combine OSRM route with custom path route
 * @param {Array} osrmCoordinates - Coordinates from OSRM
 * @param {Array} campusCoordinates - Coordinates from campus paths
 * @returns {Array} Combined coordinates
 */
const combineRoutes = (osrmCoordinates, campusCoordinates) => {
  if (!osrmCoordinates || osrmCoordinates.length === 0) {
    return campusCoordinates;
  }
  if (!campusCoordinates || campusCoordinates.length === 0) {
    return osrmCoordinates;
  }

  // Remove last point from OSRM (campus entry) and first from campus (same point)
  // to avoid duplicate point at transition
  const osrmRoute = osrmCoordinates.slice(0, -1);
  const campusRoute = campusCoordinates.slice(1);

  return [...osrmRoute, ...campusRoute];
};

/**
 * Get custom paths from Supabase
 * @returns {Promise<Array>} Array of paths with waypoints
 */
export const getCustomPaths = async () => {
  try {
    if (USE_MOCK_DATA) {
      console.log('⚠️ Using mock data - no custom paths available');
      return []; // No custom paths in mock mode
    }

    console.log('📡 Fetching custom paths from Supabase...');
    // Use mapService to fetch paths from Supabase
    const paths = await mapService.getPaths();
    
    console.log(`✅ Fetched ${paths.length} paths from Supabase`);
    
    // Transform to match expected format
    const transformedPaths = paths.map(path => {
      const waypoints = (path.waypoints || []).map(wp => ({
        id: wp.id,
        waypoint_id: wp.id, // Support both field names
        sequence: wp.sequence,
        latitude: typeof wp.latitude === 'number' ? wp.latitude : parseFloat(wp.latitude),
        longitude: typeof wp.longitude === 'number' ? wp.longitude : parseFloat(wp.longitude),
        is_accessible: wp.is_accessible !== undefined ? wp.is_accessible : true, // Default to true if not set
        notes: wp.notes,
      }));

      return {
        path_id: path.id,
        path_name: path.name,
        path_type: path.type,
        is_active: path.is_active !== undefined ? path.is_active : true,
        waypoints: waypoints,
      };
    });

    // Log transformed paths
    transformedPaths.forEach((path, idx) => {
      console.log(`  Path ${idx + 1}: "${path.path_name}" (ID: ${path.path_id})`);
      console.log(`    - Active: ${path.is_active}`);
      console.log(`    - Waypoints: ${path.waypoints.length}`);
      if (path.waypoints.length > 0) {
        const firstWp = path.waypoints[0];
        const lastWp = path.waypoints[path.waypoints.length - 1];
        console.log(`    - First waypoint: (${firstWp.latitude}, ${firstWp.longitude}), accessible: ${firstWp.is_accessible}`);
        console.log(`    - Last waypoint: (${lastWp.latitude}, ${lastWp.longitude}), accessible: ${lastWp.is_accessible}`);
      }
    });

    return transformedPaths;
  } catch (error) {
    console.error('❌ Error fetching custom paths:', error);
    console.error('Error details:', error.message, error.stack);
    return [];
  }
};

/**
 * Get path connections from Supabase
 * @returns {Promise<Array>} Array of path connections
 */
export const getPathConnections = async () => {
  try {
    if (USE_MOCK_DATA) {
      return []; // No connections in mock mode
    }

    return await mapService.getPathConnections();
  } catch (error) {
    console.error('Error fetching path connections:', error);
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
      // Handle null/undefined is_accessible (default to true)
      if (waypoint.is_accessible === false) return;

      const wpLat = typeof waypoint.latitude === 'number' 
        ? waypoint.latitude 
        : parseFloat(waypoint.latitude);
      const wpLng = typeof waypoint.longitude === 'number' 
        ? waypoint.longitude 
        : parseFloat(waypoint.longitude);

      // Validate coordinates
      if (isNaN(wpLat) || isNaN(wpLng)) {
        console.warn(`Invalid waypoint coordinates: (${waypoint.latitude}, ${waypoint.longitude})`);
        return;
      }

      const distance = calculateDistance(coord, {
        latitude: wpLat,
        longitude: wpLng,
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
  console.log(`  🔨 Building route for path: ${path.path_name || path.name}`);
  
  const waypoints = path.waypoints || [];
  if (waypoints.length < 2) {
    console.log(`    ❌ Not enough waypoints (${waypoints.length})`);
    return null;
  }

  // Get waypoints between start and end
  const startSeq = startWaypoint.waypoint.sequence;
  const endSeq = endWaypoint.waypoint.sequence;
  
  console.log(`    - Start waypoint sequence: ${startSeq}`);
  console.log(`    - End waypoint sequence: ${endSeq}`);
  
  // Determine direction (forward or reverse)
  const forward = startSeq <= endSeq;
  const minSeq = Math.min(startSeq, endSeq);
  const maxSeq = Math.max(startSeq, endSeq);

  console.log(`    - Direction: ${forward ? 'forward' : 'reverse'}`);
  console.log(`    - Sequence range: ${minSeq} to ${maxSeq}`);

  // Get ALL waypoints in the route (including start and end waypoints)
  // We need to include ALL waypoints between startSeq and endSeq
  // IMPORTANT: Include ALL waypoints in the sequence range to follow the actual path
  let routeWaypoints = waypoints
    .filter(wp => {
      const seq = wp.sequence;
      // Include waypoints in the range (inclusive of both start and end)
      const inRange = seq >= minSeq && seq <= maxSeq;
      const accessible = wp.is_accessible !== false; // Default to true if not set
      return inRange && accessible;
    })
    .sort((a, b) => a.sequence - b.sequence);

  console.log(`    - Total waypoints in path: ${waypoints.length}`);
  console.log(`    - Waypoints in range (${minSeq} to ${maxSeq}): ${routeWaypoints.length}`);
  if (routeWaypoints.length > 0) {
    console.log(`    - Waypoint sequences: [${routeWaypoints.map(wp => wp.sequence).join(', ')}]`);
  }

  // Ensure we have at least the start and end waypoints
  if (routeWaypoints.length === 0) {
    console.log(`    ❌ No waypoints found in range ${minSeq} to ${maxSeq}`);
    console.log(`    Available waypoint sequences: [${waypoints.map(wp => wp.sequence).join(', ')}]`);
    return null;
  }

  // If we only have 1 waypoint, we might be missing some
  if (routeWaypoints.length === 1) {
    console.warn(`    ⚠️ Only 1 waypoint in range - route may not follow path correctly`);
  }

  // Reverse if going backwards
  if (!forward) {
    routeWaypoints = routeWaypoints.reverse();
    console.log(`    - Reversed waypoints for backward direction`);
  }

  // Build coordinates array: start -> ALL waypoints in sequence -> end
  // This ensures the route follows the path through all intermediate waypoints
  const coordinates = [
    start, // User's current location (may be slightly off the path)
  ];

  // Add ALL waypoints in order (this is the key - include all waypoints, not just start/end)
  // The route MUST follow the path through every waypoint in sequence
  routeWaypoints.forEach((wp, index) => {
    const lat = typeof wp.latitude === 'number' ? wp.latitude : parseFloat(wp.latitude);
    const lng = typeof wp.longitude === 'number' ? wp.longitude : parseFloat(wp.longitude);
    
    // Validate coordinates
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates.push({
        latitude: lat,
        longitude: lng,
      });
      console.log(`      Added waypoint ${index + 1}/${routeWaypoints.length} (seq ${wp.sequence}): (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    } else {
      console.warn(`      Skipped invalid waypoint ${index + 1} (seq ${wp.sequence}): invalid coordinates`);
    }
  });

  // Add destination (may be slightly off the path)
  coordinates.push(end);

  console.log(`    ✅ Route built with ${coordinates.length} coordinates:`);
  console.log(`       - Start point: (${start.latitude.toFixed(6)}, ${start.longitude.toFixed(6)})`);
  console.log(`       - ${routeWaypoints.length} waypoints along path`);
  console.log(`       - End point: (${end.latitude.toFixed(6)}, ${end.longitude.toFixed(6)})`);

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
 * Build a graph from paths and connections for multi-path routing
 * Nodes are waypoints, edges are path segments and connections
 * @param {Array} paths - Array of paths with waypoints
 * @param {Array} connections - Array of path connections
 * @returns {Object} Graph structure { nodes, edges }
 */
const buildPathGraph = (paths, connections) => {
  const nodes = new Map(); // waypoint_id -> { waypoint, path_id, path_name }
  const edges = new Map(); // waypoint_id -> [{ to, distance, type, path_id }]

  // Add all waypoints as nodes
  paths.forEach(path => {
    if (!path.is_active || !path.waypoints) return;
    
    path.waypoints.forEach(wp => {
      if (wp.is_accessible === false) return;
      
      nodes.set(wp.id, {
        waypoint: wp,
        path_id: path.path_id,
        path_name: path.path_name,
      });

      // Initialize edges array
      if (!edges.has(wp.id)) {
        edges.set(wp.id, []);
      }
    });
  });

  // Add edges within paths (consecutive waypoints)
  paths.forEach(path => {
    if (!path.is_active || !path.waypoints || path.waypoints.length < 2) return;
    
    const sortedWaypoints = [...path.waypoints]
      .filter(wp => wp.is_accessible !== false)
      .sort((a, b) => a.sequence - b.sequence);

    for (let i = 0; i < sortedWaypoints.length - 1; i++) {
      const from = sortedWaypoints[i];
      const to = sortedWaypoints[i + 1];
      
      const distance = calculateDistance(
        { latitude: parseFloat(from.latitude), longitude: parseFloat(from.longitude) },
        { latitude: parseFloat(to.latitude), longitude: parseFloat(to.longitude) }
      );

      edges.get(from.id).push({
        to: to.id,
        distance,
        type: 'path_segment',
        path_id: path.path_id,
        path_name: path.path_name,
      });

      // Paths are bidirectional (can walk both ways)
      if (!edges.has(to.id)) edges.set(to.id, []);
      edges.get(to.id).push({
        to: from.id,
        distance,
        type: 'path_segment',
        path_id: path.path_id,
        path_name: path.path_name,
      });
    }
  });

  // Add edges from path connections
  connections.forEach(conn => {
    if (!conn.is_accessible) return;

    const distance = conn.distance_meters ? conn.distance_meters / 1000 : 0.01; // Convert meters to km

    if (edges.has(conn.from_waypoint_id)) {
      edges.get(conn.from_waypoint_id).push({
        to: conn.to_waypoint_id,
        distance,
        type: 'connection',
        connection_type: conn.connection_type,
        path_id: conn.to_path_id,
      });
    }

    // If bidirectional, add reverse edge
    if (conn.is_bidirectional && edges.has(conn.to_waypoint_id)) {
      edges.get(conn.to_waypoint_id).push({
        to: conn.from_waypoint_id,
        distance,
        type: 'connection',
        connection_type: conn.connection_type,
        path_id: conn.from_path_id,
      });
    }
  });

  return { nodes, edges };
};

/**
 * Dijkstra's algorithm to find shortest path through waypoint graph
 * @param {number} startWaypointId - Starting waypoint ID
 * @param {number} endWaypointId - Ending waypoint ID
 * @param {Object} graph - Graph structure from buildPathGraph
 * @returns {Array|null} Array of waypoint IDs representing the path, or null if no path found
 */
const findShortestPath = (startWaypointId, endWaypointId, graph) => {
  const { nodes, edges } = graph;

  if (!nodes.has(startWaypointId) || !nodes.has(endWaypointId)) {
    return null;
  }

  // Dijkstra's algorithm
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  // Initialize
  nodes.forEach((_, waypointId) => {
    distances.set(waypointId, waypointId === startWaypointId ? 0 : Number.POSITIVE_INFINITY);
    previous.set(waypointId, null);
    unvisited.add(waypointId);
  });

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current = null;
    let minDist = Number.POSITIVE_INFINITY;
    
    unvisited.forEach(id => {
      const dist = distances.get(id);
      if (dist < minDist) {
        minDist = dist;
        current = id;
      }
    });

    if (current === null || minDist === Number.POSITIVE_INFINITY) {
      break; // No path found
    }

    if (current === endWaypointId) {
      // Reconstruct path
      const path = [];
      let node = endWaypointId;
      while (node !== null) {
        path.unshift(node);
        node = previous.get(node);
      }
      return path;
    }

    unvisited.delete(current);

    // Check neighbors
    const neighbors = edges.get(current) || [];
    neighbors.forEach(edge => {
      if (!unvisited.has(edge.to)) return;

      const alt = distances.get(current) + edge.distance;
      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    });
  }

  return null; // No path found
};

/**
 * Build route from waypoint path
 * @param {Object} start - Start coordinate
 * @param {Object} end - End coordinate
 * @param {Array} waypointPath - Array of waypoint IDs from Dijkstra
 * @param {Object} graph - Graph structure
 * @returns {Object} Route data
 */
const buildMultiPathRoute = (start, end, waypointPath, graph) => {
  const { nodes } = graph;
  const coordinates = [start];

  console.log(`  🔨 Building multi-path route with ${waypointPath.length} waypoints`);

  // Add ALL waypoints in order (this ensures the route follows the path)
  // The waypointPath from Dijkstra's algorithm contains the optimal path through waypoints
  waypointPath.forEach((waypointId, index) => {
    const node = nodes.get(waypointId);
    if (node && node.waypoint) {
      const lat = parseFloat(node.waypoint.latitude);
      const lng = parseFloat(node.waypoint.longitude);
      
      // Validate coordinates
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates.push({
          latitude: lat,
          longitude: lng,
        });
        console.log(`      Waypoint ${index + 1}/${waypointPath.length}: (${lat.toFixed(6)}, ${lng.toFixed(6)}) on path "${node.path_name}"`);
      } else {
        console.warn(`      Skipped invalid waypoint ${index + 1}: invalid coordinates`);
      }
    } else {
      console.warn(`      Skipped waypoint ${index + 1}: node not found`);
    }
  });

  coordinates.push(end);
  
  console.log(`    ✅ Multi-path route built with ${coordinates.length} coordinates (start + ${waypointPath.length} waypoints + end)`);

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += calculateDistance(coordinates[i], coordinates[i + 1]);
  }

  // Get path names used in route
  const pathNames = new Set();
  waypointPath.forEach(waypointId => {
    const node = nodes.get(waypointId);
    if (node) {
      pathNames.add(node.path_name);
    }
  });

  return {
    success: true,
    coordinates,
    distance: totalDistance,
    duration: calculateWalkingTime(totalDistance),
    pathName: Array.from(pathNames).join(' → '),
    isCustomPath: true,
    isMultiPath: pathNames.size > 1,
  };
};

/**
 * Find the best path between two points using custom paths
 * Now supports cross-path routing via path_connections
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @param {Array} paths - Array of custom paths
 * @param {Array} connections - Array of path connections (optional)
 * @returns {Object|null} Best route or null if no suitable path found
 */
export const findBestCustomPath = (start, end, paths, connections = []) => {
  console.log('🔍 findBestCustomPath called');
  console.log('  Start:', start);
  console.log('  End:', end);
  console.log('  Paths count:', paths?.length || 0);
  console.log('  Connections count:', connections?.length || 0);

  if (!paths || paths.length === 0) {
    console.log('❌ No paths provided');
    return null;
  }

  // Log path details
  paths.forEach((path, idx) => {
    console.log(`  Path ${idx + 1}: ${path.path_name || path.name || 'Unnamed'}`);
    console.log(`    - Active: ${path.is_active}`);
    console.log(`    - Waypoints: ${path.waypoints?.length || 0}`);
    if (path.waypoints && path.waypoints.length > 0) {
      const accessibleCount = path.waypoints.filter(wp => wp.is_accessible !== false).length;
      console.log(`    - Accessible waypoints: ${accessibleCount}`);
    }
  });

  // If we have connections, use graph-based multi-path routing
  if (connections.length > 0) {
    try {
      // Build graph from paths and connections
      const graph = buildPathGraph(paths, connections);

      // Find nearest waypoints to start and end
      let nearestToStart = null;
      let nearestToEnd = null;
      let minDistStart = Number.POSITIVE_INFINITY;
      let minDistEnd = Number.POSITIVE_INFINITY;

      graph.nodes.forEach((node, waypointId) => {
        const wp = node.waypoint;
        const wpCoord = {
          latitude: parseFloat(wp.latitude),
          longitude: parseFloat(wp.longitude),
        };

        const distToStart = calculateDistance(start, wpCoord);
        const distToEnd = calculateDistance(end, wpCoord);

        if (distToStart < minDistStart) {
          minDistStart = distToStart;
          nearestToStart = { waypointId, waypoint: wp, distance: distToStart };
        }
        if (distToEnd < minDistEnd) {
          minDistEnd = distToEnd;
          nearestToEnd = { waypointId, waypoint: wp, distance: distToEnd };
        }
      });

      console.log(`\n📊 Multi-path routing summary:`);
      console.log(`  - Distance to start waypoint: ${minDistStart.toFixed(3)} km`);
      console.log(`  - Distance to end waypoint: ${minDistEnd.toFixed(3)} km`);
      console.log(`  - Total score: ${(minDistStart + minDistEnd).toFixed(3)} km`);

      // Increase threshold to 1km for more lenient matching
      const THRESHOLD = 1.0; // 1 km
      
      // Only proceed if both are within reasonable distance
      if (nearestToStart && nearestToEnd && (minDistStart + minDistEnd) <= THRESHOLD) {
        // Find shortest path through graph
        const waypointPath = findShortestPath(
          nearestToStart.waypointId,
          nearestToEnd.waypointId,
          graph
        );

        if (waypointPath && waypointPath.length > 0) {
          const route = buildMultiPathRoute(start, end, waypointPath, graph);
          return {
            ...route,
            startDistance: minDistStart,
            endDistance: minDistEnd,
          };
        }
      }
    } catch (error) {
      console.error('Error in multi-path routing:', error);
      // Fall through to single-path routing
    }
  }

  // Fallback to single-path routing (original logic)
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
      // Handle null/undefined is_accessible (default to true if not set)
      if (wp.is_accessible === false) {
        console.log(`    Skipping inaccessible waypoint ${wp.id || wp.waypoint_id}`);
        return;
      }

      const wpCoord = {
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
      };

      // Validate coordinates
      if (isNaN(wpCoord.latitude) || isNaN(wpCoord.longitude)) {
        console.warn(`    Invalid coordinates for waypoint ${wp.id || wp.waypoint_id}`);
        return;
      }

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

    if (!nearestToStart || !nearestToEnd) {
      console.log(`    Path "${path.path_name || path.name}": No nearest waypoints found`);
      return;
    }

    // Score = sum of distances from start/end to their nearest waypoints
    const score = minDistStart + minDistEnd;
    console.log(`    Path "${path.path_name || path.name}":`);
    console.log(`      - Distance to start: ${minDistStart.toFixed(3)} km`);
    console.log(`      - Distance to end: ${minDistEnd.toFixed(3)} km`);
    console.log(`      - Total score: ${score.toFixed(3)} km`);

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
        console.log(`      ✅ New best route found!`);
      } else {
        console.log(`      ❌ Could not build route from waypoints`);
      }
    }
  });

  console.log(`\n📊 Best route summary:`);
  console.log(`  - Best score: ${bestScore.toFixed(3)} km`);
  console.log(`  - Threshold: 0.5 km (500m)`);
  console.log(`  - Within threshold: ${bestScore <= 0.5}`);

  // Increase threshold to 1km (1000m) for more lenient matching
  // This helps when paths are slightly further from start/end points
  const THRESHOLD = 1.0; // 1 km instead of 0.5 km
  
  if (bestRoute && bestScore <= THRESHOLD) {
    console.log(`✅ Returning best route: ${bestRoute.pathName || 'Unnamed'}`);
    return bestRoute;
  }

  if (bestRoute) {
    console.log(`⚠️ Best route found but score (${bestScore.toFixed(3)} km) exceeds threshold (${THRESHOLD} km)`);
  } else {
    console.log(`❌ No suitable route found`);
  }

  return null;
};

/**
 * Calculate route using hybrid approach:
 * - OSRM for routing outside campus
 * - Custom paths for routing inside campus
 * - Seamless transition at campus boundary
 * @param {Object} start - Start coordinate {latitude, longitude}
 * @param {Object} end - End coordinate {latitude, longitude}
 * @returns {Promise<Object>} Route data
 */
export const calculateRoute = async (start, end) => {
  console.log('🗺️ Calculating route from', start, 'to', end);

  // Ensure boundaries are loaded
  await getCampusBoundaries();
  
  const startInside = await isInsideCampus(start);
  const endInside = await isInsideCampus(end);

  console.log(`📍 Start: ${startInside ? 'Inside' : 'Outside'} campus`);
  console.log(`📍 End: ${endInside ? 'Inside' : 'Outside'} campus`);

  // Case 1: Both outside campus → Use OSRM only
  if (!startInside && !endInside) {
    console.log('🌍 Both points outside campus - using OSRM');
    const osrmRoute = await getOSRMRoute(start, end);
    if (osrmRoute.success) {
      return osrmRoute;
    }
    // Fallback to direct line if OSRM fails
    return createDirectRoute(start, end);
  }

  // Case 2: Both inside campus → Use custom paths only
  if (startInside && endInside) {
    console.log('🏫 Both points inside campus - using custom paths');
    
    if (!USE_MOCK_DATA) {
      try {
        const customPaths = await getCustomPaths();
        const connections = await getPathConnections();
        
        if (customPaths.length > 0) {
          const route = findBestCustomPath(start, end, customPaths, connections);
          if (route) {
            if (route.isMultiPath) {
              console.log('✅ Using multi-path route:', route.pathName);
            } else {
              console.log('✅ Using custom path:', route.pathName);
            }
            return route;
          } else {
            console.log('⚠️ No suitable custom path found, using direct route');
          }
        } else {
          console.log('⚠️ No custom paths available, using direct route');
        }
      } catch (error) {
        console.error('Error finding custom path:', error);
      }
    }
    
    // Fallback to direct line if no custom paths
    return createDirectRoute(start, end);
  }

  // Case 3: Mixed (one inside, one outside) → Hybrid routing
  console.log('🔀 Mixed routing: OSRM + Custom paths');
  
  if (!USE_MOCK_DATA) {
    try {
      const customPaths = await getCustomPaths();
      const connections = await getPathConnections();
      
      if (customPaths.length === 0) {
        // No custom paths, use OSRM for entire route
        console.log('⚠️ No custom paths available, using OSRM for entire route');
        const osrmRoute = await getOSRMRoute(start, end);
        if (osrmRoute.success) {
          return osrmRoute;
        }
        return createDirectRoute(start, end);
      }

      let entryPoint = null;
      let exitPoint = null;
      let campusRoute = null;
      let osrmRoute = null;

      if (!startInside && endInside) {
        // Coming from outside → Find entry point
        entryPoint = findCampusEntryPoint(start, customPaths);
        if (entryPoint) {
          console.log(`🚪 Entry point: ${entryPoint.path_name} waypoint ${entryPoint.waypoint.sequence}`);
          
          // OSRM route: start → entry point
          const entryCoord = {
            latitude: parseFloat(entryPoint.waypoint.latitude),
            longitude: parseFloat(entryPoint.waypoint.longitude),
          };
          osrmRoute = await getOSRMRoute(start, entryCoord);
          
          // Campus route: entry point → end
          const campusRouteResult = findBestCustomPath(entryCoord, end, customPaths, connections);
          if (campusRouteResult) {
            campusRoute = campusRouteResult;
          }
        }
      } else if (startInside && !endInside) {
        // Going to outside → Find exit point
        exitPoint = findCampusEntryPoint(end, customPaths); // Reuse function (finds nearest to outside point)
        if (exitPoint) {
          console.log(`🚪 Exit point: ${exitPoint.path_name} waypoint ${exitPoint.waypoint.sequence}`);
          
          // Campus route: start → exit point
          const exitCoord = {
            latitude: parseFloat(exitPoint.waypoint.latitude),
            longitude: parseFloat(exitPoint.waypoint.longitude),
          };
          const campusRouteResult = findBestCustomPath(start, exitCoord, customPaths, connections);
          if (campusRouteResult) {
            campusRoute = campusRouteResult;
          }
          
          // OSRM route: exit point → end
          osrmRoute = await getOSRMRoute(exitCoord, end);
        }
      }

      // Combine routes if both exist
      if (osrmRoute && osrmRoute.success && campusRoute && campusRoute.success) {
        const combinedCoordinates = combineRoutes(
          osrmRoute.coordinates,
          campusRoute.coordinates
        );
        
        const totalDistance = osrmRoute.distance + campusRoute.distance;
        const totalDuration = osrmRoute.duration + campusRoute.duration;

        return {
          success: true,
          coordinates: combinedCoordinates,
          distance: totalDistance,
          duration: totalDuration,
          isHybridRoute: true,
          pathName: campusRoute.pathName || 'Campus Path',
          message: 'Route uses OSRM outside campus and custom paths inside campus',
        };
      }

      // If only one route exists, use it
      if (osrmRoute && osrmRoute.success) {
        return osrmRoute;
      }
      if (campusRoute && campusRoute.success) {
        return campusRoute;
      }
    } catch (error) {
      console.error('Error in hybrid routing:', error);
    }
  }

  // Fallback: Use OSRM for entire route
  console.log('📍 Fallback: Using OSRM for entire route');
  const osrmRoute = await getOSRMRoute(start, end);
  if (osrmRoute.success) {
    return osrmRoute;
  }

  // Final fallback: Direct line
  return createDirectRoute(start, end);
};

/**
 * Create a direct route (straight line) as fallback
 * @param {Object} start - Start coordinate
 * @param {Object} end - End coordinate
 * @returns {Object} Route data
 */
const createDirectRoute = (start, end) => {
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
    isDirectRoute: true,
    message: 'No routing available. Showing direct line.',
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

  if (route.isHybridRoute) {
    return `🌍 Hybrid Route\nOSRM + ${route.pathName || 'Campus Path'}\n${distanceText} • ${timeText}`;
  } else if (route.isOSRMRoute) {
    return `🌍 OSRM Route\n${distanceText} • ${timeText}\n(Outside campus)`;
  } else if (route.isCustomPath) {
    if (route.isMultiPath) {
      return `📍 Multi-Path Route\n${route.pathName}\n${distanceText} • ${timeText}`;
    }
    return `📍 ${route.pathName || 'Campus Path'}\n${distanceText} • ${timeText}`;
  } else if (route.isDirectRoute) {
    return `📍 Direct Route\n${distanceText} • ${timeText}\n(No routing available)`;
  }

  return `${distanceText} • ${timeText}`;
};
