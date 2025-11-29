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
    StudyMaterialGeneratorView
)

urlpatterns = [
    path('solve/', QuestionSolverView.as_view(), name='solve-question'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('status/', ServiceStatusView.as_view(), name='service-status'),
    path('quiz/generate/', QuizGeneratorView.as_view(), name='generate-quiz'),
    path('flashcards/generate/', FlashcardGeneratorView.as_view(), name='generate-flashcards'),
    path('study-material/generate/', StudyMaterialGeneratorView.as_view(), name='generate-study-material'),
]
