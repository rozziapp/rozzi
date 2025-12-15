from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import os
import logging
from core.models import UserProfile

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up old profile pictures that are no longer in use'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete photos older than this many days (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(
            self.style.SUCCESS(f'Looking for profile pictures older than {days} days...')
        )
        
        # Get all user profiles
        profiles = UserProfile.objects.all()
        total_cleaned = 0
        
        for profile in profiles:
            if profile.profile_picture:
                # For local files, check if they exist and are old
                if profile.profile_picture.startswith('file://') or profile.profile_picture.startswith('/'):
                    # Extract local file path
                    file_path = profile.profile_picture.replace('file://', '')
                    
                    if os.path.exists(file_path):
                        # Check file modification time
                        file_time = timezone.datetime.fromtimestamp(
                            os.path.getmtime(file_path), 
                            tz=timezone.get_current_timezone()
                        )
                        
                        if file_time < cutoff_date:
                            if dry_run:
                                self.stdout.write(f'Would delete: {file_path}')
                            else:
                                try:
                                    os.remove(file_path)
                                    self.stdout.write(f'Deleted: {file_path}')
                                    total_cleaned += 1
                                except OSError as e:
                                    self.stdout.write(
                                        self.style.ERROR(f'Error deleting {file_path}: {e}')
                                    )
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'Dry run completed. Would have cleaned {total_cleaned} files.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Cleanup completed. Cleaned {total_cleaned} old profile pictures.')
            )

