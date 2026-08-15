import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Utensils,
  Phone,
  UtensilsCrossed,
} from 'lucide-react';
import { getRestaurantById, getFoodsByRestaurant } from '@/src/lib/api/catalog';
import FoodCard from '@/src/components/home/FoodCard';

interface PageProps {
  params: Promise<{ id: string }>;
}

// --- Dynamic SEO Metadata ---
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    return {
      title: 'Nhà hàng không tìm thấy | QuickBite',
    };
  }

  const addressStr = [restaurant.address?.district, restaurant.address?.city]
    .filter(Boolean)
    .join(', ');

  return {
    title: `${restaurant.name} - Đặt giao hàng tận nơi | QuickBite`,
    description: `Thực đơn đa dạng, đặt món tại ${restaurant.name} (${addressStr}) giao ngay trong 30 phút. Xem ngay thực đơn và ưu đãi hôm nay trên QuickBite!`,
    openGraph: {
      title: `${restaurant.name} | QuickBite`,
      description: `Khám phá thực đơn tại ${restaurant.name} và đặt giao hàng tận nơi cùng QuickBite.`,
      type: 'website',
      locale: 'vi_VN',
    },
  };
}

// --- Restaurant Detail Page (Server Component) ---
export default async function RestaurantDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch restaurant info and its menu in parallel
  const [restaurant, foods] = await Promise.all([
    getRestaurantById(id),
    getFoodsByRestaurant(id, 1, 30),
  ]);

  // Show 404 if restaurant not found
  if (!restaurant) {
    notFound();
  }

  const isOpen = restaurant.status === 'open';
  const fullAddress = [
    restaurant.address?.line1,
    restaurant.address?.ward,
    restaurant.address?.district,
    restaurant.address?.city,
  ]
    .filter(Boolean)
    .join(', ');

  const ratingAvg = restaurant.rating?.avg ?? 0;
  const ratingCount = restaurant.rating?.count ?? 0;

  // Group foods by category
  const categories = restaurant.categories ?? [];
  const foodsByCategory: Record<string, typeof foods> = {};
  const uncategorized: typeof foods = [];

  if (categories.length > 0) {
    // Initialize each category bucket
    categories.forEach((cat) => {
      foodsByCategory[cat.id] = [];
    });

    foods.forEach((food) => {
      if (food.categoryId && foodsByCategory[food.categoryId] !== undefined) {
        foodsByCategory[food.categoryId].push(food);
      } else {
        uncategorized.push(food);
      }
    });
  }

  const hasCategoryGroups = categories.length > 0 && foods.length > 0;

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-16">

      {/* ─── Hero Cover ─── */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        {/* Overlay darkening for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Bottom content: Name + Status */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6 max-w-7xl mx-auto">
          <div className="flex items-end gap-4">
            {/* Avatar circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center shrink-0 border-4 border-white/80">
              <Utensils className="w-8 h-8 text-orange-500" />
            </div>
            <div className="pb-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                {restaurant.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {/* Open/Close Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isOpen
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-500/80 text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOpen ? 'bg-white animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  {isOpen ? 'Đang mở cửa' : 'Tạm nghỉ'}
                </span>

                {/* Rating */}
                {ratingAvg > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    <Star className="w-3 h-3 fill-white text-white" />
                    {ratingAvg.toFixed(1)} ({ratingCount}+ đánh giá)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* ─── Breadcrumb ─── */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-600 transition-colors font-medium">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href="/restaurants" className="hover:text-orange-600 transition-colors font-medium">
            Nhà hàng
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 font-semibold truncate max-w-[180px]">
            {restaurant.name}
          </span>
        </nav>

        {/* ─── Info Cards Row ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {/* Address */}
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-orange-100 p-4 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Địa chỉ</p>
              <p className="text-sm text-slate-800 font-medium leading-snug mt-0.5">
                {fullAddress || 'Đang cập nhật'}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-orange-100 p-4 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Đánh giá</p>
              <p className="text-sm text-slate-800 font-medium mt-0.5">
                {ratingAvg > 0 ? (
                  <>
                    <span className="text-amber-600 font-black text-base">{ratingAvg.toFixed(1)}</span>
                    <span className="text-slate-500 ml-1 text-xs">/ 5.0 ({ratingCount} đánh giá)</span>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">Chưa có đánh giá</span>
                )}
              </p>
            </div>
          </div>

          {/* Hours / Status */}
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-orange-100 p-4 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Trạng thái</p>
              <p className={`text-sm font-black mt-0.5 ${isOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isOpen ? 'Đang mở cửa — Đặt ngay!' : 'Hiện đang đóng cửa'}
              </p>
              <p className="text-xs text-slate-500">Giao hàng 20-30 phút</p>
            </div>
          </div>
        </div>

        {/* ─── Menu Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-7 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
            <h2 className="text-2xl font-black text-slate-900">Thực đơn</h2>
            {foods.length > 0 && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                {foods.length} món
              </span>
            )}
          </div>

          {foods.length === 0 ? (
            /* ─── Empty State ─── */
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-orange-200">
              <UtensilsCrossed className="w-12 h-12 text-orange-300 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-800">Chưa có món ăn nào</p>
              <p className="text-sm text-slate-500 mt-1">
                Nhà hàng này chưa cập nhật thực đơn. Vui lòng quay lại sau!
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold rounded-xl shadow hover:opacity-90 transition-opacity"
              >
                Xem nhà hàng khác
              </Link>
            </div>
          ) : hasCategoryGroups ? (
            /* ─── Grouped by Category ─── */
            <div className="space-y-10">
              {categories.map((cat) => {
                const catFoods = foodsByCategory[cat.id] ?? [];
                if (catFoods.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Utensils className="w-3.5 h-3.5 text-orange-600" />
                      </span>
                      {cat.name}
                      <span className="text-xs text-slate-500 font-normal">({catFoods.length} món)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {catFoods.map((food) => (
                        <FoodCard
                          key={food.id}
                          food={food}
                          restaurantName={restaurant.name}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Render uncategorized foods */}
              {uncategorized.length > 0 && (
                <div>
                  <h3 className="text-lg font-black text-slate-800 mb-4">Các món khác</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {uncategorized.map((food) => (
                      <FoodCard
                        key={food.id}
                        food={food}
                        restaurantName={restaurant.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── Flat grid (no categories) ─── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {foods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  restaurantName={restaurant.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
