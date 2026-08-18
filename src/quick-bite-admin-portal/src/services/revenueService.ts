import axiosClient from './axiosClient';
import { unwrapData, unwrapArray } from '../utils/apiHelper';

export interface PaymentDto {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | string;
  method: 'COD' | 'MOCK_PAYMENT' | 'MOMO' | 'CREDIT_CARD' | string;
  transactionId?: string;
  failureReason?: string;
  createdAt?: string;
}

export interface MerchantTransaction {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  itemsCount: number;
  totalAmount: number;
  orderStatus: string;
  createdAt: string;
  paymentId?: string;
  paymentMethod: 'COD' | 'ONLINE' | 'MOCK' | 'UNKNOWN';
  paymentMethodRaw: string;
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'UNPAID';
}

export interface RevenueKPIs {
  totalRevenue: number;
  codRevenue: number;
  onlineRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueToday: number;
  ordersToday: number;
}

export interface RevenueFilterParams {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MerchantRevenueResult {
  kpis: RevenueKPIs;
  transactions: MerchantTransaction[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const revenueService = {
  /**
   * Fetch revenue stats and paged transactions by merging Order and Payment data
   */
  async getMerchantRevenueData(params: RevenueFilterParams): Promise<MerchantRevenueResult> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skipCount = (page - 1) * limit;

    // 1. Build Query for Order Service
    const orderQueryParams = new URLSearchParams();
    orderQueryParams.append('restaurantId', params.restaurantId);
    orderQueryParams.append('skipCount', String(skipCount));
    orderQueryParams.append('maxResultCount', String(limit));

    if (params.status && params.status !== 'ALL') {
      orderQueryParams.append('status', params.status);
    }
    if (params.search && params.search.trim()) {
      orderQueryParams.append('search', params.search.trim());
    }

    // 2. Parallel fetch: Orders paged list + Restaurant Statistics
    // In ABP Framework, GetListByRestaurantAsync maps to /api/app/order/by-restaurant
    const [ordersResponse, statsResponse] = await Promise.allSettled([
      axiosClient.get(`/order/order/by-restaurant?${orderQueryParams.toString()}`).catch(() =>
        axiosClient.get('/merchant/orders', {
          params: {
            page,
            limit,
            status: params.status !== 'ALL' ? params.status : undefined,
            search: params.search || undefined,
          },
        })
      ),
      axiosClient.get(`/order/order/statistics?restaurantId=${params.restaurantId}`).catch(() =>
        axiosClient.get('/merchant/dashboard')
      ),
    ]);

    let ordersList: any[] = [];
    let totalCount = 0;

    if (ordersResponse.status === 'fulfilled') {
      const data = unwrapData<any>(ordersResponse.value) || ordersResponse.value;
      ordersList = data?.items || unwrapArray(data) || [];
      totalCount = typeof data?.totalCount === 'number' ? data.totalCount : ordersList.length;
    }

    // 3. Batch Fetch Payments for all Order IDs in this page
    const orderIds = ordersList.map((o) => o.id).filter(Boolean);
    const paymentMap = new Map<string, PaymentDto>();

    if (orderIds.length > 0) {
      try {
        // Try optimized batch payment endpoint
        const batchRes: any = await axiosClient.post('/payments/payments/batch', orderIds);
        const paymentsList = unwrapArray<PaymentDto>(batchRes);
        if (Array.isArray(paymentsList) && paymentsList.length > 0) {
          paymentsList.forEach((p) => {
            if (p && p.orderId) {
              paymentMap.set(p.orderId.toLowerCase(), p);
            }
          });
        }
      } catch (batchErr) {
        // Fallback: Parallel individual lookup if batch endpoint unavailable
        console.warn('Batch payments lookup failed, falling back to parallel lookup:', batchErr);
        const paymentPromises = orderIds.map((id) =>
          axiosClient
            .get(`/payments/payments/order/${id}`)
            .then((res: any) => unwrapData<PaymentDto>(res))
            .catch(() => null)
        );
        const results = await Promise.allSettled(paymentPromises);
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value && r.value.orderId) {
            paymentMap.set(r.value.orderId.toLowerCase(), r.value);
          }
        });
      }
    }

    // 4. Client-side Date Range Filtering (if specified)
    let filteredOrders = ordersList;
    if (params.startDate || params.endDate) {
      filteredOrders = ordersList.filter((o) => {
        if (!o.creationTime) return true;
        const orderDate = new Date(o.creationTime);
        if (params.startDate) {
          const start = new Date(params.startDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (params.endDate) {
          const end = new Date(params.endDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
        return true;
      });
    }

    // 5. Merge Orders with Payment details
    const transactions: MerchantTransaction[] = filteredOrders.map((order: any) => {
      const payment = paymentMap.get(order.id?.toLowerCase());
      const rawMethod = payment?.method || (order.paymentMethod ? String(order.paymentMethod) : 'UNKNOWN');

      let normalizedMethod: 'COD' | 'ONLINE' | 'MOCK' | 'UNKNOWN' = 'UNKNOWN';
      if (rawMethod === 'COD') {
        normalizedMethod = 'COD';
      } else if (rawMethod === 'MOMO' || rawMethod === 'CREDIT_CARD') {
        normalizedMethod = 'ONLINE';
      } else if (rawMethod === 'MOCK_PAYMENT') {
        normalizedMethod = 'MOCK';
      }

      let paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'UNPAID' = 'UNPAID';
      if (payment?.status) {
        const s = payment.status.toUpperCase();
        if (s === 'SUCCESS' || s === 'CAPTURED') paymentStatus = 'SUCCESS';
        else if (s === 'PENDING') paymentStatus = 'PENDING';
        else if (s === 'FAILED') paymentStatus = 'FAILED';
        else if (s === 'REFUNDED') paymentStatus = 'REFUNDED';
      } else if (order.status?.toLowerCase() === 'delivered' || order.status?.toLowerCase() === 'completed') {
        paymentStatus = 'SUCCESS';
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const itemsSummary =
        items.length > 0
          ? items.map((i: any) => `${i.quantity}x ${i.foodName || i.itemName || 'Món'}`).join(', ')
          : 'Đơn hàng món ăn';
      const itemsCount = items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0) || 1;

      return {
        id: order.id,
        orderId: order.id,
        orderCode: order.orderCode || order.id?.substring(0, 8)?.toUpperCase() || 'ORD-000',
        customerName: order.deliveryAddress?.receiverName || order.deliveryAddress?.fullName || 'Khách hàng',
        customerPhone: order.deliveryAddress?.phoneNumber || '—',
        itemsSummary,
        itemsCount,
        totalAmount: Number(order.totalAmount) || 0,
        orderStatus: order.status || 'Pending',
        createdAt: order.creationTime || new Date().toISOString(),
        paymentId: payment?.id,
        paymentMethod: normalizedMethod,
        paymentMethodRaw: rawMethod,
        paymentStatus,
      };
    });

    // 6. Aggregate KPIs from all orders & statistics
    let totalRevenue = 0;
    let codRevenue = 0;
    let onlineRevenue = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    transactions.forEach((t) => {
      const isDelivered = t.orderStatus.toLowerCase() === 'delivered' || t.orderStatus.toLowerCase() === 'completed';
      const isPaid = t.paymentStatus === 'SUCCESS';

      if (isDelivered || isPaid) {
        totalRevenue += t.totalAmount;
        if (t.paymentMethod === 'COD') {
          codRevenue += t.totalAmount;
        } else {
          onlineRevenue += t.totalAmount;
        }
        deliveredOrders += 1;
      }

      if (t.orderStatus.toLowerCase() === 'cancelled') {
        cancelledOrders += 1;
      }
    });

    // Extract statistics from Order Service stats if available
    let revenueToday = 0;
    let ordersToday = 0;
    if (statsResponse.status === 'fulfilled') {
      const statsData = unwrapData<any>(statsResponse.value) || statsResponse.value;
      if (statsData?.kpiSummary) {
        revenueToday = Number(statsData.kpiSummary.revenueToday) || 0;
        ordersToday = Number(statsData.kpiSummary.ordersToday) || 0;
        if (totalRevenue === 0 && Number(statsData.kpiSummary.revenueYesterday) > 0) {
          totalRevenue = revenueToday + Number(statsData.kpiSummary.revenueYesterday);
        }
      }
    }

    const kpis: RevenueKPIs = {
      totalRevenue,
      codRevenue,
      onlineRevenue,
      totalOrders: totalCount,
      deliveredOrders,
      cancelledOrders,
      revenueToday,
      ordersToday,
    };

    return {
      kpis,
      transactions,
      totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    };
  },

  /**
   * Format currency number to Vietnamese Dong format (VD: 150.000 ₫)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  },

  /**
   * Export transactions list to CSV file and trigger browser download
   */
  exportToCSV(transactions: MerchantTransaction[], filename = 'doanh-thu-hoa-don.csv'): void {
    if (!transactions || transactions.length === 0) {
      return;
    }

    const headers = [
      'Mã Đơn Hàng',
      'Thời Gian',
      'Khách Hàng',
      'Số Điện Thoại',
      'Món Ăn',
      'Số Lượng Món',
      'Phương Thức Thanh Toán',
      'Số Tiền (VNĐ)',
      'Trạng Thái Đơn',
      'Trạng Thái Thanh Toán',
    ];

    const rows = transactions.map((t) => [
      `"${t.orderCode}"`,
      `"${new Date(t.createdAt).toLocaleString('vi-VN')}"`,
      `"${t.customerName.replace(/"/g, '""')}"`,
      `"${t.customerPhone}"`,
      `"${t.itemsSummary.replace(/"/g, '""')}"`,
      t.itemsCount,
      `"${t.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : t.paymentMethod === 'ONLINE' ? 'Thanh toán Online' : t.paymentMethodRaw}"`,
      t.totalAmount,
      `"${t.orderStatus}"`,
      `"${t.paymentStatus}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
