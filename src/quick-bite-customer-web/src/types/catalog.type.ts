/**
 * Catalog Service Data Types & Interfaces for QuickBite
 */

export interface GeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface RestaurantAddress {
  line1: string;
  ward?: string;
  district: string;
  city: string;
  geo?: GeoLocation;
}

export interface RestaurantRating {
  avg: number;
  count: number;
}

export interface Restaurant {
  id: string;
  ownerId?: string;
  name: string;
  slug?: string;
  address: RestaurantAddress;
  status: 'open' | 'closed' | 'busy' | string;
  rating: RestaurantRating;
  imageUrl?: string;
  cuisineType?: string;
  deliveryTimeMinutes?: number;
  deliveryFee?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RestaurantCategory {
  id: string;
  name: string;
  sortOrder?: number;
}

// Full restaurant detail returned by GET /restaurants/:id
export interface RestaurantDetail {
  id: string;
  ownerId?: string;
  name: string;
  slug?: string;
  address: RestaurantAddress;
  status: 'open' | 'closed' | 'busy' | string;
  rating: RestaurantRating;
  categories: RestaurantCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodVariant {
  name: string;
  priceDelta: number;
}

export interface FoodTopping {
  name: string;
  price: number;
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  categoryId?: string;
  sku?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images: string[];
  isAvailable: boolean;
  preparationTime?: number;
  tags?: string[];
  totalSold?: number;
  variants?: FoodVariant[];
  toppings?: FoodTopping[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp?: string;
  path?: string;
}
