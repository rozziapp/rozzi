import { useNotifications } from '@/contexts/NotificationContext';

// Notification types for different app events
export interface NotificationData {
  type: 'job_alert' | 'new_applicant' | 'profile_view' | 'application_update' | 'message' | 'general';
  title: string;
  body: string;
  data?: {
    jobId?: string;
    applicationId?: string;
    senderId?: string;
    [key: string]: any;
  };
}

// Notification service class
export class NotificationService {
  private static instance: NotificationService;
  private notificationContext: any = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setContext(context: any) {
    this.notificationContext = context;
  }

  // Send a notification
  async sendNotification(notificationData: NotificationData): Promise<void> {
    if (!this.notificationContext) {
      console.warn('Notification context not set');
      return;
    }

    try {
      // Validate notification data
      if (!notificationData.title || !notificationData.body) {
        console.warn('Invalid notification data: missing title or body');
        return;
      }

      // Add notification to local state using context method
      try {
        this.notificationContext.addLocalNotification({
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          type: notificationData.type,
          isRead: false,
          senderId: notificationData.data?.senderId,
          jobId: notificationData.data?.jobId,
          applicationId: notificationData.data?.applicationId,
        });
        
        console.log('✅ Notification added successfully:', notificationData.title);
      } catch (localError) {
        console.error('Failed to add local notification:', localError);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Job-related notifications
  async sendJobAlert(jobTitle: string, jobId: string, company?: string): Promise<void> {
    await this.sendNotification({
      type: 'job_alert',
      title: 'New Job Opportunity',
      body: `${company ? company + ' - ' : ''}${jobTitle}`,
      data: { jobId }
    });
  }

  async sendNewApplicantNotification(applicantName: string, jobTitle: string, applicationId: string): Promise<void> {
    await this.sendNotification({
      type: 'new_applicant',
      title: 'New Job Application',
      body: `${applicantName} applied for ${jobTitle}`,
      data: { applicationId, jobTitle }
    });
  }

  async sendApplicationUpdateNotification(status: string, jobTitle: string, applicationId: string): Promise<void> {
    await this.sendNotification({
      type: 'application_update',
      title: 'Application Update',
      body: `Your application for ${jobTitle} has been ${status.toLowerCase()}`,
      data: { applicationId, jobTitle, status }
    });
  }

  // Profile-related notifications
  async sendProfileViewNotification(viewerName: string, viewerId: string): Promise<void> {
    await this.sendNotification({
      type: 'profile_view',
      title: 'Profile Viewed',
      body: `${viewerName} viewed your profile`,
      data: { senderId: viewerId }
    });
  }

  // Message notifications
  async sendMessageNotification(senderName: string, messagePreview: string, senderId: string): Promise<void> {
    await this.sendNotification({
      type: 'message',
      title: `Message from ${senderName}`,
      body: messagePreview,
      data: { senderId }
    });
  }

  // General notifications
  async sendGeneralNotification(title: string, body: string, data?: any): Promise<void> {
    await this.sendNotification({
      type: 'general',
      title,
      body,
      data
    });
  }
}

// Hook to use notification service
export const useNotificationService = () => {
  const notificationContext = useNotifications();
  const service = NotificationService.getInstance();
  service.setContext(notificationContext);
  return service;
};

// Export singleton instance
export const notificationService = NotificationService.getInstance();
