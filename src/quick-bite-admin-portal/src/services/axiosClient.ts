import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor Request: Tự động đính kèm Access Token từ Zustand store & Log Payload
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Global Request Payload Logger
    console.log(
      `🚀 [HTTP REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      {
        params: config.params || null,
        data: config.data || null,
        headers: config.headers,
      }
    );

    return config;
  },
  (error) => {
    console.error('❌ [HTTP REQUEST ERROR]', error);
    return Promise.reject(error);
  }
);

// Interceptor Response: Log Response / Error & Xử lý 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    console.log(
      `✅ [HTTP RESPONSE ${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`,
      response.data
    );
    return response.data;
  },
  (error) => {
    console.error(
      `❌ [HTTP ERROR ${error.response?.status || 'NETWORK_ERROR'}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      }
    );

    if (error.response?.status === 401) {
      console.warn('Unauthorized! Logging out and redirecting to login...');
      useAuthStore.getState().logout();
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
