import { OrderDto, DeliveryAddress } from '@/src/types/order.type';

/**
 * Fetch all orders for the currently authenticated user
 * Calls Next.js proxy API /api/order
 */
export async function getMyOrders(): Promise<OrderDto[]> {
  try {
    const res = await fetch('/api/order', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[getMyOrders] HTTP error ${res.status}`);
      return [];
    }

    const json = await res.json();
    console.log('📦 [getMyOrders] Raw API response:', json);

    // 1. Direct array
    if (Array.isArray(json)) {
      return json;
    }

    // 2. Wrapped in { data: [...] } (e.g. standard ApiResponse / ResponseWrapperMiddleware)
    if (json?.data && Array.isArray(json.data)) {
      return json.data;
    }

    // 3. Nested { data: { data: [...] } } or { data: { items: [...] } }
    if (json?.data?.data && Array.isArray(json.data.data)) {
      return json.data.data;
    }

    // 4. Wrapped in { items: [...] } (ABP paged result)
    if (json?.items && Array.isArray(json.items)) {
      return json.items;
    }

    // 5. Wrapped in { result: [...] }
    if (json?.result && Array.isArray(json.result)) {
      return json.result;
    }

    return [];
  } catch (error) {
    console.error('[getMyOrders] Failed to fetch orders:', error);
    return [];
  }
}

/**
 * Fetch a single order by ID
 * Calls Next.js proxy API /api/order/${id}
 */
export async function getOrderById(id: string): Promise<OrderDto | null> {
  if (!id) return null;

  try {
    const res = await fetch(`/api/order/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[getOrderById] HTTP error ${res.status} for order: ${id}`);
      return null;
    }

    const json = await res.json();
    console.log(`📦 [getOrderById:${id}] Raw API response:`, json);

    // If wrapped in { success: true, data: { ... } }
    if (json?.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
      return json.data as OrderDto;
    }

    if (json?.result && typeof json.result === 'object') {
      return json.result as OrderDto;
    }

    return (json as OrderDto) || null;
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
    const res = await fetch(`/api/order/${orderId}/address`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ deliveryAddress }),
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: json?.message || 'Không thể cập nhật địa chỉ giao hàng',
      };
    }

    const orderData = json?.data || json;
    return {
      success: true,
      data: orderData,
    };
  } catch (error: any) {
    console.error(`[updateOrderDeliveryAddress] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi mạng khi cập nhật địa chỉ',
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
    const res = await fetch(`/api/order/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: json?.message || 'Không thể hủy đơn hàng này',
      };
    }

    return {
      success: true,
      message: 'Hủy đơn hàng thành công',
    };
  } catch (error: any) {
    console.error(`[cancelOrder] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi mạng khi gửi yêu cầu hủy đơn',
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
    const res = await fetch(`/api/order/${orderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: json?.message || 'Không thể gửi yêu cầu hoàn tiền',
      };
    }

    return {
      success: true,
      message: 'Gửi yêu cầu hoàn tiền thành công',
    };
  } catch (error: any) {
    console.error(`[refundOrder] Failed for order ${orderId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi mạng khi gửi yêu cầu hoàn tiền',
    };
  }
}
