import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCalculatorStore } from '../../src/store/useCalculatorStore';
import { useCartStore } from '../../src/store/useCartStore';
import { useTripStore } from '../../src/store/useTripStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useState, useCallback } from 'react';
import { ProductImage } from '../../src/components/ProductImage';
import { db } from '../../src/db';
import { installmentSchemes, tripStock } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', red: '#EF4444', blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

export default function SimulateCalculator() {
  const { items, downpayment, schemeId, updateQty, getTotal, setItemDiscount, getItemLineTotal, setDownpayment, setScheme } = useCalculatorStore();
  const { activeTripId } = useTripStore();
  const currentTotal = getTotal();
  
  const [schemes, setSchemes] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchSchemes = async () => {
        const list = await db.select().from(installmentSchemes);
        setSchemes(list);
      };
      fetchSchemes();
    }, [])
  );

  const selectedScheme = schemes.find(s => s.id === schemeId);

  const requiredMinDownpayment = (() => {
    if (!selectedScheme) return 0;
    const schemePercent = (selectedScheme.minDownpaymentPercent || 0) / 100;
    return items.reduce((sum, item) => {
      const flatDp = (item.minDownpaymentAmount || 0) * item.qty;
      const schemeDp = getItemLineTotal(item) * schemePercent;
      return sum + Math.max(flatDp, schemeDp);
    }, 0);
  })();

  // If the user inputs a downpayment LESS than the required minimum, it means they are doing
  // a "Partial Recovery" (paying the gap within 14 days). This gap should NOT accrue interest
  // or be split into the termly installments. The financed principal must subtract the minimum downpayment.
  const effectiveDownpaymentForInterest = downpayment < requiredMinDownpayment ? requiredMinDownpayment : downpayment;
  const balance = Math.max(0, currentTotal - effectiveDownpaymentForInterest);
  const shortfall = Math.max(0, requiredMinDownpayment - downpayment);

  let termlyInstallment = 0;
  let totalPayable = currentTotal;
  
  if (selectedScheme && balance > 0) {
    const interestAmt = balance * (selectedScheme.interestRate / 100);
    const totalBalanceWithInterest = balance + interestAmt;
    termlyInstallment = totalBalanceWithInterest / selectedScheme.terms;
    totalPayable = downpayment + shortfall + totalBalanceWithInterest;
  }


  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => { Keyboard.dismiss(); router.back(); }} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Simulation Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        style={s.scroll} 
        contentContainerStyle={{ paddingBottom: 160 }} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>🧮</Text>
            <Text style={s.emptyTitle}>Calculator is Empty</Text>
          </View>
        ) : (
          items.map(item => (
            <View key={item.cartItemId} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={s.imageContainer}>
                  <ProductImage url={item.imageUrl} iconSize={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
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
                      Rs. {getItemLineTotal(item).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={s.qtyControls}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.cartItemId, item.qty - 1)}
                  >
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{item.qty}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtn, { backgroundColor: C.amber }]}
                    onPress={() => updateQty(item.cartItemId, item.qty + 1)}
                  >
                    <Text style={[s.qtyBtnText, { color: '#000' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={s.discountRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>
                    Discount Input (Optional):
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

        {items.length > 0 && (
          <View style={s.summarySection}>
            <Text style={s.sectionTitle}>Cart Summary</Text>
            <View style={s.totalRow}>
              <Text style={s.subTotalLabel}>Total Cart Value</Text>
              <Text style={s.totalValue}>Rs. {currentTotal.toLocaleString()}</Text>
            </View>

            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Simulation Options</Text>
            
            {/* Scheme Selection */}
            <Text style={s.label}>Select Installment Scheme</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <TouchableOpacity
                style={[s.promoChip, !schemeId && s.promoChipActive, { justifyContent: 'center' }]}
                onPress={() => setScheme(null)}
              >
                <Text style={[s.promoText, !schemeId && s.promoTextActive]}>None (Direct Sale)</Text>
              </TouchableOpacity>
              {schemes.map(sch => (
                <TouchableOpacity
                  key={sch.id}
                  style={[s.promoChip, schemeId === sch.id && s.promoChipActive]}
                  onPress={() => setScheme(sch.id)}
                >
                  <Text style={[s.promoText, schemeId === sch.id && s.promoTextActive, { marginBottom: 4 }]}>
                    {sch.name}
                  </Text>
                  <Text style={{ color: schemeId === sch.id ? C.amber : C.gray, fontSize: 11, fontWeight: '600' }}>
                    {sch.terms} {sch.frequency}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Downpayment Input */}
            <Text style={s.label}>
              Downpayment (Min: Rs. {requiredMinDownpayment.toLocaleString()})
            </Text>
            <TextInput
              style={s.input}
              placeholder="Enter downpayment amount"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={downpayment ? downpayment.toString() : ''}
              onChangeText={(val) => setDownpayment(parseFloat(val) || 0)}
            />

            {/* Results */}
            <View style={s.resultsBox}>
              <Text style={s.resultsTitle}>Calculation Result</Text>
              
              <View style={s.resRow}>
                <Text style={s.resLabel}>Downpayment</Text>
                <Text style={s.resValue}>Rs. {downpayment.toLocaleString()}</Text>
              </View>

              {shortfall > 0 && (
                <View style={s.resRow}>
                  <Text style={[s.resLabel, { color: '#F59E0B' }]}>Downpayment Recovery Gap</Text>
                  <Text style={[s.resValue, { color: '#F59E0B' }]}>Rs. {shortfall.toLocaleString()}</Text>
                </View>
              )}
              
              {selectedScheme && (
                <>
                  <View style={s.resRow}>
                    <Text style={s.resLabel}>Total Over Term</Text>
                    <Text style={s.resValue}>Rs. {totalPayable.toLocaleString()}</Text>
                  </View>
                  
                  <View style={[s.resRow, { marginTop: 12, borderTopWidth: 1, borderColor: '#333', paddingTop: 12 }]}>
                    <Text style={[s.resLabel, { color: C.amber, fontWeight: '700' }]}>Termly Installment</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                       <Text style={[s.resValue, { color: C.amber, fontSize: 24, fontWeight: '800' }]}>
                        Rs. {Math.ceil(termlyInstallment).toLocaleString()}
                      </Text>
                      <Text style={{ color: C.gray, fontSize: 12 }}>per {selectedScheme.frequency}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Bottom Spacer to prevent edge cutoff on some devices */}
            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>
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

  itemName: { color: C.white, fontSize: 15, fontWeight: '700' },
  itemPrice: { color: C.gray, fontSize: 13, marginTop: 2 },
  itemLineTotal: { color: C.amber, fontSize: 15, fontWeight: '700' },
  imageContainer: { width: 50, height: 50, borderRadius: 8, marginRight: 12, overflow: 'hidden' },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 12, marginTop: 12 },
  discountInput: { flex: 1, backgroundColor: '#1A1A1A', color: C.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#333' },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: C.white, fontSize: 20, fontWeight: '700' },
  qtyValue: { color: C.white, fontSize: 18, fontWeight: '800', minWidth: 24, textAlign: 'center' },

  summarySection: { marginTop: 16 },
  sectionTitle: { color: C.white, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder },
  subTotalLabel: { color: C.gray, fontSize: 16 },
  totalValue: { color: C.amber, fontSize: 20, fontWeight: '800' },

  label: { color: C.gray, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: C.card, color: C.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16 },

  promoChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginRight: 10 },
  promoChipActive: { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: C.amber },
  promoText: { color: C.white, fontSize: 14, fontWeight: '600' },
  promoTextActive: { color: C.amber },

  resultsBox: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#333', marginTop: 8 },
  resultsTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 12, opacity: 0.8 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resLabel: { color: C.gray, fontSize: 14 },
  resValue: { color: C.white, fontSize: 15, fontWeight: '600' },

  exportBtn: {
    backgroundColor: C.blue, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24,
  },
  exportBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
