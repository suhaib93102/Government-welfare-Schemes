# Razorpay Payment Gateway Integration Guide

Complete guide for integrating Razorpay payment processing into your EdTech Solver platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Razorpay Account Setup](#razorpay-account-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [API Endpoints](#api-endpoints)
6. [Payment Flow](#payment-flow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## 📱 Overview

Razorpay is a payment gateway that enables you to accept:
- **Credit/Debit Cards** (Visa, Mastercard, American Express)
- **UPI** (Unified Payments Interface)
- **Wallets** (Google Pay, Apple Pay, etc.)
- **NetBanking** (All major Indian banks)
- **EMI** (Equated Monthly Installments)

### Payment Flow

```
User → Frontend → Razorpay Checkout → Payment → Backend Verification → Database Update
```

---

## 🔧 Razorpay Account Setup

### Step 1: Create Razorpay Account

1. Go to [https://razorpay.com](https://razorpay.com)
2. Click "Sign Up" in top right
3. Enter email, password, and phone number
4. Verify email and phone with OTP
5. Complete KYC (Know Your Customer) verification

### Step 2: Get API Keys

1. Login to Razorpay Dashboard
2. Navigate to **Settings → API Keys**
3. Click **Generate Key Pair**
4. You'll see:
   - **Key ID** (Public - safe to expose to frontend)
   - **Key Secret** (Private - NEVER expose)

### Step 3: Enable Payment Methods

1. Go to **Settings → Payment Methods**
2. Enable all desired payment methods:
   - ✅ Cards
   - ✅ UPI
   - ✅ Wallets
   - ✅ NetBanking

### Step 4: Set Webhook URL (Optional for production)

1. Go to **Settings → Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payment/webhook/`
3. Select events:
   - `payment.authorized`
   - `payment.failed`
   - `payment.captured`
   - `refund.created`

---

## 🔐 Backend Configuration

### Step 1: Install Razorpay Library

```bash
pip install razorpay==1.4.1
```

Already added to `requirements.txt`.

### Step 2: Configure Environment Variables

Edit `backend/.env`:

```env
# Razorpay Payment Gateway Configuration
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your-key-secret-here
```

**Where to find these values:**
- Log in to Razorpay Dashboard
- Settings → API Keys
- Copy both Key ID and Key Secret

### Step 3: Verify settings.py Configuration

The settings are already configured in `backend/edtech_project/settings.py`:

```python
# Razorpay Payment Gateway Configuration
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
```

### Step 4: Database Migration

If you modified the Payment model, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

The `razorpay_order_id` and `razorpay_payment_id` fields are already added to the Payment model.

---

## 💻 Frontend Configuration

### Step 1: Update Environment Variables

Edit `EdTechMobile/.env` (create if doesn't exist):

```env
REACT_APP_API_URL=http://localhost:8003/api
REACT_APP_RAZORPAY_KEY=rzp_test_XXXXXXXXXX
```

### Step 2: Verify Razorpay Script Loading

The Razorpay script loads dynamically in `paymentService.ts`:

```typescript
const script = document.createElement('script');
script.src = 'https://checkout.razorpay.com/v1/checkout.js';
```

This ensures the Razorpay checkout is available when needed.

### Step 3: Check Payment Service

The payment service (`paymentService.ts`) handles:
- Order creation on backend
- Razorpay checkout initialization
- Payment verification
- History tracking

---

## 🔌 API Endpoints

### 1. Create Payment Order

**Endpoint:** `POST /api/payment/create-order/`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "plan": "premium",
  "auto_pay": false
}
```

**Plan Options:**
- `premium` - Monthly (₹199)
- `premium_annual` - Annual (₹1990)

**Response:**
```json
{
  "success": true,
  "order_id": "order_KJ9ZN5K5rN7L5Z",
  "amount": 199,
  "amount_paise": 19900,
  "currency": "INR",
  "key_id": "rzp_live_XXXXXXXXXX",
  "plan": "premium",
  "payment_record_id": "uuid-here"
}
```

### 2. Verify Payment

**Endpoint:** `POST /api/payment/verify/`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_KJ9ZN5K5rN7L5Z",
  "razorpay_payment_id": "pay_KJ9ZN5K5rN7L5Z",
  "razorpay_signature": "signature_here",
  "auto_pay": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment_id": "pay_KJ9ZN5K5rN7L5Z",
  "status": "completed",
  "subscription_updated": true,
  "plan": "premium"
}
```

### 3. Get Payment Status

**Endpoint:** `GET /api/payment/status/?order_id=order_KJ9ZN5K5rN7L5Z`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "amount": 199,
    "currency": "INR",
    "status": "completed",
    "payment_method": "razorpay",
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "created_at": "2025-12-09T10:30:00Z"
  }
}
```

### 4. Get Payment History

**Endpoint:** `GET /api/payment/history/`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "total_payments": 2,
  "payments": [
    {
      "id": "uuid",
      "amount": 199,
      "currency": "INR",
      "status": "completed",
      "payment_method": "razorpay",
      "razorpay_payment_id": "pay_...",
      "created_at": "2025-12-09T10:30:00Z",
      "billing_cycle": {
        "start": "2025-12-09T10:30:00Z",
        "end": "2026-01-09T10:30:00Z"
      }
    }
  ]
}
```

### 5. Request Refund

**Endpoint:** `POST /api/payment/refund/`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "payment_id": "uuid-of-payment",
  "reason": "User requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "refund_id": "rfnd_XXXXXXXXXX",
  "amount": 199,
  "status": "refunded"
}
```

### 6. Get Razorpay Key

**Endpoint:** `GET /api/payment/razorpay-key/`

**Response:**
```json
{
  "success": true,
  "key_id": "rzp_live_XXXXXXXXXX"
}
```

---

## 🔄 Payment Flow

### Complete Payment Processing Steps

1. **User Selects Plan**
   - User chooses "Premium Monthly" or "Premium Annual"
   - Frontend calls `paymentService.processPayment(plan)`

2. **Create Order**
   - Frontend → Backend: `POST /api/payment/create-order/`
   - Backend: Creates Razorpay order
   - Returns: Order ID, Amount, Razorpay Key

3. **Show Checkout**
   - Frontend loads Razorpay script
   - Opens checkout modal with order details
   - User selects payment method (Card, UPI, etc.)
   - User completes payment

4. **Verify Payment**
   - Razorpay returns: order_id, payment_id, signature
   - Frontend → Backend: `POST /api/payment/verify/`
   - Backend: Verifies signature using HMAC-SHA256
   - Backend: Updates Payment status to "completed"
   - Backend: Upgrades subscription to "premium"

5. **Confirmation**
   - User sees success message
   - Premium features enabled immediately
   - Payment history updated

### Payment Status Flowchart

```
pending → processing → authorized → captured (completed)
       ↓                           ↓
     failed                     refunded
```

---

## ✅ Testing

### Test Credentials (Razorpay Sandbox)

For testing without real payments, use:

**Test Card Numbers:**
- Visa: `4111 1111 1111 1111`
- Mastercard: `5555 5555 5555 4444`
- American Express: `3782 822463 10005`

**Test UPI:**
- `success@razorpay` (Success)
- `failure@razorpay` (Failure)

**CVV:** Any 3-4 digit number
**Expiry:** Any future date

### Testing Payment Flow

1. **Start Backend**
   ```bash
   cd backend
   python manage.py runserver 8003
   ```

2. **Start Frontend**
   ```bash
   cd EdTechMobile
   npm start
   ```

3. **Test Payment**
   - Navigate to Payment/Subscription screen
   - Select a plan
   - Click "Proceed to Payment"
   - Use test card: `4111 1111 1111 1111`
   - Enter any CVV and future expiry
   - Complete payment

4. **Verify in Database**
   ```bash
   python manage.py shell
   >>> from question_solver.models import Payment
   >>> Payment.objects.last()
   ```

### Test Scenarios

| Scenario | Test Card | Expected Result |
|----------|-----------|-----------------|
| Successful Payment | 4111 1111 1111 1111 | Payment completed, subscription upgraded |
| Declined Card | 4000 0000 0000 0002 | Payment failed, subscription unchanged |
| Insufficient Funds | 4000 0000 0000 9995 | Payment failed, error message |
| Payment Timeout | Wait >5 mins | Timeout error, order status pending |

---

## 🐛 Troubleshooting

### Issue: "Invalid signature" Error

**Cause:** Order ID or Payment ID mismatch

**Solution:**
1. Verify order_id and payment_id from Razorpay response
2. Check that signature is correctly calculated
3. Ensure JWT token is valid

### Issue: "Failed to load payment gateway"

**Cause:** Razorpay script failed to load

**Solution:**
1. Check internet connectivity
2. Verify Razorpay CDN is accessible: `https://checkout.razorpay.com/v1/checkout.js`
3. Check browser console for errors

### Issue: Payment completed but subscription not upgraded

**Cause:** Verification request failed

**Solution:**
1. Check backend logs for errors
2. Verify JWT token in Authorization header
3. Ensure user exists in database
4. Check Payment table for "completed" status

### Issue: Razor Payment says "Server Error"

**Cause:** Backend unavailable or incorrect Key ID

**Solution:**
1. Verify backend is running on port 8003
2. Check RAZORPAY_KEY_ID in .env file
3. Ensure API endpoint is accessible

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid Key" | Wrong Razorpay Key ID | Verify in .env file |
| "Order not found" | Order ID doesn't exist | Check order creation response |
| "Unauthorized" | Missing/invalid token | Login and get fresh token |
| "Amount mismatch" | Order amount ≠ payment amount | Check Razorpay order details |

---

## 🔐 Security Best Practices

### 1. Protect Secret Keys

```python
# ✅ GOOD - Use environment variables
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

# ❌ BAD - Don't hardcode secrets
RAZORPAY_KEY_SECRET = "actual_secret_key"
```

### 2. Verify Signatures Always

```python
# Backend MUST verify signature
is_valid = payment_service.verify_payment_signature(order_id, payment_id, signature)
if not is_valid:
    return Response({'error': 'Invalid signature'}, status=400)
```

### 3. Use HTTPS in Production

```python
# Settings for production
DEBUG = False  # Never True in production
ALLOWED_HOSTS = ['yourdomain.com']
SECURE_SSL_REDIRECT = True
```

### 4. Implement Rate Limiting

Add rate limiting to payment endpoints:

```python
from rest_framework.throttling import UserRateThrottle

class PaymentThrottle(UserRateThrottle):
    rate = '5/hour'  # Max 5 payment attempts per hour per user

class CreatePaymentOrderView(APIView):
    throttle_classes = [PaymentThrottle]
```

### 5. Log Payment Transactions

```python
logger.info(f"Payment processed: order={order_id}, amount={amount}, status={status}")
logger.error(f"Payment failed: {error_message}")
```

### 6. Store Sensitive Data Safely

```python
# Never store full card details
# Razorpay handles PCI-DSS compliance
# Store only: order_id, payment_id, subscription_id
```

### 7. Implement Webhook Verification

```python
def verify_webhook_signature(webhook_body, signature):
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        webhook_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return expected_signature == signature
```

---

## 💰 Pricing & Settlements

### Razorpay Fees (India)

- **Cards (Credit/Debit):** 1.99% + GST
- **UPI:** 0% (Razorpay absorbs fee)
- **NetBanking:** 0% (Razorpay absorbs fee)
- **Wallets:** 1.99% + GST

### Settlement

- Funds credited to your bank account
- **T+1 Settlement** (next business day)
- Minimum settlement: ₹0 (no minimum)
- Settlement fee: Free

### Reconciliation

Download settlement reports from Razorpay Dashboard:

1. Go to **Reports → Settlements**
2. Filter by date range
3. Download CSV
4. Match with your database records

---

## 📞 Support & Resources

- **Razorpay Documentation:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/
- **Support Email:** support@razorpay.com
- **Support Phone:** 1800-112-200 (Toll-free, India)
- **Status Page:** https://status.razorpay.com/

---

##  Quick Checklist

Before going live:

- [ ] Create Razorpay account
- [ ] Get API Keys (Key ID & Key Secret)
- [ ] Add credentials to `.env` file
- [ ] Install razorpay library: `pip install razorpay==1.4.1`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Test payment flow with test cards
- [ ] Verify signatures are validated
- [ ] Set up webhook (optional but recommended)
- [ ] Enable HTTPS in production
- [ ] Implement error handling
- [ ] Set up logging for payments
- [ ] Test refund functionality
- [ ] Verify subscription upgrade works

---

## 📈 Next Steps

1. **Monitor Payments:** Track payment success rate in dashboard
2. **Analyze Revenue:** View settlement reports monthly
3. **Optimize Conversion:** A/B test checkout flow
4. **Add Analytics:** Track which payment methods are popular
5. **Expand Plans:** Add more subscription tiers (student, annual, etc.)
6. **International:** Support multiple currencies and countries

---

**Last Updated:** December 9, 2025

For the latest information, visit: https://razorpay.com
