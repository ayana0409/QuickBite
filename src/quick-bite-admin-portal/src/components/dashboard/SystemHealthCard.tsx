import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock,
} from 'lucide-react';
import {
  adminDashboardService,
  type SystemHealthResponse,
} from '../../services/adminDashboardService';

export const SystemHealthCard: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState<number>(30);

  // Fetch health check data from API Gateway
  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setError(null);

    try {
      const data = await adminDashboardService.getSystemHealth();
      setHealthData(data);
      setLastCheckedTime(new Date());
      setCountdown(30);
    } catch (err: any) {
      console.warn('System Health check failed:', err.message);
      setError('Mất kết nối đến Gateway');
      setHealthData(null);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Polling every 30 seconds
  useEffect(() => {
    fetchHealth();

    // 30s interval for API call
    const pollInterval = setInterval(() => {
      fetchHealth();
    }, 30000);

    // 1s interval for countdown UI timer
    const countInterval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(countInterval);
    };
  }, [fetchHealth]);

  const isHealthy =
    !error &&
    healthData &&
    (healthData.status === 'Healthy' || healthData.status === 'UP');
  const isDegraded =
    !error && healthData && healthData.status === 'Degraded';

  // Helper icons for service entries
  const getEntryIcon = (key: string) => {
    if (key.includes('redis') || key.includes('mongo')) return Database;
    if (key.includes('resource') || key.includes('memory')) return Cpu;
    return Server;
  };

  const formatServiceName = (key: string) => {
    const map: Record<string, string> = {
      identity_service: 'Identity Service (.NET 10 / ABP / PostgreSQL)',
      order_service: 'Order Service (.NET 10 / ABP / MySQL)',
      catalog_service: 'Catalog Service (NestJS 11 / PostgreSQL)',
      inventory_service: 'Inventory Service (Spring Boot 3.3 / PostgreSQL)',
      payment_service: 'Payment Service (Spring Boot 3.3 / PostgreSQL)',
      system_resources: 'Gateway Memory & Node.js (NestJS 11)',
      redis: 'Redis Distributed Cache',
      mongodb: 'MongoDB Dynamic Config',
    };
    return map[key] || key.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Trạng thái API Gateway & Microservices
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Giám sát tình trạng sức khỏe kết nối toàn hệ thống (Tự động cập nhật mỗi 30s)
              </p>
            </div>
          </div>
        </div>

        {/* Action & Auto-polling status */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Làm mới sau: <strong className="text-amber-400 font-bold">{countdown}s</strong></span>
          </div>

          <button
            onClick={() => fetchHealth(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 disabled:opacity-50 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 transition"
            title="Kiểm tra trạng thái ngay lập tức"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Kiểm tra ngay</span>
          </button>
        </div>
      </div>

      {/* Main Overall Status Indicator */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isHealthy
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : isDegraded
            ? 'bg-amber-950/20 border-amber-500/30'
            : 'bg-rose-950/20 border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Status Icon & Pulse Animation */}
            <div className="relative">
              {isHealthy ? (
                <>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                  </span>
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </>
              ) : isDegraded ? (
                <>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                  </span>
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </>
              ) : (
                <>
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 animate-pulse" />
                  </span>
                  <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                    <XCircle className="w-6 h-6" />
                  </div>
                </>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-slate-100">
                  {isHealthy
                    ? 'Hệ thống đang hoạt động ổn định'
                    : isDegraded
                    ? 'Một số dịch vụ đang khởi động'
                    : 'Mất kết nối đến Gateway'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase border ${
                    isHealthy
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : isDegraded
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {healthData?.status || (error ? 'OFFLINE' : 'CHECKING')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isHealthy
                  ? `Tất cả các tuyến API Gateway và cụm Microservices phản hồi trong ${healthData?.total_duration_ms ?? 0}ms.`
                  : isDegraded
                  ? 'Một số container đang thức dậy từ chế độ ngủ (Render cold start) hoặc phản hồi chậm.'
                  : 'Không thể kết nối đến máy chủ Gateway. Vui lòng kiểm tra lại mạng hoặc trạng thái server.'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 font-mono shrink-0">
            <p>Kiểm tra lần cuối: <span className="text-slate-200 font-bold">{lastCheckedTime.toLocaleTimeString('vi-VN')}</span></p>
            {healthData?.timestamp && (
              <p className="text-[11px] text-slate-500 mt-0.5">{new Date(healthData.timestamp).toLocaleDateString('vi-VN')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Microservices Diagnostic Entries Grid */}
      {healthData?.entries && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chi tiết từng Microservice & Hạ tầng
            </h4>
            <span className="text-[11px] text-slate-500">
              {Object.keys(healthData.entries).length} thành phần được giám sát
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(healthData.entries).map(([key, entry]) => {
              const ServiceIcon = getEntryIcon(key);
              const isEntryHealthy = entry.status === 'Healthy';
              const isEntryDegraded = entry.status === 'Degraded';

              return (
                <div
                  key={key}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 flex items-start justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isEntryHealthy
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isEntryDegraded
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <ServiceIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {formatServiceName(key)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {entry.description || 'Hoạt động bình thường'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isEntryHealthy
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : isEntryDegraded
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      {entry.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">
                      {entry.duration_ms}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
