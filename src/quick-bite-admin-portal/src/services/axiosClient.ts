import axios, { AxiosHeaders } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { refreshAccessToken } from './authService';

// 1. Initialize Axios Instance
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Cooldown guard to avoid spamming 429 toasts when multiple parallel requests are throttled
let last429ToastTime = 0;

// Queue management for silent token refresh
let isRefreshing = false;
interface FailedQueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
  config: InternalAxiosRequestConfig & { _retry?: boolean };
}
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.config._retry = true;
      if (!prom.config.headers) {
        prom.config.headers = new AxiosHeaders();
      }
      prom.config.headers.set('Authorization', `Bearer ${token}`);

      axiosClient(prom.config)
        .then((res) => prom.resolve(res))
        .catch((err) => prom.reject(err));
    }
  });

  failedQueue = [];
};

// Helper to extract friendly error title based on HTTP Status
const getErrorTitle = (status?: number): string => {
  if (!status) return 'Lỗi Kết Nối';
  switch (status) {
    case 400: return 'Thao Tác Không Hợp Lệ';
    case 401: return 'Phiên Đăng Nhập Hết Hạn';
    case 403: return 'Không Có Quyền Truy Cập';
    case 404: return 'Không Tìm Thấy Dữ Liệu';
    case 409: return 'Dữ Liệu Xung Đột';
    case 422: return 'Dữ Liệu Không Hợp Lệ';
    case 429: return 'Hệ Thống Đang Quá Tải';
    case 500: return 'Lỗi Hệ Thống';
    default: return `Thông Báo Lỗi (${status})`;
  }
};

interface ValidationErrorItem {
  message?: string;
  members?: string[];
}

interface AbpErrorObject {
  message?: string;
  details?: string;
  validationErrors?: ValidationErrorItem[];
}

interface ApiErrorPayload {
  message?: string | string[];
  error?: string | AbpErrorObject;
  errors?: Record<string, string | string[]> | string[];
  detail?: string;
  title?: string;
  retryAfter?: number | string;
}

// Helper to extract visual error message from API response (supporting NestJS, ABP .NET, Spring Boot)
const extractErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error) || !error.response) {
    if (error instanceof Error) return error.message;
    return 'Không thể kết nối đến máy chủ! Vui lòng kiểm tra lại kết nối mạng hoặc API Gateway.';
  }

  // 1. Handle HTTP 429 Too Many Requests (Rate Limiting)
  if (error.response.status === 429) {
    const errorData = error.response.data as ApiErrorPayload | undefined;
    const retryAfter =
      error.response.headers?.['retry-after'] ||
      error.response.headers?.['Retry-After'] ||
      errorData?.retryAfter;

    if (retryAfter && !isNaN(Number(retryAfter))) {
      return `Máy chủ đang nhận quá nhiều yêu cầu cùng lúc. Vui lòng thử lại sau ${retryAfter} giây.`;
    }
    return 'Hệ thống đang quá tải do nhận lượng lớn yêu cầu cùng lúc. Vui lòng thử lại sau giây lát.';
  }

  const data = error.response.data as ApiErrorPayload | string | undefined;
  let rawMsg = '';

  if (typeof data === 'string' && data.trim()) {
    rawMsg = data.trim();
  } else if (data && typeof data === 'object') {
    // ABP Framework .NET error response: data.error = { message, details, validationErrors }
    if (data.error && typeof data.error === 'object') {
      const abpErr = data.error;
      if (typeof abpErr.message === 'string' && abpErr.message.trim()) {
        rawMsg = abpErr.message.trim();
      } else if (typeof abpErr.details === 'string' && abpErr.details.trim()) {
        rawMsg = abpErr.details.trim();
      } else if (Array.isArray(abpErr.validationErrors) && abpErr.validationErrors.length > 0) {
        rawMsg = abpErr.validationErrors
          .map((v) => (typeof v === 'object' && v?.message ? v.message : String(v)))
          .filter(Boolean)
          .join(', ');
      }
    }

    if (!rawMsg) {
      if (typeof data.message === 'string' && data.message.trim()) {
        rawMsg = data.message.trim();
      } else if (Array.isArray(data.message) && data.message.length > 0) {
        rawMsg = data.message.join(', ');
      } else if (typeof data.error === 'string' && data.error.trim()) {
        rawMsg = data.error.trim();
      } else if (typeof data.detail === 'string' && data.detail.trim()) {
        rawMsg = data.detail.trim();
      } else if (typeof data.title === 'string' && data.title.trim()) {
        rawMsg = data.title.trim();
      } else if (data.errors && typeof data.errors === 'object') {
        const errValues = Object.values(data.errors).flat().filter(Boolean);
        if (errValues.length > 0) {
          rawMsg = errValues.join(', ');
        }
      }
    }
  }

  if (rawMsg) {
    if (rawMsg.includes('Cannot create new inventory item with a negative quantity')) {
      const numMatch = rawMsg.match(/-?\d+/);
      const val = numMatch ? numMatch[0] : '';
      return `Mặt hàng này chưa có dữ liệu tồn kho. Không thể khởi tạo số lượng ban đầu là số âm (${val}).`;
    }
    if (rawMsg.includes('Cannot reduce stock below current reserved quantity')) {
      return 'Không thể giảm số lượng tồn kho thấp hơn số lượng hiện đang được giữ cho đơn hàng.';
    }
    if (rawMsg.includes('Food item not found with ID')) {
      return 'Sản phẩm không tồn tại hoặc đã bị xóa khỏi hệ thống.';
    }
    if (rawMsg.toLowerCase().includes('too many requests') || rawMsg.toLowerCase().includes('throttler')) {
      return 'Hệ thống đang quá tải do nhận lượng lớn yêu cầu cùng lúc. Vui lòng thử lại sau giây lát.';
    }
    return rawMsg;
  }

  if (error.response.status === 404) return 'Dữ liệu không tồn tại hoặc đã bị xóa.';
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (error.response.status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (error.response.status === 500) return 'Máy chủ gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.';
  return error.message || 'Đã xảy ra lỗi không xác định.';
};

// Interceptor Request: Attach Access Token from Zustand store & Log Payload
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn(`⚠️ [HTTP REQUEST] Không tìm thấy Access Token cho request: ${config.url}`);
    }

    // Global Request Payload Logger
    console.log(
      `🚀 [HTTP REQUEST] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`,
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

// Interceptor Response: Handle Data, 401 Silent Refresh Queue, and Error Toasts
axiosClient.interceptors.response.use(
  (response) => {
    console.log(
      `✅ [HTTP RESPONSE ${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`,
      response.data
    );
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // 1. Handle 401 Unauthorized for Token Refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const { refreshToken, logout } = useAuthStore.getState();

      // If no refresh token exists, immediately logout
      if (!refreshToken) {
        console.warn('⚠️ [AUTH] 401 Unauthorized and no refresh token available. Logging out.');
        logout();
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'Phiên Hết Hạn');
        return Promise.reject(error);
      }

      // If another request is currently refreshing the token, add this request to the queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken: newAccessToken } = await refreshAccessToken();

        // Update Authorization header for the original request using AxiosHeaders
        if (!originalRequest.headers) {
          originalRequest.headers = new AxiosHeaders();
        }
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

        // Process all queued requests
        processQueue(null, newAccessToken);

        // Re-execute original request
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        console.error('❌ [AUTH] Silent token refresh failed:', refreshErr);
        processQueue(refreshErr, null);
        logout();
        toast.error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'Phiên Hết Hạn');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. Handle Non-401 Errors (or failed retries)
    const errorMsg = extractErrorMessage(error);
    const errorTitle = getErrorTitle(error.response?.status);

    console.error(
      `❌ [HTTP ERROR ${error.response?.status || 'NETWORK_ERROR'}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      }
    );

    // Rate Limiting 429 Cooldown Guard
    if (error.response?.status === 429) {
      const now = Date.now();
      if (now - last429ToastTime > 3500) {
        last429ToastTime = now;
        toast.warning(errorMsg, errorTitle);
      }
    } else if (error.response?.status !== 401) {
      // Show error toast for non-401 errors (401 errors are handled during logout or silent refresh)
      toast.error(errorMsg, errorTitle);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
