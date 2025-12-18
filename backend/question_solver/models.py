from django.db import models
from django.utils import timezone
import uuid
from datetime import timedelta


class UserSubscription(models.Model):
    """Track user subscription status and feature limits"""
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, unique=True)  # Can be device ID or user email
    plan = models.CharField(max_length=50, choices=PLAN_CHOICES, default='free')
    
    # Feature usage tracking
    ask_questions_used = models.IntegerField(default=0)  # Monthly usage
    quiz_generated = models.IntegerField(default=0)  # Monthly usage
    flashcards_generated = models.IntegerField(default=0)  # Monthly usage
    
    # Auto-pay settings
    auto_pay_enabled = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, blank=True)  # 'card', 'upi', 'wallet'
    
    # Billing dates
    subscription_start_date = models.DateTimeField(auto_now_add=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    last_payment_date = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    usage_reset_date = models.DateTimeField(null=True, blank=True)  # Monthly reset date
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['plan']),
        ]
    
    def __str__(self):
        return f"{self.user_id} - {self.plan.upper()} Plan"
    
    def get_feature_limits(self):
        """Get feature limits based on plan"""
        if self.plan == 'free':
            return {
                'ask_questions': {'limit': 3, 'used': self.ask_questions_used},
                'quiz': {'limit': 3, 'used': self.quiz_generated},
                'flashcards': {'limit': 3, 'used': self.flashcards_generated},
            }
        elif self.plan == 'premium':
            return {
                'ask_questions': {'limit': None, 'used': self.ask_questions_used},  # Unlimited
                'quiz': {'limit': None, 'used': self.quiz_generated},  # Unlimited
                'flashcards': {'limit': None, 'used': self.flashcards_generated},  # Unlimited
            }
    
    def can_use_feature(self, feature_name):
        """Check if user can use a feature"""
        limits = self.get_feature_limits()
        if feature_name not in limits:
            return True
        
        feature = limits[feature_name]
        if feature['limit'] is None:
            return True  # Unlimited
        
        return feature['used'] < feature['limit']
    
    def increment_feature_usage(self, feature_name):
        """Increment feature usage"""
        if feature_name == 'ask_questions':
            self.ask_questions_used += 1
        elif feature_name == 'quiz':
            self.quiz_generated += 1
        elif feature_name == 'flashcards':
            self.flashcards_generated += 1
        self.save()
    
    def reset_monthly_usage(self):
        """Reset monthly usage counters"""
        self.ask_questions_used = 0
        self.quiz_generated = 0
        self.flashcards_generated = 0
        self.usage_reset_date = timezone.now()
        self.save()


class Payment(models.Model):
    """Track payment transactions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(UserSubscription, on_delete=models.CASCADE, related_name='payments')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # 1.99 for premium
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=255, unique=True)
    
    # Razorpay specific fields
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    
    billing_cycle_start = models.DateTimeField()
    billing_cycle_end = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Payment {self.transaction_id} - {self.status.upper()} (₹{self.amount})"


class FeatureUsageLog(models.Model):
    """Detailed log of feature usage"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(UserSubscription, on_delete=models.CASCADE, related_name='usage_logs')
    
    feature_name = models.CharField(max_length=50)  # 'ask_questions', 'quiz', 'flashcards'
    usage_type = models.CharField(max_length=20)  # 'image', 'text', 'file'
    input_size = models.IntegerField(help_text="Size in characters or bytes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', '-created_at']),
            models.Index(fields=['feature_name']),
        ]
    
    def __str__(self):
        return f"{self.subscription.user_id} - {self.feature_name} ({self.created_at.date()})"


class Quiz(models.Model):
    """Store quiz sessions with metadata"""
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_type = models.CharField(max_length=50, choices=[
        ('youtube', 'YouTube'),
        ('text', 'Text'),
        ('image', 'Image'),
    ])
    source_id = models.CharField(max_length=255, blank=True)  # video_id or transcript_id
    summary = models.TextField()
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='intermediate')
    total_questions = models.IntegerField(default=5)
    estimated_time = models.IntegerField(help_text="Estimated time in minutes")
    keywords = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.total_questions} questions)"


class QuizQuestion(models.Model):
    """Store individual quiz questions"""
    QUESTION_TYPE_CHOICES = [
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('essay', 'Essay'),
        ('matching', 'Matching'),
    ]
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)
    order = models.IntegerField()
    
    # For MCQ and True/False
    options = models.JSONField(default=list, blank=True)  # List of option dicts: [{"text": "...", "is_correct": bool}]
    correct_answer = models.CharField(max_length=500, blank=True)  # For short answer/essay
    
    # Explanation
    explanation = models.TextField(blank=True)
    hint = models.TextField(blank=True)
    
    # Difficulty at question level
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='intermediate')
    tags = models.JSONField(default=list, blank=True)  # Related topics/concepts
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['quiz', 'order']
        unique_together = ['quiz', 'order']
    
    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."


class UserQuizResponse(models.Model):
    """Track user responses and scores"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='user_responses')
    session_id = models.CharField(max_length=255, default='anonymous')
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken = models.IntegerField(null=True, blank=True, help_text="Time taken in seconds")
    
    # Responses
    responses = models.JSONField(default=dict)  # {question_id: {"user_answer": "...", "is_correct": bool, "time_spent": seconds}}
    
    # Scoring
    score = models.FloatField(null=True, blank=True)  # Percentage
    correct_answers = models.IntegerField(default=0)
    total_answers = models.IntegerField(default=0)
    
    # Feedback
    feedback = models.TextField(blank=True)
    strengths = models.JSONField(default=list)  # Topics user performed well on
    weaknesses = models.JSONField(default=list)  # Topics needing improvement
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.session_id} - {self.quiz.title} ({self.score}%)"


class QuizSummary(models.Model):
    """Store quiz performance summaries"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='summaries')
    session_id = models.CharField(max_length=255, default='anonymous')
    
    # Overall stats
    attempts = models.IntegerField(default=0)
    best_score = models.FloatField(null=True, blank=True)
    average_score = models.FloatField(null=True, blank=True)
    
    # Performance analysis
    analysis = models.JSONField(default=dict)  # {
                                                 #   "overall_feedback": "...",
                                                 #   "topic_performance": {"topic": "score"},
                                                 #   "recommendations": ["..."],
                                                 #   "next_topics": ["..."]
                                                 # }
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Summary: {self.quiz.title} - Best: {self.best_score}%"


class UserCoins(models.Model):
    """Track user coins earned from Daily Quizzes and other activities"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, unique=True, db_index=True)
    total_coins = models.IntegerField(default=0)
    lifetime_coins = models.IntegerField(default=0)  # Total ever earned
    coins_spent = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-total_coins']
        verbose_name_plural = "User Coins"
    
    def __str__(self):
        return f"{self.user_id} - {self.total_coins} coins"
    
    def add_coins(self, amount, reason=""):
        """Add coins to user account"""
        self.total_coins += amount
        self.lifetime_coins += amount
        self.save()
        
        # Log the transaction
        CoinTransaction.objects.create(
            user_coins=self,
            amount=amount,
            transaction_type='earn',
            reason=reason
        )
    
    def spend_coins(self, amount, reason=""):
        """Spend coins from user account"""
        if self.total_coins >= amount:
            self.total_coins -= amount
            self.coins_spent += amount
            self.save()
            
            # Log the transaction
            CoinTransaction.objects.create(
                user_coins=self,
                amount=amount,
                transaction_type='spend',
                reason=reason
            )
            return True
        return False


class CoinTransaction(models.Model):
    """Log all coin transactions"""
    TRANSACTION_TYPES = [
        ('earn', 'Earned'),
        ('spend', 'Spent'),
        ('bonus', 'Bonus'),
        ('refund', 'Refund'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_coins = models.ForeignKey(UserCoins, on_delete=models.CASCADE, related_name='transactions')
    amount = models.IntegerField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user_coins.user_id} - {self.transaction_type} {self.amount} coins"


class DailyQuiz(models.Model):
    """Daily GK quiz - one per day"""
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('mixed', 'Mixed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='mixed')
    total_questions = models.IntegerField(default=10)
    coins_per_correct = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name_plural = "Daily Quizzes"
    
    def __str__(self):
        return f"Daily Quiz - {self.date} ({self.total_questions} questions)"
    
    @property
    def max_coins(self):
        """Maximum coins that can be earned from this quiz"""
        return self.total_questions * self.coins_per_correct


class DailyQuestion(models.Model):
    """Individual questions for Daily Quiz"""
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
    ]
    
    CATEGORY_CHOICES = [
        ('general', 'General Knowledge'),
        ('current_events', 'Current Events'),
        ('science', 'Science'),
        ('history', 'History'),
        ('geography', 'Geography'),
        ('sports', 'Sports'),
        ('entertainment', 'Entertainment'),
        ('technology', 'Technology'),
        ('politics', 'Politics'),
        ('economics', 'Economics'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_quiz = models.ForeignKey(DailyQuiz, on_delete=models.CASCADE, related_name='questions')
    order = models.IntegerField()
    
    question_text = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='easy')
    
    # MCQ options (stored as JSON)
    options = models.JSONField(default=list)  # [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, ...]
    correct_answer = models.CharField(max_length=10)  # "A", "B", "C", or "D"
    
    explanation = models.TextField(blank=True)
    fun_fact = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['daily_quiz', 'order']
        unique_together = ['daily_quiz', 'order']
    
    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."


class UserDailyQuizAttempt(models.Model):
    """Track user attempts on Daily Quizzes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_quiz = models.ForeignKey(DailyQuiz, on_delete=models.CASCADE, related_name='attempts')
    user_id = models.CharField(max_length=255, db_index=True)
    
    # Results
    answers = models.JSONField(default=dict)  # {question_id: "A", ...}
    correct_count = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=10)
    score_percentage = models.FloatField(default=0.0)
    
    # Coins
    coins_earned = models.IntegerField(default=0)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ['daily_quiz', 'user_id']  # One attempt per user per day
        indexes = [
            models.Index(fields=['user_id', '-started_at']),
        ]
    
    def __str__(self):
        return f"{self.user_id} - {self.daily_quiz.date} - {self.correct_count}/{self.total_questions} ({self.coins_earned} coins)"
