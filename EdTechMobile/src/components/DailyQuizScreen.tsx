import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { getDailyQuiz, submitDailyQuiz, startDailyQuiz, getUserCoins } from '../services/api';
import LoadingWebm from './LoadingWebm';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

interface DailyQuizScreenProps {
  userId: string;
  onComplete: () => void;
  onClose: () => void;
  visible?: boolean;
}

export const DailyQuizScreen: React.FC<DailyQuizScreenProps> = ({
  userId,
  onComplete,
  onClose,
  visible = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizState, setQuizState] = useState<'not-started' | 'started' | 'completed'>('not-started');
  const [results, setResults] = useState<any>(null);
  const [startTime] = useState(Date.now());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [coinAnim] = useState(new Animated.Value(0));
  const [attemptCoinsAwarded, setAttemptCoinsAwarded] = useState<number>(0);
  const [userCoins, setUserCoins] = useState<number>(0);

  const formatResultText = (value: any): string => {
    if (!value && value !== 0) return '';
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      if (typeof value.text === 'string') return value.text;
      if (typeof value.label === 'string') return value.label;
      if (typeof value.value === 'string') return value.value;
    }
    return String(value);
  };

  useEffect(() => {
    // initial load
    loadQuiz();
    loadUserCoins();
  }, []);

  // Reload quiz data when modal becomes visible to ensure questions render immediately
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setQuizData(null);
      setQuizState('not-started');
      setResults(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      loadQuiz();
    }
  }, [visible]);

  const loadUserCoins = async () => {
    try {
      const data = await getUserCoins(userId || 'anonymous');
      setUserCoins(data.total_coins || 0);
    } catch (e) {
      // silently ignore for now; UI will just show 0
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentQuestionIndex]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      console.log('Loading quiz for user:', userId);
      const data = await getDailyQuiz(userId);

      console.log('Daily Quiz Data:', JSON.stringify(data, null, 2));

      // Ensure data has expected shape and fallback defaults
      const rawQuestions = Array.isArray(data?.questions) ? data.questions : [];

      const normalizeText = (value: any): string => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
          if (typeof value.text === 'string') return value.text;
          if (typeof value.label === 'string') return value.label;
          if (typeof value.value === 'string') return value.value;
          return JSON.stringify(value);
        }
        if (value === null || value === undefined) return '';
        return String(value);
      };

      const normalizeOptions = (opts: any): string[] => {
        if (!Array.isArray(opts)) return [];
        return opts.map((opt: any) => {
          return normalizeText(opt);
        });
      };

      const questions = rawQuestions.slice(0, 5).map((q: any, idx: number) => ({
        id: q.id ?? idx + 1,
        question: normalizeText(q.question ?? q.question_text ?? 'Question not available'),
        options: normalizeOptions(q.options),
        category: normalizeText(q.category ?? 'general'),
        difficulty: normalizeText(q.difficulty ?? 'medium'),
      }));

      const coins = data?.coins || { attempt_bonus: 5, per_correct_answer: 5, max_possible: 5 + (questions.length * 5) };

      // If the user already attempted, show completed state
      if (data.already_attempted) {
        console.log('Setting state to completed with results:', data.result);
        setQuizData({ ...data, questions, coins });
        setQuizState('completed');
        setResults(data.result);
      } else if (questions.length === 0) {
        // No questions - show fallback and allow retry
        console.warn('No questions returned for daily quiz');
        setQuizData({ ...data, questions, coins });
        setQuizState('not-started');
      } else {
        console.log('Setting quiz data and state to not-started');
        setQuizData({ ...data, questions, coins });
        setQuizState('not-started');
      }
    } catch (error: any) {
      console.error('Failed to load quiz:', error);
      // Do not automatically close; show fallback UI and allow retry
      setQuizData({ questions: [], coins: { attempt_bonus: 5, per_correct_answer: 5, max_possible: 5 } });
      setQuizState('not-started');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      console.log('Starting quiz with ID:', quizData.quiz_id);
      console.log('Quiz has questions:', quizData.questions?.length);
      setLoading(true);
      const res = await startDailyQuiz(userId, quizData.quiz_id);
      const coinsAwarded = res?.coins_awarded ?? quizData?.coins?.attempt_bonus ?? 5;
      setAttemptCoinsAwarded(coinsAwarded);
      animateCoins();
      setCurrentQuestionIndex(0);
      setAnswers({});
      console.log('Setting quiz state to started');
      setQuizState('started');
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      Alert.alert('Error', error.message || 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (optionIndex: number) => {
    const questionId = String(currentQuestionIndex + 1);
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const nextQuestion = () => {
    const questionId = String(currentQuestionIndex + 1);
    if (answers[questionId] === undefined) {
      Alert.alert('Please select an answer', 'Choose an option before moving to the next question.');
      return;
    }

    if (currentQuestionIndex < quizData.questions.length - 1) {
      fadeAnim.setValue(0);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      fadeAnim.setValue(0);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const animateCoins = () => {
    Animated.sequence([
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.spring(coinAnim, {
        toValue: 1.2,
        friction: 3,
        useNativeDriver: false,
      }),
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const submitQuiz = async () => {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      Alert.alert('Error', 'No questions to submit');
      return;
    }

    console.log('Submitting quiz - answers:', answers);
    console.log('Total questions:', quizData.questions.length);
    console.log('Answered questions:', Object.keys(answers).length);
    
    if (Object.keys(answers).length < quizData.questions.length) {
      Alert.alert(
        'Incomplete Quiz',
        `Please answer all questions before submitting. (${Object.keys(answers).length}/${quizData.questions.length} answered)`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      console.log('Time taken:', timeTaken, 'seconds');
      const result = await submitDailyQuiz(userId, quizData.quiz_id, answers, timeTaken);
      
      console.log('Quiz submitted successfully, result:', result);
      // The API returns result inside 'result' and coin breakdown keys
      const coinsEarned = result?.result?.coins_earned ?? result?.coins_earned ?? result?.result?.total_earned ?? 0;
      setAttemptCoinsAwarded(coinsEarned);
      setResults(result);
      setQuizState('completed');
      animateCoins();
    } catch (error: any) {
      console.error('Submit quiz error:', error);
      Alert.alert('Error', error.message || 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  // If loading and we don't have quiz data yet, show full-screen loader.
  if (loading && !quizData) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingWebm visible={true} />
        <Text style={styles.loadingText}>Loading Daily Quiz...</Text>
      </View>
    );
  }

  // Already completed state
  if (quizState === 'completed' && results) {
    const coinScale = coinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <View style={styles.container}>
        {loading && quizData && <LoadingWebm visible={true} />}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Quiz Results</Text>
            <Text style={styles.headerSubtitle}>Great job keeping your streak!</Text>
          </View>
          <View style={styles.headerRightProfile}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="account-circle" size={32} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.profileCoinsLabel}>Total Coins</Text>
              <View style={styles.profileCoinsRow}>
                <MaterialIcons name="monetization-on" size={18} color={colors.primary} />
                <Text style={styles.profileCoinsText}>{userCoins}</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Animated.View
            style={[
              styles.coinCelebrationCard,
              {
                transform: [
                  { scale: coinScale },
                  {
                    translateY: coinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.coinHeroRow}>
              <Image
                source={require('../../assets/coins.png')}
                style={styles.coinHeroImage}
                resizeMode="contain"
              />
              <View style={styles.coinHeroTextCol}>
                <Text style={styles.coinCelebrationTitle}>🎉 Quiz Completed!</Text>
                <Text style={styles.coinsEarnedText}>
                  {results.result?.coins_earned || results.coins_earned || 0} Coins Earned!
                </Text>
              </View>
            </View>
            
            {results.coin_breakdown && (
              <View style={styles.coinBreakdown}>
                <View style={styles.coinBreakdownRow}>
                  <Text style={styles.coinBreakdownLabel}>🎯 Attempt Bonus:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text style={styles.coinBreakdownValue}>+{results.coin_breakdown.attempt_bonus}</Text>
                    <Image source={require('../../assets/coins.png')} style={{ width: 18, height: 18, marginLeft: spacing.xs }} />
                  </View>
                </View>
                <View style={styles.coinBreakdownRow}>
                  <Text style={styles.coinBreakdownLabel}>
                    ✅ Correct Answers ({results.coin_breakdown.correct_answers}):
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text style={styles.coinBreakdownValue}>+{results.coin_breakdown.correct_answer_coins}</Text>
                    <Image source={require('../../assets/coins.png')} style={{ width: 18, height: 18, marginLeft: spacing.xs }} />
                  </View>
                </View>
                <View style={[styles.coinBreakdownRow, styles.coinBreakdownTotal]}>
                  <Text style={styles.coinBreakdownTotalLabel}>Total:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text style={styles.coinBreakdownTotalValue}>{results.coin_breakdown.total_earned}</Text>
                    <Image source={require('../../assets/coins.png')} style={{ width: 18, height: 18, marginLeft: spacing.xs }} />
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          <View style={styles.performanceCard}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <MaterialIcons name="check-circle" size={32} color={colors.success} />
                <Text style={styles.statNumber}>{results.result?.correct_count || results.correct_count}</Text>
                <Text style={styles.statText}>Correct</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialIcons name="quiz" size={32} color={colors.primary} />
                <Text style={styles.statNumber}>{results.result?.total_questions || results.total_questions}</Text>
                <Text style={styles.statText}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialIcons name="percent" size={32} color={colors.warning} />
                <Text style={styles.statNumber}>
                  {Math.round(results.result?.score_percentage || results.score_percentage || 0)}%
                </Text>
                <Text style={styles.statText}>Score</Text>
              </View>
            </View>
          </View>

          {results.results && results.results.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Review Answers</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.breakdownCarousel}
              >
              {results.results.map((r: any, idx: number) => (
                <Animated.View key={idx} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownQ}>Q{r.question_id}</Text>
                    <View style={[styles.breakdownBadge, r.is_correct ? styles.correctBadge : styles.incorrectBadge]}>
                      <MaterialIcons 
                        name={r.is_correct ? 'check-circle' : 'cancel'} 
                        size={16} 
                        color={colors.white} 
                      />
                      <Text style={styles.badgeText}>
                        {r.is_correct ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownQuestion}>{formatResultText(r.question)}</Text>
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Your answer:</Text>
                    <Text style={[styles.answerValue, !r.is_correct && { color: colors.error }]}>
                      {formatResultText(r.user_answer)}
                    </Text>
                  </View>
                  {!r.is_correct && (
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Correct answer:</Text>
                      <Text style={[styles.answerValue, { color: colors.success }]}>
                        {formatResultText(r.correct_answer)}
                      </Text>
                    </View>
                  )}
                  {r.explanation && (
                    <View style={styles.explanationBox}>
                      <MaterialIcons name="lightbulb" size={16} color={colors.warning} />
                      <Text style={styles.explanationText}>{formatResultText(r.explanation)}</Text>
                    </View>
                  )}
                  {r.fun_fact && (
                    <View style={styles.funFactBox}>
                      <MaterialIcons name="info" size={16} color={colors.primary} />
                      <Text style={styles.funFactText}>{formatResultText(r.fun_fact)}</Text>
                    </View>
                  )}
                </Animated.View>
              ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              onComplete();
              onClose();
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Not started state
  if (quizState === 'not-started' && quizData) {
    return (
      <View style={styles.container}>
        {loading && quizData && <LoadingWebm visible={true} />}
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.startCard}>
            <Image source={require('../../assets/Quiz.png')} style={styles.quizImage} resizeMode="contain" />
            <Text style={styles.quizTitle}>Daily Quiz</Text>
            <Text style={styles.quizDescription}>
              {quizData.quiz_metadata?.description || 'Test your knowledge with AI-generated questions!'}
            </Text>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <MaterialIcons name="quiz" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                  {quizData.questions?.length ?? 5} Questions
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="timer" size={20} color={colors.primary} />
                <Text style={styles.infoText}>No time limit</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="emoji-events" size={20} color={colors.warning} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.infoText}>Earn up to {quizData.coins?.max_possible || 30} coins!</Text>
                  <Image source={require('../../assets/coins.png')} style={{ width: 18, height: 18, marginLeft: spacing.xs }} />
                </View>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>Coin Rewards</Text>
              <View style={styles.rewardRow}>
                <MaterialIcons name="play-circle" size={24} color={colors.success} />
                <Text style={styles.rewardText}>
                  +{quizData.coins?.attempt_bonus || 5} coins for starting
                </Text>
              </View>
              <View style={styles.rewardRow}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <Text style={styles.rewardText}>
                  +{quizData.coins?.per_correct_answer || 5} coins per correct answer
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.startButton, !(quizData?.questions?.length > 0) && styles.startButtonDisabled]} onPress={handleStartQuiz} disabled={!(quizData?.questions?.length > 0)}>
              <MaterialIcons name="play-arrow" size={24} color={colors.white} />
              <Text style={styles.startButtonText}>Start Daily Quiz</Text>
            </TouchableOpacity>

            {(!quizData?.questions || quizData.questions.length === 0) && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ ...typography.small, color: colors.textMuted }}>No questions available right now. Please try again.</Text>
                <TouchableOpacity style={[styles.doneButton, { marginTop: spacing.sm }]} onPress={loadQuiz}>
                  <Text style={styles.doneButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Quiz in progress
  if (quizState === 'started' && quizData && quizData.questions && quizData.questions.length > 0) {
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
    const questionId = String(currentQuestionIndex + 1);
    const selectedAnswer = answers[questionId];
    
    console.log('Rendering question', currentQuestionIndex + 1, '/', quizData.questions.length);
    console.log('Current question:', currentQuestion);

    return (
      <View style={styles.container}>
        {loading && quizData && <LoadingWebm visible={true} />}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Quiz</Text>
          <View style={styles.headerCoinsRight}>
            <Image
              source={require('../../assets/coins.png')}
              style={styles.headerCoinsIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerCoinsText}>{attemptCoinsAwarded} / {quizData?.coins?.max_possible ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </Text>
          <View style={styles.coinInfo}>
            <MaterialIcons name="monetization-on" size={16} color={colors.primary} />
            <Text style={styles.coinInfoText}>
              Potential: {(quizData?.coins?.attempt_bonus ?? 5) + (Object.keys(answers).length * (quizData?.coins?.per_correct_answer ?? 5))} coins • Answered: {Object.keys(answers).length}/{quizData.questions.length}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Animated.View
            style={[
              styles.questionCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {currentQuestion.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{currentQuestion.category}</Text>
              </View>
            )}

            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option: string, index: number) => {
                const isSelected = selectedAnswer === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => selectAnswer(index)}
                  >
                    <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                      {isSelected && <View style={styles.optionCircleInner} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
              onPress={previousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.white} />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            {currentQuestionIndex < quizData.questions.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={nextQuestion}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonSuccess]}
                onPress={submitQuiz}
              >
                <MaterialIcons name="check" size={20} color={colors.white} />
                <Text style={styles.navButtonText}>Submit Quiz</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.loadingContainer}>
      <MaterialIcons name="error-outline" size={60} color={colors.error} />
      <Text style={styles.errorTitle}>Unable to Load Quiz</Text>
      <Text style={styles.loadingText}>
        {!quizData ? 'Failed to load quiz data' : (quizState === 'started' ? 'No questions available for today.' : 'Quiz state error')}
      </Text>
      <Text style={styles.errorDetail}>
        State: {quizState} | Has Data: {quizData ? 'Yes' : 'No'}
      </Text>
      <TouchableOpacity style={styles.doneButton} onPress={loadQuiz}>
        <MaterialIcons name="refresh" size={20} color={colors.white} />
        <Text style={styles.doneButtonText}>Retry</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.textMuted, marginTop: spacing.sm }]} onPress={onClose}>
        <Text style={styles.doneButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
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
    textAlign: 'center',
  },
  errorTitle: {
    ...typography.h3,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorDetail: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
  },
  headerCoinsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerCoinsIcon: {
    width: 24,
    height: 24,
  },
  headerCoinsText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  headerRightProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCoinsLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  profileCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  profileCoinsText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  startCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.md,
    alignItems: 'center',
  },
  quizImage: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  quizTitle: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: '800',
  },
  quizDescription: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  infoBox: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
  },
  rewardCard: {
    width: '100%',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rewardTitle: {
    ...typography.h4,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  rewardText: {
    ...typography.body,
    color: colors.text,
  },
  startButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
    gap: spacing.sm,
  },
  startButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    opacity: 0.9,
  },
  startButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  cancelButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textMuted,
  },
  progressContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  questionText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleSelected: {
    borderColor: colors.primary,
  },
  optionCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navButtonSuccess: {
    backgroundColor: colors.success,
  },
  navButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  coinCelebrationCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  coinHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  coinHeroImage: {
    width: 80,
    height: 80,
  },
  coinHeroTextCol: {
    flex: 1,
  },
  coinCelebrationTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  coinsEarnedText: {
    ...typography.h1,
    color: colors.warning,
    fontWeight: '700',
  },
  coinBreakdown: {
    width: '100%',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  coinBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  coinBreakdownLabel: {
    ...typography.body,
    color: colors.text,
  },
  coinBreakdownValue: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '600',
  },
  coinBreakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  coinBreakdownTotalLabel: {
    ...typography.h4,
    color: colors.text,
  },
  coinBreakdownTotalValue: {
    ...typography.h4,
    color: colors.warning,
    fontWeight: '700',
  },
  performanceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  statText: {
    ...typography.small,
    color: colors.textMuted,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  breakdownCarousel: {
    paddingVertical: spacing.sm,
  },
  breakdownItem: {
    width: 280,
    marginRight: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  breakdownQ: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  breakdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  correctBadge: {
    backgroundColor: colors.success,
  },
  incorrectBadge: {
    backgroundColor: colors.error,
  },
  badgeText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  breakdownQuestion: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  answerLabel: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  answerValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  explanationText: {
    ...typography.small,
    color: colors.text,
    flex: 1,
  },
  funFactBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  funFactText: {
    ...typography.small,
    color: colors.text,
    flex: 1,
    fontStyle: 'italic',
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
    marginTop: spacing.lg,
  },
  doneButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  coinInfoText: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: spacing.xs / 2,
  },
});

export default DailyQuizScreen;
