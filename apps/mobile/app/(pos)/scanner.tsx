import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../../src/store/useCartStore';
import { db } from '../../src/db';
import { products, tripStock } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const C = {
  bg: '#000000', amber: '#D97706', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', red: '#EF4444',
};

type ScannerItem = {
  id: string; // product id
  name: string;
  sku: string;
  price: number;
  isSerialized: boolean;
  loadedQty: number;
  soldQty: number;
  serialItemId: string | null;
  serialNumber: string | null;
  minDownpaymentAmount?: number;
  warrantyMonths?: number;
  imageUrl?: string | null;
};

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [catalog, setCatalog] = useState<ScannerItem[]>([]);
  const { items, addItem, preOrderId } = useCartStore();
  const [isActive, setIsActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => setIsActive(false);
    }, [])
  );

  // Load catalog on mount
  useEffect(() => {
    (async () => {
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
            loadedQty: tripStock.loadedQty,
            soldQty: tripStock.soldQty,
            serialItemId: tripStock.serialItemId,
            serialNumber: tripStock.serialNumber,
          })
          .from(products)
          .innerJoin(tripStock, eq(products.id, tripStock.productId));

        // Use raw rows so we can easily find specific serial numbers
        setCatalog(localStock.map(i => ({ ...i, isSerialized: !!i.isSerialized })));
      } catch (e) {
        console.error('Scanner: Failed to load catalog', e);
      }
    })();
  }, []);

  // Request permission on mount if undetermined
  useEffect(() => {
    if (permission && !permission.granted && permission.status === 'undetermined') {
      requestPermission();
    }
  }, [permission?.status]);

  const getCartQty = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    return item ? item.qty : 0;
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const match = catalog.find(p => (p.isSerialized ? p.serialNumber === data : p.sku === data) || p.id === data);

    if (match) {
      if (match.isSerialized) {
        if (preOrderId) {
          const bookingItem = items.find(i => i.productId === match.id && i.isFulfillmentPlaceholder);
          const bookedQty = bookingItem ? bookingItem.qty : 0;
          if (bookedQty === 0) {
            Alert.alert('Fulfillment Mode', 'You can only scan serial numbers for items booked in this pre-order.');
            setTimeout(() => setScanned(false), 1500);
            return;
          }
          const addedSerialsCount = items.filter(i => i.productId === match.id && i.serialItemId).length;
          if (addedSerialsCount >= bookedQty) {
            Alert.alert('Limit Reached', `You have already scanned ${bookedQty} serial numbers for this booked item.`);
            setTimeout(() => setScanned(false), 1500);
            return;
          }
        }

        const inCart = items.some(i => i.serialItemId === match.serialItemId);
        if (inCart || match.soldQty > 0) {
          Alert.alert('Unavailable', 'This serial number is already sold or in the cart.');
          setTimeout(() => setScanned(false), 1500);
        } else {
          // Find placeholder in cart to copy its discountInput
          const placeholder = items.find(i => i.productId === match.id && i.isFulfillmentPlaceholder);
          addItem({ 
            cartItemId: match.serialItemId!, 
            productId: match.id, 
            name: match.name, 
            price: match.price,
            serialItemId: match.serialItemId!,
            serialNumber: match.serialNumber!,
            minDownpaymentAmount: match.minDownpaymentAmount,
            warrantyMonths: match.warrantyMonths,
            imageUrl: match.imageUrl,
            discountInput: placeholder?.discountInput
          });
          Alert.alert('✅ Added', `${match.name} (SN: ${match.serialNumber}) added!`, [
            { text: 'Keep Scanning', onPress: () => setScanned(false) },
            { text: 'Done', onPress: () => router.back() },
          ]);
        }
      } else {
        if (preOrderId) {
          Alert.alert('Fulfillment Mode', 'Bulk items are automatically added from the pre-order. Scan serial numbers only.');
          setTimeout(() => setScanned(false), 1500);
          return;
        }
        // Bulk item logic
        // Calculate total remaining across all rows for this product id
        const productRows = catalog.filter(p => p.id === match.id);
        const totalLoaded = productRows.reduce((sum, p) => sum + p.loadedQty, 0);
        const totalSold = productRows.reduce((sum, p) => sum + p.soldQty, 0);
        const inCart = getCartQty(match.id);
        const remaining = totalLoaded - totalSold - inCart;

        if (remaining > 0) {
          addItem({ cartItemId: match.id, productId: match.id, name: match.name, price: match.price, warrantyMonths: match.warrantyMonths, minDownpaymentAmount: match.minDownpaymentAmount, imageUrl: match.imageUrl });
          Alert.alert('✅ Added', `${match.name} added to cart!`, [
            { text: 'Keep Scanning', onPress: () => setScanned(false) },
            { text: 'Done', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('Out of Stock', `${match.name} has no remaining stock.`);
          setTimeout(() => setScanned(false), 1500);
        }
      }
    } else {
      Alert.alert('Unknown Barcode', `Barcode "${data}" not found in loaded stock.`);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  if (!permission) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={s.permText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.permBox}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
          <Text style={s.permTitle}>Camera Permission Required</Text>
          <Text style={s.permSub}>We need camera access to scan product barcodes</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full screen camera */}
      {isActive && (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128", "codabar", "itf14"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      )}

      {/* Scanner Overlay UI */}
      <View style={s.overlayContainer} pointerEvents="none">
        <View style={s.overlayDark} />
        <View style={s.middleRow}>
          <View style={s.overlayDark} />
          <View style={s.scanBox}>
          </View>
          <View style={s.overlayDark} />
        </View>
        <View style={[s.overlayDark, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={s.instructionText}>Align barcode within the frame</Text>
        </View>
      </View>

      {/* Header bar (placed as a sibling AFTER the camera so it renders on top) */}
      <View style={[s.header, { zIndex: 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.white, fontSize: 20, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan Product Barcode</Text>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

const SCAN_BOX_SIZE = 260;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header floats on top of camera
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Overlay with cutout
  overlayContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  overlayDark: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_SIZE,
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
  },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: C.amber,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },

  instructionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },

  // Permission states
  permText: { color: C.gray, textAlign: 'center', marginTop: 100, fontSize: 16 },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permTitle: { color: C.white, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  permSub: { color: C.gray, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  permBtn: { backgroundColor: C.amber, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  permBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  closeBtn: { marginTop: 16, padding: 12 },
  closeBtnText: { color: C.gray, fontSize: 15, fontWeight: '600' },
});
