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
    const { restaurantId, deliveryAddress, deliveryLatitude, deliveryLongitude, items } = body;

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

    const resolvedLatitude =
      deliveryLatitude !== undefined
        ? deliveryLatitude
        : deliveryAddress.latitude;
    const resolvedLongitude =
      deliveryLongitude !== undefined
        ? deliveryLongitude
        : deliveryAddress.longitude;

    // Ensure backwards compatibility with downstream Order service validation rules
    const resolvedDistrict =
      deliveryAddress.district && deliveryAddress.district.trim() !== ''
        ? deliveryAddress.district.trim()
        : deliveryAddress.ward?.trim() || deliveryAddress.province?.trim() || 'Chưa cập nhật';

    const resolvedProvince =
      deliveryAddress.province && deliveryAddress.province.trim() !== ''
        ? deliveryAddress.province.trim()
        : deliveryAddress.city?.trim() || 'Hồ Chí Minh';

    const resolvedWard =
      deliveryAddress.ward && deliveryAddress.ward.trim() !== ''
        ? deliveryAddress.ward.trim()
        : 'Phường/Xã';

    const resolvedAddressLine =
      deliveryAddress.addressLine && deliveryAddress.addressLine.trim() !== ''
        ? deliveryAddress.addressLine.trim()
        : 'Địa chỉ nhận hàng';

    const payload = {
      restaurantId,
      customerId: session.user.id,
      deliveryAddress: {
        receiverName: deliveryAddress.receiverName?.trim() || session.user.name || 'Khách hàng',
        phoneNumber: deliveryAddress.phoneNumber?.trim() || '',
        addressLine: resolvedAddressLine,
        ward: resolvedWard,
        district: resolvedDistrict,
        province: resolvedProvince,
        note: deliveryAddress.note?.trim() || '',
        latitude: resolvedLatitude ?? null,
        longitude: resolvedLongitude ?? null,
      },
      deliveryLatitude: resolvedLatitude ?? null,
      deliveryLongitude: resolvedLongitude ?? null,
      items: items.map((item: any) => ({
        foodItemId: item.foodItemId,
        quantity: Number(item.quantity) || 1,
        selectedVariantName: item.selectedVariantName || item.selectedVariant || null,
        selectedToppings: Array.isArray(item.selectedToppings) ? item.selectedToppings : [],
      })),
    };

    console.log(`📦 [POST /api/order] Sending order payload to ${GATEWAY_URL}/order/order`);

    const response = await serverFetch.post(
      `${GATEWAY_URL}/order/order`,
      payload,
      { requireAuth: true },
      req
    );

    if (!response.ok) {
      console.warn(`⚠️ [POST /api/order] Downstream order service returned status ${response.status}`);
    }

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
