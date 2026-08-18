import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { paymentId } = await params;
    const body = await req.json();
    const response = await serverFetch.post(
      `${GATEWAY_URL}/payments/payments/${paymentId}/mock-process`,
      body,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [POST /api/payment/[paymentId]/mock-process] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi xử lý thanh toán giả lập' },
      { status: 500 }
    );
  }
}
