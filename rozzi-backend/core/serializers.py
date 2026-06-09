from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Job, JobApplication, UserProfile, IDCard, ResumeFile, HireRequest, Follow, Block, Notification, Conversation, Message
from django.utils import timezone
from datetime import timedelta

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'bio', 'skills', 'profile_picture', 'last_username_change', 'days_until_username_change',
            'subscription_plan', 'is_premium', 'subscription_active', 'daily_applications_count', 'last_application_reset',
            'active_hire_count', 'active_looking_count',
            'max_active_hire_posts', 'max_active_looking_posts',
            'daily_applications_limit', 'remaining_hire_posts',
            'remaining_looking_posts', 'remaining_applications'
        ]
        read_only_fields = [
            'last_username_change', 'days_until_username_change',
            'is_premium', 'subscription_active',
            'active_hire_count', 'active_looking_count',
            'max_active_hire_posts', 'max_active_looking_posts',
            'daily_applications_limit', 'remaining_hire_posts',
            'remaining_looking_posts', 'remaining_applications',
            'daily_applications_count', 'last_application_reset'
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['days_until_username_change'] = instance.days_until_username_change()
        
        # Handle Cloudinary fields - convert to string URLs
        if instance.profile_picture:
            data['profile_picture'] = str(instance.profile_picture)
        
        return data

class IDCardSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = IDCard
        fields = ['id', 'photo', 'name', 'gender', 'date_of_birth', 'nationality', 'address', 'phone_number', 'skills', 'is_primary', 'age', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Handle Cloudinary fields - convert to string URLs
        if instance.photo:
            # Photo is now stored as a URL string, so just return it as is
            data['photo'] = instance.photo
        
        return data
    
    def get_age(self, obj):
        if obj.date_of_birth:
            try:
                from datetime import datetime
                today = timezone.now().date()
                
                # Handle both string and date objects
                if isinstance(obj.date_of_birth, str):
                    birth_date = datetime.strptime(obj.date_of_birth, '%Y-%m-%d').date()
                else:
                    birth_date = obj.date_of_birth
                
                age = today.year - birth_date.year
                if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                    age -= 1
                return age
            except (ValueError, AttributeError):
                return None
        return None

class ResumeFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeFile
        fields = ['id', 'file_name', 'file_url', 'file_size', 'is_default', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # file_url is now a URLField, just return it directly
        return data

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    id_cards = IDCardSerializer(many=True, read_only=True)
    resume_files = ResumeFileSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    can_change_username = serializers.SerializerMethodField()
    days_until_username_change = serializers.SerializerMethodField()
    last_username_change = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile', 'id_cards', 'resume_files', 'can_change_username', 'days_until_username_change', 'last_username_change', 'profile_picture']
        read_only_fields = ['id']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_can_change_username(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.can_change_username()
        return True
    
    def get_days_until_username_change(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.days_until_username_change()
        return 0
    
    def get_last_username_change(self, obj):
        if hasattr(obj, 'profile') and obj.profile.last_username_change:
            return obj.profile.last_username_change
        return None
    
    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile and obj.profile.profile_picture:
            # Convert CloudinaryResource to string URL
            return str(obj.profile.profile_picture)
        return None

class JobSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    applicants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = ['id', 'title', 'description', 'salary_min', 'salary_max', 'location', 
                 'post_type', 'job_type', 'sector', 'experience_level', 'deadline', 'shift_timing',
                 'state', 'city', 'address', 'pincode', 'custom_fields', 'gender_preference',
                 'requires_resume_url', 'status', 'user', 'created_at', 'updated_at', 'applicants_count']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_applicants_count(self, obj):
        return obj.calculated_applicants_count
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class BasicUserSerializer(serializers.ModelSerializer):
    """Simplified user serializer for job applications - no profile/id_cards/resumes"""
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'profile_picture']
        read_only_fields = ['id']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile and obj.profile.profile_picture:
            # Convert CloudinaryResource to string URL
            return str(obj.profile.profile_picture)
        return None

class JobListSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    applicants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = ['id', 'title', 'description', 'salary_min', 'salary_max', 'location', 
                 'post_type', 'job_type', 'sector', 'experience_level', 'deadline', 
                 'shift_timing', 'state', 'city', 'address', 'pincode', 'skills', 
                 'custom_fields', 'gender_preference', 'requires_resume_url', 'created_at', 
                 'updated_at', 'user', 'status', 'applicants_count', 'is_remote']
    
    def get_applicants_count(self, obj):
        return obj.calculated_applicants_count

class JobApplicationSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    job = JobSerializer(read_only=True)
    id_card = IDCardSerializer(read_only=True)
    resume = ResumeFileSerializer(read_only=True)
    
    class Meta:
        model = JobApplication
        fields = ['id', 'job', 'user', 'applied_date', 'status', 'cover_letter', 
                  'id_card', 'resume', 'resume_url', 'custom_field_answers']
        read_only_fields = ['user', 'applied_date']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)

class SetUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, max_length=150)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken")
        if not value or not value.strip():
             raise serializers.ValidationError("Username cannot be empty")
        return value

class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, max_length=30, allow_blank=True)
    last_name = serializers.CharField(required=False, max_length=30, allow_blank=True)
    username = serializers.CharField(required=False, max_length=150)
    bio = serializers.CharField(required=False, max_length=500, allow_blank=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    profile_picture = serializers.CharField(required=False, allow_blank=True)  # Now accepts Cloudinary URLs
    subscription_plan = serializers.ChoiceField(choices=[
        ('free', 'Free'),
        ('seeker_29', 'Seeker 29'),
        ('recruiter_99', 'Recruiter 99'),
    ], required=False)
    
    def validate_profile_picture(self, value):
        """Validate profile picture by downloading and moderating it"""
        user = self.context['request'].user
        current_pic = None
        if hasattr(user, 'profile') and user.profile.profile_picture:
            current_pic = str(user.profile.profile_picture)
            
        # Only validate if URL has changed and is not empty
        if value and value != current_pic:
            from core.utils.moderation import download_and_moderate_image_url
            import cloudinary.uploader
            
            is_safe, reason = download_and_moderate_image_url(value)
            if not is_safe:
                # Clean up this new invalid upload from Cloudinary so it doesn't stay in storage
                try:
                    public_id = None
                    if 'cloudinary.com' in value and '/upload/' in value:
                        parts = value.split('/upload/')
                        if len(parts) > 1:
                            path_part = parts[1]
                            if path_part.startswith('v') and '/' in path_part:
                                public_id = '/'.join(path_part.split('/')[1:])
                            else:
                                public_id = path_part
                            if '.' in public_id:
                                public_id = public_id.rsplit('.', 1)[0]
                    
                    if public_id:
                        cloudinary.uploader.destroy(public_id, resource_type='image')
                        print(f"[MODERATION] Destroyed unsafe profile picture from Cloudinary: {public_id}")
                except Exception as e:
                    print(f"Error destroying unsafe profile picture: {e}")
                
                raise serializers.ValidationError("Profile picture contains inappropriate or vulgar content.")
        return value

    def validate_username(self, value):
        """Check username availability and change restrictions"""
        user = self.context['request'].user
        current_username = user.username
        
        # If username hasn't changed, allow it
        if value == current_username:
            return value
        
        # Check if username is available
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken")
        
        # Check username change restrictions
        if hasattr(user, 'profile'):
            if not user.profile.can_change_username():
                days_left = user.profile.days_until_username_change()
                raise serializers.ValidationError(f"You can change your username in {days_left} days")
        
        return value
    
    def update(self, instance, validated_data):
        """Update user and profile data"""
        user = instance
        
        # Update user fields
        if 'first_name' in validated_data:
            user.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            user.last_name = validated_data['last_name']
        if 'username' in validated_data:
            user.username = validated_data['username']
        
        user.save()
        
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # Update profile fields
        if 'subscription_plan' in validated_data:
            profile.subscription_plan = validated_data['subscription_plan']
        if 'bio' in validated_data:
            profile.bio = validated_data['bio']
        if 'skills' in validated_data:
            profile.skills = validated_data['skills']
        if 'profile_picture' in validated_data:
            # Store old profile picture for cleanup
            old_profile_picture = profile.profile_picture
            new_profile_picture = validated_data['profile_picture']
            
            print(f"DEBUG: Old profile picture: {old_profile_picture}")
            print(f"DEBUG: New profile picture: '{new_profile_picture}'")
            print(f"DEBUG: Old profile picture exists: {bool(old_profile_picture)}")
            print(f"DEBUG: New profile picture is empty/falsy: {not new_profile_picture}")
            
            # Delete old picture from Cloudinary if:
            # 1. Old picture exists, AND
            # 2. Either new picture is different OR new picture is empty/blank (removal)
            should_delete_old = (
                old_profile_picture and 
                (not new_profile_picture or str(old_profile_picture) != str(new_profile_picture))
            )
            
            print(f"DEBUG: Should delete old: {should_delete_old}")
            
            if should_delete_old:
                try:
                    import cloudinary.uploader
                    old_url = str(old_profile_picture)
                    old_public_id = None
                    
                    # Always extract public_id from URL since profile_picture is stored as a string URL
                    # URL format: https://res.cloudinary.com/CLOUD_NAME/image/upload/vXXXX/PUBLIC_ID
                    if 'cloudinary.com' in old_url and '/upload/' in old_url:
                        # Extract everything after /upload/vXXXXXXXXXX/
                        parts = old_url.split('/upload/')
                        if len(parts) > 1:
                            # Remove version prefix (vXXXXXXXXXX/) if present
                            path_part = parts[1]
                            if path_part.startswith('v') and '/' in path_part:
                                # Skip the version number
                                old_public_id = '/'.join(path_part.split('/')[1:])
                            else:
                                old_public_id = path_part
                            # Remove file extension if present
                            if '.' in old_public_id:
                                old_public_id = old_public_id.rsplit('.', 1)[0]
                    
                    print(f"DEBUG: Extracted public_id: {old_public_id}")
                    
                    if old_public_id:
                        result = cloudinary.uploader.destroy(old_public_id, resource_type='image')
                        print(f"Deleted old profile picture {old_public_id}: {result}")
                    else:
                        print(f"DEBUG: No public_id found to delete from URL: {old_url}")
                except Exception as e:
                    print(f"Error deleting old profile picture: {e}")
                    import traceback
                    traceback.print_exc()
            
            profile.profile_picture = new_profile_picture if new_profile_picture else ''
        
        # Update username change timestamp if username was changed
        if 'username' in validated_data and validated_data['username'] != instance.username:
            profile.update_username_change_timestamp()
        
        profile.save()
        
        return user

class IDCardCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IDCard
        fields = ['photo', 'name', 'gender', 'date_of_birth', 'nationality', 'address', 'phone_number', 'skills', 'is_primary']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Ensure only one primary ID card per user
        if validated_data.get('is_primary', False):
            IDCard.objects.filter(user=instance.user, is_primary=True).update(is_primary=False)
        return super().update(instance, validated_data)

class ResumeFileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeFile
        fields = ['id', 'file_name', 'file_url', 'file_size', 'is_default']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Ensure only one default resume per user
        if validated_data.get('is_default', False):
            ResumeFile.objects.filter(user=instance.user, is_default=True).update(is_default=False)
        return super().update(instance, validated_data)



class HireRequestSerializer(serializers.ModelSerializer):
    """Serializer for HireRequest model"""
    requester = BasicUserSerializer(read_only=True)
    job = JobSerializer(read_only=True)
    
    class Meta:
        model = HireRequest
        fields = ['id', 'job', 'requester', 'seeker', 'status', 'message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set the requester to the current user
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)

class HireRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HireRequest - only requires job_id and optional message"""
    job_id = serializers.IntegerField(write_only=True)
    message = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = HireRequest
        fields = ['job_id', 'message']
    
    def validate_job_id(self, value):
        try:
            job = Job.objects.get(id=value)
            if job.post_type != 'looking':
                raise serializers.ValidationError("Can only send hire requests to job seeking posts")
            if job.user == self.context['request'].user:
                raise serializers.ValidationError("Cannot send hire request to your own post")
            return value
        except Job.DoesNotExist:
            raise serializers.ValidationError("Job not found")
    
    def create(self, validated_data):
        job_id = validated_data.pop('job_id')
        job = Job.objects.get(id=job_id)
        
        # Create the hire request
        hire_request = HireRequest.objects.create(
            job=job,
            requester=self.context['request'].user,
            seeker=job.user,
            message=validated_data.get('message', '')
        )
        return hire_request


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for Follow model"""
    follower = serializers.ReadOnlyField(source='follower.username')
    following = serializers.ReadOnlyField(source='following.username')
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        # Set the follower to the current user
        validated_data['follower'] = self.context['request'].user
        return super().create(validated_data)


class BlockSerializer(serializers.ModelSerializer):
    """Serializer for Block model"""
    blocker = serializers.ReadOnlyField(source='blocker.username')
    blocked = serializers.ReadOnlyField(source='blocked.username')
    
    class Meta:
        model = Block
        fields = ['id', 'blocker', 'blocked', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        # Set the blocker to the current user
        validated_data['blocker'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    sender = BasicUserSerializer(read_only=True)
    recipient = BasicUserSerializer(read_only=True)
    related_job = JobSerializer(read_only=True)
    related_application = JobApplicationSerializer(read_only=True)
    related_hire_request = HireRequestSerializer(read_only=True)
    time_ago = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'recipient', 'notification_type', 'title', 'message',
            'related_job', 'related_application', 'related_hire_request',
            'read', 'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'time_ago']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    sender = BasicUserSerializer(read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 'is_read', 'read_at',
            'created_at', 'updated_at', 'message_type', 'attachment_url', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'time_ago']
    
    def get_time_ago(self, obj):
        return obj.time_ago()


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation model"""
    participants = BasicUserSerializer(many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = MessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'other_participant', 'last_message', 
            'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_other_participant(self, obj):
        """Get the other participant for the current user"""
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_participant(request.user)
            return BasicUserSerializer(other).data if other else None
        return None
    
    def get_unread_count(self, obj):
        """Get unread count for the current user"""
        request = self.context.get('request')
        if request and request.user:
            return obj.get_unread_count(request.user)
        return 0


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages"""
    recipient_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Message
        fields = ['content', 'recipient_id', 'message_type', 'attachment_url']
    
    def create(self, validated_data):
        # Remove recipient_id as it's handled in the view
        validated_data.pop('recipient_id', None)
        
        # IMPORTANT: conversation and sender are passed from view's perform_create
        # via serializer.save(conversation=..., sender=...)
        # They are already in validated_data at this point
        
        print(f"[NOTE] Creating message with data: {validated_data}")
        
        message = Message.objects.create(**validated_data)
        
        print(f"[OK] Message created successfully: {message.id}")
        print(f"[PHONE] Conversation: {message.conversation.id if message.conversation else 'None'}")
        print(f"[USER] Sender: {message.sender.username if message.sender else 'None'}")
        print(f"[CHAT] Content: {message.content[:50]}...")
        
        return message

