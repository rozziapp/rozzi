# Back Button Navigation Guide

## Overview

This guide explains how back button navigation works in the Rozzi app using expo-router and React Native's BackHandler.

## Implementation Details

### 1. Global Back Handler (`_layout.tsx`)

The main back button logic is implemented in `app/_layout.tsx`:

```typescript
// Root tab screens - prevent app exit, minimize instead
if (pathname === '/(tabs)' || pathname === '/' || pathname.includes('index')) {
  if (Platform.OS === 'android') {
    // Minimize app instead of exiting
    BackHandler.exitApp();
    return true;
  }
  // On iOS, do nothing (natural behavior)
  return true;
}

// Nested screens - navigate back properly
if (pathname.includes('my-profile')) {
  router.replace('/(tabs)');
  return true;
}

if (pathname.includes('applied-jobs')) {
  router.replace('/my-profile');
  return true;
}
```

### 2. Custom Hook (`useBackHandler`)

A reusable hook for custom back button behavior:

```typescript
// Basic usage - go back to previous screen
useBackHandler();

// Navigate to specific route
useBackHandler({
  targetRoute: '/(tabs)'
});

// Custom handler with confirmation
useBackHandler({
  onBackPress: () => {
    if (isEditing) {
      Alert.alert('Discard Changes?', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => setIsEditing(false) }
      ]);
      return true; // Prevent default
    }
    return false; // Allow default
  }
});

// Prevent back navigation entirely
useBackHandler({
  preventDefault: true
});
```

## Navigation Flow

### Root Screens (Tab Navigation)
- **Home** (`/(tabs)`) → Minimize app (Android) / Do nothing (iOS)
- **Post** → Navigate to Home
- **Inbox** → Minimize app (Android) / Do nothing (iOS)
- **My Profile** → Navigate to Home

### Nested Screens
- **Applied Jobs** → My Profile
- **Posted Jobs** → My Profile
- **Resume** → My Profile
- **Subscription** → My Profile
- **Job Seeking** → My Profile
- **Job Seeking Detail** → Previous screen
- **User Profile** → Previous screen

### Special Cases

#### Edit Mode (My Profile)
When editing profile, back button shows confirmation dialog:
```typescript
const handleBackPress = () => {
  if (isEditing) {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => {
            setIsEditing(false);
            // Reset changes
          }
        },
      ]
    );
    return true;
  }
  return false;
};
```

## Platform-Specific Behavior

### Android
- **Root screens**: Minimize app instead of exiting
- **Nested screens**: Navigate back properly
- **Hardware back button**: Handled by BackHandler

### iOS
- **Root screens**: Natural behavior (no action)
- **Nested screens**: Navigate back properly
- **Swipe gesture**: Disabled (gestureEnabled: false)

## Screen Configuration

### Stack Configuration
```typescript
<Stack
  screenOptions={{
    animation: 'none',           // No transitions
    gestureEnabled: false,       // Disable swipe gestures
    gestureDirection: 'horizontal',
  }}
>
```

### Screen Registration
```typescript
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
<Stack.Screen name="my-profile" options={{ headerShown: false }} />
<Stack.Screen name="applied-jobs" options={{ headerShown: false }} />
<Stack.Screen name="posted-jobs" options={{ headerShown: false }} />
<Stack.Screen name="resume" options={{ headerShown: false }} />
<Stack.Screen name="subscription" options={{ headerShown: false }} />
<Stack.Screen name="job-seeking" options={{ headerShown: false }} />
<Stack.Screen name="job-seeking-detail" options={{ headerShown: false }} />
```

## Usage Examples

### 1. Simple Back Navigation
```typescript
// In any screen component
import { useBackHandler } from '@/hooks/useBackHandler';

export default function MyScreen() {
  useBackHandler(); // Uses default back behavior
  return <View>...</View>;
}
```

### 2. Navigate to Specific Route
```typescript
// Navigate to home when back is pressed
useBackHandler({
  targetRoute: '/(tabs)'
});
```

### 3. Custom Handler with Confirmation
```typescript
// Show confirmation before going back
useBackHandler({
  onBackPress: () => {
    Alert.alert('Leave Screen?', 'Unsaved changes will be lost', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() }
    ]);
    return true; // Prevent default
  }
});
```

### 4. Prevent Back Navigation
```typescript
// Prevent back navigation entirely
useBackHandler({
  preventDefault: true
});
```

## Key Features

✅ **No transition animations** - Instant navigation  
✅ **Platform-specific behavior** - Android vs iOS  
✅ **Prevents accidental app exit** - Minimizes instead  
✅ **Proper navigation hierarchy** - Follows app structure  
✅ **Custom confirmation dialogs** - For edit modes  
✅ **Reusable hook** - Easy to implement in any screen  

## Testing

### Test Scenarios
1. **Root screens**: Press back → Should minimize (Android) or do nothing (iOS)
2. **Nested screens**: Press back → Should navigate to parent screen
3. **Edit mode**: Press back → Should show confirmation dialog
4. **Deep navigation**: Should navigate back one level at a time

### Platform Testing
- **Android**: Test hardware back button
- **iOS**: Test swipe gestures (should be disabled)
- **Both**: Test navigation flow and confirmations 