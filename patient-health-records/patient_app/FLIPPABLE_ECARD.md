# Flippable E-Card Feature

## Overview
The E-Card now has flip animation that allows users to see additional information on the back of the card.

## Features

### Front of Card
- **Patient Name**: Full name prominently displayed
- **E-Card Number**: Unique card identifier in monospace font
- **Date of Birth**: Formatted in IST timezone (dd MMM yyyy format)
- **Verified Badge**: Shows verification status with shield icon
- **Tap to Flip Icon**: Visual hint in top-right corner

### Back of Card
- **Email**: Patient's email address
- **ID Type**: Government ID type (e.g., Aadhaar, PAN)
- **Hospital**: Nearby hospital name
- **Profile Visibility**: Private or Public status
- **Tap to Flip Hint**: Text hint at bottom

## Date Formatting (IST)

The date of birth is now properly formatted using Indian Standard Time (IST, UTC+5:30):

**Before:** `1990-01-01` (raw database format)
**After:** `01 Jan 1990` (formatted with IST conversion)

### Implementation
```dart
String _formatDateIST(String? dateString) {
  if (dateString == null || dateString.isEmpty) return 'N/A';
  try {
    final date = DateTime.parse(dateString);
    // Convert to IST (UTC+5:30)
    final istDate = date.toUtc().add(const Duration(hours: 5, minutes: 30));
    return DateFormat('dd MMM yyyy').format(istDate);
  } catch (e) {
    return dateString;
  }
}
```

## How to Use

### Flipping the Card
1. **Tap anywhere on the card** to flip it
2. **Smooth 3D flip animation** rotates the card 180 degrees
3. **Tap again** to flip back to the front

### Visual Cues
- Small flip icon (🔄) in top-right corner
- "Tap to flip" text on back of card
- 600ms animation duration for smooth experience

## Design Details

### Front Card Gradient
- Colors: Slate-900 → Blue-900 → Teal-900
- Direction: Top-left to bottom-right

### Back Card Gradient
- Colors: Teal-900 → Blue-900 → Slate-900 (reversed)
- Direction: Top-left to bottom-right

### Animation
- Type: 3D Y-axis rotation
- Duration: 600ms
- Curve: easeInOut
- Perspective: 0.001 for 3D effect

## Technical Implementation

### Widget Structure
```
FlippableECard (StatefulWidget)
├── AnimationController
├── Animation<double>
└── AnimatedBuilder
    ├── Transform (Y-rotation)
    └── Conditional rendering
        ├── _buildFrontCard() - When angle < π/2
        └── _buildBackCard() - When angle ≥ π/2
```

### Key Components
1. **SingleTickerProviderStateMixin**: For animation controller
2. **Matrix4.rotateY()**: 3D rotation transformation
3. **GestureDetector**: Tap detection for flip trigger
4. **Transform widget**: Apply rotation matrix

## Additional Information Displayed

### Front
- Patient Name
- E-Card Number
- Date of Birth (IST formatted)
- Verified Status

### Back
- Email Address
- Government ID Type
- Nearby Hospital
- Profile Visibility (Private/Public)

## File Location
`lib/widgets/flippable_ecard.dart`

## Dependencies
- `intl: ^0.19.0` - Date formatting
- Built-in Flutter animation APIs

## Usage in Home Screen
```dart
import '../widgets/flippable_ecard.dart';

// In build method
FlippableECard(user: user)
```

## Future Enhancements
- [ ] Add haptic feedback on flip
- [ ] Show QR code on back for scanning
- [ ] Add more patient statistics
- [ ] Customize flip direction (horizontal/vertical)
- [ ] Add spring animation effect
