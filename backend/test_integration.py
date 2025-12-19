#!/usr/bin/env python3
"""
Comprehensive Integration Test for OAuth + Payment Flow
Tests the complete authentication and payment processing pipeline
"""

import requests
import json
import sys
from pprint import pprint
import jwt
from datetime import datetime

BASE_URL = "http://localhost:8003/api"

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

class APITester:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.user = None
        self.test_results = []
    
    def print_test(self, name):
        print(f"\n{BLUE}{'='*70}")
        print(f"TEST: {name}")
        print(f"{'='*70}{RESET}")
    
    def print_success(self, message):
        print(f"{GREEN}✓ {message}{RESET}")
    
    def print_error(self, message):
        print(f"{RED}✗ {message}{RESET}")
    
    def print_info(self, message):
        print(f"{YELLOW}ℹ {message}{RESET}")
    
    def log_result(self, test_name, passed, details=""):
        self.test_results.append({
            "name": test_name,
            "passed": passed,
            "details": details
        })
    
    def test_health(self):
        """Test if API is healthy"""
        self.print_test("API Health Check")
        try:
            response = requests.get(f"{BASE_URL}/health/")
            if response.status_code == 200:
                data = response.json()
                self.print_success(f"API is healthy: {data.get('status')}")
                self.log_result("Health Check", True)
                return True
            else:
                self.print_error(f"Health check failed: {response.status_code}")
                self.log_result("Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Health Check", False, str(e))
            return False
    
    def test_oauth_callback(self):
        """Test OAuth callback endpoint (with invalid code)"""
        self.print_test("OAuth Callback Endpoint")
        try:
            payload = {
                "code": "invalid_test_code_12345",
                "provider": "google"
            }
            response = requests.post(
                f"{BASE_URL}/auth/google/callback/",
                json=payload
            )
            
            # Should fail with invalid code, but endpoint should exist
            data = response.json()
            if 'error' in data:
                self.print_success("OAuth callback endpoint working (invalid code rejected)")
                self.log_result("OAuth Callback", True, "Endpoint exists and validates")
                return True
            else:
                self.print_error("Unexpected response")
                self.log_result("OAuth Callback", False, "Unexpected response")
                return False
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("OAuth Callback", False, str(e))
            return False
    
    def test_razorpay_key(self):
        """Test Razorpay key endpoint"""
        self.print_test("Razorpay Key Endpoint")
        try:
            response = requests.get(f"{BASE_URL}/payment/razorpay-key/")
            if response.status_code == 200:
                data = response.json()
                key_id = data.get('key_id', '')
                if key_id and key_id != '':
                    self.print_success(f"Razorpay key retrieved: {key_id[:20]}...")
                    self.log_result("Razorpay Key", True)
                    return True
                else:
                    self.print_info("Key ID is empty (configure in .env)")
                    self.log_result("Razorpay Key", True, "Empty (needs config)")
                    return True
            else:
                self.print_error(f"Status: {response.status_code}")
                self.log_result("Razorpay Key", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Razorpay Key", False, str(e))
            return False
    
    def create_test_user(self):
        """Create a test user in the database"""
        self.print_test("Creating Test User")
        try:
            from django.contrib.auth.models import User
            from django.db import connections
            
            # Check database connection
            try:
                conn = connections['default']
                conn.ensure_connection()
            except:
                self.print_error("Cannot connect to database for user creation")
                self.log_result("Create Test User", False, "DB connection failed")
                return False
            
            # Create or get test user
            user, created = User.objects.get_or_create(
                username='testuser@example.com',
                defaults={
                    'email': 'testuser@example.com',
                    'first_name': 'Test',
                    'last_name': 'User'
                }
            )
            
            if created:
                user.set_password('testpassword123')
                user.save()
                self.print_success(f"Created test user: {user.username}")
            else:
                # Ensure password is set
                if not user.check_password('testpassword123'):
                    user.set_password('testpassword123')
                    user.save()
                    self.print_info(f"Updated password for existing test user: {user.username}")
                else:
                    self.print_info(f"Using existing test user: {user.username}")
            
            self.user = user
            self.log_result("Create Test User", True)
            return True
        
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Create Test User", False, str(e))
            return False
    
    def generate_test_tokens(self):
        """Generate JWT tokens for test user"""
        self.print_test("Generating Test JWT Tokens")
        try:
            import os
            from django.conf import settings
            from datetime import timedelta, datetime
            
            if not self.user:
                self.print_error("No user available")
                self.log_result("Generate Tokens", False, "No user")
                return False
            
            jwt_secret = os.getenv('JWT_SECRET', settings.SECRET_KEY)
            jwt_algorithm = os.getenv('JWT_ALGORITHM', 'HS256')
            expiration_hours = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
            
            now = datetime.utcnow()
            
            # Create access token
            access_payload = {
                'user_id': self.user.id,
                'email': self.user.email,
                'username': self.user.username,
                'iat': now,
                'exp': now + timedelta(hours=expiration_hours),
                'type': 'access',
            }
            
            self.access_token = jwt.encode(
                access_payload,
                jwt_secret,
                algorithm=jwt_algorithm
            )
            
            self.print_success(f"Generated access token for user ID: {self.user.id}")
            self.print_info(f"Token (first 50 chars): {self.access_token[:50]}...")
            self.log_result("Generate Tokens", True)
            return True
        
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Generate Tokens", False, str(e))
            return False
    
    def test_user_profile(self):
        """Test user profile endpoint"""
        self.print_test("User Profile Endpoint")
        if not self.access_token:
            self.print_error("No access token available")
            self.log_result("User Profile", False, "No token")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}'
            }
            response = requests.get(
                f"{BASE_URL}/auth/user/profile/",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    user = data.get('user', {})
                    self.print_success(f"Retrieved user profile: {user.get('username')}")
                    self.log_result("User Profile", True)
                    return True
                else:
                    self.print_error("Profile endpoint returned error")
                    self.log_result("User Profile", False, "Profile error")
                    return False
            else:
                self.print_error(f"Status: {response.status_code}")
                self.print_info(f"Response: {response.text}")
                self.log_result("User Profile", False, f"Status: {response.status_code}")
                return False
        
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("User Profile", False, str(e))
            return False
    
    def test_create_payment_order(self):
        """Test payment order creation"""
        self.print_test("Create Payment Order")
        if not self.access_token:
            self.print_error("No access token available")
            self.log_result("Create Payment Order", False, "No token")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            payload = {
                "plan": "premium",
                "auto_pay": False
            }
            
            response = requests.post(
                f"{BASE_URL}/payment/create-order/",
                json=payload,
                headers=headers
            )
            
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    self.print_success(f"Order created: {data.get('order_id')}")
                    self.print_info(f"Amount: ₹{data.get('amount')}")
                    self.print_info(f"Plan: {data.get('plan')}")
                    
                    # Store for verification test
                    self.last_order = data
                    self.log_result("Create Payment Order", True)
                    return True
                else:
                    self.print_error("Order creation returned error")
                    pprint(data)
                    self.log_result("Create Payment Order", False, "Order error")
                    return False
            else:
                self.print_error(f"Status: {response.status_code}")
                self.print_info(f"Response: {response.text}")
                self.log_result("Create Payment Order", False, f"Status: {response.status_code}")
                return False
        
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Create Payment Order", False, str(e))
            return False
    
    def test_payment_history(self):
        """Test payment history endpoint"""
        self.print_test("Payment History")
        if not self.access_token:
            self.print_error("No access token available")
            self.log_result("Payment History", False, "No token")
            return False
        
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}'
            }
            response = requests.get(
                f"{BASE_URL}/payment/history/",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    total = data.get('total_payments', 0)
                    self.print_success(f"Retrieved payment history: {total} payments")
                    self.log_result("Payment History", True)
                    return True
                else:
                    self.print_error("History endpoint returned error")
                    self.log_result("Payment History", False, "History error")
                    return False
            else:
                self.print_error(f"Status: {response.status_code}")
                self.log_result("Payment History", False, f"Status: {response.status_code}")
                return False
        
        except Exception as e:
            self.print_error(f"Error: {str(e)}")
            self.log_result("Payment History", False, str(e))
            return False
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{BLUE}{'='*70}")
        print("TEST SUMMARY")
        print(f"{'='*70}{RESET}")
        
        passed = sum(1 for r in self.test_results if r['passed'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = f"{GREEN}PASS{RESET}" if result['passed'] else f"{RED}FAIL{RESET}"
            detail = f" ({result['details']})" if result['details'] else ""
            print(f"  {result['name']}: {status}{detail}")
        
        percentage = (passed / total * 100) if total > 0 else 0
        print(f"\nTotal: {passed}/{total} tests passed ({percentage:.0f}%)")
        
        if passed == total:
            print(f"{GREEN}✓ All tests passed!{RESET}\n")
        else:
            print(f"{RED}✗ Some tests failed{RESET}\n")
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"\n{BLUE}{'#'*70}")
        print("EdTech Solver - Integration Tests")
        print(f"{'#'*70}{RESET}")
        print(f"Base URL: {BASE_URL}\n")
        
        # Basic tests
        self.test_health()
        self.test_oauth_callback()
        self.test_razorpay_key()
        
        # Database dependent tests
        try:
            import os
            import django
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtech_project.settings')
            django.setup()
            
            self.create_test_user()
            self.generate_test_tokens()
            self.test_user_profile()
            self.test_create_payment_order()
            self.test_payment_history()
        
        except ImportError:
            self.print_info("Skipping database-dependent tests (running outside Django)")
        except Exception as e:
            self.print_error(f"Error setting up Django: {str(e)}")
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
