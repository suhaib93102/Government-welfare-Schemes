from django.contrib import admin
from . import models
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


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
		'user_id', 'plan', 'ask_questions_used', 'quiz_generated', 'flashcards_generated',
		'auto_pay_enabled', 'subscription_start_date', 'subscription_end_date',
	)
	list_filter = ('plan', 'auto_pay_enabled')
	search_fields = ('user_id',)
	inlines = [PaymentInline]
	actions = [reset_monthly_usage]
	readonly_fields = ('created_at', 'updated_at', 'subscription_start_date', 'next_billing_date')


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


@admin.register(models.DailyQuiz)
class DailyQuizAdmin(admin.ModelAdmin):
    list_display = ('date', 'title', 'difficulty', 'total_questions', 'coins_per_correct', 'max_coins', 'is_active', 'created_at')
    list_filter = ('difficulty', 'is_active', 'date')
    search_fields = ('title', 'description')
    date_hierarchy = 'date'
    inlines = [DailyQuestionInline]
    readonly_fields = ('created_at', 'updated_at', 'max_coins')


@admin.register(models.DailyQuestion)
class DailyQuestionAdmin(admin.ModelAdmin):
    list_display = ('daily_quiz', 'order', 'category', 'difficulty', 'correct_answer', 'created_at')
    list_filter = ('category', 'difficulty', 'daily_quiz__date')
    search_fields = ('question_text', 'daily_quiz__title')
    readonly_fields = ('created_at',)


@admin.register(models.UserDailyQuizAttempt)
class UserDailyQuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'daily_quiz', 'correct_count', 'total_questions', 'score_percentage', 'coins_earned', 'completed_at')
    list_filter = ('daily_quiz__date', 'completed_at')
    search_fields = ('user_id', 'daily_quiz__title')
    readonly_fields = ('started_at', 'completed_at')
    date_hierarchy = 'started_at'