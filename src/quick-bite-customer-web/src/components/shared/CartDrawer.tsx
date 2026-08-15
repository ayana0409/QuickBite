'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  X,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  Edit2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '@/src/store/cart.store';
import { useToast } from './ToastProvider';
import DeliveryAddressModal from './DeliveryAddressModal';
import AuthModal from './AuthModal';
import ConfirmModal from './ConfirmModal';

export default function CartDrawer() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { error: toastError, success: toastSuccess } = useToast();

  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const restaurantName = useCartStore((state) => state.restaurantName);
  const deliveryAddress = useCartStore((state) => state.deliveryAddress);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [clearCartModalOpen, setClearCartModalOpen] = useState(false);

  // Subtotal & Estimated Fees
  const subtotal = items.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const deliveryFee = items.length > 0 ? 15000 : 0; // Standard 15,000 VND delivery fee
  const totalAmount = subtotal + deliveryFee;

  const handleCheckout = () => {
    // 1. Check Login
    if (authStatus !== 'authenticated' || !session) {
      setAuthModalOpen(true);
      return;
    }

    // 2. Check Items
    if (items.length === 0 || !restaurantId) {
      toastError('Giỏ hàng của bạn đang trống');
      return;
    }

    // 3. Check Delivery Address
    if (
      !deliveryAddress ||
      !deliveryAddress.receiverName ||
      !deliveryAddress.phoneNumber ||
      !deliveryAddress.addressLine
    ) {
      setAddressModalOpen(true);
      return;
    }

    // 4. Close drawer and navigate to checkout confirmation page
    setCartOpen(false);
    router.push('/checkout');
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => setCartOpen(false)}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right">
        {/* 1. Header */}
        <div className="px-5 py-4 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Giỏ hàng của bạn
              </h2>
              {restaurantName ? (
                <p className="text-[11px] font-semibold text-orange-600 truncate max-w-[220px]">
                  Quán: {restaurantName}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium">
                  {items.length} món đã chọn
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setClearCartModalOpen(true)}
                className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Xóa tất cả"
              >
                Xóa tất cả
              </button>
            )}

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng giỏ hàng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Delivery Address Quick Card */}
        <div className="px-5 py-3 bg-orange-50/40 border-b border-orange-100/80 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800">
                Giao đến:
              </p>
              {deliveryAddress ? (
                <p className="text-xs text-slate-600 truncate">
                  <span className="font-bold">{deliveryAddress.receiverName}</span> ({deliveryAddress.phoneNumber}) -{' '}
                  {deliveryAddress.addressLine}, {deliveryAddress.ward}, {deliveryAddress.district}
                </p>
              ) : (
                <p className="text-xs text-orange-600 font-semibold italic">
                  Chưa có địa chỉ giao hàng
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAddressModalOpen(true)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>{deliveryAddress ? 'Đổi' : 'Thêm'}</span>
          </button>
        </div>

        {/* 3. Items List Area */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-400 flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                Giỏ hàng trống
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Chưa có món ăn nào trong giỏ. Hãy chọn những món ngon yêu thích để đặt ngay!
              </p>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full shadow-md shadow-orange-500/20 hover:scale-105 transition-transform cursor-pointer"
              >
                Khám phá món ngon
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-3.5 items-start">
                {/* Thumbnail Image */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-400">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info & Options */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1 leading-snug">
                      {item.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-500 p-1 -mr-1 transition-colors cursor-pointer"
                      title="Xóa món"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Variant & Topping Tags */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.selectedVariant && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                        {item.selectedVariant}
                      </span>
                    )}
                    {item.selectedToppings?.map((topping, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
                      >
                        +{topping}
                      </span>
                    ))}
                  </div>

                  {/* Note */}
                  {item.note && (
                    <p className="text-[11px] text-slate-400 italic mt-1 line-clamp-1">
                      Ghi chú: {item.note}
                    </p>
                  )}

                  {/* Price & Stepper */}
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-sm font-black text-orange-600">
                      {item.totalItemPrice.toLocaleString('vi-VN')}đ
                    </span>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-0.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200/60 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-slate-800 select-none">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200/60 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 4. Footer & Checkout */}
        {items.length > 0 && (
          <div className="p-5 bg-white border-t border-slate-100 shadow-lg flex flex-col gap-3">
            {/* Price Details */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} món):</span>
                <span className="font-semibold text-slate-700">
                  {subtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Phí giao hàng dự kiến:</span>
                <span className="font-semibold text-slate-700">
                  {deliveryFee.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Tổng thanh toán:</span>
                <span className="text-base font-black text-orange-600">
                  {totalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-98 transition-all cursor-pointer"
            >
              <span>Tiến hành Đặt hàng</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit/Add Address Modal */}
      <DeliveryAddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
      />

      {/* Auth Modal if guest clicks checkout */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Clear Cart Confirmation Modal */}
      <ConfirmModal
        isOpen={clearCartModalOpen}
        type="danger"
        title="Làm trống giỏ hàng?"
        message="Bạn có chắc chắn muốn xóa toàn bộ món ăn đang có trong giỏ hàng không?"
        confirmText="Xóa tất cả"
        cancelText="Giữ lại"
        onConfirm={() => {
          clearCart();
          setClearCartModalOpen(false);
          toastSuccess('Đã làm trống giỏ hàng');
        }}
        onCancel={() => setClearCartModalOpen(false)}
      />
    </>
  );
}
