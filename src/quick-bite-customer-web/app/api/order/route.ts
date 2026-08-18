import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

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

    const payload = {
      restaurantId,
      customerId: session.user.id,
      deliveryAddress,
      items: items.map((item: any) => ({
        foodItemId: item.foodItemId,
        quantity: Number(item.quantity) || 1,
        selectedVariantName: item.selectedVariantName || item.selectedVariant || null,
        selectedToppings: Array.isArray(item.selectedToppings) ? item.selectedToppings : [],
      })),
    };

    const response = await serverFetch.post(
      `${GATEWAY_URL}/order/order`,
      payload,
      { requireAuth: true },
      req
    );

    return proxyResponse(response);
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

    const customerId = session.user.id;
    const response = await serverFetch.get(
      `${GATEWAY_URL}/order/order/my-orders?customerId=${customerId || ''}`,
      {
        requireAuth: true,
        headers: customerId ? { 'X-Customer-Id': customerId } : {},
      },
      req
    );

    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [GET /api/order] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải đơn hàng' },
      { status: 500 }
    );
  }
}
