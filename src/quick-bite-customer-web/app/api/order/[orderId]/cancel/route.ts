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

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để hủy đơn hàng' },
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

    const targetUrl = `${GATEWAY_URL}/order/order/${orderId}/cancel`;
    console.log(`🚫 [POST /api/order/[orderId]/cancel] Calling Gateway: ${targetUrl}`);
    
    let response = await fetch(targetUrl, {
      method: 'POST',
      headers,
    }).catch((err) => {
      console.error(`[Order Gateway POST cancel] Failed:`, err);
      return null;
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Cancel Order Error] Status: ${response?.status} - ${errorText}`);

      let errorMessage = 'Không thể hủy đơn hàng này';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) errorMessage = parsed.error.message;
        else if (parsed?.message) errorMessage = parsed.message;
      } catch {}

      return NextResponse.json(
        { message: errorMessage, details: errorText },
        { status: response?.status || 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Đã hủy đơn hàng thành công' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ [POST /api/order/[orderId]/cancel] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi hủy đơn hàng' },
      { status: 500 }
    );
  }
}
