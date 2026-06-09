# Django Backend Setup for Authentication

This guide provides the Django backend setup for the React Native app authentication system.

## 🚀 Quick Setup

### 1. Create Django Project

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Django and required packages
pip install django djangorestframework django-cors-headers

# Create Django project
django-admin startproject setuna_backend
cd setuna_backend

# Create app
python manage.py startapp authentication
```

### 2. Configure Settings

Add to `setuna_backend/settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'authentication',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS settings for React Native
CORS_ALLOW_ALL_ORIGINS = True  # For development only
CORS_ALLOW_CREDENTIALS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### 3. Create Custom User Model

In `authentication/models.py`:

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']
    
    def __str__(self):
        return self.username
```

### 4. Create Serializers

In `authentication/serializers.py`:

```python
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name')
        read_only_fields = ('id',)

class LoginSerializer(serializers.Serializer):
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email_or_username = attrs.get('email_or_username')
        password = attrs.get('password')

        if email_or_username and password:
            # Try to authenticate with username or email
            user = authenticate(username=email_or_username, password=password)
            if not user:
                # Try with email
                try:
                    user_obj = User.objects.get(email=email_or_username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include "email_or_username" and "password".')

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'full_name', 'password', 'confirm_password')

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user
```

### 5. Create Views

In `authentication/views.py`:

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .serializers import LoginSerializer, SignupSerializer, UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token.key,
            'user': UserSerializer(user).data
        })
    else:
        return Response({
            'success': False,
            'message': 'Invalid credentials'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'success': True,
            'message': 'Account created successfully'
        }, status=status.HTTP_201_CREATED)
    else:
        return Response({
            'success': False,
            'message': 'Failed to create account',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    try:
        request.user.auth_token.delete()
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        })
    except:
        return Response({
            'success': False,
            'message': 'Failed to logout'
        }, status=status.HTTP_400_BAD_REQUEST)
```

### 6. Create URLs

In `authentication/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
]
```

In `setuna_backend/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('authentication.urls')),
]
```

### 7. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 8. Create Superuser

```bash
python manage.py createsuperuser
```

### 9. Run Server

```bash
python manage.py runserver
```

## 🔧 API Endpoints

### Login
- **URL**: `POST /api/login/`
- **Body**: 
  ```json
  {
    "email_or_username": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "your-auth-token",
    "user": {
      "id": 1,
      "username": "username",
      "email": "user@example.com",
      "full_name": "Full Name"
    }
  }
  ```

### Signup
- **URL**: `POST /api/signup/`
- **Body**:
  ```json
  {
    "username": "username",
    "email": "user@example.com",
    "full_name": "Full Name",
    "password": "password123",
    "confirm_password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Account created successfully"
  }
  ```

### Logout
- **URL**: `POST /api/logout/`
- **Headers**: `Authorization: Token your-auth-token`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

## 🔒 Security Notes

1. **CORS**: Configure CORS properly for production
2. **HTTPS**: Use HTTPS in production
3. **Token Expiry**: Implement token expiry for better security
4. **Password Validation**: Add stronger password validation
5. **Rate Limiting**: Implement rate limiting for login attempts

## 🚀 Production Deployment

1. Set `DEBUG = False` in settings
2. Configure proper CORS settings
3. Use environment variables for sensitive data
4. Set up proper database (PostgreSQL recommended)
5. Configure static files serving
6. Set up SSL/HTTPS

## 📱 React Native Integration

The React Native app is configured to connect to:
- **Development**: `http://localhost:8000/api/`
- **Production**: Update the base URL in AuthContext

Make sure to update the API URLs in the React Native app when deploying to production.
