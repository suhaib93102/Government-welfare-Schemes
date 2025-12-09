import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

interface LandingPageDashboardProps {
  onNavigateToFeature: (feature: string) => void;
  onNavigateToPricing: () => void;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
}

const FEATURES: Feature[] = [
  {
    id: 'ask-question',
    title: 'Ask Question',
    description: 'Get instant answers with AI-powered solutions',
    icon: 'help-outline',
    color: '#FF6B6B',
  },
  {
    id: 'predicted-questions',
    title: 'Predicted Questions',
    description: 'Practice with AI-generated exam questions',
    icon: 'psychology',
    color: '#4ECDC4',
  },
  {
    id: 'quiz',
    title: 'Smart Quiz',
    description: 'Interactive quizzes with detailed explanations',
    icon: 'quiz',
    color: '#FFD93D',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Learn efficiently with spaced repetition',
    icon: 'style',
    color: '#95E1D3',
  },
  {
    id: 'youtube-summarizer',
    title: 'Video Summarizer',
    description: 'Get summaries and quizzes from YouTube videos',
    icon: 'video-library',
    color: '#F38181',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Aarav Kumar',
    role: 'Class 12 Student',
    comment: 'This app helped me improve my scores by 20% in just 2 months!',
    rating: 5,
  },
  {
    id: '2',
    name: 'Priya Singh',
    role: 'University Student',
    comment: 'The AI answers are so detailed and helpful. Highly recommended!',
    rating: 5,
  },
  {
    id: '3',
    name: 'Rohan Patel',
    role: 'Competitive Exam Aspirant',
    comment: 'Best study companion ever. The predicted questions are amazing!',
    rating: 5,
  },
];

const STATS = [
  { label: 'Active Students', value: '50K+' },
  { label: 'Questions Answered', value: '1M+' },
  { label: 'Success Rate', value: '94%' },
  { label: 'Available Languages', value: '8' },
];

export const LandingPageDashboard: React.FC<LandingPageDashboardProps> = ({
  onNavigateToFeature,
  onNavigateToPricing,
}) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const renderFeatureCard = (feature: Feature) => (
    <TouchableOpacity
      key={feature.id}
      style={styles.featureCard}
      onPress={() => onNavigateToFeature(feature.id)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.featureIcon,
          { backgroundColor: feature.color + '20' },
        ]}
      >
        <MaterialIcons name={feature.icon} size={32} color={feature.color} />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
      <View style={styles.featureArrow}>
        <MaterialIcons name="arrow-forward" size={20} color={feature.color} />
      </View>
    </TouchableOpacity>
  );

  const renderTestimonial = (testimonial: Testimonial) => (
    <View key={testimonial.id} style={styles.testimonialCard}>
      <View style={styles.testimonialHeader}>
        <View>
          <Text style={styles.testimonialName}>{testimonial.name}</Text>
          <Text style={styles.testimonialRole}>{testimonial.role}</Text>
        </View>
        <View style={styles.ratingContainer}>
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <MaterialIcons
              key={i}
              name="star"
              size={16}
              color="#FFD93D"
              style={{ marginRight: 2 }}
            />
          ))}
        </View>
      </View>
      <Text style={styles.testimonialComment}>{testimonial.comment}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTag}>Your AI Study Partner</Text>
          <Text style={styles.heroTitle}>Master Any Subject with AI-Powered Learning</Text>
          <Text style={styles.heroSubtitle}>
            Get instant answers, ace exams, and learn smarter with our revolutionary AI study platform
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.primaryButton}>
            <MaterialIcons name="play-arrow" size={24} color={colors.white} />
            <Text style={styles.primaryButtonText}>Get Started Free</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNavigateToPricing}
          >
            <MaterialIcons name="local-offer" size={24} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>View Pricing</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustIndicators}>
          <View style={styles.trustItem}>
            <MaterialIcons name="verified" size={20} color={colors.success} />
            <Text style={styles.trustText}>Secure & Private</Text>
          </View>
          <View style={styles.trustItem}>
            <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
            <Text style={styles.trustText}>AI-Powered</Text>
          </View>
          <View style={styles.trustItem}>
            <MaterialIcons name="trending-up" size={20} color={colors.success} />
            <Text style={styles.trustText}>Proven Results</Text>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Trusted by Students Worldwide</Text>
        <View style={styles.statsGrid}>
          {STATS.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Powerful Features</Text>
        <Text style={styles.sectionSubtitle}>
          Everything you need to excel in your studies
        </Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((feature) => renderFeatureCard(feature))}
        </View>
      </View>

      {/* How It Works Section */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsContainer}>
          {[
            {
              number: '1',
              title: 'Upload or Ask',
              description: 'Upload images or type your questions',
              icon: 'upload-file',
            },
            {
              number: '2',
              title: 'AI Processes',
              description: 'Our AI analyzes and finds the best solution',
              icon: 'auto-awesome',
            },
            {
              number: '3',
              title: 'Learn & Practice',
              description: 'Get detailed answers and practice questions',
              icon: 'school',
            },
            {
              number: '4',
              title: 'Track Progress',
              description: 'Monitor your improvement over time',
              icon: 'trending-up',
            },
          ].map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.number}</Text>
              </View>
              <View style={styles.stepContent}>
                <MaterialIcons name={step.icon as any} size={28} color={colors.primary} />
                <View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Testimonials Section */}
      <View style={styles.testimonialsSection}>
        <Text style={styles.sectionTitle}>What Students Say</Text>
        <View>
          {TESTIMONIALS.map((testimonial) => renderTestimonial(testimonial))}
        </View>
      </View>

      {/* Pricing Preview */}
      <View style={styles.pricingPreviewSection}>
        <Text style={styles.sectionTitle}>Simple & Transparent Pricing</Text>
        <View style={styles.pricingPreviewContainer}>
          {/* Free Tier */}
          <View style={styles.pricingCard}>
            <Text style={styles.pricingBadge}>Free</Text>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingPrice}>Free</Text>
              <Text style={styles.pricingPeriod}>Forever</Text>
            </View>
            <View style={styles.pricingFeatures}>
              {['3 Questions/month', '3 Quizzes/month', '3 Flashcards/month', 'Basic Support'].map(
                (feature, i) => (
                  <View key={i} style={styles.pricingFeature}>
                    <MaterialIcons name="check-circle" size={20} color={colors.success} />
                    <Text style={styles.pricingFeatureText}>{feature}</Text>
                  </View>
                )
              )}
            </View>
            <TouchableOpacity style={styles.pricingButtonSecondary}>
              <Text style={styles.pricingButtonSecondaryText}>Get Started</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Tier */}
          <View style={[styles.pricingCard, styles.pricingCardPremium]}>
            <View style={styles.premiumBadge}>
              <MaterialIcons name="star" size={16} color={colors.white} />
              <Text style={styles.premiumBadgeText}>Most Popular</Text>
            </View>
            <View style={styles.pricingHeader}>
              <View style={styles.pricingPriceContainer}>
                <Text style={styles.pricingPricePremium}>₹1.99</Text>
                <Text style={styles.pricingPeriodPremium}>/month</Text>
              </View>
            </View>
            <View style={styles.pricingFeatures}>
              {[
                'Unlimited Questions',
                'Unlimited Quizzes',
                'Unlimited Flashcards',
                'Video Summarizer',
                'Priority Support',
                'Auto-Pay Monthly',
              ].map((feature, i) => (
                <View key={i} style={styles.pricingFeature}>
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  <Text style={styles.pricingFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.pricingButtonPrimary}
              onPress={onNavigateToPricing}
            >
              <Text style={styles.pricingButtonPrimaryText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          {[
            {
              id: '1',
              question: 'Is there really a free plan?',
              answer: 'Yes! The free plan includes 3 uses per feature per month. No credit card required.',
            },
            {
              id: '2',
              question: 'Can I cancel Premium anytime?',
              answer: 'Absolutely! You can cancel auto-pay anytime from your subscription settings.',
            },
            {
              id: '3',
              question: 'How accurate is the AI?',
              answer: 'Our AI is trained on millions of educational resources and has 94% accuracy rate.',
            },
            {
              id: '4',
              question: 'Is my data secure?',
              answer: 'Yes, we use bank-level encryption and never sell your data. Your privacy is our priority.',
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.faqItem}
              onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
            >
              <View style={styles.faqQuestion}>
                <MaterialIcons
                  name={expandedFAQ === item.id ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.faqQuestionText}>{item.question}</Text>
              </View>
              {expandedFAQ === item.id && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Final CTA Section */}
      <View style={styles.finalCtaSection}>
        <Text style={styles.finalCtaTitle}>Ready to Transform Your Learning?</Text>
        <Text style={styles.finalCtaSubtitle}>
          Join thousands of students already using EdTech Solver
        </Text>
        <TouchableOpacity style={styles.finalCtaButton}>
          <Text style={styles.finalCtaButtonText}>Start Your Free Trial</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.finalCtaFooter}>No credit card required • Cancel anytime</Text>
      </View>

      {/* Footer */}
      <View style={styles.footerSection}>
        <View style={styles.footerContent}>
          <Text style={styles.footerTitle}>EdTech Solver</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.copyright}>© 2024 EdTech Solver. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Hero Section */
  heroSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    marginBottom: spacing.xl,
  },
  heroTag: {
    ...typography.small,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.h1,
    fontWeight: '700',
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
  ctaContainer: {
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  trustIndicators: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },

  /* Stats Section */
  statsSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* Features Section */
  featuresSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  featuresGrid: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.sm,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    ...typography.h4,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  featureDescription: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  featureArrow: {
    alignItems: 'flex-start',
  },

  /* How It Works Section */
  howItWorksSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.blue50,
  },
  stepsContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  stepCard: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.white,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  stepTitle: {
    ...typography.h4,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  stepDescription: {
    ...typography.small,
    color: colors.textMuted,
  },

  /* Testimonials Section */
  testimonialsSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  testimonialCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD93D',
    ...shadows.sm,
  },
  testimonialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  testimonialName: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  testimonialRole: {
    ...typography.small,
    color: colors.textMuted,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  testimonialComment: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  /* Pricing Preview Section */
  pricingPreviewSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  pricingPreviewContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  pricingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pricingCardPremium: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  pricingBadge: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  premiumBadgeText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.white,
  },
  pricingHeader: {
    marginBottom: spacing.lg,
  },
  pricingPrice: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  pricingPricePremium: {
    ...typography.h1,
    fontWeight: '700',
    color: colors.primary,
  },
  pricingPeriod: {
    ...typography.small,
    color: colors.textMuted,
  },
  pricingPeriodPremium: {
    ...typography.body,
    color: colors.textMuted,
  },
  pricingFeatures: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pricingFeatureText: {
    ...typography.body,
    color: colors.text,
  },
  pricingButtonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pricingButtonPrimaryText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  pricingButtonSecondary: {
    backgroundColor: colors.blue50,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pricingButtonSecondaryText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },

  /* FAQ Section */
  faqSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.blue50,
  },
  faqContainer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  faqItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqQuestionText: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  faqAnswer: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  /* Final CTA Section */
  finalCtaSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  finalCtaTitle: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  finalCtaSubtitle: {
    ...typography.body,
    color: colors.white + '90',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  finalCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  finalCtaButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  finalCtaFooter: {
    ...typography.small,
    color: colors.white + '80',
  },

  /* Footer Section */
  footerSection: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.black,
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.md,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  footerLink: {
    ...typography.small,
    color: colors.textMuted,
  },
  copyright: {
    ...typography.small,
    color: colors.textMuted,
  },
});
