export type Role = 'Admin' | 'Merchant' | 'Customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: Role;
  isActive: boolean;
  permissions: string[];
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

export type OrderStatus = 'Pending' | 'Confirmed' | 'Preparing' | 'Delivering' | 'Completed' | 'Cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  deliveryAddress: string;
  createdAt: string;
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
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

