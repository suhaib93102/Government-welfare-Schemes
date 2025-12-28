"""
Promo Code Management Views
Django REST Framework endpoints for promo code validation and application

Author: EdTech Platform
Date: December 27, 2024
"""
import logging
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import PromoCode, PromoCodeUsage, UserSubscription
from django.db.models import Q

logger = logging.getLogger(__name__)


@api_view(['POST'])
def validate_promo_code(request):
    """
    Validate a promo code
    
    Endpoint: POST /api/promo/validate/
    
    Request Body:
    {
        "code": "WELCOME100",
        "user_id": "user123",
        "plan": "scholar",
        "amount": 199
    }
    
    Response (Success):
    {
        "success": true,
        "valid": true,
        "code": "WELCOME100",
        "discount_type": "percentage",
        "discount_value": 100,
        "original_amount": 199,
        "discounted_amount": 0,
        "discount_applied": 199,
        "message": "Promo code applied successfully!"
    }
    
    Response (Invalid):
    {
        "success": true,
        "valid": false,
        "error": "Promo code has expired"
    }
    """
    try:
        code = request.data.get('code', '').strip().upper()
        user_id = request.data.get('user_id')
        plan = request.data.get('plan')
        amount = float(request.data.get('amount', 0))
        
        if not code:
            return Response({
                'success': False,
                'error': 'Promo code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not user_id or not plan or amount <= 0:
            return Response({
                'success': False,
                'error': 'Invalid request parameters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find promo code
        try:
            promo = PromoCode.objects.get(code=code)
        except PromoCode.DoesNotExist:
            return Response({
                'success': True,
                'valid': False,
                'error': 'Invalid promo code'
            })
        
        # Check if promo is valid
        is_valid, message = promo.is_valid()
        if not is_valid:
            return Response({
                'success': True,
                'valid': False,
                'error': message
            })
        
        # Check if applicable to plan
        if promo.applicable_plans and plan not in promo.applicable_plans:
            return Response({
                'success': True,
                'valid': False,
                'error': f'Promo code not applicable to {plan} plan'
            })
        
        # Check user usage limit
        user_usage_count = PromoCodeUsage.objects.filter(
            promo_code=promo,
            user_id=user_id
        ).count()
        
        if user_usage_count >= promo.max_uses_per_user:
            return Response({
                'success': True,
                'valid': False,
                'error': 'You have already used this promo code'
            })
        
        # Calculate discount
        discounted_amount = promo.calculate_discount(amount)
        discount_applied = amount - discounted_amount
        
        return Response({
            'success': True,
            'valid': True,
            'code': promo.code,
            'discount_type': promo.discount_type,
            'discount_value': float(promo.discount_value),
            'original_amount': amount,
            'discounted_amount': discounted_amount,
            'discount_applied': discount_applied,
            'message': f'Promo code applied! You saved ₹{discount_applied:.2f}'
        })
        
    except Exception as e:
        logger.error(f"Promo validation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def apply_promo_code(request):
    """
    Apply promo code and record usage
    
    Endpoint: POST /api/promo/apply/
    
    Request Body:
    {
        "code": "WELCOME100",
        "user_id": "user123",
        "subscription_id": "sub_uuid",
        "original_amount": 199,
        "discounted_amount": 0
    }
    
    Response:
    {
        "success": true,
        "message": "Promo code applied successfully",
        "discount_applied": 199
    }
    """
    try:
        code = request.data.get('code', '').strip().upper()
        user_id = request.data.get('user_id')
        subscription_id = request.data.get('subscription_id')
        original_amount = float(request.data.get('original_amount', 0))
        discounted_amount = float(request.data.get('discounted_amount', 0))
        
        # Find promo code
        promo = PromoCode.objects.get(code=code)
        
        # Find subscription if provided
        subscription = None
        if subscription_id:
            try:
                subscription = UserSubscription.objects.get(id=subscription_id)
            except UserSubscription.DoesNotExist:
                pass
        
        # Record usage
        PromoCodeUsage.objects.create(
            promo_code=promo,
            user_id=user_id,
            subscription=subscription,
            original_amount=original_amount,
            discounted_amount=discounted_amount,
            discount_applied=original_amount - discounted_amount
        )
        
        # Increment usage count
        promo.times_used += 1
        promo.save()
        
        return Response({
            'success': True,
            'message': 'Promo code applied successfully',
            'discount_applied': original_amount - discounted_amount
        })
        
    except PromoCode.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invalid promo code'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Promo application error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_active_promos(request):
    """
    List all active promo codes (admin only - remove in production or add auth)
    
    Endpoint: GET /api/promo/list/
    
    Response:
    {
        "success": true,
        "promos": [
            {
                "code": "WELCOME100",
                "discount_type": "percentage",
                "discount_value": 100,
                "description": "100% off for new users",
                "valid_until": "2025-12-31T23:59:59Z",
                "times_used": 42,
                "max_uses": 1000
            }
        ]
    }
    """
    try:
        now = timezone.now()
        promos = PromoCode.objects.filter(
            is_active=True,
            valid_from__lte=now
        ).filter(
            Q(valid_until__isnull=True) | Q(valid_until__gte=now)
        )
        
        promo_list = []
        for promo in promos:
            promo_list.append({
                'code': promo.code,
                'discount_type': promo.discount_type,
                'discount_value': float(promo.discount_value),
                'description': promo.description,
                'applicable_plans': promo.applicable_plans,
                'valid_from': promo.valid_from.isoformat(),
                'valid_until': promo.valid_until.isoformat() if promo.valid_until else None,
                'times_used': promo.times_used,
                'max_uses': promo.max_uses,
                'max_uses_per_user': promo.max_uses_per_user
            })
        
        return Response({
            'success': True,
            'promos': promo_list
        })
        
    except Exception as e:
        logger.error(f"List promos error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def user_promo_history(request):
    """
    Get user's promo code usage history
    
    Endpoint: GET /api/promo/history/?user_id=user123
    
    Response:
    {
        "success": true,
        "history": [
            {
                "code": "WELCOME100",
                "used_at": "2024-12-20T10:30:00Z",
                "original_amount": 199,
                "discounted_amount": 0,
                "discount_applied": 199
            }
        ]
    }
    """
    try:
        user_id = request.GET.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        usages = PromoCodeUsage.objects.filter(user_id=user_id).select_related('promo_code')
        
        history = []
        for usage in usages:
            history.append({
                'code': usage.promo_code.code,
                'used_at': usage.used_at.isoformat(),
                'original_amount': float(usage.original_amount),
                'discounted_amount': float(usage.discounted_amount),
                'discount_applied': float(usage.discount_applied)
            })
        
        return Response({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        logger.error(f"User promo history error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
