import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { UtensilsCrossed, Flame, ArrowRight, Store, Sparkles, Award } from 'lucide-react';
import { getRestaurants, getFeaturedFoods } from '@/src/lib/api/catalog';
import HeroBanner from '@/src/components/home/HeroBanner';
import RestaurantCard from '@/src/components/home/RestaurantCard';
import FoodCard from '@/src/components/home/FoodCard';

export const metadata: Metadata = {
  title: 'QuickBite - Đặt Món Ăn Nhanh & Giao Tận Nơi 20-30 Phút',
  description:
    'Thưởng thức hàng ngàn món ngon từ các nhà hàng uy tín hàng đầu: Phở Thìn, Pizza, Gà rán, Trà sữa KOI. Đặt món tiện lợi, giao nhanh siêu tốc cùng QuickBite!',
  keywords: [
    'QuickBite',
    'đặt món ăn',
    'giao đồ ăn nhanh',
    'đồ ăn online',
    'ship đồ ăn',
    'trà sữa',
    'pizza',
    'phở ngon',
  ],
  openGraph: {
    title: 'QuickBite - Ứng dụng đặt món ăn giao nhanh hàng đầu',
    description:
      'Khám phá ẩm thực đa dạng từ hơn 500+ nhà hàng đối tác. Freeship cho đơn hàng đầu tiên!',
    type: 'website',
    locale: 'vi_VN',
  },
};

export default async function HomePage() {
  // Fetch data in parallel on the server using ISR (revalidate 60s)
  const [restaurants, featuredFoods] = await Promise.all([
    getRestaurants(1, 6),
    getFeaturedFoods(1, 8),
  ]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Hero Banner Component */}
        <HeroBanner />

        {/* 2. Featured Restaurants Section */}
        <section className="mt-12 sm:mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-2">
                <Store className="w-3.5 h-3.5" />
                <span>Thương Hiệu Nổi Bật</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Nhà Hàng Được Yêu Thích
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Các thương hiệu ẩm thực chuẩn vị được đánh giá cao nhất trên QuickBite
              </p>
            </div>

            <Link
              href="/restaurants"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 group shrink-0 transition-colors"
            >
              <span>Khám phá tất cả</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Restaurant Grid */}
          {restaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-orange-200">
              <Store className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">Chưa có nhà hàng nào</p>
              <p className="text-xs text-slate-500 mt-1">Các đối tác ẩm thực đang được cập nhật trên hệ thống.</p>
            </div>
          )}
        </section>

        {/* 3. Featured Foods Section */}
        <section className="mt-14 sm:mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-2">
                <Flame className="w-3.5 h-3.5 fill-red-600 text-red-600" />
                <span>Ăn Gì Hôm Nay?</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Món Ngon Thử Ngay
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Tuyển chọn những món bán chạy nhất với ưu đãi cực hấp dẫn hôm nay
              </p>
            </div>

            <Link
              href="/foods"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 group shrink-0 transition-colors"
            >
              <span>Xem toàn bộ menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Food Grid */}
          {featuredFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredFoods.map((food) => (
                <FoodCard key={food.id} food={food} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-orange-200">
              <UtensilsCrossed className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">Chưa có món ăn nào</p>
              <p className="text-xs text-slate-500 mt-1">Thực đơn phong phú sẽ sớm xuất hiện tại đây.</p>
            </div>
          )}
        </section>

        {/* 4. Bottom Promotional Banner */}
        <section className="mt-16 sm:mt-24 rounded-3xl bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-bold mb-4">
              <Award className="w-3.5 h-3.5" />
              <span>Dành cho Đối tác & Khách hàng</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Bạn là chủ nhà hàng? <br className="hidden sm:inline" />
              Gia nhập QuickBite để tăng trưởng doanh số!
            </h3>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Tiếp cận hàng triệu thực khách tiềm năng và quản lý đơn hàng chuyên nghiệp với nền tảng QuickBite Merchant.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="https://quick-bite-merchant.onrender.com"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Đăng ký mở quán ngay
              </Link>
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

      </div>
    </div>
  );
}
