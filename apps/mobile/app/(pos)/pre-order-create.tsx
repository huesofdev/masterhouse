import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Keyboard, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { db } from '../../src/db';
import { customers, products, syncQueue, preOrders, preOrderItems } from '../../src/db/schema';
import * as Crypto from 'expo-crypto';
import { useTripStore } from '../../src/store/useTripStore';
import { PrintService } from '../../src/lib/PrintService';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', blue: '#0EA5E9',
};

export default function PreOrderCreate() {
  const { activeTripId, activeRouteId } = useTripStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);
  
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<{product_id: string, quantity: number, name: string, price: number}[]>([]);
  const [advancePayment, setAdvancePayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [saleTypePreference, setSaleTypePreference] = useState('DIRECT');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (step > 1) {
        setStep((prev) => (prev - 1) as any);
        return true;
      }
      if (selectedCustomerId || cart.length > 0) {
        Alert.alert("Discard Booking", "Are you sure you want to discard this booking?", [
          { text: "No", style: "cancel" },
          { text: "Yes", style: "destructive", onPress: () => router.back() }
        ]);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step, selectedCustomerId, cart]);

  const loadData = async () => {
    try {
      const c = await db.select().from(customers);
      setCustomerList(c);
      const p = await db.select().from(products);
      setProductList(p);

      // Auto-select the latest customer
      if (c.length > 0) {
        const sorted = [...c].sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
        setSelectedCustomerId(sorted[0].id);
      }
    } catch (e) {
      console.warn('Failed to load data', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const sortedCustomers = [...customerList].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });

  const filteredCustomers = sortedCustomers.filter(c => {
    if (!searchCustomer) return true;
    const q = searchCustomer.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.nic || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });
  
  const filteredProducts = productList.filter(p => {
    if (!searchProduct) return true;
    const q = searchProduct.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
  });

  const displayCustomers = searchCustomer ? filteredCustomers.slice(0, 10) : filteredCustomers.slice(0, 1);
  const displayProducts = searchProduct ? filteredProducts.slice(0, 10) : filteredProducts.slice(0, 3);

  const addToCart = (product: any) => {
    setCart(prev => {
      const exists = prev.find(item => item.product_id === product.id);
      if (exists) {
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, quantity: 1, name: product.name, price: product.price }];
    });
  };

  const updateCartQty = (product_id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === product_id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (product_id: string) => {
    setCart(prev => prev.filter(item => item.product_id !== product_id));
  };



  const getItemLineTotal = (item: any) => {
    return item.price * item.quantity;
  };

  const cartTotal = cart.reduce((sum, item) => sum + getItemLineTotal(item), 0);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Required', 'Please select a customer.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Required', 'Please add at least one product to the booking.');
      return;
    }

    setSaving(true);
    try {
      const preOrderId = Crypto.randomUUID();
      const now = new Date();

      const customer = customerList.find(c => c.id === selectedCustomerId);
      const advPayment = parseFloat(advancePayment) || 0;

      const payload = {
        id: preOrderId,
        customer_id: selectedCustomerId,
        route_id: activeRouteId || customer?.routeId,
        advance_payment: advPayment,
        payment_method: paymentMethod,
        sale_type_preference: saleTypePreference,
        receipt_number: receiptNumber,
        offline_receipt_number: preOrderId.split('-')[0].toUpperCase(),
        remarks: remarks,
        status: 'PENDING',
        created_at: now,
        trip_id: activeTripId, // Pass activeTripId to backend syncPayload
        items: cart.map(item => ({ 
          product_id: item.product_id, 
          quantity: item.quantity
        })),
      };

      await db.transaction(async (tx) => {
        await tx.insert(preOrders).values({
          id: payload.id,
          customerId: payload.customer_id,
          advancePayment: payload.advance_payment,
          paymentMethod: payload.payment_method,
          saleTypePreference: payload.sale_type_preference,
          receiptNumber: payload.receipt_number,
          offlineReceiptNumber: payload.offline_receipt_number,
          status: 'PENDING_SYNC', 
          remarks: payload.remarks,
          createdAt: payload.created_at,
        });

        for (const item of payload.items) {
          await tx.insert(preOrderItems).values({
            id: Crypto.randomUUID(),
            preOrderId: payload.id,
            productId: item.product_id,
            quantity: item.quantity,
            discountInput: null,
          });
        }

        await tx.insert(syncQueue).values({
          id: Crypto.randomUUID(),
          operation: 'CREATE_PRE_ORDER',
          payload: JSON.stringify(payload),
          status: 'pending',
          createdAt: now,
        });
      });

      const offlineReceiptNum = payload.offline_receipt_number!;
      const customerRecord = customerList.find(c => c.id === selectedCustomerId);
      const printItems = cart.map(item => ({ name: item.name, qty: item.quantity, unitPrice: item.price }));
      const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      Alert.alert('✅ Booking Saved', `Booking #${offlineReceiptNum} queued for sync.`, [
        {
          text: '🖨️ Print Receipt',
          onPress: async () => {
            await PrintService.printBookingReceipt(
              offlineReceiptNum,
              customerRecord?.name || 'Customer',
              printItems,
              parseFloat(advancePayment) || 0,
              cartTotal,
              paymentMethod,
              saleTypePreference as 'DIRECT' | 'INSTALLMENT',
              remarks || undefined
            );
            router.back();
          }
        },
        { text: 'Done', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save booking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            if (step > 1) {
              setStep((prev) => (prev - 1) as any);
            } else if (selectedCustomerId || cart.length > 0) {
              Alert.alert("Discard Booking", "Are you sure you want to discard this booking?", [
                { text: "No", style: "cancel" },
                { text: "Yes", style: "destructive", onPress: () => router.back() }
              ]);
            } else {
              router.back();
            }
          }} 
          style={s.backBtn}
        >
          <Text style={{ color: C.blue, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={s.headerTitle}>New Booking</Text>
          <Text style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>
            {step === 1 ? "Step 1 of 3: Select Customer" : step === 2 ? "Step 2 of 3: Add Items" : "Step 3 of 3: Review & Confirm"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* STEP 1: SELECT CUSTOMER */}
          {step === 1 && (
            <View style={{ marginTop: 10 }}>
              <Text style={s.sectionTitle}>SELECT CUSTOMER</Text>
              <TextInput
                style={[s.input, { marginBottom: 12 }]}
                placeholder="Search by Name, NIC, or Phone..."
                placeholderTextColor="#666"
                value={searchCustomer}
                onChangeText={setSearchCustomer}
              />
              {displayCustomers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.optionCard, selectedCustomerId === c.id && s.optionSelected]}
                  onPress={() => setSelectedCustomerId(c.id)}
                >
                  <Text style={{ fontSize: 16 }}>👤</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[s.optionText, selectedCustomerId === c.id && { color: C.amber }]}>{c.name}</Text>
                      {c.rating != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, marginRight: 2, color: C.amber }}>★</Text>
                          <Text style={{ color: C.amber, fontSize: 10, fontWeight: 'bold' }}>{Number(c.rating).toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                      {c.nic ? `NIC: ${c.nic}` : 'No NIC'} • {c.phone ? c.phone : 'No Phone'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredCustomers.length === 0 && searchCustomer !== '' && (
                <Text style={{ color: C.gray, textAlign: 'center', marginBottom: 10 }}>No customers found.</Text>
              )}

              <TouchableOpacity style={s.addNewBtn} onPress={() => { Keyboard.dismiss(); router.push('/(pos)/customer-create'); }}>
                <Text style={s.addNewBtnText}>+ Add New Customer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: PRODUCTS & DETAILS */}
          {step === 2 && (
            <View style={{ marginTop: 10 }}>
              <Text style={s.sectionTitle}>SELECT PRODUCTS</Text>
              <TextInput
                style={[s.input, { marginBottom: 12 }]}
                placeholder="Search by Name or SKU..."
                placeholderTextColor="#666"
                value={searchProduct}
                onChangeText={setSearchProduct}
              />
              {displayProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={s.optionCard}
                  onPress={() => addToCart(p)}
                >
                  <Text style={{ fontSize: 16 }}>📦</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.optionText}>{p.name}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>SKU: {p.sku} • Rs {p.price}</Text>
                  </View>
                  <Text style={{ color: C.blue, fontWeight: '700' }}>+ Add</Text>
                </TouchableOpacity>
              ))}

              {cart.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={s.sectionTitle}>CART ({cart.length} ITEMS)</Text>
                  {cart.map(item => (
                    <View key={item.product_id} style={s.cartItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.white, fontSize: 14, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>Rs {item.price} x {item.quantity}</Text>
                        <Text style={{ color: C.amber, fontSize: 13, fontWeight: '600', marginTop: 6 }}>Line Total: Rs {getItemLineTotal(item).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                        <TouchableOpacity onPress={() => updateCartQty(item.product_id, -1)}>
                          <Text style={{ color: C.white, fontSize: 20 }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ color: C.white, fontSize: 16, fontWeight: 'bold' }}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateCartQty(item.product_id, 1)}>
                          <Text style={{ color: C.white, fontSize: 20 }}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeFromCart(item.product_id)} style={{ marginLeft: 8 }}>
                          <Text style={{ color: 'red', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <Text style={{ color: C.amber, fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginTop: 8 }}>Total: Rs {cartTotal.toLocaleString()}</Text>
                </View>
              )}

              <Text style={s.sectionTitle}>ORDER DETAILS</Text>
              <TextInput
                style={s.input}
                placeholder="Advance Payment (Rs)"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={advancePayment}
                onChangeText={setAdvancePayment}
              />
              
              {/* Payment Method (Cash Locked) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5, 150, 105, 0.12)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>💵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.green, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash Advance Payment</Text>
                  <Text style={{ color: C.gray, fontSize: 11, marginTop: 1 }}>All booking advance deposits are collected in Cash</Text>
                </View>
              </View>

              <Text style={{ color: C.gray, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>Sale Type Preference</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['DIRECT', 'INSTALLMENT'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[s.chip, saleTypePreference === type && s.chipSelected]} 
                    onPress={() => setSaleTypePreference(type)}
                  >
                    <Text style={[s.chipText, saleTypePreference === type && s.chipTextSelected]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={s.input}
                placeholder="Receipt Number (Optional)"
                placeholderTextColor="#666"
                value={receiptNumber}
                onChangeText={setReceiptNumber}
              />
              
              <TextInput
                style={s.input}
                placeholder="Remarks (Optional)"
                placeholderTextColor="#666"
                value={remarks}
                onChangeText={setRemarks}
              />
            </View>
          )}

          {/* STEP 3: PREVIEW & CONFIRM */}
          {step === 3 && (() => {
            const customer = customerList.find(c => c.id === selectedCustomerId);
            return (
              <View style={{ marginTop: 10 }}>
                <Text style={s.sectionTitle}>SELECTED CUSTOMER</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{customer?.name || 'Walk-in Customer'}</Text>
                    {customer?.rating != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, marginRight: 2, color: C.amber }}>★</Text>
                        <Text style={{ color: C.amber, fontSize: 10, fontWeight: 'bold' }}>{Number(customer.rating).toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>
                    {customer?.nic ? `NIC: ${customer.nic}` : 'No NIC'} • {customer?.phone ? customer.phone : 'No Phone'}
                  </Text>
                </View>

                <Text style={s.sectionTitle}>BOOKED ITEMS</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 }}>
                  {cart.map((item, idx) => (
                    <View key={item.product_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: idx === cart.length - 1 ? 0 : 12 }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>{item.name}</Text>
                        <Text style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>Rs. {item.price.toLocaleString()} x {item.quantity}</Text>
                      </View>
                      <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>Rs. {getItemLineTotal(item).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                <Text style={s.sectionTitle}>ORDER SETTINGS</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: C.gray, fontSize: 13 }}>Payment Method</Text>
                    <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>{paymentMethod.replace('_', ' ')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: receiptNumber || remarks ? 10 : 0 }}>
                    <Text style={{ color: C.gray, fontSize: 13 }}>Sale Type Preference</Text>
                    <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>{saleTypePreference}</Text>
                  </View>
                  {receiptNumber ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: remarks ? 10 : 0 }}>
                      <Text style={{ color: C.gray, fontSize: 13 }}>Receipt Number</Text>
                      <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>{receiptNumber}</Text>
                    </View>
                  ) : null}
                  {remarks ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: C.gray, fontSize: 13 }}>Remarks</Text>
                      <Text style={{ color: C.white, fontSize: 13, fontWeight: '700', flex: 0.7, textAlign: 'right' }}>{remarks}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={s.sectionTitle}>FINANCIAL SUMMARY</Text>
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: C.gray, fontSize: 13 }}>Total Booking Value</Text>
                    <Text style={{ color: C.white, fontSize: 13, fontWeight: '700' }}>Rs. {cartTotal.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: C.gray, fontSize: 13 }}>Advance Paid</Text>
                    <Text style={{ color: C.green, fontSize: 13, fontWeight: '700' }}>Rs. {(parseFloat(advancePayment) || 0).toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 4 }}>
                    <Text style={{ color: C.gray, fontSize: 13, fontWeight: '700' }}>Balance Due</Text>
                    <Text style={{ color: C.amber, fontSize: 15, fontWeight: '800' }}>Rs. {(cartTotal - (parseFloat(advancePayment) || 0)).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          <View style={{ height: 180 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer (Navigation & Totals) */}
      <View style={s.footer}>
        <View style={s.subRow}>
          <Text style={s.totalLabel}>{step === 3 ? "Remaining Balance" : "Estimated Subtotal"}</Text>
          <Text style={s.totalValue}>
            Rs. {step === 3 
              ? (cartTotal - (parseFloat(advancePayment) || 0)).toLocaleString()
              : cartTotal.toLocaleString()}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {step > 1 && (
            <TouchableOpacity 
              style={[s.confirmBtn, { flex: 0.4, backgroundColor: '#333' }]} 
              onPress={() => {
                Keyboard.dismiss();
                setStep((prev) => (prev - 1) as any);
              }}
            >
              <Text style={s.confirmBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step === 3 ? (
            <TouchableOpacity 
              style={[s.confirmBtn, { flex: 1, backgroundColor: C.green, opacity: saving ? 0.7 : 1 }]} 
              onPress={() => {
                Keyboard.dismiss();
                Alert.alert(
                  "Confirm Booking",
                  "Are you sure you want to save this pre-order booking?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Save", style: "default", onPress: () => handleSave() }
                  ]
                );
              }} 
              disabled={saving}
            >
              <Text style={s.confirmBtnText}>{saving ? 'Saving...' : 'Complete Booking'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[s.confirmBtn, { flex: 1, backgroundColor: C.amber }]} 
              onPress={() => {
                Keyboard.dismiss();
                if (step === 1) {
                  if (!selectedCustomerId) {
                    Alert.alert('Required', 'Please select a customer.');
                    return;
                  }
                  setStep(2);
                } else if (step === 2) {
                  if (cart.length === 0) {
                    Alert.alert('Required', 'Please add at least one product to the booking.');
                    return;
                  }
                  const adv = parseFloat(advancePayment);
                  if (advancePayment.trim() !== '') {
                    if (isNaN(adv) || adv < 0) {
                      Alert.alert('Invalid Input', 'Please enter a valid advance payment amount.');
                      return;
                    }
                    if (adv > cartTotal) {
                      Alert.alert('Invalid Input', 'Advance payment cannot exceed the total booking amount.');
                      return;
                    }
                  }
                  setStep(3);
                }
              }}
            >
              <Text style={[s.confirmBtnText, { color: '#000' }]}>Next Step</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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

  sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },
  input: { backgroundColor: C.card, color: C.white, padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder, fontSize: 15 },
  
  optionCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', alignItems: 'center' },
  optionSelected: { borderColor: C.amber, backgroundColor: C.amberDim },
  optionText: { color: C.white, fontSize: 15, fontWeight: '700' },
  
  cartItem: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { backgroundColor: C.cardBorder, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  chipSelected: { backgroundColor: C.amberDim, borderColor: C.amber },
  chipText: { color: C.gray, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: C.amber, fontWeight: '700' },
  
  addNewBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', marginTop: 4, marginBottom: 16
  },
  addNewBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.cardBorder, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  totalLabel: { color: C.gray, fontSize: 16 },
  totalValue: { color: C.amber, fontSize: 24, fontWeight: '800' },
  confirmBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center'
  },
  confirmBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
