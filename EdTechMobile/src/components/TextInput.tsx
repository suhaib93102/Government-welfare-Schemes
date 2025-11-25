import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

interface TextInputComponentProps {
  onSubmit: (data: string) => void;
  loading?: boolean;
}

export const TextInputComponent: React.FC<TextInputComponentProps> = ({ onSubmit, loading }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      // pass the raw trimmed string to the parent handler
      onSubmit(trimmed);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textarea}
        placeholder="Paste your problem statement, show your work, or ask for hints..."
        placeholderTextColor={colors.textLight}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={8}
        editable={!loading}
      />

      <View style={styles.footer}>
        <Text style={styles.charCount}>{text.length} characters</Text>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Solve Question</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  textarea: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: 15,
    backgroundColor: colors.backgroundGray,
    color: colors.text,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    ...typography.small,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
