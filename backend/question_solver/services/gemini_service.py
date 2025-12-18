"""
Gemini AI Service for Quiz and Flashcard Generation
Uses Google's Generative AI to create educational content
"""

import os
import logging
import json
import google.generativeai as genai
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")


class GeminiService:
    """Service for generating educational content using Gemini AI"""
    
    def __init__(self):
        # Using gemini-2.5-flash model (fast and efficient)
        try:
            self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            self.model = None
    
    def generate_quiz(self, topic: str, num_questions: int = 5, difficulty: str = 'medium') -> Dict[str, Any]:
        """
        Generate a quiz based on a topic
        
        Args:
            topic: The topic or text content to generate quiz from
            num_questions: Number of questions to generate (default: 5)
            difficulty: Difficulty level - easy, medium, hard (default: medium)
        
        Returns:
            Dictionary containing quiz data with questions, options, and answers
        """
        try:
            prompt = f"""Generate a {difficulty} difficulty quiz with {num_questions} multiple-choice questions about the following topic:

Topic: {topic}

Please format the response as a valid JSON object with the following structure:
{{
    "title": "Quiz Title",
    "topic": "{topic}",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "id": 1,
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Explanation of the correct answer"
        }}
    ]
}}

Rules:
- Make questions clear and educational
- Provide 4 options for each question
- correctAnswer should be the index (0-3) of the correct option
- Include a brief explanation for each answer
- Ensure JSON is properly formatted
"""
            
            logger.info(f"Generating quiz for topic: {topic}")
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Try to extract JSON from markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            quiz_data = json.loads(response_text)
            
            logger.info(f"Successfully generated {len(quiz_data.get('questions', []))} questions")
            return {
                'success': True,
                'quiz': quiz_data
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                'success': False,
                'error': 'Failed to parse quiz data',
                'details': str(e)
            }
        except Exception as e:
            # Handle quota errors from Google's client explicitly
            try:
                from google.api_core.exceptions import ResourceExhausted
            except Exception:
                ResourceExhausted = None

            if ResourceExhausted and isinstance(e, ResourceExhausted):
                import re
                m = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', str(e))
                retry_seconds = int(m.group(1)) if m else None
                logger.warning(f"Quota exceeded for Gemini API: retry in {retry_seconds}s")

                return {
                    'success': False,
                    'error': 'quota_exceeded',
                    'details': str(e),
                    'retry_after_seconds': retry_seconds
                }

            logger.error(f"Quiz generation error: {e}", exc_info=True)
            return {
                'success': False,
                'error': 'Failed to generate quiz',
                'details': str(e)
            }
    
    def generate_flashcards(self, topic: str, num_cards: int = 10) -> Dict[str, Any]:
        """
        Generate flashcards based on a topic
        
        Args:
            topic: The topic or text content to generate flashcards from
            num_cards: Number of flashcards to generate (default: 10)
        
        Returns:
            Dictionary containing flashcard data
        """
        try:
            prompt = f"""Generate {num_cards} educational flashcards about the following topic:

Topic: {topic}

Please format the response as a valid JSON object with the following structure:
{{
    "title": "Flashcard Set Title",
    "topic": "{topic}",
    "cards": [
        {{
            "id": 1,
            "front": "Question or concept on the front of the card",
            "back": "Answer or explanation on the back of the card",
            "category": "Category or subtopic"
        }}
    ]
}}

Rules:
- Make flashcards concise and focused on key concepts
- Front should contain a question, term, or concept
- Back should contain the answer, definition, or explanation
- Include relevant categories for organization
- Ensure JSON is properly formatted
"""
            
            logger.info(f"Generating flashcards for topic: {topic}")
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Try to extract JSON from markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            flashcard_data = json.loads(response_text)
            
            logger.info(f"Successfully generated {len(flashcard_data.get('cards', []))} flashcards")
            return {
                'success': True,
                'flashcards': flashcard_data
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                'success': False,
                'error': 'Failed to parse flashcard data',
                'details': str(e)
            }
        except Exception as e:
            # Handle quota-exceeded specifically
            try:
                from google.api_core.exceptions import ResourceExhausted
            except Exception:
                ResourceExhausted = None

            if ResourceExhausted and isinstance(e, ResourceExhausted):
                import re
                m = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', str(e))
                retry_seconds = int(m.group(1)) if m else None
                logger.warning(f"Quota exceeded for Gemini API (flashcards): retry in {retry_seconds}s")

                return {
                    'success': False,
                    'error': 'quota_exceeded',
                    'details': str(e),
                    'retry_after_seconds': retry_seconds
                }

            # Handle quota-exceeded specifically
            try:
                from google.api_core.exceptions import ResourceExhausted
            except Exception:
                ResourceExhausted = None

            if ResourceExhausted and isinstance(e, ResourceExhausted):
                import re
                m = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', str(e))
                retry_seconds = int(m.group(1)) if m else None
                logger.warning(f"Quota exceeded for Gemini API (flashcards): retry in {retry_seconds}s")
                return {
                    'success': False,
                    'error': 'quota_exceeded',
                    'details': str(e),
                    'retry_after_seconds': retry_seconds
                }

            logger.error(f"Flashcard generation error: {e}", exc_info=True)
            return {
                'success': False,
                'error': 'Failed to generate flashcards',
                'details': str(e)
            }
    


    def generate_from_document(self, document_text: str, content_type: str = 'quiz', 
                               num_items: int = 5) -> Dict[str, Any]:
        """
        Generate quiz or flashcards from document text
        
        Args:
            document_text: The text content from uploaded document
            content_type: Type of content to generate - 'quiz' or 'flashcards'
            num_items: Number of items to generate
        
        Returns:
            Dictionary containing generated content
        """
        if content_type == 'quiz':
            return self.generate_quiz(document_text, num_questions=num_items)
        else:
            return self.generate_flashcards(document_text, num_cards=num_items)
    
    def generate_study_material(self, document_text: str) -> Dict[str, Any]:
        """
        Generate comprehensive study material from sample paper/document
        
        Extracts:
        1. Important Topics (5-15 points)
        2. Important Concepts (8-20 points)
        3. Study Notes (10-20 bullet points)
        4. Sample Questions (10 descriptive questions)
        
        Args:
            document_text: The text content from uploaded sample paper
        
        Returns:
            Dictionary containing topics, concepts, notes, and questions
        """
        try:
            prompt = f"""You are an expert academic examiner and study material creator.

From the following sample paper/document text, generate comprehensive study material:

1. IMPORTANT TOPICS (5–15 high-level Flash Cards covered)
   - Should be clear subject areas or themes
   - Brief and focused

2. IMPORTANT CONCEPTS (8–20 key definitions or ideas)
   - Fundamental concepts students must understand
   - Core principles and theories

3. STUDY NOTES (10–20 concise bullet points)
   - Exam-focused notes based strictly on the paper
   - Clear, actionable points for revision
   - Include key formulas, definitions, or processes

4. SAMPLE QUESTIONS (10 descriptive/short-answer questions)
   - NO multiple choice questions
   - NO answers provided
   - Useful for revision and practice
   - Cover different difficulty levels

RULES:
- Base content STRICTLY on the provided text
- No hallucinations or extra content
- Be concise and exam-oriented
- Format as valid JSON

Please format the response as a JSON object with this structure:
{{
    "title": "Study Material Title based on content",
    "subject": "Main subject area",
    "topics": [
        "Topic 1",
        "Topic 2"
    ],
    "concepts": [
        {{
            "name": "Concept name",
            "description": "Brief explanation"
        }}
    ],
    "notes": [
        "Study note 1",
        "Study note 2"
    ],
    "questions": [
        {{
            "id": 1,
            "question": "Question text",
            "type": "descriptive"
        }}
    ]
}}

Document Text:
{document_text}
"""
            
            logger.info("Generating study material from document")
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Try to extract JSON from markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            study_material = json.loads(response_text)
            
            logger.info(f"Successfully generated study material with {len(study_material.get('topics', []))} topics")
            return {
                'success': True,
                'study_material': study_material
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                'success': False,
                'error': 'Failed to parse study material data',
                'details': str(e)
            }
        except Exception as e:
            # Handle quota-exceeded specifically
            try:
                from google.api_core.exceptions import ResourceExhausted
            except Exception:
                ResourceExhausted = None

            if ResourceExhausted and isinstance(e, ResourceExhausted):
                import re
                m = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', str(e))
                retry_seconds = int(m.group(1)) if m else None
                logger.warning(f"Quota exceeded for Gemini API (study material): retry in {retry_seconds}s")
                return {
                    'success': False,
                    'error': 'quota_exceeded',
                    'details': str(e),
                    'retry_after_seconds': retry_seconds
                }

            logger.error(f"Study material generation error: {e}", exc_info=True)
            return {
                'success': False,
                'error': 'Failed to generate study material',
                'details': str(e)
            }
    
    def generate_daily_quiz(self, num_questions: int = 10) -> Dict[str, Any]:
        """
        Generate a daily general knowledge quiz with varied categories
        
        Args:
            num_questions: Number of questions to generate (default: 10)
        
        Returns:
            Dictionary containing quiz questions with varied categories
        """
        try:
            prompt = f"""Generate a daily general knowledge quiz with {num_questions} multiple-choice questions covering various categories like Science, History, Geography, Literature, Current Events, Sports, Technology, etc.

Make the questions interesting, educational, and suitable for a general audience. Mix easy and medium difficulty questions.

Please format the response as a valid JSON object with the following structure:
{{
    "questions": [
        {{
            "question_text": "Question text here?",
            "options": [
                {{"id": "A", "text": "Option A text"}},
                {{"id": "B", "text": "Option B text"}},
                {{"id": "C", "text": "Option C text"}},
                {{"id": "D", "text": "Option D text"}}
            ],
            "correct_answer": "C",
            "category": "science",
            "difficulty": "medium",
            "explanation": "Explanation of the correct answer",
            "fun_fact": "An interesting related fact"
        }}
    ]
}}

Rules:
- Make questions clear and engaging
- Use varied categories: science, history, geography, general, current_events, sports, entertainment, technology
- Mix difficulty levels (mostly easy and medium)
- correct_answer should be "A", "B", "C", or "D"
- Include explanations and fun facts
- Ensure JSON is properly formatted
"""
            
            logger.info(f"Generating Daily Quiz with {num_questions} questions")
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Try to extract JSON from markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            quiz_data = json.loads(response_text)
            
            logger.info(f"Successfully generated {len(quiz_data.get('questions', []))} Daily Quiz questions")
            return {
                'success': True,
                'questions': quiz_data.get('questions', [])
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                'success': False,
                'error': 'Failed to parse Daily Quiz data',
                'details': str(e)
            }
        except Exception as e:
            logger.error(f"Daily Quiz generation error: {e}", exc_info=True)
            return {
                'success': False,
                'error': 'Failed to generate Daily Quiz',
                'details': str(e)
            }


# Create singleton instance
gemini_service = GeminiService()
