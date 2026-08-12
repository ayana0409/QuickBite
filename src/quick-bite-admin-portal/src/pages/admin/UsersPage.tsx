import { useState, useEffect } from 'react';
import { Users, Shield, Store, UserCheck, Lock, Unlock, Edit3 } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { UserModal } from '../../components/admin/UserModal';
import { userService } from '../../services/userService';
import type { User } from '../../types';

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateOrUpdate = async (values: any) => {
    if (editingUser) {
      await userService.updateUserRole(editingUser.id, values.role);
    } else {
      await userService.createUser(values);
    }
    await fetchUsers();
  };

  const handleToggleStatus = async (id: string) => {
    await userService.toggleUserStatus(id);
    await fetchUsers();
  };

  const adminCount = users.filter((u) => u.role === 'Admin').length;
  const merchantCount = users.filter((u) => u.role === 'Merchant').length;

  const columns: Column<User>[] = [
    {
      header: 'Tài Khoản',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <p className="font-bold text-slate-100 leading-tight">{row.fullName}</p>
            <p className="text-[10px] text-slate-400 font-mono">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (row) => <span className="text-slate-300 font-mono">{row.email}</span>,
    },
    {
      header: 'Vai Trò (Role)',
      cell: (row) => <StatusBadge status={row.role} type="role" />,
    },
    {
      header: 'Trạng Thái',
      cell: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} type="boolean" />,
    },
    {
      header: 'Thao Tác',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingUser(row);
              setIsModalOpen(true);
            }}
            title="Đổi vai trò Role"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleToggleStatus(row.id)}
            title={row.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              row.isActive
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {row.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Quản Lý Người Dùng & Phân Quyền
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cấp tài khoản hệ thống, ủy quyền vai trò Admin/Merchant và khóa tài khoản vi phạm.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <Shield className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Admin Roles</span>
              <strong className="text-sm font-extrabold text-amber-300 font-mono">{adminCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <Store className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Merchant Roles</span>
              <strong className="text-sm font-extrabold text-emerald-300 font-mono">{merchantCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Tìm kiếm người dùng theo username, họ tên hoặc email..."
        filterOptions={[
          { label: 'Vai trò: Admin', value: 'admin' },
          { label: 'Vai trò: Merchant', value: 'merchant' },
          { label: 'Vai trò: Customer', value: 'customer' },
        ]}
        isLoading={isLoading}
      />

      {/* User Modal Form (Chỉ đổi Role) */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingUser}
      />
    </div>
  );
};
