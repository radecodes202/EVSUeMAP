// src/screens/SearchScreen.js - Search Screen with filters and building list
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Constants
import { API_URL, API_TIMEOUT, USE_MOCK_DATA } from '../constants/config';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

// Utils
import { getErrorMessage } from '../utils/errorHandler';
import { getFavorites, addFavorite, removeFavorite } from '../utils/storage';
import { mockBuildings } from '../utils/mockData';

// Components
import BuildingCard from '../components/BuildingCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

const SearchScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState([]);

  // Fetch buildings on mount
  useEffect(() => {
    fetchBuildings();
    requestLocationPermission();
    loadFavorites();
  }, []);

  // Load favorites
  const loadFavorites = async () => {
    try {
      const favorites = await getFavorites();
      setFavoriteIds(favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Handle favorite toggle
  const handleFavoritePress = async (building) => {
    const buildingId = building.building_id.toString();
    const isFav = favoriteIds.includes(buildingId);
    
    if (isFav) {
      await removeFavorite(buildingId);
    } else {
      await addFavorite(buildingId);
    }
    await loadFavorites();
  };

  // Filter buildings when search query or filter changes
  useEffect(() => {
    filterBuildings();
  }, [searchQuery, selectedFilter, buildings]);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  // Fetch buildings from API
  const fetchBuildings = async () => {
    try {
      // Use mock data if enabled
      if (USE_MOCK_DATA) {
        console.log('📦 Using mock data for development');
        setBuildings(mockBuildings);
        setFilteredBuildings(mockBuildings);
        setLoading(false);
        return;
      }

      setErrorMessage('');
      const response = await axios.get(`${API_URL}/buildings`, {
        timeout: API_TIMEOUT,
      });

      if (response.data.success) {
        setBuildings(response.data.data);
        setFilteredBuildings(response.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      
      // Fallback to mock data in development if API fails
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      if (isDev || USE_MOCK_DATA) {
        console.log('📦 Falling back to mock data');
        setBuildings(mockBuildings);
        setFilteredBuildings(mockBuildings);
        setLoading(false);
        setErrorMessage('');
        return;
      }
      
      const errorMsg = getErrorMessage(error);
      setErrorMessage(errorMsg);
      setLoading(false);
    }
  };

  // Filter buildings based on search query and selected filter
  const filterBuildings = () => {
    let filtered = [...buildings];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(building =>
        building.building_name.toLowerCase().includes(query) ||
        building.building_code.toLowerCase().includes(query) ||
        (building.description && building.description.toLowerCase().includes(query))
      );
    }

    // Apply type filter (if you have building types in your data)
    // For now, we'll just show all buildings
    // You can extend this based on your building data structure

    setFilteredBuildings(filtered);
  };

  // Handle building selection
  const handleBuildingPress = (building) => {
    navigation.navigate('Map', {
      selectedLocation: {
        id: building.building_id,
        name: building.building_name,
        code: building.building_code,
        type: 'building',
        latitude: building.latitude,
        longitude: building.longitude,
        description: building.description,
      },
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Loading state
  if (loading) {
    return (
      <LoadingView 
        message="Loading buildings..." 
        onRetry={fetchBuildings}
        showRetry={errorMessage !== ''}
      />
    );
  }

  // Error state
  if (errorMessage && buildings.length === 0) {
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buildings, codes, or descriptions..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredBuildings.length} {filteredBuildings.length === 1 ? 'building' : 'buildings'} found
        </Text>
      </View>

      {/* Buildings List */}
      {filteredBuildings.length > 0 ? (
        <FlatList
          data={filteredBuildings}
          keyExtractor={(item) => item.building_id.toString()}
          renderItem={({ item }) => (
            <BuildingCard
              building={item}
              onPress={() => handleBuildingPress(item)}
              showDistance={!!userLocation}
              userLocation={userLocation}
              showFavorite={true}
              isFavorite={favoriteIds.includes(item.building_id.toString()) || favoriteIds.includes(item.building_id)}
              onFavoritePress={handleFavoritePress}
              showNavigate={true}
              onNavigatePress={handleBuildingPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No buildings found</Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Try adjusting your search terms`
              : 'Start typing to search for buildings'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  searchContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.small,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
  },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resultsCount: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default SearchScreen;
