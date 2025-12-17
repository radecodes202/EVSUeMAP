// src/screens/MapScreen.js - Main Map Screen
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Text, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Conditionally import react-native-maps only on native platforms
let MapView, Marker, Polyline, Polygon, PROVIDER_DEFAULT;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Polygon = Maps.Polygon;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

// Constants
import { EVSU_CENTER, CAMPUS_BOUNDARIES, MAP_ANIMATION_DURATION, MAP_ZOOM_DELTA, USE_MOCK_DATA } from '../constants/config';
import { Colors, Spacing, Shadows } from '../constants/theme';

// Utils
import { calculateDistance, calculateWalkingTime } from '../utils/distance';
import { calculateRoute as getRoute, getRouteSummary } from '../utils/routing';
import { getErrorMessage } from '../utils/errorHandler';
import { mockBuildings } from '../utils/mockData';
import { mapService } from '../services/mapService';

// Components
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import ControlButton from '../components/ControlButton';
import InfoCard from '../components/InfoCard';

const MapScreen = ({ navigation, route }) => {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [mapRegion, setMapRegion] = useState(EVSU_CENTER);
  const [paths, setPaths] = useState([]);
  const [mapType, setMapType] = useState('standard');
  const [roomCount, setRoomCount] = useState(0);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isUserInitiatedMove, setIsUserInitiatedMove] = useState(false);
  
  // Convert meters to approximate lat/lng degrees (1 degree ≈ 111,320 meters at equator)
  const metersToLatDegrees = (meters) => meters / 111320;
  const metersToLngDegrees = (meters, latitude) => meters / (111320 * Math.cos(latitude * Math.PI / 180));

  // Fetch buildings when component loads
  useEffect(() => {
    console.log('MapScreen loaded');
    fetchBuildings();
    fetchPaths();
    fetchRoomCount();
    requestLocationPermission();
    
    // Center map on campus when component mounts
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
      }
    }, 500);

    // Subscribe to real-time building updates
    const unsubscribe = mapService.subscribeToBuildings((payload) => {
      console.log('Building updated:', payload);
      // Refresh buildings when changes occur
      fetchBuildings();
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle navigation from Search screen
  useEffect(() => {
    if (route.params?.selectedLocation) {
      console.log('Navigating to:', route.params.selectedLocation);
      handleLocationFromSearch(route.params.selectedLocation);
    }
  }, [route.params?.selectedLocation]);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      console.log('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        getCurrentLocation();
      } else {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Permission Denied', 
          'Location permission is required for navigation features.'
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      console.log('✅ Current location:', userCoords);
      setUserLocation(userCoords);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Could not get your current location');
    }
  };

  // Fetch buildings from Supabase or API
  const fetchBuildings = async () => {
    try {
      setErrorMessage('');
      console.log('Fetching buildings...');
      
      // Use mapService which handles Supabase or mock data
      const buildingsData = await mapService.getBuildings();
      
      console.log('✅ Buildings fetched:', buildingsData.length);
      setBuildings(buildingsData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching buildings:', error.message);
      
      // Fallback to mock data
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      if (isDev || USE_MOCK_DATA) {
        console.log('📦 Falling back to mock data');
        setBuildings(mockBuildings);
        setLoading(false);
        setErrorMessage('');
        return;
      }
      
      const errorMsg = getErrorMessage(error);
      setErrorMessage(errorMsg);
      setLoading(false);
      Alert.alert('Connection Error', errorMsg);
    }
  };

  // Fetch admin-defined paths and waypoints
  const fetchPaths = async () => {
    try {
      const data = await mapService.getPaths();
      setPaths(data);
    } catch (error) {
      console.error('❌ Error fetching paths:', error);
    }
  };

  // Fetch total room count
  const fetchRoomCount = async () => {
    try {
      const count = await mapService.getRoomCount();
      setRoomCount(count);
      console.log('✅ Room count:', count);
    } catch (error) {
      console.error('❌ Error fetching room count:', error);
    }
  };

  // Handle location selected from Search screen
  const handleLocationFromSearch = async (location) => {
    console.log('Setting selected location:', location);
    setSelectedLocation(location);
    
    // Animate map to the location
    setIsUserInitiatedMove(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        latitudeDelta: MAP_ZOOM_DELTA,
        longitudeDelta: MAP_ZOOM_DELTA,
      }, MAP_ANIMATION_DURATION);
    }
    setTimeout(() => {
      setIsUserInitiatedMove(false);
    }, MAP_ANIMATION_DURATION + 100);

    // Calculate route if user location is available
    if (userLocation) {
      await calculateRoute(userLocation, {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      });
    }
  };

  // Calculate route between two points using custom campus paths only
  const calculateRoute = async (start, end) => {
    console.log('Calculating campus route from', start, 'to', end);
    
    try {
      setLoading(true);

      // Use the routing utility which only uses custom paths
      const routeData = await getRoute(start, end);
      
      if (routeData.success) {
        setRouteCoordinates(routeData.coordinates);
        
        // Get formatted summary
        const summary = getRouteSummary(routeData);
        
        if (routeData.isCustomPath) {
          // Successfully using custom path
          Alert.alert(
            '🗺️ Route Found',
            summary,
            [{ text: 'OK' }]
          );
        } else if (routeData.isDirectRoute) {
          // No custom path available - showing direct line
          Alert.alert(
            '📍 Direct Route',
            `${summary}\n\nNo custom path covers this route yet.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Should not happen with current implementation
        setRouteCoordinates([start, end]);
        Alert.alert(
          'Route Error',
          'Could not calculate route. Showing direct line.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback to straight line
      setRouteCoordinates([start, end]);
      const distance = calculateDistance(start, end);
      const timeMinutes = calculateWalkingTime(distance);
      
      Alert.alert(
        'Route Error',
        `Distance: ${distance.toFixed(2)} km\nEstimated time: ${timeMinutes} min\n(Direct route)`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Center map on user location
  const centerOnUser = async () => {
    if (!userLocation) {
      await getCurrentLocation();
    }
    
    if (userLocation && mapRef.current) {
      console.log('Centering on user location');
      setIsUserInitiatedMove(true); // Allow centering even outside campus
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: MAP_ZOOM_DELTA,
        longitudeDelta: MAP_ZOOM_DELTA,
      }, MAP_ANIMATION_DURATION);
      // Reset flag after animation completes
      setTimeout(() => {
        setIsUserInitiatedMove(false);
      }, MAP_ANIMATION_DURATION + 100);
    } else {
      Alert.alert('Location', 'Getting your location...');
    }
  };

  // Check if region is within campus boundaries
  const isWithinCampusBounds = (region) => {
    const { latitude, longitude } = region;
    const { northEast, southWest } = CAMPUS_BOUNDARIES;
    
    return (
      latitude >= southWest.latitude &&
      latitude <= northEast.latitude &&
      longitude >= southWest.longitude &&
      longitude <= northEast.longitude
    );
  };

  // Handle region change - keep map within campus boundaries
  // But allow user-initiated moves (like centering on location)
  const handleRegionChangeComplete = (region) => {
    // Don't enforce boundaries if user is intentionally moving (e.g., centering on location)
    if (isUserInitiatedMove) {
      setMapRegion(region);
      return;
    }
    
    // Allow some panning but keep focus on campus
    // If user pans too far, gently guide back (but only if not user-initiated)
    if (!isWithinCampusBounds(region)) {
      // Only snap back if it's not a user-initiated action
      // This allows users to view areas outside campus when they intentionally navigate there
      const distanceFromCampus = Math.sqrt(
        Math.pow(region.latitude - EVSU_CENTER.latitude, 2) +
        Math.pow(region.longitude - EVSU_CENTER.longitude, 2)
      );
      
      // Only snap back if user is very far from campus (more than 0.1 degrees away)
      // This gives users some freedom to explore while still keeping focus on campus
      if (distanceFromCampus > 0.1) {
        setMapRegion(EVSU_CENTER);
        if (mapRef.current) {
          mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
        }
      } else {
        // Allow some movement outside campus, just update the region
        setMapRegion(region);
      }
    } else {
      // Update region if within bounds
      setMapRegion(region);
    }
  };

  // Center map on campus
  const centerOnCampus = () => {
    console.log('Centering on campus');
    setIsUserInitiatedMove(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
    }
    setTimeout(() => {
      setIsUserInitiatedMove(false);
    }, MAP_ANIMATION_DURATION + 100);
  };

  // Clear route and selection
  const clearRoute = () => {
    console.log('Clearing route');
    setRouteCoordinates([]);
    setSelectedLocation(null);
  };

  // Create a rectangle polygon around a building using actual dimensions
  // Supports rotation for buildings that aren't aligned with north
  const getBuildingPolygon = (building) => {
    const lat = parseFloat(building.latitude);
    const lng = parseFloat(building.longitude);
    
    // Get dimensions from database or use defaults (in meters)
    const widthMeters = parseFloat(building.width_meters) || 20.0;
    const heightMeters = parseFloat(building.height_meters) || 20.0;
    const rotationDeg = parseFloat(building.rotation_degrees) || 0.0;
    
    // Convert meters to degrees (accounting for latitude)
    const halfWidthDeg = metersToLngDegrees(widthMeters / 2, lat);
    const halfHeightDeg = metersToLatDegrees(heightMeters / 2);
    
    // Define corners relative to center (in degrees, before rotation)
    // Using a coordinate system where x = longitude offset, y = latitude offset
    const corners = [
      { x: -halfWidthDeg, y: halfHeightDeg },   // top-left
      { x: halfWidthDeg, y: halfHeightDeg },     // top-right
      { x: halfWidthDeg, y: -halfHeightDeg },    // bottom-right
      { x: -halfWidthDeg, y: -halfHeightDeg },  // bottom-left
    ];
    
    // Apply rotation around center (0, 0)
    if (Math.abs(rotationDeg) > 0.01) { // Only rotate if significant
      const radians = (rotationDeg * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      return corners.map(corner => {
        // Rotate the corner coordinates
        const rotatedX = corner.x * cos - corner.y * sin;
        const rotatedY = corner.x * sin + corner.y * cos;
        
        return {
          latitude: lat + rotatedY,  // y maps to latitude
          longitude: lng + rotatedX, // x maps to longitude
        };
      });
    }
    
    // No rotation - simple offset
    return corners.map(corner => ({
      latitude: lat + corner.y,
      longitude: lng + corner.x,
    }));
  };

  // Handle navigate button press
  const handleNavigate = async () => {
    if (userLocation && selectedLocation) {
      await calculateRoute(userLocation, {
        latitude: parseFloat(selectedLocation.latitude),
        longitude: parseFloat(selectedLocation.longitude),
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <LoadingView 
        message="Loading campus map..." 
        onRetry={fetchBuildings}
        showRetry={errorMessage !== ''}
      />
    );
  }

  // Error state
  if (buildings.length === 0 && errorMessage !== '') {
    return (
      <ErrorView 
        title="Connection Failed"
        message={errorMessage}
        onRetry={fetchBuildings}
      />
    );
  }

  // Web fallback - show a simple map placeholder with building list
  if (Platform.OS === 'web') {
    const mapUrl = `https://www.openstreetmap.org/?mlat=${EVSU_CENTER.latitude}&mlon=${EVSU_CENTER.longitude}&zoom=16`;
    
    return (
      <View style={styles.container}>
        <View style={styles.webMapContainer}>
          <View style={styles.webMapPlaceholder}>
            <Ionicons name="map-outline" size={48} color={Colors.primary} />
            <Text style={styles.webMapText}>Interactive Map</Text>
            <Text style={styles.webMapSubtext}>
              Map view is optimized for mobile devices.{'\n'}
              {Platform.OS === 'web' && typeof window !== 'undefined' && (
                <Text 
                  style={{ color: Colors.primary, textDecorationLine: 'underline', cursor: 'pointer' }}
                  onPress={() => window.open(mapUrl, '_blank')}
                >
                  Open in OpenStreetMap
                </Text>
              )}
            </Text>
            <View style={styles.buildingsList}>
              <Text style={styles.buildingsListTitle}>Buildings ({buildings.length})</Text>
              {buildings.slice(0, 10).map((building) => (
                <View key={building.building_id || building.id} style={styles.buildingItem}>
                  <Ionicons name="business" size={20} color={Colors.primary} />
                  <View style={styles.buildingInfo}>
                    <Text style={styles.buildingName}>{building.building_name}</Text>
                    <Text style={styles.buildingCode}>{building.building_code}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        {/* Control Buttons */}
        <View style={styles.controls}>
          <ControlButton 
            iconName="school-outline" 
            onPress={centerOnCampus}
          />
          
          <ControlButton 
            iconName="locate" 
            onPress={centerOnUser}
          />
          
          {routeCoordinates.length > 0 && (
            <ControlButton 
              iconName="close" 
              onPress={clearRoute}
              backgroundColor={Colors.secondary}
            />
          )}
        </View>

        {/* Location Info Card */}
        {selectedLocation && (
          <InfoCard
            title={selectedLocation.name}
            code={selectedLocation.code}
            description={selectedLocation.description}
            onClose={clearRoute}
            onNavigate={handleNavigate}
            showNavigate={!!userLocation}
            room={selectedLocation.room || null}
          />
        )}

        {/* Buildings and Rooms Count Badge */}
        <View style={styles.buildingsBadge}>
          <Ionicons name="business" size={16} color={Colors.primary} />
          <Text style={styles.buildingsBadgeText}>{buildings.length} Buildings</Text>
          {roomCount > 0 && (
            <>
              <Text style={styles.buildingsBadgeSeparator}>•</Text>
              <Ionicons name="cube" size={16} color={Colors.secondary} />
              <Text style={styles.buildingsBadgeText}>{roomCount} Rooms</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={EVSU_CENTER}
        onRegionChangeComplete={handleRegionChangeComplete}
        onMapReady={() => {
          // Ensure map is centered on campus when ready
          if (mapRef.current) {
            mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
          }
        }}
        minZoomLevel={15}
        maxZoomLevel={20}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsBuildings={false}
        mapType={mapType}
      >
        {/* Admin paths overlay */}
        {paths.map((path) => (
          <Polyline
            key={`path-${path.id}`}
            coordinates={(path.waypoints || []).map((wp) => ({
              latitude: wp.latitude,
              longitude: wp.longitude,
            }))}
            strokeColor={Colors.secondary}
            strokeWidth={4}
            lineDashPattern={[6, 4]}
          />
        ))}

        {/* Building footprints (approx rectangles) */}
        {buildings.map((building) => (
          <Polygon
            key={`poly-${building.building_id || building.id || building.code}`}
            coordinates={getBuildingPolygon(building)}
            strokeColor={Colors.primary}
            fillColor={`${Colors.primary}33`}
            strokeWidth={1.5}
            tappable
            onPress={() => {
              setSelectedLocation({
                id: building.building_id,
                name: building.building_name,
                code: building.building_code,
                type: 'building',
                latitude: building.latitude,
                longitude: building.longitude,
                description: building.description,
              });
            }}
          />
        ))}

        {/* Building Markers */}
        {showMarkers && buildings.map((building) => (
          <Marker
            key={building.building_id || building.id || `building-${building.latitude}-${building.longitude}`}
            coordinate={{
              latitude: parseFloat(building.latitude),
              longitude: parseFloat(building.longitude),
            }}
            title={building.building_name}
            description={building.building_code}
            pinColor={
              selectedLocation?.id === building.building_id ? Colors.secondary : Colors.primary
            }
            onPress={() => {
              console.log('Marker pressed:', building.building_name);
              setSelectedLocation({
                id: building.building_id,
                name: building.building_name,
                code: building.building_code,
                type: 'building',
                latitude: building.latitude,
                longitude: building.longitude,
                description: building.description,
              });
            }}
          />
        ))}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={Colors.primary}
            strokeWidth={5}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <ControlButton 
          iconName="school-outline" 
          onPress={centerOnCampus}
        />
        
        <ControlButton 
          iconName="locate" 
          onPress={centerOnUser}
        />

        <ControlButton 
          iconName="layers-outline" 
          onPress={() => {
            setMapType((prev) => {
              if (prev === 'standard') return 'satellite';
              if (prev === 'satellite') return 'hybrid';
              if (prev === 'hybrid') return 'terrain';
              return 'standard';
            });
          }}
        />
        
        <ControlButton 
          iconName={showMarkers ? "location" : "location-outline"} 
          onPress={() => setShowMarkers(!showMarkers)}
          backgroundColor={showMarkers ? Colors.primary : Colors.gray}
        />
        
        {routeCoordinates.length > 0 && (
          <ControlButton 
            iconName="close" 
            onPress={clearRoute}
            backgroundColor={Colors.secondary}
          />
        )}
      </View>

      {/* Location Info Card */}
      {selectedLocation && (
        <InfoCard
          title={selectedLocation.name}
          code={selectedLocation.code}
          description={selectedLocation.description}
          onClose={clearRoute}
          onNavigate={handleNavigate}
          showNavigate={!!userLocation}
          room={selectedLocation.room || null}
        />
      )}

      {/* Buildings and Rooms Count Badge */}
      <View style={styles.buildingsBadge}>
        <Ionicons name="business" size={16} color={Colors.primary} />
        <Text style={styles.buildingsBadgeText}>{buildings.length} Buildings</Text>
        {roomCount > 0 && (
          <>
            <Text style={styles.buildingsBadgeSeparator}>•</Text>
            <Ionicons name="cube" size={16} color={Colors.secondary} />
            <Text style={styles.buildingsBadgeText}>{roomCount} Rooms</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: Spacing.xxl + Spacing.md,
    right: Spacing.xl,
    gap: Spacing.md,
    zIndex: 1000,
  },
  buildingsBadge: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.xl,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    ...Shadows.small,
    gap: 6,
    zIndex: 1000,
  },
  buildingsBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 4,
  },
  buildingsBadgeSeparator: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 8,
  },
  webMapContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  webMapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  webMapSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  buildingsList: {
    width: '100%',
    maxWidth: 400,
    marginTop: Spacing.lg,
  },
  buildingsListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    ...Shadows.small,
    gap: Spacing.sm,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  buildingCode: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default MapScreen;
