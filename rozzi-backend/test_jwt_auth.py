#!/usr/bin/env python3
"""
Test script to verify JWT authentication is working
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_register():
    """Test user registration"""
    print("1. Testing user registration...")
    
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "password2": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register/", json=user_data)
        print(f"Register status: {response.status_code}")
        
        if response.status_code == 201:
            user = response.json()
            print(f"✅ User registered successfully: {user['username']}")
            return True
        else:
            print(f"❌ Registration failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return False

def test_login():
    """Test user login"""
    print("\n2. Testing user login...")
    
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/token/", json=login_data)
        print(f"Login status: {response.status_code}")
        
        if response.status_code == 200:
            tokens = response.json()
            print(f"✅ Login successful")
            print(f"   Access token: {tokens['access'][:20]}...")
            print(f"   Refresh token: {tokens['refresh'][:20]}...")
            return tokens
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_protected_endpoint(tokens):
    """Test accessing a protected endpoint"""
    print("\n3. Testing protected endpoint...")
    
    headers = {
        "Authorization": f"Bearer {tokens['access']}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/me/", headers=headers)
        print(f"Protected endpoint status: {response.status_code}")
        
        if response.status_code == 200:
            user_profile = response.json()
            print(f"✅ Protected endpoint accessible")
            print(f"   User: {user_profile['username']}")
            print(f"   Email: {user_profile['email']}")
            return True
        else:
            print(f"❌ Protected endpoint failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Protected endpoint error: {e}")
        return False

def test_job_creation(tokens):
    """Test creating a job (protected endpoint)"""
    print("\n4. Testing job creation...")
    
    headers = {
        "Authorization": f"Bearer {tokens['access']}",
        "Content-Type": "application/json"
    }
    
    job_data = {
        "title": "Test React Native Developer",
        "description": "This is a test job posting for a React Native developer position.",
        "salary_min": 800000,
        "salary_max": 1200000,
        "location": "Mumbai, India",
        "job_type": "Full-time",
        "category": "Technology",
        "sector": "Professional",
        "experience_level": "2-5 years",
        "deadline": "15 days",
        "shift_timing": "Day",
        "state": "Maharashtra",
        "city": "Mumbai",
        "address": "Test Address",
        "pincode": "400001"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/jobs/", json=job_data, headers=headers)
        print(f"Job creation status: {response.status_code}")
        
        if response.status_code == 201:
            job = response.json()
            print(f"✅ Job created successfully: {job['title']}")
            return job['id']
        else:
            print(f"❌ Job creation failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Job creation error: {e}")
        return None

def test_token_refresh(tokens):
    """Test token refresh"""
    print("\n5. Testing token refresh...")
    
    refresh_data = {
        "refresh": tokens['refresh']
    }
    
    try:
        response = requests.post(f"{BASE_URL}/token/refresh/", json=refresh_data)
        print(f"Token refresh status: {response.status_code}")
        
        if response.status_code == 200:
            new_tokens = response.json()
            print(f"✅ Token refresh successful")
            print(f"   New access token: {new_tokens['access'][:20]}...")
            return new_tokens['access']
        else:
            print(f"❌ Token refresh failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Token refresh error: {e}")
        return None

def test_jobs_list():
    """Test getting jobs list (public endpoint)"""
    print("\n6. Testing jobs list (public endpoint)...")
    
    try:
        response = requests.get(f"{BASE_URL}/jobs/")
        print(f"Jobs list status: {response.status_code}")
        
        if response.status_code == 200:
            jobs = response.json()
            print(f"✅ Jobs list accessible")
            print(f"   Found {len(jobs)} jobs")
            return True
        else:
            print(f"❌ Jobs list failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Jobs list error: {e}")
        return False

def main():
    print("Testing Rozzi JWT Authentication...")
    print("=" * 50)
    
    # Test registration
    if not test_register():
        print("❌ Registration failed. Stopping tests.")
        return
    
    # Test login
    tokens = test_login()
    if not tokens:
        print("❌ Login failed. Stopping tests.")
        return
    
    # Test protected endpoint
    if not test_protected_endpoint(tokens):
        print("❌ Protected endpoint failed.")
        return
    
    # Test job creation
    job_id = test_job_creation(tokens)
    if not job_id:
        print("❌ Job creation failed.")
        return
    
    # Test token refresh
    new_access_token = test_token_refresh(tokens)
    if not new_access_token:
        print("❌ Token refresh failed.")
        return
    
    # Test public endpoint
    if not test_jobs_list():
        print("❌ Jobs list failed.")
        return
    
    print("\n" + "=" * 50)
    print("🎉 All JWT authentication tests passed!")
    print("\nSummary:")
    print("✅ User registration working")
    print("✅ User login working")
    print("✅ JWT token generation working")
    print("✅ Protected endpoints working")
    print("✅ Job creation with authentication working")
    print("✅ Token refresh working")
    print("✅ Public endpoints accessible")

if __name__ == "__main__":
    main()
