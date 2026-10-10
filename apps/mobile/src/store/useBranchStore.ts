import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BranchState {
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      setActiveBranchId: (id) => set({ activeBranchId: id }),
    }),
    {
      name: 'masterh-branch-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
