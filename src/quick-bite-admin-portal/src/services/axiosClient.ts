import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

// Helper trích xuất tiêu đề lỗi thân thiện dựa trên HTTP Status
const getErrorTitle = (status?: number): string => {
  if (!status) return 'Lỗi Kết Nối';
  switch (status) {
    case 400: return 'Thao Tác Không Hợp Lệ';
    case 401: return 'Phiên Đăng Nhập Hết Hạn';
    case 403: return 'Không Có Quyền Truy Cập';
    case 404: return 'Không Tìm Thấy Dữ Liệu';
    case 409: return 'Dữ Liệu Xung Đột';
    case 422: return 'Dữ Liệu Không Hợp Lệ';
    case 500: return 'Lỗi Hệ Thống';
    default: return `Thông Báo Lỗi (${status})`;
  }
};

// Helper trích xuất thông điệp lỗi trực quan từ NestJS / Spring Boot response
const extractErrorMessage = (error: any): string => {
  if (!error.response) {
    return 'Không thể kết nối đến máy chủ! Vui lòng kiểm tra lại kết nối mạng hoặc API Gateway.';
  }
  const data = error.response.data;
  let rawMsg = '';

  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) rawMsg = data.message.trim();
    else if (Array.isArray(data.message) && data.message.length > 0) rawMsg = data.message.join(', ');
    else if (typeof data.error === 'string' && data.error.trim()) rawMsg = data.error.trim();
    else if (typeof data.detail === 'string' && data.detail.trim()) rawMsg = data.detail.trim();
    else if (data.errors && typeof data.errors === 'object') {
      const errValues = Object.values(data.errors).flat().filter(Boolean);
      if (errValues.length > 0) rawMsg = errValues.join(', ');
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
    return rawMsg;
  }

  if (error.response.status === 404) return 'Dữ liệu không tồn tại hoặc đã bị xóa.';
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (error.response.status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (error.response.status === 500) return 'Máy chủ gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.';
  return error.message || 'Đã xảy ra lỗi không xác định.';
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Interceptor Request: Tự động đính kèm Access Token từ Zustand store & Log Payload
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.warn(`⚠️ [HTTP REQUEST] Không tìm thấy Access Token cho request: ${config.url}`);
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

    // Hiển thị thông báo Toast lỗi trực quan cho người dùng mà không hủy phiên đăng nhập
    toast.error(errorMsg, errorTitle);

    if (error.response?.status === 401) {
      console.warn('⚠️ [401 Unauthorized] Request bị từ chối quyền truy cập hoặc token không hợp lệ:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
