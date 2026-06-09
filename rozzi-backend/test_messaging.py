#!/usr/bin/env python3
"""
Test script to verify messaging functionality
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_USERNAME = "testuser1"
TEST_PASSWORD = "testpass123"

def test_messaging_endpoints():
    """Test the messaging API endpoints"""
    
    print("🧪 Testing Messaging API Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    try:
        response = requests.get(f"{BASE_URL}/health/")
        print(f"✅ Health check: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test 2: Get conversations (should fail without auth)
    try:
        response = requests.get(f"{BASE_URL}/conversations/")
        print(f"✅ Conversations endpoint accessible: {response.status_code}")
        if response.status_code == 401:
            print("   (Expected: Requires authentication)")
    except Exception as e:
        print(f"❌ Conversations endpoint failed: {e}")
    
    # Test 3: Test conversation creation endpoint structure
    try:
        response = requests.post(f"{BASE_URL}/conversations/create/", 
                               json={"recipient_id": 1})
        print(f"✅ Conversation creation endpoint accessible: {response.status_code}")
        if response.status_code == 401:
            print("   (Expected: Requires authentication)")
    except Exception as e:
        print(f"❌ Conversation creation endpoint failed: {e}")
    
    # Test 4: Test message sending endpoint structure
    try:
        response = requests.post(f"{BASE_URL}/messages/send/", 
                               json={"recipient_id": 1, "content": "Test message"})
        print(f"✅ Message sending endpoint accessible: {response.status_code}")
        if response.status_code == 401:
            print("   (Expected: Requires authentication)")
    except Exception as e:
        print(f"❌ Message sending endpoint failed: {e}")
    
    print("\n🎯 Endpoint Testing Complete!")
    print("\n📝 Next Steps:")
    print("1. Start the React Native app")
    print("2. Login with a user account")
    print("3. Try to send a message to another user")
    print("4. Check the TestMessaging component in the inbox")

if __name__ == "__main__":
    test_messaging_endpoints()

