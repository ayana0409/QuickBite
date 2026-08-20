# QuickBite Services – API Endpoints, Input & Output

> **Ghi chú chung về Format Response:**
> Ngoại trừ service **Identity**, tất cả các endpoint của các service còn lại đều trả về response được bọc trong một wrapper chung (Global Response Wrapper). 
> 
> **Dạng thành công (Success - 2xx):**
> ```json
> {
>     "success": true,
>     "statusCode": 200,
>     "message": "Success.",
>     "data": { ... }, // Dữ liệu trả về thực tế sẽ nằm ở field data này
>     "timestamp": "2026-08-12T02:33:12.738Z",
>     "path": "/restaurants/d92f82d1-d04d-4d2b-9a31-ee157a06f644"
> }
> ```
> 
> **Dạng lỗi (Error - 4xx/5xx):**
> ```json
> {
>     "success": false,
>     "statusCode": 404,
>     "message": "Restaurant not found.",
>     "errors": null,
>     "timestamp": "2026-08-12T02:33:40.803Z",
>     "path": "/restaurants/d92f82d1-d04d-4d2b-9a31-ee157a06f643"
> }
> ```

> **Ghi chú chung về phân trang (Catalog Service):**
> Các endpoint trả về danh sách đều hỗ trợ query params phân trang: `?page=1&limit=10&search=...&categoryId=...`
> Response dạng phân trang (dữ liệu phân trang nằm trong field `data` của wrapper chung ở trên):
> ```json
> {
>   "data": [...],
>   "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
> }
> ```

---

## 1. Catalog Service (`quick-bite-catalog` — NestJS, port 3000)

---

### 📁 Restaurant API — `/restaurants`

#### `POST /restaurants`
**Auth:** JWT + Permission `RESTAURANT_CREATE`

**Request Body:**
```json
{
  "ownerId": "uuid",
  "name": "Tên nhà hàng",
  "slug": "ten-nha-hang",
  "address": {
    "line1": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "geo": {
      "type": "Point",
      "coordinates": [106.6297, 10.8231]
    }
  }
}
```

**Response** `201`:
```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "name": "Tên nhà hàng",
  "slug": "ten-nha-hang",
  "address": { "line1": "...", "ward": "...", "district": "...", "city": "...", "geo": { "type": "Point", "coordinates": [106.6, 10.8] } },
  "status": "closed",
  "rating": { "avg": 0, "count": 0 },
  "createdAt": "2026-08-12T...",
  "updatedAt": "2026-08-12T..."
}
```

---

#### `GET /restaurants`
**Query Params:** `?page=1&limit=10&search=...&ownerId=uuid`

**Response** `200`: Phân trang danh sách Restaurant (đầy đủ các field).

---

#### `GET /restaurants/me`
*Lấy thông tin nhà hàng thuộc quyền sở hữu của Merchant đang đăng nhập (Trích xuất `userId` từ JWT token).*
**Auth:** Bearer JWT

**Response** `200`: Object `Restaurant` hoặc 404 nếu chưa có nhà hàng.

---

#### `PUT /restaurants/me` (hoặc `PATCH /restaurants/me`)
*Cập nhật tên, trạng thái hoạt động (open/closed), và địa chỉ của nhà hàng thuộc sở hữu của Merchant đang đăng nhập.*
**Auth:** Bearer JWT

**Request Body:**
```json
{
  "name": "Tên nhà hàng mới",
  "status": "open",
  "address": {
    "line1": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  }
}
```

**Response** `200`: Object `Restaurant` sau khi cập nhật.

---

#### `GET /restaurants/owner/:ownerId`
**Params:** `ownerId: string`

**Response** `200`: Một object Restaurant hoặc `null`.

---

#### `GET /restaurants/:id`
**Auth:** JWT + Permission `RESTAURANT_READ`
**Params:** `id: UUID v4`

**Response** `200`:
```json
{
  "id": "uuid",
  "name": "Tên nhà hàng",
  "categories": [
    { "id": "uuid", "name": "Pizza" }
  ]
}
```
> *Chỉ trả về `id`, `name` của restaurant và danh sách `categories` (id + name).*

---

#### `PATCH /restaurants/:id`
**Auth:** JWT + Permission `RESTAURANT_UPDATE`
**Params:** `id: UUID v4`

**Request Body** *(tất cả optional)*:
```json
{
  "name": "Tên mới",
  "slug": "slug-moi",
  "address": { "line1": "...", "ward": "...", "district": "...", "city": "...", "geo": { "type": "Point", "coordinates": [...] } }
}
```

**Response** `200`: Object Restaurant đầy đủ sau khi cập nhật.

---

#### `DELETE /restaurants/:id`
**Auth:** JWT + Permission `RESTAURANT_DELETE`
**Params:** `id: UUID v4`

**Response** `200`: `undefined` (void)

---

### 📁 Category API — `/categories`

#### `POST /categories`
**Auth:** JWT + Permission `CATEGORY_CREATE`

**Request Body:**
```json
{
  "restaurantId": "uuid",
  "name": "Pizza",
  "sortOrder": 1
}
```

**Response** `201`:
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Pizza",
  "sortOrder": 1,
  "createdAt": "2026-08-12T...",
  "updatedAt": "2026-08-12T..."
}
```

---

#### `GET /categories`
**Auth:** JWT + Permission `CATEGORY_READ`
**Query Params:** `?page=1&limit=10&search=...`

**Response** `200`: Phân trang danh sách Category.

---

#### `GET /categories/:id`
**Auth:** JWT + Permission `CATEGORY_READ`
**Params:** `id: UUID v4`

**Response** `200`:
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Pizza",
  "sortOrder": 1,
  "createdAt": "...",
  "updatedAt": "...",
  "restaurant": { "id": "uuid", "name": "Tên nhà hàng", "slug": "...", "ownerId": "...", "status": "..." }
}
```
> *Load kèm relation `restaurant`.*

---

#### `PATCH /categories/:id`
**Auth:** JWT + Permission `CATEGORY_UPDATE`
**Params:** `id: UUID v4`

**Request Body** *(tất cả optional)*:
```json
{
  "name": "Tên mới",
  "sortOrder": 2
}
```

**Response** `200`: Object Category đầy đủ sau khi cập nhật.

---

#### `DELETE /categories/:id`
**Auth:** JWT + Permission `CATEGORY_DELETE`
**Params:** `id: UUID v4`

**Response** `200`: `undefined` (void)

---

### 📁 Admin Category Moderation API — `/admin/categories`

#### `GET /admin/categories`
*Lấy danh sách tất cả danh mục món ăn trong toàn hệ thống kèm thông tin nhà hàng phục vụ công tác kiểm duyệt của Admin.*
**Auth:** JWT + Permission `CATEGORY_MODERATION` (`Catalog.Categories.Moderation`)
**Query Params:** `?page=1&limit=10&search=...`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "restaurantId": "uuid",
      "name": "Pizza",
      "sortOrder": 1,
      "createdAt": "2026-08-12T...",
      "updatedAt": "2026-08-12T...",
      "restaurant": {
        "id": "uuid",
        "name": "Pizza Hut",
        "slug": "pizza-hut"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### `PUT /admin/categories/:id/rename`
*Đổi tên danh mục món ăn khi vi phạm quy chuẩn từ ngữ.*
**Auth:** JWT + Permission `CATEGORY_MODERATION` (`Catalog.Categories.Moderation`)
**Params:** `id: UUID v4`

**Request Body:**
```json
{
  "newName": "Tên danh mục mới đã chuẩn hóa"
}
```

**Response** `200`:
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Tên danh mục mới đã chuẩn hóa",
  "sortOrder": 1,
  "createdAt": "2026-08-12T...",
  "updatedAt": "2026-08-12T..."
}
```

---

### 📁 Food Item API — `/food-items`

#### `POST /food-items`
**Auth:** JWT + Permission `FOOD_ITEM_CREATE`

**Request Body:**
```json
{
  "categoryId": "uuid",
  "restaurantId": "uuid",
  "sku": "PIZZA-001",
  "name": "Pizza Margherita",
  "description": "Pizza cổ điển Italy",
  "price": 120000,
  "currency": "VND",
  "images": ["https://..."],
  "isAvailable": true,
  "preparationTime": 20,
  "tags": ["italian", "cheese"],
  "totalSold": 0,
  "variants": [
    { "name": "Size L", "priceDelta": 30000 }
  ],
  "toppings": [
    { "name": "Extra Cheese", "price": 15000 }
  ]
}
```

**Response** `201`: Object FoodItem đầy đủ (tất cả các field).

---

#### `GET /food-items`
**Auth:** JWT + Permission `FOOD_ITEM_READ`
**Query Params:** `?page=1&limit=10&search=...`

**Response** `200`: Phân trang với các field được select:
```json
{
  "data": [
    { "id": "uuid", "name": "...", "price": 0, "currency": "VND", "images": [], "isAvailable": true, "totalSold": 0, "rating": 0, "reviewCount": 0, "restaurantId": "uuid", "categoryId": "uuid" }
  ],
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

---

#### `GET /food-items/:id`
**Auth:** JWT + Permission `FOOD_ITEM_READ`
**Params:** `id: string`

**Response** `200`: Object FoodItem đầy đủ tất cả các field (bao gồm `rating`, `reviewCount`, `variants`, `toppings`, `description`, `tags`, `sku`...).

---

#### `GET /food-items/restaurant/:restaurantId`
**Auth:** JWT + Permission `FOOD_ITEM_READ`
**Params:** `restaurantId: string`
**Query Params:** `?page=1&limit=10&search=...&categoryId=uuid (hoặc 'ALL')`

**Response** `200`: Phân trang với fields: `id, name, price, currency, images, isAvailable, totalSold, rating, reviewCount, categoryId, restaurantId`.

---

#### `GET /food-items/category/:categoryId`
**Auth:** JWT + Permission `FOOD_ITEM_READ`
**Params:** `categoryId: string`
**Query Params:** `?page=1&limit=10&search=...`

**Response** `200`: Phân trang với fields: `id, name, price, currency, images, isAvailable, totalSold, rating, reviewCount`.

---

#### `PATCH /food-items/:id`
**Auth:** JWT + Permission `FOOD_ITEM_UPDATE`
**Params:** `id: string`

**Request Body** *(tất cả optional, partial của CreateFoodItemDto)*:
```json
{
  "name": "Tên mới",
  "price": 150000,
  "isAvailable": false
}
```

**Response** `200`: Object FoodItem đầy đủ sau khi cập nhật.

---

#### `PATCH /food-items/:id/images`
**Auth:** JWT + Permission `FOOD_ITEM_UPDATE`
**Params:** `id: string`

**Request Body:**
```json
{
  "images": ["https://url1.jpg", "https://url2.jpg"]
}
```

**Response** `200`: `undefined` (void)

---

#### `PATCH /food-items/:id/variants`
**Auth:** JWT + Permission `FOOD_ITEM_UPDATE`
**Params:** `id: string`

**Request Body:**
```json
{
  "variants": [
    { "name": "Size M", "priceDelta": 0 },
    { "name": "Size L", "priceDelta": 30000 }
  ]
}
```

**Response** `200`: `undefined` (void)

---

#### `PATCH /food-items/:id/toppings`
**Auth:** JWT + Permission `FOOD_ITEM_UPDATE`
**Params:** `id: string`

**Request Body:**
```json
{
  "toppings": [
    { "name": "Extra Cheese", "price": 15000 },
    { "name": "Mushroom", "price": 10000 }
  ]
}
```

**Response** `200`: `undefined` (void)

---

#### `DELETE /food-items/:id`
**Auth:** JWT + Permission `FOOD_ITEM_DELETE`
**Params:** `id: string`

**Response** `200`: `undefined` (void)

---

### 📁 Review API — `/reviews`

#### `POST /reviews/batch`
*Đánh giá món ăn theo danh sách (batch) cho một đơn hàng đã hoàn tất.*

**Auth:** Bearer JWT (yêu cầu người dùng đăng nhập)

**Request Body:**
```json
{
  "orderId": "order-uuid-or-string",
  "restaurantId": "restaurant-uuid-or-string",
  "items": [
    {
      "foodItemId": "food-item-uuid-1",
      "rating": 5,
      "comment": "Món ăn rất ngon, giao nhanh và nóng hổi!"
    },
    {
      "foodItemId": "food-item-uuid-2",
      "rating": 4,
      "comment": "Hương vị vừa miệng."
    }
  ]
}
```

**Response** `201`:
```json
[
  {
    "id": "review-uuid-1",
    "orderId": "order-uuid-or-string",
    "restaurantId": "restaurant-uuid-or-string",
    "foodItemId": "food-item-uuid-1",
    "userId": "user-uuid",
    "rating": 5,
    "comment": "Món ăn rất ngon, giao nhanh và nóng hổi!",
    "createdAt": "2026-08-19T07:04:00.000Z",
    "updatedAt": "2026-08-19T07:04:00.000Z"
  },
  {
    "id": "review-uuid-2",
    "orderId": "order-uuid-or-string",
    "restaurantId": "restaurant-uuid-or-string",
    "foodItemId": "food-item-uuid-2",
    "userId": "user-uuid",
    "rating": 4,
    "comment": "Hương vị vừa miệng.",
    "createdAt": "2026-08-19T07:04:00.000Z",
    "updatedAt": "2026-08-19T07:04:00.000Z"
  }
]
```

**Lỗi thường gặp:**
- `401 Unauthorized`: Thiếu hoặc sai JWT token.
- `409 Conflict`: `{"statusCode": 409, "message": "Món ăn trong đơn hàng này đã được đánh giá"}` (Chống spam/đánh giá trùng lặp cùng `orderId` và `foodItemId`).

---

#### `GET /reviews/restaurants/:restaurantId`
*Lấy danh sách đánh giá của một nhà hàng có phân trang, sắp xếp theo thời gian tạo mới nhất.*

**Params:** `restaurantId: string`
**Query Params:** `?page=1&limit=10`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "review-uuid",
      "orderId": "order-uuid-1",
      "restaurantId": "restaurant-uuid",
      "foodItemId": "food-item-uuid-1",
      "userId": "user-uuid",
      "rating": 5,
      "comment": "Món ăn tuyệt vời!",
      "createdAt": "2026-08-19T07:04:00.000Z",
      "updatedAt": "2026-08-19T07:04:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### `GET /reviews/food-items/:foodItemId`
*Lấy danh sách đánh giá của một món ăn cụ thể có phân trang, sắp xếp theo thời gian tạo mới nhất.*

**Params:** `foodItemId: string`
**Query Params:** `?page=1&limit=10`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "review-uuid",
      "orderId": "order-uuid-1",
      "restaurantId": "restaurant-uuid",
      "foodItemId": "food-item-uuid-1",
      "userId": "user-uuid",
      "rating": 5,
      "comment": "Món ăn rất ngon, giòn và vừa miệng!",
      "createdAt": "2026-08-19T07:04:00.000Z",
      "updatedAt": "2026-08-19T07:04:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 2. Inventory Service (`quick-bite-inventory` — Spring Boot)

Base path: `/api/v1/inventory`

---

#### `GET /api/v1/inventory`

**Response** `200`:
```json
[
  {
    "id": "uuid",
    "foodItemId": "uuid",
    "quantity": 100,
    "reservedQuantity": 5,
    "availableQuantity": 95,
    "createdAt": "2026-08-12T...",
    "updatedAt": "2026-08-12T..."
  }
]
```

---

#### `GET /api/v1/inventory/{foodItemId}`
**Params:** `foodItemId: UUID`

**Response** `200`: Một object `InventoryItemResponse` (xem cấu trúc ở trên).

---

#### `GET /api/v1/inventory/restaurant/{restaurantId}`
*Lấy danh sách tồn kho theo nhà hàng (trả về tất cả món ăn của nhà hàng kèm theo số lượng tồn kho).*

**Params:** `restaurantId: UUID`
**Query Params:** `?page=1&limit=10&categoryId=uuid&search=...`

**Response** `200`: Phân trang danh sách `InventoryItemResponse`.
```json
{
  "totalPages": 1,
  "totalElements": 1,
  "size": 10,
  "content": [
    {
      "id": "uuid",
      "foodItemId": "uuid",
      "name": "Tên món ăn",
      "quantity": 0,
      "reservedQuantity": 0,
      "availableQuantity": 0,
      "createdAt": null,
      "updatedAt": null
    }
  ],
  "number": 0
}
```

---

#### `POST /api/v1/inventory`
*Khởi tạo mới hoặc thiết lập lại số lượng tuyệt đối.*

**Request Body:**
```json
{
  "foodItemId": "uuid",
  "quantity": 100
}
```

**Response** `201`: Object `InventoryItemResponse`.

---

#### `POST /api/v1/inventory/adjust`
*Cộng/trừ số lượng tồn kho (số dương = thêm, số âm = giảm).*

**Request Body:**
```json
{
  "foodItemId": "uuid",
  "adjustmentQuantity": -5
}
```

**Response** `200`: Object `InventoryItemResponse` sau khi điều chỉnh.

---

#### `DELETE /api/v1/inventory/{foodItemId}`
**Params:** `foodItemId: UUID`

**Response** `204`: No Content

---

## 3. Payment Service (`quick-bite-payment` — Spring Boot)

Base path: `/v1/payments`

---

#### `POST /v1/payments`
*Tạo phiên thanh toán mới.*

**Request Body:**
```json
{
  "orderId": "uuid",
  "customerId": "uuid",
  "amount": 250000.00,
  "method": "CASH | VNPAY | MOMO | BANK_TRANSFER"
}
```

**Response** `200`:
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "customerId": "uuid",
  "amount": 250000.00,
  "status": "PENDING | SUCCESS | FAILED | REFUNDED",
  "method": "CASH",
  "transactionId": "TXN_...",
  "paymentUrl": "https://...",
  "failureReason": null,
  "createdAt": "2026-08-12T...",
  "updatedAt": "2026-08-12T..."
}
```

---

#### `GET /v1/payments/{id}`
**Params:** `id: UUID`

**Response** `200`: Object `PaymentResponseDto` (xem cấu trúc ở trên).

---

#### `GET /v1/payments/order/{orderId}`
**Params:** `orderId: UUID`

**Response** `200`: Object `PaymentResponseDto` của đơn hàng đó.

---

#### `POST /v1/payments/{id}/mock-process`
*Giả lập kết quả thanh toán từ Sandbox UI.*
**Params:** `id: UUID`

**Request Body:**
```json
{
  "success": true,
  "failureReason": null
}
```

**Response** `200`: Object `PaymentResponseDto` sau khi xử lý (status đã cập nhật).

---

## 4. Order Service (`quick-bite-order` — .NET / ABP Framework)

> ABP tự động generate route dạng `/api/app/order` từ `IOrderAppService`.
> Các phương thức `Task<T>` → `GET`, `Task Create/Update` → `POST/PUT`, method có `Id` → route `/{id}`.

---

#### `POST /api/app/order`
*Tạo đơn hàng mới.*

**Request Body:**
```json
{
  "restaurantId": "uuid",
  "customerId": "uuid",
  "deliveryAddress": {
    "receiverName": "Nguyễn Văn A",
    "phoneNumber": "0901234567",
    "addressLine": "123 Đường XYZ",
    "ward": "Phường 1",
    "district": "Quận 1",
    "province": "TP. Hồ Chí Minh",
    "note": "Gõ chuông khi đến"
  },
  "items": [
    {
      "foodItemId": "uuid",
      "quantity": 2,
      "selectedVariantName": "Size L",
      "selectedToppings": ["Extra Cheese", "Mushroom"]
    }
  ]
}
```

**Response** `200`: Object `OrderDto`:
```json
{
  "id": "uuid",
  "orderCode": "ORD-2026-XXXXX",
  "customerId": "uuid",
  "restaurantId": "uuid",
  "status": "Draft | Submitted | Confirmed | Preparing | Delivering | Delivered | Cancelled | Refunded",
  "totalAmount": 250000.00,
  "deliveryAddress": { "receiverName": "...", "phoneNumber": "...", "addressLine": "...", "ward": "...", "district": "...", "province": "...", "note": "..." },
  "items": [
    { "foodItemId": "uuid", "foodName": "Pizza Margherita", "quantity": 2, "unitPrice": 120000, "totalPrice": 240000, "selectedVariantName": "Size L", "selectedToppings": ["Extra Cheese"] }
  ],
  "creationTime": "2026-08-12T..."
}
```

---

#### `GET /api/app/order/{id}`
**Params:** `id: UUID`

**Response** `200`: Object `OrderDto` đầy đủ (xem cấu trúc ở trên).

---

#### `PUT /api/app/order/{id}`
*Cập nhật đơn hàng (chỉ khi còn ở trạng thái Draft).*
**Params:** `id: UUID`

**Request Body:**
```json
{
  "deliveryAddress": { "receiverName": "...", "phoneNumber": "...", "addressLine": "...", "ward": "...", "district": "...", "province": "..." },
  "items": [
    { "foodItemId": "uuid", "quantity": 3, "selectedVariantName": null, "selectedToppings": [] }
  ]
}
```

**Response** `200`: Object `OrderDto` sau khi cập nhật.

---

#### `GET /api/app/order/my-orders`
*Lấy danh sách đơn hàng của người dùng hiện tại.*

**Response** `200`: `OrderDto[]`

---

#### `GET /api/app/order/by-restaurant`
*Lấy danh sách đơn hàng theo nhà hàng (dành cho Merchant / Aggregation).*

**Query Params:** `?restaurantId=uuid&status=...&search=...&skipCount=0&maxResultCount=10`

**Response** `200`: `PagedResultDto<OrderDto>`
```json
{
  "totalCount": 25,
  "items": [
    {
      "id": "uuid",
      "orderCode": "ORD-2026-XXXXX",
      "customerId": "uuid",
      "restaurantId": "uuid",
      "status": "Draft | Submitted | Confirmed | Preparing | Delivering | Delivered | Cancelled | Refunded",
      "totalAmount": 250000.00,
      "deliveryAddress": { "receiverName": "...", "phoneNumber": "...", "addressLine": "...", "ward": "...", "district": "...", "province": "...", "note": "..." },
      "items": [
        { "foodItemId": "uuid", "foodName": "Pizza Margherita", "quantity": 2, "unitPrice": 120000, "totalPrice": 240000, "selectedVariantName": "Size L", "selectedToppings": ["Extra Cheese"] }
      ],
      "creationTime": "2026-08-12T..."
    }
  ]
}
```

---

#### `POST /api/app/order/{id}/submit`
*Xác nhận đặt đơn (chuyển trạng thái Draft → Submitted).*
**Params:** `id: UUID`

**Response** `200`: `void`

---

#### `PUT /api/app/order/{id}/status`
*Cập nhật trạng thái đơn hàng (dành cho Admin/Staff).*
**Params:** `id: UUID`

**Request Body:**
```json
{
  "status": "Confirmed | Preparing | Delivering | Delivered | Cancelled",
  "note": "Lý do hoặc ghi chú"
}
```

**Response** `200`: Object `OrderDto` sau khi cập nhật.

---

#### `POST /api/app/order/{id}/cancel`
*Hủy đơn hàng.*
**Params:** `id: UUID`

**Response** `200`: `void`

---

#### `POST /api/app/order/{id}/refund`
*Yêu cầu hoàn tiền.*
**Params:** `id: UUID`

**Request Body** *(optional)*:
```json
{
  "reason": "Lý do hoàn tiền"
}
```

**Response** `200`: `void`

---

## 5. Identity Service (`quick-bite-identity` — .NET / ABP Framework)

> ABP sử dụng OpenIddict làm Authorization Server. Các endpoint CRUD dưới đây được generate tự động từ các Application Service.

---

### 🔐 Auth API — `/api/app/auth`

#### `POST /api/app/auth/login`

**Request Body:**
```json
{
  "userNameOrEmailAddress": "admin@quickbite.vn",
  "password": "P@ssword123",
  "rememberMe": false
}
```

**Response** `200`:
```json
{
  "token": "eyJhbGciOi...",
  "expireIn": 3600
}
```

---

### 👤 Account API — `/api/app/account`

#### `GET /api/app/account`
**Query Params** *(từ `GetIdentityUsersInput`)*: `?filter=...&roleId=...&sorting=...&skipCount=0&maxResultCount=10`

**Response** `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "userName": "john.doe",
      "name": "John",
      "surname": "Doe",
      "email": "john@quickbite.vn",
      "phoneNumber": "0901234567",
      "isActive": true,
      "creationTime": "2026-08-12T..."
    }
  ],
  "totalCount": 1
}
```

---

#### `GET /api/app/account/{id}`
**Params:** `id: UUID`

**Response** `200`: Một object `IdentityUserDto`.

---

#### `GET /api/app/account/role`
*Lấy tất cả roles hiện có.*

**Response** `200`: `IdentityRoleDto[]`
```json
[
  { "id": "uuid", "name": "Admin", "isDefault": false, "isStatic": true, "isPublic": true }
]
```

---

#### `GET /api/app/account/{id}/role`
*Lấy danh sách tên role của một user.*
**Params:** `id: UUID`

**Response** `200`: `string[]` — ví dụ `["Admin", "Staff"]`

---

#### `POST /api/app/account`
*Tạo tài khoản người dùng mới.*

**Request Body** (`IdentityUserCreateDto`):
```json
{
  "userName": "john.doe",
  "name": "John",
  "surname": "Doe",
  "email": "john@quickbite.vn",
  "phoneNumber": "0901234567",
  "password": "P@ssword123",
  "isActive": true,
  "roleNames": ["Staff"]
}
```

**Response** `200`: Object `IdentityUserDto`.

---

#### `PUT /api/app/account/{id}`
*Cập nhật thông tin tài khoản.*
**Params:** `id: UUID`

**Request Body** (`IdentityUserUpdateDto`):
```json
{
  "userName": "john.doe.updated",
  "name": "John",
  "surname": "Doe",
  "email": "john@quickbite.vn",
  "phoneNumber": "0901234567",
  "isActive": true,
  "roleNames": ["Admin"]
}
```

**Response** `200`: Object `IdentityUserDto` sau khi cập nhật.

---

#### `PUT /api/app/account/{id}/user-roles`
*Cập nhật toàn bộ danh sách role cho một user.*
**Params:** `id: UUID`

**Request Body:**
```json
["Admin", "Staff"]
```

**Response** `200`: `void`

---

#### `DELETE /api/app/account/{id}`
**Params:** `id: UUID`

**Response** `200`: `void`

---

### 👤 My Profile API — `/api/app/my-profile` (Self-Service)

> Endpoints cho phép người dùng tự xem, cập nhật thông tin cá nhân và đổi mật khẩu an toàn. 
> Hệ thống **tự động trích xuất `userId` từ JWT Token** (`CurrentUser.Id`), **chống lỗi IDOR 100%**.

#### `GET /api/app/my-profile`
*Lấy thông tin tài khoản của user đang đăng nhập.*
**Auth:** Bearer JWT

**Response** `200`:
```json
{
  "id": "uuid",
  "userName": "customer_demo",
  "email": "customer@quickbite.vn",
  "name": "Nguyễn",
  "surname": "Văn A",
  "phoneNumber": "0901234567",
  "phoneNumberConfirmed": false,
  "emailConfirmed": true
}
```

---

#### `PUT /api/app/my-profile`
*Cập nhật thông tin cá nhân (UserName, PhoneNumber, Name, Surname) của user đang đăng nhập.*
**Auth:** Bearer JWT

**Request Body:**
```json
{
  "userName": "customer_updated",
  "phoneNumber": "0912345678",
  "name": "Nguyễn",
  "surname": "Văn B"
}
```

**Response** `200`: Object `MyProfileDto` sau khi cập nhật.

---

#### `POST /api/app/my-profile/change-password`
*Đổi mật khẩu cho user đang đăng nhập.*
**Auth:** Bearer JWT

**Request Body:**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@456"
}
```

**Response** `200`: `void`

---

## 6. API Gateway Aggregation Services (`quick-bite-api-gateway` — NestJS, port 3000)

> Các endpoint Aggregation trên API Gateway giúp tự động xử lý bảo mật chống lỗi IDOR và tổng hợp dữ liệu từ nhiều microservices.

---

### 🏪 Merchant API — `/merchant`

#### `GET /merchant/orders`
*Lấy danh sách đơn hàng cho Merchant hiện tại (Bảo mật chống lỗi IDOR).*
*API Gateway tự động trích xuất `userId` từ JWT Token -> gọi Catalog Service lấy `restaurantId` -> query Order Service.*

**Auth:** JWT Bearer Token (Bắt buộc)

**Query Params:** `?status=...&search=...&page=1&limit=10`

**Response** `200`: `PagedResultDto<OrderDto>`
```json
{
  "totalCount": 25,
  "items": [
    {
      "id": "uuid",
      "orderCode": "ORD-2026-XXXXX",
      "customerId": "uuid",
      "restaurantId": "uuid",
      "status": "Confirmed",
      "totalAmount": 250000.00,
      "deliveryAddress": {
        "receiverName": "...",
        "phoneNumber": "...",
        "addressLine": "...",
        "ward": "...",
        "district": "...",
        "province": "...",
        "note": "..."
      },
      "items": [
        {
          "foodItemId": "uuid",
          "foodName": "Pizza Margherita",
          "quantity": 2,
          "unitPrice": 120000,
          "totalPrice": 240000,
          "selectedVariantName": "Size L",
          "selectedToppings": ["Extra Cheese"]
        }
      ],
      "creationTime": "2026-08-12T..."
    }
  ]
}
```

#### `GET /merchant/dashboard`
*Lấy toàn bộ số liệu thống kê Dashboard tổng hợp thời gian thực cho Merchant (Doanh thu hôm nay, KPI so sánh với hôm qua, Biểu đồ doanh thu 7 ngày, Phân loại lý do hủy, 5 đơn hàng mới nhất).*
*API Gateway tự động trích xuất `userId` từ JWT -> gọi Catalog Service lấy `restaurantId` + Đánh giá sao (`rating.avg`) -> gọi Order Service tính toán dữ liệu tổng hợp.*

**Auth:** JWT Bearer Token (Bắt buộc)

**Response** `200`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "kpiSummary": {
      "revenueToday": 2580000.0,
      "revenueYesterday": 2290000.0,
      "revenueChange": "+12.5%",
      "isRevenuePositive": true,
      "ordersToday": 45,
      "ordersYesterday": 41,
      "ordersChange": "+8.2%",
      "isOrdersPositive": true,
      "cancelRateToday": 4.4,
      "cancelRateYesterday": 5.9,
      "cancelRateChange": "-1.5%",
      "isCancelRatePositive": true,
      "averageRating": 4.8,
      "ratingChange": "+0.2",
      "totalReviews": 128
    },
    "revenueData": [
      {
        "date": "11/08",
        "dayName": "T2",
        "revenue": 1850000.0,
        "ordersCount": 32
      },
      {
        "date": "17/08",
        "dayName": "CN",
        "revenue": 2580000.0,
        "ordersCount": 45
      }
    ],
    "cancelReasonData": [
      {
        "name": "Khách đổi ý",
        "value": 40.0,
        "color": "#f97316",
        "count": 8
      },
      {
        "name": "Hết món ăn",
        "value": 30.0,
        "color": "#ef4444",
        "count": 6
      }
    ],
    "recentOrders": [
      {
        "id": "uuid",
        "orderCode": "QB-2026-8841",
        "customerName": "Nguyễn Văn An",
        "itemsSummary": "2x Cơm Tấm Sườn Bì, 1x Trà Đào Cam Sả",
        "itemsCount": 3,
        "time": "5 phút trước",
        "total": 145000.0,
        "status": "PENDING"
      }
    ]
  }
}
```

---

## 4. Order Service (`quick-bite-order` — .NET 10 ABP Framework)

### 📁 Order App Service — `/api/app/order`

#### `GET /api/app/order/statistics`
*Tính toán và tổng hợp dữ liệu thống kê doanh thu, tỷ lệ hủy, danh sách đơn gần đây cho một nhà hàng cụ thể (Domain: Order & Restaurant Statistics).*

**Query Params:** `?restaurantId=uuid` (Bắt buộc)

**Response** `200`: `RestaurantOrderStatisticsDto`
```json
{
  "kpiSummary": { ... },
  "revenueData": [ ... ],
  "cancelReasonData": [ ... ],
  "recentOrders": [ ... ]
}
```

