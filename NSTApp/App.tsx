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
  Text,
  Dimensions
} from 'react-native';
import {WebView} from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import NetInfo from '@react-native-community/netinfo';
import Geolocation from '@react-native-community/geolocation';
import config from './src/config/config'; // Importer le fichier de configuration


// Fonction pour initialiser Firebase
const initializeFirebase = () => {
  try {
    getApp(); // Initialise Firebase
    return true;
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase:", error);
    return false;
  }
};

// Fonction pour demander les permissions de notification
const requestNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        return fcmToken;
      }
    }
  } catch (error) {
    console.error("Erreur lors de la demande de permission de notification:", error);
  }
  return null;
};

function App(): React.JSX.Element {
  const [isConnected, setIsConnected] = useState<boolean>(true);
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


  // Ajoutez cette logique dans le `useEffect` principal
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (!event.url) return;
      
      //Alert.alert("URL reçue : ", event.url);
      console.log("URL reçue : ", event.url);
      
  
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            window.location.href = '${event.url}';
          })();
        `);
      }
    };
  
    // Écoute les liens ouverts lorsque l'application est en cours d'exécution
    const subscription = Linking.addEventListener('url', handleDeepLink);
  
    // Vérifie si l'application a été ouverte avec un lien au démarrage
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleDeepLink({ url });
        }
      })
      .catch(err => console.error("Erreur lors de la récupération de l'URL initiale", err));
  
    return () => {
      subscription.remove(); // Utilisez remove() au lieu de removeEventListener
    };
  }, []);

  const checkAndSendPermissionsStatus = async () => {
    try {
      const locationPerm = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (locationPerm) {
        const locationStatus = await check(locationPerm);
        setLocationPermission(locationStatus);
      }

      const notificationStatus = await messaging().hasPermission();
      setNotificationPermission(notificationStatus ? 'granted' : 'denied');

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
        requestLocation();
        if (fcmToken) {
          webViewRef.current.injectJavaScript(`
            (function() {
              window.postMessage(JSON.stringify({
                type: 'FCM_TOKEN_AVAILABLE',
                token: '${fcmToken}'
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
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, []);

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

  const openNotificationSettings = async () => {
    console.log("Opening Notifications Settings");
    try {
      // Demande la permission pour les notifications
      const response = await messaging().requestPermission();
      // Détermine si la permission est accordée ou non
      setNotificationPermission(response === messaging.AuthorizationStatus.AUTHORIZED ? 'granted' : 'denied');
  
      if (response === messaging.AuthorizationStatus.AUTHORIZED) {
        // Si l'utilisateur a autorisé les notifications, on peut demander un token
        const token = await messaging().getToken();
        if (token) {
          setFcmToken(token);
        }
      } else {
        if (Platform.OS === 'ios') {
          Linking.openURL('app-settings:');
        }
      }
  
      // Injection dans le WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            window.postMessage(JSON.stringify({
              type: 'PERMISSIONS_STATUS',
              permissions: {
                location: '${locationPermission}',
                notifications: '${response === messaging.AuthorizationStatus.AUTHORIZED ? 'granted' : 'denied'}'
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
        [{ text: 'OK' }],
      );
    }
  };
  
  const requestLocation = async () => {
    try {
      const locationPerm = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (locationPerm) {
        const status = await check(locationPerm);
        if (status === RESULTS.GRANTED) {
          Geolocation.getCurrentPosition(
            (position) => {
              console.log('Position GPS obtenue:', position);
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  (function() {
                    window.postMessage(JSON.stringify({
                      type: 'LOCATION_UPDATE',
                      location: {
                        latitude: ${position.coords.latitude},
                        longitude: ${position.coords.longitude}
                      }
                    }), '*');
                    true;
                  })();
                `);
              }
            },
            (error) => {
              console.error('Erreur lors de la récupération de la position GPS:', error);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
          );
        } else if (status === RESULTS.DENIED) {
          //const result = await request(locationPerm);
          //if (result === RESULTS.GRANTED) {
          //  requestLocation();
          //}
        }
      }
    } catch (error) {
      console.error('Erreur lors de la demande de position GPS:', error);
    }
  }


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
        await refreshFcmToken();
        await checkAndSendPermissionsStatus();
      }

      if (data.type === 'GET_LOCATION') {
        await requestLocation();
      }
    } catch (error) {
      console.error("Erreur lors du traitement du message de la WebView:", error);
    }
  };

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

  const refreshFcmToken = async () => {
    const token = await requestNotificationPermission();
    setFcmToken(token);
    await checkAndSendPermissionsStatus();
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {isConnected ? (
        <WebView
          ref={webViewRef}
          source={{ uri: config.BASE_URL }}
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
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height
  },
  webview: {
    flex: 1,
  },
});

export default App;
