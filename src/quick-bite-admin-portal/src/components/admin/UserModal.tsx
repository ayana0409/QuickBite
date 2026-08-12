import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import type { User } from '../../types';
import { User as UserIcon, Mail, Shield, Lock, Loader2 } from 'lucide-react';

const userSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập từ 3 ký tự trở lên'),
  email: z.string().email('Email không đúng định dạng'),
  fullName: z.string().min(2, 'Họ tên từ 2 ký tự trở lên'),
  password: z.string().min(6, 'Mật khẩu từ 6 ký tự trở lên').optional().or(z.literal('')),
  role: z.enum(['Admin', 'Merchant', 'Customer'] as const),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
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
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: 'Merchant',
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        username: initialData.username,
        email: initialData.email,
        fullName: initialData.fullName,
        password: '',
        role: initialData.role,
        isActive: initialData.isActive,
      });
    } else {
      reset({
        username: '',
        email: '',
        fullName: '',
        password: 'Passw0rd@123',
        role: 'Merchant',
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: UserFormValues) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh Sửa Người Dùng' : 'Tạo Tài Khoản Hệ Thống'}
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

        {/* Role & Mật khẩu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 uppercase tracking-wider block">
              Vai Trò (Role) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                {...register('role')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500/60 appearance-none cursor-pointer"
              >
                <option value="Merchant">Merchant (Chủ Nhà Hàng)</option>
                <option value="Admin">Admin (Quản Trị Viên)</option>
                <option value="Customer">Customer (Khách Hàng)</option>
              </select>
            </div>
          </div>

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
          </div>
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
            className="px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-pink-400 transition-all flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{initialData ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
