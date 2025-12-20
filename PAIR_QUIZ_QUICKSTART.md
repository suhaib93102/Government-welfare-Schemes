# Pair Quiz - Quick Start Guide

## 🎯 What is Pair Quiz?

Pair Quiz allows two users to take quizzes together in real-time. You see your partner's answers instantly, compete for the highest score, and compare results side-by-side.

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies

```bash
# From project root
bash setup_pair_quiz.sh
```

### Step 2: Start Backend

```bash
cd backend
source venv/bin/activate

# Install uvicorn if needed
pip install uvicorn[standard]

# Start server
uvicorn edtech_project.asgi:application --host 0.0.0.0 --port 8003
```

### Step 3: Start Frontend

```bash
cd EdTechMobile
npm start
```

## 📱 How to Use

### Create a Pair Quiz

1. Open the app
2. Tap **"Pair Quiz"** in the navigation menu
3. Tap **"Create Session"**
4. Configure your quiz:
   - Subject (e.g., "Mathematics")
   - Difficulty (Easy/Medium/Hard)
   - Number of questions (5, 10, 15, or 20)
5. Tap **"Create Session"**
6. Share the session code (e.g., **QZ-84K9**) with your partner

### Join a Pair Quiz

1. Open the app
2. Tap **"Pair Quiz"** in the navigation menu
3. Tap **"Join Session"**
4. Enter the session code your partner shared
5. Tap **"Join Session"**
6. Wait for quiz to start

### During the Quiz

- **Answer questions:** Tap your choice
- **Watch your partner:** See their selections in real-time
- **Navigation:** Tap "Next Question" when ready
- **Live indicators:**
  - ✅ Green badge = You answered
  - 👥 Blue border = Partner's choice
  - 🤝 Notification when you pick the same answer

### View Results

After completing all questions:
- See your score vs partner's score
- View time taken by each person
- Compare answers question-by-question
- See correct answers with explanations
- Winner announcement

## 🎮 Example Session

```
User A (Alice):
1. Creates session → Gets code "QZ-84K9"
2. Shares code with Bob
3. Waits in lobby

User B (Bob):
1. Enters code "QZ-84K9"
2. Joins session

Both Users:
3. Quiz starts automatically
4. Answer questions together
5. See each other's choices in real-time
6. View results side-by-side
```

## 🔍 Testing

### Quick Test

```bash
# Terminal 1: Start backend
cd backend
uvicorn edtech_project.asgi:application --port 8003

# Terminal 2: Start frontend
cd EdTechMobile
npm start

# Terminal 3: Run API test
cd backend
node test_pair_quiz.js
```

### Two-Device Testing

1. Start backend on local network: `--host 0.0.0.0`
2. Note your IP address: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
3. Update `.env`: `EXPO_PUBLIC_API_URL=http://<YOUR_IP>:8003/api`
4. Scan QR code on both devices
5. Create session on Device 1
6. Join session on Device 2

## ⚠️ Troubleshooting

### "Connection Lost" Error
- Check if backend is running
- Verify API URL in `.env`
- Check firewall settings

### "Invalid Session Code"
- Verify code is correct (case-sensitive)
- Check if session expired (30 min limit)
- Try creating a new session

### Partner Not Joining
- Confirm both users on same server
- Verify session code shared correctly
- Check network connectivity

### Questions Not Loading
- Ensure Gemini API key is configured
- Check backend logs for errors
- Verify quiz configuration is valid

## 📚 Key Features

✅ **Real-Time Sync:** See partner's answers instantly  
✅ **Auto-Reconnect:** Network failures handled gracefully  
✅ **Session Codes:** Easy sharing with 6-character codes  
✅ **Score Comparison:** Side-by-side results view  
✅ **Mobile Responsive:** Works on phones, tablets, and web  
✅ **Time Tracking:** Individual timing for each user  
✅ **Answer Explanations:** Learn from correct answers  

## 🎯 Tips for Best Experience

1. **Use on same network:** Faster sync on local WiFi
2. **Stable connection:** WiFi recommended over cellular
3. **Communicate:** Use phone/video call alongside quiz
4. **Take your time:** No rush, quiz is fully synchronized
5. **Review results:** Learn from explanations together

## 📖 Full Documentation

For detailed information, see:
- **PAIR_QUIZ_FEATURE.md** - Complete feature documentation
- **PAIR_QUIZ_IMPLEMENTATION_SUMMARY.md** - Technical implementation details

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review backend logs: Terminal running uvicorn
3. Check browser console: F12 → Console tab
4. Verify all dependencies installed correctly

## 🎉 Enjoy!

Have fun competing with your friends in real-time quizzes!
