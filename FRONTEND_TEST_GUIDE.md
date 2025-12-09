# Frontend Testing Guide - OAuth & Payment Integration

Step-by-step testing guide for the frontend payment and authentication flows.

## ✅ Pre-Test Checklist

- [ ] Backend running: `python manage.py runserver 8003`
- [ ] Frontend dependencies installed: `npm install` in EdTechMobile
- [ ] `.env` file configured in EdTechMobile with API_URL and GOOGLE_CLIENT_ID
- [ ] No TypeScript errors: `npm run type-check` (if available)
- [ ] Logs visible: Open browser DevTools (F12) → Console tab

---

## 🧪 Test 1: App Initialization & Auth State

**Objective**: Verify AuthService initializes correctly and checks for existing tokens.

### Steps:

1. **Start Frontend**
   ```bash
   cd EdTechMobile
   npm start
   # Press 'w' for web
   ```

2. **Open DevTools** (F12) → Console tab

3. **Expected on First Load**:
   ```
   ✓ No stored tokens (first time)
   ✓ User is not authenticated
   ✓ App shows AuthScreen (login/signup options)
   ```

4. **Logs to Look For**:
   ```javascript
   // You should see:
   [authService] Initialized: user is not authenticated
   [authService] No tokens found in storage
   ```

### ✅ Pass Criteria:
- App loads without errors
- AuthScreen is visible
- Console shows initialization logs

---

## 🧪 Test 2: Google OAuth Sign-In Flow

**Objective**: Test complete Google OAuth authentication.

### Prerequisites:
- Backend must have Google OAuth credentials in `.env`
- User's Google account ready

### Steps:

1. **Click "Sign In with Google" Button**
   - Button opens Google OAuth consent dialog in browser

2. **Expected Behavior**:
   ```
   Dialog opens → User selects Google account → Dialog closes → Back to app
   ```

3. **Monitor Console**:
   - Look for authorization code being received
   - Should see token storage confirmation

4. **Expected Response**:
   ```javascript
   POST /api/auth/google/callback/
   
   Response: {
     "success": true,
     "user": {
       "id": 1,
       "email": "user@gmail.com",
       "first_name": "John",
       "last_name": "Doe",
       "username": "user@gmail.com"
     },
     "tokens": {
       "access_token": "eyJ0eXAi...",
       "refresh_token": "eyJ0eXAi..."
     },
     "is_new_user": true/false
   }
   ```

5. **Verify After Login**:
   - App navigates to MainDashboard
   - User name is displayed
   - Payment/Profile sections are visible

### ✅ Pass Criteria:
- Dialog appears and closes smoothly
- User successfully authenticated
- Tokens stored securely
- Dashboard loads with user data

### ❌ Common Issues:

| Issue | Solution |
|-------|----------|
| Dialog doesn't open | Check internet connection, verify client ID in .env |
| "Invalid code" error | Google OAuth timeout, try again |
| Black screen after login | Check console for errors, may need to restart app |

---

## 🧪 Test 3: Token Storage & Persistence

**Objective**: Verify tokens are stored securely and persist across page reloads.

### Steps:

1. **After successful login**, tokens should be stored in `expo-secure-store`

2. **Reload the page** (F5 or Cmd+R)

3. **Expected Behavior**:
   - User should still be logged in
   - No need to re-authenticate
   - Token is restored from secure storage

4. **Monitor Console**:
   ```javascript
   [authService] Restoring tokens from secure storage...
   [authService] Access token found, verifying expiry...
   [authService] Token valid, loaded user profile
   ```

5. **Verify in DevTools → Storage → IndexedDB** (if web backend supports it):
   - Look for `expo-secure-store` entries
   - Should see token values (don't expose in production logs!)

### ✅ Pass Criteria:
- User remains logged in after reload
- No need to sign in again
- Console shows token restoration

---

## 🧪 Test 4: User Profile Loading

**Objective**: Verify user profile is correctly loaded and displayed.

### Prerequisites:
- User must be authenticated (completed Test 2)

### Steps:

1. **Navigate to Profile Section**
   - Should show user's name, email, subscription status

2. **Expected Profile Data**:
   ```javascript
   GET /api/auth/user/profile/
   Header: Authorization: Bearer <token>
   
   Response: {
     "success": true,
     "user": {
       "id": 1,
       "email": "user@gmail.com",
       "first_name": "John",
       "username": "user@gmail.com",
       "is_premium": false,
       "subscription_status": "trial",
       "trial_ends_at": "2026-01-09T..."
     }
   }
   ```

3. **Verify Display**:
   - Profile section shows correct name
   - Shows current subscription status
   - Shows trial end date (if applicable)

### ✅ Pass Criteria:
- Profile loads without errors
- All user data displayed correctly
- API returns 200 OK response

---

## 💳 Test 5: Payment Order Creation

**Objective**: Test creating a payment order on backend.

### Prerequisites:
- User must be authenticated (completed Test 2)
- Backend payment service must be initialized

### Steps:

1. **Click "Select Premium Plan"** on Payment screen

2. **Expected Flow**:
   - Loading state appears
   - Backend creates Razorpay order
   - Displays order details to user

3. **Monitor Network Tab** (DevTools → Network):
   ```
   POST /api/payment/create-order/
   
   Request:
   {
     "plan": "premium",
     "auto_pay": false
   }
   
   Response (201 Created):
   {
     "success": true,
     "order_id": "order_test_36aa83ff9c3f",
     "amount": 199,
     "amount_paise": 19900,
     "currency": "INR",
     "key_id": "rzp_test_XXXXXXXXXX",
     "plan": "premium",
     "payment_record_id": "pay_rec_123..."
   }
   ```

4. **Verify Response**:
   - order_id starts with "order_test_" or "order_live_"
   - amount_paise is 100x the amount (rupees)
   - key_id is valid Razorpay public key

### ✅ Pass Criteria:
- API returns 201 Created
- Order ID is valid
- Amount is correct (199 for premium)

### ❌ Common Issues:

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | JWT token expired or missing in header |
| 400 Bad Request | Invalid plan name or missing fields |
| Network error | Backend not running on 8003 |

---

## 💳 Test 6: Payment Verification (Test Card)

**Objective**: Test complete payment flow with test card.

### Prerequisites:
- Completed Test 5 (order created)
- Backend running and accessible

### Steps:

1. **Razorpay Checkout Opens**
   - Modal displays with order details
   - Payment method options visible

2. **Use Test Card**:
   ```
   Card Number: 4111 1111 1111 1111
   CVV: Any 3 digits (e.g., 123)
   Expiry: Any future date (e.g., 12/25)
   ```

3. **Complete Payment**:
   - Card details entered
   - "Pay" button clicked
   - Payment processed by Razorpay

4. **Expected Response**:
   ```javascript
   {
     "razorpay_order_id": "order_test_36aa83ff9c3f",
     "razorpay_payment_id": "pay_test_XXXXXXXXXX",
     "razorpay_signature": "signature_hash_here"
   }
   ```

5. **Verify on Backend**:
   ```
   POST /api/payment/verify/
   
   Response:
   {
     "success": true,
     "message": "Payment verified and completed",
     "payment_id": "pay_rec_123...",
     "status": "completed"
   }
   ```

6. **User Should See**:
   - "✓ Payment Successful" message
   - Loading animation while verifying
   - Subscription status updated to "premium"

### ✅ Pass Criteria:
- Payment modal opens smoothly
- Test card accepted by Razorpay
- Backend verification succeeds (200 OK)
- User sees success message

### ❌ Common Issues:

| Issue | Solution |
|-------|----------|
| Modal doesn't open | Razorpay script not loaded, check network |
| "Invalid amount" | Payment service not initializing properly |
| Verification fails (401) | Token expired during payment, refresh tokens |
| Signature mismatch | Razorpay secret not matching backend |

---

## 🧪 Test 7: Payment History

**Objective**: Verify payment history is retrieved correctly.

### Prerequisites:
- Completed Test 6 (at least one payment)
- User authenticated

### Steps:

1. **Navigate to Payment History** section

2. **Monitor Network** → Look for:
   ```
   GET /api/payment/history/
   Header: Authorization: Bearer <token>
   
   Response (200 OK):
   {
     "success": true,
     "total_payments": 1,
     "payments": [
       {
         "id": "pay_rec_...",
         "amount": 199,
         "currency": "INR",
         "status": "completed",
         "payment_method": "card",
         "razorpay_payment_id": "pay_test_...",
         "created_at": "2025-12-09T...",
         "billing_cycle": {
           "start": "2025-12-09T...",
           "end": "2026-01-09T..."
         }
       }
     ]
   }
   ```

3. **Verify Display**:
   - Shows all past payments
   - Displays amount, date, status
   - Shows next billing date

### ✅ Pass Criteria:
- API returns 200 OK
- All payments displayed
- Dates and amounts correct

---

## 🔄 Test 8: Token Refresh Flow

**Objective**: Verify access token refresh mechanism.

### Steps:

1. **Wait for or manually expire token**
   - Tokens expire after 24 hours
   - For testing, modify token expiry in backend

2. **Make API call after expiry**
   - App should automatically refresh token
   - Retry original request
   - User doesn't see any error

3. **Monitor Console**:
   ```javascript
   [axios] 401 Unauthorized - attempting refresh
   [axios] Token refreshed successfully
   [axios] Retrying original request
   [original-request] Success with new token
   ```

4. **Monitor Network** → Look for:
   ```
   POST /api/auth/token/refresh/
   
   Response:
   {
     "success": true,
     "tokens": {
       "access_token": "new_token_here",
       "refresh_token": "refresh_token_here"
     }
   }
   ```

### ✅ Pass Criteria:
- Refresh happens automatically
- Original request succeeds
- No user interaction required

---

## 🧪 Test 9: Logout & Session Cleanup

**Objective**: Verify logout clears tokens and returns to login screen.

### Steps:

1. **Click Logout Button**
   - Should trigger logout API call (optional)
   - Tokens cleared from storage

2. **Expected Behavior**:
   ```javascript
   POST /api/auth/logout/ (optional)
   // Delete tokens from secure storage
   // Clear user state
   // Navigate to AuthScreen
   ```

3. **Verify After Logout**:
   - App shows AuthScreen (login/signup)
   - No user data visible
   - Tokens removed from storage

4. **Check DevTools → Application → Storage**:
   - expo-secure-store entries should be cleared

### ✅ Pass Criteria:
- Tokens cleared successfully
- App returns to login screen
- Can log in again without issues

---

## 🔐 Test 10: Subscription Status Update

**Objective**: Verify subscription status updates after payment.

### Prerequisites:
- Completed Test 6 (payment successful)
- Backend updated subscription in database

### Steps:

1. **Check User Profile**
   ```
   GET /api/auth/user/profile/
   
   Expected Response:
   {
     "is_premium": true,
     "subscription_status": "premium",
     "subscription_ends_at": "2026-01-09T..."
   }
   ```

2. **Verify in UI**:
   - Profile shows "Premium" status
   - Premium features are enabled
   - Shows next billing date

3. **Check Payment History**:
   - Recent payment shows as "completed"
   - Subscription shows as "active"

### ✅ Pass Criteria:
- User profile shows premium status
- Payment reflected in history
- Premium features accessible

---

## 📊 Manual API Testing with cURL

For advanced testing without frontend UI:

### Create Test User:
```bash
curl -X POST http://localhost:8003/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Response includes access_token
```

### Create Payment Order:
```bash
curl -X POST http://localhost:8003/api/payment/create-order/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "premium",
    "auto_pay": false
  }'
```

### Verify Payment:
```bash
curl -X POST http://localhost:8003/api/payment/verify/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_test_...",
    "razorpay_payment_id": "pay_test_...",
    "razorpay_signature": "signature_hash"
  }'
```

---

## 🐛 Debugging Tips

### Enable Verbose Logging:

In `authService.ts`, add:
```typescript
// At start of each function
console.log('[authService]', 'Function name', { params });
```

In `paymentService.ts`, add:
```typescript
// At start of each function
console.log('[paymentService]', 'Function name', { params });
```

### Check Network Requests:

DevTools → Network tab:
1. Type in filter: `api` or `localhost:8003`
2. Click on request to see:
   - Headers (Authorization token)
   - Request body
   - Response (full JSON)
   - Timing

### Decode JWT Tokens:

Go to https://jwt.io and paste token to see:
- User ID in `sub` field
- Expiration in `exp` field
- Issued at in `iat` field

### Check Secure Storage (Expo):

```javascript
// In browser console:
// For IndexedDB-backed storage
indexedDB.databases().then(dbs => console.log(dbs));

// For localStorage (if using)
localStorage.getItem('access_token');
```

---

## ✅ Full Test Checklist

| Test | Status | Notes |
|------|--------|-------|
| App initialization | ⬜ | No tokens on first load |
| Google OAuth login | ⬜ | Dialog opens and closes smoothly |
| Token persistence | ⬜ | Survives page reload |
| User profile loading | ⬜ | Data displayed correctly |
| Payment order creation | ⬜ | Order ID generated |
| Payment with test card | ⬜ | Signature verified on backend |
| Payment history | ⬜ | Shows completed payment |
| Token refresh | ⬜ | Automatic on 401 |
| Logout & cleanup | ⬜ | Tokens cleared, returns to login |
| Subscription status update | ⬜ | Shows as premium |

---

## 🚀 Next Steps After Testing

1. **If all tests pass**:
   - Deploy to staging environment
   - Test with real Razorpay credentials (change from test to live)
   - Perform load testing
   - Security audit

2. **If tests fail**:
   - Check error messages in console
   - Review Network tab requests/responses
   - Compare with expected responses above
   - Check backend logs: `tail -f backend.log`

3. **Enable Production Features**:
   - Switch Razorpay from test to live keys
   - Update API URL to production domain
   - Enable HTTPS everywhere
   - Update OAuth callback URLs

---

**Last Updated**: December 9, 2025
**Status**: Ready for Frontend Testing
