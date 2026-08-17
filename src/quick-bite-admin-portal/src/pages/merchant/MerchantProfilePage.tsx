import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Store,
  MapPin,
  Save,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Star,
  Clock,
  Info,
} from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../services/restaurantService';
import { toast } from '../../stores/toastStore';
import Input from '../../components/common/Form/Input';

// Zod Validation Schema for Restaurant Profile
const restaurantProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhà hàng không được để trống')
    .min(3, 'Tên nhà hàng phải có ít nhất 3 ký tự')
    .max(100, 'Tên nhà hàng không được vượt quá 100 ký tự'),
  status: z.enum(['open', 'closed']),
  address: z.object({
    line1: z
      .string()
      .trim()
      .min(1, 'Địa chỉ đường / số nhà không được để trống'),
    ward: z
      .string()
      .trim()
      .min(1, 'Phường / Xã không được để trống'),
    district: z
      .string()
      .trim()
      .min(1, 'Quận / Huyện không được để trống'),
    city: z
      .string()
      .trim()
      .min(1, 'Tỉnh / Thành phố không được để trống'),
  }),
});

type RestaurantProfileFormData = z.infer<typeof restaurantProfileSchema>;

export default function MerchantProfilePage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RestaurantProfileFormData>({
    resolver: zodResolver(restaurantProfileSchema),
    defaultValues: {
      name: '',
      status: 'open',
      address: {
        line1: '',
        ward: '',
        district: '',
        city: 'Hồ Chí Minh',
      },
    },
  });

  const watchedValues = watch();
  const currentStatus = watchedValues.status;

  // Fetch current restaurant profile data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      try {
        const data = await restaurantService.getMerchantProfile();
        if (data && isMounted) {
          setRestaurant(data);
          reset({
            name: data.name || '',
            status: data.status === 'open' ? 'open' : 'closed',
            address: {
              line1: data.address?.line1 || '',
              ward: data.address?.ward || '',
              district: data.address?.district || '',
              city: data.address?.city || 'Hồ Chí Minh',
            },
          });
        }
      } catch (err: any) {
        console.error('Error fetching merchant restaurant profile:', err);
        toast.error('Không thể tải thông tin hồ sơ nhà hàng.', 'Lỗi tải dữ liệu');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [reset]);

  // Submit handler for updating profile
  const onSubmit = async (formData: RestaurantProfileFormData) => {
    try {
      const updated = await restaurantService.updateMerchantProfile({
        name: formData.name,
        status: formData.status,
        address: {
          line1: formData.address.line1,
          ward: formData.address.ward,
          district: formData.address.district,
          city: formData.address.city,
          geo: restaurant?.address?.geo ?? {
            type: 'Point',
            coordinates: [106.660172, 10.762622],
          },
        },
      });

      if (updated) {
        setRestaurant(updated);
        reset({
          name: updated.name || formData.name,
          status: updated.status === 'open' ? 'open' : 'closed',
          address: {
            line1: updated.address?.line1 || formData.address.line1,
            ward: updated.address?.ward || formData.address.ward,
            district: updated.address?.district || formData.address.district,
            city: updated.address?.city || formData.address.city,
          },
        });
        toast.success('Hồ sơ nhà hàng đã được cập nhật thành công!', 'Thành công');
      }
    } catch (err: any) {
      console.error('Failed to update restaurant profile:', err);
      // axiosClient handles toast display for errors
    }
  };

  const handleResetForm = () => {
    if (restaurant) {
      reset({
        name: restaurant.name || '',
        status: restaurant.status === 'open' ? 'open' : 'closed',
        address: {
          line1: restaurant.address?.line1 || '',
          ward: restaurant.address?.ward || '',
          district: restaurant.address?.district || '',
          city: restaurant.address?.city || 'Hồ Chí Minh',
        },
      });
      toast.info('Đã hoàn tác các thay đổi chưa lưu.', 'Khôi phục dữ liệu');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Store className="w-5 h-5 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Đang tải thông tin hồ sơ nhà hàng...
        </p>
      </div>
    );
  }

  const fullAddressPreview = [
    watchedValues.address?.line1,
    watchedValues.address?.ward,
    watchedValues.address?.district,
    watchedValues.address?.city,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
                Hồ Sơ & Cài Đặt Nhà Hàng
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Merchant
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Quản lý tên quán, trạng thái mở/đóng cửa nhận đơn và địa chỉ phục vụ khách hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{restaurant?.rating?.avg ?? 5.0}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{restaurant?.rating?.count ?? 0}</span> đánh giá
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1: Thông tin cơ bản & Trạng thái hoạt động */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Thông Tin Cơ Bản & Trạng Thái</h2>
                <p className="text-xs text-slate-400">
                  Thiết lập tên hiển thị của quán và chuyển đổi nhanh trạng thái nhận đơn trực tuyến.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Restaurant Name Field */}
            <div className="space-y-2">
              <Input
                label="Tên Nhà Hàng / Quán Ăn"
                placeholder="VD: Phở Gia Truyền Bát Đàn..."
                required
                icon={<Store className="w-4 h-4" />}
                error={errors.name?.message}
                {...register('name')}
              />
              <p className="text-[11px] text-slate-500">
                Tên này sẽ hiển thị trực tiếp cho khách hàng trên ứng dụng đặt món.
              </p>
            </div>

            {/* Toggle Switch: Trạng thái kinh doanh */}
            <div className="space-y-2">
              <label className="font-bold text-xs text-slate-300 flex items-center justify-between">
                <span>
                  Trạng Thái Kinh Doanh
                  <span className="text-red-400 font-black ml-1">*</span>
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    currentStatus === 'open'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {currentStatus === 'open' ? 'Đang Mở Cửa' : 'Tạm Đóng Cửa'}
                </span>
              </label>

              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div
                    onClick={() => field.onChange(field.value === 'open' ? 'closed' : 'open')}
                    className={`cursor-pointer group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                      field.value === 'open'
                        ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg transition-colors ${
                          field.value === 'open'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {field.value === 'open' ? 'Sẵn Sàng Nhận Đơn Mới' : 'Tạm Ngưng Nhận Đơn'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {field.value === 'open'
                            ? 'Khách hàng có thể tìm thấy quán và đặt món ngay.'
                            : 'Quán sẽ hiển thị trạng thái Đóng cửa trên ứng dụng khách.'}
                        </p>
                      </div>
                    </div>

                    {/* Modern Toggle Switch UI */}
                    <div
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                        field.value === 'open' ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                          field.value === 'open' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              />
              {errors.status?.message && (
                <p className="text-[11px] font-semibold text-red-400">• {errors.status.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Địa chỉ kinh doanh */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Địa Chỉ Hoạt Động & Giao Hàng</h2>
                <p className="text-xs text-slate-400">
                  Địa chỉ thực tế của cơ sở để tài xế đến lấy món và tính toán bán kính giao hàng.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Input
                label="Số Nhà / Tên Đường (Line 1)"
                placeholder="VD: 123 Nguyễn Thị Minh Khai"
                required
                icon={<MapPin className="w-4 h-4" />}
                error={errors.address?.line1?.message}
                {...register('address.line1')}
              />
            </div>

            <div>
              <Input
                label="Phường / Xã"
                placeholder="VD: Phường Đa Kao..."
                required
                error={errors.address?.ward?.message}
                {...register('address.ward')}
              />
            </div>

            <div>
              <Input
                label="Quận / Huyện"
                placeholder="VD: Quận 1..."
                required
                error={errors.address?.district?.message}
                {...register('address.district')}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Tỉnh / Thành Phố"
                placeholder="VD: TP. Hồ Chí Minh..."
                required
                error={errors.address?.city?.message}
                {...register('address.city')}
              />
            </div>
          </div>

          {/* Full Address Preview Box */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1.5 bg-slate-800 text-slate-400 rounded-lg mt-0.5">
              <Info className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="space-y-0.5 flex-1">
              <p className="text-xs font-bold text-slate-300">Xem trước chuỗi địa chỉ đầy đủ:</p>
              <p className="text-xs text-slate-400 font-mono">
                {fullAddressPreview || 'Chưa nhập đầy đủ địa chỉ...'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Định danh & Bảo mật hệ thống (Read-only) */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Thông Tin Định Danh Hệ Thống</h2>
              <p className="text-xs text-slate-400">
                Được liên kết tự động với tài khoản bảo mật của Merchant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium">Mã Nhà Hàng (Restaurant ID):</span>
              <p className="font-mono text-slate-300 select-all truncate">{restaurant?.id || '—'}</p>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium">Đường dẫn định danh (Slug):</span>
              <p className="font-mono text-emerald-400 select-all truncate">
                /{restaurant?.slug || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky / Bottom Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleResetForm}
            disabled={!isDirty || isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Khôi Phục Ban Đầu
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang Lưu Thay Đổi...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu Thay Đổi Hồ Sơ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
