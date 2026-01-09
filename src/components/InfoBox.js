// src/components/InfoBox.js - Reusable Info Box Component for displaying messages
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const InfoBox = ({ 
  visible, 
  message, 
  title = 'Login Required',
  onClose,
  onAction,
  actionText = 'Go to Login',
  icon = 'information-circle',
  type = 'info' // 'info', 'warning', 'error'
}) => {
  if (!visible) return null;

  const getIconColor = () => {
    switch (type) {
      case 'warning':
        return Colors.warning || '#FFA726';
      case 'error':
        return Colors.error;
      default:
        return Colors.primary;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'warning':
        return '#FFF3E0';
      case 'error':
        return '#FFEBEE';
      default:
        return Colors.backgroundLight;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
              <Ionicons name={icon} size={24} color={getIconColor()} />
            </View>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {onAction && (
            <View style={styles.actions}>
              {onClose && (
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.button, styles.actionButton]} 
                onPress={onAction}
              >
                <Text style={styles.actionButtonText}>{actionText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default InfoBox;

