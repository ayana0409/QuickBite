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

export const userService = {
  // Lấy danh sách người dùng hệ thống kèm đúng danh sách Roles từ Identity Service
  async getUsers(): Promise<User[]> {
    try {
      const res: any = await axiosClient.get('/identity/api/identity/users');
      const list = unwrapArray(res);

      // Tải roles song song cho tất cả users để đảm bảo 100% chính xác từ Identity DB
      const usersWithRoles = await Promise.all(
        list.map(async (u: any) => {
          let rolesList: Role[] = [];
          try {
            const rolesRes: any = await axiosClient.get(`/identity/api/identity/users/${u.id}/roles`);
            const roleItems = rolesRes?.items || rolesRes?.data?.items || (Array.isArray(rolesRes) ? rolesRes : []);
            const fetchedRoleNames: string[] = roleItems.map((r: any) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
            
            rolesList = fetchedRoleNames.map((rn) => {
              const low = rn.toLowerCase();
              if (low === 'admin' || low === 'administrator') return 'Admin';
              if (low === 'merchant' || low === 'seller') return 'Merchant';
              return 'Customer';
            }) as Role[];
          } catch {
            // Fallback nếu không gọi được roles endpoint
            const rawRoles = u.roles || u.roleNames || u.role;
            if (Array.isArray(rawRoles)) {
              rawRoles.forEach((r: string) => {
                const low = r?.toLowerCase();
                if (low === 'admin' || low === 'administrator') rolesList.push('Admin');
                else if (low === 'merchant' || low === 'seller') rolesList.push('Merchant');
                else if (low === 'customer' || low === 'user') rolesList.push('Customer');
              });
            }
          }

          if (rolesList.length === 0) {
            rolesList = ['Customer'];
          }

          const primaryRole: Role = rolesList.includes('Admin') ? 'Admin' : rolesList.includes('Merchant') ? 'Merchant' : 'Customer';

          return {
            id: u.id,
            username: u.userName || u.username,
            email: u.email,
            fullName: u.name ? `${u.surname || ''} ${u.name}`.trim() : u.userName || u.username,
            role: primaryRole,
            roles: rolesList,
            isActive: u.isActive ?? !u.isLockedOut,
            permissions: u.permissions || [],
          };
        })
      );

      return usersWithRoles;
    } catch {
      return [];
    }
  },

  // Bật/tắt riêng vai trò Merchant cho người dùng (Giữ nguyên 100% các vai trò khác như Admin, Customer)
  async toggleMerchantRole(userId: string, currentRoles: Role[], enableMerchant: boolean): Promise<Role[]> {
    let currentRoleNames: string[] = [];
    try {
      const res: any = await axiosClient.get(`/identity/api/identity/users/${userId}/roles`);
      const items = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
      currentRoleNames = items.map((r: any) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
    } catch {
      currentRoleNames = currentRoles;
    }

    let nextRoles: string[] = [];
    if (enableMerchant) {
      nextRoles = Array.from(new Set([...currentRoleNames, 'Merchant']));
    } else {
      nextRoles = currentRoleNames.filter((r) => r.toLowerCase() !== 'merchant');
    }

    if (nextRoles.length === 0) {
      nextRoles = ['Customer'];
    }

    await axiosClient.put(`/identity/api/identity/users/${userId}/roles`, { roleNames: nextRoles });

    return nextRoles.map((r) => {
      const low = r.toLowerCase();
      if (low === 'admin' || low === 'administrator') return 'Admin';
      if (low === 'merchant' || low === 'seller') return 'Merchant';
      return 'Customer';
    }) as Role[];
  },

  // Tạo người dùng mới
  async createUser(dto: CreateUserDto): Promise<User> {
    const rolesList: Role[] = dto.roles && dto.roles.length > 0 ? dto.roles : dto.role ? [dto.role] : ['Customer'];
    const payload = {
      userName: dto.username,
      email: dto.email,
      name: dto.fullName,
      password: dto.password || 'Passw0rd@123',
      isActive: dto.isActive ?? true,
      roleNames: rolesList,
    };
    const res: any = await axiosClient.post('/identity/api/identity/users', payload);
    const created = res?.data || res;
    return {
      id: created.id || `usr-${Date.now()}`,
      username: created.userName || dto.username,
      email: created.email || dto.email,
      fullName: dto.fullName,
      role: rolesList[0] || 'Customer',
      roles: rolesList,
      isActive: true,
      permissions: [],
    };
  },

  // Cập nhật thông tin và mật khẩu người dùng (ABP Identity User API)
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const rolesList: Role[] | undefined = dto.roles && dto.roles.length > 0 ? dto.roles : dto.role ? [dto.role] : undefined;

    // 1. Cập nhật Role qua /roles endpoint nếu có
    if (rolesList && rolesList.length > 0) {
      await axiosClient.put(`/identity/api/identity/users/${id}/roles`, { roleNames: rolesList });
    }

    // 2. Cập nhật thông tin chi tiết / mật khẩu qua PUT /api/identity/users/{id}
    const updatePayload: any = {
      userName: dto.username,
      email: dto.email,
      name: dto.fullName,
      isActive: dto.isActive ?? true,
      roleNames: rolesList,
    };

    if (dto.password && dto.password.trim()) {
      updatePayload.password = dto.password.trim();
    }

    const res: any = await axiosClient.put(`/identity/api/identity/users/${id}`, updatePayload);
    const updated = res?.data || res;
    const finalRoles: Role[] = rolesList || (dto.role ? [dto.role] : ['Customer']);

    return {
      id: updated.id || id,
      username: updated.userName || dto.username || 'user',
      email: updated.email || dto.email || '',
      fullName: updated.name || dto.fullName || '',
      role: finalRoles[0] || 'Customer',
      roles: finalRoles,
      isActive: updated.isActive ?? dto.isActive ?? true,
      permissions: [],
    };
  },

  // Đổi Role người dùng (RoleNames format chuẩn ABP)
  async updateUserRole(id: string, newRole: Role): Promise<void> {
    await axiosClient.put(`/identity/api/identity/users/${id}/roles`, { roleNames: [newRole] });
  },

  // Khóa / Mở khóa tài khoản người dùng
  async toggleUserStatus(id: string): Promise<void> {
    await axiosClient.post(`/identity/users/${id}/toggle-status`);
  },
};
