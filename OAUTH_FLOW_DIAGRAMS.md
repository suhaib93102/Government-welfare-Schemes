# Google OAuth Authentication Flow - Visual Guide

## 📊 OAuth 2.0 Flow Diagram

```
┌─────────────┐                                     ┌──────────────────┐
│   Mobile    │                                     │  Google OAuth    │
│   App       │                                     │  Server          │
│  (Frontend) │                                     │  (accounts.google.com)
└──────┬──────┘                                     └──────────────────┘
       │                                                    │
       │  1. User clicks "Sign in with Google"             │
       ├───────────────────────────────────────────────────>
       │                                                    │
       │                                    2. Redirect to Google login
       │  3. User enters credentials & authorizes       │
       │                                                    │
       │  4. Google returns Authorization Code            │
       │<───────────────────────────────────────────────────
       │
       │  5. Send Code to Backend (secure)
       ├────────────────────────────────────┐
       │                                    │
       │                            ┌───────▼──────────────────┐
       │                            │   Backend Server         │
       │                            │   (localhost:8003)       │
       │                            │                          │
       │                            │  POST /auth/google/      │
       │                            │        callback/         │
       │                            └───────┬──────────────────┘
       │                                    │
       │                    6. Exchange code for tokens
       │                       (using Client ID/Secret)
       │                                    │
       │                            ┌───────▼──────────────────┐
       │                            │  Google Token Server     │
       │                            │  oauth2.googleapis.com   │
       │                            └───────┬──────────────────┘
       │                                    │
       │                 7. Return: Access Token + ID Token
       │                                    │
       │                            ┌───────▼──────────────────┐
       │                            │  Decode ID Token         │
       │                            │  Get User Info           │
       │                            │  Create/Update User      │
       │                            │  Generate JWT Tokens     │
       │                            └───────┬──────────────────┘
       │
       │<─── 8. Return JWT Access/Refresh Tokens ──────────┤
       │     + User Info                                   │
       │
       │  ✅ User Logged In!
       │  Store tokens in secure storage

```

---

## 🔄 Token Management & API Calls

```
┌──────────────────────────────────────────────────────────────────┐
│                    API Call with Authorization                   │
└──────────────────────────────────────────────────────────────────┘

User makes request:

  GET /api/quiz/generate/
  Header: Authorization: Bearer <ACCESS_TOKEN>
                                 ↓
                    ┌────────────────────┐
                    │  Token Valid &     │
                    │  Not Expired?      │
                    └────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                  YES                NO
                    │                 │
            ┌───────▼────────┐  ┌─────▼──────────────┐
            │ Process        │  │ Token Expired      │
            │ Request        │  │ Use Refresh Token  │
            │ Return Data    │  │ Get New Access     │
            └────────────────┘  │ Token              │
                                │ Retry Request      │
                                └────────────────────┘

```

---

## 📱 Frontend Flow: Login Screen

```
┌─────────────────────────────────────────┐
│          AuthScreen Component           │
└─────────────────────────────────────────┘
         │                    │
    ┌────▼─────────┐   ┌─────▼─────────┐
    │  Google      │   │  Email/       │
    │  Sign In     │   │  Password     │
    └────┬─────────┘   └─────┬─────────┘
         │                    │
         │                    ├─► Email field
         │                    ├─► Password field
         │                    └─► Confirm password
         │
         ├─► WebBrowser.openAuthSessionAsync()
         │   ↓
         ├─► User sees Google login
         │   ↓
         ├─► Extract authorization code
         │   ↓
         ├─► POST /api/auth/google/callback/
         │   (+ authorization code)
         │   ↓
         └─► Receive JWT tokens
             ↓
         ✅ Store in secure storage
             ↓
         ✅ Set user context
             ↓
         ✅ Redirect to main app

```

---

## 🗄️ Database Schema

```
┌─────────────────────────────┐
│     Django User Model       │
├─────────────────────────────┤
│ id (PrimaryKey)             │
│ username (unique)           │
│ email (unique)              │
│ password (hashed)           │
│ first_name                  │
│ last_name                   │
│ date_joined                 │
│ is_active                   │
│ oauth_provider (custom)     │
│   ↓ (google/email)          │
└─────────────────────────────┘
         │
         ├─► UserSubscription (plan info)
         │
         ├─► Payment (transactions)
         │
         └─► FeatureUsageLog (usage tracking)

```

---

## 🔑 Environment Variables Setup

```
.env File Structure:

┌─────────────────────────────────────────┐
│      Backend Configuration              │
├─────────────────────────────────────────┤
│  GOOGLE_OAUTH_CLIENT_ID                 │  ← From Google Cloud
│  GOOGLE_OAUTH_CLIENT_SECRET             │  ← From Google Cloud
│  GOOGLE_OAUTH_REDIRECT_URI              │  ← Backend callback URL
│  FRONTEND_REDIRECT_URI                  │  ← Frontend URL
│                                         │
│  JWT_SECRET                             │  ← Generate with: 
│                                         │     openssl rand -hex 32
│  JWT_ALGORITHM                          │  ← HS256
│  JWT_EXPIRATION_HOURS                   │  ← 24
│  REFRESH_TOKEN_EXPIRATION_DAYS          │  ← 7
│                                         │
│  (Other existing configs)               │
│  GEMINI_API_KEY                         │
│  YOUTUBE_API_KEY                        │
│  etc.                                   │
└─────────────────────────────────────────┘

```

---

## 🚀 Deployment Architecture (Production)

```
┌──────────────────────────────────────────────────────────────┐
│                  Production Deployment                       │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Users (HTTPS)  │
└────────┬────────┘
         │
    ┌────▼────────────────────────────┐
    │   Cloudflare / CDN              │
    │   (HTTPS + Caching)             │
    └────┬────────────────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │   Load Balancer                   │
    └────┬──────────────────────────────┘
         │
    ┌────┴──────────────────┐
    │                       │
┌───▼────────────┐   ┌─────▼────────────┐
│  Frontend      │   │  Backend API     │
│  (Vercel /     │   │  (Heroku /       │
│   Netlify)     │   │   PythonAnywhere)│
│                │   │                  │
│ localhost:3000 │   │ yourdomain.com   │
└────────────────┘   │ /api/            │
                     └────┬─────────────┘
                          │
                    ┌─────▼──────────┐
                    │  PostgreSQL    │
                    │  Database      │
                    └────────────────┘

OAuth Redirect URIs:
- Frontend: https://yourdomain.com
- Backend: https://yourdomain.com/api/auth/google/callback/

```

---

## 🔐 Token Lifecycle

```
Timeline (assuming 24-hour access, 7-day refresh)

Day 1 (Login):
  Hour 0:  Create Access Token (expires in 24h)
  Hour 0:  Create Refresh Token (expires in 7d)
           ✅ Both tokens stored securely

Day 1-23:
  API calls use Access Token
  ✅ All requests work normally

Day 2 (24h later):
  Access Token expires ❌
  App detects expiry
  Sends Refresh Token to server
  ✅ Get new Access Token
  ✅ Continue working

Day 7:
  Refresh Token expires ❌
  User must log in again ✅

```

---

##  Security Checklist

```
✅ Client Secret never exposed to frontend
✅ Tokens stored in secure device storage
✅ Access tokens have short expiration (24h)
✅ Refresh tokens have longer expiration (7d)
✅ All OAuth redirects use HTTPS (production)
✅ CORS properly configured
✅ JWT signature verification
✅ Password hashing (bcrypt/PBKDF2)
✅ Rate limiting on auth endpoints
✅ Session timeout handling
```

---

## 📋 API Endpoint Summary

```
Authentication Flow:

1. POST /api/auth/google/callback/
   Input:  { code, provider }
   Output: { user, tokens, is_new_user }

2. POST /api/auth/token/refresh/
   Input:  { refresh_token }
   Output: { tokens }

3. GET /api/auth/user/profile/
   Header: Authorization: Bearer <token>
   Output: { user }

4. POST /api/auth/logout/
   Header: Authorization: Bearer <token>
   Output: { message }

```

---

## 🎨 Frontend Component Hierarchy

```
App.tsx
├── AuthProvider (Context)
│   ├── AuthContext (state)
│   └── useAuth() hook
│
├── AuthScreen
│   ├── Tab 1: Login
│   │   ├── Google Button
│   │   ├── Email field
│   │   └── Password field
│   │
│   └── Tab 2: Signup
│       ├── Google Button
│       ├── Name field
│       ├── Email field
│       ├── Password field
│       └── Confirm Password field
│
├── LandingPageDashboard
│   ├── Hero section
│   ├── Features showcase
│   ├── Pricing cards
│   └── Call-to-action
│
└── MainDashboard (when logged in)
    ├── User profile
    ├── Usage stats
    ├── Quick access
    └── Recent activity
```

---

## 💡 Key Concepts

| Concept | Explanation |
|---------|-------------|
| **OAuth 2.0** | Authorization protocol that allows users to sign in via Google |
| **Authorization Code** | Temporary code from Google that proves user consent |
| **Access Token** | JWT token that proves identity to your API |
| **Refresh Token** | Long-lived token used to get new access tokens |
| **JWT** | JSON Web Token - securely encoded user information |
| **ID Token** | Contains user info (email, name, picture) |
| **Scope** | Permissions requested (email, profile, etc.) |
| **Redirect URI** | Where Google sends user after authentication |

---

This visual guide covers the complete OAuth 2.0 authentication flow for your EdTech platform!
