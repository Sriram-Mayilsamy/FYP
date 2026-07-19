# API Integration Fix - E-Card Data Hydration

## Problem
After login, the E-Card was showing "N/A" for all fields instead of actual patient data.

## Root Cause
1. **Incomplete Data**: The `/auth/patient-login` endpoint only returned basic user info (`id`, `email`, `role`, `ecard_number`)
2. **Field Name Mismatch**: Backend uses `snake_case` (e.g., `first_name`) but Flutter app expected `camelCase` (e.g., `firstName`)
3. **Missing Profile Call**: The app wasn't fetching the full patient profile after login

## Solution Implemented

### 1. Updated Login Flow in `auth_provider.dart`

**Before:**
```dart
// Only used data from login response
_user = data['patient'];
```

**After:**
```dart
// Step 1: Login to get token
final loginResponse = await http.post('/auth/patient-login', ...);
_token = loginResponse['token'];

// Step 2: Fetch full patient profile using token
final profileResponse = await http.get(
  '/patients/profile',
  headers: {'Authorization': 'Bearer $_token'}
);

// Step 3: Map snake_case to camelCase
_user = {
  'id': patientData['user_id'],
  'firstName': patientData['first_name'],
  'lastName': patientData['last_name'],
  'dateOfBirth': patientData['date_of_birth'],
  'ecardNumber': patientData['ecard_number'],
  // ... other fields
};
```

### 2. Updated E-Card Display

Changed from using `user['id']` to `user['ecardNumber']` for the card number display.

## API Endpoints Used

### Login Endpoint
**POST** `/api/auth/patient-login`
```json
{
  "email": "patient1@example.com",
  "password": "patient123"
}
```
**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "patient1@example.com",
    "role": "patient",
    "ecard_number": "ECARD123"
  }
}
```

### Profile Endpoint
**GET** `/api/patients/profile`
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "data": {
    "user_id": 1,
    "ecard_number": "ECARD123",
    "email": "patient1@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-01",
    "govt_id_type": "National ID",
    "govt_id_number": "1234567890",
    "nearby_hospital_name": "City Hospital",
    "profile_visibility": "private",
    "visits": [...]
  }
}
```

## Field Mapping

| Backend (snake_case) | Flutter (camelCase) | Display Location |
|---------------------|---------------------|------------------|
| `first_name` | `firstName` | E-Card, User Info |
| `last_name` | `lastName` | E-Card, User Info |
| `date_of_birth` | `dateOfBirth` | E-Card DOB |
| `ecard_number` | `ecardNumber` | E-Card Number |
| `email` | `email` | User Info |
| `govt_id_number` | `phoneNumber` | User Info (temp) |
| `profile_visibility` | `profileVisibility` | Internal |

## Testing

After the fix, the E-Card should display:
- ✅ Patient full name (e.g., "John Doe")
- ✅ E-Card number (e.g., "ECARD123")
- ✅ Date of birth (e.g., "1990-01-01")
- ✅ Verified badge with green color

## Notes

- The app now makes 2 API calls on login (login + profile)
- Token is stored before fetching profile
- Phone number is temporarily mapped to `govt_id_number` (can be updated if separate phone field added)
- All data is cached in SharedPreferences for persistent login
