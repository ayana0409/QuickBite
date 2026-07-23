# 🗄️ QuickBite — Thiết kế Database v2 (DB-per-Service, không Multi-tenant)

> Bản sửa theo review: bỏ toàn bộ `tenant_id`/`AbpTenants`, mở rộng luồng trạng thái Order, chuẩn hoá Catalog thành collection riêng, Payment cho phép 1:N với Order, Notification bỏ bảng template, Catalog dùng Mongo transaction + outbox collection thay vì Change Streams, và bổ sung `owner_id` cho Catalog để chuẩn bị phân quyền merchant.

---

## 0. Thay đổi nguyên tắc chung

| Trước | Sau |
|---|---|
| `tenant_id` ở mọi bảng | **Bỏ hoàn toàn** — hệ thống single-tenant |
| `AbpTenants`, `AbpMultiTenancyOptions.IsEnabled = true` | Bỏ bảng, tắt multi-tenancy trong ABP (`IsEnabled = false`) |
| Unique theo `(tenant_id, x)` | Unique thẳng theo `x` |
| Catalog: menu lồng category lồng item (embedded) | Tách 4 collection riêng: `restaurants` → `menus` → `categories` → `food_items` |
| Payment: `UNIQUE(order_id)` (1:1) | Bỏ unique, cho phép **1 order : N payment attempts** (retry, split, refund từng phần) |
| Notification: có bảng `notification_templates` | Bỏ — template lưu file Handlebars trong source code |
| Catalog Outbox: Mongo Change Streams | Đổi sang **Mongo transaction + collection `catalog_outbox`** (polling), đồng nhất cách làm với các service khác |

---

## 1. Identity Service — SQL Server (ABP, single-tenant)

```sql
-- Tắt multi-tenancy trong code:
-- Configure<AbpMultiTenancyOptions>(o => o.IsEnabled = false);
-- => Không cần bảng AbpTenants.

CREATE TABLE AbpUsers (
    Id               UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserName         NVARCHAR(256) NOT NULL UNIQUE,
    Email            NVARCHAR(256) NOT NULL UNIQUE,
    EmailConfirmed   BIT NOT NULL DEFAULT 0,
    PasswordHash     NVARCHAR(MAX) NULL,
    PhoneNumber      NVARCHAR(32) NULL,
    PhoneNumberConfirmed BIT NOT NULL DEFAULT 0,
    IsActive         BIT NOT NULL DEFAULT 1,
    LockoutEnabled   BIT NOT NULL DEFAULT 1,
    LockoutEnd       DATETIME2 NULL,
    AccessFailedCount INT NOT NULL DEFAULT 0,
    ConcurrencyStamp NVARCHAR(40) NOT NULL,
    CreationTime     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted        BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Users_Email ON AbpUsers(Email);

CREATE TABLE AbpRoles (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name      NVARCHAR(256) NOT NULL UNIQUE,     -- "Customer", "Merchant", "Admin"
    IsDefault BIT NOT NULL DEFAULT 0,
    IsStatic  BIT NOT NULL DEFAULT 0
);

CREATE TABLE AbpUserRoles (
    UserId UNIQUEIDENTIFIER NOT NULL REFERENCES AbpUsers(Id),
    RoleId UNIQUEIDENTIFIER NOT NULL REFERENCES AbpRoles(Id),
    PRIMARY KEY (UserId, RoleId)
);

CREATE TABLE AbpPermissionGrants (
    Id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name         NVARCHAR(256) NOT NULL,         -- "Order.Create", "Catalog.ManageOwnRestaurant"
    ProviderName NVARCHAR(64) NOT NULL,          -- "R"=Role, "U"=User
    ProviderKey  NVARCHAR(64) NOT NULL
);

CREATE TABLE OpenIddictTokens (
    Id             UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SubjectId      UNIQUEIDENTIFIER NOT NULL REFERENCES AbpUsers(Id),
    ApplicationId  UNIQUEIDENTIFIER NULL,
    Type           NVARCHAR(64) NOT NULL,
    Status         NVARCHAR(32) NOT NULL,
    ExpirationDate DATETIME2 NULL,
    Payload        NVARCHAR(MAX) NULL
);

-- Outbox (user.registered, merchant.approved...)
CREATE TABLE OutboxMessages (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EventId     UNIQUEIDENTIFIER NOT NULL,
    EventType   NVARCHAR(128) NOT NULL,
    Payload     NVARCHAR(MAX) NOT NULL,
    Status      NVARCHAR(16) NOT NULL DEFAULT 'Pending',
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ProcessedAt DATETIME2 NULL,
    RetryCount  INT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Outbox_Status ON OutboxMessages(Status, CreatedAt);
```

> **Chuẩn bị cho Merchant:** thêm role `"Merchant"` trong `AbpRoles` — quyền `Catalog.ManageOwnRestaurant`, `Inventory.ManageOwnStock` được cấp qua `AbpPermissionGrants`. `AbpUsers.Id` chính là `owner_id` mà Catalog Service sẽ tham chiếu (logic reference, không FK).

---

## 2. Order Service — PostgreSQL (mở rộng luồng trạng thái)

```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code      VARCHAR(32) NOT NULL UNIQUE,
    customer_id     UUID NOT NULL,
    restaurant_id   UUID NOT NULL,
    status          VARCHAR(24) NOT NULL DEFAULT 'Pending',
                    -- Pending → AwaitingInventory → AwaitingPayment → Confirmed
                    -- → RestaurantAccepted → Preparing → Delivering → Completed
                    -- (nhánh lỗi) → Cancelled / Refunded / Failed
    total_amount    NUMERIC(14,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'VND',
    delivery_address JSONB NOT NULL,
    correlation_id  UUID NOT NULL,
    version         INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX ix_orders_customer ON orders(customer_id);
CREATE INDEX ix_orders_restaurant ON orders(restaurant_id);
CREATE INDEX ix_orders_status ON orders(status) WHERE is_deleted = false;

-- Lịch sử chuyển trạng thái — hữu ích khi thêm tracking cho tài xế/khách hàng sau này
CREATE TABLE order_status_history (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(24) NULL,
    to_status   VARCHAR(24) NOT NULL,
    changed_by  VARCHAR(32) NOT NULL,   -- "system"/"restaurant"/"driver"/"customer"
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_order_status_history_order ON order_status_history(order_id, changed_at);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku         VARCHAR(64) NOT NULL,      -- vd "PIZZA-L", "MILKTEA-L-70"
    item_name   VARCHAR(256) NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    unit_price  NUMERIC(14,2) NOT NULL
);
CREATE INDEX ix_order_items_order ON order_items(order_id);

-- Saga state (chỉ orchestrate tới bước Confirmed; các bước sau do Restaurant/Delivery tự cập nhật status)
CREATE TABLE order_saga_states (
    correlation_id     UUID PRIMARY KEY,
    current_state       VARCHAR(32) NOT NULL,
    order_id            UUID NOT NULL REFERENCES orders(id),
    stock_reserved       BOOLEAN NOT NULL DEFAULT false,
    payment_authorized    BOOLEAN NOT NULL DEFAULT false,
    timeout_at           TIMESTAMPTZ NULL,
    retry_count          INT NOT NULL DEFAULT 0,
    row_version          BYTEA NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,
    correlation_id UUID NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL,
    retry_count   INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_outbox_pending ON outbox_messages(status, created_at) WHERE status = 'Pending';

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    consumer     VARCHAR(64) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Luồng trạng thái đầy đủ:**
```
Pending → AwaitingInventory → AwaitingPayment → Confirmed
        → RestaurantAccepted → Preparing → Delivering → Completed

  (bất kỳ bước nào fail) → Cancelled / Failed
  (sau khi Completed, có yêu cầu hoàn tiền) → Refunded
```
Saga (MassTransit) chỉ chịu trách nhiệm tới `Confirmed`; các bước `RestaurantAccepted → Delivering → Completed` do Restaurant/Delivery service cập nhật qua API riêng, ghi vào `order_status_history` để có audit trail — nền tảng tốt khi bổ sung tính năng theo dõi tài xế sau này.

---

## 3. Catalog Service — MongoDB (chuẩn hoá 4 collection)

```javascript
// ===== restaurants =====
{
  _id: ObjectId,
  ownerId: UUID,              // ref Identity.AbpUsers, role "Merchant"
  name: String,
  slug: String,                // unique index
  address: {
    line1: String, ward: String, district: String, city: String,
    geo: { type: "Point", coordinates: [lng, lat] }
  },
  status: String,               // "open" | "closed" | "suspended"
  rating: { avg: Number, count: Number },
  createdAt: Date,
  updatedAt: Date
}
// Index: { slug: 1 } unique, { ownerId: 1 }, { "address.geo": "2dsphere" }, { status: 1 }

// ===== menus =====
{
  _id: ObjectId,
  restaurantId: ObjectId,       // ref restaurants._id
  name: String,                 // "Thực đơn buổi trưa"
  isActive: Boolean,
  updatedAt: Date
}
// Index: { restaurantId: 1 }

// ===== categories =====
{
  _id: ObjectId,
  menuId: ObjectId,             // ref menus._id
  name: String,                 // "Pizza", "Trà sữa"
  sortOrder: Number
}
// Index: { menuId: 1, sortOrder: 1 }

// ===== food_items =====
{
  _id: ObjectId,
  categoryId: ObjectId,         // ref categories._id
  restaurantId: ObjectId,       // denormalize để query nhanh không cần join ngược
  sku: String,                  // unique — đồng bộ sang Order/Inventory, vd "PIZZA-L", "MILKTEA-L-70"
  name: String,
  description: String,
  price: Number,
  currency: String,
  isAvailable: Boolean,
  variants: [ { name: String, priceDelta: Number } ],   // size M/L
  toppings: [ { name: String, price: Number } ]
}
// Index: { sku: 1 } unique, { categoryId: 1 }, { restaurantId: 1, isAvailable: 1 }
```

**Vì sao tách 4 collection thay vì embed:** quán 1000 món → document `menus` embed sẽ phình rất lớn, khó phân trang/cache/update từng món riêng lẻ. Tách theo tầng `Restaurant → Menu → Category → FoodItem` giúp:
- Update giá 1 món = update 1 document nhỏ, không lock cả menu.
- Pagination theo category dễ dàng (`find({categoryId}).skip().limit()`).
- Cache theo `food_items` từng SKU riêng ở Redis.

```javascript
// ===== catalog_outbox (đồng nhất pattern Outbox với các service khác) =====
{
  _id: ObjectId,
  eventId: UUID,
  eventType: String,            // "menu.updated" | "restaurant.status.changed"
  topic: String,
  partitionKey: String,
  payload: Object,
  status: String,                // "Pending" | "Processed" | "Failed"
  createdAt: Date,
  processedAt: Date
}
// Index: { status: 1, createdAt: 1 }
```

**Cách dùng:** ghi document nghiệp vụ (vd `food_items`) + document vào `catalog_outbox` trong **cùng một MongoDB transaction session** (`session.withTransaction()`), sau đó một worker (NestJS cron/interval) poll `catalog_outbox` theo `status: "Pending"`, publish Kafka, rồi đánh dấu `Processed` — giống hệt cơ chế Outbox của Order/Payment/Inventory, chỉ khác nơi lưu trữ (collection thay vì table). Bỏ hẳn Change Streams để đồng nhất cách vận hành và dễ debug/local dev hơn.

---

## 4. Payment Service — PostgreSQL (1 Order : N Payment attempts)

```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL,                  -- KHÔNG unique — cho phép nhiều attempt/refund
    customer_id     UUID NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'VND',
    status          VARCHAR(24) NOT NULL DEFAULT 'Pending',
                    -- Pending/Authorized/Captured/Failed/Voided/Refunded/PartiallyRefunded
    attempt_type    VARCHAR(16) NOT NULL DEFAULT 'Payment',  -- "Payment" | "Refund"
    gateway         VARCHAR(32) NOT NULL,
    gateway_ref     VARCHAR(128) NULL,
    failure_reason  VARCHAR(256) NULL,
    version         INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payments_order ON payments(order_id, created_at DESC);
CREATE INDEX ix_payments_status ON payments(status);

-- View tiện dụng: payment "chốt" hiện tại của 1 order (attempt mới nhất Captured/Authorized)
-- (tạo ở tầng application hoặc materialized view tuỳ nhu cầu truy vấn)

CREATE TABLE payment_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id   UUID NOT NULL REFERENCES payments(id),
    type         VARCHAR(16) NOT NULL,               -- authorize/capture/void/refund
    amount       NUMERIC(14,2) NOT NULL,
    gateway_response JSONB NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payment_tx_payment ON payment_transactions(payment_id);

CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL
);

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Lợi ích bỏ `UNIQUE(order_id)`:** đơn thanh toán fail → khách đổi phương thức → tạo `payments` row mới cùng `order_id`; refund một phần tạo thêm row `attempt_type='Refund'`; muốn split payment (vd ví + thẻ) cũng tạo nhiều row cùng lúc. Idempotency lúc consume `order.created` vẫn đảm bảo qua `inbox_messages.event_id`, không phụ thuộc vào unique `order_id` nữa.

---

## 5. Inventory Service — PostgreSQL (giữ nguyên phần lõi, chuẩn hoá SKU)

```sql
CREATE TABLE stock_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id    UUID NOT NULL,
    sku              VARCHAR(64) NOT NULL,           -- PHẢI khớp sku bên Catalog.food_items
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    version          INT NOT NULL DEFAULT 0,          -- @Version JPA optimistic locking
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_restaurant_sku UNIQUE (restaurant_id, sku)
);

CREATE TABLE reservations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    qty           INT NOT NULL CHECK (qty > 0),
    status        VARCHAR(16) NOT NULL DEFAULT 'Reserved',  -- Reserved/Released/Committed
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at   TIMESTAMPTZ NULL,
    CONSTRAINT uq_reservation_order_item UNIQUE (order_id, stock_item_id)
);
CREATE INDEX ix_reservations_order ON reservations(order_id);

CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL
);

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Quy ước SKU (quyết định từ Catalog, Inventory/Order chỉ dùng lại):** biến thể (size, topping/% đường) phải được encode phẳng thành SKU riêng ngay từ khi tạo món ở Catalog — vd `PIZZA-M`, `PIZZA-L`, `MILKTEA-L-50`, `MILKTEA-L-70`. Inventory không "hiểu" biến thể, chỉ quản lý tồn kho theo SKU phẳng.

---

## 6. Notification Service — PostgreSQL (bỏ bảng template)

```sql
CREATE TABLE notification_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    channel      VARCHAR(16) NOT NULL,               -- email/sms/push/ws
    template_code VARCHAR(64) NOT NULL,               -- khớp tên file template trong source code
    event_type   VARCHAR(128) NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'Queued',
    error        VARCHAR(256) NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at      TIMESTAMPTZ NULL
);
CREATE INDEX ix_notification_user ON notification_logs(user_id, created_at DESC);

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Template Handlebars nằm trong `src/templates/*.hbs` của repo (`order.confirmed.email.hbs`, ...), không cần DB — deploy cùng code, version control tự nhiên qua Git thay vì thêm bảng quản lý.

---

## 7. Gateway/BFF — vẫn không có DB

Không đổi — chỉ Redis cho JWKS cache và rate-limit counter.

---

## 8. Bản đồ tham chiếu ID xuyên service (đã cập nhật)

| Từ service | Field | Trỏ tới service | Ghi chú |
|---|---|---|---|
| Order.customer_id | UUID | Identity.AbpUsers | |
| Order.restaurant_id | UUID | Catalog.restaurants | |
| Payment.order_id | UUID | Order.orders | **không unique** — 1:N |
| Reservation.order_id | UUID | Order.orders | unique theo (order_id, stock_item_id) |
| StockItem.restaurant_id + sku | UUID + string | Catalog.restaurants + food_items.sku | SKU là "hợp đồng" chung giữa Catalog/Order/Inventory |
| Restaurant.ownerId | UUID | Identity.AbpUsers (role Merchant) | mới bổ sung — nền tảng cho phân quyền merchant |
| NotificationLog.user_id | UUID | Identity.AbpUsers | |

---

## 9. Tổng kết thay đổi so với v1

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | Bỏ `tenant_id` toàn hệ thống + bỏ `AbpTenants` | Không làm multi-tenant → giảm phức tạp không cần thiết |
| 2 | Order: thêm trạng thái `AwaitingInventory/AwaitingPayment/RestaurantAccepted/Preparing/Delivering/Completed/Refunded` + bảng `order_status_history` | Phù hợp thực tế giao đồ ăn, sẵn sàng cho tính năng tài xế |
| 3 | Catalog: tách `restaurants/menus/categories/food_items` thay vì embed | Tránh document khổng lồ, dễ pagination/cache/update từng món |
| 4 | Catalog: dùng `catalog_outbox` collection + Mongo transaction thay vì Change Streams | Đồng nhất pattern Outbox toàn hệ thống, dễ debug/local dev |
| 5 | Catalog: thêm `restaurants.ownerId` | Chuẩn bị phân quyền Merchant (CRUD menu/stock của chính mình) |
| 6 | Payment: bỏ `UNIQUE(order_id)`, thêm `attempt_type` | Hỗ trợ retry thanh toán, refund một phần, split payment |
| 7 | Inventory: chuẩn hoá quy ước SKU phẳng cho biến thể | Đồng bộ SKU giữa Catalog ↔ Order ↔ Inventory không nhập nhằng |
| 8 | Notification: bỏ `notification_templates` | Template quản lý bằng file + Git, không cần DB |
