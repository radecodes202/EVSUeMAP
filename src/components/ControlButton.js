// src/components/ControlButton.js - Reusable Control Button Component
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, BorderRadius } from '../constants/theme';

const ControlButton = ({ iconName, onPress, backgroundColor = Colors.primary, iconColor = Colors.white, size = 50 }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, width: size, height: size, borderRadius: size / 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={iconName} size={24} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
});

export default ControlButton;

