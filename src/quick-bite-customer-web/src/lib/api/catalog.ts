import { Restaurant, RestaurantDetail, FoodItem, ApiResponse, PaginatedResult } from '@/src/types/catalog.type';
import { apiClient } from './apiClient';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

/**
 * Fetch restaurants list via API Gateway
 * Uses native Next.js fetch with ISR revalidation every 60s
 */
export async function getRestaurants(page = 1, limit = 8): Promise<Restaurant[]> {
  try {
    const url = `${GATEWAY_URL}/restaurants`;
    const json = await apiClient<ApiResponse<PaginatedResult<Restaurant> | Restaurant[]> | Restaurant[]>(url, {
      params: { page, limit },
      next: { revalidate: 60 },
    });

    if (Array.isArray(json)) return json;
    if ((json as any)?.data) {
      const data = (json as any).data;
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
    }

    return [];
  } catch (error) {
    console.error(`[getRestaurants] Failed to fetch from Gateway (${GATEWAY_URL}):`, error);
    return [];
  }
}

/**
 * Fetch food items via API Gateway
 * Sorted by totalSold or defaults to paginated list
 */
export async function getFeaturedFoods(page = 1, limit = 8): Promise<FoodItem[]> {
  try {
    const url = `${GATEWAY_URL}/food-items`;
    const json = await apiClient<ApiResponse<PaginatedResult<FoodItem> | FoodItem[]> | FoodItem[]>(url, {
      params: { page, limit },
      next: { revalidate: 60 },
    });

    let items: FoodItem[] = [];
    if (Array.isArray(json)) {
      items = json;
    } else if ((json as any)?.data) {
      const data = (json as any).data;
      if (Array.isArray(data)) items = data;
      else if (data?.data && Array.isArray(data.data)) items = data.data;
    }

    if (items.length > 0) {
      return items.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
    }

    return [];
  } catch (error) {
    console.error(`[getFeaturedFoods] Failed to fetch from Gateway (${GATEWAY_URL}):`, error);
    return [];
  }
}

/**
 * Fetch a single restaurant detail by ID via API Gateway
 * Returns full info: id, name, address, status, rating, categories
 */
export async function getRestaurantById(id: string): Promise<RestaurantDetail | null> {
  try {
    const url = `${GATEWAY_URL}/restaurants/${id}`;
    const json = await apiClient<ApiResponse<RestaurantDetail> | RestaurantDetail>(url, {
      next: { revalidate: 60 },
    });
    return ((json as any)?.data ?? json) || null;
  } catch (error) {
    console.error(`[getRestaurantById] Failed to fetch (${GATEWAY_URL}/restaurants/${id}):`, error);
    return null;
  }
}

/**
 * Fetch food items belonging to a specific restaurant via API Gateway
 */
export async function getFoodsByRestaurant(
  restaurantId: string,
  page = 1,
  limit = 20,
): Promise<FoodItem[]> {
  try {
    const url = `${GATEWAY_URL}/food-items/restaurant/${restaurantId}`;
    const json = await apiClient<ApiResponse<PaginatedResult<FoodItem> | FoodItem[]> | FoodItem[]>(url, {
      params: { page, limit },
      next: { revalidate: 60 },
    });

    if (Array.isArray(json)) return json;
    if ((json as any)?.data) {
      const data = (json as any).data;
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
    }

    return [];
  } catch (error) {
    console.error(`[getFoodsByRestaurant] Failed to fetch for restaurant ${restaurantId}:`, error);
    return [];
  }
}

/**
 * Fetch a single food item detail by ID via API Gateway
 */
export async function getFoodById(id: string): Promise<FoodItem | null> {
  try {
    const url = `${GATEWAY_URL}/food-items/${id}`;
    const json = await apiClient<ApiResponse<FoodItem> | FoodItem>(url, {
      next: { revalidate: 60 },
    });
    return ((json as any)?.data ?? json) || null;
  } catch (error) {
    console.error(`[getFoodById] Failed to fetch (${GATEWAY_URL}/food-items/${id}):`, error);
    return null;
  }
}
