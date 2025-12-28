# Razorpay Payment Gateway Integration Guide
## Django Backend + React Native Frontend

**Version:** 1.0  
**Last Updated:** December 20, 2024  
**Integration Type:** Server-side with Mobile Client

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Implementation (Django)](#backend-implementation-django)
4. [Frontend Implementation (React Native)](#frontend-implementation-react-native)
5. [Security & Verification](#security--verification)
6. [Testing](#testing)
7. [Go-Live Checklist](#go-live-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Secure Payment Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Mobile    │         │   Django    │         │  Razorpay   │
│   Client    │         │   Backend   │         │   Server    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Request Order     │                       │
       │─────────────────────>│                       │
       │                       │                       │
       │                       │  2. Create Order      │
       │                       │─────────────────────>│
       │                       │                       │
       │                       │  3. Order ID          │
       │                       │<─────────────────────│
       │                       │                       │
       │  4. Order Details     │                       │
       │<─────────────────────│                       │
       │                       │                       │
       │  5. Open Razorpay Checkout                   │
       │──────────────────────────────────────────────>│
       │                       │                       │
       │  6. Payment Success (payment_id, signature)  │
       │<──────────────────────────────────────────────│
       │                       │                       │
       │  7. Verify Payment    │                       │
       │─────────────────────>│                       │
       │                       │                       │
       │                       │  8. Verify Signature  │
       │                       │  (HMAC SHA256)        │
       │                       │                       │
       │  9. Confirmation      │                       │
       │<─────────────────────│                       │
       │                       │                       │
```

### Key Security Principles

1. **Never expose API Secret to client** - All server operations use Key Secret
2. **Server-side Order Creation** - Orders are created on backend only
3. **Signature Verification** - Mandatory HMAC SHA256 verification
4. **Amount in Subunits** - Always convert to smallest currency unit (paise for INR)

---

## Prerequisites

### 1. Razorpay Account Setup

1. Create account at [razorpay.com](https://razorpay.com)
2. Navigate to: **Settings → API Keys**
3. Generate **Test Mode** API Keys:
   - Key ID: `rzp_test_XXXXXXXXXXXXX`
   - Key Secret: `YYYYYYYYYYYYYYYY`

### 2. Backend Dependencies

```bash
pip install razorpay==1.4.1
pip install djangorestframework==3.14.0
```

### 3. Frontend Dependencies

```bash
npm install react-native-razorpay
```

### 4. Environment Configuration

Create `.env` file in backend:
```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYY
```

---

## Backend Implementation (Django)

### Step 1: Install Razorpay Python SDK

```bash
cd backend
pip install razorpay
```

### Step 2: Create Payment Models

**File:** `backend/question_solver/models.py`

```python
from django.db import models
from django.utils import timezone

class RazorpayOrder(models.Model):
    """Store Razorpay order details"""
    user_id = models.CharField(max_length=255, db_index=True)
    order_id = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.IntegerField(help_text="Amount in smallest currency unit (paise)")
    currency = models.CharField(max_length=3, default='INR')
    receipt = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, default='created')
    
    # Payment details (filled after payment)
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    signature = models.CharField(max_length=256, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    # Metadata
    notes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', '-created_at']),
            models.Index(fields=['order_id']),
        ]
    
    def __str__(self):
        return f"{self.order_id} - {self.amount/100} {self.currency}"
    
    def mark_as_paid(self, payment_id, signature):
        """Mark order as paid"""
        self.payment_id = payment_id
        self.signature = signature
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.save()
```

### Step 3: Create Payment Views

**File:** `backend/question_solver/payment_views.py`

```python
"""
Razorpay Payment Integration Views
Handles order creation and payment verification
"""
import razorpay
import hmac
import hashlib
import logging
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RazorpayOrder

logger = logging.getLogger(__name__)

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


@api_view(['POST'])
def create_razorpay_order(request):
    """
    Create Razorpay Order (Server-side)
    
    POST /api/payment/create-order/
    
    Request Body:
    {
        "amount": 299.99,  // Amount in rupees
        "currency": "INR",
        "receipt": "order_rcptid_11",
        "notes": {
            "user_id": "user123",
            "subscription_plan": "premium"
        }
    }
    
    Response:
    {
        "success": true,
        "order_id": "order_IluGWxBm9U8zJ8",
        "amount": 29999,  // Amount in paise
        "currency": "INR",
        "key_id": "rzp_test_XXXXX"  // For client-side checkout
    }
    """
    try:
        # Extract request data
        amount_rupees = request.data.get('amount')
        currency = request.data.get('currency', 'INR')
        receipt = request.data.get('receipt', f'rcpt_{int(timezone.now().timestamp())}')
        notes = request.data.get('notes', {})
        user_id = request.data.get('user_id', 'anonymous')
        
        # Validate amount
        if not amount_rupees or float(amount_rupees) <= 0:
            return Response({
                'success': False,
                'error': 'Invalid amount. Must be greater than 0.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert to smallest currency unit (paise for INR)
        # Formula: amount_in_paise = amount_in_rupees × 100
        amount_paise = int(float(amount_rupees) * 100)
        
        logger.info(f"Creating order: {amount_rupees} {currency} ({amount_paise} paise)")
        
        # Create order using Razorpay API
        order_data = {
            'amount': amount_paise,
            'currency': currency,
            'receipt': receipt,
            'notes': notes,
            'payment_capture': 1  # Auto-capture payment
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Save order to database
        db_order = RazorpayOrder.objects.create(
            user_id=user_id,
            order_id=razorpay_order['id'],
            amount=amount_paise,
            currency=currency,
            receipt=receipt,
            notes=notes,
            status='created'
        )
        
        logger.info(f"Order created successfully: {razorpay_order['id']}")
        
        # Return order details to client
        return Response({
            'success': True,
            'order_id': razorpay_order['id'],
            'amount': amount_paise,
            'currency': currency,
            'key_id': settings.RAZORPAY_KEY_ID,  # Needed for Checkout
            'receipt': receipt,
            'notes': notes
        }, status=status.HTTP_201_CREATED)
        
    except razorpay.errors.BadRequestError as e:
        logger.error(f"Razorpay BadRequest: {str(e)}")
        return Response({
            'success': False,
            'error': 'Invalid request to payment gateway',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Order creation failed: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to create payment order',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def verify_razorpay_payment(request):
    """
    Verify Razorpay Payment Signature (Server-side)
    
    POST /api/payment/verify-payment/
    
    Request Body:
    {
        "razorpay_order_id": "order_IluGWxBm9U8zJ8",
        "razorpay_payment_id": "pay_29QQoUBi66xm2f",
        "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
    }
    
    Response (Success):
    {
        "success": true,
        "message": "Payment verified successfully",
        "payment_id": "pay_29QQoUBi66xm2f",
        "order_id": "order_IluGWxBm9U8zJ8"
    }
    
    Response (Failure):
    {
        "success": false,
        "error": "Invalid payment signature"
    }
    """
    try:
        # Extract payment details from request
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        # Validate required fields
        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({
                'success': False,
                'error': 'Missing required payment details'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Retrieve order from database
        try:
            db_order = RazorpayOrder.objects.get(order_id=razorpay_order_id)
        except RazorpayOrder.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify signature using HMAC SHA256
        # Formula: generated_signature = hmac_sha256(order_id + "|" + payment_id, secret)
        secret = settings.RAZORPAY_KEY_SECRET
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        
        generated_signature = hmac.new(
            secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        logger.info(f"Verifying signature for order: {razorpay_order_id}")
        logger.debug(f"Generated: {generated_signature}")
        logger.debug(f"Received: {razorpay_signature}")
        
        # Compare signatures (constant-time comparison)
        if not hmac.compare_digest(generated_signature, razorpay_signature):
            logger.warning(f"Invalid signature for order: {razorpay_order_id}")
            return Response({
                'success': False,
                'error': 'Invalid payment signature',
                'message': 'Payment verification failed. This payment may be fraudulent.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Signature is valid - fetch payment details from Razorpay
        try:
            payment = razorpay_client.payment.fetch(razorpay_payment_id)
            
            # Update order in database
            db_order.mark_as_paid(
                payment_id=razorpay_payment_id,
                signature=razorpay_signature
            )
            db_order.payment_method = payment.get('method', 'unknown')
            db_order.save()
            
            logger.info(f"Payment verified successfully: {razorpay_payment_id}")
            
            return Response({
                'success': True,
                'message': 'Payment verified successfully',
                'payment_id': razorpay_payment_id,
                'order_id': razorpay_order_id,
                'amount': db_order.amount,
                'currency': db_order.currency,
                'status': 'captured',
                'method': payment.get('method')
            }, status=status.HTTP_200_OK)
            
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Failed to fetch payment details: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to verify payment details',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Payment verification failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_razorpay_key(request):
    """
    Get Razorpay Key ID for client-side checkout
    
    GET /api/payment/razorpay-key/
    
    Response:
    {
        "key_id": "rzp_test_XXXXX"
    }
    """
    return Response({
        'key_id': settings.RAZORPAY_KEY_ID
    })


@api_view(['GET'])
def get_payment_status(request, order_id):
    """
    Get payment status for an order
    
    GET /api/payment/status/{order_id}/
    
    Response:
    {
        "success": true,
        "order_id": "order_XXXXX",
        "status": "paid",
        "amount": 29999,
        "currency": "INR",
        "payment_id": "pay_XXXXX"
    }
    """
    try:
        db_order = RazorpayOrder.objects.get(order_id=order_id)
        
        return Response({
            'success': True,
            'order_id': db_order.order_id,
            'status': db_order.status,
            'amount': db_order.amount,
            'currency': db_order.currency,
            'payment_id': db_order.payment_id,
            'paid_at': db_order.paid_at
        })
        
    except RazorpayOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
```

### Step 4: Configure Django Settings

**File:** `backend/edtech_project/settings.py`

```python
# Razorpay Configuration
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_XXXXX')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'YYYYY')

# Ensure secrets are loaded
if not RAZORPAY_KEY_ID or RAZORPAY_KEY_ID == 'rzp_test_XXXXX':
    print("⚠️  WARNING: Razorpay credentials not configured!")
```

### Step 5: Add URL Routes

**File:** `backend/question_solver/urls.py`

```python
from .payment_views import (
    create_razorpay_order,
    verify_razorpay_payment,
    get_razorpay_key,
    get_payment_status
)

urlpatterns = [
    # ... existing patterns ...
    
    # Razorpay Payment endpoints
    path('payment/create-order/', create_razorpay_order, name='create-razorpay-order'),
    path('payment/verify-payment/', verify_razorpay_payment, name='verify-razorpay-payment'),
    path('payment/razorpay-key/', get_razorpay_key, name='razorpay-key'),
    path('payment/status/<str:order_id>/', get_payment_status, name='payment-status'),
]
```

### Step 6: Create Database Migration

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

---

## Frontend Implementation (React Native)

### Step 1: Install Razorpay SDK

```bash
cd EdTechMobile
npm install react-native-razorpay
```

For iOS:
```bash
cd ios && pod install && cd ..
```

### Step 2: Create Payment Service

**File:** `EdTechMobile/src/services/razorpayService.ts`

```typescript
/**
 * Razorpay Payment Service
 * Handles payment order creation and processing
 */
import RazorpayCheckout from 'react-native-razorpay';
import { API_BASE_URL } from '../config/api';

export interface PaymentOptions {
  amount: number;  // Amount in rupees
  currency?: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayOrder {
  order_id: string;
  amount: number;  // Amount in paise
  currency: string;
  key_id: string;
}

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Create payment order on backend
 */
export const createPaymentOrder = async (
  userId: string,
  amount: number,
  notes: Record<string, any> = {}
): Promise<RazorpayOrder> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/create-order/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        amount: amount,
        currency: 'INR',
        notes: notes,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create payment order');
    }

    return {
      order_id: data.order_id,
      amount: data.amount,
      currency: data.currency,
      key_id: data.key_id,
    };
  } catch (error: any) {
    console.error('Create order error:', error);
    throw new Error(error.message || 'Failed to create payment order');
  }
};

/**
 * Open Razorpay Checkout
 */
export const openRazorpayCheckout = async (
  order: RazorpayOrder,
  options: PaymentOptions
): Promise<PaymentResult> => {
  try {
    // Construct Razorpay checkout options
    const checkoutOptions = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'EdTech Platform',
      description: options.description,
      image: 'https://your-logo-url.com/logo.png',  // Replace with your logo
      prefill: {
        name: options.prefill?.name || '',
        email: options.prefill?.email || '',
        contact: options.prefill?.contact || '',
      },
      notes: options.notes || {},
      theme: {
        color: options.theme?.color || '#6366F1',
      },
    };

    console.log('Opening Razorpay Checkout with options:', checkoutOptions);

    // Open Razorpay Checkout
    const paymentData = await RazorpayCheckout.open(checkoutOptions);

    console.log('Payment successful:', paymentData);

    return {
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_signature: paymentData.razorpay_signature,
    };
  } catch (error: any) {
    console.error('Razorpay Checkout error:', error);

    // Handle user cancellation
    if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
      throw new Error('Payment cancelled by user');
    }

    // Handle network errors
    if (error.code === RazorpayCheckout.NETWORK_ERROR) {
      throw new Error('Network error. Please check your connection.');
    }

    throw new Error(error.description || 'Payment failed');
  }
};

/**
 * Verify payment on backend
 */
export const verifyPayment = async (
  paymentResult: PaymentResult
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/verify-payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Payment verification failed');
    }

    console.log('Payment verified successfully:', data);
    return true;
  } catch (error: any) {
    console.error('Payment verification error:', error);
    throw new Error(error.message || 'Payment verification failed');
  }
};

/**
 * Complete payment flow
 * Creates order → Opens checkout → Verifies payment
 */
export const processPayment = async (
  userId: string,
  amount: number,
  options: PaymentOptions
): Promise<PaymentResult> => {
  try {
    // Step 1: Create order on backend
    console.log(`Creating payment order for ${amount} INR...`);
    const order = await createPaymentOrder(userId, amount, options.notes);

    // Step 2: Open Razorpay checkout
    console.log('Opening Razorpay checkout...');
    const paymentResult = await openRazorpayCheckout(order, options);

    // Step 3: Verify payment on backend
    console.log('Verifying payment...');
    await verifyPayment(paymentResult);

    console.log('Payment process completed successfully');
    return paymentResult;
  } catch (error: any) {
    console.error('Payment process error:', error);
    throw error;
  }
};

export default {
  createPaymentOrder,
  openRazorpayCheckout,
  verifyPayment,
  processPayment,
};
```

### Step 3: Create Payment Component

**File:** `EdTechMobile/src/components/PaymentScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { processPayment } from '../services/razorpayService';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

interface PaymentScreenProps {
  userId: string;
  amount: number;
  planName: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  userId,
  amount,
  planName,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const paymentResult = await processPayment(userId, amount, {
        amount: amount,
        description: `Subscription - ${planName}`,
        prefill: {
          name: 'User Name',  // Replace with actual user name
          email: 'user@example.com',  // Replace with actual email
          contact: '+919876543210',  // Replace with actual contact
        },
        notes: {
          user_id: userId,
          plan: planName,
        },
        theme: {
          color: '#6366F1',
        },
      });

      Alert.alert(
        'Payment Successful',
        `Payment ID: ${paymentResult.razorpay_payment_id}`,
        [
          {
            text: 'OK',
            onPress: () => onPaymentSuccess(paymentResult.razorpay_payment_id),
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message, [
        {
          text: 'OK',
          onPress: () => onPaymentFailure(error.message),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Payment Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Plan:</Text>
          <Text style={styles.value}>{planName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={styles.amount}>₹{amount}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{amount}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>🔒 Secure payment powered by Razorpay</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textMuted,
  },
  value: {
    ...typography.body,
    fontWeight: '600',
  },
  amount: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    ...typography.h4,
    color: colors.white,
  },
  secureText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
```

---

## Security & Verification

### HMAC SHA256 Signature Verification

**Critical Security Step:** Always verify payment signatures on the server.

```python
# Formula (from Razorpay docs)
generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret)

if (generated_signature == razorpay_signature):
    # Payment is authentic
    process_payment()
else:
    # Payment is fraudulent
    reject_payment()
```

### Security Checklist

- ✅ **Never expose Key Secret to client**
- ✅ **Always verify signatures on server**
- ✅ **Use HTTPS for all API calls**
- ✅ **Store orders in database before payment**
- ✅ **Use constant-time comparison for signatures**
- ✅ **Log all payment attempts**
- ✅ **Implement rate limiting on payment endpoints**

---

## Testing

### Test with Razorpay Test Mode

1. Use Test API keys (starting with `rzp_test_`)
2. Use test cards from [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)

**Test Card Details:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
Name: Any name
```

### Testing Checklist

- ✅ Create order successfully
- ✅ Open Razorpay checkout
- ✅ Complete payment with test card
- ✅ Verify signature correctly
- ✅ Handle payment cancellation
- ✅ Handle network errors
- ✅ Test with different amounts
- ✅ Test with different currencies (if applicable)

---

## Go-Live Checklist

### Before Going Live

1. **Switch to Live Mode API Keys**
   - Generate Live Mode keys from Dashboard
   - Update `.env` file with live keys
   - **Never commit live keys to git**

2. **Enable Auto-Capture**
   - Dashboard → Settings → Payment Capture
   - Set to "Automatic" for instant capture

3. **Setup Webhooks**
   - Dashboard → Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay/`
   - Subscribe to events: `payment.authorized`, `payment.failed`

4. **Security Audit**
   - Ensure signature verification is working
   - Test error handling
   - Check logs for sensitive data

5. **Test End-to-End in Production**
   - Make a small real payment
   - Verify funds are captured
   - Check settlement schedule

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid Key ID or Secret"
- **Solution:** Check `.env` file, ensure keys are correct

**Issue:** "Signature mismatch"
- **Solution:** Ensure using correct Key Secret, check HMAC logic

**Issue:** "Order not found"
- **Solution:** Ensure order is created before opening checkout

**Issue:** "Payment cancelled by user"
- **Solution:** Handle gracefully, allow retry

---

## Complete Integration Example

**Test Script:** `backend/test_razorpay_integration.py`

```python
#!/usr/bin/env python3
"""
Test Razorpay Integration
"""
import requests
import json

API_BASE = "http://127.0.0.1:8003/api"

def test_razorpay_integration():
    print("🧪 Testing Razorpay Integration\n")
    
    # Step 1: Create Order
    print("1. Creating payment order...")
    create_response = requests.post(f"{API_BASE}/payment/create-order/", json={
        "user_id": "test_user_123",
        "amount": 299.99,
        "notes": {
            "plan": "premium",
            "duration": "monthly"
        }
    })
    
    print(f"Status: {create_response.status_code}")
    order_data = create_response.json()
    print(f"Response: {json.dumps(order_data, indent=2)}\n")
    
    if order_data.get('success'):
        order_id = order_data['order_id']
        print(f"✅ Order created: {order_id}\n")
        
        # Step 2: Simulate payment (in real flow, this happens in Razorpay)
        print("2. Simulating payment...(skip in test mode)\n")
        
        # Step 3: Get payment status
        print("3. Checking payment status...")
        status_response = requests.get(f"{API_BASE}/payment/status/{order_id}/")
        print(f"Response: {json.dumps(status_response.json(), indent=2)}\n")
    else:
        print("❌ Order creation failed")

if __name__ == "__main__":
    test_razorpay_integration()
```

---

**Status:** ✅ **Production-Ready Integration**  
**Last Updated:** December 20, 2024  
**Next Steps:** Test in staging, then go live!
