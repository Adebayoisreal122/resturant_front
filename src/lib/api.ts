import { API_URL } from "./config";
import type { Branch, Category, CreateOrderPayload, MenuItem, Order, OrderStatus, User } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* ---------- token storage (localStorage; the API returns tokens in JSON) ---------- */
interface Tokens { accessToken: string; refreshToken: string }
const TOKEN_KEY = "auth:tokens";

export const tokens = {
  get(): Tokens | null {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; }
  },
  set(t: Tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

let refreshing: Promise<boolean> | null = null;

// One refresh at a time, even if several requests hit 401 together
function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const t = tokens.get();
    if (!t) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: t.refreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();
      tokens.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      tokens.clear();
      window.dispatchEvent(new Event("auth:logout"));
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

interface Options { method?: string; body?: unknown; auth?: boolean }

export async function request<T>(path: string, { method = "GET", body, auth = true }: Options = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const t = tokens.get();
  if (auth && t) headers.Authorization = `Bearer ${t.accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  if (res.status === 401 && auth && t && !retried && !path.startsWith("/auth/")) {
    if (await refreshTokens()) return request<T>(path, { method, body, auth }, true);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || "Something went wrong. Please try again.", res.status);
  return data as T;
}

// Public menu data is remembered, so the menu still opens with a weak connection
async function cachedGet<T>(path: string): Promise<T> {
  const key = `cache:${path}`;
  try {
    const data = await request<T>(path, { auth: false });
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage full */ }
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    }
    throw err;
  }
}

/* ---------- endpoints ---------- */
interface AuthResult { user: User; accessToken: string; refreshToken: string }

export const api = {
  auth: {
    register: (b: { name: string; phone: string; email?: string; password: string }) =>
      request<AuthResult>("/auth/register", { method: "POST", body: b, auth: false }),
    login: (b: { phone: string; password: string }) => request<AuthResult>("/auth/login", { method: "POST", body: b, auth: false }),
    me: () => request<{ user: User }>("/auth/me"),
    logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  },
  branches: { list: () => cachedGet<{ branches: Branch[] }>("/branches") },
  categories: { list: () => cachedGet<{ categories: Category[] }>("/categories") },
  menu: {
    list: (branch: string) => cachedGet<{ items: MenuItem[] }>(`/menu?branch=${encodeURIComponent(branch)}`),
  },
  orders: {
    create: (b: CreateOrderPayload) => request<{ order: Order }>("/orders", { method: "POST", body: b }),
    list: (page = 1) => request<{ orders: Order[]; total: number; pages: number }>(`/orders?page=${page}&limit=20`),
    get: (id: string) => request<{ order: Order; nextStatus: OrderStatus | null }>(`/orders/${id}`),
    cancel: (id: string, reason?: string) =>
      request<{ order: Order }>(`/orders/${id}/status`, { method: "PATCH", body: { status: "cancelled", reason } }),
  },
  payments: {
    initialize: (orderId: string) =>
      request<{ authorizationUrl: string; reference: string }>("/payments/paystack/initialize", { method: "POST", body: { orderId } }),
    verify: (reference: string) => request<{ paid: boolean; order: Order }>(`/payments/paystack/verify/${encodeURIComponent(reference)}`),
  },
};
