from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import YouTubeSummarizeSerializer, YouTubeSummaryResponseSerializer
from .youtube_service import YouTubeService
from question_solver.services.quiz_service import quiz_service
from question_solver.models import Quiz, QuizQuestion
import traceback
import logging

logger = logging.getLogger(__name__)


class YouTubeSummarizeView(APIView):
    """
    API endpoint to summarize YouTube videos and optionally generate quiz
    
    POST /api/youtube/summarize/
    Payload: { 
        "video_url": "https://www.youtube.com/watch?v=XXXX",
        "generate_quiz": true,
        "quiz_questions": 5,
        "quiz_difficulty": "intermediate"
    }
    """
    
    def post(self, request):
        # Validate input
        serializer = YouTubeSummarizeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video_url = serializer.validated_data['video_url']
        generate_quiz = request.data.get('generate_quiz', False)
        quiz_questions = int(request.data.get('quiz_questions', 5))
        quiz_difficulty = request.data.get('quiz_difficulty', 'intermediate')
        
        try:
            # Initialize service
            youtube_service = YouTubeService()
            
            # Process video
            result = youtube_service.process_video(video_url)
            
            # Validate response
            response_serializer = YouTubeSummaryResponseSerializer(data=result)
            if not response_serializer.is_valid():
                return Response(
                    {'error': 'Invalid response format', 'details': response_serializer.errors},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            summary_data = response_serializer.data
            
            # Generate quiz if requested
            if generate_quiz:
                logger.info(f"Generating quiz for YouTube video: {result.get('title')}")
                
                # Get transcript or summary for quiz
                transcript = result.get('transcript', result.get('summary', ''))
                
                # Generate quiz using service
                quiz_data = quiz_service.generate_quiz_from_transcript(
                    transcript=transcript,
                    title=f"{result.get('title', 'Quiz')} - Questions",
                    num_questions=quiz_questions,
                    difficulty=quiz_difficulty
                )
                
                if 'error' not in quiz_data:
                    try:
                        # Save quiz to database
                        video_id = youtube_service.extract_video_id(video_url)
                        quiz = Quiz.objects.create(
                            title=quiz_data.get('title', f"{result.get('title')} Quiz"),
                            description=f"Quiz based on: {result.get('title')}",
                            source_type='youtube',
                            source_id=video_id,
                            summary=quiz_data.get('summary', result.get('summary', '')),
                            difficulty_level=quiz_data.get('difficulty_level', quiz_difficulty),
                            total_questions=len(quiz_data.get('questions', [])),
                            estimated_time=quiz_data.get('estimated_time_minutes', quiz_questions),
                            keywords=quiz_data.get('keywords', [])
                        )
                        
                        # Create questions
                        for question_data in quiz_data.get('questions', []):
                            QuizQuestion.objects.create(
                                quiz=quiz,
                                question_text=question_data.get('question', ''),
                                question_type=question_data.get('type', 'mcq'),
                                order=question_data.get('id', 1),
                                options=question_data.get('options', []),
                                correct_answer=question_data.get('correct_answer', ''),
                                explanation=question_data.get('explanation', ''),
                                hint=question_data.get('hint', ''),
                                difficulty=question_data.get('difficulty', quiz_difficulty),
                                tags=quiz_data.get('keywords', [])
                            )
                        
                        # Add quiz info to response
                        summary_data['quiz'] = {
                            'quiz_id': str(quiz.id),
                            'title': quiz.title,
                            'total_questions': quiz.total_questions,
                            'difficulty': quiz.difficulty_level,
                            'estimated_time': quiz.estimated_time,
                            'questions': [
                                {
                                    'id': str(q.id),
                                    'type': q.question_type,
                                    'question': q.question_text,
                                    'options': q.options,
                                    'hint': q.hint
                                }
                                for q in quiz.questions.all()
                            ]
                        }
                        
                        logger.info(f"Quiz created with ID: {quiz.id}")
                        
                    except Exception as e:
                        logger.error(f"Error saving quiz: {e}")
                        summary_data['quiz_error'] = f"Failed to save quiz: {str(e)}"
                else:
                    logger.warning(f"Quiz generation failed: {quiz_data.get('error')}")
                    summary_data['quiz_error'] = quiz_data.get('error')
            
            return Response(summary_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Handle known errors (invalid URL, no transcript, etc.)
            logger.error(f"ValueError in YouTube summarizer: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Unexpected error in YouTube summarizer: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class YouTubeSummarizeViewDemo(APIView):
    """Demo endpoint for YouTube summarizer testing"""
    
    def post(self, request):
        generate_quiz = request.data.get('generate_quiz', False)
        quiz_difficulty = request.data.get('quiz_difficulty', 'intermediate')
        
        demo_summary = {
                'title': 'Demo: Photosynthesis Explained',
                'channel_name': 'Demo Channel',
                'video_duration': '6m 30s',
                'summary': 'This demo video explains the basics of photosynthesis, including light reactions and the Calvin cycle.',
                'notes': [
                    'Photosynthesis converts light energy into chemical energy.',
                    'Light reactions produce ATP and NADPH in the thylakoid membranes.',
                    'Calvin cycle uses ATP and NADPH to fix CO2 into sugars.'
                ],
                'questions': [
                    'What are the main phases of photosynthesis?',
                    'Where do light reactions occur in the chloroplast?',
                    'What are the primary products of the light-dependent reactions?',
                    'What does the Calvin cycle accomplish?',
                    'Why is chlorophyll important for photosynthesis?'
                ],
                'estimated_reading_time': '4 minutes',
                'difficulty_level': 'Intermediate',
                'keywords': ['photosynthesis', 'light reactions', 'Calvin cycle']
            }

        # Embed a non-persistent demo quiz if requested in the payload
        if generate_quiz:
            demo_quiz = {
                'quiz_id': 'demo-quiz-1',
                'title': 'Photosynthesis - Demo Quiz',
                'total_questions': 5,
                'difficulty': quiz_difficulty,
                'estimated_time': 10,
                'questions': [
                    {
                        'id': f'demo-{i+1}',
                        'type': 'mcq',
                        'question': demo_summary['questions'][i],
                        'options': ['Option A', 'Option B', 'Option C', 'Option D'],
                        'hint': 'Think about the main processes in photosynthesis.'
                    }
                    for i in range(min(5, len(demo_summary['questions'])))
                ]
            }
            demo_summary['quiz'] = demo_quiz

        return Response(demo_summary, status=status.HTTP_200_OK)




class YouTubeHealthCheckView(APIView):
    """Health check endpoint for YouTube summarizer"""
    
    def get(self, request):
        import os
        
        youtube_api_key = os.getenv('YOUTUBE_API_KEY')
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        return Response({
            'status': 'online',
            'youtube_api_configured': bool(youtube_api_key),
            'gemini_api_configured': bool(gemini_api_key),
        })
