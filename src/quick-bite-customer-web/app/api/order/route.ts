import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

const ORDER_SERVICE_URL =
  process.env.NEXT_PUBLIC_ORDER_URL?.replace(/\/$/, '') ||
  'https://quick-bite-order.onrender.com/api/app';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để thực hiện đặt hàng' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { restaurantId, deliveryAddress, items } = body;

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'Dữ liệu đơn hàng không hợp lệ (thiếu món hoặc nhà hàng)' },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryAddress.receiverName || !deliveryAddress.phoneNumber) {
      return NextResponse.json(
        { message: 'Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng' },
        { status: 400 }
      );
    }

    const customerId = session.user.id;
    const token = session.accessToken;

    const payload = {
      restaurantId,
      customerId,
      deliveryAddress,
      items: items.map((item: any) => ({
        foodItemId: item.foodItemId,
        quantity: Number(item.quantity) || 1,
        selectedVariantName: item.selectedVariantName || item.selectedVariant || null,
        selectedToppings: Array.isArray(item.selectedToppings) ? item.selectedToppings : [],
      })),
    };

    console.log('📦 [POST /api/order] Creating draft order:', JSON.stringify(payload));

    // Try calling direct Order Service first, fallback to Gateway
    let targetUrl = `${ORDER_SERVICE_URL}/order`;
    let response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn(`[Order Direct] Failed, trying Gateway fallback:`, err);
      return null;
    });

    if (!response || !response.ok) {
      // Fallback attempt via Gateway
      const gatewayOrderUrl = `${GATEWAY_URL}/order/order`;
      console.log(`🔄 [Order Gateway Fallback] Calling: ${gatewayOrderUrl}`);
      try {
        const gwRes = await fetch(gatewayOrderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (gwRes.ok) {
          response = gwRes;
        }
      } catch (gwErr) {
        console.error(`[Order Gateway] Also failed:`, gwErr);
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response from service';
      console.error(`❌ [Order API Error] Status: ${response?.status} - ${errorText}`);

      let errorMessage = 'Không thể tạo đơn hàng. Vui lòng thử lại!';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        } else if (parsed?.message) {
          errorMessage = parsed.message;
        }
      } catch {}

      return NextResponse.json(
        { message: errorMessage, details: errorText },
        { status: response?.status || 500 }
      );
    }

    const orderData = await response.json();
    console.log('✅ [Order Created Successfully]:', orderData?.id || orderData?.orderCode);

    return NextResponse.json(orderData, { status: 200 });
  } catch (error: any) {
    console.error('❌ [POST /api/order] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi xử lý đơn hàng' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để xem danh sách đơn hàng' },
        { status: 401 }
      );
    }

    const token = session.accessToken;
    const customerId = session.user.id;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (customerId) {
      headers['X-Customer-Id'] = customerId;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Try direct Order Service first with customerId query param & X-Customer-Id header
    let targetUrl = `${ORDER_SERVICE_URL}/order/my-orders?customerId=${customerId || ''}`;
    let response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    }).catch((err) => {
      console.warn(`[Order Direct GET my-orders] Failed, trying Gateway fallback:`, err);
      return null;
    });

    if (!response || !response.ok) {
      // Fallback via Gateway
      const gatewayOrderUrl = `${GATEWAY_URL}/order/order/my-orders?customerId=${customerId || ''}`;
      console.log(`🔄 [Order Gateway Fallback GET] Calling: ${gatewayOrderUrl}`);
      try {
        const gwRes = await fetch(gatewayOrderUrl, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });
        if (gwRes.ok) {
          response = gwRes;
        }
      } catch (gwErr) {
        console.error(`[Order Gateway GET] Also failed:`, gwErr);
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Order API GET Error] Status: ${response?.status} - ${errorText}`);
      return NextResponse.json(
        { message: 'Không thể tải danh sách đơn hàng', details: errorText },
        { status: response?.status || 500 }
      );
    }

    const orders = await response.json();
    return NextResponse.json(orders, { status: 200 });
  } catch (error: any) {
    console.error('❌ [GET /api/order] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải đơn hàng' },
      { status: 500 }
    );
  }
}
