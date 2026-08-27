import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  Layers,
  Coins,
  Trash2,
  Plus,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import type { Category, FoodItem, FoodVariant, FoodTopping } from '../../../services/menuService';
import Input from '../../common/Form/Input';
import Textarea from '../../common/Form/Textarea';
import Select from '../../common/Form/Select';

export interface FoodItemModalProps {
  isOpen: boolean;
  isLoadingDetail?: boolean;
  editingFood: FoodItem | null;
  categories: Category[];
  foodName: string;
  setFoodName: (val: string) => void;
  foodCategoryId: string;
  setFoodCategoryId: (val: string) => void;
  foodPrice: string;
  setFoodPrice: (val: string) => void;
  foodCurrency: string;
  setFoodCurrency: (val: string) => void;
  foodPrepTime: string;
  setFoodPrepTime: (val: string) => void;
  foodSku: string;
  setFoodSku: (val: string) => void;
  foodDesc: string;
  setFoodDesc: (val: string) => void;
  foodImageUrl: string;
  setFoodImageUrl: (val: string) => void;
  foodTags: string;
  setFoodTags: (val: string) => void;
  foodIsAvailable: boolean;
  setFoodIsAvailable: (val: boolean) => void;
  foodVariants: FoodVariant[];
  handleAddVariant: (preset?: { name: string; priceDelta: number }) => void;
  handleUpdateVariant: (index: number, field: 'name' | 'priceDelta', value: any) => void;
  handleRemoveVariant: (index: number) => void;
  foodToppings: FoodTopping[];
  handleAddTopping: (preset?: { name: string; price: number }) => void;
  handleUpdateTopping: (index: number, field: 'name' | 'price', value: any) => void;
  handleRemoveTopping: (index: number) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

// Danh sách gợi ý biến thể món phổ biến
const VARIANT_PRESETS: { label: string; name: string; priceDelta: number }[] = [
  { label: 'Size M (+0₫)', name: 'Size M', priceDelta: 0 },
  { label: 'Size L (+10.000₫)', name: 'Size L', priceDelta: 10000 },
  { label: 'Size XL (+15.000₫)', name: 'Size XL', priceDelta: 15000 },
  { label: '70% Đường', name: '70% Đường', priceDelta: 0 },
  { label: '50% Đường', name: '50% Đường', priceDelta: 0 },
  { label: 'Ít Đá (50%)', name: 'Ít Đá (50%)', priceDelta: 0 },
  { label: 'Không Đá', name: 'Không Đá', priceDelta: 0 },
  { label: 'Nóng', name: 'Uống Nóng', priceDelta: 0 },
];

// Danh sách gợi ý topping phổ biến
const TOPPING_PRESETS: { label: string; name: string; price: number }[] = [
  { label: 'Trân Châu Đen (+5.000₫)', name: 'Trân Châu Đen', price: 5000 },
  { label: 'Trân Châu Trắng (+7.000₫)', name: 'Trân Châu Trắng', price: 7000 },
  { label: 'Pudding Trứng (+10.000₫)', name: 'Pudding Trứng', price: 10000 },
  { label: 'Kem Cheese (+12.000₫)', name: 'Kem Cheese Macchiato', price: 12000 },
  { label: 'Thạch Dừa (+5.000₫)', name: 'Thạch Dừa Giòn', price: 5000 },
  { label: 'Thạch Củ Năng (+8.000₫)', name: 'Thạch Củ Năng', price: 8000 },
];

export const FoodItemModal: React.FC<FoodItemModalProps> = ({
  isOpen,
  isLoadingDetail = false,
  editingFood,
  categories,
  foodName,
  setFoodName,
  foodCategoryId,
  setFoodCategoryId,
  foodPrice,
  setFoodPrice,
  foodCurrency,
  setFoodCurrency,
  foodPrepTime,
  setFoodPrepTime,
  foodSku,
  setFoodSku,
  foodDesc,
  setFoodDesc,
  foodImageUrl,
  setFoodImageUrl,
  foodTags,
  setFoodTags,
  foodIsAvailable,
  setFoodIsAvailable,
  foodVariants,
  handleAddVariant,
  handleUpdateVariant,
  handleRemoveVariant,
  foodToppings,
  handleAddTopping,
  handleUpdateTopping,
  handleRemoveTopping,
  onClose,
  onSave,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const currencySymbol = foodCurrency === 'USD' ? '$' : '₫';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!foodName.trim()) {
      newErrors.name = 'Tên món ăn không được để trống!';
    }
    if (!foodPrice.trim() || isNaN(parseFloat(foodPrice)) || parseFloat(foodPrice) < 0) {
      newErrors.price = 'Giá bán phải là số hợp lệ (>= 0)!';
    }
    if (!foodCategoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục món!';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(e);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto custom-scrollbar relative">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-100 flex items-center gap-2">
                {editingFood ? `Chỉnh Sửa Món Ăn: ${editingFood.name}` : 'Thêm Món Ăn Mới'}
                {isLoadingDetail && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang đồng bộ chi tiết...
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Thiết lập thông tin món, giá niêm yết, định lượng và các biến thể tùy chọn (Size, Topping).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 text-xs">
          {/* Trạng thái Mở Bán Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              {foodIsAvailable ? (
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                </div>
              ) : (
                <div className="p-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                  <XCircle className="w-5 h-5 shrink-0" />
                </div>
              )}
              <div>
                <span className="font-extrabold text-slate-200 block text-xs sm:text-sm">Trạng Thái Mở Bán Món</span>
                <span className="text-[11px] text-slate-400">
                  {foodIsAvailable
                    ? 'Món ăn đang ở trạng thái KHẢ DỤNG và sẵn sàng cho khách đặt mua trên thực đơn'
                    : 'Tạm ngưng phục vụ món ăn này (khách hàng sẽ thấy nhãn Tạm Hết)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFoodIsAvailable(!foodIsAvailable)}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                foodIsAvailable ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  foodIsAvailable ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tên & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Input
              label="Tên Món Ăn"
              required
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                if (e.target.value.trim()) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Ví dụ: Trà Sữa Trân Châu Hoàng Kim Đường Đen"
              error={errors.name}
              containerClassName="sm:col-span-2"
              accentColor="emerald"
            />

            <Input
              label="Mã SKU Định Danh"
              value={foodSku}
              onChange={(e) => setFoodSku(e.target.value)}
              placeholder="MILKTEA-GOLD-01"
              accentColor="emerald"
            />
          </div>

          {/* Danh mục, Giá, Loại tiền, Thời gian làm */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Select
              label="Danh Mục Món"
              required
              value={foodCategoryId}
              onChange={(e) => {
                setFoodCategoryId(e.target.value);
                if (e.target.value) setErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              error={errors.categoryId}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
              accentColor="emerald"
            />

            <Input
              label="Giá Bán Cơ Bản"
              type="number"
              required
              min="0"
              value={foodPrice}
              onChange={(e) => {
                setFoodPrice(e.target.value);
                if (e.target.value.trim()) setErrors((prev) => ({ ...prev, price: '' }));
              }}
              placeholder="55000"
              error={errors.price}
              accentColor="emerald"
            />

            <Select
              label="Đơn Vị Tiền Tệ"
              value={foodCurrency}
              onChange={(e) => setFoodCurrency(e.target.value)}
              options={[
                { label: 'VND (₫)', value: 'VND' },
                { label: 'USD ($)', value: 'USD' },
              ]}
              accentColor="emerald"
            />

            <Input
              label="Chuẩn Bị (phút)"
              type="number"
              min="1"
              icon={<Clock className="w-3.5 h-3.5 text-cyan-400" />}
              value={foodPrepTime}
              onChange={(e) => setFoodPrepTime(e.target.value)}
              placeholder="15"
              accentColor="emerald"
            />
          </div>

          {/* URL Hình ảnh & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="URL Hình Ảnh Món Ăn"
              type="url"
              value={foodImageUrl}
              onChange={(e) => setFoodImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              accentColor="emerald"
            />

            <Input
              label="Thẻ Phân Loại / Tags (cách nhau bởi dấu phẩy)"
              icon={<Tag className="w-3.5 h-3.5 text-amber-400" />}
              value={foodTags}
              onChange={(e) => setFoodTags(e.target.value)}
              placeholder="best-seller, milk-tea, sweet, hot"
              accentColor="emerald"
            />
          </div>

          {/* Mô tả món */}
          <Textarea
            label="Mô Tả Chi Tiết Món Ăn"
            rows={2}
            value={foodDesc}
            onChange={(e) => setFoodDesc(e.target.value)}
            placeholder="Thành phần nguyên liệu chính, hương vị đặc trưng, khuyến mại hấp dẫn đi kèm..."
            accentColor="emerald"
          />

          {/* ========================================================================= */}
          {/* SECTION: VARIANTS (Size, Độ ngọt, Mức đá...)                              */}
          {/* ========================================================================= */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                    Biến Thể Món Ăn (Variants: Kích Cỡ Size, Độ Ngọt, Mức Đá...)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {foodVariants.length} biến thể
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cho phép khách hàng lựa chọn kích cỡ hoặc định lượng khi đặt món.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddVariant()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Biến Thể
              </button>
            </div>

            {/* Quick Presets for Variants */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <HelpCircle className="w-3 h-3 text-indigo-400" />
                Gợi ý nhanh:
              </span>
              {VARIANT_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleAddVariant(preset)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {foodVariants.length === 0 ? (
              <div className="py-5 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                Chưa thiết lập biến thể nào. Bấm <strong>"+ Thêm Biến Thể"</strong> hoặc chọn các gợi ý nhanh phía trên để tạo.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2.5 px-2 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-7 sm:col-span-7">Tên Biến Thể (VD: Size L, 50% Đường)</div>
                  <div className="col-span-3 sm:col-span-3">Giá Phụ Thu ({currencySymbol})</div>
                  <div className="col-span-1 text-center">Xóa</div>
                </div>

                {/* Variant Row Items */}
                {foodVariants.map((v, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2.5 items-center bg-slate-900/90 hover:bg-slate-900 p-2 rounded-xl border border-slate-800/90 hover:border-indigo-500/40 transition-all"
                  >
                    {/* Index Badge */}
                    <div className="col-span-1 text-center font-mono font-bold text-[11px] text-indigo-400">
                      #{idx + 1}
                    </div>

                    {/* Variant Name Input */}
                    <div className="col-span-7 sm:col-span-7">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                        placeholder="Nhập tên biến thể (VD: Size L / Ít Đá / 70% Đường)..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 transition-all focus:outline-none"
                      />
                    </div>

                    {/* Price Delta Input */}
                    <div className="col-span-3 sm:col-span-3 relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] font-bold pointer-events-none">
                        +
                      </div>
                      <input
                        type="number"
                        value={v.priceDelta !== undefined ? v.priceDelta : ''}
                        onChange={(e) => handleUpdateVariant(idx, 'priceDelta', e.target.value)}
                        placeholder="0"
                        className="w-full pl-6 pr-8 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-slate-100 placeholder-slate-500 text-xs font-mono rounded-xl py-2.5 transition-all focus:outline-none"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none">
                        {currencySymbol}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/40 transition-all cursor-pointer"
                        title="Xóa biến thể này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION: TOPPINGS (Trân châu, Pudding, Kem Cheese...)                      */}
          {/* ========================================================================= */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                    Topping & Món Ăn Kèm (Trân Châu, Pudding, Phô Mai...)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {foodToppings.length} topping
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Các loại topping khách hàng có thể chọn thêm nhiều lựa chọn cùng lúc.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddTopping()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Topping
              </button>
            </div>

            {/* Quick Presets for Toppings */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <HelpCircle className="w-3 h-3 text-emerald-400" />
                Gợi ý nhanh:
              </span>
              {TOPPING_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleAddTopping(preset)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {foodToppings.length === 0 ? (
              <div className="py-5 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                Chưa có topping đi kèm nào. Bấm <strong>"+ Thêm Topping"</strong> hoặc chọn gợi ý nhanh phía trên.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2.5 px-2 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-7 sm:col-span-7">Tên Topping Đi Kèm</div>
                  <div className="col-span-3 sm:col-span-3">Giá Topping ({currencySymbol})</div>
                  <div className="col-span-1 text-center">Xóa</div>
                </div>

                {/* Topping Row Items */}
                {foodToppings.map((t, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2.5 items-center bg-slate-900/90 hover:bg-slate-900 p-2 rounded-xl border border-slate-800/90 hover:border-emerald-500/40 transition-all"
                  >
                    {/* Index Badge */}
                    <div className="col-span-1 text-center font-mono font-bold text-[11px] text-emerald-400">
                      #{idx + 1}
                    </div>

                    {/* Topping Name Input */}
                    <div className="col-span-7 sm:col-span-7">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => handleUpdateTopping(idx, 'name', e.target.value)}
                        placeholder="Nhập tên topping (VD: Trân châu hoàng kim)..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 transition-all focus:outline-none"
                      />
                    </div>

                    {/* Topping Price Input */}
                    <div className="col-span-3 sm:col-span-3 relative">
                      <input
                        type="number"
                        value={t.price !== undefined ? t.price : ''}
                        onChange={(e) => handleUpdateTopping(idx, 'price', e.target.value)}
                        placeholder="5000"
                        className="w-full pl-3 pr-8 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-100 placeholder-slate-500 text-xs font-mono rounded-xl py-2.5 transition-all focus:outline-none"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none">
                        {currencySymbol}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveTopping(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/40 transition-all cursor-pointer"
                        title="Xóa topping này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/95 backdrop-blur-sm z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {editingFood ? 'Cập Nhật Món Ăn' : 'Lưu Món Vào Thực Đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FoodItemModal;
