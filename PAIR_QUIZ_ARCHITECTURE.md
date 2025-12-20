# Pair Quiz Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAIR QUIZ ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐          ┌────────────────────────────┐
│       Device 1 (User A)    │          │       Device 2 (User B)    │
│                            │          │                            │
│  ┌──────────────────────┐  │          │  ┌──────────────────────┐  │
│  │   React Native App   │  │          │  │   React Native App   │  │
│  │                      │  │          │  │                      │  │
│  │  ┌────────────────┐  │  │          │  │  ┌────────────────┐  │  │
│  │  │ PairLobbyScreen│  │  │          │  │  │ PairLobbyScreen│  │  │
│  │  │ PairQuizScreen │  │  │          │  │  │ PairQuizScreen │  │  │
│  │  │ PairResultScreen│ │  │          │  │  │ PairResultScreen│ │  │
│  │  └────────────────┘  │  │          │  │  └────────────────┘  │  │
│  │                      │  │          │  │                      │  │
│  │  ┌────────────────┐  │  │          │  │  ┌────────────────┐  │  │
│  │  │ PairQuizContext│  │  │          │  │  │ PairQuizContext│  │  │
│  │  │  (State Mgmt)  │  │  │          │  │  │  (State Mgmt)  │  │  │
│  │  └────────────────┘  │  │          │  │  └────────────────┘  │  │
│  │           │          │  │          │  │           │          │  │
│  │           ▼          │  │          │  │           ▼          │  │
│  │  ┌────────────────┐  │  │          │  │  ┌────────────────┐  │  │
│  │  │ pairQuizSocket │  │  │          │  │  │ pairQuizSocket │  │  │
│  │  │ pairQuizApi    │  │  │          │  │  │ pairQuizApi    │  │  │
│  │  └────────────────┘  │  │          │  │  └────────────────┘  │  │
│  └──────────────────────┘  │          │  └──────────────────────┘  │
│             │               │          │             │               │
│    WebSocket│  REST API     │          │    WebSocket│  REST API     │
└─────────────┼───────┼───────┘          └─────────────┼───────┼───────┘
              │       │                                 │       │
              │       │                                 │       │
              ▼       ▼                                 ▼       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVER                                  │
│                                                                          │
│  ┌────────────────────────┐         ┌────────────────────────┐          │
│  │   Socket.IO Server     │         │   Django REST API      │          │
│  │   (socketio_server.py) │         │   (pair_quiz_views.py) │          │
│  │                        │         │                        │          │
│  │  Events:               │         │  Endpoints:            │          │
│  │  • join_session        │         │  • POST /create/       │          │
│  │  • answer_selected     │         │  • POST /join/         │          │
│  │  • next_question       │         │  • GET /<id>/          │          │
│  │  • quiz_complete       │         │  • POST /<id>/cancel/  │          │
│  │  • cancel_session      │         │                        │          │
│  │                        │         │                        │          │
│  │  Broadcasts:           │         │                        │          │
│  │  • state_update        │         │                        │          │
│  │  • partner_joined      │         │                        │          │
│  │  • partner_disconnected│         │                        │          │
│  └────────────────────────┘         └────────────────────────┘          │
│              │                                  │                        │
│              └──────────────┬───────────────────┘                        │
│                             ▼                                            │
│                  ┌────────────────────────┐                              │
│                  │   Django ORM (Models)  │                              │
│                  │                        │                              │
│                  │  PairQuizSession:      │                              │
│                  │  • session_code        │                              │
│                  │  • host_user_id        │                              │
│                  │  • partner_user_id     │                              │
│                  │  • questions           │                              │
│                  │  • host_answers        │                              │
│                  │  • partner_answers     │                              │
│                  │  • scores              │                              │
│                  │  • status              │                              │
│                  └────────────────────────┘                              │
│                             │                                            │
│                             ▼                                            │
│                  ┌────────────────────────┐                              │
│                  │   PostgreSQL/SQLite    │                              │
│                  │      (Database)        │                              │
│                  └────────────────────────┘                              │
│                                                                          │
│  ┌────────────────────────┐                                             │
│  │   Gemini AI Service    │                                             │
│  │  (Quiz Generation)     │                                             │
│  └────────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                          DATA FLOW EXAMPLE
═══════════════════════════════════════════════════════════════════════════

1. CREATE SESSION (User A)
   ┌──────────┐                    ┌──────────┐
   │ Device A │ ── POST /create → │ Backend  │
   └──────────┘                    └──────────┘
                  ← Session Code ─
                     "QZ-84K9"

2. JOIN SESSION (User B)
   ┌──────────┐                    ┌──────────┐
   │ Device B │ ── POST /join ───→ │ Backend  │
   └──────────┘    (code: QZ-84K9)  └──────────┘
                  ← Questions ─────

3. WEBSOCKET CONNECTION
   ┌──────────┐                    ┌──────────┐
   │ Device A │ ═══ WebSocket ════ │ Backend  │
   └──────────┘                    └──────────┘
   ┌──────────┐                         ║
   │ Device B │ ════════════════════════╝
   └──────────┘

4. ANSWER SELECTION (Real-time Sync)
   ┌──────────┐                    ┌──────────┐                    ┌──────────┐
   │ Device A │ ── answer_selected → │ Backend  │ ── state_update → │ Device B │
   └──────────┘                    └──────────┘                    └──────────┘
   User selects "A"                 Broadcasts                     Sees "A" selected

5. QUIZ COMPLETION
   ┌──────────┐                    ┌──────────┐                    ┌──────────┐
   │ Device A │ ── quiz_complete ─→ │ Backend  │ ── results ──────→ │ Device B │
   └──────────┘                    └──────────┘                    └──────────┘
   Score: 80%                      Calculates                     Score: 70%
                                   both scores

═══════════════════════════════════════════════════════════════════════════
                          STATE SYNCHRONIZATION
═══════════════════════════════════════════════════════════════════════════

    User A Action              Backend                User B Update
    ═════════════              ═══════                ═════════════
         │                        │                         │
         │ Answer "B"             │                         │
         ├───────────────────────>│                         │
         │                        │ Update DB               │
         │                        │ Broadcast               │
         │                        ├────────────────────────>│
         │                        │                         │ Display "B"
         │                        │                         │ Show indicator
         │                        │                         │
         │                        │        Answer "B"       │
         │                        │<────────────────────────┤
         │                        │ Update DB               │
         │ Show "Same Answer!"    │ Broadcast               │
         │<───────────────────────┤                         │
         │                        │                         │ Show "Same Answer!"
         │                        ├────────────────────────>│

═══════════════════════════════════════════════════════════════════════════
                          SESSION LIFECYCLE
═══════════════════════════════════════════════════════════════════════════

    ┌─────────────┐
    │   CREATED   │  User A creates session
    │  (waiting)  │  Session code generated: QZ-84K9
    └──────┬──────┘
           │
           │ User B joins
           ▼
    ┌─────────────┐
    │   ACTIVE    │  Both users connected
    │  (playing)  │  Real-time sync enabled
    └──────┬──────┘
           │
           │ Both complete quiz
           ▼
    ┌─────────────┐
    │  COMPLETED  │  Results displayed
    │  (results)  │  Scores compared
    └──────┬──────┘
           │
           │ 30 min expiry OR manual cleanup
           ▼
    ┌─────────────┐
    │   EXPIRED   │  Session cleaned up
    │ (cancelled) │  Resources released
    └─────────────┘

═══════════════════════════════════════════════════════════════════════════
