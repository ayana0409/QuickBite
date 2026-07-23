# Hướng dẫn triển khai Catalog Service + Notification Service + API Gateway (NestJS)

## Mục tiêu

Tài liệu này hướng dẫn cách triển khai ba service sử dụng NestJS trong hệ thống QuickBite:

- Catalog Service (Restaurant & Menu Management)
- Notification Service (Email, SMS, Push Notification & Realtime)
- API Gateway / BFF (Authentication, Aggregation & Routing)

Ba service này chịu trách nhiệm xử lý các tác vụ I/O-bound, realtime communication và đóng vai trò là tầng giao tiếp với client.

---

## Kiến trúc đề xuất

```
services/
├── catalog/
├── notification/
└── gateway/
```

Mỗi service được triển khai độc lập theo kiến trúc module-based của NestJS.

---

# Catalog Service

## Trách nhiệm

- Quản lý Restaurant.
- Quản lý Menu.
- Quản lý Category.
- Quản lý Food Items.
- Cung cấp API cho Gateway.
- Đồng bộ trạng thái từ Kafka events.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | NestJS |
| Database | MongoDB |
| ODM | Mongoose |
| Cache | Redis |
| Event Bus | Kafka |

## Kiến trúc nội bộ

```
src/
├── restaurants/
├── menus/
├── categories/
├── food-items/
├── kafka/
└── common/
```

## Domain Model đề xuất

Restaurant:

```
Id
Name
Description
Status
Address
Logo
CreatedAt
```

Menu:

```
Id
RestaurantId
Name
Description
Status
```

Food Item:

```
Id
MenuId
Name
Description
Price
Image
Available
```

## Kafka Events

### Event phát ra

```
menu.updated
restaurant.status.changed
```

### Event tiêu thụ

```
stock.reserved
stock.released
```

## API đề xuất

```
GET    /restaurants
POST   /restaurants
PUT    /restaurants/{id}

GET    /menus
POST   /menus

GET    /foods
POST   /foods
```

## Vì sao MongoDB?

- Schema linh hoạt cho menu và topping.
- Dễ dàng mở rộng nhiều loại món ăn.
- Phù hợp với document-based data.

---

# Notification Service

## Trách nhiệm

- Gửi Email.
- Gửi SMS.
- Push Notification.
- Realtime Notification.
- Retry khi gửi thất bại.
- Consumer các Kafka Events.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | NestJS |
| Queue | BullMQ |
| Cache | Redis |
| Event Bus | Kafka |
| Realtime | Socket.IO |

## Kiến trúc nội bộ

```
src/
├── channels/
│   ├── email/
│   ├── sms/
│   └── push/
│
├── realtime/
├── kafka/
├── templates/
└── common/
```

## Kafka Events tiêu thụ

```
order.created
order.confirmed
order.cancelled

payment.authorized
payment.failed

stock.reserved
stock.rejected

notification-events
```

## Notification Channels

```
Email
SMS
Push Notification
WebSocket Notification
```

## BullMQ Jobs

```
Send Email
Send SMS
Send Push Notification
Retry Failed Notification
```

## Realtime Gateway

```
@WebSocketGateway()
```

Ví dụ các sự kiện realtime:

```
ORDER_UPDATED
PAYMENT_SUCCESS
PAYMENT_FAILED
DELIVERY_UPDATED
```

---

# API Gateway / BFF

## Trách nhiệm

- Authentication.
- Authorization.
- Rate Limiting.
- API Aggregation.
- Proxy Request.
- JWT Validation.
- Correlation ID Middleware.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | NestJS |
| Authentication | JWT + JWKS |
| Rate Limit | @nestjs/throttler |
| Proxy | Http Proxy |
| Cache | Redis |

## Kiến trúc nội bộ

```
src/
├── auth/
├── proxy/
├── aggregation/
├── graphql/
└── common/
```

## Authentication Flow

```
Client
   |
Gateway
   |
Validate JWT
   |
Identity Service
   |
Forward Request
   |
Target Service
```

Gateway không được chứa business logic.

## API Aggregation

Ví dụ:

```
Home Page

Gateway
  |
  +----- Catalog Service
  +----- Order Service
  +----- Notification Service
```

Gateway sẽ tổng hợp dữ liệu từ nhiều service trước khi trả về client.

## Rate Limiting

Khuyến nghị:

```
@nestjs/throttler
```

Ví dụ:

```
100 requests / minute
```

## JWT Validation

Gateway sẽ validate JWT được cấp bởi Identity Service thông qua JWKS endpoint.

---

# Kafka Integration

Khuyến nghị tạo module riêng:

```
kafka/
├── consumers/
├── producers/
└── kafka.module.ts
```

Mọi NestJS service nên sử dụng cùng một cấu trúc Kafka Module để dễ dàng mở rộng.

---

# Redis Cache

Catalog Service:

```
Restaurant Cache
Menu Cache
```

Notification Service:

```
Notification Queue Cache
```

Gateway:

```
JWT Cache
Rate Limit Cache
```

---

# Logging và Observability

Khuyến nghị sử dụng:

- OpenTelemetry
- Jaeger
- Prometheus
- Grafana
- Winston Logger

Kafka Header:

```
eventId
correlationId
tenantId
version
occurredAt
```

HTTP Header:

```
x-correlation-id
authorization
```

---

# Package đề xuất

Catalog Service:

```
@nestjs/mongoose
mongoose
@nestjs/cache-manager
kafkajs
```

Notification Service:

```
@nestjs/websockets
socket.io
@nestjs/bullmq
kafkajs
```

Gateway:

```
@nestjs/throttler
jsonwebtoken
jwks-rsa
http-proxy-middleware
```

---

# Lộ trình triển khai

### Phase 1

- Catalog CRUD.
- Gateway Authentication.

### Phase 2

- Kafka Integration.
- Notification Consumer.

### Phase 3

- Redis Cache.
- BullMQ Jobs.

### Phase 4

- WebSocket Realtime Notification.
- API Aggregation.

### Phase 5

- Observability.
- Docker Compose.
- Kubernetes Deployment.

---

## Kết luận

Catalog Service được tối ưu cho dữ liệu dạng document và khả năng mở rộng menu. Notification Service đảm nhiệm toàn bộ luồng gửi thông báo và realtime communication. API Gateway đóng vai trò là điểm vào duy nhất của hệ thống, thực hiện xác thực, rate limiting và tổng hợp dữ liệu từ nhiều service. Việc sử dụng NestJS cho ba service này giúp tận dụng tối đa khả năng xử lý I/O bất đồng bộ, realtime và phát triển nhanh trong kiến trúc microservice event-driven của QuickBite.
