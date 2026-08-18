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

// ─── API Functions ────────────────────────────────────────────────────────────

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
