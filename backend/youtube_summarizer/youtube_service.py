import os
import re
import json
import logging
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import google.generativeai as genai
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

logger = logging.getLogger(__name__)


class YouTubeService:
    """Service to handle YouTube video transcript extraction and summarization"""
    
    def __init__(self):
        self.youtube_api_key = os.getenv('YOUTUBE_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Initialize Gemini
        genai.configure(api_key=self.gemini_api_key)
        # Use gemini-2.5-flash (latest stable model)
        try:
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("Using gemini-2.5-flash model")
        except Exception as e:
            raise ValueError(f"Failed to initialize Gemini model: {str(e)}")
    
    def extract_video_id(self, url: str) -> str:
        """
        Extract video ID from YouTube URL
        Supports formats:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/embed/VIDEO_ID
        """
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:embed\/)([0-9A-Za-z_-]{11})',
            r'^([0-9A-Za-z_-]{11})$'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        raise ValueError("Could not extract video ID from URL")
    
    def get_video_metadata(self, video_id: str) -> Dict:
        """Get video metadata using yt-dlp (more reliable than YouTube Data API)"""
        default_metadata = {
            'title': f'YouTube Video ({video_id})',
            'channel_name': 'Unknown',
            'duration': 'Unknown'
        }
        
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                video_url = f'https://www.youtube.com/watch?v={video_id}'
                info = ydl.extract_info(video_url, download=False)
                
                # Calculate duration in readable format
                duration_seconds = info.get('duration', 0)
                duration_readable = self._format_duration(duration_seconds)
                
                return {
                    'title': info.get('title', default_metadata['title']),
                    'channel_name': info.get('uploader', default_metadata['channel_name']),
                    'duration': duration_readable
                }
        except ImportError:
            logger.warning("yt-dlp not installed, falling back to default metadata")
            return default_metadata
        except Exception as e:
            logger.error(f"Error fetching video metadata: {str(e)}")
            import traceback
            traceback.print_exc()
            return default_metadata
    
    def _format_duration(self, seconds: int) -> str:
        """Convert seconds to readable format (e.g., '15m 30s')"""
        if not seconds:
            return 'Unknown'
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        if secs > 0:
            parts.append(f"{secs}s")
        
        return ' '.join(parts) if parts else 'Unknown'
    
    def get_transcript(self, video_id: str) -> str:
        """
        Get transcript for a YouTube video using yt-dlp (most reliable method)
        """
        try:
            import yt_dlp
            
            logger.info(f"Fetching transcript for video: {video_id}")
            
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'quiet': False,
                'no_warnings': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                video_url = f'https://www.youtube.com/watch?v={video_id}'
                info = ydl.extract_info(video_url, download=False)
                
                # Get the description as basic transcript fallback
                description = info.get('description', '')
                
                # Try to get from automatic captions (most videos have these)
                if 'automatic_captions' in info and 'en' in info['automatic_captions']:
                    logger.info("Found automatic captions")
                    captions = info['automatic_captions']['en']
                    
                    # Get the first caption format
                    for caption in captions:
                        if 'ext' in caption and caption['ext'] == 'json3':
                            # yt-dlp provides the text directly in some cases
                            continue
                    
                    # Use yt-dlp's built-in subtitle extraction
                    subtitle_text = info.get('subtitles_text', '')
                    if subtitle_text:
                        return subtitle_text
                
                # Try manual subtitles
                if 'subtitles' in info and 'en' in info['subtitles']:
                    logger.info("Found manual subtitles")
                
                # If we have chapters/description, use that
                chapters = info.get('chapters', [])
                if chapters:
                    chapter_text = ' '.join([ch.get('title', '') for ch in chapters])
                    if chapter_text.strip():
                        logger.info("Using chapter titles as transcript")
                        return f"{info.get('title', '')}. {description}. Chapters: {chapter_text}"
                
                # Last resort: use title and description
                if description:
                    logger.info("Using video description as transcript")
                    return f"{info.get('title', '')}. {description}"
                
        except Exception as e:
            logger.error(f"yt-dlp failed: {str(e)}")
        
        # Fallback to YouTubeTranscriptApi
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            logger.info("Trying YouTubeTranscriptApi as fallback...")
            
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
            transcript_text = ' '.join([segment['text'] for segment in transcript_list])
            
            if transcript_text.strip():
                logger.info("Successfully fetched transcript using YouTubeTranscriptApi")
                return transcript_text
                
        except Exception as e:
            logger.error(f"YouTubeTranscriptApi failed: {str(e)}")
        
        # All methods failed
        raise ValueError(
            "Could not fetch transcript for this video. "
            "The video may not have captions, or YouTube is blocking access. "
            "Please try a different video."
        )
    
    def summarize_with_gemini(self, transcript: str, video_title: str) -> Dict:
        """
        Send transcript to Gemini for summarization
        Returns structured JSON with summary, notes, and questions
        """
        prompt = f"""You are an expert educator. Analyze the following YouTube video transcript and provide:

1. A clean, structured summary (2-3 paragraphs)
2. Key concept definitions (5-8 important concepts explained clearly)
3. Well-formatted notes in bullet points (10-15 key points)
4. Exactly 3 exam-style quiz questions based on the content
5. Estimated reading time for the summary
6. Difficulty level (Beginner/Intermediate/Advanced)
7. 5-7 key keywords/topics covered

Video Title: {video_title}

Transcript:
{transcript[:15000]}

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{{
  "summary": "detailed summary here",
  "concepts": [{{"term": "concept name", "definition": "clear explanation"}}, ...],
  "notes": ["point 1", "point 2", ...],
  "questions": ["question 1", "question 2", "question 3"],
  "estimated_reading_time": "X minutes",
  "difficulty_level": "Beginner|Intermediate|Advanced",
  "keywords": ["keyword1", "keyword2", ...]
}}

Do not include any text before or after the JSON object."""

        try:
            # Generate content using Gemini
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response - remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.startswith('```'):
                response_text = response_text[3:]  # Remove ```
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove trailing ```
            
            response_text = response_text.strip()
            
            # Parse JSON response
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError as je:
                # If JSON parsing fails, try to extract JSON from the response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    raise ValueError(f"Failed to parse Gemini response as JSON: {str(je)}")
            
            # Validate required fields
            required_fields = ['summary', 'notes', 'questions']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field in Gemini response: {field}")
            
            # Ensure we have concepts field
            if 'concepts' not in result:
                result['concepts'] = []
            
            # Ensure we have exactly 3 questions
            if len(result['questions']) > 3:
                result['questions'] = result['questions'][:3]
            elif len(result['questions']) < 3:
                # Pad with generic questions if needed
                while len(result['questions']) < 3:
                    result['questions'].append(f"What are the key concepts discussed in this video?")
            
            return result
        
        except Exception as e:
            raise ValueError(f"Error generating summary with Gemini: {str(e)}")
    
    def process_video(self, video_url: str) -> Dict:
        """
        Main method to process a YouTube video
        Returns complete summary with all metadata
        """
        # Extract video ID
        video_id = self.extract_video_id(video_url)
        
        # Get video metadata
        metadata = self.get_video_metadata(video_id)
        
        # Get transcript
        transcript = self.get_transcript(video_id)
        
        if not transcript or len(transcript) < 50:
            raise ValueError("Transcript is too short or empty")
        
        # Generate summary with Gemini
        summary_data = self.summarize_with_gemini(transcript, metadata['title'])
        
        # Combine all data
        result = {
            'title': metadata['title'],
            'channel_name': metadata['channel_name'],
            'video_duration': metadata['duration'],
            'summary': summary_data.get('summary', ''),
            'concepts': summary_data.get('concepts', []),
            'notes': summary_data.get('notes', []),
            'questions': summary_data.get('questions', []),
            'estimated_reading_time': summary_data.get('estimated_reading_time', '5 minutes'),
            'difficulty_level': summary_data.get('difficulty_level', 'Intermediate'),
            'keywords': summary_data.get('keywords', [])
        }
        
        return result
