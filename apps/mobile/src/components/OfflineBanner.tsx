import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncStore } from '../store/useSyncStore';

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  const pendingCount = useSyncStore(s => s.pendingCount);

  if (pendingCount === 0) {
    return null; // Don't show when fully synced
  }

  return (
    <View className="bg-status-warning px-4 py-2 flex-row items-center justify-center">
      <Text className="text-white text-sm font-medium">
        Offline - {pendingCount} changes waiting to sync
      </Text>
    </View>
  );
}
