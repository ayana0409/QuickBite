import React, { useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, Clock, Tag, Layers, Coins } from 'lucide-react';
import type { Category, FoodItem, FoodVariant, FoodTopping } from '../../../services/menuService';
import Input from '../../common/Form/Input';
import Textarea from '../../common/Form/Textarea';
import Select from '../../common/Form/Select';

export interface FoodItemModalProps {
  isOpen: boolean;
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
  handleAddVariant: () => void;
  handleUpdateVariant: (index: number, field: 'name' | 'priceDelta', value: string) => void;
  handleRemoveVariant: (index: number) => void;
  foodToppings: FoodTopping[];
  handleAddTopping: () => void;
  handleUpdateTopping: (index: number, field: 'name' | 'price', value: string) => void;
  handleRemoveTopping: (index: number) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const FoodItemModal: React.FC<FoodItemModalProps> = ({
  isOpen,
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-10">
          <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            {editingFood ? `Chỉnh Sửa Món Ăn: ${editingFood.name}` : 'Thêm Món Ăn Mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Trạng thái Mở Bán Toggle Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2.5">
              {foodIsAvailable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-slate-200 block text-xs">Trạng Thái Mở Bán</span>
                <span className="text-[10px] text-slate-400">
                  {foodIsAvailable
                    ? 'Món ăn khả dụng và sẵn sàng cho khách hàng đặt mua'
                    : 'Tạm hết món hoặc ngưng phục vụ món này trên menu'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFoodIsAvailable(!foodIsAvailable)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                foodIsAvailable ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  foodIsAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tên & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tên Món Ăn"
              required
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                if (e.target.value.trim()) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Ví dụ: Trà Sữa Trân Châu Hoàng Kim"
              error={errors.name}
              containerClassName="sm:col-span-2"
              accentColor="emerald"
            />

            <Input
              label="Mã SKU"
              value={foodSku}
              onChange={(e) => setFoodSku(e.target.value)}
              placeholder="MILKTEA-L-70"
              accentColor="emerald"
            />
          </div>

          {/* Danh mục, Giá, Loại tiền, Thời gian làm */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select
              label="Danh Mục"
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
              label="Giá Bán"
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
              label="Đơn Vị"
              value={foodCurrency}
              onChange={(e) => setFoodCurrency(e.target.value)}
              options={[
                { label: 'VND (₫)', value: 'VND' },
                { label: 'USD ($)', value: 'USD' },
              ]}
              accentColor="emerald"
            />

            <Input
              label="Làm (phút)"
              type="number"
              min="1"
              icon={<Clock className="w-3 h-3 text-cyan-400" />}
              value={foodPrepTime}
              onChange={(e) => setFoodPrepTime(e.target.value)}
              placeholder="15"
              accentColor="emerald"
            />
          </div>

          {/* URL Hình ảnh & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="URL Hình Ảnh"
              type="url"
              value={foodImageUrl}
              onChange={(e) => setFoodImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              accentColor="emerald"
            />

            <Input
              label="Thẻ / Tags (cách dấu phẩy)"
              icon={<Tag className="w-3 h-3 text-amber-400" />}
              value={foodTags}
              onChange={(e) => setFoodTags(e.target.value)}
              placeholder="best-seller, milk-tea, sweet"
              accentColor="emerald"
            />
          </div>

          {/* Mô tả món */}
          <Textarea
            label="Mô Tả Chi Tiết Món Ăn"
            rows={2}
            value={foodDesc}
            onChange={(e) => setFoodDesc(e.target.value)}
            placeholder="Thành phần chính, hương vị, khuyến mại đi kèm..."
            accentColor="emerald"
          />

          {/* SECTION: VARIANTS (Size, Đường, Đá...) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Biến Thể Món (Variants: Size L, Đường 50%...)
              </span>
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold rounded-lg border border-indigo-500/40 text-[11px] cursor-pointer"
              >
                + Thêm Biến Thể
              </button>
            </div>

            {foodVariants.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Chưa có biến thể nào.</p>
            ) : (
              <div className="space-y-2">
                {foodVariants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={v.name}
                      onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                      placeholder="Tên biến thể (VD: Size L)"
                      containerClassName="flex-1"
                      accentColor="emerald"
                    />
                    <Input
                      type="number"
                      value={v.priceDelta}
                      onChange={(e) => handleUpdateVariant(idx, 'priceDelta', e.target.value)}
                      placeholder="+ VNĐ (VD: 10000)"
                      containerClassName="w-28"
                      accentColor="emerald"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: TOPPINGS (Trân châu, Pudding...) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-400" /> Topping Đi Kèm (Trân Châu, Pudding...)
              </span>
              <button
                type="button"
                onClick={handleAddTopping}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg border border-emerald-500/40 text-[11px] cursor-pointer"
              >
                + Thêm Topping
              </button>
            </div>

            {foodToppings.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Chưa có topping nào.</p>
            ) : (
              <div className="space-y-2">
                {foodToppings.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={t.name}
                      onChange={(e) => handleUpdateTopping(idx, 'name', e.target.value)}
                      placeholder="Tên topping (VD: Trân châu trắng)"
                      containerClassName="flex-1"
                      accentColor="emerald"
                    />
                    <Input
                      type="number"
                      value={t.price}
                      onChange={(e) => handleUpdateTopping(idx, 'price', e.target.value)}
                      placeholder="Giá VNĐ (VD: 5000)"
                      containerClassName="w-28"
                      accentColor="emerald"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTopping(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {editingFood ? 'Cập Nhật Món' : 'Lưu Món Ăn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FoodItemModal;
