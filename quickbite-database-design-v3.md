# 🗄️ QuickBite — Thiết kế Database v3 (DB-per-Service, single-tenant)

> Bản sửa theo review lần 2: thống nhất UUID toàn hệ thống (kể cả MongoDB), bỏ `Menu` (không cần thiết ở scope hiện tại), thêm `reason` vào lịch sử trạng thái, tách `payment_method` khỏi `gateway`, mở rộng `channel` notification, và — quan trọng nhất — thêm cơ chế **timeout + compensation khi Restaurant không xác nhận đơn**.

---

## 0. Tổng kết thay đổi so với v2

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | `order_status_history` thêm cột `reason` | Thống kê lý do huỷ/hoàn tiền cho dashboard |
| 2 | Toàn hệ thống dùng **UUID** kể cả MongoDB `_id` (`restaurants.id`, `categories.id`, `food_items.id`) | Trước đó Catalog dùng `ObjectId` trong khi Order/Inventory dùng `UUID` → lệch kiểu dữ liệu khi tham chiếu chéo |
| 3 | Bỏ collection `menus` | Không có nhu cầu "Breakfast/Lunch/Night menu" ở scope hiện tại; `Restaurant → Category → FoodItem` là đủ. Ghi chú cách thêm lại nếu cần |
| 4 | Giữ nguyên `quantity_reserved` song song `reservations` | Xác nhận đây là trade-off có chủ đích: đọc nhanh (`on_hand - reserved`) đổi lấy 1 chỗ phải đồng bộ (transaction) — không phải lỗi thiết kế |
| 5 | Payment: tách `payment_method` (COD/VNPay/MoMo/QR Banking...) khỏi `gateway` (đơn vị xử lý kỹ thuật, có thể NULL với COD) | `gateway` không phản ánh đúng nghiệp vụ cho phương thức không qua cổng thanh toán |
| 6 | Notification: mở rộng `channel` thêm `IN_APP` | Chuẩn bị cho "chuông thông báo" kiểu Shopee |
| 7 | Catalog `ownerId`: giữ nguyên, **chưa** tách bảng `Merchant`/`Staff` | Đúng như review — cần thiết khi có phân quyền Manager/Cashier, nhưng ngoài scope đồ án hiện tại. Ghi chú hướng mở rộng |
| 8 | **Order Saga mở rộng thêm bước `AwaitingRestaurantAcceptance` có timeout + compensation** | Vấn đề lớn nhất được chỉ ra: nếu nhà hàng không xác nhận, hệ thống phải tự động huỷ, nhả kho, hoàn tiền |
| 9 | `order_code` đổi format sang `QB-YYYYMMDD-XXXXX` (random suffix) | Tránh lộ thông tin số lượng đơn qua ID tuần tự |

---

## 1. Identity Service — SQL Server (không đổi so với v2)


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

> **Hướng mở rộng (chưa triển khai):** khi cần phân quyền Manager/Cashier/Staff trong 1 nhà hàng, thêm bảng `RestaurantStaff (id, restaurant_id UUID, user_id UUID, role VARCHAR)` — lúc đó `Restaurant.ownerId` vẫn giữ nguyên vai trò "chủ sở hữu", còn quyền vận hành chi tiết do bảng staff quyết định.

---

## 2. Order Service — PostgreSQL

```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code      VARCHAR(24) NOT NULL UNIQUE,     -- "QB-20260722-8G72A"
    customer_id     UUID NOT NULL,
    restaurant_id   UUID NOT NULL,                    -- UUID thống nhất với Catalog/Inventory
    status          VARCHAR(28) NOT NULL DEFAULT 'Pending',
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

-- order_code sinh ở application layer, ví dụ:
-- `QB-${format(now,'yyyyMMdd')}-${nanoid(5).toUpperCase()}`, retry nếu đụng unique constraint (xác suất cực thấp).

CREATE TABLE order_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(28) NULL,
    to_status   VARCHAR(28) NOT NULL,
    reason      VARCHAR(255) NULL,        -- "Payment failed" / "Restaurant rejected" /
                                            -- "Out of stock" / "Customer cancelled" /
                                            -- "Food damaged" / "Wrong item" / "Restaurant accept timeout"
    changed_by  VARCHAR(32) NOT NULL,      -- "system"/"restaurant"/"driver"/"customer"
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_order_status_history_order ON order_status_history(order_id, changed_at);
CREATE INDEX ix_order_status_history_reason ON order_status_history(reason);  -- phục vụ dashboard thống kê lý do huỷ

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku         VARCHAR(64) NOT NULL,
    item_name   VARCHAR(256) NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    unit_price  NUMERIC(14,2) NOT NULL
);
CREATE INDEX ix_order_items_order ON order_items(order_id);

-- Bảng nội bộ được đồng bộ từ Catalog sang để tối ưu hiệu năng khi hiển thị thông tin món ăn trong Order
CREATE TABLE food_items (
    id          UUID PRIMARY KEY,             -- Đồng bộ từ Catalog.food_items.id
    restaurant_id UUID NOT NULL,              -- Đồng bộ từ Catalog.restaurants.id
    sku         VARCHAR(64) NOT NULL,
    name        VARCHAR(256) NOT NULL,
    price       NUMERIC(14,2) NOT NULL,
    currency    VARCHAR(8) NOT NULL DEFAULT 'VND',
    image_url   VARCHAR(1024) NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_food_items_restaurant ON food_items(restaurant_id);
CREATE INDEX ix_food_items_sku ON food_items(sku);
```

### 2.1. Saga state — mở rộng với bước `AwaitingRestaurantAcceptance`

Đây là điểm sửa quan trọng nhất: **Saga không dừng lại ở `Confirmed`**. Sau khi thanh toán được authorize, đơn chuyển sang chờ nhà hàng xác nhận, có deadline riêng và compensation đầy đủ nếu timeout.

```sql
CREATE TABLE order_saga_states (
    correlation_id          UUID PRIMARY KEY,
    current_state            VARCHAR(32) NOT NULL,
                              -- Initial → ReservingStock → AuthorizingPayment → Confirmed
                              -- → AwaitingRestaurantAcceptance → Completed_Saga
                              -- (compensation) → Compensating → Cancelled
    order_id                 UUID NOT NULL REFERENCES orders(id),
    stock_reserved            BOOLEAN NOT NULL DEFAULT false,
    payment_authorized         BOOLEAN NOT NULL DEFAULT false,
    restaurant_accepted        BOOLEAN NOT NULL DEFAULT false,
    step_timeout_at            TIMESTAMPTZ NULL,     -- deadline của BƯỚC HIỆN TẠI (dùng chung cho mọi bước)
    restaurant_accept_deadline TIMESTAMPTZ NULL,     -- deadline riêng: 15 phút kể từ khi Confirmed
    retry_count               INT NOT NULL DEFAULT 0,
    row_version                BYTEA NOT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_saga_restaurant_deadline ON order_saga_states(restaurant_accept_deadline)
    WHERE current_state = 'AwaitingRestaurantAcceptance';
```

**Luồng đầy đủ (happy path + timeout compensation):**
```
OrderCreated
   │
   ├─1─► Reserve Stock (Inventory) ──► stock.reserved ✅ / stock.rejected ❌
   │
   ├─2─► Authorize Payment (Payment) ─► payment.authorized ✅ / payment.failed ❌
   │
   ├─3─► Confirmed ──► order.confirmed (Notification báo khách + báo nhà hàng)
   │
   ├─4─► AwaitingRestaurantAcceptance  [deadline = confirmed_at + 15 phút]
   │        │
   │        ├─ Restaurant.accept trong 15 phút ──► RestaurantAccepted → Preparing → ...
   │        │
   │        └─ QUÁ 15 PHÚT (MassTransit Schedule/Timeout message) ──► COMPENSATION:
   │              1) Payment: Void/Refund   (payment.refund command → payment.refunded event)
   │              2) Inventory: Release stock (inventory.release command → stock.released event)
   │              3) Order: status = Cancelled, reason = "Restaurant accept timeout"
   │
❌ Nếu bước 1 hoặc 2 FAIL → Compensation ngược: Void Payment → Release Stock → Cancel Order
```

- Triển khai timeout bằng **MassTransit `Schedule`/`ReceiveEndpoint` với message delay** (không cần cron job riêng) — khi vào state `AwaitingRestaurantAcceptance`, saga tự lên lịch 1 message `RestaurantAcceptTimeoutExpired` sau 15 phút; nếu `RestaurantAccepted` event đến trước thì huỷ lịch (MassTransit hỗ trợ sẵn `_scheduleId`).
- Đây chính là phần "ghi điểm khi bảo vệ đồ án" — thể hiện compensation không chỉ ở tầng kỹ thuật (Saga step fail) mà cả ở tầng nghiệp vụ (đối tác con người không phản hồi).

```sql
CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,   -- + "order.restaurant_accept_timeout" mới
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
    event_type   VARCHAR(128) NOT NULL,   -- + "restaurant.accepted" mới (consume từ Catalog/Restaurant module)
    consumer     VARCHAR(64) NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Catalog Service — MongoDB (UUID thống nhất, bỏ `menus`)

```javascript
// ===== restaurants =====
{
  id: UUID,                    // KHÔNG dùng ObjectId — dùng UUID string, đồng bộ Order/Inventory
  ownerId: UUID,                // ref Identity.AbpUsers, role "Merchant"
  name: String,
  slug: String,                 // unique index
  address: {
    line1: String, ward: String, district: String, city: String,
    geo: { type: "Point", coordinates: [lng, lat] }
  },
  status: String,                // "open" | "closed" | "suspended"
  rating: { avg: Number, count: Number },
  createdAt: Date,
  updatedAt: Date
}
// _id Mongo vẫn tồn tại nội bộ (ObjectId) nhưng KHÔNG dùng để tham chiếu liên service —
// field nghiệp vụ "id" (UUID, unique index) mới là khoá dùng xuyên hệ thống.
// Index: { id: 1 } unique, { slug: 1 } unique, { ownerId: 1 }, { "address.geo": "2dsphere" }, { status: 1 }

// ===== categories ===== (bỏ tầng "menus" — Restaurant → Category → FoodItem là đủ)
{
  id: UUID,
  restaurantId: UUID,           // ref restaurants.id — thẳng, không qua menu nữa
  name: String,                 // "Pizza", "Trà sữa"
  sortOrder: Number
}
// Index: { id: 1 } unique, { restaurantId: 1, sortOrder: 1 }

// ===== food_items =====
{
  id: UUID,
  categoryId: UUID,             // ref categories.id
  restaurantId: UUID,           // denormalize để query nhanh
  sku: String,                  // unique — "PIZZA-L", "MILKTEA-L-70"
  name: String,
  description: String,
  price: Number,
  currency: String,
  images: [String],
  isAvailable: Boolean,
  preparationTime: Number,
  tags: [String],
  totalSold: Number,
  variants: [ { name: String, priceDelta: Number } ],
  toppings: [ { name: String, price: Number } ]
}
// Index: { id: 1 } unique, { sku: 1 } unique, { categoryId: 1 }, { restaurantId: 1, isAvailable: 1 }
```

> **Nếu sau này cần "Breakfast/Lunch/Weekend Menu":** thêm lại collection `menus { id UUID, restaurantId UUID, name, isActive, activeHours }` và cho `categories.menuId` optional (nullable = áp dụng mọi menu). Không cần thiết kế lại từ đầu, chỉ thêm 1 collection + 1 field optional.

```javascript
// ===== catalog_outbox ===== (không đổi so với v2)
{
  id: UUID,
  eventId: UUID,
  eventType: String,
  topic: String,
  partitionKey: String,
  payload: Object,
  status: String,
  createdAt: Date,
  processedAt: Date
}
```

---

## 4. Payment Service — PostgreSQL (tách `payment_method` khỏi `gateway`)

```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL,
    customer_id     UUID NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'VND',
    status          VARCHAR(24) NOT NULL DEFAULT 'Pending',
                    -- Pending/Authorized/Captured/Failed/Voided/Refunded/PartiallyRefunded
    attempt_type    VARCHAR(16) NOT NULL DEFAULT 'Payment',   -- "Payment" | "Refund"
    payment_method  VARCHAR(24) NOT NULL,               -- "COD" | "VNPay" | "MoMo" | "QRBanking" | "Stripe" | "PayPal"
    gateway         VARCHAR(32) NULL,                   -- NULL nếu payment_method = "COD"; có giá trị nếu qua cổng thanh toán
    gateway_ref     VARCHAR(128) NULL,
    failure_reason  VARCHAR(256) NULL,
    version         INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payments_order ON payments(order_id, created_at DESC);
CREATE INDEX ix_payments_status ON payments(status);
CREATE INDEX ix_payments_method ON payments(payment_method);

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
    event_type    VARCHAR(128) NOT NULL,   -- + "payment.refunded" dùng cho compensation timeout
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL
);

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,   -- + "order.restaurant_accept_timeout" (trigger Void/Refund)
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Với COD:** `status` bỏ qua bước `Authorized/Captured` (không có tiền thật giữ trước), có thể đi thẳng `Pending → Captured` khi giao hàng thành công (`type='capture'` trong `payment_transactions` ghi nhận thời điểm tài xế thu tiền) — vẫn nằm gọn trong schema hiện tại nhờ `payment_method` tách riêng khỏi `gateway`.

---

## 5. Inventory Service — PostgreSQL (không đổi cấu trúc, chỉ chuẩn hoá UUID)

```sql
CREATE TABLE stock_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id    UUID NOT NULL,          -- UUID — khớp Catalog.restaurants.id
    sku              VARCHAR(64) NOT NULL,   -- khớp Catalog.food_items.sku
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    version          INT NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_restaurant_sku UNIQUE (restaurant_id, sku)
);

CREATE TABLE reservations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    qty           INT NOT NULL CHECK (qty > 0),
    status        VARCHAR(16) NOT NULL DEFAULT 'Reserved',   -- Reserved/Released/Committed
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at   TIMESTAMPTZ NULL,
    CONSTRAINT uq_reservation_order_item UNIQUE (order_id, stock_item_id)
);
CREATE INDEX ix_reservations_order ON reservations(order_id);

CREATE TABLE outbox_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    event_type    VARCHAR(128) NOT NULL,   -- + "stock.released" (trigger từ compensation timeout)
    topic         VARCHAR(64) NOT NULL,
    partition_key VARCHAR(64) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ NULL
);

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,   -- + "order.restaurant_accept_timeout"
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Xác nhận trade-off `quantity_reserved` vs `reservations`:** giữ nguyên như v2 — `quantity_reserved` là giá trị denormalize có chủ đích để câu lệnh kiểm tra tồn kho khả dụng (`quantity_on_hand - quantity_reserved >= requestedQty`) chạy trong 1 lần đọc, không cần `SUM()` trên bảng `reservations` mỗi lần đặt món (bảng này có thể lớn dần theo thời gian). Đổi lại, mọi thao tác tạo/release `reservations` **bắt buộc** update `quantity_reserved` trong cùng 1 transaction + `@Version` optimistic lock để tránh lệch số liệu.

---

## 6. Notification Service — PostgreSQL (mở rộng channel)

```sql
CREATE TABLE notification_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    channel       VARCHAR(16) NOT NULL,     -- "EMAIL" | "SMS" | "PUSH" | "WEBSOCKET" | "IN_APP"
    template_code VARCHAR(64) NOT NULL,
    event_type    VARCHAR(128) NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'Queued',
    error         VARCHAR(256) NULL,
    is_read       BOOLEAN NOT NULL DEFAULT false,   -- dùng cho IN_APP (chuông thông báo kiểu Shopee)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at       TIMESTAMPTZ NULL
);
CREATE INDEX ix_notification_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX ix_notification_unread ON notification_logs(user_id, is_read) WHERE channel = 'IN_APP';

CREATE TABLE inbox_messages (
    event_id     UUID PRIMARY KEY,
    event_type   VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Template vẫn nằm trong `src/templates/*.hbs` (không đổi so với v2).

---

## 7. Gateway/BFF — không đổi

Chỉ cache JWKS và rate-limit counter trong Redis (`ratelimit:{ip}:{route}` → counter TTL). Không có persistent store.

---

## 8. Bản đồ tham chiếu ID xuyên service (UUID thống nhất)

| Từ service | Field | Kiểu | Trỏ tới service |
|---|---|---|---|
| Order.customer_id | UUID | UUID | Identity.AbpUsers |
| Order.restaurant_id | UUID | UUID | Catalog.restaurants.id |
| Payment.order_id | UUID | UUID | Order.orders — 1:N |
| Reservation.order_id | UUID | UUID | Order.orders |
| StockItem.restaurant_id + sku | UUID + string | UUID + VARCHAR | Catalog.restaurants.id + food_items.sku |
| Catalog.restaurants.ownerId | UUID | UUID | Identity.AbpUsers (role Merchant) |
| NotificationLog.user_id | UUID | UUID | Identity.AbpUsers |

Tất cả đều là **UUID** — không còn ObjectId lẫn lộn ở Catalog như bản v2.

---

## 9. Điểm nhấn khi bảo vệ đồ án (cập nhật)

- **Compensation 2 tầng:** tầng kỹ thuật (Saga step fail → void/release/cancel ngay) và tầng nghiệp vụ (đối tác con người timeout → cùng cơ chế compensation nhưng trigger bởi thời gian, không phải lỗi kỹ thuật). Đây là điểm khác biệt so với đa số đồ án chỉ dừng ở "Saga xử lý lỗi kỹ thuật".
- **UUID thống nhất** giúp trả lời gọn câu hỏi "tại sao Mongo lại dùng UUID thay vì ObjectId" — vì ObjectId chỉ có ý nghĩa nội bộ Mongo, còn hệ thống cần 1 kiểu khoá duy nhất để Order/Inventory/Payment tham chiếu mà không phải convert qua lại.
- **`quantity_reserved` song song `reservations`** là ví dụ tốt để nói về **trade-off denormalization có chủ đích**, không phải sơ suất — kèm giải thích transaction + optimistic lock đảm bảo tính nhất quán.
