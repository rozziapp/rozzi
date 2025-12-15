from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import random
import string
from cloudinary.models import CloudinaryField

class Job(models.Model):
    # Job basic information
    title = models.CharField(max_length=200)
    description = models.TextField()
    salary_min = models.IntegerField(null=True, blank=True)
    salary_max = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=200, default='')
    post_type = models.CharField(max_length=20, choices=[
        ('hire', 'Hire'),
        ('looking', 'Looking'),
    ], default='hire')
    job_type = models.CharField(max_length=50, choices=[
        ('Full-time', 'Full-time'),
        ('Part-time', 'Part-time'),
        ('One-time', 'One-time'),
        ('Contract', 'Contract'),
    ], default='Full-time')
    category = models.CharField(max_length=100, choices=[
        ('Technology', 'Technology'),
        ('Delivery', 'Delivery'),
        ('Fitness', 'Fitness'),
        ('Content', 'Content'),
        ('Design', 'Design'),
        ('Marketing', 'Marketing'),
        ('Sales', 'Sales'),
        ('Healthcare', 'Healthcare'),
        ('Education', 'Education'),
        ('Finance', 'Finance'),
        ('Other', 'Other'),
    ], default='Technology', null=True, blank=True)
    sector = models.CharField(max_length=50, choices=[
        ('Local', 'Local'),
        ('Professional', 'Professional'),
    ], default='Professional')
    experience_level = models.CharField(max_length=50, choices=[
        ('not mentioned', 'Not mentioned'),
        ('fresher', 'Fresher'),
        ('0 to 2 years', '0 to 2 years'),
        ('1 to 3 years', '1 to 3 years'),
        ('3+ years', '3+ years'),
        ('5+ years', '5+ years'),
    ], default='not mentioned')
    deadline = models.CharField(max_length=50, choices=[
        ('1 day', '1 day'),
        ('3 days', '3 days'),
        ('7 days', '7 days'),
        ('15 days', '15 days'),
        ('30 days', '30 days'),
    ], default='15 days')
    shift_timing = models.CharField(max_length=50, choices=[
        ('Day', 'Day'),
        ('Night', 'Night'),
        ('Not mentioned', 'Not mentioned'),
    ], default='Not mentioned')
    
    # Location details
    state = models.CharField(max_length=100, default='')
    city = models.CharField(max_length=100, default='')
    address = models.TextField(default='')
    pincode = models.CharField(max_length=10, default='')
    
    # Skills and custom fields
    skills = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=list, blank=True)
    
    # Status and metadata
    status = models.CharField(max_length=50, choices=[
        ('Open', 'Open'),
        ('Closed', 'Closed'),
        ('Draft', 'Draft'),
    ], default='Open')
    
    # User who posted the job
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posted_jobs', null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional fields
    applicants_count = models.IntegerField(default=0)
    is_remote = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def salary_display(self):
        if self.salary_min and self.salary_max:
            return f"₹{self.salary_min:,}-{self.salary_max:,}/month"
        elif self.salary_min:
            return f"₹{self.salary_min:,}/month"
        elif self.salary_max:
            return f"₹{self.salary_max:,}/month"
        return "Salary not specified"
    
    @property
    def calculated_applicants_count(self):
        """Calculate applicants count based on post type"""
        if self.post_type == 'hire':
            # For hire posts, count job applications
            return self.applications.count()
        elif self.post_type == 'looking':
            # For looking posts, count hire requests
            return self.hire_requests.count()
        return 0

class UserProfile(models.Model):
    """Extended user profile with additional fields and username change tracking"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)
    skills = models.JSONField(default=list, blank=True)
    profile_picture = CloudinaryField('profile_pictures', blank=True, null=True, folder='setuna/profiles')
    username_changed_at = models.DateTimeField(null=True, blank=True)
    last_username_change = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-user__date_joined']
    
    def __str__(self):
        return f"Profile for {self.user.username}"
    
    def can_change_username(self):
        """Check if user can change username (Instagram-like: once every 15 days)"""
        if not self.last_username_change:
            return True
        days_since_change = (timezone.now() - self.last_username_change).days
        return days_since_change >= 15
    
    def update_username_change_timestamp(self):
        """Update the timestamp when username is changed"""
        self.last_username_change = timezone.now()
        self.save()
    
    def days_until_username_change(self):
        """Return days until user can change username again"""
        if not self.last_username_change:
            return 0
        days_since_change = (timezone.now() - self.last_username_change).days
        return max(0, 15 - days_since_change)

class IDCard(models.Model):
    """Model for storing ID card details"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='id_cards')
    photo = models.CharField(max_length=500, blank=True, null=True, help_text="Cloudinary photo URL")
    name = models.CharField(max_length=200)
    gender = models.CharField(max_length=20, choices=[
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
        ('Prefer not to say', 'Prefer not to say'),
    ])
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    address = models.TextField()
    phone_number = models.CharField(max_length=20, default='', blank=True)
    skills = models.JSONField(default=list, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return f"ID Card for {self.name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary ID card per user
        if self.is_primary:
            IDCard.objects.filter(user=self.user, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)

class ResumeFile(models.Model):
    """Model for storing resume files"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resume_files')
    file_name = models.CharField(max_length=255)
    file_url = CloudinaryField('resume_files', folder='setuna/resumes')
    file_size = models.IntegerField(help_text="File size in bytes")
    is_default = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-is_default', '-uploaded_at']
    
    def __str__(self):
        return f"Resume: {self.file_name} for {self.user.username}"
    
    def save(self, *args, **kwargs):
        # Ensure only one default resume per user
        if self.is_default:
            ResumeFile.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile when a new User is created"""
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()



class OTP(models.Model):
    """Model for storing OTP codes for email and phone verification"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.email or self.phone}"
    
    @classmethod
    def generate_otp(cls):
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    def is_expired(self):
        """Check if OTP has expired"""
        return timezone.now() > self.expires_at

class JobApplication(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_applications')
    applied_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=[
        ('Pending', 'Pending'),
        ('Under Review', 'Under Review'),
        ('Shortlisted', 'Shortlisted'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
    ], default='Pending')
    cover_letter = models.TextField(blank=True, null=True)
    id_card = models.ForeignKey(IDCard, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    resume = models.ForeignKey(ResumeFile, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    custom_field_answers = models.JSONField(default=list, blank=True)
    
    class Meta:
        unique_together = ['job', 'user']
        ordering = ['-applied_date']
    
    def __str__(self):
        return f"{self.user.username} applied to {self.job.title}"

class HireRequest(models.Model):
    """Model for storing hire requests from recruiters to job seekers"""
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
        ('Withdrawn', 'Withdrawn'),
    ]
    
    # The job seeking post that received the request
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='hire_requests')
    
    # The recruiter who sent the request
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_hire_requests')
    
    # The job seeker who received the request
    seeker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_hire_requests')
    
    # Request details
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')
    message = models.TextField(blank=True, null=True, help_text='Optional message from the requester')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['job', 'requester']  # One request per recruiter per job
    
    def __str__(self):
        return f"{self.requester.username} → {self.seeker.username} for {self.job.title}"


# Signal handlers for updating applicants_count
def update_job_applicants_count(job):
    """Helper function to update applicants_count for a job"""
    if job.post_type == 'hire':
        job.applicants_count = job.applications.count()
    elif job.post_type == 'looking':
        job.applicants_count = job.hire_requests.count()
    job.save()

@receiver(post_save, sender=HireRequest)
def update_job_applicants_count_on_hire_request(sender, instance, **kwargs):
    """Update applicants_count when a hire request is created or updated"""
    update_job_applicants_count(instance.job)
    
    # Create notification for job seeker when hire request is created
    if kwargs.get('created', False):  # Only when creating new hire request
        try:
            # Notify the job seeker about the new hire request
            full_name = f"{instance.requester.first_name} {instance.requester.last_name}".strip()
            display_name = full_name if full_name else instance.requester.username
            create_notification(
                recipient=instance.seeker,
                sender=instance.requester,
                notification_type='hire_request',
                title=f'New Hire Request',
                message=f'{display_name} wants to hire you for "{instance.job.title}"',
                related_job=instance.job,
                related_hire_request=instance
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
    
    # Create notification for requester when hire request status changes
    elif kwargs.get('created', False) is False and instance.pk:  # Update, not create
        # For status changes, we need to check if this is a status update
        # We'll use a simple approach: if the status is not 'Pending', it's likely a status change
        if instance.status in ['Accepted', 'Rejected', 'Withdrawn']:
            try:
                # Check if we already created a notification for this status to avoid duplicates
                existing_notification = Notification.objects.filter(
                    recipient=instance.requester,
                    notification_type__in=['hire_accepted', 'hire_rejected', 'application_status'],
                    related_hire_request=instance,
                    created_at__gte=timezone.now() - timedelta(minutes=5)  # Within last 5 minutes
                ).first()
                
                if not existing_notification:
                    if instance.status == 'Accepted':
                        notification_type = 'hire_accepted'
                        title = 'Hire Request Accepted!'
                        full_name = f"{instance.seeker.first_name} {instance.seeker.last_name}".strip()
                        display_name = full_name if full_name else instance.seeker.username
                        message = f'{display_name} accepted your hire request for "{instance.job.title}"'
                    elif instance.status == 'Rejected':
                        notification_type = 'hire_rejected'
                        title = 'Hire Request Update'
                        full_name = f"{instance.seeker.first_name} {instance.seeker.last_name}".strip()
                        display_name = full_name if full_name else instance.seeker.username
                        message = f'{display_name} declined your hire request for "{instance.job.title}"'
                    else:
                        notification_type = 'application_status'
                        title = 'Hire Request Status Updated'
                        message = f'Your hire request for "{instance.job.title}" status has been updated to {instance.status}.'
                    
                    create_notification(
                        recipient=instance.requester,
                        sender=instance.seeker,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        related_job=instance.job,
                        related_hire_request=instance
                    )
            except Exception as e:
                print(f"Error creating hire request status change notification: {e}")

@receiver(post_delete, sender=HireRequest)
def update_job_applicants_count_on_hire_request_delete(sender, instance, **kwargs):
    """Update applicants_count when a hire request is deleted"""
    update_job_applicants_count(instance.job)

@receiver(post_save, sender=JobApplication)
def update_job_applicants_count_on_application(sender, instance, **kwargs):
    """Update applicants_count when a job application is created or updated"""
    update_job_applicants_count(instance.job)
    
    # Create notification for job poster when application is created
    if kwargs.get('created', False):  # Only when creating new application
        try:
            # Notify the job poster about the new application
            full_name = f"{instance.user.first_name} {instance.user.last_name}".strip()
            display_name = full_name if full_name else instance.user.username
            create_notification(
                recipient=instance.job.user,
                sender=instance.user,
                notification_type='job_applied',
                title=f'New Job Application',
                message=f'{display_name} applied to your job "{instance.job.title}"',
                related_job=instance.job,
                related_application=instance
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
    
    # Create notification for applicant when status changes
    elif kwargs.get('created', False) is False and instance.pk:  # Update, not create
        # For status changes, we need to check if this is a status update
        # We'll use a simple approach: if the status is not 'Pending', it's likely a status change
        # Note: This is a simplified approach. In production, you might want to use django-simple-history
        # or similar to track field changes more accurately
        if instance.status in ['Accepted', 'Rejected', 'Shortlisted', 'Under Review']:
            try:
                # Check if we already created a notification for this status to avoid duplicates
                existing_notification = Notification.objects.filter(
                    recipient=instance.user,
                    notification_type__in=['job_hired', 'job_rejected', 'application_status'],
                    related_application=instance,
                    created_at__gte=timezone.now() - timedelta(minutes=5)  # Within last 5 minutes
                ).first()
                
                if not existing_notification:
                    if instance.status == 'Accepted':
                        notification_type = 'job_hired'
                        title = 'Job Application Accepted!'
                        message = f'Congratulations! Your application for "{instance.job.title}" has been accepted.'
                    elif instance.status == 'Rejected':
                        notification_type = 'job_rejected'
                        title = 'Job Application Update'
                        message = f'Your application for "{instance.job.title}" was not selected at this time.'
                    else:
                        notification_type = 'application_status'
                        title = 'Application Status Updated'
                        message = f'Your application for "{instance.job.title}" status has been updated to {instance.status}.'
                    
                    create_notification(
                        recipient=instance.user,
                        sender=instance.job.user,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        related_job=instance.job,
                        related_application=instance
                    )
            except Exception as e:
                print(f"Error creating status change notification: {e}")

@receiver(post_delete, sender=JobApplication)
def update_job_applicants_count_on_application_delete(sender, instance, **kwargs):
    """Update applicants_count when a job application is deleted"""
    update_job_applicants_count(instance.job)


class Follow(models.Model):
    """Model for storing follow relationships between users"""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['follower', 'following']  # Prevent duplicate follows
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class Block(models.Model):
    """Model for storing user block relationships"""
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by_users')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['blocker', 'blocked']  # Prevent duplicate blocks
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


def create_notification(recipient, notification_type, title, message, sender=None, related_job=None, related_hire_request=None):
    """
    Utility function to create notifications
    """
    return Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        title=title,
        message=message,
        related_job=related_job,
        related_application=related_application,
        related_hire_request=related_hire_request
    )


# Signal handler for Follow notifications
@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, **kwargs):
    """Create notification when someone follows a user"""
    if kwargs.get('created', False):  # Only when creating new follow
        try:
            full_name = f"{instance.follower.first_name} {instance.follower.last_name}".strip()
            display_name = full_name if full_name else instance.follower.username
            create_notification(
                recipient=instance.following,
                sender=instance.follower,
                notification_type='follow',
                title=f'New Follower',
                message=f'{display_name} started following you'
            )
        except Exception as e:
            print(f"Error creating follow notification: {e}")


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('job_applied', 'Job Applied'),
        ('job_hired', 'Job Hired'),
        ('job_rejected', 'Job Rejected'),
        ('hire_request', 'Hire Request'),
        ('hire_accepted', 'Hire Request Accepted'),
        ('hire_rejected', 'Hire Request Rejected'),
        ('follow', 'New Follower'),
        ('application_status', 'Application Status Changed'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications', null=True, blank=True)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_job = models.ForeignKey(Job, on_delete=models.CASCADE, null=True, blank=True)
    related_application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, null=True, blank=True)
    related_hire_request = models.ForeignKey(HireRequest, on_delete=models.CASCADE, null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"
    
    @property
    def time_ago(self):
        """Returns human-readable time difference"""
        from django.utils import timezone
        now = timezone.now()
        diff = now - self.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


class Conversation(models.Model):
    """Model for chat conversations between users"""
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        participant_names = ', '.join([user.username for user in self.participants.all()[:2]])
        return f'Conversation: {participant_names}'
    
    def get_other_participant(self, user):
        """Get the other participant in a conversation (for 1-on-1 chats)"""
        return self.participants.exclude(id=user.id).first()
    
    def get_unread_count(self, user):
        """Get unread message count for a specific user"""
        return self.messages.filter(
            is_read=False
        ).exclude(sender=user).count()
    
    def get_last_message(self):
        """Get the most recent message in this conversation"""
        return self.messages.order_by('-created_at').first()


class Message(models.Model):
    """Model for individual messages within conversations"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional fields for future features
    message_type = models.CharField(max_length=20, default='text', choices=[
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
        ('system', 'System'),
    ])
    attachment_url = models.URLField(blank=True, null=True, help_text="URL for file attachments")
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f'{self.sender.username}: {self.content[:50]}...'
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def time_ago(self):
        """Return human readable time ago string"""
        now = timezone.now()
        diff = now - self.created_at
        
        seconds = diff.total_seconds()
        minutes = seconds // 60
        hours = minutes // 60
        days = hours // 24
        
        if seconds < 60:
            return "Just now"
        elif minutes < 60:
            return f"{int(minutes)}m ago"
        elif hours < 24:
            return f"{int(hours)}h ago"
        elif days < 7:
            return f"{int(days)}d ago"
        else:
            return self.created_at.strftime("%b %d, %Y")
