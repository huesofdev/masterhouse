import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TripState {
  activeTripId: string | null;
  activeRouteId: string | null;
  tripType: 'SALE' | 'COLLECTION' | 'BOTH' | null;
  tripStatus: 'DEPARTED' | 'IN_PROGRESS' | 'RECONCILING' | null;
  setTrip: (tripId: string, routeId: string, type: 'SALE' | 'COLLECTION' | 'BOTH', status: 'DEPARTED' | 'IN_PROGRESS' | 'RECONCILING') => void;
  updateTripStatus: (status: 'IN_PROGRESS' | 'RECONCILING') => void;
  endTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      activeTripId: null,
      activeRouteId: null,
      tripType: null,
      tripStatus: null,
      setTrip: (activeTripId, activeRouteId, tripType, tripStatus) => 
        set({ activeTripId, activeRouteId, tripType, tripStatus }),
      updateTripStatus: (tripStatus) => set({ tripStatus }),
      endTrip: () => set({ activeTripId: null, activeRouteId: null, tripType: null, tripStatus: null }),
    }),
    {
      name: 'masterh-trip-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
