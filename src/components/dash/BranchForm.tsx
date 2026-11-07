"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { admin } from "@/lib/adminApi";
import { DAY_NAMES, branchPayload, defaultHours, validateBranch, type BranchFormState } from "@/lib/payloads";
import type { AdminBranch } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Button, Field, TextInput } from "../ui";
import { Card, Toggle } from "./kit";

const fromBranch = (b?: AdminBranch): BranchFormState => ({
  name: b?.name ?? "",
  code: b?.code ?? "",
  address: b?.address ?? "",
  city: b?.city ?? "",
  state: b?.state ?? "",
  phone: b?.phone ?? "",
  acceptsDelivery: b?.acceptsDelivery ?? true,
  acceptsDineIn: b?.acceptsDineIn ?? true,
  zones: (b?.deliveryZones ?? []).map((z) => ({ name: z.name, fee: String(z.fee), estimatedMinutes: String(z.estimatedMinutes) })),
  hours: defaultHours().map((d) => {
    const saved = b?.openingHours?.find((h) => h.day === d.day);
    return saved ? { day: d.day, open: saved.open || d.open, close: saved.close || d.close, closed: !!saved.closed } : d;
  }),
});

export default function BranchForm({ branch }: { branch?: AdminBranch }) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = useState<BranchFormState>(() => fromBranch(branch));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BranchFormState>(k: K, v: BranchFormState[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    const problem = validateBranch(f);
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      if (branch) await admin.branches.update(branch._id, branchPayload(f));
      else await admin.branches.create(branchPayload(f));
      toast(branch ? "Branch saved" : "Branch created");
      router.push("/admin/branches");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the branch.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Bodija" /></Field>
          <Field label="Branch code" hint="2 to 6 letters. Used in order numbers, like IKD-20261022-0007."><TextInput value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={6} placeholder="IKD" /></Field>
          <div className="sm:col-span-2"><Field label="Address"><TextInput value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="12 Bodija Road" /></Field></div>
          <Field label="City"><TextInput value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Ibadan" /></Field>
          <Field label="State"><TextInput value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="Oyo" /></Field>
          <Field label="Branch phone"><TextInput value={f.phone} onChange={(e) => set("phone", e.target.value)} type="tel" placeholder="0803 123 4567" /></Field>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3"><span className="font-semibold">Offers delivery</span><Toggle checked={f.acceptsDelivery} onChange={(v) => set("acceptsDelivery", v)} label="Offers delivery" /></label>
          <label className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3"><span className="font-semibold">Offers dine-in</span><Toggle checked={f.acceptsDineIn} onChange={(v) => set("acceptsDineIn", v)} label="Offers dine-in" /></label>
        </div>
      </Card>

      <Card title="Delivery areas and fees" action={f.acceptsDelivery ? <Button size="sm" variant="outline" onClick={() => set("zones", [...f.zones, { name: "", fee: "", estimatedMinutes: "40" }])}><Plus size={15} /> Add area</Button> : undefined}>
        {!f.acceptsDelivery ? <p className="text-stone-500">Delivery is off for this branch.</p> : f.zones.length === 0 ? <p className="text-stone-500">No areas yet. Customers pick one of these at checkout, and the fee depends on it.</p> : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_120px_110px_40px] gap-2 px-1 text-xs font-semibold text-stone-500 sm:grid"><span>Area</span><span>Fee (₦)</span><span>Minutes</span><span /></div>
            {f.zones.map((z, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-[1fr_120px_110px_40px] sm:border-0 sm:p-0">
                <TextInput className="col-span-2 sm:col-span-1" aria-label="Area name" value={z.name} onChange={(e) => set("zones", f.zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="e.g. Bodija" />
                <TextInput aria-label="Fee" inputMode="numeric" value={z.fee} onChange={(e) => set("zones", f.zones.map((x, j) => (j === i ? { ...x, fee: e.target.value.replace(/[^\d.]/g, "") } : x)))} placeholder="1000" />
                <TextInput aria-label="Minutes" inputMode="numeric" value={z.estimatedMinutes} onChange={(e) => set("zones", f.zones.map((x, j) => (j === i ? { ...x, estimatedMinutes: e.target.value.replace(/\D/g, "") } : x)))} placeholder="40" />
                <button type="button" aria-label="Remove area" onClick={() => set("zones", f.zones.filter((_, j) => j !== i))} className="col-span-2 flex items-center justify-center rounded-xl text-primary-600 hover:bg-primary-50 sm:col-span-1"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Opening hours">
        <div className="space-y-2">
          {f.hours.map((h) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 px-4 py-2.5">
              <span className="w-24 font-semibold">{DAY_NAMES[h.day]}</span>
              <Toggle checked={!h.closed} onChange={(open) => set("hours", f.hours.map((x) => (x.day === h.day ? { ...x, closed: !open } : x)))} label={`${DAY_NAMES[h.day]} open`} />
              {h.closed ? <span className="text-sm text-stone-500">Closed</span> : (
                <div className="flex items-center gap-2">
                  <input type="time" aria-label={`${DAY_NAMES[h.day]} opens`} value={h.open} onChange={(e) => set("hours", f.hours.map((x) => (x.day === h.day ? { ...x, open: e.target.value } : x)))} className="rounded-lg border border-stone-300 px-2 py-1.5" />
                  <span className="text-stone-500">to</span>
                  <input type="time" aria-label={`${DAY_NAMES[h.day]} closes`} value={h.close} onChange={(e) => set("hours", f.hours.map((x) => (x.day === h.day ? { ...x, close: e.target.value } : x)))} className="rounded-lg border border-stone-300 px-2 py-1.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/branches")}>Cancel</Button>
        <Button onClick={save} loading={busy}>{branch ? "Save changes" : "Create branch"}</Button>
      </div>
    </div>
  );
}
