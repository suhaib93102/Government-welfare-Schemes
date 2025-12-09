# 🚀 Quick Reference Card - Payment & OAuth Integration

One-page quick reference for developers.

---

## 🔧 Quick Setup

### Backend Start
```bash
cd backend
python manage.py runserver 8003
```

### Frontend Start
```bash
cd EdTechMobile
npm start
# Press 'w' for web
```

### Test User (Already Created)
```
Email: testuser@example.com
ID: 1
Access Token: [Generated during login]
```

---

## 🔑 Key Endpoints

### OAuth
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/google/callback/` | ❌ | Exchange Google code for tokens |
| POST | `/api/auth/login/` | ❌ | Email/password login |
| POST | `/api/auth/signup/` | ❌ | Register new user |
| POST | `/api/auth/token/refresh/` | ❌ | Refresh access token |
| GET | `/api/auth/user/profile/` | ✅ | Get user profile |
| POST | `/api/auth/logout/` | ✅ | Logout user |

### Payment
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/payment/razorpay-key/` | ✅ | Get Razorpay public key |
| POST | `/api/payment/create-order/` | ✅ | Create payment order |
| POST | `/api/payment/verify/` | ✅ | Verify payment signature |
| GET | `/api/payment/status/` | ✅ | Check payment status |
| GET | `/api/payment/history/` | ✅ | Get payment history |
| POST | `/api/payment/refund/` | ✅ | Request refund |

### Health
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/health/` | ❌ | Health check |

---

## 📦 Test Plans & Pricing

| Plan | ID | Price | Duration |
|------|----|---------| ---------|
| Premium Monthly | `premium` | ₹199 | 30 days |
| Premium Annual | `premium_annual` | ₹1999 | 365 days |

---

## 💳 Test Payment Card

```
Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
```

---

## 📝 API Request Template

### Authentication Required
```bash
curl -X GET http://localhost:8003/api/auth/user/profile/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"
```

### Create Order
```bash
curl -X POST http://localhost:8003/api/payment/create-order/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"plan":"premium","auto_pay":false}'
```

### Verify Payment
```bash
curl -X POST http://localhost:8003/api/payment/verify/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_test_...",
    "razorpay_payment_id": "pay_test_...",
    "razorpay_signature": "signature_..."
  }'
```

---

## 🧪 Frontend Testing Sequence

1. **Initialize App** → AuthService loads tokens from storage
2. **Google OAuth** → User clicks "Sign In with Google"
3. **Complete OAuth** → Redirect and code exchange
4. **Check Profile** → User data displayed
5. **Navigate to Payments** → Shows available plans
6. **Create Order** → Backend creates Razorpay order
7. **Show Checkout** → Razorpay modal displays
8. **Enter Test Card** → 4111 1111 1111 1111
9. **Verify Payment** → Backend validates signature
10. **Check Status** → Subscription updated to premium

---

## 🐛 Quick Debugging

### Backend Logs
```bash
# Watch logs in real-time
tail -f backend.log

# Check migrations
python manage.py showmigrations

# Test specific endpoint
python manage.py shell < test_script.py
```

### Frontend Logs
```
DevTools → Console (F12)
Look for: [authService], [paymentService], errors
```

### Check API Response
```bash
# Health check
curl http://localhost:8003/api/health/

# Get Razorpay key
curl http://localhost:8003/api/payment/razorpay-key/ \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Status Codes Quick Guide

| Code | Meaning | Fix |
|------|---------|-----|
| 200 | Success | ✅ Working |
| 201 | Created | ✅ Resource created |
| 400 | Bad request | Check request body |
| 401 | Unauthorized | Add `Authorization: Bearer <token>` header |
| 404 | Not found | Check endpoint URL |
| 500 | Server error | Check backend logs |

---

## 🔄 Token Management

### Store Token
```typescript
// Automatically handled by authService
await authService.setTokens(response.data.tokens);
```

### Use Token
```typescript
const token = await authService.getAccessToken();
// Use in header: Authorization: Bearer <token>
```

### Refresh Token
```typescript
// Automatic on 401 responses via axios interceptor
await authService.refreshAccessToken();
```

### Clear Token (Logout)
```typescript
await authService.logout();
// Clears from secure storage
```

---

##  Common Workflows

### Complete OAuth Flow
```
1. Click "Sign In with Google"
2. authService.googleSignIn(code)
3. POST /api/auth/google/callback/
4. Store tokens in secure storage
5. Load user profile
6. Navigate to dashboard
```

### Complete Payment Flow
```
1. Click "Select Plan"
2. paymentService.processPayment('premium')
   a. POST /api/payment/create-order/ → order_id
   b. Show Razorpay modal
   c. User enters card details
   d. POST /api/payment/verify/
3. Check response: success: true
4. Show "Payment Complete" message
5. Navigate to success screen
```

### Automatic Token Refresh
```
1. API request made
2. Backend returns 401
3. Axios interceptor catches error
4. POST /api/auth/token/refresh/
5. Store new token
6. Retry original request
7. Return success response
8. User never sees error
```

---

## 📂 Key Files

### Backend
- `payment_service.py` - Razorpay SDK wrapper
- `payment_views.py` - 6 API endpoints
- `models.py` - Database schema
- `settings.py` - Configuration
- `.env` - Credentials

### Frontend
- `authService.ts` - Authentication service
- `paymentService.ts` - Payment service
- `PaymentScreen.tsx` - UI component
- `package.json` - Dependencies

---

## ✅ Pre-Flight Checklist

- [ ] Backend running: `python manage.py runserver 8003`
- [ ] Frontend dependencies installed: `npm install`
- [ ] `.env` file configured in frontend
- [ ] Google OAuth credentials in backend `.env`
- [ ] Razorpay test keys configured
- [ ] Database migrations applied
- [ ] No TypeScript errors
- [ ] No import errors in console

---

## 🚀 Deploy Checklist

- [ ] Get Razorpay live keys
- [ ] Update `.env` with live keys
- [ ] Update API_BASE_URL for production domain
- [ ] Enable HTTPS
- [ ] Update OAuth callback URLs
- [ ] Test payment flow
- [ ] Monitor logs for errors
- [ ] Setup error tracking (Sentry)

---

## 📚 Full Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| Setup Guide | Installation & config | `RAZORPAY_SETUP.md` |
| Integration Guide | Component integration | `FRONTEND_INTEGRATION_GUIDE.md` |
| Test Guide | Testing procedures | `FRONTEND_TEST_GUIDE.md` |
| API Reference | Endpoint documentation | `API_REFERENCE.md` |
| Test Report | Backend test results | `BACKEND_TEST_REPORT.md` |
| Summary | Project overview | `COMPLETE_INTEGRATION_SUMMARY.md` |

---

## 🆘 Quick Help

**Backend not starting?**
```bash
python manage.py check  # Check for errors
python manage.py migrate  # Run migrations
```

**Frontend can't connect to backend?**
```
Check API_BASE_URL in .env
Verify backend is running on 8003
Check firewall/network settings
```

**Payment failing?**
```
Use test card: 4111 1111 1111 1111
Check JWT token is sent in header
Verify Razorpay keys in .env
```

**OAuth not working?**
```
Check Google credentials in .env
Verify callback URL is registered
Check internet connection
```

---

## 🔗 Quick Links

- Razorpay Dashboard: https://dashboard.razorpay.com
- Google OAuth Console: https://console.cloud.google.com
- JWT Decoder: https://jwt.io
- Postman Collection: [To be created]
- Issue Tracker: [Project repo]

---

**Version**: 1.0  
**Last Updated**: December 9, 2025  
**Status**: Production Ready ✅

For detailed information, see full documentation files.
