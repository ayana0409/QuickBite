'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Shield,
  KeyRound,
  AlertCircle,
  Pencil,
  RefreshCw,
} from 'lucide-react';

import { useToast } from '@/src/components/shared/ToastProvider';
import { useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  type MyProfileDto,
} from '@/src/lib/api/identity';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  userName: z.string(),
  email: z.string().email(),
  name: z
    .string()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(64, 'Họ và tên không được vượt quá 64 ký tự'),
  phoneNumber: z
    .string()
    .min(1, 'Số điện thoại là bắt buộc')
    .regex(/^(\+84|84|0)(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  error?: string;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  rightElement?: React.ReactNode;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

function InputField({
  id,
  label,
  icon: Icon,
  error,
  disabled,
  type = 'text',
  placeholder,
  rightElement,
  registration,
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {/* Left icon */}
        <Icon
          className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors ${
            disabled ? 'text-slate-300' : error ? 'text-red-400' : 'text-slate-400'
          }`}
        />
        <input
          id={id}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          {...registration}
          className={`
            w-full pl-10 py-2.5 text-sm rounded-xl border outline-none transition-all
            ${rightElement ? 'pr-10' : 'pr-4'}
            ${
              disabled
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : error
                ? 'bg-red-50/50 border-red-300 text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-500/15'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
            }
          `}
        />
        {/* Right element (e.g. show/hide password) */}
        {rightElement && (
          <div className="absolute right-3">{rightElement}</div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div
          className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {/* Card body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
      ))}
      <div className="h-10 bg-orange-100 rounded-xl mt-2" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AccountProfileForm() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { data: session } = useSession();

  // Determine if the current user logged in via Google OAuth
  const isGoogleAccount =
    session?.user?.provider === 'google' ||
    session?.user?.isGoogle ||
    (typeof window !== 'undefined' &&
      (Cookies.get('auth_provider') === 'google' ||
        localStorage.getItem('auth_provider') === 'google'));

  // Profile loading state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<MyProfileDto | null>(null);

  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Profile Form ──────────────────────────────────────────────────────────
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    reset: resetProfile,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: '', userName: '', name: '', phoneNumber: '' },
  });

  // ── Password Form ─────────────────────────────────────────────────────────
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // ── Fetch profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    async function fetchProfile() {
      try {
        setIsLoadingProfile(true);
        setProfileLoadError(null);
        const data = await getMyProfile();
        if (!isCancelled) {
          setProfileData(data);
          // Pre-fill the profile form with fetched data
          resetProfile({
            email: data.email || '',
            userName: data.userName || '',
            name: data.name || data.userName || '',
            phoneNumber: data.phoneNumber || '',
          });
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin tài khoản. Vui lòng thử lại.';
          setProfileLoadError(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isCancelled = true;
    };
  }, [resetProfile]);

  // ── Submit: Update Profile ────────────────────────────────────────────────
  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      const updated = await updateMyProfile({
        userName: profileData?.userName || values.userName,
        name: values.name,
        phoneNumber: values.phoneNumber,
      });
      setProfileData(updated);
      toastSuccess('✅ Thông tin tài khoản đã được cập nhật thành công!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Cập nhật thất bại. Vui lòng thử lại.';
      toastError(msg);
    }
  };

  // ── Submit: Change Password ───────────────────────────────────────────────
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      resetPassword();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      toastSuccess('🔒 Mật khẩu đã được thay đổi thành công!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      toastError(msg);
    }
  };

  // ── Avatar display name ───────────────────────────────────────────────────
  const displayName = profileData?.name || profileData?.userName || '?';
  const avatarInitials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Profile Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          {/* Avatar circle */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-2xl font-black shadow-inner flex-shrink-0">
            {isLoadingProfile ? (
              <Loader2 className="w-7 h-7 animate-spin text-white/70" />
            ) : (
              <span>{avatarInitials}</span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black truncate">
                {isLoadingProfile ? (
                  <span className="inline-block w-32 h-5 bg-white/30 rounded animate-pulse" />
                ) : (
                  displayName
                )}
              </h1>
              <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Account
              </span>
            </div>
            <p className="text-orange-100 text-xs mt-1 truncate">
              {isLoadingProfile ? (
                <span className="inline-block w-44 h-3.5 bg-white/30 rounded animate-pulse" />
              ) : (
                profileData?.email || '—'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Profile load error banner ────────────────────────────────────────── */}
      {profileLoadError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Không thể tải thông tin</p>
            <p className="text-xs text-red-500 mt-0.5">{profileLoadError}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-auto shrink-0 flex items-center gap-1 text-xs font-semibold hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử lại
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CARD 1 — Thông tin cơ bản                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Thông tin cơ bản"
        subtitle="Cập nhật tên hiển thị và số điện thoại liên hệ"
        icon={Pencil}
        iconColor="bg-gradient-to-br from-orange-500 to-red-500"
      >
        {isLoadingProfile ? (
          <ProfileSkeleton />
        ) : (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4" noValidate>

            {/* Username — disabled */}
            <InputField
              id="userName"
              label="Tên tài khoản (Tên đăng nhập)"
              icon={User}
              disabled
              placeholder="Tên đăng nhập"
              registration={registerProfile('userName')}
              error={profileErrors.userName?.message}
            />

            {/* Email — disabled */}
            <InputField
              id="email"
              label="Email đăng nhập"
              icon={Mail}
              disabled
              placeholder="email@quickbite.vn"
              registration={registerProfile('email')}
              error={profileErrors.email?.message}
            />

            {/* Full Name / Display Name */}
            <InputField
              id="name"
              label="Họ và tên / Tên hiển thị *"
              icon={User}
              placeholder="Nhập họ và tên hiển thị của bạn"
              registration={registerProfile('name')}
              error={profileErrors.name?.message}
              disabled={isProfileSubmitting}
            />

            {/* Phone */}
            <InputField
              id="phoneNumber"
              label="Số điện thoại *"
              icon={Phone}
              type="tel"
              placeholder="0912 345 678"
              registration={registerProfile('phoneNumber')}
              error={profileErrors.phoneNumber?.message}
              disabled={isProfileSubmitting}
            />

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isProfileSubmitting}
                id="btn-update-profile"
                className="
                  w-full sm:w-auto px-8 py-2.5
                  bg-gradient-to-r from-orange-500 to-red-500
                  hover:from-orange-600 hover:to-red-600
                  text-white text-sm font-bold rounded-xl
                  shadow-md shadow-orange-500/25
                  hover:shadow-lg hover:shadow-orange-500/35
                  hover:-translate-y-0.5 active:translate-y-0
                  disabled:opacity-50 disabled:pointer-events-none
                  transition-all duration-200
                  flex items-center gap-2 cursor-pointer
                "
              >
                {isProfileSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cập nhật thông tin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CARD 2 — Đổi mật khẩu / Bảo mật tài khoản                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Bảo mật tài khoản"
        subtitle={
          isGoogleAccount
            ? 'Tài khoản được liên kết và quản lý bởi Google OAuth'
            : 'Thay đổi mật khẩu đăng nhập của bạn'
        }
        icon={Shield}
        iconColor="bg-gradient-to-br from-indigo-500 to-purple-600"
      >
        {isGoogleAccount ? (
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">
                    Đăng nhập qua tài khoản Google
                  </h4>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                    Đã liên kết
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tài khoản của bạn sử dụng xác thực một chạm qua Google. Bạn không cần thiết lập hoặc thay đổi mật khẩu riêng trên hệ thống QuickBite.
                </p>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60">
              <span className="text-xs text-slate-500">
                Để thay đổi mật khẩu hoặc bảo mật 2 lớp cho tài khoản này:
              </span>
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-sm hover:shadow"
              >
                <span>Quản lý bảo mật Google</span>
                <span className="text-slate-400">↗</span>
              </a>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Current password */}
            <InputField
              id="currentPassword"
              label="Mật khẩu hiện tại *"
              icon={Lock}
              type={showCurrent ? 'text' : 'password'}
              placeholder="Nhập mật khẩu hiện tại"
              registration={registerPassword('currentPassword')}
              error={passwordErrors.currentPassword?.message}
              disabled={isPasswordSubmitting}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-none"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Divider hint */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Mật khẩu mới
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* New password */}
            <InputField
              id="newPassword"
              label="Mật khẩu mới *"
              icon={KeyRound}
              type={showNew ? 'text' : 'password'}
              placeholder="Tối thiểu 6 ký tự"
              registration={registerPassword('newPassword')}
              error={passwordErrors.newPassword?.message}
              disabled={isPasswordSubmitting}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(!showNew)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-none"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Confirm password */}
            <InputField
              id="confirmPassword"
              label="Xác nhận mật khẩu mới *"
              icon={KeyRound}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              registration={registerPassword('confirmPassword')}
              error={passwordErrors.confirmPassword?.message}
              disabled={isPasswordSubmitting}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-none"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Security tip */}
            <div className="flex items-start gap-2.5 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <Shield className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-600">
                <span className="font-semibold">Mẹo bảo mật:</span> Sử dụng ít nhất 6 ký tự, kết
                hợp chữ hoa, chữ thường và số để tăng độ bảo mật.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isPasswordSubmitting}
                id="btn-change-password"
                className="
                  w-full sm:w-auto px-8 py-2.5
                  bg-gradient-to-r from-indigo-500 to-purple-600
                  hover:from-indigo-600 hover:to-purple-700
                  text-white text-sm font-bold rounded-xl
                  shadow-md shadow-indigo-500/25
                  hover:shadow-lg hover:shadow-indigo-500/35
                  hover:-translate-y-0.5 active:translate-y-0
                  disabled:opacity-50 disabled:pointer-events-none
                  transition-all duration-200
                  flex items-center gap-2 cursor-pointer
                "
              >
                {isPasswordSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Đổi mật khẩu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
