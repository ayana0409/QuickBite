import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { UtensilsCrossed, Flame, ArrowRight, Store, Sparkles, Award, MapPin } from 'lucide-react';
import { getRestaurants, getTrendingFoods } from '@/src/lib/api/catalog';
import HeroBanner from '@/src/components/home/HeroBanner';
import RestaurantCard from '@/src/components/home/RestaurantCard';
import FoodCard from '@/src/components/home/FoodCard';
import BecomePartnerBanner from '@/src/components/home/BecomePartnerBanner';

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
  // Fetch data in parallel on the server: Top rated restaurants & Smart Trending Foods (PostgreSQL Trending Score)
  const [restaurants, trendingFoods] = await Promise.all([
    getRestaurants(1, 6),
    getTrendingFoods(8),
  ]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Hero Banner Component with Integrated Search */}
        <HeroBanner />

        {/* 2. Quick Nearby Feature Callout Banner */}
        <section className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-orange-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <MapPin className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Tìm Quán Ngon Gần Vị Trí Của Bạn
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Sử dụng định vị PostGIS để khám phá các nhà hàng đang mở cửa gần nhất với bán kính tuỳ chọn.
              </p>
            </div>
          </div>
          <Link
            href="/nearby"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>Khám phá ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* 3. Featured Restaurants Section */}
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
              href="/nearby"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 group shrink-0 transition-colors"
            >
              <span>Xem quán quanh bạn</span>
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

        {/* 4. Trending Foods Section (PostgreSQL Trending Score + Cache) */}
        <section className="mt-14 sm:mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-2">
                <Flame className="w-3.5 h-3.5 fill-red-600 text-red-600" />
                <span>Xu Hướng Ẩm Thực</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Món Ngon Bán Chạy Hôm Nay
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Thuật toán đề xuất những món ăn hot nhất dựa trên lượt đặt và đánh giá cao
              </p>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 group shrink-0 transition-colors"
            >
              <span>Tìm kiếm tất cả món</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Food Grid */}
          {trendingFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trendingFoods.map((food) => (
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

        {/* 5. Bottom Promotional Banner */}
        <BecomePartnerBanner />

      </div>
    </div>
  );
}

