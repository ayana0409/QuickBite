import React, { useState, useEffect } from 'react';
import { reviewService, type Review } from '../../../services/reviewService';
import type { FoodItem } from '../../../services/menuService';
import { Pagination } from '../../common/Pagination';
import {
  Star,
  MessageSquare,
  Calendar,
  UtensilsCrossed,
  User,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ReviewListProps {
  restaurantId: string;
  foodItems?: FoodItem[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ restaurantId, foodItems = [] }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined);

  // Map food items by ID for fast lookup
  const foodItemMap = React.useMemo(() => {
    const map = new Map<string, FoodItem>();
    foodItems.forEach((f) => map.set(f.id, f));
    return map;
  }, [foodItems]);

  // Helper to extract tags like "[Món ăn nóng hổi]" and comment body
  const parseComment = (commentText?: string) => {
    if (!commentText) return { tags: [], body: '' };

    const tagRegex = /\[(.*?)\]/g;
    const matches = commentText.match(tagRegex);
    const tags: string[] = [];

    if (matches) {
      matches.forEach((m) => {
        const inner = m.replace(/^\[|\]$/g, '').trim();
        if (inner.includes(',')) {
          inner.split(',').forEach((t) => tags.push(t.trim()));
        } else {
          tags.push(inner);
        }
      });
    }

    const body = commentText.replace(tagRegex, '').trim();
    return { tags, body };
  };

  // Format date DD/MM/YYYY HH:mm
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Fetch reviews
  const loadReviews = async (page = 1, rating?: number) => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const res = await reviewService.getReviewsByRestaurant(restaurantId, page, pageSize, rating);
      setReviews(res.data || []);
      setTotalReviews(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      setCurrentPage(res.meta?.page || 1);
    } catch (error) {
      console.error('Failed to load restaurant reviews:', error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadReviews(currentPage, starFilter);
    }
  }, [restaurantId, currentPage, starFilter]);

  const handleFilterChange = (star?: number) => {
    setStarFilter(star);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Filter and Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Lọc theo mức đánh giá</h3>
            <p className="text-[11px] text-slate-400">Chọn số sao để xem các phản hồi tương ứng</p>
          </div>
        </div>

        {/* Star Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => handleFilterChange(undefined)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              starFilter === undefined
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Tất cả ({starFilter === undefined ? totalReviews : 'Xem hết'})
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => handleFilterChange(star)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                starFilter === star
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{star}</span>
              <Star
                className={`w-3.5 h-3.5 ${
                  starFilter === star ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'
                }`}
              />
            </button>
          ))}

          <button
            onClick={() => loadReviews(currentPage, starFilter)}
            className="p-2 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-xl transition-all ml-1 cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl animate-pulse space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-4 bg-slate-800 rounded" />
                    <div className="w-24 h-3 bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="w-28 h-6 bg-slate-800 rounded-xl" />
              </div>
              <div className="w-3/4 h-3.5 bg-slate-800 rounded" />
              <div className="w-1/2 h-3.5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-900/80 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-slate-500 shadow-inner">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-200">Chưa có đánh giá nào</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {starFilter
              ? `Hiện tại chưa có đánh giá nào đạt mức ${starFilter} sao từ khách hàng.`
              : 'Nhà hàng chưa nhận được phản hồi hoặc đánh giá nào từ khách hàng.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const { tags, body } = parseComment(rev.comment);
            const food = rev.foodItemId ? foodItemMap.get(rev.foodItemId) : null;
            const foodName = food?.name || rev.foodItemName;

            return (
              <div
                key={rev.id}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/90 rounded-3xl p-5 sm:p-6 transition-all shadow-md hover:shadow-xl space-y-4"
              >
                {/* Header: Customer info & Star Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">
                          {rev.userName || `Khách hàng #${rev.userId ? rev.userId.substring(0, 6) : 'QuickBite'}`}
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Đã mua hàng
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(rev.createdAt)}</span>
                        {rev.orderId && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 text-[11px]">
                              Đơn #{rev.orderId.substring(0, 8)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars Badge */}
                  <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-2xl self-start sm:self-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700 fill-slate-800'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-amber-400 ml-1.5">{rev.rating}.0</span>
                  </div>
                </div>

                {/* Food item reference badge if available */}
                {foodName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl w-fit text-xs text-slate-300">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Đánh giá món:</span>
                    <strong className="text-slate-200 font-semibold">{foodName}</strong>
                  </div>
                )}

                {/* Quick tags badges */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Review Text Body */}
                {body ? (
                  <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-2xl">
                    <p className="text-sm text-slate-200 leading-relaxed font-normal">"{body}"</p>
                  </div>
                ) : tags.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    (Khách hàng không để lại nhận xét bằng chữ)
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalReviews > pageSize && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalReviews}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            itemLabel="đánh giá"
            accentColor="emerald"
          />
        </div>
      )}
    </div>
  );
};
