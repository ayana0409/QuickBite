import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

const IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-identity.onrender.com';

/**
 * GET /api/identity/my-profile
 * Fetches the currently authenticated user's profile from Identity Service.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = session?.accessToken || headerToken;

    if (!token && (!session || !session.user)) {
      console.warn('⚠️ [GET /api/identity/my-profile] No session or authorization token found.');
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để truy cập thông tin tài khoản' },
        { status: 401 }
      );
    }

    const targetUrl = `${IDENTITY_URL}/api/app/my-profile`;
    console.log(`📍 [GET /api/identity/my-profile] Calling Identity Service: ${targetUrl} (Token present: ${!!token})`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ [GET /api/identity/my-profile] Backend returned status ${response.status}: ${errorText}`);
      let errorMessage = 'Không thể tải thông tin tài khoản từ máy chủ';

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

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
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
 * Updates the currently authenticated user's basic profile in Identity Service.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = session?.accessToken || headerToken;

    if (!token && (!session || !session.user)) {
      return NextResponse.json(
        { message: 'Vui lòng đăng nhập để thực hiện thay đổi' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const targetUrl = `${IDENTITY_URL}/api/app/my-profile`;
    console.log(`📍 [PUT /api/identity/my-profile] Calling Identity Service: ${targetUrl} (Token present: ${!!token})`);

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ [PUT /api/identity/my-profile] Backend returned status ${response.status}: ${errorText}`);
      let errorMessage = 'Không thể cập nhật thông tin tài khoản';

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

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('❌ [PUT /api/identity/my-profile] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Lỗi hệ thống khi kết nối đến Identity Service' },
      { status: 500 }
    );
  }
}

