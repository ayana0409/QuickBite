'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import { FoodItem } from '@/src/types/catalog.type';
import { getFoodById } from '@/src/lib/api/catalog';
import FoodCustomizer from '@/src/components/shared/FoodCustomizer';

interface AddToCartButtonProps {
  food: FoodItem;
  restaurantName?: string;
}

export default function AddToCartButton({ food, restaurantName }: AddToCartButtonProps) {
  const [currentFood, setCurrentFood] = useState<FoodItem>(food);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Client hydration check for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state if prop changes
  useEffect(() => {
    setCurrentFood(food);
  }, [food]);

  // Check if options are present
  const hasOptions =
    (currentFood.variants && currentFood.variants.length > 0) ||
    (currentFood.toppings && currentFood.toppings.length > 0);

  // Close modal with Escape key and manage body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!food.isAvailable || isLoading) return;

    // If options (variants/toppings) are not loaded yet, fetch full details on-the-fly
    if (currentFood.variants === undefined || currentFood.toppings === undefined) {
      setIsLoading(true);
      try {
        const fullFood = await getFoodById(food.id);
        if (fullFood) {
          setCurrentFood(fullFood);
        }
      } catch (err) {
        console.error('Failed to load food options:', err);
      } finally {
        setIsLoading(false);
      }
    }

    // Open option modal with FoodCustomizer so user can select options & quantity
    setIsModalOpen(true);
  };

  const handleModalAdded = () => {
    setIsModalOpen(false);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const defaultImage =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  const displayImage =
    currentFood.images && currentFood.images.length > 0
      ? currentFood.images[0]
      : defaultImage;

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={!food.isAvailable || isLoading}
        aria-label={`Thêm ${food.name} vào giỏ hàng`}
        className={`relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-sm ${
          !food.isAvailable
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : isAdded
            ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/30'
            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang tải...</span>
          </>
        ) : isAdded ? (
          <>
            <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-50 duration-150" />
            <span>Đã thêm</span>
          </>
        ) : !food.isAvailable ? (
          <span>Hết món</span>
        ) : hasOptions ? (
          <>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Chọn món</span>
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Thêm món</span>
          </>
        )}
      </button>

      {/* Options Selection Modal via React Portal */}
      {isModalOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-orange-100 flex flex-col overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-orange-50/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-orange-200/60 shadow-xs">
                  <img
                    src={displayImage}
                    alt={currentFood.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">
                    {currentFood.name}
                  </h3>
                  <p className="text-xs text-orange-600 font-bold">
                    Giá gốc: {(Number(currentFood.price) || 0).toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Scrollable Customizer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <FoodCustomizer
                food={currentFood}
                restaurantName={restaurantName}
                onAdded={handleModalAdded}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
