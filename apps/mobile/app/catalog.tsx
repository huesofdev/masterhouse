import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Network from 'expo-network';
import { useAuthStore } from '../src/store/useAuthStore';
import { syncCatalogData } from '../src/hooks/useCatalogSync';
import { ProductImage } from '../src/components/ProductImage';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  blue: '#0EA5E9', blueDim: 'rgba(14, 165, 233, 0.12)',
};

import { db } from '../src/db';
import { products } from '../src/db/schema';

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  isSerialized: boolean;
  imageUrl?: string | null;
};

export default function GlobalCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { token } = useAuthStore();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalog();
  }, []);

  const handleManualSync = async () => {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      Alert.alert('Offline', 'You are currently offline. Cannot sync catalog.');
      return;
    }

    if (!token) {
      Alert.alert('Session Expired', 'Please log in again to sync catalog.');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncCatalogData(token);
      if (result.success) {
        Alert.alert('Success', `📦 Catalog sync complete! Synced ${result.count} products.`);
        await fetchCatalog();
      } else {
        Alert.alert('Sync Failed', result.error || 'Failed to sync catalog');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'An error occurred during sync.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={s.headerTitle}>Product Catalog</Text>
          <Text style={s.headerSub}>{catalog.length} items synced locally</Text>
        </View>
        <TouchableOpacity onPress={handleManualSync} style={s.syncBtn} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={C.amber} />
          ) : (
            <Text style={s.syncBtnText}>🔄 Sync</Text>
          )}
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
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
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
            {loading ? 'Loading catalog...' : 'Catalog is empty or no match found.'}
          </Text>
        )}
        renderItem={({ item: prod }) => (
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
                  {prod.isSerialized && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>Serialized</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
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
  syncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  syncBtnText: {
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
  productIcon: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: C.amberDim,
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { color: C.white, fontSize: 16, fontWeight: '700' },
  productSku: { color: '#6B7280', fontSize: 13, marginTop: 2, fontFamily: 'monospace' },
  productPrice: { color: C.amber, fontSize: 15, fontWeight: '700' },
  badge: { backgroundColor: C.blueDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: C.blue, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
