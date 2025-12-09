# Razorpay Integration - 5-Minute Quick Start

Complete Razorpay integration from scratch to first payment.

## 🚀 5-Minute Setup

### 1️⃣ Get Razorpay Keys (2 minutes)

```bash
# Step 1: Go to https://razorpay.com → Sign Up
# Step 2: Verify email & phone
# Step 3: Go to Dashboard → Settings → API Keys
# Step 4: Click "Generate Key Pair"
# Copy these values:
# - Key ID: rzp_test_XXXXXXXXXX
# - Key Secret: [very long secret]
```

### 2️⃣ Configure Backend (1 minute)

Edit `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your-secret-here
```

### 3️⃣ Install Dependencies (1 minute)

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
```

### 4️⃣ Test Payment (1 minute)

```bash
# Start backend
python manage.py runserver 8003

# In another terminal, start frontend
cd EdTechMobile
npm install
npm start

# Click Subscription → Select plan → Pay
# Use test card: 4111 1111 1111 1111
# Any CVV and future expiry
```

✅ **Payment successful!**

---

## 📋 Implementation Checklist

### Backend Files
- ✅ `payment_service.py` - Razorpay API client
- ✅ `payment_views.py` - Payment endpoints
- ✅ `models.py` - Payment model with Razorpay fields
- ✅ `urls.py` - Payment routes
- ✅ `requirements.txt` - razorpay library
- ✅ `.env` - Razorpay credentials

### Frontend Files
- ✅ `paymentService.ts` - Payment processing
- ✅ `PaymentScreen.tsx` - Payment UI
- ✅ Dynamic Razorpay script loading

### Documentation
- ✅ `RAZORPAY_SETUP.md` - Complete guide
- ✅ This quick start guide

---

## 💳 Payment Flow

```
User selects plan
      ↓
Backend creates Razorpay order
      ↓
Frontend shows Razorpay checkout
      ↓
User completes payment
      ↓
Backend verifies signature
      ↓
✅ Subscription upgraded to premium
```

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payment/create-order/` | Create payment order |
| POST | `/api/payment/verify/` | Verify payment |
| GET | `/api/payment/status/` | Check payment status |
| GET | `/api/payment/history/` | View payment history |
| POST | `/api/payment/refund/` | Request refund |
| GET | `/api/payment/razorpay-key/` | Get Razorpay key |

---

## 🧪 Test Cards

Use in sandbox mode (before going live):

| Card Type | Card Number | CVV | Expiry |
|-----------|-------------|-----|--------|
| Visa (Success) | 4111 1111 1111 1111 | Any 3 digits | Any future |
| Mastercard (Success) | 5555 5555 5555 4444 | Any 3 digits | Any future |
| Visa (Decline) | 4000 0000 0000 0002 | Any 3 digits | Any future |

---

## 🔑 Key Components

### Backend Payment Service (`payment_service.py`)

```python
# Create order
order = payment_service.create_order(
    amount=199,
    user_id="user123",
    plan_type="premium"
)

# Verify signature
is_valid = payment_service.verify_payment_signature(
    order_id, payment_id, signature
)

# Get payment details
details = payment_service.get_payment_details(payment_id)
```

### Frontend Payment Service (`paymentService.ts`)

```typescript
// Create and verify payment
const result = await paymentService.processPayment('premium');

// Get history
const history = await paymentService.getPaymentHistory();

// Request refund
const refund = await paymentService.requestRefund(paymentId);
```

---

## 🔐 Security

✅ **What's Protected:**
- Secret key never exposed to frontend
- Signature verification prevents fraud
- Tokens validated on every request
- Payments logged with timestamps

✅ **Best Practices Implemented:**
- HMAC-SHA256 signature verification
- JWT authentication on all endpoints
- Transaction logging
- Database record creation before processing

---

## ✨ Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Payment order creation | ✅ Complete | Auto-generates order ID |
| Razorpay checkout | ✅ Complete | Modal-based, user-friendly |
| Signature verification | ✅ Complete | HMAC-SHA256 validation |
| Subscription upgrade | ✅ Complete | Automatic on payment success |
| Payment history | ✅ Complete | Searchable, filterable |
| Refund processing | ✅ Complete | One-click refund requests |
| Error handling | ✅ Complete | User-friendly error messages |
| Mobile responsive | ✅ Complete | Works on all devices |

---

##  What Happens After Payment

1. **Payment Verified** ✅
   - Backend validates signature
   - Status set to "completed"

2. **Subscription Updated** 📈
   - User plan upgraded to "premium"
   - next_billing_date set to 30 days

3. **User Experience** 🎉
   - Premium features enabled immediately
   - Payment receipt displayed
   - History updated

4. **Backend Logs** 📝
   - Payment transaction recorded
   - Subscription change logged
   - Revenue tracked

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid Key" | Check RAZORPAY_KEY_ID in .env |
| Script load fails | Check internet, verify Razorpay CDN |
| Signature error | Verify order_id and payment_id match |
| Subscription not upgraded | Check JWT token validity |
| Can't see payment history | Ensure authentication token is valid |

---

## 📊 Monitoring Payments

### Check Recent Payments

```bash
python manage.py shell
>>> from question_solver.models import Payment
>>> Payment.objects.all().order_by('-created_at')[:5]
```

### View Payment Status

```bash
>>> payment = Payment.objects.last()
>>> payment.status
>>> payment.razorpay_payment_id
>>> payment.subscription.plan
```

---

## 🚀 Going Live

When ready for production:

1. **Get Live Keys**
   - Razorpay Dashboard → Settings → API Keys
   - Use "Live" tab, not "Test"

2. **Update .env**
   ```env
   RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
   RAZORPAY_KEY_SECRET=live-secret-here
   ```

3. **Enable HTTPS**
   ```python
   # settings.py
   DEBUG = False
   SECURE_SSL_REDIRECT = True
   ```

4. **Test Again**
   - Use real card (will be charged)
   - Verify settlement in Razorpay dashboard

---

## 📚 Learn More

- **Full Guide:** See `RAZORPAY_SETUP.md`
- **Razorpay Docs:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/

---

## ✅ Status

| Component | Status |
|-----------|--------|
| Backend service | ✅ Ready |
| Frontend service | ✅ Ready |
| UI Component | ✅ Ready |
| Documentation | ✅ Complete |
| Testing | ✅ Can test with sandbox |
| Production | 🔄 Ready after live keys |

---

**Ready to accept payments!** 🎉

Next: Go to https://razorpay.com, get your keys, add to .env, and run the app!
