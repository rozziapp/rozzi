from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Job, JobApplication, OTP, UserProfile, IDCard, ResumeFile, HireRequest, Follow, Block, Notification, Conversation, Message
from django.utils import timezone
from datetime import timedelta

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'skills', 'profile_picture', 'last_username_change', 'days_until_username_change']
        read_only_fields = ['last_username_change', 'days_until_username_change']
    
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
        
        # Handle Cloudinary fields - convert to string URLs
        if instance.file_url:
            data['file_url'] = str(instance.file_url)
        
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
                 'state', 'city', 'address', 'pincode', 'custom_fields',
                 'status', 'user', 'created_at', 'updated_at', 'applicants_count']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_applicants_count(self, obj):
        return obj.calculated_applicants_count
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class JobListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    applicants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = ['id', 'title', 'description', 'salary_min', 'salary_max', 'location', 
                 'post_type', 'job_type', 'sector', 'experience_level', 'deadline', 
                 'shift_timing', 'state', 'city', 'address', 'pincode', 'skills', 
                 'custom_fields', 'created_at', 'updated_at', 'user', 'status', 
                 'applicants_count', 'is_remote']
    
    def get_applicants_count(self, obj):
        return obj.calculated_applicants_count

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

class JobApplicationSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    job = JobSerializer(read_only=True)
    id_card = IDCardSerializer(read_only=True)
    resume = ResumeFileSerializer(read_only=True)
    
    class Meta:
        model = JobApplication
        fields = '__all__'
        read_only_fields = ['user', 'applied_date']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, max_length=30, allow_blank=True)
    last_name = serializers.CharField(required=False, max_length=30, allow_blank=True)
    username = serializers.CharField(required=False, max_length=150)
    bio = serializers.CharField(required=False, max_length=500, allow_blank=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    profile_picture = serializers.CharField(required=False, allow_blank=True)  # Now accepts Cloudinary URLs
    
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
        if 'bio' in validated_data:
            profile.bio = validated_data['bio']
        if 'skills' in validated_data:
            profile.skills = validated_data['skills']
        if 'profile_picture' in validated_data:
            # Store old profile picture for cleanup
            old_profile_picture = profile.profile_picture
            profile.profile_picture = validated_data['profile_picture']
            
            # TODO: Implement cleanup of old profile picture after some time
            # This could be done with a background task or scheduled job
        
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

class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTP
        fields = ['email', 'phone', 'otp_code']
        read_only_fields = ['otp_code', 'created_at', 'expires_at']
    
    def create(self, validated_data):
        # Generate OTP
        otp_code = OTP.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=10)  # OTP expires in 10 minutes
        
        # Create OTP object
        otp = OTP.objects.create(
            user=self.context['request'].user if self.context['request'].user.is_authenticated else None,
            email=validated_data.get('email'),
            phone=validated_data.get('phone'),
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        return otp

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)
    otp_code = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, attrs):
        email = attrs.get('email')
        phone = attrs.get('phone')
        otp_code = attrs.get('otp_code')
        
        if not email and not phone:
            raise serializers.ValidationError("Either email or phone is required")
        
        # Find the OTP
        if email:
            otp = OTP.objects.filter(email=email, otp_code=otp_code, is_verified=False).first()
        else:
            otp = OTP.objects.filter(phone=phone, otp_code=otp_code, is_verified=False).first()
        
        if not otp:
            raise serializers.ValidationError("Invalid OTP")
        
        if otp.is_expired():
            raise serializers.ValidationError("OTP has expired")
        
        # Mark OTP as verified
        otp.is_verified = True
        otp.save()
        
        return attrs

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
        
        # The conversation and sender are set in the view's perform_create method
        message = Message.objects.create(**validated_data)
        
        print(f"📝 Message created in serializer: {message.id}")
        print(f"📱 Conversation: {message.conversation.id}")
        print(f"👤 Sender: {message.sender.username}")
        print(f"💬 Content: {message.content[:50]}...")
        
        return message
