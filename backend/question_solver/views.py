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
import os
import logging
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

logger = logging.getLogger(__name__)


class QuestionSolverView(APIView):
    """
    Main API endpoint for question solving
    Accepts image upload or text input
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
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
            
            query_text = translation_result['translated']
            
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
