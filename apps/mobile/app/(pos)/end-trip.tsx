import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { db } from '../../src/db';
import { sales, collections, tripStock, products, customers, promotions, syncQueue, preOrders, preOrderItems, contracts, installmentSchedules, installmentSchemes, taxes } from '../../src/db/schema';
import { useTripStore } from '../../src/store/useTripStore';
import { useSyncStore } from '../../src/store/useSyncStore';
import { eq } from 'drizzle-orm';
import { apiClient } from '../../src/lib/api';
import { stopLocationTracking } from '../../src/lib/location';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', red: '#EF4444', redDim: 'rgba(239, 68, 68, 0.12)',
};

export default function EndTrip() {
  const { activeTripId, endTrip } = useTripStore();
  const { pendingCount, failedCount, isSyncing } = useSyncStore();
  
  const [expectedCash, setExpectedCash] = useState(0);
  const [salesCash, setSalesCash] = useState(0);
  const [collectionsCash, setCollectionsCash] = useState(0);
  const [bookingsCash, setBookingsCash] = useState(0);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const loadReconciliationData = async () => {
    setLoading(true);
    try {
      // 1. Calculate Expected Cash
      let sCash = 0;
      let cCash = 0;
      let bCash = 0;
      
      const salesRes = await db.select().from(sales);
      const preOrdersRes = await db.select().from(preOrders);
      
      salesRes.forEach(s => {
        let bookingDeposit = 0;
        if (s.preOrderId) {
          const po = preOrdersRes.find(p => p.id === s.preOrderId);
          if (po) bookingDeposit = po.advancePayment || 0;
        }

        let actualCashCollected = 0;
        if (s.saleType === 'INSTALLMENT') {
          actualCashCollected = Math.max(0, (s.downpayment || 0) - bookingDeposit);
        } else {
          actualCashCollected = Math.max(0, (s.totalAmount || 0) - bookingDeposit);
        }
        
        sCash += actualCashCollected;
      });

      // Add actual advance payments from PreOrders taken offline on this trip
      // We use offlineReceiptNumber to identify bookings made today on this device,
      // because even if they are FULFILLED later, we still need to account for the cash collected.
      preOrdersRes.forEach(po => {
        if (po.offlineReceiptNumber && (!po.paymentMethod || po.paymentMethod === 'CASH')) {
          bCash += po.advancePayment || 0;
        }
      });

      const collRes = await db.select().from(collections);
      collRes.forEach(c => {
        if (c.paymentMode === 'CASH') {
          cCash += c.amount;
        }
      });

      setSalesCash(sCash);
      setBookingsCash(bCash);
      setCollectionsCash(cCash);
      setExpectedCash(sCash + bCash + cCash);

      // 2. Load Stock Returns
      const stockRes = await db.select({
        id: tripStock.id,
        productId: tripStock.productId,
        loadedQty: tripStock.loadedQty,
        soldQty: tripStock.soldQty,
        name: products.name,
      })
      .from(tripStock)
      .leftJoin(products, eq(tripStock.productId, products.id));

      const aggregatedStock = Object.values(
        stockRes.reduce((acc, item) => {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              id: item.productId,
              productId: item.productId,
              name: item.name,
              loadedQty: 0,
              soldQty: 0
            };
          }
          acc[item.productId].loadedQty += item.loadedQty;
          acc[item.productId].soldQty += item.soldQty;
          return acc;
        }, {} as Record<string, any>)
      );

      setStockItems(aggregatedStock);

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReconciliationData();
  }, []);

  const handleCloseTrip = async () => {
    const unsyncedQueue = await db.select().from(syncQueue);
    const pendingOrSyncingCount = unsyncedQueue.filter(q => q.status === 'pending' || q.status === 'syncing').length;
    const failedQueueCount = unsyncedQueue.filter(q => q.status === 'failed').length;

    if (pendingOrSyncingCount > 0 || pendingCount > 0 || isSyncing) {
      Alert.alert('Cannot End Trip', 'Please wait until all offline data is synced to the server.');
      return;
    }

    if (failedQueueCount > 0 || failedCount > 0) {
      Alert.alert(
        'Cannot End Trip', 
        `You have ${Math.max(failedQueueCount, failedCount)} failed sync items. Please go to the Sync Queue screen to retry or clear them before ending the trip.`
      );
      return;
    }

    if (!activeTripId) return;

    Alert.alert(
      "End Trip",
      "Are you sure you want to end the trip now? This will wipe your offline data and begin reconciliation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, End Trip",
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              // 1. Update trip status to RECONCILING
              await apiClient.put(`/operations/trips/${activeTripId}/status`, { status: "RECONCILING" });
              await stopLocationTracking();

              // 2. Wipe local offline DB
              await db.delete(customers);
              await db.delete(contracts);
              await db.delete(installmentSchedules);
              await db.delete(sales);
              await db.delete(collections);
              await db.delete(tripStock);
              // await db.delete(products); // Kept for persistent product catalog
              await db.delete(promotions);
              await db.delete(syncQueue);
              await db.delete(preOrders);
              const { tripRoutes } = await import('../../src/db/schema');
              await db.delete(tripRoutes);
              await db.delete(preOrderItems);

              // Wipe persistent images folder
              try {
                const { documentDirectory, getInfoAsync, deleteAsync } = await import('expo-file-system/legacy');
                const folder = documentDirectory + 'sync_attachments/';
                const folderInfo = await getInfoAsync(folder);
                if (folderInfo.exists) {
                  await deleteAsync(folder, { idempotent: true });
                  console.log('Cleaned up sync_attachments directory on trip end.');
                }
              } catch (wipeErr: any) {
                console.warn('Failed to wipe sync_attachments folder:', wipeErr.message);
              }

              // 3. Clear store
              endTrip();

              Alert.alert('✅ Trip Closed', 'Reconciliation successful and data cleared.', [
                { text: 'OK', onPress: () => router.replace('/') }
              ]);
            } catch (e: any) {
              console.error(e.response?.data || e.message);
              Alert.alert('Closure Failed', e.response?.data?.message || 'Failed to close trip on the server.');
            } finally {
              setClosing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.red, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>End Trip & Reconcile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {(pendingCount > 0 || isSyncing) ? (
          <View style={s.warningBox}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>⚠️</Text>
            <Text style={s.warningTitle}>Pending Sync Detected</Text>
            <Text style={s.warningSub}>You have {pendingCount} offline records waiting to sync. You must have an active internet connection and wait for the queue to clear before ending the trip.</Text>
          </View>
        ) : (
          <View style={s.successBox}>
            <Text style={{ color: C.green, fontWeight: '700' }}>✓ All records synced. Ready to close.</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>EXPECTED CASH SUMMARY</Text>
        <View style={s.card}>
          <View style={[s.rowBetween, { marginBottom: 8 }]}>
            <Text style={s.label}>Sales Cash</Text>
            <Text style={[s.expectedValue, { fontSize: 14 }]}>Rs. {salesCash.toLocaleString()}</Text>
          </View>
          <View style={[s.rowBetween, { marginBottom: 8 }]}>
            <Text style={s.label}>Collections Cash</Text>
            <Text style={[s.expectedValue, { fontSize: 14 }]}>Rs. {collectionsCash.toLocaleString()}</Text>
          </View>
          <View style={[s.rowBetween, { marginBottom: 12 }]}>
            <Text style={s.label}>Booking Advances</Text>
            <Text style={[s.expectedValue, { fontSize: 14 }]}>Rs. {bookingsCash.toLocaleString()}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#333', marginBottom: 12 }} />
          <View style={s.rowBetween}>
            <Text style={[s.label, { color: C.amber }]}>Total Expected Cash</Text>
            <Text style={[s.expectedValue, { color: C.amber, fontSize: 18 }]}>Rs. {expectedCash.toLocaleString()}</Text>
          </View>
          <Text style={{ color: C.gray, fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>
            Please hand over this amount to the Warehouse Manager for verification.
          </Text>
        </View>

        <TouchableOpacity 
          style={[s.closeBtn, (pendingCount > 0 || isSyncing || closing) && { opacity: 0.5 }]} 
          onPress={handleCloseTrip}
          disabled={pendingCount > 0 || isSyncing || closing}
          activeOpacity={0.8}
        >
          <Text style={s.closeBtnText}>{closing ? 'Closing Trip...' : 'Submit & End Trip'}</Text>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>EXPECTED STOCK RETURNS</Text>
        {stockItems.map(item => (
          <View key={item.id} style={s.stockCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.stockName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.stockDetail}>Loaded: {item.loadedQty} | Sold: {item.soldQty}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', width: 100 }}>
              <Text style={s.label}>Expected Return</Text>
              <Text style={{ color: C.amber, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                {item.loadedQty - item.soldQty}
              </Text>
            </View>
          </View>
        ))}


        
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  
  card: { backgroundColor: C.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.gray, fontSize: 13, fontWeight: '600' },
  expectedValue: { color: C.white, fontSize: 16, fontWeight: '700' },
  input: { backgroundColor: '#1A1A1A', color: C.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 20, fontWeight: '700' },
  
  stockCard: { backgroundColor: C.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  stockName: { color: C.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stockDetail: { color: C.gray, fontSize: 13 },
  stockInput: { backgroundColor: '#1A1A1A', color: C.white, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 4, width: '100%' },

  warningBox: { backgroundColor: C.redDim, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.red, marginBottom: 16, alignItems: 'center' },
  warningTitle: { color: C.red, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  warningSub: { color: C.red, fontSize: 13, textAlign: 'center' },
  successBox: { backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 16, alignItems: 'center' },

  closeBtn: { backgroundColor: C.red, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  closeBtnText: { color: C.white, fontSize: 16, fontWeight: '800' }
});
