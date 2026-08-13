import React from 'react';
import { Boxes, Search, X, Check, ChevronRight } from 'lucide-react';
import type { FoodItem } from '../../../services/menuService';

export interface ImportStockModalProps {
  isOpen: boolean;
  step: 1 | 2;
  setStep: (step: 1 | 2) => void;
  catalogSearch: string;
  setCatalogSearch: (val: string) => void;
  catalogFoods: FoodItem[];
  isLoadingCatalog: boolean;
  selectedFoodsMap: Record<string, { food: FoodItem; qty: number }>;
  onToggleSelectFood: (food: FoodItem) => void;
  onUpdateImportQty: (foodId: string, qtyStr: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export const ImportStockModal: React.FC<ImportStockModalProps> = ({
  isOpen,
  step,
  setStep,
  catalogSearch,
  setCatalogSearch,
  catalogFoods,
  isLoadingCatalog,
  selectedFoodsMap,
  onToggleSelectFood,
  onUpdateImportQty,
  onSubmit,
  isSubmitting,
  onClose,
}) => {
  if (!isOpen) return null;

  const filteredCatalogFoods = catalogFoods.filter((f) =>
    f.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const selectedCount = Object.keys(selectedFoodsMap).length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-400" />
              Nhập Hàng Vào Kho ({step === 1 ? 'Bước 1: Chọn Sản Phẩm' : 'Bước 2: Nhập Số Lượng'})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1
                ? 'Tích chọn các sản phẩm bạn muốn nhập bổ sung số lượng vào kho'
                : 'Điền số lượng nhập cho từng món ăn đã chọn'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: PICK FOOD ITEMS */}
        {step === 1 && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search input in step 1 */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Tìm tên món ăn trong thực đơn..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[350px]">
              {isLoadingCatalog ? (
                <div className="p-8 text-center text-slate-400 text-xs">Đang tải danh mục thực đơn...</div>
              ) : filteredCatalogFoods.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Không tìm thấy món ăn nào.</div>
              ) : (
                filteredCatalogFoods.map((food) => {
                  const isSelected = !!selectedFoodsMap[food.id];
                  return (
                    <div
                      key={food.id}
                      onClick={() => onToggleSelectFood(food)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-slate-100'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            food.imageUrl ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={food.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-800"
                        />
                        <div>
                          <h4 className="font-bold text-xs">{food.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Giá bán: {(food.price ?? food.basePrice ?? 0).toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4 font-black" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Step 1 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Đã chọn: <strong className="text-cyan-400 font-mono">{selectedCount}</strong> món ăn
              </span>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Tiếp Theo: Nhập Số Lượng <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENTER QUANTITIES */}
        {step === 2 && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[350px]">
              {Object.values(selectedFoodsMap).map(({ food, qty }) => (
                <div
                  key={food.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        food.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={food.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate">{food.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        ID: {food.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 font-bold">Số lượng cộng thêm:</span>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => onUpdateImportQty(food.id, e.target.value)}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-400 text-center focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Step 2 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                ◄ Quay lại chọn món
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={onSubmit}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                {isSubmitting && (
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                )}
                Xác Nhận Nhập Hàng Tồn Kho
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportStockModal;
