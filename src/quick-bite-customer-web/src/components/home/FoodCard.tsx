import React from 'react';
import Link from 'next/link';
import { Flame, Star } from 'lucide-react';
import { FoodItem } from '@/src/types/catalog.type';
import AddToCartButton from './AddToCartButton';

interface FoodCardProps {
  food: FoodItem;
  restaurantName?: string;
}

export default function FoodCard({ food, restaurantName }: FoodCardProps) {
  const {
    id,
    name,
    description,
    price,
    images,
    isAvailable = true,
    totalSold = 0,
    rating = 0,
    reviewCount = 0,
    tags = [],
  } = food;

  const defaultImage =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  const displayImage = images && images.length > 0 ? images[0] : defaultImage;

  const formattedPrice = price ? `${Number(price).toLocaleString('vi-VN')}đ` : 'Liên hệ';

  return (
    <div className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-orange-100/70 shadow-xs hover:shadow-xl hover:border-orange-200/90 hover:-translate-y-1 transition-all duration-300">
      {/* Clickable Food Image & Details via Link */}
      <Link href={`/food/${id}`} className="block focus:outline-none">
        {/* Food Image */}
        <div className="relative w-full aspect-4/3 overflow-hidden bg-slate-100">
          <img
            src={displayImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Hot / Popular Badge */}
          {totalSold > 500 && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-[11px] font-bold shadow-md shadow-red-500/30">
              <Flame className="w-3 h-3 fill-white" />
              <span>Bán chạy</span>
            </div>
          )}

          {/* Tags overlay */}
          {tags && tags.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="p-4 pb-0">
          <h4 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-orange-600 transition-colors">
            {name}
          </h4>
          {description && (
            <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </Link>

      {/* Price & Action Row */}
      <div className="p-4 pt-3 mt-auto border-t border-slate-100 flex items-center justify-between gap-2">
        <Link href={`/food/${id}`} className="block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 block -mb-0.5">Giá chỉ</span>
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/80">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{Number(rating).toFixed(1)}</span>
                <span className="text-slate-400 font-normal text-[10px]">({reviewCount})</span>
              </span>
            )}
          </div>
          <span className="text-base font-black text-orange-600 tracking-tight">
            {formattedPrice}
          </span>
        </Link>

        {/* Client Interactive Add to Cart Button */}
        <AddToCartButton food={food} restaurantName={restaurantName} />
      </div>
    </div>
  );
}

