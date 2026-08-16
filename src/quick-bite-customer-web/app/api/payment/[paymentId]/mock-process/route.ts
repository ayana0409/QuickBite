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
  params: Promise<{ paymentId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { paymentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để thực hiện thanh toán' },
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

    const targetUrl = `${GATEWAY_URL}/payments/payments/${paymentId}/mock-process`;
    console.log(`💳 [POST /api/payment/mock-process] Calling Gateway: ${targetUrl}`, body);

    let response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error(`[Payment Gateway POST mock-process] Failed:`, err);
      return null;
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text().catch(() => '') : 'No response';
      console.error(`❌ [Payment Mock Process Error] Status: ${response?.status} - ${errorText}`);
      return NextResponse.json(
        { message: 'Xử lý thanh toán thất bại trên cổng thanh toán', details: errorText },
        { status: response?.status || 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ [POST /api/payment/[paymentId]/mock-process] Unexpected error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi xử lý thanh toán giả lập' },
      { status: 500 }
    );
  }
}
