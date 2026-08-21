/**
 * Catalog Request Center Data Types & Interfaces for QuickBite
 */

export enum CatalogRequestType {
  RESTAURANT_REGISTRATION = 'RESTAURANT_REGISTRATION',
  FOOD_REPORT = 'FOOD_REPORT',
  SYSTEM_FEEDBACK = 'SYSTEM_FEEDBACK',
}

export enum CatalogRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
}

export interface RestaurantRegistrationPayload {
  name: string;
  slug: string;
  address: {
    line1: string;
    ward: string;
    district: string;
    city: string;
    geo?: {
      type: string;
      coordinates: [number, number];
    };
  };
}

export interface CreateCatalogRequestDto<T = any> {
  type: CatalogRequestType;
  payload: T;
}

export interface CatalogRequest<T = any> {
  id: string;
  userId: string;
  type: CatalogRequestType;
  status: CatalogRequestStatus;
  payload: T;
  adminNote?: string | null;
  processedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
