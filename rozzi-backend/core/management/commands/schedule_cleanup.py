"""
Django management command to set up scheduled Cloudinary cleanup.
This can be used with cron jobs or task schedulers.
"""

import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run scheduled Cloudinary cleanup (designed for cron jobs)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--weekly',
            action='store_true',
            help='Run weekly cleanup (orphaned files + files older than 30 days)',
        )
        parser.add_argument(
            '--daily',
            action='store_true',
            help='Run daily cleanup (orphaned files only)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without actually deleting files',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        
        if options['weekly']:
            self.stdout.write(
                self.style.SUCCESS(f'🗓️  Running weekly Cloudinary cleanup at {now}')
            )
            
            # Run comprehensive cleanup: orphaned files + old files
            call_command(
                'cleanup_cloudinary',
                '--days-old=30',
                '--verbose' if options.get('verbosity', 1) > 1 else '',
                '--dry-run' if options['dry_run'] else ''
            )
            
        elif options['daily']:
            self.stdout.write(
                self.style.SUCCESS(f'📅 Running daily Cloudinary cleanup at {now}')
            )
            
            # Run light cleanup: orphaned files only
            call_command(
                'cleanup_cloudinary',
                '--orphaned-only',
                '--verbose' if options.get('verbosity', 1) > 1 else '',
                '--dry-run' if options['dry_run'] else ''
            )
            
        else:
            self.stdout.write(
                self.style.ERROR('[ERROR] Please specify --weekly or --daily')
            )
            self.stdout.write(
                'Examples:\n'
                '  python manage.py schedule_cleanup --weekly\n'
                '  python manage.py schedule_cleanup --daily\n'
                '  python manage.py schedule_cleanup --weekly --dry-run'
            )
            return

        self.stdout.write(
            self.style.SUCCESS('[OK] Scheduled cleanup completed')
        )





























