import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Dimensions, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import AnimatedLoader from './AnimatedLoader';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

interface YouTubeSummaryData {
  title: string;
  channel_name?: string;
  video_duration?: string;
  summary: string;
  notes: string[];
  questions: string[];
  estimated_reading_time?: string;
  difficulty_level?: string;
  keywords?: string[];
}

interface YouTubeSummarizerProps {
  summaryData: YouTubeSummaryData | null;
  loading: boolean;
  onSubmit: (videoUrl: string) => void;
}

export const YouTubeSummarizer: React.FC<YouTubeSummarizerProps> = ({ summaryData, loading, onSubmit }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ summary: true, notes: false, questions: false });

  const toggle = (key: string) => setExpanded({ ...expanded, [key]: !expanded[key] });

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
        <View style={styles.contentWrapper}>
          <View style={styles.pageCard}>
            <Image source={require('../../assets/Youtube.png')} style={styles.headerImage} />
            <Text style={styles.headerTitle}>YouTube Video Summarizer</Text>
            <Text style={styles.headerSubtitle}>Get AI-powered summaries, notes, and practice questions from any YouTube video.</Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>YouTube Video URL</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="link" size={20} color={colors.textMuted} />
                <TextInput
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionButton, !videoUrl.trim() && styles.actionDisabled]}
                onPress={() => onSubmit(videoUrl.trim())}
                disabled={!videoUrl.trim()}
              >
                <MaterialIcons name="auto-awesome" size={20} color={colors.white} />
                <Text style={styles.actionText}>Summarize Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.resultHeader}>
          <MaterialIcons name="play-circle-filled" size={40} color={colors.primary} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.resultTitle}>{summaryData.title}</Text>
            {summaryData.channel_name ? <Text style={styles.resultChannel}>By {summaryData.channel_name}</Text> : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggle('summary')} style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <MaterialIcons name={expanded.summary ? 'expand-less' : 'expand-more'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
          {expanded.summary && <Text style={styles.summaryText}>{summaryData.summary}</Text>}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggle('notes')} style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitle}>Notes ({summaryData.notes.length})</Text>
            <MaterialIcons name={expanded.notes ? 'expand-less' : 'expand-more'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
          {expanded.notes && summaryData.notes.map((n, i) => <Text key={i} style={styles.noteText}>• {n}</Text>)}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity onPress={() => toggle('questions')} style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitle}>Practice Questions ({summaryData.questions.length})</Text>
            <MaterialIcons name={expanded.questions ? 'expand-less' : 'expand-more'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
          {expanded.questions && summaryData.questions.map((q, i) => <Text key={i} style={styles.questionText}>{i + 1}. {q}</Text>)}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: 'transparent', minHeight: 400 },
  loadingText: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  contentWrapper: { alignSelf: 'center', width: '100%', maxWidth: isWeb && !isMobile ? 1100 : '100%', padding: spacing.lg },
  pageCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md, alignItems: 'center' },
  headerImage: { width: 100, height: 100, marginBottom: spacing.md },
  headerTitle: { ...typography.h2, textAlign: 'center' },
  headerSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  inputCard: { width: '100%', marginTop: spacing.md },
  inputLabel: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  input: { marginLeft: spacing.sm, flex: 1, ...typography.body, color: colors.text },
  actionButton: { marginTop: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' as any },
  actionDisabled: { opacity: 0.6, backgroundColor: colors.textMuted },
  actionText: { ...typography.h4, color: colors.white, marginLeft: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.white, marginBottom: spacing.md },
  resultTitle: { ...typography.h3, flex: 1 },
  resultChannel: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionHeaderSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3 },
  summaryText: { ...typography.body, marginTop: spacing.sm, color: colors.text },
  noteText: { ...typography.body, marginTop: spacing.xs, color: colors.textMuted },
  questionText: { ...typography.body, marginTop: spacing.xs, color: colors.text },
});

export default YouTubeSummarizer;

