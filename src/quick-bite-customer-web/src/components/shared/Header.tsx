"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Utensils,
  Search,
  ShoppingCart,
  User,
  LogOut,
  ShoppingBag,
  ChevronDown,
  Sparkles,
  Store,
  MapPin,
} from "lucide-react";
import { useCartStore } from "@/src/store/cart.store";
import { useUiStore } from "@/src/store/ui.store";
import { useBecomePartner } from "@/src/hooks/useBecomePartner";
import AuthModal from "./AuthModal";

export default function Header() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthModalOpen = useUiStore((state) => state.isAuthModalOpen);
  const setAuthModalOpen = useUiStore((state) => state.setAuthModalOpen);
  const { handleBecomePartnerClick } = useBecomePartner();

  const items = useCartStore((state) => state.items);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = session?.user?.name || "Khách hàng";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-orange-100/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: QuickBite Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-orange-500 to-red-500">
                QuickBite
              </span>
              <span className="text-[10px] font-semibold text-orange-400 tracking-wider uppercase -mt-1 hidden sm:block">
                Food & Delivery
              </span>
            </div>
          </Link>

          {/* Center: Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-lg mx-2 hidden md:block"
          >
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm món ngon, bún bò, pizza, trà sữa..."
                className="w-full pl-10 pr-10 py-2 text-sm bg-orange-50/50 hover:bg-orange-50/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-full border border-orange-200/70 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute left-3 text-orange-400 hover:text-orange-600 transition-colors cursor-pointer"
                title="Tìm kiếm"
                aria-label="Tìm kiếm"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right: Actions & User Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Nearby Restaurants Button */}
            <Link
              href="/nearby"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-full border border-orange-200/80 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Quán gần bạn"
            >
              <MapPin className="w-4 h-4 text-orange-600 animate-bounce" />
              <span className="hidden sm:inline">Gần bạn</span>
            </Link>

            {/* Mobile Search Button */}
            <Link
              href="/search"
              className="p-2.5 md:hidden text-slate-700 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-full border border-slate-200/80 transition-colors"
              title="Tìm kiếm"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 text-slate-700 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-full border border-slate-200/80 hover:border-orange-200 transition-colors focus:outline-none group cursor-pointer"
              title="Giỏ hàng"
              aria-label="Mở giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
              {mounted && totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-150">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </button>

            {/* User Profile / Auth State */}
            {status === "loading" ? (
              <div className="w-28 h-9 bg-slate-100 animate-pulse rounded-full" />
            ) : session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-orange-50/80 border border-transparent hover:border-orange-200 transition-all focus:outline-none cursor-pointer"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-500/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {userInitial}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-700 max-w-[100px] truncate hidden sm:inline">
                    {userName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-orange-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400">Đã đăng nhập với tư cách</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                      {userEmail && (
                        <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-orange-500" />
                        <span>Đơn hàng của tôi</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Thông tin tài khoản</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleBecomePartnerClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer text-left"
                      >
                        <Store className="w-4 h-4 text-orange-500" />
                        <span>Trở thành Đối tác</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuthModalOpen(true, "register")}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded-full transition-all border border-slate-200 hover:border-orange-200 cursor-pointer"
                >
                  <span>Đăng ký</span>
                </button>

                <button
                  onClick={() => setAuthModalOpen(true, "login")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-full shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Login / Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
