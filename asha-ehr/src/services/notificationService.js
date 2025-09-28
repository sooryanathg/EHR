import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  // Request permissions
  requestPermissions: async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }
      
      return true;
    } else {
      console.log('Must use physical device for Push Notifications');
      return false;
    }
  },

  // Schedule a notification
  scheduleNotification: async (title, body, triggerDate, data = {}) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: triggerDate,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  },

  // Schedule visit reminder
  scheduleVisitReminder: async (patientName, visitDate, visitType) => {
    const triggerDate = new Date(visitDate);
    triggerDate.setDate(triggerDate.getDate() - 1); // Remind 1 day before
    
    const title = 'Visit Reminder';
    const body = `${patientName}'s ${visitType.toUpperCase()} visit is due tomorrow`;
    
    return await NotificationService.scheduleNotification(
      title,
      body,
      triggerDate,
      { type: 'visit_reminder', patientName, visitDate, visitType }
    );
  },

  // Schedule vaccination reminder
  scheduleVaccinationReminder: async (patientName, vaccineName, dueDate) => {
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - 1); // Remind 1 day before
    
    const title = 'Vaccination Reminder';
    const body = `${patientName}'s ${vaccineName} vaccination is due tomorrow`;
    
    return await NotificationService.scheduleNotification(
      title,
      body,
      triggerDate,
      { type: 'vaccination_reminder', patientName, vaccineName, dueDate }
    );
  },

  // Cancel notification
  cancelNotification: async (notificationId) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  },

  // Cancel all notifications
  cancelAllNotifications: async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  },

  // Get all scheduled notifications
  getAllScheduledNotifications: async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  },

  // Schedule daily sync reminder
  scheduleDailySyncReminder: async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM
    
    const title = 'Daily Sync Reminder';
    const body = 'Remember to sync your data to keep it up to date';
    
    return await NotificationService.scheduleNotification(
      title,
      body,
      tomorrow,
      { type: 'daily_sync_reminder' }
    );
  },

  // Schedule weekly summary
  scheduleWeeklySummary: async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0); // 10 AM
    
    const title = 'Weekly Summary';
    const body = 'Check your weekly patient visit summary';
    
    return await NotificationService.scheduleNotification(
      title,
      body,
      nextWeek,
      { type: 'weekly_summary' }
    );
  }
};

