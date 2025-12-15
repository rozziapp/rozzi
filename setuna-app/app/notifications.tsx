import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFonts } from '@/hooks/fonts';
import { router } from 'expo-router';
import { useNotifications, NotificationItem } from '@/contexts/NotificationContext';
import { useBackHandler } from '@/hooks/useBackHandler';

export default function NotificationsScreen() {
  const [fontsLoaded] = useCustomFonts();
  const [refreshing, setRefreshing] = useState(false);
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    fetchNotifications,
  } = useNotifications();

  // Safety check for notifications array
  const safeNotifications = notifications || [];
  const safeUnreadCount = unreadCount || 0;

  // Handle back button
  useBackHandler({
    targetRoute: '/settings'
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'job_alert' && notification.jobId) {
      router.push(`/job-details/${notification.jobId}` as any);
    } else if (notification.type === 'new_applicant' && notification.applicationId) {
      router.push(`/job-application/${notification.applicationId}` as any);
    } else if (notification.type === 'message' && notification.senderId) {
      router.push(`/chat/${notification.senderId}` as any);
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All Read', onPress: markAllNotificationsAsRead },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAllNotifications },
      ]
    );
  };

  const handleDeleteNotification = (notification: NotificationItem) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(notification.id) },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_alert':
        return 'briefcase-outline';
      case 'new_applicant':
        return 'people-outline';
      case 'profile_view':
        return 'eye-outline';
      case 'application_update':
        return 'refresh-outline';
      case 'message':
        return 'chatbubble-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job_alert':
        return '#3b82f6';
      case 'new_applicant':
        return '#10b981';
      case 'profile_view':
        return '#8b5cf6';
      case 'application_update':
        return '#f59e0b';
      case 'message':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const renderNotification = (notification: NotificationItem) => {
    // Safety check for required fields
    if (!notification || !notification.id || !notification.title) {
      console.warn('Invalid notification data:', notification);
      return null;
    }

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          !notification.isRead && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          <Ionicons
            name={getNotificationIcon(notification.type) as any}
            size={20}
            color={getNotificationColor(notification.type)}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !notification.isRead && styles.unreadTitle
          ]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimestamp(notification.timestamp)}
          </Text>
        </View>
        <View style={styles.notificationActions}>
          {!notification.isRead && (
            <View style={styles.unreadIndicator} />
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(notification)}
          >
            <Ionicons name="close-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
                 </View>
       </View>
     </TouchableOpacity>
   );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.topBarActions}>
          {safeUnreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllReadButton}
              onPress={handleMarkAllRead}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#6b46c1" />
            </TouchableOpacity>
          )}
          {safeNotifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {safeNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateSubtitle}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {safeNotifications
              .filter(notification => notification && notification.id) // Filter out invalid notifications
              .map(renderNotification)
              .filter(Boolean)} {/* Filter out null returns */}
          </View>
        )}
      </ScrollView>

      {/* Unread Count Badge */}
              {safeUnreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{safeUnreadCount}</Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B0AAD9',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#B0AAD9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearAllButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderLeftWidth: 4,
    borderLeftColor: '#6b46c1',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationActions: {
    alignItems: 'center',
    gap: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b46c1',
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  unreadBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 40,
    right: 16,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

