import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ restaurantId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { restaurantId } = await params;
    const searchParams = req.nextUrl.search;
    const response = await serverFetch.get(
      `${GATEWAY_URL}/reviews/restaurants/${restaurantId}${searchParams}`,
      { requireAuth: false },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [GET /api/reviews/restaurants/[restaurantId]] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi tải đánh giá nhà hàng' },
      { status: 500 }
    );
  }
}
