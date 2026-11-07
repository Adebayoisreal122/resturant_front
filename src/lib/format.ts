import type { OrderStatus, OrderType } from "./types";

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const nairaExact = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 });

export const formatNaira = (n: number) => (Number.isInteger(n) ? naira.format(n) : nairaExact.format(n));

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Colour = meaning: orange waiting/cooking, blue moving, green done, red problem
export const STATUS_TONE: Record<OrderStatus, "accent" | "secondary" | "success" | "primary" | "neutral"> = {
  pending: "accent",
  confirmed: "secondary",
  preparing: "accent",
  ready: "success",
  out_for_delivery: "secondary",
  delivered: "success",
  completed: "success",
  cancelled: "primary",
  refunded: "neutral",
};

export const TIMELINE: Record<OrderType, OrderStatus[]> = {
  delivery: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  takeaway: ["pending", "confirmed", "preparing", "ready", "completed"],
  dine_in: ["pending", "confirmed", "preparing", "ready", "completed"],
};

export const normalizePhone = (input: string) => {
  const p = input.replace(/[\s\-()]/g, "");
  if (p.startsWith("+234")) return p;
  if (p.startsWith("234")) return "+" + p;
  if (p.startsWith("0")) return "+234" + p.slice(1);
  if (/^[789]\d{9}$/.test(p)) return "+234" + p;
  return p;
};
export const isValidNgPhone = (p: string) => /^\+234[789]\d{9}$/.test(normalizePhone(p));
