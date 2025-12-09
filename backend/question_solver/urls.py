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
from .payment_views import (
    CreatePaymentOrderView,
    VerifyPaymentView,
    PaymentStatusView,
    PaymentHistoryView,
    RefundPaymentView,
    RazorpayKeyView
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
    
    # Authentication endpoints
    path('auth/google/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Payment endpoints (Razorpay)
    path('payment/create-order/', CreatePaymentOrderView.as_view(), name='create-payment-order'),
    path('payment/verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('payment/status/', PaymentStatusView.as_view(), name='payment-status'),
    path('payment/history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('payment/refund/', RefundPaymentView.as_view(), name='refund-payment'),
    path('payment/razorpay-key/', RazorpayKeyView.as_view(), name='razorpay-key'),
]

