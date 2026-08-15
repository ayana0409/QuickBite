import { OrderDto } from '@/src/types/order.type';

/**
 * Fetch all orders for the currently authenticated user
 * Calls Next.js proxy API /api/order
 */
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
