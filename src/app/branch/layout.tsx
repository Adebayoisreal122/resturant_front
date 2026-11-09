"use client";

import type { ReactNode } from "react";
import { Bike, ClipboardCheck, LayoutDashboard, ReceiptText, RotateCcw, UsersRound, UtensilsCrossed } from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/dash/DashboardShell";
import RequireRole from "@/components/dash/RequireRole";
import { BranchProvider, useBranch } from "@/context/BranchContext";

function Shell({ children }: { children: ReactNode }) {
  const { needsReview, refundsDue, cashOwed } = useBranch();
  const nav: NavItem[] = [
    { href: "/branch", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/branch/shifts", label: "Shifts", icon: ClipboardCheck, badge: needsReview },
    { href: "/branch/cash", label: "Rider cash", icon: Bike, badge: cashOwed > 0 ? 1 : 0 },
    { href: "/branch/menu", label: "Sold out", icon: UtensilsCrossed },
    { href: "/branch/refunds", label: "Refunds", icon: RotateCcw, badge: refundsDue },
    { href: "/branch/staff", label: "Staff", icon: UsersRound },
    { href: "/pos", label: "Point of sale", icon: ReceiptText },
  ];
  return <DashboardShell nav={nav}>{children}</DashboardShell>;
}

export default function BranchLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["branch_manager"]}>
      <BranchProvider><Shell>{children}</Shell></BranchProvider>
    </RequireRole>
  );
}
