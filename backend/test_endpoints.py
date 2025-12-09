#!/usr/bin/env python3
"""
Test script for EdTech Solver API endpoints
Tests OAuth, Payment, and other critical endpoints
"""

import requests
import json
import time
from pprint import pprint

BASE_URL = "http://localhost:8003/api"

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(name):
    print(f"\n{BLUE}{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}ℹ {message}{RESET}")

def test_health_check():
    """Test if API is running"""
    print_test("Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health/")
        if response.status_code == 200:
            print_success("Health check passed")
            pprint(response.json())
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False

def test_razorpay_key():
    """Test Razorpay key endpoint"""
    print_test("Razorpay Key Endpoint")
    try:
        response = requests.get(f"{BASE_URL}/payment/razorpay-key/")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_success("Razorpay key endpoint working")
                print(f"  Key ID: {data.get('key_id', 'NOT SET')}")
                return True
            else:
                print_error("Razorpay key endpoint returned error")
                pprint(data)
                return False
        else:
            print_error(f"Status code: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_create_payment_order_no_auth():
    """Test payment order creation without auth (should fail)"""
    print_test("Create Payment Order (No Auth - Should Fail)")
    try:
        payload = {
            "plan": "premium",
            "auto_pay": False
        }
        response = requests.post(
            f"{BASE_URL}/payment/create-order/",
            json=payload
        )
        
        if response.status_code == 401:
            print_success("Correctly rejected unauthenticated request")
            pprint(response.json())
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_payment_history_no_auth():
    """Test payment history without auth (should fail)"""
    print_test("Payment History (No Auth - Should Fail)")
    try:
        response = requests.get(f"{BASE_URL}/payment/history/")
        
        if response.status_code == 401:
            print_success("Correctly rejected unauthenticated request")
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_endpoints_status():
    """Test if all payment endpoints are registered"""
    print_test("Payment Endpoints Registration")
    endpoints = [
        "/payment/create-order/",
        "/payment/verify/",
        "/payment/status/",
        "/payment/history/",
        "/payment/refund/",
        "/payment/razorpay-key/",
    ]
    
    # Try each endpoint (they should return 401 without auth, not 404)
    all_exist = True
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            # 401 means endpoint exists (auth required)
            # 404 means endpoint doesn't exist
            if response.status_code in [401, 405]:  # 405 = Method Not Allowed (endpoint exists)
                print_success(f"Endpoint exists: {endpoint}")
            else:
                print_info(f"Endpoint {endpoint}: {response.status_code}")
        except Exception as e:
            print_error(f"Error accessing {endpoint}: {str(e)}")
            all_exist = False
    
    return all_exist

def test_auth_endpoints():
    """Test if OAuth endpoints are working"""
    print_test("OAuth Endpoints")
    
    # Test Google OAuth callback (should handle POST)
    try:
        response = requests.post(
            f"{BASE_URL}/auth/google/callback/",
            json={"code": "test"}
        )
        
        if response.status_code in [400, 500, 200]:  # Some response (not 404)
            print_success("OAuth callback endpoint exists")
        else:
            print_info(f"OAuth callback: {response.status_code}")
            
    except Exception as e:
        print_error(f"OAuth callback error: {str(e)}")
        return False
    
    # Test Razorpay key endpoint
    try:
        response = requests.get(f"{BASE_URL}/payment/razorpay-key/")
        if response.status_code == 200:
            print_success("Razorpay key endpoint works")
            return True
        else:
            print_info(f"Razorpay key: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def main():
    print(f"\n{BLUE}{'#'*60}")
    print("EdTech Solver - API Endpoint Tests")
    print(f"{'#'*60}{RESET}")
    print(f"Base URL: {BASE_URL}")
    
    # Wait for server to start
    print_info("Waiting for server to be ready...")
    for i in range(10):
        try:
            requests.get(f"{BASE_URL}/health/")
            print_success("Server is ready!")
            break
        except:
            time.sleep(1)
    else:
        print_error("Server didn't start in time")
        return
    
    # Run tests
    results = []
    
    results.append(("Health Check", test_health_check()))
    results.append(("Razorpay Key", test_razorpay_key()))
    results.append(("Payment Endpoints", test_endpoints_status()))
    results.append(("OAuth Endpoints", test_auth_endpoints()))
    results.append(("Auth Required - Payment Order", test_create_payment_order_no_auth()))
    results.append(("Auth Required - Payment History", test_payment_history_no_auth()))
    
    # Summary
    print(f"\n{BLUE}{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}{RESET}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"  {name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"{GREEN}All tests passed!{RESET}\n")
    else:
        print(f"{RED}Some tests failed{RESET}\n")

if __name__ == "__main__":
    main()
