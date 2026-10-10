import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../../src/store/useCartStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useState, useEffect, useCallback } from 'react';
import { ProductImage } from '../../src/components/ProductImage';
import { db } from '../../src/db';
import { taxes } from '../../src/db/schema';
import { useFocusEffect } from 'expo-router';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', red: '#EF4444',
};

export default function CartReview() {
  const { items, updateQty, getTotal, setItemDiscount, getItemLineTotal, preOrderId } = useCartStore();
  const currentTotal = getTotal();
  
  const [activeTaxes, setActiveTaxes] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchTaxes = async () => {
        const taxList = await db.select().from(taxes);
        setActiveTaxes(taxList.filter(t => t.isActive));
      };
      fetchTaxes();
    }, [])
  );

  let exclusiveTaxAmount = 0;
  const taxDetails: any[] = [];
  activeTaxes.forEach(tax => {
    if (tax.type === 'EXCLUSIVE') {
      const amt = (currentTotal * tax.rate) / 100;
      exclusiveTaxAmount += amt;
      taxDetails.push({ ...tax, amount: amt });
    } else if (tax.type === 'INCLUSIVE') {
      const amt = currentTotal - (currentTotal / (1 + tax.rate / 100));
      taxDetails.push({ ...tax, amount: amt });
    }
  });

  const finalGrandTotal = currentTotal + exclusiveTaxAmount;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => { Keyboard.dismiss(); router.back(); }} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Review Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 320 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={s.emptyTitle}>Cart is Empty</Text>
            <Text style={s.emptySubtitle}>Go back and add some products</Text>
          </View>
        ) : (
          items.filter(item => !item.isFulfillmentPlaceholder).map(item => (
            <View key={item.cartItemId} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={s.imageContainer}>
                  <ProductImage url={item.imageUrl} iconSize={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  {item.serialNumber && <Text style={{ color: '#0EA5E9', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }}>SN: {item.serialNumber}</Text>}
                  <Text style={s.itemPrice}>Rs. {item.price.toLocaleString()}</Text>
                  
                  {item.discountInput && (item.price * item.qty) > getItemLineTotal(item) ? (
                    <>
                      <Text style={{ color: C.gray, fontSize: 11, textDecorationLine: 'line-through' }}>
                        Rs. {(item.price * item.qty).toLocaleString()}
                      </Text>
                      <Text style={[s.itemLineTotal, { fontSize: 14 }]}>
                        Rs. {getItemLineTotal(item).toLocaleString()}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.itemLineTotal}>
                      Line Total: Rs. {getItemLineTotal(item).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={s.qtyControls}>
                  <TouchableOpacity
                    style={[s.qtyBtn, (item.serialItemId ? false : !!preOrderId) && { opacity: 0.5 }]}
                    onPress={() => {
                      if (preOrderId && !item.serialItemId) return;
                      updateQty(item.cartItemId, item.qty - 1);
                    }}
                    disabled={!!preOrderId && !item.serialItemId}
                  >
                    <Text style={s.qtyBtnText}>{item.serialItemId ? '🗑️' : '−'}</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{item.qty}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtn, { backgroundColor: C.amber }, (item.serialItemId || !!preOrderId) && { opacity: 0.5 }]}
                    onPress={() => { if (!item.serialItemId && !preOrderId) updateQty(item.cartItemId, item.qty + 1); }}
                    disabled={!!item.serialItemId || !!preOrderId}
                  >
                    <Text style={[s.qtyBtnText, { color: '#000' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={s.discountRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>
                    Discount: <Text style={{ color: '#555' }}>
                      Max Allowed: Rs. {((item.price * item.qty) * ((useAuthStore.getState().user?.max_discount_percentage || 0) / 100)).toLocaleString()}
                    </Text>
                  </Text>
                  <TextInput
                    style={s.discountInput}
                    placeholder="e.g. 10% or *500 or 2000"
                    placeholderTextColor="#555"
                    value={item.discountInput || ''}
                    onChangeText={(val) => setItemDiscount(item.cartItemId, val)}
                  />
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {items.length > 0 && (() => {
        const rawTotal = items.filter(item => !item.isFulfillmentPlaceholder).reduce((sum, item) => sum + (item.price * item.qty), 0);
        const totalDiscount = rawTotal - currentTotal;
        return (
          <View style={s.footer}>
            <View style={s.totalRow}>
              <Text style={s.subTotalLabel}>Subtotal</Text>
              <Text style={s.subTotalValue}>Rs. {rawTotal.toLocaleString()}</Text>
            </View>
            {totalDiscount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.discountLabel}>Total Discount</Text>
                <Text style={s.discountValue}>- Rs. {totalDiscount.toLocaleString()}</Text>
              </View>
            )}
            {exclusiveTaxAmount > 0 && (
              <View style={[s.totalRow, { marginTop: 4 }]}>
                <Text style={s.subTotalLabel}>Taxes (Exclusive)</Text>
                <Text style={[s.subTotalValue, { color: C.amber }]}>+ Rs. {exclusiveTaxAmount.toLocaleString()}</Text>
              </View>
            )}
            <View style={[s.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: C.cardBorder }]}>
              <Text style={s.totalLabel}>Grand Total</Text>
              <Text style={s.totalValue}>Rs. {finalGrandTotal.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={s.checkoutBtn}
              onPress={() => {
                // Validate discount limit before proceeding to checkout
                const maxAllowed = useAuthStore.getState().user?.max_discount_percentage || 0;
                for (const item of items) {
                  if (item.discountInput) {
                    const baseTotal = item.price * item.qty;
                    let discAmt = 0;
                    if (item.discountInput.endsWith('%')) {
                      const pct = parseFloat(item.discountInput.replace('%', '')) || 0;
                      discAmt = baseTotal * (pct / 100);
                    } else if (item.discountInput.startsWith('*')) {
                      const val = parseFloat(item.discountInput.replace('*', '')) || 0;
                      discAmt = val * item.qty;
                    } else {
                      discAmt = parseFloat(item.discountInput) || 0;
                    }
                    const discPct = baseTotal > 0 ? (discAmt / baseTotal) * 100 : 0;
                    if (discPct > maxAllowed) {
                      Alert.alert(
                        'Discount Exceeds Limit',
                        `"${item.name}" has a discount exceeding your authorized limit of ${maxAllowed}%.`
                      );
                      return;
                    }
                  }
                }

                if (preOrderId) {
                  const placeholders = items.filter(i => i.isFulfillmentPlaceholder);
                  for (const p of placeholders) {
                    const selectedSerials = items.filter(i => i.productId === p.productId && i.serialItemId).length;
                    if (selectedSerials < p.qty) {
                      Alert.alert('Incomplete Fulfillment', `You must select ${p.qty} serial number(s) for ${p.name}. Currently selected: ${selectedSerials}.`);
                      return;
                    }
                  }
                }
                router.push('/(pos)/checkout');
              }}
              activeOpacity={0.8}
            >
              <Text style={s.checkoutBtnText}>Proceed to Checkout</Text>
              <Text style={{ color: '#000', fontSize: 18 }}>→</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
      </KeyboardAvoidingView>
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

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: C.white, fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { color: C.gray, fontSize: 14, marginTop: 4 },

  itemCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', alignItems: 'center',
  },
  itemName: { color: C.white, fontSize: 15, fontWeight: '700' },
  itemPrice: { color: C.gray, fontSize: 13, marginTop: 2 },
  itemLineTotal: { color: C.amber, fontSize: 15, fontWeight: '700' },
  imageContainer: { width: 50, height: 50, borderRadius: 8, marginRight: 12, overflow: 'hidden' },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 12, marginTop: 12 },
  discountInput: { flex: 1, backgroundColor: '#1A1A1A', color: C.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 10, fontSize: 13, borderWidth: 1, borderColor: '#333' },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: C.white, fontSize: 20, fontWeight: '700' },
  qtyValue: { color: C.white, fontSize: 18, fontWeight: '800', minWidth: 24, textAlign: 'center' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.cardBorder, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel: { color: C.gray, fontSize: 16 },
  totalValue: { color: C.amber, fontSize: 24, fontWeight: '800' },
  subTotalLabel: { color: C.gray, fontSize: 14 },
  subTotalValue: { color: C.white, fontSize: 16, fontWeight: '600' },
  discountLabel: { color: C.red, fontSize: 14 },
  discountValue: { color: C.red, fontSize: 16, fontWeight: '600' },
  checkoutBtn: {
    backgroundColor: C.amber, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  checkoutBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
