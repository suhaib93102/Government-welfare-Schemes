# Quick Start: Google OAuth Setup - 5 Minutes

## 🔥 TL;DR: What You Need to Do

### Step 1: Google Cloud Console (2 min)
1. Go to https://console.cloud.google.com/
2. Create new project → Name: `EdTech Solver`
3. Go to **APIs & Services** → **Library**
4. Search and **Enable**: `Google+ API`
5. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
6. Select **"Web application"**
7. Add redirect URIs:
   - `http://localhost:8081`
   - `http://localhost:8003/api/auth/google/callback/`
8. Click Create and copy:
   - **Client ID** (long string ending in .apps.googleusercontent.com)
   - **Client Secret** (random string)

### Step 2: Backend Configuration (1 min)
Open `backend/.env` and add:

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8003/api/auth/google/callback/
FRONTEND_REDIRECT_URI=http://localhost:8081
JWT_SECRET=your-secure-random-string-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7
```

Generate JWT secret (run in terminal):
```bash
python3 -c "import os; print(os.urandom(32).hex())"
```

### Step 3: Frontend Configuration (1 min)
Open `EdTechMobile/src/components/AuthScreen.tsx` and replace:
```typescript
const GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

### Step 4: Install Dependencies (1 min)
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd EdTechMobile
npm install
```

### Step 5: Run Application
```bash
# Terminal 1 - Backend
cd backend
python manage.py runserver 8003

# Terminal 2 - Frontend
cd EdTechMobile
npm start
```

---

##  What's Now Available

### Backend APIs:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/google/callback/` | POST | Exchange Google code for tokens |
| `/api/auth/token/refresh/` | POST | Refresh access token |
| `/api/auth/user/profile/` | GET | Get user profile (requires token) |
| `/api/auth/logout/` | POST | Logout user |

### Frontend Features:

- ✅ **Google OAuth** - One-click signup/login
- ✅ **Email/Password** - Manual signup/login
- ✅ **Token Management** - Automatic refresh on expiry
- ✅ **Secure Storage** - Tokens in device secure storage
- ✅ **Auth Context** - Easy access to auth state everywhere

---

## 🧪 Quick Test

1. Open app at `localhost:8081`
2. Click **"Continue with Google"**
3. Sign in with Google account
4. Should redirect back and log you in
5. Or use **"Create Account"** tab for email signup

---

## 📝 Key Files Created

| File | Purpose |
|------|---------|
| `backend/question_solver/auth_views.py` | Google OAuth backend logic |
| `EdTechMobile/src/services/authService.ts` | OAuth service & token management |
| `EdTechMobile/src/context/AuthContext.tsx` | React context for auth state |
| `EdTechMobile/src/components/AuthScreen.tsx` | Login/signup UI (updated) |
| `backend/.env` | Configuration file |
| `GOOGLE_OAUTH_SETUP.md` | Detailed setup guide |

---

## ❌ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Invalid Client ID" | Copy exact Client ID from Google Console |
| "Redirect URI mismatch" | Add URI to authorized list in Google Console |
| "Code not found" | Ensure OAuth URL uses correct Client ID |
| "Token validation failed" | Regenerate JWT_SECRET and update .env |
| "CORS error" | Check Django ALLOWED_HOSTS and CORS settings |

---

## 🔒 Security Notes

- ✅ Tokens stored in secure device storage (not localStorage)
- ✅ JWT tokens have expiration (default 24 hours)
- ✅ Refresh tokens for getting new access tokens
- ✅ HTTPS recommended for production
- ✅ Client Secret never exposed to frontend

---

## 📞 Need Help?

Refer to full guide: `GOOGLE_OAUTH_SETUP.md`

All source files have detailed comments explaining the code!
