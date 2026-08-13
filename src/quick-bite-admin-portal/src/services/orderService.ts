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

// NOTE: Mock data below will be removed after full API migration for Admin Portal
const MOCK_ORDERS: ExtendedOrder[] = [
  {
    id: 'ord-101-uuid',
    orderCode: 'QB-20260811-9F82',
    restaurantId: 'res-001-uuid',
    restaurantName: 'Cơm Tấm Sườn Bì Chả Sài Gòn',
    customerId: 'usr-customer-001',
    customerName: 'Phạm Minh Khách',
    status: 'Pending',
    sagaState: 'AwaitingAcceptance',
    totalAmount: 145000,
    deliveryAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    createdAt: '2026-08-11T07:25:00Z',
    creationTime: '2026-08-11T07:25:00Z',
    items: [
      { id: 'it-1', foodItemId: 'p-1', foodName: 'Cơm Tấm Sườn Bì Chả Special', quantity: 2, unitPrice: 60000, totalPrice: 120000, productId: 'p-1', productName: 'Cơm Tấm Sườn Bì Chả Special' },
      { id: 'it-2', foodItemId: 'p-2', foodName: 'Trà Đào Cam Sả 500ml', quantity: 1, unitPrice: 25000, totalPrice: 25000, productId: 'p-2', productName: 'Trà Đào Cam Sả 500ml' },
    ],
    timeline: [
      { step: '1. Khách Đặt Đơn (Order Created)', timestamp: '07:25:00', status: 'done' },
      { step: '2. Giữ Tồn Kho (Inventory Reserved)', timestamp: '07:25:01', status: 'done' },
      { step: '3. Giữ Tiền VNPay (Payment Authorized)', timestamp: '07:25:03', status: 'done' },
      { step: '4. Chờ Nhà Hàng Duyệt (15-min Timeout)', timestamp: '07:25:04', status: 'active' },
      { step: '5. Hoàn Tất Đơn Hàng (Completed)', timestamp: '--:--:--', status: 'pending' },
    ],
  },
  {
    id: 'ord-102-uuid',
    orderCode: 'QB-20260811-3B19',
    restaurantId: 'res-002-uuid',
    restaurantName: 'Phở Bò Gia Truyền Hà Nội',
    customerId: 'usr-customer-002',
    customerName: 'Hoàng Ánh Nguyệt',
    status: 'Confirmed',
    sagaState: 'Confirmed',
    totalAmount: 95000,
    deliveryAddress: '45 Lý Quốc Sư, Hoàn Kiếm, Hà Nội',
    createdAt: '2026-08-11T07:10:00Z',
    creationTime: '2026-08-11T07:10:00Z',
    items: [
      { id: 'it-3', foodItemId: 'p-3', foodName: 'Phở Bò Tái Lăn Trứng Chèn', quantity: 1, unitPrice: 75000, totalPrice: 75000, productId: 'p-3', productName: 'Phở Bò Tái Lăn Trứng Chèn' },
      { id: 'it-4', foodItemId: 'p-4', foodName: 'Quẩy Giòn Hà Nội (3 cái)', quantity: 2, unitPrice: 10000, totalPrice: 20000, productId: 'p-4', productName: 'Quẩy Giòn Hà Nội (3 cái)' },
    ],
    timeline: [
      { step: '1. Khách Đặt Đơn', timestamp: '07:10:00', status: 'done' },
      { step: '2. Giữ Tồn Kho', timestamp: '07:10:01', status: 'done' },
      { step: '3. Giữ Tiền MoMo', timestamp: '07:10:02', status: 'done' },
      { step: '4. Nhà Hàng Đã Xác Nhận', timestamp: '07:12:15', status: 'done' },
      { step: '5. Đang Bếp Chế Biến', timestamp: '07:12:16', status: 'active' },
    ],
  },
];

let inMemoryOrders = [...MOCK_ORDERS];

export const orderService = {
  /**
   * Lấy danh sách đơn hàng của Merchant từ API Gateway (GET /api/merchant/orders)
   * Tự động trích xuất userId từ JWT -> lấy restaurantId -> lấy danh sách đơn từ Order Service
   */
  async getMerchantOrders(params?: MerchantOrdersParams): Promise<OrderPaginatedData> {
    const res: any = await axiosClient.get('/api/merchant/orders', {
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
   * Cập nhật trạng thái đơn hàng (PUT /order/{orderId}/status)
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order | null> {
    const res: any = await axiosClient.put(`/order/api/app/order/${orderId}/status`, {
      status,
      note,
    });
    return unwrapData<Order>(res);
  },

  /**
   * Lấy danh sách toàn bộ đơn hàng cho Admin (Legacy fallback)
   */
  async getAdminOrders(): Promise<ExtendedOrder[]> {
    try {
      const res: any = await axiosClient.get('/orders');
      const list = unwrapArray<ExtendedOrder>(res);
      if (list.length > 0) return list;
      return inMemoryOrders;
    } catch {
      console.warn('API Gateway /orders offline. Fallback to mock orders.');
      return inMemoryOrders;
    }
  },

  /**
   * Chi tiết đơn hàng theo ID
   */
  async getOrderById(id: string): Promise<ExtendedOrder | undefined> {
    return inMemoryOrders.find((o) => o.id === id);
  },
};
