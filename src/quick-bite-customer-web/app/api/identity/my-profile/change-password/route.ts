import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

const IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-identity.onrender.com';

/**
 * POST /api/identity/my-profile/change-password
 * Changes password for the currently authenticated user in Identity Service.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = session?.accessToken || headerToken;

    if (!token && (!session || !session.user)) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để đổi mật khẩu' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetUrl = `${IDENTITY_URL}/api/app/my-profile/change-password`;
    console.log(`📍 [POST /api/identity/my-profile/change-password] Calling Identity Service: ${targetUrl} (Token present: ${!!token})`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = 'Mật khẩu hiện tại không chính xác hoặc không hợp lệ';

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
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Đổi mật khẩu thành công' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [POST /api/identity/my-profile/change-password] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi kết nối đến Identity Service' },
      { status: 500 }
    );
  }
}

