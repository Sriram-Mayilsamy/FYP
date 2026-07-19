# Deploy Flutter App to Physical Device

Your device **CPH2487** (Android 16) is connected and ready!

## Quick Deploy (Recommended)

Simply run this command:

```bash
cd patient-health-records/patient_app
flutter run -d ee82e4ce
```

This will:
- Build the app automatically
- Install it on your device
- Launch the app
- Enable hot reload for development

## Important: Configure Backend URL

Before running, you MUST update the backend URL in the code:

**File:** `lib/providers/auth_provider.dart`

**Find your computer's IP address:**

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your Wi-Fi or Ethernet adapter.

### Update the code:

If your IP is `192.168.1.100`, change line 15 in `auth_provider.dart` from:
```dart
static const String baseUrl = 'http://10.0.2.2:5000/api';
```

To:
```dart
static const String baseUrl = 'http://192.168.1.100:5000/api';
```

**Important:** Both your computer and phone must be on the same Wi-Fi network!

## Alternative: Build APK First

If you prefer to build once and install:

```bash
# This may take 5-10 minutes on first build (downloading Gradle dependencies)
flutter build apk --debug

# Install to device
adb install build/app/outputs/flutter-apk/app-debug.apk
```

## Test the App

1. **Start your backend server** (must be running on port 5000)
2. **Deploy the app** using `flutter run -d ee82e4ce`
3. **Test login** with:
   - Email: `patient1@example.com`
   - Password: `patient123`

## Troubleshooting

### "Network Error" in app
- Backend not running: Start your Node.js backend
- Wrong IP: Update `baseUrl` in `auth_provider.dart`
- Firewall blocking: Allow port 5000 in Windows Firewall
- Different networks: Ensure phone and computer on same Wi-Fi

### Check if backend is accessible
From your computer:
```bash
curl http://localhost:5000/api/auth/patient-login
```

From your phone's browser, try:
```
http://YOUR_IP:5000
```

### Device unauthorized
- Check phone for USB debugging prompt
- Tap "Always allow from this computer"
- Run: `adb kill-server && adb devices`

### Build taking too long
- First build downloads Gradle (3-10 minutes) - be patient!
- Subsequent builds are much faster
- If stuck, press Ctrl+C and retry

## Hot Reload During Development

When running with `flutter run`:
- Press `r` to hot reload (instant UI updates)
- Press `R` to hot restart (full app restart)
- Press `q` to quit

## Backend API Requirements

Your backend must have this endpoint:

**POST** `/api/auth/patient-login`

Request body:
```json
{
  "email": "patient1@example.com",
  "password": "patient123"
}
```

Response:
```json
{
  "token": "jwt_token",
  "patient": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "patient1@example.com",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }
}
```

## Success Indicators

✅ You should see:
- Flutter compiling message
- "Installing build/app/outputs/flutter-apk/app.apk..."
- "Flutter run key commands"
- App launches on your device

✅ In the app:
- Login screen appears
- Test credentials visible
- Can type email/password
- Login button works
- Successful login shows dashboard with patient info

## Next Steps

Once working:
- Backend URL is configured
- App successfully logs in
- Dashboard displays patient information

You can now develop additional features!
