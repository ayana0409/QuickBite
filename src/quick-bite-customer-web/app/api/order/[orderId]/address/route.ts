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

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để cập nhật địa chỉ giao hàng' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const token = session.accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Format payload for ABP UpdateAddressAsync
    const payload = {
      deliveryAddress: body.deliveryAddress || body,
    };

    let targetUrl = `${ORDER_SERVICE_URL}/order/${orderId}/address`;
    console.log(`📍 [PUT /api/order/[orderId]/address] Calling: ${targetUrl}`);

    let response = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn(`[Order Direct PUT address] Failed, trying Gateway fallback:`, err);
      return null;
    });

    if (!response || !response.ok) {
      // Fallback via Gateway
      const gatewayUrl = `${GATEWAY_URL}/order/order/${orderId}/address`;
      console.log(`🔄 [Order Gateway Fallback PUT address] Calling: ${gatewayUrl}`);
      try {
        const gwRes = await fetch(gatewayUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (gwRes.ok) {
          response = gwRes;
        }
      } catch (gwErr) {
        console.error(`[Order Gateway PUT address] Also failed:`, gwErr);
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Update Address Error] Status: ${response?.status} - ${errorText}`);

      let errorMessage = 'Không thể cập nhật địa chỉ giao hàng';
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

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ [PUT /api/order/[orderId]/address] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi cập nhật địa chỉ giao hàng' },
      { status: 500 }
    );
  }
}
