"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import { usePos } from "@/context/PosContext";
import { cn } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Button, EmptyState, ErrorState, Spinner, inputClass } from "@/components/ui";
import { PageHeader } from "@/components/dash/kit";
import OrderCard from "@/components/pos/OrderCard";
import { LiveStatus, SoundToggle } from "@/components/pos/bits";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "new", label: "To confirm", test: (o: Order) => o.status === "pending" },
  { id: "cooking", label: "In the kitchen", test: (o: Order) => o.status === "confirmed" || o.status === "preparing" },
  { id: "ready", label: "Ready", test: (o: Order) => o.status === "ready" },
  { id: "delivery", label: "Out for delivery", test: (o: Order) => o.status === "out_for_delivery" },
  { id: "unpaid", label: "Unpaid", test: (o: Order) => o.payment.status !== "paid" && o.payment.method !== "pay_on_delivery" },
] as const;

export default function OrdersBoard() {
  const { orders, loading, error, refresh, doneToday } = usePos();
  const [tab, setTab] = useState<"active" | "done">("active");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Order[] | null>(null);
  const [doneError, setDoneError] = useState("");

  useEffect(() => {
    if (tab !== "done") return;
    setDone(null);
    doneToday().then(setDone).catch((e) => setDoneError(e.message));
  }, [tab, doneToday]);

  const list = useMemo(() => {
    const base = tab === "active" ? orders : done ?? [];
    const f = FILTERS.find((x) => x.id === filter)!;
    const term = q.trim().toLowerCase();
    return base.filter((o) => (tab === "done" || f.test(o)) && (!term || o.orderNumber.toLowerCase().includes(term) || o.delivery?.phone?.includes(term) || o.tableNumber === q.trim()));
  }, [orders, done, tab, filter, q]);

  return (
    <>
      <PageHeader title="Orders" subtitle="Everything in progress at your branch, oldest first." actions={<><LiveStatus /><SoundToggle /><Button size="sm" variant="outline" onClick={() => refresh()}><RefreshCw size={14} /> Refresh</Button></>} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-full bg-stone-100 p-1">
          {([["active", `Active (${orders.length})`], ["done", "Finished today"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition", tab === id ? "bg-white text-primary-700 shadow-sm" : "text-stone-600")}>{label}</button>
          ))}
        </div>
        <div className="relative lg:w-72"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., phone or table" className={cn(inputClass, "!py-2 pl-10 text-sm")} /></div>
      </div>

      {tab === "active" && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => {
            const n = orders.filter((o) => f.test(o)).length;
            return <button key={f.id} onClick={() => setFilter(f.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", filter === f.id ? "bg-primary-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200")}>{f.label}{f.id !== "all" && n > 0 ? ` · ${n}` : ""}</button>;
          })}
        </div>
      )}

      {tab === "active" ? (
        loading && orders.length === 0 ? <Spinner label="Loading orders" /> : error && orders.length === 0 ? <ErrorState message={error} onRetry={() => refresh()} /> : list.length === 0 ? (
          <EmptyState icon={<ClipboardList size={28} />} title="No orders here" text="New orders appear instantly. Turn the sound on to hear them." />
        ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((o) => <OrderCard key={o._id} order={o} />)}</div>
      ) : doneError ? <ErrorState message={doneError} /> : done === null ? <Spinner /> : list.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="Nothing finished yet today" />
      ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((o) => <OrderCard key={o._id} order={o} />)}</div>}
    </>
  );
}
