@echo off
echo 🚀 Starting Rozzi Project...
echo.

echo 🔍 Updating IP address...
cd setuna-app
node scripts/update-ip.js
echo.

echo 📱 Starting React Native app...
start "React Native" cmd /k "npm start"
echo.

echo 🐍 Starting Django backend...
cd ..\setuna-backend
start "Django Backend" cmd /k "py manage.py runserver 0.0.0.0:8000"
echo.

echo ✅ Both services are starting!
echo 📱 React Native app will open in a new window
echo 🐍 Django backend will open in a new window
echo.
echo 💡 If you need to restart, just run this script again!
pause

