import axiosClient from './axiosClient';
import type { User, Role } from '../types';
import { unwrapArray } from '../utils/apiHelper';

export interface CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  role: Role;
  isActive?: boolean;
}

export const userService = {
  // Lấy danh sách người dùng hệ thống từ Identity Service
  async getUsers(): Promise<User[]> {
    try {
      const res: any = await axiosClient.get('/identity/users');
      const list = unwrapArray(res);
      return list.map((u: any) => ({
        id: u.id,
        username: u.userName || u.username,
        email: u.email,
        fullName: u.name ? `${u.surname || ''} ${u.name}`.trim() : u.userName || u.username,
        role: Array.isArray(u.roles) && u.roles.includes('Admin') ? 'Admin' : Array.isArray(u.roles) && u.roles.includes('Merchant') ? 'Merchant' : 'Customer',
        isActive: u.isActive ?? !u.isLockedOut,
        permissions: u.permissions || [],
      }));
    } catch {
      return [];
    }
  },

  // Tạo người dùng mới
  async createUser(dto: CreateUserDto): Promise<User> {
    const res: any = await axiosClient.post('/identity/users', dto);
    const created = res?.data || res;
    return {
      id: created.id || `usr-${Date.now()}`,
      username: created.userName || dto.username,
      email: created.email || dto.email,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
      permissions: [],
    };
  },

  // Đổi Role người dùng
  async updateUserRole(id: string, newRole: Role): Promise<User> {
    const res: any = await axiosClient.put(`/identity/users/${id}/roles`, { roles: [newRole] });
    const updated = res?.data || res;
    return {
      id: updated.id || id,
      username: updated.userName || 'user',
      email: updated.email || '',
      fullName: updated.name || '',
      role: newRole,
      isActive: true,
      permissions: [],
    };
  },

  // Khóa / Mở khóa tài khoản người dùng
  async toggleUserStatus(id: string): Promise<void> {
    await axiosClient.post(`/identity/users/${id}/toggle-status`);
  },
};
