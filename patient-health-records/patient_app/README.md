# Patient Health Records - Flutter Mobile App

A Flutter mobile application for patient login and health records management.

## Features

- ✅ Patient Login with Email & Password
- ✅ Token-based Authentication
- ✅ Persistent Login (SharedPreferences)
- ✅ Patient Dashboard
- ✅ Material Design 3 UI
- ✅ Form Validation
- ✅ Error Handling

## Prerequisites

- Flutter SDK 3.11.1 or higher
- Dart SDK 3.11.1 or higher
- Android Studio / Xcode (for device deployment)
- Backend API running on port 5000

## Quick Start

### 1. Install Dependencies

```bash
flutter pub get
```

### 2. Configure Backend URL

Edit `lib/providers/auth_provider.dart` and update the `baseUrl`:

**For Android Emulator:**
```dart
static const String baseUrl = 'http://10.0.2.2:5000/api';
```

**For Physical Android Device:**
```dart
static const String baseUrl = 'http://YOUR_COMPUTER_IP:5000/api';
```

**For iOS Simulator:**
```dart
static const String baseUrl = 'http://localhost:5000/api';
```

### 3. Run on Device

**Check Connected Devices:**
```bash
flutter devices
```

**Run on Specific Device:**
```bash
flutter run -d DEVICE_ID
```

**Run on Physical Device (if only one connected):**
```bash
flutter run
```

## Deploy to Physical Device via ADB

### Prerequisites
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect device via USB

### Deployment Steps

**1. Verify Device Connection:**
```bash
adb devices
```

**2. Build and Install:**
```bash
# Build debug APK
flutter build apk --debug

# Install to device
adb install build/app/outputs/flutter-apk/app-debug.apk
```

**Or simply run:**
```bash
flutter run
```

### Finding Your Computer IP Address

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your active network adapter
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# Or
hostname -I
```

**Example IP:** `192.168.1.100`

Then update the baseUrl to: `http://192.168.1.100:5000/api`

## Test Credentials

```
Email: patient1@example.com
Password: patient123
```

## Project Structure

```
lib/
├── main.dart                          # App entry point
├── providers/
│   └── auth_provider.dart            # Authentication state management
└── screens/
    ├── login_screen.dart             # Login UI
    └── home_screen.dart              # Patient dashboard
```

## API Endpoints Used

- `POST /api/auth/patient-login` - Patient authentication

Expected login request:
```json
{
  "email": "patient1@example.com",
  "password": "patient123"
}
```

Expected login response:
```json
{
  "token": "jwt_token_here",
  "patient": {
    "id": "patient_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "patient1@example.com",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }
}
```

## Troubleshooting

### Device Not Authorized
- Check device for USB debugging authorization prompt
- Tap "Always allow from this computer"
- Run: `adb kill-server && adb start-server`

### Network Error
- Ensure backend is running on port 5000
- Check firewall settings (allow port 5000)
- Verify correct IP address in baseUrl
- Test backend: `curl http://YOUR_IP:5000/api/auth/patient-login`

### Build Errors
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

### Gradle Issues
The generated project uses compatible Gradle versions. If issues persist:
- Check Java version: `java -version`
- Update Gradle wrapper if needed
- See: https://docs.flutter.dev/release/breaking-changes/gradle-version

## Building Release APK

```bash
# Build release APK
flutter build apk --release

# Install release APK
adb install build/app/outputs/flutter-apk/app-release.apk
```

## Next Steps

- [ ] Add registration screen
- [ ] Implement forgot password
- [ ] Add biometric authentication
- [ ] Fetch and display medical records
- [ ] Add appointment booking
- [ ] Implement push notifications

## Dependencies

- `provider: ^6.0.0` - State management
- `http: ^1.1.0` - HTTP requests
- `shared_preferences: ^2.2.0` - Local storage
- `flutter_svg: ^2.0.0` - SVG support

## License

Part of the Patient Health Records system.
