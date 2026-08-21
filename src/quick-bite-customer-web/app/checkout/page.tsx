'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ChevronLeft,
  MapPin,
  User,
  Phone,
  Edit2,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Store,
  Compass,
  Clock,
  Route,
  Navigation,
} from 'lucide-react';
import { useCartStore } from '@/src/store/cart.store';
import { useToast } from '@/src/components/shared/ToastProvider';
import DeliveryAddressModal from '@/src/components/shared/DeliveryAddressModal';
import AuthModal from '@/src/components/shared/AuthModal';
import { getRestaurantById } from '@/src/lib/api/catalog';
import { RestaurantDetail } from '@/src/types/catalog.type';
import {
  calculateDistanceKm,
  estimateDeliveryMinutes,
  formatDistance,
  calculateDeliveryFee,
} from '@/src/lib/utils/distance';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { error: toastError, success: toastSuccess, warning: toastWarning } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [restaurantDetail, setRestaurantDetail] = useState<RestaurantDetail | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);

  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const restaurantName = useCartStore((state) => state.restaurantName);
  const deliveryAddress = useCartStore((state) => state.deliveryAddress);
  const setDeliveryAddress = useCartStore((state) => state.setDeliveryAddress);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    setMounted(true);
    if (!deliveryAddress && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('qb-delivery-address');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.receiverName) {
            setDeliveryAddress(parsed);
          }
        }
      } catch {}
    }
  }, [deliveryAddress, setDeliveryAddress]);

  // Redirect if cart is empty after hydration
  useEffect(() => {
    if (mounted && items.length === 0) {
      toastError('Giỏ hàng trống, vui lòng chọn món trước');
      router.push('/');
    }
  }, [mounted, items.length, router, toastError]);

  // Fetch restaurant details to get restaurant GPS coordinates
  useEffect(() => {
    async function fetchRestaurant() {
      if (!restaurantId) return;
      setIsLoadingRestaurant(true);
      try {
        const detail = await getRestaurantById(restaurantId);
        setRestaurantDetail(detail);
      } catch (err) {
        console.warn('[Checkout] Failed to fetch restaurant details:', err);
      } finally {
        setIsLoadingRestaurant(false);
      }
    }

    if (mounted && restaurantId) {
      fetchRestaurant();
    }
  }, [mounted, restaurantId]);

  if (!mounted || items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-[#fdfbf7]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  // Restaurant Coordinates: GeoJSON [longitude, latitude]
  const restaurantCoords =
    restaurantDetail?.address?.geo?.coordinates ||
    (restaurantDetail?.address as any)?.coordinates;

  const restaurantLng =
    Array.isArray(restaurantCoords) &&
    typeof Number(restaurantCoords[0]) === 'number' &&
    !isNaN(Number(restaurantCoords[0]))
      ? Number(restaurantCoords[0])
      : 106.702444; // Default Saigon Center Longitude

  const restaurantLat =
    Array.isArray(restaurantCoords) &&
    typeof Number(restaurantCoords[1]) === 'number' &&
    !isNaN(Number(restaurantCoords[1]))
      ? Number(restaurantCoords[1])
      : 10.776192; // Default Saigon Center Latitude

  // Delivery Coordinates: [latitude, longitude]
  const deliveryLat =
    deliveryAddress?.latitude !== null && deliveryAddress?.latitude !== undefined
      ? Number(deliveryAddress.latitude)
      : null;
  const deliveryLng =
    deliveryAddress?.longitude !== null && deliveryAddress?.longitude !== undefined
      ? Number(deliveryAddress.longitude)
      : null;

  // Calculate distance between restaurant and customer
  const distanceKm =
    restaurantLat !== null &&
    restaurantLng !== null &&
    deliveryLat !== null &&
    deliveryLng !== null
      ? calculateDistanceKm(restaurantLat, restaurantLng, deliveryLat, deliveryLng)
      : null;

  const estimatedMinutes = estimateDeliveryMinutes(distanceKm);
  const deliveryFee = calculateDeliveryFee(distanceKm);

  // Price calculations
  const subtotal = items.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    // 1. Check Authentication
    if (authStatus !== 'authenticated' || !session) {
      setAuthModalOpen(true);
      return;
    }

    // 2. Check Items & Restaurant
    if (items.length === 0 || !restaurantId) {
      toastError('Giỏ hàng của bạn đang trống');
      router.push('/');
      return;
    }

    // 3. Check Delivery Address & Coordinates
    if (
      !deliveryAddress ||
      !deliveryAddress.receiverName ||
      !deliveryAddress.phoneNumber ||
      !deliveryAddress.addressLine
    ) {
      toastWarning('Vui lòng hoàn tất thông tin địa chỉ nhận hàng');
      setAddressModalOpen(true);
      return;
    }

    if (
      deliveryAddress.latitude === null ||
      deliveryAddress.latitude === undefined ||
      deliveryAddress.longitude === null ||
      deliveryAddress.longitude === undefined
    ) {
      toastWarning('Vui lòng chọn vị trí trên bản đồ để xác định tọa độ giao hàng!');
      setAddressModalOpen(true);
      return;
    }

    // 4. Send Order Creation & Submission Request
    setIsSubmitting(true);
    try {
      const payload = {
        restaurantId,
        deliveryAddress: {
          receiverName: deliveryAddress.receiverName,
          phoneNumber: deliveryAddress.phoneNumber,
          addressLine: deliveryAddress.addressLine,
          ward: deliveryAddress.ward,
          district: deliveryAddress.district,
          province: deliveryAddress.province,
          note: deliveryAddress.note || '',
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude,
        },
        deliveryLatitude: deliveryAddress.latitude,
        deliveryLongitude: deliveryAddress.longitude,
        items: items.map((item) => ({
          foodItemId: item.foodItemId,
          quantity: item.quantity,
          selectedVariantName: item.selectedVariant,
          selectedToppings: item.selectedToppings || [],
        })),
      };

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể tạo đơn hàng. Vui lòng thử lại!');
      }

      const orderId = data.id || data.data?.id;

      // 5. Clear cart and notify success
      clearCart();
      toastSuccess('🎉 Đặt hàng thành công! Vui lòng kiểm tra chi tiết đơn và thanh toán.');

      // 6. Navigate to order detail page
      if (orderId) {
        router.push(`/order/${orderId}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Place order error:', err);
      toastError(err.message || 'Đã có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Stepper Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Tiếp tục chọn món</span>
          </Link>

          {/* Checkout Steps Indicator */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              1. Giỏ hàng
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-orange-600 font-extrabold bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              2. Xác nhận thông tin
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">3. Theo dõi đơn</span>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Xác nhận thông tin đặt hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Vui lòng kiểm tra lại món ăn, địa chỉ nhận hàng và tọa độ giao hàng trước khi đặt đơn.
          </p>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Items & Summary (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Restaurant Info Card */}
            <div className="bg-white rounded-3xl p-5 border border-orange-100/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nhà hàng phục vụ
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {restaurantName || restaurantDetail?.name || 'Nhà hàng QuickBite'}
                  </span>
                  {restaurantDetail?.address && (
                    <span className="text-[11px] text-slate-500 block truncate max-w-sm">
                      {[
                        restaurantDetail.address.line1,
                        restaurantDetail.address.district,
                        restaurantDetail.address.city,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                {items.reduce((s, i) => s + i.quantity, 0)} món
              </span>
            </div>

            {/* Selected Items List Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <span>Danh sách món ăn</span>
              </h2>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="py-4 flex items-start gap-3 sm:gap-4">
                    {/* Item Thumbnail */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-6 h-6 opacity-40" />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.name}
                        </h3>
                        <span className="text-sm font-black text-slate-900 shrink-0">
                          {item.totalItemPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.unitPrice.toLocaleString('vi-VN')}đ × {item.quantity}
                      </div>

                      {/* Variant & Toppings */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.selectedVariant && (
                          <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/60">
                            {item.selectedVariant}
                          </span>
                        )}
                        {item.selectedToppings?.map((topping, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600"
                          >
                            +{topping}
                          </span>
                        ))}
                      </div>

                      {item.note && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg mt-2 font-medium">
                          Ghi chú: {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Tạm tính tiền món:</span>
                  <span className="font-bold text-slate-900">
                    {subtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>
                    Phí giao hàng {distanceKm !== null ? `(${formatDistance(distanceKm)})` : '(tiêu chuẩn)'}:
                  </span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Ưu đãi áp dụng:</span>
                  <span className="font-bold">0đ</span>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-3 border-t border-slate-100">
                  <span className="text-base">Tổng thanh toán:</span>
                  <span className="text-xl font-black text-orange-600">
                    {totalAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Address, Distance, Payment & Submit Button (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Delivery Address & GPS Coordinates Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Địa chỉ giao hàng</span>
                </h2>

                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{deliveryAddress?.receiverName ? 'Thay đổi' : 'Nhập địa chỉ'}</span>
                </button>
              </div>

              {deliveryAddress && deliveryAddress.receiverName ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{deliveryAddress.receiverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{deliveryAddress.phoneNumber}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed pt-1">
                    {deliveryAddress.addressLine}, {deliveryAddress.ward}, {deliveryAddress.district},{' '}
                    {deliveryAddress.province}
                  </p>

                  {/* GPS Coordinates Badge */}
                  {deliveryAddress.latitude && deliveryAddress.longitude ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60 font-semibold">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Tọa độ: [{deliveryAddress.latitude.toFixed(6)},{' '}
                        {deliveryAddress.longitude.toFixed(6)}]
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Chưa chọn tọa độ trên bản đồ. Nhấp "Thay đổi" để chọn vị trí.</span>
                    </div>
                  )}

                  {deliveryAddress.note && (
                    <p className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg mt-1 font-medium border border-amber-200/50">
                      Ghi chú: {deliveryAddress.note}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 text-orange-700 text-xs font-bold flex flex-col items-center justify-center gap-2 hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  <MapPin className="w-6 h-6 text-orange-500" />
                  <span>+ Chọn vị trí & nhập địa chỉ giao hàng</span>
                </button>
              )}
            </div>

            {/* Distance & Delivery Estimate Card (Based on Coordinates) */}
            {distanceKm !== null && (
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/20 relative overflow-hidden animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-orange-200" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Ước Tính Giao Hàng & Phí Ship
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                    GPS Định vị
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3.5">
                  <div>
                    <span className="text-[10px] sm:text-[11px] text-orange-100 block mb-0.5">Khoảng cách:</span>
                    <span className="text-base sm:text-lg font-black">{formatDistance(distanceKm)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] text-orange-100 block mb-0.5">Phí ship:</span>
                    <span className="text-base sm:text-lg font-black">{deliveryFee.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-[11px] text-orange-100 block mb-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Dự kiến:
                    </span>
                    <span className="text-base sm:text-lg font-black">~{estimatedMinutes} phút</span>
                  </div>
                </div>

                <p className="text-[10px] text-orange-100/90 mt-3 pt-2.5 border-t border-white/10">
                  * Cước phí: 15.000đ cho 5km đầu tiên, mỗi km tiếp theo +3.000đ (dựa trên tọa độ GPS giữa quán và điểm nhận).
                </p>
              </div>
            )}

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <span>Phương thức thanh toán</span>
              </h2>

              {/* Mock Payment Method Option (Selected) */}
              <div className="p-4 rounded-2xl border-2 border-orange-500 bg-orange-50/30 flex items-start gap-3.5 relative">
                <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex items-center justify-center shrink-0 mt-0.5 bg-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900">Mock Payment</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                      🧪 Thanh toán giả lập
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Đây là môi trường thử nghiệm. Hệ thống sẽ tự động xác nhận thanh toán giả lập
                    ngay sau khi bạn bấm đặt hàng mà không phát sinh chi phí thực tế.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Commitment Notice */}
            <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                Đơn hàng của bạn được bảo mật và truyền trực tiếp đến nhà hàng ngay khi xác nhận.
              </p>
            </div>

            {/* Submit Order Action Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-base text-white bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý đặt đơn...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận Đặt hàng • {totalAmount.toLocaleString('vi-VN')}đ</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Delivery Address Modal */}
      <DeliveryAddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={(newAddress) => {
          setDeliveryAddress(newAddress);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
