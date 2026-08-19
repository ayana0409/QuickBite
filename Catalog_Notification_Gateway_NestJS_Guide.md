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
- Quản lý Category.
- Quản lý Food Items (biến thể variants, toppings).
- Quản lý Reviews & Đánh giá món ăn theo đơn hàng (chống spam trùng lặp).
- Cung cấp API cho Gateway / Client.
- Đồng bộ trạng thái từ Kafka events.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | NestJS |
| Database | PostgreSQL (hỗ trợ JSONB/Array) / MongoDB |
| ORM / ODM | TypeORM |
| Cache | Redis |
| Event Bus | Kafka (KafkaJS) |
| Auth | JWT, Passport, Custom Decorators |

## Kiến trúc nội bộ

```
src/
├── restaurant/
├── category/
├── food-item/
├── review/
│   ├── dto/
│   ├── entities/
│   ├── review.controller.ts
│   ├── review.service.ts
│   └── review.module.ts
├── auth/
│   ├── decorators/
│   ├── guards/
│   └── strategies/
├── common/
└── health/
```

## Domain Model đề xuất

Restaurant:

```
Id (UUID)
OwnerId
Name
Slug
Address (Line1, Ward, District, City, Geo)
Status (open/closed)
Rating (avg, count)
CreatedAt
UpdatedAt
```

Category:

```
Id (UUID)
RestaurantId
Name
SortOrder
CreatedAt
UpdatedAt
```

Food Item:

```
Id (UUID)
CategoryId
RestaurantId
Sku
Name
Description
Price
Currency
Images
IsAvailable
PreparationTime
Tags
TotalSold
Rating (Number: decimal, default 0)
ReviewCount (Number: int, default 0)
Variants (name, priceDelta)
Toppings (name, price)
```

Review:

```
Id (UUID)
OrderId (String)
RestaurantId (String)
FoodItemId (String)
UserId (String)
Rating (Number: 1 - 5)
Comment (String, optional)
CreatedAt
UpdatedAt
Index: (orderId, foodItemId) - UNIQUE
Index: restaurantId
Index: foodItemId
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
GET    /restaurants/me
PUT    /restaurants/me
GET    /restaurants/:id
PATCH  /restaurants/:id
DELETE /restaurants/:id

GET    /categories
POST   /categories
GET    /categories/:id
PATCH  /categories/:id
DELETE /categories/:id

GET    /food-items
POST   /food-items
GET    /food-items/:id
GET    /food-items/restaurant/:restaurantId
GET    /food-items/category/:categoryId
PATCH  /food-items/:id
PATCH  /food-items/:id/images
PATCH  /food-items/:id/variants
PATCH  /food-items/:id/toppings
DELETE /food-items/:id

POST   /reviews/batch
GET    /reviews/restaurants/:restaurantId
GET    /reviews/food-items/:foodItemId
```

## Lưu ý về Cơ sở dữ liệu

- Bảng `reviews` có Compound Unique Index trên `(orderId, foodItemId)` để chống spam đánh giá lặp lại trên cùng 1 món ăn trong đơn hàng.
- Món ăn hỗ trợ lưu trữ mảng `images`, `tags` và cấu trúc `variants`, `toppings` linh hoạt.

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
