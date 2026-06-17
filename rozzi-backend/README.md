# Rozzi Backend - Django API

This is the Django backend for the Rozzi job platform mobile app.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip
- Django 5.2+
- Django REST Framework
- django-cors-headers

### Installation

1. **Clone the repository and navigate to backend**
   ```bash
   cd rozzi-backend
   ```

2. **Install dependencies**
   ```bash
   pip install django djangorestframework django-cors-headers
   ```

3. **Run migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

The API will be available at `http://localhost:8000/api/`

## 📊 API Endpoints

### Jobs
- `GET /api/jobs/` - List all jobs
- `POST /api/jobs/` - Create a new job
- `GET /api/jobs/{id}/` - Get job details
- `PUT /api/jobs/{id}/` - Update job
- `DELETE /api/jobs/{id}/` - Delete job

### Job Applications
- `POST /api/jobs/{job_id}/apply/` - Apply to a job
- `GET /api/applications/` - List user's applications

### User-specific
- `GET /api/jobs/my-posts/` - List jobs posted by current user
- `GET /api/statistics/` - Get job statistics for current user

## 🗄️ Database Models

### Job Model
```python
class Job(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    salary_min = models.IntegerField(null=True, blank=True)
    salary_max = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=200)
    job_type = models.CharField(max_length=50)  # Full-time, Part-time, etc.
    category = models.CharField(max_length=100)  # Technology, Delivery, etc.
    sector = models.CharField(max_length=50)  # Local, Professional
    experience_level = models.CharField(max_length=50)
    deadline = models.CharField(max_length=50)
    shift_timing = models.CharField(max_length=50)
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    address = models.TextField()
    pincode = models.CharField(max_length=10)
    skills = models.JSONField(default=list)
    custom_fields = models.JSONField(default=list)
    status = models.CharField(max_length=50)  # Open, Closed, Draft
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    applicants_count = models.IntegerField(default=0)
    is_remote = models.BooleanField(default=False)
```

### JobApplication Model
```python
class JobApplication(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    applied_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50)  # Pending, Under Review, etc.
    cover_letter = models.TextField(blank=True, null=True)
```

## 🔧 Configuration

### Settings
- **DEBUG**: True (development)
- **ALLOWED_HOSTS**: ['localhost', '127.0.0.1', '10.148.104.119']
- **CORS**: Enabled for development
- **Database**: SQLite (development)

### CORS Configuration
```python
CORS_ALLOW_ALL_ORIGINS = True  # Development only
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]
```

## 🧪 Testing

### Test API endpoints
```bash
# List jobs
curl http://localhost:8000/api/jobs/

# Create a job (requires authentication)
curl -X POST http://localhost:8000/api/jobs/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Native Developer",
    "description": "Looking for an experienced React Native developer",
    "salary_min": 800000,
    "salary_max": 1200000,
    "location": "Mumbai, India",
    "job_type": "Full-time",
    "category": "Technology",
    "sector": "Professional"
  }'
```

## 🔐 Authentication

Currently using Django's built-in authentication:
- Session-based authentication
- Basic authentication
- User registration/login endpoints (to be implemented)

## 📝 Notes

- The backend is configured for development
- CORS is enabled for all origins (development only)
- SQLite database is used for simplicity
- User field in Job model is optional for now
- All endpoints support filtering and search

## 🚀 Deployment

For production deployment:
1. Set `DEBUG = False`
2. Configure proper database (PostgreSQL recommended)
3. Set up proper CORS origins
4. Configure static files
5. Set up proper authentication (JWT recommended)
6. Use environment variables for sensitive data
