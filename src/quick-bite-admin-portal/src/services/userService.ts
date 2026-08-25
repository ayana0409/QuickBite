import axiosClient from './axiosClient';
import type { User, Role } from '../types';
import { unwrapArray } from '../utils/apiHelper';

export interface CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  role?: Role;
  roles?: Role[];
  isActive?: boolean;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  fullName?: string;
  password?: string;
  role?: Role;
  roles?: Role[];
  isActive?: boolean;
}

// Helper to map UI roles (Admin, Merchant, Customer) to valid ABP Identity DB role names
const mapRolesToDbRoleNames = (roles: Role[]): string[] => {
  const dbRoles: string[] = [];
  roles.forEach((r) => {
    const low = r.toLowerCase();
    if (low === 'admin' || low === 'administrator') dbRoles.push('admin');
    else if (low === 'merchant' || low === 'seller') dbRoles.push('merchant');
    // Customer means standard user (no privileged role in Identity DB)
  });
  return Array.from(new Set(dbRoles));
};

export const userService = {
  // Lấy danh sách người dùng hệ thống tối ưu hóa qua BFF Aggregator (1 HTTP Request duy nhất thay vì 1+N)
  async getUsers(params?: { skipCount?: number; maxResultCount?: number; filter?: string; refresh?: boolean }): Promise<User[]> {
    try {
      const queryParams: any = {};
      if (params?.skipCount !== undefined) queryParams.skipCount = params.skipCount;
      if (params?.maxResultCount !== undefined) queryParams.maxResultCount = params.maxResultCount;
      if (params?.filter) queryParams.filter = params.filter;
      if (params?.refresh) queryParams.refresh = 'true';

      const res: any = await axiosClient.get('/admin/users', { params: queryParams });
      const payload = res?.data ?? res;
      const list = Array.isArray(payload?.items) ? payload.items : unwrapArray(payload);

      return list.map((u: any) => {
        const rawRoles: Role[] = Array.isArray(u.roles)
          ? u.roles.filter(Boolean)
          : u.role
          ? [u.role]
          : [];

        return {
          id: u.id,
          username: u.userName || u.username,
          email: u.email,
          fullName: u.fullName || (u.name ? `${u.surname || ''} ${u.name}`.trim() : u.userName || u.username),
          role: rawRoles[0],
          roles: rawRoles,
          isActive: u.isActive ?? !u.isLockedOut,
          permissions: u.permissions || [],
        };
      });
    } catch (error) {
      console.error('Failed to fetch admin users from BFF:', error);
      return [];
    }
  },

  // Bật/tắt riêng vai trò Merchant cho người dùng (Giữ nguyên 100% các vai trò khác như Admin)
  async toggleMerchantRole(userId: string, currentRoles: Role[] = [], enableMerchant: boolean): Promise<Role[]> {
    let currentRoleNames: string[] = [];
    try {
      const res: any = await axiosClient.get(`/identity/api/identity/users/${userId}/roles`);
      const items = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
      currentRoleNames = items.map((r: any) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
    } catch {
      currentRoleNames = currentRoles.map((r) => r.toLowerCase());
    }

    let nextRoleNames: string[] = [];
    if (enableMerchant) {
      const otherRoles = currentRoleNames.filter((r) => r.toLowerCase() !== 'merchant');
      nextRoleNames = Array.from(new Set([...otherRoles, 'merchant']));
    } else {
      nextRoleNames = currentRoleNames.filter((r) => r.toLowerCase() !== 'merchant');
    }

    // Send valid role names to ABP Identity (e.g. ['admin'], ['merchant'], or [] for standard user)
    await axiosClient.put(`/identity/api/identity/users/${userId}/roles`, { roleNames: nextRoleNames });

    const uiRoles = nextRoleNames.map((r) => {
      const low = r.toLowerCase();
      if (low === 'admin' || low === 'administrator') return 'Admin';
      if (low === 'merchant' || low === 'seller') return 'Merchant';
      return r;
    }) as Role[];

    return uiRoles;
  },

  // Tạo người dùng mới
  async createUser(dto: CreateUserDto): Promise<User> {
    const rolesList: Role[] = dto.roles && dto.roles.length > 0 ? dto.roles : dto.role ? [dto.role] : [];
    const dbRoleNames = mapRolesToDbRoleNames(rolesList);
    const payload = {
      userName: dto.username,
      email: dto.email,
      name: dto.fullName,
      password: dto.password || 'Passw0rd@123',
      isActive: dto.isActive ?? true,
      roleNames: dbRoleNames,
    };
    const res: any = await axiosClient.post('/identity/api/identity/users', payload);
    const created = res?.data || res;
    return {
      id: created.id || `usr-${Date.now()}`,
      username: created.userName || dto.username,
      email: created.email || dto.email,
      fullName: dto.fullName,
      role: rolesList[0],
      roles: rolesList,
      isActive: true,
      permissions: [],
    };
  },

  // Cập nhật thông tin và mật khẩu người dùng (ABP Identity User API)
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const rolesList: Role[] | undefined = dto.roles && dto.roles.length > 0 ? dto.roles : dto.role ? [dto.role] : undefined;

    // 1. Cập nhật Role qua /roles endpoint nếu có
    if (rolesList) {
      const dbRoleNames = mapRolesToDbRoleNames(rolesList);
      await axiosClient.put(`/identity/api/identity/users/${id}/roles`, { roleNames: dbRoleNames });
    }

    // 2. Cập nhật thông tin chi tiết / mật khẩu qua PUT /api/identity/users/{id}
    const updatePayload: any = {
      userName: dto.username,
      email: dto.email,
      name: dto.fullName,
      isActive: dto.isActive ?? true,
      ...(rolesList ? { roleNames: mapRolesToDbRoleNames(rolesList) } : {}),
    };

    if (dto.password && dto.password.trim()) {
      updatePayload.password = dto.password.trim();
    }

    const res: any = await axiosClient.put(`/identity/api/identity/users/${id}`, updatePayload);
    const updated = res?.data || res;
    const finalRoles: Role[] = rolesList || [];

    return {
      id: updated.id || id,
      username: updated.userName || dto.username || 'user',
      email: updated.email || dto.email || '',
      fullName: updated.name || dto.fullName || '',
      role: finalRoles[0],
      roles: finalRoles,
      isActive: updated.isActive ?? dto.isActive ?? true,
      permissions: [],
    };
  },

  // Đổi Role người dùng (RoleNames format chuẩn ABP)
  async updateUserRole(id: string, newRole: Role): Promise<void> {
    const dbRoleNames = mapRolesToDbRoleNames([newRole]);
    await axiosClient.put(`/identity/api/identity/users/${id}/roles`, { roleNames: dbRoleNames });
  },

  // Khóa / Mở khóa tài khoản người dùng
  async toggleUserStatus(id: string): Promise<void> {
    await axiosClient.post(`/identity/users/${id}/toggle-status`);
  },
};

