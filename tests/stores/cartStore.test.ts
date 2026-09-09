import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/stores/cartStore";

const sampleItem = { id: 1, name: "Test Item", price: 10.0, icon: "🎧", img: null };

describe("cartStore", () => {
  beforeEach(() => { useCartStore.setState({ items: [] }); });

  it("starts with empty cart", () => {
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });

  it("adds an item", () => {
    useCartStore.getState().addItem(sampleItem);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]?.qty).toBe(1);
    expect(items[0]?.name).toBe("Test Item");
  });

  it("adds quantity to existing item", () => {
    useCartStore.getState().addItem(sampleItem, 2);
    useCartStore.getState().addItem(sampleItem, 3);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(5);
  });

  it("adds different items separately", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().addItem({ ...sampleItem, id: 2, name: "Other" });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("updates quantity with delta", () => {
    useCartStore.getState().addItem(sampleItem, 3);
    useCartStore.getState().updateQty(1, -1);
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
  });

  it("removes item when quantity reaches 0", () => {
    useCartStore.getState().addItem(sampleItem, 1);
    useCartStore.getState().updateQty(1, -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removes item by id", () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("calculates totalItems correctly", () => {
    useCartStore.getState().addItem(sampleItem, 3);
    useCartStore.getState().addItem({ ...sampleItem, id: 2 }, 2);
    expect(useCartStore.getState().totalItems()).toBe(5);
  });

  it("calculates totalPrice correctly", () => {
    useCartStore.getState().addItem({ ...sampleItem, price: 10 }, 2);
    useCartStore.getState().addItem({ ...sampleItem, id: 2, price: 25 }, 1);
    expect(useCartStore.getState().totalPrice()).toBe(45);
  });

  it("getQty returns 0 for unknown item", () => {
    expect(useCartStore.getState().getQty(999)).toBe(0);
  });

  it("getQty returns correct quantity", () => {
    useCartStore.getState().addItem(sampleItem, 7);
    expect(useCartStore.getState().getQty(1)).toBe(7);
  });

  it("clearCart empties everything", () => {
    useCartStore.getState().addItem(sampleItem, 5);
    useCartStore.getState().addItem({ ...sampleItem, id: 2 }, 3);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().totalItems()).toBe(0);
  });
});
