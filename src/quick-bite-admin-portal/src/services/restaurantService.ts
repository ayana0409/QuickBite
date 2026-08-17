import axiosClient from './axiosClient';
import { unwrapData, unwrapArray } from '../utils/apiHelper';

export interface RestaurantAddress {
  line1: string;
  ward: string;
  district: string;
  city: string;
  geo: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface CreateRestaurantDto {
  ownerId: string;
  name: string;
  slug: string;
  address: RestaurantAddress;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  address: RestaurantAddress;
  status: string;
  rating?: {
    avg: number;
    count: number;
  };
  createdAt?: string;
  updatedAt?: string;
}



export const restaurantService = {
  // Lấy danh sách tất cả nhà hàng (Admin)
  async getRestaurants(): Promise<any[]> {
    try {
      const res: any = await axiosClient.get('/catalog/restaurants');
      const list = unwrapArray(res);
      return list.map((item: any) => ({
        ...item,
        address: typeof item.address === 'object' 
          ? `${item.address.line1 || ''}, ${item.address.ward || ''}, ${item.address.district || ''}, ${item.address.city || ''}`
          : item.address || '',
        isActive: item.status ? item.status !== 'closed' : true,
        createdAt: item.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  // Lấy nhà hàng theo ownerId (Merchant)
  async getRestaurantByOwner(ownerId: string): Promise<Restaurant | null> {
    if (!ownerId || ownerId === 'undefined') {
      return null;
    }
    try {
      const res: any = await axiosClient.get(`/catalog/restaurants/owner/${ownerId}`);
      const data = unwrapData<Restaurant>(res);
      if (data && data.id) {
        return data;
      }
      return null;
    } catch (err: any) {
      // If 404 or error, try query param fallback /catalog/restaurants?ownerId=...
      try {
        const fallbackRes: any = await axiosClient.get(`/catalog/restaurants?ownerId=${ownerId}`);
        const fallbackList = unwrapArray<Restaurant>(fallbackRes);
        if (fallbackList.length > 0) {
          return fallbackList[0];
        }
        const fallbackData = unwrapData<Restaurant>(fallbackRes);
        if (fallbackData && fallbackData.id) {
          return fallbackData;
        }
      } catch {}
      // 404 means no restaurant exists for this owner yet -> return null
      return null;
    }
  },

  // Tạo nhà hàng mới (Merchant Setup / Admin)
  async createRestaurant(dto: any): Promise<any> {
    console.log('--- POST /catalog/restaurants PAYLOAD ---', JSON.stringify(dto, null, 2));
    try {
      const res: any = await axiosClient.post('/catalog/restaurants', dto);
      const created = res?.data || res;
      return {
        ...created,
        address: typeof created.address === 'object'
          ? `${created.address.line1 || ''}, ${created.address.ward || ''}, ${created.address.district || ''}, ${created.address.city || ''}`
          : created.address || dto.address || '',
        isActive: true,
        createdAt: created.createdAt || new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('--- POST /catalog/restaurants ERROR ---', err.response?.data);
      throw err;
    }
  },

  // Cập nhật thông tin nhà hàng (Admin / Merchant)
  async updateRestaurant(id: string, values: any): Promise<any> {
    const res: any = await axiosClient.patch(`/catalog/restaurants/${id}`, values);
    return res?.data || res;
  },

  // Lấy thông tin nhà hàng của Merchant đang đăng nhập (GET /catalog/restaurants/me)
  async getMerchantProfile(): Promise<Restaurant | null> {
    try {
      const res: any = await axiosClient.get('/catalog/restaurants/me');
      const data = unwrapData<Restaurant>(res);
      if (data && data.id) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Cập nhật thông tin nhà hàng của Merchant đang đăng nhập (PUT /catalog/restaurants/me)
  async updateMerchantProfile(dto: Partial<CreateRestaurantDto> & { status?: string }): Promise<Restaurant> {
    const res: any = await axiosClient.put('/catalog/restaurants/me', dto);
    const data = unwrapData<Restaurant>(res) || res;
    return data;
  },

  // Khóa / Mở khóa hoạt động nhà hàng
  async toggleStatus(id: string): Promise<any> {
    const res: any = await axiosClient.patch(`/catalog/restaurants/${id}`, { status: 'closed' });
    return res?.data || res;
  },
};
