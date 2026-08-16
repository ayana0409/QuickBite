import { PaymentDto } from '@/src/types/order.type';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

/**
 * Fetch payment session information by Order ID
 * Calls API Gateway GET /payments/order/[orderId]
 */
export async function getPaymentByOrderId(orderId: string): Promise<PaymentDto | null> {
  if (!orderId) return null;

  try {
    const url = `${GATEWAY_URL}/payments/payments/order/${orderId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[getPaymentByOrderId] HTTP error ${res.status} for order: ${orderId}`);
      return null;
    }

    const json = await res.json();
    console.log(`💳 [getPaymentByOrderId] Raw API response:`, json);

    // Unpack response wrapper if present
    if (json?.data && typeof json.data === 'object') {
      return json.data as PaymentDto;
    }

    return (json as PaymentDto) || null;
  } catch (error) {
    console.error(`[getPaymentByOrderId] Failed to fetch payment for order ${orderId}:`, error);
    return null;
  }
}

/**
 * Simulate processing a mock payment (Success or Failure)
 * Calls API Gateway POST /payments/[paymentId]/mock-process
 */
export async function processMockPayment(
  paymentId: string,
  success: boolean,
  failureReason?: string
): Promise<{ success: boolean; data?: PaymentDto; message?: string }> {
  if (!paymentId) {
    return { success: false, message: 'Thiếu mã thanh toán (paymentId)' };
  }

  try {
    const url = `${GATEWAY_URL}/payments/payments/${paymentId}/mock-process`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        success,
        failureReason: failureReason || (success ? null : 'Khách hàng hủy thanh toán trong Sandbox'),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: json?.message || 'Xử lý thanh toán thất bại trên cổng giả lập',
      };
    }

    const paymentData = json?.data || json;
    return {
      success: true,
      data: paymentData,
    };
  } catch (error: any) {
    console.error(`[processMockPayment] Failed to process payment ${paymentId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi mạng khi kết nối cổng thanh toán giả lập',
    };
  }
}
