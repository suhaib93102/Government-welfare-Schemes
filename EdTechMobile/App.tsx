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
import { Results } from './src/components/Results';
import { Questions } from './src/components/Questions';
import { Solutions } from './src/components/Solutions';
import { solveQuestionByText, solveQuestionByImage, checkHealth } from './src/services/api';
import { colors, spacing, borderRadius, typography, shadows } from './src/styles/theme';

type TabType = 'text' | 'image';
type PageType = 'dashboard' | 'projects' | 'questions' | 'solutions' | 'ask' | 'subjects' | 'settings' | 'profile';

const { width: initialWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// We'll use reactive screen width so web-resizes respond correctly
// and compute layout breakpoints from that value.

const navItems = [
  { id: 'dashboard' as PageType, label: 'Dashboard', icon: 'dashboard' },
  { id: 'questions' as PageType, label: 'My Questions', icon: 'help' },
  { id: 'ask' as PageType, label: 'Ask Question', icon: 'add-circle' },
  { id: 'subjects' as PageType, label: 'Subjects', icon: 'menu-book' },
  { id: 'profile' as PageType, label: 'Profile', icon: 'account-circle' },
];

const heroStats = [
  { id: 'speed', label: 'Avg Response', value: '2.3s', icon: 'bolt', hint: 'Real-time AI' },
  { id: 'accuracy', label: 'Confidence', value: '98%', icon: 'verified', hint: 'Verified answers' },
  { id: 'languages', label: 'Languages', value: '30+', icon: 'translate', hint: 'Auto-detect' },
];

export default function App() {
  const [screenWidth, setScreenWidth] = useState(initialWidth);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('ask');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      const response = await solveQuestionByImage(imageUri);
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

  const renderSidebar = () => {
    // compute sidebar width for different breakpoints
    const sidebarWidth = screenWidth >= 1280 ? 240 : screenWidth >= 768 ? 200 : 240;
    return (
      <View style={[styles.sidebar, { width: sidebarWidth, minWidth: sidebarWidth }]}>
      <View style={styles.userProfile}>
        <View style={styles.avatar}>
          <MaterialIcons name="account-circle" size={64} color={colors.primary} />
        </View>
        <Text style={styles.userName}>Student User</Text>
        <Text style={styles.userRole}>Learner</Text>
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

      <TouchableOpacity style={styles.upgradeButton}>
        <MaterialIcons name="workspace-premium" size={20} color={colors.white} />
        <Text style={styles.upgradeText}>Upgrade Plan</Text>
      </TouchableOpacity>
    </View>
    );
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
      {currentPage === 'questions' ? (
        <View style={{ padding: spacing.xl }}>
          <Questions />
        </View>
      ) : currentPage === 'solutions' ? (
        <View style={{ padding: spacing.xl }}>
          <Solutions />
        </View>
      ) : (
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
      )}
      </View>
    );
  };

  const showSidebar = isWeb && screenWidth >= 768;

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
            {renderSidebar()}
          </View>
        )}

        {showSidebar ? (
          <View style={styles.layoutWithSidebar}>
            {renderSidebar()}
            {renderMainContent()}
          </View>
        ) : (
          renderMainContent()
        )}
      </>
    </SafeAreaView>
  );
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
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 6, height: 0 },
    shadowRadius: 24,
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
});
