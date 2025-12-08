// src/screens/HelpScreen.js - User manual and FAQs
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const Bullet = ({ text }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const HelpScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Help & User Guide</Text>
      <Text style={styles.subtitle}>Learn how to use EVSU eMAP effectively.</Text>

      <Section title="Getting Started">
        <Bullet text="Login with your EVSU account. Guests can browse but may have limited features." />
        <Bullet text="Use the Search tab to find buildings by name, code, or description." />
        <Bullet text="Tap a result to view it on the map, then tap Navigate to get a route." />
      </Section>

      <Section title="Map & Navigation">
        <Bullet text="Pinch to zoom and drag to pan around the campus map." />
        <Bullet text="Tap a building marker to view details and start navigation." />
        <Bullet text="Use the recenter button to go back to campus view." />
      </Section>

      <Section title="Favorites">
        <Bullet text="Tap the heart icon on a building to save it to Favorites." />
        <Bullet text="Favorites are available offline once saved." />
      </Section>

      <Section title="Filters & Categories">
        <Bullet text="Use the category picker on the Search tab to filter by building type." />
        <Bullet text="Empty selection shows all categories (matches admin panel behavior)." />
      </Section>

      <Section title="Feedback & Support">
        <Bullet text="Send feedback from Settings → Feedback to report bugs or suggest features." />
        <Bullet text="Include a clear subject and steps to reproduce for faster fixes." />
      </Section>

      <Section title="FAQ">
        <Bullet text="Why can’t I log in? Check your credentials or contact admin for access." />
        <Bullet text="Why is data missing? Ensure you’re online; mock data may be shown in demo mode." />
        <Bullet text="Navigation off-campus? The app keeps focus within EVSU boundaries for accuracy." />
      </Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
  },
  sectionContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  bullet: {
    ...Typography.body,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  bulletText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
});

export default HelpScreen;

