"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { admin } from "@/lib/adminApi";
import { menuPayload, validateMenu, type MenuFormState, type OptionForm } from "@/lib/payloads";
import type { AdminBranch, AdminMenuItem, Category } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/format";
import { Button, Field, TextInput } from "../ui";
import { Card, Toggle, selectClass } from "./kit";

const TAGS = [
  { id: "popular", label: "Popular", on: "border-accent-500 bg-accent-50 text-accent-700" },
  { id: "spicy", label: "Spicy", on: "border-primary-600 bg-primary-50 text-primary-700" },
  { id: "vegetarian", label: "Vegetarian", on: "border-success-600 bg-success-50 text-success-700" },
];

function initial(item: AdminMenuItem | undefined, branches: AdminBranch[]): MenuFormState {
  const rules: MenuFormState["rules"] = {};
  for (const b of branches) {
    // An item with no rules is sold everywhere
    const r = item?.branchAvailability?.find((x) => x.branch === b._id);
    const everywhere = !item || item.branchAvailability.length === 0;
    rules[b._id] = { enabled: everywhere ? true : !!r?.isAvailable, price: r?.priceOverride != null ? String(r.priceOverride) : "" };
  }
  const cat = item ? (typeof item.category === "string" ? item.category : item.category._id) : "";
  return {
    name: item?.name ?? "", description: item?.description ?? "", category: cat, image: item?.image ?? "",
    basePrice: item ? String(item.basePrice) : "", prepMinutes: item?.prepMinutes ? String(item.prepMinutes) : "15",
    tags: item?.tags ?? [], isCombo: !!item?.isCombo,
    variants: (item?.variants ?? []).map((v) => ({ name: v.name, price: String(v.price) })),
    addOns: (item?.addOns ?? []).map((a) => ({ name: a.name, price: String(a.price) })),
    rules,
  };
}

function OptionList({ title, hint, rows, onChange, placeholder }: { title: string; hint: string; rows: OptionForm[]; onChange: (r: OptionForm[]) => void; placeholder: string }) {
  return (
    <Card title={title} action={<Button size="sm" variant="outline" onClick={() => onChange([...rows, { name: "", price: "" }])}><Plus size={15} /> Add</Button>}>
      <p className="mb-3 text-sm text-stone-500">{hint}</p>
      {rows.length === 0 ? <p className="text-sm text-stone-400">None.</p> : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_40px] gap-2">
              <TextInput aria-label={`${title} name`} value={r.name} placeholder={placeholder} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <TextInput aria-label={`${title} price`} inputMode="numeric" value={r.price} placeholder="₦" onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
              <button type="button" aria-label="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="flex items-center justify-center rounded-xl text-primary-600 hover:bg-primary-50"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function MenuItemForm({ item, categories, branches }: { item?: AdminMenuItem; categories: Category[]; branches: AdminBranch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = useState<MenuFormState>(() => initial(item, branches));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof MenuFormState>(k: K, v: MenuFormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const hasVariants = f.variants.length > 0;
  const imageOk = /^https?:\/\//i.test(f.image.trim());

  async function save() {
    const problem = validateMenu(f);
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      const body = menuPayload(f, branches.map((b) => b._id));
      if (item) await admin.menu.update(item._id, body);
      else await admin.menu.create(body);
      toast(item ? "Dish saved" : "Dish added");
      router.push("/admin/menu");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the dish.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!item || !window.confirm(`Remove "${item.name}" from the menu? Past orders keep their record.`)) return;
    setBusy(true);
    try {
      await admin.menu.remove(item._id);
      toast("Dish removed");
      router.push("/admin/menu");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't remove the dish.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Dish details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jollof Rice" /></Field>
          <Field label="Category">
            <select value={f.category} onChange={(e) => set("category", e.target.value)} className={selectClass}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Description" hint="Shown to customers. Keep it short and tasty."><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={300} className={selectClass} placeholder="Smoky party jollof with fried plantain" /></Field></div>
          <Field label={hasVariants ? "Base price (₦, used only if no size is picked)" : "Price (₦)"}><TextInput inputMode="numeric" value={f.basePrice} onChange={(e) => set("basePrice", e.target.value.replace(/[^\d.]/g, ""))} placeholder="2500" /></Field>
          <Field label="Preparation time (minutes)"><TextInput inputMode="numeric" value={f.prepMinutes} onChange={(e) => set("prepMinutes", e.target.value.replace(/\D/g, ""))} /></Field>
          <div className="sm:col-span-2">
            <Field label="Photo link (optional)" hint="Paste a link to the photo. Direct uploads come later.">
              <TextInput value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="https://..." />
            </Field>
            {imageOk && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.image.trim()} alt="Preview" className="mt-2 h-28 w-28 rounded-xl border border-stone-200 object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const on = f.tags.includes(t.id);
            return <button key={t.id} type="button" aria-pressed={on} onClick={() => set("tags", on ? f.tags.filter((x) => x !== t.id) : [...f.tags, t.id])} className={cn("rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition", on ? t.on : "border-stone-200 text-stone-600")}>{t.label}</button>;
          })}
          <label className="ml-auto flex items-center gap-3 text-sm font-semibold">Combo meal <Toggle checked={f.isCombo} onChange={(v) => set("isCombo", v)} label="Combo meal" /></label>
        </div>
      </Card>

      <OptionList title="Sizes / options" hint="Optional. If you add any, the customer must pick one, and its price is the full price (not an add-on)." rows={f.variants} onChange={(r) => set("variants", r)} placeholder="e.g. Large" />
      <OptionList title="Extras" hint="Optional add-ons the customer can tick, each adds to the price." rows={f.addOns} onChange={(r) => set("addOns", r)} placeholder="e.g. Extra chicken" />

      <Card title="Where it's sold">
        <p className="mb-3 text-sm text-stone-500">Leave everything on to sell it at every branch, including branches you add later. Switch a branch off if it doesn&apos;t serve this dish, or set a different price there.{hasVariants && " Branch prices don't apply to dishes with sizes."}</p>
        {branches.length === 0 ? <p className="text-stone-500">Add a branch first.</p> : (
          <div className="space-y-2">
            {branches.map((b) => {
              const r = f.rules[b._id] ?? { enabled: true, price: "" };
              const upd = (patch: Partial<typeof r>) => set("rules", { ...f.rules, [b._id]: { ...r, ...patch } });
              return (
                <div key={b._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
                  <Toggle checked={r.enabled} onChange={(v) => upd({ enabled: v })} label={`Sold at ${b.name}`} />
                  <span className={cn("min-w-0 flex-1 font-semibold", !r.enabled && "text-stone-400 line-through")}>{b.name}{!b.isActive && " (inactive)"}</span>
                  {r.enabled && !hasVariants && (
                    <label className="flex items-center gap-2 text-sm text-stone-600">Price here
                      <input inputMode="numeric" value={r.price} onChange={(e) => upd({ price: e.target.value.replace(/[^\d.]/g, "") })} placeholder={f.basePrice || "same"} className="w-24 rounded-lg border border-stone-300 px-2 py-1.5" />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {item ? <Button variant="ghost" className="text-primary-700" onClick={remove} disabled={busy}><Trash2 size={16} /> Remove from menu</Button> : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/menu")}>Cancel</Button>
          <Button onClick={save} loading={busy}>{item ? "Save changes" : "Add dish"}</Button>
        </div>
      </div>
    </div>
  );
}
