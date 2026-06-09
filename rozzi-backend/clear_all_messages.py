#!/usr/bin/env python
"""
Clear All Messages and Conversations Script
This script completely removes all messages and conversations from the database
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from core.models import Message, Conversation
from django.contrib.auth.models import User

def clear_all_messages():
    """Clear all messages and conversations from the database"""
    
    print("🗑️ Starting complete database cleanup...")
    
    try:
        # Count existing data
        message_count = Message.objects.count()
        conversation_count = Conversation.objects.count()
        user_count = User.objects.count()
        
        print(f"📊 Current database state:")
        print(f"   - Messages: {message_count}")
        print(f"   - Conversations: {conversation_count}")
        print(f"   - Users: {user_count}")
        
        if message_count == 0 and conversation_count == 0:
            print("✅ Database is already clean - no messages or conversations to delete")
            return
        
        # Clear all messages first
        print("\n🗑️ Deleting all messages...")
        Message.objects.all().delete()
        print("✅ All messages deleted")
        
        # Clear all conversations
        print("\n🗑️ Deleting all conversations...")
        Conversation.objects.all().delete()
        print("✅ All conversations deleted")
        
        # Verify deletion
        remaining_messages = Message.objects.count()
        remaining_conversations = Conversation.objects.count()
        
        print(f"\n📊 Database after cleanup:")
        print(f"   - Messages: {remaining_messages}")
        print(f"   - Conversations: {remaining_conversations}")
        print(f"   - Users: {User.objects.count()}")
        
        if remaining_messages == 0 and remaining_conversations == 0:
            print("\n🎉 Database cleanup completed successfully!")
            print("   All messages and conversations have been removed")
        else:
            print("\n⚠️ Some data may still exist - manual cleanup may be needed")
            
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return False
    
    return True

def reset_auto_increment():
    """Reset auto-increment counters for clean IDs"""
    
    print("\n🔄 Resetting auto-increment counters...")
    
    try:
        with connection.cursor() as cursor:
            # Reset Message ID counter
            cursor.execute("DELETE FROM sqlite_sequence WHERE name='core_message'")
            
            # Reset Conversation ID counter  
            cursor.execute("DELETE FROM sqlite_sequence WHERE name='core_conversation'")
            
            print("✅ Auto-increment counters reset")
            
    except Exception as e:
        print(f"⚠️ Could not reset auto-increment: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🗑️ COMPLETE DATABASE CLEANUP SCRIPT")
    print("=" * 60)
    print("⚠️  WARNING: This will delete ALL messages and conversations!")
    print("⚠️  This action cannot be undone!")
    print("=" * 60)
    
    # Ask for confirmation
    response = input("\nAre you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        print("\n🔄 Proceeding with cleanup...")
        
        if clear_all_messages():
            reset_auto_increment()
            print("\n🎉 Database cleanup completed!")
            print("   You can now start fresh with clean data")
        else:
            print("\n❌ Cleanup failed - check the error messages above")
    else:
        print("\n❌ Cleanup cancelled")
    
    print("\n" + "=" * 60)
