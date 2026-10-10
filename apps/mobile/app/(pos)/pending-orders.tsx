import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Linking, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../src/db';
import { customers, products, preOrders, preOrderItems, tripStock } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { useCartStore } from '../../src/store/useCartStore';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

export default function PendingOrders() {
  const [orderList, setOrderList] = useState<any[]>([]);
  const { addItemWithQty, clearCart, setPreOrderId, setCustomer } = useCartStore();

  const loadOrders = async () => {
    try {
      const orders = await db.select().from(preOrders).where(eq(preOrders.status, 'PENDING'));
      if (orders.length === 0) {
        setOrderList([]);
        return;
      }

      const cList = await db.select().from(customers);
      const pList = await db.select().from(products);
      const allItems = await db.select().from(preOrderItems);

      const flatList = orders.map(order => {
        const customer = cList.find(c => c.id === order.customerId);
        const items = allItems.filter(i => i.preOrderId === order.id).map(i => {
          return { ...i, product: pList.find(p => p.id === i.productId) };
        });
        return { order, customer, items };
      });
      
      setOrderList(flatList);
    } catch (e) {
      console.warn('Failed to load pending orders', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const handleDeliver = async (item: any) => {
    try {
      if (!item.items || item.items.length === 0) return;
      
      let hasSerialized = false;

      for (const orderItem of item.items) {
        if (!orderItem.product) continue;
        if (orderItem.product.isSerialized) hasSerialized = true;

        const stockRecords = await db.select().from(tripStock).where(eq(tripStock.productId, orderItem.product.id));
        let available = 0;
        for (const record of stockRecords) {
          available += (record.loadedQty - record.soldQty);
        }

        if (available < orderItem.quantity) {
          Alert.alert('Insufficient Stock', `You only have ${available} of ${orderItem.product.name} left in your vehicle, but the order requires ${orderItem.quantity}.`);
          return;
        }
      }

      Alert.alert(
        "Deliver Order",
        `Deliver ${item.items.length} items to ${item.customer?.name || 'Customer'}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Start Delivery", 
            onPress: () => {
              clearCart();
              setPreOrderId(item.order.id);
              setCustomer(item.order.customerId);
              
              if (hasSerialized) {
                // Pre-populate bulk items, and add placeholders for serialized items to act as caps
                for (const orderItem of item.items) {
                  if (orderItem.product) {
                    if (!orderItem.product.isSerialized) {
                      addItemWithQty({
                        cartItemId: orderItem.product.id,
                        productId: orderItem.product.id,
                        name: orderItem.product.name,
                        price: orderItem.product.price,
                        qty: orderItem.quantity,  // exact booked qty
                        minDownpaymentAmount: orderItem.product.minDownpaymentAmount,
                        discountInput: orderItem.discountInput || undefined,
                      });
                    } else {
                      // Placeholder to store the booked quantity so catalog screen knows the cap
                      addItemWithQty({
                        cartItemId: `placeholder_${orderItem.product.id}`,
                        productId: orderItem.product.id,
                        name: orderItem.product.name,
                        price: orderItem.product.price,
                        qty: orderItem.quantity,
                        minDownpaymentAmount: orderItem.product.minDownpaymentAmount,
                        isFulfillmentPlaceholder: true,
                        discountInput: orderItem.discountInput || undefined,
                      } as any);
                    }
                  }
                }
                Alert.alert('Serialized Products', 'Bulk items added to cart. Please select serial numbers from the catalog for the remaining items.');
                router.push('/(pos)');
              } else {
                for (const orderItem of item.items) {
                  if (orderItem.product) {
                    addItemWithQty({
                      cartItemId: orderItem.product.id,
                      productId: orderItem.product.id,
                      name: orderItem.product.name,
                      price: orderItem.product.price,
                      qty: orderItem.quantity,  // exact booked qty
                      minDownpaymentAmount: orderItem.product.minDownpaymentAmount,
                      discountInput: orderItem.discountInput || undefined,
                    });
                  }
                }
                router.push('/(pos)/cart');
              }
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to check stock');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pending Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {orderList.length === 0 ? (
          <Text style={{ color: C.gray, textAlign: 'center', marginTop: 40 }}>No pending orders found.</Text>
        ) : (
          orderList.map((item, idx) => (
            <View key={item.order.id || idx} style={s.orderCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.customerName}>{item.customer?.name || 'Unknown'}</Text>
                  <Text style={s.customerPhone}>{item.customer?.phone || 'No Phone'}</Text>
                  {item.customer?.address && <Text style={s.customerAddress}>{item.customer.address}</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.customer?.phone && (
                    <TouchableOpacity 
                      style={s.navBtn}
                      onPress={() => Linking.openURL(`tel:${item.customer.phone}`)}
                    >
                      <Text style={{ fontSize: 18 }}>📞</Text>
                      <Text style={s.navBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {item.customer?.gpsLat && item.customer?.gpsLng && (
                    <TouchableOpacity 
                      style={s.navBtn}
                      onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.customer.gpsLat},${item.customer.gpsLng}`)}
                    >
                      <Text style={{ fontSize: 18 }}>📍</Text>
                      <Text style={s.navBtnText}>Navigate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={s.divider} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {item.items.map((i: any) => (
                     <Text key={i.id} style={s.productName}>{i.quantity}x {i.product?.name || 'Unknown Product'}</Text>
                  ))}
                  {item.order.advancePayment > 0 && <Text style={{ color: C.amber, fontSize: 13, marginTop: 4 }}>Advance Deposit: Rs {item.order.advancePayment}</Text>}
                  {item.order.remarks && <Text style={s.remarks}>Note: {item.order.remarks}</Text>}
                </View>
                <TouchableOpacity 
                  style={s.deliverBtn}
                  onPress={() => handleDeliver(item)}
                >
                  <Text style={s.deliverBtnText}>Deliver Now</Text>
                </TouchableOpacity>
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },

  orderCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  customerName: { color: C.white, fontSize: 16, fontWeight: '700' },
  customerPhone: { color: C.gray, fontSize: 13, marginTop: 4 },
  customerAddress: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  navBtn: { alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  navBtnText: { color: C.blue, fontSize: 10, fontWeight: '700', marginTop: 4 },
  
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  
  productName: { color: C.amber, fontSize: 15, fontWeight: '700' },
  remarks: { color: C.gray, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  
  deliverBtn: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  deliverBtnText: { color: C.white, fontWeight: '800', fontSize: 13 },
});
