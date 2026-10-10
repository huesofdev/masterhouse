import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db } from '../../src/db';
import { customers, syncQueue, routeAreas } from '../../src/db/schema';
import * as Crypto from 'expo-crypto';
import { useTripStore } from '../../src/store/useTripStore';
import { eq } from 'drizzle-orm';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', blue: '#0EA5E9',
  blueDim: 'rgba(14, 165, 233, 0.12)',
};

export default function CustomerCreate() {
  const { activeRouteId } = useTripStore();
  
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nicFront, setNicFront] = useState<string | null>(null);
  const [nicBack, setNicBack] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areasList, setAreasList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const list = await db.select().from(routeAreas);
        setAreasList(list);
        if (list.length > 0) {
          setSelectedAreaId(list[0].id);
        }
      } catch (e) {
        console.warn('Failed to load local areas', e);
      }
    };
    fetchAreas();
  }, []);

  const captureLocation = async () => {
    setLocationLoading(true);
    try {
      const isGpsEnabled = await Location.hasServicesEnabledAsync();
      if (!isGpsEnabled) {
        Alert.alert('GPS Disabled', 'Please turn on Location / GPS services in your device settings.');
        setLocationLoading(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access in settings.');
        setLocationLoading(false);
        return;
      }
      // Force fresh high-accuracy position from GPS satellites instead of stale cache
      let timeoutId: any;
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
          })
        ]) as Location.LocationObject;
        clearTimeout(timeoutId);
        setLocation(loc);
      } catch (e) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('Error fetching location:', e);
        Alert.alert('Error', 'Could not fetch high-accuracy location. Ensure GPS is enabled and has a clear sky view.');
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImage = async (type: 'front' | 'back') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      // Capture at quality 0.7 to safely handle 50MP/108MP camera modes without RAM exhaustion
      const result = await ImagePicker.launchCameraAsync({ 
        allowsEditing: false, 
        quality: 0.7, 
        cameraType: ImagePicker.CameraType.back 
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Resize to max 1280px wide at 60% JPEG quality
        // Standardizes file size to ~80-180KB while keeping all NIC text crystal clear
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (type === 'front') setNicFront(compressed.uri);
        if (type === 'back') setNicBack(compressed.uri);
      }
    } catch (err) {
      console.error('Failed to capture/compress image:', err);
      Alert.alert('Camera Error', 'Could not process photo. Please try capturing again.');
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!name || !nic || !phone || !address) {
      Alert.alert('Required', 'Please fill Name, NIC, Mobile, and Address');
      return;
    }

    if (!location) {
      Alert.alert('Required', 'Please capture the GPS location.');
      return;
    }

    if (!selectedAreaId) {
      Alert.alert('Required', 'Please select an Area.');
      return;
    }

    if (!nicFront || !nicBack) {
      Alert.alert('Required', 'Please capture both Front and Back images of the NIC.');
      return;
    }

    const nicRegex = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!nicRegex.test(nic)) {
      Alert.alert('Invalid NIC', 'Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits).');
      return;
    }

    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number starting with 0.');
      return;
    }
    setSaving(true);
    try {
      if (nic) {
        const existing = await db.select().from(customers).where(eq(customers.nic, nic)).limit(1);
        if (existing.length > 0) {
          Alert.alert('Already Exists', `A customer with this NIC is already registered in this route as "${existing[0].name}". Please return to the previous screen and select them from the list.`);
          setSaving(false);
          return;
        }
      }

      const newId = Crypto.randomUUID();
      
      const { persistFile } = await import('../../src/db/sync');
      const persistentFrontUri = await persistFile(nicFront);
      const persistentBackUri = await persistFile(nicBack);

      const customerData = {
        id: newId,
        routeId: activeRouteId,
        areaId: selectedAreaId,
        name, nic, phone, address,
        gpsLat: location?.coords.latitude || null,
        gpsLng: location?.coords.longitude || null,
        nicFrontUri: persistentFrontUri,
        nicBackUri: persistentBackUri,
        isOfflineCreated: true,
        isWalkIn: false,
        balance: 0,
        updatedAt: new Date(),
      };
      await db.transaction(async (tx) => {
        await tx.insert(customers).values(customerData);
        await tx.insert(syncQueue).values({
          id: Crypto.randomUUID(),
          operation: 'CREATE_CUSTOMER',
          payload: JSON.stringify(customerData),
          status: 'pending',
          createdAt: new Date(),
        });
      });
      Alert.alert('✅ Customer Created', 'Saved offline & queued for sync', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save customer');
    } finally {
      setSaving(false);
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
        <Text style={s.headerTitle}>New Customer</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Basic Details */}
        <Text style={s.sectionTitle}>CUSTOMER DETAILS</Text>
        <TextInput style={s.input} placeholder="Full Name *" placeholderTextColor="#666" value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="NIC Number *" placeholderTextColor="#666" value={nic} onChangeText={setNic} />
        <TextInput style={s.input} placeholder="Mobile Number *" placeholderTextColor="#666" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TextInput style={s.input} placeholder="Address *" placeholderTextColor="#666" value={address} onChangeText={setAddress} />

        {/* Route Area Selection */}
        {areasList.length > 0 && (
          <>
            <Text style={s.sectionTitle}>SELECT AREA *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 4 }}>
              {areasList.map(area => (
                <TouchableOpacity 
                  key={area.id} 
                  style={[s.chip, selectedAreaId === area.id && s.chipSelected]} 
                  onPress={() => setSelectedAreaId(area.id)}
                >
                  <Text style={[s.chipText, selectedAreaId === area.id && s.chipTextSelected]}>
                    {area.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* GPS */}
        <Text style={s.sectionTitle}>LOCATION & VERIFICATION</Text>
        <TouchableOpacity style={s.gpsBtn} onPress={captureLocation} disabled={locationLoading}>
          <Text style={{ fontSize: 18 }}>📍</Text>
          <Text style={s.gpsBtnText}>
            {locationLoading
              ? 'Acquiring GPS...'
              : location
              ? `✓ ${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
              : 'Capture Current Location'}
          </Text>
        </TouchableOpacity>

        {/* NIC Capture */}
        <View style={s.nicRow}>
          {nicFront ? (
            <View style={s.nicCard}>
              <Image source={{ uri: nicFront }} style={s.nicImage} />
              <TouchableOpacity style={s.removeImageBtn} onPress={() => setNicFront(null)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.nicCard} onPress={() => pickImage('front')}>
              <View style={s.nicPlaceholder}>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={s.nicText}>NIC Front</Text>
              </View>
            </TouchableOpacity>
          )}

          {nicBack ? (
            <View style={s.nicCard}>
              <Image source={{ uri: nicBack }} style={s.nicImage} />
              <TouchableOpacity style={s.removeImageBtn} onPress={() => setNicBack(null)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.nicCard} onPress={() => pickImage('back')}>
              <View style={s.nicPlaceholder}>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={s.nicText}>NIC Back</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Customer'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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

  sectionTitle: {
    color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 10,
  },

  input: {
    backgroundColor: C.card, color: C.white, padding: 16, borderRadius: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder, fontSize: 15,
  },

  gpsBtn: {
    backgroundColor: C.card, borderRadius: 14, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.blue, marginBottom: 16,
  },
  gpsBtnText: { color: C.blue, fontSize: 15, fontWeight: '700' },

  nicRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  nicCard: {
    flex: 1, height: 130, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.card,
  },
  nicImage: { width: '100%', height: '100%' },
  nicPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  nicText: { color: C.gray, fontSize: 13, fontWeight: '600' },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333'
  },

  saveBtn: {
    backgroundColor: C.amber, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  chip: { backgroundColor: C.cardBorder, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  chipSelected: { backgroundColor: C.amberDim, borderColor: C.amber },
  chipText: { color: C.gray, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: C.amber, fontWeight: '700' },
});
