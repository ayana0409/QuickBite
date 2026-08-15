/**
 * Order Service & Cart Data Types for QuickBite Customer Web
 */

export interface CartItem {
  id: string; // Unique cart item identifier (e.g., foodId-variant-toppings)
  foodItemId: string;
  name: string;
  price: number; // Base price
  unitPrice: number; // Final price per unit including variant & toppings
  imageUrl?: string;
  quantity: number;
  selectedVariant: string | null;
  selectedToppings: string[];
  totalItemPrice: number;
  note?: string;
}

export interface DeliveryAddress {
  receiverName: string;
  phoneNumber: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  note?: string;
}

export interface CreateOrderItemPayload {
  foodItemId: string;
  quantity: number;
  selectedVariantName?: string | null;
  selectedToppings: string[];
}

export interface CreateOrderPayload {
  restaurantId: string;
  customerId: string;
  deliveryAddress: DeliveryAddress;
  items: CreateOrderItemPayload[];
}

export interface OrderItemDto {
  foodItemId: string;
  foodName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariantName?: string | null;
  selectedToppings: string[];
}

export type OrderStatus =
  | 'Draft'
  | 'Submitted'
  | 'Confirmed'
  | 'Preparing'
  | 'Delivering'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  | string;

export interface OrderDto {
  id: string;
  orderCode: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  items: OrderItemDto[];
  creationTime: string;
}

export type PaymentMethodType = 'MOCK_PAYMENT' | 'COD' | 'BANK_TRANSFER' | 'VNPAY' | string;

export interface PaymentDto {
  id: string;
  orderId: string;
  customerId?: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | string;
  method?: PaymentMethodType;
  transactionId?: string;
  paymentUrl?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

