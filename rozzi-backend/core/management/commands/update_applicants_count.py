from django.core.management.base import BaseCommand
from core.models import Job

class Command(BaseCommand):
    help = 'Update applicants_count for all job seeking posts based on their hire requests'

    def handle(self, *args, **options):
        self.stdout.write('Starting to update applicants_count for all jobs...')
        
        # Get all jobs
        all_jobs = Job.objects.all()
        
        updated_count = 0
        
        for job in all_jobs:
            if job.post_type == 'looking':
                # For job seeking posts, count hire requests
                expected_count = job.hire_requests.count()
            else:
                # For job posts, count applications
                expected_count = job.applications.count()
            
            # Update the applicants_count if it's different
            if job.applicants_count != expected_count:
                old_count = job.applicants_count
                job.applicants_count = expected_count
                job.save()
                updated_count += 1
                self.stdout.write(
                    f'Updated job "{job.title}" (ID: {job.id}, Type: {job.post_type}): '
                    f'applicants_count changed from {old_count} to {expected_count}'
                )
            else:
                self.stdout.write(
                    f'Job "{job.title}" (ID: {job.id}, Type: {job.post_type}) already has correct '
                    f'applicants_count: {expected_count}'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} jobs!'
            )
        )
