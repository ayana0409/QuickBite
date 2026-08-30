'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Sparkles, Zap, ShieldCheck, Gift, ArrowRight, MapPin } from 'lucide-react';

const QUICK_CATEGORIES = [
  { name: 'Phở & Bún', emoji: '🍜' },
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Gà Rán', emoji: '🍗' },
  { name: 'Trà Sữa', emoji: '🧋' },
  { name: 'Cơm Tấm', emoji: '🍱' },
  { name: 'Bánh Mì', emoji: '🥖' },
  { name: 'Sushi', emoji: '🍣' },
];

export default function HeroBanner() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    setSearchTerm(categoryName);
    router.push(`/search?q=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white rounded-3xl sm:rounded-4xl shadow-2xl shadow-orange-500/20 my-4 sm:my-6">
      {/* Background Decorative Circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-400/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 sm:px-12 py-12 sm:py-16 flex flex-col items-center text-center">
        
        {/* Top Floating Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Freeship cho đơn hàng đầu tiên • Mã: <b>QUICKBITE2026</b></span>
          </div>

          <Link
            href="/nearby"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-900 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Tìm quán gần bạn nhất 📍</span>
          </Link>
        </div>

        {/* Main Slogan Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none drop-shadow-sm max-w-3xl">
          Đói bụng? <br className="sm:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-white">
            QuickBite giao ngay!
          </span>
        </h1>

        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-orange-100/90 max-w-2xl font-medium leading-relaxed">
          Tìm kiếm thông minh với thuật toán gợi ý món ăn chuẩn vị & quán ăn gần bạn nhất chỉ từ 20-30 phút.
        </p>

        {/* Big Interactive Search Form */}
        <form
          onSubmit={handleSearch}
          className="mt-8 w-full max-w-2xl bg-white p-2 rounded-2xl sm:rounded-full shadow-2xl shadow-black/20 flex flex-col sm:flex-row items-center gap-2 border border-white/40"
        >
          <div className="flex items-center gap-3 w-full pl-4 pr-2 py-1">
            <Search className="w-5 h-5 text-orange-500 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Bạn muốn ăn gì hôm nay? (VD: Phở bò, Pizza, Trà sữa...)"
              className="w-full bg-transparent text-slate-800 text-sm sm:text-base placeholder-slate-400 outline-none font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl sm:rounded-full shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Tìm kiếm</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Category Suggestion Tags */}
        <div className="mt-6 flex items-center justify-center flex-wrap gap-2 text-xs sm:text-sm">
          <span className="text-orange-200 font-semibold mr-1 hidden sm:inline">Gợi ý nhanh:</span>
          {QUICK_CATEGORIES.map((cat, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleCategoryClick(cat.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-xs text-white border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer font-medium"
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>


        {/* Key Highlight Badges */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-white/20 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
            <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Giao Siêu Tốc 20-30'</p>
              <p className="text-xs text-orange-200">Đồ ăn luôn nóng hổi tươi ngon</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
            <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">500+ Quán Tuyển Chọn</p>
              <p className="text-xs text-orange-200">Đảm bảo an toàn vệ sinh</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
            <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Voucher Ngập Tràn</p>
              <p className="text-xs text-orange-200">Giảm giá mỗi ngày lên đến 50%</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
