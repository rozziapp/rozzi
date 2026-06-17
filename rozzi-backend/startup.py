#!/usr/bin/env python
"""
Startup script for Django backend that automatically configures network settings
Run this instead of 'python manage.py runserver' to ensure automatic IP detection
"""

import os
import sys
import socket
import subprocess
from pathlib import Path

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Connect to a remote address to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return None

def update_django_settings():
    """Update Django settings with current network IP"""
    settings_file = Path(__file__).parent / 'backend' / 'settings.py'
    
    if not settings_file.exists():
        print("❌ Django settings file not found!")
        return False
    
    try:
        # Read current settings
        with open(settings_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Get current IP
        current_ip = get_local_ip()
        if not current_ip:
            print("⚠️ Could not detect network IP, using fallback configuration")
            return False
        
        print(f"🌐 Detected network IP: {current_ip}")
        
        # Check if IP is already in ALLOWED_HOSTS
        if current_ip in content:
            print(f"✅ IP {current_ip} already configured in Django settings")
            return True
        
        # Find the ALLOWED_HOSTS line and add current IP
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'ALLOWED_HOSTS = [' in line:
                # Add current IP to the list
                if current_ip not in line:
                    # Find the closing bracket and add IP before it
                    for j in range(i, len(lines)):
                        if ']' in lines[j]:
                            # Insert IP before closing bracket
                            lines[j] = lines[j].replace(']', f"'{current_ip}', ]")
                            break
                    break
        
        # Write updated settings
        updated_content = '\n'.join(lines)
        with open(settings_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"✅ Updated Django settings with IP: {current_ip}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating Django settings: {e}")
        return False

def start_django_server():
    """Start Django development server"""
    print("🚀 Starting Django development server...")
    
    try:
        # Start the server with the updated settings
        subprocess.run([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting Django server: {e}")

def main():
    """Main startup function"""
    print("🔧 Django Backend Startup Script")
    print("=================================")
    
    # Check if we're in the right directory
    if not Path('manage.py').exists():
        print("❌ Please run this script from the rozzi-backend directory")
        return
    
    # Update Django settings
    if update_django_settings():
        print("✅ Django settings updated successfully")
    else:
        print("⚠️ Using existing Django settings")
    
    # Start Django server
    start_django_server()

if __name__ == "__main__":
    main()
