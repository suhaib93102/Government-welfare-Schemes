import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface Feature {
  name: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  highlighted: boolean;
  buttonText: string;
  badge?: string;
}

interface ComparisonRow {
  feature: string;
  free: string;
  scholar: string;
  genius: string;
}

export const Pricing: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('scholar');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const isLarge = isWeb && width >= 900;

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/mo',
      description: 'For casual learners',
      highlighted: false,
      buttonText: 'Start for Free',
      features: [
        { name: '5 document uploads/mo', included: true },
        { name: 'Basic AI model (GPT-3.5)', included: true },
        { name: 'Standard flashcards', included: true },
        { name: 'Export to Anki', included: false },
      ],
    },
    {
      id: 'scholar',
      name: 'Scholar',
      price: '$8',
      period: '/mo',
      description: 'For serious students',
      highlighted: true,
      badge: 'MOST POPULAR',
      buttonText: 'Get Scholar',
      features: [
        { name: 'Unlimited uploads', included: true },
        { name: 'Advanced AI (GPT-4)', included: true },
        { name: 'Export to Anki & PDF', included: true },
        { name: 'Ad-free experience', included: true },
      ],
    },
    {
      id: 'genius',
      name: 'Genius',
      price: '$15',
      period: '/mo',
      description: 'For power users & teams',
      highlighted: false,
      buttonText: 'Get Genius',
      features: [
        { name: 'AI Tutor Chat Mode', included: true },
        { name: 'Handwriting recognition (OCR)', included: true },
        { name: 'Team collaboration', included: true },
        { name: 'Priority 24/7 Support', included: true },
      ],
    },
  ];

  const comparisonData: ComparisonRow[] = [
    { feature: 'Document Uploads', free: '5 / month', scholar: 'Unlimited', genius: 'Unlimited' },
    { feature: 'AI Model Quality', free: 'Standard', scholar: 'Advanced (GPT-4)', genius: 'Advanced (GPT-4)' },
    { feature: 'Flashcard Export', free: 'PDF only', scholar: 'Anki, CSV, PDF', genius: 'Anki, CSV, PDF' },
    { feature: 'Study Modes', free: 'Quiz only', scholar: 'Quiz & Flashcards', genius: 'All Modes + Tutor' },
    { feature: 'Max File Size', free: '10 MB', scholar: '50 MB', genius: '200 MB' },
    { feature: 'Support', free: 'Community', scholar: 'Email', genius: '24/7 Priority' },
  ];

  const faqData = [
    {
      question: 'How accurate is the AI quiz generation?',
      answer: 'Our AI achieves over 95% accuracy in generating relevant questions from your study materials.',
    },
    {
      question: 'Does it work with handwritten notes?',
      answer: 'Yes! The Genius plan includes advanced OCR that can read and process handwritten notes.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Absolutely. You can cancel anytime with no cancellation fees.',
    },
    {
      question: 'Is there a student discount?',
      answer: 'Yes! We offer a 20% discount for verified students. Contact support with your student ID.',
    },
  ];

  const animValues = useRef(
    plans.reduce((acc, p) => {
      acc[p.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleHoverIn = (id: string) => {
    Animated.spring(animValues[id], {
      toValue: 1.05,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = (id: string) => {
    Animated.spring(animValues[id], {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleSubscribe = (planId: string) => {
    Alert.alert('Subscription', `You selected the ${plans.find((p) => p.id === planId)?.name} plan!`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
        <Text style={styles.heroTitle}>Unlock your full learning potential</Text>
        <Text style={styles.heroSubtitle}>
          Turn your notes into quizzes instantly. Start generating AI quizzes and flashcards for free, or upgrade for unlimited power.
        </Text>
      </Animated.View>

      {/* Pricing Cards */}
      <View style={styles.cardsWrapper}>
        {isLarge ? (
          <View style={styles.cardsGrid}>
            {plans.map((plan) => (
              <Animated.View
                key={plan.id}
                style={(() => {
                  const transforms: any[] = [{ scale: animValues[plan.id] }];
                  if (plan.highlighted || selectedPlan === plan.id) transforms.push({ translateY: -6 });
                  return [
                    styles.card,
                    (plan.highlighted || selectedPlan === plan.id) && styles.cardSelected,
                    hoveredPlan === plan.id && !(selectedPlan === plan.id) && styles.cardHover,
                    { transform: transforms, opacity: fadeAnim, cursor: isWeb ? 'pointer' : undefined },
                  ];
                })()}
                onTouchStart={() => setSelectedPlan(plan.id)}
                onMouseDown={() => isWeb && setSelectedPlan(plan.id)}
                onMouseEnter={() => {
                  if (isWeb) {
                    setHoveredPlan(plan.id);
                    handleHoverIn(plan.id);
                  }
                }}
                onMouseLeave={() => {
                  if (isWeb) {
                    setHoveredPlan(null);
                    handleHoverOut(plan.id);
                  }
                }}
              >
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>{plan.period}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.cta,
                    (plan.highlighted || selectedPlan === plan.id) && styles.ctaHighlighted,
                  ]}
                  onPress={() => {
                    setSelectedPlan(plan.id);
                    handleSubscribe(plan.id);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.ctaText, (plan.highlighted || selectedPlan === plan.id) && styles.ctaTextHighlighted]}>
                    {plan.buttonText}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.features}>
                  <Text style={styles.includesLabel}>INCLUDES:</Text>
                  {plan.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <MaterialIcons
                        name={feat.included ? 'check-circle' : 'cancel'}
                        size={18}
                        color={feat.included ? colors.primary : '#D1D5DB'}
                      />
                      <Text style={[styles.featureText, !feat.included && styles.featureDisabled]}>
                        {feat.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            snapToInterval={isWeb ? 360 : width * 0.85}
            decelerationRate="fast"
          >
            {plans.map((plan) => (
              <Animated.View
                key={plan.id}
                style={(() => {
                  const transforms: any[] = [{ scale: animValues[plan.id] }];
                  if (plan.highlighted || selectedPlan === plan.id) transforms.push({ translateY: -6 });
                  return [
                    styles.card,
                    (plan.highlighted || selectedPlan === plan.id) && styles.cardHighlighted,
                    hoveredPlan === plan.id && ! (selectedPlan === plan.id) && styles.cardHover,
                    { transform: transforms, opacity: fadeAnim, cursor: isWeb ? 'pointer' : undefined },
                  ];
                })()}
                onTouchStart={() => setSelectedPlan(plan.id)}
                onMouseDown={() => isWeb && setSelectedPlan(plan.id)}
                onMouseEnter={() => {
                  if (isWeb) {
                    setHoveredPlan(plan.id);
                    handleHoverIn(plan.id);
                  }
                }}
                onMouseLeave={() => {
                  if (isWeb) {
                    setHoveredPlan(null);
                    handleHoverOut(plan.id);
                  }
                }}
              >
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>{plan.period}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.cta,
                    (plan.highlighted || selectedPlan === plan.id) && styles.ctaHighlighted,
                  ]}
                  onPress={() => {
                    setSelectedPlan(plan.id);
                    handleSubscribe(plan.id);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.ctaText, (plan.highlighted || selectedPlan === plan.id) && styles.ctaTextHighlighted]}>
                    {plan.buttonText}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.features}>
                  <Text style={styles.includesLabel}>INCLUDES:</Text>
                  {plan.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <MaterialIcons
                        name={feat.included ? 'check-circle' : 'cancel'}
                        size={18}
                        color={feat.included ? colors.primary : '#D1D5DB'}
                      />
                      <Text style={[styles.featureText, !feat.included && styles.featureDisabled]}>
                        {feat.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Privacy Note */}
      <View style={styles.privacyNote}>
        <MaterialIcons name="lock" size={16} color="#6B7280" />
        <Text style={styles.privacyText}>
          Your documents are private and secure. We do not use your data to train our models.
        </Text>
      </View>

      {/* Comparison Table */}
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonTitle}>Compare features in detail</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableHeader, styles.tableCellFirst]}>Feature</Text>
            <Text style={[styles.tableCell, styles.tableHeader]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableHeader, styles.tableHighlight]}>Scholar</Text>
            <Text style={[styles.tableCell, styles.tableHeader]}>Genius</Text>
          </View>

          {/* Rows */}
          {comparisonData.map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableCellFirst, styles.tableCellBold]}>{row.feature}</Text>
              <Text style={styles.tableCell}>{row.free}</Text>
              <Text style={[styles.tableCell, styles.tableDataHighlight]}>{row.scholar}</Text>
              <Text style={styles.tableCell}>{row.genius}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        {faqData.map((faq, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.faqItem}
            onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <MaterialIcons
                name={expandedFaq === idx ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color="#111827"
              />
            </View>
            {expandedFaq === idx && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA Banner */}
      <View style={styles.ctaBanner}>
        <Text style={styles.ctaBannerTitle}>Ready to ace your exams?</Text>
        <Text style={styles.ctaBannerSubtitle}>
          Join over 10,000 students who are studying smarter, not harder.
        </Text>
        {/* Buttons removed per request */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 600,
  },
  cardsWrapper: {
    marginVertical: 40,
  },
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 20,
    flexDirection: isWeb ? 'row' : 'row',
    justifyContent: isWeb ? 'space-between' : 'flex-start',
    alignItems: 'stretch',
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    gap: 20,
  },
  // Make cards stretch and occupy available width on large screens
  card: {
    flex: isWeb ? 1 : undefined,
    maxWidth: isWeb ? 420 : undefined,
    // width handled by flex/maxWidth for full-width layout
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHighlighted: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFC',
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  cardHover: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
    shadowColor: '#93C5FD',
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFC',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    transform: [{ translateY: -6 } as any],
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -55 }],
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeader: {
    marginBottom: 20,
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
  },
  period: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaHighlighted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  ctaTextHighlighted: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  features: {
    gap: 10,
  },
  includesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  featureDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    borderRadius: 8,
    marginBottom: 40,
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  comparisonSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  comparisonTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  tableCellFirst: {
    textAlign: 'left',
  },
  tableHeader: {
    fontWeight: '700',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 2,
  },
  tableHighlight: {
    backgroundColor: '#EEF2FF',
    color: colors.primary,
  },
  tableDataHighlight: {
    backgroundColor: '#F0F9FF',
    fontWeight: '600',
    color: colors.primary,
  },
  tableCellBold: {
    fontWeight: '600',
  },
  faqSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  faqTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  ctaBanner: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  ctaBannerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaBannerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 32,
  },
  ctaBannerButtons: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
    width: '100%',
    maxWidth: 500,
  },
  ctaBannerBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBannerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  ctaBannerBtnSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBannerBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
