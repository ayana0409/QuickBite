import React from 'react';
import Link from 'next/link';
import { Star, Clock, MapPin, Sparkles, Bike } from 'lucide-react';
import { Restaurant } from '@/src/types/catalog.type';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const {
    id,
    name,
    address,
    rating,
    imageUrl,
    cuisineType = 'Quán ăn & Thức uống',
    deliveryTimeMinutes = 25,
    deliveryFee = 15000,
    status = 'open',
  } = restaurant;

  const isOpen = status === 'open';
  const defaultImage =
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
  const displayImage = imageUrl || defaultImage;

  const formattedAddress = [address?.district, address?.city]
    .filter(Boolean)
    .join(', ') || address?.line1 || 'Việt Nam';

  return (
    <Link
      href={`/restaurant/${id}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-orange-100/70 shadow-xs hover:shadow-xl hover:border-orange-200/90 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-16/10 overflow-hidden bg-slate-100">
        <img
          src={displayImage}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full backdrop-blur-md shadow-xs ${
              isOpen
                ? 'bg-emerald-500/90 text-white'
                : 'bg-slate-800/85 text-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? 'bg-white animate-pulse' : 'bg-slate-400'
              }`}
            />
            {isOpen ? 'Đang mở cửa' : 'Tạm nghỉ'}
          </span>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs text-xs">
          {rating?.count && rating.count > 0 ? (
            <>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-black text-slate-900">{Number(rating.avg).toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                ({rating.count})
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">
              Chưa có đánh giá
            </span>
          )}
        </div>

        {/* Quick Delivery Meta Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
          <span className="truncate drop-shadow-sm text-orange-200 text-[11px] font-semibold uppercase tracking-wider">
            {cuisineType}
          </span>
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs text-[11px]">
            <Clock className="w-3 h-3 text-orange-300" />
            <span>{deliveryTimeMinutes} phút</span>
          </div>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-orange-600 transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="line-clamp-1">{formattedAddress}</span>
          </div>
        </div>

        {/* Delivery Fee & Deals */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <Bike className="w-3.5 h-3.5 text-orange-500" />
            <span>Phí giao:</span>
            <span className="font-semibold text-slate-700">
              {Number(deliveryFee) === 0 ? 'Freeship' : `${Number(deliveryFee).toLocaleString('vi-VN')}đ`}
            </span>
          </div>

          <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
            Ưu đãi đặt món
          </span>
        </div>
      </div>
    </Link>
  );
}
