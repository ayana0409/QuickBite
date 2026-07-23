# Hướng dẫn triển khai Identity Service + Order Service (ABP Framework + .NET)

## Mục tiêu

Tài liệu này hướng dẫn cách triển khai hai service lõi của QuickBite bằng ABP Framework:

- Identity Service (.NET + ABP + OpenIddict)
- Order Service (.NET + ABP + MassTransit + Kafka)

Hai service này là trung tâm của hệ thống microservice, chịu trách nhiệm xác thực người dùng, phân quyền và điều phối toàn bộ vòng đời của đơn hàng.

---

## Kiến trúc đề xuất

```
services/
├── identity/
│   └── src/
│       ├── QuickBite.Identity.Domain
│       ├── QuickBite.Identity.Domain.Shared
│       ├── QuickBite.Identity.Application.Contracts
│       ├── QuickBite.Identity.Application
│       ├── QuickBite.Identity.EntityFrameworkCore
│       ├── QuickBite.Identity.HttpApi
│       └── QuickBite.Identity.HttpApi.Host
│
└── order/
    └── src/
        ├── QuickBite.Order.Domain
        ├── QuickBite.Order.Domain.Shared
        ├── QuickBite.Order.Application.Contracts
        ├── QuickBite.Order.Application
        ├── QuickBite.Order.EntityFrameworkCore
        ├── QuickBite.Order.HttpApi
        ├── QuickBite.Order.HttpApi.Host
        └── QuickBite.Order.Kafka
```

---

## Identity Service

### Trách nhiệm

- Đăng ký tài khoản.
- Đăng nhập.
- Phân quyền RBAC.
- Cấp phát Access Token và Refresh Token.
- Publish domain events.

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | ABP Framework |
| ORM | Entity Framework Core |
| Authentication | OpenIddict |
| Database | SQL Server |
| Cache | Redis |
| Event Bus | Kafka |
| Logging | Serilog |

### Domain Model

```
Users
     └── Roles
          └── Permissions
```

### Entity đề xuất

```
AppUser
AppRole
RefreshToken
UserProfile
```

### Permission đề xuất

```
QuickBite.Identity.Users.Create
QuickBite.Identity.Users.Update
QuickBite.Identity.Users.Delete


QuickBite.Identity.Roles.Manage
```

### API đề xuất

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout

GET    /api/users/me
PUT    /api/users/profile

```

### Event phát ra

```
user.registered
user.updated
```

### OpenIddict

Cấu hình OpenIddict để hỗ trợ:

- OAuth2.
- OpenID Connect.
- JWT Bearer Token.
- Refresh Token.
- Authorization Code Flow.

### Redis Cache

Redis được sử dụng để cache:

- Permission.
- User claims.
- Refresh token metadata.

---

## Order Service

### Trách nhiệm

- Tạo đơn hàng.
- Điều phối Saga.
- Publish Kafka events.
- Quản lý trạng thái đơn hàng.
- Compensation transaction.

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | ABP Framework |
| ORM | Entity Framework Core |
| Database | PostgreSQL |
| Saga | MassTransit State Machine |
| Message Broker | Kafka |
| Pattern | Outbox + Inbox |

### Aggregate Root

```
Order
```

### Entity

```
OrderItem
OrderTracking
```

### Value Objects

```
Money
Address
OrderStatus
```

### Domain Events

```
OrderCreated
OrderConfirmed
OrderCancelled
PaymentAuthorized
PaymentFailed
StockReserved
StockRejected
```

### Order Status

```
Pending
WaitingStock
WaitingPayment
Confirmed
Delivering
Completed
Cancelled
Refunded
```

### API đề xuất

```
POST   /api/orders
GET    /api/orders/{id}
GET    /api/orders
PUT    /api/orders/{id}/cancel
```

---

## Saga Flow

```
Create Order
     |
     V
Publish order.created
     |
     +----------------------+
     |                      |
     V                      V
Reserve Stock          Authorize Payment
     |                      |
     +----------------------+
                 |
                 V
            Success ?
                 |
          +------+------+
          |             |
         YES            NO
          |             |
          V             V
 Confirm Order      Compensation
          |             |
          V             V
Publish Event     Release Stock
                  Refund Payment
                  Cancel Order
```

---

## Outbox Pattern

Bảng đề xuất:

```
OutboxMessages

Id
EventId
EventType
Payload
Status
Retries
CreatedAt
ProcessedAt
```

Quy trình:

1. Save Order.
2. Save Outbox Message.
3. Commit Transaction.
4. Background Worker publish Kafka.
5. Mark Processed.

---

## Inbox Pattern

```
InboxMessages

Id
EventId
Status
ProcessedAt
```

Consumer phải kiểm tra EventId trước khi xử lý để đảm bảo idempotency.

---

## Kafka Topics

```
order-events
payment-events
inventory-events
notification-events
```

### Header chuẩn

```
eventId
correlationId
version
occurredAt
```

---

## ABP Module Design

Identity Service:

```
Domain
Application
EntityFrameworkCore
HttpApi
HttpApi.Host
```

Order Service:

```
Domain
Application
EntityFrameworkCore
HttpApi
HttpApi.Host
Kafka
```

Khuyến nghị không đưa Kafka Producer và Consumer vào Application Layer để tránh phụ thuộc vào infrastructure.

---

## Database đề xuất

Identity:

```
SQL Server
```

Order:

```
PostgreSQL
```

Lý do:

- SQL Server phù hợp với Identity và OpenIddict.
- PostgreSQL có hiệu năng tốt cho transaction và event sourcing style workload.

---

## Background Workers

Identity Service:

```
Permission Cache Refresher
Token Cleanup Worker
```

Order Service:

```
Outbox Publisher Worker
Inbox Cleanup Worker
Saga Timeout Worker
```

---

## Logging và Tracing

Sử dụng:

- Serilog.
- OpenTelemetry.
- Jaeger.
- Prometheus.
- Grafana.

Mọi request và Kafka event nên mang theo CorrelationId.

---

## Package đề xuất

Identity Service:

```
Volo.Abp.Identity
Volo.Abp.OpenIddict
Volo.Abp.PermissionManagement
Volo.Abp.MultiTenancy
Volo.Abp.EntityFrameworkCore.SqlServer
StackExchange.Redis
```

Order Service:

```
MassTransit
MassTransit.Kafka
MassTransit.EntityFrameworkCore
Npgsql.EntityFrameworkCore.PostgreSQL
Volo.Abp.EntityFrameworkCore.PostgreSQL
```

---

## Lộ trình triển khai

### Phase 1

- Identity Service.
- Authentication.
- Authorization.

### Phase 2

- Order Service.
- CRUD Order.

### Phase 3

- Kafka Integration.
- Outbox Pattern.

### Phase 4

- Saga Pattern.
- Compensation.

### Phase 5

- Observability.
- Docker Compose.
- Kubernetes Deployment.

---

## Kết luận

Identity Service chịu trách nhiệm toàn bộ Authentication, Authorization và Multi-tenancy của hệ thống. Order Service đóng vai trò Saga Orchestrator và điều phối toàn bộ quy trình đặt món. Việc sử dụng ABP Framework giúp tận dụng các building blocks của DDD, permission system và OpenIddict, đồng thời dễ dàng mở rộng theo kiến trúc microservice và event-driven.
