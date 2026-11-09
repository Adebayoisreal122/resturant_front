"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { managerApi } from "@/lib/managerApi";
import { lagosDaysAgo, lagosToday } from "@/lib/dates";
import { formatDateTime, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { Order } from "@/lib/types";
import { useBranch } from "@/context/BranchContext";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Spinner, TextInput } from "@/components/ui";
import { Card, Modal, PageHeader } from "@/components/dash/kit";

const METHOD: Record<string, string> = { cash: "Cash", transfer: "Transfer", pos_terminal: "POS", card_online: "Paid online", pay_on_delivery: "Cash on delivery" };

function RefundModal({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const online = order.payment.method === "card_online";
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    try {
      await managerApi.refunds.refund(order._id, online ? {} : { manual: true, note: note.trim() || "Refunded by hand" });
      toast(online ? "Refund sent to Paystack" : "Refund recorded");
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't process the refund.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Refund ${order.orderNumber}`} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={go}>{online ? "Refund through Paystack" : "I've paid the customer back"}</Button></>}>
      <p className="text-center text-4xl font-extrabold text-accent-700">{formatNaira(order.total)}</p>
      <p className="mt-2 text-center text-sm text-stone-600">{METHOD[order.payment.method]} · cancelled</p>
      {online ? (
        <p className="mt-4 rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary-700">Paystack returns the money to the customer&apos;s card or bank. It can take a few days to show.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">Hand the money back first (cash or transfer), then record it here.</p>
          <Field label="Note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transferred to customer's account" maxLength={200} /></Field>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
    </Modal>
  );
}

export default function RefundsPage() {
  const { refresh } = useBranch();
  const { data, loading, error, reload } = useApi(() => managerApi.refunds.cancelled(lagosDaysAgo(13), lagosToday()), "refunds");
  const [pick, setPick] = useState<Order | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  const orders = data?.orders ?? [];
  const due = orders.filter((o) => o.payment.status === "paid");
  const done = orders.filter((o) => o.payment.status === "refunded");

  return (
    <>
      <PageHeader title="Refunds" subtitle="Cancelled orders that were already paid. The last 14 days." />
      {due.length === 0 ? <EmptyState icon={<RotateCcw size={28} />} title="No refunds waiting" text="When a paid order is cancelled it will appear here." /> : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {due.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="font-bold">{o.orderNumber}</p><p className="text-sm text-stone-500">{formatDateTime(o.createdAt)} · {METHOD[o.payment.method]}{typeof o.customer === "object" && o.customer ? ` · ${o.customer.name}` : ""}</p></div>
              <p className="text-lg font-extrabold text-accent-700">{formatNaira(o.total)}</p>
              <Button size="sm" onClick={() => setPick(o)}>Refund</Button>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <Card title="Refunded" className="mt-6">
          <ul className="divide-y divide-stone-100 text-sm">
            {done.map((o) => <li key={o._id} className="flex items-center justify-between py-3"><span className="font-semibold">{o.orderNumber}</span><span className="flex items-center gap-2">{formatNaira(o.total)} <Badge tone="neutral">Refunded</Badge></span></li>)}
          </ul>
        </Card>
      )}
      {pick && <RefundModal order={pick} onClose={() => setPick(null)} onDone={async () => { setPick(null); await Promise.all([reload(true), refresh()]); }} />}
    </>
  );
}
