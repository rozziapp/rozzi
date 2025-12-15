import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/utils/api';

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
  type: 'job_alert' | 'new_applicant' | 'profile_view' | 'application_update' | 'message' | 'general';
  isRead: boolean;
  timestamp: Date;
  senderId?: string;
  jobId?: string;
  applicationId?: string;
}

interface NotificationContextType {
  // State
  notificationSettings: NotificationSettings;
  notifications: NotificationItem[];
  unreadCount: number;
  
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

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load saved notification settings
  useEffect(() => {
    console.log('🔔 NotificationContext: Loading settings and notifications...');
    loadNotificationSettings();
    loadNotifications();
  }, []);

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
      await API.put(`/notifications/${notificationId}/mark-read/`);
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
        const fetchedNotifications = response.data.map((notification: any) => ({
          id: notification.id.toString(),
          title: notification.title || 'Notification',
          body: notification.message || notification.body || '',
          data: notification.data || {},
          type: notification.type || 'general',
          isRead: notification.is_read || false,
          timestamp: new Date(notification.created_at || Date.now()),
          senderId: notification.sender_id,
          jobId: notification.job_id,
          applicationId: notification.application_id,
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
