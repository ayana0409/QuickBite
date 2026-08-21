/**
 * Catalog Request Data Types & Interfaces for Admin Portal
 */

export const CatalogRequestType = {
  RESTAURANT_REGISTRATION: 'RESTAURANT_REGISTRATION',
  FOOD_REPORT: 'FOOD_REPORT',
  SYSTEM_FEEDBACK: 'SYSTEM_FEEDBACK',
} as const;
export type CatalogRequestType = (typeof CatalogRequestType)[keyof typeof CatalogRequestType];

export const CatalogRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
} as const;
export type CatalogRequestStatus = (typeof CatalogRequestStatus)[keyof typeof CatalogRequestStatus];

export const RequestAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RESOLVE: 'RESOLVE',
} as const;
export type RequestAction = (typeof RequestAction)[keyof typeof RequestAction];

export interface GeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface RestaurantRegistrationPayload {
  name: string;
  slug: string;
  ownerId?: string;
  phone?: string;
  address: {
    line1: string;
    ward: string;
    district: string;
    city: string;
    geo?: GeoLocation;
  };
}

export interface FoodReportPayload {
  foodItemId: string;
  reason: string;
  description?: string;
}

export interface SystemFeedbackPayload {
  subject: string;
  content: string;
}

export type CatalogRequestPayload =
  | RestaurantRegistrationPayload
  | FoodReportPayload
  | SystemFeedbackPayload
  | Record<string, any>;

export interface CatalogRequest<T = CatalogRequestPayload> {
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

export interface ProcessRequestPayload {
  action: RequestAction | 'APPROVE' | 'REJECT' | 'RESOLVE';
  adminNote?: string;
}

export interface RequestPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRequestsResponse {
  data: CatalogRequest[];
  meta: RequestPaginationMeta;
}

export interface RequestQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
  userId?: string;
}
