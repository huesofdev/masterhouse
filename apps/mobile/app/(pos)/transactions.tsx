import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { db } from '../../src/db';
import { sales, collections, customers, contracts, syncQueue, preOrders, preOrderItems, products, collectionAttempts } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { PrintService } from '../../src/lib/PrintService';
import * as Linking from 'expo-linking';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.12)', blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

type Transaction = {
  id: string;
  type: 'SALE' | 'COLLECTION' | 'MISSED_VISIT' | 'BOOKING';
  date: Date;
  amount?: number;
  customerName: string;
  gpsLat?: string | null;
  gpsLng?: string | null;
  metadata: any;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const txs: Transaction[] = [];

      // Fetch all customers for quick lookup
      const allCustomers = await db.select().from(customers);
      const customerMap = new Map();
      allCustomers.forEach(c => customerMap.set(c.id, c));

      // 1. Fetch Sales
      const allSales = await db.select().from(sales);
      const preOrdersRes = await db.select().from(preOrders);
      for (const s of allSales) {
        let cust = s.customerId ? customerMap.get(s.customerId) : null;
        
        let bookingDeposit = 0;
        if (s.preOrderId) {
          const po = preOrdersRes.find(p => p.id === s.preOrderId);
          if (po) bookingDeposit = po.advancePayment || 0;
        }

        let actualCashCollected = 0;
        if (s.saleType === 'INSTALLMENT') {
          actualCashCollected = Math.max(0, (s.downpayment || 0) - bookingDeposit);
        } else {
          actualCashCollected = s.totalAmount || 0;
        }

        txs.push({
          id: s.id,
          type: 'SALE',
          date: new Date(s.createdAt),
          amount: actualCashCollected,
          customerName: cust ? cust.name : 'Walk-in',
          gpsLat: cust?.gpsLat,
          gpsLng: cust?.gpsLng,
          metadata: s,
        });
      }

      // 2. Fetch Collections
      const allCols = await db.select().from(collections);
      for (const c of allCols) {
        let cust = c.customerId ? customerMap.get(c.customerId) : null;
        let balance = 0;
        if (c.contractId) {
          const con = await db.select().from(contracts).where(eq(contracts.id, c.contractId)).limit(1);
          if (con.length > 0) balance = con[0].balance;
        }
        txs.push({
          id: c.id,
          type: 'COLLECTION',
          date: new Date(c.collectedAt),
          amount: c.amount,
          customerName: cust ? cust.name : 'Unknown Customer',
          gpsLat: cust?.gpsLat,
          gpsLng: cust?.gpsLng,
          metadata: { ...c, balance },
        });
      }

      // 3. Fetch Missed Visits from collectionAttempts
      const allAttempts = await db.select().from(collectionAttempts);
      for (const a of allAttempts) {
        let cust = a.customerId ? customerMap.get(a.customerId) : null;
        txs.push({
          id: a.id,
          type: 'MISSED_VISIT',
          date: new Date(a.createdAt),
          customerName: cust ? cust.name : 'Unknown Customer',
          gpsLat: a.gpsLat?.toString(),
          gpsLng: a.gpsLng?.toString(),
          metadata: { status: a.status, remarks: a.remarks },
        });
      }

      // 4. Fetch Bookings (PreOrders)
      const allBookings = await db.select().from(preOrders);
      for (const b of allBookings) {
        if (b.status === 'PENDING') continue; // Skip downloaded pre-orders, only show new ones created locally today
        let cust = b.customerId ? customerMap.get(b.customerId) : null;
        txs.push({
          id: b.id,
          type: 'BOOKING',
          date: new Date(b.createdAt),
          amount: b.advancePayment,
          customerName: cust ? cust.name : 'Walk-in',
          gpsLat: cust?.gpsLat,
          gpsLng: cust?.gpsLng,
          metadata: b,
        });
      }

      // Sort descending by date
      txs.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(txs);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTransactions();
  }, []);

  const handlePrint = async (tx: Transaction) => {
    if (tx.type === 'SALE') {
      await PrintService.printSpecificSale(tx.id);
    } else if (tx.type === 'COLLECTION') {
      await PrintService.printCollectionReceipt(
        tx.metadata.receiptNumber,
        tx.customerName,
        tx.amount || 0,
        tx.metadata.paymentMode,
        tx.metadata.balance,
        tx.metadata.contractId
      );
    } else if (tx.type === 'BOOKING') {
      try {
        const itemsRes = await db.select().from(preOrderItems).where(eq(preOrderItems.preOrderId, tx.id));
        const allProducts = await db.select().from(products);
        const prodMap = new Map();
        allProducts.forEach(p => prodMap.set(p.id, p));

        const mappedItems = itemsRes.map(i => {
          const p = prodMap.get(i.productId);
          return {
            name: p?.name || 'Unknown',
            qty: i.quantity,
            unitPrice: p?.price || 0,
          };
        });

        let cartTotal = 0;
        mappedItems.forEach(i => cartTotal += i.qty * i.unitPrice);

        await PrintService.printBookingReceipt(
          tx.metadata.offlineReceiptNumber || tx.metadata.receiptNumber || 'N/A',
          tx.customerName,
          mappedItems,
          tx.amount || 0,
          cartTotal,
          'CASH', // paymentMethod
          tx.metadata.saleTypePreference || 'DIRECT'
        );
      } catch (err) {
        console.error("Failed to print booking", err);
      }
    }
  };

  const handleNavigate = (lat: string | null | undefined, lng: string | null | undefined) => {
    if (lat && lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trip History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={C.amber} size="large" style={{ marginVertical: 40 }} />
        ) : transactions.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
            <Text style={{ color: C.gray, fontSize: 16 }}>No activity found for this trip.</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={s.txCard}>
              <View style={s.txTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.iconBox, { 
                    backgroundColor: tx.type === 'SALE' ? C.amberDim : tx.type === 'COLLECTION' ? C.greenDim : tx.type === 'BOOKING' ? C.blueDim : C.redDim 
                  }]}>
                    <Text style={{ fontSize: 18 }}>
                      {tx.type === 'SALE' ? '🛒' : tx.type === 'COLLECTION' ? '💰' : tx.type === 'BOOKING' ? '📅' : '❌'}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.txType}>
                      {tx.type === 'MISSED_VISIT' ? 'MISSED VISIT' : tx.type}
                    </Text>
                    <Text style={s.txDate}>{tx.date.toLocaleString()}</Text>
                  </View>
                </View>
                {tx.amount !== undefined && (
                  <Text style={[s.txAmount, { color: tx.type === 'SALE' ? C.amber : tx.type === 'COLLECTION' ? C.green : tx.type === 'BOOKING' ? C.blue : C.red }]}>
                    Rs. {tx.amount.toLocaleString()}
                  </Text>
                )}
              </View>
              
              <View style={s.txMiddle}>
                <Text style={s.txCustomer}>Customer: {tx.customerName}</Text>
                {tx.type === 'COLLECTION' && (
                  <Text style={s.txReceipt}>Receipt #: {tx.metadata.receiptNumber}</Text>
                )}
                {tx.type === 'SALE' && (
                  <Text style={s.txReceipt}>Type: {tx.metadata.saleType}</Text>
                )}
                {tx.type === 'BOOKING' && (
                  <Text style={s.txReceipt}>Booking #: {tx.metadata.offlineReceiptNumber || tx.metadata.receiptNumber || 'N/A'}</Text>
                )}
                {tx.type === 'MISSED_VISIT' && (
                  <Text style={[s.txReceipt, { color: C.red }]}>Reason: {tx.metadata.status?.replace(/_/g, ' ')}</Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {tx.gpsLat && tx.gpsLng && (
                  <TouchableOpacity 
                    style={[s.actionBtn, { flex: 1, borderColor: '#333' }]}
                    onPress={() => handleNavigate(tx.gpsLat, tx.gpsLng)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.actionBtnText}>🗺️ Navigate</Text>
                  </TouchableOpacity>
                )}
                
                {tx.type !== 'MISSED_VISIT' && (
                  <TouchableOpacity 
                    style={[s.actionBtn, { flex: 1, borderColor: '#333' }]}
                    onPress={() => handlePrint(tx)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.actionBtnText}>🖨️ Print Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, paddingBottom: 12, marginBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  
  txCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  txTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  txType: { color: C.white, fontSize: 16, fontWeight: '700' },
  txDate: { color: C.gray, fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 18, fontWeight: '800' },
  
  txMiddle: {
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.cardBorder,
    paddingVertical: 12, marginBottom: 12,
  },
  txCustomer: { color: C.white, fontSize: 14, fontWeight: '600' },
  txReceipt: { color: C.gray, fontSize: 13, marginTop: 4, fontFamily: 'monospace' },
  
  actionBtn: {
    backgroundColor: '#1A1A1A', paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', borderWidth: 1,
  },
  actionBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
});
