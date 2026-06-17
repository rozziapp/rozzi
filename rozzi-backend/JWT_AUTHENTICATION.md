# JWT Authentication Setup for Rozzi Backend

This document describes the complete JWT authentication implementation for the Rozzi job platform backend.

## 🚀 Features Implemented

### ✅ Authentication Endpoints
- **POST** `/api/register/` - User registration
- **POST** `/api/token/` - User login (obtain JWT tokens)
- **POST** `/api/token/refresh/` - Refresh access token
- **GET** `/api/me/` - Get current user profile
- **PUT** `/api/change-password/` - Change user password

### ✅ Security Features
- JWT token-based authentication
- Automatic token refresh
- Password validation
- User registration with email verification
- Protected routes requiring authentication
- CORS configuration for mobile apps

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
pip install djangorestframework-simplejwt
```

### 2. Update Settings
The following settings have been added to `settings.py`:

```python
# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    
    'JTI_CLAIM': 'jti',
    
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
```

## 📊 API Endpoints

### Authentication Endpoints

#### 1. User Registration
```http
POST /api/register/
Content-Type: application/json

{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "password2": "testpass123",
    "first_name": "Test",
    "last_name": "User"
}
```

**Response:**
```json
{
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "full_name": "Test User",
    "profile_picture": null,
    "date_joined": "2024-01-15T10:00:00Z"
}
```

#### 2. User Login
```http
POST /api/token/
Content-Type: application/json

{
    "username": "testuser",
    "password": "testpass123"
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 3. Token Refresh
```http
POST /api/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 4. Get User Profile
```http
GET /api/me/
Authorization: Bearer <access_token>
```

**Response:**
```json
{
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "full_name": "Test User",
    "profile_picture": null,
    "date_joined": "2024-01-15T10:00:00Z"
}
```

#### 5. Change Password
```http
PUT /api/change-password/
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "old_password": "testpass123",
    "new_password": "newpass123"
}
```

**Response:**
```json
{
    "message": "Password updated successfully"
}
```

### Protected Job Endpoints

All job-related endpoints now require authentication:

#### 1. Create Job (Protected)
```http
POST /api/jobs/
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "title": "React Native Developer",
    "description": "Looking for an experienced React Native developer",
    "salary_min": 800000,
    "salary_max": 1200000,
    "location": "Mumbai, India",
    "job_type": "Full-time",
    "category": "Technology",
    "sector": "Professional",
    "experience_level": "2-5 years",
    "deadline": "15 days",
    "shift_timing": "Day",
    "state": "Maharashtra",
    "city": "Mumbai",
    "address": "Test Address",
    "pincode": "400001"
}
```

#### 2. List Jobs (Public)
```http
GET /api/jobs/
```

#### 3. Get User's Posted Jobs (Protected)
```http
GET /api/jobs/my-posts/
Authorization: Bearer <access_token>
```

#### 4. Apply to Job (Protected)
```http
POST /api/jobs/{job_id}/apply/
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "cover_letter": "I am interested in this position..."
}
```

## 🔐 Frontend Integration

### React Native Implementation

The frontend has been updated to handle JWT authentication:

#### 1. API Configuration (`utils/api.ts`)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Authentication helper functions
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    const response = await API.post('/register/', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await API.post('/token/', credentials);
    const { access, refresh } = response.data;
    
    // Store tokens
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },

  // Logout user
  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  },

  // Get current user profile
  getProfile: async () => {
    const response = await API.get('/me/');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  }
};
```

#### 2. Automatic Token Refresh
The API interceptor automatically handles token refresh:

```typescript
// Add response interceptor for error handling and token refresh
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const response = await axios.post(`${getBaseURL()}/token/refresh/`, {
            refresh: refreshToken
          });

          const { access } = response.data;
          await AsyncStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }
    return Promise.reject(error);
  }
);
```

## 🧪 Testing

### Run the Test Script
```bash
cd rozzi-backend
python test_jwt_auth.py
```

This will test:
1. User registration
2. User login
3. Protected endpoint access
4. Job creation with authentication
5. Token refresh
6. Public endpoint access

### Manual Testing with curl

#### 1. Register a user
```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "password2": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

#### 2. Login and get tokens
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

#### 3. Access protected endpoint
```bash
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Bearer <your_access_token>"
```

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**
   ```bash
   export SECRET_KEY="your-secret-key-here"
   export DEBUG=False
   export ALLOWED_HOSTS="your-domain.com"
   ```

2. **HTTPS Only**
   - Set `SECURE_SSL_REDIRECT = True`
   - Configure SSL certificates

3. **Token Security**
   - Use shorter access token lifetimes (15-30 minutes)
   - Implement token blacklisting
   - Use secure token storage

4. **CORS Configuration**
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://your-frontend-domain.com",
   ]
   ```

5. **Rate Limiting**
   - Implement rate limiting for login/register endpoints
   - Use Django REST Framework throttling

## 📝 Notes

- Tokens are stored in AsyncStorage for React Native
- Automatic token refresh is implemented
- All protected routes require valid JWT tokens
- User registration includes email and password validation
- Password change functionality is available
- CORS is configured for mobile app development

## 🚀 Next Steps

1. **Email Verification**: Add email verification for new registrations
2. **Password Reset**: Implement password reset functionality
3. **Social Authentication**: Add Google, Facebook, or Apple sign-in
4. **Two-Factor Authentication**: Implement 2FA for enhanced security
5. **User Roles**: Add role-based permissions (admin, recruiter, job seeker)
6. **Audit Logging**: Log authentication events for security monitoring
