import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizData {
  title: string;
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
}

interface QuizProps {
  quizData: QuizData | null;
  loading: boolean;
}

export const Quiz: React.FC<QuizProps> = ({ quizData, loading }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Generating quiz...</Text>
      </View>
    );
  }

  if (!quizData) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="quiz" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>Enter a topic to generate a quiz</Text>
      </View>
    );
  }

  const question = quizData.questions[currentQuestion];

  const handleAnswerSelect = (optionIndex: number) => {
    if (answeredQuestions.includes(currentQuestion)) return;
    
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);
    
    if (optionIndex === question.correctAnswer) {
      setScore(score + 1);
    }
    
    setAnsweredQuestions([...answeredQuestions, currentQuestion]);
  };

  const handleNext = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnsweredQuestions([]);
    setQuizCompleted(false);
  };

  if (quizCompleted) {
    const percentage = Math.round((score / quizData.questions.length) * 100);
    return (
      <ScrollView style={styles.container}>
        <View style={styles.completedContainer}>
          <MaterialIcons 
            name={percentage >= 70 ? "emoji-events" : "info"} 
            size={80} 
            color={percentage >= 70 ? colors.success : colors.warning} 
          />
          <Text style={styles.completedTitle}>Quiz Completed!</Text>
          <Text style={styles.scoreText}>Your Score</Text>
          <Text style={styles.scoreValue}>{score} / {quizData.questions.length}</Text>
          <Text style={styles.percentageText}>{percentage}%</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.statLabel}>Correct</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="cancel" size={24} color={colors.error} />
              <Text style={styles.statLabel}>Incorrect</Text>
              <Text style={styles.statValue}>{quizData.questions.length - score}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.retryButton} onPress={resetQuiz}>
            <MaterialIcons name="refresh" size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Retry Quiz</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.quizHeader}>
        <Text style={styles.quizTitle}>{quizData.title}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{quizData.difficulty.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} of {quizData.questions.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctAnswer;
          const showCorrect = showExplanation && isCorrect;
          const showIncorrect = showExplanation && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                showCorrect && styles.optionCorrect,
                showIncorrect && styles.optionIncorrect,
                isSelected && !showExplanation && styles.optionSelected,
              ]}
              onPress={() => handleAnswerSelect(index)}
              disabled={answeredQuestions.includes(currentQuestion)}
            >
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLetter,
                  (showCorrect || showIncorrect) && styles.optionLetterActive
                ]}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={[
                  styles.optionText,
                  (showCorrect || showIncorrect) && styles.optionTextActive
                ]}>
                  {option}
                </Text>
                {showCorrect && (
                  <MaterialIcons name="check-circle" size={24} color={colors.success} />
                )}
                {showIncorrect && (
                  <MaterialIcons name="cancel" size={24} color={colors.error} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {showExplanation && (
        <View style={styles.explanationContainer}>
          <View style={styles.explanationHeader}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={styles.explanationTitle}>Explanation</Text>
          </View>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <MaterialIcons name="arrow-back" size={20} color={currentQuestion === 0 ? colors.textMuted : colors.primary} />
          <Text style={[styles.navButtonText, currentQuestion === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, !showExplanation && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={!showExplanation}
        >
          <Text style={[styles.navButtonText, styles.nextButtonText, !showExplanation && styles.navButtonTextDisabled]}>
            {currentQuestion === quizData.questions.length - 1 ? 'Finish' : 'Next'}
          </Text>
          <MaterialIcons 
            name={currentQuestion === quizData.questions.length - 1 ? 'check' : 'arrow-forward'} 
            size={20} 
            color={!showExplanation ? colors.textMuted : colors.white} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.scorePreview}>
        <Text style={styles.scorePreviewText}>Current Score: {score} / {answeredQuestions.length}</Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  quizHeader: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quizTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressText: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  questionContainer: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  questionText: {
    ...typography.h3,
    lineHeight: 28,
  },
  optionsContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  optionButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.blue50,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: '#e8f5e9',
  },
  optionIncorrect: {
    borderColor: colors.error,
    backgroundColor: '#ffebee',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  optionLetter: {
    ...typography.h4,
    color: colors.textMuted,
    fontWeight: '700',
    minWidth: 28,
  },
  optionLetterActive: {
    color: colors.text,
  },
  optionText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
  },
  optionTextActive: {
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: colors.blue50,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  explanationTitle: {
    ...typography.h4,
    color: colors.primary,
  },
  explanationText: {
    ...typography.body,
    lineHeight: 24,
    color: colors.text,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  navButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  navButtonText: {
    ...typography.h4,
    color: colors.primary,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonText: {
    color: colors.white,
  },
  scorePreview: {
    padding: spacing.md,
    alignItems: 'center',
  },
  scorePreviewText: {
    ...typography.body,
    color: colors.textMuted,
  },
  completedContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  completedTitle: {
    ...typography.h1,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  scoreText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  scoreValue: {
    ...typography.h1,
    color: colors.primary,
    fontSize: 48,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  percentageText: {
    ...typography.h2,
    color: colors.textMuted,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  statValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  retryButtonText: {
    ...typography.h4,
    color: colors.white,
  },
});
