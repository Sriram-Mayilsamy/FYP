# Quick deployment script for Flutter app
Write-Host "=== Patient Health Records - Flutter App Deployment ===" -ForegroundColor Green
Write-Host ""

# Check if Flutter is installed
Write-Host "Checking Flutter installation..." -ForegroundColor Yellow
$flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutterCheck) {
    Write-Host "ERROR: Flutter not found in PATH!" -ForegroundColor Red
    Write-Host "Please install Flutter or add it to your PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Flutter found!" -ForegroundColor Green
Write-Host ""

# Check connected devices
Write-Host "Checking connected devices..." -ForegroundColor Yellow
flutter devices

Write-Host ""
Write-Host "=== IMPORTANT: Configure Backend URL ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before running, update the backend URL in:" -ForegroundColor Yellow
Write-Host "  lib/providers/auth_provider.dart (line 15)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Find your IP address:" -ForegroundColor Yellow
Write-Host "  Run: ipconfig" -ForegroundColor Yellow
Write-Host "  Look for 'IPv4 Address'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Update baseUrl to: http://YOUR_IP:5000/api" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Have you updated the backend URL? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Please update the backend URL first, then run this script again." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting Flutter app on device ee82e4ce..." -ForegroundColor Green
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Run the app
flutter run -d ee82e4ce
