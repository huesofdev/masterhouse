import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Network from 'expo-network';
import { db } from '../../src/db';
import { syncQueue, syncErrors } from '../../src/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { useSyncStore } from '../../src/store/useSyncStore';
import { apiClient } from '../../src/lib/api';

const toCamel = (str: string) => {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

const mapKeysToCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToCamel);
  return Object.keys(obj).reduce((acc, key) => {
    acc[toCamel(key)] = mapKeysToCamel(obj[key]);
    return acc;
  }, {} as any);
};

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  white: '#F8FAFC', gray: '#9CA3AF', green: '#059669', red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.15)', blue: '#3B82F6'
};

export default function SyncStatus() {
  const [queue, setQueue] = useState<any[]>([]);
  const { isSyncing } = useSyncStore();
  const [payloadModal, setPayloadModal] = useState<{ visible: boolean; item: any | null }>({ visible: false, item: null });
  
  const loadQueue = async () => {
    try {
      const data = await db.select().from(syncQueue).orderBy(desc(syncQueue.createdAt));
      setQueue(data);
    } catch (e) {
      console.error('Failed to load sync queue', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueue();
    // Poll the DB while on this screen
    const interval = setInterval(loadQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  const handleForceSync = async () => {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      alert("You are currently offline. Cannot force sync.");
      return;
    }
    const { syncEngine } = await import('../../src/db/sync');
    await syncEngine.forceSync();
    loadQueue();
  };

  const clearFailed = async () => {
    const failedItems = await db.select().from(syncQueue).where(eq(syncQueue.status, 'failed'));
    if (failedItems.length === 0) return;

    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      Alert.alert(
        "Cannot Clear Offline",
        "You are currently offline. Connect to the internet so failed items can be reported to the administrator dashboard before clearing."
      );
      return;
    }

    const confirmedIds: string[] = [];
    const failedToConfirmCount = { value: 0 };

    for (const item of failedItems) {
      try {
        await apiClient.post('/sync/log-conflict', {
          type: item.operation,
          payload: JSON.parse(item.payload),
          errorMessage: item.error || 'Unknown failure'
        });
        confirmedIds.push(item.id);
      } catch (e) {
        console.warn(`[ClearFailed] Server did not confirm log for item ${item.id} — keeping in queue.`, e);
        failedToConfirmCount.value++;
      }
    }

    if (confirmedIds.length > 0) {
      await proceedWithClear(confirmedIds);
    }

    if (failedToConfirmCount.value > 0) {
      Alert.alert(
        "Partially Cleared",
        `${confirmedIds.length} item(s) confirmed and cleared.\n${failedToConfirmCount.value} item(s) could not be confirmed by the server and remain in the queue. Please try again when the server is available.`
      );
    }
  };

  const proceedWithClear = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.transaction(async (tx) => {
      const failedItems = await tx.select().from(syncQueue).where(eq(syncQueue.status, 'failed'));
      const itemsToClear = failedItems.filter(item => ids.includes(item.id));
      if (itemsToClear.length > 0) {
        for (const item of itemsToClear) {
          await tx.insert(syncErrors).values({
            id: item.id,
            operation: item.operation,
            payload: item.payload,
            error: item.error,
            createdAt: item.createdAt,
          });
        }
        await tx.delete(syncQueue).where(inArray(syncQueue.id, ids));
      }
    });
    loadQueue();
  };

  const handleRetryItem = async (id: string) => {
    await db.update(syncQueue).set({ status: 'pending', error: null }).where(eq(syncQueue.id, id));
    loadQueue();
    const { syncEngine } = await import('../../src/db/sync');
    syncEngine.forceSync();
  };



  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sync Queue</Text>
      </View>

      <ScrollView style={s.scroll}>
        <View style={s.statsCard}>
          <View style={s.stat}>
            <Text style={s.statValue}>{pendingCount}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: failedCount > 0 ? C.red : C.gray }]}>{failedCount}</Text>
            <Text style={s.statLabel}>Failed</Text>
          </View>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity 
            style={[s.syncBtn, (pendingCount === 0 || isSyncing) && { opacity: 0.5 }]} 
            onPress={handleForceSync}
            disabled={pendingCount === 0 || isSyncing}
          >
            {isSyncing ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.syncBtnText}>Force Sync Now</Text>}
          </TouchableOpacity>

          {failedCount > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={clearFailed}>
              <Text style={s.clearBtnText}>Clear Failed</Text>
            </TouchableOpacity>
          )}
        </View>
        


        {queue.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>✅</Text>
            <Text style={s.emptyText}>All caught up!</Text>
            <Text style={s.emptySub}>No pending data to sync.</Text>
          </View>
        ) : (
          queue.map(item => (
            <View key={item.id} style={s.itemCard}>
              <View style={s.itemRow}>
                <Text style={s.itemType}>{item.operation.replace(/_/g, ' ')}</Text>
                <Text style={[s.itemStatus, item.status === 'failed' && { color: C.red }, item.status === 'syncing' && { color: C.blue }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <Text style={s.itemDate}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.error && <Text style={s.itemError}>{item.error}</Text>}
              {item.status === 'failed' && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: C.cardBorder, padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => handleRetryItem(item.id)}
                  >
                    <Text style={{ color: C.white, fontWeight: '600' }}>Retry Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(59,130,246,0.12)', padding: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: C.blue }}
                    onPress={() => setPayloadModal({ visible: true, item })}
                  >
                    <Text style={{ color: C.blue, fontWeight: '600' }}>🔍 View Payload</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Payload Viewer Modal */}
      <Modal
        visible={payloadModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPayloadModal({ visible: false, item: null })}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontSize: 18, fontWeight: '800' }}>
                {payloadModal.item?.operation?.replace(/_/g, ' ') ?? 'Payload'}
              </Text>
              <Text style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>
                {payloadModal.item?.createdAt ? new Date(payloadModal.item.createdAt).toLocaleString() : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: C.card, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder }}
              onPress={() => setPayloadModal({ visible: false, item: null })}
            >
              <Text style={{ color: C.white, fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Error Banner */}
            {payloadModal.item?.error && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: C.red, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: C.red, fontSize: 12, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase' }}>Error</Text>
                <Text style={{ color: C.red, fontSize: 13 }}>{payloadModal.item.error}</Text>
              </View>
            )}

            {/* Payload JSON */}
            <View style={{ backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.cardBorder }}>
              <Text style={{ color: C.amber, fontSize: 11, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Raw Payload</Text>
              <Text style={{ color: '#86efac', fontSize: 12, fontFamily: 'monospace', lineHeight: 20 }}>
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(payloadModal.item?.payload ?? '{}'), null, 2);
                  } catch {
                    return payloadModal.item?.payload ?? 'No payload';
                  }
                })()}
              </Text>
            </View>

            <Text style={{ color: C.gray, fontSize: 11, textAlign: 'center', marginTop: 20, marginBottom: 8 }}>
              Take a screenshot to share this with your administrator.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
  backArrow: { color: C.white, fontSize: 18, fontWeight: '700' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800', marginLeft: 16 },
  
  scroll: { flex: 1, padding: 20 },
  statsCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: C.amber, fontSize: 32, fontWeight: '800' },
  statLabel: { color: C.gray, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 4 },
  
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  syncBtn: { flex: 1, backgroundColor: C.amber, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  syncBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  clearBtn: { backgroundColor: C.redDim, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.red },
  clearBtnText: { color: C.red, fontSize: 15, fontWeight: '700' },
  
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, borderStyle: 'dashed', marginTop: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: C.white, fontSize: 18, fontWeight: '700' },
  emptySub: { color: C.gray, fontSize: 14, marginTop: 4 },
  
  itemCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemType: { color: C.white, fontSize: 15, fontWeight: '700' },
  itemStatus: { color: C.amber, fontSize: 12, fontWeight: '800' },
  itemDate: { color: C.gray, fontSize: 12 },
  itemError: { color: C.red, fontSize: 13, marginTop: 8, backgroundColor: C.redDim, padding: 8, borderRadius: 6 },
});
