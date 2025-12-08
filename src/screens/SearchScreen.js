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
import { mapService } from '../services/mapService';

// Components
import BuildingCard from '../components/BuildingCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import CategoryPicker from '../components/CategoryPicker';

// Constants
import { BUILDING_CATEGORIES_WITH_ALL } from '../constants/categories';

const SearchScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(''); // Empty string = show all (matches admin panel)
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

  // Filter buildings when search query or category filter changes
  useEffect(() => {
    filterBuildings();
  }, [searchQuery, categoryFilter, buildings]);

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

  // Fetch buildings from Supabase or API
  const fetchBuildings = async () => {
    try {
      setErrorMessage('');
      console.log('Fetching buildings...');
      
      // Use mapService which handles Supabase or mock data
      const buildingsData = await mapService.getBuildings();
      
      console.log('✅ Buildings fetched:', buildingsData.length);
      setBuildings(buildingsData);
      setFilteredBuildings(buildingsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      
      // Fallback to mock data
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

  // Filter buildings based on search query and category filter
  // Empty string for categoryFilter means "show all" (matches admin panel logic)
  const filterBuildings = () => {
    let filtered = [...buildings];

    // Apply category filter (empty string = show all)
    if (categoryFilter) {
      filtered = filtered.filter(building => {
        // Handle both old format (building_name) and new format (name)
        const buildingCategory = building.category || building.building_category;
        return buildingCategory === categoryFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(building => {
        const name = building.building_name || building.name || '';
        const code = building.building_code || building.code || '';
        const description = building.description || '';
        
        return (
          name.toLowerCase().includes(query) ||
          code.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query)
        );
      });
    }

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
            accessibilityLabel="Search buildings"
            accessibilityHint="Type to search for buildings by name, code, or description"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <CategoryPicker
            selectedValue={categoryFilter}
            onValueChange={setCategoryFilter}
            label="Filter by Category"
            showLabel={true}
            accessibilityLabel="Filter buildings by category"
            accessibilityHint="Select a category to filter the building list, or select All Categories to show all buildings"
          />
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
  filterContainer: {
    marginTop: Spacing.md,
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
