"""
URL configuration for question_solver app
"""

from django.urls import path
from .views import (
    QuestionSolverView, 
    HealthCheckView, 
    ServiceStatusView, 
    QuizGeneratorView, 
    FlashcardGeneratorView,
    StudyMaterialGeneratorView,
    QuizGenerateView,
    QuizSubmitView,
    QuizResultsView,
    PredictedQuestionsView
)
from .subscription_views import (
    SubscriptionStatusView,
    UpgradePlanView,
    AutoPayManagementView,
    CheckFeatureAccessView,
    LogFeatureUsageView,
    BillingHistoryView
)
from .auth_views import (
    GoogleOAuthCallbackView,
    TokenRefreshView,
    UserProfileView,
    LogoutView
)
from .simple_auth_views import (
    RegisterView,
    LoginView,
    VerifyTokenView,
    ChangePasswordView,
    RequestPasswordResetView,
    ValidateResetTokenView,
    ResetPasswordView
)
from .payment_views import (
    CreatePaymentOrderView,
    VerifyPaymentView,
    PaymentStatusView,
    PaymentHistoryView,
    RefundPaymentView,
    RazorpayKeyView
)
from .daily_quiz_views import (
    get_daily_quiz,
    start_daily_quiz,
    submit_daily_quiz,
    get_user_coins,
    get_quiz_history,
    get_daily_quiz_attempt_detail,
)
from .pair_quiz_views import (
    CreatePairQuizView,
    JoinPairQuizView,
    PairQuizSessionView,
    CancelPairQuizView
)

urlpatterns = [
    path('solve/', QuestionSolverView.as_view(), name='solve-question'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('status/', ServiceStatusView.as_view(), name='service-status'),
    path('quiz/generate/', QuizGeneratorView.as_view(), name='generate-quiz'),
    path('quiz/create/', QuizGenerateView.as_view(), name='create-quiz'),
    path('quiz/<str:quiz_id>/submit/', QuizSubmitView.as_view(), name='submit-quiz'),
    path('quiz/<str:response_id>/results/', QuizResultsView.as_view(), name='quiz-results'),
    path('predicted-questions/generate/', PredictedQuestionsView.as_view(), name='predicted-questions'),
    path('flashcards/generate/', FlashcardGeneratorView.as_view(), name='generate-flashcards'),
    path('study-material/generate/', StudyMaterialGeneratorView.as_view(), name='generate-study-material'),
    
    # Subscription and Pricing endpoints
    path('subscription/status/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('subscription/upgrade/', UpgradePlanView.as_view(), name='upgrade-plan'),
    path('subscription/autopay/', AutoPayManagementView.as_view(), name='autopay-management'),
    path('subscription/feature-access/', CheckFeatureAccessView.as_view(), name='check-feature-access'),
    path('subscription/log-usage/', LogFeatureUsageView.as_view(), name='log-usage'),
    path('subscription/billing-history/', BillingHistoryView.as_view(), name='billing-history'),
    
    # Authentication endpoints (Google OAuth)
    path('auth/google/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Authentication endpoints (Email/Password)
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/verify/', VerifyTokenView.as_view(), name='verify-token'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/request-password-reset/', RequestPasswordResetView.as_view(), name='request-password-reset'),
    path('auth/validate-reset-token/', ValidateResetTokenView.as_view(), name='validate-reset-token'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Payment endpoints (Razorpay)
    path('payment/create-order/', CreatePaymentOrderView.as_view(), name='create-payment-order'),
    path('payment/verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('payment/status/', PaymentStatusView.as_view(), name='payment-status'),
    path('payment/history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('payment/refund/', RefundPaymentView.as_view(), name='refund-payment'),
    path('payment/razorpay-key/', RazorpayKeyView.as_view(), name='razorpay-key'),
    
    # Daily Quiz endpoints
    path('daily-quiz/', get_daily_quiz, name='daily-quiz'),
    path('daily-quiz/start/', start_daily_quiz, name='start-daily-quiz'),
    path('daily-quiz/submit/', submit_daily_quiz, name='submit-daily-quiz'),
    path('daily-quiz/coins/', get_user_coins, name='user-coins'),
    path('daily-quiz/history/', get_quiz_history, name='quiz-history'),
    path('daily-quiz/attempt/detail/', get_daily_quiz_attempt_detail, name='daily-quiz-attempt-detail'),
    
    # Pair Quiz endpoints
    path('pair-quiz/create/', CreatePairQuizView.as_view(), name='create-pair-quiz'),
    path('pair-quiz/join/', JoinPairQuizView.as_view(), name='join-pair-quiz'),
    path('pair-quiz/<str:session_id>/', PairQuizSessionView.as_view(), name='pair-quiz-session'),
    path('pair-quiz/<str:session_id>/cancel/', CancelPairQuizView.as_view(), name='cancel-pair-quiz'),
]