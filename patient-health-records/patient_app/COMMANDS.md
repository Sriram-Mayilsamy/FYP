# Flutter App Command Reference

## Essential Commands

### Deploy to Device
```bash
# Navigate to app directory
cd patient-health-records/patient_app

# Run on your connected device (hot reload enabled)
flutter run -d ee82e4ce

# Or use the script
.\run.ps1
```

### Build APK
```bash
# Debug APK (for testing)
flutter build apk --debug

# Release APK (for production)
flutter build apk --release

# Install APK to device
adb install build/app/outputs/flutter-apk/app-debug.apk
```

### Development Commands
```bash
# Get dependencies
flutter pub get

# Clean project
flutter clean

# Analyze code for issues
flutter analyze

# Check connected devices
flutter devices

# Check Flutter installation
flutter doctor
```

### ADB Commands
```bash
# List connected devices
adb devices

# Install APK
adb install path/to/app.apk

# Uninstall app
adb uninstall com.healthrecords.patient_app

# View logs
adb logcat

# Filter Flutter logs
adb logcat | grep flutter

# Restart ADB server
adb kill-server
adb start-server
```

### Hot Reload (while app is running)
```
r  - Hot reload (instant UI updates)
R  - Hot restart (full restart)
q  - Quit
```

## Your Device Info

- **Model:** CPH2487
- **OS:** Android 16 (API 36)
- **Device ID:** ee82e4ce
- **Status:** Connected and authorized

## Quick Deploy Workflow

1. **Start backend:** `npm start` (in backend directory)
2. **Update IP:** Edit `lib/providers/auth_provider.dart` line 15
3. **Deploy:** `flutter run -d ee82e4ce`
4. **Test:** Login with patient1@example.com / patient123

## Configuration Files

- `pubspec.yaml` - Dependencies
- `android/app/src/main/AndroidManifest.xml` - Android config
- `lib/providers/auth_provider.dart` - API base URL (line 15)

## Backend API Endpoint

Your app connects to:
```
POST http://YOUR_IP:5000/api/auth/patient-login
```

Make sure:
- ✅ Backend running on port 5000
- ✅ IP address updated in code
- ✅ Phone and PC on same Wi-Fi
- ✅ Port 5000 allowed in firewall
