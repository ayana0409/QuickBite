import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Package,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { restaurantService } from '../../services/restaurantService';
import { menuService } from '../../services/menuService';
import type { Category, FoodItem } from '../../services/menuService';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryItem } from '../../services/inventoryService';
import Pagination from '../../components/common/Pagination';
import ImportStockModal from '../../components/merchant/modals/ImportStockModal';
import QuickAdjustStockModal from '../../components/merchant/modals/QuickAdjustStockModal';

export default function MerchantInventoryPage() {
  const { user } = useAuthStore();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal 1: Import Stock Modal (2 steps)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [catalogFoods, setCatalogFoods] = useState<FoodItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const [selectedFoodsMap, setSelectedFoodsMap] = useState<Record<string, { food: FoodItem; qty: number }>>({});
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Modal 2: Single Item Quick Adjust Modal
  const [isQuickAdjustModalOpen, setIsQuickAdjustModalOpen] = useState(false);
  const [quickAdjustItem, setQuickAdjustItem] = useState<InventoryItem | null>(null);
  const [quickAdjustQty, setQuickAdjustQty] = useState<string>('10');
  const [quickAdjustMode, setQuickAdjustMode] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Master Loader
  const loadInventoryData = async (
    targetPage: number = currentPage,
    targetCat: string = selectedCatFilter,
    targetSearch: string = searchTerm
  ) => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      let currentRestId = restaurantId;

      // 1. Get restaurant if not loaded
      if (!currentRestId) {
        const rest = await restaurantService.getRestaurantByOwner(user.id);
        currentRestId = rest?.id || '';
        if (currentRestId) {
          setRestaurantId(currentRestId);
          if (Array.isArray((rest as any)?.categories) && (rest as any).categories.length > 0) {
            setCategories((rest as any).categories);
          } else {
            const cats = await menuService.getCategories(currentRestId);
            setCategories(Array.isArray(cats) ? cats : []);
          }
        }
      }

      if (!currentRestId) {
        setIsLoading(false);
        return;
      }

      // 2. Fetch paginated inventory items from Spring Boot Inventory Service
      const res = await inventoryService.getInventoryByRestaurant({
        restaurantId: currentRestId,
        page: targetPage,
        limit: pageSize,
        search: targetSearch,
        categoryId: targetCat,
      });

      setInventoryItems(res.items);
      setTotalItems(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Mount effect
  useEffect(() => {
    loadInventoryData(1, 'ALL', '');
  }, [user?.id]);

  // Debounced search effect (400ms)
  useEffect(() => {
    if (!restaurantId || searchTerm === '') return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadInventoryData(1, selectedCatFilter, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter & Page Handlers
  const handleCategoryChange = (catId: string) => {
    setSelectedCatFilter(catId);
    setCurrentPage(1);
    loadInventoryData(1, catId, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadInventoryData(newPage, selectedCatFilter, searchTerm);
  };

  // Open Import Modal & Fetch Menu Items for Picker
  const handleOpenImportModal = async () => {
    setIsImportModalOpen(true);
    setImportStep(1);
    setSelectedFoodsMap({});
    setCatalogSearch('');
    setIsLoadingCatalog(true);

    try {
      if (restaurantId) {
        const res = await menuService.getFoodItemsPaginated({
          restaurantId,
          page: 1,
          limit: 100,
        });
        setCatalogFoods(res.items);
      }
    } catch (err) {
      console.error('Error fetching catalog for import:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Toggle food selection in Import Modal step 1
  const handleToggleSelectFood = (food: FoodItem) => {
    setSelectedFoodsMap((prev) => {
      const next = { ...prev };
      if (next[food.id]) {
        delete next[food.id];
      } else {
        next[food.id] = { food, qty: 10 };
      }
      return next;
    });
  };

  // Handle quantity change in Import Modal step 2
  const handleUpdateImportQty = (foodId: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    setSelectedFoodsMap((prev) => {
      if (!prev[foodId]) return prev;
      return {
        ...prev,
        [foodId]: { ...prev[foodId], qty: isNaN(qty) ? 0 : Math.max(1, qty) },
      };
    });
  };

  // Submit Import Stock (Step 2 Submit)
  const handleSubmitImport = async () => {
    const selectedEntries = Object.values(selectedFoodsMap);
    if (selectedEntries.length === 0) return;

    setIsSubmittingImport(true);
    try {
      for (const entry of selectedEntries) {
        if (entry.qty > 0) {
          await inventoryService.adjustStock({
            foodItemId: entry.food.id,
            adjustmentQuantity: entry.qty,
          });
        }
      }
      setIsImportModalOpen(false);
      toast.success(`Đã nhập bổ sung kho thành công cho ${selectedEntries.length} sản phẩm!`);
      await loadInventoryData(currentPage, selectedCatFilter, searchTerm);
    } catch (err) {
      console.error('Error submitting import stock:', err);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Open Quick Adjust Modal
  const handleOpenQuickAdjust = (item: InventoryItem) => {
    setQuickAdjustItem(item);
    setQuickAdjustQty('10');
    setQuickAdjustMode('ADD');
    setIsQuickAdjustModalOpen(true);
  };

  // Submit Quick Adjust
  const handleSubmitQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustItem) return;

    const numQty = parseInt(quickAdjustQty, 10);
    if (isNaN(numQty) || numQty < 0) return;

    setIsSubmittingQuick(true);
    try {
      if (quickAdjustMode === 'ADD') {
        await inventoryService.adjustStock({
          foodItemId: quickAdjustItem.foodItemId,
          adjustmentQuantity: numQty,
        });
        toast.success(`Đã nhập thêm ${numQty} vào kho cho "${quickAdjustItem.name || 'Món ăn'}"!`);
      } else if (quickAdjustMode === 'SUBTRACT') {
        await inventoryService.adjustStock({
          foodItemId: quickAdjustItem.foodItemId,
          adjustmentQuantity: -numQty,
        });
        toast.success(`Đã giảm/xuất ${numQty} khỏi kho của "${quickAdjustItem.name || 'Món ăn'}"!`);
      } else if (quickAdjustMode === 'SET') {
        await inventoryService.createInventory({
          foodItemId: quickAdjustItem.foodItemId,
          quantity: numQty,
        });
        toast.success(`Đã thiết lập kho tuyệt đối thành ${numQty} cho "${quickAdjustItem.name || 'Món ăn'}"!`);
      }

      setIsQuickAdjustModalOpen(false);
      await loadInventoryData(currentPage, selectedCatFilter, searchTerm);
    } catch (err) {
      console.error('Error quick adjusting stock:', err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Delete inventory item
  const handleDeleteInventory = async (foodItemId: string, name?: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi tồn kho của "${name || foodItemId}" không?`)) {
      return;
    }
    try {
      await inventoryService.deleteInventoryItem(foodItemId);
      toast.success(`Đã xóa bản ghi kho của "${name || foodItemId}"!`);
      await loadInventoryData(currentPage, selectedCatFilter, searchTerm);
    } catch (err) {
      console.error('Error deleting inventory:', err);
    }
  };

  // Aggregate stats
  const totalStockSum = inventoryItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalAvailableSum = inventoryItems.reduce((acc, i) => acc + i.availableQuantity, 0);
  const totalReservedSum = inventoryItems.reduce((acc, i) => acc + i.reservedQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Inventory Management
            </span>
            <span className="text-xs text-slate-400">ID: {restaurantId || 'Loading...'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-400" />
            Quản Lý Kho Hàng & Nhập Kho
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm soát chính xác tồn kho thực tế, số lượng đang giữ theo đơn hàng và cập nhật số lượng nhập hàng.
          </p>
        </div>

        {/* Top Action Button */}
        <button
          onClick={handleOpenImportModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer shrink-0 z-10"
        >
          <Plus className="w-4 h-4" /> Nhập Hàng Mới
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Sản Phẩm Trong Kho (Trang)</span>
            <span className="text-xl font-black text-slate-100 font-mono">{inventoryItems.length}</span>
            <span className="text-[10px] text-slate-500 block">Tổng số SKU: {totalItems} (Tổng kho: {totalStockSum})</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Tổng Kho Khả Dụng</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{totalAvailableSum.toLocaleString('vi-VN')}</span>
            <span className="text-[10px] text-slate-500 block">Khách có thể đặt ngay</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Đang Giữ Cho Đơn Hàng</span>
            <span className="text-xl font-black text-amber-400 font-mono">{totalReservedSum.toLocaleString('vi-VN')}</span>
            <span className="text-[10px] text-slate-500 block">Đang xử lý thanh toán/giao món</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên sản phẩm trong kho..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCatFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">Tất cả danh mục ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadInventoryData(currentPage, selectedCatFilter, searchTerm)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Đang tải dữ liệu tồn kho từ Inventory Service...
          </div>
        ) : inventoryItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Không tìm thấy sản phẩm nào trong kho. Bấm nút <strong>"Nhập Hàng Mới"</strong> để thiết lập số lượng!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Tên Sản Phẩm</th>
                  <th className="py-3.5 px-4 text-center">Khả Dụng (Available)</th>
                  <th className="py-3.5 px-4 text-center">Đang Giữ (Reserved)</th>
                  <th className="py-3.5 px-4 text-center">Tổng Tồn Kho</th>
                  <th className="py-3.5 px-4">Cập Nhật</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {inventoryItems.map((item, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  const isLowStock = item.availableQuantity <= 5;
                  const isOutStock = item.availableQuantity <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-500 text-[11px] font-sans">
                        {itemIndex}
                      </td>

                      <td className="py-3.5 px-4 font-sans font-bold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{item.name || 'Món ăn'}</span>
                          {isOutStock ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                              Hết Hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Sắp Hết
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[200px]">
                          ID: {item.foodItemId}
                        </span>
                      </td>

                      {/* Available Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black inline-block ${
                            isOutStock
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : isLowStock
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {item.availableQuantity.toLocaleString('vi-VN')}
                        </span>
                      </td>

                      {/* Reserved Quantity */}
                      <td className="py-3.5 px-4 text-center text-amber-400 font-bold">
                        {item.reservedQuantity.toLocaleString('vi-VN')}
                      </td>

                      {/* Total Quantity */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-200">
                        {item.quantity.toLocaleString('vi-VN')}
                      </td>

                      {/* Updated At */}
                      <td className="py-3.5 px-4 text-[10px] text-slate-400 font-sans">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : 'Mới tạo'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenQuickAdjust(item)}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-sans font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Điều Chỉnh
                          </button>

                          <button
                            onClick={() => handleDeleteInventory(item.foodItemId, item.name)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition-all cursor-pointer"
                            title="Xóa bản ghi tồn kho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Backend Pagination Bar */}
        {!isLoading && inventoryItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            itemLabel="SKU kho"
            accentColor="cyan"
            className="border-t border-slate-800 rounded-t-none bg-slate-950/80"
          />
        )}
      </div>

      {/* MODAL 1: IMPORT STOCK MODAL (2 STEPS) */}
      <ImportStockModal
        isOpen={isImportModalOpen}
        step={importStep}
        setStep={setImportStep}
        catalogSearch={catalogSearch}
        setCatalogSearch={setCatalogSearch}
        catalogFoods={catalogFoods}
        isLoadingCatalog={isLoadingCatalog}
        selectedFoodsMap={selectedFoodsMap}
        onToggleSelectFood={handleToggleSelectFood}
        onUpdateImportQty={handleUpdateImportQty}
        onSubmit={handleSubmitImport}
        isSubmitting={isSubmittingImport}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* MODAL 2: SINGLE ITEM QUICK ADJUST MODAL */}
      <QuickAdjustStockModal
        isOpen={isQuickAdjustModalOpen}
        item={quickAdjustItem}
        qty={quickAdjustQty}
        setQty={setQuickAdjustQty}
        mode={quickAdjustMode}
        setMode={setQuickAdjustMode}
        onSubmit={handleSubmitQuickAdjust}
        isSubmitting={isSubmittingQuick}
        onClose={() => setIsQuickAdjustModalOpen(false)}
      />
    </div>
  );
}
