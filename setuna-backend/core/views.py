from django.shortcuts import render
from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Job, JobApplication, UserProfile, IDCard, ResumeFile, Follow, Notification, Block, HireRequest, Conversation, Message
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
    RegisterSerializer,
    ChangePasswordSerializer,
    IDCardCreateUpdateSerializer,
    OTPSerializer,
    OTPVerificationSerializer,
    FollowSerializer, 
    NotificationSerializer,
    BasicUserSerializer, 
    BlockSerializer, 
    HireRequestCreateSerializer,
    HireRequestSerializer,
    MessageSerializer,
    ConversationSerializer,
    MessageCreateSerializer
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

# Configure Cloudinary
cloudinary.config(
    cloud_name='dnr1qtmyf',
    api_key='571633454864952',
    api_secret='rJ4MBW5XahGzXshlhvaYTSRJVEw',
    secure=True
)

# Authentication Views
class RegisterView(generics.CreateAPIView):
    """
    Register a new user
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

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
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    """
    Change password for current user
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def update(self, request, *args, **kwargs):
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check old password
        if not user.check_password(serializer.data.get("old_password")):
            return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(serializer.data.get("new_password"))
        user.save()
        return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)

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
                        folder='setuna/id_cards',
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
                    folder='setuna/id_cards',
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
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                    temp_file.write(image_data)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to Cloudinary
                    result = cloudinary.uploader.upload(
                        temp_file_path,
                        folder='setuna/profiles',
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
                # Upload file directly to Cloudinary
                result = cloudinary.uploader.upload(
                    photo_data,
                    folder='setuna/profiles',
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
                    # Upload to Cloudinary
                    result = cloudinary.uploader.upload(
                        temp_file_path,
                        folder='setuna/resumes',
                        public_id=f"resume_{request.user.id}_{int(timezone.now().timestamp())}.pdf",
                        resource_type='raw',  # Important for PDF files
                        overwrite=True
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
                # Upload file directly to Cloudinary
                result = cloudinary.uploader.upload(
                    file_data,
                    folder='setuna/resumes',
                    public_id=f"resume_{request.user.id}_{int(timezone.now().timestamp())}.pdf",
                    resource_type='raw',  # Important for PDF files
                    overwrite=True
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
class SendOTPView(generics.CreateAPIView):
    """
    Send OTP to email or phone
    """
    serializer_class = OTPSerializer
    permission_classes = (permissions.AllowAny,)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if OTP already exists and is not expired
        email = serializer.validated_data.get('email')
        phone = serializer.validated_data.get('phone')
        
        if email:
            existing_otp = OTP.objects.filter(email=email, is_verified=False).first()
        else:
            existing_otp = OTP.objects.filter(phone=phone, is_verified=False).first()
        
        if existing_otp and not existing_otp.is_expired():
            return Response({
                "message": "OTP already sent. Please wait before requesting a new one."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new OTP
        otp = serializer.save()
        
        # In production, you would send the OTP via email/SMS here
        # For now, we'll just return the OTP in the response (for testing)
        return Response({
            "message": "OTP sent successfully",
            "otp_code": otp.otp_code,  # Remove this in production
            "expires_at": otp.expires_at
        }, status=status.HTTP_201_CREATED)

class VerifyOTPView(generics.CreateAPIView):
    """
    Verify OTP code
    """
    serializer_class = OTPVerificationSerializer
    permission_classes = (permissions.AllowAny,)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        return Response({
            "message": "OTP verified successfully"
        }, status=status.HTTP_200_OK)

# Job Views
class JobListCreateView(generics.ListCreateAPIView):
    """
    List all jobs or create a new job
    """
    queryset = Job.objects.filter(status='Open').order_by('-created_at')
    serializer_class = JobListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        """Automatically set the user when creating a job"""
        serializer.save(user=self.request.user)
    
    def get_queryset(self):
        queryset = Job.objects.filter(status='Open').order_by('-created_at')
        
        # Filter by job type
        job_type = self.request.query_params.get('job_type', None)
        if job_type and job_type != 'All':
            queryset = queryset.filter(job_type=job_type)
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )
        
        return queryset

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
        return JobApplication.objects.filter(user=self.request.user).order_by('-applied_date')

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
            return JobApplication.objects.filter(job=job).order_by('-applied_date')
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
            user_to_view = User.objects.get(id=user_id)
            
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
        print(f"🔍 Search query received: '{query}'")  # Debug log
        print(f"🔍 Query params: {self.request.query_params}")  # Debug all params
        
        if query and query.strip():
            # First, let's see how many total users exist
            total_users = User.objects.count()
            print(f"👥 Total users in database: {total_users}")
            
            # Get current user info
            current_user = self.request.user
            print(f"👤 Current user: {current_user.username} (ID: {current_user.id})")
            
            # Perform the search
            queryset = User.objects.filter(
                Q(username__icontains=query.strip()) |
                Q(first_name__icontains=query.strip()) |
                Q(last_name__icontains=query.strip())
            )
            
            print(f"🔍 Raw search results (before excluding current user): {queryset.count()}")
            
            # Exclude current user
            queryset = queryset.exclude(id=current_user.id)
            print(f"🔍 Search results (after excluding current user): {queryset.count()}")
            
            # Exclude blocked users (both ways)
            blocked_users = Block.objects.filter(blocker=current_user).values_list('blocked_id', flat=True)
            blocked_by_users = Block.objects.filter(blocked=current_user).values_list('blocker_id', flat=True)
            
            # Combine both sets of blocked user IDs
            all_blocked_ids = set(list(blocked_users) + list(blocked_by_users))
            
            if all_blocked_ids:
                queryset = queryset.exclude(id__in=all_blocked_ids)
                print(f"🔍 Search results (after excluding blocked users): {queryset.count()}")
            
            # Log some sample results for debugging
            if queryset.exists():
                sample_users = queryset[:3]
                for user in sample_users:
                    print(f"  - {user.username} ({user.first_name} {user.last_name})")
            
            return queryset
        else:
            print("❌ No query provided or empty query")
            return User.objects.none()

class FollowView(generics.CreateAPIView):
    """
    Follow or unfollow a user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        try:
            user_to_follow = User.objects.get(id=user_id)
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
            user_to_check = User.objects.get(id=user_id)
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
            user_to_block = User.objects.get(id=user_id)
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
            user_to_check = User.objects.get(id=user_id)
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


class MessageListView(generics.ListAPIView):
    """
    List messages in a conversation
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        
        print(f"🔍 Looking for conversation {conversation_id} for user {self.request.user.username}")
        
        # Verify user is part of the conversation
        conversation = Conversation.objects.filter(
            id=conversation_id,
            participants=self.request.user
        ).first()
        
        if not conversation:
            print(f"❌ Conversation {conversation_id} not found or user {self.request.user.username} not a participant")
            print(f"🔍 Available conversations for user: {list(Conversation.objects.filter(participants=self.request.user).values_list('id', flat=True))}")
            return Message.objects.none()
        
        print(f"✅ Found conversation {conversation.id} with participants: {list(conversation.participants.values_list('username', flat=True))}")
        
        # Mark messages as read when fetching
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=self.request.user)
        
        for message in unread_messages:
            message.mark_as_read()
        
        # Get all messages in the conversation
        messages = Message.objects.filter(conversation=conversation).order_by('created_at')
        
        print(f"📨 Found {messages.count()} messages in conversation {conversation.id}")
        for msg in messages:
            print(f"   - {msg.sender.username}: {msg.content} ({msg.created_at})")
        
        return messages


class MessageCreateView(generics.CreateAPIView):
    """
    Send a new message
    """
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
        
        print(f"✅ Message created successfully: {serializer.instance.id}")
        print(f"📱 Conversation ID: {conversation.id}")
        print(f"👤 Sender: {sender.username} (ID: {sender.id})")
        print(f"👥 Recipient: {recipient.username} (ID: {recipient.id})")
    
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
                    print(f"🔄 Found existing conversation: {conv.id}")
                    return conv
            
            # Create new conversation if none exists
            conversation = Conversation.objects.create()
            conversation.participants.add(sender, recipient)
            print(f"🆕 Created new conversation: {conversation.id}")
            return conversation
            
        except Exception as e:
            print(f"❌ Error in conversation creation: {e}")
            raise serializers.ValidationError(f"Failed to create conversation: {str(e)}")


class ConversationCreateView(APIView):
    """
    Create or get existing conversation with another user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        
        if not recipient_id:
            return Response(
                {'error': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipient = User.objects.get(id=recipient_id)
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
            recipient = User.objects.get(id=user_id)
            
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


