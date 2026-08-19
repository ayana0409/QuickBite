'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Loader2,
  ThumbsUp,
  User,
} from 'lucide-react';
import { Review, PaginatedResult } from '@/src/types/catalog.type';
import { getReviewsByRestaurant, getReviewsByFoodItem } from '@/src/lib/api/review';

interface ReviewListSectionProps {
  targetType: 'restaurant' | 'foodItem';
  targetId: string;
  targetName?: string;
  ratingSummary?: {
    avg: number;
    count: number;
  };
  className?: string;
}

const STAR_FILTERS = [
  { label: 'Tất cả', value: 0 },
  { label: '5 sao', value: 5 },
  { label: '4 sao', value: 4 },
  { label: '3 sao', value: 3 },
  { label: '2 sao', value: 2 },
  { label: '1 sao', value: 1 },
];

export default function ReviewListSection({
  targetType,
  targetId,
  targetName,
  ratingSummary,
  className = '',
}: ReviewListSectionProps) {
  const [reviewsData, setReviewsData] = useState<PaginatedResult<Review>>({
    data: [],
    meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
  });
  const [selectedStar, setSelectedStar] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReviews = useCallback(
    async (page: number, ratingFilter: number) => {
      if (!targetId) return;
      setLoading(true);
      try {
        const starParam = ratingFilter > 0 ? ratingFilter : undefined;
        let res: PaginatedResult<Review>;

        if (targetType === 'restaurant') {
          res = await getReviewsByRestaurant(targetId, page, 5, starParam);
        } else {
          res = await getReviewsByFoodItem(targetId, page, 5, starParam);
        }

        setReviewsData(res);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    },
    [targetId, targetType]
  );

  useEffect(() => {
    fetchReviews(currentPage, selectedStar);
  }, [fetchReviews, currentPage, selectedStar]);

  const handleFilterChange = (star: number) => {
    setSelectedStar(star);
    setCurrentPage(1); // Reset to page 1 on filter switch
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (reviewsData.meta.totalPages || 1)) {
      setCurrentPage(newPage);
      // Smooth scroll to review section top
      const el = document.getElementById('reviews-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const rawAvg =
    typeof ratingSummary?.avg === 'object' && ratingSummary?.avg !== null
      ? (ratingSummary.avg as any).avg ?? 0
      : ratingSummary?.avg;
  const avgRating = Number(rawAvg) || 0;
  const reviewCount = Number(ratingSummary?.count) || reviewsData.meta.total || 0;

  // Helper to extract tags like "[Món ăn nóng hổi]" and remaining comment
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

  // Avatar color generator based on user id / index
  const getAvatarGradient = (userId: string = '') => {
    const gradients = [
      'from-amber-400 to-orange-500',
      'from-emerald-400 to-teal-500',
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-rose-400 to-red-500',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <section id="reviews-section" className={`pt-6 ${className}`}>
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-xs">
        
        {/* ─── Header: Overview & Title ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>Đánh giá từ khách hàng</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nhận xét & Trải nghiệm thực tế
            </h2>
            {targetName && (
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá dành cho: <strong className="text-slate-700">{targetName}</strong>
              </p>
            )}
          </div>

          {/* Rating Summary Score Card */}
          <div className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200/80 px-4 py-3 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {avgRating > 0 ? avgRating.toFixed(1) : (reviewsData.meta.total > 0 ? '5.0' : '0.0')}
                </span>
                <span className="text-xs font-bold text-amber-700">/ 5.0</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {reviewCount > 0 ? `${reviewCount} lượt đánh giá` : 'Chưa có đánh giá'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Star Rating Filters ─── */}
        <div className="py-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc:</span>
          </span>

          {STAR_FILTERS.map((filter) => {
            const isSelected = selectedStar === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterChange(filter.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                {filter.value > 0 && (
                  <Star
                    className={`w-3 h-3 ${
                      isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'
                    }`}
                  />
                )}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Reviews List ─── */}
        <div className="py-4">
          {loading ? (
            /* Loading Skeleton */
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-200" />
                      <div>
                        <div className="w-24 h-3 bg-slate-200 rounded" />
                        <div className="w-16 h-2.5 bg-slate-200 rounded mt-1.5" />
                      </div>
                    </div>
                    <div className="w-20 h-4 bg-slate-200 rounded" />
                  </div>
                  <div className="w-full h-3.5 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : reviewsData.data.length === 0 ? (
            /* Empty State */
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-200/60">
                <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                {selectedStar > 0
                  ? `Chưa có đánh giá ${selectedStar} sao nào`
                  : 'Chưa có đánh giá nào'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {selectedStar > 0
                  ? 'Hãy thử chọn bộ lọc khác hoặc xem tất cả nhận xét của quán.'
                  : 'Hãy đặt món và trở thành người đầu tiên chia sẻ cảm nhận về trải nghiệm món ăn nhé!'}
              </p>
              {selectedStar > 0 && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(0)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <span>Xem tất cả đánh giá</span>
                </button>
              )}
            </div>
          ) : (
            /* Review Items */
            <div className="divide-y divide-slate-100">
              {reviewsData.data.map((review) => {
                const { tags, body } = parseComment(review.comment);
                const reviewDate = review.createdAt
                  ? new Date(review.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : 'Gần đây';

                return (
                  <div key={review.id} className="py-4 first:pt-2 last:pb-2">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                            review.userId
                          )} text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0`}
                        >
                          {review.userId ? review.userId.substring(0, 2).toUpperCase() : 'KH'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              Khách hàng QuickBite
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              #{review.userId ? review.userId.substring(0, 6) : 'user'}
                            </span>
                          </div>

                          {/* Star rating icons */}
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Created date */}
                      <span className="text-[11px] text-slate-400 font-medium shrink-0">
                        {reviewDate}
                      </span>
                    </div>

                    {/* Tags if present */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comment Body */}
                    {body ? (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-1">
                        {body}
                      </p>
                    ) : (
                      !tags.length && (
                        <p className="text-xs text-slate-400 italic">
                          Người dùng đã đánh giá {review.rating} sao mà không để lại bình luận.
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Pagination Controls ─── */}
        {reviewsData.meta.totalPages > 1 && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị trang <strong>{reviewsData.meta.page}</strong> trên{' '}
              <strong>{reviewsData.meta.totalPages}</strong> ({reviewsData.meta.total} đánh giá)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(reviewsData.meta.page - 1)}
                disabled={reviewsData.meta.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: reviewsData.meta.totalPages }, (_, idx) => idx + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === reviewsData.meta.totalPages ||
                    Math.abs(p - reviewsData.meta.page) <= 1
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  const isCurrent = p === reviewsData.meta.page;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-1 text-xs text-slate-400 font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePageChange(p)}
                        disabled={loading}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => handlePageChange(reviewsData.meta.page + 1)}
                disabled={reviewsData.meta.page >= reviewsData.meta.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
