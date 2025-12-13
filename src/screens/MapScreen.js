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
import { calculateRoute as getRoute } from '../utils/routing';
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
  const buildingOverlaySize = 0.00018; // ~20m footprint approximation; adjust if too large

  // Fetch buildings when component loads
  useEffect(() => {
    console.log('MapScreen loaded');
    fetchBuildings();
    fetchPaths();
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

  // Handle location selected from Search screen
  const handleLocationFromSearch = async (location) => {
    console.log('Setting selected location:', location);
    setSelectedLocation(location);
    
    // Animate map to the location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        latitudeDelta: MAP_ZOOM_DELTA,
        longitudeDelta: MAP_ZOOM_DELTA,
      }, MAP_ANIMATION_DURATION);
    }

    // Calculate route if user location is available
    if (userLocation) {
      await calculateRoute(userLocation, {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      });
    }
  };

  // Calculate route between two points using custom paths first, then OSRM
  const calculateRoute = async (start, end) => {
    console.log('Calculating route from', start, 'to', end);
    
    try {
      // Show loading indicator
      setLoading(true);

      // Try admin-defined paths first
      const pathRoute = pickBestPath(start, end, paths);
      if (pathRoute) {
        setRouteCoordinates(pathRoute.coordinates);
        Alert.alert('Route Calculated', `Using campus path: ${pathRoute.name || 'Custom Path'}`);
        return;
      }

      // OSRM fallback
      const routeData = await getRoute(start, end);
      
      if (routeData.success) {
        setRouteCoordinates(routeData.coordinates);
        
        Alert.alert(
          'Route Calculated',
          `Distance: ${routeData.distance.toFixed(2)} km\nEstimated time: ${routeData.duration} minutes walking${routeData.isFallback ? '\n(Using approximate route)' : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        // Fallback to straight line if routing fails
        setRouteCoordinates([start, end]);
        const distance = calculateDistance(start, end);
        const timeMinutes = calculateWalkingTime(distance);
        
        Alert.alert(
          'Route Calculated',
          `Distance: ${distance.toFixed(2)} km\nEstimated time: ${timeMinutes} minutes walking\n(Using direct route)`,
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
      'Route Calculated',
        `Distance: ${distance.toFixed(2)} km\nEstimated time: ${timeMinutes} minutes walking\n(Using direct route)`,
      [{ text: 'OK' }]
    );
    } finally {
      setLoading(false);
    }
  };

  // Pick the best admin-defined path based on closest endpoints
  const pickBestPath = (start, end, pathList) => {
    if (!pathList || pathList.length === 0) return null;

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    pathList.forEach((path) => {
      const wps = path.waypoints || [];
      if (wps.length < 2) return;

      const first = wps[0];
      const last = wps[wps.length - 1];

      const optionA =
        calculateDistance(start, { latitude: first.latitude, longitude: first.longitude }) +
        calculateDistance(end, { latitude: last.latitude, longitude: last.longitude });
      const optionB =
        calculateDistance(start, { latitude: last.latitude, longitude: last.longitude }) +
        calculateDistance(end, { latitude: first.latitude, longitude: first.longitude });

      const score = Math.min(optionA, optionB);
      if (score < bestScore) {
        bestScore = score;
        const forward = optionA <= optionB;
        const coords = forward ? wps : [...wps].reverse();
        best = {
          name: path.name,
          coordinates: coords.map((wp) => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
          })),
        };
      }
    });

    // Require endpoints reasonably close (~0.5 km combined) to use the path
    if (bestScore > 0.5) {
      return null;
    }

    return best;
  };

  // Center map on user location
  const centerOnUser = async () => {
    if (!userLocation) {
      await getCurrentLocation();
    }
    
    if (userLocation && mapRef.current) {
      console.log('Centering on user location');
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: MAP_ZOOM_DELTA,
        longitudeDelta: MAP_ZOOM_DELTA,
      }, MAP_ANIMATION_DURATION);
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
  const handleRegionChangeComplete = (region) => {
    // Allow some panning but keep focus on campus
    // If user pans too far, gently guide back
    if (!isWithinCampusBounds(region)) {
      // Snap back to campus center if outside boundaries
      setMapRegion(EVSU_CENTER);
      if (mapRef.current) {
        mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
      }
    } else {
      // Update region if within bounds
      setMapRegion(region);
    }
  };

  // Center map on campus
  const centerOnCampus = () => {
    console.log('Centering on campus');
    setMapRegion(EVSU_CENTER);
    if (mapRef.current) {
      mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
    }
  };

  // Clear route and selection
  const clearRoute = () => {
    console.log('Clearing route');
    setRouteCoordinates([]);
    setSelectedLocation(null);
  };

  // Create a simple rectangle polygon around a building coordinate
  const getBuildingPolygon = (building) => {
    const lat = parseFloat(building.latitude);
    const lng = parseFloat(building.longitude);
    const d = buildingOverlaySize;
    return [
      { latitude: lat + d, longitude: lng - d },
      { latitude: lat + d, longitude: lng + d },
      { latitude: lat - d, longitude: lng + d },
      { latitude: lat - d, longitude: lng - d },
    ];
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
          />
        )}

        {/* Buildings Count Badge */}
        <View style={styles.buildingsBadge}>
          <Ionicons name="business" size={16} color={Colors.primary} />
          <Text style={styles.buildingsBadgeText}>{buildings.length} Buildings</Text>
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
        region={mapRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onMapReady={() => {
          // Ensure map is centered on campus when ready
          setMapRegion(EVSU_CENTER);
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
        {buildings.map((building) => (
          <Marker
            key={building.building_id || building.id || `building-${building.latitude}-${building.longitude}`}
            coordinate={{
              latitude: parseFloat(building.latitude),
              longitude: parseFloat(building.longitude),
            }}
            title={building.building_name}
            description={`${building.building_code} • ${building.floors} floors`}
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
        />
      )}

      {/* Buildings Count Badge */}
      <View style={styles.buildingsBadge}>
        <Ionicons name="business" size={16} color={Colors.primary} />
        <Text style={styles.buildingsBadgeText}>{buildings.length} Buildings</Text>
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
    top: Spacing.xl,
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
