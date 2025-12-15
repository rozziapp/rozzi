# Setuna Backend Startup Script (PowerShell)
# Run this script to automatically start Django with proper network configuration

Write-Host "🔧 Setuna Backend Startup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "manage.py")) {
    Write-Host "❌ Please run this script from the setuna-backend directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ In correct directory" -ForegroundColor Green
Write-Host ""

# Start the Django backend with automatic IP detection
Write-Host "🚀 Starting Django backend with automatic IP detection..." -ForegroundColor Yellow
Write-Host ""

try {
    python startup.py
} catch {
    Write-Host "❌ Error starting Django backend: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🛑 Backend stopped" -ForegroundColor Yellow
Read-Host "Press Enter to exit"
