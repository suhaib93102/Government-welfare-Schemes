"""
Razorpay Payment Integration Views
Django REST Framework endpoints for payment processing

Author: EdTech Platform
Date: December 20, 2024
"""
import razorpay
import hmac
import hashlib
import logging
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RazorpayOrder, UserCoins, CoinTransaction, CoinWithdrawal
from django.db import transaction as db_transaction

logger = logging.getLogger(__name__)

# Initialize Razorpay client with credentials from settings
try:
    razorpay_client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    logger.info("Razorpay client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Razorpay client: {e}")
    razorpay_client = None


@api_view(['POST'])
def create_razorpay_order(request):
    """
    Create Razorpay Order (Server-side Order Creation)
    
    Endpoint: POST /api/payment/create-order/
    
    Request Body:
    {
        "amount": 299.99,         // Amount in rupees (float)
        "currency": "INR",        // Currency code (default: INR)
        "receipt": "rcpt_001",    // Optional receipt ID
        "user_id": "user123",     // User identifier
        "notes": {                // Optional metadata
            "subscription_plan": "premium",
            "duration": "monthly"
        }
    }
    
    Response (Success):
    {
        "success": true,
        "order_id": "order_IluGWxBm9U8zJ8",
        "amount": 29999,          // Amount in paise (smallest unit)
        "currency": "INR",
        "key_id": "rzp_test_XXXXX",
        "receipt": "rcpt_001",
        "notes": {...}
    }
    
    Response (Error):
    {
        "success": false,
        "error": "Error message",
        "details": "Detailed error information"
    }
    
    Security Notes:
    - Amount is converted to smallest currency unit (paise for INR)
    - Order is saved to database before returning to client
    - Key Secret is NEVER exposed to client
    """
    try:
        # Validate Razorpay client initialization
        if not razorpay_client:
            return Response({
                'success': False,
                'error': 'Payment gateway not configured'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Extract and validate request data
        amount_rupees = request.data.get('amount')
        currency = request.data.get('currency', 'INR')
        receipt = request.data.get('receipt', f'rcpt_{int(timezone.now().timestamp())}')
        notes = request.data.get('notes', {})
        user_id = request.data.get('user_id', 'anonymous')
        
        # Validate amount
        if not amount_rupees and amount_rupees != 0:
            return Response({
                'success': False,
                'error': 'Amount is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_float = float(amount_rupees)
            if amount_float < 0:
                raise ValueError("Amount cannot be negative")
        except (ValueError, TypeError) as e:
            return Response({
                'success': False,
                'error': 'Invalid amount. Must be a non-negative number.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle zero-amount orders (100% promo discount)
        if amount_float == 0:
            logger.info(f"Creating zero-amount order for user {user_id} (100% discount applied)")
            
            # Create a special order record without Razorpay API call
            db_order = RazorpayOrder.objects.create(
                user_id=user_id,
                razorpay_order_id=f'zero_{int(timezone.now().timestamp())}_{user_id}',
                amount=0,
                amount_paise=0,
                currency=currency,
                receipt=receipt,
                notes=notes,
                status='completed'  # Mark as completed immediately
            )
            
            return Response({
                'success': True,
                'order_id': db_order.razorpay_order_id,
                'amount': 0,
                'currency': currency,
                'key_id': settings.RAZORPAY_KEY_ID,
                'receipt': receipt,
                'notes': notes,
                'zero_amount': True,
                'message': 'Zero-amount order created (100% discount applied)'
            }, status=status.HTTP_201_CREATED)
        
        # Convert to smallest currency unit (paise for INR)
        # Formula: amount_in_paise = amount_in_rupees × 100
        # Example: ₹299.99 → 29999 paise
        amount_paise = int(amount_float * 100)
        
        logger.info(f"Creating Razorpay order: {amount_float} {currency} ({amount_paise} paise) for user {user_id}")
        
        # Prepare order data for Razorpay API
        order_data = {
            'amount': amount_paise,
            'currency': currency,
            'receipt': receipt,
            'notes': notes,
            'payment_capture': 1  # Auto-capture after authorization
        }
        
        # Create order via Razorpay API
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Save order to database for tracking
        db_order = RazorpayOrder.objects.create(
            user_id=user_id,
            razorpay_order_id=razorpay_order['id'],
            amount=amount_float,
            amount_paise=amount_paise,
            currency=currency,
            receipt=receipt,
            notes=notes,
            status='created'
        )
        
        logger.info(f"✅ Order created successfully: {razorpay_order['id']}")
        
        # Return order details to client (for Razorpay Checkout)
        return Response({
            'success': True,
            'order_id': razorpay_order['id'],
            'amount': amount_paise,
            'currency': currency,
            'key_id': settings.RAZORPAY_KEY_ID,  # Public key for checkout
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
    
    except razorpay.errors.ServerError as e:
        logger.error(f"Razorpay ServerError: {str(e)}")
        return Response({
            'success': False,
            'error': 'Payment gateway temporarily unavailable',
            'details': 'Please try again later'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
    Verify Razorpay Payment Signature (Server-side Verification)
    
    Endpoint: POST /api/payment/verify-payment/
    
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
        "order_id": "order_IluGWxBm9U8zJ8",
        "amount": 29999,
        "currency": "INR",
        "status": "captured",
        "method": "card"
    }
    
    Response (Failure):
    {
        "success": false,
        "error": "Invalid payment signature",
        "message": "Payment verification failed. This payment may be fraudulent."
    }
    
    Security Implementation:
    1. Retrieve order_id from database (never trust client)
    2. Generate HMAC SHA256 signature: hmac_sha256(order_id + "|" + payment_id, secret)
    3. Use constant-time comparison to prevent timing attacks
    4. Fetch payment details from Razorpay to confirm
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
                'error': 'Missing required payment details',
                'required': ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Retrieve order from database (CRITICAL: Don't trust client-provided order_id)
        try:
            db_order = RazorpayOrder.objects.get(razorpay_order_id=razorpay_order_id)
        except RazorpayOrder.DoesNotExist:
            logger.warning(f"Order not found: {razorpay_order_id}")
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment already verified
        if db_order.status == 'paid':
            return Response({
                'success': True,
                'message': 'Payment already verified',
                'payment_id': db_order.razorpay_payment_id,
                'order_id': razorpay_order_id
            })
        
        # Generate signature using HMAC SHA256
        # Formula (from Razorpay docs): generated_signature = hmac_sha256(order_id + "|" + payment_id, secret)
        secret = settings.RAZORPAY_KEY_SECRET
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        
        generated_signature = hmac.new(
            secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        logger.info(f"Verifying signature for order: {razorpay_order_id}")
        logger.debug(f"Message: {message}")
        logger.debug(f"Generated signature: {generated_signature[:20]}...")
        logger.debug(f"Received signature: {razorpay_signature[:20]}...")
        
        # Compare signatures using constant-time comparison (prevents timing attacks)
        if not hmac.compare_digest(generated_signature, razorpay_signature):
            logger.warning(f"⚠️ INVALID SIGNATURE for order: {razorpay_order_id}")
            logger.warning(f"Expected: {generated_signature}")
            logger.warning(f"Received: {razorpay_signature}")
            
            return Response({
                'success': False,
                'error': 'Invalid payment signature',
                'message': 'Payment verification failed. This payment may be fraudulent.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"✅ Signature verified for order: {razorpay_order_id}")
        
        # Signature is valid - Fetch payment details from Razorpay to double-check
        try:
            payment = razorpay_client.payment.fetch(razorpay_payment_id)
            
            # Verify payment status
            if payment['status'] != 'captured' and payment['status'] != 'authorized':
                logger.warning(f"Payment status is {payment['status']}, expected captured/authorized")
            
            # Verify amount matches
            if payment['amount'] != db_order.amount_paise:
                logger.error(f"Amount mismatch! Order: {db_order.amount_paise}, Payment: {payment['amount']}")
                return Response({
                    'success': False,
                    'error': 'Payment amount mismatch'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update order in database
            db_order.razorpay_payment_id = razorpay_payment_id
            db_order.razorpay_signature = razorpay_signature
            db_order.payment_method = payment.get('method', 'unknown')
            db_order.status = 'paid'
            db_order.paid_at = timezone.now()
            db_order.save()
            
            logger.info(f"✅ Payment verified and saved: {razorpay_payment_id}")
            
            return Response({
                'success': True,
                'message': 'Payment verified successfully',
                'payment_id': razorpay_payment_id,
                'order_id': razorpay_order_id,
                'amount': db_order.amount_paise,
                'currency': db_order.currency,
                'status': payment.get('status', 'captured'),
                'method': payment.get('method', 'unknown')
            }, status=status.HTTP_200_OK)
            
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Failed to fetch payment details: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to verify payment with gateway',
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
    Get Razorpay Public Key ID for client-side checkout
    
    Endpoint: GET /api/razorpay/key/
    
    Response:
    {
        "success": true,
        "key_id": "rzp_test_XXXXXXXXXXXXX"
    }
    
    Note: This returns the PUBLIC key ID, NOT the secret
    """
    return Response({
        'success': True,
        'key_id': settings.RAZORPAY_KEY_ID
    })


@api_view(['GET'])
def get_payment_status(request, order_id):
    """
    Get payment status for an order
    
    Endpoint: GET /api/razorpay/status/<order_id>/
    
    Response:
    {
        "success": true,
        "order_id": "order_XXXXX",
        "status": "paid",
        "amount": 29999,
        "currency": "INR",
        "payment_id": "pay_XXXXX",
        "paid_at": "2024-12-20T10:30:00Z"
    }
    """
    try:
        db_order = RazorpayOrder.objects.get(razorpay_order_id=order_id)
        
        return Response({
            'success': True,
            'order_id': db_order.razorpay_order_id,
            'status': db_order.status,
            'amount': db_order.amount_paise,
            'currency': db_order.currency,
            'payment_id': db_order.razorpay_payment_id,
            'payment_method': db_order.payment_method,
            'paid_at': db_order.paid_at,
            'created_at': db_order.created_at
        })
        
    except RazorpayOrder.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_payment_history(request):
    """
    Get payment history for a user
    
    Endpoint: GET /api/payment/history/?user_id=user123
    
    Response:
    {
        "success": true,
        "payments": [...]
    }
    """
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        return Response({
            'success': False,
            'error': 'user_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    orders = RazorpayOrder.objects.filter(user_id=user_id).order_by('-created_at')
    
    payments = [{
        'order_id': order.razorpay_order_id,
        'amount': order.amount_paise,
        'currency': order.currency,
        'status': order.status,
        'payment_id': order.razorpay_payment_id,
        'payment_method': order.payment_method,
        'created_at': order.created_at,
        'paid_at': order.paid_at
    } for order in orders]
    
    return Response({
        'success': True,
        'orders': payments,  # For backwards compatibility
        'payments': payments,
        'count': len(payments)
    })


@api_view(['POST'])
def request_coin_withdrawal(request):
    """
    Request coin withdrawal - Convert coins to money
    
    Endpoint: POST /api/razorpay/withdraw/
    
    Conversion Rate: 10 coins = ₹1
    Minimum Withdrawal: 100 coins (₹10)
    
    Request Body:
    {
        "user_id": "user123",
        "coins_amount": 500,
        "payout_method": "upi",  // or "bank"
        "upi_id": "user@paytm",  // if payout_method is upi
        "account_holder_name": "John Doe",
        "account_number": "1234567890",  // if payout_method is bank
        "ifsc_code": "SBIN0001234"  // if payout_method is bank
    }
    
    Response (Success):
    {
        "success": true,
        "withdrawal_id": "uuid",
        "coins_deducted": 500,
        "amount": 50.00,
        "status": "pending",
        "message": "Withdrawal request submitted successfully"
    }
    """
    try:
        # Extract request data
        user_id = request.data.get('user_id')
        coins_amount = request.data.get('coins_amount')
        payout_method = request.data.get('payout_method')
        account_holder_name = request.data.get('account_holder_name')
        
        # Validate required fields
        if not all([user_id, coins_amount, payout_method, account_holder_name]):
            return Response({
                'success': False,
                'error': 'Missing required fields',
                'required': ['user_id', 'coins_amount', 'payout_method', 'account_holder_name']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate coins amount
        try:
            coins_amount = int(coins_amount)
            if coins_amount < 100:
                return Response({
                    'success': False,
                    'error': 'Minimum withdrawal is 100 coins (₹10)'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'Invalid coins amount'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's coin balance
        try:
            user_coins = UserCoins.objects.get(user_id=user_id)
        except UserCoins.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User has no coin balance'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has enough coins
        if user_coins.total_coins < coins_amount:
            return Response({
                'success': False,
                'error': f'Insufficient coins. Available: {user_coins.total_coins}, Requested: {coins_amount}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate rupees amount (10 coins = 1 rupee)
        rupees_amount = coins_amount / 10.0
        payout_amount_paise = int(rupees_amount * 100)
        
        # Validate payout method specific fields
        upi_id = None
        account_number = None
        ifsc_code = None
        
        if payout_method == 'upi':
            upi_id = request.data.get('upi_id')
            if not upi_id:
                return Response({
                    'success': False,
                    'error': 'UPI ID is required for UPI payout'
                }, status=status.HTTP_400_BAD_REQUEST)
        elif payout_method == 'bank':
            account_number = request.data.get('account_number')
            ifsc_code = request.data.get('ifsc_code')
            if not all([account_number, ifsc_code]):
                return Response({
                    'success': False,
                    'error': 'Account number and IFSC code are required for bank transfer'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                'success': False,
                'error': 'Invalid payout method. Must be "upi" or "bank"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use database transaction to ensure atomicity
        with db_transaction.atomic():
            # Deduct coins from user balance
            user_coins.total_coins -= coins_amount
            user_coins.coins_spent += coins_amount
            user_coins.save()
            
            # Create coin transaction record
            CoinTransaction.objects.create(
                user_coins=user_coins,
                amount=-coins_amount,
                transaction_type='withdrawal',
                reason=f'Withdrawal request - ₹{rupees_amount}'
            )
            
            # Create withdrawal request
            withdrawal = CoinWithdrawal.objects.create(
                user_id=user_id,
                coins_amount=coins_amount,
                rupees_amount=rupees_amount,
                payout_amount=payout_amount_paise,
                account_holder_name=account_holder_name,
                account_number=account_number,
                ifsc_code=ifsc_code,
                upi_id=upi_id,
                payout_method=payout_method,
                status='pending'
            )
            
            logger.info(f"✅ Withdrawal request created: {withdrawal.id} - {coins_amount} coins (₹{rupees_amount}) for user {user_id}")
        
        return Response({
            'success': True,
            'withdrawal_id': str(withdrawal.id),
            'coins_deducted': coins_amount,
            'amount': float(rupees_amount),
            'remaining_balance': user_coins.total_coins,
            'status': 'pending',
            'message': 'Withdrawal request submitted successfully. Processing may take 1-3 business days.',
            'conversion_rate': '10 coins = ₹1'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Withdrawal request failed: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to process withdrawal request',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_withdrawal_history(request):
    """
    Get withdrawal history for a user
    
    Endpoint: GET /api/razorpay/withdrawals/?user_id=user123
    
    Response:
    {
        "success": true,
        "withdrawals": [...],
        "total_withdrawn_coins": 1000,
        "total_withdrawn_rupees": 100.00
    }
    """
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        return Response({
            'success': False,
            'error': 'user_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    withdrawals = CoinWithdrawal.objects.filter(user_id=user_id).order_by('-created_at')
    
    withdrawal_list = [{
        'withdrawal_id': str(w.id),
        'coins_amount': w.coins_amount,
        'rupees_amount': float(w.rupees_amount),
        'payout_method': w.payout_method,
        'status': w.status,
        'created_at': w.created_at,
        'completed_at': w.completed_at,
        'failure_reason': w.failure_reason
    } for w in withdrawals]
    
    total_coins = sum(w.coins_amount for w in withdrawals if w.status == 'completed')
    total_rupees = sum(float(w.rupees_amount) for w in withdrawals if w.status == 'completed')
    
    return Response({
        'success': True,
        'withdrawals': withdrawal_list,
        'count': len(withdrawal_list),
        'total_withdrawn_coins': total_coins,
        'total_withdrawn_rupees': total_rupees
    })


@api_view(['GET'])
def get_withdrawal_status(request, withdrawal_id):
    """
    Get withdrawal status
    
    Endpoint: GET /api/razorpay/withdrawal/<withdrawal_id>/
    
    Response:
    {
        "success": true,
        "withdrawal_id": "uuid",
        "status": "completed",
        "coins_amount": 500,
        "rupees_amount": 50.00
    }
    """
    try:
        withdrawal = CoinWithdrawal.objects.get(id=withdrawal_id)
        
        return Response({
            'success': True,
            'withdrawal_id': str(withdrawal.id),
            'user_id': withdrawal.user_id,
            'coins_amount': withdrawal.coins_amount,
            'rupees_amount': float(withdrawal.rupees_amount),
            'payout_method': withdrawal.payout_method,
            'status': withdrawal.status,
            'created_at': withdrawal.created_at,
            'processed_at': withdrawal.processed_at,
            'completed_at': withdrawal.completed_at,
            'failure_reason': withdrawal.failure_reason,
            'razorpay_payout_id': withdrawal.razorpay_payout_id
        })
        
    except CoinWithdrawal.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Withdrawal not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def cancel_withdrawal(request, withdrawal_id):
    """
    Cancel pending withdrawal and refund coins
    
    Endpoint: POST /api/razorpay/withdrawal/<withdrawal_id>/cancel/
    
    Response:
    {
        "success": true,
        "message": "Withdrawal cancelled and coins refunded"
    }
    """
    try:
        withdrawal = CoinWithdrawal.objects.get(id=withdrawal_id)
        
        # Only allow cancellation of pending withdrawals
        if withdrawal.status != 'pending':
            return Response({
                'success': False,
                'error': f'Cannot cancel withdrawal with status: {withdrawal.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use database transaction to ensure atomicity
        with db_transaction.atomic():
            # Refund coins to user
            user_coins, created = UserCoins.objects.get_or_create(
                user_id=withdrawal.user_id,
                defaults={'total_coins': 0}
            )
            user_coins.total_coins += withdrawal.coins_amount
            user_coins.coins_spent -= withdrawal.coins_amount
            user_coins.save()
            
            # Create refund transaction
            CoinTransaction.objects.create(
                user_coins=user_coins,
                amount=withdrawal.coins_amount,
                transaction_type='refund',
                reason=f'Withdrawal cancelled - refund'
            )
            
            # Update withdrawal status
            withdrawal.status = 'cancelled'
            withdrawal.save()
            
            logger.info(f"✅ Withdrawal cancelled and refunded: {withdrawal_id}")
        
        return Response({
            'success': True,
            'message': 'Withdrawal cancelled and coins refunded',
            'refunded_coins': withdrawal.coins_amount,
            'new_balance': user_coins.total_coins
        })
        
    except CoinWithdrawal.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Withdrawal not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        logger.error(f"Withdrawal cancellation failed: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to cancel withdrawal',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def razorpay_webhook(request):
    """
    Razorpay Webhook Handler
    
    Endpoint: POST /api/razorpay/webhook/
    
    Handles Razorpay events like payment.authorized, payment.captured, payment.failed
    Automatically processes coin withdrawals when payment is successful
    
    Security: Verifies webhook signature to ensure authenticity
    """
    try:
        # Get webhook signature from headers
        webhook_signature = request.headers.get('X-Razorpay-Signature', '')
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET if hasattr(settings, 'RAZORPAY_WEBHOOK_SECRET') else settings.RAZORPAY_KEY_SECRET
        
        # Get raw request body for signature verification
        webhook_body = request.body.decode('utf-8')
        
        # Verify webhook signature
        try:
            razorpay_client.utility.verify_webhook_signature(webhook_body, webhook_signature, webhook_secret)
        except razorpay.errors.SignatureVerificationError:
            logger.warning(f"Invalid webhook signature")
            return Response({
                'success': False,
                'error': 'Invalid signature'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse webhook payload
        payload = request.data
        event_type = payload.get('event', '')
        
        logger.info(f"Received Razorpay webhook: {event_type}")
        
        # Handle payment.captured event (successful payment)
        if event_type == 'payment.captured':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            order_id = payment_entity.get('order_id')
            payment_id = payment_entity.get('id')
            amount_paise = payment_entity.get('amount', 0)
            
            # Find the order in database
            try:
                db_order = RazorpayOrder.objects.get(razorpay_order_id=order_id)
                
                # Check if this is a coin withdrawal order
                if db_order.notes and db_order.notes.get('type') == 'coin_withdrawal':
                    coins_amount = db_order.notes.get('coins_amount', 0)
                    user_id = db_order.notes.get('user_id') or db_order.user_id
                    
                    with db_transaction.atomic():
                        # Deduct coins from user
                        user_coins, created = UserCoins.objects.get_or_create(
                            user_id=user_id,
                            defaults={'total_coins': 0}
                        )
                        
                        if user_coins.total_coins >= coins_amount:
                            user_coins.total_coins -= coins_amount
                            user_coins.coins_spent += coins_amount
                            user_coins.save()
                            
                            # Create withdrawal record
                            CoinWithdrawal.objects.create(
                                user_id=user_id,
                                coins_amount=coins_amount,
                                rupees_amount=coins_amount / 10,
                                payout_method='razorpay',
                                status='completed',
                                razorpay_order_id=order_id,
                                razorpay_payment_id=payment_id
                            )
                            
                            # Create transaction record
                            CoinTransaction.objects.create(
                                user_coins=user_coins,
                                amount=coins_amount,
                                transaction_type='withdrawal',
                                reason=f'Razorpay withdrawal - Payment ID: {payment_id}'
                            )
                            
                            # Update order status
                            db_order.status = 'paid'
                            db_order.razorpay_payment_id = payment_id
                            db_order.save()
                            
                            logger.info(f"✅ Coin withdrawal processed: {coins_amount} coins for user {user_id}")
                
            except RazorpayOrder.DoesNotExist:
                logger.warning(f"Order not found in database: {order_id}")
        
        # Handle payment.failed event
        elif event_type == 'payment.failed':
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            order_id = payment_entity.get('order_id')
            
            try:
                db_order = RazorpayOrder.objects.get(razorpay_order_id=order_id)
                db_order.status = 'failed'
                db_order.save()
                logger.info(f"Payment failed for order: {order_id}")
            except RazorpayOrder.DoesNotExist:
                pass
        
        return Response({
            'success': True,
            'message': 'Webhook processed'
        })
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
