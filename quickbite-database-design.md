# 🗄️ QuickBite — Thiết kế Database (DB-per-Service)

> Dựa trên tài liệu kiến trúc QuickBite: 7 service, mỗi service sở hữu DB riêng, giao tiếp qua Kafka. Tài liệu này thiết kế schema chi tiết cho từng service, kèm các bảng hỗ trợ pattern **Outbox / Inbox / Saga**.

---

## 0. Nguyên tắc thiết kế chung

| Nguyên tắc | Áp dụng |
|---|---|
| **DB-per-service** | Không có foreign key xuyên service. Tham chiếu chéo lưu dưới dạng ID "thô" (`customerId`, `restaurantId`...), không JOIN được — resolve qua event hoặc query API. |
| **Multi-tenant** | Cột `tenant_id` xuất hiện ở hầu hết bảng nghiệp vụ (trừ Notification log thuần). Dùng chiến lược **shared database, discriminator column** (đơn giản, phù hợp giai đoạn đầu). |
| **Outbox/Inbox** | Mỗi service *phát* event cần bảng `OutboxMessage`; mỗi service *tiêu thụ* event cần bảng `InboxMessage`. |
| **Soft delete & audit** | `is_deleted`, `created_at`, `updated_at`, `created_by`, `updated_by` theo chuẩn ABP/DDD. |
| **Optimistic locking** | Cột `version` (rowversion/xmin/@Version) cho các bảng có race condition — đặc biệt Inventory. |
| **Idempotency key** | `event_id` (UUID) unique ở Inbox, dùng để chống xử lý trùng do Kafka "at-least-once". |

---

## 1. Identity Service — SQL Server (ABP Framework)

ABP sinh sẵn phần lớn schema Identity/Tenant/Permission chuẩn; dưới đây là các bảng cốt lõi cần biết/khoanh vùng, giản lược để dễ hình dung.

```sql
-- ========== TENANTS ==========
CREATE TABLE AbpTenants (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name            NVARCHAR(64) NOT NULL UNIQUE,
    IsActive        BIT NOT NULL DEFAULT 1,
    ConcurrencyStamp NVARCHAR(40) NOT NULL,
    CreationTime    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatorId       UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT NOT NULL DEFAULT 0
);

-- ========== USERS ==========
CREATE TABLE AbpUsers (
    Id               UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TenantId         UNIQUEIDENTIFIER NULL REFERENCES AbpTenants(Id),
    UserName         NVARCHAR(256) NOT NULL,
    Email            NVARCHAR(256) NOT NULL,
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
    IsDeleted        BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_User_Tenant_Username UNIQUE (TenantId, UserName)
);
CREATE INDEX IX_Users_Email ON AbpUsers(TenantId, Email);

-- ========== ROLES & CLAIMS (rút gọn) ==========
CREATE TABLE AbpRoles (
    Id       UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TenantId UNIQUEIDENTIFIER NULL,
    Name     NVARCHAR(256) NOT NULL,
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
    TenantId     UNIQUEIDENTIFIER NULL,
    Name         NVARCHAR(256) NOT NULL,       -- e.g. "Order.Create"
    ProviderName NVARCHAR(64) NOT NULL,        -- "R"=Role, "U"=User
    ProviderKey  NVARCHAR(64) NOT NULL         -- RoleId/UserId dạng string
);

-- ========== OPENIDDICT (token) ==========
CREATE TABLE OpenIddictTokens (
    Id             UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SubjectId      UNIQUEIDENTIFIER NOT NULL REFERENCES AbpUsers(Id),
    ApplicationId  UNIQUEIDENTIFIER NULL,
    Type           NVARCHAR(64) NOT NULL,      -- access_token/refresh_token
    Status         NVARCHAR(32) NOT NULL,
    ExpirationDate DATETIME2 NULL,
    Payload        NVARCHAR(MAX) NULL
);

-- ========== OUTBOX (Identity phát user.registered, tenant.created) ==========
CREATE TABLE OutboxMessages (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EventId     UNIQUEIDENTIFIER NOT NULL,
    EventType   NVARCHAR(128) NOT NULL,        -- "user.registered"
    TenantId    UNIQUEIDENTIFIER NULL,
    Payload     NVARCHAR(MAX) NOT NULL,        -- JSON
    Status      NVARCHAR(16) NOT NULL DEFAULT 'Pending', -- Pending/Processed/Failed
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ProcessedAt DATETIME2 NULL,
    RetryCount  INT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Outbox_Status ON OutboxMessages(Status, CreatedAt);
```

**Ghi chú:** Redis dùng để cache token/permission (`permission:{tenantId}:{userId}` → JSON), không cần bảng SQL.

---

## 2. Order Service — PostgreSQL (.NET/ABP + MassTransit Saga)

```sql
-- ========== AGGREGATE: ORDER ==========
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    order_code      VARCHAR(32) NOT NULL,        -- "ORD-1001"
    customer_id     UUID NOT NULL,                -- ref ngoài, không FK
    restaurant_id   UUID NOT NULL,                -- ref ngoài (Catalog)
    status          VARCHAR(24) NOT NULL DEFAULT 'Pending',
                    -- Pending/StockReserved/PaymentAuthorized/Confirmed/Cancelled/Failed
    total_amount    NUMERIC(14,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'VND',
    delivery_address JSONB NOT NULL,              -- Value Object Address
    correlation_id  UUID NOT NULL,
    version         INT NOT NULL DEFAULT 0,        -- optimistic lock
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_orders_tenant_code UNIQUE (tenant_id, order_code)
);
CREATE INDEX ix_orders_customer ON orders(tenant_id, customer_id);
CREATE INDEX ix_orders_status ON orders(status) WHERE is_deleted = false;

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku         VARCHAR(64) NOT NULL,
    item_name   VARCHAR(256) NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    unit_price  NUMERIC(14,2) NOT NULL
);
CREATE INDEX ix_order_items_order ON order_items(order_id);

-- ========== SAGA STATE (MassTransit State Machine) ==========
CREATE TABLE order_saga_states (
    correlation_id   UUID PRIMARY KEY,             -- = orderId (thường dùng chung)
    current_state    VARCHAR(32) NOT NULL,          -- Initial/StockReserving/PaymentAuthorizing/...
    order_id         UUID NOT NULL REFERENCES orders(id),
    stock_reserved   BOOLEAN NOT NULL DEFAULT false,
    payment_authorized BOOLEAN NOT NULL DEFAULT false,
    timeout_at       TIMESTAMPTZ NULL,              -- deadline cho bước hiện tại
    retry_count      INT NOT NULL DEFAULT 0,
    row_version      BYTEA NOT NULL,                -- xmin/rowversion
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== OUTBOX (order.created/confirmed/cancelled) ==========
CREATE TABLE outbox_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL,
    event_type   VARCHAR(128) NOT NULL,
    topic        VARCHAR(64) NOT NULL,             -- "order-events"
    partition_key VARCHAR(64) NOT NULL,             -- orderId
    tenant_id    UUID NOT NULL,
    correlation_id UUID NOT NULL,
    payload      JSONB NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ NULL,
    retry_count  INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_outbox_pending ON outbox_messages(status, created_at) WHERE status = 'Pending';

-- ========== INBOX (tiêu thụ payment.*/stock.*) ==========
CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,                 -- unique = idempotency key
    event_type   VARCHAR(128) NOT NULL,
    consumer     VARCHAR(64) NOT NULL,              -- "OrderSagaConsumer"
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Catalog Service — MongoDB (NestJS/Mongoose)

Schema dạng document, linh hoạt cho topping/biến thể món.

```javascript
// restaurants collection
{
  _id: ObjectId,
  tenantId: UUID,
  ownerId: UUID,                 // ref Identity, không JOIN
  name: String,
  slug: String,                  // unique index
  address: {
    line1: String, ward: String, district: String, city: String,
    geo: { type: "Point", coordinates: [lng, lat] }   // 2dsphere index
  },
  status: String,                // "open" | "closed" | "suspended"
  rating: { avg: Number, count: Number },
  categories: [String],
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { tenantId: 1, slug: 1 } unique, { "address.geo": "2dsphere" }, { status: 1 }

// menus collection
{
  _id: ObjectId,
  tenantId: UUID,
  restaurantId: ObjectId,        // ref restaurants._id
  name: String,                  // "Thực đơn buổi trưa"
  isActive: Boolean,
  categories: [
    {
      categoryId: ObjectId,
      name: String,
      items: [
        {
          itemId: ObjectId,
          sku: String,           // đồng bộ sang order-events / inventory
          name: String,
          description: String,
          price: Number,
          currency: String,
          isAvailable: Boolean,  // đồng bộ qua kafka consumer (availability)
          variants: [ { name: String, priceDelta: Number } ],
          toppings: [ { name: String, price: Number } ]
        }
      ]
    }
  ],
  updatedAt: Date
}
// Indexes: { tenantId: 1, restaurantId: 1 }, { "categories.items.sku": 1 }

// categories collection (danh mục món dùng chung toàn hệ thống, vd "Pizza", "Trà sữa")
{
  _id: ObjectId,
  tenantId: UUID,
  name: String,
  icon: String,
  sortOrder: Number
}
```

> **Không có Outbox/Inbox truyền thống ở Mongo** — nếu cần đảm bảo đồng thời write + publish, dùng **MongoDB Change Streams** thay cho polling Outbox table (đây là điểm nên nêu khi trình bày, vì Mongo không có transaction 2-phase tự nhiên như RDBMS cho outbox pattern kinh điển — cần transaction session nếu ghi đa document).

---

## 4. Payment Service — PostgreSQL (Spring Boot / Hexagonal)

```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    order_id        UUID NOT NULL,                 -- ref ngoài (Order)
    customer_id     UUID NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'VND',
    status          VARCHAR(24) NOT NULL DEFAULT 'Pending',
                    -- Pending/Authorized/Captured/Failed/Voided/Refunded
    gateway         VARCHAR(32) NOT NULL,           -- "VNPay"/"Momo"/"Stripe"
    gateway_ref     VARCHAR(128) NULL,              -- transaction id phía gateway
    failure_reason  VARCHAR(256) NULL,
    version         INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payments_order UNIQUE (order_id)   -- 1 order : 1 payment (đơn giản hoá)
);
CREATE INDEX ix_payments_status ON payments(status);

CREATE TABLE payment_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id   UUID NOT NULL REFERENCES payments(id),
    type         VARCHAR(16) NOT NULL,              -- authorize/capture/void/refund
    amount       NUMERIC(14,2) NOT NULL,
    gateway_response JSONB NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payment_tx_payment ON payment_transactions(payment_id);

-- Outbox (payment.authorized/captured/failed)
CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,             -- orderId
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL
);

-- Inbox (tiêu thụ order.created — idempotency theo eventId)
CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Inventory Service — PostgreSQL (Spring Boot, Optimistic Locking)

```sql
CREATE TABLE stock_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    restaurant_id   UUID NOT NULL,
    sku             VARCHAR(64) NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    version         INT NOT NULL DEFAULT 0,          -- @Version JPA optimistic locking
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_restaurant_sku UNIQUE (restaurant_id, sku)
);
CREATE INDEX ix_stock_tenant ON stock_items(tenant_id);

CREATE TABLE reservations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL,                     -- ref ngoài (Order), idempotency key nghiệp vụ
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    qty          INT NOT NULL CHECK (qty > 0),
    status       VARCHAR(16) NOT NULL DEFAULT 'Reserved', -- Reserved/Released/Committed
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at  TIMESTAMPTZ NULL,
    CONSTRAINT uq_reservation_order_item UNIQUE (order_id, stock_item_id)
);
CREATE INDEX ix_reservations_order ON reservations(order_id);

-- Outbox (stock.reserved/rejected/released)
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

-- Inbox (tiêu thụ order.created/order.cancelled)
CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Vì sao `reservations` tách khỏi `stock_items`:** cho phép release/rollback theo từng order độc lập mà không cần tính lại từ `quantity_reserved` tổng, đồng thời `uq_reservation_order_item` chống double-reserve nếu message bị replay (idempotency ở tầng nghiệp vụ, bổ sung cho Inbox ở tầng kỹ thuật).

---

## 6. Notification Service — PostgreSQL (log-only, không phải nguồn sự thật nghiệp vụ)

Service này chủ yếu là consumer thuần (fan-in tất cả `*-events`), DB chỉ dùng để log gửi & lưu template, không có Outbox (không phát event nghiệp vụ mới).

```sql
CREATE TABLE notification_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    user_id      UUID NOT NULL,
    channel      VARCHAR(16) NOT NULL,              -- email/sms/push/ws
    template     VARCHAR(64) NOT NULL,
    event_type   VARCHAR(128) NOT NULL,              -- event gốc gây ra notification
    status       VARCHAR(16) NOT NULL DEFAULT 'Queued', -- Queued/Sent/Failed
    error        VARCHAR(256) NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at      TIMESTAMPTZ NULL
);
CREATE INDEX ix_notification_user ON notification_logs(tenant_id, user_id, created_at DESC);

CREATE TABLE notification_templates (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code     VARCHAR(64) NOT NULL UNIQUE,            -- "order.confirmed.email"
    channel  VARCHAR(16) NOT NULL,
    subject  VARCHAR(256) NULL,
    body     TEXT NOT NULL                           -- Handlebars template
);

-- Inbox (idempotency khi tiêu thụ nhiều topic cùng lúc)
CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

BullMQ dùng Redis riêng cho retry queue gửi thông báo — không cần bảng SQL cho phần này.

---

## 7. Gateway/BFF — không có DB

Chỉ cache JWKS và rate-limit counter trong Redis (`ratelimit:{ip}:{route}` → counter TTL). Không có persistent store.

---

## 8. Bản đồ tham chiếu ID xuyên service (logical, không FK)

| Từ service | Field | Trỏ tới service | Ghi chú |
|---|---|---|---|
| Order.customer_id | UUID | Identity.Users | Resolve qua JWT claims, không query trực tiếp |
| Order.restaurant_id | UUID | Catalog.restaurants | |
| Payment.order_id | UUID | Order.orders | unique — 1:1 |
| Reservation.order_id | UUID | Order.orders | unique theo (order_id, stock_item_id) |
| StockItem.restaurant_id | UUID | Catalog.restaurants | |
| NotificationLog.user_id | UUID | Identity.Users | |

---

## 9. Điểm nhấn khi trình bày/phỏng vấn

- **Outbox table schema giống nhau về hình dạng ở 4 service** (Identity, Order, Payment, Inventory) nhưng **khác engine polling**: ABP BackgroundWorker (.NET) vs Spring `@Scheduled` — nên nói rõ đây là *pattern dùng chung, triển khai khác nhau theo stack*.
- **Inbox chỉ cần 1 cột PK là `event_id`** — đơn giản nhưng đủ để chống xử lý trùng do Kafka at-least-once.
- **Catalog dùng MongoDB nên không áp Outbox cổ điển được** — đây là câu hỏi hay bị hỏi xoáy: giải pháp thực tế là Change Streams hoặc chấp nhận eventual publish qua application-level retry.
- **`version`/`row_version`/`@Version`** xuất hiện ở Order (saga state), Inventory (stock_items) — nơi có race condition thật sự (nhiều order tranh giành cùng 1 SKU).
