"""
Cloudinary cleanup utilities for managing old and orphaned files.
"""

import os
import logging
from typing import List, Dict, Set, Optional, Tuple
from urllib.parse import urlparse
import re

import cloudinary
import cloudinary.api
import cloudinary.uploader
from django.conf import settings
from django.db import models
from django.contrib.auth.models import User

from core.models import UserProfile, IDCard, ResumeFile, Job

# Configure logging
logger = logging.getLogger(__name__)

# Configure Cloudinary with Admin API access
cloudinary.config(
    cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
    api_secret=settings.CLOUDINARY_STORAGE['API_SECRET'],
    secure=True
)


class CloudinaryCleanupManager:
    """
    Manager class for handling Cloudinary file cleanup operations.
    """
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize the cleanup manager.
        
        Args:
            dry_run (bool): If True, only simulate deletions without actually deleting files
        """
        self.dry_run = dry_run
        self.deleted_files = []
        self.skipped_files = []
        self.errors = []
        
    def extract_public_id_from_url(self, url: str) -> Optional[str]:
        """
        Extract Cloudinary public_id from a Cloudinary URL.
        
        Args:
            url (str): Cloudinary URL
            
        Returns:
            str: Public ID or None if not a valid Cloudinary URL
        """
        if not url or not isinstance(url, str):
            return None
            
        # Handle CloudinaryResource objects that might be passed as strings
        if hasattr(url, 'public_id'):
            return url.public_id
            
        # Extract public_id from Cloudinary URL patterns
        # Pattern: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/v{version}/{public_id}.{format}
        # or: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/{public_id}.{format}
        
        patterns = [
            r'https?://res\.cloudinary\.com/[^/]+/(?:image|video|raw)/upload/(?:v\d+/)?(.+?)(?:\.[^.]+)?(?:\?.*)?$',
            r'https?://res\.cloudinary\.com/[^/]+/(?:image|video|raw)/upload/(.+?)(?:\.[^.]+)?(?:\?.*)?$',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, url)
            if match:
                public_id = match.group(1)
                # Remove any transformation parameters
                public_id = re.sub(r'/[a-z_,0-9]+/', '', public_id)
                return public_id
                
        return None
    
    def get_database_file_references(self) -> Set[str]:
        """
        Get all file references from the database.
        
        Returns:
            Set[str]: Set of public IDs referenced in the database
        """
        referenced_files = set()
        
        # Profile pictures from UserProfile
        logger.info("Scanning UserProfile for profile pictures...")
        for profile in UserProfile.objects.exclude(profile_picture__isnull=True).exclude(profile_picture__exact=''):
            if hasattr(profile.profile_picture, 'public_id'):
                referenced_files.add(profile.profile_picture.public_id)
            elif isinstance(profile.profile_picture, str):
                public_id = self.extract_public_id_from_url(profile.profile_picture)
                if public_id:
                    referenced_files.add(public_id)
        
        # ID card photos
        logger.info("Scanning IDCard for photos...")
        for id_card in IDCard.objects.exclude(photo__isnull=True).exclude(photo__exact=''):
            public_id = self.extract_public_id_from_url(id_card.photo)
            if public_id:
                referenced_files.add(public_id)
        
        # Resume files
        logger.info("Scanning ResumeFile for file URLs...")
        for resume in ResumeFile.objects.all():
            if hasattr(resume.file_url, 'public_id'):
                referenced_files.add(resume.file_url.public_id)
            elif isinstance(resume.file_url, str):
                public_id = self.extract_public_id_from_url(resume.file_url)
                if public_id:
                    referenced_files.add(public_id)
        
        logger.info(f"Found {len(referenced_files)} referenced files in database")
        return referenced_files
    
    def get_cloudinary_resources(self, resource_type: str = 'image', max_results: int = 500) -> List[Dict]:
        """
        Get all resources from Cloudinary using Admin API.
        
        Args:
            resource_type (str): Type of resource ('image', 'video', 'raw')
            max_results (int): Maximum number of results to fetch
            
        Returns:
            List[Dict]: List of resource dictionaries from Cloudinary
        """
        resources = []
        next_cursor = None
        
        try:
            while len(resources) < max_results:
                # Fetch resources with pagination
                response = cloudinary.api.resources(
                    resource_type=resource_type,
                    type='upload',
                    max_results=min(500, max_results - len(resources)),  # Cloudinary max is 500 per request
                    next_cursor=next_cursor,
                    prefix='setuna/'  # Only get files in our folder
                )
                
                batch_resources = response.get('resources', [])
                resources.extend(batch_resources)
                
                # Check if there are more resources
                next_cursor = response.get('next_cursor')
                if not next_cursor:
                    break
                    
                logger.info(f"Fetched {len(resources)} {resource_type} resources so far...")
                
        except Exception as e:
            logger.error(f"Error fetching {resource_type} resources from Cloudinary: {e}")
            
        logger.info(f"Total {resource_type} resources fetched: {len(resources)}")
        return resources
    
    def delete_cloudinary_resource(self, public_id: str, resource_type: str = 'image') -> bool:
        """
        Delete a resource from Cloudinary.
        
        Args:
            public_id (str): Public ID of the resource to delete
            resource_type (str): Type of resource ('image', 'video', 'raw')
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would delete {resource_type}: {public_id}")
            return True
            
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            
            if result.get('result') == 'ok':
                logger.info(f"Successfully deleted {resource_type}: {public_id}")
                return True
            else:
                logger.warning(f"Failed to delete {resource_type}: {public_id} - {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting {resource_type} {public_id}: {e}")
            return False
    
    def delete_old_profile_picture(self, user_profile: UserProfile, old_public_id: str) -> bool:
        """
        Delete an old profile picture from Cloudinary.
        
        Args:
            user_profile (UserProfile): The user profile instance
            old_public_id (str): Public ID of the old profile picture
            
        Returns:
            bool: True if deletion was successful
        """
        if not old_public_id:
            return False
            
        # Don't delete if it's the current profile picture
        current_public_id = None
        if hasattr(user_profile.profile_picture, 'public_id'):
            current_public_id = user_profile.profile_picture.public_id
        elif isinstance(user_profile.profile_picture, str):
            current_public_id = self.extract_public_id_from_url(user_profile.profile_picture)
            
        if current_public_id == old_public_id:
            logger.info(f"Skipping deletion of current profile picture: {old_public_id}")
            return False
            
        success = self.delete_cloudinary_resource(old_public_id, 'image')
        if success:
            self.deleted_files.append(f"profile_picture:{old_public_id}")
        else:
            self.errors.append(f"Failed to delete profile picture: {old_public_id}")
            
        return success
    
    def delete_old_resume(self, resume_file: ResumeFile, old_public_id: str) -> bool:
        """
        Delete an old resume file from Cloudinary.
        
        Args:
            resume_file (ResumeFile): The resume file instance
            old_public_id (str): Public ID of the old resume
            
        Returns:
            bool: True if deletion was successful
        """
        if not old_public_id:
            return False
            
        # Don't delete if it's the current resume
        current_public_id = None
        if hasattr(resume_file.file_url, 'public_id'):
            current_public_id = resume_file.file_url.public_id
        elif isinstance(resume_file.file_url, str):
            current_public_id = self.extract_public_id_from_url(resume_file.file_url)
            
        if current_public_id == old_public_id:
            logger.info(f"Skipping deletion of current resume: {old_public_id}")
            return False
            
        success = self.delete_cloudinary_resource(old_public_id, 'raw')
        if success:
            self.deleted_files.append(f"resume:{old_public_id}")
        else:
            self.errors.append(f"Failed to delete resume: {old_public_id}")
            
        return success
    
    def cleanup_orphaned_files(self) -> Tuple[int, int]:
        """
        Clean up orphaned files (files in Cloudinary but not referenced in database).
        
        Returns:
            Tuple[int, int]: (deleted_count, error_count)
        """
        logger.info("Starting cleanup of orphaned files...")
        
        # Get all referenced files from database
        referenced_files = self.get_database_file_references()
        
        deleted_count = 0
        error_count = 0
        
        # Process different resource types
        resource_types = [
            ('image', 'setuna/profiles'),  # Profile pictures
            ('image', 'setuna/id_cards'),  # ID card photos
            ('raw', 'setuna/resumes'),     # Resume files
        ]
        
        for resource_type, folder_prefix in resource_types:
            logger.info(f"Processing {resource_type} resources in {folder_prefix}...")
            
            # Get all resources of this type from Cloudinary
            resources = self.get_cloudinary_resources(resource_type)
            
            for resource in resources:
                public_id = resource.get('public_id')
                
                # Skip if not in our folder
                if not public_id or not public_id.startswith(folder_prefix.replace('setuna/', '')):
                    continue
                
                # Check if this file is referenced in database
                if public_id not in referenced_files:
                    logger.info(f"Found orphaned file: {public_id}")
                    
                    if self.delete_cloudinary_resource(public_id, resource_type):
                        deleted_count += 1
                        self.deleted_files.append(f"orphaned_{resource_type}:{public_id}")
                    else:
                        error_count += 1
                        self.errors.append(f"Failed to delete orphaned {resource_type}: {public_id}")
                else:
                    logger.debug(f"File is referenced, keeping: {public_id}")
        
        logger.info(f"Orphaned file cleanup completed. Deleted: {deleted_count}, Errors: {error_count}")
        return deleted_count, error_count
    
    def cleanup_old_files(self, days_old: int = 30) -> Tuple[int, int]:
        """
        Clean up old files that haven't been accessed recently.
        
        Args:
            days_old (int): Files older than this many days will be considered for deletion
            
        Returns:
            Tuple[int, int]: (deleted_count, error_count)
        """
        from datetime import datetime, timedelta
        
        logger.info(f"Starting cleanup of files older than {days_old} days...")
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        referenced_files = self.get_database_file_references()
        
        deleted_count = 0
        error_count = 0
        
        # Process different resource types
        for resource_type in ['image', 'raw']:
            resources = self.get_cloudinary_resources(resource_type)
            
            for resource in resources:
                public_id = resource.get('public_id')
                created_at = resource.get('created_at')
                
                if not public_id or not created_at:
                    continue
                
                # Parse creation date
                try:
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    continue
                
                # Skip if file is not old enough
                if created_date > cutoff_date:
                    continue
                
                # Skip if file is still referenced
                if public_id in referenced_files:
                    continue
                
                logger.info(f"Found old unreferenced file: {public_id} (created: {created_at})")
                
                if self.delete_cloudinary_resource(public_id, resource_type):
                    deleted_count += 1
                    self.deleted_files.append(f"old_{resource_type}:{public_id}")
                else:
                    error_count += 1
                    self.errors.append(f"Failed to delete old {resource_type}: {public_id}")
        
        logger.info(f"Old file cleanup completed. Deleted: {deleted_count}, Errors: {error_count}")
        return deleted_count, error_count
    
    def get_cleanup_summary(self) -> Dict:
        """
        Get a summary of the cleanup operation.
        
        Returns:
            Dict: Summary statistics
        """
        return {
            'deleted_files': len(self.deleted_files),
            'skipped_files': len(self.skipped_files),
            'errors': len(self.errors),
            'deleted_file_list': self.deleted_files,
            'error_list': self.errors,
            'dry_run': self.dry_run
        }


def delete_old_profile_picture(user_profile: UserProfile, old_public_id: str) -> bool:
    """
    Convenience function to delete an old profile picture.
    
    Args:
        user_profile (UserProfile): The user profile instance
        old_public_id (str): Public ID of the old profile picture
        
    Returns:
        bool: True if deletion was successful
    """
    cleanup_manager = CloudinaryCleanupManager()
    return cleanup_manager.delete_old_profile_picture(user_profile, old_public_id)


def delete_old_resume(resume_file: ResumeFile, old_public_id: str) -> bool:
    """
    Convenience function to delete an old resume file.
    
    Args:
        resume_file (ResumeFile): The resume file instance
        old_public_id (str): Public ID of the old resume
        
    Returns:
        bool: True if deletion was successful
    """
    cleanup_manager = CloudinaryCleanupManager()
    return cleanup_manager.delete_old_resume(resume_file, old_public_id)

