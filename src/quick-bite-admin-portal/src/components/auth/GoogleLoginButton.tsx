import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { loginWithGoogle } from '../../services/authService';

interface GoogleLoginButtonProps {
  onError?: (errorMessage: string) => void;
  className?: string;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onError,
  className = '',
}) => {
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const handleBackendGoogleLogin = async (idToken: string) => {
    setIsPending(true);
    try {
      // 1. Authenticate with Identity Service
      const user = await loginWithGoogle(idToken);

      // 2. Smart role-based redirection
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'Admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'Merchant') {
        navigate('/merchant/dashboard', { replace: true });
      } else {
        navigate('/merchant/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('❌ [GoogleLoginButton Error]:', err);
      const msg =
        err.response?.data?.error_description ||
        err.response?.data?.message ||
        err.message ||
        'Đăng nhập bằng tài khoản Google thất bại.';
      if (onError) {
        onError(msg);
      }
    } finally {
      setIsPending(false);
    }
  };

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      if ((tokenResponse as any).id_token) {
        await handleBackendGoogleLogin((tokenResponse as any).id_token);
        return;
      }

      if (tokenResponse.access_token) {
        await handleBackendGoogleLogin(tokenResponse.access_token);
      }
    },
    onError: (error) => {
      console.error('❌ Google OAuth Dialog Error:', error);
      const msg = 'Không thể kết nối với tài khoản Google. Vui lòng thử lại.';
      if (onError) {
        onError(msg);
      }
      setIsPending(false);
    },
  });

  return (
    <button
      type="button"
      onClick={() => {
        setIsPending(true);
        login();
      }}
      disabled={isPending}
      className={`w-full py-3 px-4 bg-slate-950/80 hover:bg-slate-800/90 text-slate-200 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700/80 hover:border-slate-600 shadow-lg shadow-black/20 hover:shadow-black/40 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] ${className}`}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Đang xác thực với Google...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          <span>Đăng nhập bằng tài khoản Google</span>
        </>
      )}
    </button>
  );
};

export default GoogleLoginButton;
