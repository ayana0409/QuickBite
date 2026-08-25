# 🖥️ Hướng dẫn Triển khai Admin & Merchant Portal (React 19 / Vite 8 / TanStack Query 5)

> Tài liệu kỹ thuật chuẩn xác **100% theo mã nguồn thực tế** của ứng dụng quản trị vận hành đa năng trong hệ sinh thái QuickBite:
> - **Framework & Tools:** `React 19.2.8`, `Vite 8.2.0`, `TypeScript 6.0`, `Tailwind CSS v4`
> - **State & Data Fetching:** `TanStack Query 5.101.4` (React Query), `Zustand 5.0`, `Axios 1.19.0`
> - **Routing & Visualization:** `React Router DOM 7.18.2`, `Recharts 3.10.1`, `Leaflet 1.9`, `Anime.js 4.5`
> - **Giao tiếp Backend:** 100% thông qua **API Gateway BFF (Port 3001)**.

---

## 📑 Mục lục

1. [Tổng quan & Kiến trúc Phân quyền Kép](#1-tổng-quan--kiến-trúc-phân-quyền-kép)
2. [Tech Stack & Thư viện Cốt lõi](#2-tech-stack--thư-viện-cốt-lõi)
3. [Cấu trúc Thư mục Thực tế](#3-cấu-trúc-thư-mục-thực-tế)
4. [Cơ chế Authentication, Guards & Axios Interceptor](#4-cơ-chế-authentication-guards--axios-interceptor)
5. [Màn hình Khởi động Hệ thống (BootScreen & Anime.js)](#5-màn-hình-khởi-động-hệ-thống-bootscreen--animejs)
6. [Các Tính năng & Pages Đã Triển khai](#6-các-tính-năng--pages-đã-triển-khai)
7. [Dependencies `package.json` thực tế](#7-dependencies-packagejson-thực-tế)
8. [Hướng dẫn Chạy & Khởi động](#8-hướng-dẫn-chạy--khởi-động)

---

## 1. Tổng quan & Kiến trúc Phân quyền Kép

Ứng dụng **Admin & Merchant Portal** là cổng điều hành tập trung phục vụ 2 nhóm đối tượng người dùng với giao diện và quyền hạn hoàn toàn tách biệt:

```
                               ┌────────────────────────┐
                               │   API Gateway (BFF)    │
                               │      (Port 3001)       │
                               └───────────▲────────────┘
                                           │ HTTPS / JWT Bearer
             ┌─────────────────────────────┴─────────────────────────────┐
             │            Admin & Merchant Portal (Port 5173)            │
             └──────────────┬─────────────────────────────┬──────────────┘
                            │                             │
               ┌────────────▼────────────┐   ┌────────────▼────────────┐
               │    Admin Portal         │   │    Merchant POS         │
               │    (Role: Admin)        │   │    (Role: Merchant)     │
               ├─────────────────────────┤   ├─────────────────────────┤
               │ • Quản lý người dùng    │   │ • Bảng điều khiển POS   │
               │ • Kiểm duyệt nhà hàng   │   │ • Thiết kế Menu & Món   │
               │ • Duyệt đơn mở quán     │   │ • Điều chỉnh kho hàng   │
               │ • Giám sát đơn toàn sàn │   │ • Xử lý đơn hàng Live   │
               │ • Thống kê doanh thu    │   │ • Báo cáo doanh thu     │
               └─────────────────────────┘   └─────────────────────────┘
```

---

## 2. Tech Stack & Thư viện Cốt lõi

| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Core UI** | React | `^19.2.8` | UI Library hiệu năng cao, React 19 Actions |
| **Build Tool** | Vite | `^8.2.0` | Bundler tốc độ cao, HMR tức thì |
| **Styling** | Tailwind CSS | `^4.3.3` | Tiện ích CSS hiện đại (`@tailwindcss/vite`) |
| **Icons** | Lucide React | `^1.31.0` | Bộ icon SVG tối giản, đồng bộ |
| **Routing** | React Router DOM | `^7.18.2` | Định tuyến client-side, Route Guards |
| **Server State** | TanStack Query (React Query) | `^5.101.4` | Caching, deduplication, optimistic updates |
| **Client State** | Zustand | `^5.0.14` | Global Store cho Auth (`authStore`) và Toast (`toastStore`) |
| **HTTP Client** | Axios | `^1.19.0` | Interceptor tự động gắn Bearer Token & hàng đợi Silent Refresh |
| **Charts** | Recharts | `^3.10.1` | Biểu đồ doanh thu, số lượng đơn hàng, thị phần danh mục |
| **Validation** | React Hook Form + Zod | `7.85` / `4.4` | Validate form thêm món, đăng ký nhà hàng, cập nhật hồ sơ |
| **Map & GPS** | Leaflet + React Leaflet | `1.9.4` | Định vị tọa độ nhà hàng và bản đồ giao hàng |
| **Animation** | Anime.js | `^4.5.0` | Hiệu ứng đồ thị topology trên màn hình `<BootScreen />` |

---

## 3. Cấu trúc Thư mục Thực tế

```
src/quick-bite-admin-portal/src/
├── assets/                       # Ảnh, logo, SVG icons tĩnh
├── components/
│   ├── BootScreen.tsx            # Màn hình chờ hệ thống khởi động với Anime.js topology
│   ├── admin/                    # Components riêng cho Admin (Modals duyệt đơn, bảng users)
│   ├── merchant/                 # Components riêng cho Merchant (Menu item cards, Variant modal)
│   ├── dashboard/                # Metric cards, Chart containers, KPI stats
│   └── common/                   # ToastContainer, Modal, LoadingSpinner, Pagination
├── guards/
│   ├── AuthGuard.tsx             # Kiểm tra đăng nhập và đối soát Role (Admin / Merchant)
│   └── RestaurantGuard.tsx       # Bắt buộc Merchant phải có hồ sơ quán (nếu chưa có -> /merchant/setup)
├── layouts/
│   ├── AdminLayout.tsx           # Khung Admin (Sidebar quản trị, Header, Notification bell)
│   ├── MerchantLayout.tsx        # Khung Merchant (Sidebar POS, Restaurant switcher, Header)
│   └── AuthLayout.tsx            # Khung Login / Register
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx         # Đăng nhập bằng tài khoản hoặc Google OAuth
│   │   └── RegisterPage.tsx      # Đăng ký tài khoản Merchant
│   ├── admin/
│   │   ├── DashboardPage.tsx     # Thống kê toàn sàn, biểu đồ doanh thu hệ thống
│   │   ├── RestaurantsPage.tsx   # Danh sách và duyệt trạng thái nhà hàng
│   │   ├── UsersPage.tsx         # Quản lý tài khoản, gán quyền Role
│   │   ├── OrdersPage.tsx        # Giám sát đơn hàng toàn sàn
│   │   ├── CategoryModerationPage.tsx # Kiểm duyệt danh mục món
│   │   └── RequestsPage.tsx      # Duyệt yêu cầu đăng ký mở quán của đối tác
│   ├── merchant/
│   │   ├── DashboardPage.tsx     # Bảng điều khiển POS nhận đơn tức thì
│   │   ├── CreateRestaurantPage.tsx # Form tạo hồ sơ nhà hàng lần đầu
│   │   ├── MerchantMenuPage.tsx  # Thiết kế thực đơn (Món, Topping, Biến thể, Ảnh)
│   │   ├── MerchantInventoryPage.tsx # Quản lý & điều chỉnh số lượng tồn kho
│   │   ├── MerchantOrdersPage.tsx# Xử lý đơn hàng live (Nhận đơn -> Giao hàng)
│   │   ├── MerchantRevenuePage.tsx # Phân tích doanh thu theo ngày/tháng với Recharts
│   │   ├── MerchantReviewsPage.tsx# Xem và phản hồi đánh giá khách hàng
│   │   └── MerchantProfilePage.tsx# Cập nhật địa chỉ, tọa độ GPS, giờ mở cửa
│   └── UnauthorizedPage.tsx      # Trang báo lỗi 403 không đủ quyền truy cập
├── services/                     # 13 API service modules giao tiếp qua axiosClient
│   ├── axiosClient.ts            # Cấu hình Axios Instance, Auth Header & Refresh Queue
│   ├── authService.ts            # API Đăng nhập, Đăng ký, Refresh Token
│   ├── adminDashboardService.ts  # API Thống kê tổng hợp BFF cho Admin
│   ├── adminRequestService.ts    # API Duyệt yêu cầu mở quán
│   ├── restaurantService.ts      # API Quản lý nhà hàng
│   ├── menuService.ts            # API CRUD Món ăn & Danh mục
│   ├── inventoryService.ts       # API Tra cứu & Điều chỉnh tồn kho
│   ├── orderService.ts           # API Xử lý trạng thái đơn hàng
│   └── revenueService.ts         # API Thống kê doanh thu Merchant
├── stores/
│   ├── authStore.ts              # Zustand Store lưu User, Access Token, Refresh Token (Persist LocalStorage)
│   └── toastStore.ts             # Zustand Store quản lý thông báo Toast nổi
└── types/                        # TypeScript Interfaces & Enums toàn hệ thống
```

---

## 4. Cơ chế Authentication, Guards & Axios Interceptor

### 4.1. Hàng đợi Silent Refresh Token (`axiosClient.ts`)
Khi Access Token hết hạn (HTTP 401), `axiosClient` tự động tạm giữ các request tiếp theo vào hàng đợi (`failedQueue`), gọi API Refresh Token tới Identity Service qua Gateway, và tự động thử lại toàn bộ các request đang chờ:

```typescript
// Trích đoạn logic hàng đợi Refresh Token trong axiosClient.ts
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await refreshAccessToken();
        useAuthStore.getState().setTokens(accessToken);
        processQueue(null, accessToken);
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

### 4.2. Phân tầng Route Guards (`App.tsx`)
* **`SmartRootRedirect`**: Tự động chuyển hướng `/` sang `/admin/dashboard` hoặc `/merchant/dashboard` dựa vào claim role của user.
* **`AuthGuard`**: Chặn người dùng chưa đăng nhập hoặc không khớp `allowedRoles` (chuyển sang `/unauthorized`).
* **`RestaurantGuard`**: Bắt buộc đối tác Merchant phải có nhà hàng hợp lệ; nếu chưa tạo nhà hàng, tự động ép sang `/merchant/setup`.

---

## 5. Màn hình Khởi động Hệ thống (BootScreen & Anime.js)

Nhằm xử lý bài toán **Cold-Start (ngủ đông)** khi backend deploy trên cloud (Render/Koyeb/Aiven):
* Khi mở ứng dụng, `<BootScreen />` được kích hoạt trước khi render Layouts.
* **UI Topology:** Sử dụng **Anime.js** vẽ đồ thị mạng lưới kết nối giữa `API Gateway` và các microservices (`Identity`, `Catalog`, `Order`, `Payment`, `Inventory`).
* **Fan-out Health Polling:** Gọi liên tục `GET /api/system/health/wake-up` đến API Gateway. Khi Gateway xác nhận toàn bộ các service đã trả về HTTP 200, hiệu ứng chuyển sang màu xanh lá và unmount `<BootScreen />`.

---

## 6. Các Tính năng & Pages Đã Triển khai

### 6.1. Dành cho Quản trị viên (Admin)
1. **Analytics Dashboard (`/admin/dashboard`):** Tổng doanh thu toàn sàn, số đơn thành công, biểu đồ xu hướng doanh thu theo tuần/tháng bằng **Recharts**.
2. **Quản lý Nhà hàng (`/admin/restaurants`):** Bật/tắt trạng thái hoạt động (`ACTIVE`, `CLOSED`, `SUSPENDED`), tìm kiếm theo tên hoặc chủ quán.
3. **Trung tâm Xét duyệt Đối tác (`/admin/requests`):** Xem hồ sơ đăng ký mở quán của đối tác. Khi nhấn **Approve**, API Gateway gọi Catalog Service thực thi ACID transaction tạo mới nhà hàng.
4. **Quản lý Người dùng (`/admin/users`):** Danh sách người dùng, phân vai trò (Admin / Merchant / Customer), khóa tài khoản vi phạm.
5. **Kiểm duyệt Danh mục (`/admin/categories`):** Quản lý cây danh mục món ăn chuẩn toàn hệ thống.
6. **Báo cáo Chuyên sâu (`/admin/reports` - Advanced Reports):** Phân tích tài chính & vận hành với biểu đồ cột kết hợp (`Recharts`), bộ lọc ngày (`startDate`, `endDate`), bộ lọc trạng thái (`status`), bảng dữ liệu chi tiết có phân trang `page`/`limit`, được tăng tốc bằng **Global Redis Caching** và **Request Coalescing** trên API Gateway.
7. **Cấu hình Hệ thống (`/admin/settings` - System Config):** Giao diện quản trị tập trung các biến môi trường động (`GET_CACHE_TTL`, `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`, Microservice URLs) với cơ chế đồng bộ tức thì MongoDB ➔ Redis.

### 6.2. Dành cho Đối tác Nhà hàng (Merchant)
1. **Merchant POS Dashboard (`/merchant/dashboard`):** Triage đơn hàng theo thời gian thực (Đơn mới, Đang nấu, Đang giao).
2. **Thiết kế Thực đơn (`/merchant/menu`):** Tạo món ăn, cấu hình nhiều kích cỡ (Variants), thêm danh sách Topping kèm giá phụ thu, tải ảnh món ăn.
3. **Quản trị Kho hàng (`/merchant/inventory`):** Hiển thị rõ 3 chỉ số tồn: `Tổng tồn vật lý (Quantity)`, `Số lượng đang giữ chỗ (Reserved)`, `Tồn khả dụng (Available)`. Cho phép nhập hàng tức thì.
4. **Xử lý Đơn hàng Live (`/merchant/orders`):** Cập nhật trạng thái đơn qua từng bước: `Pending ➔ Preparing ➔ Delivering ➔ Completed`.
5. **Báo cáo Doanh thu (`/merchant/revenue`):** Biểu đồ doanh thu thực nhận, số lượng đơn, giá trị trung bình mỗi đơn (AOV).
6. **Đánh giá Khách hàng (`/merchant/reviews`):** Xem số sao đánh giá từng món và phản hồi khách hàng.

---

## 7. Dependencies `package.json` thực tế

```json
{
  "name": "quick-bite-admin-portal",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "@hookform/resolvers": "^5.7.1",
    "@tanstack/react-query": "^5.101.4",
    "@types/leaflet": "^1.9.22",
    "animejs": "^4.5.0",
    "axios": "^1.19.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^1.31.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-hook-form": "^7.85.0",
    "react-router-dom": "^7.18.2",
    "recharts": "^3.10.1",
    "zod": "^4.4.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.0.4",
    "tailwindcss": "^4.3.3",
    "typescript": "~6.0.2",
    "vite": "^8.2.0"
  }
}
```

---

## 8. 🚀 Hướng dẫn Chạy & Khởi động

```bash
# 1. Cấu hình biến môi trường (.env)
VITE_API_GATEWAY_URL=http://localhost:3001

# 2. Cài đặt dependencies và chạy dev server
cd src/quick-bite-admin-portal
npm install
npm run dev

# -> Ứng dụng chạy tại: http://localhost:5173
```