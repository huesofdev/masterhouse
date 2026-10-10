import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/api';
import { db } from '../db';
import { products } from '../db/schema';
import { sql } from 'drizzle-orm';
import { useAuthStore } from '../store/useAuthStore';

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function syncCatalogData(token: string): Promise<{ success: boolean; count: number; error?: string }> {
  if (!token) return { success: false, count: 0, error: 'Authentication token not found' };
  try {
    const res = await apiClient.get('/catalog/products/sync');
    if (res.data?.success && Array.isArray(res.data.data)) {
      const serverProducts = res.data.data;
      
      if (serverProducts.length > 0) {
        // Convert to schema format
        const productValues = serverProducts.map((p: any) => ({
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

        // Process in chunks to avoid SQLite binding limits (typically 999 vars)
        const chunkSize = 100;
        for (let i = 0; i < productValues.length; i += chunkSize) {
          const chunk = productValues.slice(i, i + chunkSize);
          await db.insert(products)
            .values(chunk)
            .onConflictDoUpdate({
              target: products.id,
              set: {
                name: sql`excluded.name`,
                sku: sql`excluded.sku`,
                price: sql`excluded.price`,
                isSerialized: sql`excluded.is_serialized`,
                warrantyType: sql`excluded.warranty_type`,
                warrantyYears: sql`excluded.warranty_years`,
                warrantyMonths: sql`excluded.warranty_months`,
                minDownpaymentAmount: sql`excluded.min_downpayment_amount`,
                imageUrl: sql`excluded.image_url`,
              }
            });
        }
      }

      await AsyncStorage.setItem('LAST_CATALOG_SYNC', Date.now().toString());
      return { success: true, count: serverProducts.length };
    }
    return { success: false, count: 0, error: 'Invalid response from server' };
  } catch (error: any) {
    console.error('Catalog sync error:', error);
    return { success: false, count: 0, error: error.message || 'Unknown network error' };
  }
}

export function useCatalogSync() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const checkAndSync = async () => {
      try {
        const lastSyncStr = await AsyncStorage.getItem('LAST_CATALOG_SYNC');
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Date.now();

        if (now - lastSync > SYNC_INTERVAL_MS) {
          console.log('Starting background catalog sync...');
          const result = await syncCatalogData(token);
          if (result.success) {
            console.log(`Background catalog sync complete. Synced ${result.count} products.`);
          } else {
            console.warn('Background catalog sync failed:', result.error);
          }
        }
      } catch (error) {
        console.error('Failed background catalog sync check', error);
      }
    };

    checkAndSync();

    // Optionally set up an interval if the app stays open very long
    const intervalId = setInterval(checkAndSync, SYNC_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [token]);
}

