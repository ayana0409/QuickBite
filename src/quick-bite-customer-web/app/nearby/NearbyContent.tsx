'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Sparkles,
  ChevronRight,
  Store,
  Clock,
  Star,
  Bike,
  UtensilsCrossed,
  RefreshCw,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { getNearbyRestaurants } from '@/src/lib/api/catalog';
import { NearbyRestaurant } from '@/src/types/catalog.type';

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km (Khuyên dùng)', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '20 km', value: 20000 },
];

const PRESET_LOCATIONS = [
  { name: 'Quận 1, TP.HCM', lat: 10.7769, lng: 106.7009 },
  { name: 'Quận Cầu Giấy, Hà Nội', lat: 21.0333, lng: 105.7939 },
  { name: 'Quận Hải Châu, Đà Nẵng', lat: 16.0678, lng: 108.2208 },
];

export default function NearbyContent() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [radius, setRadius] = useState<number>(5000);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Request browser location
  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Trình duyệt của bạn không hỗ trợ Geolocation.');
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationName('Vị trí hiện tại của bạn');
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation failed or denied:', err);
        setErrorMsg('Không thể truy cập GPS. Vui lòng cho phép quyền vị trí hoặc chọn thành phố mẫu bên dưới.');
        setLocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true },
    );
  }, []);

  // Try auto-request on mount
  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  // Fetch nearby restaurants whenever location or radius changes
  const fetchNearby = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const data = await getNearbyRestaurants({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius,
        limit: 18,
      });
      setRestaurants(data || []);
    } catch (err) {
      console.error('Failed to fetch nearby restaurants:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [userLocation, radius]);

  useEffect(() => {
    if (userLocation) {
      fetchNearby();
    }
  }, [userLocation, radius, fetchNearby]);

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setUserLocation({ lat: preset.lat, lng: preset.lng });
    setLocationName(preset.name);
    setErrorMsg(null);
  };

  const formatDistance = (meters: number) => {
    if (meters == null) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 sm:mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-orange-600 transition-colors font-medium">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-800 font-bold">Quán ngon gần bạn</span>
      </nav>

      {/* 2. Header Banner with PostGIS Info */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/15 mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            <span>PostGIS Spatial Geospatial Search (ST_DWithin)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
            Khám Phá Quán Ngon Quanh Đây
          </h1>
          <p className="text-xs sm:text-sm text-orange-100/90 leading-relaxed font-medium">
            Thuật toán PostGIS tự động tính toán khoảng cách theo toạ độ địa lý và lọc ra các nhà hàng đang mở cửa gần bạn nhất, giúp giao nhanh chỉ trong 15-25 phút.
          </p>

          {/* Location State Ribbon */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-xs sm:text-sm font-bold shadow-lg hover:bg-orange-50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Navigation className={`w-4 h-4 text-orange-600 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Đang định vị GPS...' : 'Cập nhật lại vị trí của tôi'}</span>
            </button>

            {userLocation && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/30 backdrop-blur-md border border-emerald-300/40 text-xs font-semibold text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>{locationName} ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Location Picker / Preset Fallbacks (If permission is needed or user wants other areas) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-orange-100/90 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Radius Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1">Bán kính tìm:</span>
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRadius(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                radius === opt.value
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Preset Location Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <span className="text-xs text-slate-500">Hoặc chọn khu vực:</span>
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => handleSelectPreset(loc)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/60 transition-colors cursor-pointer"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Error / Missing Location Prompt */}
      {!userLocation && (
        <div className="bg-amber-50 rounded-3xl p-8 text-center border border-amber-200 max-w-xl mx-auto my-8">
          <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-black text-slate-900 mb-1">
            Bật định vị để xem quán gần bạn
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            {errorMsg || 'Vui lòng nhấn nút "Cấp quyền vị trí" ở góc trên hoặc chọn một trong các khu vực mẫu để hệ thống quét các nhà hàng lân cận.'}
          </p>
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all cursor-pointer"
          >
            Cấp quyền vị trí & Tìm quán
          </button>
        </div>
      )}

      {/* 5. Results Section */}
      {userLocation && (
        <>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Quán ăn trong bán kính {(radius / 1000)}km
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Tìm thấy <b className="text-orange-600">{restaurants.length}</b> nhà hàng đang hoạt động gần vị trí của bạn
              </p>
            </div>

            <button
              type="button"
              onClick={fetchNearby}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-orange-50 rounded-full border border-slate-200 hover:border-orange-200 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-16/10 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : restaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => {
                const formattedDistance = formatDistance(restaurant.distance_meters);
                const defaultImage =
                  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
                const displayImage = restaurant.imageUrl || defaultImage;
                const formattedAddress = [restaurant.address?.district, restaurant.address?.city]
                  .filter(Boolean)
                  .join(', ') || restaurant.address?.line1 || 'Việt Nam';

                return (
                  <Link
                    key={restaurant.id}
                    href={`/restaurant/${restaurant.id}`}
                    prefetch={false}
                    className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-orange-100/70 shadow-xs hover:shadow-xl hover:border-orange-200/90 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative w-full aspect-16/10 overflow-hidden bg-slate-100">
                      <img
                        src={displayImage}
                        alt={restaurant.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                      {/* Distance Badge (PostGIS) */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full bg-orange-600 text-white shadow-md">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Cách {formattedDistance}</span>
                        </span>
                      </div>

                      {/* Rating Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs text-xs">
                        {restaurant.rating?.count && restaurant.rating.count > 0 ? (
                          <>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-black text-slate-900">{Number(restaurant.rating.avg).toFixed(1)}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({restaurant.rating.count})
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Chưa có đánh giá
                          </span>
                        )}
                      </div>

                      {/* Available Foods Count */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                        <span className="truncate drop-shadow-sm text-orange-200 text-[11px] font-semibold">
                          {restaurant.available_food_count ? `${restaurant.available_food_count} món ăn phục vụ` : 'Đang mở cửa'}
                        </span>
                        <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs text-[11px]">
                          <Clock className="w-3 h-3 text-orange-300" />
                          <span>15-25 phút</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Info */}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-orange-600 transition-colors">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="line-clamp-1">{formattedAddress}</span>
                        </div>
                      </div>

                      {/* Categories list */}
                      {restaurant.categories && restaurant.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {restaurant.categories.slice(0, 3).map((cat) => (
                            <span key={cat.id} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action footer */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-orange-600 font-bold group-hover:underline">
                          Xem menu quán →
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Giao siêu tốc
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-orange-200 max-w-xl mx-auto my-8">
              <Store className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Không tìm thấy quán nào trong bán kính {(radius / 1000)}km
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Khu vực hiện tại chưa có đối tác quán ăn hoạt động. Hãy thử mở rộng bán kính lên 10km hoặc 20km.
              </p>
              <button
                type="button"
                onClick={() => setRadius(20000)}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all cursor-pointer"
              >
                Mở rộng bán kính 20km
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
