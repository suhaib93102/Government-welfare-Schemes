# Quiz Settings Frontend Integration - Testing Guide

## Changes Made

### 1. DailyQuizScreen.tsx
**Changes:**
- Added `getQuizSettings` import from mockTestService
- Added `quizSettings` state variable
- Created `loadQuizSettings()` function that fetches settings from backend
- Updated `loadQuiz()` to use dynamic settings instead of hardcoded values
- Updated fallback values to use settings

**Dynamic Values Now Used:**
- `attempt_bonus` - from `quizSettings.daily_quiz.attempt_bonus` (default: 5)
- `coins_per_correct` - from `quizSettings.daily_quiz.coins_per_correct` (default: 5)
- `max_possible` - calculated as `attempt_bonus + (num_questions × coins_per_correct)`

### 2. MainDashboard.tsx
**Changes:**
- Added `getQuizSettings` import
- Added `quizSettings` state variable
- Created `loadQuizSettings()` function
- Updated "Earn up to X coins" text to use dynamic calculation

**Formula:**
```
Max Coins = attempt_bonus + (5 questions × coins_per_correct)
```

Example with default settings (5, 5):
```
Max Coins = 5 + (5 × 5) = 30 coins
```

## How to Test

### Step 1: Start Backend Server
```bash
cd backend
python manage.py runserver 8003
```

### Step 2: Initialize Quiz Settings (if not already done)
```bash
cd backend
./setup_quiz_settings.sh
```

### Step 3: Verify API Endpoint
```bash
curl http://127.0.0.1:8003/api/quiz/settings/
```

Expected response:
```json
{
  "success": true,
  "settings": {
    "daily_quiz": {
      "attempt_bonus": 5,
      "coins_per_correct": 5,
      "perfect_score_bonus": 10
    },
    ...
  }
}
```

### Step 4: Start Mobile App
```bash
cd EdTechMobile
npm start
# Then press 'w' for web or scan QR for mobile
```

### Step 5: Test in App

1. **Check Dashboard:**
   - Go to Main Dashboard
   - Look at Daily Quiz card
   - Should say "Answer 5 questions • Earn up to 30 coins" (if using default settings)

2. **Open Daily Quiz:**
   - Click on Daily Quiz
   - Check the reward info cards
   - Should show:
     - "+5 coins for starting" (or your configured attempt bonus)
     - "+5 coins per correct answer" (or your configured per-correct)

3. **Complete Quiz:**
   - Answer all questions
   - Check results screen
   - Verify coin breakdown matches settings

### Step 6: Test Dynamic Changes

1. **Go to Django Admin:**
   ```
   http://127.0.0.1:8003/admin/question_solver/quizsettings/
   ```

2. **Change Settings:**
   - Change `daily_quiz_attempt_bonus` to 10
   - Change `daily_quiz_coins_per_correct` to 8
   - Click Save

3. **Refresh Mobile App:**
   - Close and reopen Daily Quiz screen
   - Dashboard should now say "Earn up to 50 coins" (10 + 5×8)
   - Quiz start screen should show "+10 coins for starting"
   - Quiz should show "+8 coins per correct answer"

## Expected Behavior

### Before Admin Changes (Default: 5, 5)
- Dashboard: "Earn up to 30 coins"
- Quiz Start: "+5 coins for starting", "+5 coins per correct"
- Max Earnings: 30 coins (5 attempt + 5×5 correct)

### After Admin Changes (Example: 10, 8)
- Dashboard: "Earn up to 50 coins"
- Quiz Start: "+10 coins for starting", "+8 coins per correct"
- Max Earnings: 50 coins (10 attempt + 5×8 correct)

### After Admin Changes (Example: 15, 10)
- Dashboard: "Earn up to 65 coins"
- Quiz Start: "+15 coins for starting", "+10 coins per correct"
- Max Earnings: 65 coins (15 attempt + 5×10 correct)

## Troubleshooting

### Settings Not Updating?
1. Check if backend is running: `curl http://127.0.0.1:8003/api/quiz/settings/`
2. Check browser console for errors
3. Check that API_BASE_URL is correct in `EdTechMobile/src/config/api.ts`
4. Try force refresh: Close and reopen Daily Quiz screen

### Still Showing 35 Coins?
This was the old hardcoded value. If you still see this:
1. Clear app cache
2. Restart development server
3. Check that changes were saved in code

### API Errors?
1. Check Django server logs
2. Verify QuizSettings exists in database
3. Run setup script: `./backend/setup_quiz_settings.sh`

## Code Flow

```
1. MainDashboard loads → calls loadQuizSettings()
   ↓
2. getQuizSettings() fetches from /api/quiz/settings/
   ↓
3. Settings stored in state: quizSettings
   ↓
4. Dashboard displays: "Earn up to {calculated} coins"
   ↓
5. User opens Daily Quiz
   ↓
6. DailyQuizScreen loads → calls loadQuizSettings()
   ↓
7. getQuizSettings() fetches settings again
   ↓
8. loadQuiz() uses settings to create coins object
   ↓
9. UI displays dynamic values throughout quiz
   ↓
10. Results show earnings based on settings
```

## Files Modified

1. `/EdTechMobile/src/components/DailyQuizScreen.tsx`
   - Added quiz settings fetch
   - Updated coin calculations

2. `/EdTechMobile/src/components/MainDashboard.tsx`
   - Added quiz settings fetch
   - Updated "Earn up to X coins" display

3. `/EdTechMobile/src/services/mockTestService.ts`
   - Added `getQuizSettings()` function

4. `/backend/question_solver/daily_quiz_views.py`
   - Added `get_quiz_settings()` endpoint

5. `/backend/question_solver/urls.py`
   - Added `/api/quiz/settings/` route

## Success Criteria

✅ Dashboard shows dynamic coin amount
✅ Daily Quiz displays dynamic rewards
✅ Changing admin settings reflects in UI
✅ No hardcoded coin values in quiz flow
✅ Fallback defaults work if API fails
✅ Console shows "Loaded quiz settings: {...}"

## Next Steps

After testing, you can:
1. Adjust default values in QuizSettings model
2. Create promotional campaigns by changing settings
3. Schedule reward changes for special events
4. Monitor user engagement with different reward levels

---

Last Updated: December 20, 2024
