import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const response = await serverFetch.post(
      `${GATEWAY_URL}/order/order/${orderId}/cancel`,
      undefined,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [POST /api/order/[orderId]/cancel] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi hủy đơn hàng' },
      { status: 500 }
    );
  }
}
