import { db } from './index';
import { syncQueue, collections, sales, preOrders, tripRoutes } from './schema';
import { eq, asc, or } from 'drizzle-orm';
import { apiClient } from '../lib/api';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { useSyncStore } from '../store/useSyncStore';

export const persistFile = async (tempUri: string | null): Promise<string | null> => {
  if (!tempUri || !tempUri.startsWith('file://')) return tempUri;
  try {
    const folder = FileSystem.documentDirectory + 'sync_attachments/';
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    }
    const ext = tempUri.split('.').pop() || 'jpg';
    const fileName = `attach_${Crypto.randomUUID()}.${ext}`;
    const persistentUri = folder + fileName;
    
    await FileSystem.copyAsync({
      from: tempUri,
      to: persistentUri
    });
    return persistentUri;
  } catch (e) {
    console.error('Failed to copy file to persistent storage:', e);
    return tempUri;
  }
};

export class SyncEngine {
  private isSyncing = false;
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;
  private readonly BASE_INTERVAL_MS = 15000;      // 15 seconds baseline
  private readonly MAX_INTERVAL_MS  = 5 * 60 * 1000; // 5 minutes cap
  private currentIntervalMs = 15000;

  // In-memory counter tracking consecutive HTTP 500 responses per queue item.
  // Only actual server 500 responses increment this — network failures (no signal) do NOT.
  // After MAX_SERVER_500_RETRIES the item is auto-promoted to 'failed' so the queue unblocks.
  private readonly MAX_SERVER_500_RETRIES = 15;
  private server500RetryMap = new Map<string, number>();

  start(intervalMs = 15000) {
    if (this.intervalId) return;
    this.currentIntervalMs = intervalMs;
    this._scheduleNext();
    console.log(`SyncEngine started (initial interval ${intervalMs}ms)`);
  }

  private _scheduleNext() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }
    this.intervalId = setTimeout(async () => {
      await this.processQueue();
      this._scheduleNext(); // schedule next run after current one finishes
    }, this.currentIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  async forceSync() {
    this.consecutiveFailures = 0;
    this.currentIntervalMs = this.BASE_INTERVAL_MS;
    await this.processQueue();
  }

  // Generate an idempotency key (UUID v4)
  generateIdempotencyKey(): string {
    return Crypto.randomUUID();
  }

  // Public method for UI screens to enqueue items inside an existing DB transaction
  async enqueueOperation(
    operation: string, 
    payload: any, 
    tx?: any
  ): Promise<string> {
    const itemId = Crypto.randomUUID();
    
    // Attach idempotencyKey if not already present
    if (payload && typeof payload === 'object' && !payload.idempotencyKey) {
      payload.idempotencyKey = this.generateIdempotencyKey();
    }

    // Handle persistent files before enqueuing if payload contains local file:// URIs
    const processedPayload = await this.persistPayloadFiles(payload);

    const values = {
      id: itemId,
      operation,
      payload: JSON.stringify(processedPayload),
      status: 'pending',
      createdAt: new Date(),
    };

    if (tx) {
      await tx.insert(syncQueue).values(values);
    } else {
      await db.insert(syncQueue).values(values);
    }

    // Trigger sync run asynchronously
    this.processQueue();
    return itemId;
  }

  private async persistPayloadFiles(obj: any): Promise<any> {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string' && obj.startsWith('file://')) {
      return await persistFile(obj);
    }
    if (Array.isArray(obj)) {
      const newArr = [];
      for (const item of obj) {
        newArr.push(await this.persistPayloadFiles(item));
      }
      return newArr;
    }
    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = await this.persistPayloadFiles(obj[key]);
      }
      return newObj;
    }
    return obj;
  }

  private async processQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    useSyncStore.getState().setIsSyncing(true);

    let hadNetworkFailure = false;

    try {
      // Recovery: Reset any items left stuck in 'syncing' status (e.g. from app crash or background kill) back to 'pending'
      await db.update(syncQueue)
        .set({ status: 'pending' })
        .where(eq(syncQueue.status, 'syncing'));

      while (true) {
        const pendingItems = await db
          .select()
          .from(syncQueue)
          .where(eq(syncQueue.status, 'pending'))
          .orderBy(asc(syncQueue.createdAt))
          .limit(10);

        const countRes = await db.select().from(syncQueue).where(or(eq(syncQueue.status, 'pending'), eq(syncQueue.status, 'syncing')));
        useSyncStore.getState().setPendingCount(countRes.length);

        if (pendingItems.length === 0) break;

        console.log(`SyncEngine processing batch of ${pendingItems.length} pending items.`);

        for (const item of pendingItems) {
          try {
            await db.update(syncQueue).set({ status: 'syncing' }).where(eq(syncQueue.id, item.id));

            let payload = JSON.parse(item.payload);
            payload = await this.processPayloadFiles(payload);

            // CRITICAL: Write the updated payload (S3 keys replacing file:// URIs) back to SQLite
            // BEFORE making the API call. If the API call fails and the item is retried,
            // the next attempt reads the S3 key from SQLite instead of a now-deleted local file path.
            await db.update(syncQueue).set({ payload: JSON.stringify(payload) }).where(eq(syncQueue.id, item.id));

            const toSnake = (str: string) => {
              if (str === 'idempotencyKey') return str;
              return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            };
            const mapKeysToSnake = (obj: any): any => {
              if (obj === null || typeof obj !== 'object') return obj;
              if (Array.isArray(obj)) return obj.map(mapKeysToSnake);
              return Object.keys(obj).reduce((acc, key) => {
                acc[toSnake(key)] = mapKeysToSnake(obj[key]);
                return acc;
              }, {} as any);
            };

            let response: any = null;

            if (item.operation === 'CREATE_COLLECTION') {
              response = await apiClient.post('/collections/sync', mapKeysToSnake(payload));
              if (payload.id) await db.update(collections).set({ isSynced: true }).where(eq(collections.id, payload.id));
            } else if (item.operation === 'CREATE_ATTEMPT') {
              response = await apiClient.post('/collections/attempts', mapKeysToSnake(payload));
            } else if (item.operation === 'CREATE_SALE') {
              response = await apiClient.post('/sales/sync', mapKeysToSnake(payload));
              if (payload.id) await db.update(sales).set({ isSynced: true }).where(eq(sales.id, payload.id));
            } else if (item.operation === 'CREATE_CUSTOMER') {
              await apiClient.post('/customers', {
                id: payload.id,
                full_name: payload.name,
                nic: payload.nic || null,
                mobile: payload.phone,
                address: payload.address,
                route_id: payload.routeId || null,
                area_id: payload.areaId || null,
                gps_lat: payload.gpsLat || null,
                gps_lng: payload.gpsLng || null,
                nic_front_url: payload.nicFrontUri || null,
                nic_back_url: payload.nicBackUri || null,
              });
            } else if (item.operation === 'CREATE_PRE_ORDER') {
              response = await apiClient.post('/orders', mapKeysToSnake(payload));
              if (payload.id) await db.update(preOrders).set({ status: 'PENDING_SYNCED' }).where(eq(preOrders.id, payload.id));
            }

            if (response?.data?.conflict === true) {
              // Server already logged this conflict in its sync_conflicts table.
              // Auto-clear from the driver's queue — no manual "Clear Failed" needed.
              console.warn(`[SyncEngine] Server-logged conflict for ${item.id}: ${response.data.message}. Auto-clearing from queue.`);
              await db.delete(syncQueue).where(eq(syncQueue.id, item.id));
            } else {
              await db.delete(syncQueue).where(eq(syncQueue.id, item.id));
              console.log(`Synced item ${item.id} successfully.`);
            }

          } catch (error: any) {
            const hasResponse = !!error.response;
            const hasRequest = !!error.request;
            const status = error.response?.status;

            if (!hasResponse && !hasRequest) {
              // Local filesystem or JavaScript code execution error (e.g. file not found, bad URI)
              // This is a permanent failure on the device: mark as failed, DO NOT retry, and DO NOT stop the queue.
              console.error(`Local error processing sync item ${item.id}:`, error);
              await db.update(syncQueue).set({ status: 'failed', error: `Local error: ${error.message}` }).where(eq(syncQueue.id, item.id));

              // Automatically try to report this local failure to the backend conflicts table
              try {
                const rawPayload = JSON.parse(item.payload);
                await apiClient.post('/sync/log-conflict', {
                  type: item.operation,
                  payload: rawPayload,
                  errorMessage: `Local error: ${error.message}`
                });
                console.log(`Successfully reported local error for ${item.id} to server.`);
              } catch (reportErr: any) {
                console.warn(`Failed to report local error for ${item.id} to server:`, reportErr.message);
              }
            } else if (!hasResponse && hasRequest) {
              // Network timeout or server unreachable
              await db.update(syncQueue).set({ status: 'pending', error: 'Network unavailable' }).where(eq(syncQueue.id, item.id));
              hadNetworkFailure = true;
            } else if (status >= 400 && status < 500 && status !== 429 && status !== 401) {
              // Permanent server error (e.g. 400 validation error, 409 conflict)
              console.warn(`Permanent server error (${status}) for ${item.id}, marking as failed.`);
              await db.update(syncQueue).set({ status: 'failed', error: error.response?.data?.message || error.message }).where(eq(syncQueue.id, item.id));
            } else if (hasResponse && status === 500) {
              // Genuine HTTP 500 Internal Server Error — server received the request but a
              // code-level bug caused it to crash. Track consecutive 500s in memory.
              // Network failures, 502, 503, 504 are handled separately and do NOT increment
              // this counter — they are infrastructure issues that resolve on their own.
              const prev500Count = (this.server500RetryMap.get(item.id) || 0) + 1;
              this.server500RetryMap.set(item.id, prev500Count);
              console.warn(`Server 500 for ${item.operation} item ${item.id} (attempt ${prev500Count}/${this.MAX_SERVER_500_RETRIES}).`);

              if (prev500Count >= this.MAX_SERVER_500_RETRIES) {
                // Persistent server error — this payload is likely broken on the server side.
                // Auto-promote to 'failed' so the queue unblocks and the driver can End Trip.
                console.error(`[SyncEngine] Item ${item.id} hit ${this.MAX_SERVER_500_RETRIES} server 500s — promoting to failed and logging conflict.`);
                await db.update(syncQueue).set({
                  status: 'failed',
                  error: `Server 500 after ${this.MAX_SERVER_500_RETRIES} retries: ${error.message}`
                }).where(eq(syncQueue.id, item.id));
                this.server500RetryMap.delete(item.id);

                // Auto-report to backend sync_conflicts so admin can review the broken payload
                try {
                  const rawPayload = JSON.parse(item.payload);
                  await apiClient.post('/sync/log-conflict', {
                    type: item.operation,
                    payload: rawPayload,
                    errorMessage: `Auto-failed after ${this.MAX_SERVER_500_RETRIES} server 500 retries: ${error.message}`
                  });
                } catch (reportErr: any) {
                  console.warn(`[SyncEngine] Could not auto-report 500-failed item ${item.id} to server:`, reportErr.message);
                }
                // Do NOT pause queue — let subsequent items continue syncing
              } else {
                await db.update(syncQueue).set({
                  status: 'pending',
                  error: `Server error (attempt ${prev500Count}/${this.MAX_SERVER_500_RETRIES}): ${error.message}`
                }).where(eq(syncQueue.id, item.id));
                hadNetworkFailure = true;
              }
            } else {
              // Infrastructure-level errors: 502 Bad Gateway (nginx/backend down),
              // 503 Service Unavailable (maintenance), 504 Gateway Timeout,
              // 429 rate limiting, 401 unauthorized — all retry silently forever
              console.warn(`Temporary infrastructure/server error (${status}) for ${item.id}, will retry.`);
              await db.update(syncQueue).set({ status: 'pending', error: error.message }).where(eq(syncQueue.id, item.id));
              hadNetworkFailure = true;
            }

            // Stop processing queue if a network failure or temporary server issue occurred
            const shouldPauseQueue = (!hasResponse && hasRequest) || (hasResponse && (status < 400 || status >= 500 || status === 429 || status === 401));
            if (shouldPauseQueue) break;
          }
        } // end for

        if (hadNetworkFailure) break; // stop while-loop if offline
      } // end while(true)

      // Sync trip routes only if we're not already offline
      if (!hadNetworkFailure) {
        const unsyncedRoutes = await db.select().from(tripRoutes).where(eq(tripRoutes.isSynced, false)).limit(50);
        if (unsyncedRoutes.length > 0) {
          try {
            await apiClient.post('/operations/trips/sync-routes', unsyncedRoutes.map(r => ({
              id: r.id, trip_id: r.tripId, gps_lat: r.gpsLat, gps_lng: r.gpsLng,
              timestamp: r.timestamp.toISOString()
            })));
            for (const r of unsyncedRoutes) {
              await db.update(tripRoutes).set({ isSynced: true }).where(eq(tripRoutes.id, r.id));
            }
          } catch (routeErr: any) {
            if (routeErr.response?.status) {
              // Only log actual server errors, not plain offline errors
              console.warn('Failed to sync routes (server error):', routeErr.message);
            }
            hadNetworkFailure = true;
          }
        }
      }

    } catch (e) {
      console.error('Sync loop error:', e);
      hadNetworkFailure = true;
    } finally {
      this.isSyncing = false;
      useSyncStore.getState().setIsSyncing(false);

      // Exponential backoff when offline
      if (hadNetworkFailure) {
        this.consecutiveFailures++;
        this.currentIntervalMs = Math.min(
          this.BASE_INTERVAL_MS * Math.pow(2, this.consecutiveFailures - 1),
          this.MAX_INTERVAL_MS
        );
        console.log(`[SyncEngine] Offline — backing off to ${Math.round(this.currentIntervalMs / 1000)}s`);
      } else {
        this.consecutiveFailures = 0;
        this.currentIntervalMs = this.BASE_INTERVAL_MS;
      }

      const countRes = await db.select().from(syncQueue).where(eq(syncQueue.status, 'pending'));
      useSyncStore.getState().setPendingCount(countRes.length);
      const failedRes = await db.select().from(syncQueue).where(eq(syncQueue.status, 'failed'));
      useSyncStore.getState().setFailedCount(failedRes.length);
    }
  }

  // Helper to upload a local file URI to the backend and return the remote key
  private async uploadFile(uri: string): Promise<string> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    
    // React Native FormData requires { uri, type, name } for files
    formData.append('file', {
      uri,
      name: filename,
      type: 'image/jpeg'
    } as any);

    const response = await apiClient.post('/sync/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    // Intentionally NOT deleting the local file here. 
    // If a network crash happens before the SQLite queue is updated, we need this file to still exist for the retry!
    // The entire 'sync_attachments' folder is cleaned up gracefully during End Trip anyway.
    return response.data.key;
  }

  // ─── DEV TESTING ONLY ────────────────────────────────────────────────────────
  // Set this to true to simulate a local device error during sync.
  // This forces any queued item with a file:// attachment into FAILED state
  // so you can test the conflict logging and FAILED queue UI without corrupting the DB.
  // NEVER commit this as true.
  private readonly DEV_FORCE_LOCAL_ERROR = false;
  // ─────────────────────────────────────────────────────────────────────────────

  // Recursively scan an object/array and upload any strings starting with file://
  private async processPayloadFiles(obj: any): Promise<any> {
    if (obj === null || obj === undefined) return obj;

    // DEV: simulate a local crash before any HTTP request is made
    if (this.DEV_FORCE_LOCAL_ERROR && typeof obj === 'object') {
      throw new Error('[DEV] Simulated local device error for sync testing.');
    }

    if (typeof obj === 'string' && obj.startsWith('file://')) {
      // Check if the file still exists before trying to upload.
      // On a retry, local files may have already been uploaded and deleted in a prior attempt.
      try {
        const info = await FileSystem.getInfoAsync(obj);
        if (!info.exists) {
          console.warn(`[SyncEngine] File no longer exists on device (already uploaded?): ${obj}. Skipping re-upload.`);
          return null; // file was already uploaded; backend already has it
        }
      } catch (_e) {
        console.warn(`[SyncEngine] Could not stat file ${obj}, skipping upload.`);
        return null;
      }
      return await this.uploadFile(obj);
    }

    if (Array.isArray(obj)) {
      const newArr = [];
      for (const item of obj) {
        newArr.push(await this.processPayloadFiles(item));
      }
      return newArr;
    }

    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = await this.processPayloadFiles(obj[key]);
      }
      return newObj;
    }

    return obj;
  }
}

export const syncEngine = new SyncEngine();
