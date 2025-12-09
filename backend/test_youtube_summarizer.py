#!/usr/bin/env python3
"""
YouTube Summarizer Test Script
Tests the YouTube summarizer functionality with sample videos
"""

import requests
import json
import time

BASE_URL = "http://localhost:8003/api/youtube"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    response = requests.get(f"{BASE_URL}/health/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    return response.status_code == 200

def test_summarize_video(video_url):
    """Test video summarization"""
    print(f"🎬 Testing video summarization...")
    print(f"URL: {video_url}")
    print("⏳ This may take 30-60 seconds...")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/summarize/",
            json={"video_url": video_url},
            timeout=120  # 2 minutes timeout
        )
        
        elapsed = time.time() - start_time
        print(f"⏱️  Time taken: {elapsed:.2f} seconds")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ SUCCESS! Summary generated:")
            print(f"  Title: {data.get('title', 'N/A')}")
            print(f"  Channel: {data.get('channel_name', 'N/A')}")
            print(f"  Duration: {data.get('video_duration', 'N/A')}")
            print(f"  Difficulty: {data.get('difficulty_level', 'N/A')}")
            print(f"  Reading Time: {data.get('estimated_reading_time', 'N/A')}")
            print(f"  Notes Count: {len(data.get('notes', []))}")
            print(f"  Questions Count: {len(data.get('questions', []))}")
            print(f"  Keywords: {', '.join(data.get('keywords', []))}")
            print(f"\n  Summary Preview: {data.get('summary', '')[:200]}...")
            return True
        else:
            print(f"\n❌ ERROR: {response.json()}")
            return False
            
    except requests.exceptions.Timeout:
        print("\n⏰ Request timed out after 2 minutes")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

def test_invalid_url():
    """Test with invalid URL"""
    print("🚫 Testing invalid URL handling...")
    response = requests.post(
        f"{BASE_URL}/summarize/",
        json={"video_url": "https://example.com/not-youtube"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    return response.status_code == 400

def main():
    print("=" * 60)
    print("YouTube Video Summarizer - Test Suite")
    print("=" * 60)
    print()
    
    # Test 1: Health Check
    health_ok = test_health_check()
    if not health_ok:
        print("❌ Health check failed. Is the server running?")
        return
    
    # Test 2: Invalid URL
    test_invalid_url()
    
    # Test 3: Summarize a video
    # NOTE: Replace with a video URL that has captions enabled
    test_video_url = input("\nEnter a YouTube URL to test (or press Enter to skip): ").strip()
    
    if test_video_url:
        test_summarize_video(test_video_url)
    else:
        print("\n⏭️  Skipping video test")
        print("\n💡 TIP: To test, try these types of videos:")
        print("   - Educational videos (Khan Academy, CrashCourse)")
        print("   - TED Talks")
        print("   - Tutorial videos")
        print("   - Videos with auto-generated captions")
    
    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
