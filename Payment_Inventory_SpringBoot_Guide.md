# Hướng dẫn triển khai Payment Service + Inventory Service (Spring Boot)

## Mục tiêu

Tài liệu này hướng dẫn cách triển khai hai service của QuickBite bằng Spring Boot:

- Payment Service (Authorize, Capture, Refund Payment)
- Inventory Service (Reserve, Release Stock)

Hai service này là các thành phần quan trọng trong Saga Pattern của hệ thống microservice và chịu trách nhiệm xử lý các transaction liên quan đến thanh toán và tồn kho.

---

## Kiến trúc đề xuất

```
services/
├── payment/
│   └── src/main/java/com/quickbite/payment/
│       ├── domain/
│       ├── application/
│       ├── adapter/
│       └── config/
│
└── inventory/
    └── src/main/java/com/quickbite/inventory/
        ├── domain/
        ├── application/
        ├── adapter/
        └── config/
```

---

## Payment Service

### Trách nhiệm

- Authorize Payment.
- Capture Payment.
- Refund Payment.
- Void Payment khi Saga compensation.
- Publish Kafka Events.
- Xử lý Idempotency.

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | Spring Boot 3 |
| ORM | Spring Data JPA |
| Database | PostgreSQL |
| Event Bus | Kafka |
| Pattern | Outbox + Inbox |
| Resilience | Resilience4j |
| Logging | Logback / OpenTelemetry |

---

## Kiến trúc nội bộ (Hexagonal Architecture)

```
src/main/java/com/quickbite/payment/
├── domain/
│   ├── model/
│   │   └── Payment.java
│   └── service/
│       └── PaymentDomainService.java
│
├── application/
│   ├── usecase/
│   └── port/
│       ├── in/
│       └── out/
│
├── adapter/
│   ├── in/
│   │   ├── kafka/
│   │   └── web/
│   └── out/
│       ├── persistence/
│       └── gateway/
│
└── config/
```

---

## Payment Aggregate

```
Payment
```

### Thuộc tính đề xuất

```
Id
OrderId
CustomerId
Amount
Currency
Status
PaymentMethod
CreatedAt
UpdatedAt
```

### Payment Status

```
PENDING
AUTHORIZED
CAPTURED
FAILED
VOIDED
REFUNDED
```

---

## Kafka Events

### Event tiêu thụ

```
order.created
order.cancelled
```

### Event phát ra

```
payment.authorized
payment.failed
payment.captured
payment.refunded
```

---

## API đề xuất

```
GET  /api/payments/{id}
GET  /api/payments/order/{orderId}
POST /api/payments/refund
```

Lưu ý: Payment chủ yếu hoạt động thông qua Kafka Event và không cần expose quá nhiều REST API.

---

## Outbox Pattern

Bảng đề xuất:

```
PaymentOutboxMessage

Id
EventId
EventType
Payload
Status
CreatedAt
ProcessedAt
```

Publisher Worker sẽ đọc Outbox và publish lên Kafka.

---

## Inbox Pattern

```
PaymentInboxMessage

Id
EventId
Status
ProcessedAt
```

Consumer phải kiểm tra EventId trước khi xử lý để đảm bảo idempotency.

---

## Payment Gateway

Khuyến nghị thiết kế theo Port & Adapter:

```
PaymentGateway
    |
    +--- VNPayAdapter
    +--- MoMoAdapter
    +--- StripeAdapter
    +--- SandboxAdapter
```

Giúp dễ dàng thay đổi cổng thanh toán trong tương lai.

---

## Inventory Service

### Trách nhiệm

- Reserve Stock.
- Release Stock.
- Xử lý race condition.
- Publish Kafka Events.
- Compensation transaction.

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | Spring Boot 3 |
| ORM | Spring Data JPA |
| Database | PostgreSQL |
| Message Broker | Kafka |
| Locking | Optimistic Locking |
| Pattern | Outbox + Inbox |

---

## Kiến trúc nội bộ

```
src/main/java/com/quickbite/inventory/
├── domain/
│   └── model/
│       ├── StockItem.java
│       └── Reservation.java
│
├── application/
│   └── usecase/
│
├── adapter/
│   ├── in/kafka/
│   └── out/persistence/
│
└── config/
```

---

## Domain Model

### StockItem

```
Id
Sku
Name
AvailableQuantity
ReservedQuantity
Version
```

### Reservation

```
Id
OrderId
Sku
Quantity
Status
CreatedAt
```

---

## Reservation Status

```
PENDING
RESERVED
RELEASED
REJECTED
```

---

## Kafka Events

### Event tiêu thụ

```
order.created
order.cancelled
```

### Event phát ra

```
stock.reserved
stock.rejected
stock.released
```

---

## Optimistic Locking

Khuyến nghị sử dụng:

```
@Version
private Long version;
```

Mục đích:

- Tránh over-selling.
- Tránh race condition khi nhiều đơn hàng đặt cùng lúc.
- Đảm bảo tính nhất quán của dữ liệu tồn kho.

---

## Saga Flow

```
order.created
      |
      +----------------+
      |                |
      V                V
Reserve Stock     Authorize Payment
      |                |
      +--------+-------+
               |
               V
        Order Service
               |
        order.confirmed
```

Nếu xảy ra lỗi:

```
payment.failed
      |
Release Stock
      |
stock.released
      |
order.cancelled
```

Hoặc:

```
stock.rejected
      |
Void Payment
      |
payment.refunded
      |
order.cancelled
```

---

## Database đề xuất

Payment:

```
PostgreSQL
```

Inventory:

```
PostgreSQL
```

Khuyến nghị mỗi service sử dụng một database riêng theo nguyên tắc Database-per-Service.

---

## Package đề xuất

Payment Service:

```
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-kafka
postgresql
resilience4j-spring-boot3
```

Inventory Service:

```
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-kafka
postgresql
```

---

## Background Jobs

Payment:

```
Outbox Publisher
Inbox Cleanup
Retry Failed Payment Event
```

Inventory:

```
Outbox Publisher
Inbox Cleanup
Reservation Cleanup
```

---

## Logging và Observability

Khuyến nghị sử dụng:

- OpenTelemetry
- Jaeger
- Prometheus
- Grafana
- Structured Logging

Mọi Kafka event cần mang theo:

```
eventId
correlationId
tenantId
version
occurredAt
```

---

## Lộ trình triển khai

### Phase 1

- Payment Domain.
- Inventory Domain.

### Phase 2

- Kafka Integration.
- Consumer và Producer.

### Phase 3

- Outbox Pattern.
- Inbox Pattern.

### Phase 4

- Saga Integration với Order Service.

### Phase 5

- Retry, Circuit Breaker và Observability.

---

## Kết luận

Payment Service và Inventory Service được xây dựng theo Hexagonal Architecture nhằm tách biệt business logic khỏi infrastructure. Việc kết hợp Spring Boot, Kafka, Outbox/Inbox Pattern và Saga Pattern giúp hệ thống đảm bảo tính nhất quán dữ liệu, khả năng mở rộng và khả năng chịu lỗi trong môi trường microservice event-driven.
