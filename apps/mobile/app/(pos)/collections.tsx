import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, StatusBar, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../src/db';
import { customers, collections, contracts, installmentSchedules, syncQueue, collectionAttempts, routeAreas } from '../../src/db/schema';
import { useTripStore } from '../../src/store/useTripStore';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { eq, gt, inArray, desc, and, asc } from 'drizzle-orm';
import { PrintService } from '../../src/lib/PrintService';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.12)',
  blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

interface ScheduleItem {
  schedule: any;
  contract: any;
  customer: any;
  remainingDue: number;
  tab: 'OVERDUE' | 'TODAY' | 'UPCOMING';
}

export default function Collections() {
  const { activeTripId, activeRouteId } = useTripStore();
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'OVERDUE' | 'UPCOMING'>('OVERDUE');
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'PAY' | 'MISSED'>('PAY');
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  
  const [amount, setAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [saving, setSaving] = useState(false);
  const [missedReason, setMissedReason] = useState('CUSTOMER_UNAVAILABLE');
  const [missedRemarks, setMissedRemarks] = useState('');
  
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyCustomerName, setHistoryCustomerName] = useState('');

  const loadSchedules = async () => {
    try {
      if (!activeRouteId) return;

      const [loadedAreas, activeContracts] = await Promise.all([
        db.select().from(routeAreas),
        db.select().from(contracts).where(gt(contracts.balance, 0))
      ]);
      setAreas(loadedAreas);
      if (activeContracts.length === 0) {
        setScheduleList([]);
        return;
      }
      
      const contractIds = activeContracts.map(c => c.id);
      const customerIds = Array.from(new Set(activeContracts.map(c => c.customerId)));
      
      const [customerList, allSchedules] = await Promise.all([
        db.select().from(customers).where(inArray(customers.id, customerIds)),
        db.select().from(installmentSchedules).where(inArray(installmentSchedules.contractId, contractIds))
      ]);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const flatList: ScheduleItem[] = [];

      for (const contract of activeContracts) {
        const customer = customerList.find(c => c.id === contract.customerId);
        if (!customer || customer.routeId !== activeRouteId) continue;

        const cSchedules = allSchedules.filter(
          s => s.contractId === contract.id && s.status !== 'PAID' && s.status !== 'WAIVED'
        );

        for (const schedule of cSchedules) {
          const sDate = schedule.dueDate.includes('T') ? schedule.dueDate.split('T')[0] : schedule.dueDate;
          const remainingDue = schedule.amountDue - schedule.amountPaid;
          if (remainingDue <= 0) continue;

          let tab: 'OVERDUE' | 'TODAY' | 'UPCOMING';
          if (sDate < todayStr) tab = 'OVERDUE';
          else if (sDate === todayStr) tab = 'TODAY';
          else tab = 'UPCOMING';

          flatList.push({ schedule, contract, customer, remainingDue, tab });
        }
      }

      flatList.sort((a, b) => {
        const dateA = a.schedule.dueDate;
        const dateB = b.schedule.dueDate;
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
      });
      
      setScheduleList(flatList);
    } catch (e) {
      console.warn('No schedules yet', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSchedules();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Dismiss keyboard when entering the screen to reset any active viewport shrinking
      Keyboard.dismiss();
      return () => {
        // Dismiss keyboard when leaving the screen
        Keyboard.dismiss();
      };
    }, [])
  );

  const openPayModal = (item: ScheduleItem) => {
    setSelectedItem(item);
    setAmount(item.remainingDue.toFixed(2).replace(/\.00$/, ''));
    setPaymentMode('CASH');
    setReceiptNumber('');
    setModalMode('PAY');
    setModalVisible(true);
  };

  const openMissedModal = (item: ScheduleItem) => {
    setSelectedItem(item);
    setMissedReason('CUSTOMER_UNAVAILABLE');
    setMissedRemarks('');
    setModalMode('MISSED');
    setModalVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setSelectedItem(null);
    setAmount('');
    setReceiptNumber('');
  };

  const handleSaveCollection = async () => {
    Keyboard.dismiss();
    if (!selectedItem) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid collection amount.');
      return;
    }

    if (Number(amount) > selectedItem.contract.balance) {
      Alert.alert(
        'Overpayment Blocked',
        `The collection amount (Rs. ${Number(amount).toLocaleString()}) cannot exceed the remaining contract balance of Rs. ${selectedItem.contract.balance.toLocaleString()}.`
      );
      return;
    }

    const customerName = selectedItem.customer?.name || '';
    const contractId = selectedItem.contract.id;
    const customerId = selectedItem.customer.id;

    Alert.alert(
      'Confirm Collection',
      `Collect Rs. ${Number(amount).toLocaleString()} from ${customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setSaving(true);
            try {
              let gpsLat, gpsLng;
              if (activeTripId) {
                const isGpsEnabled = await Location.hasServicesEnabledAsync();
                if (!isGpsEnabled) {
                  Alert.alert('GPS Disabled', 'Please turn on Location / GPS services in your device settings.');
                  setSaving(false);
                  return;
                }

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Denied', 'GPS location is strictly required for field collections.');
                  setSaving(false);
                  return;
                }
                let timeoutId: any;
                try {
                  const location = await Promise.race([
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
                    new Promise((_, reject) => {
                      timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
                    })
                  ]) as Location.LocationObject;
                  clearTimeout(timeoutId);
                  gpsLat = location.coords.latitude;
                  gpsLng = location.coords.longitude;
                } catch (gpsErr) {
                  if (timeoutId) clearTimeout(timeoutId);
                  Alert.alert('GPS Error', 'Could not lock onto GPS satellites. Please move outdoors or near a window for a clear sky view and try again.');
                  setSaving(false);
                  return;
                }
              }

              const collectionId = Crypto.randomUUID();
              const now = new Date();
              const offlineReceiptNumber = collectionId.split('-')[0].toUpperCase();
              
              const localPayload = {
                id: collectionId,
                contractId,
                customerId,
                amount: Number(amount),
                paymentMode,
                receiptNumber: receiptNumber || `REC-${offlineReceiptNumber}`,
                offlineReceiptNumber,
                collectedAt: now,
              };

              const syncPayload = {
                id: collectionId,
                offline_receipt_number: localPayload.offlineReceiptNumber,
                contract_id: contractId,
                trip_id: activeTripId,
                amount: Number(amount),
                payment_mode: paymentMode,
                idempotencyKey: Crypto.randomUUID(), 
                gps_lat: gpsLat,
                gps_lng: gpsLng,
              };

              await db.transaction(async (tx) => {
                await tx.insert(collections).values({ ...localPayload, isSynced: false });

                await tx.insert(syncQueue).values({
                  id: Crypto.randomUUID(),
                  operation: 'CREATE_COLLECTION',
                  payload: JSON.stringify(syncPayload),
                  status: 'pending',
                  createdAt: now,
                });

                // Update local contract balance
                const newBalance = Math.max(0, selectedItem.contract.balance - Number(amount));
                await tx.update(contracts)
                  .set({ balance: newBalance })
                  .where(eq(contracts.id, contractId));

                // Local waterfall: update schedule statuses to keep offline DB accurate
                const contractSchedules = await tx.select()
                  .from(installmentSchedules)
                  .where(eq(installmentSchedules.contractId, contractId));

                const unpaid = contractSchedules
                  .filter(s => s.status !== 'PAID' && s.status !== 'WAIVED')
                  .sort((a, b) => a.dueDate < b.dueDate ? -1 : 1);

                let remaining = Number(amount);
                for (const sched of unpaid) {
                  if (remaining <= 0) break;
                  const due = sched.amountDue - sched.amountPaid;
                  if (due <= 0) continue;

                  if (remaining >= due) {
                    await tx.update(installmentSchedules)
                      .set({ amountPaid: sched.amountDue, status: 'PAID' })
                      .where(eq(installmentSchedules.id, sched.id));
                    remaining -= due;
                  } else {
                    const newPaid = sched.amountPaid + remaining;
                    await tx.update(installmentSchedules)
                      .set({ amountPaid: newPaid, status: 'PARTIALLY_PAID' })
                      .where(eq(installmentSchedules.id, sched.id));
                    remaining = 0;
                  }
                }
              });

              const newBalance = Math.max(0, selectedItem.contract.balance - Number(amount));

              closeModal();

              Alert.alert('✅ Collection Saved', `Receipt ${localPayload.receiptNumber} recorded and queued for sync.`, [
                { 
                  text: 'Print Receipt', 
                  onPress: async () => {
                    await PrintService.printCollectionReceipt(
                      localPayload.receiptNumber,
                      customerName,
                      Number(amount),
                      paymentMode,
                      newBalance,
                      contractId
                    );
                    loadSchedules();
                  } 
                },
                { text: 'Done', onPress: () => loadSchedules() }
              ]);
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to save collection');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveMissedVisit = async () => {
    Keyboard.dismiss();
    if (!selectedItem || !activeTripId) return;

    setSaving(true);
    try {
      const isGpsEnabled = await Location.hasServicesEnabledAsync();
      if (!isGpsEnabled) {
        Alert.alert('GPS Disabled', 'Please turn on Location / GPS services in your device settings.');
        setSaving(false);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location is strictly required to log a missed visit.');
        setSaving(false);
        return;
      }
      let location: Location.LocationObject;
      let timeoutId: any;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
          })
        ]) as Location.LocationObject;
        clearTimeout(timeoutId);
      } catch (gpsErr) {
        if (timeoutId) clearTimeout(timeoutId);
        Alert.alert('GPS Error', 'Could not lock onto GPS satellites. Please move outdoors or near a window for a clear sky view and try again.');
        setSaving(false);
        return;
      }
      
      const syncPayload = {
        trip_id: activeTripId,
        contract_id: selectedItem.contract.id,
        customer_id: selectedItem.customer.id,
        status: missedReason,
        remarks: missedRemarks,
        gps_lat: location.coords.latitude,
        gps_lng: location.coords.longitude,
      };

      const attemptId = Crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(collectionAttempts).values({
          id: attemptId,
          contractId: selectedItem.contract.id,
          customerId: selectedItem.customer.id,
          status: missedReason,
          remarks: missedRemarks,
          createdAt: now,
          gpsLat: location.coords.latitude,
          gpsLng: location.coords.longitude,
        });

        await tx.insert(syncQueue).values({
          id: Crypto.randomUUID(),
          operation: 'CREATE_ATTEMPT',
          payload: JSON.stringify(syncPayload),
          status: 'pending',
          createdAt: now,
        });
      });

      closeModal();
      Alert.alert('Saved', 'Missed visit recorded and queued for sync.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save missed visit.');
    } finally {
      setSaving(false);
    }
  };

  const handleReprintLast = async () => {
    try {
      const lastCols = await db.select().from(collections).orderBy(desc(collections.collectedAt)).limit(1);
      if (lastCols.length === 0) {
        Alert.alert('No Receipts', 'No recent receipts found locally on this device.');
        return;
      }
      const lastCol = lastCols[0];
      const localContracts = await db.select().from(contracts).where(eq(contracts.id, lastCol.contractId));
      const localCustomers = await db.select().from(customers).where(eq(customers.id, lastCol.customerId));
      const customerName = localCustomers.length > 0 ? localCustomers[0].name : 'Customer';
      const balance = localContracts.length > 0 ? localContracts[0].balance : 0;

      await PrintService.printCollectionReceipt(
        lastCol.receiptNumber || 'REC-REPRINT',
        customerName,
        lastCol.amount,
        lastCol.paymentMode,
        balance,
        lastCol.contractId
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reprint last receipt.');
    }
  };

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scheduleList.filter(item => {
      if (item.tab !== activeTab) return false;
      if (selectedAreaId !== null && item.customer?.areaId !== selectedAreaId) return false;
      
      if (query) {
        const c = item.customer;
        const cont = item.contract;
        const nameMatch = c?.name?.toLowerCase().includes(query);
        const nicMatch = c?.nic?.toLowerCase().includes(query);
        const phoneMatch = c?.phone?.toLowerCase().includes(query);
        const prodMatch = cont?.productName?.toLowerCase().includes(query);
        const gNameMatch = cont?.guarantorName?.toLowerCase().includes(query);
        const gPhoneMatch = cont?.guarantorPhone?.toLowerCase().includes(query);
        if (!nameMatch && !nicMatch && !phoneMatch && !prodMatch && !gNameMatch && !gPhoneMatch) return false;
      }
      return true;
    });
  }, [scheduleList, activeTab, selectedAreaId, searchQuery]);

  const { overdueCnt, todayCnt, upcomingCnt, overdueAmount, todayAmount, upcomingAmount } = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let overdueAmt = 0;
    let todayAmt = 0;
    let upcomingAmt = 0;

    const query = searchQuery.trim().toLowerCase();
    scheduleList.forEach(s => {
      if (selectedAreaId !== null && s.customer?.areaId !== selectedAreaId) return;
      
      if (query) {
        const c = s.customer;
        const cont = s.contract;
        const nameMatch = c?.name?.toLowerCase().includes(query);
        const nicMatch = c?.nic?.toLowerCase().includes(query);
        const phoneMatch = c?.phone?.toLowerCase().includes(query);
        const prodMatch = cont?.productName?.toLowerCase().includes(query);
        const gNameMatch = cont?.guarantorName?.toLowerCase().includes(query);
        const gPhoneMatch = cont?.guarantorPhone?.toLowerCase().includes(query);
        if (!nameMatch && !nicMatch && !phoneMatch && !prodMatch && !gNameMatch && !gPhoneMatch) return;
      }
      
      if (s.tab === 'OVERDUE') {
        overdue++;
        overdueAmt += s.remainingDue;
      } else if (s.tab === 'TODAY') {
        today++;
        todayAmt += s.remainingDue;
      } else if (s.tab === 'UPCOMING') {
        upcoming++;
        upcomingAmt += s.remainingDue;
      }
    });
    return { 
      overdueCnt: overdue, 
      todayCnt: today, 
      upcomingCnt: upcoming,
      overdueAmount: overdueAmt,
      todayAmount: todayAmt,
      upcomingAmount: upcomingAmt
    };
  }, [scheduleList, selectedAreaId, searchQuery]);

  const currentTabAmount = activeTab === 'OVERDUE' ? overdueAmount : activeTab === 'TODAY' ? todayAmount : upcomingAmount;
  const currentTabCount = activeTab === 'OVERDUE' ? overdueCnt : activeTab === 'TODAY' ? todayCnt : upcomingCnt;

  const uniqueCustomersInTab = useMemo(() => {
    const custIds = new Set(filteredSchedules.map(item => item.customer?.id).filter(Boolean));
    return custIds.size;
  }, [filteredSchedules]);

  const formatDate = (dateStr: string) => {
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const getDaysLabel = (dateStr: string) => {
    const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(d + 'T00:00:00');
    const diffMs = today.getTime() - due.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day overdue';
    if (diffDays > 1) return `${diffDays} days overdue`;
    if (diffDays === -1) return 'Tomorrow';
    return `In ${Math.abs(diffDays)} days`;
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => { Keyboard.dismiss(); router.back(); }} style={s.backBtn}>
          <Text style={{ color: C.green, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Collections</Text>
        <TouchableOpacity onPress={handleReprintLast} style={s.backBtn}>
          <Text style={{ fontSize: 18 }}>🖨️</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-attribute Search Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6, backgroundColor: C.bg }}>
        <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder }}>
          <Text style={{ fontSize: 16, marginRight: 8, opacity: 0.7 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: C.white, fontSize: 15 }}
            placeholder="Search by name, NIC, or phone..."
            placeholderTextColor={C.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: C.gray, fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Areas horizontal scrolling chips carousel */}
      {areas.length > 0 && (
        <View style={s.areaContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.areaScrollContent}
          >
            <TouchableOpacity
              style={[s.areaChip, selectedAreaId === null && s.areaChipActive]}
              onPress={() => setSelectedAreaId(null)}
              activeOpacity={0.8}
            >
              <Text style={[s.areaChipText, selectedAreaId === null && s.areaChipTextActive]}>
                📍 All Areas
              </Text>
            </TouchableOpacity>
            {areas.map(area => (
              <TouchableOpacity
                key={area.id}
                style={[s.areaChip, selectedAreaId === area.id && s.areaChipActive]}
                onPress={() => setSelectedAreaId(area.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.areaChipText, selectedAreaId === area.id && s.areaChipTextActive]}>
                  {area.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs with counts */}
      <View style={s.tabContainer}>
        <TouchableOpacity 
          style={[s.tabBtn, activeTab === 'OVERDUE' && { backgroundColor: C.redDim, borderColor: C.red }]} 
          onPress={() => setActiveTab('OVERDUE')}
        >
          <Text style={[s.tabText, activeTab === 'OVERDUE' && {color: C.red}]}>Overdue</Text>
          <View style={[s.tabBadge, {backgroundColor: activeTab === 'OVERDUE' ? 'rgba(239,68,68,0.3)' : C.cardBorder}]}>
            <Text style={[s.tabBadgeText, {color: activeTab === 'OVERDUE' ? C.red : C.gray}]}>{overdueCnt}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.tabBtn, activeTab === 'TODAY' && { backgroundColor: C.greenDim, borderColor: C.green }]} 
          onPress={() => setActiveTab('TODAY')}
        >
          <Text style={[s.tabText, activeTab === 'TODAY' && {color: C.green}]}>Today</Text>
          <View style={[s.tabBadge, {backgroundColor: activeTab === 'TODAY' ? 'rgba(5,150,105,0.3)' : C.cardBorder}]}>
            <Text style={[s.tabBadgeText, {color: activeTab === 'TODAY' ? C.green : C.gray}]}>{todayCnt}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.tabBtn, activeTab === 'UPCOMING' && { backgroundColor: C.amberDim, borderColor: C.amber }]} 
          onPress={() => setActiveTab('UPCOMING')}
        >
          <Text style={[s.tabText, activeTab === 'UPCOMING' && {color: C.amber}]}>Upcoming</Text>
          <View style={[s.tabBadge, {backgroundColor: activeTab === 'UPCOMING' ? 'rgba(217,119,6,0.3)' : C.cardBorder}]}>
            <Text style={[s.tabBadgeText, {color: activeTab === 'UPCOMING' ? C.amber : C.gray}]}>{upcomingCnt}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Total Amount Summary KPI Card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={[
          s.totalAmountCard, 
          { 
            backgroundColor: activeTab === 'OVERDUE' ? 'rgba(239, 68, 68, 0.08)' : activeTab === 'TODAY' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
            borderColor: activeTab === 'OVERDUE' ? 'rgba(239, 68, 68, 0.3)' : activeTab === 'TODAY' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)'
          }
        ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 13 }}>{activeTab === 'OVERDUE' ? '⚠️' : activeTab === 'TODAY' ? '📅' : '⏳'}</Text>
                <Text style={[
                  s.totalAmountLabel, 
                  { color: activeTab === 'OVERDUE' ? C.red : activeTab === 'TODAY' ? C.green : C.amber }
                ]}>
                  {activeTab === 'OVERDUE' ? 'TOTAL OVERDUE AMOUNT' : activeTab === 'TODAY' ? 'DUE TODAY PENDING' : 'UPCOMING PIPELINE AMOUNT'}
                </Text>
              </View>
              <Text style={[
                s.totalAmountValue,
                { color: activeTab === 'OVERDUE' ? '#FF6B6B' : activeTab === 'TODAY' ? '#34D399' : '#FBBF24' }
              ]}>
                Rs. {currentTabAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            
            <View style={[
              s.totalAmountBadge, 
              { backgroundColor: activeTab === 'OVERDUE' ? 'rgba(239, 68, 68, 0.2)' : activeTab === 'TODAY' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)' }
            ]}>
              <Text style={[
                s.totalAmountBadgeText, 
                { color: activeTab === 'OVERDUE' ? C.red : activeTab === 'TODAY' ? C.green : C.amber }
              ]}>
                {currentTabCount} {currentTabCount === 1 ? 'Due' : 'Dues'}
              </Text>
            </View>
          </View>

          <View style={s.totalAmountMetaRow}>
            <Text style={{ color: C.gray, fontSize: 11 }}>
              👥 <Text style={{ color: C.white, fontWeight: '700' }}>{uniqueCustomersInTab}</Text> Customers
            </Text>
            <Text style={{ color: C.gray, fontSize: 11 }}>•</Text>
            <Text style={{ color: C.gray, fontSize: 11 }}>
              📊 Avg: <Text style={{ color: C.white, fontWeight: '700' }}>Rs. {currentTabCount > 0 ? Math.round(currentTabAmount / currentTabCount).toLocaleString() : '0'}</Text> / due
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.schedule.id}
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        renderItem={({ item }) => {
          const c = item.customer;
          const schedule = item.schedule;
          const tabColor = item.tab === 'OVERDUE' ? C.red : item.tab === 'TODAY' ? C.green : C.amber;
          const tabDimColor = item.tab === 'OVERDUE' ? C.redDim : item.tab === 'TODAY' ? C.greenDim : C.amberDim;
          
          return (
            <TouchableOpacity
              style={s.scheduleCard}
              onPress={() => openPayModal(item)}
              activeOpacity={0.7}
            >
              {/* Top Row: Icon + Customer Name + Rating + Right Action Buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[s.scheduleIconSmall, { backgroundColor: tabDimColor }]}>
                    <Text style={{ fontSize: 15 }}>{item.tab === 'OVERDUE' ? '⚠️' : item.tab === 'TODAY' ? '📅' : '⏳'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={s.customerName} numberOfLines={2}>{c?.name || 'Unknown'}</Text>
                      {c?.rating != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, marginRight: 2, color: C.amber }}>★</Text>
                          <Text style={{ color: C.amber, fontSize: 10, fontWeight: 'bold' }}>{Number(c.rating).toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right Action Icons (⏱️, 📞, 🗺️) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.contract.pastAttempts && JSON.parse(item.contract.pastAttempts).length > 0 && (
                    <TouchableOpacity 
                      style={[s.quickActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444', borderWidth: 1 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setHistoryData(JSON.parse(item.contract.pastAttempts || '[]'));
                        setHistoryCustomerName(c?.name || 'Unknown');
                        setHistoryModalVisible(true);
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>⏱️</Text>
                    </TouchableOpacity>
                  )}
                  {c?.phone && (
                    <TouchableOpacity 
                      style={s.quickActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${c.phone}`);
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>📞</Text>
                    </TouchableOpacity>
                  )}
                  {c?.gpsLat && c?.gpsLng && (
                    <TouchableOpacity 
                      style={s.quickActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c.gpsLat},${c.gpsLng}`);
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>🗺️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Full Width Address */}
              {c?.address ? (
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8, marginBottom: 4 }} numberOfLines={2}>
                  📍 {c.address}
                </Text>
              ) : null}

              {/* Full Width Badges: Products + Installment + Remaining Balance */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={{ backgroundColor: C.blueDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.2)' }}>
                    <Text style={{ color: C.blue, fontSize: 11, fontWeight: '700' }}>
                      📦 {item.contract.productName || 'Product'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#333' }}>
                    <Text style={{ color: C.gray, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                      Inst #{schedule.installmentNumber}
                    </Text>
                  </View>
                </View>

                {/* Remaining Balance Key-Value Label */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#333' }}>
                    <Text style={{ color: C.gray, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Bal</Text>
                  </View>
                  <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>
                    Rs. {item.contract.balance.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={s.scheduleFooter}>
                <View>
                  <Text style={[s.amountText, { color: tabColor }]}>
                    Rs. {item.remainingDue.toLocaleString()}
                  </Text>
                  <Text style={s.dateText}>
                    {formatDate(schedule.dueDate)} • {getDaysLabel(schedule.dueDate)}
                  </Text>
                </View>
                <View style={[s.collectBtn, { backgroundColor: tabDimColor, borderColor: tabColor }]}>
                  <Text style={[s.collectBtnText, { color: tabColor }]}>Collect →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>
              {activeTab === 'OVERDUE' ? '✅' : activeTab === 'TODAY' ? '📅' : '⏳'}
            </Text>
            <Text style={s.emptyTitle}>
              {activeTab === 'OVERDUE' ? 'No overdue installments!' : activeTab === 'TODAY' ? 'No installments due today' : 'No upcoming installments'}
            </Text>
            <Text style={s.emptySubtitle}>
              {activeTab === 'OVERDUE' ? 'All customers are up to date on this route.' : activeTab === 'TODAY' ? 'Check Overdue or Upcoming tabs.' : 'All future installments will appear here.'}
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PAYMENT / MISSED VISIT MODAL                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior="padding"
          style={s.modalBackdrop}
        >
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={closeModal}>
            <TouchableOpacity activeOpacity={1} style={s.modalContent} onPress={() => {}}>
              
              {/* Modal Header */}
              <View style={s.modalHandle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              
              {selectedItem && (
                <>
                  {/* Customer & Schedule Info */}
                  <View style={s.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={s.modalCustomerName}>{selectedItem.customer?.name || 'Unknown'}</Text>
                        {selectedItem.customer?.rating != null && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 12, marginRight: 2, color: C.amber }}>★</Text>
                            <Text style={{ color: C.amber, fontSize: 12, fontWeight: 'bold' }}>{Number(selectedItem.customer.rating).toFixed(1)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.modalProductName}>📦 {selectedItem.contract.productName || 'Product'}</Text>
                      {selectedItem.contract.guarantorName && (
                        <View style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.25)', marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ color: '#A78BFA', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Guarantor Details</Text>
                            <Text style={{ color: C.white, fontSize: 13, fontWeight: '700', marginTop: 1 }}>{selectedItem.contract.guarantorName}</Text>
                            <Text style={{ color: C.gray, fontSize: 11, marginTop: 1 }}>
                              {selectedItem.contract.guarantorPhone || 'No Phone'} {selectedItem.contract.guarantorNic ? `• NIC: ${selectedItem.contract.guarantorNic}` : ''}
                            </Text>
                          </View>
                          {selectedItem.contract.guarantorPhone && (
                            <TouchableOpacity
                              style={{ backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                              onPress={() => Linking.openURL(`tel:${selectedItem.contract.guarantorPhone}`)}
                            >
                              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>📞 Call</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                      <Text style={{ color: C.gray, fontSize: 18, fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.modalInfoRow}>
                    <View style={s.modalInfoBox}>
                      <Text style={s.modalInfoLabel}>Installment</Text>
                      <Text style={s.modalInfoValue}>#{selectedItem.schedule.installmentNumber}</Text>
                    </View>
                    <View style={s.modalInfoBox}>
                      <Text style={s.modalInfoLabel}>Due Date</Text>
                      <Text style={s.modalInfoValue}>{formatDate(selectedItem.schedule.dueDate)}</Text>
                    </View>
                    <View style={s.modalInfoBox}>
                      <Text style={s.modalInfoLabel}>Amount Due</Text>
                      <Text style={[s.modalInfoValue, { color: C.amber }]}>Rs. {selectedItem.remainingDue.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16, alignItems: 'center' }}>
                    <Text style={{ color: C.gray, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Remaining Contract Balance</Text>
                    <Text style={{ color: C.white, fontSize: 16, fontWeight: '800' }}>Rs. {selectedItem.contract.balance.toLocaleString()}</Text>
                  </View>

                  {/* Tab Switcher: Pay vs Missed */}
                  <View style={s.modalTabRow}>
                    <TouchableOpacity 
                      style={[s.modalTab, modalMode === 'PAY' && { backgroundColor: C.greenDim, borderColor: C.green }]}
                      onPress={() => setModalMode('PAY')}
                    >
                      <Text style={[s.modalTabText, modalMode === 'PAY' && { color: C.green }]}>💰 Collect Payment</Text>
                    </TouchableOpacity>
                    {activeTripId && (
                      <TouchableOpacity 
                        style={[s.modalTab, modalMode === 'MISSED' && { backgroundColor: C.redDim, borderColor: C.red }]}
                        onPress={() => setModalMode('MISSED')}
                      >
                        <Text style={[s.modalTabText, modalMode === 'MISSED' && { color: C.red }]}>❌ Missed Visit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {modalMode === 'PAY' ? (
                    <View>
                      {/* Payment Mode (Cash Only) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5, 150, 105, 0.12)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>💵</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.green, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash Collection</Text>
                          <Text style={{ color: C.gray, fontSize: 11, marginTop: 1 }}>Payment mode locked to Cash for trip reconciliation</Text>
                        </View>
                      </View>

                      <TextInput
                        style={s.input}
                        placeholder="Amount Received (Rs.) *"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                      />
                      <TextInput
                        style={s.input}
                        placeholder="Manual Offline Receipt # (Optional)"
                        placeholderTextColor="#666"
                        value={receiptNumber}
                        onChangeText={setReceiptNumber}
                      />

                      <TouchableOpacity 
                        style={[s.saveBtn, saving && { opacity: 0.5 }]} 
                        onPress={handleSaveCollection}
                        disabled={saving}
                        activeOpacity={0.8}
                      >
                        <Text style={s.saveBtnText}>{saving ? 'Processing...' : `Collect Rs. ${amount || '0'}`}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <View style={s.paymentRow}>
                        {['CUSTOMER_UNAVAILABLE', 'PROMISE_TO_PAY', 'MISSED'].map(reason => (
                          <TouchableOpacity
                            key={reason}
                            style={[s.modeBtn, missedReason === reason && { backgroundColor: C.red, borderColor: C.red }]}
                            onPress={() => setMissedReason(reason)}
                          >
                            <Text style={[s.modeText, missedReason === reason && { color: C.white }]}>
                              {reason.replace(/_/g, ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TextInput
                        style={s.input}
                        placeholder="Remarks (Optional) e.g., Next week"
                        placeholderTextColor="#666"
                        value={missedRemarks}
                        onChangeText={setMissedRemarks}
                      />

                      <TouchableOpacity 
                        style={[s.saveBtn, { backgroundColor: C.redDim, borderWidth: 1, borderColor: C.red }, saving && { opacity: 0.5 }]} 
                        onPress={handleSaveMissedVisit}
                        disabled={saving}
                      >
                        <Text style={[s.saveBtnText, { color: C.red }]}>{saving ? 'Saving...' : 'Log Missed Visit (GPS)'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MISSED COLLECTION HISTORY MODAL                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setHistoryModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={s.modalContent} onPress={() => {}}>
              <View style={s.modalHandle} />
              
              <View style={s.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalCustomerName}>{historyCustomerName}</Text>
                  <Text style={s.modalProductName}>Missed Collection History</Text>
                </View>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={s.modalCloseBtn}>
                  <Text style={{ color: '#9CA3AF', fontSize: 18, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {historyData.map((attempt, idx) => (
                  <View key={idx} style={{ backgroundColor: '#1A1A1A', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{attempt.status.replace(/_/g, ' ')}</Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{formatDate(attempt.created_at)}</Text>
                    </View>
                    {attempt.remarks ? (
                      <Text style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>"{attempt.remarks}"</Text>
                    ) : (
                      <Text style={{ color: '#9CA3AF', fontSize: 13, opacity: 0.5 }}>No remarks left</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
              
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  areaContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  areaScrollContent: {
    gap: 8,
    paddingRight: 20,
  },
  areaChip: {
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  areaChipActive: {
    backgroundColor: C.blueDim,
    borderColor: C.blue,
  },
  areaChipText: {
    color: C.gray,
    fontSize: 13,
    fontWeight: '600',
  },
  areaChipTextActive: {
    color: C.blue,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },

  // Tabs
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorder, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabText: { color: C.gray, fontSize: 13, fontWeight: '700' },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '800' },

  // Total Amount KPI Card
  totalAmountCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  totalAmountLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  totalAmountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalAmountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  totalAmountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Schedule Cards
  scheduleCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  scheduleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scheduleIconSmall: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  customerName: { color: C.white, fontSize: 15, fontWeight: '700' },
  productLabel: { color: C.gray, fontSize: 12, marginTop: 2 },
  scheduleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  amountText: { fontSize: 18, fontWeight: '800' },
  dateText: { color: C.gray, fontSize: 12, marginTop: 2 },
  collectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  collectBtnText: { fontSize: 13, fontWeight: '700' },
  mapBtn: { padding: 8, backgroundColor: C.cardBorder, borderRadius: 10 },
  quickActionBtn: { width: 34, height: 34, backgroundColor: C.cardBorder, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { color: C.gray, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    borderWidth: 1, borderColor: C.cardBorder, borderBottomWidth: 0,
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalCustomerName: { color: C.white, fontSize: 20, fontWeight: '800' },
  modalProductName: { color: C.gray, fontSize: 13, marginTop: 2 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  
  modalInfoRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modalInfoBox: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  modalInfoLabel: { color: C.gray, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  modalInfoValue: { color: C.white, fontSize: 14, fontWeight: '800' },

  modalTabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modalTab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
  modalTabText: { color: C.gray, fontSize: 13, fontWeight: '700' },

  // Payment Form
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  modeBtn: { backgroundColor: C.bg, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  modeBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  modeText: { color: C.gray, fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: C.bg, color: C.white, padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#333', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
