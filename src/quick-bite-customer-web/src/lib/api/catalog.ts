import { Restaurant, RestaurantDetail, FoodItem, ApiResponse, PaginatedResult } from '@/src/types/catalog.type';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, '') ||
  'https://quick-bite-gw.onrender.com';

/**
 * Fetch restaurants list via API Gateway
 * Uses native Next.js fetch with ISR revalidation every 60s
 */
export async function getRestaurants(page = 1, limit = 8): Promise<Restaurant[]> {
  try {
    const url = `${GATEWAY_URL}/restaurants?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[getRestaurants] Gateway error status: ${res.status} (${url})`);
      return [];
    }

    const json: ApiResponse<PaginatedResult<Restaurant> | Restaurant[]> = await res.json();
    
    if (json?.data) {
      if (Array.isArray(json.data)) {
        return json.data;
      }
      if ('data' in json.data && Array.isArray(json.data.data)) {
        return json.data.data;
      }
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
    const url = `${GATEWAY_URL}/food-items?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[getFeaturedFoods] Gateway error status: ${res.status} (${url})`);
      return [];
    }

    const json: ApiResponse<PaginatedResult<FoodItem> | FoodItem[]> = await res.json();

    if (json?.data) {
      let items: FoodItem[] = [];
      if (Array.isArray(json.data)) {
        items = json.data;
      } else if ('data' in json.data && Array.isArray(json.data.data)) {
        items = json.data.data;
      }

      if (items.length > 0) {
        return items.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
      }
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[getRestaurantById] Gateway error status: ${res.status} (${url})`);
      return null;
    }

    const json: ApiResponse<RestaurantDetail> = await res.json();
    return json?.data ?? null;
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
    const url = `${GATEWAY_URL}/food-items/restaurant/${restaurantId}?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[getFoodsByRestaurant] Gateway error status: ${res.status} (${url})`);
      return [];
    }

    const json: ApiResponse<PaginatedResult<FoodItem> | FoodItem[]> = await res.json();

    if (json?.data) {
      if (Array.isArray(json.data)) return json.data;
      if ('data' in json.data && Array.isArray(json.data.data)) return json.data.data;
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[getFoodById] Gateway error status: ${res.status} (${url})`);
      return null;
    }

    const json: ApiResponse<FoodItem> = await res.json();
    return json?.data ?? null;
  } catch (error) {
    console.error(`[getFoodById] Failed to fetch (${GATEWAY_URL}/food-items/${id}):`, error);
    return null;
  }
}

