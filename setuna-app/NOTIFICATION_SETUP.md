# 🔔 Notification System Setup Guide

This guide explains how to set up and use the comprehensive notification system in your Setuna app.

## 🚀 Features

- **Push Notifications**: Real-time notifications on device
- **In-App Notifications**: Persistent notification history
- **Granular Control**: Individual settings for different notification types
- **Real-time Updates**: Live notification delivery
- **Smart Navigation**: Tap notifications to navigate to relevant screens
- **Permission Management**: Automatic permission requests
- **Cross-Platform**: Works on both iOS and Android

## 📱 Setup Requirements

### 1. Install Dependencies
```bash
npm install expo-notifications expo-device expo-constants
```

### 2. Expo Configuration
Add to your `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#B0AAD9",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 3. Get Expo Project ID
1. Go to [Expo Dashboard](https://expo.dev)
2. Create/select your project
3. Copy the Project ID
4. Update `NotificationContext.tsx` line 200:
```typescript
projectId: 'your-actual-project-id', // Replace with your Expo project ID
```

## 🔧 Backend Integration

### Required API Endpoints

#### 1. Device Registration
```
POST /api/notifications/register-device/
{
  "expo_push_token": "ExponentPushToken[...]",
  "device_type": "ios|android",
  "is_active": true
}
```

#### 2. Notification Settings
```
PUT /api/notifications/settings/
{
  "allNotifications": true,
  "pushNotifications": true,
  "jobAlerts": true,
  "newApplicants": true,
  "profileViews": true,
  "applicationUpdates": true
}
```

#### 3. Fetch Notifications
```
GET /api/notifications/
Response: Array of notification objects
```

#### 4. Mark as Read
```
PUT /api/notifications/{id}/mark-read/
```

#### 5. Mark All as Read
```
PUT /api/notifications/mark-all-read/
```

#### 6. Delete Notification
```
DELETE /api/notifications/{id}/
```

#### 7. Clear All
```
DELETE /api/notifications/clear-all/
```

## 📋 Notification Types

### 1. Job Alerts
- **Trigger**: New job postings matching user preferences
- **Data**: `jobId`, `jobTitle`, `company`
- **Navigation**: Job details screen

### 2. New Applicants
- **Trigger**: Someone applies to user's job posting
- **Data**: `applicationId`, `applicantName`, `jobTitle`
- **Navigation**: Application details screen

### 3. Profile Views
- **Trigger**: Someone views user's profile
- **Data**: `viewerId`, `viewerName`
- **Navigation**: Viewer's profile

### 4. Application Updates
- **Trigger**: Job application status changes
- **Data**: `applicationId`, `status`, `jobTitle`
- **Navigation**: Application details screen

### 5. Messages
- **Trigger**: New chat message received
- **Data**: `senderId`, `senderName`, `messagePreview`
- **Navigation**: Chat screen

### 6. General
- **Trigger**: System announcements, updates
- **Data**: Custom data
- **Navigation**: None (info only)

## 🎯 Usage Examples

### Sending Notifications

```typescript
import { notificationService } from '@/utils/notificationService';

// Job alert
await notificationService.sendJobAlert(
  'React Native Developer',
  'job-123',
  'Tech Corp'
);

// New applicant
await notificationService.sendNewApplicantNotification(
  'John Doe',
  'React Native Developer',
  'app-456'
);

// Profile view
await notificationService.sendProfileViewNotification(
  'Jane Smith',
  'user-789'
);

// Message
await notificationService.sendMessageNotification(
  'Alice Johnson',
  'Hey, are you available for a project?',
  'user-101'
);
```

### Using the Hook

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const {
    notificationSettings,
    notifications,
    unreadCount,
    updateNotificationSettings,
    markNotificationAsRead
  } = useNotifications();

  // Update settings
  const toggleJobAlerts = () => {
    updateNotificationSettings({ jobAlerts: !notificationSettings.jobAlerts });
  };

  // Mark as read
  const handleNotificationPress = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      <Switch
        value={notificationSettings.jobAlerts}
        onValueChange={toggleJobAlerts}
      />
    </View>
  );
}
```

## ⚙️ Settings Configuration

### Notification Settings Object
```typescript
interface NotificationSettings {
  allNotifications: boolean;      // Master toggle
  pushNotifications: boolean;     // Device push notifications
  jobAlerts: boolean;            // New job opportunities
  newApplicants: boolean;        // Job applications received
  profileViews: boolean;         // Profile view notifications
  applicationUpdates: boolean;   // Application status changes
}
```

### Settings Hierarchy
1. **All Notifications**: Master switch that controls everything
2. **Individual Toggles**: Fine-grained control for each type
3. **Push Notifications**: Controls device-level notifications

## 🔐 Permissions

### iOS
- Automatically requests notification permissions
- Shows permission dialog on first app launch
- User can change in iOS Settings

### Android
- Creates notification channel with high importance
- Requests permissions automatically
- User can change in Android Settings

## 🧪 Testing

### Test Notifications
1. Navigate to `/notifications` screen
2. Use the test buttons to send different notification types
3. Verify notifications appear in the list
4. Test push notifications on physical device

### Debug Mode
Enable console logging by checking the browser console or React Native debugger for:
- Permission status
- Push token generation
- Notification delivery
- API calls

## 🚨 Troubleshooting

### Common Issues

#### 1. Notifications Not Appearing
- Check if permissions are granted
- Verify Expo project ID is correct
- Ensure device is physical (not simulator)
- Check notification settings are enabled

#### 2. Push Notifications Not Working
- Verify Expo push token is generated
- Check backend endpoint is working
- Ensure `expo-notifications` is properly configured
- Test on physical device

#### 3. Settings Not Saving
- Check AsyncStorage permissions
- Verify backend API endpoints
- Check network connectivity

### Debug Steps
1. Check console logs for errors
2. Verify notification permissions
3. Test API endpoints manually
4. Check device token generation
5. Verify notification settings state

## 🔄 Real-time Updates

### Current Implementation
- Polling every 30 seconds
- WebSocket support planned for future
- Push notifications for immediate delivery

### Future Enhancements
- WebSocket connection for real-time updates
- Background notification processing
- Rich media notifications
- Notification grouping
- Custom notification sounds

## 📱 Platform-Specific Notes

### iOS
- Requires physical device for testing
- Silent notifications supported
- Rich notifications with images
- Badge count management

### Android
- Works on emulator (limited)
- Notification channels
- Custom notification sounds
- Background processing

## 🎉 Success Indicators

✅ Notifications appear in the list
✅ Push notifications show on device
✅ Settings toggle and save properly
✅ Unread count updates correctly
✅ Navigation works from notifications
✅ Test notifications function properly

## 📞 Support

If you encounter issues:
1. Check this documentation
2. Review console logs
3. Test on physical device
4. Verify backend integration
5. Check Expo configuration

---

**Happy Notifying! 🎉**
