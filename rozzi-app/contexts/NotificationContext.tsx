import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import API from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

// Detect if running in Expo Go (push notifications removed in SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Safely import expo-notifications — crashes in Expo Go SDK 53
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('⚠️ expo-notifications not available (Expo Go SDK 53+)');
}

// Configure how notifications are handled when the app is in the foreground
try {
  if (Notifications && !isExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.warn('⚠️ Could not set notification handler:', e);
}

export interface NotificationSettings {
  allNotifications: boolean;
  pushNotifications: boolean;
  jobAlerts: boolean;
  newApplicants: boolean;
  profileViews: boolean;
  applicationUpdates: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: any;
  type: 'job_applied' | 'job_hired' | 'job_rejected' | 'hire_request' | 'hire_accepted' | 'hire_rejected' | 'follow' | 'application_status' | 'message' | 'general';
  isRead: boolean;
  timestamp: Date;
  senderId?: string;
  jobId?: string;
  applicationId?: string;
  hireRequestId?: string;
}

interface NotificationContextType {
  // State
  notificationSettings: NotificationSettings;
  notifications: NotificationItem[];
  unreadCount: number;
  expoPushToken: string | null;
  
  // Actions
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  
  // Local notifications
  addLocalNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  
  // Real-time notifications
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

const defaultSettings: NotificationSettings = {
  allNotifications: true,
  pushNotifications: true,
  jobAlerts: true,
  newApplicants: true,
  profileViews: true,
  applicationUpdates: true,
};

// ── Helper: Register for push notifications ─────────────────────────
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications || isExpoGo) {
    console.log('⚠️ Push notifications not available in Expo Go (SDK 53+)');
    return null;
  }

  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }

  if (!Device.isDevice) {
    console.log('⚠️ Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Push notification permission not granted');
    return null;
  }

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: 'ae305170-1635-4c09-a9f2-abdf2a0f0bd8',
    });
    token = pushToken.data;
    console.log('📲 Expo Push Token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Refs for notification listeners
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // ── Push token registration ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupPush = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        // Register on backend
        try {
          await API.post('/notifications/register-device/', {
            token,
            device_type: Platform.OS,
          });
          console.log('✅ Push token registered on backend');
        } catch (err) {
          console.error('Error registering push token:', err);
        }
      }
    };

    setupPush();

    // Cleanup: unregister token when user logs out
    return () => {
      if (expoPushToken) {
        API.post('/notifications/unregister-device/', { token: expoPushToken }).catch(() => {});
      }
    };
  }, [isAuthenticated]);

  // ── Foreground notification listener ─────────────────────────────
  useEffect(() => {
    // Skip if Notifications not available (Expo Go SDK 53+)
    if (!Notifications || isExpoGo) return;

    // Incoming notification while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Foreground notification:', notification);
      const data = notification.request.content.data as any;

      // Add it to local list so the UI updates instantly
      if (data) {
        const newItem: NotificationItem = {
          id: data.id || Date.now().toString(),
          title: notification.request.content.title || 'Notification',
          body: notification.request.content.body || '',
          data,
          type: data.type || 'general',
          isRead: false,
          timestamp: new Date(),
          senderId: data.senderId,
          jobId: data.jobId,
          applicationId: data.applicationId,
          hireRequestId: data.hireRequestId,
        };

        setNotifications((prev) => [newItem, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }

      // Also refresh from backend to keep in sync
      fetchNotifications();
    });

    // User tapped a notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data as any;

      if (data) {
        handleNotificationNavigation(data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // ── Navigation handler when a push notification is tapped ────────
  const handleNotificationNavigation = (data: any) => {
    try {
      const type = data.type;

      if (type === 'message' && data.conversationId) {
        router.push(`/chat?conversationId=${data.conversationId}&userId=${data.senderId || ''}` as any);
      } else if (
        (type === 'job_applied' || type === 'job_hired' || type === 'job_rejected' || type === 'application_status') &&
        data.jobId
      ) {
        router.push(`/job-details?jobId=${data.jobId}` as any);
      } else if (
        (type === 'hire_request' || type === 'hire_accepted' || type === 'hire_rejected') &&
        data.jobId
      ) {
        router.push(`/job-details?jobId=${data.jobId}` as any);
      } else if (type === 'follow' && data.senderId) {
        router.push(`/user-profile?userId=${data.senderId}` as any);
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  };

  // Load saved notification settings
  useEffect(() => {
    console.log('🔔 NotificationContext: Loading settings and notifications...');
    loadNotificationSettings();
    loadNotifications();
  }, []);

  // Fetch notifications from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const loadNotificationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setNotificationSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Fallback to default settings
    }
  };

  const loadNotifications = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: NotificationItem) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const saveNotifications = async (notifs: NotificationItem[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(notifs));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      const newSettings = { ...notificationSettings, ...settings };
      setNotificationSettings(newSettings);
      await saveNotificationSettings(newSettings);
      
      // Update backend settings if available
      try {
        await API.put('/notifications/settings/', newSettings);
      } catch (error) {
        console.error('Error updating backend notification settings:', error);
        // Don't revert local changes if backend fails
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert local changes if local save fails
      setNotificationSettings(notificationSettings);
    }
  };

  const addLocalNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Save to AsyncStorage
    saveNotifications([newNotification, ...notifications]);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    
    setNotifications(updatedNotifications);
    setUnreadCount(prev => Math.max(0, prev - 1));
    await saveNotifications(updatedNotifications);
    
    // Update backend if available
    try {
      await API.put(`/notifications/${notificationId}/`, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      isRead: true,
    }));
    
    setNotifications(updatedNotifications);
    setUnreadCount(0);
    await saveNotifications(updatedNotifications);
    
    // Update backend if available
    try {
      await API.put('/notifications/mark-all-read/');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const updatedNotifications = notifications.filter(
      notification => notification.id !== notificationId
    );
    
    setNotifications(updatedNotifications);
    setUnreadCount(prev => {
      const deletedNotification = notifications.find(n => n.id === notificationId);
      return deletedNotification && !deletedNotification.isRead ? prev - 1 : prev;
    });
    await saveNotifications(updatedNotifications);
    
    // Update backend if available
    try {
      await API.delete(`/notifications/${notificationId}/`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    await saveNotifications([]);
    
    // Update backend if available
    try {
      await API.delete('/notifications/clear-all/');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await API.get('/notifications/');
      if (response.status === 200) {
        const data = Array.isArray(response.data) ? response.data : (response.data?.results || []);
        const fetchedNotifications: NotificationItem[] = data.map((notification: any) => ({
          id: notification.id?.toString() || Date.now().toString(),
          title: notification.title || 'Notification',
          body: notification.message || '',
          data: {
            jobId: notification.related_job?.id?.toString() || '',
            applicationId: notification.related_application?.id?.toString() || '',
            hireRequestId: notification.related_hire_request?.id?.toString() || '',
            senderId: notification.sender?.id?.toString() || '',
          },
          type: notification.notification_type || 'general',
          isRead: notification.read || false,
          timestamp: new Date(notification.created_at || Date.now()),
          senderId: notification.sender?.id?.toString(),
          jobId: notification.related_job?.id?.toString(),
          applicationId: notification.related_application?.id?.toString(),
          hireRequestId: notification.related_hire_request?.id?.toString(),
        }));
        
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter((n: NotificationItem) => !n.isRead).length);
        await saveNotifications(fetchedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If backend fails, try to load from local storage
      try {
        await loadNotifications();
      } catch (localError) {
        console.error('Error loading local notifications:', localError);
      }
    }
  };

  const value: NotificationContextType = {
    notificationSettings,
    notifications,
    unreadCount,
    expoPushToken,
    updateNotificationSettings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    addLocalNotification,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
