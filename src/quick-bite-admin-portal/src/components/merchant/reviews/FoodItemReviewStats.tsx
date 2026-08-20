import React, { useState } from 'react';
import type { FoodItem } from '../../../services/menuService';
import { Pagination } from '../../common/Pagination';
import { FoodItemReviewModal } from './FoodItemReviewModal';
import {
  Star,
  MessageSquare,
  Search,
  Eye,
  UtensilsCrossed,
} from 'lucide-react';

interface FoodItemReviewStatsProps {
  foodItems: FoodItem[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export const FoodItemReviewStats: React.FC<FoodItemReviewStatsProps> = ({
  foodItems,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(8);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rating' | 'reviewCount' | 'name'>('reviewCount');

  // Filter foods by search
  const filteredFoods = foodItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Sort foods
  const sortedFoods = [...filteredFoods].sort((a, b) => {
    if (sortBy === 'rating') {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    }
    if (sortBy === 'reviewCount') {
      return (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0);
    }
    return a.name.localeCompare(b.name);
  });

  // Paginate foods client-side
  const totalItems = sortedFoods.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedFoods = sortedFoods.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenDetailModal = (food: FoodItem) => {
    setSelectedFood(food);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFood(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm món ăn theo tên..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="reviewCount">Lượt đánh giá nhiều nhất</option>
            <option value="rating">Điểm đánh giá cao nhất</option>
            <option value="name">Tên món ăn (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Food Items Review Table/Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl animate-pulse space-y-3 shadow-md"
            >
              <div className="w-full h-36 bg-slate-800 rounded-2xl" />
              <div className="w-3/4 h-4 bg-slate-800 rounded" />
              <div className="w-1/2 h-3 bg-slate-800 rounded" />
              <div className="w-full h-9 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : paginatedFoods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-900/80 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-slate-500 shadow-inner">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-200">Không tìm thấy món ăn nào</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchTerm
              ? `Không có kết quả phù hợp với từ khóa "${searchTerm}".`
              : 'Nhà hàng hiện chưa có món ăn nào trong thực đơn.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {paginatedFoods.map((food) => {
            const rating = Number(food.rating) || 0;
            const reviewCount = Number(food.reviewCount) || 0;

            return (
              <div
                key={food.id}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl flex flex-col group"
              >
                {/* Food Image & Badge Header */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                  <img
                    src={
                      food.imageUrl ||
                      food.images?.[0] ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={food.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                  {/* Rating Badge Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/30 px-2.5 py-1 rounded-xl shadow-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      {rating > 0 ? rating.toFixed(1) : 'Chưa có'}
                    </span>
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs font-black text-emerald-400 bg-slate-950/90 backdrop-blur-sm border border-emerald-500/30 px-2.5 py-1 rounded-xl shadow">
                      {food.price?.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {food.name}
                    </h4>
                    {food.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{food.description}</p>
                    )}
                  </div>

                  {/* Rating Statistics Row */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                      </div>
                      <span className="text-slate-300 font-semibold">
                        {rating > 0 ? `${rating.toFixed(1)} / 5.0` : 'Chưa có sao'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>{reviewCount > 0 ? `${reviewCount} đánh giá` : '0 đánh giá'}</span>
                    </div>
                  </div>

                  {/* Action Button: View Details Modal */}
                  <button
                    onClick={() => handleOpenDetailModal(food)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Xem chi tiết đánh giá</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > pageSize && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            itemLabel="món ăn"
            accentColor="emerald"
          />
        </div>
      )}

      {/* Detail Modal */}
      <FoodItemReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        foodItem={selectedFood}
      />
    </div>
  );
};
