import { request } from "./api";
import type { MenuItem, Order, Shift, ShiftLive } from "./types";

export interface ShiftDetail {
  shift: Shift;
  orders: { _id: string; orderNumber: string; type: string; total: number; payment: { method: string; status: string }; createdAt: string }[];
  live?: ShiftLive;
}
export interface RiderCashRow { rider: { _id: string; name: string; phone?: string }; count: number; expected: number; since: string }
export interface Remittance { _id: string; rider: { _id: string; name: string }; receivedBy: { _id: string; name: string }; expected: number; received: number; variance: number; note?: string; createdAt: string }
export type BranchMenuItem = MenuItem & { isAvailable: boolean };

export const managerApi = {
  shifts: {
    list: (q: { status?: "open" | "closed"; variance?: boolean } = {}) =>
      request<{ shifts: Shift[] }>(`/shifts?${[q.status && `status=${q.status}`, q.variance && "variance=true"].filter(Boolean).join("&")}`),
    get: (id: string) => request<ShiftDetail>(`/shifts/${id}`),
    review: (id: string, note?: string) => request<{ shift: Shift }>(`/shifts/${id}/review`, { method: "PATCH", body: { note } }),
  },
  cash: {
    summary: () => request<{ totalOwed: number; riders: RiderCashRow[] }>("/riders/cash"),
    remit: (riderId: string, amountReceived: number, note?: string) =>
      request<{ remittance: Remittance }>(`/riders/${riderId}/remit`, { method: "POST", body: { amountReceived, note } }),
    remittances: () => request<{ remittances: Remittance[] }>("/riders/remittances"),
  },
  menu: {
    forBranch: (branchId: string) => request<{ items: BranchMenuItem[] }>(`/menu?branch=${branchId}&includeUnavailable=true`, { auth: false }),
    setAvailability: (itemId: string, branchId: string, isAvailable: boolean) =>
      request<{ item: MenuItem }>(`/menu/${itemId}/branches/${branchId}`, { method: "PATCH", body: { isAvailable } }),
  },
  refunds: {
    cancelled: (from: string, to: string) => request<{ orders: Order[] }>(`/orders?status=cancelled&from=${from}&to=${to}&limit=100`),
    refund: (id: string, body: { manual?: boolean; note?: string }) => request<{ order: Order }>(`/orders/${id}/refund`, { method: "POST", body }),
  },
};
