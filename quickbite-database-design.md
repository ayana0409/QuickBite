# 🗄️ QuickBite — Thiết kế Cơ sở Dữ liệu Toàn diện (Unified Database Design)

> **Tài liệu chuẩn hoá cơ sở dữ liệu duy nhất của hệ thống QuickBite**, phản ánh chính xác 100% mã nguồn thực tế (Entities, Migrations, Repositories). Hệ thống tuân thủ nghiêm ngặt nguyên tắc **Database-per-Service (Single-tenant)** và liên kết dữ liệu bất đồng bộ qua **Apache Kafka**.

---

## 📑 Mục lục

1. [Tổng quan Kiến trúc Dữ liệu](#1-tổng-quan-kiến-trúc-dữ-liệu)
2. [Identity Service Database (PostgreSQL)](#2-identity-service-database-postgresql)
3. [Order Service Database (MySQL)](#3-order-service-database-mysql)
4. [Catalog Service Database (PostgreSQL)](#4-catalog-service-database-postgresql)
5. [Payment Service Database (PostgreSQL)](#5-payment-service-database-postgresql)
6. [Inventory Service Database (PostgreSQL)](#6-inventory-service-database-postgresql)
7. [API Gateway Dynamic Config (MongoDB & Redis)](#7-api-gateway-dynamic-config-mongodb--redis)
8. [Ma trận Tham chiếu Chéo & Đồng bộ qua Kafka](#8-ma-trận-tham-chiếu-chéo--đồng-bộ-qua-kafka)
9. [Bảng Outbox & Inbox Pattern Ledger](#9-bảng-outbox--inbox-pattern-ledger)

---

## 1. Tổng quan Kiến trúc Dữ liệu

| Service | DBMS Engine | ORM / Data Layer | Kiểu ID | Trách nhiệm dữ liệu chính |
| :--- | :--- | :--- | :--- | :--- |
| **Identity Service** | **PostgreSQL** | ABP EF Core (`Volo.Abp.EntityFrameworkCore.PostgreSql`) | `UUID` (Guid) | Tài khoản, vai trò (Roles), phân quyền (Permissions), OpenIddict Tokens/Clients |
| **Order Service** | **MySQL** | ABP EF Core (`Volo.Abp.EntityFrameworkCore.MySQL`) | `UUID` (Guid) | Đơn hàng, chi tiết món đặt, lịch sử chuyển trạng thái, bản sao thực đơn (Replica) |
| **Catalog Service** | **PostgreSQL** | TypeORM (`pg`) | `UUID` (v4) | Nhà hàng, danh mục, thực đơn (Variants/Toppings JSONB), đánh giá, đơn đăng ký đối tác |
| **Payment Service** | **PostgreSQL** | Spring Data JPA (Hibernate) | `UUID` | Bản ghi giao dịch thanh toán, trạng thái ủy quyền, phương thức thanh toán |
| **Inventory Service**| **PostgreSQL** | Spring Data JPA (Hibernate) | `UUID` | Tồn kho khả dụng (`quantity`), số lượng tạm giữ (`reserved_quantity`), bản sao món |
| **API Gateway** | **MongoDB** + **Redis** | Mongoose + ioredis | `String` / Key | Cấu hình định tuyến động 3 lớp (`Redis -> MongoDB -> .env`), rate limit tracking |

---

## 2. Identity Service Database (PostgreSQL)

Quản lý định danh tập trung, xác thực OAuth2 / OpenID Connect với **OpenIddict 7.2** và phân quyền RBAC đa cấp độ.

```
                    ┌─────────────────────────┐
                    │        AbpUsers         │
                    │  (id, username, email)  │
                    └────────────┬────────────┘
                                 │ 1:N
                    ┌────────────▼────────────┐
                    │      AbpUserRoles       │
                    └────────────┬────────────┘
                                 │ N:1
                    ┌────────────▼────────────┐
                    │        AbpRoles         │
                    └─────────────────────────┘
```

### 2.1. Bảng cốt lõi
* **`AbpUsers`**: Lưu thông tin tài khoản người dùng (`Id UUID PK`, `UserName`, `NormalizedUserName`, `Email`, `PasswordHash`, `SecurityStamp`, `IsActive`, `CreationTime`).
* **`AbpRoles`**: Quản lý nhóm quyền (`Id UUID PK`, `Name`, `NormalizedName`, `IsDefault`).
* **`AbpUserRoles`**: Bảng nối nhiều-nhiều giữa User và Role (`UserId UUID`, `RoleId UUID`).
* **`AbpPermissionGrants`**: Phân quyền chi tiết theo tính năng (`Id UUID PK`, `Name`, `ProviderName`, `ProviderKey`).

### 2.2. Bảng OpenIddict (OAuth2 / OIDC Server)
* **`OpenIddictApplications`**: Lưu các Client ID (`quickbite_web`, `quickbite_portal`, `quickbite_swagger`).
* **`OpenIddictAuthorizations`**: Lưu phiên ủy quyền của user cho từng client.
* **`OpenIddictScopes`**: Định nghĩa phạm vi (`openid`, `profile`, `email`, `roles`, `offline_access`).
* **`OpenIddictTokens`**: Lưu Access Token, Refresh Token băm (Hashed), ngày hết hạn và trạng thái thu hồi.

---

## 3. Order Service Database (MySQL)

Lõi nghiệp vụ đặt hàng và điều phối Saga. Sử dụng **MySQL** tối ưu hóa tốc độ ghi và quản lý trạng thái đơn hàng.

```
   ┌────────────────────────────────────────────────────────┐
   │                       AppOrders                        │
   │  (Id PK, OrderCode, CustomerId, RestaurantId, Status)  │
   └───┬───────────────────────────────┬────────────────────┘
       │ 1:N                           │ 1:N
   ┌───▼───────────────┐           ┌───▼────────────────────────┐
   │   AppOrderItems   │           │   AppOrderStatusHistories  │
   │  (Sku, Quantity)  │           │   (FromStatus, ToStatus)   │
   └───────────────────┘           └────────────────────────────┘
```

### 3.1. Bảng `AppOrders` (Aggregate Root)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | `CHAR(36)` | PK | Định danh duy nhất của đơn hàng (UUID) |
| `OrderCode` | `VARCHAR(32)` | NOT NULL, UNIQUE | Mã đơn hàng thân thiện (vd: `ORD-20260822-ABCD`) |
| `CustomerId` | `CHAR(36)` | NOT NULL, INDEX | ID người đặt hàng (tham chiếu User) |
| `RestaurantId`| `CHAR(36)` | NOT NULL, INDEX | ID nhà hàng được đặt món |
| `Status` | `INT` | NOT NULL | Trạng thái: `0:Draft`, `1:Pending`, `2:WaitingStock`, `3:WaitingPayment`, `4:Confirmed`, `5:Preparing`, `6:Delivering`, `7:Completed`, `8:Cancelled`, `9:Failed` |
| `Version` | `INT` | NOT NULL, DEFAULT 0 | Phiên bản concurrency |
| `TotalAmount` | `DECIMAL(18,2)`| NOT NULL | Tổng tiền đơn hàng |
| `Currency` | `VARCHAR(8)` | NOT NULL, DEFAULT 'VND' | Đơn vị tiền tệ |
| `DeliveryAddress_Line1` | `VARCHAR(256)` | NOT NULL | Địa chỉ chi tiết (số nhà, đường) |
| `DeliveryAddress_Ward` | `VARCHAR(128)` | NOT NULL | Phường / Xã |
| `DeliveryAddress_District`| `VARCHAR(128)` | NOT NULL | Quận / Huyện |
| `DeliveryAddress_City` | `VARCHAR(128)` | NOT NULL | Tỉnh / Thành phố |
| `DeliveryAddress_Latitude`| `DOUBLE` | NULL | Tọa độ vĩ độ giao hàng (GPS) |
| `DeliveryAddress_Longitude`| `DOUBLE`| NULL | Tọa độ kinh độ giao hàng (GPS) |
| `CorrelationId` | `CHAR(36)` | NOT NULL, INDEX | Correlation ID gắn với Saga State Machine qua Kafka |
| `CreationTime` | `DATETIME` | NOT NULL | Thời gian tạo đơn |
| `LastModificationTime` | `DATETIME` | NULL | Thời gian cập nhật cuối cùng |

### 3.2. Bảng `AppOrderItems`
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | `CHAR(36)` | PK | UUID của dòng sản phẩm |
| `OrderId` | `CHAR(36)` | FK -> `AppOrders(Id)` | Tham chiếu đơn hàng |
| `Sku` | `CHAR(36)` | NOT NULL, INDEX | ID món ăn (`food_items.id`) |
| `ItemName` | `VARCHAR(256)` | NOT NULL | Tên món ăn tại thời điểm mua |
| `Quantity` | `INT` | NOT NULL | Số lượng mua |
| `UnitPrice` | `DECIMAL(18,2)`| NOT NULL | Đơn giá tại thời điểm mua |
| `SelectedVariantName` | `VARCHAR(128)` | NULL | Tên biến thể đã chọn (Size L, M, Cay...) |
| `SelectedToppings` | `LONGTEXT` / `JSON` | NOT NULL, DEFAULT '[]' | Danh sách topping chọn kèm (JSON string) |

### 3.3. Bảng `AppOrderStatusHistories`
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | `CHAR(36)` | PK | UUID |
| `OrderId` | `CHAR(36)` | FK -> `AppOrders(Id)` | Tham chiếu đơn hàng |
| `FromStatus` | `INT` | NULL | Trạng thái trước khi chuyển đổi |
| `ToStatus` | `INT` | NOT NULL | Trạng thái mới |
| `Reason` | `VARCHAR(512)` | NULL | Lý do chuyển trạng thái (hoàn tiền, hủy đơn...) |
| `ChangedBy` | `INT` | NOT NULL | Đối tượng thay đổi (`1:Customer`, `2:Merchant`, `3:SystemSaga`, `4:Admin`) |
| `ChangedAt` | `DATETIME` | NOT NULL | Thời điểm thay đổi |

### 3.4. Bảng `AppFoodItems` (Replica Table)
Bản sao cục bộ chỉ đọc trong Order Service, được đồng bộ từ Catalog Service qua Kafka topic `catalog-events`:
* `Id CHAR(36) PK`, `Name VARCHAR(256)`, `Price DECIMAL(18,2)`, `Variants LONGTEXT`, `Toppings LONGTEXT`.

---

## 4. Catalog Service Database (PostgreSQL)

Quản lý toàn bộ danh mục nhà hàng, món ăn, menu modifiers, luồng xét duyệt đối tác và đánh giá.

```
       ┌────────────────────────┐
       │      restaurants       │
       │   (id, ownerId, slug)  │
       └───────────┬────────────┘
                   │ 1:N
       ┌───────────▼────────────┐          ┌───────────────────────┐
       │       categories       │          │   catalog_requests    │
       │  (restaurantId, name)  │          │   (userId, payload)   │
       └───────────┬────────────┘          └───────────────────────┘
                   │ 1:N
       ┌───────────▼────────────┐          ┌───────────────────────┐
       │       food_items       │          │        reviews        │
       │  (variants, toppings)  │◄─────────┤ (orderId, foodItemId) │
       └────────────────────────┘          └───────────────────────┘
```

### 4.1. Bảng `restaurants`
* `id` (`UUID`, PK)
* `ownerId` (`UUID`, NOT NULL, INDEX): ID chủ quán (Merchant User ID)
* `slug` (`VARCHAR`, NOT NULL, UNIQUE INDEX): Đường dẫn SEO (vd: `tra-sua-gong-cha`)
* `name` (`VARCHAR`, NOT NULL): Tên nhà hàng
* `address` (`JSONB`, NOT NULL): `{ line1, ward, district, city, geo: { type: "Point", coordinates: [lng, lat] } }`
* `status` (`VARCHAR`, DEFAULT 'closed'): Trạng thái kinh doanh (`active`, `closed`, `suspended`)
* `rating` (`JSONB`, DEFAULT `'{"avg":0,"count":0}'`): Điểm đánh giá trung bình & tổng lượt review
* `createdAt`, `updatedAt` (`TIMESTAMP WITH TIME ZONE`)

### 4.2. Bảng `categories`
* `id` (`UUID`, PK)
* `restaurantId` (`UUID`, NOT NULL, FK -> `restaurants.id` ON DELETE CASCADE)
* `name` (`VARCHAR(100)`, NOT NULL)
* `sortOrder` (`INT`, DEFAULT 0): Thứ tự hiển thị trên menu
* `createdAt`, `updatedAt` (`TIMESTAMP`)

### 4.3. Bảng `food_items`
* `id` (`UUID`, PK)
* `categoryId` (`UUID`, NOT NULL, INDEX)
* `restaurantId` (`UUID`, NOT NULL, INDEX)
* `sku` (`VARCHAR`, NOT NULL, UNIQUE INDEX): Mã định danh SKU duy nhất
* `name` (`VARCHAR`, NOT NULL)
* `description` (`TEXT`, NULL)
* `price` (`DECIMAL(10,2)`, NOT NULL)
* `currency` (`VARCHAR`, DEFAULT 'VND')
* `images` (`TEXT[]`, DEFAULT `'{}'`): Mảng URL hình ảnh
* `isAvailable` (`BOOLEAN`, DEFAULT TRUE): Món còn bán hay không
* `preparationTime` (`INT`, DEFAULT 15): Thời gian chuẩn bị (phút)
* `tags` (`TEXT[]`, DEFAULT `'{}'`): Tags tìm kiếm (vd: `["Trà sữa", "Ăn vặt"]`)
* `totalSold` (`INT`, DEFAULT 0): Số lượng đã bán
* `rating` (`DECIMAL(3,2)`, DEFAULT 0): Điểm đánh giá riêng cho món
* `reviewCount` (`INT`, DEFAULT 0)
* `variants` (`JSONB`, DEFAULT `'[]'`): Mảng các biến thể `[ { "name": "Size L", "priceDelta": 10000 } ]`
* `toppings` (`JSONB`, DEFAULT `'[]'`): Mảng các topping chọn kèm `[ { "name": "Trân châu đen", "price": 5000 } ]`

### 4.4. Bảng `catalog_requests` (Generic Request Workflow)
* `id` (`UUID`, PK)
* `userId` (`UUID`, NOT NULL, INDEX): Người gửi yêu cầu
* `type` (`VARCHAR/ENUM`, NOT NULL): `RESTAURANT_REGISTRATION`, `FOOD_REPORT`, `SYSTEM_FEEDBACK`
* `status` (`VARCHAR/ENUM`, DEFAULT 'PENDING'): `PENDING`, `APPROVED`, `REJECTED`
* `payload` (`JSONB`, NOT NULL): Chứa thông tin đăng ký quán hoặc nội dung báo cáo
* `adminNote` (`TEXT`, NULL): Ghi chú phản hồi của quản trị viên
* `processedBy` (`UUID`, NULL): Admin phê duyệt
* `createdAt`, `updatedAt` (`TIMESTAMP`)

### 4.5. Bảng `reviews`
* `id` (`UUID`, PK)
* `orderId` (`VARCHAR`, NOT NULL)
* `restaurantId` (`VARCHAR`, NOT NULL, INDEX)
* `foodItemId` (`VARCHAR`, NOT NULL, INDEX)
* `userId` (`VARCHAR`, NOT NULL)
* `rating` (`INT`, NOT NULL): Số sao (1 đến 5)
* `comment` (`TEXT`, NULL)
* `createdAt`, `updatedAt` (`TIMESTAMP`)
* **Unique Compound Index:** `IDX_REVIEW_ORDER_FOOD (orderId, foodItemId)` đảm bảo mỗi món trong một đơn chỉ được đánh giá 1 lần.

---

## 5. Payment Service Database (PostgreSQL)

Tuân thủ **Hexagonal Architecture**. Quản lý các giao dịch thanh toán và hỗ trợ Sandbox Mock Payment Gateway.

### 5.1. Bảng `payments`
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK | Mã giao dịch thanh toán duy nhất |
| `order_id` | `UUID` | NOT NULL, INDEX | Tham chiếu Order ID từ Order Service |
| `customer_id` | `UUID` | NULL | Tham chiếu Customer ID |
| `amount` | `NUMERIC(18,2)` | NOT NULL | Số tiền thanh toán |
| `status` | `VARCHAR(32)` | NOT NULL | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |
| `method` | `VARCHAR(32)` | NOT NULL | `MOCK_PAYMENT`, `COD`, `CREDIT_CARD`, `MOMO` |
| `transaction_id`| `VARCHAR(255)`| NULL | Mã giao dịch từ cổng thanh toán bên thứ ba |
| `payment_url` | `VARCHAR(1000)`| NULL | URL cổng thanh toán / QR Code Sandbox |
| `failure_reason`| `VARCHAR(500)` | NULL | Lý do thanh toán thất bại nếu có |
| `created_at` | `TIMESTAMP` | NOT NULL | Thời điểm khởi tạo giao dịch |
| `updated_at` | `TIMESTAMP` | NULL | Thời điểm cập nhật cuối cùng |

---

## 6. Inventory Service Database (PostgreSQL)

Quản lý tồn kho nguyên liệu/món ăn, tính toán khả dụng và giữ chỗ (Hold) cho Saga giao dịch.

### 6.1. Bảng `inventory_items`
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK | Mã định danh kho |
| `food_item_id` | `UUID` | NOT NULL, UNIQUE INDEX | Tham chiếu ID món ăn từ Catalog |
| `quantity` | `INT` | NOT NULL, DEFAULT 0 | Tổng số lượng vật lý tồn trong kho |
| `reserved_quantity`| `INT` | NOT NULL, DEFAULT 0 | Số lượng đang tạm giữ cho các đơn đang Pending |
| `created_at` | `TIMESTAMP` | NOT NULL | Thời điểm tạo |
| `updated_at` | `TIMESTAMP` | NULL | Thời điểm cập nhật |

> **Công thức khả dụng:** `AvailableQuantity = Math.max(0, quantity - reserved_quantity)`.  
> * Khi nhận `order.created`: `reserved_quantity += requestedQty` (nếu `AvailableQuantity >= requestedQty`).
> * Khi nhận `order.confirmed`: `quantity -= requestedQty`, `reserved_quantity -= requestedQty`.
> * Khi nhận compensation `saga.stock.release`: `reserved_quantity -= requestedQty`.

### 6.2. Bảng `inventory_food_items` (Replica Table)
Bản sao thông tin cơ bản của món ăn được đồng bộ từ Catalog qua Kafka:
* `id UUID PK`, `sku VARCHAR`, `name VARCHAR`, `category_id UUID`, `restaurant_id UUID`, `is_available BOOLEAN`, `created_at`, `updated_at`.

---

## 7. API Gateway Dynamic Config (MongoDB & Redis)

API Gateway lưu trữ cấu hình định tuyến và dynamic threshold bằng MongoDB và đệm qua Redis.

### 7.1. Collection `gateway_configs` (MongoDB)
```json
{
  "_id": "66b1a23c89...",
  "key": "RATE_LIMIT_MAX",
  "value": "100",
  "description": "Max requests per TTL window",
  "createdAt": "2026-08-22T08:00:00.000Z",
  "updatedAt": "2026-08-22T08:00:00.000Z"
}
```

### 7.2. Chuỗi phân cấp Dynamic Config (3-Tier Fallback Engine)
```
Request Config Key
       │
       ▼
1. Redis Cache (Key: `gateway:config:{key}`, TTL: 60s)
       │ (Cache Miss)
       ▼
2. MongoDB Collection (`gateway_configs.findOne({ key })`)
       │ (DB Disconnected)
       ▼
3. Local Environment Variables (.env / process.env)
```

---

## 8. Ma trận Tham chiếu Chéo & Đồng bộ qua Kafka

Vì tuân thủ **Database-per-Service**, các bảng không tạo Foreign Key vật lý xuyên cơ sở dữ liệu. Thay vào đó, dữ liệu được liên kết theo logic thông qua UUID và đồng bộ qua Kafka:

| ID Tham chiếu | Service nguồn (Source of Truth) | Service tiêu thụ (Consumer Replica / Reference) | Kênh đồng bộ (Sync Mechanism) |
| :--- | :--- | :--- | :--- |
| `userId` / `customerId` | **Identity Service** (`AbpUsers.Id`) | Order, Catalog Request, Reviews, Payment | JWT Claims (`sub`) & API Gateway Header |
| `restaurantId` | **Catalog Service** (`restaurants.id`) | Order (`AppOrders.RestaurantId`), Inventory | Kafka `catalog-events` & REST API |
| `foodItemId` / `sku` | **Catalog Service** (`food_items.id`) | Order (`AppFoodItems`, `AppOrderItems.Sku`), Inventory (`inventory_items.food_item_id`) | Kafka topic `catalog-events` |
| `orderId` | **Order Service** (`AppOrders.Id`) | Payment (`payments.order_id`), Catalog Reviews (`reviews.orderId`) | Kafka `order-events` & `fulfillment-events` |
| `correlationId` | **Order Service** (Saga Orchestrator) | Order, Payment, Inventory, Event Envelopes | Kafka Event Header / Envelope Metadata |

---

## 9. Bảng Outbox & Inbox Pattern Ledger

Được triển khai trong **Order Service (MySQL)**, **Inventory Service (PostgreSQL)**, và **Payment Service (PostgreSQL)** để ngăn chặn lỗi *Dual-Write* và đảm bảo *Idempotent Event Processing*:

### 9.1. Bảng `OutboxMessages` (Transaction-Safe Publishing)
```sql
CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP NULL
);
```

### 9.2. Bảng `InboxMessages` (Idempotent Consumer Guard)
```sql
CREATE TABLE inbox_messages (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    event_type VARCHAR(128) NOT NULL,
    processed_at TIMESTAMP NOT NULL
);
```

---
*Tài liệu này là bản duy nhất thay thế hoàn toàn cho các bản nháp `quickbite-database-design-v2.md` và `quickbite-database-design-v3.md`.*
