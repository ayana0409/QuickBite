import { apiClient } from './apiClient';
import { Review, PaginatedResult } from '@/src/types/catalog.type';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

export interface ReviewItemDto {
  foodItemId: string;
  rating: number;
  comment?: string;
}

export interface CreateBatchReviewDto {
  orderId: string;
  restaurantId: string;
  items: ReviewItemDto[];
}

export interface CheckOrderReviewedResponse {
  reviewed: boolean;
}

/**
 * Check whether an order has already been reviewed
 * Calls Next.js proxy API GET /api/reviews/orders/${orderId}/check
 */
export async function checkOrderReviewed(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  try {
    const res = await apiClient.get<CheckOrderReviewedResponse>(`/api/reviews/orders/${orderId}/check`);
    return !!res?.reviewed;
  } catch (error) {
    return false;
  }
}

/**
 * Submit reviews for food items in an order in batch
 * Calls Next.js proxy API POST /api/reviews/batch
 */
export async function submitBatchReviews(
  payload: CreateBatchReviewDto
): Promise<{ success: boolean; data?: any; message?: string }> {
  if (!payload.orderId || !payload.restaurantId || !payload.items?.length) {
    return {
      success: false,
      message: 'Dữ liệu đánh giá không hợp lệ',
    };
  }

  try {
    const data = await apiClient.post('/api/reviews/batch', payload);
    return {
      success: true,
      data,
      message: 'Gửi đánh giá thành công',
    };
  } catch (error: any) {
    console.error('[submitBatchReviews] Error:', error);
    return {
      success: false,
      message: error?.message || 'Không thể gửi đánh giá. Vui lòng thử lại!',
    };
  }
}

/**
 * Fetch paginated reviews for a restaurant with optional star filter
 * Calls API Gateway GET /reviews/restaurants/:restaurantId
 */
export async function getReviewsByRestaurant(
  restaurantId: string,
  page = 1,
  limit = 5,
  rating?: number
): Promise<PaginatedResult<Review>> {
  if (!restaurantId) {
    return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
  }

  try {
    const url = `${GATEWAY_URL}/reviews/restaurants/${restaurantId}`;
    const params: Record<string, any> = { page, limit };
    if (rating && rating >= 1 && rating <= 5) {
      params.rating = rating;
    }

    const res = await apiClient<any>(url, { params });
    if (res && Array.isArray(res.data) && res.meta) {
      return res;
    }
    if (res && res.data && Array.isArray(res.data.data) && res.data.meta) {
      return res.data;
    }
    if (Array.isArray(res)) {
      return {
        data: res,
        meta: { page, limit, total: res.length, totalPages: Math.ceil(res.length / limit) },
      };
    }
    return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error(`[getReviewsByRestaurant] Failed for restaurant ${restaurantId}:`, error);
    return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
  }
}

/**
 * Fetch paginated reviews for a food item with optional star filter
 * Calls API Gateway GET /reviews/food-items/:foodItemId
 */
export async function getReviewsByFoodItem(
  foodItemId: string,
  page = 1,
  limit = 5,
  rating?: number
): Promise<PaginatedResult<Review>> {
  if (!foodItemId) {
    return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
  }

  try {
    const url = `${GATEWAY_URL}/reviews/food-items/${foodItemId}`;
    const params: Record<string, any> = { page, limit };
    if (rating && rating >= 1 && rating <= 5) {
      params.rating = rating;
    }

    const res = await apiClient<any>(url, { params });
    if (res && Array.isArray(res.data) && res.meta) {
      return res;
    }
    if (res && res.data && Array.isArray(res.data.data) && res.data.meta) {
      return res.data;
    }
    if (Array.isArray(res)) {
      return {
        data: res,
        meta: { page, limit, total: res.length, totalPages: Math.ceil(res.length / limit) },
      };
    }
    return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error(`[getReviewsByFoodItem] Failed for food item ${foodItemId}:`, error);
    return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
  }
}
