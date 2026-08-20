import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { restaurantService, type Restaurant } from '../../services/restaurantService';
import { menuService, type FoodItem } from '../../services/menuService';
import { ReviewList } from '../../components/merchant/reviews/ReviewList';
import { FoodItemReviewStats } from '../../components/merchant/reviews/FoodItemReviewStats';
import {
  Star,
  MessageSquare,
  UtensilsCrossed,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function MerchantReviewsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'ALL' | 'BY_FOOD'>('ALL');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load Restaurant & Food Items data
  const loadData = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      // 1. Get Merchant Restaurant profile
      let rest = await restaurantService.getMerchantProfile();
      if (!rest || !rest.id) {
        rest = await restaurantService.getRestaurantByOwner(user.id);
      }
      setRestaurant(rest);

      // 2. If restaurant exists, load food items
      if (rest?.id) {
        const foods = await menuService.getFoodItems(rest.id);
        setFoodItems(foods || []);
      }
    } catch (error) {
      console.error('Failed to load merchant review data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const avgRating = Number(restaurant?.rating?.avg) || 0;
  const reviewCount = Number(restaurant?.rating?.count) || 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Kênh Phản Hồi Khách Hàng</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Đánh giá & Phản hồi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Theo dõi trải nghiệm khách hàng, chất lượng món ăn và mức độ hài lòng về nhà hàng
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* ─── Overview KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* KPI 1: Average Rating */}
        <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 group hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-inner">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
            <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Điểm đánh giá
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Điểm đánh giá trung bình
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
                {avgRating > 0 ? avgRating.toFixed(1) : (reviewCount > 0 ? '5.0' : '0.0')}
              </span>
              <span className="text-sm font-bold text-amber-500">/ 5.0</span>
            </div>
          </div>

          {/* Stars visual */}
          <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(avgRating || 5)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700 fill-slate-800'
                }`}
              />
            ))}
            <span className="text-xs text-slate-400 ml-2 font-medium">
              {avgRating >= 4.5
                ? '⭐ Rất xuất sắc'
                : avgRating >= 4.0
                ? '👍 Chất lượng tốt'
                : avgRating > 0
                ? '👌 Cần cải thiện'
                : 'Chưa có dữ liệu'}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Reviews Count */}
        <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 group hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tổng lượt
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tổng số lượt đánh giá
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
                {reviewCount}
              </span>
              <span className="text-xs font-bold text-slate-400">lượt đánh giá</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tất cả đánh giá từ các đơn hàng hoàn tất</span>
          </div>
        </div>

        {/* KPI 3: Food Items with Reviews */}
        <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 group hover:border-teal-500/30 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl shadow-inner">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-teal-400/90 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Món ăn
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Món ăn đang phục vụ
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
                {foodItems.length}
              </span>
              <span className="text-xs font-bold text-slate-400">món trong thực đơn</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs text-slate-400">
            <Award className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              {foodItems.filter((f) => (Number(f.reviewCount) || 0) > 0).length} món đã có nhận xét
            </span>
          </div>
        </div>
      </div>

      {/* ─── Tabs Interface ─── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tất cả đánh giá</span>
          </button>

          <button
            onClick={() => setActiveTab('BY_FOOD')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'BY_FOOD'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Theo món ăn ({foodItems.length})</span>
          </button>
        </div>

        {/* ─── Active Tab Content ─── */}
        {activeTab === 'ALL' ? (
          <ReviewList restaurantId={restaurant?.id || ''} foodItems={foodItems} />
        ) : (
          <FoodItemReviewStats
            foodItems={foodItems}
            isLoading={isLoading}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}
