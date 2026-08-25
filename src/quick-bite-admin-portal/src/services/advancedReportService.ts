import axiosClient from './axiosClient';
import { unwrapData } from '../utils/apiHelper';
import type { ExtendedOrder } from '../types';

export interface ReportChartPoint {
  date: string;
  dayName: string;
  revenue: number;
  ordersCount: number;
  ordersCompleted: number;
  ordersCancelled: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface ReportChartsResponse {
  charts: ReportChartPoint[];
  summary: ReportSummary;
}

export interface ReportDetailsResponse {
  data: ExtendedOrder[];
  totalCount: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  restaurantId?: string;
  merchantId?: string;
  page?: number;
  limit?: number;
}

export const advancedReportService = {
  /**
   * Fetches aggregated chart data (revenue & stacked order status breakdown)
   * with custom query parameters (startDate, endDate, status, restaurantId)
   */
  async getReportsCharts(params: ReportFilterParams): Promise<ReportChartsResponse> {
    const res: any = await axiosClient.get('/admin/reports/charts', {
      params: {
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        status: params.status || undefined,
        restaurantId: params.restaurantId || undefined,
        merchantId: params.merchantId || undefined,
      },
    });

    const payload =
      res?.data !== undefined && !Array.isArray(res?.data)
        ? res.data
        : (res?.charts ? res : (unwrapData<any>(res) || res));

    const charts = Array.isArray(payload?.charts)
      ? payload.charts
      : (Array.isArray(res?.data?.charts)
        ? res.data.charts
        : (Array.isArray(res?.charts)
          ? res.charts
          : (Array.isArray(payload) ? payload : (Array.isArray(res?.data) ? res.data : []))));

    const summary = payload?.summary || res?.data?.summary || res?.summary || {
      totalRevenue: charts.reduce((sum: number, c: any) => sum + (Number(c.revenue) || 0), 0),
      totalOrders: charts.reduce((sum: number, c: any) => sum + (Number(c.ordersCount) || 0), 0),
      completedOrders: charts.reduce((sum: number, c: any) => sum + (Number(c.ordersCompleted) || 0), 0),
      cancelledOrders: charts.reduce((sum: number, c: any) => sum + (Number(c.ordersCancelled) || 0), 0),
    };

    return {
      charts,
      summary,
    };
  },

  /**
   * Fetches paginated detailed records for reports table
   */
  async getReportsDetails(params: ReportFilterParams): Promise<ReportDetailsResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const res: any = await axiosClient.get('/admin/reports/details', {
      params: {
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        status: params.status || undefined,
        restaurantId: params.restaurantId || undefined,
        merchantId: params.merchantId || undefined,
        page,
        limit,
      },
    });

    let items: ExtendedOrder[] = [];
    if (Array.isArray(res?.data)) {
      items = res.data;
    } else if (Array.isArray(res?.data?.items)) {
      items = res.data.items;
    } else if (Array.isArray(res?.items)) {
      items = res.items;
    } else if (Array.isArray(res)) {
      items = res;
    } else {
      const unwrapped = unwrapData<any>(res);
      if (Array.isArray(unwrapped)) {
        items = unwrapped;
      } else if (Array.isArray(unwrapped?.items)) {
        items = unwrapped.items;
      } else if (Array.isArray(unwrapped?.data)) {
        items = unwrapped.data;
      }
    }

    const totalCount =
      typeof res?.totalCount === 'number'
        ? res.totalCount
        : (typeof res?.data?.totalCount === 'number'
          ? res.data.totalCount
          : (typeof (res as any)?.meta?.total === 'number' ? (res as any).meta.total : items.length));

    const totalPages =
      typeof res?.totalPages === 'number'
        ? res.totalPages
        : (typeof res?.data?.totalPages === 'number'
          ? res.data.totalPages
          : (Math.ceil(totalCount / limit) || (totalCount > 0 ? 1 : 0)));

    return {
      data: items,
      totalCount,
      totalPages,
      page,
      limit,
    };
  },

  /**
   * Client-side CSV export utility
   * Generates a downloadable CSV with UTF-8 BOM encoding for Excel compatibility
   */
  exportToCsv(orders: ExtendedOrder[], filename = 'bao-cao-chuyen-sau.csv'): void {
    if (!orders || orders.length === 0) {
      return;
    }

    const headers = [
      'Mã Đơn Hàng',
      'Thời Gian Tạo',
      'Nhà Hàng',
      'Khách Hàng',
      'Trạng Thái',
      'Tổng Tiền (VNĐ)',
    ];

    const escapeField = (field: any): string => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((order) => {
      const dateStr = order.creationTime || order.createdAt || '';
      const formattedDate = dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';
      const restaurantName = order.restaurantName || order.restaurantId || '';
      const customerName = order.customerName || order.customerId || '';
      const status = order.status || '';
      const totalAmount = order.totalAmount || 0;

      return [
        escapeField(order.orderCode || order.id),
        escapeField(formattedDate),
        escapeField(restaurantName),
        escapeField(customerName),
        escapeField(status),
        escapeField(totalAmount),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
