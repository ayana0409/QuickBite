"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Cookies from "js-cookie";
import {
  Utensils,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  LogIn,
} from "lucide-react";
import GoogleLoginButton from "../auth/GoogleLoginButton";
import { registerAccount } from "@/src/lib/api/identity";
import { useUiStore } from "@/src/store/ui.store";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab,
}: AuthModalProps) {
  const storeTab = useUiStore((state) => state.authModalTab);
  const setStoreTab = useUiStore((state) => state.setAuthModalTab);

  const [activeTab, setActiveTab] = useState<"login" | "register">(
    initialTab || storeTab || "login"
  );

  // Sync tab with store when modal opens
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (storeTab) {
      setActiveTab(storeTab);
    }
  }, [isOpen, initialTab, storeTab]);

  // Login Form States
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form States
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: "login" | "register") => {
    setActiveTab(tab);
    setStoreTab(tab);
    setLoginError(null);
    setRegError(null);
    setRegSuccess(null);
  };

  // ─── Handle Login Submit ──────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoginLoading(true);

    try {
      const res = await signIn("credentials", {
        username: loginUsername.trim(),
        password: loginPassword,
        redirect: false,
      });

      if (res?.error) {
        setLoginError(
          res.error === "CredentialsSignin"
            ? "Tên đăng nhập hoặc mật khẩu không chính xác."
            : res.error
        );
      } else if (res?.ok) {
        Cookies.set("auth_provider", "credentials", { expires: 30 });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("auth_provider", "credentials");
          } catch {}
        }
        onClose();
        window.location.reload();
      }
    } catch {
      setLoginError("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  // ─── Handle Register Submit ───────────────────────────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Front-end validations
    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim();
    const cleanFullName = regFullName.trim();
    const cleanPhone = regPhone.trim();

    if (cleanUsername.length < 3) {
      setRegError("Tên đăng nhập phải có ít nhất 3 ký tự.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setRegError("Địa chỉ email không đúng định dạng.");
      return;
    }

    if (regPassword.length < 6) {
      setRegError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsRegLoading(true);

    try {
      // 1. Call Register API
      const regResult = await registerAccount({
        userName: cleanUsername,
        emailAddress: cleanEmail,
        password: regPassword,
        name: cleanFullName || cleanUsername,
        phoneNumber: cleanPhone || undefined,
      });

      if (regResult.success) {
        setRegSuccess("Đăng ký thành công! Đang tự động đăng nhập...");

        // 2. Auto sign in with credentials
        const loginRes = await signIn("credentials", {
          username: cleanUsername,
          password: regPassword,
          redirect: false,
        });

        if (loginRes?.ok) {
          Cookies.set("auth_provider", "credentials", { expires: 30 });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("auth_provider", "credentials");
            } catch {}
          }
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 800);
        } else {
          // If auto sign-in needs manual step, switch to login tab with prefilled username
          setLoginUsername(cleanUsername);
          setLoginPassword(regPassword);
          setActiveTab("login");
          setLoginError(null);
        }
      }
    } catch (err: any) {
      setRegError(
        err?.message || "Đăng ký tài khoản thất bại. Vui lòng thử lại sau."
      );
    } finally {
      setIsRegLoading(false);
    }
  };

  const handleSsoLogin = () => {
    signIn("oidc", { callbackUrl: window.location.href });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 px-6 py-5 text-white text-center relative shrink-0 overflow-hidden">
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

          {/* Brand Icon & Heading */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-orange-500 shadow-md shadow-black/10 mb-2">
              <Utensils className="w-6 h-6" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              {activeTab === "login"
                ? "Chào Mừng Trở Lại!"
                : "Tạo Tài Khoản QuickBite"}
            </h3>
            <p className="text-orange-100 text-xs mt-0.5 font-medium">
              {activeTab === "login"
                ? "Đăng nhập để đặt món ăn ngon lành và nhanh chóng"
                : "Đăng ký thành viên để nhận ngay ưu đãi đặt món độc quyền"}
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex p-1 bg-black/15 backdrop-blur-md rounded-2xl border border-white/20">
              <button
                type="button"
                onClick={() => handleTabChange("login")}
                className={`flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("register")}
                className={`flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "register"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng ký</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4">
          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: FORM ĐĂNG NHẬP                                           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "login" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {loginError && (
                <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-600 text-xs animate-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="font-medium">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Username / Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên đăng nhập hoặc Email
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="admin / merchant / customer..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showLoginPassword ? (
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
                  disabled={isLoginLoading}
                  className="w-full mt-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoginLoading ? (
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
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">
                    Hoặc tiếp tục với
                  </span>
                </div>
              </div>

              {/* Social / SSO Buttons */}
              <div className="space-y-2">
                <GoogleLoginButton onSuccess={onClose} />

                <button
                  type="button"
                  onClick={handleSsoLogin}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold text-xs rounded-xl border border-slate-200 hover:border-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>Đăng nhập qua QuickBite Identity (SSO)</span>
                </button>
              </div>

              {/* Switch to Register link */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Chưa có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => handleTabChange("register")}
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                >
                  Đăng ký tài khoản mới ngay
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: FORM ĐĂNG KÝ                                             */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "register" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {regError && (
                <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-600 text-xs animate-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="font-medium">{regError}</div>
                </div>
              )}

              {regSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-700 text-xs animate-in slide-in-from-top-1 duration-150">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div className="font-bold">{regSuccess}</div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Full Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Họ và tên
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Username & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tên đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="nguyenvana"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Số điện thoại <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Passwords Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Xác nhận mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showRegConfirmPassword ? "text" : "password"}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegConfirmPassword(!showRegConfirmPassword)
                        }
                        className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                      >
                        {showRegConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={isRegLoading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRegLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Đăng ký tài khoản</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold">
                    Hoặc đăng ký nhanh với
                  </span>
                </div>
              </div>

              {/* Social Google Button */}
              <GoogleLoginButton onSuccess={onClose} />

              {/* Switch to Login link */}
              <div className="pt-2 text-center text-xs text-slate-500">
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => handleTabChange("login")}
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
