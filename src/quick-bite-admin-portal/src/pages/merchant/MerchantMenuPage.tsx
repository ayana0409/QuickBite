import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { restaurantService } from '../../services/restaurantService';
import { menuService } from '../../services/menuService';
import type { Category, FoodItem, FoodVariant, FoodTopping, CreateFoodItemDto } from '../../services/menuService';
import {
  Utensils, Plus, Edit3, Trash2, FolderPlus,
  CheckCircle2, XCircle, Search, Sparkles, Clock, Coins, Tag, Layers
} from 'lucide-react';

export default function MerchantMenuPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'food' | 'category'>('food');

  const [restaurantId, setRestaurantId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('ALL');

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Food Item Modal Full State
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodName, setFoodName] = useState('');
  const [foodCategoryId, setFoodCategoryId] = useState('');
  const [foodPrice, setFoodPrice] = useState('');
  const [foodCurrency, setFoodCurrency] = useState('VND');
  const [foodPrepTime, setFoodPrepTime] = useState('15');
  const [foodSku, setFoodSku] = useState('');
  const [foodDesc, setFoodDesc] = useState('');
  const [foodImageUrl, setFoodImageUrl] = useState('');
  const [foodTags, setFoodTags] = useState('');
  const [foodVariants, setFoodVariants] = useState<FoodVariant[]>([]);
  const [foodToppings, setFoodToppings] = useState<FoodTopping[]>([]);
  const [foodIsAvailable, setFoodIsAvailable] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Tối ưu tuyệt đối: Master Loader nạp Nhà Hàng, Danh Mục & Món Ăn (Chỉ tốn tối đa 2 Requests khi vào trang)
  const loadPageData = async (targetPage: number = 1, targetCat: string = selectedCatFilter, targetSearch: string = searchTerm) => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      let currentRestId = restaurantId;

      // 1. Lấy nhà hàng nếu chưa có trong state
      if (!currentRestId) {
        const rest = await restaurantService.getRestaurantByOwner(user.id);
        currentRestId = rest?.id || '';
        if (currentRestId) {
          setRestaurantId(currentRestId);
          // Tận dụng mảng categories có sẵn trong object nhà hàng (nếu có)
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

      // 2. Lấy danh sách món ăn phân trang trực tiếp từ Backend DB
      const res = await menuService.getFoodItemsPaginated({
        restaurantId: currentRestId,
        page: targetPage,
        limit: pageSize,
        search: targetSearch,
        categoryId: targetCat,
      });

      setFoodItems(res.items);
      setTotalItems(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error in loadPageData:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Chỉ gọi khi Mount hoặc đổi User
  useEffect(() => {
    loadPageData(1, 'ALL', '');
  }, [user?.id]);

  // 2. Debounced search khi gõ từ khóa tìm kiếm (400ms)
  useEffect(() => {
    if (!restaurantId || searchTerm === '') return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadPageData(1, selectedCatFilter, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handlers chuyển trang và chọn danh mục (Chỉ phát 1 Request duy nhất)
  const handleCategoryChange = (catId: string) => {
    setSelectedCatFilter(catId);
    setCurrentPage(1);
    loadPageData(1, catId, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadPageData(newPage, selectedCatFilter, searchTerm);
  };

  const fetchData = async () => {
    await loadPageData(currentPage, selectedCatFilter, searchTerm);
  };

  // Safe Arrays
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeFoodItems = Array.isArray(foodItems) ? foodItems : [];

  // --- Category Handlers ---
  const handleOpenCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatDesc(cat.description || '');
    } else {
      setEditingCat(null);
      setCatName('');
      setCatDesc('');
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      await menuService.updateCategory(editingCat.id, { name: catName, description: catDesc });
    } else {
      await menuService.createCategory({ restaurantId, name: catName, description: catDesc });
    }

    setIsCatModalOpen(false);
    await fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa danh mục này? Các món thuộc danh mục cũng sẽ bị ảnh hưởng.')) {
      await menuService.deleteCategory(id);
      await fetchData();
    }
  };

  // --- Food Item Handlers ---
  const handleOpenFoodModal = async (food?: FoodItem) => {
    if (food) {
      setEditingFood(food);
      setFoodName(food.name);
      setFoodCategoryId(food.categoryId);
      setFoodPrice((food.price ?? food.basePrice ?? 0).toString());
      setFoodCurrency(food.currency || 'VND');
      setFoodPrepTime((food.preparationTime ?? 15).toString());
      setFoodSku(food.sku || '');
      setFoodDesc(food.description || '');
      setFoodImageUrl(food.imageUrl || (food.images && food.images[0]) || '');
      setFoodTags(food.tags ? food.tags.join(', ') : '');
      setFoodVariants(food.variants || []);
      setFoodToppings(food.toppings || []);
      setFoodIsAvailable(food.isAvailable !== undefined ? food.isAvailable : true);

      setIsFoodModalOpen(true);

      // Tải chi tiết đầy đủ của món ăn (chứa đầy đủ variants, toppings, tags, preparationTime)
      const detail = await menuService.getFoodItemById(food.id);
      if (detail) {
        setFoodName(detail.name);
        if (detail.categoryId) setFoodCategoryId(detail.categoryId);
        setFoodPrice(detail.price.toString());
        setFoodCurrency(detail.currency || 'VND');
        setFoodPrepTime((detail.preparationTime ?? 15).toString());
        setFoodSku(detail.sku || '');
        setFoodDesc(detail.description || '');
        setFoodImageUrl(detail.imageUrl || (detail.images && detail.images[0]) || '');
        setFoodTags(detail.tags ? detail.tags.join(', ') : '');
        setFoodVariants(detail.variants || []);
        setFoodToppings(detail.toppings || []);
        if (detail.isAvailable !== undefined) setFoodIsAvailable(detail.isAvailable);
      }
    } else {
      setEditingFood(null);
      setFoodName('');
      setFoodCategoryId(safeCategories[0]?.id || '');
      setFoodPrice('');
      setFoodCurrency('VND');
      setFoodPrepTime('15');
      setFoodSku('');
      setFoodDesc('');
      setFoodImageUrl('');
      setFoodTags('');
      setFoodVariants([]);
      setFoodToppings([]);
      setFoodIsAvailable(true);
      setIsFoodModalOpen(true);
    }
  };

  // Sub-resource handlers for Variants & Toppings
  const handleAddVariant = () => {
    setFoodVariants([...foodVariants, { name: '', priceDelta: 0 }]);
  };

  const handleUpdateVariant = (index: number, field: 'name' | 'priceDelta', value: any) => {
    const next = [...foodVariants];
    next[index] = { ...next[index], [field]: field === 'priceDelta' ? (parseFloat(value) || 0) : value };
    setFoodVariants(next);
  };

  const handleRemoveVariant = (index: number) => {
    setFoodVariants(foodVariants.filter((_, i) => i !== index));
  };

  const handleAddTopping = () => {
    setFoodToppings([...foodToppings, { name: '', price: 0 }]);
  };

  const handleUpdateTopping = (index: number, field: 'name' | 'price', value: any) => {
    const next = [...foodToppings];
    next[index] = { ...next[index], [field]: field === 'price' ? (parseFloat(value) || 0) : value };
    setFoodToppings(next);
  };

  const handleRemoveTopping = (index: number) => {
    setFoodToppings(foodToppings.filter((_, i) => i !== index));
  };

  const handleSaveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !foodPrice || !foodCategoryId) return;

    const parsedPrice = parseFloat(foodPrice) || 0;
    const parsedPrepTime = parseInt(foodPrepTime) || 15;
    const tagsArray = foodTags.split(',').map(t => t.trim()).filter(Boolean);

    const dto: CreateFoodItemDto = {
      restaurantId,
      categoryId: foodCategoryId,
      sku: foodSku || `SKU-${Date.now()}`,
      name: foodName,
      price: parsedPrice,
      basePrice: parsedPrice,
      currency: foodCurrency || 'VND',
      description: foodDesc,
      imageUrl: foodImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      images: foodImageUrl ? [foodImageUrl] : [],
      isAvailable: foodIsAvailable,
      preparationTime: parsedPrepTime,
      tags: tagsArray,
      variants: foodVariants.filter(v => v.name.trim() !== ''),
      toppings: foodToppings.filter(t => t.name.trim() !== ''),
    };

    if (editingFood) {
      await menuService.updateFoodItem(editingFood.id, dto);
    } else {
      await menuService.createFoodItem(dto);
    }

    setIsFoodModalOpen(false);
    await fetchData();
  };

  const handleToggleAvailability = async (id: string, currentAvailable?: boolean) => {
    await menuService.toggleAvailability(id, currentAvailable);
    await fetchData();
  };

  const handleDeleteFood = async (id: string) => {
    if (window.confirm('Xác nhận xóa món ăn này khỏi thực đơn?')) {
      await menuService.deleteFoodItem(id);
      await fetchData();
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Catalog Management
            </span>
            <span className="text-xs text-slate-400">ID: {restaurantId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-emerald-400" />
            Quản Lý Thực Đơn & Danh Mục Món
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cập nhật danh sách món ăn, nhóm món, giá bán và trạng thái mở bán theo thời gian thực.
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 relative z-10">
          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'food'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Món Ăn ({safeFoodItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'category'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Danh Mục ({safeCategories.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FOOD ITEMS MANAGEMENT */}
      {activeTab === 'food' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm món ăn theo tên hoặc mô tả..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter */}
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

            {/* Add Food Button */}
            <button
              onClick={() => handleOpenFoodModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm Món Ăn Mới
            </button>
          </div>

          {/* Food Items Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Đang tải thực đơn từ Backend Database...
            </div>
          ) : safeFoodItems.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Không tìm thấy món ăn nào. Bấm nút <strong>"Thêm Món Ăn Mới"</strong> để bắt đầu tạo thực đơn!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {safeFoodItems.map((food) => {
                  const catName = safeCategories.find(c => c.id === food.categoryId)?.name || 'Danh mục';
                  const displayImage = (food.images && food.images[0]) || food.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                  const displayPrice = (food.price ?? food.basePrice ?? 0).toLocaleString('vi-VN');
                  const currencySymbol = food.currency === 'USD' ? '$' : '₫';

                  return (
                    <div
                      key={food.id}
                      className={`bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden ${
                        !food.isAvailable
                          ? 'opacity-50 grayscale-[50%] hover:opacity-90 hover:grayscale-0 border-slate-800/60 bg-slate-950/60'
                          : ''
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Image & Status Badge */}
                        <div className="relative h-40 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                          <img
                            src={displayImage}
                            alt={food.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                          {/* Availability Badge */}
                          <button
                            onClick={() => handleToggleAvailability(food.id, food.isAvailable)}
                            className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer transition-all ${
                              food.isAvailable
                                ? 'bg-emerald-500/80 text-slate-950 border border-emerald-300'
                                : 'bg-red-500/80 text-white border border-red-300'
                            }`}
                          >
                            {food.isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {food.isAvailable ? 'Đang Bán' : 'Tạm Hết'}
                          </button>

                          {/* Category Tag */}
                          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md border border-slate-700 rounded-md text-[10px] font-bold text-cyan-300">
                            {catName}
                          </span>
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-100 text-sm leading-tight group-hover:text-emerald-300 transition-colors">
                              {food.name}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              Đã bán: {food.totalSold ?? 0}
                            </span>
                          </div>
                          {food.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                              {food.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer & Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-3">
                        <span className="text-sm font-black text-amber-400 font-mono">
                          {displayPrice} {currencySymbol}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenFoodModal(food)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                            title="Chỉnh sửa chi tiết món"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteFood(food.id)}
                            className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 hover:border-red-500/30 transition-all cursor-pointer"
                            title="Xóa món"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Backend Pagination Bar */}
              <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-mono">
                  Tổng số: <strong className="text-emerald-400">{totalItems}</strong> món | Trang{' '}
                  <strong className="text-slate-200">{currentPage}</strong> / {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    ◄ Trang Trước
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    Trang Sau ►
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORY MANAGEMENT */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="font-bold text-sm text-slate-200">Danh Sách Nhóm / Danh Mục Món</h2>
              <p className="text-xs text-slate-400">Tổ chức món ăn theo nhóm (Ví dụ: Cơm, Phở, Món thêm, Đồ uống...)</p>
            </div>

            <button
              onClick={() => handleOpenCatModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm Danh Mục
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {safeCategories.map((cat) => {
              const count = safeFoodItems.filter((f) => f && f.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/30">
                        <FolderPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">{cat.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">{count} món ăn</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCatModal(cat)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-500/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{cat.description || 'Chưa có mô tả nhóm món.'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT FOOD ITEM --- */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-10">
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {editingFood ? `Chỉnh Sửa Món Ăn: ${editingFood.name}` : 'Thêm Món Ăn Mới'}
              </h3>
              <button onClick={() => setIsFoodModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFoodItem} className="space-y-4 text-xs">
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
                      {foodIsAvailable ? 'Món ăn khả dụng và sẵn sàng cho khách hàng đặt mua' : 'Tạm hết món hoặc ngưng phục vụ món này trên menu'}
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
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-300">Tên Món Ăn *</label>
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Ví dụ: Trà Sữa Trân Châu Hoàng Kim"
                    required
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Mã SKU</label>
                  <input
                    type="text"
                    value={foodSku}
                    onChange={(e) => setFoodSku(e.target.value)}
                    placeholder="MILKTEA-L-70"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Danh mục, Giá, Loại tiền, Thời gian làm */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Danh Mục *</label>
                  <select
                    value={foodCategoryId}
                    onChange={(e) => setFoodCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Giá Bán *</label>
                  <input
                    type="number"
                    value={foodPrice}
                    onChange={(e) => setFoodPrice(e.target.value)}
                    placeholder="55000"
                    required
                    min="0"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Đơn Vị</label>
                  <select
                    value={foodCurrency}
                    onChange={(e) => setFoodCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="VND">VND (₫)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> Làm (phút)
                  </label>
                  <input
                    type="number"
                    value={foodPrepTime}
                    onChange={(e) => setFoodPrepTime(e.target.value)}
                    placeholder="15"
                    min="1"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* URL Hình ảnh & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">URL Hình Ảnh</label>
                  <input
                    type="url"
                    value={foodImageUrl}
                    onChange={(e) => setFoodImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" /> Thẻ / Tags (cách dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={foodTags}
                    onChange={(e) => setFoodTags(e.target.value)}
                    placeholder="best-seller, milk-tea, sweet"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Mô tả món */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Mô Tả Chi Tiết Món Ăn</label>
                <textarea
                  value={foodDesc}
                  onChange={(e) => setFoodDesc(e.target.value)}
                  rows={2}
                  placeholder="Thành phần chính, hương vị, khuyến mại đi kèm..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

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
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                          placeholder="Tên biến thể (VD: Size L)"
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                        />
                        <input
                          type="number"
                          value={v.priceDelta}
                          onChange={(e) => handleUpdateVariant(idx, 'priceDelta', e.target.value)}
                          placeholder="+ VNĐ (VD: 10000)"
                          className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400"
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
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => handleUpdateTopping(idx, 'name', e.target.value)}
                          placeholder="Tên topping (VD: Trân châu trắng)"
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                        />
                        <input
                          type="number"
                          value={t.price}
                          onChange={(e) => handleUpdateTopping(idx, 'price', e.target.value)}
                          placeholder="Giá VNĐ (VD: 5000)"
                          className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTopping(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400"
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
                  onClick={() => setIsFoodModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {editingFood ? 'Cập Nhật Món' : 'Lưu Món Ăn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT CATEGORY --- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-cyan-400" />
                {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Tạo Danh Mục Mới'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Tên Danh Mục *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ví dụ: Cơm Tấm, Đồ Uống, Món Thêm..."
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Mô Tả Nhóm Món</label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn gọn về nhóm món ăn này..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {editingCat ? 'Cập Nhật' : 'Tạo Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
