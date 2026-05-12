import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const existing = get().items.find((i) => i.id === product.id);
        if (existing) {
          get().updateQuantity(product.id, existing.quantity + 1);
        } else {
          set({ items: [...get().items, { ...product, quantity: 1 }] });
        }
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });
      },
      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "cart-storage" }
  )
);