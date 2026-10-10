import { apiClient } from '../lib/api';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { customers, products, tripStock, contracts, installmentSchedules, installmentSchemes, taxes, preOrders, preOrderItems, settings, promotions } from '../db/schema';
import * as FileSystem from 'expo-file-system/legacy';

// Helper function to map snake_case to camelCase for DB insertion
const toCamel = (str: string) => {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const mapKeysToCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(mapKeysToCamel);
  }

  return Object.keys(obj).reduce((acc, key) => {
    acc[toCamel(key)] = mapKeysToCamel(obj[key]);
    return acc;
  }, {} as any);
};

export async function fetchAssignedTrips() {
  const response = await apiClient.get('/operations/trips'); // In a real scenario, could filter by assigned_to
  return response.data;
}

export async function downloadTripData(tripId: string) {
  console.log(`Downloading offline data for trip ${tripId}...`);
  const response = await apiClient.get(`/operations/trips/${tripId}/mobile-data`);
  const payload = response.data.data || response.data;
  const { customers: customersData, products: productsData, stock: tripStockData, contracts: contractsData, schemes: schemesData, taxes: taxesData, preOrders: preOrdersData, preOrderItems: preOrderItemsData, settings: settingsData, branch: branchData, promotions: promotionsData } = payload;
  
  // Extract schedules from contracts array
  const schedulesData: any[] = [];
  const cleanContractsData = (contractsData || []).map((c: any) => {
    if (c.schedules) {
      schedulesData.push(...c.schedules);
    }
    const { schedules, ...rest } = c;
    return rest;
  });

  // Transform snake_case from API to camelCase for Drizzle
  const rawMappedCustomers = mapKeysToCamel(customersData || []);
  const mappedCustomers = rawMappedCustomers.map((c: any) => ({
    ...c,
    name: c.fullName || c.name || 'Unknown',
    phone: c.mobile || c.phone,
    nicFrontUri: c.nicFrontUrl || c.nicFrontUri,
    nicBackUri: c.nicBackUrl || c.nicBackUri,
    balance: c.walletBalance !== undefined ? Number(c.walletBalance) : (c.balance || 0),
    updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  }));
  const mappedProducts = mapKeysToCamel(productsData || []);
  const mappedStock = mapKeysToCamel(tripStockData || []);
  const mappedContracts = mapKeysToCamel(cleanContractsData);
  const mappedSchedules = mapKeysToCamel(schedulesData);
  const mappedSchemes = mapKeysToCamel(schemesData || []);
  const mappedTaxes = (taxesData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    rate: parseFloat(t.rate || 0),
    type: t.type,
    isActive: t.is_active === 1 || t.is_active === true || t.is_active === '1'
  }));
  const mappedPreOrders = mapKeysToCamel(preOrdersData || []);
  const mappedPreOrderItems = mapKeysToCamel(preOrderItemsData || []);
  const mappedPromotions = mapKeysToCamel(promotionsData || []);
  
  // Flatten settings array from backend into a single settings row
  const rawSettings = settingsData || [];
  const compName = rawSettings.find((s: any) => s.setting_key === 'company_name')?.setting_value;
  let compLogo = rawSettings.find((s: any) => s.setting_key === 'company_logo_url')?.setting_value;
  const partialRecDaysStr = rawSettings.find((s: any) => s.setting_key === 'downpayment_partial_recovery_days_max')?.setting_value;
  const bData = branchData || {};
  
  // Download Logo to local filesystem so it prints offline perfectly
  if (compLogo && compLogo.startsWith('http')) {
    try {
      // Use a filename based on the URL (including query parameters) to detect changes like ?v=2 cache busters
      const urlParts = compLogo.split('?');
      const basePath = urlParts[0];
      const extension = basePath.split('.').pop()?.toLowerCase() || 'png';
      const queryHash = urlParts[1] ? '_' + urlParts[1].replace(/[^a-zA-Z0-9]/g, '') : '';
      const filename = (basePath.split('/').pop() || 'company_logo') + queryHash + '.' + extension;
      
      const localLogoUri = FileSystem.documentDirectory + filename;
      const fileInfo = await FileSystem.getInfoAsync(localLogoUri);
      
      if (!fileInfo.exists) {
        console.log('Downloading new company logo...', compLogo);
        const { uri } = await FileSystem.downloadAsync(compLogo, localLogoUri);
        compLogo = uri;
      } else {
        console.log('Using cached company logo:', localLogoUri);
        compLogo = localLogoUri;
      }
    } catch (err) {
      console.warn('Failed to download company logo', err);
    }
  }
  
  const mappedSettings = {
    id: '1',
    companyName: compName || '',
    companyLogoUri: compLogo || '',
    branchName: bData.name || '',
    branchAddress: bData.address || '',
    branchPhone: bData.phones?.length > 0 ? bData.phones.map((p: any) => p.phone_number).join(' | ') : '',
    partialRecoveryDaysMax: partialRecDaysStr ? parseInt(partialRecDaysStr) : 14
  };
  if (mappedCustomers.length > 0) {
    await db.insert(customers).values(mappedCustomers).onConflictDoUpdate({
      target: customers.id,
      set: {
        routeId: sql`excluded.route_id`,
        name: sql`excluded.name`,
        nic: sql`excluded.nic`,
        phone: sql`excluded.phone`,
        address: sql`excluded.address`,
        balance: sql`excluded.balance`,
        gpsLat: sql`excluded.gps_lat`,
        gpsLng: sql`excluded.gps_lng`,
        nicFrontUri: sql`excluded.nic_front_uri`,
        nicBackUri: sql`excluded.nic_back_uri`,
        areaId: sql`excluded.area_id`,
        rating: sql`excluded.rating`,
        updatedAt: sql`excluded.updated_at`,
      }
    });
  }

  if (mappedProducts.length > 0) {
    const productsToInsert = (productsData || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: parseFloat(p.base_price || '0'),
      isSerialized: p.is_serialized === 1 || p.is_serialized === true || p.is_serialized === '1',
      warrantyType: p.warranty_type || 'NONE',
      warrantyYears: parseInt(p.warranty_period_years?.toString() || '0', 10),
      warrantyMonths: parseInt(p.warranty_period_months?.toString() || '0', 10),
      minDownpaymentAmount: parseFloat(p.min_downpayment_amount || '0'),
      imageUrl: p.image_url || null,
    }));
    await db.insert(products).values(productsToInsert).onConflictDoNothing();
  }

  if (mappedStock.length > 0) {
    await db.insert(tripStock).values(mappedStock).onConflictDoNothing();
  }

  if (mappedContracts.length > 0) {
    await db.insert(contracts).values(mappedContracts).onConflictDoNothing();
  }

  if (mappedSchedules.length > 0) {
    await db.insert(installmentSchedules).values(mappedSchedules).onConflictDoNothing();
  }

  if (mappedSchemes.length > 0) {
    await db.insert(installmentSchemes).values(mappedSchemes).onConflictDoNothing();
  }

  if (mappedTaxes.length > 0) {
    await db.delete(taxes);
    await db.insert(taxes).values(mappedTaxes).onConflictDoNothing();
  }

  if (mappedPreOrders.length > 0) {
    await db.insert(preOrders).values(mappedPreOrders).onConflictDoNothing();
  }

  if (mappedPreOrderItems.length > 0) {
    await db.insert(preOrderItems).values(mappedPreOrderItems).onConflictDoNothing();
  }

  if (mappedPromotions.length > 0) {
    await db.delete(promotions);
    await db.insert(promotions).values(mappedPromotions).onConflictDoNothing();
  }

  await db.delete(settings);
  await db.insert(settings).values(mappedSettings).onConflictDoNothing();
}
