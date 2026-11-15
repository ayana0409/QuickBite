import { create } from 'zustand';
import { restaurantService, type Restaurant } from '../services/restaurantService';

interface RestaurantState {
  // Current active restaurant for the merchant
  restaurant: Restaurant | null;
  // null = not checked yet; true = owns an active restaurant; false = no restaurant
  hasRestaurant: boolean | null;
  // Indicates if status check is in progress
  isLoading: boolean;
  // Error message if any
  error: string | null;

  // Actions
  setRestaurant: (restaurant: Restaurant | null) => void;
  fetchMyRestaurant: (ownerId: string, force?: boolean) => Promise<Restaurant | null>;
  clearRestaurant: () => void;
}

/**
 * Global store for managing merchant restaurant state across guards and pages.
 * Acts as the Single Source of Truth to prevent stale state issues during routing.
 */
export const useRestaurantStore = create<RestaurantState>()((set, get) => ({
  restaurant: null,
  hasRestaurant: null,
  isLoading: false,
  error: null,

  setRestaurant: (restaurant) =>
    set({
      restaurant,
      hasRestaurant: !!restaurant,
      isLoading: false,
      error: null,
    }),

  fetchMyRestaurant: async (ownerId: string, force = false) => {
    if (!ownerId) {
      set({ restaurant: null, hasRestaurant: false, isLoading: false });
      return null;
    }

    const current = get();
    // Return cached data if already fetched and not forced
    if (!force && current.hasRestaurant !== null && current.restaurant) {
      return current.restaurant;
    }

    set({ isLoading: true, error: null });

    try {
      const data = await restaurantService.getRestaurantByOwner(ownerId);
      set({
        restaurant: data,
        hasRestaurant: !!data,
        isLoading: false,
        error: null,
      });
      return data;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch restaurant info';
      set({
        restaurant: null,
        hasRestaurant: false,
        isLoading: false,
        error: errorMessage,
      });
      return null;
    }
  },

  clearRestaurant: () =>
    set({
      restaurant: null,
      hasRestaurant: null,
      isLoading: false,
      error: null,
    }),
}));
