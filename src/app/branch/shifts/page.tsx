"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { managerApi } from "@/lib/managerApi";
import { cn, formatDateTime, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { Shift } from "@/lib/types";
import { useBranch } from "@/context/BranchContext";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Spinner, TextInput } from "@/components/ui";
import { Modal, PageHeader, Tabs } from "@/components/dash/kit";

const METHODS = [["cash", "Cash (incl. float)"], ["transfer", "Transfers"], ["pos_terminal", "POS terminal"]] as const;
const who = (s: Shift) => (typeof s.cashier === "object" && s.cashier ? s.cashier.name : "Cashier");

function Detail({ id, onClose, onReviewed }: { id: string; onClose: () => void; onReviewed: () => void }) {
  const { toast } = useToast();
  const { refresh } = useBranch();
  const d = useApi(() => managerApi.shifts.get(id), id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const s = d.data?.shift;

  async function review() {
    setBusy(true);
    try {
      await managerApi.shifts.review(id, note.trim() || undefined);
      toast("Shift reviewed");
      await refresh();
      onReviewed();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't save the review", "error");
      setBusy(false);
    }
  }

  return (
    <Modal wide title={s ? `${who(s)} · ${formatDateTime(s.openedAt)}` : "Shift"} onClose={onClose}
      footer={s && s.status === "closed" && !s.reviewedAt ? <><Button variant="outline" onClick={onClose}>Close</Button><Button variant="success" loading={busy} onClick={review}>Mark as reviewed</Button></> : <Button variant="outline" onClick={onClose}>Close</Button>}>
      {d.loading ? <Spinner /> : d.error || !s ? <ErrorState message={d.error || "Shift not found"} onRetry={() => d.reload()} /> : (
        <div className="space-y-5">
          {s.status === "open" ? (
            <p className="rounded-xl bg-secondary-50 px-4 py-3 text-secondary-700">This shift is still open. {d.data?.live ? `${d.data.live.ordersCount} payments, ${formatNaira(d.data.live.totalSales)} so far.` : ""}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-stone-500"><tr><th className="pb-2 font-semibold" /><th className="pb-2 text-right font-semibold">System</th><th className="pb-2 text-right font-semibold">Counted</th><th className="pb-2 text-right font-semibold">Difference</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {METHODS.map(([k, label]) => (
                    <tr key={k}><td className="py-2.5 font-semibold">{label}</td><td className="py-2.5 text-right">{formatNaira(s.expected[k])}</td><td className="py-2.5 text-right">{formatNaira(s.declared[k])}</td>
                      <td className={cn("py-2.5 text-right font-bold", s.variance[k] === 0 ? "text-success-700" : s.variance[k] < 0 ? "text-primary-600" : "text-accent-700")}>{s.variance[k] === 0 ? "—" : (s.variance[k] > 0 ? "+" : "") + formatNaira(s.variance[k])}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm text-stone-500">Opening float {formatNaira(s.openingFloat)} · {s.ordersCount} payments · {formatNaira(s.totalSales)} in sales · closed {s.closedAt ? formatDateTime(s.closedAt) : ""}</p>
            </div>
          )}
          {s.notes && <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm"><b>Cashier&apos;s note:</b> {s.notes}</p>}
          {s.reviewedAt && <p className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700"><b>Reviewed {formatDateTime(s.reviewedAt)}.</b> {s.reviewNote}</p>}
          {s.status === "closed" && !s.reviewedAt && <Field label="Your note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. spoke to the cashier, ₦500 change error" maxLength={300} /></Field>}
          <div>
            <h3 className="mb-2 font-bold">Payments in this shift ({d.data!.orders.length})</h3>
            {d.data!.orders.length === 0 ? <p className="text-sm text-stone-500">None.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {d.data!.orders.map((o) => <li key={o._id} className="flex justify-between py-2"><span>{o.orderNumber} <span className="text-stone-500">· {o.payment.method.replace("_", " ")}</span></span><span className="font-semibold">{formatNaira(o.total)}</span></li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ShiftsPage() {
  const [tab, setTab] = useState<"review" | "open" | "all">("review");
  const closed = useApi(() => managerApi.shifts.list({ status: "closed" }), "closed");
  const open = useApi(() => managerApi.shifts.list({ status: "open" }), "open");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = closed.data?.shifts ?? [];
  const list = tab === "open" ? open.data?.shifts ?? [] : tab === "review" ? all.filter((s) => s.hasVariance && !s.reviewedAt) : all;
  const loading = tab === "open" ? open.loading : closed.loading;
  const error = tab === "open" ? open.error : closed.error;
  const reviewCount = all.filter((s) => s.hasVariance && !s.reviewedAt).length;

  return (
    <>
      <PageHeader title="Shifts" subtitle="Check each cashier's count against what the system recorded." />
      <Tabs tabs={[{ id: "review", label: `Needs review${reviewCount ? ` (${reviewCount})` : ""}` }, { id: "open", label: "Open now" }, { id: "all", label: "All closed" }]} value={tab} onChange={setTab} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={() => { closed.reload(); open.reload(); }} /> : list.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={28} />} title={tab === "review" ? "Nothing to review" : tab === "open" ? "No shifts open right now" : "No closed shifts yet"} text={tab === "review" ? "Shifts with a cash difference appear here until you review them." : undefined} />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {list.map((s) => (
            <li key={s._id}>
              <button onClick={() => setOpenId(s._id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-stone-50">
                <div className="min-w-0 flex-1"><p className="font-bold">{who(s)}</p><p className="text-sm text-stone-500">{formatDateTime(s.openedAt)}{s.closedAt ? ` to ${formatDateTime(s.closedAt)}` : " · open"}</p></div>
                <p className="text-sm text-stone-600">{s.ordersCount} payments · <b className="text-stone-900">{formatNaira(s.totalSales)}</b></p>
                <div className="flex gap-1.5">
                  {s.status === "open" ? <Badge tone="secondary">Open</Badge> : s.hasVariance ? <Badge tone="accent">Difference {formatNaira(s.variance.cash + s.variance.transfer + s.variance.pos_terminal)}</Badge> : <Badge tone="success">Matched</Badge>}
                  {s.reviewedAt && <Badge tone="secondary">Reviewed</Badge>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} onReviewed={() => { setOpenId(null); closed.reload(true); }} />}
    </>
  );
}
