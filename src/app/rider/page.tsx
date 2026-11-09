"use client";

import { Bike, PackageCheck, Power, RefreshCw } from "lucide-react";
import { useRider } from "@/context/RiderContext";
import { cn, formatNaira } from "@/lib/format";
import DeliveryCard from "@/components/rider/DeliveryCard";
import { Button, EmptyState, ErrorState, Spinner } from "@/components/ui";

export default function RiderHome() {
  const { orders, loading, error, online, toggleOnline, togglingOnline, refresh, cash, connected } = useRider();

  return (
    <div className="space-y-5">
      <button onClick={toggleOnline} disabled={togglingOnline} aria-pressed={online}
        className={cn("flex w-full items-center gap-4 rounded-2xl p-5 text-left shadow-sm transition active:scale-[0.99]", online ? "bg-success-600 text-white" : "bg-white text-stone-800 ring-1 ring-stone-200")}>
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full", online ? "bg-white/20" : "bg-stone-100")}><Power size={28} /></span>
        <span><span className="block text-xl font-extrabold">{online ? "You're online" : "You're offline"}</span>
          <span className={cn("text-sm", online ? "text-success-100" : "text-stone-500")}>{online ? "The branch can assign you deliveries. Tap to go offline." : "Tap to go online and receive deliveries."}</span></span>
      </button>

      {(cash?.expected ?? 0) > 0 && (
        <div className="rounded-2xl bg-accent-100 p-4 text-accent-700"><p className="text-sm font-semibold">Cash to hand over to your manager</p><p className="text-2xl font-extrabold">{formatNaira(cash!.expected)} <span className="text-sm font-semibold">from {cash!.count} deliver{cash!.count === 1 ? "y" : "ies"}</span></p></div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">My deliveries</h1>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", connected ? "text-success-700" : "text-accent-700")}>{connected ? "● Live" : "○ Reconnecting"}</span>
          <Button size="sm" variant="outline" onClick={() => refresh()}><RefreshCw size={14} /> Refresh</Button>
        </div>
      </div>

      {loading && orders.length === 0 ? <Spinner label="Loading deliveries" /> : error && orders.length === 0 ? <ErrorState message={error} onRetry={() => refresh()} /> : orders.length === 0 ? (
        <EmptyState icon={online ? <Bike size={28} /> : <PackageCheck size={28} />} title="No deliveries right now" text={online ? "Stay on this screen. You'll hear a chime when a delivery is assigned to you." : "Go online to be assigned deliveries."} />
      ) : (
        <div className="space-y-4">{orders.map((o) => <DeliveryCard key={o._id} order={o} />)}</div>
      )}
    </div>
  );
}
