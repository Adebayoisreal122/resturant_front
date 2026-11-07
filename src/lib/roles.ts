import type { Role } from "./types";

// Where each kind of user lands after logging in. Staff screens are added one by one.
export const homeForRole = (role: Role): string => (role === "super_admin" ? "/admin" : role === "worker" ? "/pos" : role === "customer" ? "/" : "/staff");

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Admin",
  branch_manager: "Branch manager",
  worker: "Staff",
  rider: "Rider",
  customer: "Customer",
};
