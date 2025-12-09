import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform, Dimensions, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

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
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'notes', 'questions']);

  const handleSubmit = () => {
    if (videoUrl.trim()) {
      onSubmit(videoUrl.trim());
    }
  };

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const getDifficultyColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.warning;
      case 'advanced':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing YouTube video...</Text>
        <Text style={styles.loadingSubtext}>This may take 30-60 seconds for longer videos</Text>
      </View>
    );
  }

  if (!summaryData) {
    return (
      <View style={styles.inputContainer}>
        <View style={styles.headerSection}>
          <MaterialIcons name="ondemand-video" size={64} color={colors.primary} />
          <Text style={styles.headerTitle}>YouTube Video Summarizer</Text>
          <Text style={styles.headerSubtitle}>
            Get AI-powered summaries, notes, and exam questions from any YouTube video
          </Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>YouTube Video URL</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="link" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={colors.textMuted}
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !videoUrl.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!videoUrl.trim()}
          >
            <MaterialIcons name="auto-awesome" size={20} color={colors.white} />
            <Text style={styles.submitButtonText}>Summarize Video</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>How it works:</Text>
          <View style={styles.exampleSteps}>
            <View style={styles.exampleStep}>
              <View style={styles.exampleStepNumber}>
                <Text style={styles.exampleStepNumberText}>1</Text>
              </View>
              <Text style={styles.exampleStepText}>Paste any YouTube video URL</Text>
            </View>
            <View style={styles.exampleStep}>
              <View style={styles.exampleStepNumber}>
                <Text style={styles.exampleStepNumberText}>2</Text>
              </View>
              <Text style={styles.exampleStepText}>AI extracts and analyzes the transcript</Text>
            </View>
            <View style={styles.exampleStep}>
              <View style={styles.exampleStepNumber}>
                <Text style={styles.exampleStepNumberText}>3</Text>
              </View>
              <Text style={styles.exampleStepText}>Get summary, notes, and practice questions</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.resultHeader}>
        <View style={styles.resultHeaderTop}>
          <MaterialIcons name="play-circle-filled" size={40} color={colors.primary} />
          <View style={styles.resultHeaderText}>
            <Text style={styles.resultTitle}>{summaryData.title}</Text>
            {summaryData.channel_name && (
              <Text style={styles.resultChannel}>By {summaryData.channel_name}</Text>
            )}
          </View>
        </View>

        <View style={styles.metadataRow}>
          {summaryData.video_duration && (
            <View style={styles.metadataBadge}>
              <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
              <Text style={styles.metadataText}>{summaryData.video_duration}</Text>
            </View>
          )}
          {summaryData.estimated_reading_time && (
            <View style={styles.metadataBadge}>
              <MaterialIcons name="access-time" size={14} color={colors.textMuted} />
              <Text style={styles.metadataText}>{summaryData.estimated_reading_time}</Text>
            </View>
          )}
          {summaryData.difficulty_level && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(summaryData.difficulty_level) }]}>
              <Text style={styles.difficultyText}>{summaryData.difficulty_level}</Text>
            </View>
          )}
        </View>

        {summaryData.keywords && summaryData.keywords.length > 0 && (
          <View style={styles.keywordsContainer}>
            <Text style={styles.keywordsLabel}>Keywords:</Text>
            <View style={styles.keywordsList}>
              {summaryData.keywords.map((keyword, index) => (
                <View key={index} style={styles.keywordTag}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('summary')}
        >
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="summarize" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>
          <MaterialIcons
            name={expandedSections.includes('summary') ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {expandedSections.includes('summary') && (
          <View style={styles.sectionContent}>
            <Text style={styles.summaryText}>{summaryData.summary}</Text>
          </View>
        )}
      </View>

      {/* Notes Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('notes')}
        >
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="notes" size={24} color={colors.success} />
            <Text style={styles.sectionTitle}>Key Notes ({summaryData.notes.length})</Text>
          </View>
          <MaterialIcons
            name={expandedSections.includes('notes') ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {expandedSections.includes('notes') && (
          <View style={styles.sectionContent}>
            {summaryData.notes.map((note, index) => (
              <View key={index} style={styles.noteItem}>
                <View style={styles.noteBullet}>
                  <MaterialIcons name="fiber-manual-record" size={8} color={colors.primary} />
                </View>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Questions Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('questions')}
        >
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="quiz" size={24} color={colors.warning} />
            <Text style={styles.sectionTitle}>Practice Questions ({summaryData.questions.length})</Text>
          </View>
          <MaterialIcons
            name={expandedSections.includes('questions') ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {expandedSections.includes('questions') && (
          <View style={styles.sectionContent}>
            {summaryData.questions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <View style={styles.questionNumber}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.questionText}>{question}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl * 2,
  },
  loadingText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
  },
  headerTitle: {
    ...typography.h1,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: isWeb && !isMobile ? 600 : '100%',
  },
  inputCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundLight,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  exampleSection: {
    backgroundColor: colors.blue50,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  exampleTitle: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  exampleSteps: {
    gap: spacing.md,
  },
  exampleStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exampleStepNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleStepNumberText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  exampleStepText: {
    ...typography.body,
    flex: 1,
  },
  resultHeader: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultHeaderTop: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  resultChannel: {
    ...typography.body,
    color: colors.textMuted,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  metadataText: {
    ...typography.small,
    color: colors.textMuted,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  difficultyText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  keywordsContainer: {
    marginTop: spacing.sm,
  },
  keywordsLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  keywordTag: {
    backgroundColor: colors.blue100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  keywordText: {
    ...typography.small,
    color: colors.primary,
    fontSize: 12,
  },
  section: {
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
  },
  sectionContent: {
    padding: spacing.lg,
  },
  summaryText: {
    ...typography.body,
    lineHeight: 24,
    color: colors.text,
  },
  noteItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  noteBullet: {
    marginTop: 8,
  },
  noteText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },
  questionItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    ...typography.h4,
    color: colors.warning,
    fontWeight: '700',
  },
  questionText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
    marginTop: 4,
  },
});
