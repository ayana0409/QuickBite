# 📱 Hướng dẫn Triển khai Customer Web App (Next.js 16 / React 19 / Leaflet Map / Zustand)

> Tài liệu kỹ thuật chuẩn xác **100% theo mã nguồn thực tế** của ứng dụng giao diện khách hàng trong hệ sinh thái QuickBite:
> - **Framework & Core:** `Next.js 16.3.0` (App Router), `React 19.2.8`, `TypeScript 5.0`
> - **Styling & Icons:** `Tailwind CSS v4` (`@tailwindcss/postcss`), `Lucide React 1.31`
> - **State Management & Forms:** `Zustand 5.0.15` (`cart.store`, `ui.store`), `React Hook Form 7.85` + `Zod 4.4`
> - **Interactive Maps & GPS:** `Leaflet 1.9.4` + `React Leaflet 5.0.0` (Định vị địa chỉ & tracking giao hàng)
> - **Animation & Cold-Start:** `Anime.js 4.5` trên `<BootScreen />` với `<ClientBootManager />`
> - **Authentication:** `NextAuth 4.24` / `AuthModal` tích hợp Identity Service OIDC qua API Gateway.

---

## 📑 Mục lục

1. [Tổng quan Kiến trúc Ứng dụng Khách hàng](#1-tổng-quan-kiến-trúc-ứng-dụng-khách-hàng)
2. [Tech Stack & Thư viện Cốt lõi](#2-tech-stack--thư-viện-cốt-lõi)
3. [Cấu trúc Thư mục & Routing (App Router)](#3-cấu-trúc-thư-mục--routing-app-router)
4. [Các Tính năng & Luồng Người dùng Đã Triển khai](#4-các-tính-năng--luồng-người-dùng-đã-triển-khai)
5. [Tối ưu SEO & Server-Side Rendering (SSR/RSC)](#5-tối-ưu-seo--server-side-rendering-ssrrsc)
6. [Bản đồ Định vị GPS & Tracking Giao hàng (Leaflet)](#6-bản-đồ-định-vị-gps--tracking-giao-hàng-leaflet)
7. [Giỏ hàng & Quản lý Biến thể Món (Food Customizer & Zustand)](#7-giỏ-hàng--quản-lý-biến-thể-món-food-customizer--zustand)
8. [Màn hình Khởi động Hệ thống (BootScreen & Cold-Start)](#8-màn-hình-khởi-động-hệ-thống-bootscreen--cold-start)
9. [Dependencies `package.json` thực tế](#9-dependencies-packagejson-thực-tế)
10. [Hướng dẫn Chạy & Khởi động](#10-hướng-dẫn-chạy--khởi-động)

---

## 1. Tổng quan Kiến trúc Ứng dụng Khách hàng

**Customer Web App** là mặt tiền thương mại điện tử công khai (Storefront) của QuickBite. Ứng dụng được thiết kế ưu tiên:
1. **Tối ưu SEO**: Render sẵn HTML trên Server (Server Components) để các bot tìm kiếm (Google, Bing) lập chỉ mục thực đơn và nhà hàng nhanh chóng.
2. **Trải nghiệm Đặt món Trực quan**: Hỗ trợ tùy chỉnh biến thể món (Size M/L, Toppings), chọn địa chỉ giao hàng kèm định vị bản đồ số GPS.
3. **Theo dõi Đơn hàng Live**: Trực quan hóa tiến độ giao hàng theo từng nấc trạng thái (`Draft ➔ Pending ➔ Confirmed ➔ Preparing ➔ Delivering ➔ Completed`) kèm Stepper và bản đồ hành trình.
4. **Cổng Kết nối**: Giao tiếp 100% qua **API Gateway BFF (Port 3001)**.

---

## 2. Tech Stack & Thư viện Cốt lõi

| Thành phần | Thư viện / Công nghệ | Phiên bản | Vai trò kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.3.0` | Server-Side Rendering (SSR), React Server Components (RSC) |
| **UI Library** | React & React DOM | `19.2.8` | Component rendering, concurrent features |
| **Styling** | Tailwind CSS v4 | `^4.0.0` | Modern CSS utilities (`@tailwindcss/postcss`) |
| **Client State** | Zustand | `^5.0.15` | Quản lý Giỏ hàng (`cart.store`) & UI Drawer (`ui.store`) |
| **Forms & Validation**| React Hook Form + Zod | `7.85` / `4.4` | Form checkout, cập nhật địa chỉ, đăng ký đối tác |
| **Bản đồ số GPS** | Leaflet + React Leaflet | `1.9.4` / `5.0.0` | Hiển thị tọa độ giao hàng, ghim vị trí nhận món trên bản đồ |
| **Authentication** | NextAuth + Custom Modal | `^4.24.15` | Xác thực OIDC / OAuth2 token qua Gateway |
| **Icons** | Lucide React | `^1.31.0` | Bộ icon SVG nhẹ, đồng bộ |
| **Animation** | Anime.js | `^4.5.0` | Hiệu ứng đồ thị topology trên màn hình `<BootScreen />` |

---

## 3. Cấu trúc Thư mục & Routing (App Router)

```
src/quick-bite-customer-web/
├── app/                                 # Next.js App Router (Root)
│   ├── layout.tsx                       # Root Layout (ClientBootManager, Providers, ToastProvider)
│   ├── page.tsx                         # Trang chủ (Hero Banner, Danh mục, Nhà hàng nổi bật - SSR)
│   ├── globals.css                      # Tailwind v4 theme setup
│   ├── restaurant/
│   │   └── [id]/page.tsx                # Trang chi tiết nhà hàng, danh mục món ăn & reviews
│   ├── food/
│   │   └── [id]/page.tsx                # Trang chi tiết món ăn (Variants & Toppings customizer)
│   ├── checkout/
│   │   └── page.tsx                     # Trang thanh toán (Chọn địa chỉ Map GPS, hình thức thanh toán)
│   ├── order/
│   │   └── [orderId]/
│   │       ├── page.tsx                 # Trang theo dõi đơn hàng live (OrderStatusStepper, Map)
│   │       └── review/page.tsx          # Trang gửi đánh giá món ăn sau khi nhận đơn
│   ├── orders/
│   │   └── page.tsx                     # Lịch sử đơn hàng của tôi
│   ├── partner-registration/
│   │   └── page.tsx                     # Đăng ký mở quán đối tác (Tạo CatalogRequest)
│   ├── payment/                         # Callback thanh toán
│   └── profile/
│       └── page.tsx                     # Hồ sơ người dùng & quản lý sổ địa chỉ
│
└── src/
    ├── components/
    │   ├── home/                        # Hero, CategoryBar, RestaurantGrid, PromoBanner
    │   ├── partner-registration/        # Form đăng ký đối tác nhà hàng
    │   └── shared/
    │       ├── Header.tsx               # Navigation bar, Search, User dropdown, Cart icon
    │       ├── CartDrawer.tsx           # Drawer giỏ hàng trượt bên phải
    │       ├── FoodCustomizer.tsx       # Modal chọn Size (Variant) và Toppings
    │       ├── CheckoutMapPicker.tsx    # Leaflet map picker ghim tọa độ giao hàng
    │       ├── OrderStatusStepper.tsx   # Thanh tiến trình trạng thái đơn hàng
    │       ├── BootScreen.tsx           # Màn hình topology Anime.js khi backend cold-start
    │       ├── ClientBootManager.tsx    # Wrapper kiểm tra health wake-up
    │       ├── DeliveryAddressModal.tsx # Modal quản lý và thêm địa chỉ giao hàng
    │       └── ReviewListSection.tsx    # Danh sách đánh giá & số sao món ăn
    ├── store/
    │   ├── cart.store.ts                # Zustand Cart Store (Local Storage sync, calculate total)
    │   └── ui.store.ts                  # Zustand UI state (Cart Drawer open/close)
    ├── lib/                             # API client utilities, fetch helpers, formatters
    └── types/                           # TypeScript interfaces (Restaurant, FoodItem, Order, Review)
```

---

## 4. Các Tính năng & Luồng Người dùng Đã Triển khai

### 4.1. Luồng Khám phá & Đặt món (Discovery & Ordering)
1. **Trang chủ (`/`):** Hiển thị thanh danh mục món ăn, tìm kiếm nhà hàng, danh sách nhà hàng được đánh giá cao (render sẵn SSR).
2. **Chi tiết Nhà hàng (`/restaurant/[id]`):** Xem thông tin quán, giờ mở cửa, địa chỉ, thực đơn phân theo từng Category, bảng đánh giá tổng hợp.
3. **Tùy biến Món ăn (`FoodCustomizer.tsx`):**
   * Cho phép chọn biến thể kích cỡ (ví dụ: `Size M: +0đ`, `Size L: +10.000đ`).
   * Tích chọn nhiều Topping (ví dụ: `Trân châu đen: +5.000đ`, `Pudding: +7.000đ`).
   * Tự động cộng dồn đơn giá chính xác và thêm vào giỏ hàng (`cart.store`).

### 4.2. Luồng Thanh toán & Định vị GPS (`/checkout`)
* Nhập địa chỉ giao hàng chi tiết (Số nhà, Phường, Quận, Thành phố).
* Tích hợp **Leaflet Map (`CheckoutMapPicker.tsx`)**: Cho phép khách hàng ghim trực tiếp tọa độ (Latitude / Longitude) trên bản đồ số để shipper giao hàng chính xác.
* Chọn phương thức thanh toán: `COD` (Tiền mặt), `MOCK_PAYMENT` (Sandbox Demo), `MOMO`, `CREDIT_CARD`.
* Kích hoạt gọi API `POST /api/orders` qua Gateway để tạo đơn và khởi động chuỗi **Saga Orchestrator**.

### 4.3. Theo dõi Đơn hàng Trực quan (`/order/[orderId]`)
* **`OrderStatusStepper`**: Hiển thị thanh tiến trình 5 bước: `Đã tiếp nhận ➔ Đã duyệt (Saga Confirmed) ➔ Đang nấu ➔ Đang giao ➔ Hoàn tất`.
* Xem chi tiết từng món ăn đã đặt, topping đi kèm, tổng tiền và tọa độ giao hàng.
* Hỗ trợ nút **Hủy đơn hàng** (`RefundOrderModal.tsx`): Kích hoạt API hủy đơn và luồng bù trừ (Compensation) tự động hoàn tiền/nhả kho.
* Sau khi đơn hàng hoàn tất (`Completed`), nút **Đánh giá món ăn** được kích hoạt để chuyển sang trang `/order/[orderId]/review`.

### 4.4. Đăng ký Đối tác Nhà hàng (`/partner-registration`)
* Form đăng ký mở quán dành cho đối tác: Tên quán, địa chỉ, ảnh đại diện, tọa độ GPS.
* Gửi dữ liệu dưới dạng `CatalogRequest` (type: `RESTAURANT_REGISTRATION`) tới Catalog Service để Admin xét duyệt.

---

## 5. Tối ưu SEO & Server-Side Rendering (SSR/RSC)

Next.js App Router tận dụng **React Server Components** để fetch trực tiếp dữ liệu từ API Gateway tại server:

```typescript
// app/restaurant/[id]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await fetchRestaurantById(id);
  
  return {
    title: `${restaurant.name} | Đặt món ngon tại QuickBite`,
    description: `Thực đơn món ngon, khuyến mãi hấp dẫn tại ${restaurant.name}, địa chỉ ${restaurant.address.line1}`,
    openGraph: {
      title: restaurant.name,
      images: [restaurant.coverImage || '/default-restaurant.jpg'],
    },
  };
}
```

---

## 6. Bản đồ Định vị GPS & Tracking Giao hàng (Leaflet)

Ứng dụng tích hợp **Leaflet 1.9** và **React Leaflet 5** (được tải an toàn phía client tránh lỗi SSR `window is not defined`):

```typescript
// Component CheckoutMapPicker.tsx tải động
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
```
* Cho phép chọn vị trí giao hàng trực quan bằng ghim Marker kéo thả hoặc click bản đồ.
* Lưu trữ tọa độ chuẩn `{ lat: number, lng: number }` vào bản ghi đơn hàng `DeliveryAddress` trong MySQL.

---

## 7. Giỏ hàng & Quản lý Biến thể Món (Zustand)

Store giỏ hàng (`cart.store.ts`) quản lý logic tính toán giá món phức tạp kèm biến thể và topping, tự động lưu vào `localStorage`:

```typescript
interface CartItem {
  id: string;              // Unique cart item hash (foodItemId + variant + toppings)
  foodItemId: string;
  restaurantId: string;
  name: string;
  price: number;           // Base price
  selectedVariant?: { name: string; priceDelta: number };
  selectedToppings?: { name: string; price: number }[];
  quantity: number;
  unitPrice: number;       // Base price + variant delta + toppings sum
}
```

---

## 8. Màn hình Khởi động Hệ thống (BootScreen & Cold-Start)

* Khi mở trang web lần đầu, `<ClientBootManager />` trong `layout.tsx` kiểm tra trạng thái toàn hệ thống thông qua `GET /api/system/health/wake-up`.
* Nếu backend đang ở trạng thái ngủ đông (Sleep Tier), component `<BootScreen />` kích hoạt hiệu ứng **Anime.js** mô phỏng quá trình kết nối tới từng microservice.
* Khi hệ thống đã thức dậy hoàn toàn (HTTP 200), BootScreen mượt mà unmount và trả về giao diện ứng dụng.

---

## 9. Dependencies `package.json` thực tế

```json
{
  "name": "quick-bite-customer-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.9.1",
    "@types/leaflet": "^1.9.22",
    "animejs": "^4.5.0",
    "clsx": "^2.1.1",
    "leaflet": "^1.9.4",
    "lucide-react": "^1.31.0",
    "next": "16.3.0",
    "next-auth": "^4.24.15",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-hook-form": "^7.85.0",
    "react-leaflet": "^5.0.0",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 10. 🚀 Hướng dẫn Chạy & Khởi động

```bash
# 1. Cấu hình biến môi trường (.env)
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001

# 2. Cài đặt dependencies và chạy Next.js dev server
cd src/quick-bite-customer-web
npm install
npm run dev

# -> Ứng dụng chạy tại: http://localhost:3002
```