import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

// Helper trích xuất thông điệp lỗi trực quan từ NestJS / Spring Boot response
const extractErrorMessage = (error: any): string => {
  if (!error.response) {
    return 'Không thể kết nối đến máy chủ! Vui lòng kiểm tra lại mạng hoặc API Gateway.';
  }
  const data = error.response.data;
  if (data) {
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data.message) && data.message.length > 0) return data.message.join(', ');
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
  }
  if (error.response.status === 404) return 'Dữ liệu không tồn tại hoặc đã bị xóa (404 Not Found).';
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này (403 Forbidden).';
  if (error.response.status === 401) return 'Phiên đăng nhập hết hạn (401 Unauthorized).';
  if (error.response.status === 500) return 'Lỗi xử lý nội bộ máy chủ (500 Internal Server Error).';
  return error.message || 'Đã xảy ra lỗi không xác định.';
};

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
    const errorMsg = extractErrorMessage(error);
    const statusCode = error.response?.status ? `Lỗi HTTP ${error.response.status}` : 'Lỗi Kết Nối';

    console.error(
      `❌ [HTTP ERROR ${error.response?.status || 'NETWORK_ERROR'}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      }
    );

    // Hiển thị Toast thông báo lỗi tự động cho người dùng
    toast.error(errorMsg, statusCode);

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
