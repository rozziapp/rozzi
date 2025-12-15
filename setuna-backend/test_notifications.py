#!/usr/bin/env python
"""
Test script to verify notification creation
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import User, Job, JobApplication, Notification
from django.utils import timezone

def test_notification_creation():
    """Test creating a notification manually"""
    try:
        # Get or create test users
        user1, created1 = User.objects.get_or_create(
            username='testuser1',
            defaults={
                'email': 'test1@example.com',
                'first_name': 'Test',
                'last_name': 'User1'
            }
        )
        
        user2, created2 = User.objects.get_or_create(
            username='testuser2',
            defaults={
                'email': 'test2@example.com',
                'first_name': 'Test',
                'last_name': 'User2'
            }
        )
        
        print(f"User1: {user1.username} (ID: {user1.id})")
        print(f"User2: {user2.username} (ID: {user2.id})")
        
        # Create a test job
        job, created = Job.objects.get_or_create(
            title='Test Job for Notifications',
            defaults={
                'description': 'This is a test job to verify notifications',
                'location': 'Test Location',
                'post_type': 'hire',
                'job_type': 'Full-time',
                'sector': 'Professional',
                'user': user1,
                'status': 'Open'
            }
        )
        
        print(f"Job: {job.title} (ID: {job.id})")
        
        # Create a test job application
        application, created = JobApplication.objects.get_or_create(
            job=job,
            user=user2,
            defaults={
                'cover_letter': 'This is a test application',
                'status': 'Pending'
            }
        )
        
        print(f"Application: {application.id} by {application.user.username}")
        
        # Check if notification was created
        notifications = Notification.objects.filter(
            recipient=user1,
            notification_type='job_applied'
        )
        
        print(f"Found {notifications.count()} notifications for job application")
        for notif in notifications:
            print(f"  - {notif.title}: {notif.message}")
            print(f"    Created: {notif.created_at}")
            print(f"    Read: {notif.read}")
        
        # Create a test notification manually
        test_notification = Notification.objects.create(
            recipient=user1,
            sender=user2,
            notification_type='job_applied',
            title='Manual Test Notification',
            message='This is a manually created test notification',
            related_job=job,
            related_application=application
        )
        
        print(f"Created manual test notification: {test_notification.id}")
        
        # List all notifications for user1
        all_notifications = Notification.objects.filter(recipient=user1).order_by('-created_at')
        print(f"\nAll notifications for {user1.username}:")
        for notif in all_notifications:
            print(f"  - {notif.notification_type}: {notif.title}")
            print(f"    Message: {notif.message}")
            print(f"    Created: {notif.created_at}")
            print(f"    Read: {notif.read}")
            print()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_notification_creation()
