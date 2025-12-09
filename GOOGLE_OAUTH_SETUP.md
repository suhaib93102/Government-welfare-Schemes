# Google OAuth Setup Guide

Complete guide to set up Google OAuth authentication for your EdTech platform.

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Edit `backend/.env` and add:

```env
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id-from-gcp
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret-from-gcp
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8003/api/auth/google/callback/
FRONTEND_REDIRECT_URI=http://localhost:8081

# JWT Configuration for Auth Tokens
JWT_SECRET=your-secure-jwt-secret-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7
```

### 3. Backend API Endpoints

The following authentication endpoints are now available:

#### **POST** `/api/auth/google/callback/`
Exchange Google authorization code for tokens
```json
{
  "code": "authorization_code",
  "provider": "google"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "first_name": "John",
    "last_name": "Doe"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "Bearer",
    "expires_in": 86400
  },
  "is_new_user": true
}
```

#### **POST** `/api/auth/token/refresh/`
Refresh access token
```json
{
  "refresh_token": "token"
}
```

#### **GET** `/api/auth/user/profile/`
Get authenticated user profile (requires Bearer token)
```
Header: Authorization: Bearer <access_token>
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "first_name": "John",
    "last_name": "Doe",
    "date_joined": "2024-01-15T10:30:00Z"
  }
}
```

#### **POST** `/api/auth/logout/`
Logout user (client should discard tokens)

---

## 🌐 Google Cloud Project Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"**
3. Enter project name: `EdTech Solver`
4. Click **Create**

### Step 2: Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for **"Google+ API"**
3. Click **"Enable"**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure **OAuth consent screen** first:
   - Click **"External"**
   - Fill required fields:
     - App name: `EdTech Solver`
     - User support email: `your-email@example.com`
     - Developer contact: `your-email@example.com`
   - Click **Save and Continue**
4. Back to credentials, select **"OAuth 2.0 Client ID"**
5. Choose **"Web application"** as application type
6. Add authorized redirect URIs:
   - `http://localhost:8081`
   - `http://localhost:8003/api/auth/google/callback/`
   - `http://localhost:3000` (if using web version)
   - `http://localhost:19006` (if using Expo web)

### Step 4: Get Your Credentials

1. After creation, you'll see your credentials
2. Copy:
   - **Client ID** → `GOOGLE_OAUTH_CLIENT_ID`
   - **Client Secret** → `GOOGLE_OAUTH_CLIENT_SECRET`
3. Add them to `.env` file

---

## 📱 Frontend Setup

### 1. Install Dependencies

```bash
cd EdTechMobile
npm install
# or
yarn install
```

### 2. Update Google Client ID

In `src/components/AuthScreen.tsx`, replace:
```typescript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

With your actual Google Client ID from GCP.

### 3. Configure API Endpoint

In `src/services/authService.ts`, update:
```typescript
const API_BASE_URL = 'http://localhost:8003/api';
```

If using different backend URL, update accordingly.

### 4. Initialize Auth in App

In `App.tsx`:
```typescript
import { AuthProvider } from './src/context/AuthContext';
import { googleAuthAPI } from './src/services/authService';

export default function App() {
  useEffect(() => {
    // Initialize authentication service
    googleAuthAPI.setupInterceptors();
    // Set up axios interceptors for automatic token refresh
  }, []);

  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

---

## 🔐 Security Setup

### JWT Secret Generation

Generate a strong JWT secret:

```bash
# On macOS/Linux
openssl rand -hex 32

# Python
python3 -c "import os; print(os.urandom(32).hex())"
```

Add to `.env`:
```env
JWT_SECRET=your-generated-hex-value
```

### HTTPS Configuration

For production, always use HTTPS:

```env
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback/
FRONTEND_REDIRECT_URI=https://yourdomain.com
```

---

## 🚀 Running the Application

### Backend
```bash
cd backend
python manage.py runserver 8003
```

### Frontend
```bash
cd EdTechMobile
npm start
```

---

## 🧪 Testing Authentication

### Test Google OAuth Flow

1. Start both backend and frontend servers
2. Click **"Continue with Google"** on auth screen
3. Sign in with your Google account
4. Check browser console for authorization code
5. Backend will exchange code for tokens
6. User should be logged in

### Test Email Login

1. First, create account via **"Create Account"** tab
2. Fill in email, password, and confirm password
3. Click **"Create Account"**
4. Account created in database
5. Can now use credentials to log in

### Test Token Refresh

The application automatically refreshes tokens when they expire.

---

## 🔗 API Integration Examples

### Frontend: Sign in with Google

```typescript
import { useAuth } from './src/context/AuthContext';

function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  const handleGoogleLogin = async (code) => {
    const result = await signInWithGoogle(code);
    if (result.success) {
      console.log('Logged in as:', result.user.email);
    }
  };
}
```

### Frontend: Make Authenticated Requests

```typescript
import axios from 'axios';
import { authService } from './src/services/authService';

// Tokens are automatically added via axios interceptor
const response = await axios.get(
  'http://localhost:8003/api/quiz/generate/',
  // Authorization header automatically included
);
```

### Frontend: Logout

```typescript
const { logout } = useAuth();

await logout();
// Tokens cleared, user logged out
```

---

## 📊 Database Schema

The application uses Django's default User model extended with OAuth info:

```python
# User extended with OAuth provider
user.oauth_provider = 'google' or 'email'
```

Additional models for subscription:
- `UserSubscription` - Tracks plan (free/premium)
- `Payment` - Records transactions
- `FeatureUsageLog` - Logs feature usage

---

## 🐛 Troubleshooting

### "Invalid Client ID" Error

- Verify `GOOGLE_OAUTH_CLIENT_ID` is correct
- Check authorized redirect URIs in Google Console

### "Code not found" Error

- Ensure authorization URL includes correct client ID
- Verify redirect URI matches Google Console settings

### "Token expired" Error

- Automatic refresh should handle this
- If not, user needs to log in again

### CORS Issues

- Ensure `django-cors-headers` is installed
- Add frontend URL to Django `ALLOWED_HOSTS` in settings

---

## ✅ Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google+ API
- [ ] Created OAuth 2.0 credentials
- [ ] Copied Client ID and Secret to `.env`
- [ ] Generated JWT secret
- [ ] Installed Python dependencies
- [ ] Installed JavaScript dependencies
- [ ] Updated `GOOGLE_CLIENT_ID` in frontend
- [ ] Updated `API_BASE_URL` in frontend
- [ ] Started backend server
- [ ] Started frontend app
- [ ] Tested Google OAuth flow
- [ ] Tested email signup/login

---

## 📚 Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [JWT.io](https://jwt.io/) - JWT debugging
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)

---

## 📞 Support

For issues or questions, refer to:
1. Check `.env` configuration
2. Review console errors
3. Check backend logs
4. Verify Google Cloud settings
