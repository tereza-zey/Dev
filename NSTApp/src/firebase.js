import { initializeApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

// Initialiser Firebase
const firebaseConfig = {
  // Vos configurations Firebase sont automatiquement lues depuis le fichier google-services.json
};

// Initialiser l'application Firebase
const initializeFirebase = () => {
  try {
    initializeApp();
    console.log('Firebase a été initialisé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase:', error);
    return false;
  }
};

// Demander les permissions pour les notifications (iOS uniquement, Android ne nécessite pas de permission)
const requestNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Autorisation de notification:', 'Autorisé');
      const token = await messaging().getToken();
      console.log('======== FCM TOKEN ========');
      console.log(token);
      console.log('===========================');
      return token;
    } else {
      console.log('Autorisation de notification:', 'Refusé');
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la demande de permission de notification:', error);
    return null;
  }
};

// Configurer le gestionnaire de notifications en arrière-plan
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message reçu en arrière-plan:', remoteMessage);
});

export { initializeFirebase, requestNotificationPermission }; 