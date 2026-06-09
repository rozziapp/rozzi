#!/usr/bin/env python3
"""
Simple test script to verify Django server connectivity
"""
import requests
import sys

def test_connection():
    """Test connection to Django server"""
    urls_to_test = [
        "http://localhost:8000/api/health/",
        "http://127.0.0.1:8000/api/health/",
        "http://10.62.138.119:8000/api/health/",
    ]
    
    print("🔍 Testing Django server connectivity...")
    print("=" * 50)
    
    for url in urls_to_test:
        try:
            print(f"Testing: {url}")
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ SUCCESS: {url} - Status: {response.status_code}")
                print(f"   Response: {response.text[:100]}...")
            else:
                print(f"⚠️  WARNING: {url} - Status: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"❌ CONNECTION ERROR: {url} - Server not accessible")
        except requests.exceptions.Timeout:
            print(f"⏰ TIMEOUT: {url} - Request timed out")
        except Exception as e:
            print(f"❌ ERROR: {url} - {str(e)}")
        print()
    
    print("=" * 50)
    print("💡 If you see connection errors for 10.62.138.119:8000,")
    print("   it might be a Windows Firewall issue.")
    print("   Try adding Python to Windows Firewall exceptions.")

if __name__ == "__main__":
    test_connection()
