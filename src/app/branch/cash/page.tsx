"use client";

import { useState } from "react";
import { Bike, Banknote } from "lucide-react";
import { ApiError } from "@/lib/api";
import { managerApi, type RiderCashRow } from "@/lib/managerApi";
import { cn, formatDateTime, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { useBranch } from "@/context/BranchContext";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Spinner, TextInput } from "@/components/ui";
import { Card, Modal, PageHeader, StatCard } from "@/components/dash/kit";

function ReceiveModal({ row, onClose, onDone }: { row: RiderCashRow; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(String(row.expected));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const received = Number(amount);
  const diff = Number.isFinite(received) ? Math.round((received - row.expected) * 100) / 100 : 0;

  async function save() {
    if (amount.trim() === "" || !Number.isFinite(received) || received < 0) return setError("Enter the amount you counted.");
    setBusy(true);
    try {
      const r = await managerApi.cash.remit(row.rider._id, received, note.trim() || undefined);
      toast(r.remittance.variance === 0 ? "Cash received. Nothing owed now." : `Recorded. ${formatNaira(Math.abs(r.remittance.variance))} ${r.remittance.variance < 0 ? "short" : "over"}.`);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't record the handover.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Cash from ${row.rider.name}`} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="success" loading={busy} onClick={save}>Record handover</Button></>}>
      <p className="text-center text-sm text-stone-600">The system expects, from {row.count} deliver{row.count === 1 ? "y" : "ies"}</p>
      <p className="text-center text-4xl font-extrabold text-accent-700">{formatNaira(row.expected)}</p>
      <div className="mt-5 space-y-4">
        <Field label="Amount you counted (₦)"><TextInput inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} autoFocus /></Field>
        {amount !== "" && diff !== 0 && <p className={cn("rounded-xl px-4 py-3 text-sm font-semibold", diff < 0 ? "bg-primary-50 text-primary-700" : "bg-accent-50 text-accent-700")}>{diff < 0 ? `Short by ${formatNaira(-diff)}. This is recorded against ${row.rider.name}.` : `Over by ${formatNaira(diff)}.`}</p>}
        <Field label="Note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. rider will bring the balance tomorrow" /></Field>
        {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
      </div>
    </Modal>
  );
}

export default function RiderCashPage() {
  const { refresh } = useBranch();
  const summary = useApi(() => managerApi.cash.summary(), "summary");
  const history = useApi(() => managerApi.cash.remittances(), "history");
  const [row, setRow] = useState<RiderCashRow | null>(null);

  return (
    <>
      <PageHeader title="Rider cash" subtitle="Riders collect cash on pay-on-delivery orders. Count it when they hand it over." />
      {summary.loading ? <Spinner /> : summary.error ? <ErrorState message={summary.error} onRetry={() => summary.reload()} /> : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Riders owe" value={formatNaira(summary.data!.totalOwed)} hint={`${summary.data!.riders.length} rider${summary.data!.riders.length === 1 ? "" : "s"} with cash to hand over`} icon={<Banknote size={18} />} tone="accent" />
          </div>
          {summary.data!.riders.length === 0 ? (
            <EmptyState icon={<Bike size={28} />} title="No cash outstanding" text="When a rider delivers a pay-on-delivery order, the cash shows here until you record the handover." />
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {summary.data!.riders.map((r) => (
                <li key={r.rider._id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100 text-success-700"><Bike size={20} /></span>
                  <div className="min-w-0 flex-1"><p className="font-bold">{r.rider.name}</p><p className="text-sm text-stone-500">{r.count} deliver{r.count === 1 ? "y" : "ies"} · oldest {formatDateTime(r.since)}</p></div>
                  <p className="text-lg font-extrabold text-accent-700">{formatNaira(r.expected)}</p>
                  <Button size="sm" variant="success" onClick={() => setRow(r)}>Receive cash</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(history.data?.remittances.length ?? 0) > 0 && (
        <Card title="Recent handovers" className="mt-6">
          <ul className="divide-y divide-stone-100 text-sm">
            {history.data!.remittances.slice(0, 15).map((h) => (
              <li key={h._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-semibold">{h.rider.name}</p><p className="text-stone-500">{formatDateTime(h.createdAt)} · received by {h.receivedBy.name}{h.note ? ` · ${h.note}` : ""}</p></div>
                <div className="flex items-center gap-2"><span className="font-bold">{formatNaira(h.received)}</span>{h.variance === 0 ? <Badge tone="success">Exact</Badge> : <Badge tone={h.variance < 0 ? "primary" : "accent"}>{h.variance < 0 ? "Short" : "Over"} {formatNaira(Math.abs(h.variance))}</Badge>}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {row && <ReceiveModal row={row} onClose={() => setRow(null)} onDone={async () => { setRow(null); await Promise.all([summary.reload(true), history.reload(true), refresh()]); }} />}
    </>
  );
}
