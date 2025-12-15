#!/usr/bin/env python3
"""
Simple test script to verify Django backend endpoints are working
"""

import requests
import json

BASE_URL = 'http://localhost:8000/api'

def test_backend_connection():
    """Test if the backend is accessible"""
    try:
        print("Testing backend connection...")
        response = requests.get(f'{BASE_URL}/jobs/', timeout=5)
        print(f"✅ Backend is running! Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        print("Please start the Django server with: python manage.py runserver 0.0.0.0:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

def test_signup_endpoint():
    """Test the signup endpoint"""
    try:
        print("\nTesting signup endpoint...")
        signup_data = {
            'username': 'testuser123',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        response = requests.post(f'{BASE_URL}/register/', json=signup_data, timeout=10)
        print(f"Signup response status: {response.status_code}")
        print(f"Signup response: {response.text[:200]}...")
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"❌ Error testing signup: {e}")
        return False

def test_jobs_endpoint():
    """Test the jobs endpoint"""
    try:
        print("\nTesting jobs endpoint...")
        response = requests.get(f'{BASE_URL}/jobs/', timeout=5)
        print(f"Jobs response status: {response.status_code}")
        print(f"Jobs response: {response.text[:200]}...")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error testing jobs: {e}")
        return False

if __name__ == '__main__':
    print("🔍 Testing Django Backend...")
    print("=" * 50)
    
    # Test backend connection
    if test_backend_connection():
        # Test endpoints
        test_signup_endpoint()
        test_jobs_endpoint()
    else:
        print("\n💡 To start the backend:")
        print("1. Navigate to setuna-backend directory")
        print("2. Run: python manage.py runserver 0.0.0.0:8000")
        print("3. Keep the server running in the background")
    
    print("\n" + "=" * 50)
    print("✅ Backend testing completed!")
