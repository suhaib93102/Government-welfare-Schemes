from django.contrib import admin
from . import models
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
import json


@admin.register(models.SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
	list_display = (
		'display_name', 'name', 'first_month_price', 'recurring_price', 'currency', 'is_active'
	)
	list_filter = ('is_active', 'name')
	search_fields = ('display_name', 'description')
	readonly_fields = ('created_at', 'updated_at')
	fieldsets = (
		('Basic Information', {
			'fields': ('name', 'display_name', 'description', 'is_active')
		}),
		('Pricing', {
			'fields': ('first_month_price', 'recurring_price', 'currency')
		}),
		('Feature Limits', {
			'fields': (
				'mock_test_limit', 'quiz_limit', 'pair_quiz_limit', 'flashcards_limit',
				'ask_question_limit', 'predicted_questions_limit', 'previous_papers_limit',
				'pyq_features_limit', 'youtube_summarizer_limit', 'daily_quiz_limit'
			),
			'description': 'Leave blank or null for unlimited access'
		}),
		('Timestamps', {
			'fields': ('created_at', 'updated_at')
		}),
	)


class PaymentInline(admin.TabularInline):
	model = models.Payment
	extra = 0
	readonly_fields = ('transaction_id', 'amount', 'currency', 'status', 'payment_method', 'created_at')


@admin.action(description='Reset monthly usage for selected subscriptions')
def reset_monthly_usage(modeladmin, request, queryset):
	for subscription in queryset:
		subscription.reset_monthly_usage()


@admin.register(models.UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
	list_display = (
		'user_id', 'plan', 'mock_test_used', 'quiz_used', 'flashcards_used',
		'subscription_status', 'subscription_start_date', 'subscription_end_date',
	)
	list_filter = ('plan', 'subscription_status')
	search_fields = ('user_id', 'razorpay_customer_id', 'razorpay_subscription_id')
	inlines = [PaymentInline]
	actions = [reset_monthly_usage]
	readonly_fields = ('created_at', 'updated_at', 'subscription_start_date', 'next_billing_date', 'razorpay_customer_id', 'razorpay_subscription_id')


@admin.register(models.Payment)
class PaymentAdmin(admin.ModelAdmin):
	list_display = ('transaction_id', 'subscription', 'amount', 'currency', 'status', 'payment_method', 'created_at')
	list_filter = ('status', 'payment_method')
	search_fields = ('transaction_id', 'subscription__user_id', 'razorpay_order_id', 'razorpay_payment_id')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(models.FeatureUsageLog)
class FeatureUsageLogAdmin(admin.ModelAdmin):
	list_display = ('subscription', 'feature_name', 'usage_type', 'input_size', 'created_at')
	list_filter = ('feature_name', 'usage_type')
	search_fields = ('subscription__user_id',)
	readonly_fields = ('created_at',)


class QuizQuestionInline(admin.TabularInline):
	model = models.QuizQuestion
	extra = 0
	fields = ('order', 'question_type', 'question_text', 'difficulty', 'created_at')
	readonly_fields = ('created_at',)


@admin.register(models.Quiz)
class QuizAdmin(admin.ModelAdmin):
	list_display = ('title', 'source_type', 'difficulty_level', 'total_questions', 'estimated_time', 'created_at')
	search_fields = ('title', 'keywords')
	list_filter = ('source_type', 'difficulty_level')
	inlines = [QuizQuestionInline]
	readonly_fields = ('created_at', 'updated_at')


@admin.register(models.QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
	list_display = ('quiz', 'order', 'question_type', 'difficulty', 'created_at')
	list_filter = ('question_type', 'difficulty')
	search_fields = ('question_text', 'quiz__title')
	readonly_fields = ('created_at',)


@admin.register(models.UserQuizResponse)
class UserQuizResponseAdmin(admin.ModelAdmin):
	list_display = ('session_id', 'quiz', 'score', 'correct_answers', 'total_answers', 'started_at', 'completed_at')
	list_filter = ('quiz',)
	search_fields = ('session_id', 'quiz__title')
	readonly_fields = ('started_at', 'completed_at')


@admin.register(models.QuizSummary)
class QuizSummaryAdmin(admin.ModelAdmin):
	list_display = ('quiz', 'attempts', 'best_score', 'average_score', 'created_at')
	search_fields = ('quiz__title',)
	readonly_fields = ('created_at', 'updated_at')


# Re-register User with a slightly enhanced view in admin so admins can easily search by email
try:
	admin.site.unregister(User)
except Exception:
	pass


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email')


# Daily Quiz Admin

class CoinTransactionInline(admin.TabularInline):
    model = models.CoinTransaction
    extra = 0
    readonly_fields = ('amount', 'transaction_type', 'reason', 'created_at')
    can_delete = False


@admin.register(models.UserCoins)
class UserCoinsAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'total_coins', 'lifetime_coins', 'coins_spent', 'updated_at')
    search_fields = ('user_id',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CoinTransactionInline]


@admin.register(models.CoinTransaction)
class CoinTransactionAdmin(admin.ModelAdmin):
    list_display = ('user_coins', 'amount', 'transaction_type', 'reason', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('user_coins__user_id', 'reason')
    readonly_fields = ('created_at',)


class DailyQuestionInline(admin.TabularInline):
    model = models.DailyQuestion
    extra = 0
    fields = ('order', 'question_text', 'category', 'difficulty', 'correct_answer')
    ordering = ['order']
    can_delete = True


@admin.register(models.DailyQuiz)
class DailyQuizAdmin(admin.ModelAdmin):
    list_display = ('date', 'title', 'difficulty', 'total_questions', 'coins_per_correct', 'max_coins_display', 'is_active', 'created_at')
    list_filter = ('difficulty', 'is_active', 'date')
    search_fields = ('title', 'description')
    date_hierarchy = 'date'
    inlines = [DailyQuestionInline]
    readonly_fields = ('created_at', 'updated_at')
    list_editable = ('is_active',)
    
    fieldsets = (
        ('Quiz Info', {
            'fields': ('date', 'title', 'description', 'difficulty')
        }),
        ('Configuration', {
            'fields': ('total_questions', 'coins_per_correct', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def max_coins_display(self, obj):
        return obj.max_coins
    max_coins_display.short_description = 'Max Coins'


@admin.register(models.DailyQuestion)
class DailyQuestionAdmin(admin.ModelAdmin):
    list_display = ('question_preview', 'daily_quiz', 'order', 'category', 'difficulty', 'correct_answer', 'created_at')
    list_filter = ('category', 'difficulty', 'daily_quiz__date')
    search_fields = ('question_text', 'daily_quiz__title')
    readonly_fields = ('created_at',)
    list_per_page = 50
    
    fieldsets = (
        ('Question Details', {
            'fields': ('daily_quiz', 'order', 'question_text')
        }),
        ('Options & Answer', {
            'fields': ('options', 'correct_answer')
        }),
        ('Metadata', {
            'fields': ('category', 'difficulty', 'explanation', 'fun_fact')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def question_preview(self, obj):
        return obj.question_text[:80] + '...' if len(obj.question_text) > 80 else obj.question_text
    question_preview.short_description = 'Question'


@admin.register(models.UserDailyQuizAttempt)
class UserDailyQuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'daily_quiz', 'correct_count', 'total_questions', 'score_percentage', 'coins_earned', 'completed_at')
    list_filter = ('daily_quiz__date', 'completed_at')
    search_fields = ('user_id', 'daily_quiz__title')
    readonly_fields = ('started_at', 'completed_at')
    date_hierarchy = 'started_at'


# Pair Quiz Admin

@admin.register(models.PairQuizSession)
class PairQuizSessionAdmin(admin.ModelAdmin):
    list_display = (
        'session_code', 
        'status_badge', 
        'host_user_short', 
        'partner_user_short', 
        'total_questions',
        'host_score',
        'partner_score',
        'created_at',
        'time_elapsed'
    )
    list_filter = ('status', 'created_at')
    search_fields = ('session_code', 'host_user_id', 'partner_user_id')
    readonly_fields = (
        'id', 
        'session_code', 
        'created_at', 
        'started_at', 
        'completed_at',
        'expires_at',
        'time_elapsed_display',
        'questions_display',
        'host_answers_display',
        'partner_answers_display',
        'quiz_config_display'
    )
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Session Info', {
            'fields': ('id', 'session_code', 'status', 'quiz_config_display')
        }),
        ('Participants', {
            'fields': ('host_user_id', 'partner_user_id')
        }),
        ('Quiz Progress', {
            'fields': ('current_question_index', 'questions_display')
        }),
        ('Answers & Scores', {
            'fields': (
                'host_answers_display', 
                'partner_answers_display',
                'host_score',
                'partner_score',
                'host_time_taken',
                'partner_time_taken'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'completed_at', 'expires_at', 'time_elapsed_display')
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'waiting': '#FFA500',
            'active': '#4CAF50',
            'completed': '#2196F3',
            'cancelled': '#F44336'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#999'),
            obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def host_user_short(self, obj):
        return obj.host_user_id[:20] + '...' if len(obj.host_user_id) > 20 else obj.host_user_id
    host_user_short.short_description = 'Host'
    
    def partner_user_short(self, obj):
        if obj.partner_user_id:
            return obj.partner_user_id[:20] + '...' if len(obj.partner_user_id) > 20 else obj.partner_user_id
        return '-'
    partner_user_short.short_description = 'Partner'
    
    def total_questions(self, obj):
        return len(obj.questions) if obj.questions else 0
    total_questions.short_description = 'Questions'
    
    def time_elapsed(self, obj):
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            minutes = delta.total_seconds() / 60
            return f"{minutes:.1f}m"
        return '-'
    time_elapsed.short_description = 'Duration'
    
    def time_elapsed_display(self, obj):
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            return f"{delta.total_seconds():.0f} seconds"
        return 'Not completed'
    time_elapsed_display.short_description = 'Time Elapsed'
    
    def questions_display(self, obj):
        if not obj.questions:
            return 'No questions'
        html = '<div style="max-height: 300px; overflow-y: auto;">'
        for idx, q in enumerate(obj.questions, 1):
            html += f'<p><strong>Q{idx}:</strong> {q.get("question", "N/A")[:100]}...</p>'
        html += '</div>'
        return mark_safe(html)
    questions_display.short_description = 'Questions Preview'
    
    def host_answers_display(self, obj):
        if not obj.host_answers:
            return 'No answers'
        return mark_safe('<pre>' + json.dumps(obj.host_answers, indent=2) + '</pre>')
    host_answers_display.short_description = 'Host Answers'
    
    def partner_answers_display(self, obj):
        if not obj.partner_answers:
            return 'No answers'
        return mark_safe('<pre>' + json.dumps(obj.partner_answers, indent=2) + '</pre>')
    partner_answers_display.short_description = 'Partner Answers'
    
    def quiz_config_display(self, obj):
        if not obj.quiz_config:
            return 'No config'
        return mark_safe('<pre>' + json.dumps(obj.quiz_config, indent=2) + '</pre>')
    quiz_config_display.short_description = 'Quiz Configuration'
    
    actions = ['cancel_sessions', 'delete_expired_sessions']
    
    @admin.action(description='Cancel selected sessions')
    def cancel_sessions(self, request, queryset):
        updated = queryset.filter(status__in=['waiting', 'active']).update(status='cancelled')
        self.message_user(request, f'{updated} session(s) cancelled.')
    
    @admin.action(description='Delete expired sessions')
    def delete_expired_sessions(self, request, queryset):
        from django.utils import timezone
        expired = queryset.filter(expires_at__lt=timezone.now())
        count = expired.count()
        expired.delete()
        self.message_user(request, f'{count} expired session(s) deleted.')

# Quiz Settings Admin (Singleton)

@admin.register(models.QuizSettings)
class QuizSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Daily Quiz Rewards', {
            'fields': (
                'daily_quiz_attempt_bonus',
                'daily_quiz_coins_per_correct',
                'daily_quiz_perfect_score_bonus'
            ),
            'description': 'Configure coin rewards for daily quiz'
        }),
        ('Pair Quiz Settings', {
            'fields': (
                'pair_quiz_enabled',
                'pair_quiz_session_timeout',
                'pair_quiz_max_questions'
            ),
            'description': 'Configure pair quiz behavior'
        }),
        ('Coin System', {
            'fields': (
                'coin_to_currency_rate',
                'min_coins_for_redemption'
            ),
            'description': 'Configure coin economy settings'
        }),
        ('Metadata', {
            'fields': ('updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('updated_at',)
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not models.QuizSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of settings
        return False
    
    def changelist_view(self, request, extra_context=None):
        # Redirect to edit view if settings exist
        if models.QuizSettings.objects.exists():
            obj = models.QuizSettings.objects.first()
            from django.shortcuts import redirect
            return redirect('admin:question_solver_quizsettings_change', obj.pk)
        return super().changelist_view(request, extra_context)
