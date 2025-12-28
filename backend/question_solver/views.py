"""
Main API Views for Question Solver
Implements the complete pipeline: OCR → Clean → Search → Scrape → Confidence → YouTube
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils.decorators import method_decorator
import os
import logging
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from .services import (
    ocr_service,
    text_processor,
    search_service,
    web_scraper,
    confidence_scorer,
    youtube_service
)
from .services.gemini_service import gemini_service
from .services.quiz_service import quiz_service
from .models import Quiz, QuizQuestion, UserQuizResponse, QuizSummary
from .decorators import check_feature_access_class_based
from django.utils import timezone

logger = logging.getLogger(__name__)


class QuestionSolverView(APIView):
    """
    Main API endpoint for question solving
    Accepts image upload or text input
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    @method_decorator(check_feature_access_class_based('ask_question'))
    def post(self, request):
        """
        Process question from image or text
        
        Request body:
        - image: Image file (for image upload)
        - text: Text query (for direct text input)
        - language: Optional language hint
        - max_results: Number of search results (default: 5)
        """
        try:
            # Check input type
            if 'image' in request.FILES:
                result = self._process_image(request)
            elif 'text' in request.data:
                result = self._process_text(request)
            else:
                return Response({
                    'error': 'Please provide either an image or text query'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Question solver error: {e}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_image(self, request):
        start_time = time.time()
        image_file = request.FILES['image']
        max_results = int(request.data.get('max_results', 5))
        
        file_name = default_storage.save(f'temp/{image_file.name}', ContentFile(image_file.read()))
        file_path = default_storage.path(file_name)
        
        try:
            # Step 1: OCR - Extract text from image
            logger.info("Step 1: OCR extraction")
            ocr_start = time.time()
            ocr_result = ocr_service.extract_text_from_image(file_path)
            ocr_time = time.time() - ocr_start
            logger.info(f"OCR completed in {ocr_time:.2f}s")
            
            if not ocr_result['success']:
                return {
                    'error': 'OCR extraction failed',
                    'details': ocr_result.get('error', 'Unknown error')
                }
            
            extracted_text = ocr_result['text']
            ocr_confidence = ocr_result['confidence']
            
            # Step 2: Clean and normalize text
            logger.info("Step 2: Text cleaning")
            cleaned_text = text_processor.clean_text(extracted_text)
            
            # Step 3: Language detection and translation
            logger.info("Step 3: Language detection and translation")
            translation_result = text_processor.translate_to_english(cleaned_text)
            
            if not translation_result.get('success'):
                logger.warning(f"Translation failed, using original text: {translation_result.get('error')}")
                query_text = cleaned_text
            else:
                query_text = translation_result.get('translated', cleaned_text)
            
            # Step 4: Generate search queries (single query for speed)
            logger.info("Step 4: Generate search queries")
            search_queries = text_processor.generate_search_queries(query_text, max_queries=1)
            
            # Step 5: Search for solutions (use only first query for speed)
            logger.info("Step 5: Web search")
            search_start = time.time()
            all_results = []
            # Use only the first query for faster results
            primary_query = search_queries[0] if search_queries else query_text
            search_result = search_service.search(primary_query, count=min(max_results, 5))
            if search_result['success']:
                all_results.extend(search_result['results'])
            search_time = time.time() - search_start
            logger.info(f"Search completed in {search_time:.2f}s")
            
            # Remove duplicates and filter by trust
            unique_results = self._deduplicate_results(all_results)
            filtered_results = search_service.filter_trusted_domains(unique_results)
            
            # Step 6 & 8: Parallel execution - Fetch web content AND YouTube videos simultaneously
            logger.info("Step 6-8: Parallel fetch (web content + YouTube)")
            parallel_start = time.time()
            scraped_content = []
            youtube_results = {'videos': []}
            confidence_data = {'overall': 0, 'factors': {}}
            
            with ThreadPoolExecutor(max_workers=3) as executor:
                # Submit tasks in parallel - reduced to 2 URLs for speed
                top_urls = [r['url'] for r in filtered_results['results'][:2]]
                scrape_future = executor.submit(web_scraper.fetch_multiple_urls, top_urls, max_concurrent=2)
                youtube_future = executor.submit(youtube_service.search_concept_videos, query_text, 3)
                confidence_future = executor.submit(
                    confidence_scorer.calculate_overall_confidence,
                    ocr_confidence,
                    filtered_results['results'],
                    query_text
                )
                
                # Collect results as they complete with aggressive timeouts
                for future in as_completed([scrape_future, youtube_future, confidence_future]):
                    try:
                        if future == scrape_future:
                            scraped_content = future.result(timeout=3)  # 3s max for 3 URLs
                            logger.info(f"Web scraping completed: {len(scraped_content)} pages")
                        elif future == youtube_future:
                            youtube_results = future.result(timeout=3)  # Increased to 3s
                            logger.info(f"YouTube search completed: {len(youtube_results.get('videos', []))} videos")
                        elif future == confidence_future:
                            confidence_data = future.result(timeout=0.5)
                            logger.info(f"Confidence calculation completed")
                    except Exception as e:
                        if future == youtube_future:
                            logger.error(f"YouTube task failed: {e}")
                            youtube_results = {'videos': [], 'success': False, 'error': str(e)}
                        else:
                            logger.error(f"Parallel task failed: {e}")
            parallel_time = time.time() - parallel_start
            logger.info(f"Parallel fetch completed in {parallel_time:.2f}s")
            
            # Cleanup temp file
            default_storage.delete(file_name)
            
            # Return complete results
            return {
                'success': True,
                'pipeline': 'image',
                'extracted_text': {
                    'original': extracted_text,
                    'cleaned': cleaned_text,
                    'translated': query_text if translation_result['translation_needed'] else None,
                    'language': ocr_result.get('language', 'unknown')
                },
                'ocr_confidence': ocr_confidence,
                'search_queries': search_queries,
                'search_results': {
                    'total': len(filtered_results['results']),
                    'trusted_count': filtered_results['trusted_count'],
                    'results': filtered_results['results'][:10]  # Top 10
                },
                'web_content': scraped_content,
                'confidence': confidence_data,
                'youtube_videos': youtube_results.get('videos', []),
                'metadata': {
                    'processing_steps': 8,
                    'image_processed': True,
                    'queries_generated': len(search_queries),
                    'processing_time': time.time() - start_time
                }
            }
            
        finally:
            # Ensure cleanup
            if default_storage.exists(file_name):
                default_storage.delete(file_name)
    
    def _process_text(self, request):
        """
        Process direct text input: Clean → Translate → Search → Results
        """
        text_query = request.data['text']
        max_results = int(request.data.get('max_results', 5))
        
        # Step 1: Clean text
        logger.info("Step 1: Text cleaning")
        cleaned_text = text_processor.clean_text(text_query)
        
        # Step 2: Language detection and translation
        logger.info("Step 2: Language detection and translation")
        translation_result = text_processor.translate_to_english(cleaned_text)
        query_text = translation_result['translated']
        
        # Step 3: Generate search queries (single query for speed)
        logger.info("Step 3: Generate search queries")
        search_queries = text_processor.generate_search_queries(query_text, max_queries=1)
        
        # Step 4: Search for solutions (use only first query for speed)
        logger.info("Step 4: Web search")
        all_results = []
        # Use only the first query for faster results
        primary_query = search_queries[0] if search_queries else query_text
        search_result = search_service.search(primary_query, count=min(max_results, 5))
        if search_result['success']:
            all_results.extend(search_result['results'])
        
        # Remove duplicates and filter
        unique_results = self._deduplicate_results(all_results)
        filtered_results = search_service.filter_trusted_domains(unique_results)
        
        # Step 5-7: Parallel execution for web scraping, YouTube, and confidence
        logger.info("Step 5-7: Parallel fetch (web content + YouTube + confidence)")
        scraped_content = []
        youtube_results = {'videos': []}
        confidence_data = {'overall': 0, 'factors': {}}
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            top_urls = [r['url'] for r in filtered_results['results'][:3]]
            scrape_future = executor.submit(web_scraper.fetch_multiple_urls, top_urls, max_concurrent=3)
            youtube_future = executor.submit(youtube_service.search_concept_videos, query_text, 3)
            confidence_future = executor.submit(
                confidence_scorer.calculate_overall_confidence,
                100,  # Text input has 100% OCR confidence
                filtered_results['results'],
                query_text
            )
            
            # Collect results with aggressive timeouts
            for future in as_completed([scrape_future, youtube_future, confidence_future]):
                try:
                    if future == scrape_future:
                        scraped_content = future.result(timeout=3)  # 3s max for 3 URLs
                        logger.info(f"Web scraping completed: {len(scraped_content)} pages")
                    elif future == youtube_future:
                        youtube_results = future.result(timeout=3)  # Increased to 3s
                        logger.info(f"YouTube search completed: {len(youtube_results.get('videos', []))} videos")
                    elif future == confidence_future:
                        confidence_data = future.result(timeout=0.5)
                        logger.info(f"Confidence calculation completed")
                except Exception as e:
                    if future == youtube_future:
                        logger.error(f"YouTube task failed: {e}")
                        youtube_results = {'videos': [], 'success': False, 'error': str(e)}
                    else:
                        logger.error(f"Parallel task failed: {e}")
        
        return {
            'success': True,
            'pipeline': 'text',
            'query': {
                'original': text_query,
                'cleaned': cleaned_text,
                'translated': query_text if translation_result['translation_needed'] else None,
                'language': translation_result['source_lang']
            },
            'search_queries': search_queries,
            'search_results': {
                'total': len(filtered_results['results']),
                'trusted_count': filtered_results['trusted_count'],
                'results': filtered_results['results'][:10]
            },
            'web_content': scraped_content,
            'confidence': confidence_data,
            'youtube_videos': youtube_results.get('videos', []),
            'metadata': {
                'processing_steps': 7,
                'image_processed': False,
                'queries_generated': len(search_queries)
            }
        }
    
    def _deduplicate_results(self, results):
        """
        Remove duplicate URLs from search results
        """
        seen_urls = set()
        unique_results = []
        
        for result in results:
            url = result.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(result)
        
        return unique_results


class HealthCheckView(APIView):
    """
    Health check endpoint
    """
    def get(self, request):
        return Response({
            'status': 'healthy',
            'service': 'question-solver-api',
            'version': '1.0.0'
        })


class ServiceStatusView(APIView):
    """
    Check status of all integrated services
    """
    def get(self, request):
        from django.conf import settings
        
        status_data = {
            'ocr': {
                'available': ocr_service.ocr_available,
                'engine': 'EasyOCR' if ocr_service.ocr_available else 'unavailable'
            },
            'search': {
                'searchapi': bool(settings.SEARCHAPI_KEY),
                'serpapi': bool(settings.SERP_API_KEY)
            },
            'youtube': {
                'available': bool(settings.YOUTUBE_API_KEY)
            },
            'firecrawl': {
                'available': bool(settings.FIRECRAWL_API_KEY)
            }
        }
        
        return Response(status_data)


class QuizGeneratorView(APIView):
    """
    Generate quiz from topic or document text
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    @method_decorator(check_feature_access_class_based('quiz'))
    def post(self, request):
        """
        Generate a quiz based on topic or document
        
        Request body:
        - topic: Topic text or document content
        - num_questions: Number of questions (default: 5)
        - difficulty: easy, medium, or hard (default: medium)
        - document: Optional document file upload (.txt, .pdf, .jpg, .png)
        """
        try:
            # Get parameters
            topic = request.data.get('topic', '')
            num_questions = int(request.data.get('num_questions', 5))
            difficulty = request.data.get('difficulty', 'medium')
            
            # Handle document upload
            if 'document' in request.FILES:
                document_file = request.FILES['document']
                # Save temporarily
                file_name = default_storage.save(f'temp/{document_file.name}', 
                                                ContentFile(document_file.read()))
                file_path = default_storage.path(file_name)
                
                try:
                    # Extract text from document (using OCR for images, or read text files)
                    if document_file.name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                        ocr_result = ocr_service.extract_text_from_image(file_path)
                        if ocr_result['success']:
                            topic = ocr_result['text']
                        else:
                            return Response({
                                'error': 'Failed to extract text from document',
                                'details': ocr_result.get('error', 'Unknown error')
                            }, status=status.HTTP_400_BAD_REQUEST)
                    elif document_file.name.lower().endswith('.txt'):
                        with open(file_path, 'r', encoding='utf-8') as f:
                            topic = f.read()
                    elif document_file.name.lower().endswith('.pdf'):
                        # Extract text from PDF
                        try:
                            import PyPDF2
                            with open(file_path, 'rb') as f:
                                pdf_reader = PyPDF2.PdfReader(f)
                                topic = ""
                                for page in pdf_reader.pages:
                                    topic += page.extract_text() + "\n"
                        except ImportError:
                            return Response({
                                'error': 'PDF support requires PyPDF2. Please install it.',
                                'details': 'pip install PyPDF2'
                            }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'error': 'Unsupported file format. Please use .txt, .pdf, .png, .jpg, or .jpeg'
                        }, status=status.HTTP_400_BAD_REQUEST)
                finally:
                    # Clean up temp file
                    if os.path.exists(file_path):
                        os.remove(file_path)
            
            if not topic or not topic.strip():
                return Response({
                    'error': 'Please provide a topic or upload a document'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate quiz using Gemini
            logger.info(f"Generating quiz with {num_questions} questions, difficulty: {difficulty}")
            result = gemini_service.generate_quiz(topic, num_questions, difficulty)

            if result.get('success'):
                return Response(result.get('quiz'), status=status.HTTP_200_OK)
            else:
                # Handle quota exceeded by returning 429 with Retry-After
                if result.get('error') == 'quota_exceeded':
                    retry_seconds = result.get('retry_after_seconds')
                    headers = {}
                    if retry_seconds:
                        headers['Retry-After'] = str(retry_seconds)
                    return Response({
                        'error': 'Quota exceeded for AI service',
                        'details': result.get('details', '')
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS, headers=headers)

                return Response({
                    'error': result.get('error', 'Failed to generate quiz'),
                    'details': result.get('details', '')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Quiz generation error: {e}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FlashcardGeneratorView(APIView):
    """
    Generate flashcards from topic or document text
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    @method_decorator(check_feature_access_class_based('flashcards'))
    def post(self, request):
        """
        Generate flashcards based on topic or document
        
        Request body:
        - topic: Topic text or document content
        - num_cards: Number of flashcards (default: 10)
        - document: Optional document file upload (.txt, .pdf, .jpg, .png)
        """
        try:
            # Get parameters
            topic = request.data.get('topic', '')
            num_cards = int(request.data.get('num_cards', 10))
            
            # Handle document upload
            if 'document' in request.FILES:
                document_file = request.FILES['document']
                # Save temporarily
                file_name = default_storage.save(f'temp/{document_file.name}', 
                                                ContentFile(document_file.read()))
                file_path = default_storage.path(file_name)
                
                try:
                    # Extract text from document (using OCR for images, or read text files)
                    if document_file.name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                        ocr_result = ocr_service.extract_text_from_image(file_path)
                        if ocr_result['success']:
                            topic = ocr_result['text']
                        else:
                            return Response({
                                'error': 'Failed to extract text from document',
                                'details': ocr_result.get('error', 'Unknown error')
                            }, status=status.HTTP_400_BAD_REQUEST)
                    elif document_file.name.lower().endswith('.txt'):
                        with open(file_path, 'r', encoding='utf-8') as f:
                            topic = f.read()
                    elif document_file.name.lower().endswith('.pdf'):
                        # Extract text from PDF
                        try:
                            import PyPDF2
                            with open(file_path, 'rb') as f:
                                pdf_reader = PyPDF2.PdfReader(f)
                                topic = ""
                                for page in pdf_reader.pages:
                                    topic += page.extract_text() + "\n"
                        except ImportError:
                            return Response({
                                'error': 'PDF support requires PyPDF2. Please install it.',
                                'details': 'pip install PyPDF2'
                            }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'error': 'Unsupported file format. Please use .txt, .pdf, .png, .jpg, or .jpeg'
                        }, status=status.HTTP_400_BAD_REQUEST)
                finally:
                    # Clean up temp file
                    if os.path.exists(file_path):
                        os.remove(file_path)
            
            if not topic or not topic.strip():
                return Response({
                    'error': 'Please provide a topic or upload a document'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate flashcards using Gemini
            logger.info(f"Generating {num_cards} flashcards")
            result = gemini_service.generate_flashcards(topic, num_cards)

            if result.get('success'):
                return Response(result.get('flashcards'), status=status.HTTP_200_OK)
            else:
                if result.get('error') == 'quota_exceeded':
                    retry_seconds = result.get('retry_after_seconds')
                    headers = {}
                    if retry_seconds:
                        headers['Retry-After'] = str(retry_seconds)
                    return Response({
                        'error': 'Quota exceeded for AI service',
                        'details': result.get('details', '')
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS, headers=headers)

                return Response({
                    'error': result.get('error', 'Failed to generate flashcards'),
                    'details': result.get('details', '')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Flashcard generation error: {e}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudyMaterialGeneratorView(APIView):
    """
    Generate comprehensive study material from sample papers/documents
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request):
        """
        Generate study material from uploaded document or text
        
        Request body:
        - text: Direct text content
        - document: Document file upload (.txt, .pdf, .jpg, .png)
        
        Returns topics, concepts, study notes, and sample questions
        """
        try:
            text_content = request.data.get('text', '')
            
            # Handle document upload
            if 'document' in request.FILES:
                document_file = request.FILES['document']
                file_name = default_storage.save(f'temp/{document_file.name}', 
                                                ContentFile(document_file.read()))
                file_path = default_storage.path(file_name)
                
                try:
                    # Extract text from document
                    if document_file.name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                        # Use OCR for images
                        ocr_result = ocr_service.extract_text_from_image(file_path)
                        if ocr_result['success']:
                            text_content = ocr_result['text']
                        else:
                            return Response({
                                'error': 'Failed to extract text from image',
                                'details': ocr_result.get('error', 'Unknown error')
                            }, status=status.HTTP_400_BAD_REQUEST)
                    elif document_file.name.lower().endswith('.txt'):
                        # Read text file
                        with open(file_path, 'r', encoding='utf-8') as f:
                            text_content = f.read()
                    elif document_file.name.lower().endswith('.pdf'):
                        # For PDF, try to read as text (basic support)
                        try:
                            import PyPDF2
                            with open(file_path, 'rb') as f:
                                pdf_reader = PyPDF2.PdfReader(f)
                                text_content = ""
                                for page in pdf_reader.pages:
                                    text_content += page.extract_text() + "\n"
                        except ImportError:
                            # If PyPDF2 not available, use OCR on each page
                            ocr_result = ocr_service.extract_text_from_image(file_path)
                            if ocr_result['success']:
                                text_content = ocr_result['text']
                            else:
                                return Response({
                                    'error': 'PDF support requires PyPDF2. Please install it or upload as image.',
                                    'details': 'pip install PyPDF2'
                                }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'error': 'Unsupported file format',
                            'details': 'Please use .txt, .pdf, .png, .jpg, or .jpeg'
                        }, status=status.HTTP_400_BAD_REQUEST)
                finally:
                    # Clean up temp file
                    if os.path.exists(file_path):
                        os.remove(file_path)
            
            if not text_content or not text_content.strip():
                return Response({
                    'error': 'Please provide text content or upload a document'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate study material using Gemini
            logger.info("Generating comprehensive study material")
            result = gemini_service.generate_study_material(text_content)
            
            if result.get('success'):
                return Response(result.get('study_material'), status=status.HTTP_200_OK)
            else:
                if result.get('error') == 'quota_exceeded':
                    retry_after = result.get('retry_after_seconds')
                    headers = {}
                    if retry_after is not None:
                        headers['Retry-After'] = str(retry_after)
                    return Response({'error': 'Quota exceeded', 'details': result.get('details')}, status=status.HTTP_429_TOO_MANY_REQUESTS, headers=headers)

                return Response({
                    'error': result.get('error', 'Failed to generate study material'),
                    'details': result.get('details', '')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Study material generation error: {e}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizGenerateView(APIView):
    """
    Generate quiz from transcript/content
    POST /api/quiz/generate/
    """
    parser_classes = [JSONParser]
    
    def post(self, request):
        """
        Generate quiz from transcript
        
        Request body:
        {
            "transcript": "Full text content",
            "title": "Quiz title",
            "source_type": "youtube|text|image",
            "source_id": "video_id or content_id",
            "num_questions": 5-15,
            "difficulty": "beginner|intermediate|advanced"
        }
        """
        try:
            transcript = request.data.get('transcript', '').strip()
            title = request.data.get('title', 'Quiz')
            source_type = request.data.get('source_type', 'text')
            source_id = request.data.get('source_id', '')
            num_questions = int(request.data.get('num_questions', 5))
            difficulty = request.data.get('difficulty', 'intermediate')
            
            if not transcript or len(transcript) < 50:
                return Response({
                    'error': 'Transcript too short. Minimum 50 characters required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if difficulty not in ['beginner', 'intermediate', 'advanced']:
                difficulty = 'intermediate'
            
            logger.info(f"Generating quiz: {title} ({num_questions} questions, {difficulty})")
            
            # Generate quiz using service
            quiz_data = quiz_service.generate_quiz_from_transcript(
                transcript=transcript,
                title=title,
                num_questions=num_questions,
                difficulty=difficulty
            )
            
            if 'error' in quiz_data:
                return Response(quiz_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Save to database
            try:
                quiz = Quiz.objects.create(
                    title=quiz_data.get('title', title),
                    description=quiz_data.get('summary', ''),
                    source_type=source_type,
                    source_id=source_id,
                    summary=quiz_data.get('summary', ''),
                    difficulty_level=quiz_data.get('difficulty_level', difficulty),
                    total_questions=len(quiz_data.get('questions', [])),
                    estimated_time=quiz_data.get('estimated_time_minutes', num_questions),
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
                        difficulty=question_data.get('difficulty', difficulty),
                        tags=question_data.get('tags', [])
                    )
                
                logger.info(f"Quiz saved with ID: {quiz.id}")
                
                # Return quiz data
                return Response({
                    'quiz_id': str(quiz.id),
                    'title': quiz.title,
                    'summary': quiz.summary,
                    'total_questions': quiz.total_questions,
                    'difficulty': quiz.difficulty_level,
                    'estimated_time': quiz.estimated_time,
                    'keywords': quiz.keywords,
                    'questions': [
                        {
                            'id': str(q.id),
                            'type': q.question_type,
                            'question': q.question_text,
                            'options': q.options,
                            'hint': q.hint,
                            'difficulty': q.difficulty
                        }
                        for q in quiz.questions.all()
                    ]
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Database error saving quiz: {e}")
                return Response({
                    'error': 'Failed to save quiz',
                    'details': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Quiz generation error: {e}", exc_info=True)
            return Response({
                'error': 'Failed to generate quiz',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizSubmitView(APIView):
    """
    Submit quiz responses and get scoring
    POST /api/quiz/{quiz_id}/submit/
    """
    parser_classes = [JSONParser]
    
    def post(self, request, quiz_id):
        """
        Submit quiz responses
        
        Request body:
        {
            "session_id": "user_session_id",
            "responses": {
                "question_id": "user_answer",
                "question_id": "user_answer"
            }
        }
        """
        try:
            session_id = request.data.get('session_id', 'anonymous')
            responses_dict = request.data.get('responses', {})
            
            if not responses_dict:
                return Response({
                    'error': 'No responses provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get quiz
            try:
                quiz = Quiz.objects.get(id=quiz_id)
            except Quiz.DoesNotExist:
                return Response({
                    'error': 'Quiz not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            logger.info(f"Processing quiz submission for quiz: {quiz.title}")
            
            # Score responses
            questions = quiz.questions.all()
            scored_responses = {}
            correct_count = 0
            
            for question in questions:
                question_id = str(question.id)
                user_answer = responses_dict.get(question_id, '')
                
                is_correct = False
                
                if question.question_type == 'mcq':
                    # Check MCQ answer
                    correct_option = next(
                        (opt for opt in question.options if opt.get('is_correct')),
                        None
                    )
                    is_correct = correct_option and user_answer == correct_option.get('text')
                
                elif question.question_type == 'true_false':
                    # Simple true/false check
                    is_correct = str(user_answer).lower() == str(question.correct_answer).lower()
                
                elif question.question_type == 'short_answer':
                    # Fuzzy matching for short answers
                    expected = question.correct_answer.lower().strip()
                    user = user_answer.lower().strip()
                    # Simple check: contain key words
                    is_correct = len(expected) > 0 and (expected in user or user in expected)
                
                scored_responses[question_id] = {
                    'user_answer': user_answer,
                    'is_correct': is_correct,
                    'correct_answer': question.correct_answer
                }
                
                if is_correct:
                    correct_count += 1
            
            # Calculate score
            total_questions = len(scored_responses)
            score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
            
            # Save response
            user_response = UserQuizResponse.objects.create(
                quiz=quiz,
                session_id=session_id,
                completed_at=timezone.now(),
                responses=scored_responses,
                score=score_percentage,
                correct_answers=correct_count,
                total_answers=total_questions
            )
            
            # Generate summary/feedback
            questions_list = [
                {
                    'id': str(q.id),
                    'type': q.question_type,
                    'question': q.question_text,
                    'correct_answer': q.correct_answer,
                    'explanation': q.explanation
                }
                for q in questions
            ]
            
            analysis = quiz_service.generate_quiz_summary_from_responses(
                quiz.title,
                scored_responses,
                questions_list
            )
            
            user_response.feedback = analysis.get('overall_feedback', '')
            user_response.strengths = analysis.get('strengths', [])
            user_response.weaknesses = analysis.get('areas_for_improvement', [])
            user_response.save()
            
            logger.info(f"Quiz submitted. Score: {score_percentage}%")
            
            return Response({
                'response_id': str(user_response.id),
                'score': score_percentage,
                'correct_answers': correct_count,
                'total_questions': total_questions,
                'analysis': analysis,
                'results': [
                    {
                        'question_id': qid,
                        'question': next((q.question_text for q in questions if str(q.id) == qid), ''),
                        'user_answer': resp['user_answer'],
                        'correct_answer': resp['correct_answer'],
                        'is_correct': resp['is_correct'],
                        'explanation': next(
                            (q.explanation for q in questions if str(q.id) == qid),
                            ''
                        )
                    }
                    for qid, resp in scored_responses.items()
                ]
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Quiz submission error: {e}", exc_info=True)
            return Response({
                'error': 'Failed to process quiz submission',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizResultsView(APIView):
    """
    Get quiz results and analysis
    GET /api/quiz/{response_id}/results/
    """
    
    def get(self, request, response_id):
        """Get detailed results for a quiz response"""
        try:
            user_response = UserQuizResponse.objects.get(id=response_id)
            quiz = user_response.quiz
            
            return Response({
                'quiz_id': str(quiz.id),
                'quiz_title': quiz.title,
                'session_id': user_response.session_id,
                'score': user_response.score,
                'correct_answers': user_response.correct_answers,
                'total_questions': user_response.total_answers,
                'feedback': user_response.feedback,
                'strengths': user_response.strengths,
                'weaknesses': user_response.weaknesses,
                'completed_at': user_response.completed_at
            }, status=status.HTTP_200_OK)
            
        except UserQuizResponse.DoesNotExist:
            return Response({
                'error': 'Results not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching results: {e}")
            return Response({
                'error': 'Failed to fetch results',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictedQuestionsView(APIView):
    """
    Generate predicted important questions from topic or document
    POST /api/predicted-questions/generate/
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    @method_decorator(check_feature_access_class_based('predicted_questions'))
    def post(self, request):
        """
        Generate predicted questions from topic or document
        
        Request body:
        - topic: Topic/subject name (for text-based generation)
        - document: Document file (for document-based generation)
        - exam_type: Type of exam (General, JEE, NEET, etc.)
        - num_questions: Number of questions (default: 5)
        """
        try:
            topic = request.data.get('topic', '').strip()
            exam_type = request.data.get('exam_type', 'General')
            num_questions = int(request.data.get('num_questions', 5))
            document = None
            
            # Get content from either topic or document
            if 'document' in request.FILES:
                logger.info("Processing document for predicted questions")
                document_file = request.FILES['document']
                file_name = default_storage.save(f'temp/{document_file.name}', ContentFile(document_file.read()))
                file_path = default_storage.path(file_name)
                
                # Extract text from document
                if document_file.name.lower().endswith(('.txt', '.md')):
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        document = f.read()
                    logger.info(f"Extracted {len(document)} characters from text file")
                elif document_file.name.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                    # Use OCR for images
                    ocr_result = ocr_service.extract_text_from_image(file_path)
                    if ocr_result['success']:
                        document = ocr_result['text']
                        logger.info(f"Extracted {len(document)} characters from image via OCR")
                    else:
                        return Response({
                            'error': 'Failed to extract text from image'
                        }, status=status.HTTP_400_BAD_REQUEST)
                elif document_file.name.lower().endswith('.pdf'):
                    # Try to extract text from PDF
                    try:
                        import PyPDF2
                        with open(file_path, 'rb') as f:
                            reader = PyPDF2.PdfReader(f)
                            document = ' '.join([page.extract_text() for page in reader.pages])
                        logger.info(f"Extracted {len(document)} characters from PDF")
                    except Exception as e:
                        logger.warning(f"PDF extraction failed, using filename as topic: {e}")
                        document = None
                else:
                    return Response({
                        'error': f'Unsupported document type: {document_file.name}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Clean up temp file
                try:
                    default_storage.delete(file_name)
                except:
                    pass
                
                if not document:
                    return Response({
                        'error': 'Could not extract text from document'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                topic = document[:500]  # Use first 500 chars as topic label
            elif not topic:
                return Response({
                    'error': 'Please provide either a topic or document'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare content for Gemini
            content = document if document else topic
            
            logger.info(f"Generating {num_questions} predicted questions for exam type: {exam_type}")
            
            # Generate questions using Gemini with comprehensive structure
            prompt = f"""You are an expert educator preparing comprehensive study material with predicted exam questions.

CONTENT/TOPIC:
{content[:2000]}

EXAM TYPE: {exam_type}
NUMBER OF QUESTIONS: {num_questions}

Create a comprehensive study guide with:
1. Key definitions and concepts
2. Topic outline/structure
3. Predicted important exam questions with depth

Return ONLY valid JSON in this format:
{{
  "title": "Predicted Important Questions - {exam_type}",
  "exam_type": "{exam_type}",
  "key_definitions": [
    {{
      "term": "Concept name",
      "definition": "Clear, concise definition",
      "explanation": "Deeper explanation of the concept",
      "example": "Real-world example or application"
    }}
  ],
  "topic_outline": {{
    "main_topic": "Overall topic title",
    "subtopics": [
      {{
        "title": "Subtopic 1",
        "key_points": ["point 1", "point 2", "point 3"],
        "importance": "High|Medium|Low"
      }}
    ],
    "learning_objectives": ["Understand...", "Analyze...", "Apply..."]
  }},
  "questions": [
    {{
      "id": 1,
      "question": "The question text?",
      "difficulty": "Easy|Medium|Hard",
      "importance": "Low|Medium|High",
      "question_type": "Conceptual|Application|Analysis|Comprehension",
      "depth_level": "Surface|Intermediate|Deep",
      "expected_answer_length": "Short|Medium|Detailed",
      "key_concepts": ["concept1", "concept2"],
      "hint": "A helpful hint",
      "sample_answer": "A comprehensive sample answer showing depth",
      "why_important": "Why this question is likely to appear in {exam_type} exams",
      "related_topics": ["related1", "related2"],
      "tags": ["topic1", "topic2"]
    }}
  ]
}}

RULES FOR QUESTIONS:
- Generate questions that test understanding, analysis, and application
- Include varying question types: Conceptual, Application-based, Analytical
- All questions should have DEPTH - not just surface-level
- Provide detailed sample answers showing critical thinking
- Mix difficulty levels but focus on Medium and Hard
- Include reasoning for why each question is important
- Link questions to related concepts for better understanding
- Mark importance based on typical exam frequency
- Provide helpful hints especially for harder questions
- Include expected answer length to guide studying
"""

            model = gemini_service.model or __import__('google.generativeai', fromlist=['GenerativeModel']).GenerativeModel('gemini-2.5-flash')
            try:
                response = model.generate_content(prompt)
            except Exception as e:
                # Handle quota exceeded specifically
                try:
                    from google.api_core.exceptions import ResourceExhausted
                except Exception:
                    ResourceExhausted = None

                if ResourceExhausted and isinstance(e, ResourceExhausted):
                    import re
                    retry_seconds = None
                    m = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', str(e))
                    retry_seconds = int(m.group(1)) if m else None

                    headers = {}
                    if retry_seconds:
                        headers['Retry-After'] = str(retry_seconds)
                    logger.warning(f"Quota exceeded for Gemini API (predicted questions): retry in {retry_seconds}s")
                    return Response({ 'error': 'Quota exceeded for AI service', 'details': str(e) }, status=status.HTTP_429_TOO_MANY_REQUESTS, headers=headers)

                logger.error(f"Predicted questions generation error: {e}", exc_info=True)
                return Response({ 'error': 'Failed to generate predicted questions', 'details': str(e) }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            if not response.text:
                logger.error("Empty response from Gemini API")
                return Response({
                    'error': 'Failed to generate questions'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Parse response with robust cleanup
            response_text = response.text.strip()
            
            # Remove markdown code fences
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:].lstrip()
            if response_text.endswith('```'):
                response_text = response_text[:-3].rstrip()
            
            # Try direct parsing first
            try:
                questions_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.warning(f"Direct JSON parse failed: {e}")
                
                # Try extracting JSON object
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    json_text = json_match.group()
                    
                    # Fix common JSON issues: newlines in strings, unescaped quotes
                    json_text = json_text.replace('\n', '\\n').replace('\r', '\\r')
                    
                    try:
                        questions_data = json.loads(json_text)
                    except json.JSONDecodeError as e2:
                        logger.error(f"JSON extraction failed: {e2}")
                        logger.error(f"Problematic text (first 500 chars): {json_text[:500]}")
                        raise ValueError(f"Could not parse Gemini response: {e2}")
                else:
                    raise ValueError("No JSON object found in response")
            
            # Ensure all expected fields are present with fallback values
            if not questions_data.get('key_definitions'):
                # Generate key definitions from questions if not provided
                key_terms = set()
                for q in questions_data.get('questions', []):
                    key_terms.update(q.get('key_concepts', []))
                
                definitions = []
                for i, term in enumerate(list(key_terms)[:5]):  # Limit to 5 key definitions
                    definitions.append({
                        'term': term,
                        'definition': f'A key concept related to {topic or "the content"}',
                        'explanation': f'{term} is essential for understanding this topic',
                        'example': 'See the related questions for practical applications'
                    })
                questions_data['key_definitions'] = definitions
            
            if not questions_data.get('topic_outline'):
                # Generate basic topic outline from questions
                questions_data['topic_outline'] = {
                    'main_topic': topic or content[:100],
                    'subtopics': [],
                    'learning_objectives': [
                        'Understand key concepts and definitions',
                        'Apply knowledge to solve problems',
                        'Analyze complex scenarios and relationships',
                        'Evaluate and synthesize information'
                    ]
                }
            
            logger.info(f"Generated {len(questions_data.get('questions', []))} questions with comprehensive structure")
            logger.info(f"Definitions: {len(questions_data.get('key_definitions', []))}, Topics in outline: {len(questions_data.get('topic_outline', {}).get('subtopics', []))}")
            
            return Response({
                'success': True,
                'title': questions_data.get('title', 'Predicted Important Questions'),
                'exam_type': exam_type,
                'key_definitions': questions_data.get('key_definitions', []),
                'topic_outline': questions_data.get('topic_outline', {}),
                'questions': questions_data.get('questions', []),
                'total_questions': len(questions_data.get('questions', [])),
                'learning_objectives': questions_data.get('topic_outline', {}).get('learning_objectives', [])
            }, status=status.HTTP_200_OK)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON parsing error: {e}")
            return Response({
                'error': 'Failed to parse generated questions',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error generating predicted questions: {e}", exc_info=True)
            return Response({
                'error': 'Failed to generate predicted questions',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

