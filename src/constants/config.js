// Enable mock data when API is unavailable (for development/testing)
// Set to true to always use mock data, or leave false to auto-fallback on error
// For now, enabling mock data by default since API is not available
export const USE_MOCK_DATA = false; // Set to false to try API first, then fallback to mock data

export const API_TIMEOUT = 5000; // 5 seconds

// API URL for legacy REST API endpoints (if using separate backend)
// If using Supabase directly, this is not needed
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// EVSU Tacloban Campus center coordinates
export const EVSU_CENTER = {
  latitude: 11.239173,
  longitude: 124.997,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Define campus boundaries (users can't scroll outside this area)
export const CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.26, longitude: 125.02 },
  southWest: { latitude: 11.23, longitude: 124.99 },
};

// Map animation settings
export const MAP_ANIMATION_DURATION = 1000; // milliseconds
export const MAP_ZOOM_DELTA = 0.005;

// Route calculation constants
export const WALKING_SPEED_KM_PER_MIN = 0.083; // ~5 km/h = 0.083 km/min
export const EARTH_RADIUS_KM = 6371;

