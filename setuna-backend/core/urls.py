from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    JobListCreateView, 
    JobDetailView, 
    JobApplicationCreateView,
    JobApplicationListView,
    JobApplicationUpdateView,
    JobUpdateView,
    UserJobListView,
    UserApplicationListView,
    UserJobPreferencesView,
    job_statistics,
    RegisterView,
    UserProfileView,
    ChangePasswordView,
    SendOTPView,
    VerifyOTPView,
    IDCardListView,
    IDCardDetailView,
    PhotoUploadView,
    ProfilePhotoUploadView,
    ResumeUploadView,
    ResumeFileListView,
    ResumeFileDetailView,
    HireRequestCreateView,
    HireRequestListView,
    SeekerHireRequestListView,
    RequesterHireRequestListView,
    HireRequestUpdateView,
    UserProfileDetailView,
    UserSearchView,
    FollowView,
    FollowStatusView,
    FollowedUsersView,
    BlockView,
    BlockStatusView,
    BlockedUsersView,
    health_check,
    NotificationListView,
    NotificationDetailView,
    NotificationMarkAllReadView,
    CheckUsernameView,
    ConversationListView,
    ConversationDetailView,
    MessageListView,
    MessageCreateView,
    ConversationCreateView,
    MarkMessagesReadView,
    CanSendMessageView
)

urlpatterns = [
    # Health check endpoint
    path('health/', health_check, name='health_check'),
    
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # OTP endpoints
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    
    # ID Card endpoints
    path('id-cards/', IDCardListView.as_view(), name='id-card-list'),
    path('id-cards/<int:pk>/', IDCardDetailView.as_view(), name='id-card-detail'),
    path('upload-photo/', PhotoUploadView.as_view(), name='upload-photo'),
    path('upload-profile-photo/', ProfilePhotoUploadView.as_view(), name='upload-profile-photo'),
    
    # Resume File endpoints
    path('upload-resume/', ResumeUploadView.as_view(), name='upload-resume'),
    path('resume-files/', ResumeFileListView.as_view(), name='resume-file-list'),
    path('resume-files/<int:pk>/', ResumeFileDetailView.as_view(), name='resume-file-detail'),
    
    # Job endpoints
    path('jobs/', JobListCreateView.as_view(), name='job-list-create'),
    path('jobs/<int:pk>/', JobDetailView.as_view(), name='job-detail'),
    path('jobs/<int:pk>/update/', JobUpdateView.as_view(), name='job-update'),
    path('jobs/<int:job_id>/apply/', JobApplicationCreateView.as_view(), name='job-apply'),
    path('jobs/<int:job_id>/applications/', JobApplicationListView.as_view(), name='job-applications'),
    
    # Application endpoints
    path('applications/<int:pk>/update/', JobApplicationUpdateView.as_view(), name='application-update'),
    
    # User-specific endpoints
    path('jobs/my-posts/', UserJobListView.as_view(), name='user-jobs'),
    path('jobs/my-preferences/', UserJobPreferencesView.as_view(), name='user-job-preferences'),
    path('applications/', UserApplicationListView.as_view(), name='user-applications'),
    path('statistics/', job_statistics, name='job-statistics'),
    
        # Hire Request endpoints
    path('hire-requests/', HireRequestCreateView.as_view(), name='hire-request-create'),
    path('hire-requests/all/', HireRequestListView.as_view(), name='hire-request-list'),
    path('hire-requests/received/', SeekerHireRequestListView.as_view(), name='hire-request-received'),
    path('hire-requests/sent/', RequesterHireRequestListView.as_view(), name='hire-request-sent'),
    path('hire-requests/<int:pk>/update/', HireRequestUpdateView.as_view(), name='hire-request-update'),
    
    # User Profile and Follow endpoints
    path('users/<int:user_id>/profile/', UserProfileDetailView.as_view(), name='user-profile-detail'),
    path('users/search/', UserSearchView.as_view(), name='user-search'),
    path('users/<int:user_id>/follow/', FollowView.as_view(), name='follow-user'),
    path('users/<int:user_id>/follow-status/', FollowStatusView.as_view(), name='follow-status'),
    path('users/followed/', FollowedUsersView.as_view(), name='followed-users'),
    path('users/<int:user_id>/block/', BlockView.as_view(), name='block-user'),
    path('users/<int:user_id>/block-status/', BlockStatusView.as_view(), name='block-status'),
    path('users/blocked/', BlockedUsersView.as_view(), name='blocked-users'),
    
    # Notification endpoints
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    
    # Username availability check
    path('check-username/', CheckUsernameView.as_view(), name='check-username'),
    
    # Messaging endpoints
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:conversation_id>/messages/', MessageListView.as_view(), name='message-list'),
    path('conversations/<int:conversation_id>/mark-read/', MarkMessagesReadView.as_view(), name='mark-messages-read'),
    path('conversations/create/', ConversationCreateView.as_view(), name='conversation-create'),
    path('messages/send/', MessageCreateView.as_view(), name='message-send'),
    path('users/<int:user_id>/can-send-message/', CanSendMessageView.as_view(), name='can-send-message'),
]
