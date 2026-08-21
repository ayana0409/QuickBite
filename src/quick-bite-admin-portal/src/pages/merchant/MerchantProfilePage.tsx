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
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Compass,
} from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../services/restaurantService';
import { profileService, type MyProfileDto } from '../../services/profileService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import Input from '../../components/common/Form/Input';
import MerchantMapPicker, { type AddressInfo } from '../../components/merchant/MerchantMapPicker';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

// 1. Restaurant Profile Schema
const restaurantProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhà hàng không được để trống')
    .min(3, 'Tên nhà hàng phải có ít nhất 3 ký tự')
    .max(100, 'Tên nhà hàng không được vượt quá 100 ký tự'),
  status: z.enum(['open', 'closed']),
  address: z.object({
    line1: z.string().trim().min(1, 'Địa chỉ đường / số nhà không được để trống'),
    ward: z.string().trim().min(1, 'Phường / Xã không được để trống'),
    district: z.string().trim().min(1, 'Quận / Huyện không được để trống'),
    city: z.string().trim().min(1, 'Tỉnh / Thành phố không được để trống'),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
  }),
});
type RestaurantProfileFormData = z.infer<typeof restaurantProfileSchema>;

// 2. Personal Profile Schema
const personalProfileSchema = z.object({
  userName: z.string(),
  email: z.string().email('Email không hợp lệ'),
  name: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(64, 'Họ và tên không được vượt quá 64 ký tự'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Số điện thoại là bắt buộc')
    .regex(/^(\+84|84|0)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)'),
});
type PersonalProfileFormData = z.infer<typeof personalProfileSchema>;

// 3. Password Change Schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới',
  });
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function MerchantProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'restaurant'>('personal');
  const { user, updateUser } = useAuthStore();

  // ─── States ─────────────────────────────────────────────────────────────────
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [personalProfile, setPersonalProfile] = useState<MyProfileDto | null>(null);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState<boolean>(true);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState<boolean>(true);

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── Forms ──────────────────────────────────────────────────────────────────

  // Form 1: Restaurant Form
  const {
    register: registerRestaurant,
    handleSubmit: handleRestaurantSubmit,
    control: controlRestaurant,
    reset: resetRestaurant,
    setValue: setValueRestaurant,
    watch: watchRestaurant,
    formState: { errors: restaurantErrors, isSubmitting: isSubmittingRestaurant, isDirty: isDirtyRestaurant },
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
        longitude: 106.702444,
        latitude: 10.776192,
      },
    },
  });

  // Form 2: Personal Profile Form
  const {
    register: registerPersonal,
    handleSubmit: handlePersonalSubmit,
    reset: resetPersonal,
    formState: { errors: personalErrors, isSubmitting: isSubmittingPersonal, isDirty: isDirtyPersonal },
  } = useForm<PersonalProfileFormData>({
    resolver: zodResolver(personalProfileSchema),
    defaultValues: { userName: '', email: '', name: '', phoneNumber: '' },
  });

  // Form 3: Change Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // ─── Load Data ──────────────────────────────────────────────────────────────

  // 1. Fetch Personal Profile
  useEffect(() => {
    let isMounted = true;

    async function loadPersonal() {
      setIsLoadingPersonal(true);
      try {
        const data = await profileService.getMyProfile();
        if (data && isMounted) {
          setPersonalProfile(data);
          resetPersonal({
            userName: data.userName || user?.username || '',
            email: data.email || user?.email || '',
            name: data.name || user?.fullName || data.userName || '',
            phoneNumber: data.phoneNumber || '',
          });
        }
      } catch (err: any) {
        console.error('Error fetching personal profile:', err);
        // Fallback with store data if Identity API temporarily cold
        if (user && isMounted) {
          resetPersonal({
            userName: user.username,
            email: user.email,
            name: user.fullName || user.username,
            phoneNumber: '',
          });
        }
      } finally {
        if (isMounted) setIsLoadingPersonal(false);
      }
    }

    loadPersonal();
    return () => {
      isMounted = false;
    };
  }, [resetPersonal, user]);

  // 2. Fetch Restaurant Profile
  useEffect(() => {
    let isMounted = true;

    async function loadRestaurant() {
      setIsLoadingRestaurant(true);
      try {
        const data = await restaurantService.getMerchantProfile();
        if (data && isMounted) {
          setRestaurant(data);
          const rawCoords = data.address?.geo?.coordinates;
          const lng = rawCoords && typeof rawCoords[0] === 'number' ? rawCoords[0] : 106.702444;
          const lat = rawCoords && typeof rawCoords[1] === 'number' ? rawCoords[1] : 10.776192;

          resetRestaurant({
            name: data.name || '',
            status: data.status === 'open' ? 'open' : 'closed',
            address: {
              line1: data.address?.line1 || '',
              ward: data.address?.ward || '',
              district: data.address?.district || '',
              city: data.address?.city || 'Hồ Chí Minh',
              longitude: lng,
              latitude: lat,
            },
          });
        }
      } catch (err: any) {
        console.error('Error fetching merchant restaurant profile:', err);
        toast.error('Không thể tải thông tin hồ sơ nhà hàng.', 'Lỗi tải dữ liệu');
      } finally {
        if (isMounted) setIsLoadingRestaurant(false);
      }
    }

    loadRestaurant();
    return () => {
      isMounted = false;
    };
  }, [resetRestaurant]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  // Handle Update Personal Profile
  const onPersonalSubmit = async (formData: PersonalProfileFormData) => {
    try {
      const updated = await profileService.updateMyProfile({
        userName: personalProfile?.userName || formData.userName,
        name: formData.name,
        phoneNumber: formData.phoneNumber,
      });

      setPersonalProfile(updated);
      updateUser({ fullName: updated.name || formData.name });
      resetPersonal({
        userName: updated.userName || formData.userName,
        email: updated.email || formData.email,
        name: updated.name || formData.name,
        phoneNumber: updated.phoneNumber || formData.phoneNumber,
      });

      toast.success('Hồ sơ cá nhân đã được cập nhật thành công!', 'Thành công');
    } catch (err: any) {
      console.error('Failed to update personal profile:', err);
      toast.error(err?.message || 'Không thể cập nhật hồ sơ cá nhân.', 'Lỗi cập nhật');
    }
  };

  // Handle Change Password
  const onPasswordSubmit = async (formData: ChangePasswordFormData) => {
    try {
      await profileService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      resetPassword();
      toast.success('Mật khẩu của bạn đã được thay đổi thành công!', 'Bảo mật an toàn');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      toast.error(
        err?.message || 'Mật khẩu hiện tại không chính xác hoặc không hợp lệ.',
        'Đổi mật khẩu thất bại'
      );
    }
  };

  // Handle Map Location Selection & Auto-fill
  const handleMapLocationSelect = (
    lat: number,
    lng: number,
    addressInfo: AddressInfo
  ) => {
    setValueRestaurant('address.latitude', lat, { shouldDirty: true, shouldValidate: true });
    setValueRestaurant('address.longitude', lng, { shouldDirty: true, shouldValidate: true });

    if (addressInfo.line1) {
      setValueRestaurant('address.line1', addressInfo.line1, { shouldDirty: true, shouldValidate: true });
    }
    if (addressInfo.ward) {
      setValueRestaurant('address.ward', addressInfo.ward, { shouldDirty: true, shouldValidate: true });
    }
    if (addressInfo.district) {
      setValueRestaurant('address.district', addressInfo.district, { shouldDirty: true, shouldValidate: true });
    }
    if (addressInfo.city) {
      setValueRestaurant('address.city', addressInfo.city, { shouldDirty: true, shouldValidate: true });
    }
  };

  // Handle Update Restaurant Profile
  const onRestaurantSubmit = async (formData: RestaurantProfileFormData) => {
    try {
      const lng =
        formData.address.longitude !== undefined
          ? formData.address.longitude
          : restaurant?.address?.geo?.coordinates?.[0] ?? 106.702444;
      const lat =
        formData.address.latitude !== undefined
          ? formData.address.latitude
          : restaurant?.address?.geo?.coordinates?.[1] ?? 10.776192;

      const updated = await restaurantService.updateMerchantProfile({
        name: formData.name,
        status: formData.status,
        address: {
          line1: formData.address.line1,
          ward: formData.address.ward,
          district: formData.address.district,
          city: formData.address.city,
          geo: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      });

      if (updated) {
        setRestaurant(updated);
        const updatedLng = updated.address?.geo?.coordinates?.[0] ?? lng;
        const updatedLat = updated.address?.geo?.coordinates?.[1] ?? lat;

        resetRestaurant({
          name: updated.name || formData.name,
          status: updated.status === 'open' ? 'open' : 'closed',
          address: {
            line1: updated.address?.line1 || formData.address.line1,
            ward: updated.address?.ward || formData.address.ward,
            district: updated.address?.district || formData.address.district,
            city: updated.address?.city || formData.address.city,
            longitude: updatedLng,
            latitude: updatedLat,
          },
        });
        toast.success('Hồ sơ nhà hàng và tọa độ bản đồ đã được cập nhật thành công!', 'Thành công');
      }
    } catch (err: any) {
      console.error('Failed to update restaurant profile:', err);
      toast.error(err?.message || 'Không thể cập nhật hồ sơ nhà hàng.', 'Lỗi cập nhật');
    }
  };

  const handleResetRestaurantForm = () => {
    if (restaurant) {
      const rawCoords = restaurant.address?.geo?.coordinates;
      const lng = rawCoords && typeof rawCoords[0] === 'number' ? rawCoords[0] : 106.702444;
      const lat = rawCoords && typeof rawCoords[1] === 'number' ? rawCoords[1] : 10.776192;

      resetRestaurant({
        name: restaurant.name || '',
        status: restaurant.status === 'open' ? 'open' : 'closed',
        address: {
          line1: restaurant.address?.line1 || '',
          ward: restaurant.address?.ward || '',
          district: restaurant.address?.district || '',
          city: restaurant.address?.city || 'Hồ Chí Minh',
          longitude: lng,
          latitude: lat,
        },
      });
      toast.info('Đã hoàn tác các thay đổi chưa lưu.', 'Khôi phục dữ liệu');
    }
  };

  const watchedRestaurantValues = watchRestaurant();
  const currentStatus = watchedRestaurantValues.status;
  const fullAddressPreview = [
    watchedRestaurantValues.address?.line1,
    watchedRestaurantValues.address?.ward,
    watchedRestaurantValues.address?.district,
    watchedRestaurantValues.address?.city,
  ]
    .filter(Boolean)
    .join(', ');

  const displayName = personalProfile?.name || user?.fullName || personalProfile?.userName || 'Merchant';
  const avatarInitials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Header & Tab Navigation ────────────────────────────────────────── */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20 shrink-0">
              {avatarInitials || 'M'}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
                {displayName}
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Merchant Partner
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                {personalProfile?.email || user?.email || 'Quản lý tài khoản & cài đặt nhà hàng của bạn'}
              </p>
            </div>
          </div>

          {/* Restaurant Rating pill */}
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{restaurant?.rating?.avg ?? 5.0}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-800" />
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{restaurant?.rating?.count ?? 0}</span> đánh giá quán
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Hồ Sơ Cá Nhân & Mật Khẩu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restaurant')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'restaurant'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Thông Tin & Cài Đặt Nhà Hàng</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU                                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'personal' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Card 1.1: Thông tin tài khoản cá nhân */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Thông Tin Tài Khoản Cơ Bản</h2>
                  <p className="text-xs text-slate-400">
                    Cập nhật họ tên hiển thị và số điện thoại liên hệ của đối tác.
                  </p>
                </div>
              </div>
            </div>

            {isLoadingPersonal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : (
              <form onSubmit={handlePersonalSubmit(onPersonalSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Username (Disabled) */}
                  <Input
                    label="Tên Tài Khoản (Username)"
                    disabled
                    icon={<UserIcon className="w-4 h-4" />}
                    helperText="Tên đăng nhập cố định của tài khoản, không thể thay đổi."
                    {...registerPersonal('userName')}
                  />

                  {/* Email (Disabled) */}
                  <Input
                    label="Email Đăng Nhập"
                    type="email"
                    disabled
                    icon={<Mail className="w-4 h-4" />}
                    helperText="Email bảo mật dùng để nhận thông báo từ hệ thống."
                    {...registerPersonal('email')}
                  />

                  {/* Full Name (Editable) */}
                  <Input
                    label="Họ và Tên / Tên Hiển Thị"
                    placeholder="VD: Nguyễn Văn A..."
                    required
                    icon={<UserIcon className="w-4 h-4" />}
                    error={personalErrors.name?.message}
                    {...registerPersonal('name')}
                  />

                  {/* Phone Number (Editable) */}
                  <Input
                    label="Số Điện Thoại Liên Hệ"
                    type="tel"
                    placeholder="VD: 0912 345 678"
                    required
                    icon={<Phone className="w-4 h-4" />}
                    error={personalErrors.phoneNumber?.message}
                    {...registerPersonal('phoneNumber')}
                  />
                </div>

                {/* Submit Personal Profile Button */}
                <div className="flex justify-end pt-2 border-t border-slate-800/80">
                  <button
                    type="submit"
                    disabled={isSubmittingPersonal || !isDirtyPersonal}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingPersonal ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang Lưu Thông Tin...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lưu Thông Tin Cá Nhân
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card 1.2: Đổi mật khẩu tài khoản */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Bảo Mật & Đổi Mật Khẩu</h2>
                  <p className="text-xs text-slate-400">
                    Nên thay đổi mật khẩu định kỳ để bảo vệ tài khoản quản trị nhà hàng.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Current Password */}
                <Input
                  label="Mật Khẩu Hiện Tại"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />

                {/* New Password */}
                <Input
                  label="Mật Khẩu Mới (Min 6 ký tự)"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />

                {/* Confirm Password */}
                <Input
                  label="Xác Nhận Mật Khẩu Mới"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="cursor-pointer hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
              </div>

              {/* Submit Password Button */}
              <div className="flex justify-end pt-2 border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang Cập Nhật Mật Khẩu...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Đổi Mật Khẩu Bảo Mật
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: THÔNG TIN & CÀI ĐẶT NHÀ HÀNG                                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'restaurant' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {isLoadingRestaurant ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <p className="text-slate-400 text-sm font-medium animate-pulse">
                Đang tải thông tin hồ sơ nhà hàng...
              </p>
            </div>
          ) : (
            <form onSubmit={handleRestaurantSubmit(onRestaurantSubmit)} className="space-y-6">
              {/* Card 2.1: Tên quán & Trạng thái hoạt động */}
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
                      error={restaurantErrors.name?.message}
                      {...registerRestaurant('name')}
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
                      control={controlRestaurant}
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
                    {restaurantErrors.status?.message && (
                      <p className="text-[11px] font-semibold text-red-400">• {restaurantErrors.status.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2.2: Địa chỉ kinh doanh */}
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
                      error={restaurantErrors.address?.line1?.message}
                      {...registerRestaurant('address.line1')}
                    />
                  </div>

                  <div>
                    <Input
                      label="Phường / Xã"
                      placeholder="VD: Phường Đa Kao..."
                      required
                      error={restaurantErrors.address?.ward?.message}
                      {...registerRestaurant('address.ward')}
                    />
                  </div>

                  <div>
                    <Input
                      label="Quận / Huyện"
                      placeholder="VD: Quận 1..."
                      required
                      error={restaurantErrors.address?.district?.message}
                      {...registerRestaurant('address.district')}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Tỉnh / Thành Phố"
                      placeholder="VD: TP. Hồ Chí Minh..."
                      required
                      error={restaurantErrors.address?.city?.message}
                      {...registerRestaurant('address.city')}
                    />
                  </div>
                </div>

                {/* Interactive Map Coordinates Picker */}
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <label className="font-bold text-xs text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      Vị Trí & Tọa Độ Bản Đồ (GPS)
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Nhấp chọn trên bản đồ để tự động điền địa chỉ
                    </span>
                  </label>

                  <MerchantMapPicker
                    position={[
                      watchedRestaurantValues.address?.latitude ??
                        restaurant?.address?.geo?.coordinates?.[1] ??
                        10.776192,
                      watchedRestaurantValues.address?.longitude ??
                        restaurant?.address?.geo?.coordinates?.[0] ??
                        106.702444,
                    ]}
                    onLocationSelect={handleMapLocationSelect}
                  />
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

              {/* Card 2.3: Định danh hệ thống (Read-only) */}
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

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleResetRestaurantForm}
                  disabled={!isDirtyRestaurant || isSubmittingRestaurant}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Khôi Phục Ban Đầu
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingRestaurant}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingRestaurant ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang Lưu Thay Đổi...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Lưu Thay Đổi Hồ Sơ Nhà Hàng
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
