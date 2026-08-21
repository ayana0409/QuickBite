# 🍔 QuickBite — Tài liệu Thiết kế Kiến trúc Polyglot Microservices 

> **Nền tảng đặt & giao đồ ăn** xây dựng theo kiến trúc microservice đa ngôn ngữ (.NET, Spring Boot, NestJS), giao tiếp bất đồng bộ qua **Apache Kafka** theo mô hình **Event-Driven (EDD)**, áp dụng các pattern nâng cao: **Saga, Outbox/Inbox, Idempotency**. 

--- 

## 📑 Mục lục 

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)

2. [Nguyên tắc phân bổ ngôn ngữ (Polyglot rationale)](#2-nguyên-tắc-phân-bổ-ngôn-ngữ)

3. [Kiến trúc tổng thể](#3-kiến-trúc-tổng-thể)

4. [Danh sách Kafka Topics & Event Schema](#4-danh-sách-kafka-topics--event-schema)

5. [Chi tiết từng Service](#5-chi-tiết-từng-service)

  - [5.1. Identity Service (.NET/ABP)](#51-identity-service-netabp) 

  - [5.2. Order Service (.NET/ABP)](#52-order-service-netabp) 

  - [5.3. Catalog Service (NestJS)](#53-catalog-service-nestjs) 

  - [5.4. Payment Service (Spring Boot)](#54-payment-service-spring-boot) 

  - [5.5. Inventory Service (Spring Boot)](#55-inventory-service-spring-boot) 

  - [5.6. Notification Service (NestJS)](#56-notification-service-nestjs) 

  - [5.7. API Gateway / BFF (NestJS)](#57-api-gateway--bff-nestjs) 

6. [Các Pattern nâng cao](#6-các-pattern-nâng-cao) 

7. [Cross-cutting concerns](#7-cross-cutting-concerns) 

8. [Lộ trình triển khai](#8-lộ-trình-triển-khai) 


--- 

## 1. Tổng quan hệ thống 

### 1.1. Bối cảnh nghiệp vụ 
QuickBite cho phép khách hàng duyệt nhà hàng, đặt món, thanh toán online và theo dõi đơn giao. Nghiệp vụ chia thành các **bounded context** rõ ràng theo DDD: 

| Bounded Context | Trách nhiệm | Service | 
|---|---|---| 
| **Identity & Access** | Đăng ký, đăng nhập, phân quyền, multi-tenant | Identity | 
| **Ordering** | Vòng đời đơn hàng, orchestration Saga | Order | 
| **Catalog** | Nhà hàng, thực đơn, món ăn | Catalog | 
| **Payment** | Uỷ quyền, thu tiền, hoàn tiền | Payment | 
| **Inventory** | Tồn kho nguyên liệu, giữ chỗ (reservation) | Inventory | 
| **Notification** | Email/SMS/Push/Realtime | Notification | 

### 1.2. Quyết định kiến trúc chủ đạo (ADR tóm tắt) 
- **DB-per-service:** mỗi service sở hữu database riêng, không chia sẻ schema. 
- **Async-first:** giao tiếp giữa service ưu tiên event qua Kafka; sync (REST/gRPC) chỉ dùng cho query cần realtime. 
- **Choreography + Orchestration lai:** luồng đơn hàng dùng **orchestration Saga**; các phản ứng phụ (notification) dùng **choreography**.
- **Contract-first event:** mọi event định nghĩa schema (Avro/JSON Schema) và quản lý version qua Schema Registry. 

--- 

## 2. Nguyên tắc phân bổ ngôn ngữ 

> **Triết lý:** Mỗi stack được gán vào domain phù hợp với thế mạnh của nó, không gán ngẫu nhiên. Đây là điểm dễ "ăn điểm" khi trình bày/phỏng vấn. 

| Stack | Điểm mạnh | Domain được giao | 
|---|---|---| 
| **.NET (ABP)** |Permission, DDD building blocks, OpenIddict | **Identity + Order** (lõi nghiệp vụ) | 
| **Spring Boot** | Hệ sinh thái JVM tài chính, transaction, JPA locking | **Payment + Inventory** (tiền & kho) | 
| **NestJS** | Realtime (WS/SSE), I/O-bound, TypeScript nhanh | **Catalog + Notification + Gateway** | 

**Ghi nhớ nguyên tắc:** .NET giữ *domain lõi*, Spring giữ *tiền bạc & tồn kho*, NestJS giữ *I/O nặng & realtime*. 

--- 

## 3. Kiến trúc tổng thể 

``` 
                        ┌─────────────────────┐ 
       Web / Mobile ───►│   API Gateway (BFF) │  NestJS 
                        │  auth · rate-limit  │ 
                        └──────────┬──────────┘ 
            ┌───────────────┬──────┴───────┬───────────────┐ 
            ▼               ▼              ▼               ▼ 
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ 
    │  Identity    │ │   Order      │ │  Catalog     │ │ Notification │ 
    │  .NET / ABP  │ │  .NET / ABP  │ │  NestJS      │ │  NestJS (WS) │ 
    └──────────────┘ └──────┬───────┘ └──────────────┘ └──────────────┘ 
                            │ (Saga orchestrator) 
             ┌──────────────┴──────────────┐ 
             ▼                             ▼ 
    ┌──────────────┐              ┌──────────────┐ 
    │  Payment     │              │  Inventory   │
    │  Spring Boot │              │  Spring Boot │ 
    └──────┬───────┘              └──────┬───────┘ 
           │                             │ 
           └──────────► Apache Kafka ◄────┘ 
                    (Event Bus + Schema Registry) 

  Observability: OpenTelemetry → Jaeger · Prometheus · Grafana 
  Infra: Docker Compose (dev) / Kubernetes (prod) 
``` 

--- 

## 4. Danh sách Kafka Topics & Event Schema 

### 4.1. Topics 
| Topic | Partition key | Producer | Consumer | 
|---|---|---|---| 
| `order-events` | orderId | Order | Payment, Inventory, Notification | 
| `payment-events` | orderId | Payment | Order (saga) | 
| `inventory-events` | orderId | Inventory | Order (saga) | 
| `delivery-events` | orderId | Delivery/Order | Notification | 
| `notification-events` | userId | nhiều service | Notification | 

### 4.2. Ví dụ Event Schema (JSON Schema) 

```json 
{ 
 "eventId": "uuid", 
 "eventType": "order.created", 
 "version": 1, 
 "occurredAt": "2026-07-22T16:00:00Z", 
 "tenantId": "tenant-abc", 
 "correlationId": "uuid", 
 "payload": { 
   "orderId": "ORD-1001", 
   "customerId": "CUST-55", 
   "items": [{ "sku": "PIZZA-01", "qty": 2, "price": 120000 }], 
   "totalAmount": 240000, 
   "currency": "VND" 
 } 
} 
``` 

> **Quy ước bắt buộc:** mọi event có `eventId` (idempotency), `correlationId` (tracing), `version` (schema evolution), `tenantId` (multi-tenant). 

--- 

## 5. Chi tiết từng Service 

### 5.1. Identity Service (.NET/ABP) 

**Trách nhiệm:** Quản lý user, tenant, role/permission, phát hành token OAuth2/OIDC (OpenIddict). 

**Kiến trúc nội bộ:** ABP Layered (DDD) 
``` 
src/ 
├── QuickBite.Identity.Domain/          # Entities: User, Tenant, Role 
│   ├── Users/ 
│   └── Tenants/ 
├── QuickBite.Identity.Domain.Shared/   # Consts, Enums, LocalizationKeys 
├── QuickBite.Identity.Application/      # AppServices, DTOs 
├── QuickBite.Identity.Application.Contracts/ 
├── QuickBite.Identity.EntityFrameworkCore/  # DbContext, Migrations 
├── QuickBite.Identity.HttpApi/          # Controllers 
└── QuickBite.Identity.HttpApi.Host/     # Startup, OpenIddict config 
``` 

**Tech:** ABP Framework, OpenIddict, EF Core, SQL Server, Redis (cache token/permission). 
**Event phát ra:** `user.registered`, `tenant.created`. 

---
### 5.2. Order Service (.NET/ABP) 

**Trách nhiệm:** Lõi nghiệp vụ đặt hàng; đóng vai **Saga Orchestrator**. 

**Domain model (DDD):** 
- Aggregate Root: `Order` 
- Entities: `OrderItem` 
- Value Objects: `Money`, `Address`, `OrderStatus` 
- Domain Events: `OrderCreated`, `OrderConfirmed`, `OrderCancelled` 

**Kiến trúc nội bộ:** 
``` 
src/ 
├── QuickBite.Order.Domain/ 
│   ├── Orders/ 
│   │   ├── Order.cs               # Aggregate Root 
│   │   ├── OrderItem.cs 
│   │   └── OrderManager.cs        # Domain Service 
│   └── Sagas/ 
│       └── OrderSagaStateMachine.cs  # MassTransit state machine 
├── QuickBite.Order.Application/ 
├── QuickBite.Order.EntityFrameworkCore/ 
│   └── Outbox/                    # Bảng OutboxMessage 
├── QuickBite.Order.HttpApi.Host/ 
└── QuickBite.Order.Kafka/         # Producers/Consumers 
``` 

**Tech:** ABP, MassTransit (Saga State Machine) + Kafka, EF Core, PostgreSQL. 
**Pattern áp dụng:** Saga (orchestration), Outbox, Inbox. 
**Event phát ra:** `order.created`, `order.confirmed`, `order.cancelled`. 
**Event tiêu thụ:** `payment.authorized/failed`, `stock.reserved/rejected`. 

--- 

### 5.3. Catalog Service (NestJS) 

**Trách nhiệm:** CRUD nhà hàng, danh mục, món ăn; quản lý đánh giá (reviews) món ăn & nhà hàng; cung cấp query cho Gateway. 

**Kiến trúc nội bộ (NestJS module-based):** 
``` 
src/ 
├── restaurant/ 
│   ├── restaurant.module.ts 
│   ├── restaurant.controller.ts 
│   ├── restaurant.service.ts 
│   └── entities/restaurant.entity.ts 
├── category/ 
├── food-item/ 
├── review/
│   ├── dto/
│   │   ├── create-review.dto.ts
│   │   └── update-review.dto.ts
│   ├── entities/
│   │   └── review.entity.ts
│   ├── review.controller.ts
│   ├── review.service.ts
│   └── review.module.ts
├── request/               # Trung tâm xử lý yêu cầu (Generic Request Center)
│   ├── dto/
│   │   ├── create-request.dto.ts
│   │   ├── process-request.dto.ts
│   │   └── query-request.dto.ts
│   ├── entities/
│   │   └── catalog-request.entity.ts
│   ├── enums/
│   │   └── request.enum.ts
│   ├── request.controller.ts
│   ├── request.service.ts
│   └── request.module.ts
├── common/           # Guards, Interceptors, Filters, DTOs
└── auth/             # JwtAuthGuard, PermissionGuard, CurrentUser decorator 
``` 

**Cơ sở dữ liệu & Entity:** PostgreSQL (TypeORM) / MongoDB document model linh hoạt:
- Hỗ trợ JSONB toppings/variants trong Food Items.
- Compound unique index chống spam đánh giá trong Reviews.
- **Generic Request System (JSONB):** Quản lý tập trung các loại yêu cầu của người dùng (`RESTAURANT_REGISTRATION`, `FOOD_REPORT`, `SYSTEM_FEEDBACK`) trong bảng `catalog_requests` với payload động dạng `jsonb`. Khi Admin phê duyệt yêu cầu đăng ký nhà hàng (`APPROVE`), hệ thống thực thi ACID Transaction để tự động khởi tạo bản ghi `Restaurant` (trạng thái `ACTIVE`) và cập nhật trạng thái yêu cầu (`APPROVED`). Nếu có lỗi xảy ra (ví dụ: trùng lặp slug nhà hàng), toàn bộ Transaction sẽ rollback để giữ nguyên trạng thái yêu cầu.
**Event phát ra:** `menu.updated`, `restaurant.status.changed`. 

--- 

### 5.4. Payment Service (Spring Boot)

**Trách nhiệm:** Uỷ quyền (authorize), thu tiền (capture), hoàn tiền (refund/void) — bước trong Saga. Triển khai **Mock Payment Gateway** (Sandbox UI) phục vụ môi trường Demo để mô phỏng kịch bản thanh toán thành công/thất bại mà không bị vướng rào cản pháp lý hoặc chi phí thực tế.

**Kiến trúc nội bộ (Hexagonal / Clean Architecture - Port & Adapter):**
```
src/main/java/com/quickbite/payment/
├── domain/
│   ├── model/Payment.java
│   └── model/{PaymentStatus, PaymentMethod}.java
├── application/
│   ├── service/PaymentApplicationService.java
│   └── port/
│       ├── in/{ProcessPaymentUseCase, CreatePaymentCommand}.java
│       └── out/{PaymentPersistencePort, PaymentGatewayPort}.java
├── adapter/
│   ├── in/kafka/OrderEventConsumer.java
│   ├── in/web/PaymentController.java          # REST API & Mock Process Endpoint
│   ├── out/gateway/MockPaymentAdapter.java    # Sandbox Gateway Simulation
│   └── out/persistence/PaymentPersistenceAdapter.java # PostgreSQL JPA
└── config/
```

**Tech:** Spring Boot 3, Spring Kafka, Spring Data JPA, PostgreSQL, SpringDoc OpenAPI.
**Pattern:** Outbox, Inbox (idempotency theo `eventId`), Hexagonal Architecture.
**Event tiêu thụ:** `order-events` (`OrderWaitingPaymentEto`).
**Event phát ra:** `fulfillment-events` / `payment-events` (`PaymentCompletedEto`, `PaymentFailedEto`).

--- 

### 5.5. Inventory Service (Spring Boot)

**Trách nhiệm:** Giữ chỗ nguyên liệu (reserve), nhả chỗ (release) khi Saga compensation.

**Kiến trúc:** giống Hexagonal như Payment. 
``` 
src/main/java/com/quickbite/inventory/ 
├── domain/model/{StockItem, Reservation}.java 
├── application/ReserveStockUseCase.java 
├── adapter/in/kafka/OrderEventConsumer.java 
└── adapter/out/persistence/   # Optimistic Locking (@Version) 
``` 

**Tech:** Spring Boot, Spring Kafka, JPA + **Optimistic Locking** (`@Version`) chống race condition khi trừ kho. 
**Event tiêu thụ:** `order.created`, `order.cancelled`. 
**Event phát ra:** `stock.reserved`, `stock.rejected`, `stock.released`. 

--- 

### 5.6. Notification Service (NestJS) 

**Trách nhiệm:** Gửi email/SMS/push + realtime cập nhật trạng thái đơn qua WebSocket.
 
**Kiến trúc nội bộ:**
```
src/
├── channels/
│   ├── email/       # SMTP / SendGrid
│   ├── sms/
│   └── push/        # FCM
├── realtime/
│   └── notification.gateway.ts   # @WebSocketGateway (Socket.io)
├── kafka/
│   └── notification.consumer.ts  # nghe mọi *-events
└── templates/       # Handlebars templates
```
 
**Tech:** NestJS, Socket.io (WS), Kafka consumer, BullMQ (retry gửi), Redis.
**Vì sao NestJS:** event-driven + realtime bẩm sinh, xử lý I/O bất đồng bộ hiệu quả.
**Event tiêu thụ:** tất cả `order-events`, `payment-events`, `delivery-events`.
 
---
 
### 5.7. API Gateway / BFF (NestJS)
 
**Trách nhiệm:** Điểm vào duy nhất, xác thực token, rate-limit, aggregation, forward request.
 
**Kiến trúc:**
```
src/
├── auth/            # Verify JWT từ Identity (JWKS)
├── proxy/           # Route tới từng service
├── aggregation/     # BFF: gộp dữ liệu nhiều service cho 1 màn hình
├── common/          # Rate limiter, logging, correlationId middleware
└── graphql/         # (tuỳ chọn) schema stitching
```
 
**Tech:** NestJS, `@nestjs/throttler` (rate-limit), http-proxy, JWKS validation.
**Lưu ý:** Gateway **không** chứa business logic; chỉ orchestration ở tầng edge.
 
---
 
## 6. Các Pattern nâng cao
 
### 6.1. Saga Pattern (Orchestration) — luồng đặt hàng
```
[Order] OrderCreated
   │
   ├─1─► Reserve Stock (Inventory) ──► stock.reserved ✅ / stock.rejected ❌
   │
   ├─2─► Authorize Payment (Payment) ─► payment.authorized ✅ / payment.failed ❌
   │
   └─3─► Confirm Order ──► order.confirmed
 
  ❌ Nếu bất kỳ bước nào FAIL → Compensation (ngược lại):
       Void Payment  →  Release Stock  →  Cancel Order
```
- Triển khai bằng **MassTransit State Machine** trên Order Service (.NET).
- Mỗi bước có **timeout** → nếu quá hạn, kích hoạt compensation.
 
### 6.2. Outbox Pattern
- Ghi business data + `OutboxMessage` trong **cùng 1 transaction**.
- Background worker (ABP `BackgroundWorker` / Spring `@Scheduled`) đọc Outbox → publish Kafka → đánh dấu `Processed`.
- **Mục tiêu:** không mất event khi crash giữa commit DB và publish.
 
### 6.3. Inbox Pattern (Idempotency)
- Consumer lưu `eventId` đã xử lý vào bảng `InboxMessage`.
- Trước khi xử lý → check tồn tại → bỏ qua nếu trùng.
- **Mục tiêu:** an toàn với Kafka "at-least-once delivery".
 
### 6.4. Bảng minh hoạ Outbox / Inbox
| Cột | Outbox | Inbox |
|---|---|---|
| Id | PK | PK |
| EventId | uuid | uuid (unique) |
| Type | order.created | order.created |
| Payload | JSON | JSON |
| Status | Pending/Processed/Failed | Processed |
| CreatedAt / ProcessedAt | ✔ | ✔ |
---
 
## 7. Cross-cutting concerns
 
| Mối quan tâm | Giải pháp |
|---|---|
| **Observability** | OpenTelemetry SDK trên cả 3 stack → Jaeger (trace), Prometheus + Grafana (metrics) |
| **Correlation** | `correlationId` truyền qua HTTP header & Kafka header xuyên suốt |
| **Config & Secrets** | Kubernetes ConfigMap/Secret, hoặc Consul KV |
| **Service Discovery** | Kubernetes DNS native |
| **Resilience** | Retry + Dead-Letter Topic (Kafka), Circuit Breaker (Resilience4j / Polly) |
| **Security** | mTLS nội bộ (service mesh tuỳ chọn), JWT validation ở Gateway |
| **Schema Evolution** | Confluent Schema Registry + backward-compatible rules |
| **Logging** | Structured logging (Serilog / Winston / Logback) → ELK/Loki |
 
---
 
## 8. Lộ trình triển khai
 
| Phase | Mục tiêu | Deliverable |
|---|---|---|
| **1. Nền tảng** | Identity + Order chạy sync | 2 service .NET, auth hoạt động |
| **2. Kafka & EDD** | Tách Notification, giao tiếp event | Kafka cluster, topic đầu tiên |
| **3. Saga** | Thêm Payment + Inventory (Spring), Saga + Outbox | Luồng đặt hàng end-to-end |
| **4. Resilience** | Inbox/idempotency, retry, DLQ, circuit breaker | Hệ thống chịu lỗi |
| **5. Observability + K8s** | Tracing xuyên service, deploy K8s | Grafana dashboard, Helm charts |
 
---
## 📦 Phụ lục: Cấu trúc thư mục repo (mono-repo gợi ý)
 
```
quickbite/
├── services/
│   ├── identity/          # .NET/ABP
│   ├── order/             # .NET/ABP
│   ├── catalog/           # NestJS
│   ├── payment/           # Spring Boot
│   ├── inventory/         # Spring Boot
│   ├── notification/      # NestJS
│   └── gateway/           # NestJS
├── shared/
│   ├── proto/             # gRPC contracts (nếu dùng)
│   └── event-schemas/     # JSON/Avro schemas
├── infra/
│   ├── docker-compose.yml
│   ├── kafka/
│   └── k8s/               # Helm charts / manifests
└── docs/
    └── architecture.md
```
 
---
 
> 📝 **Ghi chú học tập:** Tài liệu này bao trùm DDD, Saga, Outbox/Inbox, Kafka EDD và MassTransit — phù hợp làm nền tảng lý thuyết trước khi bắt tay code. Nên đọc theo thứ tự: Section 3 → 6 → 5 để hiểu bức tranh lớn trước khi đi vào chi tiết từng service.