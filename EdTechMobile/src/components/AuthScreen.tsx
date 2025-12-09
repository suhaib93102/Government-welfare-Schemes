import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { googleAuthAPI } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  onAuthSuccess: (userInfo: any) => void;
}

// Replace with your actual Google Client ID from GCP
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=http://localhost:8081&response_type=code&scope=openid%20email%20profile`;

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  
  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const [signupConfirmPasswordVisible, setSignupConfirmPasswordVisible] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Open Google OAuth URL
      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_AUTH_URL, 'http://localhost:8081');

      if (result.type === 'success') {
        const url = result.url;
        
        // Extract authorization code from URL
        const codeMatch = url.match(/code=([^&]+)/);
        if (!codeMatch || !codeMatch[1]) {
          Alert.alert('Error', 'Failed to get authorization code');
          setLoading(false);
          return;
        }

        const authCode = codeMatch[1];

        // Exchange code for tokens with backend
        const authResult = await googleAuthAPI.signInWithGoogle(authCode);

        if (authResult.success) {
          Alert.alert(
            'Success',
            `Welcome, ${authResult.user.first_name || 'User'}!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  onAuthSuccess(authResult.user);
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', authResult.error || 'Failed to sign in with Google');
        }
      } else if (result.type === 'cancel') {
        console.log('Google sign in was cancelled');
      } else if (result.type === 'dismiss') {
        console.log('Google sign in was dismissed');
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(loginEmail)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const result = await googleAuthAPI.login(loginEmail, loginPassword);

      if (result.success) {
        Alert.alert('Success', 'Logged in successfully', [
          {
            text: 'OK',
            onPress: () => {
              onAuthSuccess(result.user);
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Login failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(signupEmail)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (signupPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await googleAuthAPI.signUp(signupName, signupEmail, signupPassword);

      if (result.success) {
        Alert.alert('Success', 'Account created successfully', [
          {
            text: 'OK',
            onPress: () => {
              onAuthSuccess(result.user);
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Sign up failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="school" size={60} color={colors.primary} />
        </View>
        <Text style={styles.appTitle}>ED Tech Solver</Text>
        <Text style={styles.appSubtitle}>Master Your Studies with AI-Powered Learning</Text>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresPreview}>
        <View style={styles.featurePreviewItem}>
          <MaterialIcons name="smart-toy" size={28} color={colors.primary} />
          <Text style={styles.featurePreviewText}>AI-Powered Q&A</Text>
        </View>
        <View style={styles.featurePreviewItem}>
          <MaterialIcons name="quiz" size={28} color={colors.primary} />
          <Text style={styles.featurePreviewText}>Smart Quizzes</Text>
        </View>
        <View style={styles.featurePreviewItem}>
          <MaterialIcons name="style" size={28} color={colors.primary} />
          <Text style={styles.featurePreviewText}>Flashcards</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'login' && styles.tabActive]}
          onPress={() => setActiveTab('login')}
        >
          <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
          onPress={() => setActiveTab('signup')}
        >
          <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auth Forms */}
      <View style={styles.formContainer}>
        {activeTab === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back</Text>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="language" size={24} color={colors.primary} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Email Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  editable={!loading}
                  secureTextEntry={!loginPasswordVisible}
                />
                <TouchableOpacity
                  onPress={() => setLoginPasswordVisible(!loginPasswordVisible)}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={loginPasswordVisible ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Your Account</Text>

            {/* Google Sign-Up Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="language" size={24} color={colors.primary} />
                  <Text style={styles.googleButtonText}>Sign Up with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textMuted}
                  value={signupName}
                  onChangeText={setSignupName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  editable={!loading}
                  secureTextEntry={!signupPasswordVisible}
                />
                <TouchableOpacity
                  onPress={() => setSignupPasswordVisible(!signupPasswordVisible)}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={signupPasswordVisible ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textMuted}
                  value={signupConfirmPassword}
                  onChangeText={setSignupConfirmPassword}
                  editable={!loading}
                  secureTextEntry={!signupConfirmPasswordVisible}
                />
                <TouchableOpacity
                  onPress={() => setSignupConfirmPasswordVisible(!signupConfirmPasswordVisible)}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={signupConfirmPasswordVisible ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Conditions */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEmailSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Create Account</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure • Private • Always Free to Start</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  appTitle: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  appSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  featuresPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  featurePreviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  featurePreviewText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.small,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  formContainer: {
    paddingHorizontal: spacing.lg,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  formTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  googleButtonText: {
    ...typography.button,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.small,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    ...typography.small,
    color: colors.primary,
  },
  termsContainer: {
    marginBottom: spacing.md,
  },
  termsText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
    marginRight: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
