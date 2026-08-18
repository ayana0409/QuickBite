import axiosClient from './axiosClient';

export interface MyProfileDto {
  id?: string;
  userName: string;
  email: string;
  name?: string | null;
  surname?: string | null;
  phoneNumber?: string | null;
  phoneNumberConfirmed?: boolean;
  emailConfirmed?: boolean;
}

export interface UpdateMyProfileDto {
  userName: string;
  name?: string | null;
  surname?: string | null;
  phoneNumber: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_SERVICE_URL || 'https://quick-bite-identity.onrender.com';

/**
 * Service for self-service profile and password management in Identity Service.
 */
export const profileService = {
  /**
   * Fetch current authenticated user's profile details
   */
  async getMyProfile(): Promise<MyProfileDto> {
    const res: any = await axiosClient.get(`${IDENTITY_URL}/api/app/my-profile`);
    return (res?.result ?? res?.data ?? res) as MyProfileDto;
  },

  /**
   * Update current authenticated user's basic profile details (Name, Surname, PhoneNumber)
   */
  async updateMyProfile(data: UpdateMyProfileDto): Promise<MyProfileDto> {
    const res: any = await axiosClient.put(`${IDENTITY_URL}/api/app/my-profile`, data);
    return (res?.result ?? res?.data ?? res) as MyProfileDto;
  },

  /**
   * Change current authenticated user's password
   */
  async changePassword(data: ChangePasswordDto): Promise<void> {
    await axiosClient.post(`${IDENTITY_URL}/api/app/my-profile/change-password`, data);
  },
};
