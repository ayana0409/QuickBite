import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/reviews/orders/[orderId]/check
 * Checks if an order has already been reviewed exclusively via API Gateway.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { message: 'Mã đơn hàng không hợp lệ' },
        { status: 400 }
      );
    }

    const response = await serverFetch.get(
      `${GATEWAY_URL}/reviews/orders/${orderId}/check`,
      { requireAuth: true },
      req
    );

    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [GET /api/reviews/orders/[orderId]/check] Error via API Gateway:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi kiểm tra trạng thái đánh giá qua API Gateway' },
      { status: 500 }
    );
  }
}
