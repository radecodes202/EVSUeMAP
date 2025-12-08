// src/screens/FeedbackScreen.js - User feedback submission
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const FEEDBACK_TYPES = [
  { label: 'Bug', value: 'bug' },
  { label: 'Suggestion', value: 'suggestion' },
  { label: 'Complaint', value: 'complaint' },
  { label: 'Compliment', value: 'compliment' },
];

const FeedbackScreen = () => {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!subject.trim()) {
      Alert.alert('Validation', 'Subject is required.');
      return false;
    }
    if (!message.trim()) {
      Alert.alert('Validation', 'Please provide your feedback.');
      return false;
    }
    if (rating && (Number(rating) < 1 || Number(rating) > 5)) {
      Alert.alert('Validation', 'Rating must be between 1 and 5.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (!isSupabaseConfigured()) {
        Alert.alert('Offline Mode', 'Supabase is not configured. Feedback not sent.');
        return;
      }

      const payload = {
        user_id: user?.id || null,
        feedback_type: feedbackType,
        subject: subject.trim(),
        message: message.trim(),
        rating: rating ? Number(rating) : null,
      };

      const { error } = await supabase.from('user_feedback').insert(payload);
      if (error) {
        throw error;
      }

      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setSubject('');
      setMessage('');
      setRating('');
      setFeedbackType('suggestion');
    } catch (err) {
      console.error('Feedback submit error:', err);
      Alert.alert('Error', err.message || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Send Feedback</Text>
        <Text style={styles.subtitle}>
          Let us know how we can improve EVSU eMAP. Your feedback helps us prioritize fixes and features.
        </Text>

        {/* Feedback type */}
        <Text style={styles.label}>Feedback Type</Text>
        <View style={styles.typeRow}>
          {FEEDBACK_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                feedbackType === type.value && styles.typeChipActive,
              ]}
              onPress={() => setFeedbackType(type.value)}
              accessibilityRole="button"
              accessibilityLabel={`Feedback type ${type.label}`}
            >
              <Text
                style={[
                  styles.typeText,
                  feedbackType === type.value && styles.typeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text style={styles.label}>Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="Short summary"
          placeholderTextColor={Colors.textLight}
          value={subject}
          onChangeText={setSubject}
          accessibilityLabel="Feedback subject"
        />

        {/* Message */}
        <Text style={styles.label}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the issue or suggestion"
          placeholderTextColor={Colors.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          numberOfLines={6}
          accessibilityLabel="Feedback message"
        />

        {/* Rating */}
        <Text style={styles.label}>Rating (1-5, optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 5"
          placeholderTextColor={Colors.textLight}
          value={rating}
          onChangeText={setRating}
          keyboardType="number-pad"
          maxLength={1}
          accessibilityLabel="Feedback rating"
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <Ionicons name="time-outline" size={20} color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>
      </View>
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
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.small,
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
  label: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    color: Colors.text,
    ...Typography.body,
  },
  textArea: {
    minHeight: 140,
  },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  typeText: {
    ...Typography.caption,
    color: Colors.text,
  },
  typeTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default FeedbackScreen;

