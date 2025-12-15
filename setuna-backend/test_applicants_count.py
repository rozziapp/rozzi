#!/usr/bin/env python
"""
Test script to verify applicants_count is working correctly
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Job, HireRequest, JobApplication
from django.contrib.auth.models import User

def test_applicants_count():
    print("=== Testing Applicants Count ===")
    
    # Get all job seeking posts
    job_seeking_posts = Job.objects.filter(post_type='looking')
    print(f"Found {job_seeking_posts.count()} job seeking posts:")
    
    for job in job_seeking_posts:
        print(f"\nJob: {job.title}")
        print(f"  ID: {job.id}")
        print(f"  Post Type: {job.post_type}")
        print(f"  Status: {job.status}")
        print(f"  User: {job.user.username if job.user else 'No user'}")
        
        # Count hire requests manually
        hire_requests_count = job.hire_requests.count()
        print(f"  Hire Requests Count: {hire_requests_count}")
        
        # Show the applicants_count field
        print(f"  applicants_count field: {job.applicants_count}")
        
        # Show hire request details
        if hire_requests_count > 0:
            print(f"  Hire Request Details:")
            for hr in job.hire_requests.all():
                print(f"    - {hr.requester.username} → {hr.seeker.username} (Status: {hr.status})")
        else:
            print(f"  No hire requests found")
        
        # Verify the count matches
        if hire_requests_count == job.applicants_count:
            print(f"  ✅ applicants_count is correct!")
        else:
            print(f"  ❌ applicants_count mismatch! Expected: {hire_requests_count}, Got: {job.applicants_count}")
    
    print("\n=== Testing Job Posts (Hire) ===")
    
    # Get all job posts (hire)
    job_posts = Job.objects.filter(post_type='hire')
    print(f"Found {job_posts.count()} job posts:")
    
    for job in job_posts:
        print(f"\nJob: {job.title}")
        print(f"  ID: {job.id}")
        print(f"  Post Type: {job.post_type}")
        print(f"  Status: {job.status}")
        
        # Count applications manually
        applications_count = job.applications.count()
        print(f"  Applications Count: {applications_count}")
        
        # Show the applicants_count field
        print(f"  applicants_count field: {job.applicants_count}")
        
        # Verify the count matches
        if applications_count == job.applicants_count:
            print(f"  ✅ applicants_count is correct!")
        else:
            print(f"  ❌ applicants_count mismatch! Expected: {applications_count}, Got: {job.applicants_count}")

if __name__ == "__main__":
    test_applicants_count()
