import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

const ORDER_SERVICE_URL =
  process.env.NEXT_PUBLIC_ORDER_URL?.replace(/\/$/, '') ||
  'https://quick-bite-order.onrender.com/api/app';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để xem thông tin đơn hàng' },
        { status: 401 }
      );
    }

    const token = session.accessToken;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const targetUrl = `${GATEWAY_URL}/order/order/${orderId}`;
    console.log(`📍 [GET /api/order/[orderId]] Calling Gateway: ${targetUrl}`);
    
    let response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    }).catch((err) => {
      console.error(`[Order Gateway GET] Failed:`, err);
      return null;
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Order API GET by id Error] Status: ${response?.status} - ${errorText}`);
      return NextResponse.json(
        { message: 'Không tìm thấy thông tin đơn hàng', details: errorText },
        { status: response?.status || 500 }
      );
    }

    const orderData = await response.json();
    return NextResponse.json(orderData, { status: 200 });
  } catch (error: any) {
    console.error('❌ [GET /api/order/[orderId]] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải chi tiết đơn hàng' },
      { status: 500 }
    );
  }
}
