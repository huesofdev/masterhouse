import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';;
import { router, useFocusEffect } from 'expo-router';
import { useTripStore } from '../src/store/useTripStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useBranchStore } from '../src/store/useBranchStore';
import { useSyncStore } from '../src/store/useSyncStore';
import { useCalculatorStore } from '../src/store/useCalculatorStore';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../src/db';
import { customers, products, tripStock, promotions, contracts, settings, installmentSchemes, preOrders, installmentSchedules, preOrderItems, collectionAttempts, taxes, syncQueue, routeAreas } from '../src/db/schema';
import * as Crypto from 'expo-crypto';
import { apiClient } from '../src/lib/api';
import * as Network from 'expo-network';
import { sql, eq } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startLocationTracking } from '../src/lib/location';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberLight: '#F59E0B', amberDim: 'rgba(217, 119, 6, 0.12)', violet: '#7C3AED',
  violetDim: 'rgba(124, 58, 237, 0.12)', green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)',
  blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)', red: '#EF4444', redDim: 'rgba(239, 68, 68, 0.12)',
  white: '#F8FAFC', gray: '#9CA3AF', grayDark: '#6B7280', grayDarker: '#374151',
};

// Removed mock trips

function IconCircle({ emoji, bgColor }: { emoji: string; bgColor: string }) {
  return (
    <View style={[s.iconCircle, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
}

function DashCard({ emoji, iconBg, title, subtitle, onPress, accentColor }: any) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardRow}>
        <IconCircle emoji={emoji} bgColor={iconBg} />
        <View style={s.cardContent}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardSubtitle}>{subtitle}</Text>
        </View>
        <View style={[s.cardArrow, { backgroundColor: iconBg }]}>
          <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700' }}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatBox({ label, value, color }: any) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function Home() {
  const { activeTripId, tripType, tripStatus, setTrip, endTrip } = useTripStore();
  const { user, token, logout } = useAuthStore();
  const { activeBranchId, setActiveBranchId } = useBranchStore();
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const failedCount = useSyncStore((state) => state.failedCount);
  const isLoggedIn = !!token;

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignedTrips, setAssignedTrips] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (isMounted) setIsOnline(state.isConnected === true);
      } catch (e) {
        if (isMounted) setIsOnline(true);
      }
    };
    checkNetwork();

    // Listen for network changes if supported, otherwise poll gently or rely on AppState.
    // Expo network state is a snapshot, so we'll just check it periodically or on refresh
    const interval = setInterval(checkNetwork, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Clear calculator whenever returning Home
  useFocusEffect(
    useCallback(() => {
      useCalculatorStore.getState().clearCalculator();
    }, [])
  );

  // Auto-sync when coming online + refresh failed count on mount
  useEffect(() => {
    if (isOnline && isLoggedIn && pendingCount > 0) {
      import('../src/db/sync').then(m => m.syncEngine.forceSync());
    }
    // Populate failed count from DB on app resume
    db.select().from(syncQueue).where(eq(syncQueue.status, 'failed')).then(res => {
      useSyncStore.getState().setFailedCount(res.length);
    }).catch(() => {});
  }, [isOnline, isLoggedIn]);

  // Branch Switcher State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const branches = (user as any)?.branches || [];

  const fetchAssignedTrips = async (isPull = false) => {
    if (!isLoggedIn || activeTripId) return;
    
    if (isPull) setRefreshing(true);
    else setLoadingTrips(true);
    
    try {
      const response = await apiClient.get(`/operations/trips?limit=10&assigned_to=${user?.id}&exclude_status=CLOSED,CANCELLED,CLOSED_WITH_DISCREPANCIES`);
      if (response.data?.success) {
        const trips = response.data.data.map((t: any) => ({
          id: t.id,
          route_id: t.route_id,
          route_name: t.route?.name || t.route_id.substring(0, 8),
          type: t.type,
          status: t.status,
          date: new Date(t.created_at).toLocaleDateString(),
        }));
        setAssignedTrips(trips);
      }
    } catch (error) {
      console.error('Failed to fetch trips', error);
    } finally {
      setLoadingTrips(false);
      setRefreshing(false);
    }
  };

  const checkActiveTripStatus = async () => {
    if (!isLoggedIn || !activeTripId) return;
    try {
      // Check if the trip was closed by an admin
      const response = await apiClient.get(`/operations/trips?limit=1`); // Or we can fetch assigned trips and see if active is still there, but getting specific trip is better
      // Wait, there's no /operations/trips/:id endpoint in operations controller?
      // Actually, /operations/trips/:id exists as getTripDetails in trips, or we can just fetch assigned trips.
      // Let's use the assigned trips endpoint. If it's not there, it might be closed.
      const checkRes = await apiClient.get(`/operations/trips/${activeTripId}`);
      if (checkRes.data?.success) {
        const status = checkRes.data.data.status;
        if (['CLOSED', 'CLOSED_WITH_DISCREPANCIES', 'CANCELLED'].includes(status)) {
          Alert.alert('Trip Closed', 'This trip was closed or cancelled by the branch.');
          endTrip();
        }
      }
    } catch (error: any) {
      // 404 means it might have been deleted
      if (error.response?.status === 404) {
        endTrip();
      }
    }
  };

  useEffect(() => {
    if (activeTripId) {
      checkActiveTripStatus();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAssignedTrips();
    }
  }, [isLoggedIn, activeTripId, activeBranchId]);

  const handleDownloadRestock = async () => {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      Alert.alert("Offline", "You are currently offline. Cannot check for restocks.");
      return;
    }

    if (!activeTripId) {
      Alert.alert("Error", "No active trip found.");
      return;
    }

    setDownloading(true);
    try {
      const response = await apiClient.get(`/operations/trips/${activeTripId}/mobile-data`);
      if (response.data?.success) {
        const { stock: remoteStock, products: remoteProducts, preOrders: remotePreOrders, preOrderItems: remotePreOrderItems } = response.data.data;

        for (const p of (remoteProducts || [])) {
          await db.insert(products).values({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: parseFloat(p.base_price || "0"),
            isSerialized: p.is_serialized || false,
            minDownpaymentAmount: parseFloat(p.min_downpayment_amount || "0"),
            imageUrl: p.image_url?.includes('localhost') ? p.image_url.replace(/https?:\/\/localhost(:\d+)?/, (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api$/, '')) : p.image_url,
          }).onConflictDoUpdate({
            target: products.id,
            set: {
              name: sql`excluded.name`,
              sku: sql`excluded.sku`,
              price: sql`excluded.price`,
              isSerialized: sql`excluded.is_serialized`,
              minDownpaymentAmount: sql`excluded.min_downpayment_amount`,
              imageUrl: sql`excluded.image_url`,
            }
          });
        }
        
        const mappedStock = (remoteStock || []).map((s: any) => ({
          id: s.id,
          tripId: s.trip_id,
          productId: s.product_id,
          serialItemId: s.serial_item_id || null,
          serialNumber: s.serialItem?.serial_number || null,
          loadedQty: s.loaded_qty,
          soldQty: s.sold_qty || 0,
        }));
        
        if (mappedStock.length > 0) {
          await db.insert(tripStock).values(mappedStock).onConflictDoNothing();
        }

        // Sync PreOrders
        let syncedOrders = false;
        if (remotePreOrders && remotePreOrders.length > 0) {
            for (const po of remotePreOrders) {
              await db.delete(preOrderItems).where(eq(preOrderItems.preOrderId, po.id));
              await db.insert(preOrders).values({
                id: po.id,
                customerId: po.customer_id,
                advancePayment: parseFloat(po.advance_payment || "0"),
                paymentMethod: po.payment_method,
                saleTypePreference: po.sale_type_preference,
                receiptNumber: po.reference_number,
                status: po.status,
                createdAt: new Date(po.created_at),
              }).onConflictDoUpdate({
                target: preOrders.id,
                set: {
                  status: sql`excluded.status`,
                  advancePayment: sql`excluded.advance_payment`,
                  receiptNumber: sql`excluded.receipt_number`,
                }
              });
            }
          if (remotePreOrderItems && remotePreOrderItems.length > 0) {
            const itemsToInsert = remotePreOrderItems.map((poi: any) => ({
              id: poi.id,
              preOrderId: poi.pre_order_id,
              productId: poi.product_id,
              quantity: poi.quantity,
              discountInput: null,
            }));
            for (const item of itemsToInsert) {
              await db.insert(preOrderItems).values(item).onConflictDoNothing();
            }
          }
          syncedOrders = true;
        }
        
        if (mappedStock.length > 0 || (remoteProducts && remoteProducts.length > 0) || syncedOrders) {
          Alert.alert("Success", "📦 Download successful! Stock, products, and pending orders updated.");
        } else {
          Alert.alert("Up to date", "No new stock or pending orders found.");
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch restock", e);
      Alert.alert("Error", "Failed to fetch restock. Ensure you are online.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAndStartTrip = async (trip: any) => {
    if (trip.status !== 'DEPARTED') {
      Alert.alert('Not Ready', 'Only trips marked as DEPARTED by the branch can be started.');
      return;
    }

    setDownloading(true);
    try {
      // Pre-Trip Check: Auth Sync
      try {
        const authRes = await apiClient.get('/auth/me');
        if (authRes.data?.success && authRes.data?.user) {
          useAuthStore.getState().updateUser(authRes.data.user);
        }
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          Alert.alert('Session Expired', 'Your account access has been changed. Please log in again.');
          useAuthStore.getState().logout();
          setDownloading(false);
          return;
        }
      }

      const res = await apiClient.get(`/operations/trips/${trip.id}/mobile-data`);
      const { 
        customers: remoteCustomers, 
        products: remoteProducts, 
        stock: remoteStock, 
        promotions: remotePromos, 
        contracts: remoteContracts,
        schemes: remoteSchemes,
        settings: remoteSettings,
        preOrders: remotePreOrders,
        preOrderItems: remotePreOrderItems,
        branch: branchData,
        taxes: remoteTaxes,
        areas: remoteAreas
      } = res.data.data;

      await db.delete(installmentSchemes);
      await db.delete(installmentSchedules);

      await db.delete(customers);
      await db.delete(tripStock);
      // await db.delete(products); // Kept for persistent product catalog
      await db.delete(contracts);
      await db.delete(promotions);
      await db.delete(settings);
      await db.delete(preOrders);
      await db.delete(preOrderItems);
      await db.delete(collectionAttempts);
      await db.delete(taxes);
      await db.delete(routeAreas);

      let companyName = "Company";
      let companyLogoUrl = "";
      let partialRecoveryDaysMax = 14;
      
      if (remoteSettings && Array.isArray(remoteSettings)) {
        const nameSetting = remoteSettings.find((s: any) => s.setting_key === 'company_name');
        const logoSetting = remoteSettings.find((s: any) => s.setting_key === 'company_logo_url');
        const recoverySetting = remoteSettings.find((s: any) => s.setting_key === 'downpayment_partial_recovery_days_max');
        
        if (nameSetting) companyName = nameSetting.setting_value;
        if (logoSetting) {
          companyLogoUrl = logoSetting.setting_value;
          if (companyLogoUrl && companyLogoUrl.includes('localhost')) {
            const apiBase = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api$/, '');
            if (apiBase) {
              companyLogoUrl = companyLogoUrl.replace(/https?:\/\/localhost(:\d+)?/, apiBase);
            }
          }
        }
        if (recoverySetting) partialRecoveryDaysMax = parseInt(recoverySetting.setting_value, 10) || 14;
      }

      let companyLogoUri = null;
      if (companyLogoUrl) {
        try {
          const fileUri = FileSystem.documentDirectory + `company_logo.png`;
          // Intelligently check if the logo URL has changed since last download
          const lastLogoUrl = await AsyncStorage.getItem('last_downloaded_logo_url');
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          
          if (lastLogoUrl === companyLogoUrl && fileInfo.exists) {
            // Logo hasn't changed and file exists, skip downloading to save data/time
            companyLogoUri = fileUri;
          } else {
            // URL changed or file missing, download and update storage
            const dlRes = await FileSystem.downloadAsync(companyLogoUrl, fileUri);
            companyLogoUri = dlRes.uri;
            await AsyncStorage.setItem('last_downloaded_logo_url', companyLogoUrl);
          }
        } catch (e) {
          console.warn("Failed to download logo", e);
        }
      }

      await db.insert(settings).values({
        id: "1",
        companyName,
        companyLogoUri,
        branchName: branchData?.name || "",
        branchAddress: branchData?.address || "",
        branchPhone: branchData?.phones?.length > 0 ? branchData.phones.map((p: any) => p.phone_number).join(' | ') : "",
        partialRecoveryDaysMax,
      });

      for (const c of remoteCustomers) {
        await db.insert(customers).values({
          id: c.id,
          routeId: c.route_id,
          areaId: c.area_id,
          name: c.full_name,
          nic: c.nic,
          phone: c.mobile,
          address: c.address,
          balance: parseFloat(c.wallet_balance || "0"),
          isOfflineCreated: false,
          isWalkIn: false,
          gpsLat: c.gps_lat ? parseFloat(c.gps_lat) : null,
          gpsLng: c.gps_lng ? parseFloat(c.gps_lng) : null,
          nicFrontUri: c.nic_front_url || null,
          nicBackUri: c.nic_back_url || null,
          rating: c.rating ? parseFloat(c.rating) : null,
          updatedAt: new Date(),
        });
      }

      for (const p of remoteProducts) {
        await db.insert(products).values({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: parseFloat(p.base_price || "0"),
          isSerialized: p.is_serialized || false,
          minDownpaymentAmount: parseFloat(p.min_downpayment_amount || "0"),
          imageUrl: p.image_url?.includes('localhost') ? p.image_url.replace(/https?:\/\/localhost(:\d+)?/, (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api$/, '')) : p.image_url,
        }).onConflictDoUpdate({
          target: products.id,
          set: {
            name: sql`excluded.name`,
            sku: sql`excluded.sku`,
            price: sql`excluded.price`,
            isSerialized: sql`excluded.is_serialized`,
            minDownpaymentAmount: sql`excluded.min_downpayment_amount`,
            imageUrl: sql`excluded.image_url`,
          }
        });
      }

      for (const s of remoteStock) {
        await db.insert(tripStock).values({
          id: s.id,
          tripId: trip.id,
          productId: s.product_id,
          serialItemId: s.serial_item_id || null,
          serialNumber: s.serialItem?.serial_number || null,
          loadedQty: s.loaded_qty,
          soldQty: s.sold_qty || 0,
        });
      }
      
      for (const contract of remoteContracts || []) {
        await db.insert(contracts).values({
          id: contract.id,
          customerId: contract.customer_id,
          balance: parseFloat(contract.balance || "0"),
          currentDue: parseFloat(contract.current_due || "0"),
          productName: contract.product_name || "",
          guarantorName: contract.guarantor_name || null,
          guarantorPhone: contract.guarantor_phone || null,
          guarantorNic: contract.guarantor_nic || null,
          pastAttempts: JSON.stringify(contract.past_attempts || []),
          status: contract.status,
          createdAt: new Date(contract.created_at),
        });

        if (contract.schedules && Array.isArray(contract.schedules)) {
          for (const s of contract.schedules) {
            await db.insert(installmentSchedules).values({
              id: s.id,
              contractId: s.contract_id,
              installmentNumber: s.installment_number,
              dueDate: s.due_date,
              amountDue: parseFloat(s.amount_due || "0"),
              amountPaid: parseFloat(s.amount_paid || "0"),
              status: s.status,
            }).onConflictDoNothing();
          }
        }
      }
      
      for (const p of remotePromos || []) {
        await db.insert(promotions).values({
          id: p.id,
          name: p.name,
          discountType: p.discount_type,
          discountValue: parseFloat(p.discount_value || "0"),
          minCartValue: parseFloat(p.min_cart_value || "0"),
        });
      }
      
      for (const s of remoteSchemes || []) {
        await db.insert(installmentSchemes).values({
          id: s.id,
          name: s.name,
          terms: s.terms,
          frequency: s.frequency,
          interestRate: parseFloat(s.interest_rate || "0"),
          minDownpaymentPercent: parseFloat(s.min_downpayment_percent || "0"),
        });
      }
      
      for (const po of remotePreOrders || []) {
        await db.insert(preOrders).values({
          id: po.id,
          customerId: po.customer_id,
          advancePayment: parseFloat(po.advance_payment || "0"),
          offlineReceiptNumber: null, // Force null so we only count today's offline bookings in End Trip
          paymentMethod: po.payment_method,
          saleTypePreference: po.sale_type_preference,
          receiptNumber: po.receipt_number,
          status: po.status,
          remarks: po.remarks,
          createdAt: new Date(po.created_at),
        });
      }
      
      for (const poi of remotePreOrderItems || []) {
        await db.insert(preOrderItems).values({
          id: poi.id,
          preOrderId: poi.pre_order_id,
          productId: poi.product_id,
          quantity: poi.quantity,
          discountInput: poi.discount_input,
        });
      }
      
      const mappedTaxes = (remoteTaxes || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        rate: parseFloat(t.rate || 0),
        type: t.type,
        isActive: t.is_active === 1 || t.is_active === true || t.is_active === '1'
      }));
      if (mappedTaxes.length > 0) {
        await db.insert(taxes).values(mappedTaxes).onConflictDoNothing();
      }

      if (remoteAreas && Array.isArray(remoteAreas) && remoteAreas.length > 0) {
        await db.insert(routeAreas).values(remoteAreas).onConflictDoNothing();
      }
      
      setTrip(trip.id, trip.route_id, trip.type, 'IN_PROGRESS');
      await startLocationTracking();
    } catch (e: any) {
      console.error(e.response?.data || e.message);
      Alert.alert('Error', 'Failed to download trip data.');
    } finally {
      setDownloading(false);
    }
  };

  if (activeTripId) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.headerGreeting}>Active Trip</Text>
                <View style={[s.networkBadge, { backgroundColor: isOnline ? C.greenDim : C.redDim }]}>
                  <View style={[s.statusDot, { backgroundColor: isOnline ? C.green : C.red }]} />
                  <Text style={[s.networkText, { color: isOnline ? C.green : C.red }]}>{isOnline ? 'Online' : 'Offline'}</Text>
                </View>
              </View>
              <Text style={s.headerTitle}>Operations Dashboard</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: C.greenDim }]}>
              <View style={[s.statusDot, { backgroundColor: C.green }]} />
              <Text style={[s.statusText, { color: C.green }]}>{tripStatus}</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <StatBox label="Trip Type" value={tripType || '-'} color={C.amber} />
            <StatBox label="Sync Status" value="Online" color={C.green} />
            <StatBox label="Queue" value="0" color={C.blue} />
          </View>

          {(tripType === 'SALE' || tripType === 'BOTH') && (
            <DashCard emoji="🛒" iconBg={C.amberDim} title="Point of Sale" subtitle="Create sales from loaded stock" onPress={() => router.push('/(pos)')} accentColor={C.amber} />
          )}

          {(tripType === 'COLLECTION' || tripType === 'BOTH') && (
            <DashCard emoji="💰" iconBg={C.greenDim} title="Collections" subtitle="Collect outstanding payments" onPress={() => router.push('/(pos)/collections')} accentColor={C.green} />
          )}

          <DashCard emoji="🧾" iconBg={C.amberDim} title="Recent Transactions" subtitle="View & reprint sales/collections" onPress={() => router.push('/(pos)/transactions')} accentColor={C.amber} />

          <DashCard emoji="📦" iconBg={C.amberDim} title="Product Catalog" subtitle="Browse products & prices offline" onPress={() => router.push('/catalog')} accentColor={C.amber} />

          <DashCard emoji="🧮" iconBg={C.amberDim} title="Installment Calculator" subtitle="Simulate termly installment payments" onPress={() => router.push('/(calculator)')} accentColor={C.amber} />

          <DashCard emoji="📊" iconBg={C.blueDim} title="My Performance" subtitle="Running month sales & collections report" onPress={() => router.push('/my-stats')} accentColor={C.blue} />

          <DashCard emoji="📝" iconBg={C.blueDim} title="Take Pre-Order" subtitle="Take an order for future delivery" onPress={() => router.push('/(pos)/pre-order-create')} accentColor={C.blue} />

          {(tripType === 'SALE' || tripType === 'BOTH') && (
            <DashCard emoji="🚚" iconBg={C.greenDim} title="Pending Orders" subtitle="Deliver pre-orders on route" onPress={() => router.push('/(pos)/pending-orders')} accentColor={C.green} />
          )}

          <DashCard emoji="👤" iconBg={C.blueDim} title="New Customer" subtitle="Onboard with GPS & NIC capture" onPress={() => router.push('/(pos)/customer-create')} accentColor={C.blue} />
          
          <DashCard emoji="🔄" iconBg={failedCount > 0 ? 'rgba(239,68,68,0.2)' : C.violetDim} title="Sync Status" subtitle={failedCount > 0 ? `⚠️ ${failedCount} Failed | ${pendingCount} Pending` : `${pendingCount} Pending Actions`} onPress={() => router.push('/(pos)/sync-status')} accentColor={failedCount > 0 ? '#EF4444' : C.violet} />

          <DashCard emoji="⬇️" iconBg={C.blueDim} title="Download Restocks" subtitle="Sync mid-trip van restocking" onPress={handleDownloadRestock} accentColor={C.blue} />

          <DashCard emoji="⚙️" iconBg={C.gray} title="Settings & Profile" subtitle="View company details & logo" onPress={() => router.push('/(pos)/settings')} accentColor={C.gray} />

          <View style={{ height: 24 }} />

          <TouchableOpacity style={s.endTripBtn} onPress={() => router.push('/(pos)/end-trip')} activeOpacity={0.7}>
            <Text style={s.endTripText}>End Trip & Reconcile</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- VIEW 2: MAIN MENU & TRIP DOWNLOADS ---
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView 
        style={s.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchAssignedTrips(true)} 
            tintColor={C.amber}
            colors={[C.amber]}
          />
        }
      >
        
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity 
            style={s.headerLeft} 
            onPress={() => {
              if (isLoggedIn && branches.length > 1) {
                setShowBranchModal(true);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.headerGreeting}>{isLoggedIn ? `Welcome back,` : 'Welcome to'}</Text>
              <View style={[s.networkBadge, { backgroundColor: isOnline ? C.greenDim : C.redDim }]}>
                <View style={[s.statusDot, { backgroundColor: isOnline ? C.green : C.red }]} />
                <Text style={[s.networkText, { color: isOnline ? C.green : C.red }]}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            
            {isLoggedIn ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.headerTitle}>{activeBranchId ? branches.find((b: any) => b.id === activeBranchId)?.name || 'Loading Branch...' : 'Select Branch'}</Text>
                {branches.length > 1 && <Text style={{ color: C.amber, fontSize: 14, marginLeft: 8, marginTop: 6 }}>▼</Text>}
              </View>
            ) : (
              <Text style={s.headerTitle}>Master House</Text>
            )}
            {isLoggedIn && <Text style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>{user?.name}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatarCircle} onPress={() => {
            if (!isLoggedIn) {
              router.push('/(auth)/login');
            } else {
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign Out", style: "destructive", onPress: logout }
                ]
              );
            }
          }}>
            <Text style={{ fontSize: 20 }}>{isLoggedIn ? '🚪' : '🔑'}</Text>
          </TouchableOpacity>
        </View>

        {!isLoggedIn ? (
          <TouchableOpacity style={[s.banner, { backgroundColor: C.amberDim, borderColor: C.amber }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={{ fontSize: 18 }}>🔐</Text>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[s.bannerTitle, { color: C.amber }]}>Sign In Required</Text>
              <Text style={s.bannerSub}>Tap to login and access your assigned trips</Text>
            </View>
            <Text style={{ color: C.amber, fontWeight: '700', fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Quick Tools */}
            <Text style={s.sectionTitle}>Tools</Text>
            <DashCard emoji="📦" iconBg={C.amberDim} title="Product Catalog" subtitle="Browse products & prices offline" onPress={() => router.push('/catalog')} accentColor={C.amber} />
            <DashCard emoji="🧮" iconBg={C.amberDim} title="Installment Calculator" subtitle="Simulate termly installment payments" onPress={() => router.push('/(calculator)')} accentColor={C.amber} />
            <DashCard emoji="📊" iconBg={C.blueDim} title="My Performance" subtitle="Running month sales & collections report" onPress={() => router.push('/my-stats')} accentColor={C.blue} />
            <View style={{ height: 16 }} />

            {/* Assigned Trips Section */}
            <Text style={s.sectionTitle}>Assigned Trips</Text>
            
            {loadingTrips ? (
              <ActivityIndicator color={C.amber} size="large" style={{ marginVertical: 40 }} />
            ) : assignedTrips.length === 0 ? (
              <View style={s.emptyTripsBox}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🏖️</Text>
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '600' }}>No Assigned Trips</Text>
                <Text style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>You are all caught up for today!</Text>
              </View>
            ) : (
              assignedTrips.map(trip => (
                <TouchableOpacity 
                  key={trip.id} 
                  style={s.tripCard}
                  onPress={() => handleDownloadAndStartTrip(trip)}
                  activeOpacity={0.7}
                >
                  <View style={s.tripTop}>
                    <Text style={s.tripRoute}>{trip.route_name}</Text>
                    <View style={[s.tripStatusBadge, { 
                      backgroundColor: trip.status === 'DEPARTED' ? C.amberDim 
                                     : trip.status === 'PLANNED' ? C.blueDim 
                                     : trip.status === 'LOADING' ? C.violetDim 
                                     : C.cardBorder 
                    }]}>
                      <Text style={[s.tripStatusText, { 
                        color: trip.status === 'DEPARTED' ? C.amber 
                             : trip.status === 'PLANNED' ? C.blue 
                             : trip.status === 'LOADING' ? C.violet 
                             : C.gray 
                      }]}>
                        {trip.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.tripDetail}>Type: {trip.type}</Text>
                  <Text style={s.tripDetail}>Scheduled: {trip.date}</Text>
                  
                  {trip.status === 'DEPARTED' && (
                    <View style={s.downloadBtn}>
                      <Text style={s.downloadBtnText}>⬇ Download Data & Start Trip</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

      </ScrollView>

      {/* Full Screen Loading Overlay */}
      {downloading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={C.amber} />
          <Text style={s.overlayTitle}>Downloading Offline Data...</Text>
          <Text style={s.overlaySub}>Please keep the app open</Text>
        </View>
      )}

      {/* Branch Switcher Modal */}
      <Modal
        visible={showBranchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBranchModal(false)}
      >
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowBranchModal(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Branch</Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {branches.map((branch: any) => {
                const isActive = branch.id === activeBranchId;
                return (
                  <TouchableOpacity 
                    key={branch.id} 
                    style={[s.branchOption, isActive && { borderColor: C.amber, backgroundColor: C.amberDim }]}
                    onPress={() => {
                      setActiveBranchId(branch.id);
                      setShowBranchModal(false);
                    }}
                  >
                    <View>
                      <Text style={[s.branchOptionTitle, isActive && { color: C.amber }]}>{branch.name}</Text>
                      {branch.address && <Text style={s.branchOptionSub}>{branch.address}</Text>}
                    </View>
                    {isActive && <Text style={{ color: C.amber, fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowBranchModal(false)}>
              <Text style={{ color: C.gray, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 8, marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerGreeting: { color: C.gray, fontSize: 15, fontWeight: '500' },
  headerTitle: { color: C.white, fontSize: 28, fontWeight: '800', marginTop: 2 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },

  networkBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  networkText: { fontSize: 10, fontWeight: '700', marginLeft: 4, textTransform: 'uppercase' },

  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerSub: { color: C.gray, fontSize: 13, marginTop: 2 },

  sectionTitle: { color: C.grayDark, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },

  // Dashboard Cards
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 14 },
  cardTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: C.gray, fontSize: 13, marginTop: 3 },
  cardArrow: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { color: C.gray, fontSize: 11, marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },

  endTripBtn: { backgroundColor: C.redDim, borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: C.red },
  endTripText: { color: C.red, fontSize: 16, fontWeight: '700' },

  // Trips List
  tripCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripRoute: { color: C.white, fontSize: 18, fontWeight: '800' },
  tripStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tripStatusText: { fontSize: 12, fontWeight: '800' },
  tripDetail: { color: C.gray, fontSize: 14, marginBottom: 4 },
  downloadBtn: { backgroundColor: C.amber, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  downloadBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  emptyTripsBox: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, borderStyle: 'dashed' },

  // Overlay
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  overlayTitle: { color: C.white, fontSize: 20, fontWeight: '800', marginTop: 24 },
  overlaySub: { color: C.gray, fontSize: 14, marginTop: 8 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: C.card, width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.cardBorder },
  modalTitle: { color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  branchOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10 },
  branchOptionTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
  branchOptionSub: { color: C.gray, fontSize: 13, marginTop: 4 },
  modalCloseBtn: { marginTop: 12, padding: 16, alignItems: 'center' },
});
