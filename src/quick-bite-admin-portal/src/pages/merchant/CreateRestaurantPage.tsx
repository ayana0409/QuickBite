import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { merchantRequestService } from '../../services/merchantRequestService';
import { restaurantService } from '../../services/restaurantService';
import MerchantMapPicker, { type AddressInfo } from '../../components/merchant/MerchantMapPicker';
import { toast } from '../../stores/toastStore';
import type { CatalogRequest, RestaurantRegistrationPayload } from '../../types/request';
import {
  Store,
  MapPin,
  Sparkles,
  Navigation,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Compass,
  Info,
  XCircle,
} from 'lucide-react';

export default function CreateRestaurantPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Loading and request status state
  const [isCheckingInitial, setIsCheckingInitial] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationRequest, setRegistrationRequest] =
    useState<CatalogRequest<RestaurantRegistrationPayload> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [line1, setLine1] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [coords, setCoords] = useState<[number, number]>([10.776192, 106.702444]); // [lat, lng]

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isUuid = (str?: string) =>
    Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  // Check if merchant already has an approved restaurant or a pending registration request
  const checkStatus = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const ownerId = isUuid(user?.id) ? user!.id : '3a230201-0ca5-3672-0d1e-500510d2d726';

        // 1. Check if user already owns an approved active restaurant
        const existingRestaurant = await restaurantService.getRestaurantByOwner(ownerId);
        if (existingRestaurant) {
          toast.success(
            `Nhà hàng "${existingRestaurant.name}" đã được kích hoạt! Đang chuyển hướng đến bảng điều khiển...`,
            'Đã Phê Duyệt'
          );
          navigate('/merchant/dashboard', { replace: true });
          return;
        }

        // 2. Check for latest catalog registration request
        const request = await merchantRequestService.getMyRegistration();
        setRegistrationRequest(request);

        if (request) {
          const payload = request.payload as RestaurantRegistrationPayload;
          if (payload) {
            if (payload.name) setName(payload.name);
            if (payload.slug) setSlug(payload.slug);
            if (payload.address) {
              if (payload.address.line1) setLine1(payload.address.line1);
              if (payload.address.ward) setWard(payload.address.ward);
              if (payload.address.district) setDistrict(payload.address.district);
              if (payload.address.city) setCity(payload.address.city);

              const rawCoordinates = payload.address.geo?.coordinates;
              if (
                Array.isArray(rawCoordinates) &&
                rawCoordinates.length === 2 &&
                typeof rawCoordinates[0] === 'number' &&
                typeof rawCoordinates[1] === 'number'
              ) {
                // GeoJSON Point is [longitude, latitude]
                setCoords([rawCoordinates[1], rawCoordinates[0]]);
              }
            }
          }

          if (isManualRefresh) {
            if (request.status === 'APPROVED') {
              toast.success('Hồ sơ đã được phê duyệt! Đang chuyển hướng...', 'Thành công');
              navigate('/merchant/dashboard', { replace: true });
            } else if (request.status === 'PENDING') {
              toast.info('Hồ sơ của bạn đang chờ Ban Quản Trị xét duyệt.', 'Đang xử lý');
            } else if (request.status === 'REJECTED') {
              toast.warning(
                request.adminNote || 'Hồ sơ chưa đạt tiêu chuẩn. Vui lòng chỉnh sửa và nộp lại.',
                'Đơn Bị Từ Chối'
              );
            }
          }
        } else if (isManualRefresh) {
          toast.info('Bạn chưa có đơn đăng ký nào đang chờ duyệt.', 'Thông báo');
        }
      } catch (err: any) {
        console.error('[CreateRestaurantPage] Status check error:', err);
        if (isManualRefresh) {
          toast.error(err?.message || 'Không thể kiểm tra trạng thái hồ sơ lúc này.', 'Lỗi kết nối');
        }
      } finally {
        setIsCheckingInitial(false);
        if (isManualRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [user, navigate]
  );

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-generate slug from restaurant name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  // Handle map selection callback from MerchantMapPicker
  const handleMapLocationSelect = (lat: number, lng: number, addressInfo: AddressInfo) => {
    setCoords([lat, lng]);
    if (addressInfo.line1) setLine1(addressInfo.line1);
    if (addressInfo.ward) setWard(addressInfo.ward);
    if (addressInfo.district) setDistrict(addressInfo.district);
    if (addressInfo.city) setCity(addressInfo.city);
  };

  // Submit Partner Registration Request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !line1.trim() || !ward.trim() || !district.trim() || !city.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const ownerId = isUuid(user?.id) ? user!.id : '3a230201-0ca5-3672-0d1e-500510d2d726';

      const payload = {
        name: name.trim(),
        slug: slug.trim() || `quan-${Date.now()}`,
        ownerId,
        address: {
          line1: line1.trim(),
          ward: ward.trim(),
          district: district.trim(),
          city: city.trim(),
          geo: {
            type: 'Point' as const,
            coordinates: [coords[1], coords[0]] as [number, number], // [longitude, latitude]
          },
        },
      };

      const newRequest = await merchantRequestService.submitRegistration(payload);
      setRegistrationRequest(newRequest);
      setIsEditMode(false);

      toast.success(
        'Hồ sơ đăng ký nhà hàng đã được gửi thành công đến Ban Quản Trị QuickBite!',
        'Gửi Đơn Thành Công'
      );
    } catch (err: any) {
      console.error('[CreateRestaurantPage] Registration submit error:', err);
      const backendMessage =
        err.response?.data?.message || err.message || 'Không thể gửi đơn đăng ký. Vui lòng kiểm tra lại thông tin.';
      setError(Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage);
      toast.error('Gửi hồ sơ đăng ký thất bại. Vui lòng thử lại.', 'Lỗi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Construct full address preview string
  const fullAddressPreview = [line1, ward, district, city].filter(Boolean).join(', ');

  // ─── Render: Initial Loading Spinner ──────────────────────────────────────
  if (isCheckingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl shadow-lg">
          <Store className="w-9 h-9 text-emerald-400 animate-bounce" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Đang kiểm tra hồ sơ đăng ký đối tác...</span>
        </div>
      </div>
    );
  }

  // ─── Render: Case A - PENDING Request Screen ──────────────────────────────
  if (registrationRequest && registrationRequest.status === 'PENDING' && !isEditMode) {
    const payload = registrationRequest.payload as RestaurantRegistrationPayload;
    const reqCoordinates = payload?.address?.geo?.coordinates;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Hồ Sơ Đang Xét Duyệt
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-slate-700 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* Pending Status Callout Card */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500/20 via-amber-500/30 to-amber-400/20 border border-amber-500/40 rounded-2xl shadow-lg shadow-amber-500/20 mb-1">
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
              Đơn Đăng Ký Đang Chờ Phê Duyệt
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Xin chào đối tác <strong className="text-emerald-300">{user?.fullName || user?.username}</strong>! Hồ sơ
              mở nhà hàng của bạn đã được tiếp nhận và đang trong quá trình thẩm định của Ban Quản Trị QuickBite.
            </p>
          </div>

          {/* Request Information Summary */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Thông Tin Hồ Sơ Đã Nộp</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PENDING APPROVAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 block">Tên nhà hàng:</span>
                <span className="font-bold text-slate-200 text-sm">{payload?.name || 'Chưa cập nhật'}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Mã định danh (Slug):</span>
                <span className="font-mono text-cyan-300">{payload?.slug || 'N/A'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Địa chỉ đăng ký:</span>
                <span className="text-slate-300 font-medium">
                  {payload?.address
                    ? [
                        payload.address.line1,
                        payload.address.ward,
                        payload.address.district,
                        payload.address.city,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : 'N/A'}
                </span>
              </div>

              {Array.isArray(reqCoordinates) && reqCoordinates.length === 2 && (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-500">Tọa độ GPS:</span>
                  <span className="font-mono text-purple-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    [{reqCoordinates[1].toFixed(6)}, {reqCoordinates[0].toFixed(6)}]
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-500 block">Thời gian nộp đơn:</span>
                <span className="text-slate-400">
                  {registrationRequest.createdAt
                    ? new Date(registrationRequest.createdAt).toLocaleString('vi-VN')
                    : 'Vừa xong'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Mã đơn đăng ký:</span>
                <span className="font-mono text-slate-400">{registrationRequest.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Friendly Guidance Box */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed space-y-1">
              <p className="font-bold text-emerald-300">Quy trình xét duyệt tiêu chuẩn:</p>
              <p>
                Ban Quản Trị thường xét duyệt hồ sơ trong vòng 2 - 24 giờ làm việc. Ngay khi được phê duyệt, bạn sẽ có
                thể truy cập đầy đủ các chức năng quản lý thực đơn, tồn kho và tiếp nhận đơn hàng.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang kiểm tra trạng thái mới nhất...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-slate-950" />
                  <span>Kiểm Tra Lại Trạng Thái Duyệt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Case B - REJECTED Request Notice ─────────────────────────────
  const isRejected = registrationRequest && registrationRequest.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-400">Merchant Onboarding</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-slate-700 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Đăng xuất tài khoản"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Rejection Notice Banner if previously rejected */}
        {isRejected && (
          <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>Hồ sơ đăng ký trước đây của bạn đã bị từ chối</span>
            </div>
            {registrationRequest.adminNote && (
              <p className="text-slate-300 pl-7">
                <strong>Lý do từ chối:</strong> {registrationRequest.adminNote}
              </p>
            )}
            <p className="text-slate-400 pl-7">
              Bạn có thể cập nhật lại thông tin bên dưới và bấm <strong>"Gửi Lại Đơn Xét Duyệt"</strong> để Ban Quản Trị
              xem xét lại.
            </p>
          </div>
        )}

        {/* Title & Introduction */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-2">
            <Store className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Hồ Sơ Đăng Ký Mở Quán Đối Tác
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Chào mừng đối tác <strong className="text-emerald-300">{user?.fullName || user?.username}</strong>! Vui lòng
            cung cấp thông tin quán ăn và ghim vị trí chính xác trên bản đồ để nộp đơn xét duyệt mở quán.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4 bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pb-2 border-b border-slate-800">
              <Store className="w-4 h-4" />
              <span>1. Thông Tin Cơ Bản Quán Ăn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tên Quán */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> Tên Nhà Hàng / Quán Ăn *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Ví dụ: Cơm Tấm Sườn Bì Chả 88"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Slug URL */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Đường Dẫn Định Danh (Slug URL)
                  </span>
                  <span className="text-[11px] text-slate-500">Tự động tạo theo tên quán</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="com-tam-suon-bi-cha-88"
                  className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Map Picker */}
          <div className="space-y-3 bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>2. Chọn Vị Trí Nhà Hàng Trên Bản Đồ (GPS) *</span>
              </label>
              <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                Nhấp bản đồ để tự động điền địa chỉ
              </span>
            </div>

            <MerchantMapPicker position={coords} onLocationSelect={handleMapLocationSelect} />
          </div>

          {/* Section 3: Administrative Address Details */}
          <div className="space-y-4 bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pb-2 border-b border-slate-800">
              <MapPin className="w-4 h-4" />
              <span>3. Chi Tiết Địa Chỉ Hành Chính</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Số Nhà / Tên Đường */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Số Nhà, Tên Đường *
                </label>
                <input
                  type="text"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Huệ"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Phường / Xã */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Phường / Xã *</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Phường Bến Nghé"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Quận / Huyện */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Quận / Huyện *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Quận 1"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Tỉnh / Thành Phố */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300">Tỉnh / Thành Phố *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="TP. Hồ Chí Minh"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Tọa độ xác thực hiển thị */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-purple-400" /> Vĩ độ (Latitude)
                </label>
                <input
                  type="text"
                  readOnly
                  value={coords[0].toFixed(6)}
                  className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-purple-300 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-purple-400" /> Kinh độ (Longitude)
                </label>
                <input
                  type="text"
                  readOnly
                  value={coords[1].toFixed(6)}
                  className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-purple-300 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Address Preview Box */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 mt-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <span className="text-[11px] font-bold text-slate-400 block">Xem trước địa chỉ đầy đủ:</span>
                <p className="text-xs text-slate-200 font-medium">
                  {fullAddressPreview || 'Chưa có thông tin địa chỉ...'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Đang gửi hồ sơ xét duyệt...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRejected ? 'Gửi Lại Đơn Xét Duyệt Mở Quán' : 'Gửi Hồ Sơ Xét Duyệt Mở Quán'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
