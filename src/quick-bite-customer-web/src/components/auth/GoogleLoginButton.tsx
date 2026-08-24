"use client";

import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { signIn } from "next-auth/react";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";
import { useToast } from "../shared/ToastProvider";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export default function GoogleLoginButton({
  onSuccess,
  redirectTo = "/",
  className = "",
}: GoogleLoginButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const toast = useToast();

  const handleBackendGoogleLogin = async (idToken: string) => {
    setIsPending(true);
    try {
      const identityUrl =
        process.env.NEXT_PUBLIC_IDENTITY_URL ||
        "https://quick-bite-identity.onrender.com";

      // 1. Call Backend ABP Identity Service to validate Google ID Token and get JWT
      const response = await fetch(`${identityUrl}/api/app/auth/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          errorData?.message ||
          "Đăng nhập Google thất bại. Vui lòng thử lại.";
        throw new Error(message);
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token || tokenData.accessToken;
      const idTokenFromBE = tokenData.id_token || tokenData.idToken;
      const refreshToken = tokenData.refresh_token || tokenData.refreshToken;

      if (!accessToken) {
        throw new Error("Không nhận được mã xác thực từ máy chủ.");
      }

      // 2. Save Access Token and Provider to Cookie (js-cookie) and LocalStorage
      Cookies.set("qb_access_token", accessToken, { expires: 30 });
      Cookies.set("auth_provider", "google", { expires: 30 });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("qb_access_token", accessToken);
          localStorage.setItem("auth_provider", "google");
        } catch {
          // Ignore localStorage errors in private mode
        }
      }

      // 3. Establish NextAuth session using the google-token credentials provider
      const signInResult = await signIn("google-token", {
        accessToken,
        idToken: idTokenFromBE || idToken,
        refreshToken: refreshToken || "",
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      // 4. Show success notification
      toast.success("Đăng nhập bằng Google thành công!");

      if (onSuccess) {
        onSuccess();
      }

      // 5. Navigate to destination or refresh state
      if (redirectTo && redirectTo !== window.location.pathname) {
        window.location.href = redirectTo;
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("❌ [GoogleLoginButton Error]:", err);
      toast.error(err.message || "Đã xảy ra lỗi trong quá trình đăng nhập Google.");
    } finally {
      setIsPending(false);
    }
  };

  // Google OAuth flow handler
  const login = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      // If id_token is provided in the response
      if ((tokenResponse as any).id_token) {
        await handleBackendGoogleLogin((tokenResponse as any).id_token);
        return;
      }

      // If access_token is returned, fetch OpenID Connect ID token / profile data
      if (tokenResponse.access_token) {
        try {
          setIsPending(true);
          // Fetch Google userinfo or pass token to endpoint
          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });

          if (!res.ok) {
            throw new Error("Không thể lấy thông tin tài khoản từ Google.");
          }

          // Fallback: If direct ID token is not available, pass access token as bearer
          // or call backend with tokenResponse
          await handleBackendGoogleLogin(tokenResponse.access_token);
        } catch (err: any) {
          toast.error(err.message || "Xác thực với Google không thành công.");
          setIsPending(false);
        }
      }
    },
    onError: (error) => {
      console.error("❌ Google OAuth Error:", error);
      toast.error("Không thể kết nối với tài khoản Google. Vui lòng thử lại.");
      setIsPending(false);
    },
  });

  return (
    <button
      type="button"
      onClick={() => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
          toast.warning(
            "Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong file .env."
          );
          return;
        }
        setIsPending(true);
        login();
      }}
      disabled={isPending}
      className={`w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99] ${className}`}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          <span className="text-slate-600">Đang kết nối Google...</span>
        </>
      ) : (
        <>
          {/* Google Multi-Color SVG Icon */}
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
          <span>Đăng nhập bằng Google</span>
        </>
      )}
    </button>
  );
}
