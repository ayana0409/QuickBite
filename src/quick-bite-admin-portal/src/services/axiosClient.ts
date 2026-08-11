import axios from 'axios';

const axiosClient = axios.create({
  // Sử dụng biến môi trường cho API Gateway URL
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor Request: Tự động đính kèm Access Token
axiosClient.interceptors.request.use(
  (config) => {
    // Trong thực tế có thể dùng Zustand/Redux hoặc localStorage
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: Bắt lỗi 401 để xử lý văng về trang Login
axiosClient.interceptors.response.use(
  (response) => {
    // Bạn có thể bóc tách response.data ở đây nếu Gateway bọc data trong { data: ... }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized! Redirecting to login...');
      // Xóa thông tin auth hiện tại
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      // Đá về trang login nếu chưa ở trang login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Ở đây có thể catch thêm lỗi 403 Forbidden...
    return Promise.reject(error);
  }
);

export default axiosClient;
