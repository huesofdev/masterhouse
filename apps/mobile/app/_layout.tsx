import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';
import { SyncBanner } from '../src/components/SyncBanner';
import { PermissionGate } from '../src/components/PermissionGate';
import { useCatalogSync } from '../src/hooks/useCatalogSync';
import { useAuthStore } from '../src/store/useAuthStore';
import { useBranchStore } from '../src/store/useBranchStore';
import { apiClient } from '../src/lib/api';
import '../global.css';

export default function RootLayout() {
  useCatalogSync();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { syncEngine } = await import('../src/db/sync');
        syncEngine.start(15000);
        cleanup = () => syncEngine.stop();
        console.log('SyncEngine started successfully');
      } catch (e) {
        console.warn('SyncEngine failed to start:', e);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const { token, updateUser, logout } = useAuthStore.getState();
        if (!token) return;

        try {
          const res = await apiClient.get('/auth/me');
          if (res.data?.success && res.data?.user) {
            updateUser(res.data.user);
            
            const activeBranchId = useBranchStore.getState().activeBranchId;
            const validBranches = res.data.user.branch_ids || [];
            if (!validBranches.includes(activeBranchId)) {
               useBranchStore.getState().setActiveBranchId(validBranches[0] || null);
            }
          }
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log("Auto-logout due to 401/403 on background sync");
            logout();
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <SafeAreaView style={{ backgroundColor: '#000' }} />
      <SyncBanner />
      <PermissionGate>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(pos)" options={{ headerShown: false }} />
        </Stack>
      </PermissionGate>
    </>
  );
}
