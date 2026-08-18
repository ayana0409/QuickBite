import { NextRequest, NextResponse } from 'next/server';
import { serverFetch, proxyResponse } from '@/src/lib/api/serverClient';

const IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-identity.onrender.com';

/**
 * GET /api/identity/my-profile
 * Proxies profile fetch to Identity Service.
 */
export async function GET(req: NextRequest) {
  try {
    const response = await serverFetch.get(
      `${IDENTITY_URL}/api/app/my-profile`,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [GET /api/identity/my-profile] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi kết nối đến Identity Service' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/identity/my-profile
 * Proxies profile update to Identity Service.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await serverFetch.put(
      `${IDENTITY_URL}/api/app/my-profile`,
      body,
      { requireAuth: true },
      req
    );
    return proxyResponse(response);
  } catch (error: any) {
    console.error('❌ [PUT /api/identity/my-profile] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi kết nối đến Identity Service' },
      { status: 500 }
    );
  }
}
