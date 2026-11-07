"use client";

import type { ReactNode } from "react";
import { Building2, LayoutDashboard, UtensilsCrossed, UsersRound } from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/dash/DashboardShell";
import RequireRole from "@/components/dash/RequireRole";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/branches", label: "Branches", icon: Building2 },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/staff", label: "Staff", icon: UsersRound },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["super_admin"]}>
      <DashboardShell nav={nav}>{children}</DashboardShell>
    </RequireRole>
  );
}
