"use client";

import { useEffect } from "react";
import { Banknote, CircleCheck } from "lucide-react";
import { useRider } from "@/context/RiderContext";
import { formatDateTime, formatNaira } from "@/lib/format";

export default function RiderCash() {
  const { cash, refreshCash } = useRider();
  useEffect(() => { refreshCash(); }, [refreshCash]);
  const owed = cash?.expected ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Cash to hand over</h1>
      <div className={owed > 0 ? "rounded-2xl bg-accent-100 p-5 text-accent-700" : "rounded-2xl bg-success-100 p-5 text-success-700"}>
        <p className="flex items-center gap-2 text-sm font-semibold">{owed > 0 ? <Banknote size={18} /> : <CircleCheck size={18} />} {owed > 0 ? "You owe the branch" : "All clear"}</p>
        <p className="text-4xl font-extrabold">{formatNaira(owed)}</p>
        <p className="mt-1 text-sm">{owed > 0 ? `From ${cash?.count} cash deliver${cash?.count === 1 ? "y" : "ies"}. Hand it to your branch manager, who will record it.` : "You have no cash to hand over."}</p>
      </div>
      {(cash?.orders.length ?? 0) > 0 && (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {cash!.orders.map((o) => (
            <li key={o._id} className="flex items-center justify-between p-4"><div><p className="font-bold">{o.orderNumber}</p><p className="text-sm text-stone-500">{formatDateTime(o.createdAt)}</p></div><p className="font-bold">{formatNaira(o.total)}</p></li>
          ))}
        </ul>
      )}
      <p className="text-xs text-stone-500">The amount for each order is its total. Any change you gave the customer came out of the money they handed you.</p>
    </div>
  );
}
