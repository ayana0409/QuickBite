import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Clock,
  Flame,
  ChevronRight,
  Sparkles,
  Store,
  Share2,
  Heart,
  ShieldCheck,
  Zap,
  Star,
} from 'lucide-react';
import { getFoodById, getRestaurantById } from '@/src/lib/api/catalog';
import FoodCustomizer from '@/src/components/shared/FoodCustomizer';
import ReviewListSection from '@/src/components/shared/ReviewListSection';

interface PageProps {
  params: Promise<{ id: string }>;
}

// --- Dynamic SEO Metadata ---
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const food = await getFoodById(id);

  if (!food) {
    return {
      title: 'Món ăn không tìm thấy | QuickBite',
    };
  }

  const coverImage = food.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  const descriptionText =
    food.description ||
    `Thưởng thức món ${food.name} thơm ngon, chuẩn vị tại QuickBite. Giao hàng tận nơi siêu tốc 20-30 phút!`;

  return {
    title: `${food.name} - Đặt món giao nhanh | QuickBite`,
    description: descriptionText,
    openGraph: {
      title: `${food.name} - QuickBite Food Delivery`,
      description: descriptionText,
      images: [
        {
          url: coverImage,
          width: 800,
          height: 600,
          alt: food.name,
        },
      ],
      type: 'website',
      locale: 'vi_VN',
    },
  };
}

// --- Food Item Detail Page (Server Component) ---
export default async function FoodDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch food item details
  const food = await getFoodById(id);

  if (!food) {
    notFound();
  }

  // Optionally fetch restaurant info for breadcrumb & metadata
  const restaurant = food.restaurantId
    ? await getRestaurantById(food.restaurantId)
    : null;

  const defaultImage =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';
  const displayImage = food.images && food.images.length > 0 ? food.images[0] : defaultImage;

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-16 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        
        {/* 1. Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-600 transition-colors font-medium">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          
          {restaurant ? (
            <>
              <Link
                href={`/restaurant/${restaurant.id}`}
                className="hover:text-orange-600 transition-colors font-medium truncate max-w-[150px]"
              >
                {restaurant.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </>
          ) : (
            <>
              <Link href="/foods" className="hover:text-orange-600 transition-colors font-medium">
                Món ăn
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </>
          )}

          <span className="text-slate-800 font-bold truncate max-w-[200px]">
            {food.name}
          </span>
        </nav>

        {/* 2. Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ─── Left Column (Image & Description Overview) ─── */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Main Cover Image Box */}
            <div className="relative w-full aspect-4/3 sm:aspect-16/11 rounded-3xl overflow-hidden bg-slate-100 border border-orange-100 shadow-sm">
              <img
                src={displayImage}
                alt={food.name}
                className="w-full h-full object-cover"
                loading="eager"
              />

              {/* Badges Overlays */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {food.totalSold !== undefined && food.totalSold > 300 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold shadow-md shadow-red-500/25">
                    <Flame className="w-3.5 h-3.5 fill-white" />
                    <span>Đã bán {food.totalSold.toLocaleString('vi-VN')}</span>
                  </span>
                )}
                {food.preparationTime && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>{food.preparationTime} phút</span>
                  </span>
                )}
              </div>
            </div>

            {/* Food Title & Description Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/80 shadow-xs flex flex-col gap-4">
              {/* Tags */}
              {food.tags && food.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {food.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 text-xs font-bold bg-orange-50 text-orange-700 rounded-lg border border-orange-200/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    {food.name}
                  </h1>

                  {food.reviewCount !== undefined && food.reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(food.rating || 0).toFixed(1)}</span>
                      <span className="text-slate-500 font-normal text-[11px]">({food.reviewCount} đánh giá)</span>
                    </span>
                  )}
                </div>

                {restaurant && (
                  <Link
                    href={`/restaurant/${restaurant.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 mt-2 group"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Bởi {restaurant.name}</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Full Description */}
              <div className="pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed space-y-2">
                <p>{food.description || 'Món ăn được chế biến từ những nguyên liệu tươi ngon chọn lọc theo công thức đặc biệt từ đầu bếp.'}</p>
              </div>

              {/* Value Guarantees */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Giao nóng 20-30 phút</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Đảm bảo vệ sinh ATTP</span>
                </div>
              </div>
            </div>

          </div>

          {/* ─── Right Column (Interactive Food Customizer & Cart) ─── */}
          <div className="lg:col-span-6 sticky top-20">
            <FoodCustomizer food={food} restaurantName={restaurant?.name} />
          </div>

        </div>

        {/* ─── Customer Reviews for Food Item ─── */}
        <ReviewListSection
          targetType="foodItem"
          targetId={food.id}
          targetName={food.name}
          ratingSummary={{
            avg: Number(food.rating || 0),
            count: Number(food.reviewCount || 0),
          }}
          className="mt-8"
        />

      </div>
    </div>
  );
}
