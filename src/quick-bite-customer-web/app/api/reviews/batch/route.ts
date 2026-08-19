import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

/**
 * POST /api/reviews/batch
 * Proxies batch review submission to Catalog Service exclusively via API Gateway.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await serverFetch.post(
      `${GATEWAY_URL}/reviews/batch`,
      body,
      { requireAuth: true },
      req
    );

    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [POST /api/reviews/batch] Error via API Gateway:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi gửi đánh giá qua API Gateway' },
      { status: 500 }
    );
  }
}
