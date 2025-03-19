import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  BackHandler,
  View,
  Text
} from 'react-native';
import {WebView} from 'react-native-webview';
import {initializeFirebase, requestNotificationPermission} from './src/firebase';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import RNPermissions, {NotificationOption} from 'react-native-permissions';
import NetInfo from '@react-native-community/netinfo';



function App(): React.JSX.Element {
  const [isConnected, setIsConnected] = useState<boolean>(true); // État pour surveiller la connectivité
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected || false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fonction pour vérifier et envoyer le statut des permissions
  const checkAndSendPermissionsStatus = async () => {
    try {
      // Vérifier la permission de localisation
      const locationPerm = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (locationPerm) {
        const locationStatus = await check(locationPerm);
        setLocationPermission(locationStatus);
      }

      // Vérifier la permission de notification
      const notificationStatus = await RNPermissions.checkNotifications();
      setNotificationPermission(notificationStatus.status);

      // Envoyer les statuts à la WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            window.postMessage(JSON.stringify({
              type: 'PERMISSIONS_STATUS',
              permissions: {
                location: '${locationPermission}',
                notifications: '${notificationPermission}'
              }
            }), '*');
            true;
          })();
        `);
        console.log("Statut des permissions envoyé à la WebView");
        if(fcmToken) {
          webViewRef.current.injectJavaScript(`
            (function() {
              window.postMessage(JSON.stringify({
                type: 'FCM_TOKEN_AVAILABLE',
                token : '${fcmToken}'
              }), '*');
              true;
            })();
          `);
          console.log("Token FCM envoyé à la WebView : ", fcmToken);
        }
        
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des permissions:", error);
    }
  };

  // Effet pour initialiser Firebase et vérifier les permissions au démarrage
  useEffect(() => {
    const firebaseInitialized = initializeFirebase();
    
    if (firebaseInitialized) {
      const getPermissionAndToken = async () => {
        const token = await requestNotificationPermission();
        setFcmToken(token);
        await checkAndSendPermissionsStatus();
      };
      
      getPermissionAndToken();
    }

    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack(); // Navigue vers la page précédente
        return true; // Empêche la fermeture de l'application
      }
      return false; // Laisse le comportement par défaut (fermer l'application)
    };

    // Ajout du listener pour gérer l'événement retour
    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Nettoyage lors du démontage du composant
    return () => {
      //BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, []);

  // Fonction pour ouvrir l'écran système de localisation
  const openLocationSettings = async () => {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (!permission) return;

      const result = await check(permission);
      
      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        setLocationPermission(requestResult);
        
        // Envoyer le nouveau statut à la WebView
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            (function() {
              window.postMessage(JSON.stringify({
                type: 'PERMISSIONS_STATUS',
                permissions: {
                  location: '${requestResult}',
                  notifications: '${notificationPermission}'
                }
              }), '*');
              true;
            })();
          `);
        }
      } else if (result === RESULTS.BLOCKED || result === RESULTS.UNAVAILABLE) {
        Alert.alert(
          'Permission requise',
          'Veuillez activer la localisation dans les paramètres de l\'application',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Paramètres',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
    } catch (error) {
      console.error("Erreur lors de la demande de permission de localisation:", error);
    }
  };

  // Fonction pour ouvrir l'écran système de notification
  const openNotificationSettings = async () => {
    try {
      const options: NotificationOption[] = ['alert', 'badge', 'sound'];
      const response = await RNPermissions.requestNotifications(options);
      setNotificationPermission(response.status);
      
      if (response.status === RESULTS.GRANTED) {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
        }
      }
      
      // Envoyer le nouveau statut à la WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            window.postMessage(JSON.stringify({
              type: 'PERMISSIONS_STATUS',
              permissions: {
                location: '${locationPermission}',
                notifications: '${response.status}'
              }
            }), '*');
            true;
          })();
        `);
      }
    } catch (error) {
      console.error("Erreur lors de la demande de permission de notification:", error);
      Alert.alert(
        'Erreur',
        'Impossible de demander la permission de notification',
        [{text: 'OK'}],
      );
    }
  };
  
  // Gestionnaire des messages de la WebView
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("Message reçu de la WebView:", data);
      
      if (data.type === 'OPEN_PERMISSIONS') {
        if (data.permission === 'location') {
          await openLocationSettings();
        } else if (data.permission === 'notifications') {
          await openNotificationSettings();
        }
      }
      if (data.type === 'WEBVIEW_READY') {
        await checkAndSendPermissionsStatus();
      }
    } catch (error) {
      console.error("Erreur lors du traitement du message de la WebView:", error);
    }
  };

  // Effet pour envoyer le token FCM lorsqu'il est disponible
  useEffect(() => {
    if (fcmToken && webViewRef.current) {
      const tokenMessage = JSON.stringify({
        type: 'FCM_TOKEN', 
        token: fcmToken
      });
      webViewRef.current.injectJavaScript(`
        (function() {
          if (document.readyState === 'complete') {
            window.postMessage(${JSON.stringify(tokenMessage)}, '*');
          } else {
            document.addEventListener('DOMContentLoaded', function() {
              window.postMessage(${JSON.stringify(tokenMessage)}, '*');
            });
          }
          true;
        })();
      `);
      
      console.log("Token FCM envoyé à la WebView : ", fcmToken);
    }
  }, [fcmToken]);

  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {isConnected ? (
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://papadum.tereza.fr/mobileapp/home' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn("WebView error: ", nativeEvent);
          }}
        />
      ) : (
        <View style={styles.noConnectionContainer}>
          <Text style={styles.noConnectionText}>
            Vous n'êtes pas connecté à Internet. Veuillez vérifier votre connexion et réessayer.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});

export default App;
