import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { requestPasswordReset, validateResetToken, resetPassword } from '../services/api';

interface ResetPasswordScreenProps {
  onClose: () => void;
  onBackToLogin: () => void;
  initialToken?: string; // Token from email link
}

type ResetStep = 'request' | 'reset';

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onClose,
  onBackToLogin,
  initialToken,
}) => {
  const [step, setStep] = useState<ResetStep>(initialToken ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleRequestReset = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const response = await requestPasswordReset(email);
      
      if (response.success) {
        setResetEmail(email);
        Alert.alert(
          'Email Sent',
          'We have sent a password reset link to your email. Please check your inbox and follow the instructions.',
          [{ text: 'OK' }]
        );
        setEmail('');
      } else {
        Alert.alert('Error', response.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateToken = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter the reset token from your email');
      return;
    }

    try {
      setLoading(true);
      const response = await validateResetToken(token);
      
      if (response.success) {
        setResetEmail(response.data.email);
        setStep('reset');
      } else {
        Alert.alert('Error', response.error || 'Invalid or expired token');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter your new password in both fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await resetPassword(token, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: onBackToLogin,
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to reset password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Content */}
      {step === 'request' && !initialToken ? (
        <View style={styles.content}>
          <View style={styles.iconSection}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock-reset" size={48} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onBackToLogin}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : step === 'reset' ? (
        <View style={styles.content}>
          <View style={styles.iconSection}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock" size={48} color={colors.success} />
            </View>
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            {resetEmail ? `Resetting password for ${resetEmail}` : 'Enter your new password below'}
          </Text>

          {!initialToken && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reset Token (from email)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="verified" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Paste token from email"
                  placeholderTextColor={colors.textMuted}
                  value={token}
                  onChangeText={setToken}
                  editable={!loading}
                  autoCapitalize="none"
                />
              </View>
              {token && !initialToken && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleValidateToken}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Validate Token</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {token && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>Passwords do not match</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  (loading || newPassword !== confirmPassword) && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={loading || newPassword !== confirmPassword}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={onBackToLogin}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.text,
    height: 24,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: spacing.sm,
  },
});
