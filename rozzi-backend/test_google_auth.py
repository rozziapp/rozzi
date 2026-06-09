#!/usr/bin/env python3
import requests
import time
import random

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("Testing Google Auth Endpoint Security and Flow...")
    print("=" * 60)
    
    # 1. Simulate Google Login for a New User
    unique_id = int(time.time())
    mock_token = f"mock_token_new_{unique_id}"
    
    print(f"1. Sending Google Login request with mock token: {mock_token}")
    login_data = {"token": mock_token}
    
    try:
        response = requests.post(f"{BASE_URL}/auth/google/", json=login_data)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"[ERROR] Failed initial login: {response.text}")
            return False
            
        data = response.json()
        print("[SUCCESS] Login response successful:")
        print(f"   access: {data.get('access')[:20]}...")
        print(f"   new_user flag: {data.get('new_user')}")
        
        if data.get('new_user') is True:
            print("[ERROR] Expected new_user to be absent or False.")
            return False
            
        access_token = data.get('access')
        
        # Get profile with generated username
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_res = requests.get(f"{BASE_URL}/me/", headers=headers)
        if profile_res.status_code != 200:
            print(f"[ERROR] Failed to get profile: {profile_res.text}")
            return False
            
        profile_data = profile_res.json()
        generated_username = profile_data.get('username')
        print(f"[OK] Generated username assigned: {generated_username}")
        
        # 2. Simulate re-login
        print("\n2. Simulating re-login...")
        re_login_res = requests.post(f"{BASE_URL}/auth/google/", json={"token": mock_token})
        print(f"Re-login Status: {re_login_res.status_code}")
        
        if re_login_res.status_code != 200:
            print(f"[ERROR] Re-login failed: {re_login_res.text}")
            return False
            
        re_login_data = re_login_res.json()
        print(f"   Re-login new_user flag: {re_login_data.get('new_user')}")
        
        if re_login_data.get('new_user') is True:
            print("[ERROR] Security/UX Regression: Expected new_user to be absent or False.")
            return False
            
        re_login_username = re_login_data.get('user', {}).get('username')
        if re_login_username != generated_username:
            print(f"[ERROR] Username mismatch on re-login: {re_login_username} vs {generated_username}")
            return False
            
        print("[OK] User successfully logged in directly with same username without redirection!")
        print("\n" + "=" * 60)
        print("[SUCCESS] All backend Google Auth tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error executing tests: {e}")
        return False

if __name__ == "__main__":
    run_tests()
