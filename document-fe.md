# 🎨 QuickBite — Tài liệu Thiết kế Kiến trúc Frontend (Frontend Architecture)

> **Tài liệu chuẩn hóa toàn bộ kiến trúc và thiết kế tầng Frontend của hệ sinh thái QuickBite.**  
> Hệ thống tách biệt thành **2 ứng dụng độc lập** phục vụ từng nhóm đối tượng người dùng chuyên biệt, giao tiếp 100% qua **API Gateway BFF (Port 3001)** và không gọi trực tiếp xuống các internal microservices.

---

## 📑 Mục lục

1. [Tổng quan Hai Ứng dụng Frontend](#1-tổng-quan-hai-ứng-dụng-frontend)
2. [Ứng dụng Khách hàng (Customer Web App)](#2-ứng-dụng-khách-hàng-customer-web-app)
3. [Cổng Quản trị & Vận hành (Admin & Merchant Portal)](#3-cổng-quản-trị--vận-hành-admin--merchant-portal)
4. [Chiến lược UI/UX & Xử lý Cold-Start (BootScreen)](#4-chiến-lược-uiux--xử-lý-cold-start-bootscreen)
5. [Cơ chế Giao tiếp qua API Gateway BFF](#5-cơ-chế-giao-tiếp-qua-api-gateway-bff)
6. [Bảng So sánh & Tổng hợp Kỹ thuật](#6-bảng-so-sánh--tổng-hợp-kỹ-thuật)

---

## 1. Tổng quan Hai Ứng dụng Frontend

```
                              ┌─────────────────────────┐
                              │    API Gateway (BFF)    │
                              │       (Port 3001)       │
                              └────────────▲────────────┘
                                           │ HTTPS / REST / JWT RS256
               ┌───────────────────────────┴───────────────────────────┐
               │                                                       │
┌──────────────▼────────────────────────┐    ┌─────────────────────────▼────────────────────────┐
│     Customer Web (Port 3002)          │    │    Admin & Merchant Portal (Port 5173)           │
├───────────────────────────────────────┤    ├──────────────────────────────────────────────────┤
│ • Next.js 16 (App Router) + React 19  │    │ • React 19 + Vite 8 + TypeScript 6               │
│ • Tối ưu SEO với Server Components    │    │ • Single Page App (SPA) tương tác tốc độ cao     │
│ • Bản đồ số Leaflet định vị GPS       │    │ • TanStack Query v5 + Recharts 3                 │
│ • Giỏ hàng Zustand & Customizer món   │    │ • Phân quyền kép Admin (Toàn sàn) & Merchant POS │
└───────────────────────────────────────┘    └──────────────────────────────────────────────────┘
```

---

## 2. Ứng dụng Khách hàng (Customer Web App)

* **Thư mục:** `src/quick-bite-customer-web`
* **Cổng chạy mặc định:** `http://localhost:3002`
* **Mục tiêu cốt lõi:** Cho phép khách hàng tìm kiếm nhà hàng, duyệt thực đơn, tùy biến món ăn (variants, toppings), đặt hàng, chọn địa chỉ GPS và theo dõi đơn hàng thời gian thực. Bắt buộc **tối ưu hóa SEO** cho dữ liệu nhà hàng và món ăn.

### 2.1. Tech Stack Thực tế
* **Framework:** **Next.js 16.3.0** (App Router) + **React 19.2.8** + **TypeScript 5**.
* **Styling:** **Tailwind CSS v4** (`@tailwindcss/postcss`) + **Lucide React**.
* **Data Fetching & Caching:** Tận dụng **React Server Components (RSC)** để fetch dữ liệu từ Catalog Service tại server, kết xuất HTML đầy đủ giúp Google Bot lập chỉ mục SEO dễ dàng.
* **Client State Management:** **Zustand 5.0.15** (`cart.store.ts` quản lý tính tiền biến thể + topping, `ui.store.ts`).
* **Bản đồ số & Định vị GPS:** **Leaflet 1.9.4 & React Leaflet 5.0.0** (Component `<CheckoutMapPicker />` tải động tránh lỗi SSR).
* **Form & Validation:** **React Hook Form 7.85** + **Zod 4.4**.
* **Authentication:** NextAuth 4.24 / Custom Auth Modal giao tiếp OIDC qua API Gateway.

### 2.2. Danh sách Trang & Luồng Tính năng
* **Trang chủ (`/`):** Hero Banner, thanh phân loại Category, danh sách nhà hàng nổi bật (Render sẵn SSR).
* **Chi tiết Nhà hàng (`/restaurant/[id]`):** Menu phân nhóm theo danh mục, giờ mở cửa, địa chỉ, danh sách đánh giá sao.
* **Chi tiết Món ăn & Customizer (`/food/[id]`):** Tùy chọn Size (Variant) và nhiều Topping với giá phụ thu linh hoạt.
* **Thanh toán & Bản đồ GPS (`/checkout`):** Ghim tọa độ giao hàng trên bản đồ Leaflet, chọn phương thức thanh toán (COD, Mock Sandbox, MoMo, Thẻ).
* **Theo dõi Đơn hàng Live (`/order/[orderId]`):** Thanh trạng thái 5 nấc `<OrderStatusStepper />`, nút hủy đơn hoàn tiền và nút chuyển tiếp đánh giá món ăn (`/order/[orderId]/review`).
* **Đăng ký Đối tác (`/partner-registration`):** Gửi đơn xin mở quán lên Catalog Request Center.

---

## 3. Cổng Quản trị & Vận hành (Admin & Merchant Portal)

* **Thư mục:** `src/quick-bite-admin-portal`
* **Cổng chạy mặc định:** `http://localhost:5173`
* **Mục tiêu cốt lõi:** Ứng dụng điều hành nội bộ dành cho **Chủ quán (Merchant)** (POS nhận đơn, quản lý thực đơn, điều chỉnh tồn kho, xem doanh thu) và **Quản trị viên (Admin)** (Kiểm duyệt nhà hàng, duyệt đơn đăng ký, quản lý người dùng toàn hệ thống). Ưu tiên tốc độ phản hồi tức thì và tính tương tác cao.

### 3.1. Tech Stack Thực tế
* **Framework:** **React 19.2.8** khởi tạo bằng **Vite 8.2.0** + **TypeScript 6**.
* **Styling:** **Tailwind CSS v4** (`@tailwindcss/vite`) + **Lucide React**.
* **Routing:** **React Router DOM 7.18.2** với kiến trúc Route Guards phân tầng (`AuthGuard`, `RestaurantGuard`, `SmartRootRedirect`).
* **Data Fetching & Server Cache:** **TanStack Query 5.101.4** (`@tanstack/react-query`) kết hợp **Axios 1.19.0**.
* **Client State:** **Zustand 5.0.14** (`authStore.ts` lưu Access/Refresh Token với LocalStorage persist, `toastStore.ts`).
* **Trực quan hóa Dữ liệu:** **Recharts 3.10.1** (Biểu đồ doanh thu ngày/tuần/tháng, số lượng đơn hàng, tỷ lệ danh mục).
* **Bản đồ Tọa độ:** **Leaflet 1.9.4** định vị địa chỉ nhà hàng.

### 3.2. Kiến trúc Bảo mật & Hàng đợi Refresh Token
* `axiosClient.ts` trang bị cơ chế **Silent Token Refresh Queue**: Khi Access Token hết hạn (401), hệ thống tạm hoãn các request gửi cùng lúc vào hàng đợi, gọi API cấp mới Access Token qua Gateway và tự động replay toàn bộ request đang chờ mà không làm gián đoạn người dùng.

### 3.3. Danh sách Pages Đã Triển khai
* **Admin (6 Pages):** Dashboard Analytics (`/admin/dashboard`), Quản lý nhà hàng (`/admin/restaurants`), Quản lý tài khoản (`/admin/users`), Giám sát đơn toàn sàn (`/admin/orders`), Kiểm duyệt danh mục (`/admin/categories`), Duyệt đơn đăng ký đối tác (`/admin/requests`).
* **Merchant (7 Pages):** POS Dashboard nhận đơn (`/merchant/dashboard`), Tạo thực đơn (`/merchant/menu`), Quản lý tồn kho 3 chỉ số (`/merchant/inventory`), Xử lý đơn hàng live (`/merchant/orders`), Phân tích doanh thu (`/merchant/revenue`), Đánh giá khách hàng (`/merchant/reviews`), Hồ sơ quán (`/merchant/profile`).

---

## 4. Chiến lược UI/UX & Xử lý Cold-Start (BootScreen)

### 4.1. UI Components & Micro-interactions (Tailwind CSS v4)
* Toàn bộ UI sử dụng hệ thống utility classes của Tailwind CSS v4.
* Các hiệu ứng chuyển động vi mô (Hover, Focus, Skeleton Loading, Modal transitions) chạy mượt mà không tốn chi phí runtime.

### 4.2. Màn hình Boot-up Đánh thức Hệ thống (`<BootScreen />`)
* **Bối cảnh:** Khi triển khai Backend trên nền tảng Cloud gói miễn phí/tiết kiệm (Render/Koyeb), các container microservices sẽ bị "ngủ đông" (Cold-Start) sau thời gian không có request.
* **Giải pháp UX:**
  * Cả 2 ứng dụng đều tích hợp component `<BootScreen />` sử dụng thư viện **Anime.js 4.5.0**.
  * Vẽ đồ thị Topology mạng lưới kết nối trực quan giữa **API Gateway** và các dịch vụ downstream (`Identity`, `Order`, `Catalog`, `Payment`, `Inventory`).
  * Thực hiện cơ chế **Fan-out Health Polling** liên tục gọi `GET /api/system/health/wake-up`. Khi toàn bộ các service đồng loạt trả về HTTP 200, các node trên đồ thị sáng xanh và BootScreen tự động unmount giải phóng bộ nhớ.

---

## 5. Cơ chế Giao tiếp qua API Gateway BFF

* Cả 2 ứng dụng Frontend **tuyệt đối không gọi trực tiếp** tới các cổng nội bộ của các microservice.
* Mọi request được chuyển tiếp qua **API Gateway (NestJS - Port 3001)**:
  * **Header:** Tự động đính kèm `Authorization: Bearer <token>` và `x-correlation-id`.
  * **BFF Aggregation:** Gateway chịu trách nhiệm gộp dữ liệu từ nhiều microservice thành response tối ưu cho từng màn hình Dashboard, giảm thiểu số lượng HTTP request từ Frontend.
  * **Rate Limiting:** Gateway bảo vệ hệ thống bằng `@nestjs/throttler` (100 requests/phút).

---

## 6. Bảng So sánh & Tổng hợp Kỹ thuật

| Tiêu chí | Ứng dụng Khách hàng (Customer Web) | Cổng Quản trị (Admin & Merchant Portal) |
| :--- | :--- | :--- |
| **Công nghệ nền tảng** | **Next.js 16.3** + **React 19.2** | **React 19.2** + **Vite 8.2** |
| **Mô hình Render** | Server-Side Rendering (SSR) & RSC | Single Page Application (SPA) Client-side |
| **Yêu cầu SEO** | **Bắt buộc** (Lập chỉ mục thực đơn & quán) | **Không** (Ứng dụng nội bộ yêu cầu Auth) |
| **State Management** | Zustand (Giỏ hàng & UI) | TanStack Query v5 + Zustand (Auth & Toast) |
| **Routing** | Next.js App Router (`app/`) | React Router DOM v7 (`layouts/` & `guards/`) |
| **Bản đồ & Định vị** | Leaflet + React Leaflet (Map Picker) | Leaflet (Tọa độ nhà hàng) |
| **Biểu đồ Analytics** | Không | **Recharts 3.10** |
| **Xử lý Cold-Start** | `<ClientBootManager />` + `<BootScreen />` | `<BootScreen />` + Anime.js |
| **Cổng Dev Local** | **`http://localhost:3002`** | **`http://localhost:5173`** |
| **API Gateway URL** | `http://localhost:3001` | `http://localhost:3001` |

---
*Tài liệu này thay thế hoàn toàn cho file nháp `document-fe.txt`.*
