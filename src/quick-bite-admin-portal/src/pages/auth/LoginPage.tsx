import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User as UserIcon, Loader2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { loginUser } from '../../services/authService';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(4, 'Mật khẩu phải từ 4 ký tự trở lên'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

import { canAccessAdminPortal, isMerchant } from '../../constants/roles';

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await loginUser({
        username: data.username,
        password: data.password,
      });

      // Điều hướng thông minh dựa trên role
      if (from) {
        navigate(from, { replace: true });
      } else if (canAccessAdminPortal(user)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (isMerchant(user)) {
        navigate('/merchant/dashboard', { replace: true });
      } else {
        navigate('/unauthorized', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const apiMsg = err.response?.data?.error_description || err.response?.data?.message || err.message;
      setErrorMessage(apiMsg || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'merchant') => {
    if (role === 'admin') {
      setValue('username', 'testadmin');
      setValue('password', 'Passw0rd@123');
    } else {
      setValue('username', 'testmerchant');
      setValue('password', 'Passw0rd@123');
    }
    setErrorMessage(null);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-black text-slate-100">Đăng Nhập Hệ Thống</h2>
        <p className="text-xs text-slate-400">
          Nhập tài khoản để truy cập Admin Portal hoặc Merchant Portal
        </p>
      </div>

      {/* Thông báo lỗi nếu đăng nhập thất bại */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-shake">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Lỗi xác thực!</p>
            <p className="text-red-300/80">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form Đăng Nhập */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username / Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Tên đăng nhập / Email
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="admin@abp.io"
              disabled={isLoading}
              {...register('username')}
              className={`w-full pl-10 pr-4 py-3 bg-slate-950/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${errors.username
                ? 'border-red-500/80 focus:ring-red-500/40'
                : 'border-slate-800 focus:border-amber-500/60 focus:ring-amber-500/30'
                }`}
            />
          </div>
          {errors.username && (
            <p className="text-[11px] font-semibold text-red-400">{errors.username.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Mật khẩu
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
              className={`w-full pl-10 pr-4 py-3 bg-slate-950/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${errors.password
                ? 'border-red-500/80 focus:ring-red-500/40'
                : 'border-slate-800 focus:border-amber-500/60 focus:ring-amber-500/30'
                }`}
            />
          </div>
          <div className="flex items-center justify-between">
            <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] text-amber-400 hover:underline">
              Quên mật khẩu?
            </a>
          </div>
          {errors.password && (
            <p className="text-[11px] font-semibold text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang kết nối API Gateway...</span>
            </>
          ) : (
            <>
              <span>XÁC THỰC & ĐĂNG NHẬP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-slate-900/90 px-3 text-slate-400 font-semibold tracking-wider">
            Hoặc tiếp tục với
          </span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <GoogleLoginButton onError={(err) => setErrorMessage(err)} />

      {/* Quick Demo Fill helper for development testing */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium justify-center">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Điền nhanh tài khoản thử nghiệm:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold text-center transition-all"
          >
            🛡️ Demo Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('merchant')}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold text-center transition-all"
          >
            🏪 Demo Merchant
          </button>
        </div>
      </div>
    </div>
  );
}
