import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import RNPermissions, {NotificationOption} from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {requestUserPermission, notificationListener} from '../config/firebase';

interface PermissionsScreenProps {
  onBack: () => void;
}

const PermissionsScreen: React.FC<PermissionsScreenProps> = ({onBack}) => {
  const [locationPermission, setLocationPermission] = useState<string>('');
  const [notificationPermission, setNotificationPermission] = useState<string>('');
  const [fcmToken, setFcmToken] = useState<string>('');

  useEffect(() => {
    // Initialiser les écouteurs de notification
    notificationListener();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });

      if (!permission) return;

      const result = await check(permission);
      setLocationPermission(result);

      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        setLocationPermission(requestResult);
        if (requestResult === RESULTS.GRANTED) {
          Alert.alert('Succès', 'Permission de localisation accordée');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission de localisation:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const options: NotificationOption[] = ['alert', 'badge', 'sound'];
      
      const response = await RNPermissions.requestNotifications(options);
      setNotificationPermission(response.status);
      
      if (response.status === RESULTS.GRANTED) {
        // Demander la permission Firebase
        const token = await requestUserPermission();
        if (token) {
          setFcmToken(token);
          Alert.alert('Succès', 'Permission de notification accordée');
        }
      } else if (response.status === RESULTS.DENIED) {
        Alert.alert(
          'Permission refusée',
          'Veuillez activer les notifications dans les paramètres de l\'application',
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
      console.error('Erreur lors de la demande de permission de notification:', error);
      Alert.alert(
        'Erreur',
        'Impossible de demander la permission de notification',
        [{text: 'OK'}],
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Permissions</Text>
      </View>
      
      <View style={styles.permissionSection}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        <Text style={styles.status}>
          Statut: {locationPermission || 'Non vérifié'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestLocationPermission}>
          <Text style={styles.buttonText}>Demander la permission de localisation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.permissionSection}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.status}>
          Statut: {notificationPermission || 'Non vérifié'}
        </Text>
        {fcmToken && (
          <Text style={styles.tokenText}>
            Token FCM: {fcmToken.substring(0, 20)}...
          </Text>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={requestNotificationPermission}>
          <Text style={styles.buttonText}>Demander la permission de notification</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  permissionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  tokenText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PermissionsScreen; 