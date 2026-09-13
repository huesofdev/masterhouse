import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useBranchStore } from './useBranchStore';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role_id: string;
  rank: number;
  branch_ids: string[];
  permissions: string[];
};

type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      login: (token) => set({ isAuthenticated: true, token }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ isAuthenticated: false, token: null, user: null });
        useBranchStore.getState().setActiveBranchId(null);
        localStorage.removeItem('masterh-branch-store');
      },
      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.rank >= 90) return true; // Owner/SuperAdmin bypass
        return user.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: 'masterh-auth',
    }
  )
);
