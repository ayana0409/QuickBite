import axiosClient from './axiosClient';
import axios from 'axios';
import { unwrapData } from '../utils/apiHelper';

export interface AdminOverviewStats {
  totalActiveRestaurants: number;
  todayOrders: number;
  totalSystemRevenue: number;
  cachedAt?: string;
}

export interface RevenueChartPoint {
  date: string;
  dayName: string;
  revenue: number;
  ordersCount: number;
}

export interface OrderStatusPoint {
  status: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AdminChartsData {
  revenueChart: RevenueChartPoint[];
  orderStatusChart: OrderStatusPoint[];
  cachedAt?: string;
}

export interface MicroserviceHealthEntry {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  description: string;
  duration_ms: number;
  data?: any;
  exception?: string | null;
}

export interface SystemHealthResponse {
  status: 'Healthy' | 'Degraded' | 'Unhealthy' | 'UP';
  total_duration_ms?: number;
  uptime?: number;
  timestamp: string;
  entries?: Record<string, MicroserviceHealthEntry>;
}

export const adminDashboardService = {
  /**
   * Fetches real-time overview statistics (active restaurants, today orders, system revenue)
   */
  async getOverviewStats(): Promise<AdminOverviewStats> {
    const res: any = await axiosClient.get('/admin/stats/overview');
    const unwrapped = unwrapData<AdminOverviewStats>(res) || res?.data || res;
    return {
      totalActiveRestaurants: Number(unwrapped?.totalActiveRestaurants) || 0,
      todayOrders: Number(unwrapped?.todayOrders) || 0,
      totalSystemRevenue: Number(unwrapped?.totalSystemRevenue) || 0,
      cachedAt: unwrapped?.cachedAt,
    };
  },

  /**
   * Clears Redis cache on API Gateway and forces recalculation of analytics
   */
  async resetStatsCache(): Promise<void> {
    await axiosClient.post('/admin/stats/reset-cache');
  },

  /**
   * Fetches 30-day revenue chart and order status breakdown
   */
  async getChartsData(): Promise<AdminChartsData> {
    const res: any = await axiosClient.get('/admin/stats/charts');
    const unwrapped = unwrapData<AdminChartsData>(res) || res?.data || res;
    return {
      revenueChart: Array.isArray(unwrapped?.revenueChart) ? unwrapped.revenueChart : [],
      orderStatusChart: Array.isArray(unwrapped?.orderStatusChart) ? unwrapped.orderStatusChart : [],
    };
  },

  /**
   * Pings the API Gateway and Microservices health check endpoint.
   * Uses independent axios instance to prevent toast notification spam on failure.
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const gatewayBaseUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';
    const cleanUrl = gatewayBaseUrl.replace(/\/$/, '');

    const res = await axios.get<SystemHealthResponse>(`${cleanUrl}/api/health`, {
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }

    if (res.status === 503 && res.data) {
      // 503 Unhealthy response still carries structured diagnostic entries
      return res.data;
    }

    throw new Error(`Gateway health check failed with status HTTP ${res.status}`);
  },

  /**
   * Formats numeric currency into Vietnamese Dong string (e.g. 142.800.000 ₫)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  },

  /**
   * Formats compact number with abbreviations (e.g. 142.8M ₫)
   */
  formatCompactCurrency(amount: number): string {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(1)}B ₫`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M ₫`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}K ₫`;
    }
    return `${amount} ₫`;
  },
};
