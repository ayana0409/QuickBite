import { OrderDto, DeliveryAddress } from '@/src/types/order.type';
import { apiClient } from './apiClient';

/**
 * Fetch all orders for the currently authenticated user
 * Calls Next.js proxy API GET /api/order
 */
export async function getMyOrders(): Promise<OrderDto[]> {
  try {
    const data = await apiClient.get<OrderDto[] | { items?: OrderDto[]; data?: OrderDto[] }>('/api/order');
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray((data as any).items)) return (data as any).items;
      if (Array.isArray((data as any).data)) return (data as any).data;
    }
    return [];
  } catch (error) {
    console.error('[getMyOrders] Failed to fetch orders:', error);
    return [];
  }
}

/**
 * Fetch a single order by ID
 * Calls Next.js proxy API GET /api/order/${id}
 */
export async function getOrderById(id: string): Promise<OrderDto | null> {
  if (!id) return null;
  try {
    return await apiClient.get<OrderDto>(`/api/order/${id}`);
  } catch (error) {
    console.error(`[getOrderById] Failed to fetch order ${id}:`, error);
    return null;
  }
}

/**
 * Update delivery address for an existing order before delivery
 * Calls Next.js proxy API PUT /api/order/${orderId}/address
 */
export async function updateOrderDeliveryAddress(
  orderId: string,
  deliveryAddress: DeliveryAddress
): Promise<{ success: boolean; data?: OrderDto; message?: string }> {
  if (!orderId) return { success: false, message: 'Thiếu mã đơn hàng' };

  try {
    const data = await apiClient.put<OrderDto>(`/api/order/${orderId}/address`, { deliveryAddress });
    return { success: true, data };
  } catch (error: any) {
    console.error(`[updateOrderDeliveryAddress] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi khi cập nhật địa chỉ giao hàng',
    };
  }
}

/**
 * Cancel an order before it is dispatched
 * Calls Next.js proxy API POST /api/order/${orderId}/cancel
 */
export async function cancelOrder(
  orderId: string
): Promise<{ success: boolean; message?: string }> {
  if (!orderId) return { success: false, message: 'Thiếu mã đơn hàng' };

  try {
    await apiClient.post(`/api/order/${orderId}/cancel`);
    return {
      success: true,
      message: 'Hủy đơn hàng thành công',
    };
  } catch (error: any) {
    console.error(`[cancelOrder] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi khi gửi yêu cầu hủy đơn',
    };
  }
}

/**
 * Request a refund for a delivered/completed order with reason
 * Calls Next.js proxy API POST /api/order/${orderId}/refund
 */
export async function refundOrder(
  orderId: string,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  if (!orderId) return { success: false, message: 'Thiếu mã đơn hàng' };

  try {
    await apiClient.post(`/api/order/${orderId}/refund`, { reason });
    return {
      success: true,
      message: 'Gửi yêu cầu hoàn tiền thành công',
    };
  } catch (error: any) {
    console.error(`[refundOrder] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi khi gửi yêu cầu hoàn tiền',
    };
  }
}
