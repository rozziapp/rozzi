Write-Host "🚀 Starting Setuna Project..." -ForegroundColor Green
Write-Host ""

Write-Host "🔍 Updating IP address..." -ForegroundColor Yellow
Set-Location "setuna-app"
node scripts/update-ip.js
Write-Host ""

Write-Host "📱 Starting React Native app..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Normal
Write-Host ""

Write-Host "🐍 Starting Django backend..." -ForegroundColor Magenta
Set-Location "..\setuna-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; py manage.py runserver 0.0.0.0:8000" -WindowStyle Normal
Write-Host ""

Write-Host "✅ Both services are starting!" -ForegroundColor Green
Write-Host "📱 React Native app will open in a new window" -ForegroundColor Cyan
Write-Host "🐍 Django backend will open in a new window" -ForegroundColor Magenta
Write-Host ""
Write-Host "💡 If you need to restart, just run this script again!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to continue..."

