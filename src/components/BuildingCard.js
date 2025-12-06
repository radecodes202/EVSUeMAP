// src/components/BuildingCard.js - Reusable Building Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { calculateDistance } from '../utils/distance';

const BuildingCard = ({ 
  building, 
  onPress, 
  showDistance = false, 
  userLocation = null,
  showFavorite = false,
  isFavorite = false,
  onFavoritePress = null,
  showNavigate = false,
  onNavigatePress = null
}) => {
  let distance = null;
  if (showDistance && userLocation) {
    distance = calculateDistance(userLocation, {
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude),
    });
  }

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={24} color={Colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {building.building_name}
            </Text>
            <Text style={styles.code}>{building.building_code}</Text>
            {building.floors && (
              <Text style={styles.floors}>{building.floors} {building.floors === 1 ? 'floor' : 'floors'}</Text>
            )}
          </View>
        </View>
        
        {building.description && (
          <Text style={styles.description} numberOfLines={2}>
            {building.description}
          </Text>
        )}

        <View style={styles.footer}>
          {distance !== null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={Colors.textSecondary} />
              <Text style={styles.distance}>{distance.toFixed(2)} km</Text>
            </View>
          )}
          
          <View style={styles.actions}>
            {showNavigate && onNavigatePress && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigatePress(building);
                }}
              >
                <Ionicons name="navigate" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {showFavorite && onFavoritePress && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onFavoritePress(building);
                }}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={18} 
                  color={isFavorite ? Colors.secondary : Colors.textSecondary} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 2,
  },
  code: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  floors: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distance: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.xs,
  },
});

export default BuildingCard;

