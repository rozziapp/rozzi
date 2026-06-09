@echo off
echo 🔧 Rozzi Backend Startup Script
echo =================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python and try again.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "manage.py" (
    echo ❌ Please run this script from the setuna-backend directory
    pause
    exit /b 1
)

echo ✅ Python found and in correct directory
echo.

REM Start the Django backend with automatic IP detection
echo 🚀 Starting Django backend with automatic IP detection...
echo.
python startup.py

echo.
echo 🛑 Backend stopped
pause
