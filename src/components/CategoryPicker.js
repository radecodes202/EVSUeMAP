// src/components/CategoryPicker.js - Reusable Category Picker Component
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

/**
 * CategoryPicker - Reusable picker component for building categories
 * 
 * Features:
 * - Empty string for "show all" (matches admin panel)
 * - Platform-specific styling
 * - Accessibility support
 * - Proper validation handling
 * 
 * @param {string} selectedValue - Currently selected category (empty string = all)
 * @param {function} onValueChange - Callback when value changes
 * @param {string} label - Label text (optional)
 * @param {boolean} showLabel - Whether to show label (default: true)
 * @param {object} style - Additional styles
 * @param {boolean} error - Whether to show error state
 * @param {string} errorMessage - Error message to display
 * @param {boolean} required - Whether field is required
 */
const CategoryPicker = ({
  selectedValue = '',
  onValueChange,
  label = 'Category',
  showLabel = true,
  style,
  error = false,
  errorMessage = '',
  required = false,
  accessibilityLabel = 'Select building category',
  accessibilityHint = 'Choose the category to filter buildings',
}) => {
  // Building categories matching database schema
  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'Academic', value: 'academic' },
    { label: 'Administrative', value: 'administrative' },
    { label: 'Facility', value: 'facility' },
    { label: 'Sports', value: 'sports' },
    { label: 'Residential', value: 'residential' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.pickerContainer,
          error && styles.pickerContainerError,
        ]}
      >
        <Picker
          selectedValue={selectedValue || ''}
          onValueChange={(itemValue) => {
            // Always call with empty string if null/undefined
            onValueChange(itemValue || '');
          }}
          style={styles.picker}
          mode={Platform.OS === 'android' ? 'dropdown' : 'default'}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="button"
        >
          {categories.map((category) => (
            <Picker.Item
              key={category.value}
              label={category.label}
              value={category.value}
              // Disable the placeholder option on iOS
              enabled={category.value !== '' || Platform.OS === 'android'}
            />
          ))}
        </Picker>
      </View>
      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  pickerContainer: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50, // Ensure adequate touch target (iOS: 44pt, Android: 48dp)
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 0,
  },
  pickerContainerError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
    color: Colors.text,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
});

export default CategoryPicker;

