"use client";

import { useEffect, useState } from "react";
import { Bike, Clock, MapPin, Phone, Printer, Store, UtensilsCrossed } from "lucide-react";
import { ApiError } from "@/lib/api";
import { staffApi } from "@/lib/staffApi";
import { actionsFor, ageTone, minutesAgo, type OrderAction } from "@/lib/posLogic";
import { cn, formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { usePos } from "@/context/PosContext";
import { useToast } from "@/context/ToastContext";
import StatusBadge from "../StatusBadge";
import { Badge, Button } from "../ui";
import AssignRiderModal from "./AssignRiderModal";
import PayModal from "./PayModal";

const TYPE_ICON = { dine_in: UtensilsCrossed, takeaway: Store, delivery: Bike } as const;
const TYPE_LABEL = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" } as const;
const METHOD_LABEL: Record<string, string> = { cash: "Cash", transfer: "Transfer", pos_terminal: "POS", card_online: "Online", pay_on_delivery: "Pay on delivery" };

export function useNow(everyMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(t); }, [everyMs]);
  return now;
}

export function ItemsList({ order, big }: { order: Order; big?: boolean }) {
  return (
    <ul className={cn("space-y-1", big ? "text-lg" : "text-sm")}>
      {order.items.map((l, i) => (
        <li key={i}>
          <span className="font-bold">{l.quantity}×</span> {l.name}
          {l.variant && <span className="text-stone-500"> ({l.variant})</span>}
          {l.addOns.length > 0 && <span className="block pl-6 text-stone-600">+ {l.addOns.map((a) => a.name).join(", ")}</span>}
          {l.note && <span className="block pl-6 font-semibold text-primary-700">Note: {l.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Runs a status action against the API and updates the shared list. Returns a handler plus busy state. */
export function useStatusAction() {
  const { upsert } = usePos();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(order: Order, action: OrderAction) {
    if (!action.status) return;
    if (action.id === "cancel" && !window.confirm(`Cancel ${order.orderNumber}?${order.payment.status === "paid" ? " It is already paid, so the customer will need a refund." : ""}`)) return;
    setBusy(order._id + action.id);
    try {
      const r = await staffApi.orders.setStatus(order._id, action.status, action.id === "cancel" ? { reason: "Cancelled by staff" } : {});
      upsert(r.order);
      if (r.refundRequired) toast("Cancelled. This order was paid, so a refund is needed.", "error");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update the order", "error");
    }
    setBusy(null);
  }
  return { run, busy };
}

export default function OrderCard({ order }: { order: Order }) {
  const { user } = useAuth();
  const { printReceipt } = usePos();
  const now = useNow();
  const { run, busy } = useStatusAction();
  const [modal, setModal] = useState<"pay" | "assign" | null>(null);
  const Icon = TYPE_ICON[order.type];
  const mins = minutesAgo(order.createdAt, now);
  const actions = user ? actionsFor(order, user.role, user.workerType) : [];
  const rider = order.delivery?.rider;
  const customer = typeof order.customer === "object" ? order.customer : null;

  const act = (a: OrderAction) => (a.id === "pay" ? setModal("pay") : a.id === "assign" ? setModal("assign") : run(order, a));

  return (
    <article className={cn("flex flex-col rounded-2xl border bg-white p-4 shadow-sm", order.status === "pending" ? "border-accent-300 ring-2 ring-accent-100" : "border-stone-200")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700"><Icon size={18} /></span>
          <div><p className="font-extrabold leading-tight">{order.orderNumber}</p><p className="text-xs text-stone-500">{TYPE_LABEL[order.type]}{order.tableNumber ? ` · Table ${order.tableNumber}` : ""} · {order.source === "pos" ? "Counter" : "Online"}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={ageTone(mins)}><Clock size={12} /> {mins}m</Badge>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {order.type === "delivery" && order.delivery && (
        <div className="mt-3 space-y-0.5 rounded-xl bg-secondary-50 p-3 text-sm">
          <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-secondary-600" /> {order.delivery.zone}: {order.delivery.address}</p>
          <a href={`tel:${order.delivery.phone}`} className="flex items-center gap-2 font-semibold text-secondary-700"><Phone size={15} /> {order.delivery.phone}</a>
          {customer && <p className="text-stone-600">Customer: {customer.name}</p>}
          <p className="flex items-center gap-2"><Bike size={15} className="text-success-600" /> {rider ? <>Rider: <b>{rider.name}</b></> : <span className="text-accent-700">No rider yet</span>}</p>
        </div>
      )}
      {order.type !== "delivery" && customer && <p className="mt-2 text-sm text-stone-600">Customer: {customer.name} · {customer.phone}</p>}

      <div className="mt-3"><ItemsList order={order} /></div>

      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
        <div>
          <p className="text-lg font-extrabold text-accent-700">{formatNaira(order.total)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <Badge tone={order.payment.status === "paid" ? "success" : "accent"}>{order.payment.status === "paid" ? "Paid" : "Unpaid"}</Badge>
            <span className="text-stone-500">{METHOD_LABEL[order.payment.method]}</span>
          </p>
        </div>
        <button onClick={() => printReceipt(order)} aria-label="Print receipt" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><Printer size={18} /></button>
      </div>

      {order.status === "ready" && order.type === "delivery" && rider && <p className="mt-3 rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700">Waiting for {rider.name} to pick it up.</p>}
      {order.status === "out_for_delivery" && <p className="mt-3 rounded-xl bg-secondary-50 px-3 py-2 text-sm text-secondary-700">On the way{rider ? ` with ${rider.name}` : ""}.</p>}
      {order.status === "ready" && order.type !== "delivery" && order.payment.status !== "paid" && <p className="mt-3 rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-700">Take payment before handing over.</p>}

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.id} size="sm" variant={a.tone} className={a.id === "cancel" ? "ml-auto" : "flex-1"} loading={busy === order._id + a.id} onClick={() => act(a)}>{a.label}</Button>
          ))}
        </div>
      )}

      {modal === "pay" && <PayModal order={order} onClose={() => setModal(null)} />}
      {modal === "assign" && <AssignRiderModal order={order} onClose={() => setModal(null)} />}
    </article>
  );
}
