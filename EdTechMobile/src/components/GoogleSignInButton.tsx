import React, { useEffect } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, borderRadius } from '../styles/theme';

WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  // allow partial config since AuthScreen builds a Partial config at runtime
  config: Partial<Google.GoogleAuthRequestConfig>;
  onAuthCode: (code: string) => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  label: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  config,
  onAuthCode,
  loading,
  setLoading,
  label,
}) => {
  // use a cast here because expo-auth-session expects a full config,
  // but our AuthScreen provides a Partial at runtime (with clientId present).
  const [request, response, promptAsync] = Google.useAuthRequest(
    config as Google.GoogleAuthRequestConfig
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      onAuthCode(response.params.code).catch((error) => {
        Alert.alert('Google Sign-In Failed', error?.message || 'Please try again in a moment.');
      }).finally(() => setLoading(false));
    } else if (response && response.type !== 'success') {
      setLoading(false);
    }
  }, [response, onAuthCode, setLoading]);

  const handlePress = async () => {
    if (!request) {
      Alert.alert('Google Sign-In Unavailable', 'Google Sign-In is not configured for this platform. Please check your OAuth client ID and redirect settings.');
      return;
    }

    try {
      setLoading(true);
      await promptAsync();
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Google Sign-In Failed', error?.message || 'Unable to start Google sign-in flow.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, loading && styles.googleButtonDisabled]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#1A202C" />
      ) : (
        <>
          <MaterialIcons name="login" size={20} color="#4285F4" />
          <Text style={styles.googleButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // show pointer cursor on web to indicate clickable area
    ...(typeof document !== 'undefined' ? { cursor: 'pointer' } : {}),
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    fontWeight: '600',
    color: '#1A202C',
    fontSize: 15,
  },
});