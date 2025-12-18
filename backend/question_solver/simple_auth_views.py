"""
Simple Email/Password Authentication Views
JWT token-based authentication system
"""

import jwt
import re
from datetime import datetime, timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Secret key for JWT (should be in settings.py for production)
JWT_SECRET = getattr(settings, 'SECRET_KEY', 'your-secret-key-change-this')
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 60 * 60 * 24 * 7  # 7 days


def generate_jwt_token(user):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def validate_jwt_token(token):
    """Validate JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get('user_id'), payload
    except jwt.ExpiredSignatureError:
        return None, {'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return None, {'error': 'Invalid token'}


def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, "Password is valid"


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    """
    User Registration with Email and Password
    POST /api/auth/register/
    Body: {
        "username": "user123",
        "email": "user@example.com",
        "password": "password123",
        "full_name": "John Doe" (optional)
    }
    """

    def post(self, request):
        try:
            username = request.data.get('username', '').strip()
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            full_name = request.data.get('full_name', '').strip()

            # Validation
            if not username or not email or not password:
                return Response({
                    'success': False,
                    'error': 'Username, email, and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate username
            if len(username) < 3:
                return Response({
                    'success': False,
                    'error': 'Username must be at least 3 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not username.isalnum() and '_' not in username:
                return Response({
                    'success': False,
                    'error': 'Username can only contain letters, numbers, and underscores'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate email
            if not validate_email(email):
                return Response({
                    'success': False,
                    'error': 'Invalid email format'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate password
            is_valid, message = validate_password(password)
            if not is_valid:
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if username already exists
            if User.objects.filter(username=username).exists():
                return Response({
                    'success': False,
                    'error': 'Username already taken'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if email already exists
            if User.objects.filter(email=email).exists():
                return Response({
                    'success': False,
                    'error': 'Email already registered'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create user
            user = User.objects.create(
                username=username,
                email=email,
                password=make_password(password),
                first_name=full_name.split(' ')[0] if full_name else '',
                last_name=' '.join(full_name.split(' ')[1:]) if full_name and len(full_name.split(' ')) > 1 else ''
            )

            # Generate JWT token
            token = generate_jwt_token(user)

            # Create user coins record
            from .models import UserCoins
            UserCoins.objects.create(
                user_id=str(user.id),
                coins=0
            )

            logger.info(f"New user registered: {username} ({email})")

            return Response({
                'success': True,
                'message': 'Registration successful',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip(),
                    'token': token,
                    'created_at': user.date_joined.isoformat()
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({
                'success': False,
                'error': 'An error occurred during registration'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """
    User Login with Email/Username and Password
    POST /api/auth/login/
    Body: {
        "username": "user123" or "email": "user@example.com",
        "password": "password123"
    }
    """

    def post(self, request):
        try:
            username_or_email = request.data.get('username') or request.data.get('email', '').strip()
            password = request.data.get('password', '')

            if not username_or_email or not password:
                return Response({
                    'success': False,
                    'error': 'Username/email and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if input is email or username
            user = None
            if '@' in username_or_email:
                # Email login
                try:
                    user = User.objects.get(email=username_or_email.lower())
                except User.DoesNotExist:
                    pass
            else:
                # Username login
                try:
                    user = User.objects.get(username=username_or_email)
                except User.DoesNotExist:
                    pass

            # Invalid credentials
            if not user:
                return Response({
                    'success': False,
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Check password
            if not check_password(password, user.password):
                return Response({
                    'success': False,
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Generate JWT token
            token = generate_jwt_token(user)

            # Get user coins
            from .models import UserCoins
            user_coins_obj, created = UserCoins.objects.get_or_create(
                user_id=str(user.id),
                defaults={'coins': 0}
            )

            logger.info(f"User logged in: {user.username}")

            return Response({
                'success': True,
                'message': 'Login successful',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip(),
                    'token': token,
                    'coins': user_coins_obj.coins,
                    'last_login': user.last_login.isoformat() if user.last_login else None
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return Response({
                'success': False,
                'error': 'An error occurred during login'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyTokenView(APIView):
    """
    Verify JWT token and return user info
    GET /api/auth/verify/
    Headers: Authorization: Bearer <token>
    """

    def get(self, request):
        try:
            # Get token from header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'success': False,
                    'error': 'Invalid authorization header'
                }, status=status.HTTP_401_UNAUTHORIZED)

            token = auth_header.split(' ')[1]
            user_id, payload = validate_jwt_token(token)

            if not user_id:
                return Response({
                    'success': False,
                    'error': payload.get('error', 'Invalid token')
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Get user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Get user coins
            from .models import UserCoins
            user_coins_obj, created = UserCoins.objects.get_or_create(
                user_id=str(user.id),
                defaults={'coins': 0}
            )

            return Response({
                'success': True,
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip(),
                    'coins': user_coins_obj.coins,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined.isoformat()
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Token verification failed'
            }, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class ChangePasswordView(APIView):
    """
    Change user password
    POST /api/auth/change-password/
    Headers: Authorization: Bearer <token>
    Body: {
        "old_password": "oldpass123",
        "new_password": "newpass123"
    }
    """

    def post(self, request):
        try:
            # Get token from header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'success': False,
                    'error': 'Invalid authorization header'
                }, status=status.HTTP_401_UNAUTHORIZED)

            token = auth_header.split(' ')[1]
            user_id, payload = validate_jwt_token(token)

            if not user_id:
                return Response({
                    'success': False,
                    'error': payload.get('error', 'Invalid token')
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Get user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)

            old_password = request.data.get('old_password', '')
            new_password = request.data.get('new_password', '')

            if not old_password or not new_password:
                return Response({
                    'success': False,
                    'error': 'Old and new passwords are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verify old password
            if not check_password(old_password, user.password):
                return Response({
                    'success': False,
                    'error': 'Incorrect old password'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate new password
            is_valid, message = validate_password(new_password)
            if not is_valid:
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update password
            user.password = make_password(new_password)
            user.save()

            logger.info(f"Password changed for user: {user.username}")

            return Response({
                'success': True,
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            return Response({
                'success': False,
                'error': 'An error occurred while changing password'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
