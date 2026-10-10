import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../db';
import { tripRoutes } from '../db/schema';
import * as Crypto from 'expo-crypto';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    // Check if trip is in progress
    try {
      const storeStr = await AsyncStorage.getItem('masterh-trip-store');
      if (storeStr) {
        const parsed = JSON.parse(storeStr);
        const state = parsed?.state;
        if (state?.activeTripId && state?.tripStatus === 'IN_PROGRESS') {
          const tripId = state.activeTripId;
          
          for (const loc of locations) {
            await db.insert(tripRoutes).values({
              id: Crypto.randomUUID(),
              tripId,
              gpsLat: loc.coords.latitude,
              gpsLng: loc.coords.longitude,
              timestamp: new Date(loc.timestamp),
              isSynced: false
            });
          }
        }
      }
    } catch (e) {
      console.warn("Error saving background location:", e);
    }
  }
});

export const startLocationTracking = async () => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;
    
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50, // Save coordinate every 50 meters
      deferredUpdatesInterval: 1000 * 60 * 2, // Process updates every 2 mins
      deferredUpdatesDistance: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Active Trip Tracking",
        notificationBody: "Master House is tracking your trip route.",
        notificationColor: "#208AEF",
      }
    });
  } catch (err) {
    console.warn("Failed to start location tracking:", err);
  }
};

export const stopLocationTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn("Failed to stop location tracking:", err);
  }
};
