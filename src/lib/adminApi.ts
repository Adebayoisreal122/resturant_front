import { request } from "./api";
import type { AdminBranch, AdminMenuItem, Branch, Category, ReportSummary, Role, StaffUser, User } from "./types";

const qs = (o: Record<string, string | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join("&");
  return p ? `?${p}` : "";
};

export const admin = {
  branches: {
    list: () => request<{ branches: AdminBranch[] }>("/branches"), // with a token, admins also see inactive branches
    get: (id: string) => request<{ branch: AdminBranch }>(`/branches/${id}`, { auth: false }),
    create: (b: unknown) => request<{ branch: Branch }>("/branches", { method: "POST", body: b }),
    update: (id: string, b: unknown) => request<{ branch: Branch }>(`/branches/${id}`, { method: "PATCH", body: b }),
    deactivate: (id: string) => request<{ branch: Branch }>(`/branches/${id}`, { method: "DELETE" }),
    reactivate: (id: string) => request<{ branch: Branch }>(`/branches/${id}`, { method: "PATCH", body: { isActive: true } }),
  },
  categories: {
    list: () => request<{ categories: Category[] }>("/categories", { auth: false }),
    create: (b: { name: string; sortOrder?: number }) => request<{ category: Category }>("/categories", { method: "POST", body: b }),
    update: (id: string, b: { name?: string; sortOrder?: number }) => request<{ category: Category }>(`/categories/${id}`, { method: "PATCH", body: b }),
  },
  menu: {
    list: () => request<{ items: AdminMenuItem[] }>("/menu", { auth: false }), // no branch = every active dish with its branch rules
    get: (id: string) => request<{ item: AdminMenuItem }>(`/menu/${id}`, { auth: false }),
    create: (b: unknown) => request<{ item: AdminMenuItem }>("/menu", { method: "POST", body: b }),
    update: (id: string, b: unknown) => request<{ item: AdminMenuItem }>(`/menu/${id}`, { method: "PATCH", body: b }),
    remove: (id: string) => request<{ message: string }>(`/menu/${id}`, { method: "DELETE" }),
  },
  users: {
    // The API filters by one role at a time, so ask for each staff role and merge
    listStaff: async (): Promise<StaffUser[]> => {
      const roles: Role[] = ["super_admin", "branch_manager", "worker", "rider"];
      const results = await Promise.all(roles.map((role) => request<{ users: StaffUser[] }>(`/users${qs({ role })}`)));
      return results.flatMap((r) => r.users).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    },
    // For a branch manager the API returns only their own branch's workers and riders
    listBranchStaff: async (): Promise<StaffUser[]> => (await request<{ users: StaffUser[] }>("/users")).users,
    create: (b: unknown) => request<{ user: User }>("/users", { method: "POST", body: b }),
    update: (id: string, b: unknown) => request<{ user: User }>(`/users/${id}`, { method: "PATCH", body: b }),
  },
  reports: {
    summary: (from: string, to: string, branch?: string) => request<ReportSummary>(`/reports/summary${qs({ from, to, branch })}`),
    daily: (from: string, to: string, branch?: string) => request<{ days: { _id: string; orders: number; revenue: number }[] }>(`/reports/daily${qs({ from, to, branch })}`),
    topItems: (from: string, to: string, branch?: string) => request<{ items: { _id: string; quantity: number; sales: number }[] }>(`/reports/top-items${qs({ from, to, branch, limit: "6" })}`),
    branches: (from: string, to: string) => request<{ branches: { branch: { _id: string; name: string; code: string }; orders: number; revenue: number }[] }>(`/reports/branches${qs({ from, to })}`),
  },
};
