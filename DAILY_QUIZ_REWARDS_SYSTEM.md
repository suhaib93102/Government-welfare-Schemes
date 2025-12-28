# Daily Quiz Rewards System - Admin Editable Configuration

## Overview
The daily quiz reward system has been updated to allow administrators to edit coin rewards in real-time through the Django admin panel, instead of using hardcoded values.

## Backend Implementation

### 1. Database Model
**File**: [backend/question_solver/models.py](backend/question_solver/models.py#L563)

The `QuizSettings` model (singleton pattern) stores all quiz-related configuration:

```python
class QuizSettings(models.Model):
    # Daily Quiz Coin Settings
    daily_quiz_attempt_bonus = models.IntegerField(default=5)
    daily_quiz_coins_per_correct = models.IntegerField(default=5)
    daily_quiz_perfect_score_bonus = models.IntegerField(default=10)
    
    # Pair Quiz Settings
    pair_quiz_enabled = models.BooleanField(default=True)
    pair_quiz_session_timeout = models.IntegerField(default=30)
    pair_quiz_max_questions = models.IntegerField(default=20)
    
    # Coin System
    coin_to_currency_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.10)
    min_coins_for_redemption = models.IntegerField(default=100)
    
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)
```

### 2. Django Admin Interface
**File**: [backend/question_solver/admin.py](backend/question_solver/admin.py#L348)

The admin interface is already configured with organized fieldsets:

- **Daily Quiz Rewards**: Controls coin amounts for quiz participation and correct answers
- **Pair Quiz Settings**: Manages pair quiz behavior
- **Coin System**: Currency conversion and redemption settings
- **Metadata**: Shows when settings were last updated

**Admin Access**: `http://127.0.0.1:8003/admin/question_solver/quizsettings/`

### 3. API Endpoint
**File**: [backend/question_solver/daily_quiz_views.py](backend/question_solver/daily_quiz_views.py)

#### New Endpoint: `GET /api/quiz/settings/`

Returns current quiz settings in real-time:

```json
{
  "success": true,
  "settings": {
    "daily_quiz": {
      "attempt_bonus": 5,
      "coins_per_correct": 5,
      "perfect_score_bonus": 10
    },
    "pair_quiz": {
      "enabled": true,
      "session_timeout": 30,
      "max_questions": 20
    },
    "coin_system": {
      "coin_to_currency_rate": 0.10,
      "min_coins_for_redemption": 100
    }
  },
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 4. Updated Quiz Views

The following endpoints now use `QuizSettings.get_settings()` instead of hardcoded values:

- `get_daily_quiz()` - Returns dynamic coin rewards in quiz metadata
- `start_daily_quiz()` - Awards attempt bonus from settings
- `submit_daily_quiz()` - Calculates coins earned using settings values

## Frontend Integration

### Service Layer
**File**: [EdTechMobile/src/services/mockTestService.ts](EdTechMobile/src/services/mockTestService.ts)

New function added:

```typescript
export const getQuizSettings = async (): Promise<any> => {
  // Fetches settings from /api/quiz/settings/
  // Returns default values as fallback if API fails
}
```

### DailyQuizScreen
**File**: [EdTechMobile/src/components/DailyQuizScreen.tsx](EdTechMobile/src/components/DailyQuizScreen.tsx)

The screen already uses dynamic values from the API response:

- Coin display: `quizData.coins?.attempt_bonus` and `quizData.coins?.per_correct_answer`
- Reward info cards show dynamic amounts
- Result screens calculate earnings using API-provided values
- Language support (Hindi/English) shows translated reward messages with dynamic amounts

## How to Edit Rewards as Admin

### Step 1: Access Django Admin
1. Navigate to: `http://127.0.0.1:8003/admin/`
2. Login with admin credentials (see [ADMIN_CREDENTIALS.md](ADMIN_CREDENTIALS.md))

### Step 2: Edit Quiz Settings
1. Go to **Question Solver** → **Quiz Settings**
2. Update any of these fields:
   - **Daily quiz attempt bonus**: Coins for starting the quiz (default: 5)
   - **Daily quiz coins per correct**: Coins per correct answer (default: 5)
   - **Daily quiz perfect score bonus**: Extra bonus for 100% score (default: 10)
3. Click **Save**

### Step 3: Changes Take Effect Immediately
- No server restart required
- Next API call will fetch updated values
- Mobile app will display new reward amounts automatically
- Users starting new quiz sessions will see updated coin rewards

## Example Use Cases

### Scenario 1: Weekend Bonus Event
Admin wants to double rewards for weekend:
1. Change `daily_quiz_attempt_bonus` from 5 → 10
2. Change `daily_quiz_coins_per_correct` from 5 → 10
3. Save changes
4. All users immediately see "Earn up to 60 coins!" instead of 30

### Scenario 2: Promotional Campaign
Encourage participation with higher attempt bonus:
1. Change `daily_quiz_attempt_bonus` from 5 → 15
2. Keep `daily_quiz_coins_per_correct` at 5
3. Users see "+15 coins for starting" in the UI

### Scenario 3: Difficulty Adjustment
Reduce rewards for easier quizzes:
1. Change `daily_quiz_coins_per_correct` from 5 → 3
2. Adjust `daily_quiz_attempt_bonus` to 2
3. Max possible coins becomes 17 instead of 30

## Technical Benefits

1. **No Code Deployment**: Admins can change rewards without developer intervention
2. **Real-Time Updates**: Changes reflect immediately in API responses
3. **Centralized Control**: Single source of truth for all quiz settings
4. **Audit Trail**: `updated_at` field tracks when changes were made
5. **Fallback Safety**: Frontend has default values if API fails
6. **Type Safety**: Backend validates integer fields, prevents invalid values

## Migration Status

✅ **Backend**: Fully implemented
✅ **API Endpoint**: Created and tested
✅ **Admin Interface**: Already configured
✅ **Frontend Service**: getQuizSettings() function added
✅ **Dynamic Display**: DailyQuizScreen uses API values

## Testing

### Backend Test
```bash
# Test the settings endpoint
curl http://127.0.0.1:8003/api/quiz/settings/
```

### Admin Test
1. Login to admin: http://127.0.0.1:8003/admin/
2. Edit Quiz Settings
3. Verify changes in API response

### Frontend Test
1. Open Daily Quiz screen
2. Check displayed coin amounts
3. Verify they match admin settings
4. Complete a quiz and verify coins earned

## Future Enhancements

Potential additions:
- Time-based reward schedules (different rewards for different times of day)
- User-tier based rewards (premium users get more coins)
- Streak bonuses (consecutive days played)
- Admin dashboard to view reward impact analytics
- A/B testing different reward structures

## Related Files

- Backend Model: [backend/question_solver/models.py#L563](backend/question_solver/models.py#L563)
- Backend Views: [backend/question_solver/daily_quiz_views.py](backend/question_solver/daily_quiz_views.py)
- Backend Admin: [backend/question_solver/admin.py#L348](backend/question_solver/admin.py#L348)
- Backend URLs: [backend/question_solver/urls.py](backend/question_solver/urls.py)
- Frontend Service: [EdTechMobile/src/services/mockTestService.ts](EdTechMobile/src/services/mockTestService.ts)
- Frontend UI: [EdTechMobile/src/components/DailyQuizScreen.tsx](EdTechMobile/src/components/DailyQuizScreen.tsx)
