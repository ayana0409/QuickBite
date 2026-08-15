import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

const PAYMENT_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_PAYMENT_URL?.replace(/\/$/, '') ||
  'https://quick-bite-payment.onrender.com/v1';

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
        { message: 'Vui lòng đăng nhập để xem thông tin thanh toán' },
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

    // Determine correct endpoint URL
    const baseUrl = PAYMENT_SERVICE_BASE_URL.endsWith('/v1')
      ? `${PAYMENT_SERVICE_BASE_URL}/payments`
      : `${PAYMENT_SERVICE_BASE_URL}/v1/payments`;

    let targetUrl = `${baseUrl}/order/${orderId}`;
    console.log(`💳 [GET /api/payment/order] Calling: ${targetUrl}`);

    let response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    }).catch((err) => {
      console.warn(`[Payment Direct GET] Failed, trying Gateway fallback:`, err);
      return null;
    });

    if (!response || !response.ok) {
      // Fallback via Gateway
      const gatewayUrl = `${GATEWAY_URL}/payment/v1/payments/order/${orderId}`;
      console.log(`🔄 [Payment Gateway Fallback GET] Calling: ${gatewayUrl}`);
      try {
        const gwRes = await fetch(gatewayUrl, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });
        if (gwRes.ok) {
          response = gwRes;
        }
      } catch (gwErr) {
        console.error(`[Payment Gateway GET] Also failed:`, gwErr);
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Payment API GET by orderId Error] Status: ${response?.status} - ${errorText}`);
      return NextResponse.json(
        { message: 'Không tìm thấy thông tin thanh toán cho đơn hàng này', details: errorText },
        { status: response?.status || 404 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ [GET /api/payment/order/[orderId]] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải thông tin thanh toán' },
      { status: 500 }
    );
  }
}
