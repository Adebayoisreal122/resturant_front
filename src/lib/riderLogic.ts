// What a rider can do with a delivery, and the money rules. Pure, so it can be checked against the real API.
import type { Order, OrderStatus } from "./types";

export interface RiderAction { id: "pickup" | "deliver"; label: string; status: OrderStatus }

export function riderAction(o: Order): RiderAction | null {
  if (o.type !== "delivery") return null;
  if (o.status === "ready") return { id: "pickup", label: "I've picked it up", status: "out_for_delivery" };
  if (o.status === "out_for_delivery") return { id: "deliver", label: "Delivered", status: "delivered" };
  return null;
}

/** Cash the rider must collect from the customer. Zero if it was already paid online or at the counter. */
export const cashToCollect = (o: Order) => (o.payment.method === "pay_on_delivery" && o.payment.status !== "paid" ? o.total : 0);

export const changeToGive = (total: number, given: number) => (Number.isFinite(given) && given >= total ? Math.round((given - total) * 100) / 100 : 0);

export const waitingNote = (o: Order): string | null =>
  o.status === "confirmed" ? "The kitchen has it. Wait for the ready alert."
  : o.status === "preparing" ? "Being cooked. Wait for the ready alert."
  : null;

export const mapsUrl = (address: string, zone?: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, zone].filter(Boolean).join(", "))}`;
