# Pair Quiz Feature - Real-Time Collaborative Quiz

## Overview

Pair Quiz is a real-time collaborative quiz mode where two users connect, attempt the same questions simultaneously, and see live updates of each other's progress. The feature uses WebSocket (Socket.IO) for real-time synchronization.

## Architecture

### Backend (Django + Socket.IO)

#### Models
- **PairQuizSession**: Stores session data, participant info, questions, answers, scores, and timestamps
- Auto-expires after 30 minutes
- Supports status tracking: waiting, active, completed, cancelled

#### REST API Endpoints
- `POST /api/pair-quiz/create/` - Create new session
- `POST /api/pair-quiz/join/` - Join existing session
- `GET /api/pair-quiz/<session_id>/` - Get session details
- `POST /api/pair-quiz/<session_id>/cancel/` - Cancel session

#### WebSocket Events (Socket.IO)

**Client → Server:**
- `join_session` - Join a session room
- `answer_selected` - Submit an answer
- `next_question` - Navigate to next question
- `quiz_complete` - Mark quiz as completed
- `update_timer` - Sync timer
- `cancel_session` - Cancel the session

**Server → Client:**
- `connected` - Connection acknowledged
- `session_joined` - Successfully joined session
- `partner_joined` - Partner has joined
- `partner_disconnected` - Partner disconnected
- `state_update` - Real-time state changes

### Frontend (React Native)

#### Services
- **pairQuizSocket.ts**: Socket.IO client with auto-reconnect
- **pairQuizApi.ts**: REST API calls
- **pairQuizContext.tsx**: React Context for state management

#### Components
- **PairLobbyScreen**: Create/Join session interface
- **PairQuizScreen**: Real-time quiz with sync indicators
- **PairResultScreen**: Side-by-side score comparison
- **PairQuizContainer**: Navigation controller

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install python-socketio redis

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start server with ASGI (required for WebSockets)
uvicorn edtech_project.asgi:application --host 0.0.0.0 --port 8003
```

### 2. Frontend Setup

```bash
cd EdTechMobile

# Install dependencies
npm install socket.io-client

# Start app
npm start
```

### 3. Environment Configuration

Create `.env` file in `EdTechMobile/`:
```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8003/api
```

## Usage Flow

### Creating a Session

1. User A opens Pair Quiz
2. Selects "Create Session"
3. Configures quiz (subject, difficulty, # questions)
4. System generates questions via Gemini API
5. Session code displayed (e.g., "QZ-84K9")
6. User A shares code with User B

### Joining a Session

1. User B opens Pair Quiz
2. Selects "Join Session"
3. Enters session code
4. System validates and connects both users

### During Quiz

**Real-Time Sync:**
- Answer selections appear instantly for both users
- Partner activity indicators show who answered
- Visual highlights for matching answers
- Synchronized question navigation
- Live timer

**UI Indicators:**
- ✅ "Answered" badge when user submits
- 👥 Partner's selected option (dashed border)
- 🤝 "Same Answer" notification
- ⏱️ Shared timer display

### Results

**Side-by-Side Comparison:**
- Overall scores (percentage)
- Time taken by each user
- Question-by-question breakdown
- Correct answer highlights
- Winner announcement
- Detailed explanations

## Real-Time State Model

```typescript
{
  sessionId: string,
  sessionCode: string,      // e.g., "QZ-84K9"
  status: "waiting" | "active" | "completed" | "cancelled",
  hostUserId: string,
  partnerUserId: string,
  quizConfig: {
    subject: string,
    difficulty: "easy" | "medium" | "hard",
    numQuestions: number
  },
  questions: Array<{
    question_text: string,
    options: string[],
    correct_answer: string,
    explanation?: string
  }>,
  currentQuestionIndex: number,
  hostAnswers: { [index: number]: string },
  partnerAnswers: { [index: number]: string },
  timerSeconds: number,
  hostScore: number,
  partnerScore: number,
  hostTimeTaken: number,
  partnerTimeTaken: number
}
```

## Conflict Resolution

**Last-Write-Wins Strategy:**
- Server maintains authoritative state
- Client updates are optimistic (instant local update)
- Server broadcasts to all participants
- If conflict, server state takes precedence

**Network Failure Handling:**
- Auto-reconnect with exponential backoff
- Session state restored from server
- "Connection Lost" banner displayed
- Partner notified of disconnection

## Session Management

**Automatic Cleanup:**
- Sessions expire after 30 minutes
- Status set to "cancelled" on expiry
- Database cleanup via periodic task (recommended)

**Manual Cancellation:**
- Either user can cancel
- Partner receives notification
- Both users redirected to lobby

## Security Considerations

1. **Session Codes**: 6-character alphanumeric (3.6M combinations)
2. **Expiration**: 30-minute TTL prevents abandoned sessions
3. **User Verification**: Session participants tracked by user ID
4. **Input Validation**: All WebSocket messages validated
5. **Rate Limiting**: (Recommended) Implement on Socket.IO events

## Testing Scenarios

### Happy Path
1. User A creates session
2. User B joins with correct code
3. Both answer all questions
4. View results comparison

### Edge Cases
1. **Partner Leaves Mid-Quiz**: Other user notified, quiz cancelled
2. **Network Interruption**: Auto-reconnect, state restored
3. **Expired Session**: Join attempt rejected with friendly error
4. **Full Session**: Third user cannot join
5. **Both Submit Simultaneously**: Server handles concurrency

### Multi-Device Testing

```bash
# Terminal 1: Backend
cd backend
uvicorn edtech_project.asgi:application --host 0.0.0.0 --port 8003

# Terminal 2: Device 1
cd EdTechMobile
npm start -- --host 192.168.1.100

# Terminal 3: Device 2
# Connect to same network
# Scan QR code or enter URL
```

## Performance Optimization

1. **Message Batching**: Group frequent updates (timer)
2. **Selective Broadcasting**: Use Socket.IO rooms
3. **Payload Compression**: Enable on production
4. **Connection Pooling**: Redis adapter for horizontal scaling

## Troubleshooting

### WebSocket Connection Fails
- Check CORS settings in `asgi.py`
- Verify firewall allows WebSocket traffic
- Ensure server running with ASGI (uvicorn/daphne)

### State Desync
- Check server logs for WebSocket errors
- Verify client event listeners are registered
- Test with `socket.io` debug mode enabled

### Session Not Found
- Session may have expired (30min TTL)
- Verify session code format (QZ-XXXX)
- Check database for session record

## Future Enhancements

1. **Multiple Participants**: 3-4 player support
2. **Spectator Mode**: Watch live quizzes
3. **Tournament Mode**: Bracket-style competitions
4. **Chat Integration**: Real-time messaging
5. **Replay System**: Review past sessions
6. **Leaderboards**: Global rankings
7. **Custom Time Limits**: Per-question timers
8. **Penalties**: Incorrect answer deductions

## API Documentation

### Create Session
```typescript
POST /api/pair-quiz/create/
{
  "userId": "user123",
  "quizConfig": {
    "subject": "Mathematics",
    "difficulty": "medium",
    "numQuestions": 10
  }
}

Response:
{
  "sessionId": "uuid",
  "sessionCode": "QZ-84K9",
  "status": "waiting",
  ...
}
```

### Join Session
```typescript
POST /api/pair-quiz/join/
{
  "userId": "user456",
  "sessionCode": "QZ-84K9"
}

Response:
{
  "sessionId": "uuid",
  "sessionCode": "QZ-84K9",
  "status": "active",
  "questions": [...],
  ...
}
```

### WebSocket Connection
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8003', {
  transports: ['websocket', 'polling']
});

socket.emit('join_session', {
  sessionId: 'uuid',
  userId: 'user123'
});

socket.on('state_update', (data) => {
  console.log('State updated:', data);
});
```

## Dependencies

**Backend:**
- Django 5.0.0
- python-socketio 5.11.0
- redis 5.0.1
- google-generativeai (for Gemini quiz generation)

**Frontend:**
- socket.io-client 4.8.1
- React Native 0.81.5
- @react-native-async-storage/async-storage 2.1.0
- @expo/vector-icons 15.0.3

## License

Part of EdTech Mobile application.
