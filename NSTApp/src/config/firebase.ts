import messaging from '@react-native-firebase/messaging';

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return await getFCMToken();
  }
  return null;
};

const getFCMToken = async () => {
  const fcmToken = await messaging().getToken();
  if (fcmToken) {
    console.log('FCM Token:', fcmToken);
    return fcmToken;
  }
  return null;
};

export const notificationListener = async () => {
  // Quand l'application est en premier plan
  messaging().onMessage(async remoteMessage => {
    console.log('Notification reçue en premier plan:', remoteMessage);
  });

  // Quand l'application est en arrière-plan
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Notification reçue en arrière-plan:', remoteMessage);
  });

  // Quand l'application est fermée
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification ouverte depuis un état fermé:', remoteMessage);
  });

  // Vérifier si l'application a été ouverte depuis une notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('Application ouverte depuis une notification:', remoteMessage);
      }
    });
}; 