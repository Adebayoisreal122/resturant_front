"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  key: string;
  menuItem: string;
  name: string;
  image?: string;
  unitPrice: number; // variant or base price, before add-ons (display only; the server reprices)
  variant?: string;
  addOns: { name: string; price: number }[];
  quantity: number;
  note?: string;
}

export type CartOrderType = "delivery" | "takeaway";

interface CartState {
  hydrated: boolean;
  branchId: string | null;
  orderType: CartOrderType;
  lines: CartLine[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setBranch: (id: string) => boolean;
  setOrderType: (t: CartOrderType) => void;
  addLine: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE = "cart:v1";

export const lineUnitTotal = (l: CartLine) => l.unitPrice + l.addOns.reduce((s, a) => s + a.price, 0);
export const makeKey = (l: Omit<CartLine, "key">) =>
  [l.menuItem, l.variant || "", l.addOns.map((a) => a.name).sort().join("+"), l.note || ""].join("|");

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [orderType, setOrderTypeState] = useState<CartOrderType>("delivery");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (saved) {
        setBranchId(saved.branchId ?? null);
        setOrderTypeState(saved.orderType === "takeaway" ? "takeaway" : "delivery");
        setLines(Array.isArray(saved.lines) ? saved.lines : []);
      }
    } catch { /* ignore corrupted storage */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE, JSON.stringify({ branchId, orderType, lines }));
  }, [hydrated, branchId, orderType, lines]);

  const setBranch = useCallback(
    (id: string) => {
      if (id === branchId) return true;
      if (lines.length > 0) {
        const ok = window.confirm("Switching branch will empty your cart, because menus and prices can differ. Continue?");
        if (!ok) return false;
        setLines([]);
      }
      setBranchId(id);
      return true;
    },
    [branchId, lines.length]
  );

  const addLine = useCallback((line: Omit<CartLine, "key">) => {
    const key = makeKey(line);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l));
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l))));
  }, []);

  const value = useMemo<CartState>(
    () => ({
      hydrated,
      branchId,
      orderType,
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: lines.reduce((s, l) => s + lineUnitTotal(l) * l.quantity, 0),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      setBranch,
      setOrderType: setOrderTypeState,
      addLine,
      setQuantity,
      removeLine: (key) => setLines((p) => p.filter((l) => l.key !== key)),
      clear: () => setLines([]),
    }),
    [hydrated, branchId, orderType, lines, drawerOpen, setBranch, addLine, setQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
