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
import axios from 'axios';

// Constants
import { API_URL, API_TIMEOUT, USE_MOCK_DATA } from '../constants/config';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

// Utils
import { getFavorites, removeFavorite } from '../utils/storage';
import { getErrorMessage } from '../utils/errorHandler';
import { mockBuildings } from '../utils/mockData';

// Components
import BuildingCard from '../components/BuildingCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

const FavoritesScreen = ({ navigation, route }) => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteBuildings, setFavoriteBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load favorites when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  // Load favorite building IDs and fetch building data
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      // Get favorite IDs from storage
      const ids = await getFavorites();
      setFavoriteIds(ids);

      if (ids.length === 0) {
        setFavoriteBuildings([]);
        setLoading(false);
        return;
      }

      // Use mock data if enabled, otherwise fetch from API
      let allBuildings = [];
      
      if (USE_MOCK_DATA) {
        console.log('📦 Using mock data for development');
        allBuildings = mockBuildings;
      } else {
        const response = await axios.get(`${API_URL}/buildings`, {
          timeout: API_TIMEOUT,
        });

        if (response.data.success) {
          allBuildings = response.data.data;
        }
      }

      // Filter buildings to only show favorites
      const favorites = allBuildings.filter(building =>
        ids.includes(building.building_id.toString()) || 
        ids.includes(building.building_id)
      );
      setFavoriteBuildings(favorites);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading favorites:', error);
      
      // Fallback to mock data in development
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      if (isDev || USE_MOCK_DATA) {
        console.log('📦 Falling back to mock data');
        const favorites = mockBuildings.filter(building =>
          ids.includes(building.building_id.toString()) || 
          ids.includes(building.building_id)
        );
        setFavoriteBuildings(favorites);
        setLoading(false);
        setErrorMessage('');
        return;
      }
      
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

  // Handle remove favorite
  const handleRemoveFavorite = (building) => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${building.building_name} from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(building.building_id);
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

  // Loading state
  if (loading && favoriteBuildings.length === 0) {
    return (
      <LoadingView 
        message="Loading favorites..." 
        onRetry={loadFavorites}
        showRetry={errorMessage !== ''}
      />
    );
  }

  // Error state (only if we have an error and no favorites)
  if (errorMessage && favoriteBuildings.length === 0 && !loading) {
    return (
      <ErrorView 
        title="Error Loading Favorites"
        message={errorMessage}
        onRetry={loadFavorites}
      />
    );
  }

  return (
    <View style={styles.container}>
      {favoriteBuildings.length > 0 ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {favoriteBuildings.length} {favoriteBuildings.length === 1 ? 'Favorite' : 'Favorites'}
            </Text>
          </View>

          {/* Favorites List */}
          <FlatList
            data={favoriteBuildings}
            keyExtractor={(item) => item.building_id.toString()}
            renderItem={({ item }) => (
              <BuildingCard
                building={item}
                onPress={() => handleBuildingPress(item)}
                showFavorite={true}
                isFavorite={true}
                onFavoritePress={() => handleRemoveFavorite(item)}
                showNavigate={true}
                onNavigatePress={handleNavigatePress}
              />
            )}
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
            Start adding buildings to your favorites from the Search or Map screens
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search" size={20} color={Colors.white} />
            <Text style={styles.searchButtonText}>Explore Buildings</Text>
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
