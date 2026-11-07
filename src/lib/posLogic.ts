// The rules the POS screens follow. Pure functions, so they can be checked against the real API.
import type { CartLine } from "@/context/CartContext";
import type { Order, OrderStatus, OrderType, PaymentMethod, Role } from "./types";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const lineTotal = (l: Pick<CartLine, "unitPrice" | "addOns" | "quantity">) => (l.unitPrice + l.addOns.reduce((s, a) => s + a.price, 0)) * l.quantity;

export const changeDue = (total: number, tendered: number) => (Number.isFinite(tendered) && tendered >= total ? round2(tendered - total) : 0);
export const minutesAgo = (iso: string, now = Date.now()) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

/* ---------- building an order from the POS screen ---------- */
export interface PosDraft {
  type: OrderType;
  table: string;
  lines: Pick<CartLine, "menuItem" | "quantity" | "variant" | "addOns" | "note" | "unitPrice">[];
  zone: string;
  address: string;
  phone: string;
  method: Exclude<PaymentMethod, "card_online">;
  paidNow: boolean;
}

export function validateDraft(d: PosDraft, hasDeliveryZones: boolean): string | null {
  if (d.lines.length === 0) return "Add at least one item.";
  if (d.type === "delivery") {
    if (!hasDeliveryZones) return "This branch has no delivery areas set up.";
    if (!d.zone) return "Choose the delivery area.";
    if (d.address.trim().length < 5) return "Enter the delivery address.";
    if (!/^(\+?234|0)?[789]\d{9}$/.test(d.phone.replace(/[\s\-()]/g, ""))) return "Enter the customer's phone number.";
  }
  if (d.method === "pay_on_delivery" && d.type !== "delivery") return "Pay on delivery only applies to delivery orders.";
  return null;
}

export function buildOrderPayload(d: PosDraft, normalizePhone: (s: string) => string) {
  return {
    type: d.type,
    ...(d.type === "dine_in" && d.table.trim() ? { tableNumber: d.table.trim() } : {}),
    items: d.lines.map((l) => ({ menuItem: l.menuItem, quantity: l.quantity, variant: l.variant, addOns: l.addOns.map((a) => a.name), note: l.note })),
    ...(d.type === "delivery" ? { delivery: { address: d.address.trim(), zone: d.zone, phone: normalizePhone(d.phone) } } : {}),
    payment: { method: d.method, paid: d.paidNow && d.method !== "pay_on_delivery" },
  };
}

/* ---------- what can staff do with an order right now? ---------- */
export type ActionId = "confirm" | "start" | "ready" | "complete" | "pay" | "assign" | "cancel";
export interface OrderAction { id: ActionId; label: string; status?: OrderStatus; tone: "primary" | "secondary" | "accent" | "success" | "outline" }

export const FINAL: OrderStatus[] = ["delivered", "completed", "cancelled", "refunded"];
const STAFF: Role[] = ["super_admin", "branch_manager", "worker"];

export function actionsFor(o: Order, role: Role, workerType?: string): OrderAction[] {
  if (!STAFF.includes(role) || FINAL.includes(o.status)) return [];
  const paid = o.payment.status === "paid";
  const out: OrderAction[] = [];
  // Money is taken at the counter, except pay-on-delivery which the rider collects
  const needsCounterPayment = !paid && o.payment.method !== "pay_on_delivery";

  if (o.status === "pending") {
    if (o.payment.method === "card_online" && !paid) { if (!(role === "worker" && workerType === "kitchen")) out.push({ id: "pay", label: "Mark as paid", tone: "accent" }); } // waiting for Paystack; manual fallback
    else out.push({ id: "confirm", label: "Confirm order", status: "confirmed", tone: "success" });
  } else if (o.status === "confirmed") out.push({ id: "start", label: "Start cooking", status: "preparing", tone: "accent" });
  else if (o.status === "preparing") out.push({ id: "ready", label: "Mark ready", status: "ready", tone: "success" });
  else if (o.status === "ready") {
    if (o.type === "delivery") {
      if (!o.delivery?.rider) out.push({ id: "assign", label: "Assign rider", tone: "secondary" });
    } else if (paid) out.push({ id: "complete", label: o.type === "dine_in" ? "Served and done" : "Handed over", status: "completed", tone: "success" });
  }
  const handlesMoney = !(role === "worker" && workerType === "kitchen"); // kitchen staff have no shift, so no cash handling
  if (needsCounterPayment && o.status !== "pending" && handlesMoney && !out.some((a) => a.id === "pay")) out.push({ id: "pay", label: "Take payment", tone: "primary" });
  if (o.status === "confirmed" && o.type === "delivery" && !o.delivery?.rider) out.push({ id: "assign", label: "Assign rider", tone: "secondary" });
  if (["pending", "confirmed", "preparing"].includes(o.status)) out.push({ id: "cancel", label: "Cancel", status: "cancelled", tone: "outline" });
  return out;
}

/** The order the kitchen board shows: confirmed and onwards, not yet handed off */
export const kitchenColumn = (o: Order): "new" | "cooking" | "ready" | null =>
  o.status === "confirmed" ? "new" : o.status === "preparing" ? "cooking" : o.status === "ready" ? "ready" : null;

export const ageTone = (mins: number): "success" | "accent" | "primary" => (mins < 10 ? "success" : mins < 20 ? "accent" : "primary");
