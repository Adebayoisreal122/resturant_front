"use client";

import type { ReactNode } from "react";
import { ChefHat, ClipboardList, ReceiptText, Wallet } from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/dash/DashboardShell";
import RequireRole from "@/components/dash/RequireRole";
import { useAuth } from "@/context/AuthContext";
import { PosProvider, usePos } from "@/context/PosContext";

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pendingCount } = usePos();
  const kitchenOnly = user?.role === "worker" && user.workerType === "kitchen";
  const nav: NavItem[] = kitchenOnly
    ? [
        { href: "/pos/kitchen", label: "Kitchen", icon: ChefHat },
        { href: "/pos/orders", label: "Orders", icon: ClipboardList, badge: pendingCount },
      ]
    : [
        { href: "/pos", label: "New order", icon: ReceiptText, exact: true },
        { href: "/pos/orders", label: "Orders", icon: ClipboardList, badge: pendingCount },
        { href: "/pos/kitchen", label: "Kitchen", icon: ChefHat },
        { href: "/pos/shift", label: "My shift", icon: Wallet },
      ];
  return <DashboardShell nav={nav} wide>{children}</DashboardShell>;
}

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["worker", "branch_manager"]}>
      <PosProvider>
        <Shell>{children}</Shell>
      </PosProvider>
    </RequireRole>
  );
}
