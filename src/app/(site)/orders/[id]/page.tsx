"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CreditCard, MapPin, Phone, XCircle } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useApi } from "@/lib/useApi";
import { cn, formatDateTime, formatNaira, STATUS_LABEL, TIMELINE } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { Badge, Button, Container, ErrorState, Spinner } from "@/components/ui";

const FINAL = ["delivered", "completed", "cancelled", "refunded"];

export default function OrderPage() {
  return (
    <Container className="max-w-3xl py-8">
      <RequireAuth message="Log in to see this order.">
        <OrderView />
      </RequireAuth>
    </Container>
  );
}

function OrderView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data, setData, loading, error, reload } = useApi(() => api.orders.get(id), id);
  const [busy, setBusy] = useState(false);
  const order = data?.order;
  const status = order?.status;

  // Live updates over the socket, with a slow refresh as a safety net
  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (o: Order) => {
      if (o._id === id) setData((prev) => (prev ? { ...prev, order: o } : prev));
    };
    socket?.on("order:updated", onUpdate);
    const timer = setInterval(() => { if (status && !FINAL.includes(status)) reload(true); }, 20000);
    return () => {
      socket?.off("order:updated", onUpdate);
      clearInterval(timer);
    };
  }, [id, status, reload, setData]);

  if (loading) return <Spinner />;
  if (error || !order) return <ErrorState message={error || "Order not found"} onRetry={() => reload()} />;

  const rider = order.delivery?.rider;
  const branch = typeof order.branch === "string" ? null : order.branch;
  const steps = TIMELINE[order.type];
  const current = steps.indexOf(order.status);
  const cancelled = order.status === "cancelled" || order.status === "refunded";
  const needsPayment = order.payment.method === "card_online" && order.payment.status === "unpaid" && order.status === "pending";

  async function payNow() {
    setBusy(true);
    try {
      const { authorizationUrl } = await api.payments.initialize(order!._id);
      window.location.href = authorizationUrl;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't open the payment page", "error");
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this order?")) return;
    setBusy(true);
    try {
      const r = await api.orders.cancel(order!._id, "Cancelled by customer");
      setData((prev) => (prev ? { ...prev, order: r.order } : prev));
      toast("Order cancelled");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't cancel", "error");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{order.orderNumber}</h1>
          <p className="text-sm text-stone-600">{formatDateTime(order.createdAt)}{branch ? ` · ${branch.name}` : ""}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {needsPayment && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-accent-700"><CreditCard size={20} /> Payment needed to start your order</p>
          <Button variant="accent" onClick={payNow} loading={busy}>Pay {formatNaira(order.total)}</Button>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        {cancelled ? (
          <p className="flex items-center gap-2 font-semibold text-primary-700"><XCircle size={20} /> This order was {STATUS_LABEL[order.status].toLowerCase()}.</p>
        ) : (
          <ol className="space-y-0">
            {steps.map((s, i) => {
              const done = i < current || (i === current && FINAL.includes(order.status));
              const now = i === current && !done;
              return (
                <li key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold",
                      done ? "border-success-600 bg-success-600 text-white" : now ? "border-secondary-600 bg-secondary-50 text-secondary-700 ring-4 ring-secondary-100" : "border-stone-200 bg-white text-stone-400")}>
                      {done ? <Check size={16} /> : i + 1}
                    </span>
                    {i < steps.length - 1 && <span className={cn("h-7 w-0.5", i < current ? "bg-success-600" : "bg-stone-200")} />}
                  </div>
                  <p className={cn("pt-1 font-semibold", now ? "text-secondary-700" : done ? "text-stone-900" : "text-stone-400")}>{STATUS_LABEL[s]}</p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {order.type === "delivery" && order.delivery && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold">Delivery</h2>
          <p className="mt-2 flex items-start gap-2 text-stone-700"><MapPin size={18} className="mt-0.5 shrink-0 text-primary-600" /> {order.delivery.address} ({order.delivery.zone})</p>
          {rider ? (
            <p className="mt-2 flex items-center gap-2 text-stone-700">
              <Phone size={18} className="text-secondary-600" /> Rider: <b>{rider.name}</b>
              <a href={`tel:${rider.phone}`} className="font-semibold text-secondary-600 hover:underline">{rider.phone}</a>
            </p>
          ) : (
            <p className="mt-2 text-sm text-stone-500">A rider will be assigned when your food is nearly ready.</p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold">Your items</h2>
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {order.items.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2.5">
              <span><b>{l.quantity}×</b> {l.name}{(l.variant || l.addOns.length > 0) && <span className="block text-stone-500">{[l.variant, ...l.addOns.map((a) => `+ ${a.name}`)].filter(Boolean).join(", ")}</span>}</span>
              <span className="shrink-0 font-semibold">{formatNaira(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-stone-600">Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd></div>
          {order.deliveryFee > 0 && <div className="flex justify-between"><dt className="text-stone-600">Delivery</dt><dd>{formatNaira(order.deliveryFee)}</dd></div>}
          {order.vat > 0 && <div className="flex justify-between"><dt className="text-stone-600">VAT</dt><dd>{formatNaira(order.vat)}</dd></div>}
          <div className="flex justify-between pt-2 text-lg font-extrabold"><dt>Total</dt><dd className="text-accent-700">{formatNaira(order.total)}</dd></div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={order.payment.status === "paid" ? "success" : "accent"}>{order.payment.status === "paid" ? "Paid" : "Not paid yet"}</Badge>
          <span className="text-stone-600">{{ card_online: "Online payment", pay_on_delivery: "Pay on delivery", cash: "Cash", transfer: "Bank transfer", pos_terminal: "POS" }[order.payment.method]}</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {order.status === "pending" && <Button variant="outline" onClick={cancel} loading={busy}>Cancel order</Button>}
        {branch?.phone && <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-secondary-700 hover:bg-secondary-50"><Phone size={16} /> Call {branch.name}</a>}
      </div>
    </div>
  );
}
