from django.urls import path
from .views import YouTubeSummarizeView, YouTubeHealthCheckView

urlpatterns = [
    path('summarize/', YouTubeSummarizeView.as_view(), name='youtube-summarize'),
    path('health/', YouTubeHealthCheckView.as_view(), name='youtube-health'),
]
