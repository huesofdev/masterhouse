import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { db } from '../../src/db';
import { settings } from '../../src/db/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  bg: '#000000',
  card: '#111111',
  cardBorder: '#1E1E1E',
  white: '#F8FAFC',
  gray: '#9CA3AF',
  amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)',
};

export default function SettingsScreen() {
  const [compSettings, setCompSettings] = useState<any>(null);
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await db.select().from(settings).limit(1);
        if (result.length > 0) {
          setCompSettings(result[0]);
        }
        const size = await AsyncStorage.getItem('printerPaperSize');
        if (size) setPaperSize(size as any);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: C.white, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>COMPANY PROFILE (READ-ONLY)</Text>
        <View style={s.card}>
          {compSettings?.companyLogoUri ? (
            <View style={s.logoContainer}>
              <Image 
                source={{ uri: compSettings.companyLogoUri }}
                style={s.logo}
                resizeMode="contain"
              />
              <Text style={s.logoLabel}>Downloaded Logo Preview</Text>
            </View>
          ) : (
            <View style={s.noLogo}>
              <Text style={s.noLogoText}>No Logo Downloaded</Text>
            </View>
          )}
          
          <View style={s.divider} />
          
          <View style={s.row}>
            <Text style={s.label}>Company Name</Text>
            <Text style={s.value}>{compSettings?.companyName || 'N/A'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Branch Name</Text>
            <Text style={s.value}>{compSettings?.branchName || 'N/A'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Branch Phone</Text>
            <Text style={s.value}>{compSettings?.branchPhone || 'N/A'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Branch Address</Text>
            <Text style={s.value}>{compSettings?.branchAddress || 'N/A'}</Text>
          </View>
        </View>
        <View style={{ height: 24 }} />

        <Text style={s.sectionTitle}>PRINTER SETTINGS</Text>
        <View style={s.card}>
          <View style={[s.row, { marginBottom: 16 }]}>
            <Text style={s.label}>Paper Size</Text>
            <Text style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>Select the paper width for your thermal printer.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[s.optionBtn, paperSize === '58mm' && s.optionBtnActive]}
              onPress={async () => {
                setPaperSize('58mm');
                await AsyncStorage.setItem('printerPaperSize', '58mm');
              }}
            >
              <Text style={[s.optionText, paperSize === '58mm' && s.optionTextActive]}>58mm</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.optionBtn, paperSize === '80mm' && s.optionBtnActive]}
              onPress={async () => {
                setPaperSize('80mm');
                await AsyncStorage.setItem('printerPaperSize', '80mm');
              }}
            >
              <Text style={[s.optionText, paperSize === '80mm' && s.optionTextActive]}>80mm</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  
  card: { backgroundColor: C.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 120, height: 80, marginBottom: 8 },
  logoLabel: { color: C.gray, fontSize: 12, fontStyle: 'italic' },
  noLogo: { alignItems: 'center', justifyContent: 'center', height: 80, backgroundColor: '#1A1A1A', borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  noLogoText: { color: C.gray, fontSize: 13 },
  
  divider: { height: 1, backgroundColor: C.cardBorder, marginBottom: 16 },
  row: { marginBottom: 12 },
  label: { color: C.gray, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  value: { color: C.white, fontSize: 15, fontWeight: '500' },
  
  optionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  optionBtnActive: { borderColor: C.amber, backgroundColor: C.amberDim },
  optionText: { color: C.gray, fontSize: 15, fontWeight: '600' },
  optionTextActive: { color: C.amber },
});
