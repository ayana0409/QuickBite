import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Store,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  CatalogRequestStatus,
  CatalogRequestType,
} from '../../types/request';
import type {
  CatalogRequest,
  RequestPaginationMeta,
  RestaurantRegistrationPayload,
  FoodReportPayload,
  SystemFeedbackPayload,
} from '../../types/request';
import { adminRequestService } from '../../services/adminRequestService';
import { ReviewRequestModal } from '../../components/admin/ReviewRequestModal';
import Pagination from '../../components/common/Pagination';
import { toast } from '../../stores/toastStore';

export const RequestsPage = () => {
  const [requests, setRequests] = useState<CatalogRequest[]>([]);
  const [meta, setMeta] = useState<RequestPaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Filter States (Default status is PENDING as requested)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<CatalogRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRequests = useCallback(
    async (page = 1, status = statusFilter, type = typeFilter, search = searchTerm) => {
      setIsLoading(true);
      setPermissionDenied(false);

      try {
        const queryParams = {
          page,
          limit: 10,
          status: status === 'ALL' ? undefined : status || undefined,
          type: type === 'ALL' ? undefined : type || undefined,
          search: search.trim() || undefined,
        };

        const res = await adminRequestService.getRequests(queryParams);
        setRequests(res.data || []);
        setMeta(
          res.meta || {
            total: res.data?.length || 0,
            page,
            limit: 10,
            totalPages: Math.ceil((res.data?.length || 0) / 10),
          }
        );
      } catch (error: any) {
        console.error('[RequestsPage] Failed to fetch requests:', error);
        if (error?.response?.status === 403) {
          setPermissionDenied(true);
          toast.error('Bạn không có quyền xem danh sách yêu cầu (Thiếu Catalog.Requests.View).');
        } else {
          toast.error('Không thể tải danh sách yêu cầu. Vui lòng thử lại sau.');
        }
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, typeFilter, searchTerm]
  );

  useEffect(() => {
    fetchRequests(1, statusFilter, typeFilter, searchTerm);
  }, [fetchRequests, statusFilter, typeFilter]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchRequests(1, statusFilter, typeFilter, term);
    }, 500);
  };

  const handleOpenReview = (request: CatalogRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchRequests(meta.page, statusFilter, typeFilter, searchTerm);
  };

  // Helper to render type badge with icons
  const renderTypeBadge = (type: CatalogRequestType) => {
    switch (type) {
      case CatalogRequestType.RESTAURANT_REGISTRATION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Store className="w-3 h-3 text-amber-400" />
            <span>Đăng ký mở quán</span>
          </span>
        );
      case CatalogRequestType.FOOD_REPORT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>Báo cáo món ăn</span>
          </span>
        );
      case CatalogRequestType.SYSTEM_FEEDBACK:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MessageSquare className="w-3 h-3 text-cyan-400" />
            <span>Góp ý hệ thống</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  // Helper to render status badge
  const renderStatusBadge = (status: CatalogRequestStatus) => {
    switch (status) {
      case CatalogRequestStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Chờ duyệt</span>
          </span>
        );
      case CatalogRequestStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đã duyệt</span>
          </span>
        );
      case CatalogRequestStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Từ chối</span>
          </span>
        );
      case CatalogRequestStatus.RESOLVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Đã giải quyết</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  // Helper to render summary of payload
  const renderPayloadSummary = (request: CatalogRequest) => {
    if (request.type === CatalogRequestType.RESTAURANT_REGISTRATION) {
      const payload = request.payload as RestaurantRegistrationPayload;
      return (
        <div>
          <span className="font-bold text-slate-100 block truncate max-w-xs sm:max-w-sm">
            {payload?.name || 'Chưa đặt tên'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono block truncate max-w-xs">
            {payload?.address?.city || ''}
          </span>
        </div>
      );
    }

    if (request.type === CatalogRequestType.FOOD_REPORT) {
      const payload = request.payload as FoodReportPayload;
      return (
        <div>
          <span className="font-bold text-red-300 block truncate max-w-xs">
            {payload?.reason || 'Phản ánh món ăn'}
          </span>
          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
            {payload?.description || payload?.foodItemId || ''}
          </span>
        </div>
      );
    }

    if (request.type === CatalogRequestType.SYSTEM_FEEDBACK) {
      const payload = request.payload as SystemFeedbackPayload;
      return (
        <div>
          <span className="font-bold text-cyan-300 block truncate max-w-xs">
            {payload?.subject || 'Góp ý hệ thống'}
          </span>
          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
            {payload?.content || ''}
          </span>
        </div>
      );
    }

    return <span className="text-slate-400 text-xs">Yêu cầu hệ thống</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Inbox className="w-4 h-4" />
            <span>Hệ Thống Phê Duyệt & Tiếp Nhận Yêu Cầu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Trung Tâm Xử Lý Yêu Cầu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Xét duyệt hồ sơ đăng ký mở quán của đối tác, xử lý báo cáo món ăn và phản hồi của người dùng.
          </p>
        </div>

        <button
          onClick={() => fetchRequests(meta.page, statusFilter, typeFilter, searchTerm)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Permission Denied Banner (Safe UI, no crash/redirect) */}
      {permissionDenied && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Không Có Quyền Xem Yêu Cầu</p>
            <p className="text-slate-300 text-xs mt-0.5">
              Tài khoản của bạn chưa được phân quyền <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">Catalog.Requests.View</code>. Vui lòng liên hệ Quản trị viên cấp cao để được cấp quyền.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-1 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên quán, ID người gửi, ghi chú..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              <option value="PENDING">Chờ duyệt (Mặc định)</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="ALL">Tất cả trạng thái</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Filter Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              <option value="">Tất cả loại yêu cầu</option>
              <option value={CatalogRequestType.RESTAURANT_REGISTRATION}>Đăng ký mở quán</option>
              <option value={CatalogRequestType.FOOD_REPORT}>Báo cáo món ăn</option>
              <option value={CatalogRequestType.SYSTEM_FEEDBACK}>Góp ý hệ thống</option>
            </select>
            <FileText className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3.5">Mã Yêu Cầu</th>
                <th className="px-4 py-3.5">Loại Yêu Cầu</th>
                <th className="px-4 py-3.5">Nội Dung / Tên Quán</th>
                <th className="px-4 py-3.5">Người Gửi (User ID)</th>
                <th className="px-4 py-3.5">Ngày Tạo</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                <th className="px-4 py-3.5 text-right">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
                    <p className="font-semibold text-xs">Đang tải danh sách yêu cầu từ Catalog Service...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500 space-y-2">
                    <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-1" />
                    <p className="font-bold text-slate-300 text-sm">Không tìm thấy yêu cầu nào</p>
                    <p className="text-xs text-slate-500">
                      Không có yêu cầu phù hợp với bộ lọc hiện tại.
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenReview(row)}
                  >
                    {/* ID */}
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                        {row.id.substring(0, 8)}...
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">{renderTypeBadge(row.type)}</td>

                    {/* Payload Summary */}
                    <td className="px-4 py-3.5">{renderPayloadSummary(row)}</td>

                    {/* Sender */}
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      <span title={row.userId} className="truncate block max-w-[120px]">
                        {row.userId}
                      </span>
                    </td>

                    {/* CreatedAt */}
                    <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{renderStatusBadge(row.status)}</td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenReview(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem & Xử lý</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={meta.limit}
          onPageChange={(page) => fetchRequests(page, statusFilter, typeFilter, searchTerm)}
          itemLabel="yêu cầu"
          accentColor="amber"
          className="border-t border-slate-800 rounded-t-none bg-slate-950/60"
        />
      </div>

      {/* Review & Process Modal */}
      <ReviewRequestModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
