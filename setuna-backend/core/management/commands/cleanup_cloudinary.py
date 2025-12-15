"""
Django management command for cleaning up old and orphaned Cloudinary files.
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.utils.cloudinary_cleanup import CloudinaryCleanupManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old and orphaned files from Cloudinary'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without actually deleting files',
        )
        parser.add_argument(
            '--orphaned-only',
            action='store_true',
            help='Only clean up orphaned files (not referenced in database)',
        )
        parser.add_argument(
            '--old-files-only',
            action='store_true',
            help='Only clean up old files (based on age)',
        )
        parser.add_argument(
            '--days-old',
            type=int,
            default=30,
            help='Consider files older than this many days for deletion (default: 30)',
        )
        parser.add_argument(
            '--max-files',
            type=int,
            default=500,
            help='Maximum number of files to process (default: 500)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose logging',
        )

    def handle(self, *args, **options):
        # Configure logging level
        if options['verbose']:
            logging.getLogger().setLevel(logging.DEBUG)
            logger.setLevel(logging.DEBUG)

        dry_run = options['dry_run']
        orphaned_only = options['orphaned_only']
        old_files_only = options['old_files_only']
        days_old = options['days_old']

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No files will be actually deleted')
            )

        try:
            # Initialize cleanup manager
            cleanup_manager = CloudinaryCleanupManager(dry_run=dry_run)
            
            start_time = timezone.now()
            total_deleted = 0
            total_errors = 0

            self.stdout.write(f'Starting Cloudinary cleanup at {start_time}')

            # Clean up orphaned files
            if not old_files_only:
                self.stdout.write('🔍 Scanning for orphaned files...')
                deleted_count, error_count = cleanup_manager.cleanup_orphaned_files()
                total_deleted += deleted_count
                total_errors += error_count
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Orphaned files cleanup: {deleted_count} deleted, {error_count} errors'
                    )
                )

            # Clean up old files
            if not orphaned_only:
                self.stdout.write(f'🕰️  Scanning for files older than {days_old} days...')
                deleted_count, error_count = cleanup_manager.cleanup_old_files(days_old)
                total_deleted += deleted_count
                total_errors += error_count
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Old files cleanup: {deleted_count} deleted, {error_count} errors'
                    )
                )

            # Get summary
            summary = cleanup_manager.get_cleanup_summary()
            end_time = timezone.now()
            duration = end_time - start_time

            # Display results
            self.stdout.write('\n' + '='*60)
            self.stdout.write(
                self.style.SUCCESS(f'📊 CLEANUP SUMMARY')
            )
            self.stdout.write('='*60)
            self.stdout.write(f'⏱️  Duration: {duration}')
            self.stdout.write(f'🗑️  Total files deleted: {total_deleted}')
            self.stdout.write(f'❌ Total errors: {total_errors}')
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING('🧪 This was a DRY RUN - no files were actually deleted')
                )

            # Show detailed results if verbose
            if options['verbose'] and summary['deleted_file_list']:
                self.stdout.write('\n📋 Deleted files:')
                for file_info in summary['deleted_file_list']:
                    self.stdout.write(f'  - {file_info}')

            if summary['error_list']:
                self.stdout.write('\n❌ Errors encountered:')
                for error in summary['error_list']:
                    self.stdout.write(
                        self.style.ERROR(f'  - {error}')
                    )

            # Final status
            if total_errors == 0:
                self.stdout.write(
                    self.style.SUCCESS('\n🎉 Cleanup completed successfully!')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'\n⚠️  Cleanup completed with {total_errors} errors')
                )

        except Exception as e:
            logger.exception("Unexpected error during cleanup")
            raise CommandError(f'Cleanup failed: {str(e)}')

