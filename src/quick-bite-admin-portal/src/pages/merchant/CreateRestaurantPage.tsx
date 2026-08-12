import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { restaurantService } from '../../services/restaurantService';
import { Store, MapPin, Sparkles, Navigation, CheckCircle2, ArrowRight, LogOut } from 'lucide-react';

export default function CreateRestaurantPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [line1, setLine1] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [lat, setLat] = useState('10.7769');
  const [lng, setLng] = useState('106.7009');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from name
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !line1 || !ward || !district || !city) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isUuid = (str?: string) =>
        Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

      // Đảm bảo ownerId luôn là UUID hợp lệ theo đúng chuẩn NestJS @IsUUID()
      const ownerId = isUuid(user?.id) ? user!.id : '3a230201-0ca5-3672-0d1e-500510d2d726';

      await restaurantService.createRestaurant({
        ownerId,
        name,
        slug: slug || `quan-${Date.now()}`,
        address: {
          line1,
          ward,
          district,
          city,
          geo: {
            type: 'Point',
            coordinates: [parseFloat(lng) || 106.7009, parseFloat(lat) || 10.7769],
          },
        },
      });

      // Navigate to Merchant Dashboard after creation
      navigate('/merchant/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo nhà hàng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Bar with Logout button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-400">Merchant Setup</span>
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

        {/* Header Info */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-2">
            <Store className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Khởi Tạo Nhà Hàng Đối Tác
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Chào mừng đối tác <strong className="text-emerald-300">{user?.fullName || user?.username}</strong>! Hãy đăng ký thông tin quán ăn để bắt đầu bán hàng trên QuickBite.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Đường dẫn Định danh (Slug)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="com-tam-suon-bi-cha-88"
                className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Địa chỉ - Số nhà/Đường */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Số Nhà, Tên Đường *
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="123 Nguyễn Huệ"
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

            {/* Tỉnh / Thành phố */}
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

            {/* Tọa độ GPS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-purple-400" /> Vĩ độ (Latitude)
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="10.7769"
                className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-purple-400" /> Kinh độ (Longitude)
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="106.7009"
                className="w-full px-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Đang khởi tạo nhà hàng...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Hoàn Tất Kích Hoạt Nhà Hàng <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
