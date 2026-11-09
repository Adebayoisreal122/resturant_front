import { request } from "./api";
import type { CashOwed, Order, OrderStatus } from "./types";

export const riderApi = {
  // Deliveries assigned to this rider that are still in progress
  active: () => request<{ orders: Order[] }>("/orders?status=confirmed,preparing,ready,out_for_delivery&limit=50"),
  delivered: (from: string, to: string) => request<{ orders: Order[] }>(`/orders?status=delivered&from=${from}&to=${to}&limit=100`),
  setStatus: (id: string, status: OrderStatus, cashCollected?: number) =>
    request<{ order: Order }>(`/orders/${id}/status`, { method: "PATCH", body: { status, ...(cashCollected !== undefined ? { cashCollected } : {}) } }),
  setOnline: (isOnline: boolean) => request<{ isOnline: boolean }>("/riders/me/status", { method: "PATCH", body: { isOnline } }),
  cash: () => request<CashOwed>("/riders/me/cash"),
};
