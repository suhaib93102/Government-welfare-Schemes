# Frontend Integration Guide - Payment & OAuth

Complete guide for integrating the backend APIs into the frontend React Native app.

## 🔧 Setup & Configuration

### Step 1: Install Dependencies

```bash
cd EdTechMobile
npm install
# or
yarn install
```

### Step 2: Configure Environment

Create `.env` file in `EdTechMobile/` root:

```env
REACT_APP_API_URL=http://localhost:8003/api
REACT_APP_GOOGLE_CLIENT_ID=151162974342-2ngie326605cieaj916qjrqq7ud5m1aj.apps.googleusercontent.com
```

### Step 3: Start the App

```bash
npm start
```

Select:
- `w` - Web (Easiest for testing)
- `a` - Android (Requires Android Studio)
- `i` - iOS (Requires Xcode on Mac)

---

## 📱 Core Services

### AuthService (`src/services/authService.ts`)

Handles OAuth and JWT token management.

```typescript
// Initialize on app startup
await authService.initialize();

// Google OAuth login
const result = await authService.googleSignIn(authorizationCode);
// Returns: { success, user, tokens }

// Get user profile
await authService.loadUserProfile();

// Logout
await authService.logout();

// Check if authenticated
const isLoggedIn = authService.isAuthenticated();
```

**Token Management:**
- Tokens stored in secure device storage
- Auto-refresh on 401 errors via Axios interceptor
- Expiration checking before API calls

### PaymentService (`src/services/paymentService.ts`)

Handles Razorpay payment processing.

```typescript
// Create payment order
const order = await paymentService.createPaymentOrder('premium');
// Returns: { order_id, amount, key_id, ... }

// Process full payment (order + checkout + verify)
const result = await paymentService.processPayment('premium');
// Returns: { success, payment_id, status }

// Get payment history
const history = await paymentService.getPaymentHistory();
// Returns: { total_payments, payments: [...] }

// Request refund
const refund = await paymentService.requestRefund(paymentId);
// Returns: { success, refund_id }
```

### AuthContext (`src/context/AuthContext.tsx`)

Global authentication state management.

```typescript
// In any component:
const { user, isAuthenticated, signInWithGoogle, logout } = useAuth();

// Check authentication
if (isAuthenticated) {
  // Show authenticated UI
} else {
  // Show login UI
}
```

---

## 🔐 OAuth Flow

### Complete OAuth Process

1. **User clicks "Sign in with Google"**
   ```
   AuthScreen.handleGoogleSignIn()
   ```

2. **Opens Razorpay OAuth browser**
   ```typescript
   const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl);
   // User logs in with Google
   // Returns authorization code
   ```

3. **Exchange code for tokens**
   ```typescript
   POST /api/auth/google/callback/
   {
     "code": "auth_code_from_google",
     "provider": "google"
   }
   ```

4. **Backend verifies and creates JWT**
   ```typescript
   // Response
   {
     "success": true,
     "user": { id, email, username, ... },
     "tokens": { access_token, refresh_token },
     "is_new_user": true/false
   }
   ```

5. **Frontend stores tokens securely**
   ```typescript
   // Stored in expo-secure-store
   // NOT in localStorage
   ```

6. **Auto-refresh on token expiry**
   ```typescript
   // 401 response → refresh token → retry request
   // Transparent to app
   ```

---

## 💳 Payment Flow

### Complete Payment Process

1. **User selects plan**
   ```typescript
   PaymentScreen → Select "Premium Monthly" or "Premium Annual"
   ```

2. **Create payment order**
   ```typescript
   POST /api/payment/create-order/
   {
     "plan": "premium",
     "auto_pay": false
   }
   // Response: { order_id, amount, key_id, ... }
   ```

3. **Show Razorpay checkout modal**
   ```typescript
   // Dynamic script loading
   new Razorpay({
     key: order.key_id,
     order_id: order.order_id,
     amount: order.amount_paise,
     handler: handlePaymentResponse
   }).open();
   ```

4. **User completes payment**
   - Select payment method (Card, UPI, NetBanking, etc.)
   - Enter payment details
   - Payment processed by Razorpay

5. **Verify payment signature**
   ```typescript
   POST /api/payment/verify/
   {
     "razorpay_order_id": "order_...",
     "razorpay_payment_id": "pay_...",
     "razorpay_signature": "signature_..."
   }
   ```

6. **Backend validates & updates subscription**
   ```typescript
   // If signature valid:
   - Payment status → "completed"
   - Subscription → "premium"
   - next_billing_date → 30 days from now
   ```

7. **Show success to user**
   ```
   ✓ Payment Successful
   ✓ Premium features unlocked
   ```

---

## 🧩 Component Integration

### AuthScreen Component

```typescript
// src/components/AuthScreen.tsx
export default function AuthScreen() {
  const { signInWithGoogle, login, signUp } = useAuth();
  
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle(authCode);
      if (result) {
        // Navigate to MainDashboard
      }
    } catch (error) {
      Alert.alert('Login failed', error.message);
    }
  };
  
  // UI with Google button, email login, email signup tabs
}
```

### PaymentScreen Component

```typescript
// src/components/PaymentScreen.tsx
export default function PaymentScreen() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  
  const handlePayment = async () => {
    const result = await paymentService.processPayment(selectedPlan);
    if (result.success) {
      Alert.alert('Success', 'Subscription activated!');
    } else {
      Alert.alert('Error', result.error);
    }
  };
  
  // UI with plan cards, payment button, history tab
}
```

### MainDashboard Component

```typescript
// Protected route - only shown when authenticated
export default function MainDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <AuthScreen />;
  }
  
  return (
    <View>
      <Text>Welcome, {user.first_name}</Text>
      <QuizGenerator />
      <PaymentStatus />
      <Button onPress={logout} title="Logout" />
    </View>
  );
}
```

---

## 🔌 API Integration Checklist

### OAuth Endpoints
- [ ] `POST /api/auth/google/callback/` - Exchange code for tokens
- [ ] `POST /api/auth/token/refresh/` - Refresh access token
- [ ] `GET /api/auth/user/profile/` - Get user profile
- [ ] `POST /api/auth/logout/` - Logout

### Payment Endpoints
- [ ] `POST /api/payment/create-order/` - Create Razorpay order
- [ ] `POST /api/payment/verify/` - Verify payment signature
- [ ] `GET /api/payment/status/` - Check payment status
- [ ] `GET /api/payment/history/` - Get payment history
- [ ] `POST /api/payment/refund/` - Request refund
- [ ] `GET /api/payment/razorpay-key/` - Get Razorpay public key

### Auth-Required Requests
All payment and profile endpoints require:
```
Header: Authorization: Bearer <access_token>
```

---

## 🧪 Testing Payment in Browser

For quick testing without mobile device:

1. Start backend: `cd backend && python manage.py runserver 8003`
2. Start frontend web: `cd EdTechMobile && npm start` → press `w`
3. Navigate to Payment screen
4. Use test card: `4111 1111 1111 1111`
5. Any CVV and future expiry date

---

## 🐛 Troubleshooting

### "Cannot find module 'expo-secure-store'"
```bash
npm install expo-secure-store@^13.0.1
```

### "API returns 401 Unauthorized"
- Check JWT token is being sent in Authorization header
- Verify token hasn't expired
- Token should be prefixed with "Bearer "

### "Payment order creation fails"
- Verify backend is running (`http://localhost:8003/api/health/`)
- Check user is authenticated (valid JWT token)
- Check .env has correct API URL

### "Razorpay script fails to load"
- Check internet connection
- Verify Razorpay CDN is accessible
- Check browser console for errors

### "Token refresh not working"
- Ensure refresh token is stored securely
- Check `refreshAccessToken()` in authService
- Verify JWT_SECRET matches between frontend and backend

---

## 📊 State Management Flow

```
App.tsx
  ├── AuthProvider
  │   ├── AuthContext
  │   └── authService (singleton)
  │
  ├── AuthScreen (if not authenticated)
  │   ├── GoogleSignIn
  │   ├── EmailLogin
  │   └── EmailSignup
  │
  └── MainDashboard (if authenticated)
      ├── QuizGenerator
      ├── PaymentScreen
      │   └── paymentService (singleton)
      └── UserProfile
```

---

## 🔄 Token Refresh Flow

```
User makes API request
        ↓
axios interceptor checks response
        ↓
Is it 401?
        ├─ NO → Return response ✓
        │
        └─ YES → Call refreshAccessToken()
                 ↓
              Exchange refresh token for new access token
                 ↓
              Retry original request with new token
                 ↓
              Return new response ✓
```

---

## 🚀 Deployment

### For Production:

1. **Update API URL**
   ```env
   REACT_APP_API_URL=https://yourdomain.com/api
   ```

2. **Enable HTTPS**
   - All OAuth and payment requests must use HTTPS

3. **Build app**
   ```bash
   # Web build
   npm run build
   
   # Android build
   eas build --platform android
   
   # iOS build
   eas build --platform ios
   ```

4. **Update OAuth redirect URIs**
   - Google Cloud Console: Add production app URL
   - Razorpay: Add production domain

---

## 📚 Additional Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Razorpay Docs**: https://razorpay.com/docs/
- **JWT.io**: https://jwt.io/ (decode tokens)

---

**Last Updated**: December 9, 2025
**Status**: Ready for Integration
