import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setFailedCount: (count) => set({ failedCount: count }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
