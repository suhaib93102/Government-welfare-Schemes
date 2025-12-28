# Quiz Rewards Admin Quick Guide

## 🎯 How to Edit Daily Quiz Rewards

### Step 1: Access Admin Panel
1. Open browser and go to: **http://127.0.0.1:8003/admin/**
2. Login with admin credentials:
   - Username: `admin`
   - Password: (see [ADMIN_CREDENTIALS.md](ADMIN_CREDENTIALS.md))

### Step 2: Navigate to Quiz Settings
1. Click on **Question Solver** section
2. Click on **Quiz Settings** 
   - If you see a list, click on the existing settings row
   - You can only have ONE settings instance (singleton)

### Step 3: Edit Reward Values

#### Daily Quiz Rewards Section
- **Daily quiz attempt bonus**: Coins awarded for starting the quiz
  - Default: `5`
  - Example: Set to `10` for double rewards
  
- **Daily quiz coins per correct**: Coins per correct answer
  - Default: `5`  
  - Example: Set to `3` to make it harder to earn

- **Daily quiz perfect score bonus**: Extra bonus for 100% score
  - Default: `10`
  - Example: Set to `20` to encourage perfect scores

#### Example Scenarios

**Weekend Bonus (Double Rewards)**
```
Attempt Bonus: 5 → 10
Coins per Correct: 5 → 10
Perfect Score Bonus: 10 → 20
```
Result: Max earnings change from 35 to 70 coins

**Encourage Participation**
```
Attempt Bonus: 5 → 15
Coins per Correct: 5 (keep same)
Perfect Score Bonus: 10 → 5
```
Result: Higher bonus just for trying, lower perfect score bonus

**Make it Harder**
```
Attempt Bonus: 5 → 2
Coins per Correct: 5 → 3
Perfect Score Bonus: 10 → 5
```
Result: Max earnings reduced to 22 coins

### Step 4: Save Changes
1. Click the blue **Save** button at the bottom
2. Changes take effect **immediately**
3. No server restart needed

### Step 5: Verify Changes
1. Open the mobile app
2. Go to Daily Quiz
3. Check the coin display shows new values
4. Or test with API: `curl http://127.0.0.1:8003/api/quiz/settings/`

## 🔧 Other Quiz Settings

### Pair Quiz Settings
- **Pair quiz enabled**: Turn pair quiz on/off
- **Pair quiz session timeout**: Minutes before session expires (default: 30)
- **Pair quiz max questions**: Maximum questions per quiz (default: 20)

### Coin System
- **Coin to currency rate**: Conversion rate (1 coin = X currency)
  - Default: `0.10` (1 coin = $0.10)
  
- **Min coins for redemption**: Minimum coins needed to redeem
  - Default: `100` coins

## 📊 Calculating Max Possible Coins

Formula for daily quiz (5 questions):
```
Max Coins = Attempt Bonus + (5 × Coins per Correct) + Perfect Score Bonus
```

Examples:
- Default: 5 + (5×5) + 10 = **40 coins**
- Weekend: 10 + (5×10) + 20 = **80 coins**
- Harder: 2 + (5×3) + 5 = **22 coins**

## ⚠️ Important Notes

1. **Only ONE settings instance**: The system prevents creating multiple settings
2. **Cannot delete settings**: Protection against accidental deletion
3. **Changes are instant**: No deployment needed
4. **Backup values**: Frontend has fallback defaults if API fails
5. **Integer values only**: Coins must be whole numbers

## 🧪 Testing Your Changes

### Option 1: Use Test Script
```bash
cd backend
python test_quiz_settings.py
```

### Option 2: Manual API Test
```bash
curl http://127.0.0.1:8003/api/quiz/settings/
```

### Option 3: Mobile App
1. Open Daily Quiz screen
2. Check displayed coin amounts
3. Complete a quiz
4. Verify coins earned match settings

## 🆘 Troubleshooting

### Changes not showing in app?
1. Force refresh the Daily Quiz screen
2. Check API response: `curl http://127.0.0.1:8003/api/quiz/settings/`
3. Verify Django server is running

### Can't access admin panel?
1. Make sure server is running: `python manage.py runserver 8003`
2. Check admin credentials in [ADMIN_CREDENTIALS.md](ADMIN_CREDENTIALS.md)
3. Create superuser if needed: `python manage.py createsuperuser`

### Settings don't exist?
Run initialization script:
```bash
cd backend
./setup_quiz_settings.sh
```

## 📚 More Information

- Full documentation: [DAILY_QUIZ_REWARDS_SYSTEM.md](../DAILY_QUIZ_REWARDS_SYSTEM.md)
- Admin credentials: [ADMIN_CREDENTIALS.md](../ADMIN_CREDENTIALS.md)
- API documentation: [API_INTEGRATION_SUMMARY.md](../API_INTEGRATION_SUMMARY.md)

## 🎯 Quick Commands

```bash
# Start Django server
cd backend
python manage.py runserver 8003

# Initialize settings
./setup_quiz_settings.sh

# Test settings endpoint
python test_quiz_settings.py

# Access admin panel
open http://127.0.0.1:8003/admin/
```
