import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  RefreshCw,
  ShoppingBag,
  BookOpen,
  Package,
  CreditCard,
  Timer,
  Save,
  Loader2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Server,
  Zap,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { systemConfigService } from '../../services/systemConfigService';
import { toast } from '../../stores/toastStore';

/**
 * Service Endpoints configuration keys
 */
export const SERVICE_ENDPOINT_KEYS = [
  'IDENTITY_URL',
  'ORDER_URL',
  'CATALOG_URL',
  'INVENTORY_URL',
  'PAYMENT_URL',
] as const;

/**
 * System Performance & Rate Limiting configuration keys
 */
export const SYSTEM_PERFORMANCE_KEYS = [
  'RATE_LIMIT_TTL',
  'RATE_LIMIT_MAX',
] as const;

/**
 * All managed system configuration keys
 */
export const CONFIG_KEYS = [
  ...SERVICE_ENDPOINT_KEYS,
  ...SYSTEM_PERFORMANCE_KEYS,
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];
export type ConfigCategory = 'all' | 'service_endpoints' | 'system_performance';

interface ConfigMetadata {
  category: 'service_endpoints' | 'system_performance';
  label: string;
  description: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'url' | 'number' | 'text';
  unit?: string;
}

const CONFIG_METADATA: Record<string, ConfigMetadata> = {
  IDENTITY_URL: {
    category: 'service_endpoints',
    label: 'Identity & Auth Service Endpoint',
    description: 'API endpoint for User Authentication, Token generation, and ABP Identity.',
    placeholder: 'https://quick-bite-identity.onrender.com',
    icon: ShieldCheck,
    type: 'url',
  },
  ORDER_URL: {
    category: 'service_endpoints',
    label: 'Order Microservice Endpoint',
    description: 'API endpoint for Order Management, Cart, and Checkout operations (.NET ABP).',
    placeholder: 'https://quick-bite-order.onrender.com/api/app',
    icon: ShoppingBag,
    type: 'url',
  },
  CATALOG_URL: {
    category: 'service_endpoints',
    label: 'Catalog & Restaurant Endpoint',
    description: 'API endpoint for Menus, Food Items, Categories, and Restaurants (NestJS).',
    placeholder: 'https://quick-bite-catalog.onrender.com',
    icon: BookOpen,
    type: 'url',
  },
  INVENTORY_URL: {
    category: 'service_endpoints',
    label: 'Inventory & Stock Endpoint',
    description: 'API endpoint for Stock tracking and Item reservations (Spring Boot).',
    placeholder: 'https://quick-bite-inventory.onrender.com/api/v1',
    icon: Package,
    type: 'url',
  },
  PAYMENT_URL: {
    category: 'service_endpoints',
    label: 'Payment Gateway Endpoint',
    description: 'API endpoint for VNPay / MoMo Transactions and Webhooks (Go).',
    placeholder: 'https://quick-bite-payment.onrender.com/v1',
    icon: CreditCard,
    type: 'url',
  },
  RATE_LIMIT_TTL: {
    category: 'system_performance',
    label: 'Rate Limiting Window TTL',
    description: 'Time-to-live window in milliseconds for API Gateway Throttling.',
    placeholder: '60000',
    icon: Timer,
    type: 'number',
    unit: 'ms',
  },
  RATE_LIMIT_MAX: {
    category: 'system_performance',
    label: 'Max Requests per TTL Window',
    description: 'Maximum number of requests permitted per client IP within the TTL window.',
    placeholder: '100',
    icon: Activity,
    type: 'number',
    unit: 'requests',
  },
};

export const SystemConfig: React.FC = () => {
  // State storing key-value pairs of system configuration
  const [configs, setConfigs] = useState<Record<string, string>>({});
  // Original configs state to detect modified rows
  const [initialConfigs, setInitialConfigs] = useState<Record<string, string>>({});
  // Overall initial loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Per-row updating key identifier
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  // Active category filter tab
  const [activeTab, setActiveTab] = useState<ConfigCategory>('all');
  // Timestamp of last successful fetch
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  /**
   * Fetch all configurations concurrently using Promise.all
   */
  const fetchAllConfigs = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    try {
      // Execute GET /config/{key} in parallel for all keys
      const results = await Promise.all(
        CONFIG_KEYS.map(async (key) => {
          const value = await systemConfigService.getConfig(key);
          return [key, value] as [string, string];
        })
      );

      const configMap = Object.fromEntries(results);
      setConfigs(configMap);
      setInitialConfigs(configMap);
      setLastFetchedAt(new Date());
    } catch (error) {
      console.error('Failed to load system configurations:', error);
      toast.error('Không thể tải danh sách cấu hình hệ thống. Vui lòng kiểm tra lại kết nối.', 'Lỗi Tải Cấu Hình');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllConfigs();
  }, [fetchAllConfigs]);

  /**
   * Handle text input change for a specific config key
   */
  const handleInputChange = (key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Submit updated configuration for a single key
   */
  const handleUpdate = async (key: string, newValue: string) => {
    const trimmedValue = newValue.trim();
    if (!trimmedValue) {
      toast.warning(`Giá trị của biến ${key} không được để trống.`, 'Cảnh báo');
      return;
    }

    setUpdatingKey(key);
    try {
      await systemConfigService.updateConfig(key, trimmedValue);
      setInitialConfigs((prev) => ({
        ...prev,
        [key]: trimmedValue,
      }));
      toast.success(`Đã cập nhật ${key} thành công!`, 'Lưu Thành Công');
    } catch (error: any) {
      console.error(`Failed to update config for ${key}:`, error);
      // axiosClient response interceptor will automatically display user-friendly error toast
    } finally {
      setUpdatingKey(null);
    }
  };

  /**
   * Render individual configuration item row
   */
  const renderConfigRow = (key: string) => {
    const metadata = CONFIG_METADATA[key] || {
      category: 'service_endpoints',
      label: key,
      description: `Quản lý biến cấu hình ${key}`,
      placeholder: '',
      icon: HelpCircle,
      type: 'text',
    };
    const Icon = metadata.icon;
    const currentValue = configs[key] ?? '';
    const initialValue = initialConfigs[key] ?? '';
    const isModified = currentValue !== initialValue;
    const isUpdatingThis = updatingKey === key;

    return (
      <div
        key={key}
        className={`bg-slate-950/60 border transition-all duration-200 rounded-2xl p-4 sm:p-5 space-y-3 ${
          isModified
            ? 'border-amber-500/50 bg-amber-950/10 ring-1 ring-amber-500/30'
            : 'border-slate-800/80 hover:border-slate-700/80'
        }`}
      >
        {/* Header of the row: Icon, Name, Env Badge, Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 text-amber-400 border border-slate-700/60 shrink-0 shadow-sm">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Label / Key Name (Monospace Badge) */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-800 text-amber-300 font-mono text-xs font-bold border border-slate-700 shadow-sm tracking-wide">
                  {key}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {metadata.label}
                </span>
                {metadata.unit && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono border border-slate-800">
                    {metadata.unit}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metadata.description}
              </p>
            </div>
          </div>

          {/* Status indicator badge */}
          <div className="self-end sm:self-center">
            {isModified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 animate-pulse">
                <AlertCircle className="w-3 h-3" /> Chưa lưu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Đã đồng bộ
              </span>
            )}
          </div>
        </div>

        {/* Input field and Update button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* 2. Input text for config value */}
          <div className="relative flex-1">
            <input
              id={`config-input-${key}`}
              type={metadata.type === 'number' ? 'number' : 'text'}
              value={currentValue}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={metadata.placeholder}
              disabled={isUpdatingThis}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
          </div>

          {/* 3. Update Button */}
          <button
            id={`config-update-btn-${key}`}
            type="button"
            onClick={() => handleUpdate(key, currentValue)}
            disabled={isUpdatingThis || updatingKey !== null}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shrink-0 ${
              isModified
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isUpdatingThis ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Cập nhật</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render skeleton placeholder rows
   */
  const renderSkeletonSection = (count: number) => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`skeleton-${idx}`}
          className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800" />
              <div className="space-y-1.5">
                <div className="w-40 h-4 bg-slate-800 rounded" />
                <div className="w-64 h-3 bg-slate-800/60 rounded hidden sm:block" />
              </div>
            </div>
            <div className="w-24 h-5 bg-slate-800 rounded" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <div className="flex-1 h-11 bg-slate-800/80 rounded-xl" />
            <div className="w-28 h-11 bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-amber-400" />
                Dynamic Routing & System Performance
              </span>
              {lastFetchedAt && (
                <span className="text-[11px] text-slate-400">
                  Cập nhật: {lastFetchedAt.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-amber-400" />
              Cấu hình Hệ thống (System Variables)
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý và cập nhật Per-Key Configuration cho API Gateway trong thời gian thực (Service Endpoints & System Performance).
            </p>
          </div>

          {/* Action Button: Refresh all configs */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={() => fetchAllConfigs(false)}
              disabled={isLoading || updatingKey !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 hover:border-slate-600 transition shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
              title="Tải lại toàn bộ biến cấu hình từ API Gateway"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoading ? 'Đang tải...' : 'Làm mới tất cả'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tất cả ({CONFIG_KEYS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('service_endpoints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'service_endpoints'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Service Endpoints ({SERVICE_ENDPOINT_KEYS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system_performance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'system_performance'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>System Performance ({SYSTEM_PERFORMANCE_KEYS.length})</span>
        </button>
      </div>

      {/* Group 1: Service Endpoints */}
      {(activeTab === 'all' || activeTab === 'service_endpoints') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">
                  1. Service Endpoints (Microservices Routing)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Định tuyến động các Microservices trong cụm kiến trúc QuickBite
                </p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-blue-300 font-semibold border border-slate-700">
              {SERVICE_ENDPOINT_KEYS.length} Endpoints
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              renderSkeletonSection(SERVICE_ENDPOINT_KEYS.length)
            ) : (
              <div className="space-y-4">
                {SERVICE_ENDPOINT_KEYS.map((key) => renderConfigRow(key))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group 2: System Performance & Rate Limiting */}
      {(activeTab === 'all' || activeTab === 'system_performance') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">
                  2. System Performance (Throttling & Rate Limiting)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Cấu hình bảo vệ tài nguyên, cửa sổ thời gian (TTL) và giới hạn request tối đa
                </p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-semibold border border-slate-700">
              {SYSTEM_PERFORMANCE_KEYS.length} Tham số
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              renderSkeletonSection(SYSTEM_PERFORMANCE_KEYS.length)
            ) : (
              <div className="space-y-4">
                {SYSTEM_PERFORMANCE_KEYS.map((key) => renderConfigRow(key))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfig;
