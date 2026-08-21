import { apiClient } from './apiClient';
import {
  CatalogRequest,
  CatalogRequestType,
  CreateCatalogRequestDto,
  RestaurantRegistrationPayload,
} from '@/src/types/request.type';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

/**
 * Submit a partner (restaurant) registration request to the Catalog Service via API Gateway
 */
export async function submitRestaurantRegistration(
  payload: RestaurantRegistrationPayload,
  accessToken?: string
): Promise<CatalogRequest<RestaurantRegistrationPayload>> {
  const url = `${GATEWAY_URL}/requests`;

  const requestBody: CreateCatalogRequestDto<RestaurantRegistrationPayload> = {
    type: CatalogRequestType.RESTAURANT_REGISTRATION,
    payload,
  };

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return apiClient.post<CatalogRequest<RestaurantRegistrationPayload>>(url, requestBody, {
    headers,
  });
}

/**
 * Get current user's latest restaurant registration request
 */
export async function getMyRegistrationRequest(
  accessToken?: string
): Promise<CatalogRequest<RestaurantRegistrationPayload> | null> {
  if (!accessToken) return null;

  try {
    const url = `${GATEWAY_URL}/requests/my-registration`;
    const result = await apiClient.get<CatalogRequest<RestaurantRegistrationPayload> | null>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return result || null;
  } catch (error) {
    console.warn("[getMyRegistrationRequest] Error fetching registration request:", error);
    return null;
  }
}
