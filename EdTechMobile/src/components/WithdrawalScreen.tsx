import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { getUserCoins } from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';

interface WithdrawalScreenProps {
  userId: string;
  onClose: () => void;
  onWithdrawalSuccess: () => void;
}

export const WithdrawalScreen: React.FC<WithdrawalScreenProps> = ({
  userId,
  onClose,
  onWithdrawalSuccess,
}) => {
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Simple form states
  const [coinsAmount, setCoinsAmount] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  useEffect(() => {
    loadUserCoins();
    loadRazorpayKey();
  }, []);

  const loadRazorpayKey = async () => {
    try {
      const { getRazorpayKey } = require('../services/api');
      const data = await getRazorpayKey();
      setRazorpayKeyId(data.key_id || '');
      console.log('Razorpay key loaded:', data.key_id);
    } catch (error) {
      console.error('Failed to load Razorpay key:', error);
    }
  };

  const loadUserCoins = async () => {
    try {
      const data = await getUserCoins(userId);
      setUserCoins(data.total_coins || 0);
    } catch (error: any) {
      console.error('Failed to load coins:', error);
    }
  };

  const handlePayNow = async () => {
    try {
      // Clear previous errors
      setErrorMessage('');
      
      // Trim input
      const coinsInput = coinsAmount.trim();
      const emailInput = userEmail.trim();
      
      // Validate email
      if (!emailInput) {
        const msg = 'Email address is required';
        setErrorMessage(msg);
        Alert.alert('Required Field', msg);
        return;
      }
      
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailInput)) {
        const msg = 'Please enter a valid email address';
        setErrorMessage(msg);
        Alert.alert('Invalid Email', msg);
        return;
      }
      
      // Validate coins amount
      if (!coinsInput) {
        setErrorMessage('Please enter the number of coins to withdraw');
        Alert.alert('Required Field', 'Please enter the number of coins to withdraw');
        return;
      }

      const coins = parseInt(coinsInput);
      if (isNaN(coins) || coins <= 0) {
        const msg = 'Please enter a valid number of coins';
        setErrorMessage(msg);
        Alert.alert('Invalid Amount', msg);
        return;
      }

      if (coins < 100) {
        const msg = 'Minimum withdrawal is 100 coins (₹10)';
        setErrorMessage(msg);
        Alert.alert('Minimum Withdrawal', msg);
        return;
      }

      if (coins > userCoins) {
        const msg = `Insufficient balance. You have ${userCoins} coins`;
        setErrorMessage(msg);
        Alert.alert('Insufficient Balance', `You only have ${userCoins} coins available. Please enter a lower amount.`);
        return;
      }

      // Open Razorpay
      await openRazorpayCheckout(coins, emailInput);
      
    } catch (error: any) {
      let errMsg = 'Failed to process withdrawal';
      if (error.message) {
        errMsg = error.message;
      }
      setErrorMessage(errMsg);
      Alert.alert('Error', errMsg);
    }
  };

  const openRazorpayCheckout = async (coins: number, email: string) => {
    try {
      if (!razorpayKeyId) {
        Alert.alert('Error', 'Payment gateway is not configured. Please contact support.');
        return;
      }

      const rupees = coins / 10;
      setLoading(true);
      
      console.log('Creating Razorpay order...');
      console.log('Coins:', coins, 'Rupees:', rupees);
      
      // Create Razorpay order
      const { default: api } = require('../services/api');
      const orderResponse = await api.post('/razorpay/create-order/', {
        amount: rupees,
        currency: 'INR',
        receipt: `withdrawal_${Date.now()}`,
        user_id: userId,
        notes: {
          coins_amount: coins,
          type: 'coin_withdrawal',
          user_id: userId,
          email: email,
        },
      });

      console.log('Order response:', orderResponse.data);

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.error || 'Failed to create payment order');
      }

      const { order_id, amount, currency, key_id } = orderResponse.data;

      console.log('Order created successfully:', order_id);

      // Razorpay checkout options
      const options = {
        description: `Withdraw ${coins} coins (₹${rupees})`,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: currency || 'INR',
        key: key_id || razorpayKeyId,
        amount: amount.toString(),
        name: 'EdTech - Coin Withdrawal',
        order_id: order_id,
        prefill: {
          email: email,
          contact: '9999999999',
          name: 'User',
        },
        theme: { color: colors.primary },
        modal: {
          ondismiss: () => {
            console.log('Razorpay checkout dismissed');
            setLoading(false);
          },
          escape: true,
          backdropclose: true,
        },
        // Enable all payment methods
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
        },
      };

      console.log('Opening Razorpay with options:', JSON.stringify(options, null, 2));
      setLoading(false);

      // Open Razorpay Checkout
      if (Platform.OS === 'web') {
        // For web, load Razorpay script and open checkout
        console.log('Platform: web');
        
        // Load Razorpay checkout script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          console.log('Razorpay script loaded');
          const rzp = new (window as any).Razorpay({
            ...options,
            handler: function (response: any) {
              console.log('Payment successful:', response);
              Alert.alert(
                'Payment Successful!',
                `Payment ID: ${response.razorpay_payment_id}\n\n${coins} coins have been withdrawn successfully!`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setCoinsAmount('');
                      setUserEmail('');
                      loadUserCoins();
                      onWithdrawalSuccess();
                    },
                  },
                ]
              );
            },
          });
          rzp.open();
          console.log('Razorpay checkout opened');
        };
        script.onerror = (err) => {
          console.error('Failed to load Razorpay script:', err);
          Alert.alert('Error', 'Failed to load payment gateway. Please try again.');
        };
        document.head.appendChild(script);
      } else {
        // For mobile (Android/iOS), use native SDK
        console.log('Platform: mobile');
        console.log('Opening native Razorpay checkout');
        RazorpayCheckout.open(options)
          .then((data: any) => {
            // Payment success
            console.log('Payment successful:', data);
            Alert.alert(
              'Payment Successful!',
              `Payment ID: ${data.razorpay_payment_id}\n\n${coins} coins have been withdrawn successfully!`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setCoinsAmount('');
                    setUserEmail('');
                    loadUserCoins();
                    onWithdrawalSuccess();
                  },
                },
              ]
            );
          })
          .catch((error: any) => {
            // Payment failed/cancelled
            console.error('Payment error:', error);
            if (error.code === 0) {
              Alert.alert('Payment Cancelled', 'You cancelled the payment.');
            } else if (error.code === 2) {
              Alert.alert('Payment Failed', error.description || 'Payment verification failed.');
            } else {
              Alert.alert('Payment Error', error.description || 'An error occurred during payment.');
            }
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } catch (error: any) {
      console.error('Razorpay error:', error);
      let errMsg = 'Failed to open payment gateway';
      if (error.message) {
        errMsg = error.message;
      } else if (error.response?.data?.error) {
        errMsg = error.response.data.error;
      }
      setErrorMessage(errMsg);
      Alert.alert('Error', errMsg);
      setLoading(false);
    }
  };

  const calculateRupees = () => {
    const coins = parseInt(coinsAmount);
    if (isNaN(coins)) return '0.00';
    return (coins / 10).toFixed(2);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image source={require('../../assets/coins.png')} style={styles.headerImage} />
          <Text style={styles.headerTitle}>Withdraw Coins</Text>
        </View>
      </View>

      {/* Coin Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <MaterialIcons name="account-balance-wallet" size={32} color={colors.primary} />
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{userCoins} Coins</Text>
            <Text style={styles.balanceRupees}>≈ ₹{(userCoins / 10).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.conversionInfo}>
          <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
          <Text style={styles.conversionText}>10 Coins = ₹1</Text>
        </View>
      </View>

      {/* Withdrawal Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Withdrawal Details</Text>

        {/* Error Message Display */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, errorMessage && !userEmail.trim() ? styles.inputError : null]}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={userEmail}
            onChangeText={(val) => {
              setUserEmail(val);
              setErrorMessage('');
            }}
          />
        </View>

        {/* Coins Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Coins to Withdraw (Min: 100)</Text>
          <TextInput
            style={[styles.input, errorMessage && !coinsAmount.trim() ? styles.inputError : null]}
            placeholder="Enter coins amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={coinsAmount}
            onChangeText={(val) => {
              setCoinsAmount(val);
              setErrorMessage('');
            }}
          />
          {coinsAmount && (
            <Text style={styles.conversionHint}>= ₹{calculateRupees()}</Text>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={styles.paymentInfoText}>
            Click "Pay Now" to open Razorpay payment gateway. You can pay using UPI, Cards, Net Banking, or Wallets.
          </Text>
        </View>

        {/* Pay Now Button */}
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <MaterialIcons name="payment" size={20} color={colors.white} />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.processingNote}>
          * Secure payment powered by Razorpay
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  closeButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerImage: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  balanceCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  balanceAmount: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.xs,
  },
  balanceRupees: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  conversionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  conversionText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  section: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  conversionHint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  paymentInfoText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  processingNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
});
