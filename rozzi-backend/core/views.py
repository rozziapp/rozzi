from django.shortcuts import render
from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Job, JobApplication, UserProfile, IDCard, ResumeFile, Follow, Notification, Block, HireRequest, Conversation, Message, DeviceToken

def get_user_by_id_or_username(user_id):
    """Helper to retrieve a user object by ID or username"""
    if str(user_id).isdigit():
        return User.objects.get(id=user_id)
    else:
        return User.objects.get(username=user_id)

def get_word_stem(word):
    """Helper to stem a single word by stripping common suffixes (e.g. driving/driver -> driv)"""
    import re
    word = word.lower().strip()
    word = re.sub(r'[^\w]', '', word)
    if len(word) <= 3:
        return word
    
    suffixes = [
        ('ibilities', 'ibil'), ('ibility', 'ibil'), ('position', 'pos'), 
        ('sharing', 'share'), ('driving', 'driv'), ('driver', 'driv'),
        ('logical', 'logi'), ('tional', 'tion'), ('fully', 'ful'),
        ('ment', ''), ('ness', ''), ('tive', ''), ('tional', 'tion'),
        ('ation', 'ate'), ('izer', 'ize'), ('ator', 'ate'),
        ('ying', 'y'), ('ies', 'i'), ('ing', ''), ('eed', 'ee'),
        ('ery', ''), ('ed', ''), ('ly', ''), ('es', ''), ('er', ''), 
        ('or', ''), ('ry', ''), ('y', ''), ('s', '')
    ]
    
    for suffix, replacement in suffixes:
        if word.endswith(suffix):
            stem = word[:-len(suffix)] + replacement
            if len(stem) >= 3:
                return stem
            break
            
    return word

def get_text_stems(text):
    """Helper to extract unique stemmed words from a block of text"""
    import re
    if not text:
        return set()
    words = re.findall(r'\b\w+\b', text.lower())
    return {get_word_stem(w) for w in words if len(w) > 1}

from .serializers import (
    JobSerializer, 
    JobListSerializer,
    JobApplicationSerializer, 
    UserProfileSerializer, 
    IDCardSerializer, 
    ResumeFileSerializer, 
    ResumeFileCreateSerializer,
    UserSerializer, 
    UpdateProfileSerializer,
    IDCardCreateUpdateSerializer,
    FollowSerializer, 
    NotificationSerializer,
    BasicUserSerializer, 
    BlockSerializer, 
    HireRequestCreateSerializer,
    HireRequestSerializer,
    MessageSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    GoogleAuthSerializer,
    SetUsernameSerializer
)
from django.utils import timezone
from datetime import timedelta
import cloudinary
import cloudinary.uploader
import base64
import tempfile
import os
from django.http import Http404
from django.conf import settings
from core.utils.moderation import moderate_image

# Configure Cloudinary
cloudinary.config(
    cloud_name='dnr1qtmyf',
    api_key='571633454864952',
    api_secret='rJ4MBW5XahGzXshlhvaYTSRJVEw',
    secure=True
)

# Authentication Views
# Authentication Views
class GoogleAuthView(APIView):
    """
    Handle Google Login/Signup
    """
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        
        try:
            # Mock Token Support for Testing (Only in Debug mode)
            if settings.DEBUG and token.startswith('mock_token_'):
                # Enhanced mock token system for development:
                # - mock_token_new_{timestamp} -> Creates new user with random email
                # - mock_token_existing_{timestamp} -> Login as test@example.com
                # - mock_token_user_{id} -> Login as specific user by ID
                
                given_name = "MockUser"
                picture = ""
                
                # Check for user ID login: mock_token_user_{id}
                if "_user_" in token:
                    try:
                        user_id = token.split("_user_")[1].split("_")[0]
                        existing_user = User.objects.get(pk=int(user_id))
                        # Found user by ID - return tokens directly
                        refresh = RefreshToken.for_user(existing_user)
                        return Response({
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                            'user': UserSerializer(existing_user).data
                        })
                    except (User.DoesNotExist, ValueError, IndexError):
                        return Response({'error': 'User not found with that ID'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if this simulates an existing user
                if "existing" in token:
                    mock_email = "test@example.com"  # Fixed email for existing user test
                    google_id = "mock_google_id_existing"
                else:
                    # New user - use random email
                    import random
                    mock_email = f"mockuser{random.randint(1000, 9999)}@gmail.com"
                    parts = token.split('_')
                    google_id = parts[-1] if len(parts) > 3 else (parts[2] if len(parts) > 2 else f"mock_google_id_{random.randint(10000, 99999)}")
                
                email = mock_email
            else:
                # Verify token
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
                
                # You might need to specify your Google Client ID here if you want to verify audience
                # id_info = id_token.verify_oauth2_token(token, google_requests.Request(), "YOUR_CLIENT_ID")
                id_info = id_token.verify_oauth2_token(token, google_requests.Request())
                
                # Verify audience (to prevent token audience substitution vulnerability)
                aud = id_info.get('aud')
                allowed_audiences = getattr(settings, 'GOOGLE_CLIENT_IDS', [])
                if not allowed_audiences:
                    allowed_audiences = [
                        '370990896857-t1gnvm3c4n2apfu4ugpr9ccpoae580qd.apps.googleusercontent.com', # Web
                        '370990896857-1mlsie4r8s30jc8753u5tbdcath60pkv.apps.googleusercontent.com', # Android
                    ]
                if aud not in allowed_audiences:
                    raise ValueError(f"Audience verification failed: {aud} is not in allowed client IDs.")
                
                email = id_info.get('email')
                google_id = id_info['sub']
                given_name = id_info.get('given_name', '')
                picture = id_info.get('picture', '')
            
            # Check for existing user
            user = None
            try:
                # Try by google_id
                profile = UserProfile.objects.get(google_id=google_id)
                user = profile.user
            except UserProfile.DoesNotExist:
                # Try by email
                if email:
                    user = User.objects.filter(email=email).first()
                    if user:
                        # Link google_id
                        profile, created = UserProfile.objects.get_or_create(user=user)
                        profile.google_id = google_id
                        profile.google_email = email
                        profile.save()
            
            if user:
                # Existing user -> Login
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
            else:
                # New user -> Create
                # Generate unique username using Google account details (email or given_name)
                import re
                import random
                
                base_username = ""
                if email:
                    base_username = email.split('@')[0]
                elif given_name:
                    base_username = given_name
                
                if not base_username:
                    base_username = "user"
                
                # Sanitize to alphanumeric and underscores, lowercase
                base_username = re.sub(r'[^a-zA-Z0-9_]', '_', base_username).lower()
                base_username = base_username[:20]
                
                username = base_username
                while User.objects.filter(username=username).exists():
                    suffix = f"_{random.randint(1000, 9999)}"
                    username = f"{base_username[:15]}{suffix}"
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=given_name
                )
                user.set_unusable_password()
                user.save()
                
                # Setup profile
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.google_id = google_id
                profile.google_email = email
                # We could save picture to profile here if we download it, or just store URL if supported
                # For now we'll skip complex image downloading to keep it simple and robust
                profile.save()
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
                
        except ValueError as e:
            return Response({'error': f'Invalid token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and update current user profile
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UpdateProfileSerializer

    def get_object(self):
        user = self.request.user
        try:
            from payments.services import check_and_sync_subscription
            check_and_sync_subscription(user)
        except Exception as e:
            print(f"Error auto-syncing subscription: {e}")
        return user

class SetUsernameView(APIView):
    """
    Set username for new Google users
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        serializer = SetUsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        
        user = request.user
        user.username = username
        try:
            user.save()
        except Exception as e:
             return Response({'error': 'Username taken or invalid'}, status=status.HTTP_400_BAD_REQUEST)
             
        # Return tokens and profile
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })


# ID Card Views
class IDCardListView(generics.ListCreateAPIView):
    """
    List and create ID cards for current user
    """
    serializer_class = IDCardCreateUpdateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_queryset(self):
        return IDCard.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return IDCardSerializer
        return IDCardCreateUpdateSerializer

class IDCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an ID card
    """
    serializer_class = IDCardCreateUpdateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_queryset(self):
        return IDCard.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return IDCardSerializer
        return IDCardCreateUpdateSerializer

class PhotoUploadView(APIView):
    """
    Upload photo for ID card to Cloudinary
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        try:
            # Get the photo data from request
            photo_data = request.data.get('photo')
            if not photo_data:
                return Response(
                    {'error': 'No photo data provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Handle base64 encoded image data
            if isinstance(photo_data, str) and photo_data.startswith('data:image'):
                # Extract base64 data
                header, encoded = photo_data.split(",", 1)
                image_data = base64.b64decode(encoded)
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                    temp_file.write(image_data)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to Cloudinary
                    result = cloudinary.uploader.upload(
                        temp_file_path,
                        folder='rozzi/id_cards',
                        public_id=f"id_card_{request.user.id}_{int(timezone.now().timestamp())}",
                        overwrite=True
                    )
                    
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
                    return Response({
                        'photo_url': result['secure_url'],
                        'public_id': result['public_id']
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    # Clean up temporary file on error
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                    raise e
            
            # Handle file upload
            elif hasattr(photo_data, 'read'):
                # Upload file directly to Cloudinary
                result = cloudinary.uploader.upload(
                    photo_data,
                    folder='rozzi/id_cards',
                    public_id=f"id_card_{request.user.id}_{int(timezone.now().timestamp())}",
                    overwrite=True
                )
                
                return Response({
                    'photo_url': result['secure_url'],
                    'public_id': result['public_id']
                }, status=status.HTTP_200_OK)
            
            else:
                return Response(
                    {'error': 'Invalid photo data format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to upload photo: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProfilePhotoUploadView(APIView):
    """
    Upload profile photo to Cloudinary with automatic cleanup of old photos
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def extract_public_id_from_url(self, url):
        """Extract public_id from Cloudinary URL"""
        if not url or 'cloudinary.com' not in url:
            return None
        
        try:
            # Split by '/' and find the part after upload
            parts = url.split('/')
            upload_index = -1
            for i, part in enumerate(parts):
                if part == 'upload':
                    upload_index = i
                    break
            
            if upload_index == -1:
                return None
            
            # Get everything after upload, excluding version and file extension
            path_parts = parts[upload_index + 1:]
            
            # Skip version if present (starts with 'v' followed by numbers)
            if path_parts and path_parts[0].startswith('v') and path_parts[0][1:].isdigit():
                path_parts = path_parts[1:]
            
            # Join the remaining parts and remove file extension
            if path_parts:
                public_id = '/'.join(path_parts)
                # Remove file extension
                if '.' in public_id:
                    public_id = public_id.rsplit('.', 1)[0]
                return public_id
                
        except Exception as e:
            print(f"Error extracting public_id from URL {url}: {e}")
        
        return None
    
    def cleanup_old_profile_photo(self, user_profile, old_photo_url):
        """Clean up old profile photo from Cloudinary"""
        if not old_photo_url or not old_photo_url.strip():
            return
        
        try:
            old_public_id = self.extract_public_id_from_url(old_photo_url)
            if old_public_id:
                # Delete from Cloudinary
                result = cloudinary.uploader.destroy(old_public_id, resource_type='image')
                if result.get('result') == 'ok':
                    print(f"Successfully deleted old profile photo: {old_public_id}")
                else:
                    print(f"Failed to delete old profile photo: {old_public_id}, result: {result}")
            else:
                print(f"Could not extract public_id from URL: {old_photo_url}")
        except Exception as e:
            print(f"Error cleaning up old profile photo: {e}")
    
    def post(self, request):
        try:
            # Get the photo data from request
            photo_data = request.data.get('photo')
            
            if not photo_data:
                return Response(
                    {'error': 'No photo data provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get user's current profile photo for cleanup
            user_profile, created = UserProfile.objects.get_or_create(user=request.user)
            old_photo_url = str(user_profile.profile_picture) if user_profile.profile_picture else None
            
            # Handle base64 encoded photo data
            if isinstance(photo_data, str) and photo_data.startswith('data:image/'):
                # Extract base64 data
                header, encoded = photo_data.split(",", 1)
                image_data = base64.b64decode(encoded)
                
                # Moderate the image locally before upload
                is_safe, reason = moderate_image(image_data)
                if not is_safe:
                    return Response(
                        {'error': f'Profile picture rejected: {reason}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                    temp_file.write(image_data)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to Cloudinary
                    result = cloudinary.uploader.upload(
                        temp_file_path,
                        folder='rozzi/profiles',
                        public_id=f"profile_{request.user.id}_{int(timezone.now().timestamp())}",
                        overwrite=True,
                        transformation=[
                            {'width': 400, 'height': 400, 'crop': 'fill'},
                            {'quality': 'auto:good'}
                        ]
                    )
                    
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
                    # Clean up old profile photo after successful upload
                    if old_photo_url and old_photo_url != result['secure_url']:
                        self.cleanup_old_profile_photo(user_profile, old_photo_url)
                    
                    return Response({
                        'photo_url': result['secure_url'],
                        'public_id': result['public_id']
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    # Clean up temporary file on error
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                    raise e
            
            # Handle file upload
            elif hasattr(photo_data, 'read'):
                # Read bytes and reset pointer to moderate first
                image_data = photo_data.read()
                photo_data.seek(0)
                
                is_safe, reason = moderate_image(image_data)
                if not is_safe:
                    return Response(
                        {'error': f'Profile picture rejected: {reason}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Upload file directly to Cloudinary
                result = cloudinary.uploader.upload(
                    photo_data,
                    folder='rozzi/profiles',
                    public_id=f"profile_{request.user.id}_{int(timezone.now().timestamp())}",
                    overwrite=True,
                    transformation=[
                        {'width': 400, 'height': 400, 'crop': 'fill'},
                        {'quality': 'auto:good'}
                    ]
                )
                
                # Clean up old profile photo after successful upload
                if old_photo_url and old_photo_url != result['secure_url']:
                    self.cleanup_old_profile_photo(user_profile, old_photo_url)
                
                return Response({
                    'photo_url': result['secure_url'],
                    'public_id': result['public_id']
                }, status=status.HTTP_200_OK)
            
            else:
                return Response(
                    {'error': 'Invalid photo data format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to upload profile photo: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ResumeUploadView(APIView):
    """
    Upload resume file to Cloudinary
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        try:
            # Get the file data from request
            file_data = request.data.get('file')
            file_name = request.data.get('file_name', 'Resume.pdf')
            
            if not file_data:
                return Response(
                    {'error': 'No file data provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Handle base64 encoded file data
            if isinstance(file_data, str) and file_data.startswith('data:application/pdf'):
                # Extract base64 data
                header, encoded = file_data.split(",", 1)
                pdf_data = base64.b64decode(encoded)
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                    temp_file.write(pdf_data)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to Cloudinary with public access
                    result = cloudinary.uploader.upload(
                        temp_file_path,
                        folder='rozzi/resumes',
                        public_id=f"resume_{request.user.id}_{int(timezone.now().timestamp())}.pdf",
                        resource_type='raw',  # Important for PDF files
                        overwrite=True,
                        access_mode='public',  # Allow public access for downloads
                        type='upload'  # Ensure standard upload type for public access
                    )
                    
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
                    return Response({
                        'file_url': result['secure_url'],
                        'public_id': result['public_id'],
                        'file_name': file_name
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    # Clean up temporary file on error
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                    raise e
            
            # Handle file upload
            elif hasattr(file_data, 'read'):
                # Upload file directly to Cloudinary with public access
                result = cloudinary.uploader.upload(
                    file_data,
                    folder='rozzi/resumes',
                    public_id=f"resume_{request.user.id}_{int(timezone.now().timestamp())}.pdf",
                    resource_type='raw',  # Important for PDF files
                    overwrite=True,
                    access_mode='public',  # Allow public access for downloads
                    type='upload'  # Ensure standard upload type for public access
                )
                
                return Response({
                    'file_url': result['secure_url'],
                    'public_id': result['public_id'],
                    'file_name': file_name
                }, status=status.HTTP_200_OK)
            
            else:
                return Response(
                    {'error': 'Invalid file data format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to upload resume file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetResumeSignedUrlView(APIView):
    """
    Generate a signed URL for secure resume file download
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        try:
            file_url = request.data.get('file_url')
            
            if not file_url:
                return Response(
                    {'error': 'No file URL provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract public_id from Cloudinary URL
            # URL format: https://res.cloudinary.com/CLOUD_NAME/raw/upload/vXXXX/PUBLIC_ID
            if 'cloudinary.com' not in file_url:
                return Response(
                    {'error': 'Not a Cloudinary URL'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract public_id from the URL
            version = None
            if '/raw/upload/' in file_url:
                # Strip query parameters if present
                file_url_base = file_url.split('?')[0]
                
                parts = file_url_base.split('/raw/upload/')
                if len(parts) > 1:
                    path_part = parts[1]
                    # Check for version prefix
                    if path_part.startswith('v') and '/' in path_part:
                        # Extract version and rest of path
                        version_part = path_part.split('/')[0] 
                        version = version_part[1:] # Remove 'v'
                        public_id = '/'.join(path_part.split('/')[1:])
                    else:
                        public_id = path_part
                    
                    # Ensure public_id ends with .pdf for raw resume files
                    if not public_id.lower().endswith('.pdf'):
                        public_id += '.pdf'
                else:
                    return Response({'error': 'Invalid URL format'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'error': 'Not a raw file URL'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate signed URL using Cloudinary utils
            import cloudinary.utils
            import time
            
            # Generate a signed URL that expires in 1 hour
            timestamp = int(time.time())
            
            # Create options dictionary
            options = {
                'resource_type': 'raw',
                'type': 'upload',
                'sign_url': True, 
                'secure': True
            }
            
            # Add version if we extracted one
            if version:
                options['version'] = version
            
            signed_url = cloudinary.utils.cloudinary_url(
                public_id,
                **options
            )[0]
            
            return Response({
                'signed_url': signed_url,
                'expires_in': 3600
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate signed URL: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Resume File Views
class ResumeFileListView(generics.ListCreateAPIView):
    """
    List and create resume files for current user
    """
    serializer_class = ResumeFileCreateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_queryset(self):
        return ResumeFile.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ResumeFileSerializer
        return ResumeFileCreateSerializer

class ResumeFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a resume file
    """
    serializer_class = ResumeFileCreateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_queryset(self):
        return ResumeFile.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ResumeFileSerializer
        return ResumeFileCreateSerializer

# OTP Views


# Job Views
class JobListCreateView(generics.ListCreateAPIView):
    """
    List all jobs or create a new job
    """
    queryset = Job.objects.filter(status='Open').order_by('-created_at')
    serializer_class = JobListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        """Automatically set the user when creating a job, after validating plan limits"""
        user = self.request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        post_type = serializer.validated_data.get('post_type', 'hire')
        
        if post_type == 'hire':
            if profile.remaining_hire_posts <= 0:
                raise serializers.ValidationError({"detail": "You have reached your limit of active job posts for your current plan. Please upgrade or close/delete an active job post."})
        elif post_type == 'looking':
            if profile.remaining_looking_posts <= 0:
                raise serializers.ValidationError({"detail": "You have reached your limit of active job seeking posts for your current plan. Please upgrade or delete an active seeking post."})
                
        serializer.save(user=user)
    
    def get_queryset(self):
        queryset = Job.objects.filter(status='Open').select_related('user', 'user__profile').order_by('-created_at')
        
        # Filter by job type
        job_type = self.request.query_params.get('job_type', None)
        if job_type and job_type != 'All':
            queryset = queryset.filter(job_type=job_type)
        
        # Filter by search query (Smart stem-based search in Python to prevent hiding partial matches)
        search = self.request.query_params.get('search', None)
        is_authenticated = self.request.user.is_authenticated
        
        # If no search and user not authenticated, return queryset directly for DB optimization
        if not search and not is_authenticated:
            return queryset
            
        # Limit candidate pool to latest 1000 jobs to prevent memory overload & slow responses at scale
        queryset = queryset[:1000]
            
        # Otherwise, load to list to perform Python-based smart search & ranking
        jobs = list(queryset)
        search_scores = {}
        
        if search:
            search_lower = search.lower().strip()
            search_words = [w for w in search_lower.split() if len(w) > 1]
            search_stems = get_text_stems(search_lower)
            
            filtered_jobs = []
            for job in jobs:
                title_lower = (job.title or "").lower()
                desc_lower = (job.description or "").lower()
                loc_lower = (job.location or "").lower()
                
                search_score = 0
                
                # 1. Exact substring match of entire search query
                if (search_lower in title_lower) or (search_lower in desc_lower) or (search_lower in loc_lower):
                    search_score += 100
                    if search_lower in title_lower:
                        search_score += 50
                
                # 2. Individual word matches
                for word in search_words:
                    if (word in title_lower) or (word in desc_lower) or (word in loc_lower):
                        if word in title_lower:
                            search_score += 20
                        else:
                            search_score += 10
                
                # 3. Stem matching (ensures driving matches driver/needs a driver etc.)
                title_stems = get_text_stems(title_lower)
                desc_stems = get_text_stems(desc_lower)
                loc_stems = get_text_stems(loc_lower)
                job_skills_stems = set()
                for js in (job.skills or []):
                    job_skills_stems.update(get_text_stems(js))
                
                all_job_stems = title_stems.union(desc_stems).union(loc_stems).union(job_skills_stems)
                stem_matches = len(search_stems.intersection(all_job_stems)) if search_stems else 0
                search_score += (stem_matches * 5)
                
                # Keep job if search query matched at least partially
                if search_score > 0:
                    filtered_jobs.append(job)
                    search_scores[job.id] = search_score
            
            jobs = filtered_jobs
            
        if not is_authenticated:
            # For unauthenticated users, sort by search relevancy if searching
            if search:
                jobs.sort(key=lambda x: (search_scores.get(x.id, 0), x.created_at), reverse=True)
            return jobs
            
        # ---------------------------------------------------------
        # Recommendation Algorithm (Weighted Scoring)
        # ---------------------------------------------------------
        user = self.request.user
        
        # 1. Gather User Signals
        user_skills = set()
        user_location = ""
        user_bio = ""
        import re
        user_pincode = ""
        
        try:
            # Profile Skills & Bio
            if hasattr(user, 'profile'):
                profile = user.profile
                if profile.skills:
                    user_skills.update([s.lower() for s in profile.skills])
                if profile.bio:
                    user_bio = profile.bio.lower()
            
            # ID Card Skills & Location (Primary source for location)
            id_card = IDCard.objects.filter(user=user, is_primary=True).first()
            if not id_card:
                id_card = IDCard.objects.filter(user=user).first()
            
            if id_card:
                if id_card.skills:
                    user_skills.update([s.lower() for s in id_card.skills])
                if id_card.address:
                    user_location = id_card.address.lower()
                    # Extract 6-digit Indian PIN code from address
                    pincode_match = re.search(r'\b\d{6}\b', user_location)
                    if pincode_match:
                        user_pincode = pincode_match.group(0)
        except Exception as e:
            print(f"Error gathering user signals for recommendation: {e}")

        # Compute user skill stems
        user_skill_stems = set()
        for s in user_skills:
            user_skill_stems.update(get_text_stems(s))

        # 2. Calculate Scores
        scored_jobs = []
        now = timezone.now()
        
        for job in jobs:
            score = 0
            
            # -- Skill Match (Weight: 10 per match, 5 per partial/stem match) --
            job_skills = [s.lower() for s in (job.skills or [])]
            matching_skills = 0
            matched_job_skills = set()
            
            # 1. Exact Match
            for skill in job_skills:
                if skill in user_skills:
                    matching_skills += 1
                    matched_job_skills.add(skill)
                    
            # 2. Substring Match
            for skill in job_skills:
                if skill in matched_job_skills:
                    continue
                if any(skill in s or s in skill for s in user_skills):
                    matching_skills += 0.5
                    matched_job_skills.add(skill)
                    
            # 3. Stem Match
            for skill in job_skills:
                if skill in matched_job_skills:
                    continue
                js_stems = get_text_stems(skill)
                if js_stems and js_stems.intersection(user_skill_stems):
                    matching_skills += 0.5
                    matched_job_skills.add(skill)
            
            score += (matching_skills * 10)
            
            # -- Skill Coverage Bonus (Weight: up to 30) --
            if job_skills:
                coverage = matching_skills / len(job_skills)
                if coverage == 1.0:
                    score += 30
                elif coverage >= 0.5:
                    score += 15
            
            # -- Stem Matching in Title & Description (Weight: 15 for title, 5 for description) --
            job_title_stems = get_text_stems(job.title)
            job_desc_stems = get_text_stems(job.description)
            
            title_stem_matches = len(user_skill_stems.intersection(job_title_stems)) if user_skill_stems else 0
            desc_stem_matches = len(user_skill_stems.intersection(job_desc_stems)) if user_skill_stems else 0
            
            score += (title_stem_matches * 15)
            score += (desc_stem_matches * 5)
            
            # -- Hyper-local Pincode Match (Weight: 50) --
            if user_pincode and job.pincode:
                if user_pincode == job.pincode:
                    score += 50
            
            # -- Location/City Match (Weight: 20) --
            job_loc = (job.location or "").lower()
            job_city = (job.city or "").lower()
            job_state = (job.state or "").lower()
            
            if user_location and (job_loc or job_city or job_state):
                if (user_location in job_loc) or (job_loc in user_location) or \
                   (user_location in job_city) or (job_city in user_location):
                    score += 20
            
            # Detailed City / State Checks
            if user_location:
                if job_city and job_city in user_location:
                    score += 20
                elif job_state and job_state in user_location:
                    score += 10
            
            # -- Category/Sector Alignment (Weight: 15) --
            job_category = (job.category or "").lower()
            if job_category and any(skill in job_category or job_category in skill for skill in user_skills):
                score += 15
            
            # -- Recency Decay --
            days_old = (now - job.created_at).days
            recency_score = 100 / (max(days_old, 0) + 1)
            score += recency_score
            
            # -- Keyword Match (Bio/Title) (Weight: 2) --
            if user_bio:
                job_title = job.title.lower()
                bio_tokens = set(user_bio.split())
                title_tokens = set(job_title.split())
                common_tokens = bio_tokens.intersection(title_tokens)
                score += (len(common_tokens) * 2)
            
            # -- Search Query Relevancy Match (Weight: search_score value) --
            if search:
                score += search_scores.get(job.id, 0)
            
            # -- Subscription Boost (Weight: 40% boost to final score) --
            boost = 1.0
            try:
                creator_profile = job.user.profile
                plan = creator_profile.subscription_plan
                if job.post_type == 'looking' and plan in ['seeker_29', 'recruiter_99']:
                    boost = 1.4
                elif job.post_type == 'hire' and plan == 'recruiter_99':
                    boost = 1.4
            except Exception as e:
                print(f"Error checking subscription boost: {e}")
            
            score *= boost
            scored_jobs.append((job, score))
        
        # 3. Sort by Score (Descending)
        scored_jobs.sort(key=lambda x: x[1], reverse=True)
        
        # Extract sorted jobs
        return [item[0] for item in scored_jobs]

class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a job
    """
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_object(self):
        return Job.objects.get(pk=self.kwargs['pk'])
    
    def perform_update(self, serializer):
        job = self.get_object()
        # Check if the user is the job creator
        if job.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the job creator can update this job.")
        serializer.save()

    def perform_destroy(self, instance):
        # Check if the user is the job creator
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the job creator can delete this job.")
        instance.delete()

class JobApplicationCreateView(generics.CreateAPIView):
    """
    Apply to a job
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        job_id = self.kwargs.get('job_id')
        try:
            job = Job.objects.get(pk=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if job is closed
        if job.status != 'Open':
            return Response({'error': 'This job is no longer accepting applications'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already applied
        if JobApplication.objects.filter(job=job, user=request.user).exists():
            return Response({'error': 'You have already applied to this job'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Enforce subscription limit for daily applications
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # This will check and reset daily applications count if the day changed
        profile.check_and_reset_daily_applications()
        
        if profile.remaining_applications <= 0:
            return Response(
                {'error': 'You have reached your daily limit of 3 job applications on the Free plan. Please upgrade to apply to unlimited jobs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get ID card and resume if provided
        id_card_id = request.data.get('id_card_id')
        resume_id = request.data.get('resume_id')
        custom_field_answers = request.data.get('custom_field_answers', [])
        
        id_card = None
        resume = None
        
        if id_card_id:
            try:
                from .models import IDCard
                id_card = IDCard.objects.get(pk=id_card_id, user=request.user)
            except IDCard.DoesNotExist:
                return Response({'error': 'Invalid ID card'}, status=status.HTTP_400_BAD_REQUEST)
        
        if resume_id:
            try:
                from .models import ResumeFile
                resume = ResumeFile.objects.get(pk=resume_id, user=request.user)
            except ResumeFile.DoesNotExist:
                return Response({'error': 'Invalid resume'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create application
        application = JobApplication.objects.create(
            job=job,
            user=request.user,
            cover_letter=request.data.get('cover_letter', ''),
            id_card=id_card,
            resume=resume,
            custom_field_answers=custom_field_answers
        )
        
        # Increment daily applications count
        profile.daily_applications_count += 1
        profile.save(update_fields=['daily_applications_count'])
        
        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UserJobListView(generics.ListAPIView):
    """
    List jobs posted by the current user (only 'hire' posts - where user is hiring someone)
    """
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Job.objects.filter(
            user=self.request.user, 
            post_type='hire'
        ).order_by('-created_at')

class UserApplicationListView(generics.ListAPIView):
    """
    List applications by the current user
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user).select_related('user', 'user__profile', 'job').order_by('-applied_date')

class JobApplicationListView(generics.ListAPIView):
    """
    List applications for a specific job (only accessible by job poster)
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_id')
        try:
            job = Job.objects.get(pk=job_id)
            # Check if the user is the job poster
            if job.user != self.request.user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only the job poster can view applications.")
            return JobApplication.objects.filter(job=job).select_related('user', 'user__profile', 'job').order_by('-applied_date')
        except Job.DoesNotExist:
            return JobApplication.objects.none()

class JobApplicationUpdateView(generics.UpdateAPIView):
    """
    Update job application status (only accessible by job poster)
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return JobApplication.objects.all()
    
    def perform_update(self, serializer):
        application = self.get_object()
        # Check if the user is the job poster
        if application.job.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the job poster can update applications.")
        serializer.save()

class JobUpdateView(generics.UpdateAPIView):
    """
    Update job details (only accessible by job poster)
    """
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Job.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        job = self.get_object()
        # Check if the user is the job poster
        if job.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the job poster can update this job.")
        serializer.save()

class UserJobPreferencesView(generics.ListAPIView):
    """
    List job preferences (job-seeking posts) by the current user (only 'looking' posts - where user is seeking work)
    """
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Job.objects.filter(
            user=self.request.user, 
            post_type='looking'
        ).order_by('-created_at')

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def job_statistics(request):
    """
    Get job statistics for the current user
    """
    user = request.user
    
    # Jobs posted by user
    posted_jobs = Job.objects.filter(user=user)
    open_jobs = posted_jobs.filter(status='Open').count()
    closed_jobs = posted_jobs.filter(status='Closed').count()
    
    # Applications by user
    applications = JobApplication.objects.filter(user=user)
    pending_applications = applications.filter(status='Pending').count()
    under_review = applications.filter(status='Under Review').count()
    shortlisted = applications.filter(status='Shortlisted').count()
    accepted = applications.filter(status='Accepted').count()
    rejected = applications.filter(status='Rejected').count()
    
    return Response({
        'posted_jobs': {
            'total': posted_jobs.count(),
            'open': open_jobs,
            'closed': closed_jobs,
        },
        'applications': {
            'total': applications.count(),
            'pending': pending_applications,
            'under_review': under_review,
            'shortlisted': shortlisted,
            'accepted': accepted,
            'rejected': rejected,
        }
    })

# Hire Request Views
class HireRequestCreateView(generics.CreateAPIView):
    """
    Create a new hire request from a recruiter to a job seeker
    """
    serializer_class = HireRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save()

class HireRequestListView(generics.ListAPIView):
    """
    List hire requests for the current user (either as requester or seeker)
    """
    serializer_class = HireRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Get requests where user is either the requester or the seeker
        return HireRequest.objects.filter(
            Q(requester=user) | Q(seeker=user)
        ).order_by('-created_at')

class SeekerHireRequestListView(generics.ListAPIView):
    """
    List hire requests received by the current user (as a job seeker)
    """
    serializer_class = HireRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Get requests where user is the seeker
        return HireRequest.objects.filter(seeker=user).order_by('-created_at')

class RequesterHireRequestListView(generics.ListAPIView):
    """
    List hire requests sent by the current user (as a recruiter)
    """
    serializer_class = HireRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Get requests where user is the requester
        return HireRequest.objects.filter(requester=user).order_by('-created_at')

class HireRequestUpdateView(generics.UpdateAPIView):
    """
    Update hire request status (accept/reject/withdraw)
    """
    serializer_class = HireRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Users can only update requests where they are the seeker (to accept/reject)
        # or the requester (to withdraw)
        return HireRequest.objects.filter(
            Q(seeker=user) | Q(requester=user)
        )
    
    def perform_update(self, serializer):
        user = self.request.user
        hire_request = serializer.instance
        
        # Only seekers can accept/reject, requesters can only withdraw
        if user == hire_request.seeker:
            # Seeker can accept or reject
            if serializer.validated_data.get('status') not in ['Accepted', 'Rejected']:
                raise serializers.ValidationError("Seekers can only accept or reject requests")
        elif user == hire_request.requester:
            # Requester can only withdraw
            if serializer.validated_data.get('status') != 'Withdrawn':
                raise serializers.ValidationError("Requesters can only withdraw requests")
        
        serializer.save()

# Health Check View
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """
    Simple health check endpoint for connectivity testing
    """
    return Response({
        'status': 'healthy',
        'message': 'Backend is running',
        'timestamp': timezone.now().isoformat()
    }, status=status.HTTP_200_OK)

# User Profile and Follow Views
class UserProfileDetailView(generics.RetrieveAPIView):
    """
    Get detailed profile of a specific user
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        current_user = self.request.user
        
        try:
            user_to_view = get_user_by_id_or_username(user_id)
            
            # Check if either user has blocked the other
            if Block.objects.filter(blocker=current_user, blocked=user_to_view).exists():
                raise Http404("User not found")
            
            if Block.objects.filter(blocker=user_to_view, blocked=current_user).exists():
                raise Http404("User not found")
            
            return user_to_view
        except User.DoesNotExist:
            raise Http404("User not found")

class UserSearchView(generics.ListAPIView):
    """
    Search for users by username, first name, or last name
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        print(f"[SEARCH] Search query received: '{query}'")  # Debug log
        print(f"[SEARCH] Query params: {self.request.query_params}")  # Debug all params
        
        if query and query.strip():
            # First, let's see how many total users exist
            total_users = User.objects.count()
            print(f"[USERS] Total users in database: {total_users}")
            
            # Get current user info
            current_user = self.request.user
            print(f"[USER] Current user: {current_user.username} (ID: {current_user.id})")
            
            # Perform the search
            queryset = User.objects.filter(
                Q(username__icontains=query.strip()) |
                Q(first_name__icontains=query.strip()) |
                Q(last_name__icontains=query.strip())
            )
            
            print(f"[SEARCH] Raw search results (before excluding current user): {queryset.count()}")
            
            # Exclude current user
            queryset = queryset.exclude(id=current_user.id)
            print(f"[SEARCH] Search results (after excluding current user): {queryset.count()}")
            
            # Exclude blocked users (both ways)
            blocked_users = Block.objects.filter(blocker=current_user).values_list('blocked_id', flat=True)
            blocked_by_users = Block.objects.filter(blocked=current_user).values_list('blocker_id', flat=True)
            
            # Combine both sets of blocked user IDs
            all_blocked_ids = set(list(blocked_users) + list(blocked_by_users))
            
            if all_blocked_ids:
                queryset = queryset.exclude(id__in=all_blocked_ids)
                print(f"[SEARCH] Search results (after excluding blocked users): {queryset.count()}")
            
            # Log some sample results for debugging
            if queryset.exists():
                sample_users = queryset[:3]
                for user in sample_users:
                    print(f"  - {user.username} ({user.first_name} {user.last_name})")
            
            return queryset
        else:
            print("[ERROR] No query provided or empty query")
            return User.objects.none()

class FollowView(generics.CreateAPIView):
    """
    Follow or unfollow a user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            user_to_follow = get_user_by_id_or_username(user_id)
            if user_to_follow == request.user:
                return Response(
                    {'error': 'You cannot follow yourself'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if either user has blocked the other
            if Block.objects.filter(blocker=request.user, blocked=user_to_follow).exists():
                return Response(
                    {'error': 'Cannot follow blocked users'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if Block.objects.filter(blocker=user_to_follow, blocked=request.user).exists():
                return Response(
                    {'error': 'Cannot follow users who have blocked you'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already following
            existing_follow = Follow.objects.filter(
                follower=request.user,
                following=user_to_follow
            ).first()
            
            if existing_follow:
                # Unfollow - delete the follow relationship
                existing_follow.delete()
                return Response({
                    'message': f'Unfollowed {user_to_follow.username}',
                    'is_following': False,
                    'user_id': user_id
                }, status=status.HTTP_200_OK)
            else:
                # Follow - create the follow relationship
                Follow.objects.create(
                    follower=request.user,
                    following=user_to_follow
                )
                return Response({
                    'message': f'Started following {user_to_follow.username}',
                    'is_following': True,
                    'user_id': user_id
                }, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FollowStatusView(generics.RetrieveAPIView):
    """
    Check if current user is following another user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user_to_check = get_user_by_id_or_username(user_id)
            if user_to_check == request.user:
                return Response({
                    'is_following': False,
                    'message': 'You cannot follow yourself'
                })
            
            # Check if either user has blocked the other
            if Block.objects.filter(blocker=request.user, blocked=user_to_check).exists():
                return Response({
                    'is_following': False,
                    'message': 'Cannot check follow status for blocked users'
                })
            
            if Block.objects.filter(blocker=user_to_check, blocked=request.user).exists():
                return Response({
                    'is_following': False,
                    'message': 'Cannot check follow status for users who have blocked you'
                })
            
            # Check if actually following
            is_following = Follow.objects.filter(
                follower=request.user,
                following=user_to_check
            ).exists()
            
            return Response({
                'is_following': is_following,
                'user_id': user_id,
                'username': user_to_check.username
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class FollowedUsersView(generics.ListAPIView):
    """
    Get list of users that the current user is following
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            # Get all users that the current user is following
            followed_users = Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
            
            # Filter out blocked users (both ways)
            blocked_users = Block.objects.filter(blocker=request.user).values_list('blocked_id', flat=True)
            blocked_by_users = Block.objects.filter(blocked=request.user).values_list('blocker_id', flat=True)
            
            # Remove blocked users from followed list
            all_blocked_ids = set(list(blocked_users) + list(blocked_by_users))
            filtered_followed_users = [uid for uid in followed_users if uid not in all_blocked_ids]
            
            return Response({
                'followed_users': filtered_followed_users
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch followed users'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BlockView(generics.CreateAPIView):
    """
    Block or unblock a user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            user_to_block = get_user_by_id_or_username(user_id)
            if user_to_block == request.user:
                return Response(
                    {'error': 'You cannot block yourself'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already blocked
            existing_block = Block.objects.filter(
                blocker=request.user,
                blocked=user_to_block
            ).first()
            
            if existing_block:
                # Unblock - delete the block relationship
                existing_block.delete()
                return Response({
                    'message': f'Unblocked {user_to_block.username}',
                    'is_blocked': False,
                    'user_id': user_id
                }, status=status.HTTP_200_OK)
            else:
                # Block - create the block relationship
                Block.objects.create(
                    blocker=request.user,
                    blocked=user_to_block
                )
                return Response({
                    'message': f'Blocked {user_to_block.username}',
                    'is_blocked': True,
                    'user_id': user_id
                }, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class BlockStatusView(generics.RetrieveAPIView):
    """
    Check if current user has blocked another user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user_to_check = get_user_by_id_or_username(user_id)
            if user_to_check == request.user:
                return Response({
                    'is_blocked': False,
                    'message': 'You cannot block yourself'
                })
            
            # Check if actually blocked
            is_blocked = Block.objects.filter(
                blocker=request.user,
                blocked=user_to_check
            ).exists()
            
            return Response({
                'is_blocked': is_blocked,
                'user_id': user_id,
                'username': user_to_check.username
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class BlockedUsersView(generics.ListAPIView):
    """
    Get list of users that the current user has blocked
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            # Get all users that the current user has blocked with more details
            blocked_blocks = Block.objects.filter(blocker=request.user).select_related('blocked', 'blocked__profile')
            
            blocked_users = []
            for block in blocked_blocks:
                blocked_user = block.blocked
                # Get profile picture from UserProfile if it exists
                profile_picture = None
                if hasattr(blocked_user, 'profile') and blocked_user.profile and blocked_user.profile.profile_picture:
                    profile_picture = str(blocked_user.profile.profile_picture)
                
                blocked_users.append({
                    'id': blocked_user.id,
                    'username': blocked_user.username,
                    'full_name': f"{blocked_user.first_name} {blocked_user.last_name}".strip() or blocked_user.username,
                    'blocked_at': block.created_at.isoformat(),
                    'profile_picture': profile_picture
                })
            
            return Response({
                'blocked_users': blocked_users
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch blocked users'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationListView(generics.ListAPIView):
    """
    List notifications for the current user
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve and update a notification (mark as read)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    def patch(self, request, *args, **kwargs):
        """Mark notification as read"""
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'message': 'Notification marked as read'})


class NotificationMarkAllReadView(generics.UpdateAPIView):
    """
    Mark all notifications as read for the current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({'message': 'All notifications marked as read'})


class CheckUsernameView(APIView):
    """
    Check if a username is available
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        username = request.query_params.get('username', '').strip()
        
        if not username:
            return Response(
                {'error': 'Username parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username is already taken by another user
        if User.objects.filter(username=username).exclude(id=request.user.id).exists():
            return Response({
                'available': False,
                'message': 'Username is already taken'
            }, status=status.HTTP_200_OK)
        
        # Check if username meets basic requirements
        if len(username) < 3:
            return Response({
                'available': False,
                'message': 'Username must be at least 3 characters long'
            }, status=status.HTTP_200_OK)
        
        if len(username) > 30:
            return Response({
                'available': False,
                'message': 'Username must be less than 30 characters long'
            }, status=status.HTTP_200_OK)
        
        # Check if username contains only valid characters
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return Response({
                'available': False,
                'message': 'Username can only contain letters, numbers, and underscores'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'available': True,
            'message': 'Username is available'
        }, status=status.HTTP_200_OK)


# Messaging Views
class ConversationListView(generics.ListAPIView):
    """
    List all conversations for the current user
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Get all conversations for current user
        conversations = Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages').distinct()
        
        # SIMPLIFIED: Don't filter out conversations - let the frontend handle blocking
        # The previous logic was too aggressive and was hiding all conversations
        return conversations


class ConversationDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific conversation
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        conversations = Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages')
        
        # SIMPLIFIED: Don't filter out conversations - let the frontend handle blocking
        # The previous logic was too aggressive and was hiding all conversations
        return conversations


from rest_framework.pagination import PageNumberPagination

class MessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class MessageListView(generics.ListAPIView):
    """
    List messages in a conversation
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MessagePagination
    
    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        
        print(f"[SEARCH] Looking for conversation {conversation_id} for user {self.request.user.username}")
        
        # Verify user is part of the conversation
        conversation = Conversation.objects.filter(
            id=conversation_id,
            participants=self.request.user
        ).first()
        
        if not conversation:
            print(f"[ERROR] Conversation {conversation_id} not found or user {self.request.user.username} not a participant")
            print(f"[SEARCH] Available conversations for user: {list(Conversation.objects.filter(participants=self.request.user).values_list('id', flat=True))}")
            return Message.objects.none()
        
        print(f"[OK] Found conversation {conversation.id} with participants: {list(conversation.participants.values_list('username', flat=True))}")
        
        # Mark messages as read when fetching
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=self.request.user)
        
        for message in unread_messages:
            message.mark_as_read()
        
        # Get messages in the conversation (newest first for pagination)
        messages = Message.objects.filter(conversation=conversation).order_by('-created_at')
        
        print(f"[MSG] Found messages in conversation {conversation.id} (paginated)")
        # Print only the first few messages for debugging to avoid loading the whole queryset
        for msg in messages[:5]:
            print(f"   - {msg.sender.username}: {msg.content} ({msg.created_at})")
        
        return messages


class MessageCreateView(generics.CreateAPIView):
    """
    Send a new message
    """
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create to return full message data with sender info"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return the full message data using MessageSerializer
        message = serializer.instance
        response_serializer = MessageSerializer(message, context={'request': request})
        
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        # Check if sender is blocked by recipient
        sender = self.request.user
        recipient_id = self.request.data.get('recipient_id')
        
        if not recipient_id:
            raise serializers.ValidationError("recipient_id is required")
        
        try:
            recipient = User.objects.get(id=recipient_id)
            
            # Check if sender is blocked by recipient
            if Block.objects.filter(blocker=recipient, blocked=sender).exists():
                raise serializers.ValidationError("You cannot send messages to this user as you have been blocked.")
            
            # Check if recipient is blocked by sender
            if Block.objects.filter(blocker=sender, blocked=recipient).exists():
                raise serializers.ValidationError("You cannot send messages to blocked users.")
                
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient not found.")
        
        # Find or create conversation between sender and recipient
        conversation = self._get_or_create_conversation(sender, recipient)
        
        # Set the conversation for the message
        serializer.save(conversation=conversation, sender=sender)
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=['updated_at'])
        
        print(f"[OK] Message created successfully: {serializer.instance.id}")
        print(f"[PHONE] Conversation ID: {conversation.id}")
        print(f"[USER] Sender: {sender.username} (ID: {sender.id})")
        print(f"[USERS] Recipient: {recipient.username} (ID: {recipient.id})")
    
    def _get_or_create_conversation(self, sender, recipient):
        """Helper method to find or create conversation between two users"""
        try:
            # Find existing conversation with exactly 2 participants
            conversations = Conversation.objects.filter(
                participants=sender
            ).filter(
                participants=recipient
            )
            
            # Filter to only get conversations with exactly 2 participants
            for conv in conversations:
                if conv.participants.count() == 2:
                    print(f"[SYNC] Found existing conversation: {conv.id}")
                    return conv
            
            # Create new conversation if none exists
            conversation = Conversation.objects.create()
            conversation.participants.add(sender, recipient)
            print(f"[NEW] Created new conversation: {conversation.id}")
            return conversation
            
        except Exception as e:
            print(f"[ERROR] Error in conversation creation: {e}")
            raise serializers.ValidationError(f"Failed to create conversation: {str(e)}")


class ConversationCreateView(APIView):
    """
    Create or get existing conversation with another user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        recipient_username = request.data.get('recipient_username')
        
        if not recipient_id and not recipient_username:
            return Response(
                {'error': 'recipient_id or recipient_username is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_id = recipient_id if recipient_id else recipient_username
            recipient = get_user_by_id_or_username(target_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Recipient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Don't allow conversation with self
        if recipient == request.user:
            return Response(
                {'error': 'Cannot create conversation with yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if either user has blocked the other
        if Block.objects.filter(blocker=request.user, blocked=recipient).exists():
            return Response(
                {'error': 'Cannot create conversation with blocked user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if Block.objects.filter(blocker=recipient, blocked=request.user).exists():
            return Response(
                {'error': 'Cannot create conversation as you have been blocked by this user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find or create conversation
        # First, find conversations that have both users as participants
        conversations = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=recipient
        )
        
        # Filter to only get conversations with exactly 2 participants
        conversation = None
        for conv in conversations:
            if conv.participants.count() == 2:
                conversation = conv
                break
        
        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, recipient)
        
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MarkMessagesReadView(APIView):
    """
    Mark messages as read in a conversation
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                participants=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark all unread messages as read
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=request.user)
        
        for message in unread_messages:
            message.mark_as_read()
        
        return Response({'success': True}, status=status.HTTP_200_OK)


class CanSendMessageView(APIView):
    """
    Check if current user can send messages to another user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            recipient = get_user_by_id_or_username(user_id)
            
            if recipient == request.user:
                return Response({
                    'can_send': False,
                    'reason': 'Cannot send messages to yourself'
                })
            
            # Check if recipient is blocked by current user
            if Block.objects.filter(blocker=request.user, blocked=recipient).exists():
                return Response({
                    'can_send': False,
                    'reason': 'Cannot send messages to blocked users'
                })
            
            # Check if current user is blocked by recipient
            if Block.objects.filter(blocker=recipient, blocked=request.user).exists():
                return Response({
                    'can_send': False,
                    'reason': 'Cannot send messages as you have been blocked by this user'
                })
            
            return Response({
                'can_send': True,
                'reason': 'Messages allowed'
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DeviceTokenRegisterView(APIView):
    """Register user's push token on backend"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        token = request.data.get('token')
        device_type = request.data.get('device_type', 'android')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Register or update token ownership
        device_token, created = DeviceToken.objects.get_or_create(
            token=token,
            defaults={'user': request.user, 'device_type': device_type}
        )
        
        if not created and device_token.user != request.user:
            device_token.user = request.user
            device_token.device_type = device_type
            device_token.save()
            
        return Response({'message': 'Device token registered successfully', 'created': created}, status=status.HTTP_200_OK)


class DeviceTokenUnregisterView(APIView):
    """Unregister user's push token on backend"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        DeviceToken.objects.filter(user=request.user, token=token).delete()
        return Response({'message': 'Device token unregistered successfully'}, status=status.HTTP_200_OK)


