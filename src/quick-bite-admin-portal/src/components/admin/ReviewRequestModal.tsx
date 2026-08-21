import React, { useState } from 'react';
import {
  X,
  Store,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  MessageSquare,
  ShieldCheck,
  Loader2,
  FileText,
  Compass,
} from 'lucide-react';
import {
  CatalogRequestStatus,
  CatalogRequestType,
  RequestAction,
} from '../../types/request';
import type {
  CatalogRequest,
  RestaurantRegistrationPayload,
  FoodReportPayload,
  SystemFeedbackPayload,
} from '../../types/request';
import { adminRequestService } from '../../services/adminRequestService';
import { toast } from '../../stores/toastStore';
import { RestaurantLocationMap } from './RestaurantLocationMap';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CatalogRequest | null;
  onSuccess: () => void;
}

export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
}) => {
  const [adminNote, setAdminNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionType, setActionType] = useState<RequestAction | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const isPending = request.status === CatalogRequestStatus.PENDING;

  const handleProcess = async (action: RequestAction) => {
    setNoteError(null);

    // Validate adminNote requirement for REJECT
    if (action === RequestAction.REJECT && !adminNote.trim()) {
      setNoteError('Vui lòng nhập lý do từ chối yêu cầu.');
      return;
    }

    setIsProcessing(true);
    setActionType(action);

    try {
      await adminRequestService.processRequest(request.id, {
        action,
        adminNote: adminNote.trim() || undefined,
      });

      toast.success(
        action === RequestAction.APPROVE
          ? 'Đã phê duyệt yêu cầu thành công! Nhà hàng mới đã được khởi tạo.'
          : 'Đã từ chối yêu cầu thành công.'
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[ReviewRequestModal] Processing failed:', error);
      const statusCode = error?.response?.status;
      if (statusCode === 403) {
        toast.error('Bạn không có quyền xử lý yêu cầu này (Missing Catalog.Requests.Process).');
      } else {
        toast.error(
          error?.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.'
        );
      }
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // Helper to render type-specific payload details
  const renderPayloadDetails = () => {
    if (request.type === CatalogRequestType.RESTAURANT_REGISTRATION) {
      const payload = request.payload as RestaurantRegistrationPayload;
      const fullAddress = [
        payload.address?.line1,
        payload.address?.ward,
        payload.address?.district,
        payload.address?.city,
      ]
        .filter(Boolean)
        .join(', ');

      return (
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Store className="w-4 h-4" />
            <span>Thông tin Nhà hàng Đăng ký</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Tên nhà hàng:</span>
              <span className="font-bold text-slate-100 text-sm">{payload.name}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Đường dẫn định danh (Slug):</span>
              <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {payload.slug}
              </span>
            </div>

            {payload.phone && (
              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại liên hệ:</span>
                <span className="font-semibold text-slate-200">{payload.phone}</span>
              </div>
            )}

            <div className="sm:col-span-2">
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                Địa chỉ kinh doanh:
              </span>
              <span className="font-medium text-slate-200 leading-relaxed">{fullAddress || 'N/A'}</span>
            </div>

            {payload.address?.geo?.coordinates &&
              typeof payload.address.geo.coordinates[0] === 'number' &&
              typeof payload.address.geo.coordinates[1] === 'number' && (
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      Tọa độ GPS (Kinh độ, Vĩ độ):
                    </span>
                    <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      [{payload.address.geo.coordinates[0].toFixed(6)}, {payload.address.geo.coordinates[1].toFixed(6)}]
                    </span>
                  </div>

                  {/* Interactive OpenStreetMap Preview */}
                  <RestaurantLocationMap
                    longitude={payload.address.geo.coordinates[0]}
                    latitude={payload.address.geo.coordinates[1]}
                    restaurantName={payload.name}
                    address={fullAddress}
                  />
                </div>
              )}
          </div>
        </div>
      );
    }

    if (request.type === CatalogRequestType.FOOD_REPORT) {
      const payload = request.payload as FoodReportPayload;
      return (
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-red-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Nội dung Báo cáo Món ăn</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Mã món ăn (Food Item ID):</span>
              <span className="font-mono text-slate-200 select-all">{payload.foodItemId}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Lý do báo cáo:</span>
              <span className="font-bold text-red-400">{payload.reason}</span>
            </div>
            {payload.description && (
              <div>
                <span className="text-slate-400 block mb-0.5">Chi tiết phản ánh:</span>
                <p className="text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                  {payload.description}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (request.type === CatalogRequestType.SYSTEM_FEEDBACK) {
      const payload = request.payload as SystemFeedbackPayload;
      return (
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            <span>Nội dung Góp ý Hệ thống</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Tiêu đề:</span>
              <span className="font-bold text-slate-100 text-sm">{payload.subject}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Nội dung chi tiết:</span>
              <p className="text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                {payload.content}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Raw JSON fallback
    return (
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <span className="text-slate-400 block text-xs font-bold mb-2">Dữ liệu Payload:</span>
        <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-3 rounded-xl overflow-x-auto max-h-48">
          {JSON.stringify(request.payload, null, 2)}
        </pre>
      </div>
    );
  };

  const getStatusBadge = (status: CatalogRequestStatus) => {
    switch (status) {
      case CatalogRequestStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ duyệt (PENDING)</span>
          </span>
        );
      case CatalogRequestStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã phê duyệt (APPROVED)</span>
          </span>
        );
      case CatalogRequestStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã từ chối (REJECTED)</span>
          </span>
        );
      case CatalogRequestStatus.RESOLVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Đã giải quyết (RESOLVED)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100">Chi Tiết & Xử Lý Yêu Cầu</h3>
              <p className="text-xs text-slate-400 font-mono">ID: {request.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Loại yêu cầu:</span>
              <span className="font-bold text-slate-200">{request.type}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Trạng thái:</span>
              <div>{getStatusBadge(request.status)}</div>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Thời gian gửi:</span>
              <span className="text-slate-300 font-medium">
                {new Date(request.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-800/60 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Mã người gửi (User ID):</span>
              <span className="font-mono text-slate-300 font-bold select-all">{request.userId}</span>
            </div>
          </div>

          {/* Type-specific Payload details */}
          {renderPayloadDetails()}

          {/* Readonly Section for already processed requests */}
          {!isPending && (
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Người xử lý (Admin ID):</span>
                <span className="font-mono text-slate-300 font-bold">{request.processedBy || 'Hệ thống'}</span>
              </div>
              {request.adminNote && (
                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Ghi chú của Quản trị viên:</span>
                  <p className="text-slate-200 bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed font-medium">
                    {request.adminNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form Action Section for PENDING requests */}
          {isPending && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ghi chú của Quản trị viên (Admin Note)
                  <span className="text-slate-500 font-normal ml-1">
                    (Bắt buộc khi từ chối, Tùy chọn khi duyệt)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => {
                    setAdminNote(e.target.value);
                    if (noteError) setNoteError(null);
                  }}
                  placeholder="Nhập phản hồi hoặc lý do xét duyệt gửi đến đối tác..."
                  className={`w-full p-3 bg-slate-950 border rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    noteError
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500/20'
                  }`}
                />
                {noteError && (
                  <p className="mt-1 text-xs text-red-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {noteError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            Đóng
          </button>

          {isPending && (
            <>
              {/* Reject Button */}
              <button
                type="button"
                onClick={() => handleProcess(RequestAction.REJECT)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isProcessing && actionType === RequestAction.REJECT ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Từ Chối Hồ Sơ</span>
              </button>

              {/* Approve Button */}
              <button
                type="button"
                onClick={() => handleProcess(RequestAction.APPROVE)}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isProcessing && actionType === RequestAction.APPROVE ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                )}
                <span>Phê Duyệt & Mở Quán</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
