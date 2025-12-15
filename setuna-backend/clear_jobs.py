#!/usr/bin/env python3
"""
Script to clear all job posts from the database
Run this from the setuna-backend directory with: python clear_jobs.py
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Job

def clear_all_jobs():
    """Clear all job posts from the database"""
    try:
        # Get count before deletion
        job_count = Job.objects.count()
        print(f"Found {job_count} job posts in database")
        
        if job_count == 0:
            print("No job posts to delete")
            return
        
        # Confirm deletion
        confirm = input(f"Are you sure you want to delete all {job_count} job posts? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Deletion cancelled")
            return
        
        # Delete all jobs
        deleted_count, details = Job.objects.all().delete()
        print(f"Successfully deleted {deleted_count} job posts")
        print("Details:", details)
        
        # Verify deletion
        remaining_count = Job.objects.count()
        print(f"Remaining job posts: {remaining_count}")
        
    except Exception as e:
        print(f"Error clearing jobs: {e}")

if __name__ == "__main__":
    clear_all_jobs()
