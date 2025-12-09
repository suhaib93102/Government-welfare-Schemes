import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TextInputComponent } from './src/components/TextInput';
import { ImageUpload } from './src/components/ImageUpload';
import { FileUpload } from './src/components/FileUpload';
import { Results } from './src/components/Results';
import { Questions } from './src/components/Questions';
import { Solutions } from './src/components/Solutions';
import { Quiz } from './src/components/Quiz';
import { Flashcard } from './src/components/Flashcard';
import { StudyMaterial } from './src/components/StudyMaterial';
import { PredictedQuestions } from './src/components/PredictedQuestions';
import { YouTubeSummarizer } from './src/components/YouTubeSummarizer';
import { Pricing } from './src/components/Pricing';
import { AuthScreen } from './src/components/AuthScreen';
import { LandingPageDashboard } from './src/components/LandingPageDashboard';
import { MainDashboard } from './src/components/MainDashboard';
import { solveQuestionByText, solveQuestionByImage, checkHealth, generateQuiz, generateFlashcards, generateStudyMaterial, summarizeYouTubeVideo, generatePredictedQuestions } from './src/services/api';
import { colors, spacing, borderRadius, typography, shadows } from './src/styles/theme';

type TabType = 'text' | 'image';
type PageType = 'dashboard' | 'quiz' | 'flashcards' | 'ask' | 'predicted-questions' | 'youtube-summarizer' | 'pricing' | 'profile';
type DashboardSection = 'overview' | 'quiz' | 'flashcards' | 'study-material';
type AppScreenType = 'auth' | 'landing' | 'main';

interface User {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'email';
  avatar?: string | null;
}

const { width: initialWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// We'll use reactive screen width so web-resizes respond correctly
// and compute layout breakpoints from that value.

const navItems = [
  { id: 'dashboard' as PageType, label: 'Dashboard', icon: 'dashboard' },
  { id: 'quiz' as PageType, label: 'Quiz', icon: 'quiz' },
  { id: 'flashcards' as PageType, label: 'Flashcards', icon: 'style' },
  { id: 'ask' as PageType, label: 'Ask Question', icon: 'help' },
  { id: 'predicted-questions' as PageType, label: 'Predicted Questions', icon: 'auto-awesome' },
  { id: 'youtube-summarizer' as PageType, label: 'YouTube Summarizer', icon: 'ondemand-video' },
  { id: 'pricing' as PageType, label: 'Pricing', icon: 'local-offer' },
  { id: 'profile' as PageType, label: 'Profile', icon: 'account-circle' },
];

const heroStats = [
  { id: 'speed', label: 'Avg Response', value: '2.3s', icon: 'bolt', hint: 'Real-time AI' },
  { id: 'accuracy', label: 'Confidence', value: '98%', icon: 'verified', hint: 'Verified answers' },
  { id: 'languages', label: 'Languages', value: '30+', icon: 'translate', hint: 'Auto-detect' },
];

export default function App() {
  // Authentication State
  const [appScreen, setAppScreen] = useState<AppScreenType>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  const [screenWidth, setScreenWidth] = useState(initialWidth);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('ask');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('overview');
  const [quizData, setQuizData] = useState<any>(null);
  const [flashcardData, setFlashcardData] = useState<any>(null);
  const [studyMaterialData, setStudyMaterialData] = useState<any>(null);
  const [predictedQuestionsData, setPredictedQuestionsData] = useState<any>(null);
  const [youtubeSummaryData, setYoutubeSummaryData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [studyMaterialLoading, setStudyMaterialLoading] = useState(false);
  const [predictedQuestionsLoading, setPredictedQuestionsLoading] = useState(false);
  const [youtubeSummaryLoading, setYoutubeSummaryLoading] = useState(false);

  // Authentication Handlers
  const handleAuthSuccess = (userInfo: User) => {
    setUser(userInfo);
    setAppScreen('main');
    setShowLanding(false);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setAppScreen('landing');
    setShowLanding(true);
    setResults(null);
    setQuizData(null);
    setFlashcardData(null);
    setStudyMaterialData(null);
    setPredictedQuestionsData(null);
    setYoutubeSummaryData(null);
  };

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // listen for dimension changes (useful for web resizing)
    const sub = Dimensions.addEventListener?.('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove?.();
  }, []);

  const checkApiHealth = async () => {
    try {
      await checkHealth();
      setApiStatus('online');
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const handleTextSubmit = async (question: string) => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await solveQuestionByText(question);
      setResults(response);
      setLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to solve question');
      setLoading(false);
    }
  };

  const handleImageSubmit = async (imageUri: string) => {
    setLoading(true);
    setResults(null);

    try {
      const response = await solveQuestionByImage(imageUri, 5);
      setResults(response);
      setLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image');
      setLoading(false);
    }
  };

  const toggleDrawer = (open?: boolean) => {
    setDrawerOpen((prev) => (open === undefined ? !prev : open));
  };

  const handleGenerateQuiz = async (topic: string, numQuestions: number = 5, difficulty: string = 'medium') => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    setQuizLoading(true);
    setQuizData(null);

    try {
      const response = await generateQuiz(topic, numQuestions, difficulty);
      setQuizData(response);
      setQuizLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate quiz');
      setQuizLoading(false);
    }
  };

  const handleGenerateQuizFromFile = async (files: any[], numQuestions: number = 5, difficulty: string = 'medium') => {
    if (!files || files.length === 0) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    setQuizLoading(true);
    setQuizData(null);

    try {
      // Use first file for now (backend supports single file)
      const response = await generateQuiz('', numQuestions, difficulty, files[0]);
      setQuizData(response);
      setQuizLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate quiz from file');
      setQuizLoading(false);
    }
  };

  const handleGenerateFlashcards = async (topic: string, numCards: number = 10) => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    setFlashcardLoading(true);
    setFlashcardData(null);

    try {
      const response = await generateFlashcards(topic, numCards);
      setFlashcardData(response);
      setFlashcardLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
      setFlashcardLoading(false);
    }
  };

  const handleGenerateFlashcardsFromFile = async (files: any[], numCards: number = 10) => {
    if (!files || files.length === 0) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    setFlashcardLoading(true);
    setFlashcardData(null);

    try {
      // Use first file for now (backend supports single file)
      const response = await generateFlashcards('', numCards, files[0]);
      setFlashcardData(response);
      setFlashcardLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate flashcards from file');
      setFlashcardLoading(false);
    }
  };

  const handleGenerateStudyMaterial = async (text: string) => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter text or upload a document');
      return;
    }

    setStudyMaterialLoading(true);
    setStudyMaterialData(null);

    try {
      const response = await generateStudyMaterial(text);
      setStudyMaterialData(response);
      setStudyMaterialLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate study material');
      setStudyMaterialLoading(false);
    }
  };

  const handleGenerateStudyMaterialFromFile = async (files: any[]) => {
    if (!files || files.length === 0) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    setStudyMaterialLoading(true);
    setStudyMaterialData(null);

    try {
      // Use first file for now (backend supports single file)
      const response = await generateStudyMaterial(undefined, files[0]);
      setStudyMaterialData(response);
      setStudyMaterialLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate study material from file');
      setStudyMaterialLoading(false);
    }
  };

  const handleGeneratePredictedQuestions = async (topic: string, examType: string = 'General') => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic or subject');
      return;
    }

    setPredictedQuestionsLoading(true);
    setPredictedQuestionsData(null);

    try {
      const response = await generatePredictedQuestions(topic, examType, 5);
      setPredictedQuestionsData(response);
      setPredictedQuestionsLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate predicted questions');
      setPredictedQuestionsLoading(false);
    }
  };

  const handleGeneratePredictedQuestionsFromFile = async (files: any[], examType: string = 'General') => {
    if (!files || files.length === 0) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    
    setPredictedQuestionsLoading(true);
    setPredictedQuestionsData(null);

    try {
      const response = await generatePredictedQuestions(undefined, examType, 5, files[0]);
      setPredictedQuestionsData(response);
      setPredictedQuestionsLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate predicted questions from file');
      setPredictedQuestionsLoading(false);
    }
  };

  const handleSummarizeYouTubeVideo = async (videoUrl: string) => {
    if (!videoUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    setYoutubeSummaryLoading(true);
    setYoutubeSummaryData(null);

    try {
      const response = await summarizeYouTubeVideo(videoUrl, false);
      setYoutubeSummaryData(response);
      setYoutubeSummaryLoading(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to summarize YouTube video');
      setYoutubeSummaryLoading(false);
    }
  };

  const renderSidebar = () => {
    // This function is no longer used - replaced by renderSidebarWithLogout
    return null;
  };

  const renderMainContent = () => {
    return (
      <View style={styles.mainContent}>
      {/* Top navbar for smaller screens, search + notifications + avatar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {screenWidth <= 767 && (
            <TouchableOpacity onPress={() => toggleDrawer(true)} style={styles.hamburger}>
              <MaterialIcons name="menu" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {screenWidth > 767 && (
          <View style={styles.topRight}>
            <View style={styles.searchShell}>
              <MaterialIcons name="search" size={18} color={colors.textMuted} />
              <Text style={{ marginLeft: 8, color: colors.textMuted }}>Search</Text>
            </View>

            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="notifications" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.avatarSmall}>
              <MaterialIcons name="account-circle" size={28} color={colors.primary} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="school" size={28} color={colors.primary} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.pageTitle}>ED Tech Solver</Text>
            <Text style={styles.pageSubtitle}>AI-powered solving</Text>
          </View>
        </View>
        
        <View style={[styles.statusPill, apiStatus === 'online' ? styles.statusOnline : styles.statusOffline]}>
          <MaterialIcons 
            name={apiStatus === 'online' ? 'check-circle' : apiStatus === 'checking' ? 'sync' : 'error'} 
            size={16} 
            color={colors.white} 
          />
          <Text style={styles.statusText}>
            {apiStatus === 'online' ? 'Online' : apiStatus === 'checking' ? 'Checking...' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Hero stats: responsive layout depends on width */}
      {screenWidth >= 1280 ? (
        <View style={styles.heroGridRow}>
          {heroStats.map((stat) => (
            <View key={stat.id} style={styles.statCardLarge}>
              <MaterialIcons name={stat.icon as any} size={30} color={colors.primary} />
              <View style={styles.statContentCenter}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValueLarge}>{stat.value}</Text>
                <Text style={styles.statHint}>{stat.hint}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : screenWidth >= 768 ? (
        <View style={{ width: '100%' }}>
          <View style={styles.heroGridRowTwo}>
            {heroStats.slice(0, 2).map((stat) => (
              <View key={stat.id} style={styles.statCardMedium}>
                <MaterialIcons name={stat.icon as any} size={26} color={colors.primary} />
                <View style={styles.statContentCenter}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValueLarge}>{stat.value}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.heroGridRowTwo, { marginTop: 12 }]}>
            <View style={styles.statCardMediumFull}>
              <MaterialIcons name={heroStats[2].icon as any} size={26} color={colors.primary} />
              <View style={styles.statContentCenter}>
                <Text style={styles.statLabel}>{heroStats[2].label}</Text>
                <Text style={styles.statValueLarge}>{heroStats[2].value}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.heroGridRowMobile}>
          {heroStats.map((stat) => (
            <View key={stat.id} style={styles.statCardMobile}>
              <MaterialIcons name={stat.icon as any} size={18} color={colors.primary} />
              <Text style={styles.statValueMobile}>{stat.value}</Text>
              <Text style={styles.statLabelMobile}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* If the app page is Questions or Solutions, show that view instead of the ask input */}
      {currentPage === 'dashboard' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          {/* Dashboard Sections Tabs */}
          <View style={styles.dashboardTabsContainer}>
            <TouchableOpacity
              style={[styles.dashboardTab, dashboardSection === 'overview' && styles.dashboardTabActive]}
              onPress={() => setDashboardSection('overview')}
            >
              <MaterialIcons 
                name="dashboard" 
                size={20} 
                color={dashboardSection === 'overview' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.dashboardTabText, dashboardSection === 'overview' && styles.dashboardTabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dashboardTab, dashboardSection === 'quiz' && styles.dashboardTabActive]}
              onPress={() => setDashboardSection('quiz')}
            >
              <MaterialIcons 
                name="quiz" 
                size={20} 
                color={dashboardSection === 'quiz' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.dashboardTabText, dashboardSection === 'quiz' && styles.dashboardTabTextActive]}>
                Quiz
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dashboardTab, dashboardSection === 'flashcards' && styles.dashboardTabActive]}
              onPress={() => setDashboardSection('flashcards')}
            >
              <MaterialIcons 
                name="style" 
                size={20} 
                color={dashboardSection === 'flashcards' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.dashboardTabText, dashboardSection === 'flashcards' && styles.dashboardTabTextActive]}>
                Flashcards
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dashboardTab, dashboardSection === 'study-material' && styles.dashboardTabActive]}
              onPress={() => setDashboardSection('study-material')}
            >
              <MaterialIcons 
                name="school" 
                size={20} 
                color={dashboardSection === 'study-material' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.dashboardTabText, dashboardSection === 'study-material' && styles.dashboardTabTextActive]}>
                Study Material
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dashboard Content */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {dashboardSection === 'overview' && (
              <View style={styles.overviewContainer}>
                <View style={styles.featureCard}>
                  <MaterialIcons name="quiz" size={48} color={colors.primary} />
                  <Text style={styles.featureTitle}>Generate Quiz</Text>
                  <Text style={styles.featureDescription}>
                    Create interactive quizzes from any topic or document
                  </Text>
                  <TouchableOpacity 
                    style={styles.featureButton}
                    onPress={() => setDashboardSection('quiz')}
                  >
                    <Text style={styles.featureButtonText}>Start Quiz</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.featureCard}>
                  <MaterialIcons name="style" size={48} color={colors.success} />
                  <Text style={styles.featureTitle}>Study Flashcards</Text>
                  <Text style={styles.featureDescription}>
                    Master concepts with AI-generated flashcards
                  </Text>
                  <TouchableOpacity 
                    style={[styles.featureButton, { backgroundColor: colors.success }]}
                    onPress={() => setDashboardSection('flashcards')}
                  >
                    <Text style={styles.featureButtonText}>Create Flashcards</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.featureCard}>
                  <MaterialIcons name="school" size={48} color={colors.error} />
                  <Text style={styles.featureTitle}>Study Material</Text>
                  <Text style={styles.featureDescription}>
                    Extract topics, concepts, notes, and questions from sample papers
                  </Text>
                  <TouchableOpacity 
                    style={[styles.featureButton, { backgroundColor: colors.error }]}
                    onPress={() => setDashboardSection('study-material')}
                  >
                    <Text style={styles.featureButtonText}>Generate Material</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.featureCard}>
                  <MaterialIcons name="search" size={48} color={colors.warning} />
                  <Text style={styles.featureTitle}>Ask Questions</Text>
                  <Text style={styles.featureDescription}>
                    Get instant answers to any question with AI
                  </Text>
                  <TouchableOpacity 
                    style={[styles.featureButton, { backgroundColor: colors.warning }]}
                    onPress={() => setCurrentPage('ask')}
                  >
                    <Text style={styles.featureButtonText}>Ask Now</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {dashboardSection === 'quiz' && (
              <View style={styles.sectionContainer}>
                {!quizData && !quizLoading && (
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Generate Quiz</Text>
                    <TextInputComponent 
                      onSubmit={(topic) => handleGenerateQuiz(topic, 5, 'medium')} 
                      loading={quizLoading}
                      placeholder="Enter a topic (e.g., Photosynthesis, World War 2, Python programming)"
                    />

                    <Text style={styles.orText}>— or —</Text>

                    <FileUpload
                      onSubmit={(file) => handleGenerateQuizFromFile(file, 5, 'medium')}
                      loading={quizLoading}
                      placeholder="Upload a PDF/TXT/Image to generate a quiz"
                    />
                  </View>
                )}
                <Quiz quizData={quizData} loading={quizLoading} />
                {quizData && (
                  <TouchableOpacity 
                    style={styles.newContentButton}
                    onPress={() => setQuizData(null)}
                  >
                    <MaterialIcons name="add" size={20} color={colors.white} />
                    <Text style={styles.newContentButtonText}>Generate New Quiz</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {dashboardSection === 'flashcards' && (
              <View style={styles.sectionContainer}>
                {!flashcardData && !flashcardLoading && (
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Generate Flashcards</Text>
                    <TextInputComponent 
                      onSubmit={(topic) => handleGenerateFlashcards(topic, 10)} 
                      loading={flashcardLoading}
                      placeholder="Enter a topic (e.g., Spanish vocabulary, Chemistry formulas, History dates)"
                    />

                    <Text style={styles.orText}>— or —</Text>

                    <FileUpload
                      onSubmit={(file) => handleGenerateFlashcardsFromFile(file, 10)}
                      loading={flashcardLoading}
                      placeholder="Upload a PDF/TXT/Image to generate flashcards"
                    />
                  </View>
                )}
                <Flashcard flashcardData={flashcardData} loading={flashcardLoading} />
                {flashcardData && (
                  <TouchableOpacity 
                    style={styles.newContentButton}
                    onPress={() => setFlashcardData(null)}
                  >
                    <MaterialIcons name="add" size={20} color={colors.white} />
                    <Text style={styles.newContentButtonText}>Generate New Flashcards</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {dashboardSection === 'study-material' && (
              <View style={styles.sectionContainer}>
                {!studyMaterialData && !studyMaterialLoading && (
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Generate Study Material</Text>
                    <Text style={styles.sectionSubtitle}>
                      Upload a sample paper or paste text to extract important topics, concepts, study notes, and practice questions
                    </Text>
                    <TextInputComponent 
                      onSubmit={handleGenerateStudyMaterial} 
                      loading={studyMaterialLoading}
                      placeholder="Paste sample paper text or upload a document"
                    />

                    <Text style={styles.orText}>— or —</Text>

                    <FileUpload
                      onSubmit={(file) => handleGenerateStudyMaterialFromFile(file)}
                      loading={studyMaterialLoading}
                      placeholder="Upload PDF/TXT/Image to extract study material"
                    />
                  </View>
                )}
                <StudyMaterial studyMaterialData={studyMaterialData} loading={studyMaterialLoading} />
                {studyMaterialData && (
                  <TouchableOpacity 
                    style={styles.newContentButton}
                    onPress={() => setStudyMaterialData(null)}
                  >
                    <MaterialIcons name="add" size={20} color={colors.white} />
                    <Text style={styles.newContentButtonText}>Generate New Study Material</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      ) : currentPage === 'quiz' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionContainer}>
              {!quizData && !quizLoading && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Generate Quiz</Text>
                  <TextInputComponent 
                    onSubmit={(topic) => handleGenerateQuiz(topic, 5, 'medium')} 
                    loading={quizLoading}
                    placeholder="Enter a topic (e.g., Photosynthesis, World War 2, Python programming)"
                  />

                  <Text style={styles.orText}>— or —</Text>

                  <FileUpload
                    onSubmit={(file) => handleGenerateQuizFromFile(file, 5, 'medium')}
                    loading={quizLoading}
                    placeholder="Upload a PDF/TXT/Image to generate a quiz"
                  />
                </View>
              )}
              <Quiz quizData={quizData} loading={quizLoading} />
              {quizData && (
                <TouchableOpacity 
                  style={styles.newContentButton}
                  onPress={() => setQuizData(null)}
                >
                  <MaterialIcons name="add" size={20} color={colors.white} />
                  <Text style={styles.newContentButtonText}>Generate New Quiz</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      ) : currentPage === 'flashcards' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionContainer}>
              {!flashcardData && !flashcardLoading && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Generate Flashcards</Text>
                  <TextInputComponent 
                    onSubmit={(topic) => handleGenerateFlashcards(topic, 10)} 
                    loading={flashcardLoading}
                    placeholder="Enter a topic (e.g., Spanish vocabulary, Chemistry formulas, History dates)"
                  />

                  <Text style={styles.orText}>— or —</Text>

                  <FileUpload
                    onSubmit={(file) => handleGenerateFlashcardsFromFile(file, 10)}
                    loading={flashcardLoading}
                    placeholder="Upload a PDF/TXT/Image to generate flashcards"
                  />
                </View>
              )}
              <Flashcard flashcardData={flashcardData} loading={flashcardLoading} />
              {flashcardData && (
                <TouchableOpacity 
                  style={styles.newContentButton}
                  onPress={() => setFlashcardData(null)}
                >
                  <MaterialIcons name="add" size={20} color={colors.white} />
                  <Text style={styles.newContentButtonText}>Generate New Flashcards</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      ) : currentPage === 'predicted-questions' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionContainer}>
              {!predictedQuestionsData && !predictedQuestionsLoading && (
                <View style={styles.inputSection}>
                  <Text style={styles.sectionTitle}>Get Predicted Important Questions</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter a subject or topic to generate likely exam questions based on importance and difficulty
                  </Text>
                  <TextInputComponent 
                    onSubmit={(topic) => handleGeneratePredictedQuestions(topic, 'General')} 
                    loading={predictedQuestionsLoading}
                    placeholder="Enter a subject or topic (e.g., Machine Learning, Organic Chemistry)"
                  />

                  <Text style={styles.orText}>— or —</Text>

                  <FileUpload
                    onSubmit={(file) => handleGeneratePredictedQuestionsFromFile(file, 'General')}
                    loading={predictedQuestionsLoading}
                    placeholder="Upload syllabus/notes to predict important questions"
                  />
                </View>
              )}
              <PredictedQuestions predictedQuestionsData={predictedQuestionsData} loading={predictedQuestionsLoading} />
              {predictedQuestionsData && (
                <TouchableOpacity 
                  style={styles.newContentButton}
                  onPress={() => setPredictedQuestionsData(null)}
                >
                  <MaterialIcons name="add" size={20} color={colors.white} />
                  <Text style={styles.newContentButtonText}>Generate New Predictions</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      ) : currentPage === 'youtube-summarizer' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionContainer}>
              <YouTubeSummarizer 
                summaryData={youtubeSummaryData} 
                loading={youtubeSummaryLoading}
                onSubmit={handleSummarizeYouTubeVideo}
              />
              {youtubeSummaryData && (
                <TouchableOpacity 
                  style={styles.newContentButton}
                  onPress={() => setYoutubeSummaryData(null)}
                >
                  <MaterialIcons name="add" size={20} color={colors.white} />
                  <Text style={styles.newContentButtonText}>Summarize Another Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      ) : currentPage === 'ask' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'text' && styles.activeTab]}
              onPress={() => setActiveTab('text')}
            >
              <MaterialIcons 
                name="text-fields" 
                size={20} 
                color={activeTab === 'text' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, activeTab === 'text' && styles.activeTabText]}>
                Text Input
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'image' && styles.activeTab]}
              onPress={() => setActiveTab('image')}
            >
              <MaterialIcons 
                name="photo-camera" 
                size={20} 
                color={activeTab === 'image' ? colors.primary : colors.textMuted} 
              />
              <Text style={[styles.tabText, activeTab === 'image' && styles.activeTabText]}>
                Image Upload
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Processing your question...</Text>
              </View>
            )}

            {!loading && !results && (
              <View style={styles.inputContainer}>
                {activeTab === 'text' ? (
                  <TextInputComponent onSubmit={handleTextSubmit} loading={loading} />
                ) : (
                  <ImageUpload onSubmit={handleImageSubmit} loading={loading} />
                )}
              </View>
            )}

            {!loading && results && (
              <View style={styles.resultsContainer}>
                <Results data={results} />
                <TouchableOpacity
                  style={styles.newQuestionButton}
                  onPress={() => setResults(null)}
                >
                  <MaterialIcons name="add" size={20} color={colors.white} />
                  <Text style={styles.newQuestionText}>Ask New Question</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      ) : currentPage === 'pricing' ? (
        <View style={{ flex: 1 }}>
          <Pricing />
        </View>
      ) : currentPage === 'profile' ? (
        <View style={{ flex: 1, padding: spacing.lg }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.profileContainer}>
              <View style={styles.profileHeader}>
                <MaterialIcons name="account-circle" size={100} color={colors.primary} />
                <Text style={styles.profileName}>Student User</Text>
                <Text style={styles.profileRole}>Learner</Text>
              </View>
              <View style={styles.profileStats}>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>24</Text>
                  <Text style={styles.profileStatLabel}>Quizzes Taken</Text>
                </View>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>156</Text>
                  <Text style={styles.profileStatLabel}>Flashcards Studied</Text>
                </View>
                <View style={styles.profileStatCard}>
                  <Text style={styles.profileStatValue}>89%</Text>
                  <Text style={styles.profileStatLabel}>Avg Score</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : null}
      </View>
    );
  };

  const showSidebar = isWeb && screenWidth >= 768;

  // Render Auth Screen
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        {showLanding ? (
          <LandingPageDashboard 
            onNavigateToFeature={() => setShowLanding(false)}
            onNavigateToPricing={() => {
              setShowLanding(false);
              setUser({ id: 'temp', name: 'Guest', email: 'guest@example.com', provider: 'email' });
            }}
          />
        ) : (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}
      </SafeAreaView>
    );
  }

  // Render Main App with user logged in
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <>
        {/* Drawer overlay for mobile */}
        {!showSidebar && drawerOpen && (
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={0.9} onPress={() => toggleDrawer(false)} />
        )}

        {/* Mobile drawer (slides in) */}
        {!showSidebar && drawerOpen && (
          <View style={[styles.sidebar, styles.sidebarDrawer]}>
            {renderSidebarWithLogout()}
          </View>
        )}

        {showSidebar ? (
          <View style={styles.layoutWithSidebar}>
            {renderSidebarWithLogout()}
            {renderMainContent()}
          </View>
        ) : (
          renderMainContent()
        )}
      </>
    </SafeAreaView>
  );

  function renderSidebarWithLogout() {
    // compute sidebar width for different breakpoints
    const sidebarWidth = screenWidth >= 1280 ? 240 : screenWidth >= 768 ? 200 : 240;
    return (
      <View style={[styles.sidebar, { width: sidebarWidth, minWidth: sidebarWidth }]}>
      <View style={styles.userProfile}>
        <View style={styles.avatar}>
          <MaterialIcons name="account-circle" size={64} color={colors.primary} />
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userRole}>{user?.provider === 'google' ? 'Google User' : 'Learner'}</Text>
      </View>

      <View style={styles.navMenu}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, currentPage === item.id && styles.navItemActive]}
            onPress={() => setCurrentPage(item.id)}
          >
            <MaterialIcons 
              name={item.icon as any} 
              size={20} 
              color={currentPage === item.id ? colors.primary : colors.textMuted} 
            />
            <Text style={[
              styles.navText,
              currentPage === item.id && styles.navTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.upgradeButton}>
          <MaterialIcons name="workspace-premium" size={20} color={colors.white} />
          <Text style={styles.upgradeText}>Upgrade Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  layoutWithSidebar: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.xl,
  },
  userProfile: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  userRole: {
    ...typography.small,
    color: colors.textMuted,
  },
  navMenu: {
    flex: 1,
    gap: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  navItemActive: {
    backgroundColor: colors.blue50,
  },
  navText: {
    ...typography.body,
    color: colors.textMuted,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  upgradeText: {
    ...typography.h4,
    color: colors.white,
  },
  sidebarFooter: {
    gap: spacing.md,
    marginTop: 'auto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  logoutText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
  },
  mainContent: {
    flex: 1,
  },
  pageHeader: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  pageTitle: {
    ...typography.h2,
    marginBottom: 2,
  },
  pageSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  statusOnline: {
    backgroundColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.error,
  },
  statusText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  heroStatsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroStatsContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  statCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 220,
    minHeight: 140,
    ...shadows.sm,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    marginVertical: 2,
  },
  statHint: {
    fontSize: 11,
    color: colors.textLight,
  },
  /* drawer overlay */
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 50,
  },
  sidebarDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 60,
    boxShadow: '6px 0 24px rgba(0, 0, 0, 0.18)',
    elevation: 12,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hamburger: { padding: spacing.xs },
  pageHeadingText: { ...typography.h3, marginLeft: spacing.sm },
  searchShell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  iconButton: { padding: spacing.xs },
  avatarSmall: { width: 36, height: 36, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },

  /* hero grid layouts */
  heroGridRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginVertical: spacing.md },
  heroGridRowTwo: { flexDirection: 'row', gap: spacing.md },
  heroGridRowMobile: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  statCardLarge: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadows.md },
  statCardMedium: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  statCardMediumFull: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  statCardMobile: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  statContentCenter: { alignItems: 'center', justifyContent: 'center' },
  statValueLarge: { ...typography.h2, color: colors.primary },
  statValueMobile: { ...typography.h4, color: colors.primary, fontWeight: '700' },
  statLabelMobile: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  inputContainer: {
    padding: spacing.xl,
  },
  resultsContainer: {
    padding: spacing.xl,
  },
  newQuestionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  newQuestionText: {
    ...typography.h4,
    color: colors.white,
  },
  dashboardTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  dashboardTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dashboardTabActive: {
    borderBottomColor: colors.primary,
  },
  dashboardTabText: {
    ...typography.body,
    color: colors.textMuted,
  },
  dashboardTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  overviewContainer: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  featureCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  featureTitle: {
    ...typography.h2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  featureDescription: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  featureButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  sectionContainer: {
    flex: 1,
  },
  inputSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  orText: {
    textAlign: 'center',
    marginVertical: spacing.md,
    ...typography.body,
    color: colors.textMuted,
  },
  newContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  newContentButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: colors.white,
    padding: spacing.xl * 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  profileName: {
    ...typography.h1,
    marginTop: spacing.md,
  },
  profileRole: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  profileStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  profileStatValue: {
    ...typography.h1,
    color: colors.primary,
  },
  profileStatLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
