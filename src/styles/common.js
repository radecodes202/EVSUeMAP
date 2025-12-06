// src/styles/common.js - Common Shared Styles
import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

export const commonStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  screenText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
});

