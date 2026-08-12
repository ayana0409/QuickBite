import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import type { Restaurant } from '../../types';
import { Store, MapPin, FileText, UserCheck, Loader2 } from 'lucide-react';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Tên nhà hàng phải từ 2 ký tự trở lên'),
  ownerId: z.string().min(1, 'Vui lòng chọn hoặc nhập ID chủ sở hữu (Merchant)'),
  address: z.string().min(5, 'Địa chỉ phải đầy đủ từ 5 ký tự trở lên'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type RestaurantFormValues = z.infer<typeof restaurantSchema>;

interface RestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: RestaurantFormValues) => Promise<void>;
  initialData?: Restaurant | null;
  isLoading?: boolean;
}

export const RestaurantModal: React.FC<RestaurantModalProps> = ({
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
  } = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: '',
      ownerId: 'usr-merchant-001',
      address: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        ownerId: initialData.ownerId,
        address: initialData.address,
        description: initialData.description || '',
        isActive: initialData.isActive,
      });
    } else {
      reset({
        name: '',
        ownerId: 'usr-merchant-001',
        address: '',
        description: '',
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: RestaurantFormValues) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh Sửa Nhà Hàng' : 'Thêm Nhà Hàng Mới'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        {/* Tên nhà hàng */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            Tên Nhà Hàng <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cơm Tấm Sườn Bì Chả Sài Gòn"
              {...register('name')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          {errors.name && <p className="text-[11px] font-semibold text-red-400">{errors.name.message}</p>}
        </div>

        {/* Owner Merchant ID */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            Chủ Sở Hữu (Merchant ID) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              {...register('ownerId')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500/60 appearance-none cursor-pointer"
            >
              <option value="usr-merchant-001">usr-merchant-001 (Nguyễn Thị Chủ Quán)</option>
              <option value="usr-merchant-002">usr-merchant-002 (Trần Văn Phở)</option>
              <option value="usr-merchant-new">usr-merchant-new (Merchant Mới)</option>
            </select>
          </div>
          {errors.ownerId && <p className="text-[11px] font-semibold text-red-400">{errors.ownerId.message}</p>}
        </div>

        {/* Địa chỉ */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">
            Địa Chỉ Kinh Doanh <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
              {...register('address')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          {errors.address && <p className="text-[11px] font-semibold text-red-400">{errors.address.message}</p>}
        </div>

        {/* Mô tả */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 uppercase tracking-wider block">Mô Tả Giới Thiệu</label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <textarea
              rows={3}
              placeholder="Đặc sản cơm tấm sườn nướng..."
              {...register('description')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Trạng thái Active */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="restaurantActive"
            {...register('isActive')}
            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="restaurantActive" className="text-xs font-semibold text-slate-200 cursor-pointer">
            Kích hoạt kinh doanh ngay sau khi lưu (Active)
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
            <span>{initialData ? 'Cập Nhật' : 'Tạo Nhà Hàng'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
