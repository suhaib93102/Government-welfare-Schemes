"""
Search Service - Handles web search using SearchAPI.io
Fetches top 5 results and filters trusted domains
"""

import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class SearchService:
    def __init__(self):
        self.searchapi_key = settings.SEARCHAPI_KEY
        self.serp_api_key = settings.SERP_API_KEY
        
        # Use session for connection pooling
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=5,
            pool_maxsize=10,
            max_retries=0
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        
        # Trusted domains for educational content
        self.trusted_domains = [
            'stackoverflow.com',
            'geeksforgeeks.org',
            'tutorialspoint.com',
            'w3schools.com',
            'khanacademy.org',
            'mathway.com',
            'symbolab.com',
            'chegg.com',
            'toppr.com',
            'byjus.com',
            'vedantu.com',
            'unacademy.com',
            'physics.stackexchange.com',
            'math.stackexchange.com',
            'chemistry.stackexchange.com',
            'quora.com',
            'doubtnut.com',
            'meritnation.com',
        ]
    
    def search_searchapi(self, query, count=5):
        """
        Search using SearchAPI.io with caching
        
        Args:
            query: Search query
            count: Number of results to fetch
            
        Returns:
            dict: Search results with metadata
        """
        if not self.searchapi_key:
            logger.warning("SearchAPI key not configured")
            return self._mock_search_results(query, count)
        
        # Check cache first
        try:
            from .cache_service import search_cache
            cache_key = f"{query}_{count}"
            cached_result = search_cache.get(cache_key)
            if cached_result:
                logger.info(f"Search cache hit for: {query[:50]}...")
                return cached_result
        except Exception as e:
            logger.debug(f"Search cache check failed: {e}")
        
        try:
            endpoint = "https://www.searchapi.io/api/v1/search"
            params = {
                "engine": "google",
                "q": query,
                "api_key": self.searchapi_key,
                "num": count
            }
            
            response = self.session.get(endpoint, params=params, timeout=3)
            response.raise_for_status()
            
            data = response.json()
            
            results = []
            if 'organic_results' in data:
                for item in data['organic_results'][:count]:
                    results.append({
                        'title': item.get('title', ''),
                        'url': item.get('link', ''),
                        'snippet': item.get('snippet', ''),
                        'domain': self._extract_domain(item.get('link', '')),
                    })
            
            result = {
                'success': True,
                'results': results,
                'query': query,
                'source': 'searchapi'
            }
            
            # Cache the result
            try:
                from .cache_service import search_cache
                search_cache.set(cache_key, result)
            except:
                pass
            
            return result
            
        except Exception as e:
            logger.error(f"SearchAPI search failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
    
    def search_serpapi(self, query, count=5):
        """
        Search using SerpAPI (Google Search)
        
        Args:
            query: Search query
            count: Number of results to fetch
            
        Returns:
            dict: Search results
        """
        if not self.serp_api_key:
            logger.warning("SerpAPI key not configured")
            return self._mock_search_results(query, count)
        
        try:
            endpoint = "https://serpapi.com/search"
            params = {
                "q": query,
                "api_key": self.serp_api_key,
                "num": count,
                "engine": "google"
            }
            
            response = requests.get(endpoint, params=params, timeout=3)
            response.raise_for_status()
            
            data = response.json()
            
            results = []
            if 'organic_results' in data:
                for item in data['organic_results'][:count]:
                    results.append({
                        'title': item.get('title', ''),
                        'url': item.get('link', ''),
                        'snippet': item.get('snippet', ''),
                        'domain': self._extract_domain(item.get('link', '')),
                    })
            
            return {
                'success': True,
                'results': results,
                'query': query,
                'source': 'serpapi'
            }
            
        except Exception as e:
            logger.error(f"SerpAPI search failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
    
    def search(self, query, count=5, prefer_source='searchapi'):
        """
        Unified search method - tries preferred source first
        
        Args:
            query: Search query
            count: Number of results
            prefer_source: 'searchapi' or 'serpapi'
            
        Returns:
            dict: Search results
        """
        if prefer_source == 'searchapi' and self.searchapi_key:
            result = self.search_searchapi(query, count)
            if result['success']:
                return result
            # Fallback to SerpAPI
            return self.search_serpapi(query, count)
        else:
            result = self.search_serpapi(query, count)
            if result['success']:
                return result
            # Fallback to SearchAPI
            return self.search_searchapi(query, count)
    
    def filter_trusted_domains(self, results):
        """
        Filter and prioritize results from trusted educational domains
        
        Args:
            results: List of search results
            
        Returns:
            dict: Filtered results with trust scores
        """
        filtered = []
        
        for result in results:
            domain = result.get('domain', '')
            trust_score = self._calculate_trust_score(domain)
            
            result['trust_score'] = trust_score
            result['is_trusted'] = trust_score > 50
            
            filtered.append(result)
        
        # Sort by trust score
        filtered.sort(key=lambda x: x['trust_score'], reverse=True)
        
        return {
            'results': filtered,
            'trusted_count': sum(1 for r in filtered if r['is_trusted'])
        }
    
    def _extract_domain(self, url):
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc.replace('www.', '')
        except:
            return ''
    
    def _calculate_trust_score(self, domain):
        """
        Calculate trust score for a domain
        Returns score 0-100
        """
        if not domain:
            return 0
        
        # Check if domain is in trusted list
        for trusted in self.trusted_domains:
            if trusted in domain.lower():
                return 90
        
        # Educational domains (.edu)
        if '.edu' in domain:
            return 80
        
        # Government/Academic domains
        if '.gov' in domain or '.ac.' in domain:
            return 75
        
        # Reputable domains heuristic
        if any(keyword in domain.lower() for keyword in ['learn', 'study', 'education', 'tutorial']):
            return 60
        
        # Default score for other domains
        return 40
    
    def _mock_search_results(self, query, count):
        """
        Mock search results for testing when API keys are not available
        """
        return {
            'success': True,
            'results': [
                {
                    'title': f'Solution for: {query}',
                    'url': 'https://example.com/solution1',
                    'snippet': f'Complete solution and explanation for {query}...',
                    'domain': 'example.com',
                    'trust_score': 50,
                    'is_trusted': False
                },
                {
                    'title': f'Step by step guide: {query}',
                    'url': 'https://stackoverflow.com/solution2',
                    'snippet': f'Detailed step-by-step solution...',
                    'domain': 'stackoverflow.com',
                    'trust_score': 90,
                    'is_trusted': True
                }
            ],
            'query': query,
            'source': 'mock',
            'warning': 'Using mock data - API keys not configured'
        }


# Global instance
search_service = SearchService()
