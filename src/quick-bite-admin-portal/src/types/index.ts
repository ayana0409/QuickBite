export type Role = 'Admin' | 'Merchant' | 'Customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: Role;
  roles: Role[];
  isActive: boolean;
  permissions: string[];
  provider?: string;
  isGoogle?: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Confirmed'
  | 'AwaitingRestaurantAcceptance'
  | 'Preparing'
  | 'Delivering'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded'
  | 'WaitingInventory'
  | 'WaitingPayment'
  | 'WaitingStock';

export interface OrderItem {
  id?: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariantName?: string | null;
  selectedToppings?: string[] | null;
  // Backward compatibility fields for legacy mock objects
  productId?: string;
  productName?: string;
}

export interface DeliveryAddressDetails {
  receiverName?: string;
  fullName?: string;
  phoneNumber?: string;
  addressLine?: string;
  ward?: string;
  district?: string;
  province?: string;
  note?: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  changedBy: string;
  changedAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  totalAmount: number;
  creationTime: string;
  createdAt?: string;
  items: OrderItem[];
  deliveryAddress?: DeliveryAddressDetails | string;
  statusHistories?: OrderStatusHistory[];
}

export interface ExtendedOrder extends Order {
  customerName?: string;
  restaurantName?: string;
  sagaState?: 'Initial' | 'StockReserved' | 'PaymentAuthorized' | 'AwaitingAcceptance' | 'Confirmed' | 'Preparing' | 'Delivering' | 'Completed' | 'Cancelled';
  timeline?: { step: string; timestamp: string; status: 'done' | 'active' | 'pending' | 'failed' }[];
}

export interface OrderPaginatedData {
  items: Order[];
  totalCount: number;
}

export interface OrderResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrderPaginatedData;
}

export interface MerchantOrdersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrdersParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  skipCount?: number;
  maxResultCount?: number;
}

// OpenIddict /connect/token Response
export interface OpenIdTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

// JWT Claims from access_token / id_token
export interface DecodedJwtClaims {
  sub?: string;
  preferred_username?: string;
  email?: string;
  role?: string | string[];
  given_name?: string;
  family_name?: string;
  name?: string;
  phone_number_verified?: string;
  email_verified?: string;
  permissions?: string | string[];
  idp?: string;
  iss?: string;
  exp?: number;
  [key: string]: any;
}

export interface LoginRequest {
  username: string;
  password: string;
}
