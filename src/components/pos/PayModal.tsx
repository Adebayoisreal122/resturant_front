"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, Building2, CreditCard, Printer, Smartphone } from "lucide-react";
import { ApiError } from "@/lib/api";
import { staffApi } from "@/lib/staffApi";
import { changeDue } from "@/lib/posLogic";
import { cn, formatNaira } from "@/lib/format";
import type { Order, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { usePos } from "@/context/PosContext";
import { Button, Field, TextInput } from "../ui";
import { Modal } from "../dash/kit";

type Method = Exclude<PaymentMethod, "pay_on_delivery">;
const METHODS: { id: Method; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "transfer", label: "Transfer", icon: Building2 },
  { id: "pos_terminal", label: "POS", icon: Smartphone },
];

export default function PayModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { user } = useAuth();
  const { shift, shiftLoading, upsert, refreshShift, printReceipt } = usePos();
  const online = order.payment.method === "card_online"; // customer says they paid by card; staff confirming manually
  const [method, setMethod] = useState<Method>(online ? "card_online" : "cash");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ order: Order; change: number; tendered: number } | null>(null);

  const needsShift = user?.role === "worker" && !shift;
  const received = Number(tendered);
  const change = method === "cash" ? changeDue(order.total, received) : 0;
  const short = method === "cash" && tendered !== "" && received < order.total;
  const quick = Array.from(new Set([order.total, Math.ceil(order.total / 500) * 500, Math.ceil(order.total / 1000) * 1000, Math.ceil(order.total / 5000) * 5000])).filter((n) => n >= order.total);

  async function submit() {
    setError("");
    if (short) return setError("The amount received is less than the total.");
    setBusy(true);
    try {
      const r = await staffApi.orders.pay(order._id, { method, reference: reference.trim() || undefined, amount: method === "cash" && tendered ? received : undefined });
      upsert(r.order);
      await refreshShift();
      setDone({ order: r.order, change, tendered: method === "cash" && tendered ? received : 0 });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't record the payment.");
    }
    setBusy(false);
  }

  if (done)
    return (
      <Modal title="Payment recorded" onClose={onClose} footer={<><Button variant="outline" onClick={() => printReceipt(done.order, { tendered: done.tendered || undefined, change: done.change || undefined })}><Printer size={16} /> Print receipt</Button><Button onClick={onClose}>Done</Button></>}>
        <div className="text-center">
          <p className="text-stone-600">{order.orderNumber}</p>
          <p className="mt-1 text-3xl font-extrabold text-success-700">{formatNaira(order.total)}</p>
          {done.change > 0 && <p className="mt-4 rounded-2xl bg-accent-50 p-4 text-lg">Give change: <b className="text-accent-700">{formatNaira(done.change)}</b></p>}
        </div>
      </Modal>
    );

  return (
    <Modal title={`Take payment · ${order.orderNumber}`} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="success" onClick={submit} loading={busy} disabled={needsShift || shiftLoading}>Record payment</Button></>}>
      <p className="text-center text-sm text-stone-600">Amount due</p>
      <p className="text-center text-4xl font-extrabold text-accent-700">{formatNaira(order.total)}</p>

      {needsShift && (
        <p className="mt-4 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">You need an open shift to take payments. <Link href="/pos/shift" className="font-bold underline">Open your shift</Link></p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        {(online ? [{ id: "card_online" as Method, label: "Paid online", icon: CreditCard }, ...METHODS] : METHODS).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setMethod(id)} className={cn("flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm font-semibold transition", method === id ? "border-primary-600 bg-primary-50 text-primary-700" : "border-stone-200")}>
            <Icon size={22} /> {label}
          </button>
        ))}
      </div>

      {method === "card_online" && <p className="mt-4 rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary-700">Only use this if you have confirmed the customer&apos;s card or bank payment in Paystack.</p>}

      {method === "cash" && (
        <div className="mt-5 space-y-3">
          <Field label="Amount received (optional)">
            <TextInput inputMode="numeric" value={tendered} onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Type what the customer gave you" />
          </Field>
          <div className="flex flex-wrap gap-2">
            {quick.map((n) => <button key={n} type="button" onClick={() => setTendered(String(n))} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold hover:bg-stone-200">{n === order.total ? "Exact" : formatNaira(n)}</button>)}
          </div>
          {short && <p className="text-sm font-medium text-primary-600">Short by {formatNaira(order.total - received)}</p>}
          {change > 0 && <p className="rounded-xl bg-accent-50 p-3 text-center text-lg">Change due: <b className="text-accent-700">{formatNaira(change)}</b></p>}
        </div>
      )}

      {(method === "transfer" || method === "pos_terminal") && (
        <div className="mt-5"><Field label={method === "transfer" ? "Transfer reference or sender name (optional)" : "POS receipt number (optional)"}><TextInput value={reference} onChange={(e) => setReference(e.target.value)} /></Field></div>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
    </Modal>
  );
}
