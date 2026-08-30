import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { getSimilarFoods } from '@/src/lib/api/catalog';
import FoodCard from '@/src/components/home/FoodCard';

interface SimilarFoodsSectionProps {
  foodId: string;
  foodName?: string;
  categoryName?: string;
}

export default async function SimilarFoodsSection({
  foodId,
  foodName,
  categoryName,
}: SimilarFoodsSectionProps) {
  const similarFoods = await getSimilarFoods(foodId, 4);

  if (!similarFoods || similarFoods.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 sm:mt-16 pt-10 border-t border-orange-100">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi Ý Thông Minh</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Món Ngon Tương Tự {categoryName ? `• ${categoryName}` : ''}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Các món ăn cùng hương vị hoặc danh mục được đề xuất riêng cho bạn
          </p>
        </div>

        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 group shrink-0 transition-colors"
        >
          <span>Khám phá thêm</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {similarFoods.map((item) => (
          <FoodCard key={item.id} food={item} />
        ))}
      </div>
    </section>
  );
}
