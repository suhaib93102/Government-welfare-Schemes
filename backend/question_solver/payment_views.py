"""
Payment Views for Razorpay Integration
Handles payment order creation, verification, and processing
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
import os
import jwt
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import Payment, UserSubscription
from .services.payment_service import payment_service

logger = logging.getLogger(__name__)


def get_user_from_token(request):
    """
    Extract and validate JWT token from request header
    Returns User object or None if invalid/missing
    """
    try:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        jwt_secret = os.getenv('JWT_SECRET', settings.SECRET_KEY)
        jwt_algorithm = os.getenv('JWT_ALGORITHM', 'HS256')

        # Decode token
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        
        # Get user
        user = User.objects.get(id=payload['user_id'])
        return user

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
        return None
    except Exception as e:
        logger.error(f"Error extracting user from token: {str(e)}")
        return None


class CreatePaymentOrderView(APIView):
    """
    Create a Razorpay payment order
    
    Request:
        POST /api/payment/create-order/
        {
            "plan": "premium",  # 'premium', 'annual'
            "auto_pay": true
        }
    
    Response:
        {
            "success": true,
            "order_id": "order_xxxxx",
            "amount": 199,
            "currency": "INR",
            "key_id": "rzp_live_xxxxx"
        }
    """
    
    def post(self, request):
        """Create Razorpay order"""
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return Response(
                    {'error': 'Unauthorized', 'message': 'Invalid or missing token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get request data
            plan = request.data.get('plan', 'premium')
            auto_pay = request.data.get('auto_pay', False)
            
            # Define pricing
            pricing = {
                'premium': {'amount': 199, 'description': 'Premium Monthly Plan - ₹199/month'},
                'premium_annual': {'amount': 1990, 'description': 'Premium Annual Plan - ₹1990/year'},
            }
            
            if plan not in pricing:
                return Response(
                    {'error': 'Invalid plan', 'message': f'Plan must be one of {list(pricing.keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get amount for plan
            plan_info = pricing[plan]
            amount = plan_info['amount']
            
            # Create Razorpay order
            order_response = payment_service.create_order(
                amount=amount,
                user_id=user.id,
                plan_type=plan,
                description=plan_info['description']
            )
            
            if not order_response['success']:
                logger.error(f"Failed to create order for user {user.id}: {order_response.get('error')}")
                return Response(
                    {'error': 'Payment order creation failed', 'details': order_response.get('error')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create Payment record in database (status: pending)
            try:
                subscription = UserSubscription.objects.get(user_id=user.id)
            except UserSubscription.DoesNotExist:
                # Create subscription if not exists
                subscription = UserSubscription.objects.create(
                    user_id=user.id,
                    plan='free',
                    auto_pay_enabled=auto_pay
                )
            
            # Create payment record
            payment = Payment.objects.create(
                subscription=subscription,
                amount=amount,
                currency='INR',
                status='pending',
                payment_method='razorpay',
                transaction_id=order_response['order_id'],  # Store order_id as transaction_id initially
                razorpay_order_id=order_response['order_id'],
                billing_cycle_start=timezone.now(),
                billing_cycle_end=timezone.now() + (
                    timedelta(days=365) if 'annual' in plan else timedelta(days=30)
                )
            )
            
            logger.info(f"Payment record created: {payment.id} for user {user.id}")
            
            # Return response with Razorpay key and order details
            return Response(
                {
                    'success': True,
                    'order_id': order_response['order_id'],
                    'amount': order_response['amount'],
                    'amount_paise': order_response['amount_paise'],
                    'currency': order_response['currency'],
                    'key_id': payment_service.key_id,
                    'plan': plan,
                    'payment_record_id': str(payment.id)
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            logger.error(f"Error creating payment order: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyPaymentView(APIView):
    """
    Verify Razorpay payment signature
    This is called after user completes payment on frontend
    
    Request:
        POST /api/payment/verify/
        {
            "razorpay_order_id": "order_xxxxx",
            "razorpay_payment_id": "pay_xxxxx",
            "razorpay_signature": "signature_xxxxx"
        }
    
    Response:
        {
            "success": true,
            "message": "Payment verified successfully",
            "payment_id": "...",
            "subscription_updated": true
        }
    """
    
    def post(self, request):
        """Verify payment and update subscription"""
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return Response(
                    {'error': 'Unauthorized', 'message': 'Invalid or missing token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get payment details from request
            order_id = request.data.get('razorpay_order_id')
            payment_id = request.data.get('razorpay_payment_id')
            signature = request.data.get('razorpay_signature')
            
            if not all([order_id, payment_id, signature]):
                return Response(
                    {'error': 'Missing payment details'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify payment signature
            is_valid = payment_service.verify_payment_signature(order_id, payment_id, signature)
            
            if not is_valid:
                logger.warning(f"Invalid payment signature for order {order_id}")
                return Response(
                    {'error': 'Payment verification failed', 'message': 'Invalid signature'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment details from Razorpay
            payment_details = payment_service.get_payment_details(payment_id)
            
            if not payment_details['success']:
                logger.error(f"Failed to get payment details for {payment_id}")
                return Response(
                    {'error': 'Could not fetch payment details'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update payment record in database
            try:
                payment = Payment.objects.get(razorpay_order_id=order_id)
            except Payment.DoesNotExist:
                logger.error(f"Payment record not found for order {order_id}")
                return Response(
                    {'error': 'Payment record not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update payment with Razorpay details
            payment.razorpay_payment_id = payment_id
            payment.status = 'completed' if payment_details['status'] == 'captured' else payment_details['status']
            payment.transaction_id = payment_id
            payment.updated_at = timezone.now()
            payment.save()
            
            # Update subscription to premium if payment successful
            if payment.status == 'completed':
                subscription = payment.subscription
                subscription.plan = 'premium'
                subscription.auto_pay_enabled = request.data.get('auto_pay', False)
                subscription.last_payment_date = timezone.now()
                subscription.next_billing_date = timezone.now() + timedelta(days=30)
                subscription.save()
                
                logger.info(f"Subscription upgraded to premium for user {user.id}")
            
            return Response(
                {
                    'success': True,
                    'message': 'Payment verified successfully',
                    'payment_id': payment_id,
                    'status': payment.status,
                    'subscription_updated': True,
                    'plan': subscription.plan
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return Response(
                {'error': 'Payment verification failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentStatusView(APIView):
    """
    Get payment status
    
    Request:
        GET /api/payment/status/<order_id>/
    
    Response:
        {
            "success": true,
            "payment": {
                "id": "...",
                "amount": 199,
                "status": "completed",
                "created_at": "...",
                "razorpay_order_id": "...",
                "razorpay_payment_id": "..."
            }
        }
    """
    
    def get(self, request, order_id=None):
        """Get payment status"""
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get order_id from query params or URL
            order_id = order_id or request.query_params.get('order_id')
            
            if not order_id:
                return Response(
                    {'error': 'order_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment from database
            try:
                payment = Payment.objects.get(razorpay_order_id=order_id)
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Payment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(
                {
                    'success': True,
                    'payment': {
                        'id': str(payment.id),
                        'amount': float(payment.amount),
                        'currency': payment.currency,
                        'status': payment.status,
                        'payment_method': payment.payment_method,
                        'razorpay_order_id': payment.razorpay_order_id,
                        'razorpay_payment_id': payment.razorpay_payment_id,
                        'created_at': payment.created_at.isoformat(),
                        'updated_at': payment.updated_at.isoformat()
                    }
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Error getting payment status: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentHistoryView(APIView):
    """
    Get payment history for user
    
    Request:
        GET /api/payment/history/
    
    Response:
        {
            "success": true,
            "payments": [
                {
                    "id": "...",
                    "amount": 199,
                    "status": "completed",
                    "created_at": "...",
                    "razorpay_payment_id": "..."
                }
            ]
        }
    """
    
    def get(self, request):
        """Get user's payment history"""
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get subscription
            try:
                subscription = UserSubscription.objects.get(user_id=user.id)
            except UserSubscription.DoesNotExist:
                return Response(
                    {
                        'success': True,
                        'payments': []
                    },
                    status=status.HTTP_200_OK
                )
            
            # Get payments
            payments = Payment.objects.filter(subscription=subscription).order_by('-created_at')
            
            payment_list = [
                {
                    'id': str(payment.id),
                    'amount': float(payment.amount),
                    'currency': payment.currency,
                    'status': payment.status,
                    'payment_method': payment.payment_method,
                    'razorpay_payment_id': payment.razorpay_payment_id or 'N/A',
                    'created_at': payment.created_at.isoformat(),
                    'billing_cycle': {
                        'start': payment.billing_cycle_start.isoformat(),
                        'end': payment.billing_cycle_end.isoformat()
                    }
                }
                for payment in payments
            ]
            
            return Response(
                {
                    'success': True,
                    'total_payments': len(payment_list),
                    'payments': payment_list
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RefundPaymentView(APIView):
    """
    Request a refund for a payment
    
    Request:
        POST /api/payment/refund/
        {
            "payment_id": "...",
            "reason": "Not satisfied with service"
        }
    
    Response:
        {
            "success": true,
            "refund_id": "rfnd_xxxxx",
            "message": "Refund initiated successfully"
        }
    """
    
    def post(self, request):
        """Process refund request"""
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get payment details
            payment_id = request.data.get('payment_id')
            reason = request.data.get('reason', 'User requested refund')
            
            if not payment_id:
                return Response(
                    {'error': 'payment_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment from database
            try:
                payment = Payment.objects.get(id=payment_id)
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Payment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if already refunded
            if payment.status == 'refunded':
                return Response(
                    {'error': 'Payment already refunded'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if payment is completed
            if payment.status != 'completed':
                return Response(
                    {'error': 'Only completed payments can be refunded'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process refund via Razorpay
            refund_response = payment_service.refund_payment(
                payment.razorpay_payment_id,
                amount=payment.amount,
                reason=reason
            )
            
            if not refund_response['success']:
                logger.error(f"Failed to process refund for payment {payment_id}")
                return Response(
                    {'error': 'Refund processing failed', 'details': refund_response.get('error')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update payment status
            payment.status = 'refunded'
            payment.updated_at = timezone.now()
            payment.save()
            
            # Update subscription back to free
            subscription = payment.subscription
            subscription.plan = 'free'
            subscription.save()
            
            logger.info(f"Refund processed for payment {payment_id}: {refund_response['refund_id']}")
            
            return Response(
                {
                    'success': True,
                    'message': 'Refund initiated successfully',
                    'refund_id': refund_response['refund_id'],
                    'amount': float(payment.amount),
                    'status': payment.status
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RazorpayKeyView(APIView):
    """
    Get Razorpay public key for frontend
    
    Request:
        GET /api/payment/razorpay-key/
    
    Response:
        {
            "key_id": "rzp_live_xxxxx"
        }
    """
    
    def get(self, request):
        """Get Razorpay public key"""
        try:
            key_id = payment_service.key_id
            
            return Response(
                {
                    'success': True,
                    'key_id': key_id
                },
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            logger.error(f"Error getting Razorpay key: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
