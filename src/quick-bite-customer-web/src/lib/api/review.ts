import { apiClient } from './apiClient';

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
