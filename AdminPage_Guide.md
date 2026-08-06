# Role & Context
Bạn là một Senior Frontend Engineer. Nhiệm vụ của bạn là xây dựng ứng dụng "Admin & Merchant Portal" cho dự án QuickBite (hệ thống đặt đồ ăn theo kiến trúc Microservices). 
Ứng dụng này giao tiếp duy nhất với API Gateway (NestJS BFF), không gọi trực tiếp xuống các service con.

# Tech Stack Bắt Buộc
- Framework: React 18 khởi tạo bằng Vite.
- Ngôn ngữ: TypeScript (Bắt buộc gõ strict type, interface rõ ràng).
- Styling: Tailwind CSS (Kết hợp Lucide React cho icons).
- Routing: React Router v6.
- Data Fetching & State: TanStack Query v5 (React Query) + Axios.
- Animation: 
  + Tailwind CSS classes cho các animation cơ bản.
  + `animejs` (Lazy load) ĐỘC QUYỀN dùng cho màn hình BootScreen.

# Cấu Trúc Thư Mục Cần Tuân Thủ
admin-portal/
├── src/
│   ├── assets/              
│   ├── components/          
│   │   ├── shared/          # Nút bấm, Modal, Table dùng chung
│   │   └── BootScreen.tsx   # Màn hình chờ hệ thống khởi động (Dùng Anime.js)
│   ├── features/            # Phân chia theo Domain (orders, catalog, inventory, auth)
│   ├── layouts/             # DashboardLayout, AuthLayout
│   ├── pages/               
│   ├── services/            # Cấu hình Axios instance (interceptors) và API calls
│   ├── types/               # TypeScript Interfaces/Types dùng chung
│   └── utils/               # Helper functions
└── ...

# Core Rules & Guidelines
1. KHÔNG sử dụng CSS thuần hoặc SCSS. Mọi UI phải được style bằng Tailwind CSS.
2. Xử lý API bằng Axios Interceptors:
   - Tự động đính kèm JWT Access Token vào header `Authorization: Bearer ...`.
   - Bắt lỗi 401 để xử lý Refresh Token hoặc đá văng về trang Login.
   - Base URL trỏ thẳng về API Gateway (VD: `VITE_API_GATEWAY_URL`).
3. Mọi dữ liệu fetch từ API phải dùng hooks của TanStack Query (`useQuery`, `useMutation`) để tận dụng caching.

# Kịch Bản Đặc Biệt: Hệ Thống Khởi Động (BootScreen)
Do backend host trên Render Free Tier sẽ bị ngủ đông (Cold Start). Khi người dùng vào trang, phải hiển thị `<BootScreen />` trước.
- Logic `<BootScreen />`: Gọi API `GET /api/system/health/wake-up` đến Gateway.
- UI: Sử dụng `animejs` vẽ sơ đồ topology đơn giản. Có hiệu ứng nhấp nháy cho đến khi API trả về status 200 (Gateway báo các service đã online).
- Khi hệ thống đã thức dậy -> Unmount `<BootScreen />` (giải phóng bộ nhớ thư viện animejs) -> Trả về `<DashboardLayout />`.

# Kế Hoạch Thực Thi (Từng bước một)
Bây giờ, hãy đóng vai Senior FE Engineer và thực hiện TỪNG BƯỚC theo thứ tự dưới đây. Làm xong bước nào, hãy dừng lại chờ tôi xác nhận rồi mới code tiếp bước sau:

- **Bước 1: Khởi tạo dự án & Cấu hình.** Cung cấp cho tôi các lệnh terminal để setup Vite, cài đặt tất cả thư viện cần thiết (Tailwind, React Router, React Query, Axios, Animejs...). Thiết lập file cấu hình Tailwind và Axios config.
- **Bước 2: Viết Type/Interfaces.** Định nghĩa các types cơ bản cho: User (Merchant), Order, FoodItem dựa theo domain QuickBite.
- **Bước 3: Code component `<BootScreen />`.** Triển khai logic lazy-loading anime.js và fake API call /health/wake-up.
- **Bước 4: Code Routing & Layouts.** Thiết lập React Router với AuthGuard (Bảo vệ route) và tạo bộ khung `<DashboardLayout />` có Sidebar và Header.
- **Bước 5: Code Trang Dashboard.** Hiển thị danh sách Order mới nhất (mock data trước) và các nút thao tác Approve/Reject.

Hãy bắt đầu với Bước 1, cho tôi xin danh sách lệnh cài đặt và các file config ban đầu.