/**
 * identity.ts
 * API client for Identity Service self-service profile endpoints.
 * Interacts directly with Identity Service endpoints via Next.js proxy route handlers.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MyProfileDto {
  id?: string;
  email: string;
  userName: string;
  phoneNumber: string;
  name?: string | null;
  surname?: string | null;
  phoneNumberConfirmed?: boolean;
  emailConfirmed?: boolean;
}

export interface UpdateMyProfileDto {
  userName: string;
  phoneNumber: string;
  name?: string | null;
  surname?: string | null;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user's profile from Identity Service.
 * Calls Next.js proxy: GET /api/identity/my-profile
 */
export async function getMyProfile(): Promise<MyProfileDto> {
  const res = await fetch('/api/identity/my-profile', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `Lỗi ${res.status}: Không thể tải thông tin tài khoản`);
  }

  const json = await res.json();

  // Handle ABP wrapped response { result: {...} } or { data: {...} } or direct object
  if (json?.result && typeof json.result === 'object') return json.result as MyProfileDto;
  if (json?.data && typeof json.data === 'object') return json.data as MyProfileDto;
  return json as MyProfileDto;
}

/**
 * Update the currently authenticated user's basic profile in Identity Service.
 * Calls Next.js proxy: PUT /api/identity/my-profile
 */
export async function updateMyProfile(data: UpdateMyProfileDto): Promise<MyProfileDto> {
  const res = await fetch('/api/identity/my-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `Lỗi ${res.status}: Không thể cập nhật thông tin`);
  }

  const json = await res.json();
  if (json?.result && typeof json.result === 'object') return json.result as MyProfileDto;
  if (json?.data && typeof json.data === 'object') return json.data as MyProfileDto;
  return json as MyProfileDto;
}

/**
 * Change the currently authenticated user's password in Identity Service.
 * Calls Next.js proxy: POST /api/identity/my-profile/change-password
 */
export async function changePassword(data: ChangePasswordDto): Promise<void> {
  const res = await fetch('/api/identity/my-profile/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      json?.message ||
        json?.error?.message ||
        `Lỗi ${res.status}: Không thể đổi mật khẩu`
    );
  }
}

