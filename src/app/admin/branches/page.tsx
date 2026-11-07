"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, MapPin, Phone, Plus, Truck, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api";
import { admin } from "@/lib/adminApi";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, LinkButton, Spinner, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/dash/kit";

export default function BranchesPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => admin.branches.list(), "branches");
  const [busy, setBusy] = useState<string | null>(null);
  const branches = data?.branches ?? [];

  async function toggle(id: string, active: boolean) {
    if (active && !window.confirm("Deactivate this branch? Customers will no longer see it or be able to order from it.")) return;
    setBusy(id);
    try {
      await (active ? admin.branches.deactivate(id) : admin.branches.reactivate(id));
      toast(active ? "Branch deactivated" : "Branch is active again");
      await reload(true);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update the branch", "error");
    }
    setBusy(null);
  }

  return (
    <>
      <PageHeader title="Branches" subtitle="Each branch has its own address, delivery areas, menu availability and team."
        actions={<LinkButton href="/admin/branches/new"><Plus size={16} /> Add branch</LinkButton>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={() => reload()} /> : branches.length === 0 ? (
        <EmptyState icon={<Building2 size={28} />} title="No branches yet" text="Add your first branch to start taking orders." action={<LinkButton href="/admin/branches/new">Add branch</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {branches.map((b) => (
            <article key={b._id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold">{b.name}</h2><p className="text-xs font-semibold tracking-wide text-stone-500">CODE {b.code}</p></div>
                <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
                <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" /> {b.address}{b.city ? `, ${b.city}` : ""}</li>
                {b.phone && <li className="flex items-center gap-2"><Phone size={16} className="text-secondary-600" /> {b.phone}</li>}
                <li className="flex items-center gap-2"><UserRound size={16} className="text-accent-600" /> {b.manager ? `Manager: ${b.manager.name}` : <span className="text-accent-700">No manager yet. Add one under Staff.</span>}</li>
                <li className="flex items-center gap-2"><Truck size={16} className="text-success-600" /> {b.acceptsDelivery ? `${b.deliveryZones.length} delivery area${b.deliveryZones.length === 1 ? "" : "s"}` : "No delivery"}{b.acceptsDineIn ? " · Dine-in" : ""}</li>
              </ul>
              <div className="mt-4 flex gap-2 pt-1">
                <Link href={`/admin/branches/${b._id}`} className={buttonClass("outline", "sm")}>Edit</Link>
                <Button size="sm" variant={b.isActive ? "ghost" : "success"} loading={busy === b._id} onClick={() => toggle(b._id, b.isActive)}>{b.isActive ? "Deactivate" : "Reactivate"}</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
