"""
URL configuration for question_solver app
"""

from django.urls import path
from .views import QuestionSolverView, HealthCheckView, ServiceStatusView

urlpatterns = [
    path('solve/', QuestionSolverView.as_view(), name='solve-question'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('status/', ServiceStatusView.as_view(), name='service-status'),
]
