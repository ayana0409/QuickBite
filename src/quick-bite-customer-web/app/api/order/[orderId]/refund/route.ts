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
        { message: 'Vui lòng đăng nhập để yêu cầu hoàn tiền' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = session.accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
      reason: body.reason || 'Hoàn tiền theo yêu cầu của khách hàng',
    };

    let targetUrl = `${ORDER_SERVICE_URL}/order/${orderId}/refund`;
    console.log(`💸 [POST /api/order/[orderId]/refund] Calling: ${targetUrl}`, payload);

    let response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn(`[Order Direct Refund] Failed, trying Gateway fallback:`, err);
      return null;
    });

    if (!response || !response.ok) {
      // Fallback via Gateway
      const gatewayUrl = `${GATEWAY_URL}/order/order/${orderId}/refund`;
      console.log(`🔄 [Order Gateway Fallback Refund] Calling: ${gatewayUrl}`);
      try {
        const gwRes = await fetch(gatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (gwRes.ok) {
          response = gwRes;
        }
      } catch (gwErr) {
        console.error(`[Order Gateway Refund] Also failed:`, gwErr);
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Refund Order Error] Status: ${response?.status} - ${errorText}`);

      let errorMessage = 'Không thể gửi yêu cầu hoàn tiền cho đơn hàng này';
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

    return NextResponse.json({ success: true, message: 'Đã gửi yêu cầu hoàn tiền thành công' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ [POST /api/order/[orderId]/refund] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi yêu cầu hoàn tiền' },
      { status: 500 }
    );
  }
}
