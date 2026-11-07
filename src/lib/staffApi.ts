import { request } from "./api";
import type { AvailableRider, Branch, CreateOrderPayload, Order, OrderStatus, PaymentMethod, Shift, ShiftLive } from "./types";

const ACTIVE = "pending,confirmed,preparing,ready,out_for_delivery";
const DONE = "delivered,completed,cancelled,refunded";

export const staffApi = {
  orders: {
    // Everything still in progress at this staff member's branch
    active: () => request<{ orders: Order[] }>(`/orders?status=${ACTIVE}&limit=100`),
    // Finished today (Lagos time), newest first
    doneToday: (day: string) => request<{ orders: Order[] }>(`/orders?status=${DONE}&from=${day}&to=${day}&limit=100`),
    create: (b: unknown) => request<{ order: Order }>("/orders", { method: "POST", body: b as CreateOrderPayload }),
    setStatus: (id: string, status: OrderStatus, extra: { reason?: string; cashCollected?: number } = {}) =>
      request<{ order: Order; refundRequired?: boolean }>(`/orders/${id}/status`, { method: "PATCH", body: { status, ...extra } }),
    pay: (id: string, b: { method: Exclude<PaymentMethod, "pay_on_delivery">; reference?: string; amount?: number }) =>
      request<{ order: Order }>(`/orders/${id}/payment`, { method: "POST", body: b }),
    assignRider: (id: string, riderId: string) => request<{ order: Order }>(`/orders/${id}/rider`, { method: "PATCH", body: { riderId } }),
  },
  riders: { available: () => request<{ riders: AvailableRider[] }>("/riders/available") },
  shifts: {
    current: () => request<{ shift: Shift | null; live?: ShiftLive }>("/shifts/current"),
    open: (openingFloat: number) => request<{ shift: Shift }>("/shifts/open", { method: "POST", body: { openingFloat } }),
    close: (declared: { cash: number; transfer: number; pos_terminal: number }, notes?: string) =>
      request<{ shift: Shift }>("/shifts/close", { method: "POST", body: { declared, notes } }),
    mine: () => request<{ shifts: Shift[] }>("/shifts?status=closed"),
  },
  branch: (id: string) => request<{ branch: Branch }>(`/branches/${id}`, { auth: false }),
};
