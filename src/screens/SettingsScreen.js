// src/screens/SettingsScreen.js - Settings Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const SettingsScreen = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const SettingsItem = ({ icon, title, subtitle, onPress, showArrow = true, danger = false }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          <Ionicons
            name={icon}
            size={22}
            color={danger ? Colors.error : Colors.primary}
          />
        </View>
        <View style={styles.settingsItemText}>
          <Text style={[styles.settingsItemTitle, danger && styles.dangerText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {isAdmin() ? 'Administrator' : user?.role === 'guest' ? 'Guest User' : 'User'}
          </Text>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="person-outline"
            title="Profile"
            subtitle="View and edit your profile"
            onPress={() => Alert.alert('Profile', 'Profile editing coming soon!')}
          />
          <SettingsItem
            icon="information-circle-outline"
            title="About"
            subtitle="App information and version"
            onPress={() => navigation.navigate('About')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification settings"
            onPress={() => Alert.alert('Notifications', 'Notification settings coming soon!')}
          />
          <SettingsItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => Alert.alert('Language', 'Language selection coming soon!')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help using the app"
            onPress={() => navigation.navigate('Help')}
          />
          <SettingsItem
            icon="chatbubbles-outline"
            title="Send Feedback"
            subtitle="Report bugs or suggest features"
            onPress={() => navigation.navigate('Feedback')}
          />
          <SettingsItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Read our terms and privacy policy"
            onPress={() => Alert.alert('Terms', 'Terms and privacy policy coming soon!')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionSection}>
        <Text style={styles.versionText}>EVSU eMAP v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  userSection: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  userEmail: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.background,
    ...Shadows.small,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: '#FFEBEE',
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  dangerText: {
    color: Colors.error,
  },
  logoutSection: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  logoutButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
});

export default SettingsScreen;

