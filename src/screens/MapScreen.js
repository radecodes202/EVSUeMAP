// src/screens/MapScreen.js - Main Map Screen
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Constants
import { API_URL, API_TIMEOUT, EVSU_CENTER, MAP_ANIMATION_DURATION, MAP_ZOOM_DELTA, USE_MOCK_DATA } from '../constants/config';
import { Colors, Spacing, Shadows } from '../constants/theme';

// Utils
import { calculateDistance, calculateWalkingTime } from '../utils/distance';
import { calculateRoute as getRoute } from '../utils/routing';
import { getErrorMessage } from '../utils/errorHandler';
import { mockBuildings } from '../utils/mockData';

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

  // Fetch buildings when component loads
  useEffect(() => {
    console.log('MapScreen loaded');
    fetchBuildings();
    requestLocationPermission();
    
    // Center map on campus when component mounts
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
      }
    }, 500);
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

  // Fetch buildings from backend
  const fetchBuildings = async () => {
    try {
      // Use mock data if enabled
      if (USE_MOCK_DATA) {
        console.log('📦 Using mock data for development');
        setBuildings(mockBuildings);
        setLoading(false);
        return;
      }

      console.log('Fetching buildings from:', API_URL);
      setErrorMessage('');
      
      const response = await axios.get(`${API_URL}/buildings`, {
        timeout: API_TIMEOUT,
      });
      
      console.log('✅ Buildings fetched:', response.data.count);
      
      if (response.data.success) {
        setBuildings(response.data.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching buildings:', error.message);
      
      // Fallback to mock data in development if API fails
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      if (isDev || USE_MOCK_DATA) {
        console.log('📦 Falling back to mock data');
        setBuildings(mockBuildings);
        setLoading(false);
        setErrorMessage('');
        // Don't show alert in dev mode when using mock data
        return;
      }
      
      const errorMsg = getErrorMessage(error);
      setErrorMessage(errorMsg);
      setLoading(false);
      Alert.alert('Connection Error', errorMsg);
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

  // Calculate route between two points using OSRM routing
  const calculateRoute = async (start, end) => {
    console.log('Calculating route from', start, 'to', end);
    
    try {
      // Show loading indicator
      setLoading(true);
      
      // Get route from OSRM (follows walkways and paths)
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

  // Center map on campus
  const centerOnCampus = () => {
    console.log('Centering on campus');
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={EVSU_CENTER}
        region={EVSU_CENTER}
        onMapReady={() => {
          // Ensure map is centered on campus when ready
          if (mapRef.current) {
            mapRef.current.animateToRegion(EVSU_CENTER, MAP_ANIMATION_DURATION);
          }
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsBuildings={false}
        mapType="standard"
        customMapStyle={[]}
      >
        {/* Building Markers */}
        {buildings.map((building) => (
          <Marker
            key={building.building_id}
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
  },
  buildingsBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default MapScreen;
