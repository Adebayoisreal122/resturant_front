"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lagosDaysAgo, lagosToday } from "@/lib/dates";
import { managerApi } from "@/lib/managerApi";
import { useAuth } from "./AuthContext";

interface BranchState {
  branchId: string | null;
  needsReview: number; // closed shifts with a difference that nobody has reviewed
  cashOwed: number; // naira riders still owe the branch
  refundsDue: number; // cancelled orders that were paid and not yet refunded
  refresh: () => Promise<void>;
}

const Ctx = createContext<BranchState | null>(null);
export function useBranch() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBranch must be used inside BranchProvider");
  return c;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const branchId = user ? (typeof user.branch === "object" && user.branch ? user.branch._id : (user.branch as string | undefined) ?? null) : null;
  const [needsReview, setNeedsReview] = useState(0);
  const [cashOwed, setCashOwed] = useState(0);
  const [refundsDue, setRefundsDue] = useState(0);

  const refresh = useCallback(async () => {
    const [shifts, cash, cancelled] = await Promise.allSettled([
      managerApi.shifts.list({ status: "closed", variance: true }),
      managerApi.cash.summary(),
      managerApi.refunds.cancelled(lagosDaysAgo(13), lagosToday()),
    ]);
    if (shifts.status === "fulfilled") setNeedsReview(shifts.value.shifts.filter((s) => !s.reviewedAt).length);
    if (cash.status === "fulfilled") setCashOwed(cash.value.totalOwed);
    if (cancelled.status === "fulfilled") setRefundsDue(cancelled.value.orders.filter((o) => o.payment.status === "paid").length);
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, 45000);
    return () => clearInterval(t);
  }, [user, refresh]);

  const value = useMemo(() => ({ branchId, needsReview, cashOwed, refundsDue, refresh }), [branchId, needsReview, cashOwed, refundsDue, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
