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
  Alert,
} from 'react-native';
import InfoBox from '../components/InfoBox';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Constants
import { API_URL, API_TIMEOUT, USE_MOCK_DATA } from '../constants/config';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

// Utils
import { getErrorMessage } from '../utils/errorHandler';
import { getFavorites, addFavorite, removeFavorite, getRoomFavorites, addRoomFavorite, removeRoomFavorite } from '../utils/storage';
import { logBuildingNavigation, logRoomNavigation } from '../utils/navigationTracking';
import { mockBuildings } from '../utils/mockData';
import { mapService } from '../services/mapService';
import { useAuth } from '../context/AuthContext';

// Components
import BuildingCard from '../components/BuildingCard';
import RoomCard from '../components/RoomCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import CategoryPicker from '../components/CategoryPicker';

// Constants
import { BUILDING_CATEGORIES_WITH_ALL, ROOM_TYPES_WITH_ALL } from '../constants/categories';

const SearchScreen = () => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(''); // Empty string = show all (for buildings)
  const [roomTypeFilter, setRoomTypeFilter] = useState(''); // Empty string = show all (for rooms)
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'buildings', 'rooms'
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteRoomIds, setFavoriteRoomIds] = useState([]);
  const [showInfoBox, setShowInfoBox] = useState(false);

  // Fetch buildings on mount
  useEffect(() => {
    fetchBuildings();
    requestLocationPermission();
    loadFavorites();
  }, []);

  // Load favorites
  const loadFavorites = async () => {
    try {
      const buildingFavorites = await getFavorites();
      const roomFavorites = await getRoomFavorites();
      setFavoriteIds(buildingFavorites);
      setFavoriteRoomIds(roomFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Check if user can use favorites
  const canUseFavorites = () => {
    if (!isAuthenticated || !user) {
      return false;
    }
    // Check if user is a guest (guests have role 'guest' or id 0)
    if (user.role === 'guest' || user.id === 0) {
      return false;
    }
    return true;
  };

  // Handle favorite toggle for buildings
  const handleFavoritePress = async (building) => {
    // Check if user can use favorites
    if (!canUseFavorites()) {
      setShowInfoBox(true);
      return;
    }

    const buildingId = building.building_id || building.id;
    // Normalize ID to string for comparison (handles UUIDs and numbers)
    const normalizedId = String(buildingId);
    const normalizedFavoriteIds = favoriteIds.map(id => String(id));
    const isFav = normalizedFavoriteIds.includes(normalizedId);
    
    if (isFav) {
      await removeFavorite(buildingId);
    } else {
      await addFavorite(buildingId);
    }
    await loadFavorites();
  };

  // Handle favorite toggle for rooms
  const handleRoomFavoritePress = async (room) => {
    // Check if user can use favorites
    if (!canUseFavorites()) {
      setShowInfoBox(true);
      return;
    }

    const roomId = room.id;
    // Normalize ID to string for comparison (handles UUIDs and numbers)
    const normalizedId = String(roomId);
    const normalizedFavoriteIds = favoriteRoomIds.map(id => String(id));
    const isFav = normalizedFavoriteIds.includes(normalizedId);
    
    if (isFav) {
      await removeRoomFavorite(roomId);
    } else {
      await addRoomFavorite(roomId);
    }
    await loadFavorites();
  };

  // Fetch or search rooms when search query or type filter changes
  useEffect(() => {
    if (typeFilter === 'rooms' || typeFilter === 'all') {
      if (searchQuery.trim()) {
        searchRooms();
      } else {
        // If rooms or all filter is selected but no search query, fetch all rooms
        fetchAllRooms();
      }
    } else {
      setFilteredRooms([]);
    }
  }, [searchQuery, typeFilter]);

  // Filter buildings when search query or category filter changes
  useEffect(() => {
    filterBuildings();
  }, [searchQuery, categoryFilter, buildings]);

  // Filter rooms when search query or room type filter changes
  useEffect(() => {
    filterRooms();
  }, [searchQuery, roomTypeFilter, rooms]);

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

  // Fetch all rooms
  const fetchAllRooms = async () => {
    try {
      setSearching(true);
      const roomsData = await mapService.getRooms();
      console.log('✅ All rooms fetched:', roomsData.length);
      setRooms(roomsData);
      // filterRooms will be called automatically via useEffect
      setSearching(false);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
      setSearching(false);
    }
  };

  // Search rooms
  const searchRooms = async () => {
    try {
      setSearching(true);
      const query = searchQuery.trim();
      if (!query) {
        setRooms([]);
        setSearching(false);
        return;
      }

      const roomsData = await mapService.searchRooms(query);
      console.log('✅ Rooms found:', roomsData.length);
      setRooms(roomsData);
      // filterRooms will be called automatically via useEffect
      setSearching(false);
    } catch (error) {
      console.error('Error searching rooms:', error);
      setRooms([]);
      setSearching(false);
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

  // Filter rooms based on search query and room type filter
  const filterRooms = () => {
    let filtered = [...rooms];

    // Apply room type filter (empty string = show all)
    if (roomTypeFilter) {
      filtered = filtered.filter(room => {
        const roomType = room.type || '';
        return roomType.toLowerCase() === roomTypeFilter.toLowerCase();
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room => {
        const name = room.name || '';
        const roomNumber = room.room_number || '';
        const description = room.description || '';
        
        return (
          name.toLowerCase().includes(query) ||
          roomNumber.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query)
        );
      });
    }

    setFilteredRooms(filtered);
  };

  // Handle building selection
  const handleBuildingPress = async (building) => {
    // Calculate distance if user location is available
    let distanceMeters = null;
    if (userLocation && building.latitude && building.longitude) {
      const R = 6371000; // Earth radius in meters
      const dLat = (building.latitude - userLocation.latitude) * Math.PI / 180;
      const dLng = (building.longitude - userLocation.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(building.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceMeters = R * c;
    }

    // Log navigation event
    await logBuildingNavigation(building, userLocation, distanceMeters, false);

    navigation.navigate('Map', {
      selectedLocation: {
        id: building.building_id || building.id,
        name: building.building_name || building.name,
        code: building.building_code || building.code,
        type: 'building',
        latitude: building.latitude,
        longitude: building.longitude,
        description: building.description,
      },
    });
  };

  // Handle room selection - navigate to building with room info
  const handleRoomPress = async (room) => {
    if (!room.building) {
      console.warn('Room has no building info');
      return;
    }

    // Calculate distance if user location is available
    let distanceMeters = null;
    if (userLocation && room.building.latitude && room.building.longitude) {
      const R = 6371000; // Earth radius in meters
      const dLat = (room.building.latitude - userLocation.latitude) * Math.PI / 180;
      const dLng = (room.building.longitude - userLocation.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(room.building.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceMeters = R * c;
    }

    // Log navigation event
    await logRoomNavigation(room, room.building, userLocation, distanceMeters, false);

    navigation.navigate('Map', {
      selectedLocation: {
        id: room.building.id,
        name: room.building.name,
        code: room.building.code,
        type: 'building',
        latitude: room.building.latitude,
        longitude: room.building.longitude,
        room: {
          id: room.id,
          name: room.name,
          room_number: room.room_number,
          floor: room.floor,
          description: room.description,
        },
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
            placeholder="Search buildings, rooms, codes, or descriptions..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search buildings and rooms"
            accessibilityHint="Type to search for buildings and rooms by name, code, or description"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Type Filter */}
        <View style={styles.typeFilterContainer}>
          <Text style={styles.filterLabel}>Filter by Type:</Text>
          <View style={styles.typeFilterButtons}>
            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                typeFilter === 'all' && styles.typeFilterButtonActive
              ]}
              onPress={() => setTypeFilter('all')}
            >
              <Text style={[
                styles.typeFilterButtonText,
                typeFilter === 'all' && styles.typeFilterButtonTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                typeFilter === 'buildings' && styles.typeFilterButtonActive
              ]}
              onPress={() => setTypeFilter('buildings')}
            >
              <Ionicons 
                name="business" 
                size={16} 
                color={typeFilter === 'buildings' ? Colors.white : Colors.textSecondary} 
              />
              <Text style={[
                styles.typeFilterButtonText,
                typeFilter === 'buildings' && styles.typeFilterButtonTextActive
              ]}>
                Buildings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                typeFilter === 'rooms' && styles.typeFilterButtonActive
              ]}
              onPress={() => setTypeFilter('rooms')}
            >
              <Ionicons 
                name="cube" 
                size={16} 
                color={typeFilter === 'rooms' ? Colors.white : Colors.textSecondary} 
              />
              <Text style={[
                styles.typeFilterButtonText,
                typeFilter === 'rooms' && styles.typeFilterButtonTextActive
              ]}>
                Rooms
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter - Show building categories for buildings/all, room types for rooms */}
        <View style={styles.filterContainer}>
          {typeFilter === 'rooms' ? (
            <CategoryPicker
              selectedValue={roomTypeFilter}
              onValueChange={setRoomTypeFilter}
              label="Filter by Room Type"
              showLabel={true}
              categories={ROOM_TYPES_WITH_ALL}
              accessibilityLabel="Filter rooms by type"
              accessibilityHint="Select a room type to filter the room list, or select All Types to show all rooms"
            />
          ) : (
            <CategoryPicker
              selectedValue={categoryFilter}
              onValueChange={setCategoryFilter}
              label="Filter by Category"
              showLabel={true}
              accessibilityLabel="Filter buildings by category"
              accessibilityHint="Select a category to filter the building list, or select All Categories to show all buildings"
            />
          )}
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {(() => {
            let displayBuildings = filteredBuildings;
            let displayRooms = filteredRooms;
            
            if (typeFilter === 'buildings') {
              displayRooms = [];
            } else if (typeFilter === 'rooms') {
              displayBuildings = [];
            }

            const total = displayBuildings.length + displayRooms.length;
            return `${total} ${total === 1 ? 'result' : 'results'} found${
              displayBuildings.length > 0 ? ` (${displayBuildings.length} ${displayBuildings.length === 1 ? 'building' : 'buildings'})` : ''
            }${
              displayRooms.length > 0 ? ` (${displayRooms.length} ${displayRooms.length === 1 ? 'room' : 'rooms'})` : ''
            }`;
          })()}
        </Text>
      </View>

      {/* Combined Results List */}
      {(() => {
        // Filter data based on typeFilter
        let displayBuildings = filteredBuildings;
        let displayRooms = filteredRooms;
        
        if (typeFilter === 'buildings') {
          displayRooms = [];
        } else if (typeFilter === 'rooms') {
          displayBuildings = [];
        }

        const hasResults = displayBuildings.length > 0 || displayRooms.length > 0;

        return hasResults ? (
          <FlatList
            data={[
              ...displayBuildings.map(item => ({ ...item, itemType: 'building' })),
              ...displayRooms.map(item => ({ ...item, itemType: 'room' })),
            ]}
          keyExtractor={(item, index) => {
            // For rooms, use the room's unique ID. For buildings, use building_id or id
            if (item.itemType === 'room') {
              return `room-${item.id}`;
            } else {
              return `building-${item.building_id || item.id || index}`;
            }
          }}
          renderItem={({ item }) => {
            if (item.itemType === 'room') {
              const roomId = item.id;
              // Normalize ID comparison for UUIDs
              const normalizedRoomId = roomId ? String(roomId) : null;
              const normalizedFavoriteIds = favoriteRoomIds.map(id => String(id));
              const isRoomFavorite = normalizedRoomId ? normalizedFavoriteIds.includes(normalizedRoomId) : false;
              return (
                <RoomCard
                  room={item}
                  onPress={() => handleRoomPress(item)}
                  showDistance={!!userLocation}
                  userLocation={userLocation}
                  showNavigate={true}
                  onNavigatePress={handleRoomPress}
                  showFavorite={true}
                  isFavorite={isRoomFavorite}
                  onFavoritePress={handleRoomFavoritePress}
                />
              );
            } else {
              const buildingId = item.building_id || item.id;
              // Normalize ID comparison for UUIDs
              const normalizedBuildingId = buildingId ? String(buildingId) : null;
              const normalizedFavoriteIds = favoriteIds.map(id => String(id));
              const isBuildingFavorite = normalizedBuildingId ? normalizedFavoriteIds.includes(normalizedBuildingId) : false;
              return (
                <BuildingCard
                  building={item}
                  onPress={() => handleBuildingPress(item)}
                  showDistance={!!userLocation}
                  userLocation={userLocation}
                  showFavorite={true}
                  isFavorite={isBuildingFavorite}
                  onFavoritePress={handleFavoritePress}
                  showNavigate={true}
                  onNavigatePress={handleBuildingPress}
                />
              );
            }
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={searching ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.searchingText}>Searching rooms...</Text>
            </View>
          ) : null}
        />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Try adjusting your search terms or filter`
                : 'Start typing to search for buildings and rooms'}
            </Text>
          </View>
        );
      })()}
      
      {/* Info Box for Login Required */}
      <InfoBox
        visible={showInfoBox}
        title="Login Required"
        message="In order to use favorites, please log in."
        onClose={() => setShowInfoBox(false)}
        onAction={() => {
          setShowInfoBox(false);
          navigation.navigate('Settings');
        }}
        actionText="Go to Login"
        icon="log-in-outline"
        type="info"
      />
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
  typeFilterContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  typeFilterButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border || Colors.textLight,
  },
  typeFilterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeFilterButtonText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeFilterButtonTextActive: {
    color: Colors.white,
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
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchingText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});

export default SearchScreen;
