"""
Daily Quiz API Views
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta
from .models import (
    DailyQuiz, DailyQuestion, UserDailyQuizAttempt, 
    UserCoins, CoinTransaction
)
from .services.gemini_service import gemini_service
import logging

logger = logging.getLogger(__name__)


def create_or_get_daily_quiz():
    """
    Auto-generate today's Daily Quiz using Gemini if it doesn't exist
    """
    today = date.today()
    daily_quiz = DailyQuiz.objects.filter(date=today, is_active=True).first()
    
    if daily_quiz:
        return daily_quiz
    
    # Generate new quiz using Gemini
    logger.info(f"Generating new Daily Quiz for {today}")
    
    try:
        result = gemini_service.generate_daily_quiz(num_questions=5)
        
        if not result.get('success'):
            logger.error(f"Failed to generate Daily Quiz: {result.get('error')}")
            return None
        
        questions_data = result.get('questions', [])
        
        if not questions_data:
            logger.error("No questions returned from Gemini")
            return None
        
        # Create the quiz
        with transaction.atomic():
            daily_quiz = DailyQuiz.objects.create(
                date=today,
                title=f'Daily GK Quiz - {today.strftime("%B %d, %Y")}',
                description='Test your general knowledge with AI-generated questions!',
                total_questions=len(questions_data),
                difficulty='medium'
            )
            
            # Add questions
            for idx, q_data in enumerate(questions_data, 1):
                DailyQuestion.objects.create(
                    daily_quiz=daily_quiz,
                    order=idx,
                    question_text=q_data.get('question_text', ''),
                    options=q_data.get('options', []),
                    correct_answer=q_data.get('correct_answer', 'A'),
                    category=q_data.get('category', 'general'),
                    difficulty=q_data.get('difficulty', 'medium'),
                    explanation=q_data.get('explanation', ''),
                    fun_fact=q_data.get('fun_fact', '')
                )
            
            logger.info(f"Successfully created Daily Quiz with {len(questions_data)} questions")
            return daily_quiz
            
    except Exception as e:
        logger.error(f"Error creating Daily Quiz: {e}", exc_info=True)
        return None


@api_view(['GET'])
def get_daily_quiz(request):
    """
    Get today's daily coin quiz (auto-generates using Gemini if not exists)
    Returns: quiz metadata + questions (without correct answers) + coin logic + UI metadata
    Format matches strict JSON requirements for daily_coin_quiz
    """
    user_id = request.query_params.get('user_id', 'anonymous')
    today = date.today()
    
    try:
        # Auto-generate quiz if it doesn't exist (ensure 10 questions)
        daily_quiz = create_or_get_daily_quiz()
        
        if not daily_quiz:
            return Response({
                'error': 'Failed to generate quiz',
                'message': 'Unable to create today\'s quiz. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check if user already attempted today's quiz
        existing_attempt = UserDailyQuizAttempt.objects.filter(
            daily_quiz=daily_quiz,
            user_id=user_id
        ).first()
        
        if existing_attempt:
            return Response({
                'message': 'You have already completed today\'s quiz!',
                'already_attempted': True,
                'result': {
                    'correct_count': existing_attempt.correct_count,
                    'total_questions': existing_attempt.total_questions,
                    'score_percentage': existing_attempt.score_percentage,
                    'coins_earned': existing_attempt.coins_earned,
                    'attempt_bonus': 5,
                    'per_correct': 5,
                }
            }, status=status.HTTP_200_OK)
        
        # Get questions (without revealing correct answers)
        questions = DailyQuestion.objects.filter(daily_quiz=daily_quiz).order_by('order')
        
        questions_data = []
        for idx, q in enumerate(questions, 1):
            questions_data.append({
                'id': idx,
                'question': q.question_text,
                'options': [opt['text'] for opt in q.options],  # Array of strings ["A", "B", "C", "D"]
                'category': q.category,
                'difficulty': q.difficulty,
            })
        # Enforce maximum of 5 questions for the Daily Quiz
        questions_data = questions_data[:5]
        
        # Return format matching the strict requirements
        return Response({
            'quiz_metadata': {
                'quiz_type': 'daily_coin_quiz',
                'total_questions': len(questions_data),
                'difficulty': 'medium',
                'date': str(today),
                'title': daily_quiz.title,
                'description': daily_quiz.description,
            },
            'coins': {
                'attempt_bonus': 5,
                'per_correct_answer': 5,
                'max_possible': 5 + (len(questions_data) * 5),
            },
            'questions': [
                {
                    'id': idx + 1,
                    'question': (q.get('question') or q.get('question_text') or q.get('question_text') if isinstance(q, dict) else q),
                    'options': [opt.get('text') if isinstance(opt, dict) else opt for opt in q.get('options', [])],
                    'category': q.get('category', 'general') if isinstance(q, dict) else 'general',
                    'difficulty': q.get('difficulty', 'medium') if isinstance(q, dict) else 'medium',
                }
                for idx, q in enumerate(questions_data)
            ],
            'ui': {
                'theme': 'light',
                'card_style': 'rounded',
                'accent_color': '#6366F1',
                'show_progress_bar': True,
                'show_coin_animation': True,
            },
            'quiz_id': str(daily_quiz.id),
            'already_attempted': False,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def start_daily_quiz(request):
    """
    Mark the Daily Quiz as started for a user and award participation coins (+10).
    Body: { "user_id": "...", "quiz_id": "..." }
    """
    try:
        user_id = request.data.get('user_id', 'anonymous')
        quiz_id = request.data.get('quiz_id')

        if not quiz_id:
            return Response({'error': 'quiz_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        daily_quiz = DailyQuiz.objects.get(id=quiz_id, is_active=True)

        # If already attempted/completed, return info
        existing_attempt = UserDailyQuizAttempt.objects.filter(daily_quiz=daily_quiz, user_id=user_id).first()
        if existing_attempt and existing_attempt.completed_at is not None:
            return Response({'error': 'Quiz already completed'}, status=status.HTTP_400_BAD_REQUEST)

        # If started already (but not completed) return existing info
        if existing_attempt and existing_attempt.completed_at is None:
            return Response({
                'message': 'Quiz already started',
                'quiz_id': str(daily_quiz.id),
                'coins_awarded': existing_attempt.coins_earned,
            }, status=status.HTTP_200_OK)

        # Create attempt and award participation coins (5)
        attempt_bonus = 5

        with transaction.atomic():
            attempt = UserDailyQuizAttempt.objects.create(
                daily_quiz=daily_quiz,
                user_id=user_id,
                coins_earned=attempt_bonus,
            )

            user_coins, created = UserCoins.objects.get_or_create(
                user_id=user_id,
                defaults={'total_coins': 0, 'lifetime_coins': 0}
            )
            user_coins.add_coins(attempt_bonus, reason=f"Daily Quiz participation {daily_quiz.date}")

        return Response({
            'success': True,
            'message': f'You earned {attempt_bonus} coins for starting the Daily Quiz.',
            'quiz_id': str(daily_quiz.id),
            'coins_awarded': attempt_bonus,
        }, status=status.HTTP_200_OK)

    except DailyQuiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def submit_daily_quiz(request):
    """
    Submit answers for daily coin quiz
    Body: {
        "user_id": "...",
        "quiz_id": "...",
        "answers": {"1": 0, "2": 1, ...},  # question index -> option index
        "time_taken_seconds": 120
    }
    Returns coins earned with attempt bonus + per correct answer rewards
    """
    try:
        user_id = request.data.get('user_id', 'anonymous')
        quiz_id = request.data.get('quiz_id')
        answers = request.data.get('answers', {})
        time_taken = request.data.get('time_taken_seconds', 0)
        
        if not quiz_id or not answers:
            return Response({
                'error': 'quiz_id and answers are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        daily_quiz = DailyQuiz.objects.get(id=quiz_id, is_active=True)
        
        # Check if there's an existing attempt
        existing_attempt = UserDailyQuizAttempt.objects.filter(
            daily_quiz=daily_quiz,
            user_id=user_id
        ).first()
        
        if existing_attempt and existing_attempt.completed_at is not None:
            return Response({
                'error': 'Quiz already attempted',
                'message': 'You can only attempt each Daily Quiz once'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get questions and check answers (limit to first 5 to enforce business rule)
        questions = list(DailyQuestion.objects.filter(daily_quiz=daily_quiz).order_by('order')[:5])
        correct_count = 0
        results = []
        
        for idx, q in enumerate(questions, 1):
            # Get user's answer (option index)
            user_answer_idx = answers.get(str(idx), -1)
            
            # Convert correct answer letter to index (A=0, B=1, C=2, D=3)
            correct_idx = ord(q.correct_answer.upper()) - ord('A')
            
            is_correct = (user_answer_idx == correct_idx)
            
            if is_correct:
                correct_count += 1
            
            # Get option texts - options are already strings in the list
            options = q.options if isinstance(q.options, list) else []
            user_answer_text = options[user_answer_idx] if 0 <= user_answer_idx < len(options) else "No answer"
            correct_answer_text = options[correct_idx] if 0 <= correct_idx < len(options) else q.correct_answer
            
            results.append({
                'question_id': idx,
                'question': q.question_text,
                'options': options,
                'user_answer': user_answer_text,
                'correct_answer': correct_answer_text,
                'is_correct': is_correct,
                'explanation': q.explanation,
                'fun_fact': q.fun_fact or '',
                'category': q.category,
            })
        
        total_questions = len(questions)
        score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
        
        # Calculate coins: 5 for attempt (if not already awarded) + 5 per correct answer
        attempt_bonus = 5
        per_correct = 5
        coins_from_correct = correct_count * per_correct
        max_possible = attempt_bonus + (total_questions * per_correct)  # Dynamic based on question count
        
        # Save attempt and award coins in a transaction
        with transaction.atomic():
            user_coins, created = UserCoins.objects.get_or_create(
                user_id=user_id,
                defaults={'total_coins': 0, 'lifetime_coins': 0}
            )

            # If an attempt record exists and was started (but not completed), update it
            if existing_attempt and existing_attempt.completed_at is None:
                attempt = existing_attempt
                # compute coins to add only for correct answers (attempt bonus should already be awarded on start)
                coins_to_add = coins_from_correct
                attempt.coins_earned = (attempt.coins_earned or 0) + coins_to_add
                attempt.answers = answers
                attempt.correct_count = correct_count
                attempt.total_questions = total_questions
                attempt.score_percentage = score_percentage
                attempt.completed_at = timezone.now()
                attempt.time_taken_seconds = time_taken
                attempt.save()

                # Award coins for correct answers only
                if coins_to_add > 0:
                    user_coins.add_coins(coins_to_add, reason=f"Daily Quiz correct answers {daily_quiz.date}")
            else:
                # No prior start record - award attempt bonus + correct answer coins now
                coins_earned = attempt_bonus + coins_from_correct
                attempt = UserDailyQuizAttempt.objects.create(
                    daily_quiz=daily_quiz,
                    user_id=user_id,
                    answers=answers,
                    correct_count=correct_count,
                    total_questions=total_questions,
                    score_percentage=score_percentage,
                    coins_earned=coins_earned,
                    completed_at=timezone.now(),
                    time_taken_seconds=time_taken,
                )

                # Award coins
                user_coins.add_coins(coins_earned, reason=f"Daily Quiz {daily_quiz.date}")
        
        return Response({
            'success': True,
            'message': f'🎉 Quiz completed! You earned {attempt.coins_earned} coins!',
            'result': {
                'correct_count': correct_count,
                'total_questions': total_questions,
                'score_percentage': round(score_percentage, 2),
                'coins_earned': attempt.coins_earned,
                'time_taken_seconds': time_taken,
                'attempt_bonus': attempt_bonus,
                'per_correct': per_correct,
                'max_possible': max_possible,
            },
            'coin_breakdown': {
                'attempt_bonus': attempt_bonus if not (existing_attempt and existing_attempt.completed_at is None) else 0,
                'correct_answers': correct_count,
                'coins_per_correct': per_correct,
                'correct_answer_coins': coins_from_correct,
                'total_earned': attempt.coins_earned,
            },
            'results': results,
            'total_coins': user_coins.total_coins,
            'show_coin_animation': True,
        }, status=status.HTTP_200_OK)
        
    except DailyQuiz.DoesNotExist:
        return Response({
            'error': 'Quiz not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_user_coins(request):
    """
    Get user's coin balance and stats
    """
    user_id = request.query_params.get('user_id', 'anonymous')
    
    try:
        user_coins = UserCoins.objects.filter(user_id=user_id).first()
        
        if not user_coins:
            return Response({
                'user_id': user_id,
                'total_coins': 0,
                'lifetime_coins': 0,
                'coins_spent': 0,
            }, status=status.HTTP_200_OK)
        
        # Get recent transactions
        recent_transactions = CoinTransaction.objects.filter(
            user_coins=user_coins
        ).order_by('-created_at')[:10]
        
        transactions_data = [{
            'amount': t.amount,
            'type': t.transaction_type,
            'reason': t.reason,
            'created_at': t.created_at,
        } for t in recent_transactions]
        
        return Response({
            'user_id': user_id,
            'total_coins': user_coins.total_coins,
            'lifetime_coins': user_coins.lifetime_coins,
            'coins_spent': user_coins.coins_spent,
            'recent_transactions': transactions_data,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_quiz_history(request):
    """
    Get user's quiz attempt history
    """
    user_id = request.query_params.get('user_id', 'anonymous')
    limit = int(request.query_params.get('limit', 30))
    
    try:
        attempts = UserDailyQuizAttempt.objects.filter(
            user_id=user_id
        ).select_related('daily_quiz').order_by('-started_at')[:limit]
        
        history_data = []
        for attempt in attempts:
            history_data.append({
                'date': attempt.daily_quiz.date,
                'quiz_title': attempt.daily_quiz.title,
                'correct_count': attempt.correct_count,
                'total_questions': attempt.total_questions,
                'score_percentage': attempt.score_percentage,
                'coins_earned': attempt.coins_earned,
                'completed_at': attempt.completed_at,
            })
        
        # Calculate stats
        total_attempts = attempts.count()
        total_coins_earned = sum(a.coins_earned for a in attempts)
        avg_score = sum(a.score_percentage for a in attempts) / total_attempts if total_attempts > 0 else 0
        
        return Response({
            'user_id': user_id,
            'history': history_data,
            'stats': {
                'total_attempts': total_attempts,
                'total_coins_earned': total_coins_earned,
                'average_score': round(avg_score, 2),
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
