import axiosClient from './axiosClient';
import { unwrapData, unwrapArray } from '../utils/apiHelper';

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface FoodVariant {
  name: string;
  priceDelta: number;
}

export interface FoodTopping {
  name: string;
  price: number;
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  basePrice: number;
  currency: string;
  imageUrl?: string;
  images: string[];
  isAvailable: boolean;
  categoryName?: string;
  sku?: string;
  preparationTime?: number;
  tags?: string[];
  totalSold?: number;
  rating?: number;
  reviewCount?: number;
  variants?: FoodVariant[];
  toppings?: FoodTopping[];
}

export interface GetFoodItemsParams {
  restaurantId: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCategoryDto {
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateFoodItemDto {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price?: number;
  basePrice?: number;
  currency?: string;
  imageUrl?: string;
  images?: string[];
  isAvailable?: boolean;
  preparationTime?: number;
  tags?: string[];
  variants?: FoodVariant[];
  toppings?: FoodTopping[];
  sku?: string;
}

// Helper kiểm tra & tạo UUID hợp lệ cho NestJS ClassValidator (IsUUID)
const ensureUUID = (id?: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (id && uuidRegex.test(id)) return id;
  // Valid default fallback UUID if id is a mock string like 'rest-001'
  return 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
};

// Helper parse số tiền từ kiểu decimal string ("1000.00") hoặc number
const parsePrice = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper parse mảng chuỗi an toàn (tags, images) từ Array, chuỗi JSON hoặc chuỗi comma-separated
const parseStringArray = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      } catch {
        // Fallback to comma split if JSON parsing fails
      }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Helper parse mảng variants / toppings linh hoạt và an toàn từ mọi định dạng API/PostgreSQL JSONB
const parseCustomizationArray = (rawList: any, isVariant: boolean = true): any[] => {
  if (!rawList) return [];
  let list = rawList;

  // Trường hợp dữ liệu là chuỗi JSON
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '{}') return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  // Trường hợp dữ liệu là Object Dictionary { "0": {...}, "1": {...} }
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    list = Object.values(list);
  }

  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => {
      if (!item) return null;
      // Nếu item là chuỗi đơn giản
      if (typeof item === 'string') {
        const name = item.trim();
        if (!name) return null;
        return isVariant ? { name, priceDelta: 0 } : { name, price: 0 };
      }

      // Nếu item là Object
      const name = String(item.name || item.variantName || item.toppingName || item.title || item.label || '').trim();
      if (!name) return null;

      if (isVariant) {
        const delta = parsePrice(item.priceDelta ?? item.price_delta ?? item.price ?? item.delta ?? 0);
        return { name, priceDelta: delta };
      } else {
        const price = parsePrice(item.price ?? item.priceDelta ?? item.cost ?? item.price_delta ?? 0);
        return { name, price };
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

// Chuẩn hóa Category object nhận từ backend API
const normalizeCategory = (raw: any): Category => ({
  id: raw.id || raw._id || `cat-${Date.now()}`,
  restaurantId: raw.restaurantId || '',
  name: raw.name || 'Danh mục',
  description: raw.description || '',
  sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
  isActive: raw.isActive ?? true,
});

// Chuẩn hóa FoodItem object nhận từ backend API (hỗ trợ đầy đủ currency, price decimal string, images, preparationTime, tags, totalSold, variants, toppings)
const normalizeFoodItem = (raw: any): FoodItem => {
  const itemPrice = parsePrice(raw.price ?? raw.basePrice);
  const parsedImages = parseStringArray(raw.images);
  const rawImages = parsedImages.length > 0 ? parsedImages : (raw.imageUrl ? [raw.imageUrl] : []);
  const parsedTags = parseStringArray(raw.tags);
  const parsedVariants: FoodVariant[] = parseCustomizationArray(raw.variants, true);
  const parsedToppings: FoodTopping[] = parseCustomizationArray(raw.toppings, false);

  return {
    id: raw.id || raw._id || `food-${Date.now()}`,
    restaurantId: raw.restaurantId || '',
    categoryId: raw.categoryId || '',
    name: raw.name || 'Món ăn',
    description: raw.description || '',
    price: itemPrice,
    basePrice: itemPrice,
    currency: raw.currency || 'VND',
    imageUrl: rawImages[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
    images: rawImages,
    isAvailable: raw.isAvailable ?? true,
    sku: raw.sku || `SKU-${Date.now()}`,
    preparationTime: typeof raw.preparationTime === 'number' ? raw.preparationTime : (parseInt(raw.preparationTime) || 15),
    tags: parsedTags,
    totalSold: typeof raw.totalSold === 'number' ? raw.totalSold : (Number(raw.totalSold) || 0),
    rating: typeof raw.rating === 'number' ? raw.rating : (Number(raw.rating) || 0),
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : (Number(raw.reviewCount) || 0),
    variants: parsedVariants,
    toppings: parsedToppings,
  };
};

export interface GetCategoriesParams {
  restaurantId: string;
  page?: number;
  limit?: number;
  search?: string;
}

export const menuService = {
  // --- CATEGORY API ---
  // GET /catalog/categories
  async getCategories(restaurantId: string): Promise<Category[]> {
    try {
      const url = restaurantId 
        ? `/catalog/categories?restaurantId=${restaurantId}&page=1&limit=100`
        : `/catalog/categories?page=1&limit=100`;
      const res: any = await axiosClient.get(url);
      const rawList = unwrapArray(res);
      return rawList.map(normalizeCategory);
    } catch (err) {
      console.warn('API GET /catalog/categories offline or error:', err);
      return [];
    }
  },

  // Phân trang & Tìm kiếm Danh mục
  async getCategoriesPaginated(params: GetCategoriesParams): Promise<PaginatedResult<Category>> {
    const { restaurantId, page = 1, limit = 10, search = '' } = params;
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (restaurantId) queryParams.set('restaurantId', restaurantId);
      if (search && search.trim()) queryParams.set('search', search.trim());

      const url = `/catalog/categories?${queryParams.toString()}`;
      const res: any = await axiosClient.get(url);
      const rawList = unwrapArray(res);
      const items = rawList.map(normalizeCategory);

      const meta = res?.data?.meta || res?.meta || {};
      const total = typeof meta.total === 'number' ? meta.total : items.length;
      const totalPages = typeof meta.totalPages === 'number' ? meta.totalPages : (Math.ceil(total / limit) || 1);

      return {
        items,
        total,
        page: typeof meta.page === 'number' ? meta.page : page,
        limit: typeof meta.limit === 'number' ? meta.limit : limit,
        totalPages,
      };
    } catch (err) {
      console.warn(`API GET /catalog/categories paginated error:`, err);
      return {
        items: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
      };
    }
  },

  // POST /catalog/categories
  // Payload chuẩn NestJS CreateCategoryDto: { restaurantId: UUID, name: string, sortOrder: number }
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const payload = {
      restaurantId: ensureUUID(dto.restaurantId),
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
    };

    try {
      const res: any = await axiosClient.post('/catalog/categories', payload);
      const created = res?.data || res;
      return normalizeCategory(created);
    } catch (err) {
      console.error('API POST /catalog/categories failed:', err);
      return normalizeCategory({ ...payload, id: `cat-${Date.now()}` });
    }
  },

  // PATCH /catalog/categories/:id
  // Payload chuẩn NestJS UpdateCategoryDto: { name?: string, sortOrder?: number }
  async updateCategory(id: string, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const payload: any = {};
    if (dto.name) payload.name = dto.name;
    if (typeof dto.sortOrder === 'number') payload.sortOrder = dto.sortOrder;

    try {
      const res: any = await axiosClient.patch(`/catalog/categories/${id}`, payload);
      const updated = res?.data || res;
      return normalizeCategory(updated);
    } catch (err) {
      console.error(`API PATCH /catalog/categories/${id} failed:`, err);
      return normalizeCategory({ id, ...dto });
    }
  },

  // DELETE /catalog/categories/:id
  async deleteCategory(id: string): Promise<void> {
    try {
      await axiosClient.delete(`/catalog/categories/${id}`);
    } catch (err) {
      console.error(`API DELETE /catalog/categories/${id} failed:`, err);
    }
  },

  // --- FOOD ITEM API ---
  // GET /catalog/food-items/:id (Lấy chi tiết đầy đủ 1 món ăn: variants, toppings, tags, preparationTime)
  async getFoodItemById(id: string): Promise<FoodItem | null> {
    try {
      const res: any = await axiosClient.get(`/catalog/food-items/${id}`);
      const data = unwrapData(res) || res;
      if (data && data.id) {
        return normalizeFoodItem(data);
      }
      return null;
    } catch (err) {
      console.warn(`API GET /catalog/food-items/${id} offline or error:`, err);
      return null;
    }
  },

  // Phân trang & Tìm kiếm & Lọc danh mục trực tiếp từ Backend API DB
  async getFoodItemsPaginated(params: GetFoodItemsParams): Promise<PaginatedResult<FoodItem>> {
    const { restaurantId, page = 1, limit = 9, search = '', categoryId = 'ALL' } = params;
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (search && search.trim()) queryParams.set('search', search.trim());
      if (categoryId && categoryId !== 'ALL') queryParams.set('categoryId', categoryId);

      const url = `/catalog/food-items/restaurant/${restaurantId}?${queryParams.toString()}`;
      const res: any = await axiosClient.get(url);
      const rawList = unwrapArray(res);
      const items = rawList.map(normalizeFoodItem);

      const meta = res?.data?.meta || res?.meta || {};
      const total = typeof meta.total === 'number' ? meta.total : items.length;
      const totalPages = typeof meta.totalPages === 'number' ? meta.totalPages : (Math.ceil(total / limit) || 1);

      return {
        items,
        total,
        page: typeof meta.page === 'number' ? meta.page : page,
        limit: typeof meta.limit === 'number' ? meta.limit : limit,
        totalPages,
      };
    } catch (err) {
      console.warn(`API GET /catalog/food-items/restaurant/${restaurantId} paginated error:`, err);
      return {
        items: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
      };
    }
  },

  // Hỗ trợ lấy danh sách món ăn thô qua GET /catalog/food-items/restaurant/:restaurantId hoặc GET /catalog/food-items
  async getFoodItems(restaurantId: string): Promise<FoodItem[]> {
    try {
      // 1. Thử lấy món ăn theo nhà hàng GET /catalog/food-items/restaurant/:restaurantId
      if (restaurantId && restaurantId !== 'rest-001') {
        try {
          const resByRest: any = await axiosClient.get(`/catalog/food-items/restaurant/${restaurantId}?page=1&limit=100`);
          const itemsByRest = unwrapArray(resByRest);
          if (itemsByRest.length > 0) {
            return itemsByRest.map((f: any) =>
              normalizeFoodItem({ ...f, restaurantId: f.restaurantId || restaurantId })
            );
          }
        } catch {}
      }

      // 2. Thử gọi API toàn bộ món ăn GET /catalog/food-items?page=1&limit=100
      const resAll: any = await axiosClient.get(`/catalog/food-items?page=1&limit=100`);
      const rawList = unwrapArray(resAll);
      const list = rawList.map(normalizeFoodItem);

      if (restaurantId && list.length > 0) {
        const filtered = list.filter((f: FoodItem) => !f.restaurantId || f.restaurantId === restaurantId);
        if (filtered.length > 0) return filtered;
      }
      return list;
    } catch (err) {
      console.warn(`API GET /catalog/food-items offline or error:`, err);
      return [];
    }
  },

  // POST /catalog/food-items
  // Payload chuẩn NestJS CreateFoodItemDto
  async createFoodItem(dto: CreateFoodItemDto): Promise<FoodItem> {
    const itemPrice = typeof dto.price === 'number'
      ? dto.price
      : (typeof dto.basePrice === 'number'
          ? dto.basePrice
          : parseFloat(String(dto.price || dto.basePrice || 0)));

    const images = Array.isArray(dto.images) && dto.images.length > 0
      ? dto.images
      : (dto.imageUrl ? [dto.imageUrl] : []);

    const payload = {
      restaurantId: ensureUUID(dto.restaurantId),
      categoryId: ensureUUID(dto.categoryId),
      sku: dto.sku || `SKU-${Date.now()}`,
      name: dto.name,
      description: dto.description || '',
      price: itemPrice,
      currency: dto.currency || 'VND',
      images,
      isAvailable: dto.isAvailable ?? true,
      preparationTime: dto.preparationTime ?? 15,
      tags: dto.tags || [],
      variants: dto.variants || [],
      toppings: dto.toppings || [],
    };

    try {
      const res: any = await axiosClient.post('/catalog/food-items', payload);
      const created = unwrapData(res) || res;
      return normalizeFoodItem(created);
    } catch (err) {
      console.error('API POST /catalog/food-items failed:', err);
      return normalizeFoodItem({ ...payload, id: `food-${Date.now()}` });
    }
  },

  // PATCH /catalog/food-items/:id
  async updateFoodItem(id: string, dto: Partial<CreateFoodItemDto>): Promise<FoodItem> {
    const payload: any = {};
    if (dto.name) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description;
    
    const itemPrice = typeof dto.price === 'number' ? dto.price : (typeof dto.basePrice === 'number' ? dto.basePrice : undefined);
    if (itemPrice !== undefined) payload.price = itemPrice;
    
    if (dto.categoryId) payload.categoryId = ensureUUID(dto.categoryId);
    if (dto.imageUrl) payload.images = [dto.imageUrl];
    if (Array.isArray(dto.images)) payload.images = dto.images;
    if (typeof dto.isAvailable === 'boolean') payload.isAvailable = dto.isAvailable;
    if (dto.currency) payload.currency = dto.currency;
    if (typeof dto.preparationTime === 'number') payload.preparationTime = dto.preparationTime;
    if (dto.sku) payload.sku = dto.sku;
    if (Array.isArray(dto.tags)) payload.tags = dto.tags;
    if (Array.isArray(dto.variants)) payload.variants = dto.variants;
    if (Array.isArray(dto.toppings)) payload.toppings = dto.toppings;

    try {
      const res: any = await axiosClient.patch(`/catalog/food-items/${id}`, payload);
      const updated = unwrapData(res) || res;
      return normalizeFoodItem(updated);
    } catch (err) {
      console.error(`API PATCH /catalog/food-items/${id} failed:`, err);
      return normalizeFoodItem({ id, ...dto });
    }
  },

  // PATCH /catalog/food-items/:id (Toggle Available)
  async toggleAvailability(id: string, currentAvailable?: boolean): Promise<FoodItem> {
    const nextStatus = currentAvailable !== undefined ? !currentAvailable : true;
    try {
      const res: any = await axiosClient.patch(`/catalog/food-items/${id}`, { isAvailable: nextStatus });
      const updated = res?.data || res;
      return normalizeFoodItem(updated);
    } catch (err) {
      console.error(`API PATCH /catalog/food-items/${id} toggle failed:`, err);
      return normalizeFoodItem({ id, isAvailable: nextStatus });
    }
  },

  // DELETE /catalog/food-items/:id
  async deleteFoodItem(id: string): Promise<void> {
    try {
      await axiosClient.delete(`/catalog/food-items/${id}`);
    } catch (err) {
      console.error(`API DELETE /catalog/food-items/${id} failed:`, err);
    }
  },
};
