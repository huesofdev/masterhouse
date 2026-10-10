import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Modal, TextInput, Alert, BackHandler, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCartStore } from '../../src/store/useCartStore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ProductImage } from '../../src/components/ProductImage';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

import { db } from '../../src/db';
import { products, tripStock } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { PrintService } from '../../src/lib/PrintService';

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  isSerialized: boolean;
  loadedQty: number;
  soldQty: number;
  warrantyMonths: number;
  minDownpaymentAmount?: number;
  imageUrl?: string | null;
  availableSerials: { serialItemId: string; serialNumber: string; }[];
};

export default function POSCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [tempSelectedSerials, setTempSelectedSerials] = useState<string[]>([]);
  const { items, addItem, getTotal, preOrderId, clearCart } = useCartStore();
  const searchRef = useRef<any>(null);

  useEffect(() => {
    const onBackPress = () => {
      if (preOrderId) {
        Alert.alert("Cancel Fulfillment", "Do you want to exit fulfillment mode?", [
          { text: "No", style: "cancel" },
          { text: "Yes", style: "destructive", onPress: () => { clearCart(); router.back(); } }
        ]);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [preOrderId, clearCart]);

  useFocusEffect(
    useCallback(() => {
      // Dismiss keyboard when screen gains focus to reset layout and prevent keyboard sticking
      Keyboard.dismiss();
      return () => {
        // Dismiss keyboard and blur search input when leaving the screen
        Keyboard.dismiss();
        searchRef.current?.blur();
      };
    }, [])
  );

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const localStock = await db
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            price: products.price,
            isSerialized: products.isSerialized,
            warrantyMonths: products.warrantyMonths,
            minDownpaymentAmount: products.minDownpaymentAmount,
            imageUrl: products.imageUrl,
            loadedQty: tripStock.loadedQty,
            soldQty: tripStock.soldQty,
            serialItemId: tripStock.serialItemId,
            serialNumber: tripStock.serialNumber,
          })
          .from(products)
          .innerJoin(tripStock, eq(products.id, tripStock.productId));
          
        const aggregatedStock: CatalogItem[] = [];
        localStock.forEach(item => {
          const existing = aggregatedStock.find(i => i.id === item.id);
          if (existing) {
            existing.loadedQty += item.loadedQty;
            existing.soldQty += item.soldQty;
            if (item.isSerialized && item.serialItemId && item.serialNumber && item.soldQty === 0) {
              existing.availableSerials.push({ serialItemId: item.serialItemId, serialNumber: item.serialNumber });
            }
          } else {
            const newItem: CatalogItem = { ...item, isSerialized: !!item.isSerialized, availableSerials: [] };
            if (item.isSerialized && item.serialItemId && item.serialNumber && item.soldQty === 0) {
              newItem.availableSerials.push({ serialItemId: item.serialItemId, serialNumber: item.serialNumber });
            }
            aggregatedStock.push(newItem);
          }
        });
        setCatalog(aggregatedStock);
      } catch (e) {
        console.error('Failed to load local stock', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCatalog();
  }, []);

  const getCartQty = (productId: string) => {
    return items
      .filter(i => i.productId === productId && !i.isFulfillmentPlaceholder)
      .reduce((sum, i) => sum + i.qty, 0);
  };

  const totalItems = items
    .filter(i => !i.isFulfillmentPlaceholder)
    .reduce((sum, i) => sum + i.qty, 0);

  const handleConfirmSerials = () => {
    if (!selectedProduct) return;
    
    // Find if there is a placeholder in cart for this product to copy the discount
    const placeholder = items.find(i => i.productId === selectedProduct.id && i.isFulfillmentPlaceholder);
    
    tempSelectedSerials.forEach(serialId => {
      const serial = selectedProduct.availableSerials.find(s => s.serialItemId === serialId);
      if (serial) {
        addItem({ 
          cartItemId: serial.serialItemId, 
          productId: selectedProduct.id, 
          name: selectedProduct.name, 
          price: selectedProduct.price,
          serialItemId: serial.serialItemId,
          serialNumber: serial.serialNumber,
          warrantyMonths: selectedProduct.warrantyMonths,
          minDownpaymentAmount: selectedProduct.minDownpaymentAmount,
          imageUrl: selectedProduct.imageUrl,
          discountInput: placeholder?.discountInput
        });
      }
    });
    setSelectedProduct(null);
    setTempSelectedSerials([]);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => {
          if (preOrderId) {
            Alert.alert("Cancel Fulfillment", "Do you want to exit fulfillment mode?", [
              { text: "No", style: "cancel" },
              { text: "Yes", style: "destructive", onPress: () => { clearCart(); router.back(); } }
            ]);
          } else {
            router.back();
          }
        }} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={s.headerTitle}>{preOrderId ? "Fulfillment Mode" : "Product Catalog"}</Text>
          {preOrderId && <Text style={[s.headerSub, { color: C.amber }]}>Select matching serial numbers</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={s.scanBtn} onPress={() => PrintService.printLastSale()}>
            <Text style={{ fontSize: 20 }}>🖨️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={() => { Keyboard.dismiss(); router.push('/(pos)/scanner'); }}>
            <Text style={{ fontSize: 20 }}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: C.bg }}>
        <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder }}>
          <Text style={{ fontSize: 16, marginRight: 8, opacity: 0.7 }}>🔍</Text>
          <TextInput
            ref={searchRef}
            style={{ flex: 1, color: C.white, fontSize: 16 }}
            placeholder="Search products by name or SKU..."
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <Text style={{ color: C.gray, textAlign: 'center', marginTop: 40 }}>Loading stock...</Text>
        ) : catalog.length === 0 ? (
          <Text style={{ color: C.gray, textAlign: 'center', marginTop: 40 }}>No products available in trip stock.</Text>
        ) : (
          catalog
            .filter(prod => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              const nameMatch = (prod.name || '').toLowerCase().includes(query);
              const skuMatch = (prod.sku || '').toLowerCase().includes(query);
              const serialMatch = prod.isSerialized && prod.availableSerials.some(s => (s.serialNumber || '').toLowerCase().includes(query));
              return nameMatch || skuMatch || serialMatch;
            })
            .slice(0, searchQuery ? 50 : 20) // show up to 20 by default, 50 when searching
            .map(prod => {
            const inCart = getCartQty(prod.id);
            const remaining = prod.loadedQty - prod.soldQty - inCart;
            const isOutOfStock = remaining <= 0;
            
            const bookingItem = items.find(i => i.productId === prod.id && i.isFulfillmentPlaceholder);
            const bookedQty = bookingItem ? bookingItem.qty : 0;
            const isNotInPreOrder = !!preOrderId && (!prod.isSerialized || bookedQty === 0);
            const isGreyedOut = isOutOfStock || isNotInPreOrder;
            
            return (
              <TouchableOpacity 
                key={prod.id} 
                style={[s.productCard, isGreyedOut && { opacity: 0.4 }]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (!isOutOfStock) {
                    if (isNotInPreOrder) {
                      Alert.alert('Fulfillment Mode', 'You can only select serial numbers for the items that were booked in this pre-order.');
                      return;
                    }
                    if (prod.isSerialized) {
                      if (preOrderId) {
                        const maxQty = items.find(i => i.productId === prod.id && !i.serialItemId)?.qty || items.filter(i => i.productId === prod.id).length;
                        const addedSerialsCount = items.filter(i => i.productId === prod.id && i.serialItemId).length;
                        
                        // We check if the total number of serialized items for this product added is equal or greater than the original booking quantity
                        // In fulfillment, the booking comes down as items with productId but NO serialItemId yet (acting as the cap)
                        const bookingItem = items.find(i => i.productId === prod.id && i.isFulfillmentPlaceholder);
                        const bookedQty = bookingItem ? bookingItem.qty : 0;
                        
                        if (addedSerialsCount >= bookedQty && bookedQty > 0) {
                          Alert.alert('Limit Reached', `You have already selected ${bookedQty} serial numbers for this booked item.`);
                          return;
                        }
                      }
                      setSelectedProduct(prod);
                      setTempSelectedSerials([]);
                    } else {
                      addItem({ cartItemId: prod.id, productId: prod.id, name: prod.name, price: prod.price, warrantyMonths: prod.warrantyMonths, minDownpaymentAmount: prod.minDownpaymentAmount, imageUrl: prod.imageUrl });
                    }
                  }
                }}
                disabled={remaining === 0}
              >
                <View style={{ flexDirection: 'row', padding: 16 }}>
                  <View style={s.imageContainer}>
                    <ProductImage url={prod.imageUrl} />
                  </View>
                  <View style={s.prodInfo}>
                    <Text style={s.prodName}>{prod.name}</Text>
                    <Text style={s.prodSku}>{prod.sku}</Text>
                    {prod.isSerialized && <Text style={s.badge}>SERIALIZED</Text>}
                  </View>
                  <View style={s.prodRight}>
                    <Text style={s.prodPrice}>Rs {prod.price.toLocaleString()}</Text>
                    <Text style={[s.prodStock, remaining < 3 && { color: C.amber }]}>
                      {remaining} left
                    </Text>
                  </View>
                </View>
                
                {inCart > 0 && !prod.isSerialized && (
                  <View style={s.cartIndicator}>
                    <Text style={s.cartIndicatorText}>{inCart} in cart</Text>
                    <View style={s.qtyControls}>
                      <TouchableOpacity style={s.qtyBtn} onPress={() => addItem({ cartItemId: prod.id, productId: prod.id, name: prod.name, price: prod.price, warrantyMonths: prod.warrantyMonths, minDownpaymentAmount: prod.minDownpaymentAmount, qty: -1, imageUrl: prod.imageUrl })}><Text style={{color:C.white}}>-</Text></TouchableOpacity>
                      <Text style={s.qtyText}>{inCart}</Text>
                      <TouchableOpacity style={s.qtyBtn} onPress={() => addItem({ cartItemId: prod.id, productId: prod.id, name: prod.name, price: prod.price, warrantyMonths: prod.warrantyMonths, minDownpaymentAmount: prod.minDownpaymentAmount, qty: 1, imageUrl: prod.imageUrl })}><Text style={{color:C.white}}>+</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <View style={s.cartBar}>
          <TouchableOpacity 
            style={s.cartButton}
            onPress={() => {
              Keyboard.dismiss();
              router.push('/(pos)/cart');
            }}
            activeOpacity={0.8}
          >
            <View style={s.cartLeft}>
              <Text style={{ fontSize: 18 }}>🛒</Text>
              <View style={s.cartCount}>
                <Text style={s.cartCountText}>{totalItems}</Text>
              </View>
            </View>
            <Text style={s.cartBtnText}>View Cart</Text>
            <Text style={s.cartTotal}>Rs. {getTotal().toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Serial Selection Modal */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelectedProduct(null); setTempSelectedSerials([]); }}
      >
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => { setSelectedProduct(null); setTempSelectedSerials([]); }}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Serial Numbers</Text>
            <Text style={s.modalSub}>{selectedProduct?.name}</Text>
            
            <ScrollView style={{ maxHeight: 350, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {selectedProduct?.availableSerials.map((serial) => {
                const inCart = items.some(i => i.serialItemId === serial.serialItemId);
                const isSelected = tempSelectedSerials.includes(serial.serialItemId);
                return (
                  <TouchableOpacity 
                    key={serial.serialItemId} 
                    style={[
                      s.serialOption, 
                      inCart && { opacity: 0.5, borderColor: C.green },
                      isSelected && { backgroundColor: C.amberDim, borderColor: C.amber }
                    ]}
                    disabled={inCart}
                    onPress={() => {
                      if (inCart) return;
                      if (isSelected) {
                        setTempSelectedSerials(prev => prev.filter(id => id !== serial.serialItemId));
                      } else {
                        if (preOrderId && selectedProduct) {
                          const bookingItem = items.find(i => i.productId === selectedProduct.id && i.isFulfillmentPlaceholder);
                          const bookedQty = bookingItem ? bookingItem.qty : 0;
                          const addedSerialsCount = items.filter(i => i.productId === selectedProduct.id && i.serialItemId).length;
                          const remainingSlots = bookedQty - addedSerialsCount;
                          
                          if (tempSelectedSerials.length >= remainingSlots) {
                            Alert.alert('Limit Reached', `You can only select up to ${bookedQty} serial numbers for this booking. You already added ${addedSerialsCount} and selected ${tempSelectedSerials.length} more.`);
                            return;
                          }
                        }
                        setTempSelectedSerials(prev => [...prev, serial.serialItemId]);
                      }
                    }}
                  >
                    <Text style={[
                      s.serialText, 
                      inCart && { color: C.green },
                      isSelected && { color: C.amber, fontWeight: '800' }
                    ]}>
                      {serial.serialNumber}
                    </Text>
                    {inCart ? (
                      <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>ADDED</Text>
                    ) : isSelected ? (
                      <Text style={{ color: C.amber, fontSize: 12, fontWeight: '700' }}>SELECTED</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: C.cardBorder, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} 
                onPress={() => { setSelectedProduct(null); setTempSelectedSerials([]); }}
              >
                <Text style={{ color: C.gray, fontSize: 15, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: tempSelectedSerials.length > 0 ? C.amber : 'rgba(217, 119, 6, 0.3)', 
                  paddingVertical: 14, 
                  borderRadius: 12, 
                  alignItems: 'center' 
                }} 
                disabled={tempSelectedSerials.length === 0}
                onPress={handleConfirmSerials}
              >
                <Text style={{ color: tempSelectedSerials.length > 0 ? '#000' : C.gray, fontSize: 15, fontWeight: '800' }}>
                  {tempSelectedSerials.length > 0 ? `Confirm (${tempSelectedSerials.length})` : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  scanBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.blueDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.blue },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  headerSub: { color: C.gray, fontSize: 13, marginTop: 2 },
  productCard: { backgroundColor: C.card, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
  imageContainer: { width: 60, height: 60, borderRadius: 8, marginRight: 12, overflow: 'hidden' },
  prodInfo: { flex: 1, justifyContent: 'center' },
  prodName: { color: C.white, fontSize: 15, fontWeight: '700' },
  prodSku: { color: C.gray, fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  badge: { color: C.blue, fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  prodRight: { justifyContent: 'center', alignItems: 'flex-end' },
  prodPrice: { color: C.amber, fontSize: 14, fontWeight: '700' },
  prodStock: { color: C.gray, fontSize: 12, marginTop: 4 },
  cartIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: C.cardBorder, backgroundColor: 'rgba(255,255,255,0.03)' },
  cartIndicatorText: { color: C.gray, fontSize: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: C.white, fontSize: 14, fontWeight: 'bold' },
  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.9)' },
  cartButton: { backgroundColor: C.amber, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartLeft: { flexDirection: 'row', alignItems: 'center' },
  cartCount: { backgroundColor: '#000', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  cartCountText: { color: C.white, fontSize: 12, fontWeight: '800' },
  cartBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  cartTotal: { color: '#000', fontSize: 16, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: C.cardBorder },
  modalTitle: { color: C.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSub: { color: C.gray, fontSize: 14, textAlign: 'center', marginTop: 4 },
  serialOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10 },
  serialText: { color: C.white, fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  modalCloseBtn: { marginTop: 12, padding: 16, alignItems: 'center' },
  modalCloseText: { color: C.gray, fontSize: 16, fontWeight: '600' },
});
