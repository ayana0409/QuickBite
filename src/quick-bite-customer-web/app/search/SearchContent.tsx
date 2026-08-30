'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Star,
  X,
  ChevronRight,
  UtensilsCrossed,
  Flame,
  RotateCcw,
  Navigation,
} from 'lucide-react';
import { searchFoods } from '@/src/lib/api/catalog';
import { FoodItem } from '@/src/types/catalog.type';
import FoodCard from '@/src/components/home/FoodCard';

const POPULAR_SUGGESTIONS = [
  'Bún bò Huế',
  'Phở bò',
  'Cơm tấm sườn',
  'Pizza',
  'Trà sữa trân châu',
  'Gà rán',
  'Bánh mì',
  'Mì cay',
];

const PRICE_PRESETS = [
  { label: 'Tất cả giá', min: undefined, max: undefined },
  { label: 'Dưới 30.000đ', min: 0, max: 30000 },
  { label: '30.000đ - 70.000đ', min: 30000, max: 70000 },
  { label: 'Trên 70.000đ', min: 70000, max: undefined },
];

const RATING_PRESETS = [
  { label: 'Tất cả', value: undefined },
  { label: '4.5+ ⭐', value: 4.5 },
  { label: '4.0+ ⭐', value: 4.0 },
  { label: '3.5+ ⭐', value: 3.5 },
];

export default function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Query states from URL
  const initialQuery = searchParams.get('q') || '';
  const initialMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const initialMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const initialMinRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined;

  const [query, setQuery] = useState(initialQuery);
  const [minPrice, setMinPrice] = useState<number | undefined>(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initialMaxPrice);
  const [minRating, setMinRating] = useState<number | undefined>(initialMinRating);
  
  // Location states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Search Results
  const [items, setItems] = useState<FoodItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Sync state when URL params change
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setMinPrice(searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined);
    setMaxPrice(searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined);
    setMinRating(searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined);
  }, [searchParams]);

  // Request browser geolocation for proximity scoring
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied:', err);
        setLocationError('Không thể lấy vị trí. Vui lòng cấp quyền định vị.');
        setIsLocating(false);
      },
      { timeout: 10000 },
    );
  };

  // Perform search query
  const executeSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchFoods({
        q: query.trim() || undefined,
        minPrice,
        maxPrice,
        minRating,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        limit: 24,
      });

      setItems(res.data || []);
      setTotalCount(res.meta?.total || (res.data?.length ?? 0));
    } catch (err) {
      console.error('Search error:', err);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [query, minPrice, maxPrice, minRating, userLocation]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Update URL params
  const updateUrlParams = (newParams: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        params.set(k, String(v));
      } else {
        params.delete(k);
      }
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: query.trim() });
  };

  const handlePresetPriceClick = (preset: typeof PRICE_PRESETS[0]) => {
    setMinPrice(preset.min);
    setMaxPrice(preset.max);
    updateUrlParams({ minPrice: preset.min, maxPrice: preset.max });
  };

  const handleRatingClick = (val?: number) => {
    setMinRating(val);
    updateUrlParams({ minRating: val });
  };

  const handleResetFilters = () => {
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setUserLocation(null);
    updateUrlParams({ minPrice: undefined, maxPrice: undefined, minRating: undefined });
  };

  const hasActiveFilters = minPrice != null || maxPrice != null || minRating != null || userLocation != null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 sm:mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-orange-600 transition-colors font-medium">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-800 font-bold">Tìm kiếm món ăn</span>
      </nav>

      {/* 2. Top Search & Controls Banner */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/15 mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>PostgreSQL Full-Text Search Engine</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
            Tìm Kiếm Món Ăn Bạn Thích
          </h1>
          <p className="text-xs sm:text-sm text-orange-100/90 leading-relaxed mb-6 font-medium">
            Hệ thống tìm kiếm thông minh hỗ trợ gõ tiếng Việt có dấu/không dấu, lọc theo khoảng giá, điểm đánh giá và khoảng cách địa lý.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên món ăn, hương vị, nguyên liệu (VD: bún bò, matcha, cơm gà)..."
              className="w-full pl-12 pr-28 sm:pr-32 py-3.5 sm:py-4 text-sm sm:text-base bg-white text-slate-900 placeholder-slate-400 rounded-2xl sm:rounded-full shadow-lg outline-none font-semibold focus:ring-4 focus:ring-amber-300/40 transition-all"
            />
            <Search className="w-5 h-5 text-orange-500 absolute left-4 pointer-events-none" />

            <button
              type="submit"
              className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="mt-4 flex items-center flex-wrap gap-1.5 text-xs">
            <span className="text-orange-200 font-semibold mr-1">Tìm nhanh:</span>
            {POPULAR_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item);
                  updateUrlParams({ q: item });
                }}
                className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-xs text-white border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Location Trigger */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-orange-100/90 shadow-xs mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Filter Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-500" />
            <span>Bộ lọc:</span>
          </div>

          {/* Price Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PRICE_PRESETS.map((preset, idx) => {
              const isSelected = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetPriceClick(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          {/* Rating Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {RATING_PRESETS.map((preset, idx) => {
              const isSelected = minRating === preset.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRatingClick(preset.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Location Proximity Toggle & Reset Button */}
        <div className="flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
          {/* Geolocation Button */}
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              userLocation
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
            }`}
            title="Ưu tiên món ăn gần vị trí hiện tại của bạn"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : userLocation ? 'text-emerald-600' : 'text-orange-600'}`} />
            <span>
              {isLocating
                ? 'Đang lấy vị trí...'
                : userLocation
                ? 'Đã áp dụng vị trí gần bạn 📍'
                : 'Ưu tiên gần tôi'}
            </span>
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xoá lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Results Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {query.trim() ? `Kết quả cho "${query.trim()}"` : 'Tất cả món ăn'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tìm thấy <b className="text-orange-600">{totalCount}</b> món ăn phù hợp với yêu cầu
          </p>
        </div>

        {userLocation && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
            ⚡ Đã kết hợp điểm FTS + Khoảng cách PostGIS
          </span>
        )}
      </div>

      {/* 5. Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-4/5 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-orange-200 max-w-xl mx-auto my-8">
          <UtensilsCrossed className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 mb-1">
            Không tìm thấy món ăn nào
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Rất tiếc, không có món ăn nào khớp với từ khoá hoặc bộ lọc hiện tại của bạn. Hãy thử thay đổi từ khoá hoặc xoá các điều kiện lọc giá/sao.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all cursor-pointer"
          >
            Xoá bộ lọc & Thử lại
          </button>
        </div>
      )}

    </div>
  );
}
