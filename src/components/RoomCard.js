// src/components/RoomCard.js - Reusable Room Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { calculateDistance } from '../utils/distance';

const RoomCard = ({ 
  room, 
  onPress, 
  showDistance = false, 
  userLocation = null,
  showNavigate = false,
  onNavigatePress = null
}) => {
  let distance = null;
  if (showDistance && userLocation && room.building) {
    distance = calculateDistance(userLocation, {
      latitude: parseFloat(room.building.latitude),
      longitude: parseFloat(room.building.longitude),
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
            <Ionicons name="cube" size={24} color={Colors.secondary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {room.name}
            </Text>
            {room.room_number && (
              <Text style={styles.roomNumber}>Room {room.room_number}</Text>
            )}
            {room.building && (
              <View style={styles.buildingInfo}>
                <Ionicons name="business" size={12} color={Colors.textSecondary} />
                <Text style={styles.buildingName}>
                  {room.building.name} {room.building.code && `(${room.building.code})`}
                </Text>
              </View>
            )}
            {room.floor !== null && room.floor !== undefined && (
              <Text style={styles.floor}>Floor {room.floor}</Text>
            )}
          </View>
        </View>
        
        {room.description && (
          <Text style={styles.description} numberOfLines={2}>
            {room.description}
          </Text>
        )}

        <View style={styles.meta}>
          {room.type && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{room.type}</Text>
            </View>
          )}
          {room.capacity && (
            <View style={styles.metaItem}>
              <Ionicons name="people" size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>Capacity: {room.capacity}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {distance !== null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={Colors.textSecondary} />
              <Text style={styles.distance}>{distance.toFixed(2)} km</Text>
            </View>
          )}
          
          {showNavigate && onNavigatePress && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onNavigatePress(room);
              }}
            >
              <Ionicons name="navigate" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
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
  roomNumber: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  buildingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  buildingName: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  floor: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  actionButton: {
    padding: Spacing.xs,
  },
});

export default RoomCard;

