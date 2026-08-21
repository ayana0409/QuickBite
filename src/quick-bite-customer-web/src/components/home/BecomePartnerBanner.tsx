"use client";

import React from "react";
import Link from "next/link";
import { Award, ArrowRight, UtensilsCrossed } from "lucide-react";
import { useBecomePartner } from "@/src/hooks/useBecomePartner";

export default function BecomePartnerBanner() {
  const { handleBecomePartnerClick } = useBecomePartner();

  return (
    <section className="mt-16 sm:mt-24 rounded-3xl bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-bold mb-4">
          <Award className="w-3.5 h-3.5" />
          <span>Mở rộng kinh doanh cùng QuickBite</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
          Bạn là chủ nhà hàng? <br className="hidden sm:inline" />
          Gia nhập QuickBite để tăng trưởng doanh số!
        </h3>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          Tiếp cận hàng triệu thực khách tiềm năng và quản lý đơn hàng chuyên nghiệp với hệ sinh thái QuickBite Merchant.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBecomePartnerClick}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <span>Đăng ký ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/about"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all"
          >
            Tìm hiểu thêm
          </Link>
        </div>
      </div>

      <div className="absolute right-0 bottom-0 w-80 h-80 opacity-10 pointer-events-none flex items-center justify-center">
        <UtensilsCrossed className="w-72 h-72 text-white" />
      </div>
    </section>
  );
}
