import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Dimensions, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import AnimatedLoader from './AnimatedLoader';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

export default function YouTubeSummarizerNew({ summaryData = null, loading = false, onSubmit = () => {} }: any) {
  const [videoUrl, setVideoUrl] = useState('');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedLoader visible={true} size="large" />
      </View>
    );
  }

  if (!summaryData) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Image source={require('../../assets/Youtube.png')} style={styles.headerImage} />
          <Text style={styles.title}>YouTube Video Summarizer</Text>
          <Text style={styles.subtitle}>Get AI-powered summaries, notes and practice questions.</Text>

          <TextInput
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.button, !videoUrl.trim() && styles.buttonDisabled]}
            disabled={!videoUrl.trim()}
            onPress={() => onSubmit(videoUrl.trim())}
          >
            <MaterialIcons name="auto-awesome" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Summarize</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{summaryData.title}</Text>
        <Text style={styles.summary}>{summaryData.summary}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: isWeb && !isMobile ? 900 : '100%', backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md, alignItems: 'center' },
  headerImage: { width: 80, height: 80, marginBottom: spacing.md },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  input: { width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, color: colors.text },
  button: { width: '100%', backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, alignItems: 'center' as any },
  buttonDisabled: { opacity: 0.6, backgroundColor: colors.textMuted },
  buttonText: { ...typography.h4, color: colors.white, marginLeft: spacing.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { ...typography.h3, color: colors.text },
  summary: { ...typography.body, color: colors.text },
});