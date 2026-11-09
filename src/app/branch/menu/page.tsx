"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { managerApi, type BranchMenuItem } from "@/lib/managerApi";
import { cn, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { useBranch } from "@/context/BranchContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState, ErrorState, Spinner, inputClass } from "@/components/ui";
import { PageHeader, Toggle, selectClass } from "@/components/dash/kit";
import { ItemImage } from "@/components/MenuCard";

const catId = (i: BranchMenuItem) => (typeof i.category === "string" ? i.category : i.category._id);

export default function SoldOutPage() {
  const { branchId } = useBranch();
  const { toast } = useToast();
  const menu = useApi(() => managerApi.menu.forBranch(branchId as string), branchId);
  const cats = useApi(() => api.categories.list(), "cats");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const items = menu.data?.items ?? [];
  const list = useMemo(() => items.filter((i) => (!cat || catId(i) === cat) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))).sort((a, b) => Number(a.isAvailable) - Number(b.isAvailable) || a.name.localeCompare(b.name)), [items, q, cat]);
  const off = items.filter((i) => !i.isAvailable).length;

  async function toggle(item: BranchMenuItem) {
    if (!branchId) return;
    const next = !item.isAvailable;
    menu.setData((d) => (d ? { items: d.items.map((x) => (x._id === item._id ? { ...x, isAvailable: next } : x)) } : d)); // instant feedback
    setBusy(item._id);
    try {
      await managerApi.menu.setAvailability(item._id, branchId, next);
      toast(next ? `${item.name} is back on the menu` : `${item.name} marked sold out`);
    } catch (e) {
      menu.setData((d) => (d ? { items: d.items.map((x) => (x._id === item._id ? { ...x, isAvailable: !next } : x)) } : d)); // undo
      toast(e instanceof ApiError ? e.message : "Couldn't update. Check your connection.", "error");
    }
    setBusy(null);
  }

  return (
    <>
      <PageHeader title="Sold out" subtitle={off > 0 ? `${off} item${off > 1 ? "s are" : " is"} hidden from customers at your branch.` : "Switch off anything you've run out of. Customers stop seeing it straight away."} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className={cn(inputClass, "pl-10")} /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className={cn(selectClass, "sm:!w-56")}><option value="">All categories</option>{(cats.data?.categories ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
      </div>
      {menu.loading ? <Spinner /> : menu.error ? <ErrorState message={menu.error} onRetry={() => menu.reload()} /> : list.length === 0 ? <EmptyState icon={<Search size={28} />} title="No dishes found" /> : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {list.map((i) => (
            <li key={i._id} className={cn("flex items-center gap-3 p-3 sm:gap-4 sm:p-4", !i.isAvailable && "bg-stone-50")}>
              <ItemImage item={i} className={cn("h-12 w-12 shrink-0 rounded-xl object-cover", !i.isAvailable && "opacity-40")} />
              <div className="min-w-0 flex-1"><p className={cn("truncate font-bold", !i.isAvailable && "text-stone-400 line-through")}>{i.name}</p><p className="text-sm text-stone-500">{formatNaira(i.variants.length ? Math.min(...i.variants.map((v) => v.price)) : i.price ?? i.basePrice)}</p></div>
              <span className={cn("hidden text-sm font-semibold sm:block", i.isAvailable ? "text-success-700" : "text-primary-600")}>{i.isAvailable ? "Available" : "Sold out"}</span>
              <Toggle checked={i.isAvailable} disabled={busy === i._id} onChange={() => toggle(i)} label={`${i.name} available`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
