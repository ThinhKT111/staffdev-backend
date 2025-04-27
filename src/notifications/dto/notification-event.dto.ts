// src/notifications/dto/notification-event.dto.ts
export enum NotificationEvents {
    NEW_NOTIFICATION = 'new_notification',
    NOTIFICATION_READ = 'notification_read',
    ALL_NOTIFICATIONS_READ = 'all_notifications_read',
    UNREAD_COUNT = 'unread_count',
    USER_STATUS_CHANGE = 'user_status_change',
    CONNECTION_ESTABLISHED = 'connection_established'
  }