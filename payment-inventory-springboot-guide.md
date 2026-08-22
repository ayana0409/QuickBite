# 📘 Hướng dẫn Triển khai Payment Service & Inventory Service (Java 21 / Spring Boot 3.3)

> Tài liệu kỹ thuật chuẩn xác **100% theo mã nguồn thực tế** của hai service thanh toán và tồn kho trong hệ thống QuickBite:
> - **Payment Service:** `Java 21`, `Spring Boot 3.3.2`, `Hexagonal Architecture`, `PostgreSQL`, `Spring Kafka` (Port 8084)
> - **Inventory Service:** `Java 21`, `Spring Boot 3.3.2`, `Outbox/Inbox Ledger`, `PostgreSQL`, `Spring Kafka` (Port 8083)

---

## 📑 Mục lục

1. [Tổng quan Kiến trúc 2 Services](#1-tổng-quan-kiến-trúc-2-services)
2. [Payment Service (Spring Boot 3.3 / Hexagonal Architecture)](#2-payment-service-spring-boot-33--hexagonal-architecture)
3. [Inventory Service (Spring Boot 3.3 / Stock Reservation & Outbox)](#3-inventory-service-spring-boot-33--stock-reservation--outbox)
4. [Tích hợp Saga Orchestration qua Apache Kafka](#4-tích-hợp-saga-orchestration-qua-apache-kafka)
5. [Độ tin cậy: Transactional Outbox & Idempotent Inbox](#5-độ-tin-cậy-transactional-outbox--idempotent-inbox)
6. [Dependencies & Maven `pom.xml` thực tế](#6-dependencies--maven-pomxml-thực-tế)
7. [Hướng dẫn Chạy & Khởi động nhanh](#7-hướng-dẫn-chạy--khởi-động-nhanh)

---

## 1. Tổng quan Kiến trúc 2 Services

Cả Payment Service và Inventory Service đều được xây dựng trên hệ sinh thái **Java 21** và **Spring Boot 3.3.2**, sử dụng **PostgreSQL** độc lập theo mô hình Database-per-Service.

```
src/
├── quick-bite-payment/                  # Port 8084 (Context-path: /v1)
│   └── src/main/java/com/quickbite/payment/
│       ├── domain/model/                # Core Entities & Value Objects (POJO thuần túy)
│       ├── application/
│       │   ├── port/in/                 # Use Cases interfaces (ProcessPayment, GetPayment)
│       │   ├── port/out/                # SPI Interfaces (PaymentPersistencePort, PaymentGatewayPort)
│       │   └── service/                 # Application Services orchestration
│       └── adapter/
│           ├── in/web/                  # REST Controllers & Mock Process Endpoint
│           ├── in/messaging/            # Kafka Event Consumers (OrderEventConsumer)
│           ├── out/persistence/         # JPA Entities, Repositories (PostgreSQL) & Outbox/Inbox
│           ├── out/gateway/             # Mock Payment Gateway (Sandbox simulation)
│           └── out/messaging/           # Kafka Event Producers (fulfillment-events)
│
└── quick-bite-inventory/                # Port 8083 (Context-path: /api/v1)
    └── src/main/java/com/quickbite/inventory/
        ├── entity/                      # InventoryItem, InventoryFoodItem, OutboxMessage, InboxMessage
        ├── repository/                  # Spring Data JPA Repositories
        ├── service/                     # InventoryService (Reserve, Confirm, Release logic)
        ├── controller/                  # REST API Endpoints (Cập nhật tồn kho, tra cứu)
        └── kafka/                       # Kafka Consumers & Producers (order-events, fulfillment-events)
```

---

## 2. Payment Service (Spring Boot 3.3 / Hexagonal Architecture)

### 2.1. Trách nhiệm chính
* Tiếp nhận yêu cầu thanh toán từ Saga Orchestrator khi có đơn hàng mới (`order.created`).
* Thực thi xử lý thanh toán thông qua **Mock Payment Gateway** (Sandbox Simulation) hoặc cổng mở rộng.
* Publish kết quả thanh toán (`payment.authorized` hoặc `payment.failed`) về topic `fulfillment-events` để Order Service tiếp tục luồng Saga.
* Hỗ trợ hoàn tiền hoặc void giao dịch khi có sự kiện bù trừ (`saga.payment.refund` / `order.cancelled`).

### 2.2. Công nghệ sử dụng
| Thành phần | Công nghệ thực tế |
| :--- | :--- |
| **Framework** | Spring Boot 3.3.2 (Java 21) |
| **Kiến trúc** | **Hexagonal Architecture** (Ports & Adapters / Clean Architecture) |
| **Database** | **PostgreSQL** (`org.postgresql:postgresql`) |
| **ORM** | Spring Data JPA (Hibernate) |
| **Message Broker** | Apache Kafka (`spring-kafka`) |
| **Documentation** | SpringDoc OpenAPI UI 2.6.0 (`/swagger-ui.html`) |

### 2.3. Cấu trúc Domain & Database Thực tế

#### 1. `PaymentEntity` (`payments` table)
```java
@Entity
@Table(name = "payments")
public class PaymentEntity {
    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentStatus status; // PENDING, SUCCESS, FAILED, REFUNDED

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false)
    private PaymentMethod method; // MOCK_PAYMENT, COD, CREDIT_CARD, MOMO

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "payment_url", length = 1000)
    private String paymentUrl;

    @Column(name = "failure_reason")
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### 2.4. Endpoints Payment Service (Port 8084)
* `GET /v1/payments/{id}`: Tra cứu chi tiết giao dịch thanh toán.
* `GET /v1/payments/order/{orderId}`: Tra cứu giao dịch theo mã đơn hàng.
* `POST /v1/payments/mock/process`: Kích hoạt mô phỏng thanh toán Sandbox (cho phép chọn Thành công / Thất bại phục vụ demo luồng Saga).

---

## 3. Inventory Service (Spring Boot 3.3 / Stock Reservation & Outbox)

### 3.1. Trách nhiệm chính
* Quản lý số lượng tồn kho của từng món ăn (`InventoryItem`).
* **Giữ chỗ tồn kho (Hold Stock)**: Tăng `reserved_quantity` khi nhận sự kiện `order.created`, đảm bảo không bị bán vượt số lượng (*Overselling*).
* **Xác nhận trừ kho**: Trừ cả `quantity` và `reserved_quantity` khi đơn hàng chuyển sang `order.confirmed`.
* **Nhả giữ chỗ (Compensate Release)**: Giảm `reserved_quantity` khi đơn hàng bị hủy hoặc thanh toán thất bại (`saga.stock.release`).
* Duy trì bản sao thông tin món (`InventoryFoodItem`) từ Catalog Service qua Kafka.

### 3.2. Công nghệ sử dụng
| Thành phần | Công nghệ thực tế |
| :--- | :--- |
| **Framework** | Spring Boot 3.3.2 (Java 21) |
| **Database** | **PostgreSQL** (`org.postgresql:postgresql`) |
| **ORM** | Spring Data JPA (Hibernate) |
| **Message Broker** | Apache Kafka (`spring-kafka`) |
| **Documentation** | SpringDoc OpenAPI UI 2.6.0 |

### 3.3. Cấu trúc Domain & Database Thực tế

#### 1. `InventoryItem` (`inventory_items` table)
```java
@Entity
@Table(name = "inventory_items", indexes = {
    @Index(name = "idx_inventory_food_item_id", columnList = "food_item_id", unique = true)
})
public class InventoryItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "food_item_id", nullable = false, unique = true)
    private UUID foodItemId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0; // Tổng tồn vật lý

    @Column(name = "reserved_quantity", nullable = false)
    private Integer reservedQuantity = 0; // Số lượng đang giữ chỗ

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Logic tính tồn khả dụng
    public int getAvailableQuantity() {
        return Math.max(0, (quantity != null ? quantity : 0) - (reservedQuantity != null ? reservedQuantity : 0));
    }

    public boolean hasEnoughStock(int requestedQty) {
        return getAvailableQuantity() >= requestedQty;
    }

    public void reserveStock(int reqQty) {
        if (!hasEnoughStock(reqQty)) {
            throw new IllegalStateException("Không đủ tồn kho khả dụng cho món: " + foodItemId);
        }
        this.reservedQuantity = (this.reservedQuantity != null ? this.reservedQuantity : 0) + reqQty;
    }

    public void confirmDeduct(int reqQty) {
        this.quantity = Math.max(0, (this.quantity != null ? this.quantity : 0) - reqQty);
        this.reservedQuantity = Math.max(0, (this.reservedQuantity != null ? this.reservedQuantity : 0) - reqQty);
    }

    public void releaseReservedStock(int reqQty) {
        this.reservedQuantity = Math.max(0, (this.reservedQuantity != null ? this.reservedQuantity : 0) - reqQty);
    }
}
```

#### 2. `InventoryFoodItem` (`inventory_food_items` table - Replica)
* `id` (`UUID PK`), `sku` (`VARCHAR`), `name` (`VARCHAR`), `category_id` (`UUID`), `restaurant_id` (`UUID`), `is_available` (`BOOLEAN`).

### 3.4. Endpoints Inventory Service (Port 8083)
* `GET /api/v1/inventory/items/{foodItemId}`: Lấy thông tin tồn kho (`quantity`, `reservedQuantity`, `availableQuantity`).
* `POST /api/v1/inventory/items`: Khởi tạo kho cho món ăn mới.
* `PUT /api/v1/inventory/items/{foodItemId}/stock`: Cập nhật/nhập thêm số lượng tồn kho (Merchant điều chỉnh tồn kho).
* `POST /api/v1/inventory/reserve`: API giữ chỗ thủ công (Hỗ trợ kiểm thử).
* `POST /api/v1/inventory/release`: API giải phóng giữ chỗ thủ công.

---

## 4. Tích hợp Saga Orchestration qua Apache Kafka

Cả hai service đều là mắt xích phản hồi trực tiếp cho **MassTransit State Machine** của Order Service:

```
                    Kafka Topic: `order-events`
                                │
            ┌───────────────────┴───────────────────┐
            │ Publish: `order.created`              │
            ▼                                       ▼
  [ Inventory Service ]                   [ Payment Service ]
  - Kiểm tra & reserveStock()             - Tạo bản ghi Payment (PENDING)
  - Sinh Outbox:                          - Sinh Outbox:
    `stock.reserved` / `stock.rejected`     `payment.authorized` / `payment.failed`
            │                                       │
            └───────────────────┬───────────────────┘
                                ▼
                   Kafka Topic: `fulfillment-events`
                                │
                                ▼
                      [ Order Service (Saga) ]
```

---

## 5. Độ tin cậy: Transactional Outbox & Idempotent Inbox

Cả hai service đều trang bị 2 bảng chuyên dụng để xử lý bất đồng bộ:

### 5.1. Bảng `outbox_messages` / `payment_outbox`
Commit nguyên tử cùng bảng dữ liệu nghiệp vụ:
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

### 5.2. Bảng `inbox_messages` / `payment_inbox`
Chống trùng lặp sự kiện Kafka (*Idempotent Consumer*):
```sql
CREATE TABLE inbox_messages (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    event_type VARCHAR(128) NOT NULL,
    processed_at TIMESTAMP NOT NULL
);
```

---

## 6. Dependencies & Maven `pom.xml` thực tế

Cả hai dự án sử dụng chung bộ dependencies chuẩn hóa:

```xml
<properties>
    <java.version>21</java.version>
</properties>

<dependencies>
    <!-- Web REST API & SpringDoc OpenAPI -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.6.0</version>
    </dependency>

    <!-- JPA & PostgreSQL -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Kafka -->
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>

    <!-- Validation & Lombok -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

---

## 7. Hướng dẫn Chạy & Khởi động nhanh

```bash
# 1. Chạy Payment Service (Port 8084)
cd src/quick-bite-payment
./mvnw spring-boot:run

# 2. Chạy Inventory Service (Port 8083)
cd src/quick-bite-inventory
./mvnw spring-boot:run
```
