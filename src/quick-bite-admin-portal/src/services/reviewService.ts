import axiosClient from './axiosClient';
import { unwrapData } from '../utils/apiHelper';

export interface Review {
  id: string;
  orderId: string;
  restaurantId: string;
  foodItemId: string;
  foodItemName?: string;
  userId: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReviews {
  data: Review[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const reviewService = {
  /**
   * Get reviews by restaurant with pagination and optional rating filter
   * Calls GET /catalog/reviews/restaurants/:restaurantId
   */
  async getReviewsByRestaurant(
    restaurantId: string,
    page: number = 1,
    limit: number = 20,
    rating?: number
  ): Promise<PaginatedReviews> {
    if (!restaurantId) {
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    try {
      const params: Record<string, any> = { page, limit };
      if (rating && rating >= 1 && rating <= 5) {
        params.rating = rating;
      }

      const res: any = await axiosClient.get(`/catalog/reviews/restaurants/${restaurantId}`, {
        params,
      });

      // Handle ApiResponse wrapper
      const unwrapped = unwrapData<any>(res) || res;
      if (unwrapped && Array.isArray(unwrapped.data) && unwrapped.meta) {
        return unwrapped;
      }

      if (Array.isArray(unwrapped)) {
        return {
          data: unwrapped,
          meta: {
            page,
            limit,
            total: unwrapped.length,
            totalPages: Math.ceil(unwrapped.length / limit) || 1,
          },
        };
      }

      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error(`[reviewService.getReviewsByRestaurant] Error for restaurant ${restaurantId}:`, error);
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    }
  },

  /**
   * Get reviews by food item with pagination and optional rating filter
   * Calls GET /catalog/reviews/food-items/:foodItemId
   */
  async getReviewsByFoodItem(
    foodItemId: string,
    page: number = 1,
    limit: number = 20,
    rating?: number
  ): Promise<PaginatedReviews> {
    if (!foodItemId) {
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    try {
      const params: Record<string, any> = { page, limit };
      if (rating && rating >= 1 && rating <= 5) {
        params.rating = rating;
      }

      const res: any = await axiosClient.get(`/catalog/reviews/food-items/${foodItemId}`, {
        params,
      });

      // Handle ApiResponse wrapper
      const unwrapped = unwrapData<any>(res) || res;
      if (unwrapped && Array.isArray(unwrapped.data) && unwrapped.meta) {
        return unwrapped;
      }

      if (Array.isArray(unwrapped)) {
        return {
          data: unwrapped,
          meta: {
            page,
            limit,
            total: unwrapped.length,
            totalPages: Math.ceil(unwrapped.length / limit) || 1,
          },
        };
      }

      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error(`[reviewService.getReviewsByFoodItem] Error for food item ${foodItemId}:`, error);
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    }
  },
};
