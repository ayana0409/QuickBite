import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-identity.onrender.com';

/**
 * POST /api/identity/my-profile/change-password
 * Proxies password change to Identity Service.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await serverFetch.post(
      `${IDENTITY_URL}/api/app/my-profile/change-password`,
      body,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [POST /api/identity/my-profile/change-password] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi kết nối đến Identity Service' },
      { status: 500 }
    );
  }
}
