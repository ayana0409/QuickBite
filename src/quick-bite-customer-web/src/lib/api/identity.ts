import { apiClient } from './apiClient';
import { HttpMethod } from './httpMethod';

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

export interface GoogleLoginDto {
  idToken: string;
}

export interface GoogleLoginResultDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
}

export interface RegisterInputDto {
  userName: string;
  emailAddress: string;
  password: string;
  name?: string;
  phoneNumber?: string;
}

export interface RegisterResultDto {
  success: boolean;
  message?: string;
  userId?: string;
  userName?: string;
  email?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Exchange Google ID Token for JWT Access Token with ABP Identity Service.
 * Endpoint: POST /api/app/auth/google-login
 */
export async function loginWithGoogle(data: GoogleLoginDto): Promise<GoogleLoginResultDto> {
  const identityUrl =
    process.env.NEXT_PUBLIC_IDENTITY_URL ||
    'https://quick-bite-identity.onrender.com';

  const res = await fetch(`${identityUrl}/api/app/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || err?.message || 'Google login verification failed.'
    );
  }

  return await res.json();
}

/**
 * Fetch the currently authenticated user's profile from Identity Service.
 * Calls Next.js proxy: GET /api/identity/my-profile
 */
export async function getMyProfile(): Promise<MyProfileDto> {
  return apiClient.get<MyProfileDto>('/api/identity/my-profile');
}

/**
 * Update the currently authenticated user's basic profile in Identity Service.
 * Calls Next.js proxy: PUT /api/identity/my-profile
 */
export async function updateMyProfile(data: UpdateMyProfileDto): Promise<MyProfileDto> {
  return apiClient.put<MyProfileDto>('/api/identity/my-profile', data);
}

/**
 * Change the currently authenticated user's password in Identity Service.
 * Calls Next.js proxy: POST /api/identity/my-profile/change-password
 */
export async function changePassword(data: ChangePasswordDto): Promise<void> {
  return apiClient.post<void>('/api/identity/my-profile/change-password', data);
}

/**
 * Register a new Customer account with ABP Identity Service.
 * Endpoint: POST /api/app/auth/register
 */
export async function registerAccount(data: RegisterInputDto): Promise<RegisterResultDto> {
  const identityUrl =
    process.env.NEXT_PUBLIC_IDENTITY_URL ||
    'https://quick-bite-identity.onrender.com';

  const res = await fetch(`${identityUrl}/api/app/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || err?.message || 'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại thông tin.'
    );
  }

  return await res.json();
}
