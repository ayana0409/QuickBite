import axiosClient from './axiosClient';
import type {
  Order,
  OrderStatus,
  MerchantOrdersParams,
  OrderPaginatedData,
} from '../types';
import { unwrapData, unwrapArray } from '../utils/apiHelper';

export interface ExtendedOrder extends Order {
  customerName?: string;
  restaurantName?: string;
  sagaState?: 'Initial' | 'StockReserved' | 'PaymentAuthorized' | 'AwaitingAcceptance' | 'Confirmed' | 'Preparing' | 'Delivering' | 'Completed' | 'Cancelled';
  timeline?: { step: string; timestamp: string; status: 'done' | 'active' | 'pending' | 'failed' }[];
}

export const orderService = {
  /**
   * Lấy danh sách đơn hàng của Merchant từ API Gateway (GET /merchant/orders)
   * Tự động trích xuất userId từ JWT -> lấy restaurantId -> lấy danh sách đơn từ Order Service
   */
  async getMerchantOrders(params?: MerchantOrdersParams): Promise<OrderPaginatedData> {
    const res: any = await axiosClient.get('/merchant/orders', {
      params: {
        search: params?.search || undefined,
        status: params?.status || undefined,
        page: params?.page || 1,
        limit: params?.limit || 10,
      },
    });

    const dataPayload = unwrapData<any>(res);
    const items = Array.isArray(dataPayload?.items)
      ? dataPayload.items
      : unwrapArray<Order>(res);

    const totalCount =
      typeof dataPayload?.totalCount === 'number'
        ? dataPayload.totalCount
        : items.length;

    return {
      items,
      totalCount,
    };
  },

  /**
   * Lấy chi tiết một đơn hàng theo ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const res: any = await axiosClient.get(`/order/order/${orderId}`);
      return unwrapData<Order>(res);
    } catch {
      // Fallback via alternative route if needed
      const res: any = await axiosClient.get(`/merchant/orders/${orderId}`);
      return unwrapData<Order>(res);
    }
  },

  /**
   * Submit đơn hàng nháp vào quy trình Saga (POST /api/app/order/{id}/submit)
   */
  async submitOrder(orderId: string): Promise<any> {
    const res: any = await axiosClient.post(`/order/order/${orderId}/submit`);
    return unwrapData<any>(res);
  },

  /**
   * Hủy đơn hàng (POST /api/app/order/{id}/cancel)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<any> {
    const res: any = await axiosClient.post(`/order/order/${orderId}/cancel`, {
      reason: reason || 'Nhà hàng hủy đơn hàng',
    });
    return unwrapData<any>(res);
  },

  /**
   * Cập nhật trạng thái đơn hàng (PUT /api/app/order/{orderId}/status)
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order | null> {
    const res: any = await axiosClient.put(`/order/order/${orderId}/status`, {
      status,
      note,
    });
    return unwrapData<Order>(res);
  },

  /**
   * Lấy dữ liệu thống kê tổng hợp cho Merchant Dashboard thông qua API Gateway (GET /merchant/dashboard)
   * Tự động trích xuất thông tin userId từ JWT, kết hợp số liệu từ Catalog & Order Service
   */
  async getMerchantDashboard(): Promise<any> {
    const res: any = await axiosClient.get('/merchant/dashboard');
    return unwrapData<any>(res);
  },

  /**
   * Lấy danh sách toàn bộ đơn hàng cho Admin với bộ lọc nâng cao
   * Gọi API Gateway: GET /order/order/admin-list
   */
  async getAdminOrders(params?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    skipCount?: number;
    maxResultCount?: number;
  }): Promise<{ items: ExtendedOrder[]; totalCount: number }> {
    try {
      const res: any = await axiosClient.get('/order/order/admin-list', {
        params: {
          search: params?.search || undefined,
          status: params?.status || undefined,
          startDate: params?.startDate || undefined,
          endDate: params?.endDate || undefined,
          skipCount: params?.skipCount ?? 0,
          maxResultCount: params?.maxResultCount ?? 50,
        },
      });

      const dataPayload = unwrapData<any>(res);
      const items = Array.isArray(dataPayload?.items)
        ? dataPayload.items
        : unwrapArray<ExtendedOrder>(res);

      const totalCount =
        typeof dataPayload?.totalCount === 'number'
          ? dataPayload.totalCount
          : items.length;

      return {
        items,
        totalCount,
      };
    } catch (error) {
      console.warn('Could not fetch admin orders', error);
      return { items: [], totalCount: 0 };
    }
  },

  /**
   * Hủy đơn hàng khẩn cấp quyền Admin (Force Cancel)
   * Gọi API Gateway: POST /order/order/{id}/force-cancel
   */
  async forceCancelOrder(orderId: string, reason: string): Promise<any> {
    const res: any = await axiosClient.post(`/order/order/${orderId}/force-cancel`, {
      reason,
    });
    return unwrapData<any>(res);
  },
};
