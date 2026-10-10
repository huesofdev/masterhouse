import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncStore } from '../store/useSyncStore';

export function SyncBanner() {
  const { pendingCount, isSyncing } = useSyncStore();

  if (pendingCount === 0 && !isSyncing) {
    return null; // Don't show if everything is synced
  }

  return (
    <View style={[styles.container, isSyncing ? styles.syncing : styles.pending]}>
      <Text style={styles.text}>
        {isSyncing 
          ? `Syncing ${pendingCount} items to server...` 
          : `Offline - ${pendingCount} changes waiting to sync`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pending: {
    backgroundColor: '#EA580C', // Amber/Orange 600
  },
  syncing: {
    backgroundColor: '#0284C7', // Blue 600
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
