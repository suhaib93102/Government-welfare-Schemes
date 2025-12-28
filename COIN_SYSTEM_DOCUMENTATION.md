# Coin System Documentation

## Overview
The coin system rewards users for completing quizzes and other educational activities. All coin calculations are performed **server-side** to ensure security and prevent manipulation.

## Architecture

### Database Models

#### UserCoins Model
```python
class UserCoins(models.Model):
    id = UUIDField(primary_key=True)
    user_id = CharField(max_length=255, unique=True)  # User identifier
    total_coins = IntegerField(default=0)              # Current balance
    lifetime_coins = IntegerField(default=0)          # Total ever earned
    coins_spent = IntegerField(default=0)             # Total spent
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

#### CoinTransaction Model
```python
class CoinTransaction(models.Model):
    id = UUIDField(primary_key=True)
    user_coins = ForeignKey(UserCoins)
    amount = IntegerField()                           # Positive or negative
    transaction_type = CharField(choices=[
        'earn', 'spend', 'bonus', 'refund'
    ])
    reason = CharField(max_length=255)                # Description
    created_at = DateTimeField(auto_now_add=True)
```

## Daily Quiz Coin Flow

### 1. Quiz Start (Participation Bonus)
**Endpoint:** `POST /api/daily-quiz/start/`

**Request:**
```json
{
  "user_id": "user123",
  "quiz_id": "quiz-uuid"
}
```

**Server-Side Logic:**
```python
# Award participation bonus: 5 coins
attempt_bonus = 5

with transaction.atomic():
    # Get or create UserCoins record
    user_coins, _ = UserCoins.objects.get_or_create(
        user_id=user_id,
        defaults={'total_coins': 0, 'lifetime_coins': 0}
    )
    
    # Add coins using model method (automatically creates transaction log)
    user_coins.add_coins(
        amount=attempt_bonus,
        reason=f"Started Daily Quiz: {quiz.title}"
    )
    
    # Create quiz attempt record
    attempt = UserDailyQuizAttempt.objects.create(
        user_id=user_id,
        daily_quiz=quiz,
        coins_earned=attempt_bonus
    )
```

**Response:**
```json
{
  "success": true,
  "message": "You earned 5 coins for starting the Daily Quiz.",
  "quiz_id": "quiz-uuid",
  "coins_awarded": 5
}
```

### 2. Quiz Submission (Performance Rewards)
**Endpoint:** `POST /api/daily-quiz/submit/`

**Request:**
```json
{
  "user_id": "user123",
  "quiz_id": "quiz-uuid",
  "answers": {
    "1": 0,  // Question 1: selected option index 0
    "2": 2,  // Question 2: selected option index 2
    "3": 1   // Question 3: selected option index 1
  },
  "time_taken_seconds": 120
}
```

**Server-Side Calculation:**
```python
# Constants
ATTEMPT_BONUS = 5  # Already awarded at start
PER_CORRECT = 5    # Coins per correct answer

# Calculate correct answers
questions = DailyQuestion.objects.filter(daily_quiz=quiz).order_by('order')[:5]
correct_count = 0

for idx, question in enumerate(questions, 1):
    user_answer_index = answers.get(str(idx))
    if user_answer_index is not None:
        options = question.options
        user_answer = options[user_answer_index]
        if user_answer == question.correct_answer:
            correct_count += 1

# Calculate coins (only for correct answers, attempt bonus already given)
coins_from_correct = correct_count * PER_CORRECT
max_possible = ATTEMPT_BONUS + (len(questions) * PER_CORRECT)

# Persist to database
with transaction.atomic():
    user_coins, _ = UserCoins.objects.get_or_create(user_id=user_id)
    
    # Add coins for correct answers
    if coins_from_correct > 0:
        user_coins.add_coins(
            amount=coins_from_correct,
            reason=f"Answered {correct_count} questions correctly in Daily Quiz"
        )
    
    # Update attempt record
    attempt.correct_count = correct_count
    attempt.total_questions = len(questions)
    attempt.score_percentage = (correct_count / len(questions) * 100)
    attempt.coins_earned += coins_from_correct  # Add to initial attempt bonus
    attempt.completed_at = timezone.now()
    attempt.save()
```

**Response:**
```json
{
  "success": true,
  "message": "🎉 Quiz completed! You earned 20 coins!",
  "result": {
    "correct_count": 3,
    "total_questions": 5,
    "score_percentage": 60.0,
    "coins_earned": 20,  // 5 (start) + 15 (3 correct × 5)
    "time_taken_seconds": 120,
    "attempt_bonus": 5,
    "per_correct": 5,
    "max_possible": 30  // 5 + (5 × 5)
  },
  "coin_breakdown": {
    "attempt_bonus": 0,  // Already awarded
    "correct_answers": 3,
    "coins_per_correct": 5,
    "correct_answer_coins": 15,
    "total_earned": 20
  },
  "results": [
    {
      "question_id": 1,
      "question": "Question text here?",
      "your_answer": "Option A",
      "correct_answer": "Option A",
      "is_correct": true,
      "explanation": "Explanation here",
      "fun_fact": "Fun fact here"
    }
    // ... more results
  ],
  "total_coins": 120,  // User's new total balance
  "show_coin_animation": true
}
```

## Profile API Integration

**Endpoint:** `GET /api/profile/`  
**Headers:** `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "date_joined": "2025-01-01T00:00:00Z",
    "coins": 120  // Current coin balance from UserCoins model
  }
}
```

## Get User Coins & Transaction History

**Endpoint:** `GET /api/daily-quiz/coins/?user_id=user123`

**Response:**
```json
{
  "user_id": "user123",
  "total_coins": 120,
  "lifetime_coins": 500,
  "coins_spent": 380,
  "recent_transactions": [
    {
      "amount": 15,
      "type": "earn",
      "reason": "Answered 3 questions correctly in Daily Quiz",
      "created_at": "2025-12-20T10:30:00Z"
    },
    {
      "amount": 5,
      "type": "earn",
      "reason": "Started Daily Quiz: Daily GK Quiz - December 20, 2025",
      "created_at": "2025-12-20T10:28:00Z"
    }
    // ... up to 10 recent transactions
  ]
}
```

## Security Features

### 1. Server-Side Validation
- All coin calculations performed on backend
- Answers validated against database-stored correct answers
- No client-side coin manipulation possible

### 2. Atomic Transactions
```python
with transaction.atomic():
    # All coin operations in a single database transaction
    # Ensures data consistency (all-or-nothing)
    user_coins.add_coins(amount, reason)
    attempt.save()
```

### 3. Audit Trail
- Every coin transaction logged in `CoinTransaction` table
- Includes: amount, type, reason, timestamp
- Enables debugging and fraud detection

### 4. Idempotency
- Quiz attempts tracked in `UserDailyQuizAttempt`
- Prevents duplicate submissions
- Returns existing result if already completed

## Example: Complete Quiz Flow

### User Journey (20 questions, 15 correct)

1. **User starts quiz**
   - Server creates attempt record
   - Awards 5 coins immediately
   - User balance: 0 → 5 coins
   - Transaction logged: "Started Daily Quiz"

2. **User answers 20 questions (15 correct)**
   - Client submits all answers
   - Server validates each answer server-side
   - Calculates: 15 correct × 5 coins = 75 coins

3. **Server persists results**
   ```python
   coins_from_correct = 75
   total_earned = 5 (attempt) + 75 (correct) = 80 coins
   
   user_coins.add_coins(75, "Answered 15 questions correctly")
   attempt.coins_earned = 80
   attempt.save()
   ```

4. **User receives response**
   ```json
   {
     "coins_earned": 80,
     "coin_breakdown": {
       "attempt_bonus": 5,
       "correct_answer_coins": 75,
       "total_earned": 80
     },
     "total_coins": 85  // Previous balance + new coins
   }
   ```

5. **Profile shows updated balance**
   - GET /api/profile/ returns `"coins": 85`
   - All frontends display synchronized balance

## Extending to Other Quiz Types

To add coin rewards to Mock Tests, Pair Quiz, or other quiz types:

1. **Create similar models** (e.g., `MockTestAttempt`)
2. **Define coin rules** (e.g., 2 coins per correct, 10 for completion)
3. **Implement server-side calculation** in submit endpoint
4. **Use `user_coins.add_coins()`** for atomic persistence
5. **Return coin breakdown** in API response

### Example Mock Test Implementation:
```python
@api_view(['POST'])
def submit_mock_test(request):
    # ... validate input ...
    
    # Server-side scoring
    correct_count = calculate_correct_answers(questions, answers)
    
    # Define rewards
    COMPLETION_BONUS = 10
    PER_CORRECT = 2
    
    total_coins = COMPLETION_BONUS + (correct_count * PER_CORRECT)
    
    # Persist atomically
    with transaction.atomic():
        user_coins, _ = UserCoins.objects.get_or_create(user_id=user_id)
        user_coins.add_coins(total_coins, f"Completed Mock Test: {test.title}")
        
        MockTestAttempt.objects.create(
            user_id=user_id,
            test=test,
            score=score,
            coins_earned=total_coins
        )
    
    return Response({
        'coins_earned': total_coins,
        'total_coins': user_coins.total_coins
    })
```

## Best Practices

1. **Always calculate server-side** - Never trust client calculations
2. **Use atomic transactions** - Prevent partial updates
3. **Log all transactions** - Enable auditing and debugging
4. **Return updated balance** - Keep frontend synchronized
5. **Define clear rules** - Document coin amounts for each action
6. **Validate quiz completion** - Prevent duplicate submissions
7. **Use model methods** - `add_coins()` and `spend_coins()` ensure consistency

## API Endpoints Summary

| Endpoint | Method | Purpose | Coins Awarded |
|----------|--------|---------|---------------|
| `/api/daily-quiz/start/` | POST | Start daily quiz | +5 (attempt bonus) |
| `/api/daily-quiz/submit/` | POST | Submit answers | +5 per correct |
| `/api/daily-quiz/coins/` | GET | Get coin balance | N/A |
| `/api/profile/` | GET | User profile with coins | N/A |

## Conclusion

The coin system is **fully server-side**, ensuring:
- ✅ Security against manipulation
- ✅ Accurate calculation based on actual performance
- ✅ Persistent storage in user profile
- ✅ Real-time balance updates
- ✅ Complete audit trail
- ✅ Atomic transaction safety
