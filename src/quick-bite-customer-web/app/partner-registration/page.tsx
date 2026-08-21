import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  ChevronRight,
  TrendingUp,
  Users,
  BadgePercent,
  Headphones,
} from "lucide-react";
import PartnerRegistrationForm from "@/src/components/partner-registration/PartnerRegistrationForm";

export const metadata: Metadata = {
  title: "Đăng Ký Đối Tác Nhà Hàng - Mở Quán Cùng QuickBite",
  description:
    "Gia nhập hệ sinh thái QuickBite để tiếp cận hàng triệu khách hàng, quản lý đơn hàng thông minh và bứt phá doanh thu cho nhà hàng của bạn.",
  openGraph: {
    title: "Đăng Ký Đối Tác Nhà Hàng - QuickBite",
    description:
      "Tăng trưởng doanh số cùng nền tảng giao đồ ăn siêu tốc QuickBite. Thủ tục đơn giản, xét duyệt trong 24h.",
    type: "website",
  },
};

const BENEFITS = [
  {
    icon: Users,
    title: "Hàng triệu thực khách",
    desc: "Tiếp cận lượng khách hàng khổng lồ mỗi ngày tại các đô thị lớn.",
  },
  {
    icon: TrendingUp,
    title: "Tăng trưởng doanh thu",
    desc: "Gia tăng đơn hàng trực tuyến song song với bán tại quán.",
  },
  {
    icon: BadgePercent,
    title: "Chi phí tối ưu",
    desc: "Chính sách chiết khấu cạnh tranh, hỗ trợ quảng bá món ăn độc quyền.",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    desc: "Đội ngũ chuyên viên sẵn sàng hỗ trợ vận hành và xử lý đơn hàng.",
  },
];

export default function PartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <li>
              <Link href="/" className="hover:text-orange-600 transition-colors">
                Trang chủ
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li className="text-orange-600 font-bold">
              Đăng ký đối tác nhà hàng
            </li>
          </ol>
        </nav>

        {/* Benefits Grid */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white p-5 rounded-2xl border border-orange-100/80 shadow-xs flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/50">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Registration Form Component */}
        <div className="max-w-3xl mx-auto">
          <PartnerRegistrationForm />
        </div>
      </div>
    </div>
  );
}
