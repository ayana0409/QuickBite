export type Role = 'Admin' | 'Merchant' | 'Customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
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
