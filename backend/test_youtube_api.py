#!/usr/bin/env python3
"""
YouTube Summarizer API Test Script
Tests both demo mode and real video processing
"""

import requests
import json
import sys
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)

BASE_URL = "http://localhost:8003"

def print_success(message):
    print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

def print_error(message):
    print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

def print_info(message):
    print(f"{Fore.CYAN}ℹ {message}{Style.RESET_ALL}")

def print_section(title):
    print(f"\n{Fore.YELLOW}{'='*60}")
    print(f"{title}")
    print(f"{'='*60}{Style.RESET_ALL}\n")

def test_health_check():
    """Test the health check endpoint"""
    print_section("Testing Health Check Endpoint")
    
    try:
        response = requests.get(f"{BASE_URL}/api/youtube/health/")
        
        if response.status_code == 200:
            data = response.json()
            print_success("Health check passed")
            print_info(f"Status: {data.get('status')}")
            print_info(f"YouTube API configured: {data.get('youtube_api_configured')}")
            print_info(f"Gemini API configured: {data.get('gemini_api_configured')}")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False

def test_demo_mode():
    """Test the demo mode for UI testing"""
    print_section("Testing Demo Mode")
    
    payload = {
        "video_url": "https://www.youtube.com/watch?v=test"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/youtube/summarize/",
            params={"demo": "true"},
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Demo mode works!")
            print_info(f"Title: {data.get('title')}")
            print_info(f"Channel: {data.get('channel_name')}")
            print_info(f"Duration: {data.get('video_duration')}")
            print_info(f"Reading time: {data.get('estimated_reading_time')}")
            print_info(f"Difficulty: {data.get('difficulty_level')}")
            print_info(f"Notes count: {len(data.get('notes', []))}")
            print_info(f"Questions count: {len(data.get('questions', []))}")
            print_info(f"Keywords: {', '.join(data.get('keywords', []))}")
            
            # Print first note and question
            if data.get('notes'):
                print_info(f"Sample note: {data['notes'][0]}")
            if data.get('questions'):
                print_info(f"Sample question: {data['questions'][0]}")
            
            return True
        else:
            print_error(f"Demo mode failed with status {response.status_code}")
            print_error(response.text)
            return False
    except Exception as e:
        print_error(f"Demo mode error: {str(e)}")
        return False

def test_real_video(video_url):
    """Test with a real YouTube video"""
    print_section(f"Testing Real Video: {video_url}")
    
    payload = {
        "video_url": video_url
    }
    
    try:
        print_info("Sending request... (this may take 10-30 seconds)")
        response = requests.post(
            f"{BASE_URL}/api/youtube/summarize/",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Video processed successfully!")
            print_info(f"Title: {data.get('title')}")
            print_info(f"Channel: {data.get('channel_name')}")
            print_info(f"Duration: {data.get('video_duration')}")
            print_info(f"Reading time: {data.get('estimated_reading_time')}")
            print_info(f"Difficulty: {data.get('difficulty_level')}")
            
            # Print summary
            print(f"\n{Fore.MAGENTA}Summary:{Style.RESET_ALL}")
            print(data.get('summary', 'N/A'))
            
            # Print first 3 notes
            print(f"\n{Fore.MAGENTA}Key Notes:{Style.RESET_ALL}")
            for i, note in enumerate(data.get('notes', [])[:3], 1):
                print(f"{i}. {note}")
            
            # Print first 3 questions
            print(f"\n{Fore.MAGENTA}Sample Questions:{Style.RESET_ALL}")
            for i, question in enumerate(data.get('questions', [])[:3], 1):
                print(f"{i}. {question}")
            
            return True
        elif response.status_code == 400:
            print_error(f"Bad request: {response.json().get('error')}")
            return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            print_error(response.text)
            return False
    except requests.Timeout:
        print_error("Request timed out (>60 seconds)")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def main():
    """Main test runner"""
    print(f"\n{Fore.CYAN}{Style.BRIGHT}YouTube Summarizer API Test Suite{Style.RESET_ALL}")
    print(f"{Fore.CYAN}Testing server at: {BASE_URL}{Style.RESET_ALL}\n")
    
    results = {
        "health_check": False,
        "demo_mode": False,
        "real_video": False
    }
    
    # Test 1: Health Check
    results["health_check"] = test_health_check()
    
    if not results["health_check"]:
        print_error("\n❌ Server is not running or not healthy. Please start the server:")
        print_info("cd /Users/vishaljha/Government-welfare-Schemes/backend")
        print_info("python manage.py runserver 8003")
        sys.exit(1)
    
    # Test 2: Demo Mode
    results["demo_mode"] = test_demo_mode()
    
    # Test 3: Real Video (optional - use a short educational video)
    test_video = input(f"\n{Fore.YELLOW}Enter a YouTube URL to test (or press Enter to skip): {Style.RESET_ALL}").strip()
    
    if test_video:
        results["real_video"] = test_real_video(test_video)
    else:
        print_info("Skipping real video test")
        results["real_video"] = None
    
    # Summary
    print_section("Test Summary")
    
    passed = sum(1 for v in results.values() if v is True)
    total = sum(1 for v in results.values() if v is not None)
    
    for test_name, result in results.items():
        if result is True:
            print_success(f"{test_name.replace('_', ' ').title()}: PASSED")
        elif result is False:
            print_error(f"{test_name.replace('_', ' ').title()}: FAILED")
        else:
            print_info(f"{test_name.replace('_', ' ').title()}: SKIPPED")
    
    print(f"\n{Fore.CYAN}Overall: {passed}/{total} tests passed{Style.RESET_ALL}\n")
    
    if results["demo_mode"]:
        print_success("✨ Demo mode is working! You can test the frontend UI now.")
        print_info("Use this URL in your frontend:")
        print_info(f"{BASE_URL}/api/youtube/summarize/?demo=true")

if __name__ == "__main__":
    main()
