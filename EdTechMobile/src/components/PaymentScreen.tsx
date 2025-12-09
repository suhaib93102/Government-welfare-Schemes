import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import { theme } from '../styles/theme';

interface PaymentPlan {
  id: string;
  name: string;
  amount: number;
  period: string;
  features: string[];
  savings?: string;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  razorpay_payment_id: string;
}

const PaymentScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [processingPayment, setProcessingPayment] = useState(false);

  const plans: PaymentPlan[] = [
    {
      id: 'premium',
      name: 'Premium Monthly',
      amount: 199,
      period: 'month',
      features: [
        '✓ Unlimited questions',
        '✓ Unlimited quizzes',
        '✓ Unlimited flashcards',
        '✓ Advanced AI features',
      ],
    },
    {
      id: 'premium_annual',
      name: 'Premium Annual',
      amount: 1990,
      period: 'year',
      features: [
        '✓ Unlimited questions',
        '✓ Unlimited quizzes',
        '✓ Unlimited flashcards',
        '✓ Advanced AI features',
        '✓ Priority support',
      ],
      savings: 'Save ₹398 (17% off)',
    },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      loadPaymentHistory();
    }
  }, [isAuthenticated]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const history = await paymentService.getPaymentHistory();
      if (history.success) {
        setPaymentHistory(history.payments);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      Alert.alert('Not Authenticated', 'Please log in to make a payment');
      return;
    }

    if (!selectedPlan) {
      Alert.alert('No Plan Selected', 'Please select a plan first');
      return;
    }

    try {
      setProcessingPayment(true);

      // Process payment through Razorpay
      const result = await paymentService.processPayment(selectedPlan, false);

      if (result.success) {
        Alert.alert(
          'Payment Successful',
          `Your subscription has been upgraded to ${selectedPlan}`,
          [
            {
              text: 'View Receipt',
              onPress: () => loadPaymentHistory(),
            },
            {
              text: 'Continue',
              onPress: () => setActiveTab('history'),
            },
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'An error occurred during payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a refund for this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await paymentService.requestRefund(
                paymentId,
                'User requested refund'
              );

              if (result.success) {
                Alert.alert('Refund Initiated', 'Your refund has been processed');
                loadPaymentHistory();
              } else {
                Alert.alert('Refund Failed', result.error || 'Unable to process refund');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderPlanCard = (plan: PaymentPlan) => (
    <View key={plan.id} style={[styles.planCard, selectedPlan === plan.id && styles.planCardSelected]}>
      <TouchableOpacity
        style={styles.planCardContent}
        onPress={() => setSelectedPlan(plan.id)}
      >
        {/* Plan Name */}
        <Text style={styles.planName}>{plan.name}</Text>

        {/* Savings Badge */}
        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{plan.savings}</Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceSection}>
          <Text style={styles.amount}>₹{plan.amount}</Text>
          <Text style={styles.period}>per {plan.period}</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {plan.features.map((feature, index) => (
            <Text key={index} style={styles.featureItem}>
              {feature}
            </Text>
          ))}
        </View>

        {/* Selection Indicator */}
        <View style={styles.selectionIndicator}>
          <View
            style={[
              styles.radioButton,
              selectedPlan === plan.id && styles.radioButtonSelected,
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentHistoryItem = (item: PaymentHistoryItem) => (
    <View style={styles.historyItem} key={item.id}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyAmount}>₹{item.amount}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.historyItemDetails}>
        <Text style={styles.historyDate}>
          {new Date(item.created_at).toLocaleDateString('en-IN')}
        </Text>
        <Text style={styles.historyId}>ID: {item.razorpay_payment_id.substring(0, 15)}...</Text>
      </View>

      {/* Refund Button */}
      {item.status === 'completed' && (
        <TouchableOpacity
          style={styles.refundButton}
          onPress={() => handleRefund(item.id)}
        >
          <Text style={styles.refundButtonText}>Request Refund</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.notAuthText}>Please log in to view payment options</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <Text style={styles.headerSubtitle}>Choose your plan to unlock premium features</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>
            Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'plans' ? (
        <ScrollView style={styles.plansContainer} showsVerticalScrollIndicator={false}>
          {/* Plans List */}
          {plans.map(renderPlanCard)}

          {/* Payment Button */}
          <TouchableOpacity
            style={[styles.paymentButton, processingPayment && styles.paymentButtonDisabled]}
            onPress={handlePayment}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.paymentButtonText}>Proceed to Payment</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Why Premium?</Text>
            <Text style={styles.infoText}>
              • Unlimited access to all features{'\n'}
              • Advanced AI-powered solutions{'\n'}
              • Priority customer support{'\n'}
              • Ad-free experience
            </Text>
          </View>

          {/* Security Info */}
          <View style={styles.securityBox}>
            <Text style={styles.securityText}>
              🔒 Secure payment powered by Razorpay
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : paymentHistory.length > 0 ? (
            <>
              <Text style={styles.historyTitle}>Your Payments</Text>
              {paymentHistory.map(renderPaymentHistoryItem)}
            </>
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No payments yet</Text>
              <TouchableOpacity
                style={styles.startPaymentButton}
                onPress={() => setActiveTab('plans')}
              >
                <Text style={styles.startPaymentText}>Subscribe Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'pending':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    case 'refunded':
      return '#6b7280';
    default:
      return '#9ca3af';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  tabTextActive: {
    color: theme.colors.primary,
  },

  plansContainer: {
    padding: theme.spacing.lg,
  },

  planCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },

  planCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },

  planCardContent: {
    padding: theme.spacing.lg,
  },

  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  savingsBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },

  savingsText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },

  priceSection: {
    marginBottom: theme.spacing.lg,
  },

  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  period: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  featuresList: {
    marginBottom: theme.spacing.lg,
  },

  featureItem: {
    fontSize: 14,
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
    fontWeight: '500',
  },

  selectionIndicator: {
    alignItems: 'flex-end',
  },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  radioButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },

  paymentButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },

  paymentButtonDisabled: {
    opacity: 0.6,
  },

  paymentButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  infoBox: {
    backgroundColor: `${theme.colors.primary}10`,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  securityBox: {
    backgroundColor: '#f0fdf4',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },

  securityText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },

  historyContainer: {
    padding: theme.spacing.lg,
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },

  historyItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },

  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },

  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },

  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },

  statusText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  historyItemDetails: {
    marginBottom: theme.spacing.md,
  },

  historyDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  historyId: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },

  refundButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },

  refundButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },

  notAuthText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },

  startPaymentButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },

  startPaymentText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;
