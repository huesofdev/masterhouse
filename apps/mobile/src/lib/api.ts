import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchStore } from '../store/useBranchStore';

export const apiClient = axios.create({
  // Use environment variable or fallback to a standard local network IP
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.142:4000/api', 
  timeout: 15000, // Prevent infinite hanging requests causing sync deadlocks
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Get states from Zustand directly (non-reactive read)
  const authState = useAuthStore.getState();
  const branchState = useBranchStore.getState();

  // Inject Auth Token
  if (authState.token) {
    config.headers.Authorization = `Bearer ${authState.token}`;
  }

  // Inject Branch ID
  if (branchState.activeBranchId) {
    config.headers['x-branch-id'] = branchState.activeBranchId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      useAuthStore.getState().setToken(newToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, auto logout to protect offline state
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
