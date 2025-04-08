// src/utils/notifications.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';

export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging);
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Notification permission error:', error);
    return null;
  }
};

export const setupMessageListener = (callback) => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};