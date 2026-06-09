#!/usr/bin/env python
"""
Test script for Cloudinary cleanup functionality.
Run this script to test the cleanup system.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.utils.cloudinary_cleanup import CloudinaryCleanupManager
from core.models import UserProfile, ResumeFile, IDCard
from django.contrib.auth.models import User


def test_cleanup_manager():
    """Test the CloudinaryCleanupManager functionality."""
    print("🧪 Testing Cloudinary Cleanup Manager")
    print("=" * 50)
    
    # Initialize cleanup manager in dry-run mode
    cleanup_manager = CloudinaryCleanupManager(dry_run=True)
    
    print("1. Testing URL parsing...")
    test_urls = [
        "https://res.cloudinary.com/dnr1qtmyf/image/upload/v1234567890/rozzi/profiles/profile_123.jpg",
        "https://res.cloudinary.com/dnr1qtmyf/raw/upload/rozzi/resumes/resume_456.pdf",
        "https://res.cloudinary.com/dnr1qtmyf/image/upload/rozzi/id_cards/id_789.jpg",
        "invalid_url",
        None,
        "",
    ]
    
    for url in test_urls:
        public_id = cleanup_manager.extract_public_id_from_url(url)
        print(f"  URL: {url}")
        print(f"  Public ID: {public_id}")
        print()
    
    print("2. Testing database file references...")
    try:
        referenced_files = cleanup_manager.get_database_file_references()
        print(f"  Found {len(referenced_files)} referenced files in database")
        
        # Show some examples
        if referenced_files:
            print("  Sample referenced files:")
            for i, file_id in enumerate(list(referenced_files)[:5]):
                print(f"    - {file_id}")
            if len(referenced_files) > 5:
                print(f"    ... and {len(referenced_files) - 5} more")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    print("\n3. Testing Cloudinary API connection...")
    try:
        # Test fetching a small number of resources
        resources = cleanup_manager.get_cloudinary_resources('image', max_results=5)
        print(f"  Successfully fetched {len(resources)} image resources")
        
        if resources:
            print("  Sample resources:")
            for resource in resources[:3]:
                print(f"    - {resource.get('public_id')} (created: {resource.get('created_at')})")
                
    except Exception as e:
        print(f"  Error connecting to Cloudinary: {e}")
        print("  Make sure your Cloudinary credentials are correct in settings.py")
    
    print("\n4. Testing cleanup simulation (dry run)...")
    try:
        # Run orphaned file cleanup
        deleted_count, error_count = cleanup_manager.cleanup_orphaned_files()
        print(f"  Orphaned files cleanup: {deleted_count} would be deleted, {error_count} errors")
        
        # Get summary
        summary = cleanup_manager.get_cleanup_summary()
        print(f"  Total operations: {summary['deleted_files']} deletions, {summary['errors']} errors")
        
        if summary['deleted_file_list']:
            print("  Files that would be deleted:")
            for file_info in summary['deleted_file_list'][:5]:
                print(f"    - {file_info}")
            if len(summary['deleted_file_list']) > 5:
                print(f"    ... and {len(summary['deleted_file_list']) - 5} more")
                
    except Exception as e:
        print(f"  Error during cleanup simulation: {e}")
    
    print("\n✅ Test completed!")
    print("=" * 50)


def test_database_models():
    """Test database model integration."""
    print("\n📊 Testing Database Models")
    print("=" * 30)
    
    # Count existing records
    user_count = User.objects.count()
    profile_count = UserProfile.objects.count()
    resume_count = ResumeFile.objects.count()
    id_card_count = IDCard.objects.count()
    
    print(f"Users: {user_count}")
    print(f"User Profiles: {profile_count}")
    print(f"Resume Files: {resume_count}")
    print(f"ID Cards: {id_card_count}")
    
    # Check for profiles with pictures
    profiles_with_pictures = UserProfile.objects.exclude(
        profile_picture__isnull=True
    ).exclude(profile_picture__exact='').count()
    
    print(f"Profiles with pictures: {profiles_with_pictures}")
    
    # Check for ID cards with photos
    id_cards_with_photos = IDCard.objects.exclude(
        photo__isnull=True
    ).exclude(photo__exact='').count()
    
    print(f"ID cards with photos: {id_cards_with_photos}")
    
    print("✅ Database model test completed!")


if __name__ == "__main__":
    print("🚀 Starting Cloudinary Cleanup Test")
    print("This test runs in DRY RUN mode - no files will be deleted")
    print()
    
    try:
        test_database_models()
        test_cleanup_manager()
        
        print("\n🎉 All tests completed successfully!")
        print("\nTo run actual cleanup:")
        print("  python manage.py cleanup_cloudinary --dry-run")
        print("  python manage.py cleanup_cloudinary  # (actual deletion)")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





























