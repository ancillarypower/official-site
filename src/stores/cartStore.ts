import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  icon: string | null;
  img: string | null;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, delta: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  getQty: (id: number) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQty: (id, delta) =>
        set((state) => {
          const items = state.items
            .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0);
          return { items };
        }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

      getQty: (id) => get().items.find((i) => i.id === id)?.qty ?? 0,
    }),
    { name: "ap-cart" },
  ),
);
