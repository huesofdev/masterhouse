import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ProductImage } from '../../src/components/ProductImage';
import { useCalculatorStore } from '../../src/store/useCalculatorStore';
import { db } from '../../src/db';
import { products } from '../../src/db/schema';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  isSerialized: boolean;
  imageUrl?: string | null;
  minDownpaymentAmount?: number;
};

export default function CalculatorCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { items, addItem, clearCalculator } = useCalculatorStore();

  const fetchCatalog = async () => {
    try {
      const localStock = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          price: products.price,
          isSerialized: products.isSerialized,
          imageUrl: products.imageUrl,
          minDownpaymentAmount: products.minDownpaymentAmount,
        })
        .from(products);
        
      setCatalog(localStock.map(i => ({ ...i, isSerialized: !!i.isSerialized })));
    } catch (e) {
      console.error('Failed to load catalog', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const totalItemsCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity 
          onPress={() => {
            clearCalculator();
            router.back();
          }} 
          style={s.backBtn}
        >
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={s.headerTitle}>Select Products</Text>
          <Text style={s.headerSub}>Simulation Catalog</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/(calculator)/simulate')} 
          style={s.calcBtn}
        >
          <Text style={s.calcBtnText}>🧮 Review ({totalItemsCount})</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.cardBorder }}>
        <View style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, marginRight: 8, opacity: 0.7 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: C.white, fontSize: 16 }}
            placeholder="Search catalog by name or SKU..."
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

      <FlatList 
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        data={catalog.filter(prod => {
          const query = searchQuery.toLowerCase();
          return (
            prod.name.toLowerCase().includes(query) || 
            prod.sku.toLowerCase().includes(query)
          );
        })}
        keyExtractor={item => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={() => (
          <Text style={{ color: C.gray, textAlign: 'center', marginTop: 40 }}>
            {loading ? 'Loading catalog...' : 'Catalog is empty. Sync required.'}
          </Text>
        )}
        renderItem={({ item: prod }) => {
          const qtyInCart = items.find(i => i.cartItemId === prod.id)?.qty || 0;
          return (
            <View style={s.productCard}>
              <View style={s.productTop}>
                <View style={s.imageContainer}>
                  <ProductImage url={prod.imageUrl} containerStyle={{ borderRadius: 12 }} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.productName}>{prod.name}</Text>
                  <Text style={s.productSku}>SKU: {prod.sku}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={s.productPrice}>Rs. {prod.price.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
              <View style={s.productBottom}>
                {qtyInCart > 0 ? (
                  <View style={s.addedBadge}>
                    <Text style={s.addedBadgeText}>Added ({qtyInCart})</Text>
                  </View>
                ) : <View />}
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => {
                    addItem({
                      cartItemId: prod.id,
                      productId: prod.id,
                      name: prod.name,
                      price: prod.price,
                      imageUrl: prod.imageUrl,
                      minDownpaymentAmount: prod.minDownpaymentAmount,
                      qty: 1
                    });
                  }}
                >
                  <Text style={s.addBtnText}>+ Add to Calc</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  headerSub: { color: C.gray, fontSize: 13, marginTop: 2 },
  calcBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.amber,
  },
  calcBtnText: {
    color: C.amber,
    fontSize: 14,
    fontWeight: '700',
  },

  productCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  productTop: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden' },
  productName: { color: C.white, fontSize: 16, fontWeight: '700' },
  productSku: { color: '#6B7280', fontSize: 13, marginTop: 2, fontFamily: 'monospace' },
  productPrice: { color: C.amber, fontSize: 15, fontWeight: '700' },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: C.cardBorder
  },
  addBtn: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: C.white,
    fontWeight: '700',
  },
  addedBadge: {
    backgroundColor: C.blueDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addedBadgeText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: '700',
  }
});
