# 📘 Hướng dẫn Triển khai Identity Service & Order Service (.NET 10 / ABP Framework 10)

> Tài liệu chuẩn kỹ thuật phản ánh **100% mã nguồn thực tế** của hai service lõi trong hệ thống QuickBite:
> - **Identity Service:** `.NET 10`, `ABP Framework 10.0.0`, `OpenIddict 7.2.0`, `PostgreSQL`
> - **Order Service:** `.NET 10`, `ABP Framework 10.0.0`, `MassTransit 8.3.6 (Kafka Saga)`, `MySQL`

---

## 📑 Mục lục

1. [Cấu trúc Solution & Projects](#1-cấu-trúc-solution--projects)
2. [Identity Service (.NET 10 / ABP / PostgreSQL)](#2-identity-service-net-10--abp--postgresql)
3. [Order Service (.NET 10 / ABP / MySQL / MassTransit)](#3-order-service-net-10--abp--mysql--masstransit)
4. [Quy trình Saga Orchestration & State Machine](#4-quy-trình-saga-orchestration--state-machine)
5. [Độ tin cậy dữ liệu: Outbox & Inbox Pattern](#5-độ-tin-cậy-dữ-liệu-outbox--inbox-pattern)
6. [Cấu hình Kafka Topics & Event Contracts](#6-cấu-hình-kafka-topics--event-contracts)
7. [Dependencies & NuGet Packages thực tế](#7-dependencies--nuget-packages-thực-tế)

---

## 1. Cấu trúc Solution & Projects

Dự án tuân thủ chặt chẽ **ABP Layered Architecture (DDD)** và tách biệt tầng Infrastructure:

```
src/
├── quick-bite-identity/QuickBite.Identity/
│   └── src/
│       ├── QuickBite.Identity.Domain/                 # Entities: AppUser, AppRole, OpenIddict configs
│       ├── QuickBite.Identity.Domain.Shared/          # Consts, Enums, Error Codes
│       ├── QuickBite.Identity.Application.Contracts/  # DTOs, IAppService interfaces, Permissions
│       ├── QuickBite.Identity.Application/            # AppService implementations (Auth, Users)
│       ├── QuickBite.Identity.EntityFrameworkCore/    # DbContext (PostgreSQL), Migrations
│       ├── QuickBite.Identity.HttpApi/                # REST Controllers
│       ├── QuickBite.Identity.HttpApi.Client/         # C# HTTP Client proxies
│       ├── QuickBite.Identity.DbMigrator/             # Data Seeder & Migration runner
│       └── QuickBite.Identity.Web/                    # Host Startup, OpenIddict OIDC Server, JWKS
│
└── quick-bite-order/QuickBite.Order/
    └── src/
        ├── QuickBite.Order.Domain/                    # Order Aggregate, Entities, ValueObjects, Domain Services
        ├── QuickBite.Order.Domain.Shared/             # OrderStatus, ChangedBy enums, Event DTOs (ETOs)
        ├── QuickBite.Order.Application.Contracts/     # CreateOrderDto, OrderDto, IOrderAppService
        ├── QuickBite.Order.Application/               # OrderAppService, Event Handlers
        ├── QuickBite.Order.EntityFrameworkCore/       # OrderDbContext (MySQL), Migrations
        ├── QuickBite.Order.Infrastructure/            # MassTransit StateMachine, Kafka Producers/Consumers, Workers
        ├── QuickBite.Order.HttpApi/                   # Order REST Controllers
        ├── QuickBite.Order.HttpApi.Client/            # Client proxies
        ├── QuickBite.Order.DbMigrator/                # DB Migration runner
        └── QuickBite.Order.HttpApi.Host/              # Host Startup, Swagger, Serilog (Port 44386)
```

---

## 2. Identity Service (.NET 10 / ABP / PostgreSQL)

### 2.1. Trách nhiệm chính
* Quản lý tài khoản (Users), phân vai trò (Roles) và ma trận quyền hạn chi tiết (RBAC).
* **IAM & OAuth2/OIDC Server**: Phát hành Access Token (RS256 JWT) và Refresh Token qua OpenIddict 7.2.
* Cung cấp endpoint công khai JWKS (`/.well-known/jwks.json`) để API Gateway xác thực chữ ký token tại Edge.
* Hỗ trợ đăng nhập Google OAuth và đăng ký đa vai trò (Customer, Merchant, Admin).

### 2.2. Công nghệ sử dụng
| Thành phần | Công nghệ thực tế |
| :--- | :--- |
| **Framework** | .NET 10 & ABP Framework 10.0.0 |
| **Database** | **PostgreSQL** (`Volo.Abp.EntityFrameworkCore.PostgreSql`) |
| **Auth Protocol** | **OpenIddict 7.2.0** (OAuth2 / OIDC Server, RS256 Signing) |
| **Third-Party Auth** | `Microsoft.AspNetCore.Authentication.Google` |
| **Cache & Tokens** | Redis (`StackExchange.Redis`) |
| **Logging** | Serilog Async Sinks |

### 2.3. Endpoints thực tế
* **OAuth2 Token Endpoint:** `POST /connect/token`
  * `grant_type=password`: Đăng nhập lấy cặp Access Token + Refresh Token + ID Token.
  * `grant_type=refresh_token`: Cấp mới Access Token trong background (Silent refresh).
  * `grant_type=client_credentials`: Giao tiếp an toàn giữa các service nội bộ.
* **Public Discovery:**
  * `GET /.well-known/openid-configuration`: Cấu hình OIDC metadata.
  * `GET /.well-known/jwks.json`: Public Key Sets để Gateway verify JWT RS256.
* **REST API:**
  * `POST /api/app/auth/register`: Đăng ký tài khoản mới.
  * `POST /api/app/auth/google-login`: Đăng nhập qua Google Token.
  * `GET /api/app/auth/profile`: Lấy thông tin cá nhân kèm Roles/Permissions.
  * `PUT /api/app/auth/profile`: Cập nhật thông tin cá nhân.
  * `GET /api/identity/users`: Danh sách người dùng (Quản trị Admin).
  * `GET /api/identity/roles`: Danh sách vai trò và phân quyền.

---

## 3. Order Service (.NET 10 / ABP / MySQL / MassTransit)

### 3.1. Trách nhiệm chính
* Quản lý toàn bộ vòng đời đơn hàng: Tạo đơn (`Draft`/`Pending`), theo dõi tiến độ, hủy đơn.
* Đóng vai trò **Saga Orchestrator State Machine** điều phối luồng giao dịch phân tán qua Kafka.
* Duy trì bản sao cục bộ (`FoodItem` Replica) từ Catalog Service để tính toán giá kèm Toppings/Variants tức thì.
* Đảm bảo an toàn giao dịch với **Transactional Outbox** và **Idempotent Inbox**.

### 3.2. Công nghệ sử dụng
| Thành phần | Công nghệ thực tế |
| :--- | :--- |
| **Framework** | .NET 10 & ABP Framework 10.0.0 |
| **Database** | **MySQL** (`Volo.Abp.EntityFrameworkCore.MySQL 10.0.0`) |
| **Saga Engine** | **MassTransit 8.3.6** (`MassTransit.Kafka`, `MassTransit.EntityFrameworkCore`) |
| **Message Broker** | Apache Kafka (Confluent.Kafka 2.11.1, `Volo.Abp.EventBus.Kafka`) |
| **Background Jobs** | ABP `AsyncPeriodicBackgroundWorkerBase` (`InboxCleanupWorker`) |

### 3.3. Domain Model (DDD Entities)
* **Aggregate Root: `Order`** (`FullAuditedAggregateRoot<Guid>`)
  * `OrderCode` (`VARCHAR(32)`): Mã đơn hàng thân thiện (vd: `ORD-98421`).
  * `CustomerId`, `RestaurantId` (`Guid`): Tham chiếu User & Restaurant.
  * `Status` (`OrderStatus` Enum): `Draft (0)`, `Pending (1)`, `WaitingStock (2)`, `WaitingPayment (3)`, `Confirmed (4)`, `Preparing (5)`, `Delivering (6)`, `Completed (7)`, `Cancelled (8)`, `Failed (9)`.
  * `TotalAmount` (`decimal`), `Currency` (mặc định `'VND'`).
  * `DeliveryAddress` (Value Object): `Line1`, `Ward`, `District`, `City`, `Latitude`, `Longitude`.
  * `CorrelationId` (`Guid`): Định danh phiên giao dịch Saga xuyên suốt qua Kafka.
* **Entities con:**
  * `OrderItem`: `Sku` (Food Item ID), `ItemName`, `Quantity`, `UnitPrice`, `SelectedVariantName`, `SelectedToppings` (JSON string).
  * `OrderStatusHistory`: `OrderId`, `FromStatus`, `ToStatus`, `Reason`, `ChangedBy` (`Customer`, `Merchant`, `SystemSaga`, `Admin`), `ChangedAt`.
  * `FoodItem` (Replica Entity): `Name`, `Price`, `Variants` (JSON), `Toppings` (JSON) — Hỗ trợ hàm domain `CalculatePrice()` kiểm tra hợp lệ giá tiền khi checkout.

### 3.4. Endpoints Order Service (Port 44386)
* `POST /api/app/order`: Tạo đơn hàng mới và kích hoạt Saga qua Kafka.
* `GET /api/app/order/{id}`: Xem chi tiết đơn hàng (kèm danh sách món, địa chỉ GPS, lịch sử trạng thái).
* `GET /api/app/order`: Lọc danh sách đơn hàng có phân trang theo `CustomerId`, `RestaurantId`, `Status`.
* `PUT /api/app/order/{id}/cancel`: Hủy đơn hàng và kích hoạt chuỗi bù trừ (Compensation).
* `PUT /api/app/order/{id}/status`: Cập nhật trạng thái đơn (dành cho Merchant / Delivery: `Preparing`, `Delivering`, `Completed`).

---

## 4. Quy trình Saga Orchestration & State Machine

Saga được hiện thực hóa bằng **MassTransit State Machine (`OrderStateMachine.cs`)** quản lý các chuyển đổi trạng thái bất đồng bộ qua Kafka:

```
                      [Khách hàng tạo đơn]
                               │
                               ▼
                       ┌───────────────┐
                       │ Status: Draft │
                       └───────┬───────┘
                               │ POST /api/app/order
                               ▼
                      ┌─────────────────┐
                      │ Status: Pending │ ──► Ghi DB (MySQL) + Transactional Outbox
                      └────────┬────────┘
                               │
                               ▼ Publish Kafka: `order.created`
            ┌──────────────────┴──────────────────┐
            ▼ (Song song)                         ▼ (Song song)
    [Inventory Service]                    [Payment Service]
    - Kiểm tra tồn kho                     - Xác thực thanh toán
    - Giữ chỗ (Hold stock)                 - Mock Sandbox Gateway
            │                                     │
            ▼                                     ▼
   `stock.reserved`                      `payment.authorized`
   (hoặc `stock.rejected`)               (hoặc `payment.failed`)
            │                                     │
            └──────────────────┬──────────────────┘
                               │ (Consume: `fulfillment-events`)
                               ▼
                    [Order State Machine]
                               │
                 ┌─────────────┴─────────────┐
                 │ Cả 2 bước thành công?    │
                 └─────────────┬─────────────┘
                               │
                ┌──────────────┴──────────────┐
             [ CÓ ]                         [ KHÔNG ]
                │                              │
                ▼                              ▼
      ┌───────────────────┐          ┌──────────────────────┐
      │ Status: Confirmed │          │  Status: Cancelled   │
      └─────────┬─────────┘          └──────────┬───────────┘
                │                               │
                ▼                               ▼
       Publish: `order.confirmed`      Publish Compensation:
                                       - `saga.stock.release` (Nhả tồn kho)
                                       - `saga.payment.refund` (Hoàn tiền)
                                       - `order.cancelled`
```

---

## 5. Độ tin cậy dữ liệu: Outbox & Inbox Pattern

### 5.1. Transactional Outbox
* Khi tạo đơn hàng hoặc chuyển trạng thái, thông tin đơn hàng và bản ghi sự kiện `OutboxMessage` được commit trong **cùng 1 MySQL Database Transaction**.
* Tránh hoàn toàn tình huống ghi DB thành công nhưng gửi Kafka thất bại (Dual-Write Problem).
* Worker định kỳ đọc các message chưa gửi (`Status = PENDING`) để publish lên Kafka và đánh dấu `PROCESSED`.

### 5.2. Idempotent Consumer (Inbox Pattern)
* Mọi consumer Kafka trong Order Service kiểm tra `eventId` trong bảng `InboxMessage` trước khi xử lý.
* Nếu `eventId` đã tồn tại, consumer bỏ qua message, triệt tiêu rủi ro xử lý 2 lần do cơ chế *at-least-once delivery* của Kafka.
* `InboxCleanupWorker` định kỳ dọn dẹp các bản ghi inbox đã xử lý quá 7 ngày để tối ưu dung lượng MySQL.

---

## 6. Cấu hình Kafka Topics & Event Contracts

Các Topic chính được cấu hình trong `TopicConstants.cs`:

| Topic | Partition Key | Producer | Consumer | Event Types |
| :--- | :--- | :--- | :--- | :--- |
| **`order-events`** | `orderId` | Order Service | Payment, Inventory, Notification | `order.created`, `order.confirmed`, `order.cancelled` |
| **`fulfillment-events`** | `orderId` | Payment, Inventory | Order Service (Saga) | `payment.authorized`, `payment.failed`, `stock.reserved`, `stock.rejected` |
| **`catalog-events`** | `restaurantId` | Catalog Service | Order Service (`FoodItem` sync) | `menu.updated`, `food.item.synced` |
| **`notification-events`**| `userId` | Order, Payment | Notification Service | `order.status.updated`, `payment.completed` |

---

## 7. Dependencies & NuGet Packages thực tế

### 7.1. QuickBite.Identity (PostgreSQL)
```xml
<ItemGroup>
  <PackageReference Include="Volo.Abp.Identity.EntityFrameworkCore" Version="10.0.0" />
  <PackageReference Include="Volo.Abp.OpenIddict.EntityFrameworkCore" Version="10.0.0" />
  <PackageReference Include="Volo.Abp.EntityFrameworkCore.PostgreSql" Version="10.0.0" />
  <PackageReference Include="OpenIddict.Server.AspNetCore" Version="7.2.0" />
  <PackageReference Include="Microsoft.AspNetCore.Authentication.Google" Version="7.0.0" />
  <PackageReference Include="Serilog.AspNetCore" Version="9.0.0" />
</ItemGroup>
```

### 7.2. QuickBite.Order (MySQL & Kafka MassTransit)
```xml
<ItemGroup>
  <PackageReference Include="Volo.Abp.EntityFrameworkCore.MySQL" Version="10.0.0" />
  <PackageReference Include="Volo.Abp.BackgroundWorkers" Version="10.0.0" />
  <PackageReference Include="Volo.Abp.EventBus.Kafka" Version="10.0.0" />
  <PackageReference Include="Confluent.Kafka" Version="2.11.1" />
  <PackageReference Include="MassTransit" Version="8.3.6" />
  <PackageReference Include="MassTransit.Kafka" Version="8.3.6" />
  <PackageReference Include="MassTransit.EntityFrameworkCore" Version="8.3.6" />
</ItemGroup>
```

---

## 8. 🚀 Hướng dẫn chạy & Khởi động nhanh

```bash
# 1. Chạy Identity Service (Port 44391 - PostgreSQL)
cd src/quick-bite-identity/QuickBite.Identity/src/QuickBite.Identity.HttpApi.Host
dotnet run

# 2. Chạy Order Service (Port 44386 - MySQL & Kafka)
cd src/quick-bite-order/QuickBite.Order/src/QuickBite.Order.HttpApi.Host
dotnet run
```
