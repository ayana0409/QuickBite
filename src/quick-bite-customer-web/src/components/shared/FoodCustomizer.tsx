'use client';

import React, { useState, useMemo } from 'react';
import { Minus, Plus, ShoppingCart, Check, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { FoodItem } from '@/src/types/catalog.type';
import { useCartStore } from '@/src/store/cart.store';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';

interface FoodCustomizerProps {
  food: FoodItem;
  restaurantName?: string;
  onAdded?: () => void;
}

export default function FoodCustomizer({ food, restaurantName, onAdded }: FoodCustomizerProps) {
  const variants = food.variants || [];
  const toppings = food.toppings || [];

  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const { success, warning, error } = useToast();

  // Default select first variant if available
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0].name : null
  );
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Dynamic Price Calculation with safe Number casting
  const { unitPrice, totalPrice, variantDelta, toppingsTotal } = useMemo(() => {
    const base = Number(food.price) || 0;
    
    // Variant price delta
    const currentVariant = variants.find((v) => v.name === selectedVariant);
    const vDelta = currentVariant
      ? Number(currentVariant.priceDelta ?? (currentVariant as any).price ?? 0) || 0
      : 0;

    // Toppings sum
    const tTotal = toppings
      .filter((t) => selectedToppings.includes(t.name))
      .reduce((sum, t) => {
        const itemPrice = Number(t.price ?? (t as any).priceDelta ?? 0) || 0;
        return sum + itemPrice;
      }, 0);

    const unit = Math.max(0, base + vDelta + tTotal);
    const total = unit * (Number(quantity) || 1);

    return {
      unitPrice: unit,
      totalPrice: total,
      variantDelta: vDelta,
      toppingsTotal: tTotal,
    };
  }, [food.price, variants, toppings, selectedVariant, selectedToppings, quantity]);

  // Toggle Topping checkbox
  const handleToggleTopping = (toppingName: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingName)
        ? prev.filter((name) => name !== toppingName)
        : [...prev, toppingName]
    );
  };

  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);
  const [pendingItem, setPendingItem] = useState<any>(null);

  // Quantity controls
  const handleDecrease = () => setQuantity((prev) => Math.max(1, prev - 1));
  const handleIncrease = () => setQuantity((prev) => prev + 1);

  // Add to Cart handler
  const handleAddToCart = () => {
    const itemData = {
      foodItemId: food.id,
      name: food.name,
      price: Number(food.price) || 0,
      unitPrice,
      imageUrl: food.images?.[0] || '',
      quantity,
      selectedVariant,
      selectedToppings,
      note: note.trim(),
    };

    try {
      addItem(itemData, food.restaurantId, restaurantName);
      
      setIsAdded(true);
      success(`Đã thêm ${quantity}x "${food.name}" vào giỏ hàng!`);
      if (onAdded) onAdded();

      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    } catch (err: any) {
      if (err?.message === 'DIFFERENT_RESTAURANT') {
        setPendingItem(itemData);
        setShowConflictModal(true);
      } else {
        error('Không thể thêm món vào giỏ hàng. Vui lòng thử lại!');
      }
    }
  };

  // Confirm replace cart with new restaurant's item
  const handleConfirmReplaceCart = () => {
    if (!pendingItem) return;

    clearCart();
    addItem(pendingItem, food.restaurantId, restaurantName);
    setShowConflictModal(false);
    setPendingItem(null);

    setIsAdded(true);
    success(`Đã làm mới giỏ hàng và thêm "${food.name}"!`);
    if (onAdded) onAdded();

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const handleCancelReplaceCart = () => {
    setShowConflictModal(false);
    setPendingItem(null);
    warning('Đã giữ nguyên giỏ hàng hiện tại.');
  };

  return (
    <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      
      {/* 1. Base Price Display */}
      <div className="flex items-baseline justify-between pb-5 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Đơn giá tạm tính
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
              {unitPrice.toLocaleString('vi-VN')}đ
            </span>
            {variantDelta !== 0 && (
              <span className="text-xs text-slate-400 font-medium">
                ({variantDelta > 0 ? `+${variantDelta.toLocaleString('vi-VN')}đ` : `${variantDelta.toLocaleString('vi-VN')}đ`} tuỳ chọn size)
              </span>
            )}
          </div>
        </div>

        {food.isAvailable ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sẵn sàng phục vụ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
            <AlertCircle className="w-3.5 h-3.5" />
            Tạm hết món
          </span>
        )}
      </div>

      {/* 2. Variants (Radio Group) */}
      {variants.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>Chọn Size / Loại món</span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                Bắt buộc
              </span>
            </label>
            <span className="text-xs text-slate-400">Chọn 1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {variants.map((v) => {
              const isSelected = selectedVariant === v.name;
              const delta = Number(v.priceDelta ?? (v as any).price ?? 0) || 0;
              return (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => setSelectedVariant(v.name)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? 'text-orange-950' : 'text-slate-700'
                      }`}
                    >
                      {v.name}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-orange-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {delta === 0
                      ? 'Tiêu chuẩn'
                      : delta > 0
                      ? `+${delta.toLocaleString('vi-VN')}đ`
                      : `${delta.toLocaleString('vi-VN')}đ`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Toppings (Checkbox Group) */}
      {toppings.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>Thêm Topping / Món ăn kèm</span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Tuỳ chọn
              </span>
            </label>
            <span className="text-xs text-slate-400">Chọn nhiều</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {toppings.map((t) => {
              const isChecked = selectedToppings.includes(t.name);
              const toppingPrice = Number(t.price ?? (t as any).priceDelta ?? 0) || 0;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleToggleTopping(t.name)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isChecked
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isChecked ? 'text-orange-950' : 'text-slate-700'
                      }`}
                    >
                      {t.name}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold ${
                      isChecked ? 'text-orange-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    +{toppingPrice.toLocaleString('vi-VN')}đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Special Instructions Note */}
      <div className="flex flex-col gap-2 pt-1">
        <label className="text-xs font-bold text-slate-700">
          Ghi chú đặc biệt cho quán (không bắt buộc)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Ít cay, không hành, để riêng nước chấm..."
          className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-400"
          maxLength={200}
        />
      </div>

      {/* 5. Quantity & Add to Cart Action Row */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={quantity <= 1 || !food.isAvailable}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
            aria-label="Giảm số lượng"
          >
            <Minus className="w-4 h-4" />
          </button>

          <span className="w-10 text-center font-black text-slate-800 text-base select-none">
            {quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrease}
            disabled={!food.isAvailable}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
            aria-label="Tăng số lượng"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Submit Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!food.isAvailable}
          className={`flex-1 flex items-center justify-between gap-3 px-6 py-3.5 rounded-2xl font-black text-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-98 select-none ${
            !food.isAvailable
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : isAdded
              ? 'bg-emerald-600 text-white shadow-emerald-500/30'
              : 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center gap-2">
            {isAdded ? (
              <Check className="w-5 h-5 stroke-[3] animate-in zoom-in-50 duration-150" />
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
            <span>{isAdded ? 'Đã thêm vào giỏ hàng!' : 'Thêm vào giỏ hàng'}</span>
          </div>

          <span className="text-base font-black tracking-tight drop-shadow-xs">
            {totalPrice.toLocaleString('vi-VN')}đ
          </span>
        </button>

      </div>
      
      {/* Restaurant Mismatch Confirmation Dialog */}
      <ConfirmModal
        isOpen={showConflictModal}
        type="restaurant_conflict"
        title="Tạo giỏ hàng mới?"
        message={`Bạn đang có món của nhà hàng khác trong giỏ hàng.\nBạn có muốn xoá giỏ hàng cũ để bắt đầu đặt món từ "${restaurantName || 'nhà hàng này'}" không?`}
        confirmText="Xóa & Thêm món mới"
        cancelText="Giữ giỏ hàng cũ"
        onConfirm={handleConfirmReplaceCart}
        onCancel={handleCancelReplaceCart}
      />
    </div>
  );
}
