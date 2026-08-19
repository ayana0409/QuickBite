'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Star,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Store,
  Send,
  MessageSquare,
  ThumbsUp,
  Heart,
} from 'lucide-react';
import { OrderDto } from '@/src/types/order.type';
import { getOrderById } from '@/src/lib/api/order';
import { checkOrderReviewed, submitBatchReviews, ReviewItemDto } from '@/src/lib/api/review';
import { useToast } from '@/src/components/shared/ToastProvider';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

interface ItemReviewState {
  foodItemId: string;
  foodName: string;
  rating: number;
  hoverRating: number;
  comment: string;
  selectedTags: string[];
}

const RATING_LABELS: Record<number, { text: string; color: string; desc: string }> = {
  1: { text: 'Rất tệ', color: 'text-red-500', desc: 'Không hài lòng chút nào' },
  2: { text: 'Chưa ngon', color: 'text-orange-500', desc: 'Cần cải thiện nhiều' },
  3: { text: 'Bình thường', color: 'text-amber-500', desc: 'Hương vị ổn' },
  4: { text: 'Ngon miệng', color: 'text-lime-600', desc: 'Hài lòng với món ăn' },
  5: { text: 'Tuyệt vời!', color: 'text-amber-500', desc: 'Cực kỳ thơm ngon & chuẩn vị' },
};

const SUGGESTED_TAGS = [
  'Món ăn nóng hổi',
  'Đậm đà chuẩn vị',
  'Đóng gói cẩn thận',
  'Phần ăn đầy đặn',
  'Giao nhanh chóng',
  'Đúng yêu cầu ghi chú',
];

export default function OrderReviewPage({ params }: PageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { success, error: toastError } = useToast();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewed, setIsReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Record<string, ItemReviewState>>({});

  useEffect(() => {
    const initData = async () => {
      if (authStatus === 'loading') return;

      setLoading(true);
      try {
        const [orderData, alreadyReviewed] = await Promise.all([
          getOrderById(orderId),
          checkOrderReviewed(orderId),
        ]);

        if (!orderData) {
          throw new Error('Không tìm thấy thông tin đơn hàng');
        }

        setOrder(orderData);
        setIsReviewed(alreadyReviewed);

        // Initialize review state for each item (default 5 stars)
        const initialReviews: Record<string, ItemReviewState> = {};
        orderData.items?.forEach((item) => {
          initialReviews[item.foodItemId] = {
            foodItemId: item.foodItemId,
            foodName: item.foodName || 'Món ăn',
            rating: 5,
            hoverRating: 0,
            comment: '',
            selectedTags: [],
          };
        });
        setReviews(initialReviews);
      } catch (err: any) {
        console.error('Init review error:', err);
        toastError(err.message || 'Không thể tải thông tin đánh giá');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [orderId, authStatus]);

  const handleRatingChange = (foodItemId: string, rating: number) => {
    setReviews((prev) => ({
      ...prev,
      [foodItemId]: {
        ...prev[foodItemId],
        rating,
      },
    }));
  };

  const handleHoverRatingChange = (foodItemId: string, hoverRating: number) => {
    setReviews((prev) => ({
      ...prev,
      [foodItemId]: {
        ...prev[foodItemId],
        hoverRating,
      },
    }));
  };

  const handleCommentChange = (foodItemId: string, comment: string) => {
    setReviews((prev) => ({
      ...prev,
      [foodItemId]: {
        ...prev[foodItemId],
        comment,
      },
    }));
  };

  const handleToggleTag = (foodItemId: string, tag: string) => {
    setReviews((prev) => {
      const current = prev[foodItemId];
      const isSelected = current.selectedTags.includes(tag);
      const newTags = isSelected
        ? current.selectedTags.filter((t) => t !== tag)
        : [...current.selectedTags, tag];

      return {
        ...prev,
        [foodItemId]: {
          ...current,
          selectedTags: newTags,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (isReviewed) {
      toastError('Đơn hàng này đã được đánh giá trước đó!');
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload: ReviewItemDto[] = Object.values(reviews).map((r) => {
        const fullComment = [
          r.selectedTags.length > 0 ? `[${r.selectedTags.join(', ')}]` : '',
          r.comment.trim(),
        ]
          .filter(Boolean)
          .join(' ');

        return {
          foodItemId: r.foodItemId,
          rating: r.rating,
          comment: fullComment || undefined,
        };
      });

      const res = await submitBatchReviews({
        orderId: order.id,
        restaurantId: order.restaurantId,
        items: itemsPayload,
      });

      if (res.success) {
        success('Cảm ơn bạn đã gửi đánh giá! Chúc bạn ngon miệng.');
        setIsReviewed(true);
        router.push(`/order/${order.id}`);
      } else {
        toastError(res.message || 'Không thể gửi đánh giá. Vui lòng thử lại!');
      }
    } catch (err: any) {
      console.error('Submit review error:', err);
      toastError('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-[#fdfbf7]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Đang tải trang đánh giá...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-sm text-slate-500 mb-6">
          Đơn hàng không tồn tại hoặc bạn chưa có quyền đánh giá đơn này.
        </p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Lịch sử đơn hàng</span>
        </Link>
      </div>
    );
  }

  const statusLower = (order.status || '').toLowerCase().trim();
  const isDelivered = statusLower === 'delivered' || statusLower === 'completed';

  // If order is not completed or delivered yet
  if (!isDelivered) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Đơn hàng chưa hoàn thành</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          Bạn chỉ có thể đánh giá sau khi đã nhận được món ăn từ tài xế hoặc nhà hàng.
        </p>
        <Link
          href={`/order/${order.id}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm rounded-full shadow-md shadow-orange-500/25"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại chi tiết đơn hàng</span>
        </Link>
      </div>
    );
  }

  // If order is already reviewed
  if (isReviewed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Đơn hàng đã được đánh giá</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận vào hệ thống để giúp quán nâng cao chất lượng phục vụ.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/order/${order.id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-full shadow-2xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Xem chi tiết đơn hàng</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm rounded-full shadow-md shadow-orange-500/25"
          >
            <span>Khám phá món ngon</span>
          </Link>
        </div>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/order/${order.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chi tiết đơn #{order.orderCode || order.id.slice(0, 8)}</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-700">Đánh giá món ăn</span>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100/90 shadow-sm mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-400/15 via-orange-400/10 to-transparent rounded-full -translate-y-12 translate-x-12 pointer-events-none" />

          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Đánh giá chất lượng món ăn
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã đơn: <strong className="text-slate-800 font-mono">#{order.orderCode || order.id}</strong> • {items.length} món ăn
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
            Ý kiến của bạn là động lực rất lớn giúp nhà hàng cải thiện hương vị và chất lượng phục vụ mỗi ngày.
          </p>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {items.map((item, index) => {
            const itemReview = reviews[item.foodItemId] || {
              rating: 5,
              hoverRating: 0,
              comment: '',
              selectedTags: [],
            };
            const currentRating = itemReview.hoverRating || itemReview.rating || 5;
            const ratingMeta = RATING_LABELS[currentRating] || RATING_LABELS[5];

            return (
              <div
                key={item.foodItemId || index}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-orange-100 shadow-xs hover:border-orange-200 transition-all"
              >
                {/* Item Details Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {item.foodName || 'Món ăn'}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.selectedVariantName && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                          {item.selectedVariantName}
                        </span>
                      )}
                      {item.selectedToppings?.map((topping, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                        >
                          +{topping}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0">
                    SL: {item.quantity}
                  </span>
                </div>

                {/* Rating Interactive Stars */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Chất lượng món ăn
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isFilled = starVal <= (itemReview.hoverRating || itemReview.rating);
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => handleRatingChange(item.foodItemId, starVal)}
                            onMouseEnter={() => handleHoverRatingChange(item.foodItemId, starVal)}
                            onMouseLeave={() => handleHoverRatingChange(item.foodItemId, 0)}
                            className="p-1 hover:scale-125 transition-transform duration-150 cursor-pointer focus:outline-none"
                            title={`${starVal} sao - ${RATING_LABELS[starVal]?.text}`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                isFilled
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className={`text-base font-black ${ratingMeta.color}`}>
                      {ratingMeta.text}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{ratingMeta.desc}</p>
                  </div>
                </div>

                {/* Suggested Quick Tags */}
                <div className="pt-4 pb-3">
                  <span className="text-xs font-bold text-slate-500 block mb-2">
                    Điểm nổi bật của món:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_TAGS.map((tag) => {
                      const isSelected = itemReview.selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(item.foodItemId, tag)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                          }`}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Comment Input */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">
                    Nhận xét chi tiết (tuỳ chọn):
                  </label>
                  <textarea
                    rows={2}
                    value={itemReview.comment}
                    onChange={(e) => handleCommentChange(item.foodItemId, e.target.value)}
                    placeholder="Hãy chia sẻ thêm cảm nhận của bạn về hương vị, độ tươi ngon, độ nóng sốt..."
                    maxLength={500}
                    className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all resize-none text-slate-800"
                  />
                  <div className="flex justify-end mt-1 text-[11px] text-slate-400">
                    {itemReview.comment.length}/500 ký tự
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action Submit Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-orange-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              Đánh giá của bạn sẽ được hiển thị công khai trên trang món ăn và trang quán.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href={`/order/${order.id}`}
                className="flex-1 sm:flex-none text-center px-5 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Để sau
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi đánh giá...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi đánh giá</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
