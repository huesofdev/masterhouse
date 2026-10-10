import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as Linking from 'expo-linking';

const C = {
  bg: '#000000',
  card: '#111111',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#10B981',
};

interface PermissionGateProps {
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isGpsEnabled, setIsGpsEnabled] = useState(false);

  const checkPermissions = async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      // Check Location Services (GPS) Enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      setIsGpsEnabled(locationEnabled);

      // Check Location Permissions
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus === 'granted');

      // Check Camera Permissions
      const { status: cameraStatus } = await Camera.getCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');
    } catch (e) {
      console.warn('Error checking permissions:', e);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkPermissions(true);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermissions(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const requestLocation = async () => {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(status === 'granted');
    if (status !== 'granted' && !canAskAgain) {
      alert('Location permission is permanently denied. Please enable it in Settings.');
      Linking.openSettings();
    }
  };

  const requestCamera = async () => {
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status !== 'granted' && !canAskAgain) {
      alert('Camera permission is permanently denied. Please enable it in Settings.');
      Linking.openSettings();
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={{ color: C.text, marginTop: 16 }}>Checking permissions...</Text>
      </View>
    );
  }

  const allGood = hasLocationPermission && hasCameraPermission && isGpsEnabled;

  if (allGood) {
    return <>{children}</>;
  }

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.title}>Action Required</Text>
        <Text style={s.subtitle}>This app requires GPS and Camera access to function. You cannot proceed without these permissions.</Text>

        <View style={s.reqContainer}>
          <View style={s.reqRow}>
            <View style={[s.dot, isGpsEnabled ? s.dotGreen : s.dotRed]} />
            <Text style={s.reqText}>GPS / Location Services Enabled</Text>
          </View>
          {!isGpsEnabled && (
            <TouchableOpacity style={s.btn} onPress={openSettings}>
              <Text style={s.btnText}>Enable GPS in Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.reqContainer}>
          <View style={s.reqRow}>
            <View style={[s.dot, hasLocationPermission ? s.dotGreen : s.dotRed]} />
            <Text style={s.reqText}>Location Permission</Text>
          </View>
          {!hasLocationPermission && (
            <TouchableOpacity style={s.btn} onPress={requestLocation}>
              <Text style={s.btnText}>Grant Location Access</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.reqContainer}>
          <View style={s.reqRow}>
            <View style={[s.dot, hasCameraPermission ? s.dotGreen : s.dotRed]} />
            <Text style={s.reqText}>Camera Permission</Text>
          </View>
          {!hasCameraPermission && (
            <TouchableOpacity style={s.btn} onPress={requestCamera}>
              <Text style={s.btnText}>Grant Camera Access</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.card,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  reqContainer: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dotRed: {
    backgroundColor: C.red,
  },
  dotGreen: {
    backgroundColor: C.green,
  },
  reqText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: C.blue,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
