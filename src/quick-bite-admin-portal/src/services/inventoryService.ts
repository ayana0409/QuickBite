import axiosClient from './axiosClient';
import { unwrapData } from '../utils/apiHelper';

export interface InventoryItem {
  id: string;
  foodItemId: string;
  name?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryPaginatedResult {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetInventoryParams {
  restaurantId: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface AdjustStockDto {
  foodItemId: string;
  adjustmentQuantity: number;
}

export interface CreateInventoryDto {
  foodItemId: string;
  quantity: number;
}

export const inventoryService = {
  // GET /api/v1/inventory/restaurant/{restaurantId}?page=1&limit=10&categoryId=...&search=...
  async getInventoryByRestaurant(params: GetInventoryParams): Promise<InventoryPaginatedResult> {
    const { restaurantId, page = 1, limit = 10, search = '', categoryId = '' } = params;
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (search && search.trim()) queryParams.set('search', search.trim());
      if (categoryId && categoryId !== 'ALL') queryParams.set('categoryId', categoryId);

      const url = `/api/v1/inventory/restaurant/${restaurantId}?${queryParams.toString()}`;
      const res: any = await axiosClient.get(url);

      // Spring Boot Page structure: { content: [...], totalElements: number, totalPages: number, number: pageIndex }
      const rawData = unwrapData(res) || res?.data || res;
      const contentList = Array.isArray(rawData?.content) 
        ? rawData.content 
        : (Array.isArray(rawData) ? rawData : []);

      const items: InventoryItem[] = contentList.map((item: any) => ({
        id: item.id || `inv-${item.foodItemId}`,
        foodItemId: item.foodItemId,
        name: item.name || 'Món ăn',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        reservedQuantity: typeof item.reservedQuantity === 'number' ? item.reservedQuantity : 0,
        availableQuantity: typeof item.availableQuantity === 'number' ? item.availableQuantity : 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      const total = typeof rawData?.totalElements === 'number' ? rawData.totalElements : items.length;
      const totalPages = typeof rawData?.totalPages === 'number' ? rawData.totalPages : Math.ceil(total / limit) || 1;

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (err) {
      console.warn(`API GET /api/v1/inventory/restaurant/${restaurantId} error:`, err);
      return {
        items: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
      };
    }
  },

  // POST /api/v1/inventory/adjust - Cộng/trừ tồn kho
  async adjustStock(dto: AdjustStockDto): Promise<InventoryItem | null> {
    try {
      const res: any = await axiosClient.post('/api/v1/inventory/adjust', {
        foodItemId: dto.foodItemId,
        adjustmentQuantity: dto.adjustmentQuantity,
      });
      const data = unwrapData(res) || res?.data || res;
      if (data) {
        return {
          id: data.id || `inv-${data.foodItemId}`,
          foodItemId: data.foodItemId,
          name: data.name,
          quantity: data.quantity ?? 0,
          reservedQuantity: data.reservedQuantity ?? 0,
          availableQuantity: data.availableQuantity ?? 0,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (err) {
      console.error('API POST /api/v1/inventory/adjust error:', err);
      throw err;
    }
  },

  // POST /api/v1/inventory - Thiết lập tồn kho tuyệt đối ban đầu
  async createInventory(dto: CreateInventoryDto): Promise<InventoryItem | null> {
    try {
      const res: any = await axiosClient.post('/api/v1/inventory', {
        foodItemId: dto.foodItemId,
        quantity: dto.quantity,
      });
      const data = unwrapData(res) || res?.data || res;
      if (data) {
        return {
          id: data.id || `inv-${data.foodItemId}`,
          foodItemId: data.foodItemId,
          name: data.name,
          quantity: data.quantity ?? 0,
          reservedQuantity: data.reservedQuantity ?? 0,
          availableQuantity: data.availableQuantity ?? 0,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (err) {
      console.error('API POST /api/v1/inventory error:', err);
      throw err;
    }
  },

  // DELETE /api/v1/inventory/{foodItemId}
  async deleteInventoryItem(foodItemId: string): Promise<void> {
    try {
      await axiosClient.delete(`/api/v1/inventory/${foodItemId}`);
    } catch (err) {
      console.error(`API DELETE /api/v1/inventory/${foodItemId} error:`, err);
      throw err;
    }
  },
};
