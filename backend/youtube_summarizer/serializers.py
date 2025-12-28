from rest_framework import serializers


class YouTubeSummarizeSerializer(serializers.Serializer):
    video_url = serializers.URLField(required=True, help_text="YouTube video URL")

    def validate_video_url(self, value):
        """Validate that the URL is a valid YouTube URL"""
        if 'youtube.com' not in value and 'youtu.be' not in value:
            raise serializers.ValidationError("Please provide a valid YouTube URL")
        return value


class YouTubeSummaryResponseSerializer(serializers.Serializer):
    """Serializer for the response"""
    title = serializers.CharField()
    summary = serializers.CharField()
    concepts = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    notes = serializers.ListField(child=serializers.CharField())
    questions = serializers.ListField(child=serializers.CharField())
    estimated_reading_time = serializers.CharField(required=False)
    difficulty_level = serializers.CharField(required=False)
    keywords = serializers.ListField(child=serializers.CharField(), required=False)
    video_duration = serializers.CharField(required=False)
    channel_name = serializers.CharField(required=False)
