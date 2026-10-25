import axiosClient from './axiosClient';
import type { CatalogRequest, RestaurantRegistrationPayload } from '../types/request';

export interface SubmitRestaurantRegistrationDto {
  name: string;
  slug: string;
  ownerId?: string;
  address: {
    line1: string;
    ward: string;
    district: string;
    city: string;
    geo: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
}

/**
 * Service for Merchant partner onboarding and catalog requests
 */
export const merchantRequestService = {
  /**
   * Submit a new partner restaurant registration request
   */
  async submitRegistration(
    payload: SubmitRestaurantRegistrationDto
  ): Promise<CatalogRequest<RestaurantRegistrationPayload>> {
    console.log('--- POST /requests (RESTAURANT_REGISTRATION) PAYLOAD ---', JSON.stringify(payload, null, 2));
    const response: any = await axiosClient.post('/requests', {
      type: 'RESTAURANT_REGISTRATION',
      payload,
    });

    return response?.data || response;
  },

  /**
   * Get latest restaurant registration request of current merchant
   */
  async getMyRegistration(): Promise<CatalogRequest<RestaurantRegistrationPayload> | null> {
    try {
      const response: any = await axiosClient.get('/requests/my-registration');
      const data = response?.data !== undefined ? response.data : response;
      return data || null;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      console.warn('[merchantRequestService] Failed to fetch my registration request:', err);
      return null;
    }
  },
};
