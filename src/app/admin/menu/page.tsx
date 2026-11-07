"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, UtensilsCrossed } from "lucide-react";
import { ApiError } from "@/lib/api";
import { admin } from "@/lib/adminApi";
import { cn, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AdminMenuItem, Category } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, LinkButton, Spinner, TextInput, inputClass } from "@/components/ui";
import { Modal, PageHeader, Tabs, selectClass } from "@/components/dash/kit";
import { ItemImage } from "@/components/MenuCard";

const catOf = (i: AdminMenuItem) => (typeof i.category === "string" ? { _id: i.category, name: "" } : i.category);

export default function AdminMenuPage() {
  const [tab, setTab] = useState<"dishes" | "categories">("dishes");
  const items = useApi(() => admin.menu.list(), "menu");
  const cats = useApi(() => admin.categories.list(), "cats");
  const branches = useApi(() => admin.branches.list(), "branches");

  return (
    <>
      <PageHeader title="Menu" subtitle="Dishes, categories and where each one is sold."
        actions={tab === "dishes" ? <LinkButton href="/admin/menu/new"><Plus size={16} /> Add dish</LinkButton> : undefined} />
      <Tabs tabs={[{ id: "dishes", label: "Dishes" }, { id: "categories", label: "Categories" }]} value={tab} onChange={setTab} />
      {tab === "dishes"
        ? <Dishes items={items} cats={cats.data?.categories ?? []} branchCount={branches.data?.branches.filter((b) => b.isActive).length ?? 0} noCategories={!cats.loading && (cats.data?.categories.length ?? 0) === 0} />
        : <Categories cats={cats} />}
    </>
  );
}

function Dishes({ items, cats, branchCount, noCategories }: { items: ReturnType<typeof useApi<{ items: AdminMenuItem[] }>>; cats: Category[]; branchCount: number; noCategories: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const list = useMemo(() => (items.data?.items ?? []).filter((i) => (!cat || catOf(i)._id === cat) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))), [items.data, q, cat]);

  if (items.loading) return <Spinner />;
  if (items.error) return <ErrorState message={items.error} onRetry={() => items.reload()} />;
  if ((items.data?.items.length ?? 0) === 0)
    return <EmptyState icon={<UtensilsCrossed size={28} />} title="No dishes yet" text={noCategories ? "Create at least one category first, then add dishes." : "Add your first dish."} action={noCategories ? <span className="text-sm text-stone-500">Open the Categories tab above.</span> : <LinkButton href="/admin/menu/new">Add dish</LinkButton>} />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className={cn(inputClass, "pl-10")} /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className={cn(selectClass, "sm:!w-56")}><option value="">All categories</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
      </div>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {list.map((i) => {
          const on = i.branchAvailability.filter((r) => r.isAvailable).length;
          const everywhere = i.branchAvailability.length === 0;
          const price = i.variants.length ? Math.min(...i.variants.map((v) => v.price)) : i.basePrice;
          return (
            <li key={i._id}>
              <Link href={`/admin/menu/${i._id}`} className="flex items-center gap-3 p-3 transition hover:bg-stone-50 sm:gap-4 sm:p-4">
                <ItemImage item={i} className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{i.name}</p>
                  <p className="truncate text-sm text-stone-500">{catOf(i).name}{i.variants.length ? ` · ${i.variants.length} sizes` : ""}{i.addOns.length ? ` · ${i.addOns.length} extras` : ""}</p>
                </div>
                <div className="hidden sm:block">{everywhere ? <Badge tone="success">All branches</Badge> : on === 0 ? <Badge tone="primary">Not sold anywhere</Badge> : <Badge tone="accent">{on} of {Math.max(branchCount, i.branchAvailability.length)} branches</Badge>}</div>
                <p className="w-24 shrink-0 text-right font-extrabold text-accent-700">{i.variants.length > 1 && <span className="block text-[10px] font-semibold text-stone-500">from</span>}{formatNaira(price)}</p>
                <Pencil size={16} className="shrink-0 text-stone-400" />
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-6 text-center text-stone-500">No dishes match.</li>}
      </ul>
    </>
  );
}

function Categories({ cats }: { cats: ReturnType<typeof useApi<{ categories: Category[] }>> }) {
  const { toast } = useToast();
  const [edit, setEdit] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = (cats.data?.categories ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const open = (c: Category | "new") => { setEdit(c); setName(c === "new" ? "" : c.name); setOrder(c === "new" ? String(list.length + 1) : String(c.sortOrder)); setError(""); };

  async function save() {
    if (name.trim().length < 2) return setError("Enter a category name.");
    setBusy(true);
    try {
      const body = { name: name.trim(), sortOrder: Number(order) || 0 };
      if (edit === "new") await admin.categories.create(body);
      else if (edit) await admin.categories.update(edit._id, body);
      toast("Category saved");
      setEdit(null);
      await cats.reload(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    }
    setBusy(false);
  }

  if (cats.loading) return <Spinner />;
  if (cats.error) return <ErrorState message={cats.error} onRetry={() => cats.reload()} />;
  return (
    <>
      <div className="mb-4"><Button onClick={() => open("new")}><Plus size={16} /> Add category</Button></div>
      {list.length === 0 ? <EmptyState icon={<UtensilsCrossed size={28} />} title="No categories yet" text="Categories group your dishes, like Rice, Soups, Drinks." /> : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {list.map((c) => (
            <li key={c._id} className="flex items-center gap-3 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-100 text-sm font-bold text-secondary-700">{c.sortOrder}</span>
              <span className="flex-1 font-semibold">{c.name}</span>
              <Button size="sm" variant="outline" onClick={() => open(c)}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
      {edit && (
        <Modal title={edit === "new" ? "Add category" : "Edit category"} onClose={() => setEdit(null)}
          footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
          <div className="space-y-4">
            <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Rice dishes" autoFocus /></Field>
            <Field label="Position" hint="Smaller numbers appear first on the menu."><TextInput inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))} /></Field>
            {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
