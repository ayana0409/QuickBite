import { PaymentDto } from '@/src/types/order.type';
import { apiClient } from './apiClient';

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
    return await apiClient.get<PaymentDto>(url);
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
    const paymentData = await apiClient.post<PaymentDto>(url, {
      success,
      failureReason: failureReason || (success ? null : 'Khách hàng hủy thanh toán trong Sandbox'),
    });

    return {
      success: true,
      data: paymentData,
    };
  } catch (error: any) {
    console.error(`[processMockPayment] Failed to process payment ${paymentId}:`, error);
    return {
      success: false,
      message: error?.message || 'Lỗi kết nối cổng thanh toán giả lập',
    };
  }
}
