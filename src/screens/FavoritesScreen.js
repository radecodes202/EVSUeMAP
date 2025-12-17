// src/screens/FavoritesScreen.js - Favorites Screen with saved buildings
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Constants
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

// Utils
import { getFavorites, removeFavorite, getRoomFavorites, removeRoomFavorite } from '../utils/storage';
import { getErrorMessage } from '../utils/errorHandler';
import { mapService } from '../services/mapService';

// Components
import BuildingCard from '../components/BuildingCard';
import RoomCard from '../components/RoomCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

const FavoritesScreen = ({ navigation, route }) => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteRoomIds, setFavoriteRoomIds] = useState([]);
  const [favoriteBuildings, setFavoriteBuildings] = useState([]);
  const [favoriteRooms, setFavoriteRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load favorites when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  // Load favorite building and room IDs and fetch data
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      // Get favorite IDs from storage
      const buildingIds = await getFavorites();
      const roomIds = await getRoomFavorites();
      setFavoriteIds(buildingIds);
      setFavoriteRoomIds(roomIds);

      // Load favorite buildings
      if (buildingIds.length > 0) {
        const allBuildings = await mapService.getBuildings();
        const favorites = allBuildings.filter(building => {
          const buildingId = building.building_id || building.id;
          return buildingIds.includes(buildingId.toString()) || buildingIds.includes(buildingId);
        });
        setFavoriteBuildings(favorites);
      } else {
        setFavoriteBuildings([]);
      }

      // Load favorite rooms
      if (roomIds.length > 0) {
        const allRooms = await mapService.getRooms();
        const favorites = allRooms.filter(room => {
          const roomId = room.id;
          return roomIds.includes(roomId.toString()) || roomIds.includes(roomId);
        });
        setFavoriteRooms(favorites);
      } else {
        setFavoriteRooms([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      const errorMsg = getErrorMessage(error);
      setErrorMessage(errorMsg);
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  // Handle remove building favorite
  const handleRemoveFavorite = (building) => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${building.building_name || building.name} from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(building.building_id || building.id);
            await loadFavorites();
          },
        },
      ]
    );
  };

  // Handle remove room favorite
  const handleRemoveRoomFavorite = (room) => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${room.name} from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeRoomFavorite(room.id);
            await loadFavorites();
          },
        },
      ]
    );
  };

  // Handle building press - navigate to map
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

  // Handle navigate press
  const handleNavigatePress = (building) => {
    handleBuildingPress(building);
  };

  // Handle room press - navigate to map
  const handleRoomPress = (room) => {
    if (!room.building) {
      console.warn('Room has no building info');
      return;
    }

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

  // Loading state
  const totalFavorites = favoriteBuildings.length + favoriteRooms.length;
  if (loading && totalFavorites === 0) {
    return (
      <LoadingView 
        message="Loading favorites..." 
        onRetry={loadFavorites}
        showRetry={errorMessage !== ''}
      />
    );
  }

  // Error state (only if we have an error and no favorites)
  if (errorMessage && totalFavorites === 0 && !loading) {
    return (
      <ErrorView 
        title="Error Loading Favorites"
        message={errorMessage}
        onRetry={loadFavorites}
      />
    );
  }

  // Combine buildings and rooms for display
  const combinedFavorites = [
    ...favoriteBuildings.map(item => ({ ...item, itemType: 'building' })),
    ...favoriteRooms.map(item => ({ ...item, itemType: 'room' })),
  ];

  return (
    <View style={styles.container}>
      {totalFavorites > 0 ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {totalFavorites} {totalFavorites === 1 ? 'Favorite' : 'Favorites'}
              {favoriteBuildings.length > 0 && ` (${favoriteBuildings.length} ${favoriteBuildings.length === 1 ? 'building' : 'buildings'})`}
              {favoriteRooms.length > 0 && ` (${favoriteRooms.length} ${favoriteRooms.length === 1 ? 'room' : 'rooms'})`}
            </Text>
          </View>

          {/* Favorites List */}
          <FlatList
            data={combinedFavorites}
            keyExtractor={(item, index) => {
              if (item.itemType === 'room') {
                return `room-${item.id}`;
              } else {
                return `building-${item.building_id || item.id || index}`;
              }
            }}
            renderItem={({ item }) => {
              if (item.itemType === 'room') {
                return (
                  <RoomCard
                    room={item}
                    onPress={() => handleRoomPress(item)}
                    showFavorite={true}
                    isFavorite={true}
                    onFavoritePress={() => handleRemoveRoomFavorite(item)}
                    showNavigate={true}
                    onNavigatePress={handleRoomPress}
                  />
                );
              } else {
                return (
                  <BuildingCard
                    building={item}
                    onPress={() => handleBuildingPress(item)}
                    showFavorite={true}
                    isFavorite={true}
                    onFavoritePress={() => handleRemoveFavorite(item)}
                    showNavigate={true}
                    onNavigatePress={handleNavigatePress}
                  />
                );
              }
            }}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Start adding buildings and rooms to your favorites from the Search or Map screens
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search" size={20} color={Colors.white} />
            <Text style={styles.searchButtonText}>Explore Buildings & Rooms</Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    ...Typography.h3,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  searchButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default FavoritesScreen;
