# API Reference - Complete Endpoint Documentation

Complete documentation of all backend API endpoints with request/response examples.

---

## 🔐 Authentication Endpoints

### 1. Google OAuth Callback
Exchange Google authorization code for JWT tokens.

**Endpoint**: `POST /api/auth/google/callback/`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "code": "4/0AQCkHm_...",  // Authorization code from Google
  "provider": "google"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "username": "user@gmail.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_premium": false,
    "subscription_status": "trial"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  },
  "is_new_user": true
}
```

**Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Invalid authorization code"
}
```

---

### 2. Email Signup
Register new user with email and password.

**Endpoint**: `POST /api/auth/signup/`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password_123"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": 2,
    "email": "john@example.com",
    "username": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

---

### 3. Email Login
Authenticate user with email and password.

**Endpoint**: `POST /api/auth/login/`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "secure_password_123"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": 2,
    "email": "john@example.com",
    "username": "john@example.com",
    "first_name": "John"
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

---

### 4. Token Refresh
Refresh access token using refresh token.

**Endpoint**: `POST /api/auth/token/refresh/`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Error Response (401 Unauthorized)**:
```json
{
  "success": false,
  "error": "Refresh token expired"
}
```

---

### 5. Get User Profile
Retrieve authenticated user's profile.

**Endpoint**: `GET /api/auth/user/profile/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "username": "user@gmail.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_premium": false,
    "subscription_status": "trial",
    "trial_ends_at": "2026-01-09T10:30:00Z",
    "subscription_ends_at": null,
    "created_at": "2025-12-09T10:30:00Z"
  }
}
```

**Error Response (401 Unauthorized)**:
```json
{
  "error": "Unauthorized"
}
```

---

### 6. Logout
Logout user and invalidate tokens.

**Endpoint**: `POST /api/auth/logout/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 💳 Payment Endpoints

### 1. Get Razorpay Public Key
Get public Razorpay key for frontend.

**Endpoint**: `GET /api/payment/razorpay-key/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "key_id": "rzp_test_XXXXXXXXXX"
}
```

---

### 2. Create Payment Order
Create Razorpay order for payment.

**Endpoint**: `POST /api/payment/create-order/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "plan": "premium",
  "auto_pay": false
}
```

**Available Plans**:
- `premium`: ₹199 for 30 days
- `premium_annual`: ₹1999 for 365 days

**Success Response (201 Created)**:
```json
{
  "success": true,
  "order_id": "order_test_36aa83ff9c3f",
  "amount": 199,
  "amount_paise": 19900,
  "currency": "INR",
  "key_id": "rzp_test_XXXXXXXXXX",
  "plan": "premium",
  "payment_record_id": "pay_rec_abc123...",
  "created_at": "2025-12-09T10:30:00Z"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Invalid plan name"
}
```

**Error Response (401 Unauthorized)**:
```json
{
  "error": "Unauthorized"
}
```

---

### 3. Verify Payment
Verify Razorpay payment signature and mark as completed.

**Endpoint**: `POST /api/payment/verify/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "razorpay_order_id": "order_test_36aa83ff9c3f",
  "razorpay_payment_id": "pay_test_XXXXXXXXXX",
  "razorpay_signature": "signature_hash_here"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment verified and completed",
  "payment_id": "pay_rec_abc123...",
  "status": "completed",
  "subscription_activated": true,
  "subscription_ends_at": "2026-01-09T10:30:00Z"
}
```

**Error Response (400 Bad Request - Invalid Signature)**:
```json
{
  "success": false,
  "error": "Invalid payment signature",
  "details": "Signature verification failed"
}
```

---

### 4. Get Payment Status
Get status of specific payment.

**Endpoint**: `GET /api/payment/status/?payment_id=<payment_id>`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Query Parameters**:
- `payment_id` (required): Payment record ID

**Success Response (200 OK)**:
```json
{
  "success": true,
  "payment": {
    "id": "pay_rec_abc123...",
    "order_id": "order_test_36aa83ff9c3f",
    "amount": 199,
    "currency": "INR",
    "status": "completed",
    "payment_method": "card",
    "razorpay_order_id": "order_test_36aa83ff9c3f",
    "razorpay_payment_id": "pay_test_XXXXXXXXXX",
    "razorpay_signature": "signature_hash_here",
    "created_at": "2025-12-09T10:30:00Z",
    "plan": "premium"
  }
}
```

---

### 5. Get Payment History
Get all payments for authenticated user.

**Endpoint**: `GET /api/payment/history/?page=1&limit=10`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK)**:
```json
{
  "success": true,
  "total_payments": 2,
  "total_pages": 1,
  "current_page": 1,
  "payments": [
    {
      "id": "pay_rec_abc123...",
      "amount": 199,
      "currency": "INR",
      "status": "completed",
      "payment_method": "card",
      "razorpay_payment_id": "pay_test_XXXXXXXXXX",
      "created_at": "2025-12-09T10:30:00Z",
      "plan": "premium",
      "billing_cycle": {
        "start": "2025-12-09T10:30:00Z",
        "end": "2026-01-09T10:30:00Z"
      }
    },
    {
      "id": "pay_rec_def456...",
      "amount": 1999,
      "currency": "INR",
      "status": "completed",
      "payment_method": "upi",
      "razorpay_payment_id": "pay_test_YYYYYYYYYY",
      "created_at": "2025-11-09T10:30:00Z",
      "plan": "premium_annual",
      "billing_cycle": {
        "start": "2025-11-09T10:30:00Z",
        "end": "2026-11-09T10:30:00Z"
      }
    }
  ]
}
```

---

### 6. Request Refund
Request refund for completed payment.

**Endpoint**: `POST /api/payment/refund/`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "payment_id": "pay_rec_abc123..."
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Refund initiated",
  "refund_id": "rfnd_test_XXXXXXXXXX",
  "amount": 199,
  "status": "initiated"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Payment already refunded"
}
```

---

## 🏥 Health Check Endpoint

### Health Check
Verify backend is running.

**Endpoint**: `GET /api/health/`

**Success Response (200 OK)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-09T10:30:00Z"
}
```

---

## 📋 Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/POST request |
| 201 | Created | Successful resource creation |
| 400 | Bad Request | Invalid data or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Backend error |

---

## 🔑 Authentication

### All Protected Endpoints Require:

```
Header: Authorization: Bearer <access_token>
```

### Token Format:
- JWT token with 24-hour expiration
- Stored in secure storage on frontend
- Automatically refreshed on 401 responses

### Getting Tokens:
1. Sign up: `POST /api/auth/signup/` → Returns tokens
2. Login: `POST /api/auth/login/` → Returns tokens
3. Google OAuth: `POST /api/auth/google/callback/` → Returns tokens
4. Refresh: `POST /api/auth/token/refresh/` → Returns new tokens

---

## 🧪 Test Credentials

**Test Card for Payment**:
```
Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

**Test UPI ID**:
```
test@paytm
test@okhdfcbank
```

**Test Razorpay Environment**:
- Uses `rzp_test_XXXXXXXXXX` keys
- No real money charged
- Orders start with `order_test_`
- Payments start with `pay_test_`

---

## 🔄 Request/Response Flow Example

### Complete Payment Flow:

1. **Create Order**:
   ```
   POST /api/payment/create-order/
   → 201 Created with order_id
   ```

2. **User Completes Payment via Razorpay Modal**:
   ```
   (Razorpay handles payment)
   → Returns payment_id and signature
   ```

3. **Verify Payment**:
   ```
   POST /api/payment/verify/
   → 200 OK if signature valid
   → User subscription activated
   ```

4. **Check Payment Status**:
   ```
   GET /api/payment/status/?payment_id=...
   → 200 OK with status: "completed"
   ```

5. **Get Payment History**:
   ```
   GET /api/payment/history/
   → 200 OK with all payments listed
   ```

---

## ⚠️ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid authorization code` | Google code expired or invalid | Retry OAuth flow |
| `Unauthorized` (401) | Missing or invalid token | Check token format: `Bearer <token>` |
| `Signature verification failed` | Razorpay secret mismatch | Verify RAZORPAY_SECRET in backend |
| `Invalid plan name` | Plan doesn't exist | Use `premium` or `premium_annual` |
| `Network error` | Backend not running | Start backend: `python manage.py runserver 8003` |
| `Payment already refunded` | Refund already processed | Use different payment ID |

---

**Last Updated**: December 9, 2025
**API Version**: 1.0
**Status**: Production Ready
