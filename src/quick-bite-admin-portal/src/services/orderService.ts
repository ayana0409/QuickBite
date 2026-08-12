import axiosClient from './axiosClient';
import type { Order } from '../types';
import { unwrapArray } from '../utils/apiHelper';

export interface ExtendedOrder extends Order {
  orderCode: string;
  customerName: string;
  restaurantName: string;
  sagaState: 'Initial' | 'StockReserved' | 'PaymentAuthorized' | 'AwaitingAcceptance' | 'Confirmed' | 'Preparing' | 'Delivering' | 'Completed' | 'Cancelled';
  timeline: { step: string; timestamp: string; status: 'done' | 'active' | 'pending' | 'failed' }[];
}

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
    items: [
      { id: 'it-1', productId: 'p-1', productName: 'Cơm Tấm Sườn Bì Chả Special', quantity: 2, unitPrice: 60000, totalPrice: 120000 },
      { id: 'it-2', productId: 'p-2', productName: 'Trà Đào Cam Sả 500ml', quantity: 1, unitPrice: 25000, totalPrice: 25000 },
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
    items: [
      { id: 'it-3', productId: 'p-3', productName: 'Phở Bò Tái Lăn Trứng Chèn', quantity: 1, unitPrice: 75000, totalPrice: 75000 },
      { id: 'it-4', productId: 'p-4', productName: 'Quẩy Giòn Hà Nội (3 cái)', quantity: 2, unitPrice: 10000, totalPrice: 20000 },
    ],
    timeline: [
      { step: '1. Khách Đặt Đơn', timestamp: '07:10:00', status: 'done' },
      { step: '2. Giữ Tồn Kho', timestamp: '07:10:01', status: 'done' },
      { step: '3. Giữ Tiền MoMo', timestamp: '07:10:02', status: 'done' },
      { step: '4. Nhà Hàng Đã Xác Nhận', timestamp: '07:12:15', status: 'done' },
      { step: '5. Đang Bếp Chế Biến', timestamp: '07:12:16', status: 'active' },
    ],
  },
  {
    id: 'ord-103-uuid',
    orderCode: 'QB-20260811-7A44',
    restaurantId: 'res-003-uuid',
    restaurantName: 'Trà Sữa KOI Thé & Coffee',
    customerId: 'usr-customer-001',
    customerName: 'Phạm Minh Khách',
    status: 'Completed',
    sagaState: 'Completed',
    totalAmount: 110000,
    deliveryAddress: '88 Lê Lai, Quận 1, TP.HCM',
    createdAt: '2026-08-11T06:30:00Z',
    items: [
      { id: 'it-5', productId: 'p-5', productName: 'Trà Sữa Trân Châu Hoàng Kim L', quantity: 2, unitPrice: 55000, totalPrice: 110000 },
    ],
    timeline: [
      { step: '1. Khách Đặt Đơn', timestamp: '06:30:00', status: 'done' },
      { step: '2. Giữ Tồn Kho', timestamp: '06:30:01', status: 'done' },
      { step: '3. Thanh Toán COD', timestamp: '06:30:01', status: 'done' },
      { step: '4. Nhà Hàng Xác Nhận', timestamp: '06:31:00', status: 'done' },
      { step: '5. Tài Xế Giao Hàng & Hoàn Tất', timestamp: '06:55:00', status: 'done' },
    ],
  },
  {
    id: 'ord-104-uuid',
    orderCode: 'QB-20260811-1C02',
    restaurantId: 'res-004-uuid',
    restaurantName: 'Bún Bò Huế O Phượng',
    customerId: 'usr-customer-002',
    customerName: 'Hoàng Ánh Nguyệt',
    status: 'Cancelled',
    sagaState: 'Cancelled',
    totalAmount: 85000,
    deliveryAddress: '12 Điện Biên Phủ, Huế',
    createdAt: '2026-08-11T05:00:00Z',
    items: [
      { id: 'it-6', productId: 'p-6', productName: 'Bún Bò Giò Chả Cua Đặc Bạc', quantity: 1, unitPrice: 85000, totalPrice: 85000 },
    ],
    timeline: [
      { step: '1. Khách Đặt Đơn', timestamp: '05:00:00', status: 'done' },
      { step: '2. Giữ Tồn Kho', timestamp: '05:00:01', status: 'done' },
      { step: '3. Awaiting Acceptance Timeout (15m)', timestamp: '05:15:00', status: 'failed' },
      { step: '4. Saga Compensation (Nhả kho + Hủy đơn)', timestamp: '05:15:01', status: 'done' },
    ],
  },
];

let inMemoryOrders = [...MOCK_ORDERS];

export const orderService = {
  // Lấy danh sách toàn bộ đơn hàng cho Admin
  async getAdminOrders(): Promise<ExtendedOrder[]> {
    try {
      const res: any = await axiosClient.get('/orders');
      const list = unwrapArray(res);
      if (list.length > 0) return list;
      return inMemoryOrders;
    } catch {
      console.warn('API Gateway /orders offline. Fallback to mock orders.');
      return inMemoryOrders;
    }
  },

  // Chi tiết đơn hàng
  async getOrderById(id: string): Promise<ExtendedOrder | undefined> {
    return inMemoryOrders.find((o) => o.id === id);
  },
};
