// src/constants/config.js - Application Configuration

// ⚠️ IMPORTANT: Replace this with YOUR computer's IP address!
// Find it using: ipconfig (Windows) or ifconfig (Mac/Linux)
// For production, use environment variables or a proper backend URL
// Using typeof check for __DEV__ to ensure compatibility

// For Android Emulator, use: 'http://10.0.2.2:3000/api'
// For iOS Simulator or Physical Device, use your computer's IP: 'http://192.168.1.9:3000/api'
// To find your IP: ipconfig (Windows) or ifconfig (Mac/Linux) - look for IPv4 Address

export const API_URL = (typeof __DEV__ !== 'undefined' && __DEV__)
  ? 'http://192.168.1.8:3000/api'  // Development - Update with your IP
  : 'https://api.evsuemap.com/api'; // Production - Replace with actual URL

// Enable mock data when API is unavailable (for development/testing)
// Set to true to always use mock data, or leave false to auto-fallback on error
// For now, enabling mock data by default since API is not available
export const USE_MOCK_DATA = true; // Set to false to try API first, then fallback to mock data

export const API_TIMEOUT = 5000; // 5 seconds

// EVSU Tacloban Campus center coordinates
export const EVSU_CENTER = {
  latitude: 11.2443,
  longitude: 125.0023,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Define campus boundaries (users can't scroll outside this area)
export const CAMPUS_BOUNDARIES = {
  northEast: { latitude: 11.2500, longitude: 125.0080 },
  southWest: { latitude: 11.2380, longitude: 124.9960 },
};

// Map animation settings
export const MAP_ANIMATION_DURATION = 1000; // milliseconds
export const MAP_ZOOM_DELTA = 0.005;

// Route calculation constants
export const WALKING_SPEED_KM_PER_MIN = 0.083; // ~5 km/h = 0.083 km/min
export const EARTH_RADIUS_KM = 6371;

