import {
  Restaurant,
  RestaurantDetail,
  FoodItem,
  ApiResponse,
  PaginatedResult,
  SearchFoodParams,
  NearbyRestaurantParams,
  NearbyRestaurant,
} from '@/src/types/catalog.type';
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
 * Fetch trending food items via API Gateway
 * Calculated by trending_score = totalSold * 0.7 + rating * 30, cached for 30 minutes
 */
export async function getTrendingFoods(limit = 8): Promise<FoodItem[]> {
  try {
    const url = `${GATEWAY_URL}/catalog/recommendations/trending`;
    const json = await apiClient<ApiResponse<FoodItem[]> | FoodItem[]>(url, {
      params: { limit },
      next: { revalidate: 300 }, // Cache on Next.js edge for 5 minutes
    });

    if (Array.isArray(json)) return json;
    if ((json as any)?.data && Array.isArray((json as any).data)) {
      return (json as any).data;
    }

    return [];
  } catch (error) {
    console.error(`[getTrendingFoods] Failed to fetch from Gateway (${GATEWAY_URL}):`, error);
    // Fallback to getFeaturedFoods if recommendation endpoint fails
    return getFeaturedFoods(1, limit);
  }
}

/**
 * Fetch similar food items by Category and Tag overlap
 */
export async function getSimilarFoods(foodId: string, limit = 8): Promise<FoodItem[]> {
  try {
    const url = `${GATEWAY_URL}/catalog/recommendations/similar-foods/${foodId}`;
    const json = await apiClient<ApiResponse<FoodItem[]> | FoodItem[]>(url, {
      params: { limit },
      next: { revalidate: 300 },
    });

    if (Array.isArray(json)) return json;
    if ((json as any)?.data && Array.isArray((json as any).data)) {
      return (json as any).data;
    }

    return [];
  } catch (error) {
    console.error(`[getSimilarFoods] Failed to fetch for ${foodId}:`, error);
    return [];
  }
}

/**
 * Fetch nearby restaurants using PostGIS ST_DWithin
 */
export async function getNearbyRestaurants(
  params: NearbyRestaurantParams,
): Promise<NearbyRestaurant[]> {
  try {
    const url = `${GATEWAY_URL}/catalog/recommendations/nearby`;
    const json = await apiClient<ApiResponse<NearbyRestaurant[]> | NearbyRestaurant[]>(url, {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 5000,
        limit: params.limit || 12,
      },
      // Do not cache personalized geo-queries heavily
      cache: 'no-store',
    });

    if (Array.isArray(json)) return json;
    if ((json as any)?.data && Array.isArray((json as any).data)) {
      return (json as any).data;
    }

    return [];
  } catch (error) {
    console.error(`[getNearbyRestaurants] Failed to fetch nearby restaurants:`, error);
    return [];
  }
}

/**
 * Advanced Full-Text Search with filters and optional proximity scoring
 */
export async function searchFoods(
  params: SearchFoodParams,
): Promise<{ data: FoodItem[]; meta?: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const url = `${GATEWAY_URL}/catalog/search`;
    const cleanParams: Record<string, any> = {};
    if (params.q) cleanParams.q = params.q;
    if (params.lat != null) cleanParams.lat = params.lat;
    if (params.lng != null) cleanParams.lng = params.lng;
    if (params.minPrice != null) cleanParams.minPrice = params.minPrice;
    if (params.maxPrice != null) cleanParams.maxPrice = params.maxPrice;
    if (params.minRating != null) cleanParams.minRating = params.minRating;
    if (params.page != null) cleanParams.page = params.page;
    if (params.limit != null) cleanParams.limit = params.limit;

    const json = await apiClient<ApiResponse<{ data: FoodItem[]; meta: any }> | { data: FoodItem[]; meta: any }>(url, {
      params: cleanParams,
      // Short cache or no cache for search queries
      next: { revalidate: 30 },
    });

    if ((json as any)?.data?.data && Array.isArray((json as any).data.data)) {
      return {
        data: (json as any).data.data,
        meta: (json as any).data.meta,
      };
    }
    if ((json as any)?.data && Array.isArray((json as any).data)) {
      return {
        data: (json as any).data,
        meta: (json as any).meta,
      };
    }

    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error(`[searchFoods] Failed to search:`, error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
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

/**
 * Fetch the restaurant owned by the current authenticated user via GET /restaurants/me
 */
export async function getMyRestaurant(accessToken?: string): Promise<Restaurant | null> {
  if (!accessToken) return null;

  try {
    const url = `${GATEWAY_URL}/restaurants/me`;
    const json = await apiClient<ApiResponse<Restaurant> | Restaurant>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return ((json as any)?.data ?? json) || null;
  } catch (error) {
    // 404 or other error means user does not have a restaurant yet
    return null;
  }
}


