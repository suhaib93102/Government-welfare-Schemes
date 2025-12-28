import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Dimensions, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import AnimatedLoader from './AnimatedLoader';
import LoadingWebm from './LoadingWebm';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

export default function YouTubeSummarizerNew({ summaryData = null, loading = false, onSubmit = () => {} }: any) {
  const [videoUrl, setVideoUrl] = useState('');

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <LoadingWebm visible={true} overlay={false} />
        </View>
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
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={styles.card}>
        <Text style={styles.title}>{summaryData.title}</Text>
        <Text style={styles.summary}>{summaryData.summary}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: isMobile ? spacing.md : spacing.lg },
  card: { 
    width: '100%', 
    maxWidth: isMobile ? '100%' : 800, 
    backgroundColor: colors.white, 
    borderRadius: borderRadius.lg, 
    padding: isMobile ? spacing.lg : spacing.xl, 
    ...shadows.md, 
    alignItems: 'center' 
  },
  headerImage: { width: isMobile ? 64 : 80, height: isMobile ? 64 : 80, marginBottom: spacing.md },
  title: { ...typography.h2, fontSize: isMobile ? 22 : 28, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, fontSize: isMobile ? 14 : 16, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: isMobile ? 0 : spacing.md },
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: borderRadius.md, 
    padding: spacing.md, 
    marginBottom: spacing.md, 
    color: colors.text,
    fontSize: isMobile ? 14 : 16,
    minHeight: isMobile ? 44 : 48,
  },
  button: { 
    width: '100%', 
    backgroundColor: colors.primary, 
    padding: spacing.md, 
    borderRadius: borderRadius.md, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: spacing.sm, 
    alignItems: 'center' as any,
    minHeight: isMobile ? 48 : 52,
  },
  buttonDisabled: { opacity: 0.6, backgroundColor: colors.textMuted },
  buttonText: { ...typography.h4, color: colors.white, marginLeft: spacing.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20, backgroundColor: 'transparent' },
  loadingText: { ...typography.h3, color: colors.text },
  summary: { ...typography.body, color: colors.text },
});