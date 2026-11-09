"use client";

import { Bike } from "lucide-react";
import { riderApi } from "@/lib/riderApi";
import { lagosDaysAgo, lagosToday } from "@/lib/dates";
import { formatDateTime, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";

export default function RiderHistory() {
  const to = lagosToday();
  const { data, loading, error, reload } = useApi(() => riderApi.delivered(lagosDaysAgo(6), to), "history");
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  const list = (data?.orders ?? []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const today = list.filter((o) => new Date(+new Date(o.createdAt) + 3600000).toISOString().slice(0, 10) === to);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Delivery history</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-success-100 p-4 text-success-700"><p className="text-sm font-semibold">Today</p><p className="text-3xl font-extrabold">{today.length}</p></div>
        <div className="rounded-2xl bg-secondary-100 p-4 text-secondary-700"><p className="text-sm font-semibold">Last 7 days</p><p className="text-3xl font-extrabold">{list.length}</p></div>
      </div>
      {list.length === 0 ? <EmptyState icon={<Bike size={28} />} title="No completed deliveries yet" /> : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {list.map((o) => (
            <li key={o._id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="font-bold">{o.orderNumber}</p><p className="truncate text-sm text-stone-500">{o.delivery?.zone} · {formatDateTime(o.createdAt)}</p></div>
              <div className="text-right"><p className="font-bold">{formatNaira(o.total)}</p><p className="text-xs text-stone-500">{o.payment.method === "pay_on_delivery" ? "Cash" : "Paid online"}</p></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
