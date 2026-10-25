'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, MapPin, Bike, Store, ArrowUpRight } from 'lucide-react';
import { Restaurant, NearbyRestaurant } from '@/src/types/catalog.type';

interface RestaurantCardProps {
  restaurant: Restaurant | NearbyRestaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const {
    id,
    name,
    address,
    rating,
    cuisineType = 'Quán ăn & Thức uống',
    deliveryTimeMinutes = 25,
    deliveryFee = 15000,
    status = 'open',
  } = restaurant;

  const nearby = restaurant as NearbyRestaurant;
  const isNearby = typeof nearby.distance_meters === 'number';

  const isOpen = status?.toLowerCase() === 'open' || status?.toLowerCase() === 'active';

  const formattedAddress =
    [address?.ward, address?.city].filter(Boolean).join(', ') ||
    address?.line1 ||
    'Việt Nam';

  const formatDistance = (meters?: number) => {
    if (meters == null) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const distanceText = isNearby ? formatDistance(nearby.distance_meters) : null;

  return (
    <Link
      href={`/restaurant/${id}`}
      prefetch={false}
      className="group relative flex flex-col justify-between bg-white rounded-3xl p-5 border border-orange-100/80 shadow-xs hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
    >
      <div>
        {/* Top Header Row: Store Avatar + Status Badge + Rating */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Store className="w-6 h-6" />
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                  isOpen
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {isOpen ? 'Đang mở cửa' : 'Tạm nghỉ'}
              </span>

              {/* Distance badge if nearby */}
              {distanceText && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50">
                  <MapPin className="w-3 h-3 text-orange-500" />
                  {distanceText}
                </span>
              )}
            </div>
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs shrink-0">
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
                Mới
              </span>
            )}
          </div>
        </div>

        {/* Restaurant Name */}
        <h3 className="font-black text-slate-900 text-lg group-hover:text-orange-600 transition-colors line-clamp-1 leading-snug">
          {name}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-1.5 mt-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{formattedAddress}</span>
        </div>

        {/* Categories / Food Count */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 text-[11px] font-semibold border border-orange-100/60">
            {cuisineType}
          </span>
          {nearby.available_food_count !== undefined && nearby.available_food_count > 0 && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium">
              {nearby.available_food_count} món ăn phục vụ
            </span>
          )}
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>{deliveryTimeMinutes} phút</span>
          </div>
          <div className="flex items-center gap-1">
            <Bike className="w-3.5 h-3.5 text-orange-500" />
            <span>
              {Number(deliveryFee) === 0
                ? 'Freeship'
                : `${Number(deliveryFee).toLocaleString('vi-VN')}đ`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
          <span>Xem quán</span>
          <ArrowUpRight className="w-4 h-4 text-orange-500" />
        </div>
      </div>
    </Link>
  );
}
