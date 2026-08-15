import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, DeliveryAddress } from '../types/order.type';

export interface AddItemInput {
  foodItemId: string;
  name: string;
  price: number;
  unitPrice: number;
  imageUrl?: string;
  quantity: number;
  selectedVariant: string | null;
  selectedToppings: string[];
  note?: string;
}

export interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
  isCartOpen: boolean;
  deliveryAddress: DeliveryAddress | null;

  // Actions
  addItem: (item: AddItemInput, restId: string, restName?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setDeliveryAddress: (address: DeliveryAddress) => void;
  
  // Helpers
  getTotalItems: () => number;
  getTotalAmount: () => number;
}

// Generate unique identifier for an item configuration
export function generateCartItemId(
  foodItemId: string,
  selectedVariant: string | null,
  selectedToppings: string[]
): string {
  const sortedToppings = [...(selectedToppings || [])].sort().join(',');
  return `${foodItemId}__${selectedVariant || 'none'}__${sortedToppings}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],
      isCartOpen: false,
      deliveryAddress: null,

      addItem: (itemInput, restId, restName) => {
        const state = get();

        // 1. Check Restaurant Conflict
        if (state.restaurantId && state.items.length > 0 && state.restaurantId !== restId) {
          throw new Error('DIFFERENT_RESTAURANT');
        }

        const cartItemId = generateCartItemId(
          itemInput.foodItemId,
          itemInput.selectedVariant,
          itemInput.selectedToppings
        );

        const existingItemIndex = state.items.findIndex((i) => i.id === cartItemId);
        let updatedItems: CartItem[];

        if (existingItemIndex > -1) {
          // Update quantity of existing item
          updatedItems = [...state.items];
          const current = updatedItems[existingItemIndex];
          const newQuantity = current.quantity + itemInput.quantity;
          updatedItems[existingItemIndex] = {
            ...current,
            quantity: newQuantity,
            totalItemPrice: current.unitPrice * newQuantity,
            note: itemInput.note || current.note,
          };
        } else {
          // Add new item to cart
          const newItem: CartItem = {
            id: cartItemId,
            foodItemId: itemInput.foodItemId,
            name: itemInput.name,
            price: itemInput.price,
            unitPrice: itemInput.unitPrice,
            imageUrl: itemInput.imageUrl,
            quantity: itemInput.quantity,
            selectedVariant: itemInput.selectedVariant,
            selectedToppings: itemInput.selectedToppings,
            totalItemPrice: itemInput.unitPrice * itemInput.quantity,
            note: itemInput.note,
          };
          updatedItems = [...state.items, newItem];
        }

        set({
          restaurantId: restId,
          restaurantName: restName || state.restaurantName || null,
          items: updatedItems,
        });
      },

      removeItem: (itemId: string) => {
        const remainingItems = get().items.filter((item) => item.id !== itemId);
        set({
          items: remainingItems,
          restaurantId: remainingItems.length === 0 ? null : get().restaurantId,
          restaurantName: remainingItems.length === 0 ? null : get().restaurantName,
        });
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const updatedItems = get().items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity,
              totalItemPrice: item.unitPrice * quantity,
            };
          }
          return item;
        });

        set({ items: updatedItems });
      },

      clearCart: () => {
        set({
          restaurantId: null,
          restaurantName: null,
          items: [],
        });
      },

      setCartOpen: (open: boolean) => {
        set({ isCartOpen: open });
      },

      setDeliveryAddress: (address: DeliveryAddress) => {
        set({ deliveryAddress: address });
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.totalItemPrice, 0);
      },
    }),
    {
      name: 'qb-cart-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist cart content and saved delivery address, avoid persisting drawer open state
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        items: state.items,
        deliveryAddress: state.deliveryAddress,
      }),
    }
  )
);
