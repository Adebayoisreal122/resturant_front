"use client";

import { ChefHat } from "lucide-react";
import { usePos } from "@/context/PosContext";
import { useAuth } from "@/context/AuthContext";
import { actionsFor, ageTone, kitchenColumn, minutesAgo } from "@/lib/posLogic";
import { cn } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Badge, Button, ErrorState, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/dash/kit";
import { ItemsList, useNow, useStatusAction } from "@/components/pos/OrderCard";
import { LiveStatus, SoundToggle } from "@/components/pos/bits";

const COLUMNS = [
  { id: "new", title: "New", tone: "border-accent-500 bg-accent-50", head: "bg-accent-500", hint: "Waiting to be cooked" },
  { id: "cooking", title: "Cooking", tone: "border-secondary-500 bg-secondary-50", head: "bg-secondary-600", hint: "On the stove" },
  { id: "ready", title: "Ready", tone: "border-success-600 bg-success-50", head: "bg-success-600", hint: "Waiting for pickup" },
] as const;

function Ticket({ order }: { order: Order }) {
  const { user } = useAuth();
  const now = useNow(20000);
  const { run, busy } = useStatusAction();
  const mins = minutesAgo(order.createdAt, now);
  // The kitchen only moves food along: start cooking, mark ready
  const actions = (user ? actionsFor(order, user.role, user.workerType) : []).filter((a) => a.id === "start" || a.id === "ready");
  const rider = order.delivery?.rider;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-extrabold">#{order.orderNumber.split("-").pop()}</p>
          <p className="text-sm font-semibold text-stone-600">{order.type === "dine_in" ? `Dine-in${order.tableNumber ? ` · Table ${order.tableNumber}` : ""}` : order.type === "takeaway" ? "Takeaway" : "Delivery"}</p>
        </div>
        <Badge tone={ageTone(mins)} className="!text-sm">{mins} min</Badge>
      </div>
      <div className="mt-3 border-t border-stone-100 pt-3"><ItemsList order={order} big /></div>
      {order.status === "ready" && (
        <p className="mt-3 text-sm font-semibold text-stone-600">
          {order.type === "delivery" ? (rider ? `Rider: ${rider.name}` : "Waiting for a rider to be assigned") : "Waiting for the customer or waiter"}
        </p>
      )}
      {actions.map((a) => (
        <Button key={a.id} size="lg" variant={a.tone} className="mt-3 w-full" loading={busy === order._id + a.id} onClick={() => run(order, a)}>{a.label}</Button>
      ))}
    </article>
  );
}

export default function KitchenPage() {
  const { orders, loading, error, refresh } = usePos();
  if (loading && orders.length === 0) return <Spinner label="Loading the kitchen board" />;
  if (error && orders.length === 0) return <ErrorState message={error} onRetry={() => refresh()} />;

  const cols = COLUMNS.map((c) => ({ ...c, items: orders.filter((o) => kitchenColumn(o) === c.id) }));
  const waiting = orders.filter((o) => o.status === "pending").length;

  return (
    <>
      <PageHeader title="Kitchen" subtitle={waiting > 0 ? `${waiting} order${waiting > 1 ? "s" : ""} waiting to be confirmed at the counter.` : "Cook in order, oldest first."} actions={<><LiveStatus /><SoundToggle /></>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <section key={c.id} className={cn("rounded-2xl border-t-4 p-3", c.tone)}>
            <div className="mb-3 flex items-center justify-between px-1">
              <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><span className={cn("h-3 w-3 rounded-full", c.head)} /> {c.title}</h2><p className="text-xs text-stone-600">{c.hint}</p></div>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-extrabold">{c.items.length}</span>
            </div>
            <div className="space-y-3">
              {c.items.length === 0 ? <p className="flex flex-col items-center gap-1 py-8 text-sm text-stone-500"><ChefHat size={26} className="text-stone-300" /> Nothing here</p> : c.items.map((o) => <Ticket key={o._id} order={o} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
