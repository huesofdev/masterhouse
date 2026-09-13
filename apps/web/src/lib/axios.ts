import axios from 'axios';
import { useBranchStore } from '../hooks/useBranchStore';

// The backend is running on port 5002
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies (JWT might be in cookies based on cookie-parser)
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const { activeBranchId } = useBranchStore.getState();
  if (activeBranchId) {
    config.headers['x-branch-id'] = activeBranchId;
  }
  return config;
});

// Interceptor for handling responses and errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is 401 Unauthorized, meaning token expired or invalid
    if (error.response && error.response.status === 401) {
      // You can dispatch a logout event or redirect to login here
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
