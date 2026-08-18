import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const response = await serverFetch.get(
      `${GATEWAY_URL}/order/order/${orderId}`,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [GET /api/order/[orderId]] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải chi tiết đơn hàng' },
      { status: 500 }
    );
  }
}
