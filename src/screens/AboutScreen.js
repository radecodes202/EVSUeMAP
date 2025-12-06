// src/screens/AboutScreen.js - About Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const AboutScreen = () => {
  const openLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* App Logo/Icon Section */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="map" size={64} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>EVSU eMAP</Text>
        <Text style={styles.tagline}>Campus Navigation System</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionContent}>
          <Text style={styles.description}>
            EVSU eMAP is a comprehensive campus navigation application designed for
            Eastern Visayas State University (EVSU) Tacloban Campus. The app helps
            students, faculty, and visitors navigate the campus with ease.
          </Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.sectionContent}>
          <FeatureItem
            icon="map-outline"
            title="Interactive Campus Map"
            description="Explore the campus with an interactive map showing all buildings and facilities"
          />
          <FeatureItem
            icon="search-outline"
            title="Building Search"
            description="Quickly find buildings by name, code, or description"
          />
          <FeatureItem
            icon="navigate-outline"
            title="Navigation & Directions"
            description="Get directions and walking routes to any building on campus"
          />
          <FeatureItem
            icon="chatbubbles-outline"
            title="AI Assistant"
            description="Ask questions about the campus and get instant answers"
          />
          <FeatureItem
            icon="heart-outline"
            title="Favorites"
            description="Save your frequently visited buildings for quick access"
          />
        </View>
      </View>

      {/* University Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eastern Visayas State University</Text>
        <View style={styles.sectionContent}>
          <InfoItem
            icon="location-outline"
            label="Campus"
            value="EVSU Tacloban Campus"
          />
          <InfoItem
            icon="globe-outline"
            label="Website"
            value="www.evsu.edu.ph"
            onPress={() => openLink('https://www.evsu.edu.ph')}
            isLink
          />
        </View>
      </View>

      {/* Technology Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technology</Text>
        <View style={styles.sectionContent}>
          <Text style={styles.techText}>
            Built with React Native and Expo, using OpenStreetMap for mapping services.
          </Text>
        </View>
      </View>

      {/* Credits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credits</Text>
        <View style={styles.sectionContent}>
          <Text style={styles.creditText}>
            Developed for Eastern Visayas State University
          </Text>
          <Text style={styles.creditText}>
            © 2024 EVSU eMAP. All rights reserved.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for EVSU Community
        </Text>
      </View>
    </ScrollView>
  );
};

const FeatureItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={24} color={Colors.primary} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const InfoItem = ({ icon, label, value, onPress, isLink = false }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={20} color={Colors.textSecondary} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      {isLink ? (
        <Text style={styles.infoLink} onPress={onPress}>
          {value}
        </Text>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  header: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  appName: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  version: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontWeight: 'bold',
  },
  sectionContent: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  description: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text,
  },
  infoLink: {
    ...Typography.body,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  techText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  creditText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
});

export default AboutScreen;

