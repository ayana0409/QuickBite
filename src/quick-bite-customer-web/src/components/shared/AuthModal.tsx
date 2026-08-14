"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Utensils,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password: password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage(
          res.error === "CredentialsSignin"
            ? "Tên đăng nhập hoặc mật khẩu không chính xác."
            : res.error
        );
      } else if (res?.ok) {
        onClose();
        // Optional: refresh to ensure server components update
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMessage("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSsoLogin = () => {
    signIn("oidc", { callbackUrl: window.location.href });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-black/10 rounded-full blur-lg pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer focus:outline-none"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-orange-500 shadow-lg shadow-black/10 mb-3">
            <Utensils className="w-7 h-7" />
          </div>

          <h3 className="text-2xl font-black tracking-tight">Chào mừng bạn!</h3>
          <p className="text-orange-100 text-xs mt-1 font-medium">
            Đăng nhập để đặt món ăn nhanh chóng cùng QuickBite
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-600 text-xs animate-in slide-in-from-top-1 duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / merchant / email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mật khẩu
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Đăng nhập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">
                Hoặc
              </span>
            </div>
          </div>

          {/* SSO Button */}
          <button
            type="button"
            onClick={handleSsoLogin}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-bold text-xs rounded-xl border border-slate-200 hover:border-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Đăng nhập qua QuickBite Identity (SSO)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
