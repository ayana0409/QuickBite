import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import type { User, Role } from '../../types';
import { User as UserIcon, Mail, Lock, Loader2, Store, Info } from 'lucide-react';

const userSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập từ 3 ký tự trở lên'),
  email: z.string().email('Email không đúng định dạng'),
  fullName: z.string().min(2, 'Họ tên từ 2 ký tự trở lên'),
  password: z.string().min(6, 'Mật khẩu từ 6 ký tự trở lên').optional().or(z.literal('')),
  isMerchant: z.boolean(),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: {
    username: string;
    email: string;
    fullName: string;
    password?: string;
    role?: Role;
    roles: Role[];
    isActive?: boolean;
  }) => Promise<void>;
  initialData?: User | null;
  isLoading?: boolean;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      fullName: '',
      password: '',
      isMerchant: true,
      isActive: true,
    },
  });

  const isMerchantChecked = watch('isMerchant');

  useEffect(() => {
    if (initialData) {
      const userRoles: Role[] = initialData.roles && initialData.roles.length > 0
        ? initialData.roles
        : initialData.role ? [initialData.role] : [];

      const hasMerchant = userRoles.some((r) => r.toLowerCase() === 'merchant');

      reset({
        username: initialData.username,
        email: initialData.email,
        fullName: initialData.fullName,
        password: '',
        isMerchant: hasMerchant,
        isActive: initialData.isActive,
      });
    } else {
      reset({
        username: '',
        email: '',
        fullName: '',
        password: 'Passw0rd@123',
        isMerchant: true,
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: UserFormValues) => {
    const existingRoles: Role[] = initialData?.roles && initialData.roles.length > 0
      ? initialData.roles
      : initialData?.role ? [initialData.role] : [];

    let nextRoles: Role[] = [];
    if (data.isMerchant) {
      const nonMerchantRoles = existingRoles.filter((r) => r.toLowerCase() !== 'merchant');
      nextRoles = Array.from(new Set([...nonMerchantRoles, 'Merchant'])) as Role[];
    } else {
      nextRoles = existingRoles.filter((r) => r.toLowerCase() !== 'merchant');
    }

    await onSubmit({
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      password: data.password,
      role: nextRoles[0],
      roles: nextRoles,
      isActive: data.isActive,
    });
    onClose();
  };

  // Lọc các quyền hệ thống khác ngoài Merchant đang có trên tài khoản
  const otherRoles = initialData?.roles
    ? initialData.roles.filter((r) => r !== 'Merchant')
    : initialData?.role && initialData.role !== 'Merchant'
    ? [initialData.role]
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh Sửa Tài Khoản' : 'Tạo Tài Khoản Hệ Thống'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            Username <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="merchant_saigon"
              disabled={!!initialData}
              {...register('username')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 disabled:opacity-50"
            />
          </div>
          {errors.username && <p className="text-[11px] font-semibold text-red-400">{errors.username.message}</p>}
        </div>

        {/* Email & FullName Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 uppercase tracking-wider block">
              Email <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="user@abp.io"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            {errors.email && <p className="text-[11px] font-semibold text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 uppercase tracking-wider block">
              Họ và Tên <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              {...register('fullName')}
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            {errors.fullName && <p className="text-[11px] font-semibold text-red-400">{errors.fullName.message}</p>}
          </div>
        </div>

        {/* Phân quyền Merchant (Bật / Tắt duy nhất quyền Merchant) */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <label htmlFor="isMerchantCheckbox" className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Quyền Đối Tác Merchant (Chủ Nhà Hàng)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${isMerchantChecked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {isMerchantChecked ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </span>
              </label>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Khi tích chọn, tài khoản này sẽ được cấp quyền đăng nhập Kênh Merchant Portal, tạo quán ăn, quản lý thực đơn và đơn hàng.
              </p>
            </div>

            <input
              type="checkbox"
              id="isMerchantCheckbox"
              {...register('isMerchant')}
              className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 shrink-0"
            />
          </div>

          {/* Hiển thị các quyền hệ thống khác đang có của tài khoản (Read-only) */}
          {otherRoles.length > 0 && (
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Vai trò hệ thống khác:</span>
              {otherRoles.map((r) => (
                <span
                  key={r}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    r === 'Admin'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  🛡️ {r}
                </span>
              ))}
              <div className="flex items-center gap-1 text-[10px] text-slate-500 italic ml-auto">
                <Info className="w-3 h-3 text-slate-400" />
                <span>Cần quản lý Admin trên Identity Server</span>
              </div>
            </div>
          )}
        </div>

        {/* Mật khẩu */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            {initialData ? 'Mật Khẩu Mới (Để trống nếu giữ nguyên)' : 'Mật Khẩu Mặc Định'}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Passw0rd@123"
              {...register('password')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          {errors.password && <p className="text-[11px] font-semibold text-red-400">{errors.password.message}</p>}
        </div>

        {/* Trạng thái Active */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="userActive"
            {...register('isActive')}
            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="userActive" className="text-xs font-semibold text-slate-200 cursor-pointer">
            Cho phép đăng nhập ngay (Active account)
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
          >
            Hủy Bỏ
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-pink-400 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{initialData ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
