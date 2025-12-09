import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

interface PredictedQuestion {
  id: number;
  question: string;
  difficulty: string;
  importance: string;
  question_type?: string;
  depth_level?: string;
  expected_answer_length?: string;
  key_concepts?: string[];
  hint?: string;
  sample_answer?: string;
  why_important?: string;
  related_topics?: string[];
  tags?: string[];
}

interface KeyDefinition {
  term: string;
  definition: string;
  explanation: string;
  example?: string;
}

interface TopicOutline {
  main_topic: string;
  subtopics?: Array<{
    title: string;
    key_points: string[];
    importance: string;
  }>;
  learning_objectives?: string[];
}

interface PredictedQuestionsData {
  title: string;
  exam_type?: string;
  key_definitions?: KeyDefinition[];
  topic_outline?: TopicOutline;
  questions: PredictedQuestion[];
  learning_objectives?: string[];
}

interface PredictedQuestionsProps {
  predictedQuestionsData: PredictedQuestionsData | null;
  loading: boolean;
}

export const PredictedQuestions: React.FC<PredictedQuestionsProps> = ({ predictedQuestionsData, loading }) => {
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [expandedDefinitions, setExpandedDefinitions] = useState<string[]>([]);
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [showOutline, setShowOutline] = useState(true);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Generating comprehensive study material...</Text>
      </View>
    );
  }

  if (!predictedQuestionsData) {
    return null;
  }

  const toggleQuestion = (id: number) => {
    if (expandedQuestions.includes(id)) {
      setExpandedQuestions(expandedQuestions.filter(qid => qid !== id));
    } else {
      setExpandedQuestions([...expandedQuestions, id]);
    }
  };

  const toggleDefinition = (term: string) => {
    if (expandedDefinitions.includes(term)) {
      setExpandedDefinitions(expandedDefinitions.filter(t => t !== term));
    } else {
      setExpandedDefinitions([...expandedDefinitions, term]);
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance?.toLowerCase()) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'hard':
        return 'trending-up';
      case 'medium':
        return 'trending-flat';
      case 'easy':
        return 'trending-down';
      default:
        return 'help';
    }
  };

  const getDepthColor = (depth: string) => {
    switch (depth?.toLowerCase()) {
      case 'deep':
        return colors.error;
      case 'intermediate':
        return colors.warning;
      case 'surface':
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{predictedQuestionsData.title}</Text>
            {predictedQuestionsData.exam_type && (
              <Text style={styles.subtitle}>Exam Type: {predictedQuestionsData.exam_type}</Text>
            )}
          </View>
        </View>
        {predictedQuestionsData.topic_outline?.main_topic && (
          <View style={styles.topicBadge}>
            <MaterialIcons name="label" size={16} color={colors.primary} />
            <Text style={styles.topicText}>{predictedQuestionsData.topic_outline.main_topic}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="quiz" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{predictedQuestionsData.questions.length}</Text>
          <Text style={styles.statLabel}>Questions</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="priority-high" size={24} color={colors.error} />
          <Text style={styles.statValue}>
            {predictedQuestionsData.questions.filter(q => q.importance?.toLowerCase() === 'high').length}
          </Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="school" size={24} color={colors.warning} />
          <Text style={styles.statValue}>
            {predictedQuestionsData.key_definitions?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Key Terms</Text>
        </View>
      </View>

      {/* KEY DEFINITIONS SECTION */}
      {predictedQuestionsData.key_definitions && predictedQuestionsData.key_definitions.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setShowDefinitions(!showDefinitions)}
          >
            <MaterialIcons name={showDefinitions ? 'expand-less' : 'expand-more'} size={24} color={colors.primary} />
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>📚 Key Definitions & Concepts</Text>
              <Text style={styles.sectionSubtitle}>{predictedQuestionsData.key_definitions.length} essential terms</Text>
            </View>
          </TouchableOpacity>

          {showDefinitions && (
            <View style={styles.definitionsContainer}>
              {predictedQuestionsData.key_definitions.map((def, index) => (
                <View key={index} style={styles.definitionCard}>
                  <TouchableOpacity
                    style={styles.definitionHeader}
                    onPress={() => toggleDefinition(def.term)}
                  >
                    <MaterialIcons 
                      name={expandedDefinitions.includes(def.term) ? 'expand-less' : 'expand-more'} 
                      size={20} 
                      color={colors.primary} 
                    />
                    <Text style={styles.definitionTerm}>{def.term}</Text>
                  </TouchableOpacity>

                  {expandedDefinitions.includes(def.term) && (
                    <View style={styles.definitionContent}>
                      <View style={styles.definitionRow}>
                        <Text style={styles.definitionLabel}>Definition:</Text>
                        <Text style={styles.definitionText}>{def.definition}</Text>
                      </View>
                      <View style={styles.definitionRow}>
                        <Text style={styles.definitionLabel}>Explanation:</Text>
                        <Text style={styles.definitionText}>{def.explanation}</Text>
                      </View>
                      {def.example && (
                        <View style={styles.definitionRow}>
                          <Text style={styles.definitionLabel}>Example:</Text>
                          <Text style={styles.definitionText}>{def.example}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TOPIC OUTLINE SECTION */}
      {predictedQuestionsData.topic_outline && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setShowOutline(!showOutline)}
          >
            <MaterialIcons name={showOutline ? 'expand-less' : 'expand-more'} size={24} color={colors.primary} />
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>📖 Topic Outline & Learning Path</Text>
              <Text style={styles.sectionSubtitle}>Structured learning objectives</Text>
            </View>
          </TouchableOpacity>

          {showOutline && predictedQuestionsData.topic_outline && (
            <View style={styles.outlineContainer}>
              {predictedQuestionsData.learning_objectives && predictedQuestionsData.learning_objectives.length > 0 && (
                <View style={styles.objectivesBox}>
                  <Text style={styles.objectivesTitle}> Learning Objectives:</Text>
                  {predictedQuestionsData.learning_objectives.map((obj, idx) => (
                    <View key={idx} style={styles.objectiveItem}>
                      <Text style={styles.objectiveBullet}>•</Text>
                      <Text style={styles.objectiveText}>{obj}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* QUESTIONS SECTION */}
      <View style={styles.questionsSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="help-outline" size={24} color={colors.primary} />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>❓ Predicted Important Questions</Text>
            <Text style={styles.sectionSubtitle}>Questions likely to appear in {predictedQuestionsData.exam_type} exams</Text>
          </View>
        </View>

        {predictedQuestionsData.questions.map((question) => (
          <View key={question.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{question.id}</Text>
              </View>
              <View style={styles.questionMeta}>
                <View style={styles.metaTags}>
                  <View style={[styles.importanceBadge, { backgroundColor: getImportanceColor(question.importance) }]}>
                    <MaterialIcons name="flag" size={12} color={colors.white} />
                    <Text style={styles.importanceText}>{question.importance}</Text>
                  </View>
                  <View style={styles.difficultyBadge}>
                    <MaterialIcons 
                      name={getDifficultyIcon(question.difficulty) as any} 
                      size={12} 
                      color={colors.textMuted} 
                    />
                    <Text style={styles.difficultyText}>{question.difficulty}</Text>
                  </View>
                  {question.depth_level && (
                    <View style={[styles.depthBadge, { backgroundColor: getDepthColor(question.depth_level) }]}>
                      <MaterialIcons name="trending-up" size={12} color={colors.white} />
                      <Text style={styles.depthText}>{question.depth_level}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Text style={styles.questionText}>{question.question}</Text>

            {question.question_type && (
              <View style={styles.questionTypeBox}>
                <Text style={styles.questionTypeLabel}>Type:</Text>
                <Text style={styles.questionTypeValue}>{question.question_type}</Text>
              </View>
            )}

            {question.key_concepts && question.key_concepts.length > 0 && (
              <View style={styles.conceptsBox}>
                <Text style={styles.conceptsTitle}>Key Concepts:</Text>
                <View style={styles.conceptsTagsContainer}>
                  {question.key_concepts.slice(0, 4).map((concept, idx) => (
                    <View key={idx} style={styles.conceptTag}>
                      <Text style={styles.conceptTagText}>{concept}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {question.why_important && (
              <View style={styles.importanceBox}>
                <MaterialIcons name="lightbulb-outline" size={16} color={colors.warning} />
                <Text style={styles.importanceReason}>{question.why_important}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => toggleQuestion(question.id)}
            >
              <MaterialIcons 
                name={expandedQuestions.includes(question.id) ? 'expand-less' : 'expand-more'} 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.expandButtonText}>
                {expandedQuestions.includes(question.id) ? 'Hide Details' : 'Show Answer & Details'}
              </Text>
            </TouchableOpacity>

            {expandedQuestions.includes(question.id) && (
              <View style={styles.detailsContainer}>
                {question.sample_answer && (
                  <View style={styles.answerBox}>
                    <Text style={styles.answerTitle}>📝 Sample Answer:</Text>
                    <Text style={styles.answerText}>{question.sample_answer}</Text>
                  </View>
                )}

                {question.hint && (
                  <View style={styles.hintBox}>
                    <MaterialIcons name="light-mode" size={18} color={colors.warning} />
                    <View style={styles.hintContent}>
                      <Text style={styles.hintLabel}>Hint:</Text>
                      <Text style={styles.hintText}>{question.hint}</Text>
                    </View>
                  </View>
                )}

                {question.expected_answer_length && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaLabel}>Expected Answer Length: <Text style={styles.metaValue}>{question.expected_answer_length}</Text></Text>
                  </View>
                )}

                {question.related_topics && question.related_topics.length > 0 && (
                  <View style={styles.relatedBox}>
                    <Text style={styles.relatedTitle}>Related Topics:</Text>
                    <View style={styles.relatedTagsContainer}>
                      {question.related_topics.map((topic, idx) => (
                        <Text key={idx} style={styles.relatedTag}>{topic}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
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
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.blue50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  topicText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    marginTop: spacing.sm,
    color: colors.primary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.blue50,
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },

  // Definitions Section
  definitionsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  definitionCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  definitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  definitionTerm: {
    ...typography.h4,
    flex: 1,
    fontWeight: '700',
    color: colors.primary,
  },
  definitionContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  definitionRow: {
    gap: spacing.sm,
  },
  definitionLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  definitionText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Outline Section
  outlineContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  objectivesBox: {
    backgroundColor: colors.blue50,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  objectivesTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  objectiveBullet: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  objectiveText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },

  // Questions Section
  questionsSection: {
    padding: spacing.lg,
  },
  questionsContainer: {
    padding: spacing.lg,
  },
  questionCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  questionMeta: {
    flex: 1,
  },
  metaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  importanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  importanceText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
    fontSize: 11,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundGray,
  },
  difficultyText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 11,
  },
  depthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  depthText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
    fontSize: 11,
  },
  questionText: {
    ...typography.body,
    lineHeight: 24,
    marginBottom: spacing.md,
    color: colors.text,
  },

  // Question Type Box
  questionTypeBox: {
    flexDirection: 'row',
    backgroundColor: colors.blue50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  questionTypeLabel: {
    ...typography.small,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  questionTypeValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // Concepts Box
  conceptsBox: {
    marginBottom: spacing.md,
  },
  conceptsTitle: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  conceptsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conceptTag: {
    backgroundColor: colors.blue100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  conceptTagText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },

  // Importance Box
  importanceBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  importanceReason: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },

  // Expand/Details Button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },

  // Details Container
  detailsContainer: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerBox: {
    backgroundColor: colors.blue50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  answerTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  answerText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },

  // Hint Box
  hintBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  hintContent: {
    flex: 1,
    gap: spacing.xs,
  },
  hintLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  hintButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  hintContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },

  // Meta Box
  metaBox: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  metaLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  metaValue: {
    fontWeight: '700',
    color: colors.primary,
  },

  // Related Topics Box
  relatedBox: {
    backgroundColor: colors.backgroundGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  relatedTitle: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  relatedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  relatedTag: {
    ...typography.small,
    backgroundColor: colors.blue50,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
});
