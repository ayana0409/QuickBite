import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { reviewService, type Review } from '../../../services/reviewService';
import type { FoodItem } from '../../../services/menuService';
import { Pagination } from '../../common/Pagination';
import { Star, MessageSquare, Calendar, Tag, User } from 'lucide-react';

interface FoodItemReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem: FoodItem | null;
}

export const FoodItemReviewModal: React.FC<FoodItemReviewModalProps> = ({
  isOpen,
  onClose,
  foodItem,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined);

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

  // Fetch reviews for current food item
  const fetchReviews = async (page = 1, rating?: number) => {
    if (!foodItem?.id) return;
    setIsLoading(true);
    try {
      const res = await reviewService.getReviewsByFoodItem(foodItem.id, page, pageSize, rating);
      setReviews(res.data || []);
      setTotalReviews(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      setCurrentPage(res.meta?.page || 1);
    } catch (error) {
      console.error('Failed to load food item reviews:', error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && foodItem?.id) {
      setCurrentPage(1);
      setStarFilter(undefined);
      fetchReviews(1, undefined);
    } else {
      setReviews([]);
    }
  }, [isOpen, foodItem?.id]);

  const handleFilterChange = (star?: number) => {
    setStarFilter(star);
    setCurrentPage(1);
    fetchReviews(1, star);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchReviews(page, starFilter);
  };

  if (!foodItem) return null;

  const avgRating = Number(foodItem.rating || 0);
  const reviewCount = Number(foodItem.reviewCount || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết đánh giá món ăn"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Food Item Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <img
              src={foodItem.imageUrl || foodItem.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'}
              alt={foodItem.name}
              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0 shadow-md"
            />
            <div>
              <h4 className="text-base font-bold text-slate-100 line-clamp-1">{foodItem.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Giá bán: <span className="text-emerald-400 font-semibold">{foodItem.price?.toLocaleString('vi-VN')} ₫</span>
              </p>
            </div>
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-100">
                  {avgRating > 0 ? avgRating.toFixed(1) : (reviewCount > 0 ? '5.0' : '0.0')}
                </span>
                <span className="text-xs font-bold text-amber-500">/ 5.0</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {reviewCount > 0 ? `${reviewCount} lượt đánh giá` : 'Chưa có đánh giá'}
              </div>
            </div>
          </div>
        </div>

        {/* Star Rating Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => handleFilterChange(undefined)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              starFilter === undefined
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Tất cả ({totalReviews})
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => handleFilterChange(star)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                starFilter === star
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{star}</span>
              <Star className={`w-3.5 h-3.5 ${starFilter === star ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'}`} />
            </button>
          ))}
        </div>

        {/* Reviews List Area */}
        <div className="space-y-3 min-h-[220px] max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800" />
                      <div className="space-y-1">
                        <div className="w-24 h-3.5 bg-slate-800 rounded" />
                        <div className="w-16 h-2.5 bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="w-20 h-4 bg-slate-800 rounded" />
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-300">Chưa có đánh giá nào</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {starFilter
                  ? `Món ăn này chưa có đánh giá nào ${starFilter} sao.`
                  : 'Khách hàng chưa để lại nhận xét cho món ăn này.'}
              </p>
            </div>
          ) : (
            reviews.map((rev) => {
              const { tags, body } = parseComment(rev.comment);
              return (
                <div
                  key={rev.id}
                  className="p-4 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all space-y-2.5"
                >
                  {/* Top Bar: User & Stars */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {rev.userName || `Khách hàng #${rev.userId ? rev.userId.substring(0, 6) : 'QuickBite'}`}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(rev.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Icons */}
                    <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= rev.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600 fill-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] font-black text-amber-400 ml-1">{rev.rating}.0</span>
                    </div>
                  </div>

                  {/* Tag Badges */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Review Text */}
                  {body ? (
                    <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      "{body}"
                    </p>
                  ) : tags.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      (Khách hàng không để lại nhận xét bằng chữ)
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Pagination */}
        {totalReviews > pageSize && (
          <div className="pt-2 border-t border-slate-800">
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
    </Modal>
  );
};
