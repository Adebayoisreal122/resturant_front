"use client";

import { useState } from "react";
import { Lock, PlayCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { staffApi } from "@/lib/staffApi";
import { useApi } from "@/lib/useApi";
import { cn, formatDateTime, formatNaira } from "@/lib/format";
import type { Shift } from "@/lib/types";
import { usePos } from "@/context/PosContext";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, Field, Spinner, TextInput } from "@/components/ui";
import { Card, PageHeader, StatCard } from "@/components/dash/kit";

const METHODS = [["cash", "Cash in the drawer"], ["transfer", "Bank transfers received"], ["pos_terminal", "POS terminal total"]] as const;

function Reconciliation({ shift }: { shift: Shift }) {
  return (
    <Card title="Shift closed" className={shift.hasVariance ? "border-accent-300" : "border-success-200"}>
      <p className={cn("mb-4 rounded-xl px-4 py-3 font-semibold", shift.hasVariance ? "bg-accent-50 text-accent-700" : "bg-success-50 text-success-700")}>
        {shift.hasVariance ? "There is a difference between what you counted and what the system recorded. Your manager will review it." : "Everything matches. Well done."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="pb-2 font-semibold" /><th className="pb-2 text-right font-semibold">System</th><th className="pb-2 text-right font-semibold">You counted</th><th className="pb-2 text-right font-semibold">Difference</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {METHODS.map(([k, label]) => (
              <tr key={k}><td className="py-2.5 font-semibold">{label.split(" ")[0] === "Cash" ? "Cash (incl. float)" : label}</td><td className="py-2.5 text-right">{formatNaira(shift.expected[k])}</td><td className="py-2.5 text-right">{formatNaira(shift.declared[k])}</td>
                <td className={cn("py-2.5 text-right font-bold", shift.variance[k] === 0 ? "text-success-700" : shift.variance[k] < 0 ? "text-primary-600" : "text-accent-700")}>{shift.variance[k] === 0 ? "—" : (shift.variance[k] > 0 ? "+" : "") + formatNaira(shift.variance[k])}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-500">{shift.ordersCount} payments · {formatNaira(shift.totalSales)} in sales</p>
    </Card>
  );
}

export default function ShiftPage() {
  const { toast } = useToast();
  const { shift, live, shiftLoading, refreshShift } = usePos();
  const past = useApi(() => staffApi.shifts.mine(), "past");
  const [float, setFloat] = useState("");
  const [declared, setDeclared] = useState({ cash: "", transfer: "", pos_terminal: "" });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justClosed, setJustClosed] = useState<Shift | null>(null);

  async function open() {
    setError(""); setBusy(true);
    try {
      await staffApi.shifts.open(Number(float || 0));
      setJustClosed(null);
      await refreshShift();
      toast("Shift opened");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't open the shift."); }
    setBusy(false);
  }

  async function close() {
    if (METHODS.some(([k]) => declared[k].trim() === "") && !window.confirm("Some counts are empty and will be recorded as ₦0. Close anyway?")) return;
    if (!window.confirm("Close your shift? You can't change the counts afterwards.")) return;
    setError(""); setBusy(true);
    try {
      const r = await staffApi.shifts.close({ cash: Number(declared.cash || 0), transfer: Number(declared.transfer || 0), pos_terminal: Number(declared.pos_terminal || 0) }, notes.trim() || undefined);
      setJustClosed(r.shift);
      setDeclared({ cash: "", transfer: "", pos_terminal: "" }); setNotes("");
      await refreshShift();
      await past.reload(true);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't close the shift."); }
    setBusy(false);
  }

  if (shiftLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My shift" subtitle="Open a shift before taking payments. Close it when you finish, and count the money honestly." />

      {justClosed && !shift && <div className="mb-6"><Reconciliation shift={justClosed} /></div>}

      {!shift ? (
        <Card title="Start a shift">
          <p className="mb-4 text-stone-600">Count the cash already in the drawer, then enter it as your opening float.</p>
          <Field label="Opening float (₦)" hint="Enter 0 if the drawer is empty."><TextInput inputMode="numeric" value={float} onChange={(e) => setFloat(e.target.value.replace(/[^\d.]/g, ""))} placeholder="5000" /></Field>
          {error && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
          <Button size="lg" className="mt-4" loading={busy} onClick={open}><PlayCircle size={18} /> Open shift</Button>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Payments taken" value={String(live?.ordersCount ?? 0)} hint={`Since ${formatDateTime(shift.openedAt)}`} icon={<PlayCircle size={18} />} tone="secondary" />
            <StatCard label="Sales this shift" value={formatNaira(live?.totalSales ?? 0)} hint={`Opening float ${formatNaira(shift.openingFloat)}`} icon={<Lock size={18} />} tone="success" />
          </div>
          <Card title="Close your shift">
            <p className="mb-4 text-sm text-stone-600">Count what you actually have. The system compares it with what it recorded, and your manager reviews any difference. Cash includes your opening float.</p>
            <div className="space-y-3">
              {METHODS.map(([k, label]) => (
                <Field key={k} label={label}><TextInput inputMode="numeric" value={declared[k]} onChange={(e) => setDeclared((d) => ({ ...d, [k]: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="₦0" /></Field>
              ))}
              <Field label="Notes for your manager (optional)"><TextInput value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="e.g. gave ₦200 change from float" /></Field>
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
            <Button size="lg" variant="primary" className="mt-4 w-full" loading={busy} onClick={close}>Close shift</Button>
          </Card>
        </div>
      )}

      {(past.data?.shifts.length ?? 0) > 0 && (
        <Card title="Your recent shifts" className="mt-6">
          <ul className="divide-y divide-stone-100">
            {past.data!.shifts.slice(0, 8).map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-semibold">{formatDateTime(s.openedAt)}</p><p className="text-stone-500">{s.ordersCount} payments · {formatNaira(s.totalSales)}</p></div>
                <div className="flex gap-1.5">{s.hasVariance ? <Badge tone="accent">Difference</Badge> : <Badge tone="success">Matched</Badge>}{s.reviewedAt && <Badge tone="secondary">Reviewed</Badge>}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
