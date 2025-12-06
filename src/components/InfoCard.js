// src/components/InfoCard.js - Reusable Info Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';

const InfoCard = ({ 
  title, 
  code, 
  description, 
  onClose, 
  onNavigate, 
  showNavigate = false 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {code && <Text style={styles.code}>{code}</Text>}
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={28} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      
      {showNavigate && onNavigate && (
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={onNavigate}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={20} color={Colors.white} />
          <Text style={styles.navigateText}>Navigate Here</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: Colors.text,
  },
  code: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  navigateButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.md + 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  navigateText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
});

export default InfoCard;

